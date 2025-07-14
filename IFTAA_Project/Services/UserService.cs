using IFTAA_Project.DTOs;
using IFTAA_Project.Models;
using MongoDB.Driver;

namespace IFTAA_Project.Services
{
    public class UserService
    {
        private readonly IMongoCollection<User> _users;

        public UserService(IMongoDatabase database)
        {
            _users = database.GetCollection<User>("users");
        }

        public async Task<(User? user, string? error)> UpdateUserSettingsAsync(string userId, UpdateUserSettingsDto settingsDto)
        {
            if (settingsDto.PreferredLanguage != "ar" && settingsDto.PreferredLanguage != "en")
            {
                return (null, "Language must be 'ar' or 'en'.");
            }
            
            var user = await _users.Find(u => u.UserId == userId).FirstOrDefaultAsync();

            if (user == null)
            {
                user = new User 
                { 
                    UserId = userId
                };
                await _users.InsertOneAsync(user);
            }

            user.PreferredLanguage = settingsDto.PreferredLanguage;
            if (settingsDto.ResultsPerPage > 0) user.ResultsPerPage = settingsDto.ResultsPerPage;
            if (settingsDto.SearchPreferences != null)
            {
                user.IncludeArabic = settingsDto.SearchPreferences.IncludeArabic;
                user.IncludeEnglish = settingsDto.SearchPreferences.IncludeEnglish;
            }
            user.UpdatedAt = DateTime.UtcNow;

            var filter = Builders<User>.Filter.Eq(u => u.UserId, userId);
            await _users.ReplaceOneAsync(filter, user);
            
            return (user, null);
        }

        public async Task<Models.User?> GetUserSettingsAsync(string userId)
        {
            try
            {
                var user = await _users.Find(u => u.UserId == userId).FirstOrDefaultAsync();
                return user;
            }
            catch (Exception ex)
            {
                // Log the exception if you have logging configured
                return null;
            }
        }
    }
}

namespace IFTAA_Project.DTOs
{
    public class UpdateUserSettingsDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string PreferredLanguage { get; set; } = "ar";
    }
} 