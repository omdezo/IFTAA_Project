using IFTAA_Project.Data;
using IFTAA_Project.DTOs;
using IFTAA_Project.Models;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Newtonsoft.Json;
using System.Net.Http;
using System.Text;

namespace IFTAA_Project.Services
{
    public class FatwaService
    {
        private readonly IftaaDbContext _dbContext;
        private readonly HttpClient _httpClient;
        private readonly ILogger<FatwaService> _logger;
        private readonly string _pythonServiceUrl;
        private readonly CategoryService _categoryService;

        public FatwaService(IftaaDbContext dbContext, HttpClient httpClient, 
                           ILogger<FatwaService> logger, IConfiguration configuration, CategoryService categoryService)
        {
            _dbContext = dbContext;
            _httpClient = httpClient;
            _logger = logger;
            _pythonServiceUrl = configuration["PythonServiceUrl"] ?? "http://python-ai-service:5001";
            _categoryService = categoryService;
        }

        public async Task<(Fatwa? fatwa, string? error)> CreateFatwaAsync(CreateFatwaDto createDto)
        {
            try
            {
                // Check if fatwa with same ID already exists
                var existingFatwa = await _dbContext.Fatwas
                    .Find(f => f.FatwaId == createDto.FatwaId)
                    .FirstOrDefaultAsync();
                
                if (existingFatwa != null)
                {
                    return (null, "A fatwa with this ID already exists");
                }

                var fatwa = new Fatwa
                {
                    FatwaId = createDto.FatwaId,
                    TitleAr = createDto.TitleAr,
                    QuestionAr = createDto.QuestionAr,
                    AnswerAr = createDto.AnswerAr,
                    Category = createDto.Category,
                    Tags = createDto.Tags,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true,
                    IsEmbedded = false
                };

                // If auto-translate is enabled, translate to English
                if (createDto.AutoTranslate)
                {
                    var translationResult = await TranslateToEnglishAsync(fatwa);
                    if (translationResult != null)
                    {
                        fatwa.TitleEn = translationResult.TitleEn;
                        fatwa.QuestionEn = translationResult.QuestionEn;
                        fatwa.AnswerEn = translationResult.AnswerEn;
                    }
                }

                await _dbContext.Fatwas.InsertOneAsync(fatwa);

                // Call Python service to generate embeddings
                var embedRequest = new
                {
                    FatwaId = fatwa.FatwaId,
                    Title = fatwa.TitleAr,
                    Question = fatwa.QuestionAr,
                    Answer = fatwa.AnswerAr,
                    Category = fatwa.Category,
                    Tags = fatwa.Tags,
                    Language = "ar"
                };
                var jsonString = JsonConvert.SerializeObject(embedRequest, new JsonSerializerSettings 
                { 
                    StringEscapeHandling = StringEscapeHandling.EscapeNonAscii 
                });
                var content = new StringContent(jsonString, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_pythonServiceUrl}/api/embed_fatwa", content);
                
                if (response.IsSuccessStatusCode)
                {
                    // Mark fatwa as embedded
                    var updateFilter = Builders<Fatwa>.Filter.Eq(f => f.FatwaId, fatwa.FatwaId);
                    var update = Builders<Fatwa>.Update.Set(f => f.IsEmbedded, true);
                    await _dbContext.Fatwas.UpdateOneAsync(updateFilter, update);
                    _logger.LogInformation($"Successfully generated embeddings for fatwa {fatwa.FatwaId}");
                }
                else
                {
                    _logger.LogError($"Failed to generate embeddings: {response.StatusCode}");
                }

                return (fatwa, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating fatwa");
                return (null, $"Error creating fatwa: {ex.Message}");
            }
        }

        public async Task<(Fatwa? fatwa, string? error)> UpdateFatwaAsync(int id, UpdateFatwaDto updateDto)
        {
            try
            {
                var fatwa = await _dbContext.Fatwas
                    .Find(f => f.FatwaId == id)
                    .FirstOrDefaultAsync();
                
                if (fatwa == null)
                {
                    return (null, "Fatwa not found");
                }

                // Update fields if provided
                if (!string.IsNullOrEmpty(updateDto.TitleAr))
                    fatwa.TitleAr = updateDto.TitleAr;
                
                if (!string.IsNullOrEmpty(updateDto.QuestionAr))
                    fatwa.QuestionAr = updateDto.QuestionAr;
                
                if (!string.IsNullOrEmpty(updateDto.AnswerAr))
                    fatwa.AnswerAr = updateDto.AnswerAr;
                
                if (!string.IsNullOrEmpty(updateDto.Category))
                    fatwa.Category = updateDto.Category;
                
                if (updateDto.Tags != null)
                    fatwa.Tags = updateDto.Tags;
                
                fatwa.UpdatedAt = DateTime.UtcNow;

                // Re-translate if needed
                if (updateDto.ReTranslate)
                {
                    var translationResult = await TranslateToEnglishAsync(fatwa);
                    if (translationResult != null)
                    {
                        fatwa.TitleEn = translationResult.TitleEn;
                        fatwa.QuestionEn = translationResult.QuestionEn;
                        fatwa.AnswerEn = translationResult.AnswerEn;
                    }
                }

                var filter = Builders<Fatwa>.Filter.Eq(f => f.FatwaId, id);
                await _dbContext.Fatwas.ReplaceOneAsync(filter, fatwa);

                // Update embeddings
                var embedRequest = new
                {
                    FatwaId = fatwa.FatwaId,
                    Title = fatwa.TitleAr,
                    Question = fatwa.QuestionAr,
                    Answer = fatwa.AnswerAr,
                    Category = fatwa.Category,
                    Tags = fatwa.Tags,
                    Language = "ar"
                };
                var jsonString = JsonConvert.SerializeObject(embedRequest, new JsonSerializerSettings 
                { 
                    StringEscapeHandling = StringEscapeHandling.EscapeNonAscii 
                });
                var content = new StringContent(jsonString, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_pythonServiceUrl}/api/embed_fatwa", content);
                
                if (response.IsSuccessStatusCode)
                {
                    // Mark fatwa as embedded
                    var updateFilter = Builders<Fatwa>.Filter.Eq(f => f.FatwaId, fatwa.FatwaId);
                    var update = Builders<Fatwa>.Update.Set(f => f.IsEmbedded, true);
                    await _dbContext.Fatwas.UpdateOneAsync(updateFilter, update);
                    _logger.LogInformation($"Successfully updated embeddings for fatwa {fatwa.FatwaId}");
                }
                else
                {
                    _logger.LogError($"Failed to update embeddings: {response.StatusCode}");
                }

                return (fatwa, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating fatwa");
                return (null, $"Error updating fatwa: {ex.Message}");
            }
        }

        public async Task<FatwaResponseDto?> GetFatwaByIdAsync(int id, string language = "ar")
        {
            try
            {
                var fatwa = await _dbContext.Fatwas
                    .Find(f => f.FatwaId == id)
                    .FirstOrDefaultAsync();
                
                if (fatwa == null)
                {
                    return null;
                }

                return MapToResponseDto(fatwa, language);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving fatwa with ID {id}");
                return null;
            }
        }

        public async Task<bool> DeleteFatwaAsync(int id)
        {
            try
            {
                // Delete from MongoDB
                var deleteResult = await _dbContext.Fatwas.DeleteOneAsync(f => f.FatwaId == id);
                if (deleteResult.DeletedCount == 0)
                {
                    return false;
                }

                // Delete from vector database through Python service
                var response = await _httpClient.DeleteAsync($"{_pythonServiceUrl}/api/delete_fatwa/{id}");
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to delete embeddings for fatwa {id}: {response.StatusCode}");
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting fatwa with ID {id}");
                return false;
            }
        }

        public async Task<PaginatedSearchResponseDto> SearchFatwasAsync(string query, string language = "", int page = 1, int pageSize = 10, int? categoryId = null)
        {
            try
            {
                // Default to Arabic if language not specified
                language = string.IsNullOrEmpty(language) ? "ar" : language;
                
                // Get category names for filtering if categoryId is provided
                List<string>? categoryNames = null;
                if (categoryId.HasValue)
                {
                    categoryNames = GetCategoryAndChildrenNames(categoryId.Value);
                }
                
                // Use improved fallback search with category name filtering
                return await FallbackTextSearchWithCategoryFilterAsync(query, language, page, pageSize, categoryNames);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching fatwas");
                return new PaginatedSearchResponseDto
                {
                    Results = new List<SearchResultDto>(),
                    TotalResults = 0,
                    Page = page,
                    PageSize = pageSize
                };
            }
        }

        public async Task<List<FatwaResponseDto>> GetSimilarFatwasAsync(int id, int limit = 5, string lang = "ar")
        {
            try
            {
                // STEP 1: Get the source fatwa by ID
                var sourceFatwa = await _dbContext.Fatwas
                    .Find(f => f.FatwaId == id)
                    .FirstOrDefaultAsync();
                
                if (sourceFatwa == null)
                {
                    _logger.LogWarning($"Source fatwa with ID {id} not found for similarity search");
                    return new List<FatwaResponseDto>();
                }

                // STEP 2: Use the fatwa's question as the search query
                string searchQuery = lang == "en" && !string.IsNullOrEmpty(sourceFatwa.QuestionEn) 
                    ? sourceFatwa.QuestionEn 
                    : sourceFatwa.QuestionAr;
                
                // STEP 3: Call the semantic search service
                var response = await _httpClient.GetAsync(
                    $"{_pythonServiceUrl}/api/search?query={Uri.EscapeDataString(searchQuery)}&lang={lang}&page=1&page_size={limit + 1}");
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to get similar fatwas: {response.StatusCode}");
                    return new List<FatwaResponseDto>();
                }

                var jsonString = await response.Content.ReadAsStringAsync();
                var pythonResult = JsonConvert.DeserializeObject<PythonSearchResult>(jsonString);
                
                if (pythonResult?.results == null)
                {
                    return new List<FatwaResponseDto>();
                }

                // STEP 4: Filter out the original fatwa and take the top 'limit' results
                var similarFatwas = pythonResult.results
                    .Where(r => r.fatwaId != id)
                    .Take(limit)
                    .Select(r => new FatwaResponseDto
                    {
                        FatwaId = r.fatwaId,
                        Title = r.title,
                        Question = r.question,
                        Answer = r.answer,
                        Category = r.category,
                        Tags = r.tags ?? new List<string>(),
                        Language = r.language,
                        CreatedAt = DateTime.TryParse(r.createdAt, out var createdAt) ? createdAt : DateTime.UtcNow,
                        UpdatedAt = DateTime.TryParse(r.updatedAt, out var updatedAt) ? updatedAt : DateTime.UtcNow
                    })
                    .ToList();
                
                return similarFatwas;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting similar fatwas for ID {id}");
                return new List<FatwaResponseDto>();
            }
        }

        public async Task<PaginatedSearchResponseDto> GetAllFatwasAsync(int page = 1, int pageSize = 20, string language = "")
        {
            try
            {
                var filter = Builders<Fatwa>.Filter.Empty;
                var totalCount = await _dbContext.Fatwas.CountDocumentsAsync(filter);
                
                var fatwas = await _dbContext.Fatwas
                    .Find(filter)
                    .Skip((page - 1) * pageSize)
                    .Limit(pageSize)
                    .ToListAsync();

                var searchResults = fatwas.Select(fatwa => new SearchResultDto
                {
                    Fatwa = MapToResponseDto(fatwa, language),
                    RelevanceScore = 1.0
                }).ToList();

                return new PaginatedSearchResponseDto
                {
                    Results = searchResults,
                    TotalResults = (int)totalCount,
                    Page = page,
                    PageSize = pageSize
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all fatwas");
                return new PaginatedSearchResponseDto
                {
                    Results = new List<SearchResultDto>(),
                    TotalResults = 0,
                    Page = page,
                    PageSize = pageSize
                };
            }
        }

        private async Task<PaginatedSearchResponseDto> FallbackTextSearchAsync(string query, string language, int page, int pageSize, List<int>? categoryFatwaIds = null)
        {
            try
            {
                _logger.LogInformation($"Using fallback text search for query: '{query}'");
                
                var filterConditions = new List<FilterDefinition<Fatwa>>();

                // Only add text search if query is not empty
                if (!string.IsNullOrWhiteSpace(query))
                {
                    filterConditions.Add(Builders<Fatwa>.Filter.Text(query));
                }

                // Add category filtering if specified
                if (categoryFatwaIds != null && categoryFatwaIds.Any())
                {
                    filterConditions.Add(Builders<Fatwa>.Filter.In(f => f.FatwaId, categoryFatwaIds));
                }

                var filter = Builders<Fatwa>.Filter.And(filterConditions);
                
                var totalCount = await _dbContext.Fatwas.CountDocumentsAsync(filter);
                
                var fatwas = await _dbContext.Fatwas
                    .Find(filter)
                    .Skip((page - 1) * pageSize)
                    .Limit(pageSize)
                    .ToListAsync();

                var searchResults = fatwas.Select(fatwa => new SearchResultDto
                {
                    Fatwa = MapToResponseDto(fatwa, language),
                    RelevanceScore = 0.5 // Lower score for text search
                }).ToList();

                return new PaginatedSearchResponseDto
                {
                    Results = searchResults,
                    TotalResults = (int)totalCount,
                    Page = page,
                    PageSize = pageSize
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in fallback text search");
                return new PaginatedSearchResponseDto
                {
                    Results = new List<SearchResultDto>(),
                    TotalResults = 0,
                    Page = page,
                    PageSize = pageSize
                };
            }
        }

        private async Task<Fatwa?> TranslateToEnglishAsync(Fatwa fatwa)
        {
            try
            {
                var request = new
                {
                    text = new
                    {
                        title = fatwa.TitleAr,
                        question = fatwa.QuestionAr,
                        answer = fatwa.AnswerAr
                    },
                    source_lang = "ar",
                    target_lang = "en"
                };

                var content = new StringContent(JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_pythonServiceUrl}/api/translate", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to translate fatwa: {response.StatusCode}");
                    return null;
                }

                var jsonString = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<TranslationResult>(jsonString);
                
                if (result == null) return null;

                return new Fatwa
                {
                    TitleEn = result.title,
                    QuestionEn = result.question,
                    AnswerEn = result.answer
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error translating fatwa");
                return null;
            }
        }

        private FatwaResponseDto MapToResponseDto(Fatwa fatwa, string language = "ar")
        {
            // Choose the appropriate language version
            string title, question, answer;
            
            if (language == "en" && !string.IsNullOrEmpty(fatwa.TitleEn))
            {
                title = fatwa.TitleEn;
                question = fatwa.QuestionEn ?? fatwa.QuestionAr;
                answer = fatwa.AnswerEn ?? fatwa.AnswerAr;
            }
            else
            {
                title = fatwa.TitleAr;
                question = fatwa.QuestionAr;
                answer = fatwa.AnswerAr;
                language = "ar";
            }

            return new FatwaResponseDto
            {
                FatwaId = fatwa.FatwaId,
                Title = title,
                Question = question,
                Answer = answer,
                Category = fatwa.Category,
                Tags = fatwa.Tags,
                Language = language,
                CreatedAt = fatwa.CreatedAt,
                UpdatedAt = fatwa.UpdatedAt
            };
        }

        // Helper method to get category names for filtering
        private List<string> GetCategoryAndChildrenNames(int categoryId)
        {
            // Use the same logic as CategoryService
            return _categoryService.GetCategoryAndChildrenNames(categoryId);
        }

        // Improved fallback search with category name filtering
        private async Task<PaginatedSearchResponseDto> FallbackTextSearchWithCategoryFilterAsync(string query, string language, int page, int pageSize, List<string>? categoryNames)
        {
            var searchText = string.IsNullOrWhiteSpace(query) ? "*" : query;
            
            var filterBuilder = Builders<Fatwa>.Filter;
            FilterDefinition<Fatwa> filter = FilterDefinition<Fatwa>.Empty;

            // Add text search if query is provided
            if (!string.IsNullOrWhiteSpace(query))
            {
                filter = filterBuilder.Text(searchText);
            }

            // Add category filtering if category names are provided
            if (categoryNames != null && categoryNames.Any())
            {
                var categoryFilter = filterBuilder.In(f => f.Category, categoryNames);
                filter = filter == FilterDefinition<Fatwa>.Empty ? categoryFilter : filterBuilder.And(filter, categoryFilter);
            }

            var totalCount = await _dbContext.Fatwas.CountDocumentsAsync(filter);
            var fatwas = await _dbContext.Fatwas.Find(filter)
                                                .Skip((page - 1) * pageSize)
                                                .Limit(pageSize)
                                                .ToListAsync();

            var results = fatwas.Select(fatwa => new SearchResultDto
            {
                Fatwa = MapToResponseDto(fatwa, language),
                RelevanceScore = 0.5 // Default relevance score for text search
            }).ToList();

            return new PaginatedSearchResponseDto
            {
                Results = results,
                TotalResults = (int)totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        // Helper classes for Python service responses
        private class PythonSearchResult
        {
            public List<PythonFatwaResult> results { get; set; } = new();
            public int totalCount { get; set; }
            public int page { get; set; }
            public int pageSize { get; set; }
        }

        private class PythonFatwaResult
        {
            public int fatwaId { get; set; }
            public string title { get; set; } = "";
            public string question { get; set; } = "";
            public string answer { get; set; } = "";
            public string category { get; set; } = "";
            public List<string>? tags { get; set; }
            public string language { get; set; } = "ar";
            public string createdAt { get; set; } = "";
            public string updatedAt { get; set; } = "";
            public double relevanceScore { get; set; } = 0.0;
        }

        private class TranslationResult
        {
            public string title { get; set; } = "";
            public string question { get; set; } = "";
            public string answer { get; set; } = "";
        }
    }
}