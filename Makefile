.PHONY: help dev-deploy-permanent dev-deploy-app dev-setup-ssm dev-deploy-all check-aws-account create-ecr validate-ecr list-ecr build-backend build-frontend dev-build-backend dev-build-frontend-with-api push-backend-image push-images health-check logs teardown demodata start stop

# Default AWS region
AWS_REGION ?= ap-southeast-1
ENV ?= dev

# Get AWS Account ID
AWS_ACCOUNT_ID := $(shell aws sts get-caller-identity --query Account --output text 2>/dev/null)

# ECR Repository URLs
BACKEND_REPO := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/ecommerce-app/backend
FRONTEND_REPO := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/ecommerce-app/frontend

help:
	@echo "📋 Ecommerce App Deployment Commands"
	@echo ""
	@echo "🏗️  Initial Setup:"
	@echo "  check-aws-account      - Verify AWS credentials and account"
	@echo "  create-ecr            - Create ECR repositories"
	@echo "  validate-ecr          - Validate ECR repositories exist"
	@echo "  list-ecr              - List ECR repositories and images"
	@echo "  dev-deploy-permanent  - Deploy RDS, S3, SSM (run once)"
	@echo "  dev-setup-ssm         - Setup critical SSM parameters"
	@echo ""
	@echo "🚀 Application Deployment:"
	@echo "  dev-build-backend     - Build backend Docker image only"
	@echo "  dev-build-frontend-with-api - Build frontend with correct API URL"
	@echo "  build-images          - Build Docker images"
	@echo "  push-backend-image    - Push backend image to ECR"
	@echo "  push-images           - Push images to ECR"
	@echo "  dev-deploy-app        - Deploy ECS application"
	@echo "  dev-deploy-all        - Full deployment (permanent + app)"
	@echo ""
	@echo "🔍 Monitoring:"
	@echo "  health-check          - Check service health"
	@echo "  logs                  - View application logs"
	@echo "  status               - Show stack and service status"
	@echo ""
	@echo "🧙 Cleanup:"
	@echo "  teardown             - Delete all resources"
	@echo ""
	@echo "🔧️  Service Management:"
	@echo "  start                - Start all AWS services (scale to 1)"
	@echo "  stop                 - Stop all AWS services (scale to 0)"
	@echo "  demodata             - Add demo data to AWS database"

# Check AWS credentials and account
check-aws-account:
	@echo "🔍 Checking AWS credentials..."
	@if [ -z "$(AWS_ACCOUNT_ID)" ]; then \
		echo "❌ AWS credentials not configured or invalid"; \
		echo "Please run: aws configure"; \
		exit 1; \
	fi
	@echo "✅ AWS Account ID: $(AWS_ACCOUNT_ID)"
	@echo "✅ AWS Region: $(AWS_REGION)"

# Create ECR repositories
create-ecr: check-aws-account
	@echo "📦 Creating ECR repositories..."
	@if ! aws ecr describe-repositories --repository-names ecommerce-app/backend --region $(AWS_REGION) >/dev/null 2>&1; then \
		echo "Creating backend repository..."; \
		aws ecr create-repository --repository-name ecommerce-app/backend --region $(AWS_REGION); \
	else \
		echo "Backend repository already exists"; \
	fi
	@if ! aws ecr describe-repositories --repository-names ecommerce-app/frontend --region $(AWS_REGION) >/dev/null 2>&1; then \
		echo "Creating frontend repository..."; \
		aws ecr create-repository --repository-name ecommerce-app/frontend --region $(AWS_REGION); \
	else \
		echo "Frontend repository already exists"; \
	fi
	@echo "✅ ECR repositories verified/created"

# Validate ECR repositories exist
validate-ecr: check-aws-account
	@echo "🔍 Validating ECR repositories..."
	@if ! aws ecr describe-repositories --repository-names ecommerce-app/backend --region $(AWS_REGION) >/dev/null 2>&1; then \
		echo "❌ Backend ECR repository not found. Run 'make create-ecr' first"; \
		exit 1; \
	fi
	@if ! aws ecr describe-repositories --repository-names ecommerce-app/frontend --region $(AWS_REGION) >/dev/null 2>&1; then \
		echo "❌ Frontend ECR repository not found. Run 'make create-ecr' first"; \
		exit 1; \
	fi
	@echo "✅ ECR repositories validated"

