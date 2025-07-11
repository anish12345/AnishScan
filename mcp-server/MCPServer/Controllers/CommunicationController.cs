using MCPServer.Models.Communication;
using MCPServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace MCPServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommunicationController : ControllerBase
{
    private readonly ICommunicationService _communicationService;
    private readonly ILogger<CommunicationController> _logger;

    public CommunicationController(
        ICommunicationService communicationService,
        ILogger<CommunicationController> logger)
    {
        _communicationService = communicationService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> RegisterAgent([FromBody] AgentRegistrationMessage message)
    {
        try
        {
            await _communicationService.ProcessAgentRegistrationAsync(message);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing agent registration");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("heartbeat")]
    public async Task<IActionResult> ProcessHeartbeat([FromBody] HeartbeatMessage message)
    {
        try
        {
            await _communicationService.ProcessHeartbeatAsync(message);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing heartbeat");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("scan-result")]
    public async Task<IActionResult> ProcessScanResult([FromBody] ScanResultMessage message)
    {
        try
        {
            await _communicationService.ProcessScanResultAsync(message);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing scan result");
            return StatusCode(500, "Internal server error");
        }
    }
} 