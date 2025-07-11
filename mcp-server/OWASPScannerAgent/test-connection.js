const axios = require('axios');
const https = require('https');

// Disable SSL certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// URL to test
const url = process.argv[2] || 'https://localhost:44361';

console.log(`Testing connection to ${url}...`);

// Create axios instance with SSL certificate validation disabled
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 10000
});

// Test the connection
axiosInstance.get(url)
  .then(response => {
    console.log('Connection successful!');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Headers:', response.headers);
    console.log('Response data:', response.data);
  })
  .catch(error => {
    console.error('Connection failed!');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Server responded with error status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server. Server might be down or unreachable.');
      console.error('Request details:', error.request._currentUrl);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  });

// Also test the registration endpoint
const registrationUrl = `${url}/api/agents/register`;
console.log(`\nTesting registration endpoint at ${registrationUrl}...`);

// Create a simple registration message
const registrationMessage = {
  messageType: 'AgentRegistration',
  timestamp: new Date().toISOString(),
  agentId: '',
  name: 'Test_Agent',
  ipAddress: '127.0.0.1:3000',
  capabilities: 'Test'
};

// Test the registration endpoint
axiosInstance.post(registrationUrl, registrationMessage)
  .then(response => {
    console.log('Registration endpoint test successful!');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response data:', response.data);
  })
  .catch(error => {
    console.error('Registration endpoint test failed!');
    
    if (error.response) {
      console.error(`Server responded with error status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server.');
    } else {
      console.error('Error setting up request:', error.message);
    }
  }); 