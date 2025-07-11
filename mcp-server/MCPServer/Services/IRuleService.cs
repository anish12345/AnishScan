using MCPServer.Models.OWASP;

namespace MCPServer.Services;

public interface IRuleService
{
    Task<List<Rule>> GetAllRulesAsync();
    Task<Rule?> GetRuleByIdAsync(string id);
    Task<Rule?> GetRuleByRuleIdAsync(string ruleId);
    Task<List<Rule>> GetRulesByCategoryAsync(string category);
    Task<List<Rule>> GetRulesByLanguageAsync(string language);
    Task<Rule> CreateRuleAsync(Rule rule);
    Task<bool> UpdateRuleAsync(string id, Rule rule);
    Task<bool> DeleteRuleAsync(string id);
} 