#!/bin/bash

# Script to make admin@ecommerce.com an admin user and seed demo data
# This uses an ECS task to run SQL commands with database access

set -e

AWS_REGION=${AWS_REGION:-ap-southeast-1}
ENV=${ENV:-dev}

echo "🔧 Making admin@ecommerce.com an admin user..."

# Get database URL from SSM
DB_URL=$(aws ssm get-parameter --name "/${ENV}/ecommerce/db/url" --with-decryption --region $AWS_REGION --query 'Parameter.Value' --output text 2>/dev/null)

if [ -z "$DB_URL" ]; then
    echo "❌ Database URL not found in SSM parameter store"
    exit 1
fi

# Create a temporary ECS task to run SQL commands
echo "📝 Creating temporary database task..."

# Create a simple Dockerfile for database operations
cat > /tmp/Dockerfile.dbops <<EOF
FROM postgres:13-alpine
RUN apk add --no-cache curl
WORKDIR /app
EOF

# Build and push the image
echo "🔨 Building database operations image..."
docker build -f /tmp/Dockerfile.dbops -t db-ops:latest /tmp/

# Get AWS account ID and ECR URL
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region $AWS_REGION)
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ecommerce-app/db-ops:latest"

# Login to ECR and push
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Create repository if it doesn't exist
aws ecr create-repository --repository-name ecommerce-app/db-ops --region $AWS_REGION || echo "Repository already exists"

docker tag db-ops:latest $ECR_URL
docker push $ECR_URL

echo "✅ Database operations image pushed"

# For now, provide manual instructions
echo ""
echo "📋 Manual Steps Required:"
echo "1. Connect to your RDS instance using a bastion host or database client"
echo "2. Run this SQL command:"
echo ""
echo "   UPDATE users SET role = 'admin', email_verified = true WHERE email = 'admin@ecommerce.com';"
echo ""
echo "3. Verify with:"
echo "   SELECT email, role FROM users WHERE email = 'admin@ecommerce.com';"
echo ""
echo "4. Then run the comprehensive seeding script:"
echo "   ./scripts/seed-api.sh \"http://dev-ecommerce-alb-415161429.ap-southeast-1.elb.amazonaws.com:8080\""
echo ""
echo "💡 Alternative: Use AWS RDS Query Editor in the AWS Console to run the SQL"

# Clean up
rm -f /tmp/Dockerfile.dbops
