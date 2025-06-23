#!/bin/bash

# TeaRoom 2.0 Installation Script
# This script installs and sets up TeaRoom for production use

set -e

echo "🍵 TeaRoom 2.0 Installation Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   print_status "Please run as a regular user with sudo privileges"
   exit 1
fi

# Check system requirements
print_status "Checking system requirements..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    print_status "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available"
    print_status "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

print_success "Docker and Docker Compose are available"

# Check if Claude CLI is installed (optional)
if command -v claude &> /dev/null; then
    print_success "Claude CLI is installed"
else
    print_warning "Claude CLI is not installed"
    print_status "You can install it later with: npm install -g @anthropic-ai/claude-cli"
fi

# Create installation directory
INSTALL_DIR="$HOME/tearoom"
if [ "$1" != "" ]; then
    INSTALL_DIR="$1"
fi

print_status "Installing TeaRoom to: $INSTALL_DIR"

# Create directory if it doesn't exist
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download or copy TeaRoom files
if [ -f "docker-compose.yml" ]; then
    print_status "TeaRoom files already present, updating..."
else
    print_status "Setting up TeaRoom configuration..."
    
    # Create basic docker-compose.yml if not present
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  tearoom:
    image: tearoom:latest
    container_name: tearoom-app
    ports:
      - "9000:9000"
    volumes:
      - tearoom_data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=9000
      - TEAROOM_DATA_PATH=/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/api/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  tearoom_data:
    driver: local

networks:
  default:
    name: tearoom-network
EOF
fi

# Create environment file
if [ ! -f ".env" ]; then
    print_status "Creating environment configuration..."
    cat > .env << 'EOF'
# TeaRoom 2.0 Configuration
NODE_ENV=production
PORT=9000
HOST=0.0.0.0
TEAROOM_DATA_PATH=/app/data
DATABASE_PATH=/app/data/database/tearoom.db
UPLOADS_PATH=/app/data/uploads
LOGS_PATH=/app/data/logs
CLAUDE_CLI_TIMEOUT=15000
CLAUDE_MAX_RETRIES=3
AUTO_CONVERSATION_ENABLED=true
AUTO_CONVERSATION_INTERVAL=300000
ENABLE_AUTO_CHAT=true
ENABLE_SEARCH=true
ENABLE_HEALTH_MONITORING=true
LOG_LEVEL=info
EOF
    print_success "Environment configuration created"
else
    print_status "Environment file already exists"
fi

# Create management scripts
print_status "Creating management scripts..."

# Start script
cat > start.sh << 'EOF'
#!/bin/bash
echo "🍵 Starting TeaRoom 2.0..."
docker-compose up -d
echo "✅ TeaRoom is running at: http://localhost:9000"
echo "📊 Health check: http://localhost:9000/api/health"
EOF

# Stop script
cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping TeaRoom 2.0..."
docker-compose down
echo "✅ TeaRoom stopped"
EOF

# Update script
cat > update.sh << 'EOF'
#!/bin/bash
echo "🔄 Updating TeaRoom 2.0..."
docker-compose pull
docker-compose up -d
echo "✅ TeaRoom updated and restarted"
EOF

# Logs script
cat > logs.sh << 'EOF'
#!/bin/bash
echo "📋 TeaRoom 2.0 Logs:"
docker-compose logs -f tearoom
EOF

# Backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "💾 Backing up TeaRoom data to: $BACKUP_DIR"
docker run --rm -v tearoom_tearoom_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/tearoom_data.tar.gz -C /data .
echo "✅ Backup completed: $BACKUP_DIR/tearoom_data.tar.gz"
EOF

# Make scripts executable
chmod +x start.sh stop.sh update.sh logs.sh backup.sh

print_success "Management scripts created"

# Build or pull Docker image
print_status "Preparing Docker image..."
if [ -f "Dockerfile" ]; then
    print_status "Building TeaRoom image from source..."
    docker build -t tearoom:latest .
else
    print_status "Using pre-built TeaRoom image..."
    # docker pull tearoom:latest
fi

# Create systemd service (optional)
if command -v systemctl &> /dev/null; then
    read -p "Would you like to create a systemd service for automatic startup? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Creating systemd service..."
        
        sudo tee /etc/systemd/system/tearoom.service > /dev/null << EOF
[Unit]
Description=TeaRoom 2.0 AI Chat Platform
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable tearoom.service
        print_success "Systemd service created and enabled"
        print_status "You can now use: sudo systemctl start tearoom"
    fi
fi

# Final instructions
echo
print_success "🎉 TeaRoom 2.0 installation completed!"
echo
echo "📝 Next steps:"
echo "  1. Start TeaRoom:     ./start.sh"
echo "  2. Open browser:      http://localhost:9000"
echo "  3. Create personas:   Use the web interface"
echo "  4. Create rooms:      Use the web interface"
echo "  5. Start chatting:    Select a room and start conversation"
echo
echo "🔧 Management commands:"
echo "  • Start:    ./start.sh"
echo "  • Stop:     ./stop.sh"
echo "  • Update:   ./update.sh"
echo "  • Logs:     ./logs.sh"
echo "  • Backup:   ./backup.sh"
echo
echo "📚 Documentation: Check the README.md file"
echo "🐛 Issues: Report at https://github.com/your-repo/tearoom/issues"
echo
print_success "Happy chatting! 🍵"