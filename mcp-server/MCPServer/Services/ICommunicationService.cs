using MCPServer.Models.Communication;

namespace MCPServer.Services;

public interface ICommunicationService
{
    Task SendScanRequestToAgentAsync(string agentId, ScanRequestMessage message);
    Task ProcessAgentRegistrationAsync(AgentRegistrationMessage message);
    Task ProcessScanResultAsync(ScanResultMessage message);
    Task ProcessHeartbeatAsync(HeartbeatMessage message);
} 