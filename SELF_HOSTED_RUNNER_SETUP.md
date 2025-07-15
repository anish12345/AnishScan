# Self-Hosted GitHub Actions Runner Setup

To use your local MongoDB with the MCP security scanning workflow, you need to set up a self-hosted GitHub Actions runner on your local machine.

## Prerequisites

1. **MongoDB running locally** on `localhost:27017`
2. **MongoDB Database Tools** installed (for mongosh command)
3. **Git** installed and configured
4. **.NET 8.0 SDK** installed
5. **Node.js 18.x** installed
6. **Python 3.9+** installed

## Step 1: Set up Self-Hosted Runner

### For Windows:

1. Go to your GitHub repository
2. Click **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Select **Windows** as the operating system
5. Follow the GitHub instructions to download and configure the runner

```powershell
# Example commands (replace with your actual values)
mkdir actions-runner; cd actions-runner
# Download the latest runner package
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-win-x64-2.311.0.zip -OutFile actions-runner-win-x64-2.311.0.zip
# Extract the installer
Add-Type -AssemblyName System.IO.Compression.FileSystem ; [System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64-2.311.0.zip", "$PWD")
# Configure the runner
./config.cmd --url https://github.com/[YOUR_USERNAME]/[YOUR_REPO] --token [YOUR_TOKEN]
# Start the runner
./run.cmd
```

### For Linux/Mac:

1. Go to your GitHub repository
2. Click **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Select **Linux** or **macOS**
5. Follow the GitHub instructions:

```bash
# Example commands (replace with your actual values)
mkdir actions-runner && cd actions-runner
# Download the latest runner package
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
# Extract the installer
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
# Configure the runner
./config.sh --url https://github.com/[YOUR_USERNAME]/[YOUR_REPO] --token [YOUR_TOKEN]
# Start the runner
./run.sh
```

## Step 2: Install Dependencies on Runner Machine

Make sure the following are installed on the machine where the runner will execute:

### Windows:
```powershell
# Install .NET 8.0 SDK
winget install Microsoft.DotNet.SDK.8

# Install Node.js 18
winget install OpenJS.NodeJS.LTS

# Install Python 3.9+
winget install Python.Python.3.11

# Install MongoDB Database Tools
# Download from: https://www.mongodb.com/try/download/database-tools
# Add mongosh to PATH

# Install Git
winget install Git.Git
```

### Linux:
```bash
# Install .NET 8.0 SDK
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y dotnet-sdk-8.0

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.9+
sudo apt-get install -y python3 python3-pip

# Install MongoDB Database Tools
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-mongosh
```

## Step 3: Configure Local MongoDB

1. **Start MongoDB** on your local machine:
   ```bash
   # Windows (if installed as service)
   net start MongoDB
   
   # Linux/Mac
   sudo systemctl start mongod
   # or
   mongod --dbpath /data/db
   ```

2. **Verify MongoDB is running**:
   ```bash
   mongosh "mongodb://localhost:27017/MCPDatabase" --eval "db.runCommand({ ping: 1 })"
   ```

3. **Create the database** (optional - it will be created automatically):
   ```bash
   mongosh "mongodb://localhost:27017/MCPDatabase" --eval "db.createCollection('test')"
   ```

## Step 4: Update Workflow

1. **Rename the workflow file** to use the new local MongoDB workflow:
   ```bash
   mv .github/workflows/mcp-security-scan.yml .github/workflows/mcp-security-scan-container.yml
   mv .github/workflows/mcp-security-scan-local.yml .github/workflows/mcp-security-scan.yml
   ```

2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Update workflow to use local MongoDB with self-hosted runner"
   git push
   ```

## Step 5: Test the Setup

1. **Start your self-hosted runner**:
   ```bash
   # Windows
   ./run.cmd
   
   # Linux/Mac
   ./run.sh
   ```

2. **Trigger the workflow** by pushing to main branch or manually via GitHub Actions tab

3. **Monitor the workflow execution** in GitHub Actions tab

## Troubleshooting

### Common Issues:

1. **Runner not connecting**:
   - Check your token hasn't expired
   - Verify network connectivity
   - Ensure firewall allows GitHub Actions communication

2. **MongoDB connection failed**:
   - Verify MongoDB is running: `mongosh mongodb://localhost:27017`
   - Check if MongoDB is bound to localhost: `netstat -an | grep 27017`
   - Ensure no authentication is required or configure credentials

3. **Dependencies missing**:
   - Verify all tools are in PATH: `dotnet --version`, `node --version`, `python --version`
   - Install missing dependencies as per Step 2

4. **Permission issues**:
   - Ensure runner has read/write permissions to temp directories
   - On Linux/Mac, may need to run with appropriate user permissions

### Logs to Check:

1. **Runner logs**: Check the terminal where you started the runner
2. **GitHub Actions logs**: Check the workflow run in GitHub Actions tab
3. **MongoDB logs**: Check MongoDB logs for connection issues
4. **Application logs**: Check mcp-server.log and agent.log in workflow artifacts

## Security Considerations

1. **Runner Security**:
   - Only run trusted code on self-hosted runners
   - Consider using a dedicated machine/VM for the runner
   - Regularly update runner software

2. **Network Security**:
   - Ensure MongoDB is not exposed to external networks
   - Consider using firewall rules to restrict access

3. **Data Security**:
   - MongoDB data will contain security scan results
   - Ensure proper backup and access controls

## Alternative: Cloud MongoDB (Option 2)

If you prefer not to use a self-hosted runner, you can use MongoDB Atlas:

1. **Create MongoDB Atlas account**: https://www.mongodb.com/cloud/atlas
2. **Create a cluster** and get connection string
3. **Update the workflow** to use the cloud connection string:
   ```yaml
   "ConnectionString": "mongodb+srv://username:password@cluster.mongodb.net/",
   "DatabaseName": "MCPDatabase"
   ```

This allows you to use GitHub-hosted runners while still having persistent data storage for your report UI. 