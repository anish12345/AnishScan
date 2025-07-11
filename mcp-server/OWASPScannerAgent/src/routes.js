const { handleScanRequest } = require('./controllers/scanController');
const logger = require('./utils/logger');

/**
 * Setup all routes for the agent
 * @param {Express} app - Express application
 */
const setupRoutes = (app) => {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Endpoint to receive scan requests from MCP
  app.post('/api/scan', async (req, res) => {
    try {
      logger.info('Received scan request');
      
      // Validate the request
      const { scanId, repositoryUrl, branch } = req.body;
      
      if (!scanId || !repositoryUrl) {
        logger.error('Invalid scan request: Missing required fields');
        return res.status(400).json({ 
          error: 'Missing required fields: scanId and repositoryUrl are required' 
        });
      }

      // Process the scan request asynchronously
      handleScanRequest(req.body)
        .then(() => logger.info(`Scan ${scanId} completed successfully`))
        .catch(error => logger.error(`Scan ${scanId} failed:`, error.message));

      // Respond immediately to MCP that we've accepted the request
      res.status(202).json({ 
        message: 'Scan request accepted', 
        scanId 
      });
    } catch (error) {
      logger.error('Error processing scan request:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 404 handler
  app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
};

module.exports = { setupRoutes }; 