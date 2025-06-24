#!/bin/bash

# TeaRoom Process Cleanup Script

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🧹 TeaRoom 2.0 Cleanup Starting...${NC}"

# Kill specific TeaRoom processes
echo "Stopping TeaRoom 2.0 server..."
pkill -f "node.*server/app.js" 2>/dev/null && echo -e "${GREEN}✓ TeaRoom server stopped${NC}" || echo "No TeaRoom server found"

# Kill any remaining Node.js processes if requested
if [ "$1" = "--force" ]; then
    echo "Force stopping all Node.js processes..."
    killall node 2>/dev/null && echo -e "${GREEN}✓ All Node.js processes stopped${NC}" || echo "No Node.js processes found"
fi

# Clean up port files
echo "Cleaning up port files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rm -f "$SCRIPT_DIR/.server-port"
echo -e "${GREEN}✓ Port files cleaned${NC}"

# Show remaining processes (for debugging)
echo ""
echo "Checking for remaining TeaRoom-related processes..."
remaining=$(ps aux | grep -E "(node.*server/app.js)" | grep -v grep)
if [ -z "$remaining" ]; then
    echo -e "${GREEN}✓ No remaining TeaRoom processes found${NC}"
else
    echo -e "${RED}⚠️ Some processes may still be running:${NC}"
    echo "$remaining"
fi

echo -e "${GREEN}🎉 TeaRoom 2.0 cleanup completed!${NC}"