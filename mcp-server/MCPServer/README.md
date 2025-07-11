# Master Control Program (MCP) Server

The MCP Server is a centralized control system for managing code analysis agents that perform OWASP rule-based static code analysis.

## Features

- Agent registration and management
- Scan job dispatching
- Collection and storage of scan results
- REST API for interaction with agents and clients
- OWASP rule-based static code analysis

## Technology Stack

- .NET 8.0 Web API
- MongoDB for data storage
- Docker support

## Prerequisites

- .NET 8.0 SDK
- MongoDB (local instance or connection string)
- Docker (optional)

## Getting Started

### Running Locally

1. Clone the repository
2. Navigate to the project directory
3. Update the MongoDB connection string in `appsettings.json` if needed
4. Run the application:

```bash
dotnet run
```

The API will be available at `https://localhost:5001` and `http://localhost:5000`

### Using Docker

1. Build the Docker image:

```bash
docker build -t mcpserver .
```

2. Run the container:

```bash
docker run -p 8080:80 -e "MongoDbSettings__ConnectionString=mongodb://host.docker.internal:27017" mcpserver
```

## API Endpoints

### Agent Management

- `POST /api/agents/register` - Register a new agent
- `GET /api/agents` - Get all registered agents
- `GET /api/agents/{id}` - Get agent by ID
- `PUT /api/agents/{id}/heartbeat` - Update agent heartbeat
- `PUT /api/agents/{id}/deactivate` - Deactivate an agent

### Scan Management

- `POST /api/scans/requests` - Create a new scan request
- `GET /api/scans/requests` - Get all scan requests
- `GET /api/scans/requests/{id}` - Get scan request by ID
- `PUT /api/scans/requests/{id}/status` - Update scan request status
- `POST /api/scans/results` - Submit scan results
- `GET /api/scans/results` - Get all scan results
- `GET /api/scans/results/{id}` - Get scan result by ID
- `GET /api/scans/requests/{requestId}/result` - Get scan result by request ID

### OWASP Rules

- `GET /api/rules` - Get all OWASP rules
- `GET /api/rules/{id}` - Get rule by ID
- `GET /api/rules/ruleId/{ruleId}` - Get rule by rule ID
- `GET /api/rules/category/{category}` - Get rules by category
- `GET /api/rules/language/{language}` - Get rules by language
- `POST /api/rules` - Create a new rule
- `PUT /api/rules/{id}` - Update a rule
- `DELETE /api/rules/{id}` - Delete a rule

### Agent Communication Protocol

- `POST /api/communication/register` - Register agent with MCP
- `POST /api/communication/heartbeat` - Send agent heartbeat
- `POST /api/communication/scan-result` - Submit scan results

## Agent Communication Protocol

The MCP Server uses a JSON-based protocol for communication with agents:

### Message Types

- `AgentRegistration` - Sent by agent to register with MCP
- `ScanRequest` - Sent by MCP to agent to request a scan
- `ScanResult` - Sent by agent to MCP with scan results
- `Heartbeat` - Sent by agent to MCP to indicate it's still active

## License

This project is licensed under the MIT License - see the LICENSE file for details. 