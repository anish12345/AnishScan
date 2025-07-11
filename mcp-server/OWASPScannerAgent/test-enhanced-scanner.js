const nodeScanner = require('./src/scanners/nodeScanner');
const path = require('path');

async function testEnhancedScanner() {
  console.log('Testing enhanced Node.js scanner...');
  
  const testAppPath = path.join(__dirname, 'temp', 'test-node-app');
  
  try {
    const results = await nodeScanner.analyzeNode(testAppPath);
    
    console.log(`\nScan complete! Found ${results.length} total issues:\n`);
    
    // Group results by rule type
    const groupedResults = results.reduce((acc, result) => {
      const ruleType = result.ruleId.split('-')[0];
      if (!acc[ruleType]) acc[ruleType] = [];
      acc[ruleType].push(result);
      return acc;
    }, {});
    
    // Display summary
    Object.keys(groupedResults).forEach(ruleType => {
      console.log(`${ruleType}: ${groupedResults[ruleType].length} issues`);
    });
    
    console.log('\nDetailed findings:');
    console.log('==================');
    
    // Display detailed findings
    const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    const sortedResults = results.sort((a, b) => 
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    );
    
    sortedResults.forEach((result, index) => {
      console.log(`\n${index + 1}. [${result.severity}] ${result.ruleId}`);
      console.log(`   File: ${result.filePath}:${result.lineNumber}`);
      console.log(`   Description: ${result.description}`);
      console.log(`   Recommendation: ${result.recommendation}`);
      if (result.codeSnippet) {
        console.log(`   Code snippet: ${result.codeSnippet.substring(0, 100)}...`);
      }
    });
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error running scanner:', error);
  }
}

testEnhancedScanner(); 