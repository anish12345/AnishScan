using System.Text.Json;
using MCPServer.Models;
using MCPServer.Models.Communication;
using MCPServer.Models.DTOs;

namespace MCPServer.Services;

public class CommunicationService : ICommunicationService
{
    private readonly IAgentService _agentService;
    private readonly IScanService _scanService;
    private readonly ILogger<CommunicationService> _logger;

    public CommunicationService(
        IAgentService agentService,
        IScanService scanService,
        ILogger<CommunicationService> logger)
    {
        _agentService = agentService;
        _scanService = scanService;
        _logger = logger;
    }

    public async Task SendScanRequestToAgentAsync(string agentId, ScanRequestMessage message)
    {
        try
        {
            // In a real implementation, this would use a message queue or direct HTTP call
            // For now, we'll just log the message
            _logger.LogInformation("Sending scan request to agent {AgentId}: {Message}",
                agentId, JsonSerializer.Serialize(message));
            
            // Update agent last seen
            await _agentService.UpdateAgentLastSeenAsync(agentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending scan request to agent {AgentId}", agentId);
            throw;
        }
    }

    public async Task ProcessAgentRegistrationAsync(AgentRegistrationMessage message)
    {
        try
        {
            var agentDto = new AgentRegistrationDto
            {
                Name = message.Name,
                IpAddress = message.IpAddress,
                Capabilities = message.Capabilities
            };

            await _agentService.RegisterAgentAsync(agentDto);
            _logger.LogInformation("Agent registered: {AgentName}", message.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing agent registration");
            throw;
        }
    }

    public async Task ProcessScanResultAsync(ScanResultMessage message)
    {
        try
        {
            var findings = message.Findings.Select(f => new FindingDto
            {
                RuleId = f.RuleId,
                Severity = f.Severity,
                FilePath = f.FilePath,
                LineNumber = f.LineNumber,
                Description = f.Description,
                CodeSnippet = f.CodeSnippet,
                Recommendation = f.Recommendation
            }).ToList();

            var scanResultDto = new ScanResultSubmissionDto
            {
                ScanRequestId = message.ScanId,
                AgentId = message.AgentId,
                Findings = findings,
                Summary = message.Summary
            };

            await _scanService.SubmitScanResultAsync(scanResultDto);
            _logger.LogInformation("Scan result processed for scan ID: {ScanId}", message.ScanId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing scan result for scan ID: {ScanId}", message.ScanId);
            throw;
        }
    }

    public async Task ProcessHeartbeatAsync(HeartbeatMessage message)
    {
        try
        {
            await _agentService.UpdateAgentLastSeenAsync(message.AgentId);
            _logger.LogDebug("Heartbeat received from agent {AgentId}, status: {Status}", 
                message.AgentId, message.Status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing heartbeat from agent {AgentId}", message.AgentId);
            throw;
        }
    }
} 