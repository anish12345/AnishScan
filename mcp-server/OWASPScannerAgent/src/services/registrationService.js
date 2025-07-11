const axios = require('axios');
const os = require('os');
const logger = require('../utils/logger');
const https = require('https');

// Create an axios instance that ignores SSL certificate errors for local development
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false // Ignore SSL certificate errors for local development
  }),
  timeout: 10000 // 10 second timeout
});

// Get the IP address of the agent
const getIpAddress = () => {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip over non-IPv4 and internal (loopback) addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    console.log('No external IPv4 address found, using localhost');
    return '127.0.0.1'; // Default to localhost if no external IP found
  } catch (error) {
    console.error('Error getting IP address:', error.message);
    return '127.0.0.1'; // Default to localhost on error
  }
};

/**
 * Register the agent with the MCP server
 */
const registerAgent = async () => {
  try {
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'https://localhost:44361';
    const agentName = process.env.AGENT_NAME || 'OWASP_Scanner_Agent';
    const capabilities = process.env.AGENT_CAPABILITIES || 'C#,Angular,React,jQuery';
    const ipAddress = getIpAddress();

    const registrationMessage = {
      messageType: 'AgentRegistration',
      timestamp: new Date().toISOString(),
      agentId: '', // Will be assigned by MCP
      name: agentName,
      ipAddress: `${ipAddress}:${process.env.AGENT_PORT || 3000}`,
      capabilities: capabilities
    };

    console.log(`Attempting to register with MCP server at ${mcpServerUrl}`);
    logger.info(`Registering agent with MCP server at ${mcpServerUrl}`);
    
    try {
      const response = await axiosInstance.post(
        `${mcpServerUrl}/api/agents/register`, 
        registrationMessage
      );

      // Store the agent ID for future communications
      // Check if the response contains the agentId directly or nested in a data property
      if (response.data && typeof response.data === 'object') {
        if (response.data.agentId) {
          global.agentId = response.data.agentId;
        } else if (response.data.id) {
          global.agentId = response.data.id;
        } else {
          // Log the full response to help debug
          logger.warn(`Agent ID not found in response. Response data: ${JSON.stringify(response.data)}`);
          console.warn(`Agent ID not found in response. Response data:`, response.data);
        }
      } else if (typeof response.data === 'string') {
        // Try to parse the response if it's a string
        try {
          const parsedData = JSON.parse(response.data);
          if (parsedData.agentId) {
            global.agentId = parsedData.agentId;
          } else if (parsedData.id) {
            global.agentId = parsedData.id;
          }
        } catch (parseError) {
          logger.warn(`Could not parse response data: ${response.data}`);
          console.warn(`Could not parse response data:`, response.data);
        }
      }
      
      logger.info(`Agent registered successfully with ID: ${global.agentId}`);
      console.log(`Agent registered successfully with ID: ${global.agentId}`);
      
      // Start heartbeat after successful registration
      startHeartbeat();
      
      return response.data;
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(`Server responded with error status: ${error.response.status}`);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from server. Server might be down or unreachable.');
        console.error('Request details:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
      }
      throw error;
    }
  } catch (error) {
    logger.error('Registration failed:', error.message);
    console.error('Registration failed:', error.message);
    
    // Schedule a retry after 30 seconds
    console.log('Will retry registration in 30 seconds...');
    setTimeout(() => {
      console.log('Retrying registration...');
      registerAgent().catch(retryError => {
        console.error('Retry failed:', retryError.message);
      });
    }, 30000);
    
    throw error;
  }
};

/**
 * Send heartbeat to MCP server
 */
const sendHeartbeat = async () => {
  try {
    if (!global.agentId) {
      logger.warn('Cannot send heartbeat: Agent ID not available');
      console.warn('Cannot send heartbeat: Agent ID not available');
      return;
    }

    const mcpServerUrl = process.env.MCP_SERVER_URL || 'https://localhost:44361';
    const heartbeatMessage = {
      messageType: 'Heartbeat',
      timestamp: new Date().toISOString(),
      agentId: global.agentId,
      status: global.agentStatus || 'Idle'
    };

    await axiosInstance.post(
      `${mcpServerUrl}/api/communication/heartbeat`,
      heartbeatMessage
    );
    
    logger.debug('Heartbeat sent successfully');
  } catch (error) {
    logger.error('Failed to send heartbeat:', error.message);
    console.error('Failed to send heartbeat:', error.message);
  }
};

/**
 * Start sending heartbeats at regular intervals
 */
const startHeartbeat = () => {
  // Send heartbeat every 30 seconds
  console.log('Starting heartbeat mechanism...');
  setInterval(sendHeartbeat, 30000);
  
  // Send first heartbeat immediately
  sendHeartbeat().catch(error => {
    console.error('Initial heartbeat failed:', error.message);
  });
};

module.exports = {
  registerAgent,
  sendHeartbeat
}; 