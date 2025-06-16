#!/bin/bash

# TeaRoom Process Cleanup Script

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🧹 TeaRoom Cleanup Starting...${NC}"

# Kill all Node.js processes
echo "Stopping Node.js processes..."
killall node 2>/dev/null && echo -e "${GREEN}✓ Node.js processes stopped${NC}" || echo "No Node.js processes found"

# Kill Claude processes
echo "Stopping Claude processes..."
pkill -f "claude-oneshot.sh" 2>/dev/null && echo -e "${GREEN}✓ Claude oneshot processes stopped${NC}" || echo "No Claude oneshot processes found"
pkill -f "claude.*TeaRoom" 2>/dev/null && echo -e "${GREEN}✓ Claude TeaRoom processes stopped${NC}" || echo "No Claude TeaRoom processes found"

# Clean up port files
echo "Cleaning up port files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rm -f "$SCRIPT_DIR/.server-port"
rm -f "$SCRIPT_DIR/.preview-port"
echo -e "${GREEN}✓ Port files cleaned${NC}"

# Show remaining processes (for debugging)
echo ""
echo "Checking for remaining TeaRoom-related processes..."
remaining=$(ps aux | grep -E "(claude.*TeaRoom|claude-oneshot|node.*TeaRoom)" | grep -v grep)
if [ -z "$remaining" ]; then
    echo -e "${GREEN}✓ No remaining TeaRoom processes found${NC}"
else
    echo -e "${RED}⚠️ Some processes may still be running:${NC}"
    echo "$remaining"
fi

echo -e "${GREEN}🎉 Cleanup completed!${NC}"