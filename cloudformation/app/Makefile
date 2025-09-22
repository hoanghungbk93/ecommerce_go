# EC2-based ECS deployment targets
.PHONY: deploy-ec2-dev deploy-ec2-prod validate-ec2 describe-ec2-dev describe-ec2-prod delete-ec2-dev delete-ec2-prod redeploy-ec2-dev redeploy-ec2-prod stop-services-dev stop-services-prod

# Reusable template targets
.PHONY: deploy-reusable validate-reusable describe-reusable delete-reusable redeploy-reusable stop-services-reusable sync-templates

# Variables
EC2_TEMPLATE := template-ec2.yml
REUSABLE_TEMPLATE := template-reusable.yml
DEV_EC2_PARAMS := dev-ec2.json
PROD_EC2_PARAMS := prod-ec2.json
REGION := ap-southeast-1

# Reusable template variables (override these when calling make)
PROJECT ?= ecommerce
ENV ?= dev
PARAMS_FILE ?= $(PROJECT)-$(ENV).json
STACK_NAME ?= $(ENV)-$(PROJECT)-reusable
S3_BUCKET ?= ecommerce-cloudformation-templates-142473567235

# Deploy to development with EC2
deploy-ec2-dev:
	@echo "🚀 Deploying ecommerce app to DEV with EC2+ECS..."
	aws cloudformation deploy \
		--template-file $(EC2_TEMPLATE) \
		--stack-name dev-ecommerce-ec2-app \
		--parameter-overrides file://$(DEV_EC2_PARAMS) \
		--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
		--region $(REGION) \
		--no-fail-on-empty-changeset
	@echo "✅ Development deployment complete!"
	@make describe-ec2-dev

# Deploy to production with EC2
deploy-ec2-prod:
	@echo "🚀 Deploying ecommerce app to PROD with EC2+ECS..."
	aws cloudformation deploy \
		--template-file $(EC2_TEMPLATE) \
		--stack-name prod-ecommerce-ec2-app \
		--parameter-overrides file://$(PROD_EC2_PARAMS) \
		--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
		--region $(REGION) \
		--no-fail-on-empty-changeset
	@echo "✅ Production deployment complete!"
	@make describe-ec2-prod

# Validate EC2 template
validate-ec2:
	@echo "📋 Validating EC2 CloudFormation template..."
	aws cloudformation validate-template \
		--template-body file://$(EC2_TEMPLATE) \
		--region $(REGION)
	@echo "✅ Template is valid!"

# Show development stack info
describe-ec2-dev:
	@echo "📄 Development Stack Outputs:"
	aws cloudformation describe-stacks \
		--stack-name dev-ecommerce-ec2-app \
		--query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
		--output table \
		--region $(REGION) 2>/dev/null || echo "Stack not found"

# Show production stack info
describe-ec2-prod:
	@echo "📄 Production Stack Outputs:"
	aws cloudformation describe-stacks \
		--stack-name prod-ecommerce-ec2-app \
		--query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
		--output table \
		--region $(REGION) 2>/dev/null || echo "Stack not found"

# Delete development stack
delete-ec2-dev:
	@echo "🗑️  Deleting DEV EC2 stack..."
	aws cloudformation delete-stack \
		--stack-name dev-ecommerce-ec2-app \
		--region $(REGION)
	@echo "⏳ Waiting for stack deletion..."
	aws cloudformation wait stack-delete-complete \
		--stack-name dev-ecommerce-ec2-app \
		--region $(REGION)
	@echo "✅ DEV stack deleted!"

# Delete production stack
delete-ec2-prod:
	@echo "🗑️  Deleting PROD EC2 stack..."
	aws cloudformation delete-stack \
		--stack-name prod-ecommerce-ec2-app \
		--region $(REGION)
	@echo "⏳ Waiting for stack deletion..."
	aws cloudformation wait stack-delete-complete \
		--stack-name prod-ecommerce-ec2-app \
		--region $(REGION)
	@echo "✅ PROD stack deleted!"

# Show stack events for debugging
events-ec2-dev:
	aws cloudformation describe-stack-events \
		--stack-name dev-ecommerce-ec2-app \
		--region $(REGION) \
		--query 'StackEvents[0:10].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
		--output table

events-ec2-prod:
	aws cloudformation describe-stack-events \
		--stack-name prod-ecommerce-ec2-app \
		--region $(REGION) \
		--query 'StackEvents[0:10].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
		--output table

