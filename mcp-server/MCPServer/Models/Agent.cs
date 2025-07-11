using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MCPServer.Models;

public class Agent
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    
    public string Name { get; set; } = string.Empty;
    
    public string IpAddress { get; set; } = string.Empty;
    
    public string Capabilities { get; set; } = string.Empty;
    
    public DateTime LastSeen { get; set; } = DateTime.UtcNow;
    
    public bool IsActive { get; set; } = true;
} 