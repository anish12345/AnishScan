const axios = require('axios');
const https = require('https');
const path = require('path');

// Create axios instance that ignores SSL certificates for local testing
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  }),
  timeout: 30000
});

const MCP_SERVER_URL = 'https://localhost:44361';

async function submitScanRequest() {
  try {
    console.log('🚀 Testing MCP Server Scan Request');
    console.log('==================================');
    
    // First, check if MCP server is responding
    console.log('1. Checking MCP server status...');
    try {
      const statusResponse = await axiosInstance.get(`${MCP_SERVER_URL}/api/agents`);
      console.log(`✅ MCP server is responding. Found ${statusResponse.data?.length || 0} agents.`);
    } catch (error) {
      console.log(`❌ MCP server not responding: ${error.message}`);
      return;
    }

    // Create scan request payload
    const scanRequest = {
      repositoryUrl: `file://${path.resolve('./temp/test-node-app').replace(/\\/g, '/')}`,
      branch: 'master',
      projectType: 'Node.js',
      agentId: global.agentId || '686d3b618030bbe80d45c29c' // Use the registered agent ID
    };

    console.log('\n2. Submitting scan request...');
    console.log(`Repository: ${scanRequest.repositoryUrl}`);
    console.log(`Agent ID: ${scanRequest.agentId}`);
    
    // Submit scan request to MCP server
    const response = await axiosInstance.post(
      `${MCP_SERVER_URL}/api/Scans/requests`,
      scanRequest,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Scan request submitted successfully!`);
    console.log(`Scan ID: ${response.data.id || response.data._id || 'Unknown'}`);
    console.log(`Status: ${response.data.status || 'Pending'}`);

    // Check scan requests
    console.log('\n3. Checking pending scan requests...');
    const requestsResponse = await axiosInstance.get(`${MCP_SERVER_URL}/api/Scans/requests`);
    
    if (requestsResponse.data && Array.isArray(requestsResponse.data)) {
      const pendingRequests = requestsResponse.data.filter(req => req.status === 'Pending');
      console.log(`📋 Found ${pendingRequests.length} pending scan requests`);
      
      if (pendingRequests.length > 0) {
        console.log('\nPending requests:');
        pendingRequests.forEach((req, index) => {
          console.log(`${index + 1}. ID: ${req.id || req._id}, Repository: ${req.repositoryUrl}, Agent: ${req.agentId}`);
        });
      }
    }

    console.log('\n4. Monitoring for scan completion...');
    console.log('The polling service should pick up this request within 30 seconds.');
    console.log('Check the main server logs for scan progress.');

  } catch (error) {
    console.error('❌ Error testing MCP scan:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Alternative: Direct local scan for immediate testing
async function runDirectScan() {
  try {
    console.log('\n🔄 Running direct scan as fallback...');
    const { analyzeNode } = require('./src/scanners/nodeScanner');
    const testRepoPath = path.resolve('./temp/test-node-app');
    
    const findings = await analyzeNode(testRepoPath);
    console.log(`✅ Direct scan completed: ${findings.length} findings`);
    
    const severityCount = {
      Critical: findings.filter(f => f.severity === 'Critical').length,
      High: findings.filter(f => f.severity === 'High').length,
      Medium: findings.filter(f => f.severity === 'Medium').length,
      Low: findings.filter(f => f.severity === 'Low').length
    };
    
    console.log('Summary:', severityCount);
  } catch (error) {
    console.error('❌ Direct scan failed:', error.message);
  }
}

// Run both tests
async function runTests() {
  await submitScanRequest();
  await runDirectScan();
}

runTests(); 