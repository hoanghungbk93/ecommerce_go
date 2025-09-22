# Free Tier AWS Deployment Guide

## 🚨 Important Cost Analysis

Your current CloudFormation setup has **significant cost implications** that exceed AWS free tier limits:

### Current Costs (Monthly):
- **Fargate Tasks**: ~$10-15/month (256 CPU, 512MB RAM)
- **Application Load Balancer**: ~$22/month (not free tier eligible)
- **RDS PostgreSQL (db.t3.micro)**: Free for first 12 months, then ~$15/month
- **Total: ~$32-52/month**

### Free Tier Alternative Costs:
- **EC2 t2.micro**: Free (750 hours/month for 12 months)
- **RDS db.t3.micro**: Free (750 hours/month for 12 months)
- **S3**: Free (5GB storage, 20K GET, 2K PUT requests)
- **Total: $0/month for first year**

## Architecture Comparison

| Component | Current (Costly) | Free Tier Alternative |
|-----------|------------------|----------------------|
| Compute | Fargate (ECS) | EC2 t2.micro |
| Load Balancer | ALB (~$22/month) | Direct EC2 + Elastic IP |
| Database | PostgreSQL (Free 1st year) | Same (Free 1st year) |
| Storage | S3 (Free tier) | Same (Free tier) |

## Free Tier Deployment Options

### Option 1: EC2 + Docker Compose (Recommended for Free Tier)

Replace ECS Fargate with a single EC2 instance running Docker Compose:

```yaml
# Create new template: cloudformation/app/template-ec2.yml
Resources:
  WebServerInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t2.micro  # Free tier eligible
      ImageId: ami-0c02fb55956c7d316  # Amazon Linux 2
      SecurityGroupIds:
        - !Ref WebSecurityGroup
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          yum update -y
          yum install -y docker git
          service docker start
          usermod -a -G docker ec2-user

          # Install Docker Compose
          curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
          chmod +x /usr/local/bin/docker-compose

          # Deploy your app
          cd /home/ec2-user
          git clone YOUR_REPO_URL ecommerce-app
          cd ecommerce-app
          docker-compose up -d
```

### Option 2: Keep Current ECS but Remove ALB

Modify your current template to remove the ALB and use direct ECS service with public IP:

```bash
# Remove these resources from template.yml:
- ApplicationLoadBalancer
- BackendTargetGroup
- FrontendTargetGroup
- BackendListener
- FrontendListener

# Modify services to remove LoadBalancers section
# Add AssignPublicIp: ENABLED to NetworkConfiguration
```

## Step-by-Step Migration

### 1. Deploy Database Stack (Free Tier Compatible)
```bash
aws cloudformation deploy \
  --template-file cloudformation/permanent/template.yml \
  --stack-name dev-ecommerce-permanent \
  --parameter-overrides file://cloudformation/permanent/free-tier-dev.json \
  --capabilities CAPABILITY_NAMED_IAM
```

### 2. Choose Your Compute Option

#### Option A: Current ECS (Remove ALB for cost savings)
```bash
# Edit template.yml to remove ALB resources
aws cloudformation deploy \
  --template-file cloudformation/app/template.yml \
  --stack-name dev-ecommerce-app \
  --parameter-overrides file://cloudformation/app/free-tier-dev.json \
  --capabilities CAPABILITY_NAMED_IAM
```

#### Option B: EC2 + Docker (Maximum cost savings)
```bash
# Create new EC2-based template
aws cloudformation deploy \
  --template-file cloudformation/app/template-ec2.yml \
  --stack-name dev-ecommerce-app-ec2 \
  --parameter-overrides file://cloudformation/app/free-tier-dev.json \
  --capabilities CAPABILITY_NAMED_IAM
```

## Free Tier Monitoring & Limits

### AWS Free Tier Limits (First 12 Months):
- **EC2**: 750 hours/month of t2.micro instances
- **RDS**: 750 hours/month of db.t3.micro instances
- **S3**: 5 GB of standard storage
- **Data Transfer**: 15 GB outbound per month

### Setting Up Billing Alerts:
1. Go to AWS Billing Console
2. Create billing alarm for $1, $5, $10 thresholds
3. Monitor usage in AWS Free Tier dashboard

## Docker Compose Alternative (No CloudFormation)

For maximum simplicity and cost savings, run everything on a single EC2 instance:

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - REACT_APP_API_URL=http://YOUR_EC2_IP:8080/api/v1

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://username:password@YOUR_RDS_ENDPOINT/ecommerce
      - JWT_SECRET=your-secret-key
```

## Security Considerations for Public RDS

Your RDS is set to `PubliclyAccessible: true`. For production:

1. **Create DB subnet group** with private subnets
2. **Use security groups** to restrict access to EC2 only
3. **Enable SSL/TLS** connections
4. **Regular backups** (free tier includes 20GB backup storage)

## Cost Optimization Checklist

- [ ] Use t2.micro EC2 instances only
- [ ] Remove Application Load Balancer
- [ ] Use db.t3.micro for RDS
- [ ] Keep S3 usage under 5GB
- [ ] Monitor data transfer limits
- [ ] Set up billing alerts
- [ ] Stop instances when not needed for development

## Deployment Commands

### Using Your Current Setup:
```bash
# Deploy permanent resources first
aws cloudformation deploy \
  --template-file cloudformation/permanent/template.yml \
  --stack-name dev-ecommerce-permanent \
  --parameter-overrides file://cloudformation/permanent/free-tier-dev.json \
  --capabilities CAPABILITY_NAMED_IAM

# Deploy application (with ALB - costs money)
aws cloudformation deploy \
  --template-file cloudformation/app/template.yml \
  --stack-name dev-ecommerce-app \
  --parameter-overrides file://cloudformation/app/free-tier-dev.json \
  --capabilities CAPABILITY_NAMED_IAM
```

### View Stack Outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name dev-ecommerce-app \
  --query 'Stacks[0].Outputs'
```

## Next Steps

1. **Choose your deployment option** based on cost tolerance
2. **Update subnet IDs** in template.yml (currently hardcoded)
3. **Create ECR repositories** for your Docker images
4. **Set up CI/CD pipeline** for automated deployments
5. **Configure domain name** if you have one

Would you like me to create the EC2-based template for maximum cost savings?