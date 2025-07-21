using IFTAA_Project.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IFTAA_Project.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoryController : ControllerBase
    {
        private readonly CategoryService _categoryService;
        private readonly ILogger<CategoryController> _logger;

        public CategoryController(CategoryService categoryService, ILogger<CategoryController> logger)
        {
            _categoryService = categoryService;
            _logger = logger;
        }

        /// <summary>
        /// Get all valid category names for creating fatwas
        /// </summary>
        [HttpGet("valid")]
        public ActionResult<List<string>> GetValidCategories()
        {
            try
            {
                var categories = CategoryService.GetValidCategoryNames();
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving valid categories");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get all categories with hierarchy information
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<CategoryHierarchy>>> GetAllCategories([FromQuery] string language = "ar")
        {
            try
            {
                var categories = await _categoryService.GetAllCategoriesAsync(language);
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all categories");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get top-level categories (no parent)
        /// </summary>
        [HttpGet("top-level")]
        public async Task<ActionResult<List<CategoryHierarchy>>> GetTopLevelCategories()
        {
            try
            {
                var categories = await _categoryService.GetTopLevelCategoriesAsync();
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving top-level categories");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get child categories of a specific parent category
        /// </summary>
        [HttpGet("{parentId}/children")]
        public async Task<ActionResult<List<CategoryHierarchy>>> GetChildCategories(int parentId)
        {
            try
            {
                var categories = await _categoryService.GetChildCategoriesAsync(parentId);
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving child categories");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get all fatwas in a category and its descendants
        /// </summary>
        [HttpGet("{categoryId}/fatwas")]
        public async Task<ActionResult<object>> GetFatwasInCategory(int categoryId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string language = "ar")
        {
            try
            {
                var fatwas = await _categoryService.GetFatwasInCategoryAsync(categoryId, page, pageSize);
                
                // Get total count for pagination
                var totalCount = await _categoryService.GetTotalFatwaCountInCategoryAsync(categoryId);
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
                
                // Convert to SearchResult format that frontend expects
                var results = fatwas.Select(fatwa => new 
                {
                    Fatwa = new
                    {
                        fatwa.FatwaId,
                        Title = language == "en" && !string.IsNullOrEmpty(fatwa.TitleEn) ? fatwa.TitleEn : fatwa.TitleAr,
                        TitleAr = fatwa.TitleAr,
                        TitleEn = fatwa.TitleEn,
                        Question = language == "en" && !string.IsNullOrEmpty(fatwa.QuestionEn) ? fatwa.QuestionEn : fatwa.QuestionAr,
                        QuestionAr = fatwa.QuestionAr,
                        QuestionEn = fatwa.QuestionEn,
                        Answer = language == "en" && !string.IsNullOrEmpty(fatwa.AnswerEn) ? fatwa.AnswerEn : fatwa.AnswerAr,
                        AnswerAr = fatwa.AnswerAr,
                        AnswerEn = fatwa.AnswerEn,
                        fatwa.Category,
                        fatwa.Tags,
                        Language = language,
                        fatwa.CreatedAt,
                        fatwa.UpdatedAt
                    },
                    RelevanceScore = 1.0
                }).ToList();
                
                var response = new
                {
                    Results = results,
                    TotalResults = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = totalPages
                };
                
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving fatwas for category");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get hierarchical category structure
        /// </summary>
        [HttpGet("hierarchy")]
        public ActionResult<List<CategoryHierarchy>> GetCategoryHierarchy([FromQuery] string language = "ar")
        {
            try
            {
                _logger.LogInformation($"CategoryController.GetCategoryHierarchy called with language: {language}");
                var hierarchy = _categoryService.GetCategoryHierarchy(language);
                _logger.LogInformation($"Returning {hierarchy.Count} categories. First category title: {hierarchy.FirstOrDefault()?.Title}");
                return Ok(hierarchy);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving category hierarchy");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Initialize category structure in database (Admin only)
        /// </summary>
        [HttpPost("initialize")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult> InitializeCategoryStructure()
        {
            try
            {
                await _categoryService.InitializeCategoryStructureAsync();
                return Ok(new { message = "Category structure initialized successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing category structure");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Synchronize category-fatwa relationships (Admin only)
        /// </summary>
        [HttpPost("sync-fatwas")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult> SyncCategoryFatwaRelationships()
        {
            try
            {
                await _categoryService.SyncCategoryFatwaRelationshipsAsync();
                return Ok(new { message = "Category-fatwa relationships synchronized successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error synchronizing category-fatwa relationships");
                return StatusCode(500, new { message = "Internal server error", details = ex.Message });
            }
        }

        /// <summary>
        /// Get diagnostic information about fatwa categories (Admin only)
        /// </summary>
        [HttpGet("diagnostics")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult> GetCategoryDiagnostics()
        {
            try
            {
                var diagnostics = await _categoryService.GetCategoryDiagnosticsAsync();
                return Ok(diagnostics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting category diagnostics");
                return StatusCode(500, new { message = "Internal server error", details = ex.Message });
            }
        }
    }
}