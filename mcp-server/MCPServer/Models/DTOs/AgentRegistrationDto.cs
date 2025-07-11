using System.ComponentModel.DataAnnotations;

namespace MCPServer.Models.DTOs;

public class AgentRegistrationDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public string IpAddress { get; set; } = string.Empty;
    
    [Required]
    public string Capabilities { get; set; } = string.Empty;
} 