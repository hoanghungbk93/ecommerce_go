#!/bin/bash

# =============================================================================
# Fix Container Database Connection
# =============================================================================
# This script fixes the database connection issue for containers

set -e

echo "🔧 Fixing Container Database Connection"
echo "======================================"

# Find the correct host IP for database connection
echo ""
echo "🔍 Finding correct database host IP..."

# Method 1: Try docker bridge IP
DOCKER_BRIDGE_IP=$(docker network inspect bridge --format='{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "")
if [ -n "$DOCKER_BRIDGE_IP" ]; then
    echo "✅ Docker bridge IP: $DOCKER_BRIDGE_IP"
    DB_HOST="$DOCKER_BRIDGE_IP"
else
    echo "⚠️  Docker bridge IP not found"
fi

# Method 2: Try host.docker.internal alternative
if [ -z "$DB_HOST" ]; then
    # For Linux, we need to add host.docker.internal to /etc/hosts or use bridge IP
    DB_HOST="172.17.0.1"  # Default Docker bridge gateway
    echo "📝 Using default Docker bridge IP: $DB_HOST"
fi

# Test if we can reach PostgreSQL from the host
echo ""
echo "🧪 Testing PostgreSQL connection..."
if pg_isready -h localhost -p 5432 -U odoo16 >/dev/null 2>&1; then
    echo "✅ PostgreSQL is accessible on localhost"
else
    echo "❌ PostgreSQL is not accessible"
    echo "Checking PostgreSQL status..."
    sudo systemctl status postgresql --no-pager
fi

# Update docker-compose.yml with correct host IP
echo ""
echo "📝 Updating docker-compose.yml..."

cd ~/ecommerce/ecommerce-app

# Create backup
cp docker-compose.yml docker-compose.yml.backup

# Update the DATABASE_URL
sed -i "s|DATABASE_URL:.*|DATABASE_URL: postgres://odoo16:hoanghungbk@${DB_HOST}:5432/ecommerce?sslmode=disable|" docker-compose.yml

echo "✅ Updated DATABASE_URL to use $DB_HOST"

# Show the updated configuration
echo ""
echo "📋 Updated DATABASE_URL:"
grep "DATABASE_URL" docker-compose.yml

# Stop and restart containers
echo ""
echo "🔄 Restarting containers with new configuration..."

docker-compose down
sleep 2

# Build and start containers
docker-compose up -d

# Wait for containers to start
echo ""
echo "⏳ Waiting for containers to initialize..."
sleep 15

# Check container status
echo ""
echo "📊 Container status:"
docker-compose ps

# Check backend logs
echo ""
echo "📋 Backend logs:"
docker-compose logs backend | tail -20

# Test connectivity
echo ""
echo "🧪 Testing service connectivity..."

# Test backend
if curl -s http://localhost:8080/api/health >/dev/null 2>&1; then
    echo "✅ Backend is responding on port 8080"
else
    echo "❌ Backend is not responding on port 8080"
    echo "Backend logs:"
    docker-compose logs backend
fi

# Test frontend
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend is responding on port 3000"
else
    echo "❌ Frontend is not responding on port 3000"
    echo "Frontend logs:"
    docker-compose logs frontend
fi

echo ""
echo "📊 Final Status:"
echo "==============="
docker ps

echo ""
echo "🌐 Your services should be available at:"
echo "- Frontend: http://103.176.179.183:3000"
echo "- Backend: http://103.176.179.183:8080"
echo "- Health Check: http://103.176.179.183:8080/api/health"

echo ""
echo "🔧 If issues persist, run:"
echo "docker-compose logs backend    # Check backend errors"
echo "docker-compose logs frontend   # Check frontend errors"
