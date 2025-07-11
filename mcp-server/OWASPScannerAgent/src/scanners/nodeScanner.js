const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Analyze Node.js code using npm audit, ESLint, and regex patterns
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeNode = async (repoPath) => {
  logger.info('Analyzing Node.js code');
  const findings = [];
  
  try {
    // Run npm audit for known vulnerabilities
    const auditFindings = await runNpmAudit(repoPath);
    findings.push(...auditFindings);
    
    // Run ESLint with security plugins
    const eslintFindings = await runEslintAnalysis(repoPath);
    findings.push(...eslintFindings);
    
    // Add regex-based findings
    const regexFindings = await analyzeWithRegex(repoPath);
    findings.push(...regexFindings);
    
    logger.info(`Node.js analysis complete. Found ${findings.length} issues.`);
    return findings;
  } catch (error) {
    logger.error('Error analyzing Node.js code:', error.message);
    return [];
  }
};

/**
 * Run npm audit to check for known vulnerabilities
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings from npm audit
 */
const runNpmAudit = async (repoPath) => {
  const findings = [];
  
  try {
    // Check if package.json exists
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      logger.info('No package.json found, skipping npm audit');
      return findings;
    }
    
    logger.info('Running comprehensive package vulnerability scan');
    
    // Run npm audit with JSON output
    const auditFindings = await runNpmAuditScan(repoPath);
    findings.push(...auditFindings);
    
    // Check for outdated packages
    const outdatedFindings = await checkOutdatedPackages(repoPath);
    findings.push(...outdatedFindings);
    
    // Check for known vulnerable packages
    const knownVulnFindings = await checkKnownVulnerablePackages(repoPath);
    findings.push(...knownVulnFindings);
    
    // Check package maintenance status
    const maintenanceFindings = await checkPackageMaintenance(repoPath);
    findings.push(...maintenanceFindings);
    
    return findings;
  } catch (error) {
    logger.error('Error running package vulnerability scan:', error.message);
    return findings;
  }
};

/**
 * Run npm audit scan
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings from npm audit
 */