# List ECR repositories and images
list-ecr: check-aws-account
	@echo "📊 ECR Repository Status:"
	@echo ""
	@echo "Backend Repository:"
	@aws ecr describe-repositories --repository-names ecommerce-app/backend --region $(AWS_REGION) --query 'repositories[0].{URI:repositoryUri,CreatedAt:createdAt}' --output table 2>/dev/null || echo "Repository not found"
	@echo ""
	@echo "Backend Images:"
	@aws ecr list-images --repository-name ecommerce-app/backend --region $(AWS_REGION) --query 'imageIds[?imageTag != null].[imageTag,imagePushedAt]' --output table 2>/dev/null || echo "No images or repository not found"
	@echo ""
	@echo "Frontend Repository:"
	@aws ecr describe-repositories --repository-names ecommerce-app/frontend --region $(AWS_REGION) --query 'repositories[0].{URI:repositoryUri,CreatedAt:createdAt}' --output table 2>/dev/null || echo "Repository not found"
	@echo ""
	@echo "Frontend Images:"
	@aws ecr list-images --repository-name ecommerce-app/frontend --region $(AWS_REGION) --query 'imageIds[?imageTag != null].[imageTag,imagePushedAt]' --output table 2>/dev/null || echo "No images or repository not found"

# Update app parameters with correct AWS Account ID
update-app-params: check-aws-account
	@echo "🔧 Updating app parameters with AWS Account ID..."
	sed -i '' 's/YOUR_AWS_ACCOUNT_ID/$(AWS_ACCOUNT_ID)/g' cloudformation/app/dev.json

# Deploy permanent infrastructure (RDS, S3, SSM, Security Groups)
dev-deploy-permanent: check-aws-account
	@echo "🏗️  Deploying permanent infrastructure..."
	aws cloudformation deploy \
		--template-file cloudformation/permanent/template.yml \
		--stack-name $(ENV)-ecommerce-permanent \
		--parameter-overrides file://cloudformation/permanent/$(ENV).json \
		--capabilities CAPABILITY_NAMED_IAM \
		--region $(AWS_REGION)
	@echo "✅ Permanent infrastructure deployed"

