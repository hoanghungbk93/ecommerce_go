#!/bin/bash

# =============================================================================
# Minimal Server Setup Script (Bypasses Repository Issues)
# =============================================================================
# This script installs only what's needed without touching problematic repos

set -e

echo "🚀 Minimal setup for ecommerce.itmf.com.vn"
echo "🔧 Bypassing problematic repositories..."

# Check if ecommerce directory exists
if [[ ! -d "$HOME/ecommerce" ]]; then
    echo "❌ Directory ~/ecommerce not found."
    echo "📋 Run this first: git clone https://github.com/YOUR_USERNAME/ecommerce.git"
    exit 1
fi

echo "✅ Found ~/ecommerce directory"

# Clean up problematic repositories completely
echo ""
echo "🧹 Cleaning up problematic repositories..."

# Remove all problematic repository files
sudo rm -f /etc/apt/sources.list.d/pgdg* 2>/dev/null || true
sudo rm -f /etc/apt/sources.list.d/*grafana* 2>/dev/null || true
sudo rm -f /etc/apt/sources.list.d/*postgres* 2>/dev/null || true

# Clear apt cache
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*

echo "✅ Cleaned up problematic repositories"

# Install Docker using snap (most reliable method)
echo ""
echo "🐳 Installing Docker via snap (most reliable)..."

if ! command -v docker &> /dev/null; then
    sudo apt-get update -o Dir::Etc::sourcelist="sources.list.d/ubuntu.list" \
                        -o Dir::Etc::sourceparts="-" \
                        -o APT::Get::List-Cleanup="0"
    
    sudo apt-get install -y snapd
    sudo snap install docker
    
    # Add user to docker group
    sudo groupadd docker 2>/dev/null || true
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed via snap"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose directly
echo ""
echo "🐳 Installing Docker Compose..."

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create symlinks
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
sudo ln -sf /snap/bin/docker /usr/bin/docker 2>/dev/null || true

echo "✅ Docker Compose installed"

# Install nginx using default repositories only
echo ""
echo "🌐 Installing and configuring Nginx..."

# Update only from default Ubuntu repositories
sudo apt-get update -o Dir::Etc::sourcelist="sources.list" \
                    -o Dir::Etc::sourceparts="-" \
                    -o APT::Get::List-Cleanup="0"

sudo apt-get install -y nginx

echo "✅ Nginx installed"

# Create nginx configuration
echo ""
echo "📝 Creating nginx configuration..."

sudo tee /etc/nginx/sites-available/ecommerce.itmf.com.vn > /dev/null << 'EOF'
server {
    listen 80;
    server_name ecommerce.itmf.com.vn;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend (React/Next.js)
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
        
        # CORS headers
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
    
    # Webhook services
    location /webhook/ {
        proxy_pass http://localhost:8081/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
    
    # Monitoring
    location /monitoring/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:8080/api/health;
        access_log off;
    }
}
EOF

# Remove default site and enable our site
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/ecommerce.itmf.com.vn /etc/nginx/sites-enabled/

# Test and start nginx
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "✅ Nginx configured and started"

# Test installations
echo ""
echo "🧪 Testing installations..."

# Test docker (with sudo first time)
echo "Docker version:"
sudo /snap/bin/docker --version 2>/dev/null || sudo docker --version

echo "Docker Compose version:"
docker-compose --version

echo "Nginx status:"
sudo systemctl is-active nginx

echo ""
echo "🎉 Minimal setup complete!"
echo ""
echo "📋 What was installed:"
echo "✅ Docker (via snap - most reliable)"
echo "✅ Docker Compose (direct download)"
echo "✅ Nginx (from default repos)"
echo "✅ Domain configuration for ecommerce.itmf.com.vn"
echo ""
echo "⚠️  CRITICAL: You MUST restart your SSH session!"
echo "Run: exit"
echo "Then: ssh YOUR_USERNAME@103.176.179.183"
echo ""
echo "🚀 After restarting SSH, test Docker:"
echo "docker --version"
echo ""
echo "Then push to master branch to trigger deployment!"
echo ""
echo "🌐 Your site will be available at:"
echo "- http://ecommerce.itmf.com.vn"
echo "- http://ecommerce.itmf.com.vn/api/health"