const runNpmAuditScan = async (repoPath) => {
  const findings = [];
  
  try {
    // Install dependencies first if node_modules doesn't exist
    if (!fs.existsSync(path.join(repoPath, 'node_modules'))) {
      logger.info('Installing dependencies for audit...');
      await execPromise('npm install --package-lock-only', { cwd: repoPath });
    }
    
    // Run npm audit with JSON output
    const { stdout, stderr } = await execPromise(
      'npm audit --json',
      { cwd: repoPath, maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
    );
    
    const auditResult = JSON.parse(stdout);
    
    // Process audit results
    if (auditResult.vulnerabilities) {
      for (const [packageName, vulnerability] of Object.entries(auditResult.vulnerabilities)) {
        // Process each vulnerability
        const vulnerabilityDetails = vulnerability.via || [];
        
        for (const vulnDetail of vulnerabilityDetails) {
          if (typeof vulnDetail === 'string') continue; // Skip dependency names
          
          const finding = {
            ruleId: `NPM-AUDIT-${vulnerability.severity?.toUpperCase()}`,
            severity: mapNpmSeverity(vulnerability.severity),
            filePath: 'package.json',
            lineNumber: 1,
            description: `${packageName}: ${vulnDetail.title || vulnerability.title || 'Known vulnerability'} (${vulnDetail.cwe || 'No CWE'})`,
            codeSnippet: `"${packageName}": "${vulnerability.range || 'unknown'}"`,
            recommendation: generateVulnerabilityRecommendation(packageName, vulnerability, vulnDetail)
          };
          findings.push(finding);
        }
        
        // If no detailed vulnerabilities, create a general finding
        if (vulnerabilityDetails.length === 0 || vulnerabilityDetails.every(v => typeof v === 'string')) {
          const finding = {
            ruleId: `NPM-AUDIT-${vulnerability.severity?.toUpperCase()}`,
            severity: mapNpmSeverity(vulnerability.severity),
            filePath: 'package.json',
            lineNumber: 1,
            description: `${packageName}: ${vulnerability.title || 'Known vulnerability'}`,
            codeSnippet: `"${packageName}": "${vulnerability.range || 'unknown'}"`,
            recommendation: generateVulnerabilityRecommendation(packageName, vulnerability)
          };
          findings.push(finding);
        }
      }
    }
    
    return findings;
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    if (error.stdout) {
      try {
        const auditResult = JSON.parse(error.stdout);
        if (auditResult.vulnerabilities) {
          for (const [packageName, vulnerability] of Object.entries(auditResult.vulnerabilities)) {
            const vulnerabilityDetails = vulnerability.via || [];
            
            for (const vulnDetail of vulnerabilityDetails) {
              if (typeof vulnDetail === 'string') continue;
              
              const finding = {
                ruleId: `NPM-AUDIT-${vulnerability.severity?.toUpperCase()}`,
                severity: mapNpmSeverity(vulnerability.severity),
                filePath: 'package.json',
                lineNumber: 1,
                description: `${packageName}: ${vulnDetail.title || vulnerability.title || 'Known vulnerability'} (${vulnDetail.cwe || 'No CWE'})`,
                codeSnippet: `"${packageName}": "${vulnerability.range || 'unknown'}"`,
                recommendation: generateVulnerabilityRecommendation(packageName, vulnerability, vulnDetail)
              };
              findings.push(finding);
            }
          }
        }
      } catch (parseError) {
        logger.error('Error parsing npm audit output:', parseError.message);
      }
    } else {
      logger.error('Error running npm audit:', error.message);
    }
    
    return findings;
  }
};

/**
 * Check for outdated packages that might have security vulnerabilities
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings for outdated packages
 */
const checkOutdatedPackages = async (repoPath) => {
  const findings = [];
  
  try {
    logger.info('Checking for outdated packages...');
    
    const { stdout } = await execPromise(
      'npm outdated --json',
      { cwd: repoPath, maxBuffer: 1024 * 1024 * 10 }
    );
    
    const outdatedResult = JSON.parse(stdout);
    
    for (const [packageName, info] of Object.entries(outdatedResult)) {
      const currentVersion = info.current;
      const latestVersion = info.latest;
      const wantedVersion = info.wanted;
      
      // Calculate version difference severity
      const severity = calculateOutdatedSeverity(currentVersion, latestVersion);
      
      const finding = {
        ruleId: 'NPM-OUTDATED',
        severity,
        filePath: 'package.json',
        lineNumber: 1,
        description: `Outdated package: ${packageName} (current: ${currentVersion}, latest: ${latestVersion})`,
        codeSnippet: `"${packageName}": "${currentVersion}"`,
        recommendation: `Update ${packageName} from ${currentVersion} to ${latestVersion}. Run: npm install ${packageName}@${latestVersion}`
      };
      
      findings.push(finding);
    }
    
    return findings;
  } catch (error) {
    // npm outdated returns non-zero exit code when outdated packages are found
    if (error.stdout) {
      try {
        const outdatedResult = JSON.parse(error.stdout);
        for (const [packageName, info] of Object.entries(outdatedResult)) {
          const currentVersion = info.current;
          const latestVersion = info.latest;
          const severity = calculateOutdatedSeverity(currentVersion, latestVersion);
          
          const finding = {
            ruleId: 'NPM-OUTDATED',
            severity,
            filePath: 'package.json',
            lineNumber: 1,
            description: `Outdated package: ${packageName} (current: ${currentVersion}, latest: ${latestVersion})`,
            codeSnippet: `"${packageName}": "${currentVersion}"`,
            recommendation: `Update ${packageName} from ${currentVersion} to ${latestVersion}. Run: npm install ${packageName}@${latestVersion}`
          };
          
          findings.push(finding);
        }
      } catch (parseError) {
        logger.error('Error parsing npm outdated output:', parseError.message);
      }
    }
    
    return findings;
  }
};

/**
 * Check for known vulnerable packages and versions
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings for known vulnerable packages
 */
const checkKnownVulnerablePackages = async (repoPath) => {
  const findings = [];
  
  try {
    const packageJsonPath = path.join(repoPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies
    };
    
    // Known vulnerable packages database
    const knownVulnerablePackages = getKnownVulnerablePackages();
    
    for (const [packageName, version] of Object.entries(allDependencies)) {
      const vulnerableVersions = knownVulnerablePackages[packageName];
      if (vulnerableVersions) {
        // Check if current version is vulnerable
        const cleanVersion = version.replace(/[\^~><>=]/g, '');
        const isVulnerable = vulnerableVersions.some(vulnInfo => 
          isVersionVulnerable(cleanVersion, vulnInfo.versions)
        );
        
        if (isVulnerable) {
          const vulnInfo = vulnerableVersions.find(v => 
            isVersionVulnerable(cleanVersion, v.versions)
          );
          
          const finding = {
            ruleId: 'KNOWN-VULNERABLE-PACKAGE',
            severity: vulnInfo.severity,
            filePath: 'package.json',
            lineNumber: 1,
            description: `Known vulnerable package: ${packageName}@${version} - ${vulnInfo.description}`,
            codeSnippet: `"${packageName}": "${version}"`,
            recommendation: `${vulnInfo.recommendation} Safe version: ${vulnInfo.safeVersion || 'latest'}`
          };
          
          findings.push(finding);
        }
      }
    }
    
    return findings;
  } catch (error) {
    logger.error('Error checking known vulnerable packages:', error.message);
    return findings;
  }
};

/**
 * Check package maintenance status
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings for unmaintained packages
 */
const checkPackageMaintenance = async (repoPath) => {
  const findings = [];
  
  try {
    const packageJsonPath = path.join(repoPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    // Check for deprecated packages
    for (const [packageName, version] of Object.entries(allDependencies)) {
      const deprecatedPackages = getDeprecatedPackages();
      
      if (deprecatedPackages[packageName]) {
        const deprecationInfo = deprecatedPackages[packageName];
        
        const finding = {
          ruleId: 'DEPRECATED-PACKAGE',
          severity: deprecationInfo.severity,
          filePath: 'package.json',
          lineNumber: 1,
          description: `Deprecated package: ${packageName} - ${deprecationInfo.reason}`,
          codeSnippet: `"${packageName}": "${version}"`,
          recommendation: deprecationInfo.alternative || 'Consider finding an alternative package'
        };
        
        findings.push(finding);
      }
    }
    
    return findings;
  } catch (error) {
    logger.error('Error checking package maintenance:', error.message);
    return findings;
  }
};

/**
 * Run ESLint analysis with security plugins
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings from ESLint
 */
const runEslintAnalysis = async (repoPath) => {
  const findings = [];
  
  try {
    // Create ESLint config for Node.js security rules
    const configPath = path.join(repoPath, '.eslintrc.json');
    createEslintConfig(configPath);
    
    // Run ESLint
    const { stdout, stderr } = await execPromise(
      `npx eslint --ext .js,.ts --format @microsoft/eslint-formatter-sarif -o eslint-results.sarif "**/*.js" "**/*.ts"`,
      { cwd: repoPath, maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
    );
    
    // Parse results
    const resultsPath = path.join(repoPath, 'eslint-results.sarif');
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      // Map SARIF results to our findings format
      if (results.runs && results.runs.length > 0 && results.runs[0].results) {
        for (const result of results.runs[0].results) {
          if (!result.locations || result.locations.length === 0) {
            continue;
          }
          
          const location = result.locations[0];
          const filePath = location.physicalLocation.artifactLocation.uri;
          const lineNumber = location.physicalLocation.region.startLine;
          
          // Read the code snippet
          let codeSnippet = '';
          try {
            const fullPath = path.join(repoPath, filePath);
            if (fs.existsSync(fullPath)) {
              const fileContent = fs.readFileSync(fullPath, 'utf8');
              const lines = fileContent.split('\n');
              const startLine = Math.max(0, lineNumber - 3);
              const endLine = Math.min(lines.length, lineNumber + 2);
              codeSnippet = lines.slice(startLine, endLine).join('\n');
            }
          } catch (error) {
            logger.error(`Error reading code snippet from ${filePath}:`, error.message);
          }
          
          // Get rule metadata
          const rule = result.ruleId;
          const severity = mapSeverity(result.level);
          
          findings.push({
            ruleId: rule || 'NODE-SECURITY',
            severity,
            filePath,
            lineNumber,
            description: result.message.text,
            codeSnippet,
            recommendation: getRecommendation(rule)
          });
        }
      }
      
      // Clean up
      try {
        fs.unlinkSync(resultsPath);
        fs.unlinkSync(configPath);
      } catch (error) {
        logger.error('Error cleaning up ESLint files:', error.message);
      }
    }
    
    return findings;
  } catch (error) {
    logger.error('Error running ESLint analysis:', error.message);
    return [];
  }
};

/**
 * Create ESLint configuration file for Node.js security rules
 * @param {string} configPath - Path to write the config file
 */
const createEslintConfig = (configPath) => {
  const config = {
    "env": {
      "node": true,
      "es2021": true
    },
    "extends": [
      "eslint:recommended",
      "plugin:security/recommended"
    ],
    "parserOptions": {
      "ecmaVersion": 12,
      "sourceType": "module"
    },
    "plugins": [
      "security"
    ],
    "rules": {
      "no-eval": "error",
      "no-implied-eval": "error",
      "security/detect-object-injection": "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-pseudo-random-bytes": "error",
      "security/detect-sql-literal-injection": "error"
    },
    "overrides": [
      {
        "files": ["*.ts"],
        "parser": "@typescript-eslint/parser",
        "plugins": ["@typescript-eslint"],
        "extends": ["plugin:@typescript-eslint/recommended"]
      }
    ]
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

/**
 * Analyze Node.js code using regex patterns
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeWithRegex = async (repoPath) => {
  const findings = [];
  
  // Define regex patterns for common Node.js security issues
  const patterns = [
    {
      name: 'Use of eval() function',
      regex: /eval\s*\(/g,
      severity: 'Critical',
      ruleId: 'NODE-EVAL',
      recommendation: 'Never use eval() as it can lead to code injection vulnerabilities. Use safer alternatives like JSON.parse() for data parsing.'
    },
    {
      name: 'Use of Function constructor as eval alternative',
      regex: /new\s+Function\s*\(/g,
      severity: 'Critical',
      ruleId: 'NODE-FUNCTION-CONSTRUCTOR',
      recommendation: 'Avoid using the Function constructor as it can lead to code injection vulnerabilities similar to eval().'
    },
    {
      name: 'Hardcoded password or API key',
      regex: /(password|pwd|pass|api_key|apikey|secret|token)\s*[=:]\s*["'][^"']+["']/gi,
      severity: 'High',
      ruleId: 'NODE-HARDCODED-SECRETS',
      recommendation: 'Never hardcode passwords, API keys, or secrets in source code. Use environment variables or secure vaults.'
    },
    {
      name: 'Insecure random number generation',
      regex: /Math\.random\(\)/g,
      severity: 'Medium',
      ruleId: 'NODE-WEAK-RANDOM',
      recommendation: 'Use crypto.randomBytes() or crypto.pseudoRandomBytes() for cryptographically secure random numbers.'
    },
    {
      name: 'SQL injection vulnerability',
      regex: /query\s*\(\s*["'].*\+.*["']/g,
      severity: 'High',
      ruleId: 'NODE-SQL-INJECTION',
      recommendation: 'Use parameterized queries or prepared statements to prevent SQL injection.'
    },
    {
      name: 'Command injection vulnerability',
      regex: /exec\s*\(\s*.*\+.*\)/g,
      severity: 'High',
      ruleId: 'NODE-COMMAND-INJECTION',
      recommendation: 'Avoid concatenating user input into shell commands. Use execFile() or spawn() with proper input validation.'
    },
    {
      name: 'Path traversal vulnerability',
      regex: /fs\.(readFile|writeFile|read|write)\s*\([^)]*\+[^)]*\)/g,
      severity: 'High',
      ruleId: 'NODE-PATH-TRAVERSAL',
      recommendation: 'Validate and sanitize file paths. Use path.resolve() and check if the resolved path is within allowed directories.'
    },
    {
      name: 'Unsafe deserialization',
      regex: /JSON\.parse\s*\(\s*req\.(body|params|query)/g,
      severity: 'Medium',
      ruleId: 'NODE-UNSAFE-DESERIALIZATION',
      recommendation: 'Validate and sanitize input before parsing JSON. Consider using a schema validation library.'
    },
    {
      name: 'Prototype pollution vulnerability',
      regex: /\[.*\]\s*=.*|\.__proto__\s*=|\.constructor\.prototype\s*=/g,
      severity: 'High',
      ruleId: 'NODE-PROTOTYPE-POLLUTION',
      recommendation: 'Avoid dynamic property assignment. Use Object.create(null) or Map for safe key-value storage.'
    },
    {
      name: 'Missing input validation',
      regex: /req\.(body|params|query)\.[a-zA-Z_][a-zA-Z0-9_]*(?!\s*\.)/g,
      severity: 'Medium',
      ruleId: 'NODE-MISSING-VALIDATION',
      recommendation: 'Always validate and sanitize user input before processing. Use validation libraries like Joi or express-validator.'
    },
    {
      name: 'Weak cryptography - MD5',
      regex: /crypto\.createHash\s*\(\s*["']md5["']/g,
      severity: 'Medium',
      ruleId: 'NODE-WEAK-CRYPTO-MD5',
      recommendation: 'MD5 is cryptographically broken. Use SHA-256 or stronger hashing algorithms.'
    },
    {
      name: 'Weak cryptography - SHA1',
      regex: /crypto\.createHash\s*\(\s*["']sha1["']/g,
      severity: 'Medium',
      ruleId: 'NODE-WEAK-CRYPTO-SHA1',
      recommendation: 'SHA-1 is deprecated. Use SHA-256 or stronger hashing algorithms.'
    },
    {
      name: 'Insecure HTTP usage',
      regex: /http:\/\//g,
      severity: 'Low',
      ruleId: 'NODE-INSECURE-HTTP',
      recommendation: 'Use HTTPS instead of HTTP for secure communication, especially for sensitive data.'
    },
    {
      name: 'Debug code in production',
      regex: /console\.(log|debug|info|warn|error)\s*\(/g,
      severity: 'Low',
      ruleId: 'NODE-DEBUG-CODE',
      recommendation: 'Remove console statements in production code. Use proper logging libraries instead.'
    },
    {
      name: 'Unsafe require() with dynamic path',
      regex: /require\s*\(\s*.*\+.*\)/g,
      severity: 'High',
      ruleId: 'NODE-UNSAFE-REQUIRE',
      recommendation: 'Avoid dynamic require() calls with user input. Use static imports or whitelist allowed modules.'
    },
    {
      name: 'Missing CSRF protection',
      regex: /app\.use\s*\(\s*express\.(json|urlencoded)\s*\(\s*\)\s*\)/g,
      severity: 'Medium',
      ruleId: 'NODE-MISSING-CSRF',
      recommendation: 'Implement CSRF protection using libraries like csurf for Express applications.'
    },
    {
      name: 'Insecure cookie configuration',
      regex: /res\.cookie\s*\([^)]*\)/g,
      severity: 'Medium',
      ruleId: 'NODE-INSECURE-COOKIE',
      recommendation: 'Set secure cookie options: httpOnly, secure, sameSite. Avoid sensitive data in cookies.'
    },
    {
      name: 'Missing security headers',
      regex: /app\.listen\s*\(/g,
      severity: 'Low',
      ruleId: 'NODE-MISSING-SECURITY-HEADERS',
      recommendation: 'Use helmet.js middleware to set security headers like X-Frame-Options, X-XSS-Protection, etc.'
    }
  ];
  
  // Get all Node.js files
  const nodeFiles = findNodeFiles(repoPath);
  
  for (const filePath of nodeFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (const pattern of patterns) {
        const matches = content.matchAll(pattern.regex);
        
        for (const match of matches) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const startLine = Math.max(0, lineNumber - 3);
          const endLine = Math.min(lines.length, lineNumber + 2);
          const codeSnippet = lines.slice(startLine, endLine).join('\n');
          
          findings.push({
            ruleId: pattern.ruleId,
            severity: pattern.severity,
            filePath: path.relative(repoPath, filePath),
            lineNumber,
            description: pattern.name,
            codeSnippet,
            recommendation: pattern.recommendation
          });
        }
      }
    } catch (error) {
      logger.error(`Error analyzing file ${filePath}:`, error.message);
    }
  }
  
  return findings;
};

/**
 * Find all Node.js files in the repository
 * @param {string} repoPath - Path to the repository
 * @returns {Array} - List of Node.js file paths
 */
const findNodeFiles = (repoPath) => {
  const files = [];
  
  const walk = (dir) => {
    const dirFiles = fs.readdirSync(dir);
    
    for (const file of dirFiles) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip common directories that don't contain source code
        if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
          walk(filePath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (ext === '.js' || ext === '.ts' || ext === '.mjs' || file === 'package.json') {
          files.push(filePath);
        }
      }
    }
  };
  
  walk(repoPath);
  return files;
};

/**
 * Map npm audit severity to our severity levels
 * @param {string} npmSeverity - npm audit severity level
 * @returns {string} - Mapped severity level
 */
const mapNpmSeverity = (npmSeverity) => {
  switch (npmSeverity?.toLowerCase()) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'moderate':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return 'Medium';
  }
};

/**
 * Map ESLint severity to our severity levels
 * @param {string} eslintSeverity - ESLint severity level
 * @returns {string} - Mapped severity level
 */
const mapSeverity = (eslintSeverity) => {
  switch (eslintSeverity) {
    case 'error':
      return 'High';
    case 'warning':
      return 'Medium';
    case 'info':
      return 'Low';
    default:
      return 'Medium';
  }
};

/**
 * Get recommendation for a specific rule
 * @param {string} ruleId - Rule identifier
 * @returns {string} - Recommendation text
 */
const getRecommendation = (ruleId) => {
  const recommendations = {
    'security/detect-object-injection': 'Validate object keys and use Object.prototype.hasOwnProperty.call() to check properties.',
    'security/detect-non-literal-fs-filename': 'Validate file paths and use path.resolve() to prevent path traversal.',
    'security/detect-non-literal-require': 'Use static imports or whitelist allowed modules for require() calls.',
    'security/detect-possible-timing-attacks': 'Use crypto.timingSafeEqual() for sensitive comparisons.',
    'security/detect-eval-with-expression': 'Replace eval() with safer alternatives like JSON.parse().',
    'security/detect-unsafe-regex': 'Review regex patterns for ReDoS vulnerabilities.',
    'security/detect-buffer-noassert': 'Use assert variants of Buffer methods for input validation.',
    'security/detect-child-process': 'Validate input and use spawn() with arguments array instead of exec().',
    'security/detect-new-buffer': 'Use Buffer.from() or Buffer.alloc() instead of new Buffer().',
    'security/detect-pseudo-random-bytes': 'Use crypto.randomBytes() for cryptographically secure random numbers.',
    'security/detect-sql-literal-injection': 'Use parameterized queries to prevent SQL injection.',
    'no-eval': 'Replace eval() with safer alternatives like JSON.parse().',
    'no-implied-eval': 'Avoid setTimeout() and setInterval() with string arguments.'
  };
  
  return recommendations[ruleId] || 'Review this finding for potential security issues.';
};

/**
 * Generate vulnerability recommendation based on audit result
 * @param {string} packageName - Package name
 * @param {Object} vulnerability - Vulnerability object from npm audit
 * @param {Object} vulnDetail - Detailed vulnerability information
 * @returns {string} - Recommendation text
 */
const generateVulnerabilityRecommendation = (packageName, vulnerability, vulnDetail) => {
  let recommendation = '';
  
  if (vulnDetail && vulnDetail.url) {
    recommendation += `See ${vulnDetail.url} for more details. `;
  } else if (vulnerability.url) {
    recommendation += `See ${vulnerability.url} for more details. `;
  }
  
  if (vulnerability.fixAvailable) {
    if (vulnerability.fixAvailable === true) {
      recommendation += `Run 'npm audit fix' to automatically fix this vulnerability.`;
    } else if (typeof vulnerability.fixAvailable === 'object') {
      recommendation += `Update to ${vulnerability.fixAvailable.name}@${vulnerability.fixAvailable.version} to fix this vulnerability.`;
    }
  } else {
    recommendation += `Update to a secure version of ${packageName}.`;
  }
  
  return recommendation;
};

/**
 * Calculate severity based on version difference
 * @param {string} currentVersion - Current version
 * @param {string} latestVersion - Latest version
 * @returns {string} - Severity level
 */
const calculateOutdatedSeverity = (currentVersion, latestVersion) => {
  try {
    const current = parseVersion(currentVersion);
    const latest = parseVersion(latestVersion);
    
    // Calculate major, minor, patch differences
    const majorDiff = latest.major - current.major;
    const minorDiff = latest.minor - current.minor;
    const patchDiff = latest.patch - current.patch;
    
    // Determine severity based on version differences
    if (majorDiff > 2) {
      return 'High';
    } else if (majorDiff > 0) {
      return 'Medium';
    } else if (minorDiff > 5) {
      return 'Medium';
    } else if (minorDiff > 0 || patchDiff > 10) {
      return 'Low';
    } else {
      return 'Info';
    }
  } catch (error) {
    return 'Low';
  }
};

/**
 * Parse version string into components
 * @param {string} version - Version string
 * @returns {Object} - Version components
 */
const parseVersion = (version) => {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0]) || 0,
    minor: parseInt(parts[1]) || 0,
    patch: parseInt(parts[2]) || 0
  };
};

