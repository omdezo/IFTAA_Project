# IFTAA Project Structure

## 📁 Clean & Organized Directory Structure

```
IFTAA_Project/
├── 📂 src/                          # Source code
│   ├── 📂 backend/                  # .NET Core API
│   │   ├── Controllers/             # API controllers
│   │   ├── DTOs/                    # Data transfer objects
│   │   ├── Data/                    # Database context
│   │   ├── Models/                  # Data models
│   │   ├── Services/                # Business logic services
│   │   ├── Dockerfile               # .NET Docker configuration
│   │   ├── IFTAA_Project.csproj     # .NET project file
│   │   └── Program.cs               # Application entry point
│   ├── 📂 ai-service/               # Python AI service
│   │   ├── semantic_search_service.py  # Main AI service
│   │   ├── smart_data_loader.py     # Data loading utilities
│   │   └── requirements.txt         # Python dependencies
│   └── 📂 frontend/                 # Frontend (future)
├── 📂 data/                         # Data files
│   ├── 📂 json/                     # JSON data files
│   │   ├── fatwas.json              # Original fatwa data
│   │   ├── fatwas_enriched_v2.json  # Enhanced fatwa data
│   │   └── fatwas_multilingual.json # Multilingual fatwa data
│   ├── 📂 vectors/                  # Vector database files
│   │   └── milvus_data/             # Milvus vector storage
│   └── 📂 backups/                  # Data backups
├── 📂 config/                       # Configuration files
│   └── config.env                   # Environment configuration
├── 📂 deployment/                   # Deployment configuration
│   ├── docker-compose.yml           # Docker Compose orchestration
│   └── Dockerfile.python            # Python service Docker config
├── 📂 scripts/                      # Utility scripts
│   ├── fatwa_query_cli.py           # CLI query tool
│   ├── fatwa_query_master.py        # Query optimization
│   ├── query_optimizer_service.py   # Query optimization service
│   ├── init_data.py                 # Data initialization
│   └── seed_data.py                 # Data seeding
├── 📂 tests/                        # Test files
│   └── test_search.py               # Search functionality tests
├── 📂 tools/                        # Development tools
│   └── 📂 postman/                  # API testing
│       ├── IFTAA_Complete_APIs.postman_collection.json
│       └── IFTAA_Complete_APIs.postman_collection_last.json
├── 📂 docs/                         # Documentation
├── README.md                        # Project documentation
├── PROJECT_STRUCTURE.md             # This file
└── CLEANUP_SUMMARY.md               # Cleanup summary
```

## 🚀 Quick Start

### Running the Application

1. **From project root:**
   ```bash
   cd deployment/
   docker-compose up -d
   ```

2. **Development mode:**
   ```bash
   # Backend (.NET)
   cd src/backend/
   dotnet run
   
   # AI Service (Python)
   cd src/ai-service/
   python semantic_search_service.py
   ```

## 📋 Key Changes Made

### ✅ Organization Improvements
- **Separated concerns**: Backend, AI service, and data are now properly separated
- **Clear structure**: Each component has its own directory with clear purpose
- **Removed redundancy**: Eliminated duplicate files and empty directories
- **Proper naming**: Consistent naming conventions throughout

### 🔧 Configuration Updates
- **Docker Compose**: Updated paths to reflect new structure
- **Dockerfiles**: Updated to use new file locations
- **Environment**: Configuration files moved to `/config/`

### 🧹 Cleanup Actions
- **Removed build artifacts**: Cleaned up `bin/`, `obj/` directories
- **Consolidated data**: All data files organized in `/data/` with subdirectories
- **Organized tools**: Postman collections moved to `/tools/postman/`
- **Scripts organized**: Utility scripts moved to `/scripts/`

## 🔍 Benefits of New Structure

1. **Maintainability**: Clear separation of concerns
2. **Scalability**: Easy to add new services or components
3. **Developer Experience**: Easy to navigate and understand
4. **Deployment**: Simplified Docker configuration
5. **Testing**: Dedicated test directory
6. **Documentation**: Centralized documentation approach

## 🎯 Next Steps

1. **Frontend**: Add React/Vue.js frontend in `src/frontend/`
2. **Tests**: Expand test coverage in `tests/`
3. **Documentation**: Add component-specific documentation in `docs/`
4. **CI/CD**: Add GitHub Actions or similar in `.github/workflows/`
5. **Monitoring**: Add logging and monitoring configuration

## 🤝 Contributing

With this clean structure, contributors can easily:
- Find relevant code in the appropriate `src/` subdirectory
- Add tests in the `tests/` directory
- Access tools and utilities from their respective directories
- Understand the project layout from this documentation