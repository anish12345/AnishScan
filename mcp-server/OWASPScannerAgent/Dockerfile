FROM node:18-alpine

# Install git and other dependencies
RUN apk add --no-cache git python3 py3-pip make g++

# Install semgrep
RUN pip3 install semgrep

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create temp directory for cloning repositories
RUN mkdir -p temp && chmod 777 temp

# Setup configuration with the correct MCP server URL
RUN node setup-config.js

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["node", "src/index.js"] 