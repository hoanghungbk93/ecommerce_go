#!/bin/bash
set -e

echo "=== PostgreSQL Failover Test ==="

# Get IPs
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

echo "Testing PostgreSQL HA failover..."
echo "HAProxy IP: $HAPROXY_IP"
echo "Postgres Node 1: $POSTGRES1_IP"
echo "Postgres Node 2: $POSTGRES2_IP"
echo ""

# Function to get current primary
get_primary() {
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP 'curl -s http://localhost:8008/cluster | jq -r ".members[] | select(.role == \"Leader\") | .name"' 2>/dev/null || \
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES2_IP 'curl -s http://localhost:8008/cluster | jq -r ".members[] | select(.role == \"Leader\") | .name"' 2>/dev/null || \
    echo "unknown"
}

# Function to check cluster status
check_cluster_status() {
    echo "Current cluster status:"
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP << 'EOF'
echo "Node 1 status:"
curl -s http://localhost:8008/patroni | jq -r '.role // "unknown"'
EOF

    ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES2_IP << 'EOF'
echo "Node 2 status:"
curl -s http://localhost:8008/patroni | jq -r '.role // "unknown"'
EOF
    echo ""
}

# Step 1: Check initial state
echo "1. Checking initial cluster state..."
check_cluster_status

INITIAL_PRIMARY=$(get_primary)
echo "Current primary: $INITIAL_PRIMARY"
echo ""

# Step 2: Create test data before failover
echo "2. Creating test data before failover..."
PGPASSWORD=secret psql -h $HAPROXY_IP -p 5432 -U postgres -d postgres << EOF
\c replication_test
INSERT INTO test_replication (data) VALUES ('Before failover - $(date)');
SELECT COUNT(*) as total_records FROM test_replication;
EOF
echo ""

# Step 3: Simulate failover by stopping the primary
echo "3. Simulating failover by stopping the current primary PostgreSQL..."
if [ "$INITIAL_PRIMARY" = "postgres-node1" ]; then
    FAILOVER_NODE=$POSTGRES1_IP
    REMAINING_NODE=$POSTGRES2_IP
    echo "Stopping PostgreSQL on Node 1..."
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP 'sudo systemctl stop patroni'
else
    FAILOVER_NODE=$POSTGRES2_IP
    REMAINING_NODE=$POSTGRES1_IP
    echo "Stopping PostgreSQL on Node 2..."
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES2_IP 'sudo systemctl stop patroni'
fi

echo "✅ Primary node stopped"
echo ""

# Step 4: Wait for failover
echo "4. Waiting for automatic failover (30 seconds)..."
for i in {1..30}; do
    echo -n "."
    sleep 1
done
echo ""

# Step 5: Check new cluster state
echo "5. Checking cluster state after failover..."
check_cluster_status

NEW_PRIMARY=$(get_primary)
echo "New primary: $NEW_PRIMARY"
echo ""

# Step 6: Test connectivity through HAProxy
echo "6. Testing connectivity through HAProxy after failover..."
PGPASSWORD=secret psql -h $HAPROXY_IP -p 5432 -U postgres -d postgres << EOF
\c replication_test
INSERT INTO test_replication (data) VALUES ('After failover - $(date)');
SELECT COUNT(*) as total_records FROM test_replication;
SELECT data FROM test_replication ORDER BY created_at DESC LIMIT 5;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Connection successful after failover!"
else
    echo "❌ Connection failed after failover"
fi
echo ""

# Step 7: Restart the failed node
echo "7. Restarting the failed node..."
if [ "$INITIAL_PRIMARY" = "postgres-node1" ]; then
    echo "Restarting Patroni on Node 1..."
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP 'sudo systemctl start patroni'
else
    echo "Restarting Patroni on Node 2..."
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES2_IP 'sudo systemctl start patroni'
fi

echo "Waiting for node to rejoin cluster (20 seconds)..."
sleep 20

# Step 8: Final cluster state
echo "8. Final cluster state..."
check_cluster_status

FINAL_PRIMARY=$(get_primary)
echo "Final primary: $FINAL_PRIMARY"
echo ""

# Step 9: Test final connectivity
echo "9. Final connectivity test..."
PGPASSWORD=secret psql -h $HAPROXY_IP -p 5432 -U postgres -d postgres << EOF
\c replication_test
INSERT INTO test_replication (data) VALUES ('After node restart - $(date)');
SELECT COUNT(*) as total_records FROM test_replication;
EOF

echo ""
echo "=== Failover Test Complete ==="
echo "📊 Test Summary:"
echo "   Initial Primary: $INITIAL_PRIMARY"
echo "   New Primary: $NEW_PRIMARY"
echo "   Final Primary: $FINAL_PRIMARY"
echo ""
if [ "$INITIAL_PRIMARY" != "$NEW_PRIMARY" ]; then
    echo "✅ Failover test PASSED - Primary successfully switched"
else
    echo "❌ Failover test FAILED - Primary did not switch"
fi
echo ""
echo "💡 Check HAProxy stats: http://$HAPROXY_IP:8404/stats"