#!/bin/bash

# TeaRoom 2.0 Deployment Validation Script
# Validates Docker configuration and deployment files

set -e

echo "🔍 TeaRoom 2.0 Deployment Validation"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check if required files exist
echo "📁 Checking deployment files..."

required_files=(
    "Dockerfile"
    "docker-compose.yml"
    ".dockerignore"
    ".env.example"
    "install.sh"
    "DEPLOYMENT.md"
    "docker/nginx.conf"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        success "Found: $file"
    else
        error "Missing: $file"
        exit 1
    fi
done

# Validate Dockerfile
echo "🐳 Validating Dockerfile..."

if grep -q "FROM node:" Dockerfile; then
    success "Valid Node.js base image"
else
    error "Invalid or missing Node.js base image"
fi

if grep -q "WORKDIR /app" Dockerfile; then
    success "Working directory set correctly"
else
    error "Working directory not set"
fi

if grep -q "EXPOSE 9000" Dockerfile; then
    success "Port 9000 exposed"
else
    error "Port not exposed"
fi

if grep -q "HEALTHCHECK" Dockerfile; then
    success "Health check configured"
else
    warning "No health check in Dockerfile"
fi

# Validate docker-compose.yml
echo "📦 Validating docker-compose.yml..."

if grep -q "version:" docker-compose.yml; then
    success "Docker Compose version specified"
else
    error "Docker Compose version missing"
fi

if grep -q "tearoom:" docker-compose.yml; then
    success "TeaRoom service defined"
else
    error "TeaRoom service not found"
fi

if grep -q "9000:9000" docker-compose.yml; then
    success "Port mapping configured"
else
    error "Port mapping not found"
fi

if grep -q "tearoom_data:" docker-compose.yml; then
    success "Volume for data persistence"
else
    error "Data volume not configured"
fi

# Validate .dockerignore
echo "🚫 Validating .dockerignore..."

if grep -q "node_modules" .dockerignore; then
    success "node_modules excluded"
else
    error "node_modules not excluded"
fi

if grep -q ".git" .dockerignore; then
    success "Git files excluded"
else
    warning "Git files not excluded"
fi

# Validate nginx configuration
echo "🔧 Validating nginx configuration..."

if grep -q "upstream tearoom_backend" docker/nginx.conf; then
    success "Upstream backend configured"
else
    error "Upstream backend not found"
fi

if grep -q "proxy_pass" docker/nginx.conf; then
    success "Proxy configuration found"
else
    error "Proxy configuration missing"
fi

if grep -q "limit_req_zone" docker/nginx.conf; then
    success "Rate limiting configured"
else
    warning "No rate limiting configuration"
fi

# Check install script
echo "📜 Validating install script..."

if [ -x "install.sh" ]; then
    success "Install script is executable"
else
    error "Install script not executable"
fi

if grep -q "docker-compose" install.sh; then
    success "Install script uses docker-compose"
else
    error "Install script doesn't use docker-compose"
fi

# Validate environment example
echo "⚙️ Validating environment configuration..."

if grep -q "NODE_ENV" .env.example; then
    success "Environment variables template found"
else
    error "Environment template missing"
fi

# Check package.json for Docker compatibility
echo "📦 Checking package.json..."

if [ -f "package.json" ]; then
    if grep -q "start" package.json; then
        success "Start script defined in package.json"
    else
        error "No start script in package.json"
    fi
else
    error "package.json not found"
fi

# Test basic file structure
echo "🏗️ Validating application structure..."

directories=(
    "server"
    "public"
    "server/routes"
    "server/services"
    "server/database"
    "public/css"
    "public/js"
    "public/locales"
)

for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        success "Directory exists: $dir"
    else
        error "Missing directory: $dir"
    fi
done

# Check key application files
key_files=(
    "server/app.js"
    "public/index.html"
    "public/css/main.css"
    "public/js/app.js"
    "server/services/claude-sdk.js"
    "server/services/health-check.js"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        success "Key file exists: $file"
    else
        error "Missing key file: $file"
    fi
done

echo ""
echo "🎉 Deployment validation completed!"
echo "📚 Next steps:"
echo "   1. Install Docker and Docker Compose"
echo "   2. Run: ./install.sh"
echo "   3. Test: docker-compose up -d"
echo "   4. Access: http://localhost:9000"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md"