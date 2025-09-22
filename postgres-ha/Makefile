# PostgreSQL HA Cluster Deployment Makefile
.PHONY: help deploy-terraform deploy-cloudformation configure destroy test-replication test-failover clean

# Default variables
STACK_NAME ?= postgres-ha-cluster
KEY_NAME ?= postgres-ha-key
REGION ?= us-west-2
INSTANCE_TYPE ?= t3.micro

# SSH key path (adjust as needed)
SSH_KEY_PATH ?= ~/.ssh/$(KEY_NAME)

help:
	@echo "PostgreSQL HA Cluster Deployment"
	@echo "================================="
	@echo "Available targets:"
	@echo "  deploy-terraform     - Deploy infrastructure using Terraform"
	@echo "  deploy-cloudformation - Deploy infrastructure using CloudFormation"
	@echo "  configure           - Configure PostgreSQL HA cluster with Ansible"
	@echo "  test-replication    - Test PostgreSQL replication"
	@echo "  test-failover       - Test failover scenarios"
	@echo "  clean-terraform     - Destroy Terraform infrastructure"
	@echo "  clean-cloudformation - Destroy CloudFormation stack"
	@echo "  ssh-postgres1       - SSH to PostgreSQL node 1"
	@echo "  ssh-postgres2       - SSH to PostgreSQL node 2"
	@echo "  ssh-haproxy         - SSH to HAProxy node"
	@echo ""
	@echo "Environment variables:"
	@echo "  STACK_NAME=$(STACK_NAME)"
	@echo "  KEY_NAME=$(KEY_NAME)"
	@echo "  REGION=$(REGION)"
	@echo "  INSTANCE_TYPE=$(INSTANCE_TYPE)"
	@echo "  SSH_KEY_PATH=$(SSH_KEY_PATH)"

# Check if SSH key exists
check-ssh-key:
	@if [ ! -f $(SSH_KEY_PATH) ]; then \
		echo "Error: SSH key not found at $(SSH_KEY_PATH)"; \
		echo "Please create an SSH key pair and update SSH_KEY_PATH variable"; \
		exit 1; \
	fi

# Generate SSH public key for Terraform
ssh-public-key: check-ssh-key
	@ssh-keygen -y -f $(SSH_KEY_PATH) > $(SSH_KEY_PATH).pub

# Terraform deployment
deploy-terraform: ssh-public-key
	@echo "Deploying infrastructure with Terraform..."
	cd terraform && \
	terraform init && \
	terraform plan \
		-var="aws_region=$(REGION)" \
		-var="instance_type=$(INSTANCE_TYPE)" \
		-var="ssh_public_key=$$(cat $(SSH_KEY_PATH).pub)" && \
	terraform apply -auto-approve \
		-var="aws_region=$(REGION)" \
		-var="instance_type=$(INSTANCE_TYPE)" \
		-var="ssh_public_key=$$(cat $(SSH_KEY_PATH).pub)"
	@echo "Waiting for instances to be ready..."
	@sleep 60

# CloudFormation deployment
deploy-cloudformation: check-ssh-key
	@echo "Deploying infrastructure with CloudFormation..."
	aws cloudformation create-stack \
		--stack-name $(STACK_NAME) \
		--template-body file://cloudformation/postgres-ha.yml \
		--parameters ParameterKey=KeyName,ParameterValue=$(KEY_NAME) \
					 ParameterKey=InstanceType,ParameterValue=$(INSTANCE_TYPE) \
		--region $(REGION) \
		--capabilities CAPABILITY_IAM
	@echo "Waiting for CloudFormation stack to complete..."
	aws cloudformation wait stack-create-complete \
		--stack-name $(STACK_NAME) \
		--region $(REGION)
	@echo "Generating Ansible inventory from CloudFormation outputs..."
	@./scripts/generate-inventory-cf.sh $(STACK_NAME) $(REGION)

# Configure cluster with Ansible
configure:
	@echo "Configuring PostgreSQL HA cluster with Ansible..."
	@if [ ! -f ansible/inventory ]; then \
		echo "Error: Ansible inventory not found. Run deployment first."; \
		exit 1; \
	fi
	cd ansible && \
	ansible-playbook -i inventory site.yml

