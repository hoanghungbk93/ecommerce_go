#!/bin/bash

# =============================================================================
# Fixed Server Setup Script for ecommerce.itmf.com.vn (Ubuntu 20.04)
# =============================================================================
# Run this script on your server (103.176.179.183) to set up the projects

set -e

echo "🚀 Setting up ecommerce projects on server 103.176.179.183..."
echo "🌐 Domain: ecommerce.itmf.com.vn"

echo ""
echo "⚠️  IMPORTANT: You need to clone your repository FIRST!"
echo "📋 Run this command BEFORE running this script:"
echo ""
echo "cd ~"
echo "git clone https://github.com/YOUR_USERNAME/ecommerce.git"
echo ""
echo "Replace YOUR_USERNAME with your actual GitHub username!"
echo "This will create ~/ecommerce/ with both ecommerce-app/ and webhook-service/ inside."
echo ""
read -p "Have you already cloned the repository? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please clone the repository first and then run this script again."
    exit 1
fi

# Check if ecommerce directory exists
if [[ ! -d "$HOME/ecommerce" ]]; then
    echo "❌ Directory ~/ecommerce not found. Please clone the repository first."
    exit 1
fi

echo "✅ Found ~/ecommerce directory"

# Fix repository issues for Ubuntu 20.04
echo ""
echo "🔧 Fixing Ubuntu 20.04 repository issues..."

# Remove problematic PostgreSQL repository
sudo rm -f /etc/apt/sources.list.d/pgdg.list* 2>/dev/null || true

# Fix Grafana repository key
echo "Fixing Grafana repository key..."
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add - 2>/dev/null || true

# Update package list
echo "Updating package list..."
sudo apt-get update -qq 2>/dev/null || {
    echo "⚠️  Some repository updates failed, but continuing..."
}

# Install Docker manually instead of using the official script
echo ""
echo "🐳 Installing Docker for Ubuntu 20.04..."

# Remove any existing Docker installations
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install prerequisites
sudo apt-get update -qq
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package list
sudo apt-get update -qq

# Install Docker Engine
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

echo "✅ Docker installed successfully"

# Install Docker Compose (standalone version for compatibility)
echo ""
echo "🐳 Installing Docker Compose..."

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create symlink for docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

echo "✅ Docker Compose installed successfully"

# Test Docker installation
echo ""
echo "🧪 Testing Docker installation..."
sudo docker --version
docker-compose --version

# Setup Nginx configuration
echo ""
echo "🌐 Setting up Nginx configuration..."

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt-get install -y nginx
fi

# Create nginx config for the domain
sudo tee /etc/nginx/sites-available/ecommerce.itmf.com.vn > /dev/null << 'EOF'
server {
    listen 80;
    server_name ecommerce.itmf.com.vn;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend (Next.js) - Main ecommerce site
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

# Enable the site
echo "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/ecommerce.itmf.com.vn /etc/nginx/sites-enabled/

# Test nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Reload nginx
echo "Reloading Nginx..."
sudo systemctl reload nginx

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo ""
echo "🎉 Server setup complete!"
echo ""
echo "📋 Directory structure:"
echo "~/ecommerce/"
echo "├── ecommerce-app/ ✅"
echo "└── webhook-service/ ✅"
echo ""
echo "🔧 What was set up:"
echo "1. ✅ Repository found and verified"
echo "2. ✅ Ubuntu 20.04 repository issues fixed"
echo "3. ✅ Docker and Docker Compose installed"
echo "4. ✅ Nginx configured for ecommerce.itmf.com.vn"
echo "5. ✅ All services enabled"
echo ""
echo "⚠️  IMPORTANT: You need to log out and log back in for Docker permissions!"
echo ""
echo "🚀 Next steps:"
echo "1. Log out and log back in (for Docker group permissions)"
echo "2. Push to master branch to trigger automatic deployment"
echo ""
echo "🌐 Your site will be available at:"
echo "- Main site: http://ecommerce.itmf.com.vn"
echo "- API: http://ecommerce.itmf.com.vn/api/"
echo "- Health check: http://ecommerce.itmf.com.vn/health"
echo ""
echo "💡 To add SSL later, run: sudo certbot --nginx -d ecommerce.itmf.com.vn"
