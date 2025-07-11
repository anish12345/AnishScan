using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MCPServer.Models;

public class ScanRequest
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    
    public string RepositoryUrl { get; set; } = string.Empty;
    
    public string Branch { get; set; } = "main";
    
    public string AgentId { get; set; } = string.Empty;
    
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    
    public string Status { get; set; } = "Pending"; // Pending, InProgress, Completed, Failed
} 