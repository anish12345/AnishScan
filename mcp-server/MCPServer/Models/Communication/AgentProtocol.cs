using System.Text.Json.Serialization;

namespace MCPServer.Models.Communication;

/// <summary>
/// Base message for all agent communication
/// </summary>
public class AgentMessage
{
    [JsonPropertyName("messageType")]
    public string MessageType { get; set; } = string.Empty;
    
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    [JsonPropertyName("agentId")]
    public string AgentId { get; set; } = string.Empty;
}

/// <summary>
/// Message sent by agent to register with MCP
/// </summary>
public class AgentRegistrationMessage : AgentMessage
{
    public AgentRegistrationMessage()
    {
        MessageType = "AgentRegistration";
    }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("ipAddress")]
    public string IpAddress { get; set; } = string.Empty;
    
    [JsonPropertyName("capabilities")]
    public string Capabilities { get; set; } = string.Empty;
}

/// <summary>
/// Message sent by MCP to agent to request a scan
/// </summary>
public class ScanRequestMessage : AgentMessage
{
    public ScanRequestMessage()
    {
        MessageType = "ScanRequest";
    }
    
    [JsonPropertyName("scanId")]
    public string ScanId { get; set; } = string.Empty;
    
    [JsonPropertyName("repositoryUrl")]
    public string RepositoryUrl { get; set; } = string.Empty;
    
    [JsonPropertyName("branch")]
    public string Branch { get; set; } = string.Empty;
}

/// <summary>
/// Message sent by agent to MCP with scan results
/// </summary>
public class ScanResultMessage : AgentMessage
{
    public ScanResultMessage()
    {
        MessageType = "ScanResult";
    }
    
    [JsonPropertyName("scanId")]
    public string ScanId { get; set; } = string.Empty;
    
    [JsonPropertyName("findings")]
    public List<FindingMessage> Findings { get; set; } = new List<FindingMessage>();
    
    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;
}

/// <summary>
/// Finding details in scan result message
/// </summary>
public class FindingMessage
{
    [JsonPropertyName("ruleId")]
    public string RuleId { get; set; } = string.Empty;
    
    [JsonPropertyName("severity")]
    public string Severity { get; set; } = string.Empty;
    
    [JsonPropertyName("filePath")]
    public string FilePath { get; set; } = string.Empty;
    
    [JsonPropertyName("lineNumber")]
    public int LineNumber { get; set; }
    
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;
    
    [JsonPropertyName("codeSnippet")]
    public string CodeSnippet { get; set; } = string.Empty;
    
    [JsonPropertyName("recommendation")]
    public string Recommendation { get; set; } = string.Empty;
}

/// <summary>
/// Message sent by agent to MCP as a heartbeat
/// </summary>
public class HeartbeatMessage : AgentMessage
{
    public HeartbeatMessage()
    {
        MessageType = "Heartbeat";
    }
    
    [JsonPropertyName("status")]
    public string Status { get; set; } = "Idle"; // Idle, Scanning, Error
} 