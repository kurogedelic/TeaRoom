# TeaRoom 2.0 Deployment Guide

This guide covers different deployment scenarios for TeaRoom 2.0, from local development to production deployment.

## Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed
- Claude CLI installed (optional but recommended)
- 2GB+ RAM and 1GB+ disk space

### One-Line Installation
```bash
curl -sSL https://raw.githubusercontent.com/your-repo/tearoom/main/install.sh | bash
```

### Manual Installation
1. Clone or download TeaRoom 2.0
2. Run the installation script:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
3. Start TeaRoom:
   ```bash
   ./start.sh
   ```
4. Open http://localhost:9000

## Deployment Options

### 1. Local Development

For development and testing:

```bash
# Clone repository
git clone https://github.com/your-repo/tearoom.git
cd tearoom

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### 2. Docker (Recommended)

#### Simple Docker Run
```bash
# Build image
docker build -t tearoom .

# Run container
docker run -d \
  --name tearoom \
  -p 9000:9000 \
  -v tearoom_data:/app/data \
  tearoom
```

#### Docker Compose (Recommended)
```bash
# Start with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### 3. Production with Nginx

For production deployment with reverse proxy:

```bash
# Start with nginx proxy
docker-compose --profile production up -d

# This starts:
# - TeaRoom application on port 9000
# - Nginx reverse proxy on ports 80/443
```

### 4. Cloud Deployment

#### AWS ECS/Fargate
1. Push image to ECR
2. Create ECS task definition
3. Deploy to Fargate service

#### DigitalOcean App Platform
1. Connect GitHub repository
2. Configure build settings
3. Deploy automatically

#### Railway/Heroku
1. Connect repository
2. Set environment variables
3. Deploy

## Configuration

### Environment Variables

Create `.env` file with your configuration:

```bash
# Server
NODE_ENV=production
PORT=9000
HOST=0.0.0.0

# Data Storage
TEAROOM_DATA_PATH=/app/data
DATABASE_PATH=/app/data/database/tearoom.db

# Claude CLI
CLAUDE_CLI_PATH=claude
CLAUDE_CLI_TIMEOUT=15000
CLAUDE_MAX_RETRIES=3

# Features
AUTO_CONVERSATION_ENABLED=true
AUTO_CONVERSATION_INTERVAL=300000
ENABLE_AUTO_CHAT=true
ENABLE_SEARCH=true
ENABLE_HEALTH_MONITORING=true

# Security
SESSION_SECRET=your-random-secret-here
ALLOWED_ORIGINS=*
UPLOAD_MAX_SIZE=5242880

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
```

### Health Monitoring

TeaRoom includes comprehensive health monitoring:

- **Health Check Endpoint**: `GET /api/health`
- **Simple Ping**: `GET /api/ping`
- **System Debug**: `GET /api/debug/system`

### Persistent Data

TeaRoom stores data in these locations:

- **Database**: SQLite database with conversations and personas
- **Uploads**: Avatar images and uploaded files
- **Logs**: Application and error logs

#### Docker Volumes
```bash
# Named volume (recommended)
docker volume create tearoom_data

# Bind mount (for backup access)
docker run -v /host/path:/app/data tearoom
```

## SSL/HTTPS Setup

### Option 1: Let's Encrypt with Nginx

1. Install certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. Get certificate:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

3. Update nginx configuration

### Option 2: Cloudflare Proxy

1. Point DNS to your server
2. Enable Cloudflare proxy
3. Configure SSL in Cloudflare dashboard

## Monitoring and Maintenance

### Health Checks
```bash
# Check application health
curl http://localhost:9000/api/health

# Check system resources
curl http://localhost:9000/api/debug/system
```

### Logs
```bash
# Application logs
docker-compose logs tearoom

# Follow logs
docker-compose logs -f tearoom

# System logs (if using systemd)
sudo journalctl -u tearoom -f
```

### Backup
```bash
# Backup data volume
docker run --rm -v tearoom_data:/data -v $(pwd):/backup alpine tar czf /backup/tearoom_backup.tar.gz -C /data .

# Restore data
docker run --rm -v tearoom_data:/data -v $(pwd):/backup alpine tar xzf /backup/tearoom_backup.tar.gz -C /data
```

### Updates
```bash
# Pull latest image
docker-compose pull

# Restart with new image
docker-compose up -d

# Or use update script
./update.sh
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change port in docker-compose.yml
   ports:
     - "9001:9000"  # Use different host port
   ```

2. **Claude CLI Not Found**
   ```bash
   # Install Claude CLI
   npm install -g @anthropic-ai/claude-cli
   
   # Or disable Claude features
   CLAUDE_CLI_PATH=false
   ```

3. **Permission Errors**
   ```bash
   # Fix data directory permissions
   sudo chown -R $USER:$USER ./data
   ```

4. **Memory Issues**
   ```bash
   # Increase Docker memory limit
   # Or use smaller Node.js memory settings
   NODE_OPTIONS="--max-old-space-size=512"
   ```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# In environment
LOG_LEVEL=debug
NODE_ENV=development

# Or via Docker
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up
```

## Security Considerations

### Production Checklist

- [ ] Change default session secret
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup data regularly

### Network Security

```nginx
# Rate limiting in nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
```

## Performance Optimization

### For High Traffic

1. **Use Redis for sessions**
2. **Configure nginx caching**
3. **Use CDN for static assets**
4. **Scale horizontally with load balancer**

### Resource Limits

```yaml
# docker-compose.yml
services:
  tearoom:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

## Support

- **Documentation**: Check README.md and inline code comments
- **Issues**: Report bugs on GitHub Issues
- **Health Status**: Monitor `/api/health` endpoint
- **Logs**: Check Docker logs for errors

Happy deploying! 🚀🍵