# 🌟 IFTAA - Islamic Fatwa Management System

**Enterprise-grade API with hierarchical categories, JWT authentication, and semantic search**

A production-ready RESTful API system that provides comprehensive fatwa management with hierarchical categories, JWT-based authentication, role-based authorization, and AI-powered semantic search capabilities.

## ✨ Key Features

### 🔐 **Secure Authentication**
- **JWT-based authentication** with role-based access control
- **Admin/User roles** for fine-grained permissions  
- **Secure token management** with configurable expiration
- **OpenAPI/Swagger** documentation with auth integration

### 🏗️ **Hierarchical Categories**
- **36 normalized categories** with parent-child relationships
- **Tree-based navigation** for easy content organization
- **Category-scoped search** to limit results by category
- **Automatic validation** against predefined category structure

### 🔍 **Advanced Search**
- **Semantic search** using vector embeddings
- **Category filtering** to search within specific categories
- **Bilingual support** (Arabic & English)
- **Pagination** with configurable page sizes
- **Relevance scoring** for optimal result ranking

### 📊 **Complete CRUD API**
- **RESTful endpoints** following OpenAPI standards
- **Strong typing** with comprehensive validation
- **MongoDB indexes** for optimal performance
- **Comprehensive error handling** and logging

## 🚀 Quick Start

### Prerequisites

**Required Software:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

**System Requirements:**
- 8GB RAM minimum (16GB recommended)
- 10GB free disk space
- Windows 10+, macOS 10.15+, or Linux

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repository-url>
cd IFTAA_Project

# Copy sample configuration
cp config/config.sample.env config/config.env

# Edit config.env with your production values
# (See Configuration section below)
```

### 2. Start Services

```bash
# Start all services (2-3 minutes on first run)
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 3. Test API

```bash
# Health check
curl http://localhost:8080/health

# Login to get JWT token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"IftaaAdmin2024!"}'

# Use token for authenticated requests
curl -X GET "http://localhost:8080/api/fatwa/search?q=الصلاة" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔗 API Endpoints

### Authentication Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/login` | Get JWT token | ❌ |
| `GET` | `/api/auth/me` | Current user info | ✅ |
| `POST` | `/api/auth/validate` | Validate token | ✅ |
| `GET` | `/api/auth/roles` | Available roles | ✅ Admin |

### Category Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/category` | Hierarchical tree | ❌ |
| `GET` | `/api/category/{id}/fatwas` | Fatwas in category + descendants | ❌ |
| `GET` | `/api/category/valid` | Valid category names | ❌ |
| `GET` | `/api/category/top-level` | Root categories | ❌ |

### Fatwa Operations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/fatwa/{id}` | Single fatwa | ❌ |
| `POST` | `/api/fatwa` | Create fatwa | ✅ Admin |
| `PUT` | `/api/fatwa/{id}` | Update fatwa | ✅ Admin |
| `DELETE` | `/api/fatwa/{id}` | Delete fatwa | ✅ Admin |
| `GET` | `/api/fatwa/search` | Search with filters | ❌ |
| `GET` | `/api/fatwa/{id}/similar` | Similar fatwas | ❌ |

### Search Parameters

```http
GET /api/fatwa/search?q=احكام الوضوء&categoryId=2&page=1&pageSize=10&language=ar
```

**Parameters:**
- `q` (string) - Full-text search query
- `categoryId` (optional) - Limit to category and descendants
- `page` (int) - Page number (default: 1)
- `pageSize` (int) - Results per page (default: 10)
- `language` (string) - Preferred language: `ar` or `en`
- `userId` (optional) - Apply user preferences

## 🔐 Authentication

### Login & Get JWT Token

```bash
# Login request
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "IftaaAdmin2024!"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin",
  "role": "admin",
  "expiresAt": "2025-01-19T09:32:15Z"
}
```

### Available Users

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| `admin` | `IftaaAdmin2024!` | Admin | Full access |
| `scholar` | `IftaaScholar2024!` | Admin | Full access |
| `user` | `IftaaUser2024!` | User | Read-only |
| `guest` | `IftaaGuest2024!` | User | Read-only |

### Using JWT Token

