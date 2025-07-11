const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const logger = require('../utils/logger');

/**
 * Clone a repository to a local directory
 * @param {string} repositoryUrl - The repository URL to clone
 * @param {string} branch - The branch to clone (default: main)
 * @param {string} targetDir - The target directory to clone to
 */
const cloneRepository = async (repositoryUrl, branch = 'main', targetDir) => {
  try {
    logger.info(`Cloning repository ${repositoryUrl} (branch: ${branch}) to ${targetDir}`);
    
    // Handle local file:// URLs by copying instead of cloning
    if (repositoryUrl.startsWith('file://')) {
      const localPath = repositoryUrl.replace('file://', '').replace(/\//g, path.sep);
      logger.info(`Detected local repository, copying from ${localPath} to ${targetDir}`);
      
      // Check if source directory exists
      if (!fs.existsSync(localPath)) {
        throw new Error(`Local repository path does not exist: ${localPath}`);
      }
      
      // Create target directory
      await fs.promises.mkdir(targetDir, { recursive: true });
      
      // Copy directory recursively
      await copyDirectory(localPath, targetDir);
      
      logger.info(`Successfully copied local repository from ${localPath} to ${targetDir}`);
      return;
    }
    
    // Handle regular git URLs
    let normalizedUrl = repositoryUrl;
    
    // Add https:// prefix if not present and not a file:// URL
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('git@')) {
      normalizedUrl = 'https://' + normalizedUrl;
      logger.info(`Added https:// prefix to repository URL: ${normalizedUrl}`);
    }
    
    // Add .git suffix if not present
    if (!normalizedUrl.endsWith('.git') && !normalizedUrl.includes('github.com') && !normalizedUrl.includes('gitlab.com')) {
      normalizedUrl = normalizedUrl + '.git';
      logger.info(`Normalized repository URL: ${normalizedUrl}`);
    }
    
    logger.info(`Cloning repository ${normalizedUrl} (branch: ${branch}) to ${targetDir}`);
    
    const git = simpleGit();
    await git.clone(normalizedUrl, targetDir, ['--branch', branch, '--single-branch']);
    
    logger.info(`Successfully cloned repository to ${targetDir}`);
  } catch (error) {
    logger.error('Error cloning repository:', error.message);
    throw error;
  }
};

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
const copyDirectory = async (src, dest) => {
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Skip .git and node_modules directories
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue;
      }
      
      await fs.promises.mkdir(destPath, { recursive: true });
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
};

/**
 * Clean up a cloned repository
 * @param {string} repositoryPath - The path to the repository to clean up
 */
const cleanupRepository = async (repositoryPath) => {
  try {
    if (!fs.existsSync(repositoryPath)) {
      logger.info(`Repository path ${repositoryPath} does not exist, nothing to clean up`);
      return;
    }
    
    logger.info(`Cleaning up repository at ${repositoryPath}`);
    await fs.promises.rm(repositoryPath, { recursive: true, force: true });
    logger.info(`Successfully cleaned up repository at ${repositoryPath}`);
  } catch (error) {
    logger.error(`Error cleaning up repository at ${repositoryPath}:`, error.message);
    throw error;
  }
};

module.exports = {
  cloneRepository,
  cleanupRepository
}; 