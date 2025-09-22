# 🚀 Simplified AWS Deployment Guide

Complete infrastructure deployment with **3 simple commands**: `make create`, `make start`, `make stop`

## 📋 What's Included

Your infrastructure includes:
- ✅ **ECS Cluster** with EC2 instances
- ✅ **Application Load Balancer** with SSL/HTTPS
- ✅ **RDS PostgreSQL Database**
- ✅ **Custom Domain Support** (dev-ecommerce.itmf.com.vn)
- ✅ **Auto Scaling & Health Checks**
- ✅ **CloudWatch Logging**
- ✅ **Security Groups & VPC**

## 🎯 Quick Start

### 1. Deploy Infrastructure
```bash
# Create complete infrastructure
make create

# Or specify custom service name
make create SERVICE_NAME=myapp ENVIRONMENT=prod
```

### 2. Start Services
```bash
make start
```

### 3. Stop Services
```bash
make stop
```

That's it! Your application is now running at `https://dev-ecommerce.itmf.com.vn`

## 📁 Files Overview

| File | Description |
|------|-------------|
| `infrastructure-template.yml` | Complete CloudFormation template with all components |
| `ecommerce-dev-params.json` | Configuration parameters for dev environment |
| `Makefile.new` | Simple commands for infrastructure management |
| `setup-domain.sh` | Domain routing setup script |

## 🔧 Available Commands

### Core Commands
```bash
make create      # Create complete infrastructure
make start       # Start all services (scale up)
make stop        # Stop all services (scale to 0)
make status      # Show infrastructure status
make delete      # Delete entire infrastructure
```

### Advanced Commands
```bash
make validate    # Validate CloudFormation template
make update      # Update existing infrastructure
make logs        # Show recent service logs
make events      # Show CloudFormation events
make outputs     # Show stack outputs
```

### Quick Deployment
```bash
make dev-deploy  # Quick dev deployment
make prod-deploy # Production deployment (with confirmation)
```

## 🌐 Domain Setup

If you need to set up custom domain routing:

```bash
# Make script executable
chmod +x setup-domain.sh

# Run domain setup
./setup-domain.sh dev-ecommerce.itmf.com.vn dev ecommerce
```

This will:
1. Create/find Route53 hosted zone
2. Create DNS record pointing to your load balancer
3. Test domain resolution

## ⚙️ Configuration

### Parameters File Format
Edit `ecommerce-dev-params.json` to customize your deployment:

```json
[
  {
    "ParameterKey": "ServiceName",
    "ParameterValue": "ecommerce"
  },
  {
    "ParameterKey": "Environment",
    "ParameterValue": "dev"
  },
  {
    "ParameterKey": "DomainName",
    "ParameterValue": "dev-ecommerce.itmf.com.vn"
  },
  {
    "ParameterKey": "InstanceType",
    "ParameterValue": "t3.micro"
  },
  {
    "ParameterKey": "EnableDatabase",
    "ParameterValue": "true"
  }
]
```

### Environment Variables
```bash
SERVICE_NAME=ecommerce    # Your service name
ENVIRONMENT=dev           # Environment (dev/staging/prod)
REGION=ap-southeast-1     # AWS region
```

## 🔍 Monitoring & Troubleshooting

### Check Status
```bash
make status
```

### View Logs
```bash
make logs
```

### Check Events
```bash
make events
```

### Get Stack Outputs
```bash
make outputs
```

## 🆘 Troubleshooting

### Common Issues

**1. Stack Creation Fails**
```bash
# Check events for detailed error
make events

# Validate template
make validate
```

**2. Services Not Starting**
```bash
# Check service status
make status

# View logs for errors
make logs

# Try scaling up manually
make start
```

**3. Domain Not Working**
```bash
# Run domain setup
./setup-domain.sh

# Check SSL certificate status in AWS Console
# Wait 5-10 minutes for DNS propagation
```

**4. Database Connection Issues**
```bash
# Check if database is enabled
grep EnableDatabase ecommerce-dev-params.json

# Verify database parameters in Systems Manager
aws ssm get-parameters-by-path --path "/dev/ecommerce/database" --region ap-southeast-1
```

## 🔒 Security Features

- ✅ **HTTPS Only** - HTTP redirects to HTTPS
- ✅ **Security Groups** - Proper port restrictions
- ✅ **Private Subnets** - Database in private network
- ✅ **IAM Roles** - Least privilege access
- ✅ **Encrypted Database** - RDS encryption at rest
- ✅ **SSL Certificate** - Auto-managed via ACM

## 💰 Cost Optimization

For **development environments**:
- Uses `t3.micro` instances (Free Tier eligible)
- `db.t3.micro` database (Free Tier eligible)
- 1 instance minimum
- 7-day log retention

For **production environments**:
- Multi-AZ database
- Auto Scaling enabled
- 30-day log retention
- Deletion protection

## 🚀 Deployment Workflow

### Development
```bash
# Deploy dev environment
make create ENVIRONMENT=dev

# Start services
make start

# Your app: https://dev-ecommerce.itmf.com.vn
```

### Production
```bash
# Deploy prod environment
make create ENVIRONMENT=prod

# Start services
make start

# Your app: https://ecommerce.itmf.com.vn
```

## 📈 Scaling

### Manual Scaling
```bash
# Scale services via AWS Console or CLI
aws ecs update-service --cluster dev-ecommerce-cluster --service dev-ecommerce-backend --desired-count 3
```

### Auto Scaling
Auto scaling is configured in the template based on CPU/memory usage.

## 🗑️ Cleanup

### Stop Services (Keep Infrastructure)
```bash
make stop
```

### Delete Everything
```bash
make delete
```

⚠️ **Warning**: This will delete ALL resources including the database!

## 🎯 Next Steps

1. **Customize** the parameters file for your needs
2. **Deploy** with `make create`
3. **Set up domain** with `./setup-domain.sh` (if needed)
4. **Monitor** with `make status` and `make logs`
5. **Scale** as needed

## 📞 Support

If you encounter issues:

1. Check `make events` for CloudFormation errors
2. Check `make logs` for application errors
3. Verify your AWS permissions
4. Ensure your parameter file is correct

---

🎉 **Congratulations!** You now have a production-ready infrastructure that can be managed with simple commands!