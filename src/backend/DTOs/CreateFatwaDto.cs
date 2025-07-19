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
        [ValidCategory(ErrorMessage = "Category must be a valid normalized category")]
        public string Category { get; set; } = "";
        
        public List<string> Tags { get; set; } = new();

        public bool AutoTranslate { get; set; } = false;
    }

    public class ValidCategoryAttribute : ValidationAttribute
    {
        private static readonly HashSet<string> ValidCategories = new HashSet<string>
        {
            "فتاوى العبادات",
            "فتاوى الصلاة", 
            "فتاوى الزكاة",
            "فتاوى الصوم",
            "فتاوى الحج",
            "فتاوى النكاح",
            "فتاوى الزواج",
            "فتاوى الفراق",
            "فتاوى المعاملات",
            "فتاوى البيوع",
            "الربا",
            "الديون",
            "الشركات",
            "أوجه من المعاملات",
            "فتاوى الوصية – الوقف – بيت المال",
            "فتاوى الوصية",
            "فتاوى الوقف",
            "فتاوى بيت المال",
            "فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج",
            "فتاوى المساجد",
            "مدارس تعليم القرآن الكريم",
            "الأفلاج",
            "فتاوى الأيمان – الكفارات – النذور",
            "فتاوى الأيمان",
            "الكفارات",
            "النذور",
            "فتاوى الذبائح – الأطعمة – التدخين",
            "فتاوى الذبائح",
            "الأطعمة",
            "التدخين",
            "إعلام وتواصل",
            "التوبة والتبعات والحقوق",
            "اللباس والزينة",
            "الحدود والتعزيرات",
            "فقه المواريث",
            "طب"
        };

        public override bool IsValid(object? value)
        {
            if (value is string category)
            {
                return ValidCategories.Contains(category);
            }
            return false;
        }

        public override string FormatErrorMessage(string name)
        {
            return $"The field {name} must be one of the valid normalized categories. Valid categories include: فتاوى العبادات, فتاوى الصلاة, فتاوى الزكاة, etc.";
        }
    }
}