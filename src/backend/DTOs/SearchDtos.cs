namespace IFTAA_Project.DTOs
{
    public class SearchResultDto
    {
        public FatwaResponseDto Fatwa { get; set; } = new FatwaResponseDto();
        public double RelevanceScore { get; set; }
    }

    public class PaginatedSearchResponseDto
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalResults { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalResults / PageSize);
        public List<SearchResultDto> Results { get; set; } = new List<SearchResultDto>();
    }
} 