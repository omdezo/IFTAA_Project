using IFTAA_Project.Data;
using IFTAA_Project.Models;
using MongoDB.Driver;
using MongoDB.Bson;

namespace IFTAA_Project.Services
{
    public class CategoryService
    {
        private readonly IftaaDbContext _context;

        public CategoryService(IftaaDbContext context)
        {
            _context = context;
        }

        // Real Category Mapping - Maps actual fatwa categories to hierarchical structure
        // CLEANED UP - Only includes categories that actually exist in database
                public static readonly Dictionary<string, int> RealCategoryMapping = new()
        {
            ["فتاوى العبادات"] = 1,
            ["فتاوى الصلاة"] = 11,
            ["فتاوى الزكاة"] = 12,
            ["فتاوى الصوم"] = 13,
            ["فتاوى الحج"] = 14,
            ["فتاوى النكاح"] = 2,
            ["فتاوى الزواج"] = 21,
            ["فتاوى الفراق"] = 22,
            ["فتاوى المعاملات"] = 3,
            ["فتاوى البيوع"] = 31,
            ["الربا"] = 32,
            ["الديون"] = 33,
            ["الشركات"] = 34,
            ["أوجه من المعاملات"] = 35,
            ["فتاوى الوصية – الوقف – بيت المال"] = 4,
            ["فتاوى الوصية"] = 41,
            ["فتاوى الوقف"] = 42,
            ["فتاوى بيت المال"] = 43,
            ["فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج"] = 5,
            ["فتاوى المساجد"] = 51,
            ["مدارس تعليم القرآن الكريم"] = 52,
            ["الأفلاج"] = 53,
            ["فتاوى الأيمان – الكفارات – النذور"] = 6,
            ["فتاوى الأيمان"] = 61,
            ["الكفارات"] = 62,
            ["النذور"] = 63,
            ["فتاوى الذبائح والأطعمة"] = 7,
            ["فتاوى الذبائح"] = 71,
            ["الأطعمة"] = 72,
            ["إعلام وتواصل"] = 80,
            ["التوبة والتبعات والحقوق"] = 81,
            ["اللباس والزينة"] = 82,
            ["الحدود والتعزيرات"] = 83,
            ["فقه المواريث"] = 84,
            ["طب"] = 85,
        };

