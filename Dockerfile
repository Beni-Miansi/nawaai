# Use a lightweight Node.js image
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package manifests
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY . ./

# Ensure data directory exists
RUN mkdir -p /usr/src/app/data

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
