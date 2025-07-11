const { cloneRepository, cleanupRepository } = require('../services/gitService');
const { analyzeCSharp } = require('../scanners/csharpScanner');
const { analyzeAngular } = require('../scanners/angularScanner');
const { analyzeReact } = require('../scanners/reactScanner');
const { analyzeJQuery } = require('../scanners/jqueryScanner');
const { analyzeNode } = require('../scanners/nodeScanner');
const { submitResults } = require('../services/resultsService');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * Handle a scan request from MCP
 * @param {Object} scanRequest - The scan request object
 */
const handleScanRequest = async (scanRequest) => {
  const { scanId, repositoryUrl, branch = 'main' } = scanRequest;
  const tempDir = path.join(process.env.TEMP_DIR || './temp', `scan-${scanId}`);
  
  logger.info(`Processing scan request ${scanId} for repository ${repositoryUrl}`);
  
  try {
    // Update agent status
    global.agentStatus = 'Scanning';
    
    // Clone the repository
    logger.info(`Cloning repository ${repositoryUrl} (branch: ${branch}) to ${tempDir}`);
    await cloneRepository(repositoryUrl, branch, tempDir);
    
    // Analyze the code
    logger.info('Starting code analysis');
    const findings = await analyzeCode(tempDir);
    
    // Generate summary
    const summary = generateSummary(findings);
    
    // Submit results back to MCP
    logger.info(`Submitting scan results for scan ${scanId}`);
    await submitResults(scanId, findings, summary);
    
    // Cleanup
    await cleanupRepository(tempDir);
    
    // Update agent status
    global.agentStatus = 'Idle';
    
    logger.info(`Scan ${scanId} completed successfully`);
  } catch (error) {
    logger.error(`Error processing scan ${scanId}:`, error.message);
    
    // Update agent status
    global.agentStatus = 'Error';
    
    // Try to clean up even if there was an error
    try {
      await cleanupRepository(tempDir);
    } catch (cleanupError) {
      logger.error('Error during cleanup:', cleanupError.message);
    }
    
    throw error;
  }
};

/**
 * Analyze code in the repository
 * @param {string} repoPath - Path to the cloned repository
 * @returns {Array} - List of findings
 */
const analyzeCode = async (repoPath) => {
  const findings = [];
  
  // Detect project types
  const projectTypes = detectProjectTypes(repoPath);
  logger.info(`Detected project types: ${projectTypes.join(', ')}`);
  
  // Run appropriate scanners based on detected project types
  if (projectTypes.includes('csharp')) {
    logger.info('Running C# scanner');
    const csharpFindings = await analyzeCSharp(repoPath);
    findings.push(...csharpFindings);
  }
  
  if (projectTypes.includes('angular')) {
    logger.info('Running Angular scanner');
    const angularFindings = await analyzeAngular(repoPath);
    findings.push(...angularFindings);
  }
  
  if (projectTypes.includes('react')) {
    logger.info('Running React scanner');
    const reactFindings = await analyzeReact(repoPath);
    findings.push(...reactFindings);
  }
  
  if (projectTypes.includes('jquery')) {
    logger.info('Running jQuery scanner');
    const jqueryFindings = await analyzeJQuery(repoPath);
    findings.push(...jqueryFindings);
  }
  
  if (projectTypes.includes('node')) {
    logger.info('Running Node.js scanner');
    const nodeFindings = await analyzeNode(repoPath);
    findings.push(...nodeFindings);
  }
  
  return findings;
};

/**
 * Detect project types in the repository
 * @param {string} repoPath - Path to the cloned repository
 * @returns {Array} - List of detected project types
 */
const detectProjectTypes = (repoPath) => {
  const projectTypes = [];
  
  try {
    // Check for C# projects
    const csharpFiles = findFiles(repoPath, ['.cs', '.csproj', '.sln']);
    if (csharpFiles.length > 0) {
      projectTypes.push('csharp');
    }
    
    // Check for Angular projects
    const angularJsonPath = path.join(repoPath, 'angular.json');
    const tsConfigPath = path.join(repoPath, 'tsconfig.json');
    const hasAngularPackage = checkPackageJson(repoPath, '@angular/core');
    if (fs.existsSync(angularJsonPath) || (hasAngularPackage && fs.existsSync(tsConfigPath))) {
      projectTypes.push('angular');
    }
    
    // Check for React projects
    const hasReactPackage = checkPackageJson(repoPath, 'react');
    if (hasReactPackage) {
      projectTypes.push('react');
    }
    
    // Check for jQuery usage
    const hasJQueryPackage = checkPackageJson(repoPath, 'jquery');
    const jqueryFiles = findFiles(repoPath, ['.js', '.html'], (content) => 
      content.includes('jQuery') || content.includes('jquery') || content.includes('$(')); 
    if (hasJQueryPackage || jqueryFiles.length > 0) {
      projectTypes.push('jquery');
    }
    
    // Check for Node.js projects
    const packageJsonPath = path.join(repoPath, 'package.json');
    const nodeFiles = findFiles(repoPath, ['.js', '.ts', '.mjs']);
    if (fs.existsSync(packageJsonPath) || nodeFiles.length > 0) {
      projectTypes.push('node');
    }
    
    return projectTypes;
  } catch (error) {
    logger.error('Error detecting project types:', error.message);
    return [];
  }
};

/**
 * Check if a package is used in package.json
 * @param {string} repoPath - Path to the repository
 * @param {string} packageName - Name of the package to check
 * @returns {boolean} - True if package is used
 */
const checkPackageJson = (repoPath, packageName) => {
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return (
      (packageJson.dependencies && packageJson.dependencies[packageName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[packageName])
    );
  } catch (error) {
    logger.error(`Error checking package.json for ${packageName}:`, error.message);
    return false;
  }
};

/**
 * Find files with specific extensions
 * @param {string} dir - Directory to search
 * @param {Array} extensions - List of file extensions to find
 * @param {Function} contentCheck - Optional function to check file content
 * @returns {Array} - List of matching files
 */
const findFiles = (dir, extensions, contentCheck = null) => {
  const results = [];
  
  const walk = (currentDir) => {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
        walk(filePath);
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          if (!contentCheck) {
            results.push(filePath);
          } else {
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              if (contentCheck(content)) {
                results.push(filePath);
              }
            } catch (error) {
              logger.error(`Error reading file ${filePath}:`, error.message);
            }
          }
        }
      }
    }
  };
  
  walk(dir);
  return results;
};

/**
 * Generate a summary of the findings
 * @param {Array} findings - List of findings
 * @returns {string} - Summary text
 */
const generateSummary = (findings) => {
  if (findings.length === 0) {
    return 'No issues found.';
  }
  
  const criticalCount = findings.filter(f => f.severity === 'Critical').length;
  const highCount = findings.filter(f => f.severity === 'High').length;
  const mediumCount = findings.filter(f => f.severity === 'Medium').length;
  const lowCount = findings.filter(f => f.severity === 'Low').length;
  const infoCount = findings.filter(f => f.severity === 'Info').length;
  
  return `Found ${findings.length} issues: ${criticalCount} Critical, ${highCount} High, ${mediumCount} Medium, ${lowCount} Low, ${infoCount} Info.`;
};

module.exports = {
  handleScanRequest
}; 