/**
 * Get known vulnerable packages database
 * @returns {Object} - Database of known vulnerable packages
 */
const getKnownVulnerablePackages = () => {
  return {
    'lodash': [
      {
        versions: ['<4.17.21'],
        severity: 'High',
        description: 'Prototype pollution vulnerability',
        recommendation: 'Update to lodash@4.17.21 or later',
        safeVersion: '4.17.21'
      }
    ],
    'handlebars': [
      {
        versions: ['<4.7.7'],
        severity: 'High',
        description: 'Remote code execution vulnerability',
        recommendation: 'Update to handlebars@4.7.7 or later',
        safeVersion: '4.7.7'
      }
    ],
    'serialize-javascript': [
      {
        versions: ['<3.1.0'],
        severity: 'High',
        description: 'XSS vulnerability in serialize-javascript',
        recommendation: 'Update to serialize-javascript@3.1.0 or later',
        safeVersion: '3.1.0'
      }
    ],
    'node-serialize': [
      {
        versions: ['<=0.0.4'],
        severity: 'Critical',
        description: 'Remote code execution via untrusted data deserialization',
        recommendation: 'Avoid using node-serialize or update to a secure alternative',
        safeVersion: 'N/A'
      }
    ],
    'growl': [
      {
        versions: ['<=1.10.5'],
        severity: 'Critical',
        description: 'Command injection vulnerability',
        recommendation: 'Update to growl@1.10.6 or later',
        safeVersion: '1.10.6'
      }
    ],
    'helmet': [
      {
        versions: ['<3.21.3'],
        severity: 'Medium',
        description: 'Missing security headers',
        recommendation: 'Update to helmet@3.21.3 or later',
        safeVersion: '3.21.3'
      }
    ],
    'express': [
      {
        versions: ['<4.17.3'],
        severity: 'Medium',
        description: 'Various security vulnerabilities',
        recommendation: 'Update to express@4.17.3 or later',
        safeVersion: '4.17.3'
      }
    ],
    'moment': [
      {
        versions: ['<2.29.2'],
        severity: 'Medium',
        description: 'ReDoS vulnerability in moment.js',
        recommendation: 'Update to moment@2.29.2 or later, or consider using date-fns',
        safeVersion: '2.29.2'
      }
    ],
    'debug': [
      {
        versions: ['<2.6.9'],
        severity: 'Low',
        description: 'ReDoS vulnerability in debug',
        recommendation: 'Update to debug@2.6.9 or later',
        safeVersion: '2.6.9'
      }
    ],
    'request': [
      {
        versions: ['*'],
        severity: 'Medium',
        description: 'Package deprecated and no longer maintained',
        recommendation: 'Replace with axios, node-fetch, or built-in fetch',
        safeVersion: 'N/A'
      }
    ],
    'yargs-parser': [
      {
        versions: ['<13.1.2'],
        severity: 'High',
        description: 'Prototype pollution vulnerability',
        recommendation: 'Update to yargs-parser@13.1.2 or later',
        safeVersion: '13.1.2'
      }
    ],
    'minimist': [
      {
        versions: ['<1.2.6'],
        severity: 'High',
        description: 'Prototype pollution vulnerability',
        recommendation: 'Update to minimist@1.2.6 or later',
        safeVersion: '1.2.6'
      }
    ],
    'node-fetch': [
      {
        versions: ['<2.6.7'],
        severity: 'High',
        description: 'Information exposure vulnerability',
        recommendation: 'Update to node-fetch@2.6.7 or later',
        safeVersion: '2.6.7'
      }
    ],
    'axios': [
      {
        versions: ['<0.21.2'],
        severity: 'High',
        description: 'Server-side request forgery (SSRF)',
        recommendation: 'Update to axios@0.21.2 or later',
        safeVersion: '0.21.2'
      }
    ],
    'underscore': [
      {
        versions: ['<1.13.0'],
        severity: 'High',
        description: 'Arbitrary code execution vulnerability',
        recommendation: 'Update to underscore@1.13.0 or later',
        safeVersion: '1.13.0'
      }
    ]
  };
};

