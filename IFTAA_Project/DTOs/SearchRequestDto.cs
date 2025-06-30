namespace IFTAA_Project.DTOs
{
    public class SearchRequestDto
    {
        public string Query { get; set; }
        public string Language { get; set; } = "ar"; // Default to Arabic
    }
} 