using MCPServer.Models;
using MCPServer.Models.DTOs;

namespace MCPServer.Services;

public interface IAgentService
{
    Task<List<Agent>> GetAllAgentsAsync();
    Task<Agent?> GetAgentByIdAsync(string id);
    Task<Agent> RegisterAgentAsync(AgentRegistrationDto agentDto);
    Task<bool> UpdateAgentLastSeenAsync(string id);
    Task<bool> DeactivateAgentAsync(string id);
} 