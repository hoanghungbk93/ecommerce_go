#!/bin/bash

# =============================================================================
# Complete Server Finalization Script
# =============================================================================
# This script completes the server setup after Docker is working

set -e

echo "🎯 Finalizing Server Setup for ecommerce.itmf.com.vn"
echo "=================================================="

# Check if we're running on the server
if [[ ! -d "$HOME/ecommerce" ]]; then
    echo "❌ This script must be run on your server (103.176.179.183)"
    echo "📋 Make sure you have cloned: git clone https://github.com/YOUR_USERNAME/ecommerce.git"
    exit 1
fi

echo "✅ Found ecommerce directory"

# Check if Docker is working
echo ""
echo "🐳 Checking Docker status..."
if docker --version >/dev/null 2>&1; then
    echo "✅ Docker is working"
    docker --version
else
    echo "❌ Docker is not working. Please run fix-docker.sh first"
    exit 1
fi

if docker-compose --version >/dev/null 2>&1; then
    echo "✅ Docker Compose is working"
    docker-compose --version
else
    echo "❌ Docker Compose is not working"
    exit 1
fi

# Install nginx if not present
echo ""
echo "🌐 Setting up Nginx..."

if command -v nginx >/dev/null 2>&1; then
    echo "✅ Nginx is already installed"
else
    echo "Installing Nginx..."
    # Try to install nginx
    if sudo apt-get update -qq >/dev/null 2>&1 && sudo apt-get install -y nginx >/dev/null 2>&1; then
        echo "✅ Nginx installed successfully"
    else
        echo "❌ Failed to install nginx via apt"
        echo "⚠️  Manual nginx installation required"
        
        # Try alternative installation
        echo "Trying alternative nginx installation..."
        curl -L http://nginx.org/download/nginx-1.24.0.tar.gz -o nginx.tar.gz
        tar -xzf nginx.tar.gz
        cd nginx-1.24.0
        
        # This would require compilation - let's use a simpler approach
        cd ..
        rm -rf nginx*
        
        echo "❌ Nginx installation failed. Your site will work on direct ports."
        NGINX_INSTALLED=false
    fi
fi

# Check if nginx installed successfully
if command -v nginx >/dev/null 2>&1; then
    NGINX_INSTALLED=true
    echo "✅ Nginx is available"
else
    NGINX_INSTALLED=false
    echo "⚠️  Nginx not available, will use direct port access"
fi

