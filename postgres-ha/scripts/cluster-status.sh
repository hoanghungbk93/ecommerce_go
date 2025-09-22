#!/bin/bash

echo "=== PostgreSQL HA Cluster Status ==="

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

echo "🖥️  Infrastructure:"
echo "   HAProxy Node: $HAPROXY_IP"
echo "   PostgreSQL Node 1: $POSTGRES1_IP"
echo "   PostgreSQL Node 2: $POSTGRES2_IP"
echo ""

# Check Patroni cluster status
echo "🔍 Patroni Cluster Status:"
echo "----------------------------"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP << 'EOF'
echo "From Node 1:"
curl -s http://localhost:8008/cluster | jq . 2>/dev/null || curl -s http://localhost:8008/cluster | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8008/cluster
EOF

echo ""

# Check individual node status
echo "📊 Individual Node Status:"
echo "----------------------------"
echo "Node 1 (postgres-node1):"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP << 'EOF'
echo "  Patroni Role: $(curl -s http://localhost:8008/patroni | jq -r '.role // "unknown"')"
echo "  Patroni State: $(curl -s http://localhost:8008/patroni | jq -r '.state // "unknown"')"
echo "  PostgreSQL Status: $(sudo systemctl is-active patroni)"
EOF

echo ""
echo "Node 2 (postgres-node2):"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES2_IP << 'EOF'
echo "  Patroni Role: $(curl -s http://localhost:8008/patroni | jq -r '.role // "unknown"')"
echo "  Patroni State: $(curl -s http://localhost:8008/patroni | jq -r '.state // "unknown"')"
echo "  PostgreSQL Status: $(sudo systemctl is-active patroni)"
EOF

echo ""

# Check etcd status
echo "🗄️  etcd Status:"
echo "----------------------------"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$HAPROXY_IP << 'EOF'
echo "etcd Service: $(sudo systemctl is-active etcd)"
echo "etcd Health:"
curl -s http://localhost:2379/health | jq . 2>/dev/null || curl -s http://localhost:2379/health
EOF

echo ""

# Check HAProxy status
echo "⚖️  HAProxy Status:"
echo "----------------------------"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$HAPROXY_IP << 'EOF'
echo "HAProxy Service: $(sudo systemctl is-active haproxy)"
echo "HAProxy Backend Status:"
curl -s http://localhost:8404/stats | grep -A 5 "postgres_primary" | head -n 6
EOF

echo ""

# Test connectivity
echo "🔗 Connectivity Test:"
echo "----------------------------"
echo "Testing connection to HAProxy endpoint..."
if PGPASSWORD=secret psql -h $HAPROXY_IP -p 5432 -U postgres -d postgres -c "SELECT 'Connection successful' as status, inet_server_addr() as connected_to;" >/dev/null 2>&1; then
    CONNECTED_IP=$(PGPASSWORD=secret psql -h $HAPROXY_IP -p 5432 -U postgres -d postgres -t -c "SELECT inet_server_addr();" 2>/dev/null | tr -d ' ')
    echo "✅ Connection successful to: $CONNECTED_IP"
else
    echo "❌ Connection failed"
fi

echo ""

# Show replication lag
echo "📈 Replication Status:"
echo "----------------------------"
echo "Checking replication lag..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP << 'EOF'
sudo -u postgres psql -c "SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn, (write_lag || ' ' || flush_lag || ' ' || replay_lag) as lag FROM pg_stat_replication;" 2>/dev/null || echo "Not primary or no replicas"
EOF

ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES2_IP << 'EOF'
sudo -u postgres psql -c "SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn, (write_lag || ' ' || flush_lag || ' ' || replay_lag) as lag FROM pg_stat_replication;" 2>/dev/null || echo "Not primary or no replicas"
EOF

echo ""
echo "=== Status Check Complete ==="
echo "💡 Useful URLs:"
echo "   HAProxy Stats: http://$HAPROXY_IP:8404/stats (admin/admin)"
echo "   Node 1 Patroni API: http://$POSTGRES1_IP:8008/"
echo "   Node 2 Patroni API: http://$POSTGRES2_IP:8008/"