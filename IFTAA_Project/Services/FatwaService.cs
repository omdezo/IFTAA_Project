using IFTAA_Project.DTOs;
using IFTAA_Project.Models;
using MongoDB.Driver;
using MongoDB.Bson;
using System.Linq.Expressions;

namespace IFTAA_Project.Services
{
    public class FatwaService
    {
        private readonly IMongoDatabase _database;
        private readonly IMongoCollection<Fatwa> _fatwas;
        private readonly PythonAiServiceClient _pythonAiServiceClient;
        private readonly ILogger<FatwaService> _logger;

        public FatwaService(IMongoDatabase database, PythonAiServiceClient pythonAiServiceClient, ILogger<FatwaService> logger)
        {
            _database = database;
            _fatwas = database.GetCollection<Fatwa>("fatwas");
            // Ensure text index for fallback search exists
            try
            {
                var textIndex = Builders<Fatwa>.IndexKeys
                    .Text(f => f.TitleAr)
                    .Text(f => f.TitleEn)
                    .Text(f => f.QuestionAr)
                    .Text(f => f.QuestionEn)
                    .Text(f => f.AnswerAr)
                    .Text(f => f.AnswerEn);
                _fatwas.Indexes.CreateOne(new CreateIndexModel<Fatwa>(textIndex, new CreateIndexOptions { Name = "fatwa_text_index" }));
            }
            catch (MongoCommandException ex) when (ex.Code == 85 || ex.Message.Contains("already exists"))
            {
                // Index already exists – ignore
            }
            _pythonAiServiceClient = pythonAiServiceClient;
            _logger = logger;
        }

        public async Task<(Fatwa? fatwa, string? error)> CreateFatwaAsync(CreateFatwaDto createDto)
        {
            // 1. Check for duplicate FatwaId
            var existingFatwa = await _fatwas.Find(f => f.FatwaId == createDto.FatwaId).FirstOrDefaultAsync();
            if (existingFatwa != null)
            {
                return (null, $"Fatwa with ID {createDto.FatwaId} already exists.");
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
                IsActive = true
            };

            // 2. Translate if requested
            if (createDto.AutoTranslate)
            {
                _logger.LogInformation("Translating content for Fatwa ID: {fatwaId}", fatwa.FatwaId);
                fatwa.TitleEn = await _pythonAiServiceClient.TranslateAsync(fatwa.TitleAr);
                fatwa.QuestionEn = await _pythonAiServiceClient.TranslateAsync(fatwa.QuestionAr);
                fatwa.AnswerEn = await _pythonAiServiceClient.TranslateAsync(fatwa.AnswerAr);
            }

            // 3. Save to database
            await _fatwas.InsertOneAsync(fatwa);
            _logger.LogInformation("Saved new fatwa {fatwaId} to the database.", fatwa.FatwaId);

            // 4. Trigger async embedding
            await _pythonAiServiceClient.TriggerEmbeddingAsync(fatwa.FatwaId);

            return (fatwa, null);
        }

        public async Task<FatwaResponseDto?> GetFatwaByIdAsync(int fatwaId, string language)
        {
            var fatwa = await _fatwas.Find(f => f.FatwaId == fatwaId && f.IsActive).FirstOrDefaultAsync();

            if (fatwa == null)
            {
                return null;
            }

            // Map to DTO, respecting the language preference
            return new FatwaResponseDto
            {
                FatwaId = fatwa.FatwaId,
                Title = language.ToLower() == "en" ? fatwa.TitleEn ?? fatwa.TitleAr : fatwa.TitleAr,
                Question = language.ToLower() == "en" ? fatwa.QuestionEn ?? fatwa.QuestionAr : fatwa.QuestionAr,
                Answer = language.ToLower() == "en" ? fatwa.AnswerEn ?? fatwa.AnswerAr : fatwa.AnswerAr,
                Category = fatwa.Category,
                Tags = fatwa.Tags,
                Language = language,
                CreatedAt = fatwa.CreatedAt,
                UpdatedAt = fatwa.UpdatedAt
            };
        }

