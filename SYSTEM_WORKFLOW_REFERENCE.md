# 🕌 IFTAA System - Complete Workflow Reference

## 📋 **System Overview**

The IFTAA (Islamic Fatwa Management System) is a comprehensive platform for managing, searching, and browsing Islamic religious rulings (fatwas). The system consists of:

- **Frontend**: React + TypeScript + Vite (Port 3000)
- **Backend API**: .NET 7 Web API (Port 8080)  
- **AI Service**: Python FastAPI (Port 5001)
- **Database**: MongoDB (Port 27017)
- **Vector DB**: Milvus (Port 19530)
- **Storage**: MinIO (Port 9000/9001)

---

## 🚪 **User Access Levels & Workflows**

### 🌐 **Public Users (Not Logged In)**
**Access**: Homepage only (`/`)

**Available Features**:
- Browse categories and subcategories
- Search fatwas (limited results)
- View individual fatwa details
- Read-only access

**Workflow**:
1. Visit homepage → Browse categories OR search
2. Click category → View fatwas in category  
3. Click fatwa → View full details
4. Use "Admin Login" for authentication

---

### 👤 **Authenticated Users** 
**Roles**: `user`, `guest`  
**Access**: Dashboard + Homepage features

**Available Features**:
- Full search capabilities with pagination
- Personal dashboard with search history
- All public features + enhanced access
- Personalized language preferences

**Workflow**:
1. Login → Redirected to Dashboard (`/dashboard`)
2. Dashboard: Search, browse recent fatwas, filter by categories
3. Use search bar with advanced filters
4. Access categories from sidebar navigation
5. View detailed fatwa pages

---

### 🎓 **Scholars & Admins**
**Roles**: `admin`, `scholar`  
**Access**: Everything + Admin Panel

**Available Features**:
- Complete fatwa management (CRUD)
- Category management and organization  
- System administration tools
- User management capabilities
- Data import/export functions
- System health monitoring

**Workflow**:
1. Login → Choose Dashboard OR Admin Panel
2. **Dashboard** (`/dashboard`): Same as regular users
3. **Admin Panel** (`/admin`): Management interface
   - Overview: System stats, health status
   - Fatwa Management: Create, edit, delete fatwas
   - Category Management: Organize category structure
   - System Tools: Data sync, backups, import/export

---

## 🗺️ **Page Structure & Navigation**

### **Frontend Routes**:
```
/                    → HomePage (public)
/login              → LoginPage (public)
/dashboard          → DashboardPage (auth required)
/admin              → AdminPage (admin/scholar only)
/category/:id       → CategoryPage (public)
/fatwa/:id          → FatwaDetailPage (public)
*                   → NotFoundPage
```

### **Navigation Flow**:
```
Public User:
HomePage → [Login] → Dashboard → Admin (if authorized)

Category Browsing:
HomePage → CategoryPage → FatwaDetailPage

Search Flow:
Any Page → Search → Results → FatwaDetailPage
```

---

## 🔧 **API Endpoints Reference**

### **Authentication** (`/api/auth/`)
- `POST /login` - User authentication
- `POST /validate` - Token validation  
- `GET /me` - Current user info
- `GET /roles` - Available roles (admin only)

### **Fatwa Management** (`/api/fatwa/`)
- `GET /` - Get all fatwas (paginated)
- `GET /search` - Search fatwas (supports empty query)
- `GET /{id}` - Get specific fatwa
- `GET /{id}/similar` - Get similar fatwas
- `POST /` - Create fatwa (admin only)
- `PUT /{id}` - Update fatwa (admin only)
- `DELETE /{id}` - Delete fatwa (admin only)

### **Category Management** (`/api/category/`)
- `GET /` - Get all categories
- `GET /hierarchy` - Get category tree structure
- `GET /top-level` - Get root categories
- `GET /{id}/children` - Get subcategories
- `GET /{id}/fatwas` - Get fatwas in category (paginated)
- `GET /valid` - Get valid category names
- `POST /initialize` - Initialize category structure (admin)
- `POST /sync-fatwas` - Sync category-fatwa relationships (admin)

### **System Management** (`/api/system/`)
- `GET /mongodb-status` - Database health
- `GET /milvus-status` - Vector DB health  
- `GET /stats` - System statistics

### **User Settings** (`/api/user/`)
- `GET /{userId}/settings` - User preferences
- `PUT /{userId}/settings` - Update preferences

---

## 💾 **Data Structure & Relationships**

### **Fatwa Document**:
```json
{
  "fatwa_id": 1,
  "title_ar": "عنوان الفتوى",
  "title_en": "Fatwa Title",
  "question_ar": "السؤال",
  "question_en": "Question",
  "answer_ar": "الجواب", 
  "answer_en": "Answer",
  "category": "العبادات",
  "tags": ["صلاة", "طهارة"],
  "created_at": "2024-01-01T00:00:00Z",
  "is_active": true,
  "is_embedded": false
}
```

