using MCPServer.Models;
using MCPServer.Models.DTOs;
using MCPServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace MCPServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AgentsController : ControllerBase
{
    private readonly IAgentService _agentService;
    private readonly ILogger<AgentsController> _logger;

    public AgentsController(IAgentService agentService, ILogger<AgentsController> logger)
    {
        _agentService = agentService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Agent>>> GetAllAgents()
    {
        try
        {
            var agents = await _agentService.GetAllAgentsAsync();
            return Ok(agents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all agents");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Agent>> GetAgentById(string id)
    {
        try
        {
            var agent = await _agentService.GetAgentByIdAsync(id);
            if (agent == null)
            {
                return NotFound();
            }
            return Ok(agent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting agent by ID");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("register")]
    public async Task<ActionResult<Agent>> RegisterAgent([FromBody] AgentRegistrationDto agentDto)
    {
        try
        {
            var agent = await _agentService.RegisterAgentAsync(agentDto);
            return CreatedAtAction(nameof(GetAgentById), new { id = agent.Id }, agent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering agent");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPut("{id}/heartbeat")]
    public async Task<IActionResult> UpdateAgentHeartbeat(string id)
    {
        try
        {
            var result = await _agentService.UpdateAgentLastSeenAsync(id);
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating agent heartbeat");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPut("{id}/deactivate")]
    public async Task<IActionResult> DeactivateAgent(string id)
    {
        try
        {
            var result = await _agentService.DeactivateAgentAsync(id);
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating agent");
            return StatusCode(500, "Internal server error");
        }
    }
} 