        public async Task<PaginatedSearchResponseDto> SearchFatwasAsync(string query, string language, int page, int pageSize)
        {
            try
            {
                _logger.LogInformation("Searching for query: '{query}' in language: {language}, page: {page}, pageSize: {pageSize}", query, language, page, pageSize);

                List<int> allMatchingIds = new List<int>();
                List<Fatwa> paginatedFatwas = new List<Fatwa>();
                bool useVectorSearch = false;

                // 1. Try vector search first (most relevant results)
                try
                {
                    // Get more results to ensure we have enough for pagination
                    var vectorSearchIds = await _pythonAiServiceClient.VectorSearchAsync(query, language, 10000);
                    
                    if (vectorSearchIds.Any())
                    {
                        allMatchingIds = vectorSearchIds;
                        useVectorSearch = true;
                        _logger.LogInformation("Vector search found {totalResults} total matching fatwas", allMatchingIds.Count);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Vector search failed, falling back to database search");
                }

                // 2. If vector search failed or returned no results, use database search
                if (!useVectorSearch)
                {
                    try
                    {
                        // Try MongoDB text search
                        var textFilter = Builders<Fatwa>.Filter.Text(query);
                        var activeFilter = Builders<Fatwa>.Filter.Eq(f => f.IsActive, true);
                        var combinedFilter = Builders<Fatwa>.Filter.And(textFilter, activeFilter);
                        
                        var textSearchFatwas = await _fatwas.Find(combinedFilter).ToListAsync();
                        allMatchingIds = textSearchFatwas.Select(f => f.FatwaId).ToList();
                        
                        _logger.LogInformation("MongoDB text search found {totalResults} total matching fatwas", allMatchingIds.Count);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "MongoDB text search failed, trying regex search");
                        
                        // Fallback to regex search
                        try
                        {
                            var regexFilter = Builders<Fatwa>.Filter.Or(
                                Builders<Fatwa>.Filter.Regex(f => f.TitleAr, new MongoDB.Bson.BsonRegularExpression(query, "i")),
                                Builders<Fatwa>.Filter.Regex(f => f.TitleEn, new MongoDB.Bson.BsonRegularExpression(query, "i")),
                                Builders<Fatwa>.Filter.Regex(f => f.QuestionAr, new MongoDB.Bson.BsonRegularExpression(query, "i")),
                                Builders<Fatwa>.Filter.Regex(f => f.QuestionEn, new MongoDB.Bson.BsonRegularExpression(query, "i")),
                                Builders<Fatwa>.Filter.Regex(f => f.AnswerAr, new MongoDB.Bson.BsonRegularExpression(query, "i")),
                                Builders<Fatwa>.Filter.Regex(f => f.AnswerEn, new MongoDB.Bson.BsonRegularExpression(query, "i"))
                            );
                            
                            var activeFilter = Builders<Fatwa>.Filter.Eq(f => f.IsActive, true);
                            var combinedFilter = Builders<Fatwa>.Filter.And(regexFilter, activeFilter);
                            
                            var regexSearchFatwas = await _fatwas.Find(combinedFilter).ToListAsync();
                            allMatchingIds = regexSearchFatwas.Select(f => f.FatwaId).ToList();
                            
                            _logger.LogInformation("Regex search found {totalResults} total matching fatwas", allMatchingIds.Count);
                        }
                        catch (Exception regexEx)
                        {
                            _logger.LogError(regexEx, "All search methods failed");
                        }
                    }
                }

                // 3. Calculate total results
                var totalResults = allMatchingIds.Count;

                // 4. Apply pagination to the matching IDs
                var paginatedIds = allMatchingIds.Skip((page - 1) * pageSize).Take(pageSize).ToList();

                // 5. Fetch the actual Fatwa documents for the paginated IDs
                if (paginatedIds.Any())
                {
                    var filter = Builders<Fatwa>.Filter.And(
                        Builders<Fatwa>.Filter.In(f => f.FatwaId, paginatedIds),
                        Builders<Fatwa>.Filter.Eq(f => f.IsActive, true)
                    );
                    
                    var fatwasFromDb = await _fatwas.Find(filter).ToListAsync();
                    
                    // Maintain the order from search results
                    paginatedFatwas = paginatedIds.Select(id => fatwasFromDb.FirstOrDefault(f => f.FatwaId == id))
                                                 .Where(f => f != null)
                                                 .ToList();
                }

                // 6. Map results to DTOs
                var results = paginatedFatwas.Select(f => new SearchResultDto
                {
                    Fatwa = new FatwaResponseDto
                    {
                        FatwaId = f.FatwaId,
                        Title = language.ToLower() == "en" ? f.TitleEn ?? f.TitleAr : f.TitleAr,
                        Question = language.ToLower() == "en" ? f.QuestionEn ?? f.QuestionAr : f.QuestionAr,
                        Answer = language.ToLower() == "en" ? f.AnswerEn ?? f.AnswerAr : f.AnswerAr,
                        Category = f.Category,
                        Tags = f.Tags,
                        Language = language,
                        CreatedAt = f.CreatedAt,
                        UpdatedAt = f.UpdatedAt
                    },
                    RelevanceScore = useVectorSearch ? 1.0 : 0.8 // Higher score for vector search results
                }).ToList();

                var response = new PaginatedSearchResponseDto
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalResults = totalResults,
                    Results = results
                };

                _logger.LogInformation("Search completed. Returning {resultCount} results out of {totalResults} total on page {page}", 
                    results.Count, totalResults, page);
                
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchFatwasAsync for query: {query}", query);
                
                // Return empty result on error
                return new PaginatedSearchResponseDto
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalResults = 0,
                    Results = new List<SearchResultDto>()
                };
            }
        }

        public async Task<List<FatwaResponseDto>?> GetSimilarFatwasAsync(int fatwaId, int limit, string language = "ar")
        {
            var originalFatwa = await _fatwas.Find(f => f.FatwaId == fatwaId && f.IsActive).FirstOrDefaultAsync();

            if (originalFatwa == null)
            {
                return null;
            }

            try
            {
                // Use the Arabic title as the query for similarity search
                var similarIds = await _pythonAiServiceClient.VectorSearchAsync(originalFatwa.TitleAr, "ar", limit + 1);

                // Filter out the original fatwa ID itself
                var filteredIds = similarIds.Where(id => id != fatwaId).Take(limit).ToList();

                if (filteredIds.Any())
                {
                    var filter = Builders<Fatwa>.Filter.And(
                        Builders<Fatwa>.Filter.In(f => f.FatwaId, filteredIds),
                        Builders<Fatwa>.Filter.Eq(f => f.IsActive, true)
                    );
                    
                    var similarFatwas = await _fatwas.Find(filter).ToListAsync();
                    
                    // Maintain order from vector search
                    var orderedFatwas = filteredIds.Select(id => similarFatwas.FirstOrDefault(f => f.FatwaId == id))
                                                  .Where(f => f != null)
                                                  .ToList();

                    return orderedFatwas.Select(f => new FatwaResponseDto
                    {
                        FatwaId = f.FatwaId,
                        Title = language.ToLower() == "en" ? f.TitleEn ?? f.TitleAr : f.TitleAr,
                        Question = language.ToLower() == "en" ? f.QuestionEn ?? f.QuestionAr : f.QuestionAr,
                        Answer = language.ToLower() == "en" ? f.AnswerEn ?? f.AnswerAr : f.AnswerAr,
                        Category = f.Category,
                        Tags = f.Tags,
                        Language = language,
                        CreatedAt = f.CreatedAt,
                        UpdatedAt = f.UpdatedAt
                    }).ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Vector search failed for similar fatwas, falling back to category search");
            }

            // Fallback to same category search
            var categoryFilter = Builders<Fatwa>.Filter.And(
                Builders<Fatwa>.Filter.Eq(f => f.Category, originalFatwa.Category),
                Builders<Fatwa>.Filter.Ne(f => f.FatwaId, fatwaId),
                Builders<Fatwa>.Filter.Eq(f => f.IsActive, true)
            );
            
            var fallbackFatwas = await _fatwas.Find(categoryFilter).Limit(limit).ToListAsync();
            
            return fallbackFatwas.Select(f => new FatwaResponseDto
            {
                FatwaId = f.FatwaId,
                Title = language.ToLower() == "en" ? f.TitleEn ?? f.TitleAr : f.TitleAr,
                Question = language.ToLower() == "en" ? f.QuestionEn ?? f.QuestionAr : f.QuestionAr,
                Answer = language.ToLower() == "en" ? f.AnswerEn ?? f.AnswerAr : f.AnswerAr,
                Category = f.Category,
                Tags = f.Tags,
                Language = language,
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt
            }).ToList();
        }

        public async Task<(Fatwa? fatwa, string? error)> UpdateFatwaAsync(int fatwaId, UpdateFatwaDto updateDto)
        {
            var fatwa = await _fatwas.Find(f => f.FatwaId == fatwaId && f.IsActive).FirstOrDefaultAsync();

            if (fatwa == null)
            {
                return (null, "Fatwa not found.");
            }

            bool contentChanged = false;

            if (updateDto.TitleAr != null) { fatwa.TitleAr = updateDto.TitleAr; contentChanged = true; }
            if (updateDto.QuestionAr != null) { fatwa.QuestionAr = updateDto.QuestionAr; contentChanged = true; }
            if (updateDto.AnswerAr != null) { fatwa.AnswerAr = updateDto.AnswerAr; contentChanged = true; }
            if (updateDto.Category != null) { fatwa.Category = updateDto.Category; }
            if (updateDto.Tags != null) { fatwa.Tags = updateDto.Tags; }

            if (contentChanged && updateDto.ReTranslate)
            {
                _logger.LogInformation("Re-translating content for Fatwa ID: {fatwaId}", fatwa.FatwaId);
                fatwa.TitleEn = await _pythonAiServiceClient.TranslateAsync(fatwa.TitleAr);
                fatwa.QuestionEn = await _pythonAiServiceClient.TranslateAsync(fatwa.QuestionAr);
                fatwa.AnswerEn = await _pythonAiServiceClient.TranslateAsync(fatwa.AnswerAr);
            }

            fatwa.UpdatedAt = DateTime.UtcNow;
            
            var filter = Builders<Fatwa>.Filter.Eq(f => f.FatwaId, fatwaId);
            await _fatwas.ReplaceOneAsync(filter, fatwa);

            if (contentChanged)
            {
                await _pythonAiServiceClient.TriggerEmbeddingAsync(fatwa.FatwaId);
            }

            return (fatwa, null);
        }

        public async Task<bool> DeleteFatwaAsync(int fatwaId)
        {
            try
            {
                // Check if fatwa exists
                var fatwa = await _fatwas.Find(f => f.FatwaId == fatwaId).FirstOrDefaultAsync();
                if (fatwa == null)
                {
                    return false;
                }

                // Delete from MongoDB
                var deleteResult = await _fatwas.DeleteOneAsync(f => f.FatwaId == fatwaId);
                
                if (deleteResult.DeletedCount > 0)
                {
                    _logger.LogInformation("Deleted fatwa {fatwaId} from MongoDB", fatwaId);
                    await _pythonAiServiceClient.DeleteVectorAsync(fatwaId);
                    return true;
                }
                
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting fatwa {fatwaId}", fatwaId);
                return false;
            }
        }

        public async Task<PaginatedSearchResponseDto> GetAllFatwasAsync(int page, int pageSize, string language)
        {
            try
            {
                var skip = (page - 1) * pageSize;
                
                // Get total count
                var totalCount = await _fatwas.CountDocumentsAsync(f => f.IsActive);
                
                // Get paginated fatwas
                var fatwas = await _fatwas.Find(f => f.IsActive)
                                          .Skip((page - 1) * pageSize)
                                          .Limit(pageSize)
                                          .ToListAsync();

                var results = fatwas.Select(f => new FatwaResponseDto
                {
                    FatwaId = f.FatwaId,
                    Title = language.ToLower() == "en" ? f.TitleEn ?? f.TitleAr : f.TitleAr,
                    Question = language.ToLower() == "en" ? f.QuestionEn ?? f.QuestionAr : f.QuestionAr,
                    Answer = language.ToLower() == "en" ? f.AnswerEn ?? f.AnswerAr : f.AnswerAr,
                    Category = f.Category,
                    Tags = f.Tags,
                    Language = language,
                    CreatedAt = f.CreatedAt,
                    UpdatedAt = f.UpdatedAt
                }).ToList();

                return new PaginatedSearchResponseDto
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalResults = (int)totalCount,
                    Results = results.Select(f => new SearchResultDto { Fatwa = f, RelevanceScore = 1.0 }).ToList()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all fatwas");
                return new PaginatedSearchResponseDto
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalResults = 0,
                    Results = new List<SearchResultDto>()
                };
            }
        }
    }
}