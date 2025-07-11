using System.ComponentModel.DataAnnotations;

namespace MCPServer.Models.DTOs;

public class ScanRequestDto
{
    [Required]
    public string RepositoryUrl { get; set; } = string.Empty;
    
    public string Branch { get; set; } = "main";
    
    [Required]
    public string AgentId { get; set; } = string.Empty;
} 