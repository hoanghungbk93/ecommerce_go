#!/bin/bash

# =============================================================================
# PostgreSQL Configuration Fix for Docker Containers
# =============================================================================

set -e

echo "🐘 Fixing PostgreSQL Configuration for Docker Containers"
echo "======================================================="

# Check PostgreSQL status
echo ""
echo "🔍 Checking PostgreSQL status..."
if sudo systemctl is-active postgresql >/dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running. Starting it..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Find PostgreSQL version and config path
echo ""
echo "🔍 Finding PostgreSQL configuration..."
PG_VERSION=$(sudo -u postgres psql -c "SHOW server_version;" | grep -oE '[0-9]+\.[0-9]+' | head -1)
echo "PostgreSQL version: $PG_VERSION"

# Common config paths
PG_CONFIG_PATHS=(
    "/etc/postgresql/$PG_VERSION/main/postgresql.conf"
    "/var/lib/postgresql/data/postgresql.conf"
    "/usr/local/pgsql/data/postgresql.conf"
)

PG_HBA_PATHS=(
    "/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    "/var/lib/postgresql/data/pg_hba.conf"
    "/usr/local/pgsql/data/pg_hba.conf"
)

# Find actual config files
PG_CONFIG=""
PG_HBA=""

for path in "${PG_CONFIG_PATHS[@]}"; do
    if [ -f "$path" ]; then
        PG_CONFIG="$path"
        break
    fi
done

for path in "${PG_HBA_PATHS[@]}"; do
    if [ -f "$path" ]; then
        PG_HBA="$path"
        break
    fi
done

if [ -z "$PG_CONFIG" ] || [ -z "$PG_HBA" ]; then
    echo "❌ Could not find PostgreSQL config files"
    echo "Searching for config files..."
    sudo find /etc /var -name "postgresql.conf" 2>/dev/null || echo "postgresql.conf not found"
    sudo find /etc /var -name "pg_hba.conf" 2>/dev/null || echo "pg_hba.conf not found"
    exit 1
fi

echo "✅ Found PostgreSQL config: $PG_CONFIG"
echo "✅ Found pg_hba.conf: $PG_HBA"

# Backup config files
echo ""
echo "💾 Creating backups..."
sudo cp "$PG_CONFIG" "$PG_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$PG_HBA" "$PG_HBA.backup.$(date +%Y%m%d_%H%M%S)"

# Configure PostgreSQL to accept connections
echo ""
echo "🔧 Configuring PostgreSQL..."

# Update postgresql.conf
echo "Updating postgresql.conf..."
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONFIG"
sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONFIG"

# Check if port is configured correctly
if ! sudo grep -q "^port = 5432" "$PG_CONFIG"; then
    echo "Setting port to 5432..."
    sudo sed -i "s/#port = 5432/port = 5432/" "$PG_CONFIG"
fi

# Update pg_hba.conf to allow connections
echo "Updating pg_hba.conf..."

# Remove existing Docker-related entries
sudo sed -i '/# Docker containers/d' "$PG_HBA"
sudo sed -i '/host.*all.*all.*172\.17\.0\.0\/16/d' "$PG_HBA"
sudo sed -i '/host.*all.*all.*172\.18\.0\.0\/16/d' "$PG_HBA"

# Add new entries for Docker containers
echo "# Docker containers" | sudo tee -a "$PG_HBA" >/dev/null
echo "host    all             all             172.17.0.0/16           md5" | sudo tee -a "$PG_HBA" >/dev/null
echo "host    all             all             172.18.0.0/16           md5" | sudo tee -a "$PG_HBA" >/dev/null
echo "host    all             all             127.0.0.1/32            md5" | sudo tee -a "$PG_HBA" >/dev/null
echo "host    all             all             localhost               md5" | sudo tee -a "$PG_HBA" >/dev/null

# Create or update user and database
echo ""
echo "👤 Setting up database user and database..."

# Set password for PostgreSQL commands
export PGPASSWORD="hoanghungbk"

# Create user if not exists
sudo -u postgres psql -c "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'odoo16') THEN
        CREATE USER odoo16 WITH PASSWORD 'hoanghungbk';
    END IF;
END
\$\$;
"

# Grant privileges
sudo -u postgres psql -c "ALTER USER odoo16 CREATEDB;"
sudo -u postgres psql -c "ALTER USER odoo16 WITH SUPERUSER;"

# Create database if not exists
sudo -u postgres psql -c "
SELECT 'CREATE DATABASE ecommerce OWNER odoo16'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ecommerce')\gexec
"

# Restart PostgreSQL
echo ""
echo "🔄 Restarting PostgreSQL..."
sudo systemctl restart postgresql

# Wait for PostgreSQL to start
sleep 5

# Test connections
echo ""
echo "🧪 Testing connections..."

echo "Testing local connection..."
if psql -h localhost -U odoo16 -d ecommerce -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Local connection successful"
else
    echo "❌ Local connection failed"
fi

echo "Testing from Docker network..."
if docker run --rm postgres:13 psql -h 172.17.0.1 -U odoo16 -d ecommerce -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Docker network connection successful"
else
    echo "❌ Docker network connection failed"
fi

# Show final configuration
echo ""
echo "📋 Final configuration:"
echo "Listen addresses:"
sudo grep "listen_addresses" "$PG_CONFIG"
echo ""
echo "Port:"
sudo grep "^port" "$PG_CONFIG"
echo ""
echo "Authentication (last 5 lines):"
sudo tail -5 "$PG_HBA"

echo ""
echo "✅ PostgreSQL configuration completed!"
echo ""
echo "🚀 Now restart your Docker containers:"
echo "cd ~/ecommerce/ecommerce-app"
echo "docker-compose down"
echo "docker-compose up -d"

# Cleanup
unset PGPASSWORD
