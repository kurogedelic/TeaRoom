#!/bin/bash

# TeaRoom 2.0 Quick Deploy Script
# One-command deployment for testing

set -e

echo "🚀 TeaRoom 2.0 Quick Deploy"
echo "==========================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    echo "📖 Installation guide: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    echo "📖 Installation guide: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating environment configuration..."
    cp .env.example .env
    echo "✅ Environment file created"
fi

# Build and start
echo "🏗️ Building and starting TeaRoom..."
docker-compose up -d --build

# Wait for health check
echo "⏳ Waiting for TeaRoom to start..."
sleep 10

# Test health endpoint
if curl -s http://localhost:9000/api/ping > /dev/null; then
    echo "✅ TeaRoom is running!"
    echo "🌐 Access at: http://localhost:9000"
    echo "📊 Health check: http://localhost:9000/api/health"
    echo ""
    echo "🔧 Management commands:"
    echo "  • View logs:  docker-compose logs -f"
    echo "  • Stop:       docker-compose down"
    echo "  • Restart:    docker-compose restart"
    echo ""
    echo "🎉 Happy chatting! 🍵"
else
    echo "❌ TeaRoom failed to start properly"
    echo "📋 Check logs with: docker-compose logs"
    exit 1
fi