/**
 * Check if a version is vulnerable
 * @param {string} version - Current version
 * @param {string} vulnerableRange - Vulnerable version range
 * @returns {boolean} - True if vulnerable
 */
const isVersionVulnerable = (version, vulnerableRange) => {
  try {
    if (vulnerableRange === '*') {
      return true;
    }
    
    // Simple version comparison for common patterns
    if (vulnerableRange.startsWith('<')) {
      const targetVersion = vulnerableRange.substring(1);
      return compareVersions(version, targetVersion) < 0;
    } else if (vulnerableRange.startsWith('<=')) {
      const targetVersion = vulnerableRange.substring(2);
      return compareVersions(version, targetVersion) <= 0;
    } else if (vulnerableRange.startsWith('>=')) {
      const targetVersion = vulnerableRange.substring(2);
      return compareVersions(version, targetVersion) >= 0;
    } else if (vulnerableRange.startsWith('>')) {
      const targetVersion = vulnerableRange.substring(1);
      return compareVersions(version, targetVersion) > 0;
    } else {
      // Exact match
      return version === vulnerableRange;
    }
  } catch (error) {
    return false;
  }
};

/**
 * Compare two version strings
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @returns {number} - Comparison result (-1, 0, 1)
 */
const compareVersions = (version1, version2) => {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  
  if (v1.major !== v2.major) {
    return v1.major - v2.major;
  }
  if (v1.minor !== v2.minor) {
    return v1.minor - v2.minor;
  }
  return v1.patch - v2.patch;
};

