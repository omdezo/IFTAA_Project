using System.ComponentModel.DataAnnotations;

namespace IFTAA_Project.DTOs
{
    public class CreateFatwaDto
    {
        [Required]
        public int FatwaId { get; set; }

        [Required]
        [StringLength(500, MinimumLength = 3)]
        public string TitleAr { get; set; } = string.Empty;

        [Required]
        [StringLength(2000, MinimumLength = 10)]
        public string QuestionAr { get; set; } = string.Empty;

        [Required]
        [StringLength(10000, MinimumLength = 10)]
        public string AnswerAr { get; set; } = string.Empty;

        [Required]
        public string Category { get; set; } = string.Empty;

        public List<string> Tags { get; set; } = new List<string>();

        public bool AutoTranslate { get; set; } = true;
    }
} 