```bash
# Add Authorization header to requests
curl -X GET "http://localhost:8080/api/fatwa" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🏗️ Hierarchical Categories

### Category Structure

The system uses 36 normalized categories organized hierarchically:

**Top-Level Categories (13):**
1. **فتاوى العبادات** (Worship Fatwas)
   - فتاوى الصلاة (Prayer)
   - فتاوى الزكاة (Zakat) 
   - فتاوى الصوم (Fasting)
   - فتاوى الحج (Hajj)

2. **فتاوى النكاح** (Marriage Fatwas)
   - فتاوى الزواج (Marriage)
   - فتاوى الفراق (Divorce)

3. **فتاوى المعاملات** (Transactions)
   - فتاوى البيوع (Sales)
   - الربا (Interest/Usury)
   - الديون (Debts)
   - الشركات (Companies)
   - أوجه من المعاملات (Transaction Aspects)

*...and more*

### Category API Examples

```bash
# Get category tree
curl http://localhost:8080/api/category

# Get all fatwas in "Prayer" category and subcategories
curl http://localhost:8080/api/category/2/fatwas

# Search within specific category
curl "http://localhost:8080/api/fatwa/search?q=الوضوء&categoryId=2"
```

## 🔧 Configuration

### Environment Setup

1. **Copy sample configuration:**
```bash
cp config/config.sample.env config/config.env
```

2. **Edit config.env with your values:**
```env
# MongoDB Configuration
MONGODB_URI=mongodb://admin:YOUR_PASSWORD@localhost:27017/iftaa_db?authSource=admin

# JWT Configuration
JWT_SECRET=YOUR_VERY_LONG_JWT_SECRET_KEY_HERE_AT_LEAST_32_CHARACTERS
JWT_ISSUER=IFTAA_API_PRODUCTION
JWT_EXPIRATION_MINUTES=60

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YOUR_SECURE_PASSWORD_HERE
```

3. **For .NET Production (optional):**
```bash
cp src/backend/appsettings.Production.sample.json src/backend/appsettings.Production.json
# Edit with production values
```

### Security Best Practices

- ✅ **Never commit** `config.env` to version control
- ✅ **Use strong passwords** (minimum 16 characters)
- ✅ **Generate unique JWT secrets** for each environment
- ✅ **Rotate credentials** regularly
- ✅ **Use environment variables** in production

## 📊 API Testing

### With Postman

1. **Import Collection:**
   - Download [Postman](https://www.postman.com/downloads/)
   - Import: `tools/postman/IFTAA_Complete_APIs.postman_collection.json`

2. **Set Environment:**
   - Create environment: `IFTAA Local`
   - Set `base_url`: `http://localhost:8080`
   - Set `python_url`: `http://localhost:5001`

3. **Authentication Flow:**
   - Run "Login" request to get JWT token
   - Token automatically used in subsequent requests

### Example API Calls

```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"IftaaAdmin2024!"}' \
  | jq -r '.token')

# 2. Get category tree  
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/category

# 3. Search with category filter
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/fatwa/search?q=الصلاة&categoryId=2&page=1&pageSize=5"

# 4. Create new fatwa (admin only)
curl -X POST http://localhost:8080/api/fatwa \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fatwaId": 9999,
    "titleAr": "حكم جديد",
    "questionAr": "ما الحكم في هذه المسألة؟",
    "answerAr": "الجواب كذا وكذا",
    "category": "فتاوى الصلاة",
    "tags": ["فقه", "عبادة"]
  }'

# 5. Get fatwas in category
curl http://localhost:8080/api/category/1/fatwas?page=1&pageSize=20
```

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Applications                  │
│              (Web, Mobile, Postman)                     │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/REST + JWT
┌──────────────────▼──────────────────────────────────────┐
│              .NET Core API (Port 8080)                  │
│  ┌─────────────┬─────────────┬─────────────────────────┐ │
│  │Controllers  │ Services    │ Authentication          │ │
│  │- Auth       │- Fatwa      │- JWT Tokens             │ │
│  │- Category   │- Category   │- Role-based Auth        │ │
│  │- Fatwa      │- User       │- Admin/User Roles       │ │
│  │- System     │- Database   │                         │ │
│  └─────────────┴─────────────┴─────────────────────────┘ │
└─────────────┬───────────────┬──────────────────────────────┘
              │               │
              ▼               ▼
    ┌─────────────────┐  ┌─────────────────┐
    │ MongoDB         │  │ Python AI       │
    │ (Port 27017)    │  │ (Port 5001)     │
    │                 │  │                 │
    │ - Fatwas        │  │ - Semantic      │
    │ - Categories    │  │   Search        │
    │ - Users         │  │ - Embeddings    │
    │ - Indexes       │  │ - Translation   │
    └─────────────────┘  └─────────┬───────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ Milvus Vector   │
                          │ (Port 19530)    │
                          │                 │
                          │ - Vector Store  │
                          │ - Similarity    │
                          │ - Search Index  │
                          └─────────────────┘
