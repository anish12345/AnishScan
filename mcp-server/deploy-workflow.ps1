param(
    [string]$TargetPath = "C:\GitRepo\Platform\MRI.OTA.Docker\api\.github\workflows",
    [string]$WorkflowName = "mcp-security-scan.yml",
    [string]$McpServerRepo = "https://github.com/YourOrg/MCPServer.git" # Update this to your actual MCP server repository
)

Write-Host "=== MCP Security Scan Workflow Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if source workflow exists
$sourceWorkflow = ".github\workflows\$WorkflowName"
if (-not (Test-Path $sourceWorkflow)) {
    Write-Host "❌ Error: Workflow file '$sourceWorkflow' not found!" -ForegroundColor Red
    Write-Host "Please run this script from the MCPServer directory." -ForegroundColor Yellow
    exit 1
}

# Create target directory if it doesn't exist
Write-Host "📁 Creating target directory: $TargetPath" -ForegroundColor Green
try {
    if (-not (Test-Path $TargetPath)) {
        New-Item -Path $TargetPath -ItemType Directory -Force | Out-Null
        Write-Host "✅ Directory created successfully" -ForegroundColor Green
    } else {
        Write-Host "✅ Directory already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error creating directory: $_" -ForegroundColor Red
    exit 1
}

# Copy workflow file
$targetFile = Join-Path $TargetPath $WorkflowName
Write-Host "📄 Copying workflow file to: $targetFile" -ForegroundColor Green
try {
    Copy-Item -Path $sourceWorkflow -Destination $targetFile -Force
    Write-Host "✅ Workflow file copied successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error copying workflow file: $_" -ForegroundColor Red
    exit 1
}

# Update workflow file with correct MCP server repository
Write-Host "🔧 Updating workflow configuration..." -ForegroundColor Green
try {
    $workflowContent = Get-Content $targetFile -Raw
    $workflowContent = $workflowContent -replace "https://github.com/YourOrg/MCPServer.git", $McpServerRepo
    Set-Content -Path $targetFile -Value $workflowContent
    Write-Host "✅ Workflow configuration updated" -ForegroundColor Green
} catch {
    Write-Host "❌ Error updating workflow configuration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "📍 Workflow deployed to: $targetFile" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update the MCP server repository URL in the workflow file if needed" -ForegroundColor White
Write-Host "2. Ensure your MCP server repository is accessible from GitHub Actions" -ForegroundColor White
Write-Host "3. Add any required secrets to your GitHub repository settings:" -ForegroundColor White
Write-Host "   - GitHub token for PR comments (usually automatic)" -ForegroundColor White
Write-Host "   - Any custom configuration for your MCP server" -ForegroundColor White
Write-Host "4. Commit and push the workflow file to your repository" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Workflow Configuration:" -ForegroundColor Yellow
Write-Host "- Target Repository: https://github.com/MRI-Software/MRI.OTA.API.git" -ForegroundColor White
Write-Host "- MCP Server URL: https://localhost:44361" -ForegroundColor White
Write-Host "- Scanner Capabilities: C#" -ForegroundColor White
Write-Host "- Triggers: Push to main/develop, PR, daily schedule, manual" -ForegroundColor White
Write-Host ""
Write-Host "🚀 The workflow will:" -ForegroundColor Yellow
Write-Host "1. Setup MCP server and OWASP scanner agent" -ForegroundColor White
Write-Host "2. Clone and scan the MRI.OTA.API repository" -ForegroundColor White
Write-Host "3. Generate security scan results" -ForegroundColor White
Write-Host "4. Comment on PRs with findings" -ForegroundColor White
Write-Host "5. Fail the build if critical issues are found" -ForegroundColor White
Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green 