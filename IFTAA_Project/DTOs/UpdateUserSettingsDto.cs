    public class SearchPreferencesDto
    {
        public bool IncludeArabic { get; set; } = true;
        public bool IncludeEnglish { get; set; } = true;
    }

    public class UpdateUserSettingsDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string PreferredLanguage { get; set; } = "ar";

        public int ResultsPerPage { get; set; } = 10;

        public SearchPreferencesDto SearchPreferences { get; set; } = new SearchPreferencesDto();
    } 