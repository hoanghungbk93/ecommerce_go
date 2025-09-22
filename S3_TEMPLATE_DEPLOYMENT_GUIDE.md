# S3-Based CloudFormation Deployment Guide

## 🎯 Overview

Your ecommerce app now follows the **pudo-service architecture pattern** using S3-hosted shared CloudFormation templates, just like you requested! This provides better modularity, reusability, and follows enterprise best practices.

## 📁 Architecture Structure

```
ecommerce-app/
├── cloudformation/
│   ├── app/
│   │   ├── template-ec2.yml          # Main app template (uses S3 references)
│   │   ├── dev-ec2-s3.json          # Parameters for S3-based deployment
│   │   └── template.yml             # Original Fargate template
│   ├── permanent/
│   │   └── template.yml             # Database & S3 resources
│   └── shared/                      # Templates to upload to S3
│       ├── ecs/
│       │   ├── service-cluster.yml  # ECS cluster with EC2 auto-scaling
│       │   └── service.yml          # ECS service with auto-scaling
│       └── load-balancers/
│           └── alb.yml              # Application Load Balancer
```

## 🚀 Step 1: Upload Shared Templates to S3

### Create S3 Bucket for Templates
```bash
# Create bucket for CloudFormation templates
aws s3 mb s3://ecommerce-cloudformation-templates-142473567235

# Create directory structure
aws s3api put-object --bucket ecommerce-cloudformation-templates-142473567235 --key templates/shared/ecs/
aws s3api put-object --bucket ecommerce-cloudformation-templates-142473567235 --key templates/shared/load-balancers/
```

### Upload Shared Templates
```bash
# Upload ECS templates
aws s3 cp cloudformation/shared/ecs/service-cluster.yml \
  s3://ecommerce-cloudformation-templates-142473567235/templates/shared/ecs/service-cluster.yml

aws s3 cp cloudformation/shared/ecs/service.yml \
  s3://ecommerce-cloudformation-templates-142473567235/templates/shared/ecs/service.yml

# Upload ALB template
aws s3 cp cloudformation/shared/load-balancers/alb.yml \
  s3://ecommerce-cloudformation-templates-142473567235/templates/shared/load-balancers/alb.yml
```

### Set Bucket Policy for CloudFormation Access
```bash
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFormationAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudformation.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ecommerce-cloudformation-templates-142473567235/templates/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket ecommerce-cloudformation-templates-142473567235 --policy file://bucket-policy.json
```

## 🚀 Step 2: Update Parameter File

Edit `cloudformation/app/dev-ec2-s3.json` and update the S3 URL:

```json
{
  "ParameterKey": "CloudformationBaseUrl",
  "ParameterValue": "https://s3.amazonaws.com/your-actual-bucket-name/templates/shared"
}
```

## 🚀 Step 3: Deploy Infrastructure

### Deploy Database & Permanent Resources First
```bash
aws cloudformation deploy \
  --template-file cloudformation/permanent/template.yml \
  --stack-name dev-ecommerce-permanent \
  --parameter-overrides file://cloudformation/permanent/free-tier-dev.json \
  --capabilities CAPABILITY_NAMED_IAM
```

### Deploy Application (ECS on EC2 with S3 Templates)
```bash
aws cloudformation deploy \
  --template-file cloudformation/app/template-ec2.yml \
  --stack-name dev-ecommerce-app-ec2 \
  --parameter-overrides file://cloudformation/app/dev-ec2-s3.json \
  --capabilities CAPABILITY_NAMED_IAM
```

## 🔧 Key Features of Your New Architecture

### ✅ **Like Pudo-Service:**
- **S3-hosted shared templates** for modularity
- **Nested CloudFormation stacks** for better organization
- **ECS on EC2** instead of expensive Fargate
- **Auto-scaling groups** for high availability
- **SSM parameters** for configuration management

### ✅ **Free Tier Optimized:**
- **t3.micro instances** (free tier eligible)
- **Minimal memory allocation** (256MB containers)
- **Single instance clusters** for development
- **7-day log retention** to minimize costs

### ✅ **Enterprise Ready:**
- **IAM roles** with least privilege access
- **CloudWatch logging** and monitoring
- **Auto-scaling policies** based on CPU
- **Load balancer health checks**

