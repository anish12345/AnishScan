using MCPServer.Models;
using MCPServer.Models.OWASP;
using MongoDB.Driver;

namespace MCPServer.Services;

public class RuleService : IRuleService
{
    private readonly IMongoCollection<Rule> _rulesCollection;

    public RuleService(IMongoClient mongoClient, MongoDbSettings settings)
    {
        var database = mongoClient.GetDatabase(settings.DatabaseName);
        _rulesCollection = database.GetCollection<Rule>("Rules");
    }

    public async Task<List<Rule>> GetAllRulesAsync()
    {
        return await _rulesCollection.Find(_ => true).ToListAsync();
    }

    public async Task<Rule?> GetRuleByIdAsync(string id)
    {
        return await _rulesCollection.Find(r => r.Id == id).FirstOrDefaultAsync();
    }

    public async Task<Rule?> GetRuleByRuleIdAsync(string ruleId)
    {
        return await _rulesCollection.Find(r => r.RuleId == ruleId).FirstOrDefaultAsync();
    }

    public async Task<List<Rule>> GetRulesByCategoryAsync(string category)
    {
        return await _rulesCollection.Find(r => r.Category == category).ToListAsync();
    }

    public async Task<List<Rule>> GetRulesByLanguageAsync(string language)
    {
        return await _rulesCollection.Find(r => r.Languages.Contains(language)).ToListAsync();
    }

    public async Task<Rule> CreateRuleAsync(Rule rule)
    {
        await _rulesCollection.InsertOneAsync(rule);
        return rule;
    }

    public async Task<bool> UpdateRuleAsync(string id, Rule rule)
    {
        rule.Id = id;
        var result = await _rulesCollection.ReplaceOneAsync(r => r.Id == id, rule);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteRuleAsync(string id)
    {
        var result = await _rulesCollection.DeleteOneAsync(r => r.Id == id);
        return result.DeletedCount > 0;
    }
} 