# Setup critical SSM parameters
dev-setup-ssm: check-aws-account
	@echo "🔐 Setting up critical SSM parameters..."
	@echo ""
	@echo "⚠️  CRITICAL: These parameters MUST be set for the service to run:"
	@echo ""
	
	@# Get database connection details from CloudFormation outputs
	$(eval DB_HOST := $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-permanent --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null))
	$(eval DB_PORT := $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-permanent --query 'Stacks[0].Outputs[?OutputKey==`DatabasePort`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null))
	
	@if [ -z "$(DB_HOST)" ]; then \
		echo "❌ Database not found. Run 'make dev-deploy-permanent' first"; \
		exit 1; \
	fi
	
	@# Create DATABASE_URL
	aws ssm put-parameter \
		--name "/$(ENV)/ecommerce/db/url" \
		--value "postgres://ecommerce:ecommerce123!@$(DB_HOST):$(DB_PORT)/ecommerce?sslmode=disable" \
		--type "SecureString" \
		--overwrite \
		--region $(AWS_REGION)
	@echo "✅ DATABASE_URL set"
	
	@# JWT Secret
	aws ssm put-parameter \
		--name "/$(ENV)/ecommerce/jwt/secret" \
		--value "your-super-secret-jwt-key-change-in-production-$(ENV)" \
		--type "SecureString" \
		--overwrite \
		--region $(AWS_REGION)
	@echo "✅ JWT_SECRET set"
	
	@# VNPAY Parameters (required for payment)
	aws ssm put-parameter \
		--name "/$(ENV)/ecommerce/vnpay/tmn-code" \
		--value "YOUR_VNPAY_TMN_CODE" \
		--type "SecureString" \
		--overwrite \
		--region $(AWS_REGION)
	@echo "✅ VNPAY_TMN_CODE set (update with real value)"
	
	aws ssm put-parameter \
		--name "/$(ENV)/ecommerce/vnpay/hash-key" \
		--value "YOUR_VNPAY_HASH_KEY" \
		--type "SecureString" \
		--overwrite \
		--region $(AWS_REGION)
	@echo "✅ VNPAY_HASH_KEY set (update with real value)"
	
	@# VNPAY URLs
	aws ssm put-parameter \
		--name "/$(ENV)/ecommerce/vnpay/url" \
		--value "https://sandbox.vnpayment.vn/paymentv2/vncpay.html" \
		--type "String" \
		--overwrite \
		--region $(AWS_REGION)
	@echo "✅ VNPAY_URL set"
	
	aws ssm put-parameter \
		--name "/$(ENV)/ecommerce/vnpay/return-url" \
		--value "http://localhost:3000/payment/return" \
		--type "String" \
		--overwrite \
		--region $(AWS_REGION)
	@echo "✅ VNPAY_RETURN_URL set (update after ALB deployment)"
	
	@# Google OAuth (for frontend)
	aws ssm put-parameter \
		--name "/$(ENV)/ecommerce/google/client-id" \
		--value "your_google_client_id_here.apps.googleusercontent.com" \
		--type "SecureString" \
		--overwrite \
		--region $(AWS_REGION)
	@echo "✅ GOOGLE_CLIENT_ID set (update with real value)"
	
	@echo ""
	@echo "🔔 IMPORTANT: Update these parameters with real values:"
	@echo "   - VNPAY_TMN_CODE: Get from VNPAY merchant account"
	@echo "   - VNPAY_HASH_KEY: Get from VNPAY merchant account"
	@echo "   - GOOGLE_CLIENT_ID: Get from Google Cloud Console"
	@echo ""
	@echo "💡 To update a parameter:"
	@echo "   aws ssm put-parameter --name '/$(ENV)/ecommerce/vnpay/tmn-code' --value 'REAL_VALUE' --type 'SecureString' --overwrite --region $(AWS_REGION)"

# Start all AWS services
start: check-aws-account
	@echo "🚀 Starting all AWS services..."
	@echo "Scaling ECS services to 1..."
	aws ecs update-service --cluster $(ENV)-ecommerce-cluster --service $(ENV)-ecommerce-backend --desired-count 1 --region $(AWS_REGION)
	aws ecs update-service --cluster $(ENV)-ecommerce-cluster --service $(ENV)-ecommerce-frontend --desired-count 1 --region $(AWS_REGION)
	@echo "✅ All services started"
	@$(MAKE) health-check

# Stop all AWS services
stop: check-aws-account
	@echo "🛑 Stopping all AWS services..."
	@echo "Scaling ECS services to 0..."
	aws ecs update-service --cluster $(ENV)-ecommerce-cluster --service $(ENV)-ecommerce-backend --desired-count 0 --region $(AWS_REGION)
	aws ecs update-service --cluster $(ENV)-ecommerce-cluster --service $(ENV)-ecommerce-frontend --desired-count 0 --region $(AWS_REGION)
	@echo "✅ All services stopped"
	@echo "💰 This will save costs while keeping your infrastructure"

# Add demo data to AWS RDS database
demodata: check-aws-account
	@echo "🎭 Adding demo data to AWS RDS database..."
	$(eval DB_HOST := $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-permanent --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null))
	$(eval DB_URL := $(shell aws ssm get-parameter --name "/$(ENV)/ecommerce/db/url" --with-decryption --region $(AWS_REGION) --query 'Parameter.Value' --output text 2>/dev/null))
	@if [ -z "$(DB_HOST)" ]; then \
		echo "❌ Database not found. Deploy permanent stack first."; \
		exit 1; \
	fi
	@echo "Creating demo user account..."
	$(eval BACKEND_URL := $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-app --query 'Stacks[0].Outputs[?OutputKey==`BackendUrl`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null))
	$(eval FRONTEND_URL := $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-app --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null))
	@if [ -z "$(BACKEND_URL)" ]; then \
		echo "❌ Backend URL not found. Services might be stopped. Run 'make start' first."; \
		exit 1; \
	fi
	@echo "Creating admin user account..."
	curl -s -X POST "$(BACKEND_URL)/api/v1/auth/register" \
		-H "Content-Type: application/json" \
		-d '{"email":"admin@ecommerce.com","password":"admin123","first_name":"Admin","last_name":"User"}' > /tmp/admin_response.json || echo "User might already exist"
	curl -s -X POST "$(BACKEND_URL)/api/v1/auth/register" \
		-H "Content-Type: application/json" \
		-d '{"email":"demo@ecommerce.com","password":"demo123","first_name":"Demo","last_name":"User"}' > /tmp/demo_response.json || echo "User might already exist"
	@echo ""
	@echo "✅ Demo accounts created!"
	@echo "👤 Demo accounts:"
	@echo "   admin@ecommerce.com / admin123 (needs admin role)"
	@echo "   demo@ecommerce.com / demo123 (regular user)"
	@echo ""
	@echo "🔧 To make admin@ecommerce.com an admin and add products:"
	@echo "   1. Run: AWS_REGION=$(AWS_REGION) ./scripts/make-user-admin.sh"
	@echo "   2. Or manually run the SQL in scripts/make-admin.sql on your RDS"
	@echo "   3. Then use the admin panel to create categories and products"
	@echo ""
	@echo "🌐 Access your application at: $(FRONTEND_URL)"
	@echo ""
	@echo "✅ Demo data added successfully!"
	@echo "🎯 Demo content includes:"
	@echo "   👑 Admin User: admin@ecommerce.com / admin123"
	@echo "   📂 5 Product Categories"
	@echo "   📦 10 Demo Products with images"
	@echo ""
	@echo "🌐 Access your application at:"
	@echo "   $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-app --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null)"

