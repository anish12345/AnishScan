const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Analyze jQuery code using ESLint with jQuery security plugins
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeJQuery = async (repoPath) => {
  logger.info('Analyzing jQuery code with ESLint');
  const findings = [];
  
  try {
    // Create ESLint config for jQuery security rules
    const configPath = path.join(repoPath, '.eslintrc.json');
    createEslintConfig(configPath);
    
    // Run ESLint
    const { stdout, stderr } = await execPromise(
      `npx eslint --ext .js --format @microsoft/eslint-formatter-sarif -o eslint-results.sarif "**/*.js"`,
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
            ruleId: rule || 'JQUERY-SECURITY',
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
    
    logger.info(`jQuery analysis complete. Found ${findings.length} issues.`);
    return findings;
  } catch (error) {
    logger.error('Error analyzing jQuery code:', error.message);
    return [];
  }
};

/**
 * Create ESLint configuration file for jQuery security rules
 * @param {string} configPath - Path to write the config file
 */
const createEslintConfig = (configPath) => {
  const config = {
    "env": {
      "browser": true,
      "jquery": true,
      "es6": true
    },
    "extends": [
      "eslint:recommended",
      "plugin:security/recommended"
    ],
    "plugins": [
      "jquery",
      "security"
    ],
    "rules": {
      "jquery/no-ajax": "error",
      "jquery/no-ajax-events": "error",
      "jquery/no-animate": "warn",
      "jquery/no-attr": "error",
      "jquery/no-bind": "error",
      "jquery/no-html": "error",
      "jquery/no-parse-html": "error",
      "jquery/no-prop": "warn",
      "jquery/no-text": "warn",
      "jquery/no-val": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "security/detect-object-injection": "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-unsafe-regex": "error"
    }
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

/**
 * Analyze jQuery code using regex patterns
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeWithRegex = async (repoPath) => {
  const findings = [];
  
  // Define regex patterns for common jQuery security issues
  const patterns = [
    {
      name: 'Potential XSS vulnerability with jQuery.html()',
      regex: /\$\([^)]+\)\.html\s*\(/g,
      severity: 'High',
      ruleId: 'JQUERY-XSS-HTML',
      recommendation: 'Avoid using .html() with untrusted data. Use .text() instead or sanitize the HTML content.'
    },
    {
      name: 'Potential XSS vulnerability with jQuery.append()',
      regex: /\$\([^)]+\)\.append\s*\(/g,
      severity: 'High',
      ruleId: 'JQUERY-XSS-APPEND',
      recommendation: 'Avoid using .append() with untrusted data. Use .text() instead or sanitize the content.'
    },
    {
      name: 'Potential XSS vulnerability with jQuery.prepend()',
      regex: /\$\([^)]+\)\.prepend\s*\(/g,
      severity: 'High',
      ruleId: 'JQUERY-XSS-PREPEND',
      recommendation: 'Avoid using .prepend() with untrusted data. Use .text() instead or sanitize the content.'
    },
    {
      name: 'Potential XSS vulnerability with jQuery.after()',
      regex: /\$\([^)]+\)\.after\s*\(/g,
      severity: 'High',
      ruleId: 'JQUERY-XSS-AFTER',
      recommendation: 'Avoid using .after() with untrusted data. Use .text() instead or sanitize the content.'
    },
    {
      name: 'Potential XSS vulnerability with jQuery.before()',
      regex: /\$\([^)]+\)\.before\s*\(/g,
      severity: 'High',
      ruleId: 'JQUERY-XSS-BEFORE',
      recommendation: 'Avoid using .before() with untrusted data. Use .text() instead or sanitize the content.'
    },
    {
      name: 'Potential XSS vulnerability with jQuery.insertAfter()',
      regex: /\$\([^)]+\)\.insertAfter\s*\(/g,
      severity: 'High',
      ruleId: 'JQUERY-XSS-INSERT-AFTER',
      recommendation: 'Avoid using .insertAfter() with untrusted data. Use .text() instead or sanitize the content.'
    },
    {
      name: 'Potential XSS vulnerability with jQuery.insertBefore()',
      regex: /\$\([^)]+\)\.insertBefore\s*\(/g,
      severity: 'High',
      ruleId: 'JQUERY-XSS-INSERT-BEFORE',
      recommendation: 'Avoid using .insertBefore() with untrusted data. Use .text() instead or sanitize the content.'
    },
    {
      name: 'Potential XSS vulnerability with jQuery.parseHTML()',
      regex: /\$\.parseHTML\s*\(/g,
      severity: 'Critical',
      ruleId: 'JQUERY-XSS-PARSE-HTML',
      recommendation: 'Avoid using $.parseHTML() with untrusted data as it can lead to XSS vulnerabilities.'
    },
    {
      name: 'Potential XSS vulnerability with jQuery selector',
      regex: /\$\(\s*(?:"|')(?:<[^>]+>)(?:"|')\s*\)/g,
      severity: 'Critical',
      ruleId: 'JQUERY-XSS-SELECTOR',
      recommendation: 'Avoid using HTML in jQuery selectors as it can lead to XSS vulnerabilities.'
    },
    {
      name: 'Potential CSRF vulnerability with jQuery AJAX',
      regex: /\$\.ajax\s*\(/g,
      missingRegex: /headers\s*:\s*{[^}]*['"]X-CSRF-Token['"][^}]*}/,
      severity: 'High',
      ruleId: 'JQUERY-CSRF',
      recommendation: 'Include CSRF tokens in AJAX requests to prevent CSRF attacks.'
    },
    {
      name: 'Use of eval() with jQuery',
      regex: /\$\([^)]+\)\.(?:attr|prop)\s*\(\s*(?:"|')(?:on\w+)(?:"|')\s*,/g,
      severity: 'Critical',
      ruleId: 'JQUERY-EVAL',
      recommendation: 'Avoid setting event handler attributes directly as they can lead to code injection vulnerabilities.'
    },
    {
      name: 'Insecure use of jQuery.getScript()',
      regex: /\$\.getScript\s*\(/g,
      severity: 'High',
      ruleId: 'JQUERY-GETSCRIPT',
      recommendation: 'Avoid using $.getScript() with untrusted URLs as it can lead to code injection vulnerabilities.'
    },
    {
      name: 'Insecure use of jQuery.globalEval()',
      regex: /\$\.globalEval\s*\(/g,
      severity: 'Critical',
      ruleId: 'JQUERY-GLOBALEVAL',
      recommendation: 'Never use $.globalEval() as it can lead to code injection vulnerabilities.'
    }
  ];
  
  // Find all jQuery files
  const jqueryFiles = findJQueryFiles(repoPath);
  
  // Check each file against each pattern
  for (const file of jqueryFiles) {
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
            
            // Check if the missing pattern is nearby (within 10 lines)
            const startLine = Math.max(0, lineNumber - 10);
            const endLine = Math.min(lines.length, lineNumber + 10);
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
 * Find all jQuery files in the repository
 * @param {string} repoPath - Path to the repository
 * @returns {Array<string>} - List of jQuery file paths
 */
const findJQueryFiles = (repoPath) => {
  const results = [];
  
  const walk = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
        walk(filePath);
      } else if (stat.isFile() && file.endsWith('.js')) {
        // Check if the file uses jQuery
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('$') || content.includes('jQuery')) {
            results.push(filePath);
          }
        } catch (error) {
          logger.error(`Error reading file ${filePath}:`, error.message);
        }
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
    'jquery/no-ajax': 'Use fetch API or Axios instead of jQuery.ajax() for better security and modern practices.',
    'jquery/no-ajax-events': 'Avoid using jQuery AJAX event handlers as they can lead to security issues.',
    'jquery/no-animate': 'Consider using CSS animations instead of jQuery.animate() for better performance.',
    'jquery/no-attr': 'Use .prop() instead of .attr() for boolean attributes.',
    'jquery/no-bind': 'Use .on() instead of .bind() for event handling.',
    'jquery/no-html': 'Avoid using .html() with untrusted data to prevent XSS vulnerabilities.',
    'jquery/no-parse-html': 'Avoid using $.parseHTML() with untrusted data to prevent XSS vulnerabilities.',
    'jquery/no-prop': 'Be careful when using .prop() with untrusted data.',
    'jquery/no-text': 'Be careful when using .text() with untrusted data.',
    'jquery/no-val': 'Be careful when using .val() with untrusted data.',
    'no-eval': 'Avoid using eval() as it can lead to code injection vulnerabilities.',
    'no-implied-eval': 'Avoid using functions that implicitly call eval() like setTimeout() with string arguments.',
    'security/detect-object-injection': 'Use a whitelist of allowed properties or validate user input before using it as an object property name.',
    'security/detect-non-literal-fs-filename': 'Validate and sanitize file paths before using them with file system operations.',
    'security/detect-non-literal-require': 'Avoid using dynamic requires as they can lead to code injection vulnerabilities.',
    'security/detect-possible-timing-attacks': 'Use constant-time comparison functions for sensitive operations like password verification.',
    'security/detect-eval-with-expression': 'Avoid using eval() with dynamic expressions as it can lead to code injection vulnerabilities.',
    'security/detect-unsafe-regex': 'Avoid using regular expressions that can cause ReDoS (Regular Expression Denial of Service) attacks.'
  };
  
  return recommendations[ruleId] || 'Review the code for security issues.';
};

module.exports = {
  analyzeJQuery
}; 