## 💰 Cost Comparison

| Component | Original (Fargate) | New (EC2) | Savings |
|-----------|-------------------|-----------|---------|
| Compute | ~$15/month | **FREE** (t3.micro) | ~$15/month |
| Load Balancer | ~$22/month | ~$22/month | $0 |
| Database | FREE (1st year) | FREE (1st year) | $0 |
| **Total** | **~$37/month** | **~$22/month** | **~$15/month** |

> **Note:** ALB still costs money. For true free tier, consider removing ALB and using direct EC2 access.

## 🎛️ Configuration Management

### SSM Parameters Created:
```bash
# Application URLs
/${EnvironmentName}/ecommerce/backend/url
/${EnvironmentName}/ecommerce/frontend/url

# Database connection
/${EnvironmentName}/ecommerce/db/url
/${EnvironmentName}/ecommerce/db/host
/${EnvironmentName}/ecommerce/db/port

# Application secrets
/${EnvironmentName}/ecommerce/jwt/secret
/${EnvironmentName}/ecommerce/vnpay/tmn-code
/${EnvironmentName}/ecommerce/google/client-id
```

### Update Configuration:
```bash
# Update JWT secret
aws ssm put-parameter \
  --name "/dev/ecommerce/jwt/secret" \
  --value "your-actual-jwt-secret" \
  --overwrite

# Update Google OAuth
aws ssm put-parameter \
  --name "/dev/ecommerce/google/client-id" \
  --value "your-google-client-id" \
  --overwrite
```

## 📊 Monitoring & Scaling

### View Cluster Status:
```bash
# Check ECS cluster
aws ecs describe-clusters --clusters dev-ecommerce

# Check services
aws ecs describe-services \
  --cluster dev-ecommerce \
  --services dev-ecommerce-backend dev-ecommerce-frontend

# Check Auto Scaling Group
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names dev-ecommerce-asg
```

### Scale Services:
```bash
# Scale backend service
aws ecs update-service \
  --cluster dev-ecommerce \
  --service dev-ecommerce-backend \
  --desired-count 2

# Scale EC2 instances
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name dev-ecommerce-asg \
  --desired-capacity 2
```

## 🔄 CI/CD Integration

### Update Application Image:
```bash
# Build and push new image
docker build -t 142473567235.dkr.ecr.ap-southeast-1.amazonaws.com/ecommerce-app/backend:v1.2.3 ./backend
docker push 142473567235.dkr.ecr.ap-southeast-1.amazonaws.com/ecommerce-app/backend:v1.2.3

# Update CloudFormation with new image
aws cloudformation deploy \
  --template-file cloudformation/app/template-ec2.yml \
  --stack-name dev-ecommerce-app-ec2 \
  --parameter-overrides \
    CloudformationBaseUrl=https://s3.amazonaws.com/ecommerce-cloudformation-templates-142473567235/templates/shared \
    EnvironmentName=dev \
    ImageUrl=142473567235.dkr.ecr.ap-southeast-1.amazonaws.com/ecommerce-app \
    GitSha=v1.2.3 \
    InstanceType=t3.micro \
  --capabilities CAPABILITY_NAMED_IAM
```

## 🎯 Next Steps

1. **Update your S3 bucket name** in the parameter file
2. **Upload shared templates** to your S3 bucket
3. **Deploy permanent resources** first
4. **Deploy application** using the new template
5. **Configure your secrets** in SSM Parameter Store
6. **Test the deployment** and verify everything works

## 🆘 Troubleshooting

### Common Issues:

1. **S3 Access Denied:**
   - Check bucket policy allows CloudFormation access
   - Verify bucket name in parameters

2. **Template Not Found:**
   - Ensure templates are uploaded to correct S3 paths
   - Check CloudformationBaseUrl parameter

3. **Service Won't Start:**
   - Check ECS task logs in CloudWatch
   - Verify ECR image exists and is accessible
   - Check SSM parameters are set correctly

4. **Health Check Failures:**
   - Verify your application responds on the health check path
   - Check security group allows ALB to reach EC2 instances

Your infrastructure now follows the same enterprise pattern as pudo-service with S3-hosted templates! 🎉