#!/bin/bash

# =============================================================================
# IFTAA Development Environment Startup Script
# =============================================================================

set -e  # Exit on any error

echo "🚀 Starting IFTAA Development Environment..."
echo "============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Error: docker-compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Navigate to deployment directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create .env.dev if it doesn't exist
if [ ! -f ".env.dev" ]; then
    echo "📝 Creating .env.dev from example..."
    cp .env.dev.example .env.dev
    echo "✅ Environment file created. You can edit .env.dev to customize settings."
fi

# Check available system resources
echo "📊 Checking system resources..."
TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
if [ "$TOTAL_RAM" -lt 6 ]; then
    echo "⚠️  Warning: You have ${TOTAL_RAM}GB RAM. IFTAA development requires at least 6GB for optimal performance."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🐳 Starting Docker services..."
echo "This may take a few minutes on first run..."

# Start services with proper ordering
docker-compose --env-file .env.dev up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

services=("mongodb" "milvus" "dotnet-api" "frontend")
for service in "${services[@]}"; do
    if docker-compose ps "$service" | grep -q "Up"; then
        echo "✅ $service is running"
    else
        echo "❌ $service failed to start"
        echo "💡 Check logs with: docker-compose logs $service"
    fi
done

echo ""
echo "🎉 IFTAA Development Environment Started!"
echo "========================================="
echo ""
echo "📱 Access your application:"
echo "  🌐 Frontend:      http://localhost:3000"
echo "  🔧 API:           http://localhost:8080"
echo "  📚 API Docs:      http://localhost:8080/swagger"
echo "  🗄️  Database UI:   http://localhost:8081"
echo "  💾 MinIO Console: http://localhost:9001"
echo ""
echo "🔑 Default Login:"
echo "  Username: admin"
echo "  Password: IftaaAdmin2024!"
echo ""
echo "📋 Useful Commands:"
echo "  📊 View logs:     docker-compose logs -f [service-name]"
echo "  🔄 Restart:       docker-compose restart [service-name]"
echo "  🛑 Stop all:      docker-compose down"
echo "  🔥 Clean build:   docker-compose up -d --build"
echo ""
echo "❓ Need help? Check deployment/README.md for detailed documentation."