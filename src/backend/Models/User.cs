namespace IFTAA_Project.Models
{
    public class User
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty; // Can be a GUID or a unique name
        public string PreferredLanguage { get; set; } = "ar"; // Default to Arabic
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int ResultsPerPage { get; set; } = 10;
        public bool IncludeArabic { get; set; } = true;
        public bool IncludeEnglish { get; set; } = true;
    }
} 