# 🚀 IFTAA API Postman Collection - Ready to Use

Complete Postman collection for testing all IFTAA .NET Core APIs with automatic JWT authentication.

## 📦 Quick Setup (3 steps)

### 1. Import Collection & Environment
1. **Import Collection**: `IFTAA_Complete_APIs.postman_collection.json`
2. **Import Environment**: `IFTAA_Environment.postman_environment.json`
3. **Select Environment**: Choose "IFTAA Development Environment" in Postman

### 2. Start Your Backend
```bash
# Make sure your .NET API is running on http://localhost:8080
cd src/backend
dotnet run
```

### 3. Test Authentication
1. Open **"🔐 Authentication & Authorization"** folder
2. Run **"Login (Get JWT Token)"** - JWT token will be saved automatically
3. All other requests will use the token automatically!

## 🔑 Default Credentials
- **Username**: `admin`
- **Password**: `IftaaAdmin2024!`

## 📂 API Sections (30+ Endpoints)

### 🔐 Authentication & Authorization (4 endpoints)
- ✅ Login with automatic token saving
- ✅ Get current user info
- ✅ Validate JWT token
- ✅ Get available roles (Admin only)

### 📂 Category Management (8 endpoints)
- ✅ Get all categories
- ✅ Get top-level categories
- ✅ Get child categories
- ✅ Get valid category names
- ✅ Get fatwas by category (paginated)
- ✅ **Get category hierarchy** (with fatwa counts)
- ✅ **Initialize category structure** (Admin)
- ✅ **Sync category-fatwa relationships** (Admin)
- ✅ **Get category diagnostics** (Admin)

### 📖 Fatwa Management (5 endpoints)
- ✅ Create fatwa (Admin only)
- ✅ Get fatwa by ID
- ✅ Update fatwa (Admin only)
- ✅ Delete fatwa (Admin only)
- ✅ Get all fatwas (paginated)

### 🔍 Search & Filter (5 endpoints)
- ✅ Basic search (Arabic/English)
- ✅ Search with category filter
- ✅ Get similar fatwas
- ✅ Advanced search with pagination
- ✅ Multi-language search support

### 👤 User Management (2 endpoints)
- ✅ Get user settings
- ✅ Update user settings

### 📊 System Status & Monitoring (4 endpoints)
- ✅ Check MongoDB status (Admin)
- ✅ Check Milvus Vector DB status (Admin)
- ✅ Get system statistics (Admin)
- ✅ **Get category statistics** (Admin)

### 🔍 System Health (2 endpoints)
- ✅ Health check
- ✅ Swagger UI access

## 🛠️ Environment Variables (Auto-configured)

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:8080` | API base URL |
| `username` | `admin` | Login username |
| `password` | `IftaaAdmin2024!` | Login password |
| `jwt_token` | *(auto-filled)* | JWT authentication token |
| `category_id` | `1` | Sample category ID (عبادات) |
| `fatwa_id` | `1` | Sample fatwa ID |
| `search_query_ar` | `صلاة` | Arabic search example |
| `search_query_en` | `prayer` | English search example |
| `language` | `ar` | Default language |
| `page` | `1` | Default page number |
| `pageSize` | `10` | Default page size |

## 🚦 Usage Instructions

### Authentication Flow
1. **First Time**: Run "Login (Get JWT Token)" - saves token automatically
2. **All Requests**: Use saved JWT token automatically
3. **Token Expires**: Just re-run login to refresh

### Testing Categories
- Use `category_id = 1` for "عبادات" (Worship)
- Use `category_id = 2` for "النكاح" (Marriage)
- Use `category_id = 3` for "المعاملات" (Transactions)

### Testing Search
- **Arabic**: Use `{{search_query_ar}}` (صلاة)
- **English**: Use `{{search_query_en}}` (prayer)
- **Category Filter**: Add `categoryId` parameter

### Admin Features
All admin endpoints require JWT token with admin role:
- Category management
- System statistics
- Database status checks

## 🔧 Customization

### Change API URL
Update `base_url` variable to your server:
```
http://your-server:port
```

### Different Credentials
Update `username` and `password` variables

### Test with Real Data
- Update `fatwa_id` with actual fatwa IDs from your database
- Update `category_id` with real category IDs
- Modify search queries for your content

## 📋 Testing Checklist

### ✅ Basic Flow
1. [ ] Login and get JWT token
2. [ ] Get category hierarchy
3. [ ] Search fatwas (Arabic)
4. [ ] Get fatwa by ID
5. [ ] Get fatwas in category

### ✅ Admin Flow
1. [ ] Check system statistics
2. [ ] Get category diagnostics
3. [ ] Create/update fatwa
4. [ ] Sync categories

### ✅ Search Flow
1. [ ] Basic search (Arabic/English)
2. [ ] Category-filtered search
3. [ ] Similar fatwas
4. [ ] Paginated results

## 🆘 Troubleshooting

### Authentication Issues
- **401 Unauthorized**: Run login again
- **Invalid credentials**: Check username/password
- **Token expired**: Re-run login

### Connection Issues
- **Connection refused**: Make sure API is running on `localhost:8080`
- **Wrong base_url**: Update `base_url` variable

### Data Issues
- **Empty results**: Check if database has data
- **Invalid IDs**: Use valid fatwa/category IDs from your database

## 🎯 Pro Tips

1. **Auto-Login**: The collection includes auto-login scripts
2. **Environment Variables**: All URLs use variables for easy customization
3. **Batch Testing**: Run entire folders to test multiple endpoints
4. **Response Validation**: Check response schemas and status codes
5. **Logging**: Enable Postman console to debug requests

## 📈 What's New in v3.0
- ✅ Complete API coverage (30+ endpoints)
- ✅ Environment variables for all values
- ✅ Auto-JWT token management
- ✅ Category hierarchy with counts
- ✅ Admin diagnostic tools
- ✅ Multi-language support
- ✅ Ready-to-use configuration

## 🔗 Related Files
- `IFTAA_Complete_APIs.postman_collection.json` - Main collection
- `IFTAA_Environment.postman_environment.json` - Environment variables
- `README.md` - This documentation

---

**Ready to test! 🚀 Import both files and start exploring your IFTAA APIs.**