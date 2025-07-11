const axios = require('axios');
const https = require('https');
const logger = require('../utils/logger');
const { handleScanRequest } = require('../controllers/scanController');

// Create an axios instance that ignores SSL certificate errors for local development
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false // Ignore SSL certificate errors for local development
  }),
  timeout: 10000 // 10 second timeout
});

/**
 * Poll MCP server for pending scan requests
 */
const pollForScanRequests = async () => {
  try {
    if (!global.agentId) {
      logger.warn('Cannot poll for scan requests: Agent ID not available');
      return;
    }

    const mcpServerUrl = process.env.MCP_SERVER_URL || 'https://localhost:44361';
    logger.debug(`Polling for scan requests at ${mcpServerUrl}/api/Scans/requests`);
    
    // Get all scan requests
    const response = await axiosInstance.get(`${mcpServerUrl}/api/Scans/requests`);
    
    if (!response.data || !Array.isArray(response.data)) {
      logger.warn(`Unexpected response format from MCP server: ${JSON.stringify(response.data)}`);
      return;
    }
    
    // Filter for pending requests assigned to this agent
    const pendingRequests = response.data.filter(request => 
      request.status === 'Pending' && 
      request.agentId === global.agentId
    );
    
    if (pendingRequests.length === 0) {
      logger.debug('No pending scan requests found');
      return;
    }
    
    logger.info(`Found ${pendingRequests.length} pending scan requests`);
    
    // Process each pending request
    for (const request of pendingRequests) {
      logger.info(`Processing scan request ${request.id} for repository ${request.repositoryUrl}`);
      
      try {
        // Update status to In Progress
        await axiosInstance.put(
          `${mcpServerUrl}/api/Scans/requests/${request.id}/status`,
          JSON.stringify("InProgress"),
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Process the scan request
        await handleScanRequest({
          scanId: request.id,
          repositoryUrl: request.repositoryUrl,
          branch: request.branch
        });
        
        // Update status to Completed
        await axiosInstance.put(
          `${mcpServerUrl}/api/Scans/requests/${request.id}/status`,
          JSON.stringify("Completed"),
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        logger.info(`Scan request ${request.id} completed successfully`);
      } catch (error) {
        logger.error(`Error processing scan request ${request.id}:`, error.message);
        
        // Update status to Failed
        try {
          await axiosInstance.put(
            `${mcpServerUrl}/api/Scans/requests/${request.id}/status`,
            JSON.stringify("Failed"),
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (updateError) {
          logger.error(`Error updating scan request status:`, updateError.message);
        }
      }
    }
  } catch (error) {
    logger.error('Error polling for scan requests:', error.message);
  }
};

/**
 * Start polling for scan requests at regular intervals
 */
const startPolling = () => {
  // Poll every 30 seconds
  const pollingInterval = 30000;
  console.log(`Starting polling for scan requests every ${pollingInterval/1000} seconds...`);
  
  // Poll immediately on startup
  pollForScanRequests().catch(error => {
    logger.error('Initial polling failed:', error.message);
  });
  
  // Then poll at regular intervals
  setInterval(pollForScanRequests, pollingInterval);
};

module.exports = {
  startPolling,
  pollForScanRequests
}; 