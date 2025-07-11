using MCPServer.Models.OWASP;
using MCPServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace MCPServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RulesController : ControllerBase
{
    private readonly IRuleService _ruleService;
    private readonly ILogger<RulesController> _logger;

    public RulesController(IRuleService ruleService, ILogger<RulesController> logger)
    {
        _ruleService = ruleService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Rule>>> GetAllRules()
    {
        try
        {
            var rules = await _ruleService.GetAllRulesAsync();
            return Ok(rules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all rules");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Rule>> GetRuleById(string id)
    {
        try
        {
            var rule = await _ruleService.GetRuleByIdAsync(id);
            if (rule == null)
            {
                return NotFound();
            }
            return Ok(rule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting rule by ID");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("ruleId/{ruleId}")]
    public async Task<ActionResult<Rule>> GetRuleByRuleId(string ruleId)
    {
        try
        {
            var rule = await _ruleService.GetRuleByRuleIdAsync(ruleId);
            if (rule == null)
            {
                return NotFound();
            }
            return Ok(rule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting rule by rule ID");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("category/{category}")]
    public async Task<ActionResult<IEnumerable<Rule>>> GetRulesByCategory(string category)
    {
        try
        {
            var rules = await _ruleService.GetRulesByCategoryAsync(category);
            return Ok(rules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting rules by category");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("language/{language}")]
    public async Task<ActionResult<IEnumerable<Rule>>> GetRulesByLanguage(string language)
    {
        try
        {
            var rules = await _ruleService.GetRulesByLanguageAsync(language);
            return Ok(rules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting rules by language");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost]
    public async Task<ActionResult<Rule>> CreateRule([FromBody] Rule rule)
    {
        try
        {
            var createdRule = await _ruleService.CreateRuleAsync(rule);
            return CreatedAtAction(nameof(GetRuleById), new { id = createdRule.Id }, createdRule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating rule");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRule(string id, [FromBody] Rule rule)
    {
        try
        {
            var result = await _ruleService.UpdateRuleAsync(id, rule);
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating rule");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRule(string id)
    {
        try
        {
            var result = await _ruleService.DeleteRuleAsync(id);
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting rule");
            return StatusCode(500, "Internal server error");
        }
    }
} 