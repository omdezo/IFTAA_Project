using System.ComponentModel.DataAnnotations;

namespace IFTAA_Project.DTOs
{
    public class UpdateFatwaDto
    {
        [StringLength(500, MinimumLength = 3)]
        public string? TitleAr { get; set; }

        [StringLength(2000, MinimumLength = 10)]
        public string? QuestionAr { get; set; }
        
        [StringLength(10000, MinimumLength = 10)]
        public string? AnswerAr { get; set; }
        
        [ValidCategory(ErrorMessage = "Category must be a valid normalized category")]
        public string? Category { get; set; }
        
        public List<string>? Tags { get; set; }

        public bool ReTranslate { get; set; } = false;

        [Obsolete("Use ReTranslate instead.")]
        public bool AutoTranslate { get => ReTranslate; set => ReTranslate = value; }
    }
} 