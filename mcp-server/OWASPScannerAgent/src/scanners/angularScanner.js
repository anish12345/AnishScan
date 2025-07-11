const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Analyze Angular code using ESLint with Angular security plugins
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeAngular = async (repoPath) => {
  logger.info('Analyzing Angular code with ESLint');
  const findings = [];
  
  try {
    // Create ESLint config for Angular security rules
    const configPath = path.join(repoPath, '.eslintrc.json');
    createEslintConfig(configPath);
    
    // Run ESLint
    const { stdout, stderr } = await execPromise(
      `npx eslint --ext .ts,.html --format @microsoft/eslint-formatter-sarif -o eslint-results.sarif "**/*.ts" "**/*.html"`,
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
            ruleId: rule || 'ANGULAR-SECURITY',
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
    
    // Add regex-based findings
    const regexFindings = await analyzeWithRegex(repoPath);
    findings.push(...regexFindings);
    
    logger.info(`Angular analysis complete. Found ${findings.length} issues.`);
    return findings;
  } catch (error) {
    logger.error('Error analyzing Angular code:', error.message);
    return [];
  }
};

/**
 * Create ESLint configuration file for Angular security rules
 * @param {string} configPath - Path to write the config file
 */
const createEslintConfig = (configPath) => {
  const config = {
    "root": true,
    "overrides": [
      {
        "files": ["*.ts"],
        "parserOptions": {
          "project": ["tsconfig.json"],
          "createDefaultProgram": true
        },
        "extends": [
          "plugin:@angular-eslint/recommended",
          "plugin:@angular-eslint/template/process-inline-templates",
          "plugin:security/recommended"
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
          "security/detect-sql-literal-injection": "error",
          "@angular-eslint/template/no-any": "error",
          "@angular-eslint/template/no-negated-async": "error"
        }
      },
      {
        "files": ["*.html"],
        "extends": [
          "plugin:@angular-eslint/template/recommended"
        ],
        "rules": {
          "@angular-eslint/template/no-negated-async": "error"
        }
      }
    ]
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

/**
 * Analyze Angular code using regex patterns
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeWithRegex = async (repoPath) => {
  const findings = [];
  
  // Define regex patterns for common Angular security issues
  const patterns = [
    {
      name: 'Potential XSS vulnerability in template',
      regex: /\[innerHTML\]="([^"]*)"/g,
      severity: 'High',
      ruleId: 'ANGULAR-XSS',
      recommendation: 'Use Angular DomSanitizer to sanitize HTML content before binding to innerHTML.'
    },
    {
      name: 'Use of bypassSecurityTrustHtml without proper validation',
      regex: /bypassSecurityTrustHtml\s*\(/g,
      severity: 'Critical',
      ruleId: 'ANGULAR-BYPASS-SECURITY',
      recommendation: 'Avoid using bypassSecurityTrustHtml. If necessary, validate and sanitize content before bypassing security.'
    },
    {
      name: 'Use of bypassSecurityTrustScript',
      regex: /bypassSecurityTrustScript\s*\(/g,
      severity: 'Critical',
      ruleId: 'ANGULAR-BYPASS-SECURITY-SCRIPT',
      recommendation: 'Never use bypassSecurityTrustScript as it can lead to XSS vulnerabilities.'
    },
    {
      name: 'Use of bypassSecurityTrustUrl without validation',
      regex: /bypassSecurityTrustUrl\s*\(/g,
      severity: 'High',
      ruleId: 'ANGULAR-BYPASS-SECURITY-URL',
      recommendation: 'Validate URLs before using bypassSecurityTrustUrl to prevent open redirect vulnerabilities.'
    },
    {
      name: 'Use of bypassSecurityTrustResourceUrl without validation',
      regex: /bypassSecurityTrustResourceUrl\s*\(/g,
      severity: 'High',
      ruleId: 'ANGULAR-BYPASS-SECURITY-RESOURCE',
      recommendation: 'Validate resource URLs before using bypassSecurityTrustResourceUrl.'
    },
    {
      name: 'Use of eval() in Angular component',
      regex: /eval\s*\(/g,
      severity: 'Critical',
      ruleId: 'ANGULAR-EVAL',
      recommendation: 'Never use eval() in Angular applications as it can lead to code injection vulnerabilities.'
    },
    {
      name: 'Missing XSRF/CSRF protection',
      regex: /withCredentials:\s*true/g,
      fileNameRegex: /http.*\.service\.ts$/,
      missingRegex: /XSRF-TOKEN|X-XSRF-TOKEN/,
      severity: 'High',
      ruleId: 'ANGULAR-CSRF',
      recommendation: 'Enable CSRF protection by using HttpClientXsrfModule or manually adding XSRF tokens to requests.'
    }
  ];
  
  // Find all Angular files
  const angularFiles = findAngularFiles(repoPath);
  
  // Check each file against each pattern
  for (const file of angularFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      for (const pattern of patterns) {
        // Skip if pattern is only for specific files and this file doesn't match
        if (pattern.fileNameRegex && !file.match(pattern.fileNameRegex)) {
          continue;
        }
        
        // Check for missing patterns
        if (pattern.missingRegex && pattern.fileNameRegex && file.match(pattern.fileNameRegex)) {
          if (content.match(pattern.regex) && !content.match(pattern.missingRegex)) {
            findings.push({
              ruleId: pattern.ruleId,
              severity: pattern.severity,
              filePath: path.relative(repoPath, file),
              lineNumber: 1,
              description: pattern.name,
              codeSnippet: lines.slice(0, Math.min(5, lines.length)).join('\n'),
              recommendation: pattern.recommendation
            });
          }
          continue;
        }
        
        // Check for regular patterns
        const regex = new RegExp(pattern.regex);
        let matches;
        while ((matches = regex.exec(content)) !== null) {
          // Find the line number of the match
          const matchPosition = matches.index;
          let lineNumber = 1;
          let position = 0;
          
          for (let i = 0; i < lines.length; i++) {
            if (position + lines[i].length >= matchPosition) {
              lineNumber = i + 1;
              break;
            }
            position += lines[i].length + 1; // +1 for newline
          }
          
          // Extract code snippet around the match
          const startLine = Math.max(0, lineNumber - 3);
          const endLine = Math.min(lines.length, lineNumber + 2);
          const codeSnippet = lines.slice(startLine, endLine).join('\n');
          
          findings.push({
            ruleId: pattern.ruleId,
            severity: pattern.severity,
            filePath: path.relative(repoPath, file),
            lineNumber,
            description: pattern.name,
            codeSnippet,
            recommendation: pattern.recommendation
          });
        }
      }
    } catch (error) {
      logger.error(`Error analyzing file ${file}:`, error.message);
    }
  }
  
  return findings;
};

/**
 * Find all Angular files in the repository
 * @param {string} repoPath - Path to the repository
 * @returns {Array<string>} - List of Angular file paths
 */
const findAngularFiles = (repoPath) => {
  const results = [];
  
  const walk = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
        walk(filePath);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.html'))) {
        results.push(filePath);
      }
    }
  };
  
  walk(repoPath);
  return results;
};