if [ "$NGINX_INSTALLED" = true ]; then
    # Configure nginx
    echo ""
    echo "📝 Configuring Nginx for ecommerce.itmf.com.vn..."
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/ecommerce.itmf.com.vn > /dev/null << 'EOF'
server {
    listen 80;
    server_name ecommerce.itmf.com.vn;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend (React/Next.js) - Main ecommerce site
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # CORS headers for API
        add_header Access-Control-Allow-Origin "http://ecommerce.itmf.com.vn" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "http://ecommerce.itmf.com.vn";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # Webhook services (separate path)
    location /webhook/ {
        proxy_pass http://localhost:8081/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
    
    # Grafana monitoring (for admin access)
    location /monitoring/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
    
    # Static files and assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8080/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
EOF
    
    # Remove default nginx site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Enable our site
    sudo ln -sf /etc/nginx/sites-available/ecommerce.itmf.com.vn /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    echo "Testing nginx configuration..."
    if sudo nginx -t; then
        echo "✅ Nginx configuration is valid"
        
        # Start and enable nginx
        sudo systemctl enable nginx
        sudo systemctl restart nginx
        
        if sudo systemctl is-active nginx >/dev/null; then
            echo "✅ Nginx is running"
        else
            echo "❌ Nginx failed to start"
            sudo systemctl status nginx --no-pager
        fi
    else
        echo "❌ Nginx configuration has errors"
        NGINX_INSTALLED=false
    fi
fi

# Set up PostgreSQL (if needed for ecommerce backend)
echo ""
echo "🐘 Checking PostgreSQL..."

if command -v psql >/dev/null 2>&1; then
    echo "✅ PostgreSQL is already installed"
else
    echo "Installing PostgreSQL..."
    if sudo apt-get install -y postgresql postgresql-contrib >/dev/null 2>&1; then
        echo "✅ PostgreSQL installed"
        
        # Start PostgreSQL
        sudo systemctl enable postgresql
        sudo systemctl start postgresql
        
        # Create database and user for ecommerce
        echo "Setting up ecommerce database..."
        sudo -u postgres psql << 'EOF'
CREATE DATABASE ecommerce;
CREATE USER ecommerce_user WITH ENCRYPTED PASSWORD 'ecommerce_pass';
GRANT ALL PRIVILEGES ON DATABASE ecommerce TO ecommerce_user;
ALTER USER ecommerce_user CREATEDB;
\q
EOF
        echo "✅ PostgreSQL database setup completed"
    else
        echo "⚠️  PostgreSQL installation failed - backend might use SQLite instead"
    fi
fi

# Test the server setup
echo ""
echo "🧪 Testing Server Setup..."

# Test port accessibility
echo "Checking if ports are free..."

for port in 3000 8080 8081 3001; do
    if netstat -tuln | grep ":$port " >/dev/null 2>&1; then
        echo "⚠️  Port $port is in use"
    else
        echo "✅ Port $port is available"
    fi
done

# Create a simple test script
echo ""
echo "📝 Creating test deployment script..."

cat > ~/test-deployment.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing Deployment..."

# Test ecommerce backend
cd ~/ecommerce/ecommerce-app
echo "Starting ecommerce services..."
docker-compose up -d
sleep 15
echo "Ecommerce container status:"
docker-compose ps

# Test webhook services  
cd ~/ecommerce/webhook-service
echo "Starting webhook services..."
docker-compose up -d
sleep 15
echo "Webhook container status:"
docker-compose ps

echo ""
echo "🌐 Test these URLs in your browser:"
echo "- http://103.176.179.183:3000 (Frontend direct)"
echo "- http://103.176.179.183:8080/api/health (Backend direct)"
echo "- http://103.176.179.183:8081/health (Webhook API direct)"
if command -v nginx >/dev/null 2>&1; then
echo "- http://ecommerce.itmf.com.vn (Main domain)"
echo "- http://ecommerce.itmf.com.vn/health (Health check)"
fi
EOF

chmod +x ~/test-deployment.sh

echo "✅ Test script created at ~/test-deployment.sh"

# Final summary
echo ""
echo "🎉 Server Setup Complete!"
echo "========================"
echo ""
echo "📋 What was set up:"
echo "✅ Docker and Docker Compose (working)"
if [ "$NGINX_INSTALLED" = true ]; then
    echo "✅ Nginx (configured for ecommerce.itmf.com.vn)"
else
    echo "⚠️  Nginx (not available - using direct ports)"
fi
if command -v psql >/dev/null 2>&1; then
    echo "✅ PostgreSQL (with ecommerce database)"
else
    echo "⚠️  PostgreSQL (not installed - using SQLite)"
fi
echo "✅ Repository cloned at ~/ecommerce/"
echo "✅ Test deployment script at ~/test-deployment.sh"
echo ""
echo "🚀 Next Steps:"
echo "1. Test local deployment: ./test-deployment.sh"
echo "2. Push your code to GitHub repository"
echo "3. Set GitHub secrets:"
echo "   - SERVER_HOST: 103.176.179.183"
echo "   - SERVER_USER: [your username]"
echo "   - SERVER_PASSWORD: [your password]"
echo "4. Push to master branch to trigger CI/CD!"
echo ""
echo "🌐 Your services will be available at:"
if [ "$NGINX_INSTALLED" = true ]; then
    echo "- Main site: http://ecommerce.itmf.com.vn"
    echo "- API: http://ecommerce.itmf.com.vn/api/"
    echo "- Health: http://ecommerce.itmf.com.vn/health"
else
    echo "- Frontend: http://103.176.179.183:3000"
    echo "- Backend: http://103.176.179.183:8080"
    echo "- Webhook: http://103.176.179.183:8081"
fi
echo ""
echo "💡 Run './test-deployment.sh' to test everything now!"