```

## ⚡ Performance Features

### Database Optimization
- ✅ **MongoDB Indexes** on key fields (`fatwa_id`, `category`, `created_at`)
- ✅ **Compound indexes** for complex queries
- ✅ **Text search indexes** for full-text search
- ✅ **Category hierarchy indexes** for tree operations

### Search Performance
- ✅ **Vector database** (Milvus) for semantic search
- ✅ **Fallback text search** when vector search unavailable
- ✅ **Result caching** and relevance scoring
- ✅ **Optimized pagination** with configurable page sizes

### Security & Validation
- ✅ **Strong typing** with DTO validation
- ✅ **Category validation** against normalized set
- ✅ **SQL injection prevention** with parameterized queries
- ✅ **JWT token validation** and secure headers

## 📈 Data & Metrics

- **📊 Total Fatwas**: 4,666 normalized and categorized
- **🏗️ Categories**: 36 hierarchical categories (13 top-level)
- **⚡ Search Speed**: Sub-second response times
- **🌐 Languages**: Arabic & English with auto-translation
- **🔒 Security**: JWT authentication with role-based access

## 🚨 Troubleshooting

### Common Issues

#### 🔴 Authentication Issues
```bash
# Check JWT token format
curl -X POST http://localhost:8080/api/auth/validate \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get new token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"IftaaAdmin2024!"}'
```

#### 🔴 Category Validation Errors
```bash
# Get valid categories
curl http://localhost:8080/api/category/valid

# Check category structure
curl http://localhost:8080/api/category
```

#### 🔴 Search Not Working
```bash
# Check AI service
curl http://localhost:5001/health

# Check category filter
curl "http://localhost:8080/api/fatwa/search?q=test&categoryId=1"

# Check without category filter
curl "http://localhost:8080/api/fatwa/search?q=test"
```

#### 🔴 Docker Issues
```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs dotnet-api
docker-compose logs python-ai-service

# Restart services
docker-compose restart
```

### Service Health Checks

```bash
# API health
curl http://localhost:8080/health

# System status (admin only)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/system/mongodb-status

# Python AI service
curl http://localhost:5001/health
```

## 📖 OpenAPI Documentation

Access comprehensive API documentation:

**Swagger UI**: `http://localhost:8080/swagger`

Features:
- ✅ **Interactive testing** of all endpoints
- ✅ **JWT authentication** integration  
- ✅ **Request/response schemas** with examples
- ✅ **Role-based endpoint** documentation
- ✅ **Error response** documentation

## 🔄 Development Workflow

### Making Changes

1. **Edit source code** in `src/backend/` or `src/ai-service/`
2. **Update configuration** if needed
3. **Rebuild containers:**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```
4. **Test changes** using Postman or curl
5. **Check logs** for any issues

### Adding New Categories

Categories are validated against a predefined set. To add new categories:

1. **Update** `CategoryService.cs` with new categories
2. **Run migration** if needed
3. **Update validation** in DTOs
4. **Test** with API calls

## 🛡️ Security Considerations

### Production Deployment

- ✅ **Change default passwords** in `config.env`
- ✅ **Generate strong JWT secrets** (32+ characters)
- ✅ **Use HTTPS** in production
- ✅ **Configure firewall** rules
- ✅ **Regular security updates**
- ✅ **Monitor authentication** logs
- ✅ **Implement rate limiting** if needed

### Environment Variables

Never commit these files:
- `config/config.env`
- `src/backend/appsettings.Production.json`
- Any file with passwords or secrets

Use sample files as templates and configure for your environment.

---

## 🎉 You're Ready!

Your IFTAA system now provides:

- ✅ **Enterprise-grade API** with JWT authentication
- ✅ **Hierarchical category management** 
- ✅ **Advanced search capabilities** with filtering
- ✅ **Role-based security** (Admin/User)
- ✅ **Comprehensive documentation** (OpenAPI/Swagger)
- ✅ **Production-ready deployment** with Docker
- ✅ **Performance optimization** with database indexes
- ✅ **Bilingual support** (Arabic/English)

**Start exploring the API at: `http://localhost:8080/swagger`** 🚀