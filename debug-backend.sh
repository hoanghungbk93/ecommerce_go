#!/bin/bash

# =============================================================================
# Backend Debug Script
# =============================================================================
# This script debugs why backend is not responding on port 8080

set -e

echo "🔍 Backend Debug and Fix"
echo "======================="

echo ""
echo "📊 Current container status:"
cd ~/ecommerce/ecommerce-app
docker-compose ps

echo ""
echo "📋 Backend container logs:"
docker-compose logs backend

echo ""
echo "🔍 Checking if backend container is actually running:"
BACKEND_CONTAINER=$(docker-compose ps -q backend)
if [ -n "$BACKEND_CONTAINER" ]; then
    echo "✅ Backend container ID: $BACKEND_CONTAINER"
    
    echo ""
    echo "📊 Container details:"
    docker inspect $BACKEND_CONTAINER --format='{{.State.Status}}: {{.State.Health.Status}}'
    
    echo ""
    echo "🌐 Port mappings:"
    docker port $BACKEND_CONTAINER
    
    echo ""
    echo "📋 Container processes:"
    docker exec $BACKEND_CONTAINER ps aux || echo "Cannot access container processes"
    
    echo ""
    echo "🔧 Testing connection inside container:"
    docker exec $BACKEND_CONTAINER curl -f http://localhost:8080/api/health || echo "Backend not responding inside container"
else
    echo "❌ Backend container not found"
fi

echo ""
echo "🔍 Checking host connectivity:"
echo "Testing localhost:8080..."
curl -v http://localhost:8080 || echo "Cannot connect to localhost:8080"

echo ""
echo "Testing localhost:8080/api/health..."
curl -v http://localhost:8080/api/health || echo "Cannot connect to health endpoint"

echo ""
echo "🔧 Checking port usage on host:"
netstat -tulpn | grep :8080 || echo "Port 8080 not in use"

echo ""
echo "🔍 Checking PostgreSQL connectivity from host:"
pg_isready -h localhost -p 5432 -U odoo16 && echo "✅ PostgreSQL accessible" || echo "❌ PostgreSQL not accessible"

echo ""
echo "🔧 Checking if database exists:"
export PGPASSWORD="hoanghungbk"
psql -h localhost -p 5432 -U odoo16 -lqt | grep ecommerce && echo "✅ ecommerce database exists" || echo "❌ ecommerce database missing"

echo ""
echo "🔄 Attempting to fix backend issues..."

# Stop containers
echo "Stopping containers..."
docker-compose down

# Check for Go application build issues
echo ""
echo "🔍 Checking backend build..."
if docker-compose build backend; then
    echo "✅ Backend build successful"
else
    echo "❌ Backend build failed"
    exit 1
fi

# Start only backend first
echo ""
echo "🚀 Starting backend only..."
docker-compose up -d backend

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 20

# Check backend logs
echo ""
echo "📋 Backend logs after restart:"
docker-compose logs backend

# Check if backend is responding
echo ""
echo "🧪 Testing backend after restart..."
for i in {1..10}; do
    echo "Attempt $i/10..."
    if curl -s http://localhost:8080/api/health >/dev/null 2>&1; then
        echo "✅ Backend is now responding!"
        break
    else
        echo "❌ Backend not responding, waiting 5 seconds..."
        sleep 5
    fi
done

# Final status
echo ""
echo "📊 Final backend status:"
docker-compose ps backend
docker-compose logs backend | tail -10

# If backend is working, start frontend
if curl -s http://localhost:8080/api/health >/dev/null 2>&1; then
    echo ""
    echo "🎉 Backend is working! Starting frontend..."
    docker-compose up -d frontend
    
    echo "⏳ Waiting for frontend..."
    sleep 10
    
    echo "📊 Final status:"
    docker-compose ps
    
    echo ""
    echo "🌐 Your services should be available at:"
    echo "- Backend: http://103.176.179.183:8080/api/health"
    echo "- Frontend: http://103.176.179.183:3000"
else
    echo ""
    echo "❌ Backend is still not working. Check these:"
    echo "1. Database connection issues"
    echo "2. Go application errors"
    echo "3. Port binding problems"
    echo "4. Missing dependencies in Docker image"
    echo ""
    echo "📋 Debug commands:"
    echo "docker-compose logs backend                    # Check logs"
    echo "docker exec -it \$(docker-compose ps -q backend) sh  # Enter container"
    echo "docker-compose build --no-cache backend       # Rebuild"
fi