# Quick status check
status-ec2:
	@echo "📊 EC2 Stack Status:"
	@echo "DEV:"
	@aws cloudformation describe-stacks --stack-name dev-ecommerce-ec2-app --query 'Stacks[0].StackStatus' --output text --region $(REGION) 2>/dev/null || echo "Not deployed"
	@echo "PROD:"
	@aws cloudformation describe-stacks --stack-name prod-ecommerce-ec2-app --query 'Stacks[0].StackStatus' --output text --region $(REGION) 2>/dev/null || echo "Not deployed"

# Stop ECS services (scale to 0) before deletion
stop-services-dev:
	@echo "⏸️  Stopping DEV services..."
	@CLUSTER_NAME=$$(aws cloudformation describe-stacks --stack-name dev-ecommerce-ec2-app --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' --output text --region $(REGION) 2>/dev/null || echo ""); \
	if [ -n "$$CLUSTER_NAME" ]; then \
		echo "Scaling down services in cluster: $$CLUSTER_NAME"; \
		aws ecs list-services --cluster "$$CLUSTER_NAME" --region $(REGION) --query 'serviceArns[]' --output text | tr '\t' '\n' | while read service_arn; do \
			if [ -n "$$service_arn" ]; then \
				SERVICE_NAME=$$(basename "$$service_arn"); \
				echo "  Scaling down service: $$SERVICE_NAME"; \
				aws ecs update-service --cluster "$$CLUSTER_NAME" --service "$$SERVICE_NAME" --desired-count 0 --region $(REGION) >/dev/null 2>&1 || true; \
			fi; \
		done; \
		echo "⏳ Waiting 30 seconds for services to scale down..."; \
		sleep 30; \
	else \
		echo "⚠️  No cluster found, skipping service scaling"; \
	fi

stop-services-prod:
	@echo "⏸️  Stopping PROD services..."
	@CLUSTER_NAME=$$(aws cloudformation describe-stacks --stack-name prod-ecommerce-ec2-app --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' --output text --region $(REGION) 2>/dev/null || echo ""); \
	if [ -n "$$CLUSTER_NAME" ]; then \
		echo "Scaling down services in cluster: $$CLUSTER_NAME"; \
		aws ecs list-services --cluster "$$CLUSTER_NAME" --region $(REGION) --query 'serviceArns[]' --output text | tr '\t' '\n' | while read service_arn; do \
			if [ -n "$$service_arn" ]; then \
				SERVICE_NAME=$$(basename "$$service_arn"); \
				echo "  Scaling down service: $$SERVICE_NAME"; \
				aws ecs update-service --cluster "$$CLUSTER_NAME" --service "$$SERVICE_NAME" --desired-count 0 --region $(REGION) >/dev/null 2>&1 || true; \
			fi; \
		done; \
		echo "⏳ Waiting 30 seconds for services to scale down..."; \
		sleep 30; \
	else \
		echo "⚠️  No cluster found, skipping service scaling"; \
	fi

# One-command redeploy: stop services, delete stack, and redeploy
redeploy-ec2-dev:
	@echo "🔄 REDEPLOYING DEV STACK (stop → delete → deploy)"
	@echo "========================================"
	@make stop-services-dev
	@make delete-ec2-dev
	@echo "🚀 Starting fresh deployment..."
	@make deploy-ec2-dev
	@echo "========================================"
	@echo "✅ 🎉 REDEPLOY COMPLETE!"

redeploy-ec2-prod:
	@echo "🔄 REDEPLOYING PROD STACK (stop → delete → deploy)"
	@echo "========================================"
	@echo "⚠️  WARNING: This will redeploy PRODUCTION!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ] || (echo "Cancelled." && exit 1)
	@make stop-services-prod
	@make delete-ec2-prod
	@echo "🚀 Starting fresh deployment..."
	@make deploy-ec2-prod
	@echo "========================================"
	@echo "✅ 🎉 REDEPLOY COMPLETE!"

# REUSABLE TEMPLATE TARGETS
# =========================

# Sync shared templates to S3
sync-templates:
	@echo "📎 Syncing shared templates to S3..."
	aws s3 sync shared/ s3://$(S3_BUCKET)/shared/ --region $(REGION) --delete
	@echo "✅ Shared templates synced to s3://$(S3_BUCKET)/shared/"

# Deploy any project using the reusable template
deploy-reusable:
	@echo "🚀 Deploying $(PROJECT) to $(ENV) using reusable template..."
	@echo "Template: $(REUSABLE_TEMPLATE)"
	@echo "Parameters: $(PARAMS_FILE)"
	@echo "Stack: $(STACK_NAME)"
	aws cloudformation deploy \
		--template-file $(REUSABLE_TEMPLATE) \
		--stack-name $(STACK_NAME) \
		--parameter-overrides file://$(PARAMS_FILE) \
		--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
		--region $(REGION) \
		--no-fail-on-empty-changeset
	@echo "✅ $(PROJECT) deployment complete!"
	@make describe-reusable PROJECT=$(PROJECT) ENV=$(ENV)

# Validate reusable template
validate-reusable:
	@echo "📋 Validating reusable CloudFormation template..."
	aws cloudformation validate-template \
		--template-body file://$(REUSABLE_TEMPLATE) \
		--region $(REGION)
	@echo "✅ Reusable template is valid!"

# Show stack outputs
describe-reusable:
	@echo "📄 $(PROJECT) ($(ENV)) Stack Outputs:"
	aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME) \
		--query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
		--output table \
		--region $(REGION) 2>/dev/null || echo "Stack $(STACK_NAME) not found"

# Delete stack
delete-reusable:
	@echo "🗑️  Deleting $(PROJECT) ($(ENV)) stack..."
	aws cloudformation delete-stack \
		--stack-name $(STACK_NAME) \
		--region $(REGION)
	@echo "⏳ Waiting for stack deletion..."
	aws cloudformation wait stack-delete-complete \
		--stack-name $(STACK_NAME) \
		--region $(REGION)
	@echo "✅ $(PROJECT) ($(ENV)) stack deleted!"

# Stop services for reusable template
stop-services-reusable:
	@echo "⏸️  Stopping $(PROJECT) ($(ENV)) services..."
	@CLUSTER_NAME=$$(aws cloudformation describe-stacks --stack-name $(STACK_NAME) --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' --output text --region $(REGION) 2>/dev/null || echo ""); \
	if [ -n "$$CLUSTER_NAME" ]; then \
		echo "Scaling down services in cluster: $$CLUSTER_NAME"; \
		aws ecs list-services --cluster "$$CLUSTER_NAME" --region $(REGION) --query 'serviceArns[]' --output text | tr '\t' '\n' | while read service_arn; do \
			if [ -n "$$service_arn" ]; then \
				SERVICE_NAME=$$(basename "$$service_arn"); \
				echo "  Scaling down service: $$SERVICE_NAME"; \
				aws ecs update-service --cluster "$$CLUSTER_NAME" --service "$$SERVICE_NAME" --desired-count 0 --region $(REGION) >/dev/null 2>&1 || true; \
			fi; \
		done; \
		echo "⏳ Waiting 30 seconds for services to scale down..."; \
		sleep 30; \
	else \
		echo "⚠️  No cluster found for $(PROJECT) ($(ENV)), skipping service scaling"; \
	fi

# One-command redeploy for reusable template
redeploy-reusable:
	@echo "🔄 REDEPLOYING $(PROJECT) ($(ENV)) (stop → delete → deploy)"
	@echo "=========================================="
	@make stop-services-reusable PROJECT=$(PROJECT) ENV=$(ENV)
	@make delete-reusable PROJECT=$(PROJECT) ENV=$(ENV)
	@echo "🚀 Starting fresh deployment..."
	@make deploy-reusable PROJECT=$(PROJECT) ENV=$(ENV)
	@echo "=========================================="
	@echo "✅ 🎉 $(PROJECT) REDEPLOY COMPLETE!"

# Infrastructure deployment targets
deploy-infrastructure:
	@echo "🏗️  Deploying infrastructure for $(PROJECT) in $(ENV)..."
	aws cloudformation deploy \
		--template-file infrastructure.yml \
		--stack-name $(ENV)-$(PROJECT)-infrastructure \
		--parameter-overrides \
			EnvironmentName=$(ENV) \
			VerticalName=$(PROJECT) \
		--region $(REGION) \
		--no-fail-on-empty-changeset
	@echo "✅ Infrastructure stack deployed!"

delete-infrastructure:
	@echo "🗑️  Deleting $(PROJECT) ($(ENV)) infrastructure stack..."
	aws cloudformation delete-stack \
		--stack-name $(ENV)-$(PROJECT)-infrastructure \
		--region $(REGION)
	@echo "⏳ Waiting for infrastructure stack deletion..."
	aws cloudformation wait stack-delete-complete \
		--stack-name $(ENV)-$(PROJECT)-infrastructure \
		--region $(REGION)
	@echo "✅ $(PROJECT) ($(ENV)) infrastructure stack deleted!"

describe-infrastructure:
	@echo "📄 $(PROJECT) ($(ENV)) Infrastructure Stack Outputs:"
	aws cloudformation describe-stacks \
		--stack-name $(ENV)-$(PROJECT)-infrastructure \
		--region $(REGION) \
		--query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
		--output table

# Help
help-ec2:
	@echo "Available EC2 deployment commands:"
	@echo "  make deploy-ec2-dev     - Deploy to development with EC2+ECS"
	@echo "  make deploy-ec2-prod    - Deploy to production with EC2+ECS"
	@echo "  make redeploy-ec2-dev   - 🚀 ONE-COMMAND: Stop, delete & redeploy DEV"
	@echo "  make redeploy-ec2-prod  - 🚀 ONE-COMMAND: Stop, delete & redeploy PROD"
	@echo "  make stop-services-dev  - Stop all DEV ECS services (scale to 0)"
	@echo "  make stop-services-prod - Stop all PROD ECS services (scale to 0)"
	@echo "  make validate-ec2       - Validate CloudFormation template"
	@echo "  make describe-ec2-dev   - Show development stack outputs"
	@echo "  make describe-ec2-prod  - Show production stack outputs"
	@echo "  make delete-ec2-dev     - Delete development stack"
	@echo "  make delete-ec2-prod    - Delete production stack"
	@echo "  make events-ec2-dev     - Show recent dev stack events"
	@echo "  make events-ec2-prod    - Show recent prod stack events"
	@echo "  make status-ec2         - Quick status check"
	@echo "  make help-ec2           - Show this help"

help-reusable:
	@echo "Available REUSABLE template commands:"
	@echo ""
	@echo "🎆 QUICK START - Deploy any project:"
	@echo "  make deploy-reusable PROJECT=myapp ENV=dev"
	@echo "  make redeploy-reusable PROJECT=myapp ENV=dev    # 🚀 ONE-COMMAND"
	@echo ""
	@echo "📁 Available projects (based on parameter files):"
	@ls -1 *-dev.json 2>/dev/null | sed 's/-dev.json//' | sed 's/^/    /' || echo "    No project parameter files found"
	@echo ""
	@echo "🔩  Individual commands:"
	@echo "  make deploy-infrastructure PROJECT=<name> ENV=<env> - Deploy VPC/SNS infrastructure"
	@echo "  make deploy-reusable PROJECT=<name> ENV=<env>   - Deploy project"
	@echo "  make describe-reusable PROJECT=<name> ENV=<env> - Show stack outputs"
	@echo "  make describe-infrastructure PROJECT=<name> ENV=<env> - Show infrastructure outputs"
	@echo "  make delete-reusable PROJECT=<name> ENV=<env>   - Delete stack"
	@echo "  make delete-infrastructure PROJECT=<name> ENV=<env> - Delete infrastructure"
	@echo "  make stop-services-reusable PROJECT=<name> ENV=<env> - Stop services"
	@echo "  make sync-templates                             - Upload shared templates to S3"
	@echo "  make validate-reusable                          - Validate template"
	@echo "  make help-reusable                             - Show this help"
	@echo ""
	@echo "📝 Examples:"
	@echo "  # First time setup (deploy infrastructure first):"
	@echo "  make deploy-infrastructure PROJECT=ecommerce ENV=dev"
	@echo "  make deploy-reusable PROJECT=ecommerce ENV=dev"
	@echo ""
	@echo "  # Other examples:"
	@echo "  make deploy-reusable PROJECT=blog ENV=staging"
	@echo "  make redeploy-reusable PROJECT=ecommerce ENV=dev"

help:
	@echo "🚀 CloudFormation Deployment Helper"
	@echo "===================================="
	@echo ""
	@echo "🎆 RECOMMENDED: Use the reusable template for new projects"
	@echo "  make help-reusable      - Show reusable template commands"
	@echo ""
	@echo "🔧 Legacy: Use EC2-specific templates"
	@echo "  make help-ec2          - Show EC2 template commands"
