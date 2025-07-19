using IFTAA_Project.DTOs;
using IFTAA_Project.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IFTAA_Project.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FatwaController : ControllerBase
    {
        private readonly FatwaService _fatwaService;
        private readonly UserService _userService;

        public FatwaController(FatwaService fatwaService, UserService userService)
        {
            _fatwaService = fatwaService;
            _userService = userService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateFatwa(CreateFatwaDto createDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var (fatwa, error) = await _fatwaService.CreateFatwaAsync(createDto);

            if (error != null)
            {
                // Using 409 Conflict for duplicate resource
                return Conflict(new { message = error });
            }

            // Return a 201 Created response with the location of the new resource
            return CreatedAtAction(nameof(GetFatwaById), new { id = fatwa!.FatwaId }, fatwa);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFatwa(int id, UpdateFatwaDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var (updatedFatwa, error) = await _fatwaService.UpdateFatwaAsync(id, updateDto);

            if (error != null)
            {
                return NotFound(new { message = error });
            }

            return Ok(updatedFatwa);
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchFatwas([FromQuery] string query, [FromQuery] string language = "", [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? userId = null)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                var userPref = await _userService.GetUserSettingsAsync(userId);
                if (userPref != null)
                {
                    language = userPref.PreferredLanguage;
                }
            }
            var results = await _fatwaService.SearchFatwasAsync(query, language, page, pageSize);
            return Ok(results);
        }

        [HttpGet("{id}/similar")]
        public async Task<IActionResult> GetSimilarFatwas(int id, [FromQuery] int limit = 5, [FromQuery] string lang = "", [FromQuery] string? userId = null)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                var userPref = await _userService.GetUserSettingsAsync(userId);
                if (userPref != null)
                {
                    lang = userPref.PreferredLanguage;
                }
            }
            var results = await _fatwaService.GetSimilarFatwasAsync(id, limit, lang);
            if (results == null)
            {
                return NotFound();
            }
            return Ok(results);
        }

        // Placeholder for GetFatwaById to make CreatedAtAction work
        [HttpGet("{id}")]
        public async Task<IActionResult> GetFatwaById(int id, [FromQuery] string language = "ar")
        {
            var fatwa = await _fatwaService.GetFatwaByIdAsync(id, language);

            if (fatwa == null)
            {
                return NotFound();
            }

            return Ok(fatwa);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFatwa(int id)
        {
            var result = await _fatwaService.DeleteFatwaAsync(id);
            
            if (!result)
            {
                return NotFound(new { message = "Fatwa not found" });
            }
            
            return Ok(new { message = "Fatwa deleted successfully" });
        }

        [HttpGet]
        public async Task<IActionResult> GetAllFatwas([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string language = "", [FromQuery] string? userId = null)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                var userPref = await _userService.GetUserSettingsAsync(userId);
                if (userPref != null)
                {
                    language = userPref.PreferredLanguage;
                }
            }
            var results = await _fatwaService.GetAllFatwasAsync(page, pageSize, language);
            return Ok(results);
        }
    }
} 