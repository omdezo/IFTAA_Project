#!/bin/bash

# =============================================================================
# IFTAA Production Monitoring Script
# Health checks and monitoring for production deployment
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCTION_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PRODUCTION_DIR/.env.prod"
COMPOSE_FILE="$PRODUCTION_DIR/docker-compose.prod.yml"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

# Default ports
API_PORT=${API_PORT:-8080}
AI_SERVICE_PORT=${AI_SERVICE_PORT:-5001}
MONGO_PORT=${MONGO_PORT:-27017}
MILVUS_PORT=${MILVUS_PORT:-19530}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_service_health() {
    local service_name="$1"
    local url="$2"
    local timeout="${3:-10}"
    
    if curl -f -s --max-time "$timeout" "$url" > /dev/null 2>&1; then
        log_success "$service_name is healthy"
        return 0
    else
        log_error "$service_name is unhealthy or unreachable"
        return 1
    fi
}

check_port() {
    local service_name="$1"
    local port="$2"
    
    if nc -z localhost "$port" 2>/dev/null; then
        log_success "$service_name port $port is open"
        return 0
    else
        log_error "$service_name port $port is not accessible"
        return 1
    fi
}

check_docker_services() {
    log_info "Checking Docker services status..."
    
    cd "$PRODUCTION_DIR"
    
    # Get service status
    local services_status
    services_status=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --services --filter "status=running")
    
    local expected_services=("mongodb" "milvus" "python-ai-service" "backend-api")
    local running_services=0
    
    for service in "${expected_services[@]}"; do
        if echo "$services_status" | grep -q "$service"; then
            log_success "Docker service $service is running"
            ((running_services++))
        else
            log_error "Docker service $service is not running"
        fi
    done
    
    log_info "Running services: $running_services/${#expected_services[@]}"
    
    if [ $running_services -eq ${#expected_services[@]} ]; then
        return 0
    else
        return 1
    fi
}

check_application_health() {
    log_info "Checking application health..."
    
    local healthy_services=0
    local total_services=4
    
    # Check backend API
    if check_service_health "Backend API" "http://localhost:$API_PORT/health"; then
        ((healthy_services++))
    fi
    
    # Check AI service
    if check_service_health "AI Service" "http://localhost:$AI_SERVICE_PORT/health"; then
        ((healthy_services++))
    fi
    
    # Check MongoDB
    if check_port "MongoDB" "$MONGO_PORT"; then
        ((healthy_services++))
    fi
    
    # Check Milvus
    if check_port "Milvus" "$MILVUS_PORT"; then
        ((healthy_services++))
    fi
    
    log_info "Healthy services: $healthy_services/$total_services"
    
    if [ $healthy_services -eq $total_services ]; then
        return 0
    else
        return 1
    fi
}

check_system_resources() {
    log_info "Checking system resources..."
    
    # Check disk space
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 90 ]; then
        log_error "Disk usage is high: ${disk_usage}%"
    elif [ "$disk_usage" -gt 80 ]; then
        log_warning "Disk usage is getting high: ${disk_usage}%"
    else
        log_success "Disk usage is normal: ${disk_usage}%"
    fi
    
    # Check memory usage
    local memory_usage
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [ "$memory_usage" -gt 90 ]; then
        log_error "Memory usage is high: ${memory_usage}%"
    elif [ "$memory_usage" -gt 80 ]; then
        log_warning "Memory usage is getting high: ${memory_usage}%"
    else
        log_success "Memory usage is normal: ${memory_usage}%"
    fi
    
    # Check CPU load
    local cpu_load
    cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    log_info "CPU load average: $cpu_load"
}

check_logs_for_errors() {
    log_info "Checking recent logs for errors..."
    
    cd "$PRODUCTION_DIR"
    
    # Check for errors in the last 10 minutes
    local error_count
    error_count=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --since="10m" | grep -i error | wc -l)
    
    if [ "$error_count" -gt 0 ]; then
        log_warning "Found $error_count error messages in recent logs"
    else
        log_success "No errors found in recent logs"
    fi
}

generate_status_report() {
    log_info "Generating status report..."
    
    local report_file="$PRODUCTION_DIR/status_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "IFTAA Production Status Report"
        echo "Generated: $(date)"
        echo "=================================="
        echo ""
        
        echo "Docker Services:"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
        echo ""
        
        echo "System Resources:"
        echo "Disk Usage: $(df -h / | awk 'NR==2 {print $5}')"
        echo "Memory Usage: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
        echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
        echo ""
        
        echo "Recent Logs (last 100 lines):"
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=100
        
    } > "$report_file"
    
    log_success "Status report generated: $report_file"
}

main() {
    echo "IFTAA Production Monitoring"
    echo "=========================="
    echo ""
    
    local overall_status=0
    
    # Check Docker services
    if ! check_docker_services; then
        overall_status=1
    fi
    
    echo ""
    
    # Check application health
    if ! check_application_health; then
        overall_status=1
    fi
    
    echo ""
    
    # Check system resources
    check_system_resources
    
    echo ""
    
    # Check logs for errors
    check_logs_for_errors
    
    echo ""
    echo "=================================="
    
    if [ $overall_status -eq 0 ]; then
        log_success "Overall system status: HEALTHY"
    else
        log_error "Overall system status: UNHEALTHY"
    fi
    
    echo ""
    log_info "For detailed logs: docker-compose -f $COMPOSE_FILE logs -f"
    log_info "For service status: docker-compose -f $COMPOSE_FILE ps"
    
    return $overall_status
}

# Script execution
case "${1:-status}" in
    status)
        main
        ;;
    report)
        generate_status_report
        ;;
    health)
        check_application_health
        ;;
    resources)
        check_system_resources
        ;;
    logs)
        check_logs_for_errors
        ;;
    *)
        echo "Usage: $0 {status|report|health|resources|logs}"
        exit 1
        ;;
esac