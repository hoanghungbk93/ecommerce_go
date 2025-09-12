#!/bin/bash

# Script to make user admin via temporary ECS task
set -e

AWS_REGION="ap-southeast-1"
ENV="dev"

echo "🔧 Making admin@ecommerce.com an admin user via ECS task..."

# Get database URL
echo "📝 Getting database connection info..."
DB_URL=$(aws ssm get-parameter --name "/${ENV}/ecommerce/db/url" --with-decryption --region $AWS_REGION --query 'Parameter.Value' --output text)

if [ -z "$DB_URL" ]; then
    echo "❌ Database URL not found"
    exit 1
fi

echo "✅ Database URL retrieved"

# Create task definition for database operations
echo "📋 Creating ECS task definition..."

cat > /tmp/db-task-definition.json <<EOF
{
    "family": "${ENV}-ecommerce-db-ops",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/${ENV}-ecommerce-task-execution-role",
    "containerDefinitions": [
        {
            "name": "db-ops",
            "image": "postgres:13-alpine",
            "essential": true,
            "environment": [
                {
                    "name": "DATABASE_URL",
                    "value": "${DB_URL}"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/${ENV}-ecommerce-db-ops",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "entryPoint": ["sh", "-c"],
            "command": ["psql \"\$DATABASE_URL\" -c \"UPDATE users SET role = 'admin', email_verified = true WHERE email = 'admin@ecommerce.com'; SELECT email, role FROM users WHERE email = 'admin@ecommerce.com';\" && echo 'Admin promotion completed!'"]
        }
    ]
}
EOF

# Create log group
aws logs create-log-group --log-group-name "/ecs/${ENV}-ecommerce-db-ops" --region $AWS_REGION || echo "Log group might already exist"

# Register task definition
TASK_DEFINITION_ARN=$(aws ecs register-task-definition --cli-input-json file:///tmp/db-task-definition.json --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)

echo "✅ Task definition created: $TASK_DEFINITION_ARN"

# Run the task
echo "🚀 Running database operations task..."

TASK_ARN=$(aws ecs run-task \
    --cluster ${ENV}-ecommerce-cluster \
    --task-definition $TASK_DEFINITION_ARN \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-095a264d86c3670bb,subnet-0192656fc2b518bf9,subnet-07a3b902dc925f6e4],securityGroups=[sg-01290171b2a903a15],assignPublicIp=ENABLED}" \
    --region $AWS_REGION \
    --query 'tasks[0].taskArn' --output text)

echo "✅ Task started: $TASK_ARN"
echo "⏳ Waiting for task to complete..."

# Wait for task to complete
aws ecs wait tasks-stopped --cluster ${ENV}-ecommerce-cluster --tasks $TASK_ARN --region $AWS_REGION

# Check task exit code
EXIT_CODE=$(aws ecs describe-tasks --cluster ${ENV}-ecommerce-cluster --tasks $TASK_ARN --region $AWS_REGION --query 'tasks[0].containers[0].exitCode' --output text)

if [ "$EXIT_CODE" = "0" ]; then
    echo "✅ Task completed successfully!"
    echo "📋 Checking logs..."
    
    # Get logs (may need a moment for them to appear)
    sleep 5
    aws logs get-log-events \
        --log-group-name "/ecs/${ENV}-ecommerce-db-ops" \
        --log-stream-name "ecs/db-ops/$(echo $TASK_ARN | cut -d'/' -f3)" \
        --region $AWS_REGION \
        --query 'events[*].message' \
        --output text
    
    echo ""
    echo "🎉 Admin user promotion completed!"
    echo "🚀 Now you can run: ./scripts/quick-seed.sh"
else
    echo "❌ Task failed with exit code: $EXIT_CODE"
    echo "📋 Check logs for details"
fi

# Clean up
rm -f /tmp/db-task-definition.json

echo ""
echo "🎯 Next step: Run ./scripts/quick-seed.sh to add products"
