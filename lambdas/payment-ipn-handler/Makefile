#!/usr/bin/env make
# @author Based on pudo-task structure

# Import configuration
include Makefile.vars

# Set PROJECT_GIT_SHA from current git commit
PROJECT_GIT_SHA := $(shell git rev-parse HEAD 2>/dev/null || echo "unknown")

# Project configuration  
PROJECT_TYPE = python-lambda
ROOT_PATH := $(shell pwd)
BUILD_IMAGE_BASE_PATH = /usr/src/app

# Dependency management
DEPENDENCY_TYPE = pip
PYTHON_LAMBDA_REQUIREMENTS_PATH = $(ROOT_PATH)/requirements.txt

# Lambda configuration
PYTHON_LAMBDA_BUILD_MODULE = .
PYTHON_LAMBDA_DEPS_DIR = .venv
PYTHON_LAMBDA_DEPS_PATH = $(ROOT_PATH)/$(PYTHON_LAMBDA_DEPS_DIR)
PYTHON_LAMBDA_DEPS_ARTIFACT_DIR = dependencies
PYTHON_LAMBDA_DEPS_ARTIFACT_HOME = $(ROOT_PATH)/$(PYTHON_LAMBDA_DEPS_ARTIFACT_DIR)
PYTHON_LAMBDA_DEPS_ARTIFACT_PKG_PATH = $(PYTHON_LAMBDA_DEPS_ARTIFACT_HOME)/package
PYTHON_LAMBDA_DEPS_ARTIFACT_DIST_PATH = $(PYTHON_LAMBDA_DEPS_ARTIFACT_HOME)/dist

PYTHON_LAMBDA_BUILD_ARTIFACT_DIR = build
PYTHON_LAMBDA_BUILD_ARTIFACT_PATH = $(ROOT_PATH)/$(PYTHON_LAMBDA_BUILD_ARTIFACT_DIR)

# S3 configuration
PYTHON_LAMBDA_S3_ARTIFACT_BUCKET = ecommerce-lambda-artifacts
PYTHON_LAMBDA_S3_ARTIFACTS_PATH = s3://$(PYTHON_LAMBDA_S3_ARTIFACT_BUCKET)/$(LAMBDA_FUNCTION_NAME)

.PHONY: clean prep build test deploy push-artifacts create-function update-function

# Clean build artifacts
clean:
	rm -rf $(PYTHON_LAMBDA_BUILD_ARTIFACT_PATH)
	rm -rf $(PYTHON_LAMBDA_DEPS_ARTIFACT_HOME)
	rm -rf package/
	rm -f deployment-package.zip
	find . -name '*.py[co]' -delete
	find . -name __pycache__ -delete

# Prepare dependencies
prep: clean
	mkdir -p $(PYTHON_LAMBDA_DEPS_ARTIFACT_HOME)
	mkdir -p $(PYTHON_LAMBDA_DEPS_ARTIFACT_PKG_PATH)
	mkdir -p $(PYTHON_LAMBDA_BUILD_ARTIFACT_PATH)
	
	# Install dependencies
	pip3 install -r $(PYTHON_LAMBDA_REQUIREMENTS_PATH) -t $(PYTHON_LAMBDA_DEPS_ARTIFACT_PKG_PATH)

# Build the Lambda package
build: prep
	# Create distribution directory
	rm -rf $(PYTHON_LAMBDA_DEPS_ARTIFACT_DIST_PATH) && mkdir -p $(PYTHON_LAMBDA_DEPS_ARTIFACT_DIST_PATH)
	
	# Remove existing zip file
	rm -f $(PYTHON_LAMBDA_BUILD_ARTIFACT_PATH)/$(PROJECT_GIT_SHA).zip
	
	# Copy dependencies and source code
	cp -a $(PYTHON_LAMBDA_DEPS_ARTIFACT_PKG_PATH)/. $(PYTHON_LAMBDA_DEPS_ARTIFACT_DIST_PATH)/.
	cp lambda_function.py $(PYTHON_LAMBDA_DEPS_ARTIFACT_DIST_PATH)/
	
	# Create zip package
	cd $(PYTHON_LAMBDA_DEPS_ARTIFACT_DIST_PATH) && zip -r9 $(PYTHON_LAMBDA_BUILD_ARTIFACT_PATH)/$(PROJECT_GIT_SHA).zip .
	
	# Cleanup
	rm -rf $(PYTHON_LAMBDA_DEPS_ARTIFACT_DIST_PATH)
	
	@echo "Build completed: $(PYTHON_LAMBDA_BUILD_ARTIFACT_PATH)/$(PROJECT_GIT_SHA).zip"

# Test the function locally
test:
	python3 test_dev.py

