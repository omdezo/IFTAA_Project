using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace IFTAA_Project.Models
{
    public class Fatwa
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; } // MongoDB ObjectId

        [BsonElement("fatwa_id")]
        public int FatwaId { get; set; } // The original Fatwa ID from the source

        [BsonElement("title_ar")]
        public string TitleAr { get; set; } = string.Empty;

        [BsonElement("title_en")]
        public string? TitleEn { get; set; }

        [BsonElement("question_ar")]
        public string QuestionAr { get; set; } = string.Empty;

        [BsonElement("question_en")]
        public string? QuestionEn { get; set; }

        [BsonElement("answer_ar")]
        public string AnswerAr { get; set; } = string.Empty;

        [BsonElement("answer_en")]
        public string? AnswerEn { get; set; }

        [BsonElement("category")]
        public string Category { get; set; } = string.Empty;

        [BsonElement("tags")]
        public List<string> Tags { get; set; } = new List<string>();

        [BsonElement("created_at")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updated_at")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("is_active")]
        public bool IsActive { get; set; } = true;
        
        [BsonElement("is_embedded")]
        public bool IsEmbedded { get; set; } = false;
    }
} 