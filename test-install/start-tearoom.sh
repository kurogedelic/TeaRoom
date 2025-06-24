#!/bin/bash

# TeaRoom 2.0 Launch Script

echo "🍵 Starting TeaRoom 2.0..."

# Parse arguments
VERBOSE=false
for arg in "$@"; do
    case $arg in
        --verbose|-v)
            VERBOSE=true
            echo "🔍 Verbose mode enabled"
            shift
            ;;
    esac
done

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -i:$port >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while [ $port -lt $((start_port + 100)) ]; do
        if check_port $port; then
            echo $port
            return 0
        fi
        port=$((port + 1))
    done
    
    echo "Error: No available ports found"
    exit 1
}

# Clean up function
cleanup() {
    echo -e "\n${YELLOW}🧹 Shutting down TeaRoom...${NC}"
    
    if [ ! -z "$SERVER_PID" ] && kill -0 $SERVER_PID 2>/dev/null; then
        echo "Stopping TeaRoom server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
    fi
    
    # Clean up port files
    rm -f .server-port
    
    echo -e "${GREEN}✅ TeaRoom shutdown complete${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Kill any existing TeaRoom processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*server/app.js" 2>/dev/null || true
rm -f .server-port

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js and try again.${NC}"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# First time setup
if [ ! -f "tearoom.db" ]; then
    echo -e "${BLUE}🔧 First time setup - initializing database...${NC}"
fi

# Create necessary directories
mkdir -p public/uploads
mkdir -p server/logs
mkdir -p instances

# Find available port starting from 9000
echo "🔍 Finding available port..."
SERVER_PORT=$(find_available_port 9000)
echo $SERVER_PORT > .server-port

# Start TeaRoom 2.0 server
echo -e "${BLUE}🚀 Starting TeaRoom 2.0 server on port $SERVER_PORT...${NC}"
if [ "$VERBOSE" = true ]; then
    PORT=$SERVER_PORT node server/app.js &
else
    PORT=$SERVER_PORT node server/app.js > /dev/null 2>&1 &
fi
SERVER_PID=$!

# Wait for server startup
sleep 3

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start TeaRoom server${NC}"
    exit 1
fi

echo -e "${GREEN}✅ TeaRoom 2.0 server started successfully${NC}"
echo -e "${GREEN}🌐 TeaRoom is running at: http://localhost:$SERVER_PORT${NC}"

# Auto-open browser on macOS
if command -v open >/dev/null 2>&1; then
    echo -e "${BLUE}🌐 Opening browser...${NC}"
    open "http://localhost:$SERVER_PORT"
fi

echo -e "${YELLOW}💡 Press Ctrl+C to stop TeaRoom${NC}"
echo ""
echo "First time? Create 2 personas, then create a room to start chatting!"

# Keep the script running
wait $SERVER_PID