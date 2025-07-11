# MCP Security Scan Workflow

This GitHub workflow integrates your MCP (Master Control Program) server with the OWASP Scanner Agent to perform automated security scans on C# repositories.

## Overview

The workflow performs the following actions:
1. **Setup Environment**: Configures .NET, Node.js, Python, and Semgrep
2. **Deploy MCP Server**: Starts the MCP server with MongoDB backend
3. **Deploy Scanner Agent**: Starts the OWASP Scanner Agent and registers it with MCP
4. **Execute Scan**: Submits scan request for the target repository
5. **Monitor Progress**: Tracks scan status until completion
6. **Generate Reports**: Creates detailed security findings report
7. **PR Integration**: Comments on pull requests with scan results
8. **Quality Gates**: Fails build if critical security issues are found

## Workflow Triggers

- **Push**: Triggers on pushes to `main` and `develop` branches
- **Pull Request**: Runs on PRs to `main` and `develop` branches
- **Schedule**: Daily scan at 2 AM UTC
- **Manual**: Can be triggered manually via GitHub Actions UI

## Prerequisites

1. **MCP Server Repository**: Your MCP server code must be in a Git repository accessible by GitHub Actions
2. **Repository Access**: The workflow needs access to clone the MCP server repository
3. **GitHub Actions**: Enabled on the target repository

## Setup Instructions

### Step 1: Deploy the Workflow

1. **Run the deployment script** (from the MCPServer directory):
   ```powershell
   .\deploy-workflow.ps1 -McpServerRepo "https://github.com/YourOrg/MCPServer.git"
   ```

2. **Manual deployment** (if needed):
   ```powershell
   # Copy the workflow file to the target location
   Copy-Item .github\workflows\mcp-security-scan.yml "C:\GitRepo\Platform\MRI.OTA.Docker\api\.github\workflows\"
   ```

### Step 2: Configure the Workflow

Edit the workflow file to update these settings:

```yaml
# Update the MCP server repository URL
- name: Clone MCP Server and Scanner
  run: |
    git clone https://github.com/YourActualOrg/MCPServer.git mcp-server
```

### Step 3: Repository Setup

1. **Commit the workflow file** to your repository:
   ```bash
   git add .github/workflows/mcp-security-scan.yml
   git commit -m "Add MCP security scan workflow"
   git push
   ```

2. **Configure repository secrets** (if needed):
   - Navigate to repository Settings > Secrets and variables > Actions
   - Add any custom configuration secrets

## Workflow Configuration

### Environment Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `MCP_SERVER_URL` | `https://localhost:44361` | MCP server endpoint |
| `AGENT_PORT` | `3001` | Scanner agent port |
| `AGENT_NAME` | `GitHub_OWASP_Scanner_Agent` | Agent identifier |
| `AGENT_CAPABILITIES` | `C#` | Supported languages |
| `SCAN_TIMEOUT` | `600` | Scan timeout in seconds |

### Target Repository

The workflow is configured to scan: `https://github.com/MRI-Software/MRI.OTA.API.git`

To change this, update the scan request in the workflow:

```yaml
SCAN_REQUEST=$(cat << EOF
{
  "repositoryUrl": "https://github.com/YOUR-ORG/YOUR-REPO.git",
  "branch": "main",
  "agentId": "$AGENT_ID"
}
EOF
)
```

## Security Rules

The C# scanner implements OWASP Top 10 security rules:

### Semgrep Rules
- **SQL Injection**: Detects concatenated SQL queries
- **XSS**: Finds unencoded Response.Write calls
- **Hardcoded Credentials**: Identifies hardcoded passwords
- **Insecure Deserialization**: Detects unsafe deserialization
- **Path Traversal**: Finds unvalidated file paths
- **Weak Cryptography**: Identifies weak crypto algorithms
- **Insecure Cookies**: Detects insecure cookie configuration

### Regex-based Rules
- Additional pattern matching for common vulnerabilities
- Custom rules for specific frameworks and libraries

## Output and Reporting

### Scan Results
- **JSON Report**: Detailed findings in structured format
- **Summary Report**: Human-readable markdown summary
- **Artifacts**: Results uploaded as GitHub Actions artifacts

### PR Comments
For pull requests, the workflow automatically comments with:
- Total number of findings
- Breakdown by severity level
- Specific file locations and recommendations
- Links to detailed reports

### Quality Gates
- **Critical/High Issues**: Fails the build
- **Medium/Low Issues**: Allows build to pass with warnings
- **No Issues**: Build passes with success message

## Customization

### Adding New Security Rules

1. **Semgrep Rules**: Update the `createSemgrepConfig` function in `csharpScanner.js`
2. **Regex Rules**: Add patterns to the `analyzeWithRegex` function
3. **Custom Logic**: Extend the scanner with additional analysis

### Modifying Scan Scope

```yaml
# To scan different branches
{
  "repositoryUrl": "https://github.com/MRI-Software/MRI.OTA.API.git",
  "branch": "develop",  # Change branch here
  "agentId": "$AGENT_ID"
}
```

### Adjusting Timeouts

```yaml
env:
  SCAN_TIMEOUT: 1200  # 20 minutes instead of 10
```

## Troubleshooting

### Common Issues

1. **MCP Server startup failure**:
   - Check MongoDB service is running
   - Verify port 44361 is available
   - Check .NET runtime version

2. **Agent registration failure**:
   - Ensure MCP server is running
   - Check network connectivity
   - Verify agent configuration

3. **Scan timeout**:
   - Increase `SCAN_TIMEOUT` value
   - Check repository size
   - Verify Semgrep installation

### Debug Steps

1. **Check workflow logs** in GitHub Actions
2. **Review MCP server logs** for errors
3. **Verify agent registration** via API endpoint
4. **Test scan manually** using the test scripts

### Log Analysis

The workflow provides detailed logging for each step:
- Service startup logs
- Agent registration status
- Scan progress monitoring
- Results processing

## Security Considerations

1. **Secrets Management**: Store sensitive configuration in GitHub Secrets
2. **Network Security**: MCP server runs on localhost only
3. **Access Control**: Ensure repository access is properly configured
4. **Audit Trail**: All scan activities are logged

## Performance Optimization

1. **Parallel Execution**: Consider running multiple agents for large repositories
2. **Caching**: Cache dependencies between workflow runs
3. **Resource Limits**: Adjust timeout values based on repository size
4. **Selective Scanning**: Configure file type filters if needed

## Support

For issues or questions:
1. Check the workflow logs in GitHub Actions
2. Review the MCP server and agent logs
3. Consult the OWASP Scanner Agent documentation
4. Create an issue in the MCP server repository

---

**Note**: This workflow is designed for the MRI.OTA.API repository but can be adapted for other C# projects by updating the repository URL and scan configuration. 