using System.ComponentModel.DataAnnotations;

namespace MCPServer.Models.DTOs;

public class ScanResultSubmissionDto
{
    [Required]
    public string ScanRequestId { get; set; } = string.Empty;
    
    [Required]
    public string AgentId { get; set; } = string.Empty;
    
    [Required]
    public List<FindingDto> Findings { get; set; } = new List<FindingDto>();
    
    public string Summary { get; set; } = string.Empty;
}

public class FindingDto
{
    [Required]
    public string RuleId { get; set; } = string.Empty;
    
    [Required]
    public string Severity { get; set; } = string.Empty;
    
    [Required]
    public string FilePath { get; set; } = string.Empty;
    
    [Required]
    public int LineNumber { get; set; }
    
    [Required]
    public string Description { get; set; } = string.Empty;
    
    public string CodeSnippet { get; set; } = string.Empty;
    
    public string Recommendation { get; set; } = string.Empty;
} 