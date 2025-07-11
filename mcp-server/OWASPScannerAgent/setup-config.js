const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

try {
  console.log('Starting configuration setup...');
  
  // Default configuration
  const defaultConfig = `# MCP Server Configuration
MCP_SERVER_URL=https://localhost:44361
AGENT_PORT=3000
AGENT_NAME=OWASP_Scanner_Agent
AGENT_CAPABILITIES=C#,Angular,React,jQuery
TEMP_DIR=./temp
LOG_LEVEL=debug
NODE_TLS_REJECT_UNAUTHORIZED=0
`;

  // Path to .env file
  const envPath = path.join(__dirname, '.env');

  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file with default configuration...');
    fs.writeFileSync(envPath, defaultConfig);
    console.log('.env file created successfully!');
  } else {
    console.log('.env file already exists. Skipping creation.');
  }

  console.log('Configuration ready. MCP server URL set to: https://localhost:44361');
  
  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    console.log('Creating temp directory...');
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('Temp directory created successfully!');
  }
  
  // Check for semgrep installation
  console.log('Checking for semgrep installation...');
  checkSemgrep().then(isInstalled => {
    if (!isInstalled) {
      console.log('WARNING: semgrep is not installed or not in PATH');
      console.log('Please install semgrep using: pip install semgrep');
      console.log('C# scanning functionality will not work without semgrep');
      console.log('Press any key to continue anyway or Ctrl+C to cancel...');
    } else {
      console.log('Semgrep is installed and available.');
    }
    console.log('Setup complete. Ready to start agent.');
  });
} catch (error) {
  console.error('ERROR during setup:', error);
  console.error('Stack trace:', error.stack);
}

/**
 * Check if semgrep is available
 * @returns {Promise<boolean>} - True if semgrep is available
 */
async function checkSemgrep() {
  try {
    await execPromise('C:\\Users\\Anish.Zala\\.local\\bin\\semgrep.exe --version');
    return true;
  } catch (error) {
    return false;
  }
} 