# Build only backend Docker image
dev-build-backend:
	@echo "🔨 Building backend Docker image..."
	cd backend && docker build -t ecommerce-backend:latest .
	@echo "✅ Backend image built successfully"

# Build frontend with correct API URL from deployed backend
dev-build-frontend-with-api: check-aws-account
	@echo "🔨 Building frontend Docker image with API URL..."
	$(eval BACKEND_URL := $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-app --query 'Stacks[0].Outputs[?OutputKey==`BackendUrl`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null))
	@if [ -z "$(BACKEND_URL)" ]; then \
		echo "❌ Backend URL not found. Deploy the app stack first."; \
		exit 1; \
	fi
	@echo "Using API URL: $(BACKEND_URL)/api/v1"
	cd frontend && docker build --build-arg REACT_APP_API_URL="$(BACKEND_URL)/api/v1" -t ecommerce-frontend:latest .
	@echo "✅ Frontend image built successfully with API URL: $(BACKEND_URL)/api/v1"

# Push only backend image to ECR
push-backend-image: validate-ecr dev-build-backend
	@echo "📤 Pushing backend image to ECR..."
	@echo "Logging into ECR..."
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
	@echo "Tagging and pushing backend..."
	docker tag ecommerce-backend:latest $(BACKEND_REPO):latest
	docker push $(BACKEND_REPO):latest
	@echo "✅ Backend image pushed successfully"

# Build Docker images
build-images:
	@echo "🔨 Building Docker images..."
	@echo "Building backend..."
	cd backend && docker build -t ecommerce-backend:latest .
	@echo "Building frontend..."
	cd frontend && docker build -t ecommerce-frontend:latest .
	@echo "✅ Images built successfully"

# Push images to ECR
push-images: validate-ecr build-images
	@echo "📤 Pushing images to ECR..."
	@echo "Logging into ECR..."
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
	
	@echo "Tagging and pushing backend..."
	docker tag ecommerce-backend:latest $(BACKEND_REPO):latest
	docker push $(BACKEND_REPO):latest
	
	@echo "Tagging and pushing frontend..."
	docker tag ecommerce-frontend:latest $(FRONTEND_REPO):latest
	docker push $(FRONTEND_REPO):latest
	
	@echo "✅ Images pushed successfully"

# Deploy application (ECS, ALB)
dev-deploy-app: check-aws-account update-app-params
	@echo "🚀 Deploying application infrastructure..."
	aws cloudformation deploy \
		--template-file cloudformation/app/template.yml \
		--stack-name $(ENV)-ecommerce-app \
		--parameter-overrides file://cloudformation/app/$(ENV).json \
		--capabilities CAPABILITY_NAMED_IAM \
		--region $(AWS_REGION)
	@echo "✅ Application deployed"
	@$(MAKE) update-urls

# Update URLs in SSM after ALB deployment
update-urls: check-aws-account
	@echo "🔗 Updating service URLs in SSM..."
	$(eval ALB_DNS := $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-app --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null | sed 's|http://||'))
	@if [ ! -z "$(ALB_DNS)" ]; then \
		aws ssm put-parameter \
			--name "/$(ENV)/ecommerce/vnpay/return-url" \
			--value "http://$(ALB_DNS)/payment/return" \
			--type "String" \
			--overwrite \
			--region $(AWS_REGION); \
		echo "✅ VNPAY_RETURN_URL updated to: http://$(ALB_DNS)/payment/return"; \
	fi

