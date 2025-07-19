#!/bin/bash

# =============================================================================
# IFTAA Production Deployment Script
# Automated deployment with safety checks and rollback capabilities
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCTION_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$PRODUCTION_DIR")")"
ENV_FILE="$PRODUCTION_DIR/.env.prod"
COMPOSE_FILE="$PRODUCTION_DIR/docker-compose.prod.yml"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Please copy .env.prod.example to .env.prod and configure it"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}


build_images() {
    log_info "Building production images..."
    
    cd "$PRODUCTION_DIR"
    
    # Build images
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    
    log_success "Images built successfully"
}

deploy_services() {
    log_info "Deploying services..."
    
    cd "$PRODUCTION_DIR"
    
    # Deploy with compose
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    log_success "Services deployed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait for services to start
    sleep 30
    
    # Check service health
    local failed_services=()
    
    # Check backend API
    if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
        failed_services+=("backend-api")
    fi
    
    # Check AI service
    if ! curl -f http://localhost:5001/health > /dev/null 2>&1; then
        failed_services+=("ai-service")
    fi
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All services are healthy"
        return 0
    else
        log_error "Failed services: ${failed_services[*]}"
        return 1
    fi
}

rollback() {
    log_warning "Rolling back deployment..."
    
    cd "$PRODUCTION_DIR"
    
    # Stop new services
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    
    log_success "Rollback completed"
}

cleanup() {
    log_info "Cleaning up old images and containers..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful!)
    # docker volume prune -f
    
    log_success "Cleanup completed"
}

main() {
    log_info "Starting IFTAA Production Deployment"
    echo "=================================="
    
    # Check prerequisites
    check_prerequisites
    
    # Build images
    build_images
    
    # Deploy services
    deploy_services
    
    # Verify deployment
    if verify_deployment; then
        log_success "Deployment successful!"
        
        # Cleanup
        cleanup
        
        echo ""
        log_info "Deployment Summary:"
        echo "=================================="
        echo "• Backend API: http://localhost:8080"
        echo "• AI Service: http://localhost:5001"
        echo "• MongoDB: localhost:27017"
        echo "• Milvus: localhost:19530"
        echo "• MinIO: localhost:9000"
        echo ""
        log_info "Check service logs: docker-compose -f $COMPOSE_FILE logs -f"
        
    else
        log_error "Deployment verification failed!"
        
        # Ask for rollback
        read -p "Do you want to rollback? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback
        fi
        
        exit 1
    fi
}

# Script execution
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback
        ;;
    cleanup)
        cleanup
        ;;
    verify)
        verify_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|cleanup|verify}"
        exit 1
        ;;
esac