### **Category Document**:
```json
{
  "id": 1,
  "title": "العبادات",
  "parent_id": null,
  "description": "أحكام العبادات",
  "fatwa_ids": [1, 2, 3],
  "created_at": "2024-01-01T00:00:00Z",
  "is_active": true
}
```

### **Category Hierarchy**:
```
العبادات (Worship)
├── الصلاة (Prayer)
│   ├── شروط الصلاة (Prayer Conditions)  
│   └── أركان الصلاة (Prayer Pillars)
├── الزكاة (Zakat)
└── الصوم (Fasting)
```

---

## 🔄 **Data Flow & Integration**

### **Search Process**:
1. **Frontend** → Send search request to `/api/fatwa/search`
2. **Backend** → Try Python AI service for semantic search
3. **Fallback** → Use MongoDB text search if AI service fails
4. **Response** → Paginated results with relevance scores

### **Category-Fatwa Relationship**:
1. **Data Loading** → Fatwas loaded with category names
2. **Synchronization** → Backend matches fatwas to categories
3. **Population** → CategoryDocument.fatwa_ids updated
4. **Retrieval** → Categories show linked fatwas

### **Authentication Flow**:
1. **Login** → Backend validates credentials
2. **Token** → JWT token generated and returned
3. **Storage** → Frontend stores token in localStorage
4. **Requests** → Token included in API headers
5. **Validation** → Backend validates token on protected routes

---

## 🐛 **Common Issues & Solutions**

### **Categories Show No Fatwas**:
**Cause**: CategoryDocument.fatwa_ids not populated  
**Solution**: Call `/api/category/sync-fatwas` or restart backend (auto-sync)

### **Search Returns 400 Error**:
**Cause**: Empty query validation  
**Solution**: Backend now handles empty queries by returning all fatwas

### **Login Failed**:
**Cause**: Property name mismatch (Token vs token)  
**Solution**: Frontend handles both formats

### **API Connection Issues**:
**Cause**: Docker networking problems  
**Solution**: Check CORS settings and proxy configuration

---

## 🚀 **Admin Operations**

### **Category Synchronization**:
```bash
# Manual trigger via API
POST /api/category/sync-fatwas
Authorization: Bearer {admin_token}

# Automatic on startup
# Happens automatically when backend starts
```

### **Data Management**:
```bash
# Initialize categories
POST /api/category/initialize

# System health check  
GET /api/system/mongodb-status
GET /api/system/milvus-status
```

### **Fatwa Management**:
```bash
# Create new fatwa
POST /api/fatwa
{
  "fatwaId": 1001,
  "titleAr": "عنوان جديد",
  "questionAr": "سؤال جديد", 
  "answerAr": "جواب جديد",
  "category": "العبادات"
}

# Update existing
PUT /api/fatwa/1001
{
  "titleEn": "Updated Title"
}
```

---

## 🔐 **Security & Permissions**

### **Route Protection**:
- `/dashboard` → Requires authentication
- `/admin` → Requires admin/scholar role
- Category/Fatwa creation → Admin only
- System operations → Admin only

### **API Authorization**:
- Public endpoints: Search, browse, view
- Protected endpoints: User settings, dashboard data
- Admin endpoints: CRUD operations, system management

### **Data Access**:
- Public: Read-only access to active fatwas
- Users: Full read access + personalization
- Admins: Full CRUD access + system management

---

## 📊 **Performance & Monitoring**

### **Health Endpoints**:
- `/health` → Basic API health
- `/api/system/mongodb-status` → Database connection
- `/api/system/milvus-status` → Vector DB status

### **Optimization**:
- Search results cached for 5 minutes
- Category hierarchy cached in memory
- Database indexes on search fields
- Pagination limits large result sets

### **Monitoring**:
- API response times logged
- Search query patterns tracked
- Database connection health monitored
- Container resource usage tracked

---

## 🎯 **User Experience Guidelines**

### **Dashboard Purpose**:
- **Primary**: Search and browse fatwas efficiently
- **Secondary**: View recent activity, saved searches
- **Audience**: All authenticated users

### **Admin Panel Purpose**:
- **Primary**: Manage content and system administration
- **Secondary**: Monitor system health and performance  
- **Audience**: Administrators and scholars only

### **Navigation Logic**:
- **Login Success** → Dashboard (primary interface)
- **Dashboard Header** → "Admin Panel" button (if authorized)
- **Admin Panel** → "Back to Dashboard" button
- **All Pages** → Breadcrumb navigation

---

**🎉 The IFTAA system provides a complete Islamic knowledge management platform with clear user workflows and robust data integration!**