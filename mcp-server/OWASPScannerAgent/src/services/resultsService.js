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
 * Submit findings in batches to handle large datasets
 * @param {string} scanId - ID of the scan
 * @param {Array} findings - List of findings to submit
 * @param {number} batchSize - Number of findings per batch
 * @returns {Promise<boolean>} - True if all batches submitted successfully
 */
const submitFindingsBatch = async (scanId, findings, batchSize = 50) => {
  const mcpServerUrl = process.env.MCP_SERVER_URL || 'https://localhost:44361';
  let successfulBatches = 0;
  let totalBatches = Math.ceil(findings.length / batchSize);
  
  logger.info(`Submitting ${findings.length} findings in ${totalBatches} batches of ${batchSize}`);
  
  for (let i = 0; i < findings.length; i += batchSize) {
    const batch = findings.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    try {
      logger.info(`Submitting batch ${batchNumber}/${totalBatches} (${batch.length} findings)`);
      
      await axiosInstance.post(
        `${mcpServerUrl}/api/Scans/results`,
        {
          scanRequestId: scanId,
          agentId: global.agentId,
          findings: batch,
          summary: `Batch ${batchNumber}/${totalBatches}`,
          isBatch: true,
          batchInfo: {
            batchNumber: batchNumber,
            totalBatches: totalBatches,
            batchSize: batch.length
          }
        }
      );
      
      successfulBatches++;
      logger.info(`✅ Batch ${batchNumber}/${totalBatches} submitted successfully`);
      
      // Small delay between batches to avoid overwhelming the server
      if (batchNumber < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    } catch (error) {
      logger.error(`❌ Error submitting batch ${batchNumber}/${totalBatches}:`, error.message);
      // Continue with next batch rather than failing completely
    }
  }
  
  logger.info(`Batch submission complete: ${successfulBatches}/${totalBatches} batches successful`);
  return successfulBatches === totalBatches;
};

/**
 * Submit scan results back to MCP with batching for large datasets
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
      recommendation: finding.recommendation,
      scanner: finding.scanner || 'unknown'
    }));
    
    logger.info(`Preparing to submit ${mappedFindings.length} findings to MCP`);
    
    // Prioritize C# findings first as requested
    const csharpFindings = mappedFindings.filter(f => 
      f.scanner === 'csharp' || 
      f.ruleId?.includes('csharp') || 
      f.filePath?.endsWith('.cs') ||
      f.ruleId?.includes('CSHARP')
    );
    
    const otherFindings = mappedFindings.filter(f => 
      !csharpFindings.includes(f)
    );
    
    logger.info(`Found ${csharpFindings.length} C# findings and ${otherFindings.length} other findings`);
    
    // Submit findings in batches, C# first
    let allSubmitted = true;
    
    if (csharpFindings.length > 0) {
      logger.info(`=== Submitting C# findings first ===`);
      const csharpSuccess = await submitFindingsBatch(scanId, csharpFindings, 25);
      if (!csharpSuccess) {
        logger.warn('Some C# finding batches failed to submit');
        allSubmitted = false;
      }
    }
    
    if (otherFindings.length > 0) {
      logger.info(`=== Submitting other findings ===`);
      const otherSuccess = await submitFindingsBatch(scanId, otherFindings, 50);
      if (!otherSuccess) {
        logger.warn('Some other finding batches failed to submit');
        allSubmitted = false;
      }
    }
    
    // Submit summary
    try {
      logger.info(`=== Submitting final summary ===`);
      await axiosInstance.post(
        `${mcpServerUrl}/api/Scans/results`,
        {
          scanRequestId: scanId,
          agentId: global.agentId,
          findings: [], // Empty findings array for summary
          summary: summary,
          isFinalSummary: true,
          totalFindings: mappedFindings.length,
          csharpFindings: csharpFindings.length,
          otherFindings: otherFindings.length
        }
      );
      logger.info(`✅ Final summary submitted`);
    } catch (summaryError) {
      logger.error(`Error submitting summary:`, summaryError.message);
      allSubmitted = false;
    }
    
    // Update scan request status based on submission success
    const finalStatus = allSubmitted ? 'Completed' : 'CompletedWithErrors';
    
    await axiosInstance.put(
      `${mcpServerUrl}/api/Scans/requests/${scanId}/status`,
      JSON.stringify(finalStatus),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    logger.info(`Scan results submission finished with status: ${finalStatus}`);
    return { success: allSubmitted, status: finalStatus };
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