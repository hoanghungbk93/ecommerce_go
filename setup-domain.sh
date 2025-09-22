#!/bin/bash

# Domain Setup Script for ecommerce infrastructure
# This script sets up Route53 domain routing for your custom domain

set -e

# Configuration
DOMAIN_NAME="${1:-dev-ecommerce.itmf.com.vn}"
ENVIRONMENT="${2:-dev}"
SERVICE_NAME="${3:-ecommerce}"
REGION="${4:-ap-southeast-1}"
STACK_NAME="${ENVIRONMENT}-${SERVICE_NAME}-ec2-app"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🌐 Setting up domain routing for ${DOMAIN_NAME}${NC}"
echo "=============================================="

# Function to find or create hosted zone
setup_hosted_zone() {
    local domain_name="$1"
    local zone_name

    # Extract the main domain (e.g., itmf.com.vn from dev-ecommerce.itmf.com.vn)
    if [[ "$domain_name" == *.*.* ]]; then
        zone_name=$(echo "$domain_name" | sed 's/^[^.]*\.//')
    else
        zone_name="$domain_name"
    fi

    echo -e "${YELLOW}Checking for hosted zone: ${zone_name}${NC}"

    # Check if hosted zone exists
    HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
        --query "HostedZones[?Name=='${zone_name}.'].Id" \
        --output text | sed 's|/hostedzone/||')

    if [ -z "$HOSTED_ZONE_ID" ] || [ "$HOSTED_ZONE_ID" = "None" ]; then
        echo -e "${YELLOW}Creating hosted zone for ${zone_name}...${NC}"

        HOSTED_ZONE_ID=$(aws route53 create-hosted-zone \
            --name "$zone_name" \
            --caller-reference "$(date +%s)" \
            --hosted-zone-config Comment="Hosted zone for ${zone_name}" \
            --query 'HostedZone.Id' \
            --output text | sed 's|/hostedzone/||')

        echo -e "${GREEN}✅ Created hosted zone: ${HOSTED_ZONE_ID}${NC}"

        # Get name servers
        echo -e "${YELLOW}📋 Name servers for your domain registrar:${NC}"
        aws route53 get-hosted-zone --id "$HOSTED_ZONE_ID" \
            --query 'DelegationSet.NameServers[]' \
            --output table

        echo -e "${YELLOW}⚠️  Please update your domain registrar with these name servers!${NC}"
    else
        echo -e "${GREEN}✅ Found existing hosted zone: ${HOSTED_ZONE_ID}${NC}"
    fi

    echo "$HOSTED_ZONE_ID"
}

# Function to get ALB DNS name
get_alb_dns() {
    local stack_name="$1"

    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text --region "$REGION" 2>/dev/null || echo "")

    if [ -z "$ALB_DNS" ] || [ "$ALB_DNS" = "None" ]; then
        echo -e "${RED}❌ Could not find ALB DNS name in stack outputs${NC}"
        echo "Please make sure your infrastructure is deployed with the new template."
        exit 1
    fi

    echo "$ALB_DNS"
}

# Function to create or update DNS record
create_dns_record() {
    local domain_name="$1"
    local hosted_zone_id="$2"
    local alb_dns="$3"

    echo -e "${YELLOW}Creating DNS record for ${domain_name} -> ${alb_dns}${NC}"

    # Create change batch JSON
    cat > /tmp/change-batch.json << EOF
{
    "Changes": [
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "${domain_name}",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "${alb_dns}"
                    }
                ]
            }
        }
    ]
}
EOF

    # Apply the change
    CHANGE_ID=$(aws route53 change-resource-record-sets \
        --hosted-zone-id "$hosted_zone_id" \
        --change-batch file:///tmp/change-batch.json \
        --query 'ChangeInfo.Id' \
        --output text)

    echo -e "${GREEN}✅ DNS record created/updated. Change ID: ${CHANGE_ID}${NC}"

    # Wait for change to propagate
    echo -e "${YELLOW}⏳ Waiting for DNS change to propagate...${NC}"
    aws route53 wait resource-record-sets-changed --id "$CHANGE_ID"

    echo -e "${GREEN}✅ DNS change propagated successfully!${NC}"

    # Clean up
    rm -f /tmp/change-batch.json
}

# Function to test domain resolution
test_domain() {
    local domain_name="$1"

    echo -e "${YELLOW}🧪 Testing domain resolution...${NC}"

    # Test DNS resolution
    if nslookup "$domain_name" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ DNS resolution successful${NC}"

        # Test HTTPS connectivity
        echo -e "${YELLOW}Testing HTTPS connectivity...${NC}"
        if curl -I "https://${domain_name}" --max-time 10 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ HTTPS connectivity successful${NC}"
        else
            echo -e "${YELLOW}⚠️  HTTPS not yet available (SSL certificate may still be validating)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  DNS resolution not yet available (may take a few minutes)${NC}"
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}Configuration:${NC}"
    echo "  Domain: $DOMAIN_NAME"
    echo "  Environment: $ENVIRONMENT"
    echo "  Service: $SERVICE_NAME"
    echo "  Region: $REGION"
    echo "  Stack: $STACK_NAME"
    echo ""

    # Check if stack exists
    if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1; then
        echo -e "${RED}❌ Stack ${STACK_NAME} not found!${NC}"
        echo "Please deploy your infrastructure first with: make create"
        exit 1
    fi

    # Get ALB DNS name
    echo -e "${YELLOW}🔍 Getting ALB DNS name...${NC}"
    ALB_DNS=$(get_alb_dns "$STACK_NAME")
    echo -e "${GREEN}Found ALB: ${ALB_DNS}${NC}"

    # Setup hosted zone
    echo -e "${YELLOW}🏗️  Setting up hosted zone...${NC}"
    HOSTED_ZONE_ID=$(setup_hosted_zone "$DOMAIN_NAME")

    # Create DNS record
    echo -e "${YELLOW}📝 Creating DNS record...${NC}"
    create_dns_record "$DOMAIN_NAME" "$HOSTED_ZONE_ID" "$ALB_DNS"

    # Test domain
    test_domain "$DOMAIN_NAME"

    echo ""
    echo -e "${GREEN}🎉 Domain setup complete!${NC}"
    echo "=============================================="
    echo -e "${GREEN}Your application should be available at:${NC}"
    echo -e "${GREEN}  https://${DOMAIN_NAME}${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "  1. If you created a new hosted zone, update your domain registrar with the name servers shown above"
    echo "  2. Wait 5-10 minutes for SSL certificate validation"
    echo "  3. Test your application at https://${DOMAIN_NAME}"
    echo ""
    echo -e "${YELLOW}🔧 Useful commands:${NC}"
    echo "  make status    - Check infrastructure status"
    echo "  make logs      - View application logs"
    echo "  make start     - Start services"
    echo "  make stop      - Stop services"
}

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured or no permissions${NC}"
    echo "Please run: aws configure"
    exit 1
fi

# Run main function
main "$@"