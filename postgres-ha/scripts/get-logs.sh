#!/bin/bash

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "Usage: $0 <service>"
    echo "Available services: patroni, haproxy, etcd"
    exit 1
fi

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

case $SERVICE in
    "patroni")
        echo "=== Patroni Logs from Node 1 ==="
        ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES1_IP 'sudo journalctl -u patroni -n 50 --no-pager'
        echo ""
        echo "=== Patroni Logs from Node 2 ==="
        ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$POSTGRES2_IP 'sudo journalctl -u patroni -n 50 --no-pager'
        ;;
    "haproxy")
        echo "=== HAProxy Logs ==="
        ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$HAPROXY_IP 'sudo journalctl -u haproxy -n 50 --no-pager'
        ;;
    "etcd")
        echo "=== etcd Logs ==="
        ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$HAPROXY_IP 'sudo journalctl -u etcd -n 50 --no-pager'
        ;;
    *)
        echo "Unknown service: $SERVICE"
        echo "Available services: patroni, haproxy, etcd"
        exit 1
        ;;
esac