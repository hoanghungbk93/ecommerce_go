#!/bin/bash

# Deployment Validation Script
# Validates that your infrastructure is properly configured and ready for deployment

set -e

# Configuration
SERVICE_NAME="${1:-ecommerce}"
ENVIRONMENT="${2:-dev}"
REGION="${3:-ap-southeast-1}"
STACK_NAME="${ENVIRONMENT}-${SERVICE_NAME}-infrastructure"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔍 Validating ${SERVICE_NAME} deployment configuration${NC}"
echo "=============================================="

# Check AWS CLI configuration
check_aws_cli() {
    echo -e "${YELLOW}Checking AWS CLI configuration...${NC}"

    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not installed${NC}"
        return 1
    fi

    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo -e "${RED}❌ AWS CLI not configured or no permissions${NC}"
        echo "Please run: aws configure"
        return 1
    fi

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "")

    echo -e "${GREEN}✅ AWS CLI configured${NC}"
    echo "   Account ID: $ACCOUNT_ID"
    echo "   Region: ${AWS_REGION:-$REGION}"

    return 0
}

# Check required files
check_files() {
    echo -e "${YELLOW}Checking required files...${NC}"

    local files=(
        "infrastructure-template.yml"
        "${SERVICE_NAME}-${ENVIRONMENT}-params.json"
        "Makefile.new"
    )

    local missing_files=0

    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}✅ $file${NC}"
        else
            echo -e "${RED}❌ $file (missing)${NC}"
            missing_files=$((missing_files + 1))
        fi
    done

    if [ $missing_files -gt 0 ]; then
        echo -e "${RED}❌ $missing_files required files are missing${NC}"
        return 1
    fi

    return 0
}

# Validate CloudFormation template
validate_template() {
    echo -e "${YELLOW}Validating CloudFormation template...${NC}"

    if aws cloudformation validate-template \
        --template-body file://infrastructure-template.yml \
        --region "$REGION" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ CloudFormation template is valid${NC}"
        return 0
    else
        echo -e "${RED}❌ CloudFormation template validation failed${NC}"
        aws cloudformation validate-template \
            --template-body file://infrastructure-template.yml \
            --region "$REGION" 2>&1 || true
        return 1
    fi
}

