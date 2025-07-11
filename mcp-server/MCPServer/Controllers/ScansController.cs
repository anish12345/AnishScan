using MCPServer.Models;
using MCPServer.Models.DTOs;
using MCPServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace MCPServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScansController : ControllerBase
{
    private readonly IScanService _scanService;
    private readonly IAgentService _agentService;
    private readonly ILogger<ScansController> _logger;

    public ScansController(
        IScanService scanService,
        IAgentService agentService,
        ILogger<ScansController> logger)
    {
        _scanService = scanService;
        _agentService = agentService;
        _logger = logger;
    }

    [HttpGet("requests")]
    public async Task<ActionResult<IEnumerable<ScanRequest>>> GetAllScanRequests()
    {
        try
        {
            var scanRequests = await _scanService.GetAllScanRequestsAsync();
            return Ok(scanRequests);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all scan requests");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("requests/{id}")]
    public async Task<ActionResult<ScanRequest>> GetScanRequestById(string id)
    {
        try
        {
            var scanRequest = await _scanService.GetScanRequestByIdAsync(id);
            if (scanRequest == null)
            {
                return NotFound();
            }
            return Ok(scanRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scan request by ID");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("requests")]
    public async Task<ActionResult<ScanRequest>> CreateScanRequest([FromBody] ScanRequestDto scanRequestDto)
    {
        try
        {
            // Verify agent exists
            var agent = await _agentService.GetAgentByIdAsync(scanRequestDto.AgentId);
            if (agent == null)
            {
                return BadRequest("Agent not found");
            }

            var scanRequest = await _scanService.CreateScanRequestAsync(scanRequestDto);
            return CreatedAtAction(nameof(GetScanRequestById), new { id = scanRequest.Id }, scanRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating scan request");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPut("requests/{id}/status")]
    public async Task<IActionResult> UpdateScanRequestStatus(string id, [FromBody] string status)
    {
        try
        {
            var result = await _scanService.UpdateScanRequestStatusAsync(id, status);
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating scan request status");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("results")]
    public async Task<ActionResult<IEnumerable<ScanResult>>> GetAllScanResults()
    {
        try
        {
            var scanResults = await _scanService.GetAllScanResultsAsync();
            return Ok(scanResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all scan results");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("results/{id}")]
    public async Task<ActionResult<ScanResult>> GetScanResultById(string id)
    {
        try
        {
            var scanResult = await _scanService.GetScanResultByIdAsync(id);
            if (scanResult == null)
            {
                return NotFound();
            }
            return Ok(scanResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scan result by ID");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("requests/{requestId}/result")]
    public async Task<ActionResult<ScanResult>> GetScanResultByRequestId(string requestId)
    {
        try
        {
            var scanResult = await _scanService.GetScanResultByScanRequestIdAsync(requestId);
            if (scanResult == null)
            {
                return NotFound();
            }
            return Ok(scanResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scan result by request ID");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("results")]
    public async Task<ActionResult<ScanResult>> SubmitScanResult([FromBody] ScanResultSubmissionDto scanResultDto)
    {
        try
        {
            // Verify scan request exists
            var scanRequest = await _scanService.GetScanRequestByIdAsync(scanResultDto.ScanRequestId);
            if (scanRequest == null)
            {
                return BadRequest("Scan request not found");
            }

            // Verify agent exists
            var agent = await _agentService.GetAgentByIdAsync(scanResultDto.AgentId);
            if (agent == null)
            {
                return BadRequest("Agent not found");
            }

            var scanResult = await _scanService.SubmitScanResultAsync(scanResultDto);
            return CreatedAtAction(nameof(GetScanResultById), new { id = scanResult.Id }, scanResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting scan result");
            return StatusCode(500, "Internal server error");
        }
    }
} 