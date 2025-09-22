#!/bin/bash
set -e

STACK_NAME=$1
REGION=$2

if [ -z "$STACK_NAME" ] || [ -z "$REGION" ]; then
    echo "Usage: $0 <stack-name> <region>"
    exit 1
fi

echo "Generating Ansible inventory from CloudFormation stack: $STACK_NAME"

# Get outputs from CloudFormation
HAPROXY_IP=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`HAProxyPublicIP`].OutputValue' --output text)
POSTGRES1_IP=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`PostgreSQLNode1PublicIP`].OutputValue' --output text)
POSTGRES2_IP=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`PostgreSQLNode2PublicIP`].OutputValue' --output text)

# Create inventory file
cat > ansible/inventory << EOF
[postgres_nodes]
postgres-node1 ansible_host=$POSTGRES1_IP private_ip=10.0.1.10 patroni_node_id=1
postgres-node2 ansible_host=$POSTGRES2_IP private_ip=10.0.2.10 patroni_node_id=2

[haproxy_nodes]
haproxy-node ansible_host=$HAPROXY_IP private_ip=10.0.3.10

[etcd_nodes]
haproxy-node ansible_host=$HAPROXY_IP private_ip=10.0.3.10

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/postgres-ha-key
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
postgres_version=15
patroni_scope=odoo-ha
replication_user=replicator
replication_password=secret
postgres_password=secret
EOF

echo "✅ Inventory file created: ansible/inventory"
echo "📋 Node IPs:"
echo "   PostgreSQL Node 1: $POSTGRES1_IP"
echo "   PostgreSQL Node 2: $POSTGRES2_IP"
echo "   HAProxy Node: $HAPROXY_IP"