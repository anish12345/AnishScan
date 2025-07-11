require('dotenv').config();
const express = require('express');
const { registerAgent } = require('./services/registrationService');
const { startPolling } = require('./services/pollService');
const { setupRoutes } = require('./routes');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

// Display startup information
console.log('==== OWASP Scanner Agent Starting ====');
console.log(`Node.js version: ${process.version}`);
console.log(`Working directory: ${process.cwd()}`);
console.log('Environment variables:');
console.log(`- MCP_SERVER_URL: ${process.env.MCP_SERVER_URL || '(not set)'}`);
console.log(`- AGENT_PORT: ${process.env.AGENT_PORT || '3000 (default)'}`);
console.log(`- AGENT_NAME: ${process.env.AGENT_NAME || '(not set)'}`);
console.log(`- TEMP_DIR: ${process.env.TEMP_DIR || '(not set)'}`);
console.log(`- LOG_LEVEL: ${process.env.LOG_LEVEL || '(not set)'}`);
console.log(`- NODE_TLS_REJECT_UNAUTHORIZED: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED || '(not set)'}`);

// Disable SSL certificate validation for local development
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  console.log('WARNING: SSL certificate validation is disabled. This should only be used in development.');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Create Express app
const app = express();
const port = process.env.AGENT_PORT || 3000;

// Middleware
app.use(express.json());

// Add error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

try {
  // Setup routes
  setupRoutes(app);
  
  // Start the server
  const server = app.listen(port, async () => {
    logger.info(`OWASP Scanner Agent listening on port ${port}`);
    console.log(`OWASP Scanner Agent listening on port ${port}`);
    
    try {
      // Register with MCP server on startup
      await registerAgent();
      logger.info('Successfully registered with MCP server');
      console.log('Successfully registered with MCP server');
      
      // Start polling for scan requests
      startPolling();
    } catch (error) {
      logger.error('Failed to register with MCP server:', error.message);
      console.error('Failed to register with MCP server:', error.message);
      console.error('Error details:', error);
      
      // Keep the server running even if registration fails
      console.log('Agent will continue running and retry registration later');
    }
  });
  
  // Add error handler for the server
  server.on('error', (error) => {
    logger.error('Server error:', error.message);
    console.error('Server error:', error.message);
    console.error('Error details:', error);
  });
} catch (error) {
  logger.error('Error during server startup:', error.message);
  console.error('Error during server startup:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  console.error('Uncaught exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
  console.error('Unhandled promise rejection:', reason);
  console.error('Stack trace:', reason?.stack);
}); 