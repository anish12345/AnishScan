const { analyzeNode } = require('./src/scanners/nodeScanner');
const path = require('path');
const logger = require('./src/utils/logger');

// Test the Node.js scanner directly on the local vulnerable application
const testRepoPath = path.resolve('./temp/test-node-app');

console.log('🚀 Starting Direct Node.js Scanner Test');
console.log('========================================');
console.log(`Repository Path: ${testRepoPath}`);
console.log('');

// Run the analysis directly
async function runDirectTest() {
  try {
    console.log('Starting direct Node.js analysis...');
    
    // Set global agent status for compatibility
    global.agentStatus = 'Scanning';
    
    // Run the Node.js scanner directly
    const findings = await analyzeNode(testRepoPath);
    
    console.log('\n🔍 SCAN RESULTS');
    console.log('===============');
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
            const codePreview = finding.codeSnippet.split('\n')[0].trim();
            console.log(`   Code: ${codePreview.substring(0, 80)}${codePreview.length > 80 ? '...' : ''}`);
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
    
    // Update agent status
    global.agentStatus = 'Idle';
    
    console.log('\n✅ Direct Node.js Scanner Test Complete!');
    
    // Show detailed findings for verification
    if (findings.length > 0) {
      console.log('\n🔍 DETAILED FINDINGS:');
      console.log('====================');
      findings.slice(0, 3).forEach((finding, index) => {
        console.log(`${index + 1}. [${finding.severity}] ${finding.ruleId}`);
        console.log(`   Description: ${finding.description}`);
        console.log(`   File: ${finding.filePath}:${finding.lineNumber}`);
        console.log(`   Recommendation: ${finding.recommendation}`);
        if (finding.codeSnippet) {
          console.log(`   Code Snippet:`);
          console.log(`   ${finding.codeSnippet.split('\n').slice(0, 3).join('\n   ')}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('\n❌ Direct scan failed:', error.message);
    console.error('Stack trace:', error.stack);
    global.agentStatus = 'Error';
  }
}

// Run the test
runDirectTest(); 