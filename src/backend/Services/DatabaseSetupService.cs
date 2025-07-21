using IFTAA_Project.Data;
using IFTAA_Project.Models;
using MongoDB.Driver;

namespace IFTAA_Project.Services
{
    public class DatabaseSetupService
    {
        private readonly IftaaDbContext _dbContext;
        private readonly ILogger<DatabaseSetupService> _logger;

        public DatabaseSetupService(IftaaDbContext dbContext, ILogger<DatabaseSetupService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task EnsureIndexesAsync()
        {
            try
            {
                _logger.LogInformation("Creating database indexes for performance...");

                // Fatwa collection indexes
                var fatwaCollection = _dbContext.Fatwas;
                
                // Index on fatwa_id (primary lookup)
                await fatwaCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<Models.Fatwa>(
                        Builders<Models.Fatwa>.IndexKeys.Ascending(f => f.FatwaId),
                        new CreateIndexOptions { Unique = true, Name = "idx_fatwa_id" }
                    )
                );

                // Index on category (for category-based filtering)
                await fatwaCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<Models.Fatwa>(
                        Builders<Models.Fatwa>.IndexKeys.Ascending(f => f.Category),
                        new CreateIndexOptions { Name = "idx_category" }
                    )
                );

                // Compound index for active fatwas by category
                await fatwaCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<Models.Fatwa>(
                        Builders<Models.Fatwa>.IndexKeys
                            .Ascending(f => f.IsActive)
                            .Ascending(f => f.Category),
                        new CreateIndexOptions { Name = "idx_active_category" }
                    )
                );

                // Text index for search functionality (title, question, answer)
                await fatwaCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<Models.Fatwa>(
                        Builders<Models.Fatwa>.IndexKeys
                            .Text(f => f.TitleAr)
                            .Text(f => f.TitleEn)
                            .Text(f => f.QuestionAr)
                            .Text(f => f.QuestionEn)
                            .Text(f => f.AnswerAr)
                            .Text(f => f.AnswerEn),
                        new CreateIndexOptions { Name = "idx_fulltext_search" }
                    )
                );

                // Index on tags for tag-based searching
                await fatwaCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<Models.Fatwa>(
                        Builders<Models.Fatwa>.IndexKeys.Ascending(f => f.Tags),
                        new CreateIndexOptions { Name = "idx_tags" }
                    )
                );

                // Index on creation date for temporal queries
                await fatwaCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<Models.Fatwa>(
                        Builders<Models.Fatwa>.IndexKeys.Descending(f => f.CreatedAt),
                        new CreateIndexOptions { Name = "idx_created_at" }
                    )
                );

                // Index on embedding status
                await fatwaCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<Models.Fatwa>(
                        Builders<Models.Fatwa>.IndexKeys.Ascending(f => f.IsEmbedded),
                        new CreateIndexOptions { Name = "idx_embedded" }
                    )
                );

                // Categories collection indexes
                var categoriesCollection = _dbContext.Database.GetCollection<CategoryDocument>("categories");
                
                // Unique index on category id
                await categoriesCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<CategoryDocument>(
                        Builders<CategoryDocument>.IndexKeys.Ascending(c => c.Id),
                        new CreateIndexOptions { Unique = true, Name = "idx_category_id" }
                    )
                );

                // Unique index on category title
                await categoriesCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<CategoryDocument>(
                        Builders<CategoryDocument>.IndexKeys.Ascending(c => c.Title),
                        new CreateIndexOptions { Unique = true, Name = "idx_category_title" }
                    )
                );

                // Index on parent ID for hierarchy queries
                await categoriesCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<CategoryDocument>(
                        Builders<CategoryDocument>.IndexKeys.Ascending(c => c.ParentId),
                        new CreateIndexOptions { Name = "idx_parent_id" }
                    )
                );

                // Index on active status
                await categoriesCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<CategoryDocument>(
                        Builders<CategoryDocument>.IndexKeys.Ascending(c => c.IsActive),
                        new CreateIndexOptions { Name = "idx_category_active" }
                    )
                );

                // User collection indexes
                var userCollection = _dbContext.Users;
                
                // Unique index on user ID
                await userCollection.Indexes.CreateOneAsync(
                    new CreateIndexModel<Models.User>(
                        Builders<Models.User>.IndexKeys.Ascending(u => u.UserId),
                        new CreateIndexOptions { Unique = true, Name = "idx_user_id" }
                    )
                );

                _logger.LogInformation("✅ All database indexes created successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to create database indexes");
                throw;
            }
        }

        public async Task<List<string>> GetExistingIndexesAsync()
        {
            try
            {
                var indexes = new List<string>();
                
                // Get fatwa collection indexes
                var fatwaIndexes = await _dbContext.Fatwas.Indexes.ListAsync();
                await fatwaIndexes.ForEachAsync(index => 
                {
                    var indexName = index.GetElement("name").Value.AsString;
                    indexes.Add($"fatwas.{indexName}");
                });

                // Get categories collection indexes
                var categoriesCollection = _dbContext.Database.GetCollection<CategoryDocument>("categories");
                var categoryIndexes = await categoriesCollection.Indexes.ListAsync();
                await categoryIndexes.ForEachAsync(index => 
                {
                    var indexName = index.GetElement("name").Value.AsString;
                    indexes.Add($"categories.{indexName}");
                });

                // Get user collection indexes
                var userIndexes = await _dbContext.Users.Indexes.ListAsync();
                await userIndexes.ForEachAsync(index => 
                {
                    var indexName = index.GetElement("name").Value.AsString;
                    indexes.Add($"users.{indexName}");
                });

                return indexes;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get existing indexes");
                return new List<string>();
            }
        }
    }
}