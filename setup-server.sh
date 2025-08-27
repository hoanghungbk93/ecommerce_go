#!/bin/bash

# =============================================================================
# Server Setup Script for ecommerce.itmf.com.vn
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

# Install Docker if not already installed
echo ""
echo "🐳 Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "⚠️  Please log out and log back in for Docker permissions to take effect"
else
    echo "✅ Docker is already installed"
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "✅ Docker Compose is already installed"
fi

# Setup Nginx configuration
echo ""
echo "🌐 Setting up Nginx configuration..."

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

# Enable the site
echo "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/ecommerce.itmf.com.vn /etc/nginx/sites-enabled/

# Test nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Reload nginx
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "🎉 Server setup complete!"
echo ""
echo "📋 Directory structure:"
echo "~/ecommerce/"
echo "├── ecommerce-app/ ✅"
echo "└── webhook-service/ ✅"
echo ""
echo "🔧 Next steps:"
echo "1. ✅ Repository cloned"
echo "2. ✅ Docker and Docker Compose installed"
echo "3. ✅ Nginx configured for ecommerce.itmf.com.vn"
echo "4. Now push to master branch to trigger automatic deployment!"
echo ""
echo "🌐 Your site will be available at:"
echo "- Main site: http://ecommerce.itmf.com.vn"
echo "- API: http://ecommerce.itmf.com.vn/api/"
echo "- Webhooks: http://ecommerce.itmf.com.vn/webhook/"
echo "- Monitoring: http://ecommerce.itmf.com.vn/monitoring/"
echo ""
echo "💡 To add SSL later, run: sudo certbot --nginx -d ecommerce.itmf.com.vn"
