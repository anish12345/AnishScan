const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Check if semgrep is available
 * @returns {Promise<boolean>} - True if semgrep is available
 */
const isSemgrepAvailable = async () => {
  try {
    await execPromise('semgrep --version');
    return true;
  } catch (error) {
    logger.warn('Semgrep is not available. Will use regex-based scanning only.');
    console.warn('WARNING: semgrep is not installed or not in PATH');
    console.warn('C# scanning will use regex-based patterns only');
    return false;
  }
};

/**
 * Analyze C# code using Semgrep and/or regex patterns
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeCSharp = async (repoPath) => {
  logger.info('Analyzing C# code');
  const findings = [];
  
  try {
    // Check if semgrep is available
    const semgrepAvailable = await isSemgrepAvailable();
    
    if (semgrepAvailable) {
      logger.info('Using Semgrep for C# analysis');
      
      // Create semgrep config for C# security rules
      const configPath = path.join(repoPath, 'semgrep-csharp-config.yml');
      createSemgrepConfig(configPath);
      
      try {
        // Run semgrep
        const { stdout, stderr } = await execPromise(
          `semgrep --config ${configPath} --json --output=semgrep-results.json ${repoPath}`,
          { cwd: repoPath, maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
        );
        
        // Parse results
        const resultsPath = path.join(repoPath, 'semgrep-results.json');
        if (fs.existsSync(resultsPath)) {
          const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
          
          // Map semgrep results to our findings format
          if (results.results) {
            for (const result of results.results) {
              const filePath = path.relative(repoPath, result.path);
              const lineNumber = result.start.line;
              
              // Read the code snippet
              let codeSnippet = '';
              try {
                const fileContent = fs.readFileSync(result.path, 'utf8');
                const lines = fileContent.split('\n');
                const startLine = Math.max(0, lineNumber - 3);
                const endLine = Math.min(lines.length, lineNumber + 2);
                codeSnippet = lines.slice(startLine, endLine).join('\n');
              } catch (error) {
                logger.error(`Error reading code snippet from ${result.path}:`, error.message);
              }
              
              findings.push({
                ruleId: result.check_id || 'SEMGREP-CSHARP',
                severity: mapSeverity(result.extra.severity),
                filePath,
                lineNumber,
                description: result.extra.message,
                codeSnippet,
                recommendation: result.extra.metadata?.recommendation || 'Review the code for security issues.',
                scanner: 'csharp'
              });
            }
          }
          
          // Clean up
          try {
            fs.unlinkSync(resultsPath);
            fs.unlinkSync(configPath);
          } catch (error) {
            logger.error('Error cleaning up semgrep files:', error.message);
          }
        }
      } catch (error) {
        logger.error('Error running semgrep:', error.message);
        console.error('Error running semgrep. Falling back to regex-based scanning only.');
      }
    }
    
    // Add regex-based findings
    logger.info('Using regex patterns for C# analysis');
    const regexFindings = await analyzeWithRegex(repoPath);
    findings.push(...regexFindings);
    
    logger.info(`C# analysis complete. Found ${findings.length} issues.`);
    return findings;
  } catch (error) {
    logger.error('Error analyzing C# code:', error.message);
    return [];
  }
};

/**
 * Create Semgrep configuration file for C# security rules
 * @param {string} configPath - Path to write the config file
 */
const createSemgrepConfig = (configPath) => {
  const config = `
rules:
  - id: csharp-sql-injection
    pattern: $CMD.CommandText = "SELECT * FROM $TABLE WHERE $COLUMN = '" + $VAR + "'";
    message: Potential SQL injection vulnerability
    languages: [csharp]
    severity: ERROR
    metadata:
      category: security
      owasp: A1:2017 - Injection
      recommendation: Use parameterized queries with SqlParameter objects.

  - id: csharp-xss
    pattern: Response.Write($VAR);
    message: Potential XSS vulnerability
    languages: [csharp]
    severity: ERROR
    metadata:
      category: security
      owasp: A7:2017 - Cross-Site Scripting (XSS)
      recommendation: Use HTML encoding before writing user input to the response.

  - id: csharp-hardcoded-credentials
    patterns:
      - pattern-either:
          - pattern: "password = \"$PASSWORD\""
          - pattern: "Password = \"$PASSWORD\""
          - pattern: "pwd = \"$PASSWORD\""
          - pattern: "connectionString = \"$CONN_STR\""
    message: Hardcoded credentials detected
    languages: [csharp]
    severity: ERROR
    metadata:
      category: security
      owasp: A2:2017 - Broken Authentication
      recommendation: Store credentials in secure configuration or use a secret manager.

  - id: csharp-insecure-deserialization
    patterns:
      - pattern-either:
          - pattern: BinaryFormatter.Deserialize($STREAM)
          - pattern: JsonConvert.DeserializeObject<$T>($JSON, new JsonSerializerSettings { TypeNameHandling = TypeNameHandling.All })
    message: Insecure deserialization detected
    languages: [csharp]
    severity: ERROR
    metadata:
      category: security
      owasp: A8:2017 - Insecure Deserialization
      recommendation: Avoid using BinaryFormatter or JsonConvert with TypeNameHandling.All.

  - id: csharp-path-traversal
    patterns:
      - pattern-either:
          - pattern: File.ReadAllText(Path.Combine($DIR, $VAR))
          - pattern: File.WriteAllText(Path.Combine($DIR, $VAR), $CONTENT)
          - pattern: new FileStream(Path.Combine($DIR, $VAR), $MODE)
    message: Potential path traversal vulnerability
    languages: [csharp]
    severity: WARNING
    metadata:
      category: security
      owasp: A5:2017 - Broken Access Control
      recommendation: Validate and sanitize file paths before using them.

  - id: csharp-weak-crypto
    patterns:
      - pattern-either:
          - pattern: new MD5CryptoServiceProvider()
          - pattern: new SHA1CryptoServiceProvider()
          - pattern: new DESCryptoServiceProvider()
    message: Weak cryptographic algorithm detected
    languages: [csharp]
    severity: WARNING
    metadata:
      category: security
      owasp: A3:2017 - Sensitive Data Exposure
      recommendation: Use stronger cryptographic algorithms like SHA-256 or AES.

  - id: csharp-insecure-cookie
    pattern: new HttpCookie($NAME, $VALUE) { ... }
    message: Insecure cookie configuration
    languages: [csharp]
    severity: WARNING
    metadata:
      category: security
      owasp: A2:2017 - Broken Authentication
      recommendation: Set Secure and HttpOnly flags on cookies.

  - id: csharp-open-redirect
    pattern: Response.Redirect($VAR);
    message: Potential open redirect vulnerability
    languages: [csharp]
    severity: WARNING
    metadata:
      category: security
      owasp: A5:2017 - Broken Access Control
      recommendation: Validate and sanitize URLs before redirecting.
`;

  fs.writeFileSync(configPath, config);
};