# Test replication
test-replication:
	@echo "Testing PostgreSQL replication..."
	@./scripts/test-replication.sh

# Test failover
test-failover:
	@echo "Testing PostgreSQL failover..."
	@./scripts/test-failover.sh

# Create admin user and test database
create-admin:
	@echo "Creating admin user and test database..."
	@./scripts/create-admin.sh

# Get cluster status
status:
	@echo "Getting cluster status..."
	@./scripts/cluster-status.sh

# SSH connections
ssh-postgres1:
	@echo "Connecting to PostgreSQL node 1..."
	@POSTGRES1_IP=$$(cd terraform && terraform output -raw postgres_node1_public_ip 2>/dev/null || aws cloudformation describe-stacks --stack-name $(STACK_NAME) --region $(REGION) --query 'Stacks[0].Outputs[?OutputKey==`PostgreSQLNode1PublicIP`].OutputValue' --output text); \
	ssh -i $(SSH_KEY_PATH) -o StrictHostKeyChecking=no ubuntu@$$POSTGRES1_IP

ssh-postgres2:
	@echo "Connecting to PostgreSQL node 2..."
	@POSTGRES2_IP=$$(cd terraform && terraform output -raw postgres_node2_public_ip 2>/dev/null || aws cloudformation describe-stacks --stack-name $(STACK_NAME) --region $(REGION) --query 'Stacks[0].Outputs[?OutputKey==`PostgreSQLNode2PublicIP`].OutputValue' --output text); \
	ssh -i $(SSH_KEY_PATH) -o StrictHostKeyChecking=no ubuntu@$$POSTGRES2_IP

ssh-haproxy:
	@echo "Connecting to HAProxy node..."
	@HAPROXY_IP=$$(cd terraform && terraform output -raw haproxy_public_ip 2>/dev/null || aws cloudformation describe-stacks --stack-name $(STACK_NAME) --region $(REGION) --query 'Stacks[0].Outputs[?OutputKey==`HAProxyPublicIP`].OutputValue' --output text); \
	ssh -i $(SSH_KEY_PATH) -o StrictHostKeyChecking=no ubuntu@$$HAPROXY_IP

# Get connection info
connection-info:
	@echo "PostgreSQL HA Cluster Connection Information:"
	@echo "=============================================="
	@HAPROXY_IP=$$(cd terraform && terraform output -raw haproxy_public_ip 2>/dev/null || aws cloudformation describe-stacks --stack-name $(STACK_NAME) --region $(REGION) --query 'Stacks[0].Outputs[?OutputKey==`HAProxyPublicIP`].OutputValue' --output text); \
	echo "PostgreSQL Connection (for Odoo): postgresql://postgres:secret@$$HAPROXY_IP:5432/odoo"; \
	echo "HAProxy Stats: http://$$HAPROXY_IP:8404/stats (admin/admin)"; \
	echo "HAProxy IP: $$HAPROXY_IP"

# Clean up Terraform
clean-terraform:
	@echo "Destroying Terraform infrastructure..."
	cd terraform && \
	terraform destroy -auto-approve \
		-var="aws_region=$(REGION)" \
		-var="instance_type=$(INSTANCE_TYPE)" \
		-var="ssh_public_key=$$(cat $(SSH_KEY_PATH).pub 2>/dev/null || echo 'dummy')"

# Clean up CloudFormation
clean-cloudformation:
	@echo "Destroying CloudFormation stack..."
	aws cloudformation delete-stack \
		--stack-name $(STACK_NAME) \
		--region $(REGION)
	@echo "Waiting for CloudFormation stack to be deleted..."
	aws cloudformation wait stack-delete-complete \
		--stack-name $(STACK_NAME) \
		--region $(REGION)

# Full deployment with Terraform
deploy-full-terraform: deploy-terraform configure create-admin
	@echo "Full deployment completed!"
	@make connection-info

# Full deployment with CloudFormation
deploy-full-cloudformation: deploy-cloudformation configure create-admin
	@echo "Full deployment completed!"
	@make connection-info

# Logs
logs-patroni:
	@echo "Getting Patroni logs from all nodes..."
	@./scripts/get-logs.sh patroni

logs-haproxy:
	@echo "Getting HAProxy logs..."
	@./scripts/get-logs.sh haproxy