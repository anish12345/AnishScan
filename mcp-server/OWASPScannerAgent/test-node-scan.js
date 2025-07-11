const { handleScanRequest } = require('./src/controllers/scanController');
const path = require('path');
const logger = require('./src/utils/logger');

// Create a test scan request for the vulnerable Node.js application
const testScanRequest = {
  scanId: 'test-node-scan-' + Date.now(),
  repositoryUrl: `file://${path.resolve('./temp/test-node-app').replace(/\\/g, '/')}`,
  branch: 'master'
};

console.log('🚀 Starting Node.js Scanner Test');
console.log('================================');
console.log(`Scan ID: ${testScanRequest.scanId}`);
console.log(`Repository: ${testScanRequest.repositoryUrl}`);
console.log(`Branch: ${testScanRequest.branch}`);
console.log('');

// Override the results service to log results instead of sending to MCP
const originalSubmitResults = require('./src/services/resultsService').submitResults;
require('./src/services/resultsService').submitResults = async (scanId, findings, summary) => {
  console.log('\n🔍 SCAN RESULTS');
  console.log('===============');
  console.log(`Scan ID: ${scanId}`);
  console.log(`Total Findings: ${findings.length}`);
  console.log('');
  
  // Group findings by severity
  const severityGroups = {
    Critical: [],
    High: [],
    Medium: [],
    Low: []
  };
  
  findings.forEach(finding => {
    if (severityGroups[finding.severity]) {
      severityGroups[finding.severity].push(finding);
    }
  });
  
  // Display findings by severity
  Object.keys(severityGroups).forEach(severity => {
    const severityFindings = severityGroups[severity];
    if (severityFindings.length > 0) {
      console.log(`\n📊 ${severity.toUpperCase()} SEVERITY (${severityFindings.length} findings):`);
      console.log('─'.repeat(50));
      
      severityFindings.forEach((finding, index) => {
        console.log(`${index + 1}. ${finding.ruleId} - ${finding.description}`);
        console.log(`   File: ${finding.filePath}:${finding.lineNumber}`);
        console.log(`   Recommendation: ${finding.recommendation}`);
        if (finding.codeSnippet) {
          console.log(`   Code: ${finding.codeSnippet.split('\n')[0].trim()}`);
        }
        console.log('');
      });
    }
  });
  
  console.log('\n📋 SUMMARY');
  console.log('===========');
  console.log(`Critical: ${severityGroups.Critical.length}`);
  console.log(`High: ${severityGroups.High.length}`);
  console.log(`Medium: ${severityGroups.Medium.length}`);
  console.log(`Low: ${severityGroups.Low.length}`);
  console.log(`Total: ${findings.length}`);
  
  console.log('\n✅ Node.js Scanner Test Complete!');
  
  // Call original function to maintain compatibility
  return originalSubmitResults(scanId, findings, summary);
};

// Run the scan
async function runTest() {
  try {
    console.log('Starting scan...');
    await handleScanRequest(testScanRequest);
    console.log('\n🎉 Scan completed successfully!');
  } catch (error) {
    console.error('\n❌ Scan failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Wait a bit for the server to start up, then run the test
setTimeout(runTest, 3000); 