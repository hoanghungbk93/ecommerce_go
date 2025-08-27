#!/bin/bash

# =============================================================================
# Production Database Setup Script
# =============================================================================
# This script sets up the ecommerce database for production

set -e

echo "🐘 Setting up Ecommerce Database"
echo "================================"

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="odoo16"
DB_PASSWORD="hoanghungbk"
DB_NAME="ecommerce"

echo "📋 Database Configuration:"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"
echo "Database: $DB_NAME"

# Check if PostgreSQL is running
echo ""
echo "🔍 Checking PostgreSQL status..."
if sudo systemctl is-active postgresql >/dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    if sudo systemctl is-active postgresql >/dev/null 2>&1; then
        echo "✅ PostgreSQL started"
    else
        echo "❌ Failed to start PostgreSQL"
        exit 1
    fi
fi

# Test database connection
echo ""
echo "🔧 Testing database connection..."
export PGPASSWORD="$DB_PASSWORD"

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Check if user '$DB_USER' exists:"
    echo "   sudo -u postgres psql -c \"\\du\""
    echo ""
    echo "2. Create the user if it doesn't exist:"
    echo "   sudo -u postgres createuser -s $DB_USER"
    echo "   sudo -u postgres psql -c \"ALTER USER $DB_USER PASSWORD '$DB_PASSWORD';\""
    echo ""
    echo "3. Check PostgreSQL authentication settings in pg_hba.conf"
    exit 1
fi

# Check if ecommerce database exists
echo ""
echo "📊 Checking if ecommerce database exists..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "📝 Creating database '$DB_NAME'..."
    if createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"; then
        echo "✅ Database '$DB_NAME' created successfully"
    else
        echo "❌ Failed to create database '$DB_NAME'"
        echo ""
        echo "🔧 Manual creation command:"
        echo "createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME"
        exit 1
    fi
fi

# Test connection to the ecommerce database
echo ""
echo "🧪 Testing connection to ecommerce database..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT current_database(), current_user;" >/dev/null 2>&1; then
    echo "✅ Successfully connected to ecommerce database"
else
    echo "❌ Failed to connect to ecommerce database"
    exit 1
fi

# Show database info
echo ""
echo "📋 Database Information:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    current_database() as database_name,
    current_user as connected_user,
    version() as postgresql_version;
"

echo ""
echo "✅ Database setup completed!"
echo ""
echo "📋 Connection details for your application:"
echo "DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME?sslmode=disable"
echo ""
echo "🚀 Next steps:"
echo "1. Your Docker containers should now be able to connect to the database"
echo "2. Run: cd ~/ecommerce/ecommerce-app && docker-compose up -d"
echo "3. Check logs: docker-compose logs backend"

# Cleanup
unset PGPASSWORD
