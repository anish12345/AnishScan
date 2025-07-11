using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MCPServer.Models.OWASP;

public class Rule
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    
    public string RuleId { get; set; } = string.Empty;
    
    public string Name { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public string Severity { get; set; } = string.Empty; // Critical, High, Medium, Low, Info
    
    public string Category { get; set; } = string.Empty; // Injection, XSS, Authentication, etc.
    
    public string OWASPCategory { get; set; } = string.Empty; // A1, A2, etc.
    
    public List<string> Languages { get; set; } = new List<string>();
    
    public string Pattern { get; set; } = string.Empty;
    
    public string Recommendation { get; set; } = string.Empty;
    
    public List<string> Examples { get; set; } = new List<string>();
    
    public List<string> References { get; set; } = new List<string>();
} 