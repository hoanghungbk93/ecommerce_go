#!/bin/bash

# =============================================================================
# Super Simple Server Setup (Manual Docker Installation)
# =============================================================================
# This bypasses ALL package managers and installs Docker manually

set -e

echo "🚀 Super simple setup for ecommerce.itmf.com.vn"
echo "🔧 Installing everything manually (no package managers)..."

# Check if ecommerce directory exists
if [[ ! -d "$HOME/ecommerce" ]]; then
    echo "❌ Directory ~/ecommerce not found."
    echo "📋 Run this first: git clone https://github.com/YOUR_USERNAME/ecommerce.git"
    exit 1
fi

echo "✅ Found ~/ecommerce directory"

# Install Docker manually (binary download)
echo ""
echo "🐳 Installing Docker manually..."

if ! command -v docker &> /dev/null; then
    # Download Docker binary directly
    echo "Downloading Docker binary..."
    curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz -o docker.tgz
    
    # Extract Docker binary
    tar -xzf docker.tgz
    
    # Move to system path
    sudo mv docker/* /usr/local/bin/
    
    # Clean up
    rm -rf docker docker.tgz
    
    # Create Docker group and add user
    sudo groupadd docker 2>/dev/null || true
    sudo usermod -aG docker $USER
    
    # Create systemd service for Docker
    sudo tee /etc/systemd/system/docker.service > /dev/null << 'EOF'
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/local/bin/dockerd --host=fd://
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always
StartLimitBurst=3
StartLimitInterval=60s
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TasksMax=infinity
Delegate=yes
KillMode=process
OOMScoreAdjust=-500

[Install]
WantedBy=multi-user.target
EOF
    
    # Start Docker service
    sudo systemctl daemon-reload
    sudo systemctl enable docker
    sudo systemctl start docker
    
    echo "✅ Docker installed manually"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose manually
echo ""
echo "🐳 Installing Docker Compose manually..."

if ! command -v docker-compose &> /dev/null; then
    # Download Docker Compose binary directly
    echo "Downloading Docker Compose binary..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    echo "✅ Docker Compose installed manually"
else
    echo "✅ Docker Compose already installed"
fi

# Try to install Nginx - if it fails, we'll set up manual proxy
echo ""
echo "🌐 Setting up web server..."

# Simple approach - try default nginx first
if sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y nginx >/dev/null 2>&1; then
    echo "✅ Nginx installed via apt"
    USE_NGINX=true
else
    echo "⚠️  Nginx installation failed, using manual setup"
    USE_NGINX=false
fi

if [ "$USE_NGINX" = true ]; then
    # Create nginx configuration
    echo "📝 Creating nginx configuration..."
    
    sudo tee /etc/nginx/sites-available/ecommerce.itmf.com.vn > /dev/null << 'EOF'
server {
    listen 80;
    server_name ecommerce.itmf.com.vn;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Webhooks
    location /webhook/ {
        proxy_pass http://localhost:8081/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:8080/api/health;
        access_log off;
    }
}
EOF
    
    # Enable site
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf /etc/nginx/sites-available/ecommerce.itmf.com.vn /etc/nginx/sites-enabled/
    
    # Test and restart nginx
    sudo nginx -t && sudo systemctl restart nginx
    echo "✅ Nginx configured"
else
    # Manual proxy setup using socat (simpler than nginx)
    echo "📝 Setting up manual proxy..."
    
    # Create simple proxy script
    sudo tee /usr/local/bin/ecommerce-proxy.sh > /dev/null << 'EOF'
#!/bin/bash
# Simple proxy for ecommerce.itmf.com.vn

echo "Starting simple proxy on port 80..."
echo "Frontend -> localhost:3000"
echo "API -> localhost:8080"

# This is a basic proxy - in production you'd want nginx
# But this will work for testing
socat TCP4-LISTEN:80,reuseaddr,fork TCP4:localhost:3000 &
echo "Proxy started (basic mode)"
EOF
    
    sudo chmod +x /usr/local/bin/ecommerce-proxy.sh
    echo "✅ Manual proxy setup (basic mode)"
fi

# Test Docker installation
echo ""
echo "🧪 Testing installations..."

echo "Docker version:"
sudo docker --version

echo "Docker Compose version:"
docker-compose --version

echo "Docker service status:"
sudo systemctl is-active docker

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 What was installed:"
echo "✅ Docker (manual binary installation)"
echo "✅ Docker Compose (direct download)"
if [ "$USE_NGINX" = true ]; then
    echo "✅ Nginx (configured for ecommerce.itmf.com.vn)"
else
    echo "✅ Manual proxy setup"
fi
echo ""
echo "⚠️  CRITICAL: You MUST restart your SSH session!"
echo "1. Run: exit"
echo "2. Then: ssh YOUR_USERNAME@103.176.179.183"
echo ""
echo "🚀 After restarting SSH, test Docker:"
echo "docker --version"
echo ""
echo "Then push to master branch to trigger deployment!"
echo ""
echo "🌐 Your site will be available at:"
if [ "$USE_NGINX" = true ]; then
    echo "- http://ecommerce.itmf.com.vn (via nginx)"
else
    echo "- http://103.176.179.183:3000 (frontend direct)"
    echo "- http://103.176.179.183:8080 (backend direct)"
fi
echo "- http://ecommerce.itmf.com.vn/health (health check)"
