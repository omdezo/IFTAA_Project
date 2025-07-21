# IFTAA Docker Deployment Guide

This guide covers both development and production deployment of the IFTAA Islamic Fatwa Management System using Docker.

## 🏗️ Architecture Overview

The IFTAA system consists of:

- **Frontend**: React 18 + Vite + TypeScript dashboard
- **Backend API**: .NET Core Web API with JWT authentication
- **AI Service**: Python service for semantic search
- **MongoDB**: Document database for fatwa storage
- **Milvus**: Vector database for semantic search
- **Supporting Services**: etcd, MinIO, Mongo Express (dev only)

## 🚀 Quick Start (Development)

### Prerequisites

- Docker Desktop 4.0+
- Docker Compose 2.0+
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd IFTAA_Project
```

### 2. Set Up Environment

```bash
cd deployment
cp .env.dev.example .env.dev
# Edit .env.dev with your preferred settings (optional for dev)
```

### 3. Start All Services

```bash
# From the deployment directory
docker-compose --env-file .env.dev up -d
```

### 4. Access the Application

- **Frontend**: http://localhost:3000 (React development server)
- **Backend API**: http://localhost:8080 (Swagger: http://localhost:8080/swagger)
- **Mongo Express**: http://localhost:8081 (admin/admin)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

### 5. First Login

- Username: `admin`
- Password: `IftaaAdmin2024!`

## 🏭 Production Deployment

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM recommended
- SSL certificates (optional)

### 1. Environment Setup

```bash
cd deployment/production
cp .env.prod.example .env.prod
```

**Important**: Edit `.env.prod` with secure passwords and production settings!

```bash
# Essential security updates in .env.prod
MONGO_ROOT_PASSWORD=YourSecureMongoPassword123!
MINIO_ROOT_PASSWORD=YourSecureMinioPassword123!
API_ADMIN_PASSWORD=YourSecureApiPassword123!
```

### 2. Production Deployment

```bash
# From deployment/production directory
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 3. Access Production Services

- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:8080
- **System Status**: http://localhost/health

## 📊 Service Details

### Frontend Service

| Environment | Port | Build Type | Features |
|-------------|------|------------|----------|
| Development | 3000 | Vite dev server | Hot reload, dev tools |
| Production | 80 | Nginx static | Optimized, cached |

**Key Features:**
- JWT authentication
- RTL/LTR support (Arabic/English)
- Responsive Islamic-themed UI
- Real-time search with debouncing
- Category tree navigation

### Backend API Service

| Environment | Port | Build Type | Features |
|-------------|------|------------|----------|
| Development | 8080 | Development | Debug logging |
| Production | 8080 | Release | Optimized, logging |

**API Endpoints:**
- `POST /api/auth/login` - JWT authentication
- `GET /api/fatwa/search` - Search fatwas
- `GET /api/category` - Category management
- `GET /api/system/stats` - System monitoring

### Database Services

| Service | Port | Purpose | UI Access |
|---------|------|---------|-----------|
| MongoDB | 27017 | Document storage | Mongo Express (dev) |
| Milvus | 19530 | Vector search | API only |
| MinIO | 9000 | Object storage | Console: 9001 |

## 🔧 Development Workflow

### Hot Reloading

The development setup includes:
- **Frontend**: Vite hot reload on code changes
- **Backend**: File watching with automatic restart
- **Volume Mounting**: Source code is mounted for instant updates

### Debugging

```bash
# View logs for specific service
docker-compose logs -f frontend
docker-compose logs -f dotnet-api
docker-compose logs -f python-ai-service

# Access container shell
docker exec -it iftaa-frontend-dev sh
docker exec -it iftaa-dotnet-api bash
```

### Development URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| API Swagger | http://localhost:8080/swagger | - |
| Mongo Express | http://localhost:8081 | admin/admin |
| MinIO Console | http://localhost:9001 | minioadmin/minioadmin |

## 🔒 Security Configuration

### Development Security

- Basic authentication for database UIs
- Default development passwords
- CORS enabled for localhost

### Production Security

- Strong password requirements
- JWT token authentication
- Rate limiting and request throttling
- Security headers (CSP, HSTS, etc.)
- Network isolation

**Production Security Checklist:**
- [ ] Update all default passwords
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable backup encryption
- [ ] Configure log monitoring

## 📈 Monitoring & Health Checks

### Health Check Endpoints

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Frontend | http://localhost/health | Nginx status |
| Backend | http://localhost:8080/health | API health |
| MongoDB | Internal healthcheck | Database connectivity |
| Milvus | Internal healthcheck | Vector DB status |

### Log Management

```bash
# View all service logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f frontend

# Production log locations
docker volume ls | grep iftaa
```

## 🚨 Troubleshooting

### Common Issues

**Frontend not loading:**
```bash
# Check frontend service status
docker-compose ps frontend
docker-compose logs frontend

# Rebuild frontend if needed
docker-compose build frontend
```

**API connection errors:**
```bash
# Verify API service
curl http://localhost:8080/health

# Check API logs
docker-compose logs dotnet-api
```

**Database connection issues:**
```bash
# Check MongoDB status
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Verify Milvus connection
curl http://localhost:9091/healthz
```

### Service Dependencies

Services start in this order:
1. MongoDB, etcd, MinIO
2. Milvus (depends on etcd, MinIO)
3. Data seeder (depends on MongoDB, Milvus)
4. Python AI service (depends on databases + seeder)
5. Backend API (depends on all services)
6. Frontend (depends on Backend API)

### Resource Requirements

**Development:**
- RAM: 6GB minimum, 8GB recommended
- CPU: 2 cores minimum
- Disk: 20GB free space

**Production:**
- RAM: 8GB minimum, 16GB recommended
- CPU: 4 cores minimum
- Disk: 50GB free space

## 📚 API Documentation

### Authentication

```bash
# Login and get JWT token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"IftaaAdmin2024!"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/auth/me
```

### Postman Collection

Import the updated Postman collection:
- File: `tools/postman/IFTAA_Complete_APIs.postman_collection.json`
- Features: JWT authentication, all endpoints, example requests

## 🔄 Updates & Maintenance

### Updating Services

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart services
docker-compose up -d --build

# Remove unused images
docker image prune -f
```

### Backup & Restore

```bash
# Backup MongoDB
docker exec iftaa-mongodb-prod mongodump --out /backup

# Backup volumes
docker run --rm -v iftaa_mongo_data:/data -v $(pwd):/backup ubuntu tar czf /backup/mongo_backup.tar.gz /data
```

## 🆘 Support

For issues and questions:
1. Check this README and troubleshooting section
2. Review service logs: `docker-compose logs [service-name]`
3. Check Docker resource usage: `docker stats`
4. Verify network connectivity between services

## 📝 Environment Variables Reference

### Development (.env.dev)
- `MONGODB_URI`: MongoDB connection string
- `VITE_API_BASE_URL`: Frontend API endpoint
- `MINIO_ACCESS_KEY`: MinIO credentials

### Production (.env.prod)
- `MONGO_ROOT_PASSWORD`: Secure MongoDB password
- `API_ADMIN_PASSWORD`: Secure API admin password
- `FRONTEND_API_URL`: Production API URL
- `ENABLE_SSL`: SSL/TLS configuration

---

**Note**: This deployment supports both development with hot-reloading and production with optimized builds and security hardening.