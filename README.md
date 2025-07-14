# 🌟 IFTAA - Islamic Fatwa Search System

**Advanced hybrid search engine combining .NET Core API with Python AI services for Islamic fatwas**

A production-ready system that provides semantic search capabilities for Islamic fatwas with bilingual support (Arabic & English), user management, and advanced AI-powered features.

## 🎯 What You'll Get

- **🔍 Smart Search**: Find fatwas by meaning, not just keywords
- **🌐 Bilingual Support**: Arabic & English with auto-translation
- **👤 User Management**: Personalized search preferences
- **🤖 AI-Powered**: Vector embeddings and semantic similarity
- **📊 Complete CRUD**: Create, read, update, delete fatwas
- **🔐 Secure**: Authentication and authorization system

## 🚀 Quick Start (First Time Setup)

### Prerequisites

**Required Software:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac/Linux)
- [Git](https://git-scm.com/) (to clone the repository)

**System Requirements:**
- 8GB RAM minimum (16GB recommended)
- 10GB free disk space
- Windows 10+, macOS 10.15+, or Linux

### Step 1: Clone and Navigate

```bash
# Clone the repository
git clone <your-repository-url>
cd IFTAA_Project

# Verify you're in the right directory
ls
# You should see: docker-compose.yml, README.md, IFTAA_Project/, etc.
```

### Step 2: Start the System

```bash
# Start all services (this will take 2-3 minutes on first run)
docker-compose up -d

# Check if all services are running
docker-compose ps
```

**What this does:**
- ✅ Starts MongoDB database
- ✅ Starts Milvus vector database
- ✅ Starts Python AI service
- ✅ Starts .NET Core API
- ✅ Loads initial data (4,666 fatwas)

### Step 3: Verify Everything is Working

```bash
# Check system health
curl http://localhost:8080/health

# Check Python AI service
curl http://localhost:5001/health

# Check MongoDB UI (admin/admin)
# Open: http://localhost:8081
```

### Step 4: Test the API

**Option A: Using Postman (Recommended)**
1. Download [Postman](https://www.postman.com/downloads/)
2. Import the collection: `postman/IFTAA_Complete_APIs.postman_collection_last.json`
3. Test the search endpoint

**Option B: Using curl**
```bash
# Search for fatwas about prayer
curl -X GET "http://localhost:8080/api/fatwa/search?query=الصلاة&page=1&pageSize=10" \
  -H "Authorization: Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh"
```

## 📊 System Architecture

```
IFTAA System
├── 🟦 .NET Core API (Port 8080)
│   ├── RESTful endpoints
│   ├── Authentication & authorization
│   ├── User management
│   └── Business logic
├── 🐍 Python AI Service (Port 5001)
│   ├── Semantic search (vector embeddings)
│   ├── Auto-translation (Arabic ↔ English)
│   └── AI model management
├── 📊 MongoDB (Port 27017)
│   ├── Fatwa storage
│   ├── User data
│   └── Text search capabilities
├── 🔍 Milvus Vector DB (Port 19530)
│   ├── Vector embeddings storage
│   └── Semantic similarity search
└── 🖥️ Mongo Express UI (Port 8081)
    └── Database management interface
```

## 🔑 Key Features

### 🔍 **Advanced Search**
- **Semantic Search**: Find fatwas by meaning, not just keywords
- **Bilingual**: Search in Arabic or English
- **User Preferences**: Respects user language settings
- **Pagination**: Configurable results per page
- **Relevance Scoring**: Results ranked by similarity

### 👤 **User Management**
- **User Profiles**: Create and manage user accounts
- **Language Preferences**: Set preferred language (Arabic/English)
- **Search Settings**: Customize results per page
- **Personalized Results**: Search results respect user preferences

### 📚 **Complete CRUD Operations**
- **Create**: Add new fatwas with auto-translation
- **Read**: Get fatwas by ID, search, similar fatwas
- **Update**: Edit fatwas with automatic re-embedding
- **Delete**: Complete removal from database and vectors

### 🤖 **AI-Powered Features**
- **Vector Embeddings**: Automatic generation using multilingual models
- **Auto-Translation**: Arabic ↔ English bidirectional translation
- **Similar Fatwas**: Find related fatwas using semantic similarity
- **Fallback Search**: MongoDB text search when vector search fails

## 🧪 API Testing with Postman

### 📥 Import Postman Collection

1. **Download Postman**: [https://www.postman.com/downloads/](https://www.postman.com/downloads/)
2. **Import Collection**: 
   - Open Postman
   - Click "Import" button
   - Select `postman/IFTAA_Complete_APIs.postman_collection_last.json`
   - Click "Import" to add the collection
3. **Set Environment Variables**:
   - Click "Environments" → "New"
   - Name: `IFTAA Local`
   - Add variables:
     - `base_url`: `http://localhost:8080`
     - `python_url`: `http://localhost:5001`
   - Click "Save"
   - Select the environment from the dropdown

### 🧪 Test Categories

The collection includes organized folders for easy testing:

- **🔍 Search Operations**
  - Semantic search with pagination
  - Language preference testing
  - Search with user preferences
  - Similar fatwas search

- **📚 CRUD Operations**
  - Create new fatwas
  - Read fatwas by ID
  - Update existing fatwas
  - Delete fatwas
  - Get all fatwas with pagination

- **👤 User Management**
  - Create user profiles
  - Get user preferences
  - Update user settings
  - Language preference management

- **🤖 AI Services**
  - Translation (Arabic ↔ English)
  - Vector embeddings generation
  - Semantic similarity search
  - AI service health checks

- **🏥 System Health**
  - API health status
  - System status overview
  - Service connectivity tests

### 🚀 Quick Testing Guide

1. **Start with Health Checks**:
   - Run "Health Check" to verify API is running
   - Run "System Status" for detailed service info

2. **Test Search Functionality**:
   - Try "Search Fatwas (Arabic)" with query "الصلاة"
   - Try "Search Fatwas (English)" with query "prayer"
   - Check pagination with different page sizes

3. **Test User Features**:
   - Create a test user with "Create User"
   - Set language preferences
   - Test search with user preferences

4. **Test CRUD Operations**:
   - Create a new fatwa
   - Retrieve it by ID
   - Update the fatwa
   - Delete the fatwa

### 🔧 Postman Tips

- **Use Environment Variables**: All requests use `{{base_url}}` and `{{python_url}}`
- **Authentication**: Most requests include Basic Auth headers automatically
- **Test Scripts**: Some requests include automated tests
- **Pre-request Scripts**: Some requests set up required data automatically
- **Response Validation**: Check response status codes and data structure

### Quick Test Examples

```bash
# 1. Health Check
curl http://localhost:8080/health

# 2. Search Fatwas (Arabic)
curl -X GET "http://localhost:8080/api/fatwa/search?query=الصلاة&page=1&pageSize=10" \
  -H "Authorization: Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh"

# 3. Search Fatwas (English)
curl -X GET "http://localhost:8080/api/fatwa/search?query=prayer&page=1&pageSize=10" \
  -H "Authorization: Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh"

# 4. Get All Fatwas
curl -X GET "http://localhost:8080/api/fatwa?page=1&pageSize=20" \
  -H "Authorization: Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh"
```

## 🔧 Configuration

### Environment Variables (`config.env`)

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://admin:IftaaDB2024!@localhost:27017/iftaa_db?authSource=admin
MONGODB_DATABASE=iftaa_db

# Milvus Configuration
MILVUS_HOST=127.0.0.1
MILVUS_PORT=19530

# AI Models
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-mpnet-base-v2
TRANSLATION_MODEL_AR_EN=Helsinki-NLP/opus-mt-ar-en

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=IftaaAdmin2024!
```

### Default Credentials

- **MongoDB**: `admin:IftaaDB2024!`
- **Mongo Express UI**: `admin:admin`
- **API Authentication**: `admin:IftaaAdmin2024!`

## 📈 Performance Metrics

- **📊 Total Fatwas**: 4,666 from 340 categories
- **⚡ Search Speed**: Sub-second response times
- **🎯 Accuracy**: Semantic relevance scoring with fallback
- **💾 Storage**: MongoDB (text) + Milvus (vectors)
- **🌐 Languages**: Arabic & English with auto-translation

## 🚨 Troubleshooting

### Common Issues & Solutions

#### 🔴 **"Docker not found"**
```bash
# Install Docker Desktop
# Windows/Mac: Download from https://www.docker.com/products/docker-desktop/
# Linux: Follow https://docs.docker.com/engine/install/
```

#### 🔴 **"Port already in use"**
```bash
# Stop existing containers
docker-compose down

# Check what's using the ports
netstat -ano | findstr :8080
netstat -ano | findstr :5001

# Kill the process or change ports in docker-compose.yml
```

#### 🔴 **"Services not starting"**
```bash
# Check service logs
docker-compose logs dotnet-api
docker-compose logs python-ai-service
docker-compose logs mongodb

# Restart services
docker-compose restart
```

#### 🔴 **"No search results found"**
```bash
# Check if data is loaded
curl http://localhost:5001/health

# Check MongoDB data
# Open: http://localhost:8081 (admin/admin)
# Navigate to: iftaa_db > fatwas

# Reload data if needed
docker-compose restart data-seeder
```

#### 🔴 **"Authentication failed"**
```bash
# Use correct credentials
Authorization: Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh

# Or encode manually: admin:IftaaAdmin2024!
echo -n "admin:IftaaAdmin2024!" | base64
```

#### 🔴 **"Slow performance"**
```bash
# Check system resources
docker stats

# Increase Docker resources:
# Docker Desktop > Settings > Resources > Memory: 8GB+, CPU: 4+
```

### Service Status Commands

```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs -f dotnet-api
docker-compose logs -f python-ai-service
docker-compose logs -f mongodb

# Restart specific service
docker-compose restart dotnet-api

# View real-time logs
docker-compose logs -f
```

## 🛠️ Development

### Project Structure

```
IFTAA_Project/
├── 🟦 .NET Core Application
│   ├── IFTAA_Project/
│   │   ├── Controllers/          # API endpoints
│   │   ├── Services/            # Business logic
│   │   ├── Models/              # Data models
│   │   ├── DTOs/                # Data transfer objects
│   │   ├── Data/                # Database context
│   │   └── Program.cs           # Application startup
│   └── Dockerfile               # .NET container
├── 🐍 Python AI Service
│   ├── semantic_search_service.py    # Main AI service
│   ├── smart_data_loader.py         # Data management
│   ├── requirements.txt             # Python dependencies
│   └── Dockerfile.python            # Python container
├── 🐋 Docker Configuration
│   ├── docker-compose.yml           # Service orchestration
│   ├── config.env                   # Environment variables
│   └── volumes/                     # Persistent data
├── 📊 Data Files
│   ├── data/                        # Fatwa data files
│   └── scripts/                     # Database scripts
├── 🧪 Testing
│   └── postman/                     # Postman API test collections
└── 📚 Documentation
    └── README.md                    # This file
```

### Adding New Features

1. **Backend Changes**: Edit files in `IFTAA_Project/`
2. **AI Service Changes**: Edit `semantic_search_service.py`
3. **Configuration**: Update `config.env`
4. **Rebuild**: `docker-compose build --no-cache`
5. **Restart**: `docker-compose up -d`

## 🎯 Next Steps

1. **🚀 Start the system**: `docker-compose up -d`
2. **🧪 Test APIs**: Import Postman collection
3. **🔍 Try searching**: Use the search endpoints
4. **👤 Create users**: Set up user preferences
5. **📊 Monitor**: Check health endpoints
6. **🔧 Customize**: Modify search parameters

## 📞 Support

### Getting Help

1. **Check logs**: `docker-compose logs`
2. **Verify setup**: Follow the Quick Start guide
3. **Test endpoints**: Use the provided Postman collection
4. **Check health**: `curl http://localhost:8080/health`

### Useful Commands

```bash
# Start system
docker-compose up -d

# Stop system
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Check status
docker-compose ps

# Clean up (removes all data)
docker-compose down -v
```

---

**🎉 You now have a complete, production-ready Islamic search system!**

The system combines the robustness of .NET Core with the AI capabilities of Python, providing a comprehensive solution for Islamic fatwa search with advanced semantic capabilities, user management, and bilingual support. 