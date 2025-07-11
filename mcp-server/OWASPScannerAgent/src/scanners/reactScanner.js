const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Analyze React code using ESLint with React security plugins
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeReact = async (repoPath) => {
  logger.info('Analyzing React code with ESLint');
  const findings = [];
  
  try {
    // Create ESLint config for React security rules
    const configPath = path.join(repoPath, '.eslintrc.json');
    createEslintConfig(configPath);
    
    // Run ESLint
    const { stdout, stderr } = await execPromise(
      `npx eslint --ext .js,.jsx,.ts,.tsx --format @microsoft/eslint-formatter-sarif -o eslint-results.sarif "**/*.js" "**/*.jsx" "**/*.ts" "**/*.tsx"`,
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
            ruleId: rule || 'REACT-SECURITY',
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
    
    logger.info(`React analysis complete. Found ${findings.length} issues.`);
    return findings;
  } catch (error) {
    logger.error('Error analyzing React code:', error.message);
    return [];
  }
};

/**
 * Create ESLint configuration file for React security rules
 * @param {string} configPath - Path to write the config file
 */
const createEslintConfig = (configPath) => {
  const config = {
    "env": {
      "browser": true,
      "es2021": true,
      "node": true
    },
    "extends": [
      "eslint:recommended",
      "plugin:react/recommended",
      "plugin:security/recommended"
    ],
    "parserOptions": {
      "ecmaFeatures": {
        "jsx": true
      },
      "ecmaVersion": 12,
      "sourceType": "module"
    },
    "plugins": [
      "react",
      "security"
    ],
    "rules": {
      "react/no-danger": "error",
      "react/jsx-no-script-url": "error",
      "react/jsx-no-target-blank": "error",
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
    "settings": {
      "react": {
        "version": "detect"
      }
    },
    "overrides": [
      {
        "files": ["*.ts", "*.tsx"],
        "parser": "@typescript-eslint/parser",
        "plugins": ["@typescript-eslint"],
        "extends": ["plugin:@typescript-eslint/recommended"]
      }
    ]
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

/**
 * Analyze React code using regex patterns
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeWithRegex = async (repoPath) => {
  const findings = [];
  
  // Define regex patterns for common React security issues
  const patterns = [
    {
      name: 'Potential XSS vulnerability with dangerouslySetInnerHTML',
      regex: /dangerouslySetInnerHTML\s*=\s*{\s*{\s*__html\s*:\s*([^}]+)\s*}\s*}/g,
      severity: 'High',
      ruleId: 'REACT-XSS',
      recommendation: 'Avoid using dangerouslySetInnerHTML. If necessary, sanitize HTML content before using it.'
    },
    {
      name: 'Use of eval() in React component',
      regex: /eval\s*\(/g,
      severity: 'Critical',
      ruleId: 'REACT-EVAL',
      recommendation: 'Never use eval() in React applications as it can lead to code injection vulnerabilities.'
    },
    {
      name: 'Use of Function constructor as eval alternative',
      regex: /new\s+Function\s*\(/g,
      severity: 'Critical',
      ruleId: 'REACT-FUNCTION-CONSTRUCTOR',
      recommendation: 'Avoid using the Function constructor as it can lead to code injection vulnerabilities similar to eval().'
    },
    {
      name: 'Unsafe href with javascript: protocol',
      regex: /href\s*=\s*["']javascript:/g,
      severity: 'High',
      ruleId: 'REACT-UNSAFE-HREF',
      recommendation: 'Never use javascript: URLs as they can lead to XSS vulnerabilities.'
    },
    {
      name: 'Missing rel="noreferrer" with target="_blank"',
      regex: /target\s*=\s*["']_blank["']/g,
      missingRegex: /rel\s*=\s*["'][^"']*noreferrer[^"']*["']/,
      severity: 'Medium',
      ruleId: 'REACT-TARGET-BLANK',
      recommendation: 'Always use rel="noreferrer noopener" with target="_blank" to prevent reverse tabnabbing attacks.'
    },
    {
      name: 'Potential DOM-based XSS with document.write',
      regex: /document\.write\s*\(/g,
      severity: 'Critical',
      ruleId: 'REACT-DOCUMENT-WRITE',
      recommendation: 'Never use document.write() in React applications as it can lead to XSS vulnerabilities.'
    },
    {
      name: 'Potential DOM-based XSS with innerHTML',
      regex: /\.innerHTML\s*=/g,
      severity: 'High',
      ruleId: 'REACT-INNERHTML',
      recommendation: 'Avoid direct DOM manipulation with innerHTML. Use React\'s virtual DOM instead.'
    },
    {
      name: 'Insecure use of localStorage with sensitive data',
      regex: /localStorage\.setItem\s*\(\s*["'](?:token|password|auth|jwt|secret|key)["']/gi,
      severity: 'Medium',
      ruleId: 'REACT-LOCALSTORAGE',
      recommendation: 'Avoid storing sensitive data like tokens or passwords in localStorage as it is accessible to any script on the page.'
    }
  ];
  
  // Find all React files
  const reactFiles = findReactFiles(repoPath);
  
  // Check each file against each pattern
  for (const file of reactFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      for (const pattern of patterns) {
        // Check for missing patterns
        if (pattern.missingRegex) {
          const mainRegex = new RegExp(pattern.regex);
          const missingRegex = new RegExp(pattern.missingRegex);
          
          let mainMatch;
          while ((mainMatch = mainRegex.exec(content)) !== null) {
            // Find the line number of the match
            const matchPosition = mainMatch.index;
            let lineNumber = 1;
            let position = 0;
            
            for (let i = 0; i < lines.length; i++) {
              if (position + lines[i].length >= matchPosition) {
                lineNumber = i + 1;
                break;
              }
              position += lines[i].length + 1; // +1 for newline
            }
            
            // Check if the missing pattern is nearby (within 3 lines)
            const startLine = Math.max(0, lineNumber - 3);
            const endLine = Math.min(lines.length, lineNumber + 3);
            const contextLines = lines.slice(startLine, endLine).join('\n');
            
            if (!missingRegex.test(contextLines)) {
              // Extract code snippet around the match
              const snippetStartLine = Math.max(0, lineNumber - 3);
              const snippetEndLine = Math.min(lines.length, lineNumber + 2);
              const codeSnippet = lines.slice(snippetStartLine, snippetEndLine).join('\n');
              
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
 * Find all React files in the repository
 * @param {string} repoPath - Path to the repository
 * @returns {Array<string>} - List of React file paths
 */
const findReactFiles = (repoPath) => {
  const results = [];
  
  const walk = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
        walk(filePath);
      } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
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
    'react/no-danger': 'Avoid using dangerouslySetInnerHTML as it can lead to XSS vulnerabilities.',
    'react/jsx-no-script-url': 'Avoid using javascript: URLs as they can lead to XSS vulnerabilities.',
    'react/jsx-no-target-blank': 'Use rel="noreferrer noopener" with target="_blank" to prevent reverse tabnabbing attacks.',
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
    'security/detect-sql-literal-injection': 'Use parameterized queries or prepared statements instead of concatenating SQL strings.'
  };
  
  return recommendations[ruleId] || 'Review the code for security issues.';
};

module.exports = {
  analyzeReact
}; 