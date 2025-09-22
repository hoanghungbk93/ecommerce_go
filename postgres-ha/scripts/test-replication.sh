#!/bin/bash
set -e

echo "=== PostgreSQL Replication Test ==="

# Get HAProxy IP from terraform or CloudFormation
if [ -f "../terraform/terraform.tfstate" ]; then
    HAPROXY_IP=$(cd terraform && terraform output -raw haproxy_public_ip)
    POSTGRES1_IP=$(cd terraform && terraform output -raw postgres_node1_public_ip)
    POSTGRES2_IP=$(cd terraform && terraform output -raw postgres_node2_public_ip)
else
    STACK_NAME=${STACK_NAME:-postgres-ha-cluster}
    REGION=${REGION:-us-west-2}
    HAPROXY_IP=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`HAProxyPublicIP`].OutputValue' --output text)
    POSTGRES1_IP=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`PostgreSQLNode1PublicIP`].OutputValue' --output text)
    POSTGRES2_IP=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`PostgreSQLNode2PublicIP`].OutputValue' --output text)
fi

SSH_KEY=${SSH_KEY_PATH:-~/.ssh/postgres-ha-key}

echo "Testing PostgreSQL HA cluster replication..."
echo "HAProxy IP: $HAPROXY_IP"
echo "Postgres Node 1: $POSTGRES1_IP"
echo "Postgres Node 2: $POSTGRES2_IP"
echo ""

# Test 1: Connect to HAProxy and create test data
echo "1. Creating test data through HAProxy..."
PGPASSWORD=secret psql -h $HAPROXY_IP -p 5432 -U postgres -d postgres << EOF
-- Create test database if it doesn't exist
SELECT 'CREATE DATABASE replication_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'replication_test');
\gexec

-- Connect to test database
\c replication_test

-- Create test table
DROP TABLE IF EXISTS test_replication;
CREATE TABLE test_replication (
    id SERIAL PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test data
INSERT INTO test_replication (data) VALUES
    ('Test data 1'),
    ('Test data 2'),
    ('Test data 3');

-- Show current primary
SELECT inet_server_addr() as server_ip, COUNT(*) as record_count FROM test_replication;
EOF

echo "✅ Test data created successfully"
echo ""

# Test 2: Wait for replication and verify on both nodes
echo "2. Waiting for replication (5 seconds)..."
sleep 5

echo "3. Verifying replication on PostgreSQL nodes directly..."

# Check Node 1
echo "Checking Node 1 ($POSTGRES1_IP):"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP << 'EOF'
sudo -u postgres psql -d replication_test -c "SELECT inet_server_addr() as server_ip, COUNT(*) as record_count FROM test_replication;" 2>/dev/null || echo "Database not accessible on this node"
EOF

echo ""

# Check Node 2
echo "Checking Node 2 ($POSTGRES2_IP):"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES2_IP << 'EOF'
sudo -u postgres psql -d replication_test -c "SELECT inet_server_addr() as server_ip, COUNT(*) as record_count FROM test_replication;" 2>/dev/null || echo "Database not accessible on this node"
EOF

echo ""

# Test 3: Check Patroni cluster status
echo "4. Checking Patroni cluster status..."
echo "Node 1 status:"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP << 'EOF'
curl -s http://localhost:8008/cluster | jq . 2>/dev/null || curl -s http://localhost:8008/cluster
EOF

echo ""
echo "Node 2 status:"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES2_IP << 'EOF'
curl -s http://localhost:8008/cluster | jq . 2>/dev/null || curl -s http://localhost:8008/cluster
EOF

echo ""

# Test 4: Check HAProxy stats
echo "5. Checking HAProxy backend status..."
curl -s http://$HAPROXY_IP:8404/stats | grep -A 10 "postgres_primary" || echo "Could not retrieve HAProxy stats"

echo ""
echo "=== Replication Test Complete ==="
echo "✅ If you see data on both nodes, replication is working correctly!"
echo "💡 You can also check the HAProxy stats page at: http://$HAPROXY_IP:8404/stats"