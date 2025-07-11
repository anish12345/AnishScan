using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace MCPServer.Models;

public class ScanResult
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    
    public string ScanRequestId { get; set; } = string.Empty;
    
    public string AgentId { get; set; } = string.Empty;
    
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    
    public List<Finding> Findings { get; set; } = new List<Finding>();
    
    public string Summary { get; set; } = string.Empty;
}

public class Finding
{
    public string RuleId { get; set; } = string.Empty;
    
    public string Severity { get; set; } = string.Empty; // Critical, High, Medium, Low, Info
    
    public string FilePath { get; set; } = string.Empty;
    
    public int LineNumber { get; set; }
    
    public string Description { get; set; } = string.Empty;
    
    public string CodeSnippet { get; set; } = string.Empty;
    
    public string Recommendation { get; set; } = string.Empty;
} 