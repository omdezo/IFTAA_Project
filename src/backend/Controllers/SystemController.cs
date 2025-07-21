using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MongoDB.Bson;
using IFTAA_Project.Services;

namespace IFTAA_Project.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "admin")]
    public class SystemController : ControllerBase
    {
        private readonly IMongoDatabase _database;
        private readonly ILogger<SystemController> _logger;

        public SystemController(IMongoDatabase database, ILogger<SystemController> logger)
        {
            _database = database;
            _logger = logger;
        }

        [HttpGet("mongodb-status")]
        public async Task<IActionResult> GetMongoDbStatus()
        {
            try
            {
                var client = _database.Client;
                await client.ListDatabaseNamesAsync();
                
                var fatwaCollection = _database.GetCollection<Models.Fatwa>("fatwas");
                var fatwaCount = await fatwaCollection.CountDocumentsAsync(f => f.IsActive);
                
                return Ok(new
                {
                    status = "connected",
                    database = _database.DatabaseNamespace.DatabaseName,
                    totalFatwas = fatwaCount,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MongoDB status check failed");
                return Ok(new
                {
                    status = "disconnected",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        [HttpGet("milvus-status")]
        public IActionResult GetMilvusStatus()
        {
            try
            {
                // For now, return a placeholder since we'd need to integrate with Milvus directly
                // In a real implementation, you'd check Milvus connection here
                return Ok(new
                {
                    status = "connected",
                    collections = new[] { "fatwas_ar_v2", "fatwas_en_v2" },
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Milvus status check failed");
                return Ok(new
                {
                    status = "disconnected",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetSystemStats()
        {
            try
            {
                var fatwaCollection = _database.GetCollection<Models.Fatwa>("fatwas");
                var userCollection = _database.GetCollection<Models.User>("users");
                
                var totalFatwas = await fatwaCollection.CountDocumentsAsync(f => f.IsActive);
                var embeddedFatwas = await fatwaCollection.CountDocumentsAsync(f => f.IsActive && f.IsEmbedded);
                var totalUsers = await userCollection.CountDocumentsAsync(FilterDefinition<Models.User>.Empty);
                
                // Get fatwas by category
                var pipeline = new[]
                {
                    new BsonDocument("$match", new BsonDocument("is_active", true)),
                    new BsonDocument("$group", new BsonDocument
                    {
                        {"_id", "$category"},
                        {"count", new BsonDocument("$sum", 1)}
                    })
                };
                
                var categoryCounts = await fatwaCollection.Aggregate<dynamic>(pipeline).ToListAsync();
                
                return Ok(new
                {
                    totalFatwas,
                    embeddedFatwas,
                    totalUsers,
                    categoryCounts,
                    embeddingProgress = totalFatwas > 0 ? (double)embeddedFatwas / totalFatwas * 100 : 0,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "System stats collection failed");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("category-stats")]
        public async Task<IActionResult> GetCategoryStats()
        {
            try
            {
                var fatwaCollection = _database.GetCollection<Models.Fatwa>("fatwas");
                
                // Get category distribution
                var pipeline = new BsonDocument[]
                {
                    new BsonDocument("$match", new BsonDocument("is_active", true)),
                    new BsonDocument("$group", new BsonDocument
                    {
                        {"_id", "$category"},
                        {"count", new BsonDocument("$sum", 1)}
                    }),
                    new BsonDocument("$sort", new BsonDocument("count", -1))
                };

                var categoryStats = await fatwaCollection.Aggregate<BsonDocument>(pipeline).ToListAsync();
                var totalFatwas = await fatwaCollection.CountDocumentsAsync(f => f.IsActive);
                
                return Ok(new
                {
                    totalFatwas,
                    totalCategories = categoryStats.Count,
                    categoryDistribution = categoryStats.Take(20).Select(doc => new 
                    {
                        category = doc["_id"].ToString(),
                        count = doc["count"].ToInt32()
                    }),
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting category stats");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
} 