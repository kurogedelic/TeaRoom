# TeaRoom 2.0 - Docker Configuration
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    bash \
    sqlite

# Install Claude CLI (if available)
RUN npm install -g @anthropic-ai/claude-cli || echo "Claude CLI will be installed separately"

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data directory and set permissions
RUN mkdir -p /app/data/database \
    && mkdir -p /app/data/uploads \
    && mkdir -p /app/data/logs \
    && chown -R node:node /app

# Switch to non-root user
USER node

# Create volume mount points
VOLUME ["/app/data"]

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9000/api/ping || exit 1

# Start application
CMD ["npm", "start"]