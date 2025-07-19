using IFTAA_Project.Data;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace IFTAA_Project.Services
{
    public class CategoryService
    {
        private readonly IftaaDbContext _dbContext;
        private readonly ILogger<CategoryService> _logger;
        
        public CategoryService(IftaaDbContext dbContext, ILogger<CategoryService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public static readonly List<string> ValidCategories = new()
        {
            "فتاوى العبادات",
            "فتاوى الصلاة", 
            "فتاوى الزكاة",
            "فتاوى الصوم",
            "فتاوى الحج",
            "فتاوى النكاح",
            "فتاوى الزواج",
            "فتاوى الفراق",
            "فتاوى المعاملات",
            "فتاوى البيوع",
            "الربا",
            "الديون",
            "الشركات",
            "أوجه من المعاملات",
            "فتاوى الوصية – الوقف – بيت المال",
            "فتاوى الوصية",
            "فتاوى الوقف",
            "فتاوى بيت المال",
            "فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج",
            "فتاوى المساجد",
            "مدارس تعليم القرآن الكريم",
            "الأفلاج",
            "فتاوى الأيمان – الكفارات – النذور",
            "فتاوى الأيمان",
            "الكفارات",
            "النذور",
            "فتاوى الذبائح – الأطعمة – التدخين",
            "فتاوى الذبائح",
            "الأطعمة",
            "التدخين",
            "إعلام وتواصل",
            "التوبة والتبعات والحقوق",
            "اللباس والزينة",
            "الحدود والتعزيرات",
            "فقه المواريث",
            "طب"
        };

        public async Task<List<CategoryDto>> GetAllCategoriesAsync()
        {
            try
            {
                var categories = await _dbContext.Database
                    .GetCollection<CategoryDocument>("categories")
                    .Find(_ => true)
                    .Sort(Builders<CategoryDocument>.Sort.Ascending("id"))
                    .ToListAsync();

                return categories.Select(c => new CategoryDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    ParentId = c.ParentId,
                    Description = c.Description,
                    FatwaCount = c.FatwaIds?.Count ?? 0,
                    IsActive = c.IsActive
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving categories");
                return new List<CategoryDto>();
            }
        }

        public async Task<List<CategoryDto>> GetTopLevelCategoriesAsync()
        {
            try
            {
                var categories = await _dbContext.Database
                    .GetCollection<CategoryDocument>("categories")
                    .Find(c => c.ParentId == null)
                    .Sort(Builders<CategoryDocument>.Sort.Ascending("id"))
                    .ToListAsync();

                return categories.Select(c => new CategoryDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    ParentId = c.ParentId,
                    Description = c.Description,
                    FatwaCount = c.FatwaIds?.Count ?? 0,
                    IsActive = c.IsActive
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving top-level categories");
                return new List<CategoryDto>();
            }
        }

        public async Task<List<CategoryDto>> GetChildCategoriesAsync(int parentId)
        {
            try
            {
                var categories = await _dbContext.Database
                    .GetCollection<CategoryDocument>("categories")
                    .Find(c => c.ParentId == parentId)
                    .Sort(Builders<CategoryDocument>.Sort.Ascending("id"))
                    .ToListAsync();

                return categories.Select(c => new CategoryDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    ParentId = c.ParentId,
                    Description = c.Description,
                    FatwaCount = c.FatwaIds?.Count ?? 0,
                    IsActive = c.IsActive
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving child categories");
                return new List<CategoryDto>();
            }
        }

        public static bool IsValidCategory(string category)
        {
            return ValidCategories.Contains(category);
        }

        public static List<string> GetValidCategoryNames()
        {
            return ValidCategories.ToList();
        }

        public async Task<object> GetFatwasInCategoryAsync(int categoryId, int page = 1, int pageSize = 20)
        {
            try
            {
                // Get the category and all its descendants
                var category = await _dbContext.Database
                    .GetCollection<CategoryDocument>("categories")
                    .Find(c => c.Id == categoryId)
                    .FirstOrDefaultAsync();

                if (category == null)
                {
                    return new { fatwas = new List<object>(), totalCount = 0, page, pageSize, error = "Category not found" };
                }

                // Get all descendant category IDs (recursive)
                var descendantIds = await GetAllDescendantIdsAsync(categoryId);
                descendantIds.Add(categoryId); // Include the category itself

                // Get all fatwas from this category and descendants
                var allFatwaIds = new List<int>();
                var categories = await _dbContext.Database
                    .GetCollection<CategoryDocument>("categories")
                    .Find(c => descendantIds.Contains(c.Id))
                    .ToListAsync();

                foreach (var cat in categories)
                {
                    if (cat.FatwaIds != null)
                        allFatwaIds.AddRange(cat.FatwaIds);
                }

                // Remove duplicates and get unique fatwa IDs
                var uniqueFatwaIds = allFatwaIds.Distinct().ToList();
                var totalCount = uniqueFatwaIds.Count;

                // Apply pagination
                var paginatedFatwaIds = uniqueFatwaIds
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();

                // Get the actual fatwa documents
                var fatwas = await _dbContext.Fatwas
                    .Find(f => paginatedFatwaIds.Contains(f.FatwaId) && f.IsActive)
                    .ToListAsync();

                // Transform to response format
                var fatwaResults = fatwas.Select(f => new
                {
                    fatwaId = f.FatwaId,
                    titleAr = f.TitleAr,
                    titleEn = f.TitleEn,
                    questionAr = f.QuestionAr,
                    questionEn = f.QuestionEn,
                    answerAr = f.AnswerAr,
                    answerEn = f.AnswerEn,
                    category = f.Category,
                    tags = f.Tags,
                    createdAt = f.CreatedAt,
                    updatedAt = f.UpdatedAt
                }).ToList();

                return new
                {
                    fatwas = fatwaResults,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                    categoryInfo = new
                    {
                        id = category.Id,
                        title = category.Title,
                        description = category.Description,
                        descendantCount = descendantIds.Count - 1 // Exclude self
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving fatwas for category {categoryId}");
                return new { error = "Internal server error", fatwas = new List<object>(), totalCount = 0 };
            }
        }

        private async Task<List<int>> GetAllDescendantIdsAsync(int categoryId)
        {
            var descendants = new List<int>();
            var children = await _dbContext.Database
                .GetCollection<CategoryDocument>("categories")
                .Find(c => c.ParentId == categoryId)
                .ToListAsync();

            foreach (var child in children)
            {
                descendants.Add(child.Id);
                // Recursively get descendants of this child
                var childDescendants = await GetAllDescendantIdsAsync(child.Id);
                descendants.AddRange(childDescendants);
            }

            return descendants;
        }
    }

    public class CategoryDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = "";
        public int? ParentId { get; set; }
        public string Description { get; set; } = "";
        public int FatwaCount { get; set; }
        public bool IsActive { get; set; }
    }

    public class CategoryDocument
    {
        public int Id { get; set; }
        public string Title { get; set; } = "";
        public int? ParentId { get; set; }
        public string Description { get; set; } = "";
        public List<int>? FatwaIds { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsActive { get; set; }
    }
}