/**
 * Get deprecated packages database
 * @returns {Object} - Database of deprecated packages
 */
const getDeprecatedPackages = () => {
  return {
    'request': {
      severity: 'Medium',
      reason: 'Package deprecated and no longer maintained',
      alternative: 'Use axios, node-fetch, or built-in fetch instead'
    },
    'bower': {
      severity: 'Low',
      reason: 'Package deprecated in favor of npm and yarn',
      alternative: 'Use npm or yarn for package management'
    },
    'gulp-util': {
      severity: 'Low',
      reason: 'Package deprecated and split into separate modules',
      alternative: 'Use individual gulp utilities instead'
    },
    'fs-extra': {
      severity: 'Info',
      reason: 'Consider using built-in fs.promises for newer Node.js versions',
      alternative: 'Use built-in fs.promises for Node.js 10+ or continue using fs-extra'
    },
    'babel-core': {
      severity: 'Medium',
      reason: 'Use @babel/core instead',
      alternative: 'Migrate to @babel/core'
    },
    'babel-preset-env': {
      severity: 'Medium',
      reason: 'Use @babel/preset-env instead',
      alternative: 'Migrate to @babel/preset-env'
    },
    'mkdirp': {
      severity: 'Info',
      reason: 'Use built-in fs.mkdir with recursive option for Node.js 10+',
      alternative: 'Use fs.mkdir({ recursive: true }) for Node.js 10+'
    },
    'rimraf': {
      severity: 'Info',
      reason: 'Use built-in fs.rm with recursive option for Node.js 14+',
      alternative: 'Use fs.rm({ recursive: true }) for Node.js 14+'
    },
    'left-pad': {
      severity: 'Low',
      reason: 'Use String.prototype.padStart() instead',
      alternative: 'Use built-in String.prototype.padStart() method'
    },
    'colors': {
      severity: 'Low',
      reason: 'Package has maintenance issues',
      alternative: 'Use chalk, ansi-colors, or kleur instead'
    },
    'moment': {
      severity: 'Medium',
      reason: 'Package is in maintenance mode',
      alternative: 'Use date-fns, dayjs, or luxon instead'
    },
    'node-uuid': {
      severity: 'Medium',
      reason: 'Package renamed to uuid',
      alternative: 'Use uuid package instead'
    }
  };
};

module.exports = {
  analyzeNode
}; 