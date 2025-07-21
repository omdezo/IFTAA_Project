using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace IFTAA_Project.Models
{
    public class CategoryDocument
    {
        [BsonId]
        [BsonRepresentation(BsonType.Int32)]
        public int Id { get; set; }
        
        public string Title { get; set; } = "";
        
        [BsonElement("parent_id")]
        public int? ParentId { get; set; }
        
        public string Description { get; set; } = "";
        
        [BsonElement("fatwa_ids")]
        public List<int>? FatwaIds { get; set; }
        
        [BsonElement("created_at")]
        public DateTime CreatedAt { get; set; }
        
        [BsonElement("updated_at")]
        public DateTime UpdatedAt { get; set; }
        
        [BsonElement("is_active")]
        public bool IsActive { get; set; }
    }
}