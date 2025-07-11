const axios = require('axios');
const https = require('https');

// Create axios instance that ignores SSL certificates for local testing
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  }),
  timeout: 10000
});

const MCP_SERVER_URL = 'https://localhost:44361';

async function checkScanStatus() {
  try {
    console.log('🔍 Checking Scan Status');
    console.log('======================');
    
    // Get all scan requests
    const response = await axiosInstance.get(`${MCP_SERVER_URL}/api/Scans/requests`);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`📋 Total scan requests: ${response.data.length}`);
      
      // Group by status
      const statusGroups = {};
      response.data.forEach(req => {
        const status = req.status || 'Unknown';
        if (!statusGroups[status]) {
          statusGroups[status] = [];
        }
        statusGroups[status].push(req);
      });
      
      // Display by status
      Object.keys(statusGroups).forEach(status => {
        console.log(`\n📊 ${status.toUpperCase()} (${statusGroups[status].length}):`);
        statusGroups[status].forEach(req => {
          const repo = req.repositoryUrl || 'Unknown';
          const shortRepo = repo.length > 50 ? '...' + repo.slice(-47) : repo;
          console.log(`  - ID: ${req.id || req._id}, Repository: ${shortRepo}`);
          if (req.agentId) {
            console.log(`    Agent: ${req.agentId}`);
          }
          if (req.createdAt) {
            console.log(`    Created: ${new Date(req.createdAt).toLocaleString()}`);
          }
        });
      });
      
      // Check for our specific scan
      const ourScan = response.data.find(req => 
        req.repositoryUrl && req.repositoryUrl.includes('test-node-app')
      );
      
      if (ourScan) {
        console.log('\n🎯 Our Test Scan:');
        console.log(`   ID: ${ourScan.id || ourScan._id}`);
        console.log(`   Status: ${ourScan.status}`);
        console.log(`   Repository: ${ourScan.repositoryUrl}`);
        console.log(`   Agent: ${ourScan.agentId}`);
        
        if (ourScan.status === 'Completed') {
          console.log('✅ Scan completed successfully!');
        } else if (ourScan.status === 'InProgress') {
          console.log('🔄 Scan is currently in progress...');
        } else if (ourScan.status === 'Failed') {
          console.log('❌ Scan failed');
        } else {
          console.log('⏳ Scan is still pending...');
        }
      }
      
    } else {
      console.log('❌ Unexpected response format');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error checking scan status:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkScanStatus(); 