# ECS with EC2 CloudFormation Template

This directory contains CloudFormation templates to deploy your ecommerce app using **ECS with EC2** (instead of Fargate) to optimize for AWS Free Tier usage.

## 🏗️ Architecture

- **ECS Cluster**: EC2-based with auto-scaling (t2.micro instances)
- **Application Load Balancer**: Routes traffic to frontend (port 80) and backend (port 8080)
- **Task Definitions**: Optimized for EC2 with bridge networking
- **Auto Scaling**: Both cluster-level and service-level scaling
- **Monitoring**: CloudWatch logging and basic alarms

## 📁 Files

- `template-ec2.yml` - Main CloudFormation template using professional patterns
- `dev-ec2.json` - Development environment parameters
- `prod-ec2.json` - Production environment parameters  
- `Makefile` - Deployment commands

## 🚀 Quick Deployment

### 1. Prerequisites

```bash
# Make sure you have AWS CLI configured
aws configure

# Ensure you have the required SSM parameters set:
# /${EnvironmentName}/ecommerce/security-group/app
# /${EnvironmentName}/ecommerce/db/url
# /${EnvironmentName}/ecommerce/jwt/secret
# /${EnvironmentName}/ecommerce/vnpay/tmn-code
# /${EnvironmentName}/ecommerce/vnpay/hash-key
# /${EnvironmentName}/ecommerce/google/client-id
# /${EnvironmentName}/ecommerce/s3/bucket
```

### 2. Update Parameters

Edit `dev-ec2.json` and replace:
```json
"ParameterValue": "REPLACE_WITH_YOUR_ECR_URL"
```
with your actual ECR repository URL.

### 3. Deploy

```bash
# Validate template first
make validate-ec2

# Deploy to development
make deploy-ec2-dev

# Check status
make status-ec2

# View outputs
make describe-ec2-dev
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `make deploy-ec2-dev` | Deploy to development |
| `make deploy-ec2-prod` | Deploy to production |
| `make validate-ec2` | Validate CloudFormation template |
| `make describe-ec2-dev` | Show dev stack outputs |
| `make describe-ec2-prod` | Show prod stack outputs |
| `make delete-ec2-dev` | Delete development stack |
| `make delete-ec2-prod` | Delete production stack |
| `make events-ec2-dev` | Show recent dev stack events |
| `make events-ec2-prod` | Show recent prod stack events |
| `make status-ec2` | Quick status check |
| `make help-ec2` | Show help |

## ⚙️ Configuration

### Development (dev-ec2.json)
- Instance: `t2.micro` (Free Tier)
- Cluster: 1-2 instances
- CPU/Memory: 256MB each service
- Desired tasks: 1 each

### Production (prod-ec2.json)  
- Instance: `t3.small`
- Cluster: 1-4 instances  
- CPU/Memory: 512MB backend, 256MB frontend
- Desired tasks: 2 each

## 🔧 Key Features

### Professional Template Integration
- Uses the same professional templates from pudo-service
- Robust auto-scaling with proper thresholds
- Lifecycle hooks for graceful instance termination
- CloudWatch monitoring and alarms

### EC2 Optimizations
- Bridge networking mode (no ENI limits)
- Instance-level target groups
- Proper health checks
- Cost-optimized resource allocation

### Free Tier Friendly
- Default t2.micro instances
- Minimal resource allocation
- Single instance minimum
- 7-day log retention

## 🛠️ Troubleshooting

### Check Stack Events
```bash
make events-ec2-dev
```

### View CloudFormation Console
Go to AWS Console > CloudFormation > `dev-ecommerce-ec2-app`

### Common Issues

1. **ECR URL**: Make sure to update the ImageUrl parameter
2. **Key Pair**: Ensure the EC2 key pair exists
3. **SSM Parameters**: Verify all required parameters are set
4. **Subnets**: Hardcoded to your existing subnets - update if needed

## 🎯 Migration from Fargate

This template provides an easy migration path from your existing Fargate setup:

1. **Same application structure** - both frontend and backend services
2. **Same environment variables** - uses SSM parameters
3. **Same load balancer setup** - ALB with dual listeners
4. **Improved auto-scaling** - more granular control

## 📊 Cost Benefits

- **~60% cost reduction** vs Fargate
- **Free Tier eligible** with t2.micro
- **No data transfer costs** within AZ
- **Predictable pricing** with EC2 instances