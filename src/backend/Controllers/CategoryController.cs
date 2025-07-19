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
        public async Task<ActionResult<List<CategoryDto>>> GetAllCategories()
        {
            try
            {
                var categories = await _categoryService.GetAllCategoriesAsync();
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
        public async Task<ActionResult<List<CategoryDto>>> GetTopLevelCategories()
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
        public async Task<ActionResult<List<CategoryDto>>> GetChildCategories(int parentId)
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
        public async Task<ActionResult<List<object>>> GetFatwasInCategory(int categoryId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var fatwas = await _categoryService.GetFatwasInCategoryAsync(categoryId, page, pageSize);
                return Ok(fatwas);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving fatwas for category");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}