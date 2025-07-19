using IFTAA_Project.DTOs;
using IFTAA_Project.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IFTAA_Project.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly UserService _userService;

        public UserController(UserService userService)
        {
            _userService = userService;
        }

        [HttpPut("{userId}/settings")]
        public async Task<IActionResult> UpdateUserSettings(string userId, [FromBody] UpdateUserSettingsDto settingsDto)
        {
            var (user, error) = await _userService.UpdateUserSettingsAsync(userId, settingsDto);

            if (error != null)
            {
                return BadRequest(new { message = error });
            }

            return Ok(user);
        }

        [HttpGet("{userId}/settings")]
        public async Task<IActionResult> GetUserSettings(string userId)
        {
            var user = await _userService.GetUserSettingsAsync(userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(user);
        }
    }
} 