                public static readonly List<CategoryHierarchy> CategoryStructure = new()
        {
            new CategoryHierarchy 
            { 
                Id = 1, Title = "فتاوى العبادات", TitleEn = "Worship Fatwas", 
                Children = new List<CategoryHierarchy>
                {
                    new CategoryHierarchy { Id = 11, Title = "فتاوى الصلاة", TitleEn = "Prayer Fatwas", ParentId = 1 },
                    new CategoryHierarchy { Id = 12, Title = "فتاوى الزكاة", TitleEn = "Zakat Fatwas", ParentId = 1 },
                    new CategoryHierarchy { Id = 13, Title = "فتاوى الصوم", TitleEn = "Fasting Fatwas", ParentId = 1 },
                    new CategoryHierarchy { Id = 14, Title = "فتاوى الحج", TitleEn = "Hajj Fatwas", ParentId = 1 }
                }
            },
            new CategoryHierarchy 
            { 
                Id = 2, Title = "فتاوى النكاح", TitleEn = "Marriage Fatwas", 
                Children = new List<CategoryHierarchy>
                {
                    new CategoryHierarchy { Id = 21, Title = "فتاوى الزواج", TitleEn = "Wedding Fatwas", ParentId = 2 },
                    new CategoryHierarchy { Id = 22, Title = "فتاوى الفراق", TitleEn = "Divorce Fatwas", ParentId = 2 }
                }
            },
            new CategoryHierarchy 
            { 
                Id = 3, Title = "فتاوى المعاملات", TitleEn = "Transaction Fatwas", 
                Children = new List<CategoryHierarchy>
                {
                    new CategoryHierarchy { Id = 31, Title = "فتاوى البيوع", TitleEn = "Sales Fatwas", ParentId = 3 },
                    new CategoryHierarchy { Id = 32, Title = "الربا", TitleEn = "Interest/Usury", ParentId = 3 },
                    new CategoryHierarchy { Id = 33, Title = "الديون", TitleEn = "Debts", ParentId = 3 },
                    new CategoryHierarchy { Id = 34, Title = "الشركات", TitleEn = "Companies", ParentId = 3 },
                    new CategoryHierarchy { Id = 35, Title = "أوجه من المعاملات", TitleEn = "Transaction Aspects", ParentId = 3 }
                }
            },
            new CategoryHierarchy 
            { 
                Id = 4, Title = "فتاوى الوصية – الوقف – بيت المال", TitleEn = "Will, Endowment & Treasury Fatwas", 
                Children = new List<CategoryHierarchy>
                {
                    new CategoryHierarchy { Id = 41, Title = "فتاوى الوصية", TitleEn = "Will Fatwas", ParentId = 4 },
                    new CategoryHierarchy { Id = 42, Title = "فتاوى الوقف", TitleEn = "Endowment Fatwas", ParentId = 4 },
                    new CategoryHierarchy { Id = 43, Title = "فتاوى بيت المال", TitleEn = "Treasury Fatwas", ParentId = 4 }
                }
            },
            new CategoryHierarchy 
            { 
                Id = 5, Title = "فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج", TitleEn = "Mosques, Quran Schools & Irrigation", 
                Children = new List<CategoryHierarchy>
                {
                    new CategoryHierarchy { Id = 51, Title = "فتاوى المساجد", TitleEn = "Mosque Fatwas", ParentId = 5 },
                    new CategoryHierarchy { Id = 52, Title = "مدارس تعليم القرآن الكريم", TitleEn = "Quran Teaching Schools", ParentId = 5 },
                    new CategoryHierarchy { Id = 53, Title = "الأفلاج", TitleEn = "Irrigation Systems", ParentId = 5 }
                }
            },
            new CategoryHierarchy 
            { 
                Id = 6, Title = "فتاوى الأيمان – الكفارات – النذور", TitleEn = "Oaths, Atonements & Vows", 
                Children = new List<CategoryHierarchy>
                {
                    new CategoryHierarchy { Id = 61, Title = "فتاوى الأيمان", TitleEn = "Oath Fatwas", ParentId = 6 },
                    new CategoryHierarchy { Id = 62, Title = "الكفارات", TitleEn = "Atonements", ParentId = 6 },
                    new CategoryHierarchy { Id = 63, Title = "النذور", TitleEn = "Vows", ParentId = 6 }
                }
            },
            new CategoryHierarchy 
            { 
                Id = 7, Title = "فتاوى الذبائح والأطعمة", TitleEn = "Slaughter & Food Fatwas", 
                Children = new List<CategoryHierarchy>
                {
                    new CategoryHierarchy { Id = 71, Title = "فتاوى الذبائح", TitleEn = "Slaughter Fatwas", ParentId = 7 },
                    new CategoryHierarchy { Id = 72, Title = "الأطعمة", TitleEn = "Food Fatwas", ParentId = 7 }
                }
            },
            new CategoryHierarchy 
            { 
                Id = 8, Title = "فتاوى متنوعة", TitleEn = "Miscellaneous Fatwas", 
                Children = new List<CategoryHierarchy>
                {
                    new CategoryHierarchy { Id = 80, Title = "إعلام وتواصل", TitleEn = "Media & Communication", ParentId = 8 },
                    new CategoryHierarchy { Id = 81, Title = "التوبة والتبعات والحقوق", TitleEn = "Repentance & Rights", ParentId = 8 },
                    new CategoryHierarchy { Id = 82, Title = "اللباس والزينة", TitleEn = "Clothing & Adornment", ParentId = 8 },
                    new CategoryHierarchy { Id = 83, Title = "الحدود والتعزيرات", TitleEn = "Punishments", ParentId = 8 },
                    new CategoryHierarchy { Id = 84, Title = "فقه المواريث", TitleEn = "Inheritance Jurisprudence", ParentId = 8 },
                    new CategoryHierarchy { Id = 85, Title = "طب", TitleEn = "Medicine", ParentId = 8 }
                }
            }
        };

        public int GetCategoryId(string categoryName)
        {
            // First try exact match in RealCategoryMapping
            if (RealCategoryMapping.TryGetValue(categoryName, out int categoryId))
            {
                return categoryId;
            }

            // Default fallback to general miscellaneous
            return 8; // Miscellaneous Fatwas
        }

        public List<CategoryHierarchy> GetCategoryHierarchy()
        {
            return CategoryStructure;
        }