# Create S3 bucket if it doesn't exist
create-bucket:
	@if ! aws s3 ls s3://$(PYTHON_LAMBDA_S3_ARTIFACT_BUCKET) >/dev/null 2>&1; then \
		echo "Creating S3 bucket: $(PYTHON_LAMBDA_S3_ARTIFACT_BUCKET)"; \
		aws s3 mb s3://$(PYTHON_LAMBDA_S3_ARTIFACT_BUCKET) --region $(AWS_REGION); \
	else \
		echo "S3 bucket already exists: $(PYTHON_LAMBDA_S3_ARTIFACT_BUCKET)"; \
	fi

# Push artifacts to S3
push-artifacts: build create-bucket
	@set -e; \
	LIST_OUTPUT="$$(aws s3 ls $(PYTHON_LAMBDA_S3_ARTIFACTS_PATH)/$(PROJECT_GIT_SHA).zip 2>&1 || true)"; \
	if [ -n "$$LIST_OUTPUT" ]; then \
		if [[ "$$LIST_OUTPUT" == *"$(PROJECT_GIT_SHA).zip"* ]]; then \
			echo "This version has already been published."; \
			echo "Please make a new commit if you want to publish a new version"; \
			exit 0; \
		else \
			echo "$$LIST_OUTPUT"; \
			exit 1; \
		fi; \
	fi; \
	aws s3 cp $(PYTHON_LAMBDA_BUILD_ARTIFACT_PATH)/$(PROJECT_GIT_SHA).zip $(PYTHON_LAMBDA_S3_ARTIFACTS_PATH)/$(PROJECT_GIT_SHA).zip
	@echo "Artifact pushed to: $(PYTHON_LAMBDA_S3_ARTIFACTS_PATH)/$(PROJECT_GIT_SHA).zip"

# Create IAM role for Lambda
create-role:
	@if ! aws iam get-role --role-name $(LAMBDA_ROLE_NAME) >/dev/null 2>&1; then \
		echo "Creating IAM role: $(LAMBDA_ROLE_NAME)"; \
		aws iam create-role --role-name $(LAMBDA_ROLE_NAME) --assume-role-policy-document '{ \
			"Version": "2012-10-17", \
			"Statement": [ \
				{ \
					"Effect": "Allow", \
					"Principal": { \
						"Service": "lambda.amazonaws.com" \
					}, \
					"Action": "sts:AssumeRole" \
				} \
			] \
		}'; \
		aws iam attach-role-policy --role-name $(LAMBDA_ROLE_NAME) --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole; \
		aws iam put-role-policy --role-name $(LAMBDA_ROLE_NAME) --policy-name SNSPublishPolicy --policy-document '{ \
			"Version": "2012-10-17", \
			"Statement": [ \
				{ \
					"Effect": "Allow", \
					"Action": [ \
						"sns:Publish" \
					], \
					"Resource": "*" \
				} \
			] \
		}'; \
		echo "Waiting for role to propagate..."; \
		sleep 10; \
	else \
		echo "IAM role already exists: $(LAMBDA_ROLE_NAME)"; \
	fi

# Create Lambda function
create-function: push-artifacts create-role
	aws lambda create-function \
		--function-name $(LAMBDA_FUNCTION_NAME) \
		--runtime $(LAMBDA_RUNTIME) \
		--role arn:aws:iam::$(AWS_ACCOUNT_ID):role/$(LAMBDA_ROLE_NAME) \
		--handler lambda_function.lambda_handler \
		--code S3Bucket=$(PYTHON_LAMBDA_S3_ARTIFACT_BUCKET),S3Key=$(LAMBDA_FUNCTION_NAME)/$(PROJECT_GIT_SHA).zip \
		--timeout $(LAMBDA_TIMEOUT) \
		--memory-size $(LAMBDA_MEMORY) \
		--environment Variables='{$(ENVIRONMENT_VARIABLES)}' \
		--region $(AWS_REGION)

# Update existing Lambda function
update-function: push-artifacts
	aws lambda update-function-code \
		--function-name $(LAMBDA_FUNCTION_NAME) \
		--s3-bucket $(PYTHON_LAMBDA_S3_ARTIFACT_BUCKET) \
		--s3-key $(LAMBDA_FUNCTION_NAME)/$(PROJECT_GIT_SHA).zip \
		--region $(AWS_REGION)
	
	aws lambda update-function-configuration \
		--function-name $(LAMBDA_FUNCTION_NAME) \
		--runtime $(LAMBDA_RUNTIME) \
		--timeout $(LAMBDA_TIMEOUT) \
		--memory-size $(LAMBDA_MEMORY) \
		--environment Variables='{$(ENVIRONMENT_VARIABLES)}' \
		--region $(AWS_REGION)

# Deploy (create or update)
deploy:
	@if aws lambda get-function --function-name $(LAMBDA_FUNCTION_NAME) --region $(AWS_REGION) >/dev/null 2>&1; then \
		echo "Function exists, updating..."; \
		$(MAKE) update-function; \
	else \
		echo "Function does not exist, creating..."; \
		$(MAKE) create-function; \
	fi
