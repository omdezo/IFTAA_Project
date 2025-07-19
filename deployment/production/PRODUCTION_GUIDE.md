# 🚀 IFTAA Production Deployment Guide

## 📋 Overview

This guide provides comprehensive instructions for deploying the IFTAA system in a production environment with optimized performance, security, and monitoring.

## 🏗️ Production Architecture

```
Production Infrastructure
├── 🟦 .NET Backend API (Port 8080)
├── 🐍 Python AI Service (Port 5001)
├── 📊 MongoDB (Port 27017)
├── 🔍 Milvus Vector DB (Port 19530)
├── 📦 MinIO Object Storage (Port 9000)
├── 🔄 etcd (Service discovery)
└── 📈 Monitoring & Logging
```

## 🛠️ Production Files

### Docker Files
- `Dockerfile.python.prod` - Optimized Python AI service
- `Dockerfile.backend.prod` - Optimized .NET backend
- `docker-compose.prod.yml` - Production orchestration

### Configuration Files
- `.env.prod.example` - Production environment template
- `configs/mongod.conf` - MongoDB production config

### Scripts
- `scripts/deploy.sh` - Automated deployment
- `scripts/monitor.sh` - Health monitoring

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Clone and navigate to production directory
cd deployment/production/

# Copy and configure environment file
cp .env.prod.example .env.prod
nano .env.prod  # Configure with your values
```

### 2. Deploy

```bash
# Run automated deployment
./scripts/deploy.sh

# Or manually step by step
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## 🔧 Production Optimizations

### 🐍 Python AI Service
- **Gunicorn WSGI server** with multiple workers
- **Non-root user** for security
- **Model pre-caching** for faster startup
- **Resource limits** and health checks
- **Structured logging** with rotation

### 🟦 .NET Backend API
- **Multi-stage build** for smaller images
- **Production runtime** optimizations
- **Non-root user** for security
- **Health checks** and monitoring
- **Structured logging** configuration

### 📊 Database Layer
- **MongoDB** with optimized configuration
- **Milvus** with production settings
- **MinIO** for object storage
- **Data persistence** with volumes
- **Backup strategies** implemented

### 🔒 Security Features
- **Non-root containers** throughout
- **Network isolation** between services
- **Access controls** on all endpoints
- **Secret management** via environment variables

## 📊 Monitoring & Health Checks

### Health Endpoints
- Backend API: `http://localhost:8080/health`
- AI Service: `http://localhost:5001/health`
- MongoDB: Port 27017 connectivity
- Milvus: Port 19530 connectivity

### Monitoring Script
```bash
# Check overall system health
./scripts/monitor.sh status

# Generate detailed report
./scripts/monitor.sh report

# Check specific components
./scripts/monitor.sh health
./scripts/monitor.sh resources
```

### Log Locations
- **Application logs**: Docker volumes
- **System logs**: Via Docker logging driver

## 🔄 Deployment Profiles

### Standard Deployment
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```


## 📈 Scaling Configuration

### Horizontal Scaling
```yaml
# Scale AI service workers
environment:
  GUNICORN_WORKERS: 8
  GUNICORN_TIMEOUT: 300

# Scale backend API instances
deploy:
  replicas: 3
```

### Resource Allocation
```yaml
# Memory and CPU limits
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
    reservations:
      memory: 1G
      cpus: '0.5'
```

## 🔐 Security Checklist

### ✅ Pre-deployment Security
- [ ] Update all passwords in `.env.prod`
- [ ] Set up firewall rules
- [ ] Configure network security

### ✅ Runtime Security
- [ ] All services run as non-root
- [ ] Network isolation enabled
- [ ] Access controls configured
- [ ] Regular security updates

## 📋 Maintenance Tasks

### Daily Tasks
- Check system health: `./scripts/monitor.sh status`
- Review error logs: `./scripts/monitor.sh logs`

### Weekly Tasks
- Review resource usage: `./scripts/monitor.sh resources`
- Clean up old logs
- Update system packages

### Monthly Tasks
- Review security configurations
- Update Docker images
- Performance optimization review

## 🚨 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs [service-name]

# Check resource usage
docker stats

# Verify environment variables
docker-compose -f docker-compose.prod.yml config
```

#### Performance Issues
```bash
# Check resource usage
./scripts/monitor.sh resources

# Check database performance
docker exec -it iftaa-mongodb-prod mongostat

# Check AI service workers
docker exec -it iftaa-ai-service-prod ps aux
```

#### Network Issues
```bash
# Test API connectivity
curl -f http://localhost:8080/health

# Test AI service connectivity
curl -f http://localhost:5001/health
```


## 📊 Performance Tuning

### Database Optimization
- **MongoDB**: Optimize queries and indexes
- **Milvus**: Tune vector search parameters
- **Connection pooling**: Optimize connection limits

### Application Optimization
- **Gunicorn workers**: Adjust based on CPU cores
- **Memory allocation**: Monitor and adjust limits
- **Caching**: Implement Redis for session storage

### Infrastructure Optimization
- **Load balancing**: Use multiple backend instances
- **CDN**: Implement for static assets
- **Database sharding**: For large datasets

## 🎯 Success Metrics

### Performance Targets
- **API Response Time**: < 200ms (95th percentile)
- **Search Response Time**: < 2s (95th percentile)
- **Uptime**: > 99.5%
- **Error Rate**: < 0.1%

### Monitoring Metrics
- **CPU Usage**: < 80% average
- **Memory Usage**: < 85% average
- **Disk Usage**: < 80%
- **Network Latency**: < 50ms

## 📞 Support & Maintenance

### Log Analysis
```bash
# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# Search for errors
docker-compose -f docker-compose.prod.yml logs | grep -i error

# Export logs
docker-compose -f docker-compose.prod.yml logs > system_logs.txt
```

### Performance Monitoring
```bash
# System resource monitoring
./scripts/monitor.sh resources

# Application health monitoring
./scripts/monitor.sh health

# Generate comprehensive report
./scripts/monitor.sh report
```

---

## 🎉 Congratulations!

Your IFTAA system is now ready for production deployment with:

✅ **Optimized Performance** - Multi-worker setup, caching, and resource optimization  
✅ **Enterprise Security** - Non-root containers, network isolation, and access controls  
✅ **Monitoring & Logging** - Comprehensive health checks and log management  
✅ **Automated Deployment** - Scripts for deployment, monitoring, and maintenance  
✅ **Scalability** - Ready for horizontal and vertical scaling  
✅ **Reliability** - Health checks and recovery procedures  

**Your production-ready IFTAA system is now operational!** 🚀