        public async Task<List<CategoryHierarchy>> GetAllCategoriesAsync(string language = "ar")
        {
            return CategoryStructure;
        }

        public async Task<List<CategoryHierarchy>> GetTopLevelCategoriesAsync()
        {
            return CategoryStructure.Where(c => c.ParentId == null).ToList();
        }

        public async Task<List<CategoryHierarchy>> GetChildCategoriesAsync(int parentId)
        {
            var parent = CategoryStructure.FirstOrDefault(c => c.Id == parentId);
            if (parent?.Children == null)
            {
                return new List<CategoryHierarchy>();
            }

            // Clone the children and add fatwa counts
            var childrenWithCounts = parent.Children.Select(child => new CategoryHierarchy
            {
                Id = child.Id,
                Title = child.Title,
                TitleEn = child.TitleEn,
                ParentId = child.ParentId,
                FatwaCount = GetFatwaCountForCategory(child.Title),
                Children = child.Children
            }).ToList();

            return childrenWithCounts;
        }

        public static List<string> GetValidCategoryNames()
        {
            return RealCategoryMapping.Keys.ToList();
        }

        public List<CategoryHierarchy> GetCategoryHierarchy(string language)
        {
            // Clone the structure and add fatwa counts
            var hierarchyWithCounts = CategoryStructure.Select(category => new CategoryHierarchy
            {
                Id = category.Id,
                Title = category.Title,
                TitleEn = category.TitleEn,
                ParentId = category.ParentId,
                FatwaCount = GetFatwaCountForCategory(category.Title),
                Children = category.Children?.Select(child => new CategoryHierarchy
                {
                    Id = child.Id,
                    Title = child.Title,
                    TitleEn = child.TitleEn,
                    ParentId = child.ParentId,
                    FatwaCount = GetFatwaCountForCategory(child.Title),
                    Children = child.Children
                }).ToList()
            }).ToList();

            return hierarchyWithCounts;
        }

        private int GetFatwaCountForCategory(string categoryTitle)
        {
            try
            {
                // Find the category in the hierarchy to check if it has children
                var category = FindCategoryByTitle(categoryTitle);
                
                if (category != null && category.Children != null && category.Children.Any())
                {
                    // For parent categories, count all fatwas in child categories
                    var childTitles = category.Children.Select(c => c.Title).ToList();
                    var filter = Builders<Fatwa>.Filter.In("category", childTitles);
                    var count = (int)_context.Fatwas.CountDocuments(filter);
                    return count;
                }
                else
                {
                    // For leaf categories, count fatwas directly assigned to this category
                    var filter = Builders<Fatwa>.Filter.Eq("category", categoryTitle);
                    var count = (int)_context.Fatwas.CountDocuments(filter);
                    return count;
                }
            }
            catch (Exception ex)
            {
                return 0;
            }
        }

        public async Task InitializeCategoryStructureAsync()
        {
            // This method exists for compatibility but doesn't need to do anything
            // since we're using static mappings
            await Task.CompletedTask;
        }

        public async Task SyncCategoryFatwaRelationshipsAsync()
        {
            // This method exists for compatibility but doesn't need to do anything
            // since we're using static mappings
            await Task.CompletedTask;
        }

        public async Task<object> GetCategoryDiagnosticsAsync()
        {
            return new
            {
                TotalCategories = CategoryStructure.Count,
                TotalMappings = RealCategoryMapping.Count,
                MappingKeys = RealCategoryMapping.Keys.ToList()
            };
        }

        public async Task<List<int>> GetAllFatwaIdsInCategoryAndSubcategoriesAsync(int categoryId)
        {
            try
            {
                var fatwaIds = new List<int>();
                
                // Get the category and all its children
                var categoryNames = GetCategoryAndChildrenNames(categoryId);
                
                if (!categoryNames.Any())
                {
                    return fatwaIds;
                }
                
                // Find all fatwas in these categories - using the actual field name from the database
                var filter = Builders<Fatwa>.Filter.In("Category", categoryNames);
                
                // Use the Fatwa model directly instead of projection to avoid field name issues
                var fatwas = await _context.Fatwas.Find(filter).ToListAsync();
                
                if (fatwas.Any())
                {
                    try
                    {
                        fatwaIds.AddRange(fatwas.Select(f => f.FatwaId));
                    }
                    catch (Exception ex2)
                    {
                        throw;
                    }
                }
                
                return fatwaIds;
            }
            catch (Exception ex)
            {
                return new List<int>();
            }
        }
        
