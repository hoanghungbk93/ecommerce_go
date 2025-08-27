#!/bin/bash

# =============================================================================
# Docker Diagnostic and Fix Script
# =============================================================================
# This script diagnoses and fixes Docker installation issues

set -e

echo "🔍 Docker Diagnostic and Fix Script"
echo "=================================="

# Check Docker service status
echo ""
echo "📊 Checking Docker service status..."
sudo systemctl status docker.service --no-pager || echo "Docker service is not running"

# Check Docker logs
echo ""
echo "📋 Recent Docker logs:"
sudo journalctl -u docker.service --no-pager -n 20 || echo "No Docker logs found"

# Check if dockerd binary exists and is executable
echo ""
echo "🔍 Checking Docker binary..."
if [ -f "/usr/local/bin/dockerd" ]; then
    echo "✅ Docker binary exists at /usr/local/bin/dockerd"
    ls -la /usr/local/bin/dockerd
else
    echo "❌ Docker binary not found"
fi

# Check Docker version
echo ""
echo "🔍 Checking Docker version..."
/usr/local/bin/dockerd --version 2>/dev/null || echo "❌ Cannot run dockerd --version"

# Fix common Docker issues
echo ""
echo "🔧 Applying Docker fixes..."

# 1. Stop any existing Docker processes
echo "Stopping existing Docker processes..."
sudo pkill dockerd 2>/dev/null || echo "No dockerd processes to kill"
sudo pkill docker-proxy 2>/dev/null || echo "No docker-proxy processes to kill"

# 2. Clean up Docker directories
echo "Creating Docker directories..."
sudo mkdir -p /var/lib/docker
sudo mkdir -p /var/run/docker
sudo mkdir -p /etc/docker

# 3. Create Docker daemon configuration
echo "Creating Docker daemon configuration..."
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

# 4. Fix systemd service file
echo "Fixing Docker systemd service..."
sudo tee /etc/systemd/system/docker.service > /dev/null << 'EOF'
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target docker.socket firewalld.service containerd.service
Wants=network-online.target
Requires=docker.socket containerd.service

[Service]
Type=notify
ExecStart=/usr/local/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutStartSec=0
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

# 5. Create Docker socket file
echo "Creating Docker socket configuration..."
sudo tee /etc/systemd/system/docker.socket > /dev/null << 'EOF'
[Unit]
Description=Docker Socket for the API

[Socket]
ListenStream=/var/run/docker.sock
SocketMode=0660
SocketUser=root
SocketGroup=docker

[Install]
WantedBy=sockets.target
EOF

# 6. Install containerd (required dependency)
echo "Installing containerd..."
if [ ! -f "/usr/local/bin/containerd" ]; then
    echo "Downloading containerd..."
    curl -L https://github.com/containerd/containerd/releases/download/v1.7.8/containerd-1.7.8-linux-amd64.tar.gz -o containerd.tar.gz
    sudo tar -xzf containerd.tar.gz -C /usr/local/bin/ --strip-components=1
    rm containerd.tar.gz
    echo "✅ Containerd installed"
fi

# Create containerd service
sudo tee /etc/systemd/system/containerd.service > /dev/null << 'EOF'
[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/containerd
Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=infinity
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
EOF

# 7. Reload systemd and start services
echo ""
echo "🚀 Starting Docker services..."

# Reload systemd
sudo systemctl daemon-reload

# Start containerd first
sudo systemctl enable containerd
sudo systemctl start containerd
echo "✅ Containerd started"

# Start Docker
sudo systemctl enable docker.socket
sudo systemctl start docker.socket
sudo systemctl enable docker
sudo systemctl start docker

# Wait a moment for Docker to start
sleep 5

# Check if Docker is running
echo ""
echo "🧪 Testing Docker installation..."

if sudo systemctl is-active docker >/dev/null 2>&1; then
    echo "✅ Docker service is active"
    
    # Test Docker command
    if sudo docker --version >/dev/null 2>&1; then
        echo "✅ Docker command works"
        sudo docker --version
        
        # Test basic Docker functionality
        if sudo docker info >/dev/null 2>&1; then
            echo "✅ Docker is fully functional"
            echo ""
            echo "🎉 Docker is now working!"
            echo ""
            echo "📋 Next steps:"
            echo "1. Log out and log back in: exit"
            echo "2. SSH back in: ssh YOUR_USERNAME@103.176.179.183"
            echo "3. Test: docker --version (without sudo)"
            echo "4. Push to master branch to trigger deployment"
        else
            echo "⚠️  Docker command works but Docker daemon might have issues"
            sudo docker info
        fi
    else
        echo "❌ Docker command failed"
        sudo docker --version
    fi
else
    echo "❌ Docker service failed to start"
    echo ""
    echo "📋 Debug information:"
    sudo systemctl status docker --no-pager
    echo ""
    echo "📋 Recent logs:"
    sudo journalctl -u docker --no-pager -n 10
fi

echo ""
echo "🔧 Docker fix script completed!"