# Check ECR repositories
check_ecr_repos() {
    echo -e "${YELLOW}Checking ECR repositories...${NC}"

    local repos=("ecommerce-app/backend" "ecommerce-app/frontend")
    local missing_repos=0

    for repo in "${repos[@]}"; do
        if aws ecr describe-repositories --repository-names "$repo" --region "$REGION" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ ECR repository: $repo${NC}"
        else
            echo -e "${RED}❌ ECR repository missing: $repo${NC}"
            missing_repos=$((missing_repos + 1))
        fi
    done

    if [ $missing_repos -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $missing_repos ECR repositories are missing${NC}"
        echo "You can create them with:"
        for repo in "${repos[@]}"; do
            echo "  aws ecr create-repository --repository-name $repo --region $REGION"
        done
        return 1
    fi

    return 0
}

# Check parameter file format
check_parameters() {
    echo -e "${YELLOW}Checking parameter file format...${NC}"

    local param_file="${SERVICE_NAME}-${ENVIRONMENT}-params.json"

    if ! jq . "$param_file" >/dev/null 2>&1; then
        echo -e "${RED}❌ Parameter file is not valid JSON${NC}"
        return 1
    fi

    # Check required parameters
    local required_params=(
        "ServiceName"
        "Environment"
        "DomainName"
        "BackendImageUri"
        "FrontendImageUri"
    )

    local missing_params=0
    for param in "${required_params[@]}"; do
        if jq -r --arg param "$param" '.[] | select(.ParameterKey == $param) | .ParameterValue' "$param_file" | grep -q .; then
            echo -e "${GREEN}✅ Parameter: $param${NC}"
        else
            echo -e "${RED}❌ Missing parameter: $param${NC}"
            missing_params=$((missing_params + 1))
        fi
    done

    if [ $missing_params -gt 0 ]; then
        echo -e "${RED}❌ $missing_params required parameters are missing${NC}"
        return 1
    fi

    return 0
}

# Check existing stack status
check_existing_stack() {
    echo -e "${YELLOW}Checking existing stack status...${NC}"

    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1; then
        local stack_status=$(aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --query 'Stacks[0].StackStatus' \
            --output text --region "$REGION")

        echo -e "${YELLOW}⚠️  Stack $STACK_NAME already exists${NC}"
        echo "   Status: $stack_status"

        if [[ "$stack_status" == *"IN_PROGRESS"* ]]; then
            echo -e "${RED}❌ Stack is currently updating. Please wait for completion.${NC}"
            return 1
        elif [[ "$stack_status" == *"FAILED"* ]]; then
            echo -e "${RED}❌ Stack is in failed state. Consider deleting and recreating.${NC}"
            return 1
        else
            echo -e "${GREEN}✅ Stack is in stable state${NC}"
            return 0
        fi
    else
        echo -e "${GREEN}✅ No existing stack found (ready for new deployment)${NC}"
        return 0
    fi
}

# Check SSL certificate
check_ssl_certificate() {
    echo -e "${YELLOW}Checking SSL certificate...${NC}"

    local domain_name=$(jq -r '.[] | select(.ParameterKey == "DomainName") | .ParameterValue' "${SERVICE_NAME}-${ENVIRONMENT}-params.json")

    if [ -z "$domain_name" ] || [ "$domain_name" = "null" ]; then
        echo -e "${RED}❌ Domain name not found in parameters${NC}"
        return 1
    fi

    # Check if certificate exists
    local cert_arn=$(aws acm list-certificates --region "$REGION" \
        --query "CertificateSummaryList[?DomainName=='$domain_name'].CertificateArn" \
        --output text 2>/dev/null || echo "")

    if [ -n "$cert_arn" ] && [ "$cert_arn" != "None" ]; then
        local cert_status=$(aws acm describe-certificate --certificate-arn "$cert_arn" \
            --query 'Certificate.Status' --output text --region "$REGION")
        echo -e "${GREEN}✅ SSL certificate exists for $domain_name${NC}"
        echo "   Status: $cert_status"
        echo "   ARN: $cert_arn"
    else
        echo -e "${YELLOW}⚠️  No SSL certificate found for $domain_name${NC}"
        echo "   A new certificate will be created during deployment"
    fi

    return 0
}

# Generate deployment summary
generate_summary() {
    echo ""
    echo -e "${GREEN}📋 Deployment Summary${NC}"
    echo "====================="
    echo "Service Name: $SERVICE_NAME"
    echo "Environment: $ENVIRONMENT"
    echo "Region: $REGION"
    echo "Stack Name: $STACK_NAME"
    echo ""

    local domain_name=$(jq -r '.[] | select(.ParameterKey == "DomainName") | .ParameterValue' "${SERVICE_NAME}-${ENVIRONMENT}-params.json" 2>/dev/null || echo "Not configured")
    echo "Domain: $domain_name"

    local instance_type=$(jq -r '.[] | select(.ParameterKey == "InstanceType") | .ParameterValue' "${SERVICE_NAME}-${ENVIRONMENT}-params.json" 2>/dev/null || echo "t3.micro")
    echo "Instance Type: $instance_type"

    local enable_db=$(jq -r '.[] | select(.ParameterKey == "EnableDatabase") | .ParameterValue' "${SERVICE_NAME}-${ENVIRONMENT}-params.json" 2>/dev/null || echo "true")
    echo "Database Enabled: $enable_db"

    echo ""
    echo -e "${GREEN}🚀 Ready to deploy!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: make create"
    echo "2. Run: make start"
    echo "3. Run: ./setup-domain.sh (if using custom domain)"
    echo "4. Access your app at: https://$domain_name"
}

# Main validation function
main() {
    local validation_failed=0

    echo "Configuration:"
    echo "  Service: $SERVICE_NAME"
    echo "  Environment: $ENVIRONMENT"
    echo "  Region: $REGION"
    echo ""

    # Run all checks
    check_aws_cli || validation_failed=1
    echo ""

    check_files || validation_failed=1
    echo ""

    validate_template || validation_failed=1
    echo ""

    check_parameters || validation_failed=1
    echo ""

    check_ecr_repos || validation_failed=1
    echo ""

    check_existing_stack || validation_failed=1
    echo ""

    check_ssl_certificate || validation_failed=1
    echo ""

    if [ $validation_failed -eq 0 ]; then
        generate_summary
        echo -e "${GREEN}🎉 All validations passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some validations failed. Please fix the issues above before deploying.${NC}"
        exit 1
    fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required but not installed${NC}"
    echo "Please install jq: brew install jq (on macOS) or apt-get install jq (on Ubuntu)"
    exit 1
fi

# Run main function
main "$@"