/**
 * Analyze C# code using regex patterns
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array>} - List of findings
 */
const analyzeWithRegex = async (repoPath) => {
  const findings = [];
  
  // Define regex patterns for common C# security issues
  const patterns = [
    {
      name: 'Potential CSRF vulnerability',
      regex: /\[ValidateAntiForgeryToken\]/g,
      inverse: true,
      severity: 'High',
      ruleId: 'CSHARP-CSRF',
      recommendation: 'Add [ValidateAntiForgeryToken] attribute to POST actions.'
    },
    {
      name: 'Debug mode enabled in production',
      regex: /compilation\s+debug\s*=\s*["']true["']/gi,
      severity: 'Medium',
      ruleId: 'CSHARP-DEBUG-MODE',
      recommendation: 'Disable debug mode in production environments.'
    },
    {
      name: 'Potential LDAP injection',
      regex: /new\s+DirectorySearcher\s*\(\s*["'].*?\s*\+\s*.*?\s*\+\s*["']/g,
      severity: 'High',
      ruleId: 'CSHARP-LDAP-INJECTION',
      recommendation: 'Sanitize user input before using it in LDAP queries.'
    },
    {
      name: 'Potential command injection',
      regex: /Process\.Start\s*\(\s*.*?\s*\+\s*.*?\s*\)/g,
      severity: 'Critical',
      ruleId: 'CSHARP-COMMAND-INJECTION',
      recommendation: 'Avoid using user input in command execution.'
    }
  ];
  
  // Find all C# files
  const csharpFiles = findCSharpFiles(repoPath);
  
  // Check each file against each pattern
  for (const file of csharpFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      for (const pattern of patterns) {
        let matches;
        if (pattern.inverse) {
          // For inverse patterns, check if the pattern is missing
          if (file.endsWith('Controller.cs') && !content.match(pattern.regex)) {
            // Add finding for controllers without CSRF protection
            findings.push({
              ruleId: pattern.ruleId,
              severity: pattern.severity,
              filePath: path.relative(repoPath, file),
              lineNumber: 1,
              description: pattern.name,
              codeSnippet: lines.slice(0, Math.min(5, lines.length)).join('\n'),
              recommendation: pattern.recommendation,
              scanner: 'csharp'
            });
          }
        } else {
          // For regular patterns, find all matches
          const regex = new RegExp(pattern.regex);
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
              recommendation: pattern.recommendation,
              scanner: 'csharp'
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Error analyzing file ${file}:`, error.message);
    }
  }
  
  return findings;
};

/**
 * Find all C# files in the repository
 * @param {string} repoPath - Path to the repository
 * @returns {Array<string>} - List of C# file paths
 */
const findCSharpFiles = (repoPath) => {
  const results = [];
  
  const walk = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
        walk(filePath);
      } else if (stat.isFile() && file.endsWith('.cs')) {
        results.push(filePath);
      }
    }
  };
  
  walk(repoPath);
  return results;
};

/**
 * Map semgrep severity to our severity levels
 * @param {string} semgrepSeverity - Severity from semgrep
 * @returns {string} - Mapped severity
 */
const mapSeverity = (semgrepSeverity) => {
  switch (semgrepSeverity?.toLowerCase()) {
    case 'error':
      return 'Critical';
    case 'warning':
      return 'High';
    case 'info':
      return 'Medium';
    default:
      return 'Low';
  }
};

module.exports = {
  analyzeCSharp
}; 