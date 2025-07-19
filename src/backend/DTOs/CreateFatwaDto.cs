using System.ComponentModel.DataAnnotations;

namespace IFTAA_Project.DTOs
{
    public class CreateFatwaDto
    {
        [Required]
        public int FatwaId { get; set; }

        [Obsolete("Use FatwaId instead.")]
        public int fatwa_id { get => FatwaId; set => FatwaId = value; }

        [Required]
        [StringLength(500, MinimumLength = 3)]
        public string TitleAr { get; set; } = "";

        [Required]
        [StringLength(2000, MinimumLength = 10)]
        public string QuestionAr { get; set; } = "";
        
        [Required]
        [StringLength(10000, MinimumLength = 10)]
        public string AnswerAr { get; set; } = "";
        
        [Required]
        public string Category { get; set; } = "";
        
        public List<string> Tags { get; set; } = new();

        public bool AutoTranslate { get; set; } = false;
    }
}