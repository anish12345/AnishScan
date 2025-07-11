using MCPServer.Models;
using MCPServer.Models.DTOs;
using MongoDB.Driver;

namespace MCPServer.Services;

public class AgentService : IAgentService
{
    private readonly IMongoCollection<Agent> _agentsCollection;

    public AgentService(IMongoClient mongoClient, MongoDbSettings settings)
    {
        var database = mongoClient.GetDatabase(settings.DatabaseName);
        _agentsCollection = database.GetCollection<Agent>("Agents");
    }

    public async Task<List<Agent>> GetAllAgentsAsync()
    {
        return await _agentsCollection.Find(_ => true).ToListAsync();
    }

    public async Task<Agent?> GetAgentByIdAsync(string id)
    {
        return await _agentsCollection.Find(a => a.Id == id).FirstOrDefaultAsync();
    }

    public async Task<Agent> RegisterAgentAsync(AgentRegistrationDto agentDto)
    {
        var agent = new Agent
        {
            Name = agentDto.Name,
            IpAddress = agentDto.IpAddress,
            Capabilities = agentDto.Capabilities,
            LastSeen = DateTime.UtcNow,
            IsActive = true
        };

        await _agentsCollection.InsertOneAsync(agent);
        return agent;
    }

    public async Task<bool> UpdateAgentLastSeenAsync(string id)
    {
        var update = Builders<Agent>.Update.Set(a => a.LastSeen, DateTime.UtcNow);
        var result = await _agentsCollection.UpdateOneAsync(a => a.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeactivateAgentAsync(string id)
    {
        var update = Builders<Agent>.Update.Set(a => a.IsActive, false);
        var result = await _agentsCollection.UpdateOneAsync(a => a.Id == id, update);
        return result.ModifiedCount > 0;
    }
} 