# IFTAA - Islamic Fatwa Management System

A web application for managing and searching Islamic fatwas with category-based organization.

## What We Built

- **Frontend**: React application with TypeScript
- **Backend**: C# .NET API with MongoDB
- **Search**: Category-specific search functionality 
- **Database**: MongoDB with 4,666+ fatwas organized in categories
- **AI Service**: Python service for semantic search (optional)

## Features

- Browse fatwas by hierarchical categories
- Search within specific categories and subcategories
- Bilingual support (Arabic/English)
- Admin panel for managing fatwas
- User authentication and authorization

## Quick Start

### Prerequisites
- Docker Desktop
- Git

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd IFTAA_Project
```

### 2. Start the Application
```bash
# Start all services
cd deployment
docker-compose up -d

# Wait for services to start (2-3 minutes first time)
docker-compose ps
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080
- **API Documentation**: http://localhost:8080/swagger

## Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | IftaaAdmin2024! | Admin |
| user | IftaaUser2024! | User |

## API Examples

### Search All Fatwas
```bash
curl "http://localhost:8080/api/fatwa/search?page=1&pageSize=10"
```

### Search in Specific Category
```bash
# Search in Prayer fatwas (categoryId=11)
curl "http://localhost:8080/api/fatwa/search?categoryId=11&page=1&pageSize=10"
```

### Get Category Structure
```bash
curl "http://localhost:8080/api/category"
```

### Login to Get Token
```bash
curl -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"IftaaAdmin2024!"}'
```

## Main Category Structure

1. **فتاوى العبادات** (Worship) - categoryId: 1
   - فتاوى الصلاة (Prayer) - categoryId: 11
   - فتاوى الزكاة (Zakat) - categoryId: 12
   - فتاوى الصوم (Fasting) - categoryId: 13
   - فتاوى الحج (Hajj) - categoryId: 14

2. **فتاوى النكاح** (Marriage) - categoryId: 2
   - فتاوى الزواج (Wedding) - categoryId: 21
   - فتاوى الفراق (Divorce) - categoryId: 22

3. **فتاوى المعاملات** (Transactions) - categoryId: 3
   - فتاوى البيوع (Sales) - categoryId: 31
   - الربا (Interest) - categoryId: 32
   - And more...

## Development

### Project Structure
```
IFTAA_Project/
├── src/
│   ├── frontend/          # React app
│   └── backend/           # .NET API
├── deployment/            # Docker configurations
├── data/                  # Fatwa data files
└── README.md
```

### Making Changes
```bash
# Rebuild after changes
docker-compose build
docker-compose up -d

# View logs
docker-compose logs -f dotnet-api
docker-compose logs -f frontend
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | React web interface |
| Backend API | 8080 | REST API server |
| MongoDB | 27017 | Database |
| Python AI | 5001 | Search service |
| Mongo Express | 8081 | Database admin |

## Troubleshooting

### Check Service Status
```bash
cd deployment
docker-compose ps
```

### View Logs
```bash
docker-compose logs dotnet-api
docker-compose logs frontend
```

### Restart Services
```bash
docker-compose restart
```

### Stop All Services
```bash
docker-compose down
```

## Key Features Implemented

✅ **Category-specific search** - Search within categories and subcategories  
✅ **Hierarchical categories** - Parent-child category relationships  
✅ **Clean API responses** - No debug logs in production  
✅ **MongoDB integration** - Fast database queries with proper indexing  
✅ **User authentication** - Login system with JWT tokens  
✅ **Responsive frontend** - Modern React interface  

The system is ready for production use with proper authentication, category management, and search functionality.