/**
 * Map ESLint severity to our severity levels
 * @param {string} eslintSeverity - Severity from ESLint
 * @returns {string} - Mapped severity
 */
const mapSeverity = (eslintSeverity) => {
  switch (eslintSeverity) {
    case 'error':
      return 'High';
    case 'warning':
      return 'Medium';
    default:
      return 'Low';
  }
};

/**
 * Get recommendation based on rule ID
 * @param {string} ruleId - ESLint rule ID
 * @returns {string} - Recommendation
 */
const getRecommendation = (ruleId) => {
  const recommendations = {
    'no-eval': 'Avoid using eval() as it can lead to code injection vulnerabilities.',
    'no-implied-eval': 'Avoid using functions that implicitly call eval() like setTimeout() with string arguments.',
    'security/detect-object-injection': 'Use a whitelist of allowed properties or validate user input before using it as an object property name.',
    'security/detect-non-literal-fs-filename': 'Validate and sanitize file paths before using them with file system operations.',
    'security/detect-non-literal-require': 'Avoid using dynamic requires as they can lead to code injection vulnerabilities.',
    'security/detect-possible-timing-attacks': 'Use constant-time comparison functions for sensitive operations like password verification.',
    'security/detect-eval-with-expression': 'Avoid using eval() with dynamic expressions as it can lead to code injection vulnerabilities.',
    'security/detect-unsafe-regex': 'Avoid using regular expressions that can cause ReDoS (Regular Expression Denial of Service) attacks.',
    'security/detect-buffer-noassert': 'Always use the assert option when reading from or writing to buffers.',
    'security/detect-child-process': 'Validate and sanitize user input before using it with child_process methods.',
    'security/detect-disable-mustache-escape': 'Do not disable HTML escaping in templates as it can lead to XSS vulnerabilities.',
    'security/detect-new-buffer': 'Use Buffer.from(), Buffer.alloc(), and Buffer.allocUnsafe() instead of new Buffer().',
    'security/detect-no-csrf-before-method-override': 'Place CSRF protection middleware before method-override middleware.',
    'security/detect-pseudo-random-bytes': 'Use crypto.randomBytes() instead of crypto.pseudoRandomBytes().',
    'security/detect-sql-literal-injection': 'Use parameterized queries or prepared statements instead of concatenating SQL strings.',
    '@angular-eslint/template/no-any': 'Avoid using the any type in Angular templates as it bypasses type checking.',
    '@angular-eslint/template/no-negated-async': 'Avoid using the negation operator (!) with async pipes as it can lead to unexpected behavior.'
  };
  
  return recommendations[ruleId] || 'Review the code for security issues.';
};

module.exports = {
  analyzeAngular
}; 