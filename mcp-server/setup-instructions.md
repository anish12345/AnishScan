# Setup Instructions for MCP Security Scan Workflow

## 🚀 Quick Setup for Your AnishScan Repository

### Step 1: Create the Workflow Directory
```bash
cd "C:\Users\Anish.Zala\Downloads\nopCommerce-develop"

# Create the GitHub Actions directory
mkdir -p .github/workflows
```

### Step 2: Add the Workflow File
```bash
# Copy the workflow file
copy "path\to\mcp-security-scan.yml" .github\workflows\mcp-security-scan.yml
```

### Step 3: Commit and Push the Workflow
```bash
# Add the workflow file
git add .github/workflows/mcp-security-scan.yml

# Commit the changes
git commit -m "Add MCP security scan workflow"

# Push to your repository
git push origin main
```

## 🔧 Prerequisites

### 1. MCP Server Repository
You need to have the MCP server code in a separate repository. Create one at:
- https://github.com/anish12345/MCPServer

### 2. Update the Workflow
Edit the workflow file and update this line:
```yaml
git clone https://github.com/anish12345/MCPServer.git mcp-server || \
git clone https://github.com/YourOrg/MCPServer.git mcp-server
```

Replace with your actual MCP server repository URL.

## 📋 What the Workflow Does

1. **Triggers**: Runs on:
   - Push to main/develop branches
   - Pull requests
   - Daily at 2 AM
   - Manual trigger

2. **Scans**: Your nopCommerce code for:
   - SQL Injection vulnerabilities
   - XSS issues
   - Hardcoded credentials
   - Insecure deserialization
   - Path traversal vulnerabilities
   - Weak cryptography
   - Other OWASP Top 10 issues

3. **Reports**: Creates:
   - Detailed JSON results
   - Markdown summary
   - PR comments with findings
   - Artifact uploads

## 🎯 Manual Trigger

1. Go to https://github.com/anish12345/AnishScan/actions
2. Click "MCP Security Scan"
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## 🔍 Viewing Results

### In GitHub Actions:
1. Go to Actions tab
2. Click on a workflow run
3. Check the "Collect Scan Results" step
4. Download artifacts for detailed reports

### In Pull Requests:
- The workflow will automatically comment with security findings
- Shows breakdown by severity level
- Provides recommendations for fixes

## 🛠️ Customization

### Change Scan Frequency
Edit the cron expression in the workflow:
```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
```

### Add More Languages
Update the capabilities:
```yaml
env:
  AGENT_CAPABILITIES: C#,JavaScript,Python
```

### Adjust Timeout
```yaml
env:
  SCAN_TIMEOUT: 1200  # 20 minutes
```

## 🚨 Important Notes

1. **MCP Server Required**: The workflow needs access to your MCP server repository
2. **Repository Access**: Ensure GitHub Actions can access both repositories
3. **Secrets**: The workflow uses `GITHUB_TOKEN` automatically
4. **First Run**: May take longer as it sets up all dependencies

## 🐛 Troubleshooting

### Workflow Not Showing
- Check if the file is in `.github/workflows/`
- Verify YAML syntax
- Ensure it's committed to the main branch

### MCP Server Clone Fails
- Update the MCP server repository URL
- Ensure the repository is public or accessible

### Scan Timeout
- Increase `SCAN_TIMEOUT` in environment variables
- Check if the repository is too large

## 📞 Support

If you encounter issues:
1. Check the workflow run logs
2. Look for error messages in each step
3. Verify your MCP server repository is accessible
4. Ensure all prerequisites are met 