# Full deployment (permanent + app)
dev-deploy-all: dev-deploy-permanent dev-setup-ssm create-ecr push-images dev-deploy-app
	@echo "🎉 Full deployment completed!"
	@$(MAKE) health-check

# Health check
health-check: check-aws-account
	@echo "🏥 Checking service health..."
	$(eval BACKEND_URL := $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-app --query 'Stacks[0].Outputs[?OutputKey==`BackendUrl`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null))
	$(eval FRONTEND_URL := $(shell aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-app --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' --output text --region $(AWS_REGION) 2>/dev/null))
	
	@if [ ! -z "$(BACKEND_URL)" ]; then \
		echo "🔍 Testing backend: $(BACKEND_URL)/health"; \
		curl -f -s --max-time 10 "$(BACKEND_URL)/health" > /dev/null && echo "✅ Backend healthy" || echo "❌ Backend not responding"; \
	fi
	
	@if [ ! -z "$(FRONTEND_URL)" ]; then \
		echo "🔍 Testing frontend: $(FRONTEND_URL)"; \
		curl -f -s --max-time 10 "$(FRONTEND_URL)" > /dev/null && echo "✅ Frontend healthy" || echo "❌ Frontend not responding"; \
	fi
	
	@echo ""
	@echo "🌐 Service URLs:"
	@echo "   Frontend: $(FRONTEND_URL)"
	@echo "   Backend:  $(BACKEND_URL)"

# View application logs
logs: check-aws-account
	@echo "📋 Viewing application logs..."
	@echo "Backend logs:"
	aws logs tail /ecs/$(ENV)-ecommerce-backend --follow --region $(AWS_REGION) &
	@echo "Frontend logs:"
	aws logs tail /ecs/$(ENV)-ecommerce-frontend --follow --region $(AWS_REGION)

# Show stack and service status
status: check-aws-account
	@echo "📊 Stack Status:"
	@echo "Permanent Stack:"
	@aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-permanent --query 'Stacks[0].StackStatus' --output text --region $(AWS_REGION) 2>/dev/null || echo "Not deployed"
	@echo "App Stack:"
	@aws cloudformation describe-stacks --stack-name $(ENV)-ecommerce-app --query 'Stacks[0].StackStatus' --output text --region $(AWS_REGION) 2>/dev/null || echo "Not deployed"
	
	@echo ""
	@echo "📊 ECS Service Status:"
	@aws ecs describe-services --cluster $(ENV)-ecommerce-cluster --services $(ENV)-ecommerce-backend $(ENV)-ecommerce-frontend --query 'services[*].{Service:serviceName,Status:status,Running:runningCount,Desired:desiredCount}' --output table --region $(AWS_REGION) 2>/dev/null || echo "Services not deployed"

# Teardown all resources
teardown: check-aws-account
	@echo "🧹 Tearing down all resources..."
	@echo "⚠️  This will DELETE all resources. Continue? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "Deleting app stack..."; \
		aws cloudformation delete-stack --stack-name $(ENV)-ecommerce-app --region $(AWS_REGION) 2>/dev/null; \
		echo "Waiting for app stack deletion..."; \
		aws cloudformation wait stack-delete-complete --stack-name $(ENV)-ecommerce-app --region $(AWS_REGION) 2>/dev/null; \
		echo "Deleting permanent stack..."; \
		aws cloudformation delete-stack --stack-name $(ENV)-ecommerce-permanent --region $(AWS_REGION) 2>/dev/null; \
		echo "✅ Teardown initiated. Resources will be deleted in a few minutes."; \
	else \
		echo "Teardown cancelled."; \
	fi

# List critical SSM parameters
list-ssm-params: check-aws-account
	@echo "📋 Critical SSM Parameters:"
	@aws ssm get-parameters-by-path --path "/$(ENV)/ecommerce" --recursive --with-decryption --query 'Parameters[*].{Name:Name,Value:Value}' --output table --region $(AWS_REGION) 2>/dev/null || echo "No parameters found"
