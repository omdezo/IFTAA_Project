# 🧪 IFTAA Project Testing Guide

## 🚀 Quick Start Testing

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- [Git](https://git-scm.com/) installed
- [Postman](https://www.postman.com/downloads/) (optional, for API testing)

## 🔍 Testing Methods

### Method 1: Full Docker Testing (Recommended)

This tests the complete system as it would run in production.

#### Step 1: Start the System
```bash
# Navigate to project root
cd C:\Users\omara\OneDrive\Desktop\IFTAA_Project

# Start all services
cd deployment/
docker-compose up -d

# Check if all services are running
docker-compose ps
```

#### Step 2: Wait for Services to Initialize
```bash
# Watch the logs (services need 2-3 minutes to start)
docker-compose logs -f

# Check health endpoints
curl http://localhost:8080/health
curl http://localhost:5001/health
```

#### Step 3: Test the API
```bash
# Test search endpoint
curl -X GET "http://localhost:8080/api/fatwa/search?query=الصلاة&page=1&pageSize=10" \
  -H "Authorization: Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh"

# Test system status
curl -X GET "http://localhost:8080/api/system/stats" \
  -H "Authorization: Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh"
```

### Method 2: Component Testing

Test individual components separately.

#### A. Test .NET Backend Only
```bash
# Navigate to backend
cd src/backend/

# Build the project
dotnet build

# Run tests (if any exist)
dotnet test

# Run the API locally
dotnet run
```

#### B. Test Python AI Service Only
```bash
# Navigate to AI service
cd src/ai-service/

# Install dependencies
pip install -r requirements.txt

# Run the service
python semantic_search_service.py
```

#### C. Test Data Loading
```bash
# Test data loader
cd src/ai-service/
python smart_data_loader.py --help

# Test with local data
python smart_data_loader.py --lite
```

### Method 3: Postman Testing

#### Step 1: Import Collection
1. Open Postman
2. Click "Import"
3. Select `tools/postman/IFTAA_Complete_APIs.postman_collection_last.json`
4. Import the collection

#### Step 2: Set Environment
1. Create new environment: "IFTAA Local"
2. Add variables:
   - `base_url`: `http://localhost:8080`
   - `python_url`: `http://localhost:5001`
   - `basic_auth`: `YWRtaW46SWZ0YWFBZG1pbjIwMjQh`

#### Step 3: Run Tests
1. Start with "Health Check"
2. Test "Search Fatwas" endpoints
3. Try "Create Fatwa" and "Update Fatwa"
4. Test "User Management" endpoints

## 🔧 Validation Scripts

### Structure Validation
```bash
# Check project structure
python scripts/migrate_to_clean_structure.py
```

### Search Functionality Test
```bash
# Run search tests
python tests/test_search.py
```

## 🐛 Troubleshooting Common Issues

### Issue 1: "Docker not found"
```bash
# Check Docker installation
docker --version
docker-compose --version

# Start Docker Desktop if not running
```

### Issue 2: "Port already in use"
```bash
# Check what's using the ports
netstat -ano | findstr :8080
netstat -ano | findstr :5001
netstat -ano | findstr :27017

# Stop existing containers
docker-compose down
```

### Issue 3: "Services not starting"
```bash
# Check service logs
docker-compose logs dotnet-api
docker-compose logs python-ai-service
docker-compose logs mongodb

# Restart services
docker-compose restart
```

### Issue 4: "No search results"
```bash
# Check data loading
curl http://localhost:5001/health

# Check MongoDB (admin/admin)
# Open: http://localhost:8081

# Reload data if needed
docker-compose restart data-seeder
```

### Issue 5: "Authentication failed"
```bash
# Check credentials
echo -n "admin:IftaaAdmin2024!" | base64
# Should output: YWRtaW46SWZ0YWFBZG1pbjIwMjQh
```

## 📋 Test Checklist

### ✅ Infrastructure Tests
- [ ] Docker containers start successfully
- [ ] All services are healthy
- [ ] Database connections work
- [ ] Vector database is accessible

### ✅ API Tests
- [ ] Health endpoint responds
- [ ] Authentication works
- [ ] Search endpoints return results
- [ ] CRUD operations work
- [ ] Error handling is proper

### ✅ Data Tests
- [ ] Data loading completes successfully
- [ ] MongoDB contains fatwas
- [ ] Vector embeddings are generated
- [ ] Search returns relevant results

### ✅ Integration Tests
- [ ] .NET API communicates with Python service
- [ ] Python service connects to databases
- [ ] Translation functionality works
- [ ] User preferences are respected

## 🎯 Success Criteria

Your system is working correctly if:

1. **Health Check**: `curl http://localhost:8080/health` returns status "healthy"
2. **Search Works**: Search endpoints return relevant fatwas
3. **Data Loaded**: MongoDB contains ~4,666 fatwas
4. **Translation**: Arabic/English translation works
5. **Authentication**: Basic auth is working
6. **Postman**: All tests in collection pass

## 🚨 Red Flags

Stop and investigate if you see:
- Services continuously restarting
- 500 errors from API endpoints
- Empty search results
- Authentication failures
- Database connection errors

## 📞 Getting Help

If you encounter issues:
1. Check the logs: `docker-compose logs`
2. Verify configuration: `cat config/config.env`
3. Test endpoints individually
4. Check this guide for common solutions

## 🎉 Advanced Testing

### Load Testing
```bash
# Test multiple concurrent requests
for i in {1..10}; do
  curl -X GET "http://localhost:8080/api/fatwa/search?query=prayer&page=1&pageSize=10" \
    -H "Authorization: Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh" &
done
```

### Database Testing
```bash
# Connect to MongoDB
docker exec -it iftaa-mongodb mongosh -u admin -p IftaaDB2024!

# Check collections
use iftaa_db
db.fatwas.countDocuments()
db.fatwas.findOne()
```

### Performance Testing
```bash
# Check response times
time curl -X GET "http://localhost:8080/api/fatwa/search?query=الصلاة" \
  -H "Authorization: Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh"
```

---

**🎊 Happy Testing! Your IFTAA system is ready for comprehensive testing.**