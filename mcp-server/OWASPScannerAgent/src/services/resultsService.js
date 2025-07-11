const axios = require('axios');
const logger = require('../utils/logger');
const https = require('https');

// Create an axios instance that ignores SSL certificate errors for local development
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false // Ignore SSL certificate errors for local development
  })
});

/**
 * Submit scan results back to MCP
 * @param {string} scanId - ID of the scan
 * @param {Array} findings - List of findings
 * @param {string} summary - Summary of findings
 * @returns {Promise<Object>} - Response from MCP
 */
const submitResults = async (scanId, findings, summary) => {
  try {
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'https://localhost:44361';
    
    // Map findings to the format expected by MCP
    const mappedFindings = findings.map(finding => ({
      ruleId: finding.ruleId,
      severity: finding.severity,
      filePath: finding.filePath,
      lineNumber: finding.lineNumber,
      description: finding.description,
      codeSnippet: finding.codeSnippet,
      recommendation: finding.recommendation
    }));
    
    // Create the scan result message
    const scanResultMessage = {
      messageType: 'ScanResult',
      timestamp: new Date().toISOString(),
      agentId: global.agentId,
      scanId: scanId,
      findings: mappedFindings,
      summary: summary
    };
    
    // Submit the results
    logger.info(`Submitting ${mappedFindings.length} findings to MCP`);
    const response = await axiosInstance.post(
      `${mcpServerUrl}/api/Scans/results`,
      {
        scanRequestId: scanId,
        agentId: global.agentId,
        findings: mappedFindings,
        summary: summary
      }
    );
    
    // Update scan request status
    await axiosInstance.put(
      `${mcpServerUrl}/api/Scans/requests/${scanId}/status`,
      JSON.stringify('Completed'),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    logger.info(`Scan results submitted successfully for scan ${scanId}`);
    return response.data;
  } catch (error) {
    logger.error(`Error submitting scan results for scan ${scanId}:`, error.message);
    
    // Try to update scan request status to failed
    try {
      const mcpServerUrl = process.env.MCP_SERVER_URL || 'https://localhost:44361';
      await axiosInstance.put(
        `${mcpServerUrl}/api/Scans/requests/${scanId}/status`,
        JSON.stringify('Failed'),
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (statusError) {
      logger.error(`Error updating scan status to failed:`, statusError.message);
    }
    
    throw error;
  }
};

module.exports = {
  submitResults
}; 