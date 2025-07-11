const { pollForScanRequests } = require('./src/services/pollService');

// Set the global agent ID that was registered
global.agentId = '686d3b618030bbe80d45c29c';

console.log('🔄 Manually triggering polling service...');
console.log(`Agent ID: ${global.agentId}`);

pollForScanRequests()
  .then(() => {
    console.log('✅ Polling completed');
  })
  .catch((error) => {
    console.error('❌ Polling failed:', error.message);
  }); 