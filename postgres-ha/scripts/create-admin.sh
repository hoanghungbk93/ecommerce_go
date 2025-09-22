#!/bin/bash
set -e

echo "=== Creating Admin User and Test Database ==="

# Get HAProxy IP
if [ -f "../terraform/terraform.tfstate" ]; then
    HAPROXY_IP=$(cd terraform && terraform output -raw haproxy_public_ip)
else
    STACK_NAME=${STACK_NAME:-postgres-ha-cluster}
    REGION=${REGION:-us-west-2}
    HAPROXY_IP=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`HAProxyPublicIP`].OutputValue' --output text)
fi

echo "HAProxy IP: $HAPROXY_IP"
echo ""

# Create admin user and databases
echo "1. Creating admin user and databases..."
PGPASSWORD=secret psql -h $HAPROXY_IP -p 5432 -U postgres -d postgres << EOF
-- Create admin user
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin WITH LOGIN PASSWORD 'admin123' CREATEDB CREATEROLE;
    END IF;
END
\$\$;

-- Create odoo database for production use
SELECT 'CREATE DATABASE odoo OWNER admin' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'odoo');
\gexec

-- Create test database
SELECT 'CREATE DATABASE test_db OWNER admin' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'test_db');
\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE odoo TO admin;
GRANT ALL PRIVILEGES ON DATABASE test_db TO admin;

-- List databases
\l
EOF

echo "✅ Admin user and databases created successfully"
echo ""

# Test admin connection
echo "2. Testing admin user connection..."
PGPASSWORD=admin123 psql -h $HAPROXY_IP -p 5432 -U admin -d odoo << EOF
-- Create sample table
CREATE TABLE IF NOT EXISTS test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO test_table (name) VALUES ('Sample data 1'), ('Sample data 2');

-- Query data
SELECT * FROM test_table;
EOF

echo "✅ Admin user connection test successful"
echo ""

echo "=== Admin Setup Complete ==="
echo "📋 Connection Information:"
echo "   Database Host: $HAPROXY_IP:5432"
echo "   Admin User: admin / admin123"
echo "   Superuser: postgres / secret"
echo "   Odoo Database: odoo"
echo "   Test Database: test_db"
echo ""
echo "🔗 Connection Strings:"
echo "   For Odoo: postgresql://admin:admin123@$HAPROXY_IP:5432/odoo"
echo "   For Testing: postgresql://admin:admin123@$HAPROXY_IP:5432/test_db"
echo "   Superuser: postgresql://postgres:secret@$HAPROXY_IP:5432/postgres"
echo ""
echo "📊 HAProxy Stats: http://$HAPROXY_IP:8404/stats (admin/admin)"