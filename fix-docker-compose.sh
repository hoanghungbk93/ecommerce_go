#!/bin/bash

# =============================================================================
# Docker Compose Fix Script
# =============================================================================
# This script fixes Docker Compose installation issues

set -e

echo "🐳 Fixing Docker Compose..."
echo "============================"

# Check current Docker Compose status
echo ""
echo "🔍 Checking current Docker Compose status..."

if command -v docker-compose >/dev/null 2>&1; then
    echo "📋 Docker Compose binary exists"
    echo "Version check:"
    docker-compose --version || echo "❌ Docker Compose version check failed"
else
    echo "❌ Docker Compose binary not found"
fi

# Remove any existing broken installations
echo ""
echo "🧹 Cleaning up existing Docker Compose installations..."

# Remove various possible locations
sudo rm -f /usr/local/bin/docker-compose 2>/dev/null || true
sudo rm -f /usr/bin/docker-compose 2>/dev/null || true
sudo rm -f /bin/docker-compose 2>/dev/null || true

echo "✅ Cleanup completed"

# Install Docker Compose v2 (newer version)
echo ""
echo "📥 Installing Docker Compose v2..."

# Method 1: Try installing Docker Compose v2 plugin
if docker --version >/dev/null 2>&1; then
    echo "Installing Docker Compose plugin..."
    
    # Create docker plugins directory
    mkdir -p ~/.docker/cli-plugins/
    
    # Download Docker Compose v2
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
    chmod +x ~/.docker/cli-plugins/docker-compose
    
    # Test Docker Compose v2
    if docker compose version >/dev/null 2>&1; then
        echo "✅ Docker Compose v2 plugin installed successfully"
        echo "Version:"
        docker compose version
        
        # Create compatibility symlink for 'docker-compose' command
        sudo ln -sf ~/.docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
        
        echo "✅ Created compatibility symlink for docker-compose command"
        COMPOSE_V2_SUCCESS=true
    else
        echo "❌ Docker Compose v2 plugin installation failed"
        COMPOSE_V2_SUCCESS=false
    fi
else
    echo "❌ Docker not available, cannot install plugin"
    COMPOSE_V2_SUCCESS=false
fi

# Method 2: Install standalone Docker Compose v1 (fallback)
if [ "$COMPOSE_V2_SUCCESS" != true ]; then
    echo ""
    echo "📥 Installing standalone Docker Compose v1..."
    
    # Download standalone Docker Compose
    COMPOSE_VERSION="1.29.2"
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # Make it executable
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    echo "✅ Standalone Docker Compose v1 installed"
fi

# Test final installation
echo ""
echo "🧪 Testing Docker Compose installation..."

# Test both methods
echo "Testing 'docker compose' command (v2 style):"
if docker compose version >/dev/null 2>&1; then
    echo "✅ 'docker compose' works"
    docker compose version
    COMPOSE_WORKS=true
else
    echo "❌ 'docker compose' failed"
    COMPOSE_WORKS=false
fi

echo ""
echo "Testing 'docker-compose' command (v1 style):"
if docker-compose --version >/dev/null 2>&1; then
    echo "✅ 'docker-compose' works"
    docker-compose --version
    COMPOSE_WORKS=true
else
    echo "❌ 'docker-compose' failed"
fi

# Manual installation as last resort
if [ "$COMPOSE_WORKS" != true ]; then
    echo ""
    echo "🔧 Manual installation attempt..."
    
    # Try direct binary installation
    curl -L https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-linux-x86_64 -o docker-compose
    sudo mv docker-compose /usr/local/bin/
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Test again
    if /usr/local/bin/docker-compose --version >/dev/null 2>&1; then
        echo "✅ Manual installation successful"
        /usr/local/bin/docker-compose --version
        
        # Create symlinks
        sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
        COMPOSE_WORKS=true
    else
        echo "❌ Manual installation failed"
    fi
fi

# Create a wrapper script as final fallback
if [ "$COMPOSE_WORKS" != true ]; then
    echo ""
    echo "🔧 Creating wrapper script as fallback..."
    
    # Create a simple wrapper that uses 'docker compose' if available
    sudo tee /usr/local/bin/docker-compose > /dev/null << 'EOF'
#!/bin/bash
# Docker Compose wrapper script

# Try docker compose first (v2)
if docker compose version >/dev/null 2>&1; then
    exec docker compose "$@"
fi

# If that fails, show error
echo "❌ Docker Compose not available"
echo "Please install Docker Compose manually"
exit 1
EOF
    
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    echo "✅ Wrapper script created"
fi

# Final test and summary
echo ""
echo "📊 Final Status Check..."
echo "======================="

# Check what works
echo ""
if docker compose version >/dev/null 2>&1; then
    echo "✅ 'docker compose' command works:"
    docker compose version
    FINAL_STATUS="SUCCESS"
elif docker-compose --version >/dev/null 2>&1; then
    echo "✅ 'docker-compose' command works:"
    docker-compose --version
    FINAL_STATUS="SUCCESS"
else
    echo "❌ Neither Docker Compose command works"
    FINAL_STATUS="FAILED"
fi

echo ""
if [ "$FINAL_STATUS" = "SUCCESS" ]; then
    echo "🎉 Docker Compose is now working!"
    echo ""
    echo "📋 You can use either:"
    echo "  - docker compose (v2 style)"
    echo "  - docker-compose (v1 style)"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Test with a simple docker-compose.yml"
    echo "2. Run the finalize-server.sh script"
    echo "3. Set up your CI/CD pipeline"
else
    echo "❌ Docker Compose installation failed"
    echo ""
    echo "🔧 Manual steps to try:"
    echo "1. Check Docker installation: docker --version"
    echo "2. Try: sudo apt-get install docker-compose-plugin"
    echo "3. Or manually download and install Docker Compose"
fi

echo ""
echo "🔧 Docker Compose fix script completed!"