        public List<string> GetCategoryAndChildrenNames(int categoryId)
        {
            var categoryNames = new List<string>();
            
            // Find the category in the hierarchy
            var category = FindCategoryById(categoryId);
            if (category != null)
            {
                categoryNames.Add(category.Title);
                
                // Add all children names
                categoryNames.AddRange(GetAllChildrenNames(category));
            }
            
            return categoryNames;
        }
        
        private CategoryHierarchy? FindCategoryById(int categoryId)
        {
            // Search in top-level categories
            var topLevel = CategoryStructure.FirstOrDefault(c => c.Id == categoryId);
            if (topLevel != null)
            {
                return topLevel;
            }
            
            // Search in children
            foreach (var parent in CategoryStructure)
            {
                var child = FindCategoryInChildren(parent.Children, categoryId);
                if (child != null)
                {
                    return child;
                }
            }
            
            return null;
        }
        
        private CategoryHierarchy? FindCategoryInChildren(List<CategoryHierarchy> children, int categoryId)
        {
            foreach (var child in children)
            {
                if (child.Id == categoryId)
                {
                    return child;
                }
                
                var grandChild = FindCategoryInChildren(child.Children, categoryId);
                if (grandChild != null)
                {
                    return grandChild;
                }
            }
            
            return null;
        }
        
        private List<string> GetAllChildrenNames(CategoryHierarchy category)
        {
            var names = new List<string>();
            
            foreach (var child in category.Children)
            {
                names.Add(child.Title);
                names.AddRange(GetAllChildrenNames(child));
            }
            
            return names;
        }
        
        private CategoryHierarchy? FindCategoryByTitle(string title)
        {
            // Search in top-level categories
            var topLevel = CategoryStructure.FirstOrDefault(c => c.Title == title);
            if (topLevel != null)
            {
                return topLevel;
            }
            
            // Search in children
            foreach (var parent in CategoryStructure)
            {
                var child = FindCategoryByTitleInChildren(parent.Children, title);
                if (child != null)
                {
                    return child;
                }
            }
            
            return null;
        }
        
        private CategoryHierarchy? FindCategoryByTitleInChildren(List<CategoryHierarchy> children, string title)
        {
            foreach (var child in children)
            {
                if (child.Title == title)
                {
                    return child;
                }
                
                var grandChild = FindCategoryByTitleInChildren(child.Children, title);
                if (grandChild != null)
                {
                    return grandChild;
                }
            }
            
            return null;
        }

        public async Task<List<Fatwa>> GetFatwasInCategoryAsync(int categoryId, int page = 1, int pageSize = 10)
        {
            try
            {
                // Get the category and all its children names
                var categoryNames = GetCategoryAndChildrenNames(categoryId);
                
                if (!categoryNames.Any())
                {
                    return new List<Fatwa>();
                }
                
                // Build filter for fatwas in these categories - using the actual field name from the database
                var filter = Builders<Fatwa>.Filter.In("category", categoryNames);
                
                // Get fatwas with pagination
                var fatwas = await _context.Fatwas
                    .Find(filter)
                    .Skip((page - 1) * pageSize)
                    .Limit(pageSize)
                    .ToListAsync();
                
                return fatwas;
            }
            catch (Exception ex)
            {
                // Log error if you have logging
                return new List<Fatwa>();
            }
        }

        public async Task<int> GetTotalFatwaCountInCategoryAsync(int categoryId)
        {
            try
            {
                // Get the category and all its children names
                var categoryNames = GetCategoryAndChildrenNames(categoryId);
                
                if (!categoryNames.Any())
                {
                    return 0;
                }
                
                // Build filter for fatwas in these categories - using the actual field name from the database
                var filter = Builders<Fatwa>.Filter.In("category", categoryNames);
                
                // Count total fatwas
                var count = await _context.Fatwas.CountDocumentsAsync(filter);
                
                return (int)count;
            }
            catch (Exception ex)
            {
                // Log error if you have logging
                return 0;
            }
        }
    }

    public class CategoryHierarchy
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string TitleEn { get; set; } = string.Empty;
        public int? ParentId { get; set; }
        public int FatwaCount { get; set; } = 0;
        public List<CategoryHierarchy> Children { get; set; } = new();
    }
}