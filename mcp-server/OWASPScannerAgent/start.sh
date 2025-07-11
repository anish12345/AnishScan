#!/bin/bash

# Run the setup configuration script to create .env file if it doesn't exist
echo "Checking configuration..."
node setup-config.js

# Create temp directory if it doesn't exist
if [ ! -d "temp" ]; then
  echo "Creating temp directory..."
  mkdir -p temp
fi

# Check for semgrep installation
echo "Checking for semgrep installation..."
if ! command -v semgrep &> /dev/null; then
  echo "WARNING: semgrep is not installed or not in PATH"
  echo "Please install semgrep using: pip install semgrep"
  echo "C# scanning functionality will not work without semgrep"
  echo
  read -p "Press Enter to continue anyway or Ctrl+C to cancel..."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the agent
echo "Starting OWASP Scanner Agent..."
npm start 