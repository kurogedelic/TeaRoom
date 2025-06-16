#!/bin/bash

# TeaRoom Web-based Launch Script

echo "🍵 Starting TeaRoom Web Interface..."

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
NC='\033[0m'

# Project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Cleanup any existing processes first
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
pkill -f "claude-oneshot.sh" 2>/dev/null || true
pkill -f "claude.*TeaRoom" 2>/dev/null || true
killall node 2>/dev/null || true

# Clean up old port files
rm -f .server-port .preview-port

# Check npm installation
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start chat server
echo -e "${GREEN}✅ Starting chat server...${NC}"
if [ "$VERBOSE" = true ]; then
    node server.js &
else
    node server.js > /dev/null 2>&1 &
fi
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server startup
sleep 3

# Read server port
if [ -f ".server-port" ]; then
    SERVER_PORT=$(cat .server-port)
    echo "Chat server started on port: $SERVER_PORT"
else
    SERVER_PORT="3000"
fi

# Start web preview with wizard
echo -e "${BLUE}🌐 Starting web interface...${NC}"
if [ "$VERBOSE" = true ]; then
    VERBOSE=true node web-preview.js &
else
    node web-preview.js > /dev/null 2>&1 &
fi
PREVIEW_PID=$!
echo "Web interface PID: $PREVIEW_PID"

# Wait for web preview to start and read the port
sleep 2
if [ -f ".preview-port" ]; then
    PREVIEW_PORT=$(cat .preview-port)
    echo "Web interface started on port: $PREVIEW_PORT"
else
    PREVIEW_PORT="8080"
fi

echo -e "\n${YELLOW}📢 TeaRoom is running!${NC}"
echo "Chat server: http://localhost:${SERVER_PORT}"
echo "Web interface: http://localhost:${PREVIEW_PORT}"
echo ""
echo -e "${GREEN}🌐 Opening in browser...${NC}"

# Open the main page (will auto-redirect to wizard if needed)
if command -v open &> /dev/null; then
    open "http://localhost:${PREVIEW_PORT}"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:${PREVIEW_PORT}"
fi

echo ""
echo -e "${YELLOW}Usage:${NC}"
echo "  Normal mode: ./start-tearoom.sh"
echo "  Verbose mode: ./start-tearoom.sh --verbose"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup on exit
trap "echo 'Shutting down...'; kill $SERVER_PID $PREVIEW_PID 2>/dev/null; rm -f .preview-port .server-port; exit" INT

# Wait
wait
