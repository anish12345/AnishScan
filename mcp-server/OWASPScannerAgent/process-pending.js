require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { handleScanRequest } = require('./src/controllers/scanController');

// Create an axios instance that ignores SSL certificate errors for local development
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false // Ignore SSL certificate errors for local development
  }),
  timeout: 10000 // 10 second timeout
});

// Get the agent ID from the command line or use the one from the older requests
const agentId = process.argv[2] || '6868e9447c77e6c2201b7dfc';

console.log(`Using agent ID: ${agentId}`);
console.log(`MCP Server URL: ${process.env.MCP_SERVER_URL || 'https://localhost:44361'}`);

// Set the agent ID globally so the scan controller can use it
global.agentId = agentId;

// Function to process pending scan requests
async function processPendingRequests() {
  try {
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'https://localhost:44361';
    console.log(`Fetching scan requests from ${mcpServerUrl}/api/Scans/requests`);
    
    // Get all scan requests
    const response = await axiosInstance.get(`${mcpServerUrl}/api/Scans/requests`);
    
    if (!response.data || !Array.isArray(response.data)) {
      console.warn(`Unexpected response format from MCP server: ${JSON.stringify(response.data)}`);
      return;
    }
    
    // Filter for pending requests assigned to this agent
    const pendingRequests = response.data.filter(request => 
      request.status === 'Pending' && 
      request.agentId === agentId
    );
    
    console.log(`Found ${pendingRequests.length} pending scan requests`);
    
    if (pendingRequests.length === 0) {
      console.log('No pending scan requests found');
      return;
    }
    
    // Process each pending request
    for (const request of pendingRequests) {
      console.log(`Processing scan request ${request.id} for repository ${request.repositoryUrl}`);
      
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
        console.log(`Updated status to InProgress for scan ${request.id}`);
        
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
        
        console.log(`Scan request ${request.id} completed successfully`);
      } catch (error) {
        console.error(`Error processing scan request ${request.id}:`, error.message);
        
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
          console.log(`Updated status to Failed for scan ${request.id}`);
        } catch (updateError) {
          console.error(`Error updating scan request status:`, updateError.message);
        }
      }
    }
  } catch (error) {
    console.error('Error processing scan requests:', error.message);
    console.error(error.stack);
  }
}

// Run the function
processPendingRequests()
  .then(() => console.log('Processing complete'))
  .catch(error => console.error('Error:', error))
  .finally(() => process.exit(0)); 