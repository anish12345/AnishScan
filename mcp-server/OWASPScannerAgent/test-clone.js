require('dotenv').config();
const { cloneRepository, cleanupRepository } = require('./src/services/gitService');
const path = require('path');

// Repository URL from your screenshot
const repositoryUrl = 'github.com/MRI-Software/MRI.OTA.API';
const branch = 'develop';
const tempDir = path.join(process.env.TEMP_DIR || './temp', 'test-clone');

console.log('Starting repository clone test...');
console.log(`Repository URL: ${repositoryUrl}`);
console.log(`Branch: ${branch}`);
console.log(`Target directory: ${tempDir}`);

async function testClone() {
  try {
    console.log('\nAttempting to clone repository...');
    await cloneRepository(repositoryUrl, branch, tempDir);
    console.log('\nRepository cloned successfully!');
    
    console.log('\nCleaning up...');
    await cleanupRepository(tempDir);
    console.log('Cleanup complete.');
  } catch (error) {
    console.error('\nError during test:', error.message);
  }
}

testClone()
  .then(() => console.log('\nTest completed.'))
  .catch(error => console.error('\nTest failed:', error))
  .finally(() => process.exit(0)); 