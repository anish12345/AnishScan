# OWASP Scanner Agent

A static code analysis agent that integrates with the MCP (Master Control Program) server to perform security scanning of code repositories based on OWASP security rules.

## Features

- Automatic registration with MCP server
- Repository cloning and analysis
- Support for multiple languages:
  - C# (using Semgrep and regex patterns)
  - Angular (using ESLint with Angular security plugins)
  - React (using ESLint with React security plugins)
  - jQuery (using ESLint with jQuery security plugins)
- Automatic detection of project types
- Detailed vulnerability reporting
- Heartbeat mechanism to maintain connection with MCP
- HTTPS support for secure communication

## Prerequisites

- Node.js 18.x or higher
- Git (for repository cloning)
- Python 3.9 or higher (for semgrep)
- Access to an MCP server

### Installing Semgrep

The agent uses Semgrep for C# code analysis. Semgrep must be installed separately via pip:

```
pip install semgrep
```

Verify the installation:

```
semgrep --version
```

For more information about Semgrep, visit [https://semgrep.dev/docs/getting-started/quickstart](https://semgrep.dev/docs/getting-started/quickstart)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/your-org/owasp-scanner-agent.git
   cd owasp-scanner-agent
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. The agent will automatically create a `.env` file with the default configuration when started. If you need to customize it, create or edit the `.env` file with the following settings:
   ```
   MCP_SERVER_URL=https://localhost:44361
   AGENT_PORT=3000
   AGENT_NAME=OWASP_Scanner_Agent
   AGENT_CAPABILITIES=C#,Angular,React,jQuery
   TEMP_DIR=./temp
   LOG_LEVEL=info
   ```

## Usage

### On Windows:
Run the start.bat file:
```
start.bat
```

### On Linux/macOS:
Run the start.sh script:
```
./start.sh
```

### Manual Start:
```
node setup-config.js
npm start
```

The agent will:
1. Register with the MCP server
2. Start listening for scan requests
3. Process scan requests as they come in
4. Submit results back to the MCP server

## Docker Deployment

Build the Docker image:
```
docker build -t owasp-scanner-agent .
```

Run the container:
```
docker run -p 3000:3000 owasp-scanner-agent
```

## Architecture

- `src/index.js`: Main entry point
- `src/routes.js`: API routes for receiving scan requests
- `src/controllers/`: Request handlers
- `src/services/`: Core services (registration, git operations, results submission)
- `src/scanners/`: Language-specific scanners
- `src/utils/`: Utility functions

## Security Rules

The agent implements security rules based on OWASP Top 10 vulnerabilities:

- Injection (SQL, NoSQL, LDAP, etc.)
- Broken Authentication
- Sensitive Data Exposure
- XML External Entities (XXE)
- Broken Access Control
- Security Misconfiguration
- Cross-Site Scripting (XSS)
- Insecure Deserialization
- Using Components with Known Vulnerabilities
- Insufficient Logging & Monitoring

## Adding New Language Support

To add support for a new language:

1. Create a new scanner in `src/scanners/`
2. Implement the scanner interface (analyze function)
3. Update the project type detection in `src/controllers/scanController.js`
4. Add appropriate ESLint plugins or other analysis tools to `package.json`

## HTTPS Support

The agent is configured to work with HTTPS endpoints and will ignore SSL certificate errors for local development. This makes it compatible with self-signed certificates commonly used in development environments.

## License

MIT 