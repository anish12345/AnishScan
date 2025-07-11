using MCPServer.Models.OWASP;

namespace MCPServer.Services;

public class DataSeeder
{
    private readonly IRuleService _ruleService;
    private readonly ILogger<DataSeeder> _logger;

    public DataSeeder(IRuleService ruleService, ILogger<DataSeeder> logger)
    {
        _ruleService = ruleService;
        _logger = logger;
    }

    public async Task SeedRulesAsync()
    {
        try
        {
            var rules = await _ruleService.GetAllRulesAsync();
            if (rules.Any())
            {
                _logger.LogInformation("Rules already exist in database, skipping seeding");
                return;
            }

            _logger.LogInformation("Seeding OWASP rules...");

            var seedRules = new List<Rule>
            {
                new Rule
                {
                    RuleId = "OWASP-A1-01",
                    Name = "SQL Injection",
                    Description = "SQL injection flaws occur when user-controlled input is directly included in SQL queries without proper validation or escaping.",
                    Severity = "Critical",
                    Category = "Injection",
                    OWASPCategory = "A1",
                    Languages = new List<string> { "C#", "Java", "PHP" },
                    Pattern = @"(ExecuteQuery|ExecuteSql|createQuery).*\+.*",
                    Recommendation = "Use parameterized queries or prepared statements.",
                    Examples = new List<string>
                    {
                        "string query = \"SELECT * FROM Users WHERE Username = '\" + username + \"'\";"
                    },
                    References = new List<string>
                    {
                        "https://owasp.org/www-project-top-ten/2017/A1_2017-Injection"
                    }
                },
                new Rule
                {
                    RuleId = "OWASP-A2-01",
                    Name = "Weak Authentication",
                    Description = "Application functions related to authentication are not implemented correctly.",
                    Severity = "High",
                    Category = "Authentication",
                    OWASPCategory = "A2",
                    Languages = new List<string> { "C#", "Java", "PHP", "JavaScript" },
                    Pattern = @"(password|pwd|passwd).*=.*[""'].*[""']",
                    Recommendation = "Implement multi-factor authentication and proper password hashing.",
                    Examples = new List<string>
                    {
                        "string password = \"hardcoded_password\";"
                    },
                    References = new List<string>
                    {
                        "https://owasp.org/www-project-top-ten/2017/A2_2017-Broken_Authentication"
                    }
                },
                new Rule
                {
                    RuleId = "OWASP-A3-01",
                    Name = "Sensitive Data Exposure",
                    Description = "Sensitive data is not properly protected.",
                    Severity = "High",
                    Category = "Data Protection",
                    OWASPCategory = "A3",
                    Languages = new List<string> { "C#", "Java", "PHP", "JavaScript" },
                    Pattern = @"(SSN|CreditCard|Password).*=.*[""'].*[""']",
                    Recommendation = "Encrypt sensitive data at rest and in transit.",
                    Examples = new List<string>
                    {
                        "string creditCard = \"1234-5678-9012-3456\";"
                    },
                    References = new List<string>
                    {
                        "https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure"
                    }
                },
                new Rule
                {
                    RuleId = "OWASP-A4-01",
                    Name = "XML External Entity (XXE)",
                    Description = "External entity processing is enabled in XML parsers.",
                    Severity = "High",
                    Category = "XML Processing",
                    OWASPCategory = "A4",
                    Languages = new List<string> { "C#", "Java", "PHP" },
                    Pattern = @"(XmlDocument|DocumentBuilder).*\.Parse",
                    Recommendation = "Disable DTD processing in XML parsers.",
                    Examples = new List<string>
                    {
                        "XmlDocument doc = new XmlDocument();\ndoc.XmlResolver = new XmlUrlResolver();"
                    },
                    References = new List<string>
                    {
                        "https://owasp.org/www-project-top-ten/2017/A4_2017-XML_External_Entities_(XXE)"
                    }
                },
                new Rule
                {
                    RuleId = "OWASP-A5-01",
                    Name = "Broken Access Control",
                    Description = "Restrictions on what authenticated users are allowed to do are not properly enforced.",
                    Severity = "High",
                    Category = "Access Control",
                    OWASPCategory = "A5",
                    Languages = new List<string> { "C#", "Java", "PHP", "JavaScript" },
                    Pattern = @"(Authorize|Permission|Access).*=.*false",
                    Recommendation = "Implement proper access controls and authorization checks.",
                    Examples = new List<string>
                    {
                        "bool skipAuthorization = true;"
                    },
                    References = new List<string>
                    {
                        "https://owasp.org/www-project-top-ten/2017/A5_2017-Broken_Access_Control"
                    }
                }
            };

            foreach (var rule in seedRules)
            {
                await _ruleService.CreateRuleAsync(rule);
            }

            _logger.LogInformation("Successfully seeded {Count} OWASP rules", seedRules.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding OWASP rules");
        }
    }
} 