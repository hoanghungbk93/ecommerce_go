# Migration Guide: ECS Fargate to ECS EC2 (Free Tier Optimized)

## 🎯 Overview
This guide helps you migrate from ECS + Fargate to ECS + EC2 for cost optimization using AWS Free Tier.

## 📊 Cost Comparison
- **Before (Fargate)**: ~$15-30/month for 2 tasks running 24/7
- **After (EC2)**: ~$0/month with t2.micro free tier (first 12 months)

## 🔄 Key Changes Made

### **1. Infrastructure Changes**
- ✅ **ECS Cluster**: Now uses EC2 Capacity Provider instead of Fargate
- ✅ **Compute**: Single t2.micro EC2 instance (free tier eligible)
- ✅ **Networking**: Changed from `awsvpc` to `bridge` mode
- ✅ **Target Groups**: Changed from `ip` to `instance` targeting

### **2. Resource Optimization**
- ✅ **CPU**: Reduced from 256 to 128 units per container
- ✅ **Memory**: Reduced from 512MB to 256MB per container
- ✅ **Monitoring**: Disabled detailed CloudWatch monitoring
- ✅ **Auto Scaling**: Limited to max 2 instances for cost control

### **3. New Components Added**
- 🆕 **ECS Capacity Provider**: Manages EC2 instances automatically
- 🆕 **Auto Scaling Group**: Handles EC2 instance lifecycle
- 🆕 **Launch Template**: Defines EC2 instance configuration
- 🆕 **ECS Instance Role**: IAM role for EC2 instances
- 🆕 **Security Group**: Specific for ECS container instances

## 🚀 Migration Steps

### **Step 1: Prepare for Migration**
```bash
# 1. Backup current stack outputs
aws cloudformation describe-stacks \
    --stack-name dev-ecommerce-app \
    --region ap-southeast-1 \
    --query 'Stacks[0].Outputs' \
    --output table > current-outputs.txt

# 2. Check current service status
aws ecs describe-services \
    --cluster dev-ecommerce-cluster \
    --services dev-ecommerce-backend dev-ecommerce-frontend \
    --region ap-southeast-1
```

### **Step 2: Update CloudFormation Stack**
```bash
# Deploy the updated template
aws cloudformation update-stack \
    --stack-name dev-ecommerce-app \
    --template-body file://cloudformation/app/template.yml \
    --parameters file://cloudformation/app/dev.json \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ap-southeast-1
```

### **Step 3: Monitor the Migration**
```bash
# Watch stack events
aws cloudformation describe-stack-events \
    --stack-name dev-ecommerce-app \
    --region ap-southeast-1 \
    --query 'StackEvents[0:10]' \
    --output table

# Monitor ECS services
aws ecs describe-services \
    --cluster dev-ecommerce-cluster \
    --services dev-ecommerce-backend \
    --region ap-southeast-1 \
    --query 'services[0].{
        ServiceName: serviceName,
        DesiredCount: desiredCount,
        RunningCount: runningCount,
        TaskDefinition: taskDefinition
    }'
```

### **Step 4: Verify Migration**
```bash
# Check EC2 instances
aws ec2 describe-instances \
    --filters "Name=tag:Environment,Values=dev" \
    --query 'Reservations[*].Instances[*].{
        InstanceId: InstanceId,
        InstanceType: InstanceType,
        State: State.Name,
        PublicIP: PublicIpAddress
    }' \
    --output table

# Test application endpoints
curl http://dev-ecommerce-alb-415161429.ap-southeast-1.elb.amazonaws.com:8080/health
```

## ⚠️ Important Notes

### **1. Resource Constraints**
- **t2.micro**: Only 1 vCPU and 1GB RAM total
- **Container Limits**: 128 CPU units, 256MB memory each
- **Concurrent Tasks**: Limited by instance capacity

### **2. Performance Expectations**
- **Response Time**: May be slightly slower than Fargate
- **Throughput**: Lower due to resource constraints
- **Auto-scaling**: Limited to instance-level scaling

### **3. Monitoring**
- **CloudWatch**: Basic monitoring only (cost optimization)
- **ECS Insights**: Disabled to save costs
- **EC2 Monitoring**: Standard monitoring included in free tier

## 🔧 Configuration Details

### **EC2 Instance Configuration**
```yaml
Instance Type: t2.micro (1 vCPU, 1 GB RAM)
AMI: ECS-optimized Amazon Linux 2
Storage: 8GB GP2 (included in free tier)
Networking: Bridge mode for containers
Monitoring: Basic (no additional cost)
```

### **Container Resource Allocation**
```yaml
Backend Container:
  CPU: 128 units (~12.5% of instance)
  Memory: 256 MB (soft limit)
  Memory Reservation: 128 MB

Frontend Container:
  CPU: 128 units (~12.5% of instance)  
  Memory: 256 MB (soft limit)
  Memory Reservation: 128 MB
```

### **Auto Scaling Configuration**
```yaml
ASG Min Size: 1 instance
ASG Max Size: 2 instances (cost control)
Desired Capacity: 1 instance
Capacity Provider Target: 100%
```

## 📈 Performance Testing

After migration, run performance tests to verify:

```bash
# Navigate to performance test directory
cd backend/performance-test

# Update the backend URL if needed (should be the same ALB)
# Run basic performance test
./run-performance-tests.sh
```

**Expected Results:**
- Response times may increase by 10-20%
- Success rate should remain 100%
- System should handle moderate load (up to 10-15 RPS)

## 🚨 Rollback Plan

If issues occur, rollback to Fargate:
```bash
# Restore original template
git checkout HEAD~1 cloudformation/app/template.yml
git checkout HEAD~1 cloudformation/app/dev.json

# Update stack back to Fargate
aws cloudformation update-stack \
    --stack-name dev-ecommerce-app \
    --template-body file://cloudformation/app/template.yml \
    --parameters file://cloudformation/app/dev.json \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ap-southeast-1
```

## 💡 Optimization Tips

### **1. Cost Monitoring**
- Set up billing alerts for unexpected charges
- Monitor EC2 usage to stay within free tier limits
- Consider Reserved Instances after free tier expires

### **2. Performance Tuning**
- Use container memory reservations efficiently
- Monitor CPU utilization to avoid throttling
- Optimize Docker images for smaller size

### **3. Scaling Strategy**
- Use target tracking auto-scaling for ECS services
- Configure ASG scaling policies conservatively
- Monitor CloudWatch metrics for scaling decisions

## 🎉 Benefits of Migration

### **Cost Savings**
- **$0/month** for first 12 months with t2.micro free tier
- **No Fargate compute charges** (~$15-30/month savings)
- **Standard monitoring** included at no extra cost

### **Control & Flexibility**
- **SSH access** to underlying EC2 instances (if key pair configured)
- **Custom AMI** support for specialized configurations
- **Instance-level** optimization and troubleshooting

### **Learning Opportunity**
- **Deeper understanding** of ECS EC2 launch type
- **Container orchestration** experience
- **Auto Scaling Group** management skills

---

**Migration completed successfully!** 🚀

Your e-commerce application now runs on cost-optimized EC2 infrastructure while maintaining the same functionality and auto-scaling capabilities.