#!/bin/bash

set -e

echo "🔍 ECS Auto-Scaling Diagnostic Tool"
echo "==================================="
echo ""

# Configuration - Update these with your actual values
CLUSTER_NAME="your-cluster-name"
SERVICE_NAME="your-service-name" 
REGION="ap-southeast-1"

# Function to check if AWS CLI is configured
check_aws_cli() {
    echo "📋 Checking AWS CLI configuration..."
    
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI not found. Please install AWS CLI first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS CLI not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    echo "✅ AWS CLI configured"
    echo "Account: $(aws sts get-caller-identity --query Account --output text)"
    echo "Region: $(aws configure get region)"
    echo ""
}

# Function to discover ECS resources
discover_ecs_resources() {
    echo "🔍 Discovering ECS Resources..."
    echo ""
    
    echo "Available ECS Clusters:"
    aws ecs list-clusters --region $REGION --query 'clusterArns[*]' --output table
    echo ""
    
    if [[ "$CLUSTER_NAME" == "your-cluster-name" ]]; then
        echo "Please update CLUSTER_NAME in the script with your actual cluster name."
        echo "You can find it in the list above or check your AWS Console."
        echo ""
        read -p "Enter your cluster name: " CLUSTER_NAME
        echo ""
    fi
    
    echo "Services in cluster '$CLUSTER_NAME':"
    aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns[*]' --output table 2>/dev/null || {
        echo "❌ Could not list services. Check if cluster name is correct."
        return 1
    }
    echo ""
    
    if [[ "$SERVICE_NAME" == "your-service-name" ]]; then
        echo "Please update SERVICE_NAME in the script with your actual service name."
        read -p "Enter your service name: " SERVICE_NAME
        echo ""
    fi
}

# Function to check ECS service configuration
check_ecs_service() {
    echo "🏗️  Checking ECS Service Configuration..."
    echo ""
    
    local service_info=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --region $REGION \
        --query 'services[0]' \
        2>/dev/null)
    
    if [[ "$service_info" == "null" || -z "$service_info" ]]; then
        echo "❌ Service '$SERVICE_NAME' not found in cluster '$CLUSTER_NAME'"
        return 1
    fi
    
    echo "✅ Service found: $SERVICE_NAME"
    
    # Extract key information
    local desired_count=$(echo "$service_info" | jq -r '.desiredCount')
    local running_count=$(echo "$service_info" | jq -r '.runningCount')
    local task_definition=$(echo "$service_info" | jq -r '.taskDefinition')
    
    echo "   Current running tasks: $running_count"
    echo "   Desired task count: $desired_count"
    echo "   Task definition: $task_definition"
    echo ""
    
    # Check task definition resources
    echo "📦 Checking Task Definition Resources..."
    local task_def_info=$(aws ecs describe-task-definition \
        --task-definition $task_definition \
        --region $REGION \
        --query 'taskDefinition.containerDefinitions[0]' \
        2>/dev/null)
    
    if [[ "$task_def_info" != "null" && -n "$task_def_info" ]]; then
        local cpu=$(echo "$task_def_info" | jq -r '.cpu // "Not set"')
        local memory=$(echo "$task_def_info" | jq -r '.memory // "Not set"')
        local memory_reservation=$(echo "$task_def_info" | jq -r '.memoryReservation // "Not set"')
        
        echo "   CPU units: $cpu"
        echo "   Memory (hard limit): $memory"
        echo "   Memory reservation (soft limit): $memory_reservation"
        
        if [[ "$cpu" == "Not set" || "$cpu" == "null" ]]; then
            echo "   ⚠️  WARNING: CPU not defined in task definition"
        fi
        
        if [[ "$memory" == "Not set" && "$memory_reservation" == "Not set" ]]; then
            echo "   ⚠️  WARNING: Memory not properly defined"
        fi
    fi
    echo ""
}

# Function to check auto-scaling configuration
check_auto_scaling() {
    echo "📈 Checking Auto-Scaling Configuration..."
    echo ""
    
    # Check if auto-scaling target exists
    local scalable_targets=$(aws application-autoscaling describe-scalable-targets \
        --service-namespace ecs \
        --region $REGION \
        --query "ScalableTargets[?contains(ResourceId, '$CLUSTER_NAME') && contains(ResourceId, '$SERVICE_NAME')]" \
        2>/dev/null)
    
    if [[ "$scalable_targets" == "[]" || -z "$scalable_targets" ]]; then
        echo "❌ No auto-scaling targets found for service $SERVICE_NAME"
        echo ""
        echo "🔧 To fix this, you need to register a scalable target:"
        echo ""
        echo "aws application-autoscaling register-scalable-target \\"
        echo "    --service-namespace ecs \\"
        echo "    --resource-id service/$CLUSTER_NAME/$SERVICE_NAME \\"
        echo "    --scalable-dimension ecs:service:DesiredCount \\"
        echo "    --min-capacity 1 \\"
        echo "    --max-capacity 10 \\"
        echo "    --region $REGION"
        echo ""
        return 1
    fi
    
    echo "✅ Auto-scaling target found"
    echo "$scalable_targets" | jq -r '.[] | "   Min capacity: \(.MinCapacity)\n   Max capacity: \(.MaxCapacity)\n   Current capacity: \(.DesiredCapacity)"'
    
    local max_capacity=$(echo "$scalable_targets" | jq -r '.[0].MaxCapacity')
    local current_capacity=$(echo "$scalable_targets" | jq -r '.[0].DesiredCapacity')
    
    if [[ "$current_capacity" -ge "$max_capacity" ]]; then
        echo "   ⚠️  WARNING: Current capacity ($current_capacity) is at or above max capacity ($max_capacity)"
        echo "   This prevents further scaling. Consider increasing max capacity."
    fi
    echo ""
    
    # Check scaling policies
    echo "📋 Checking Scaling Policies..."
    local scaling_policies=$(aws application-autoscaling describe-scaling-policies \
        --service-namespace ecs \
        --region $REGION \
        --query "ScalingPolicies[?contains(ResourceId, '$CLUSTER_NAME') && contains(ResourceId, '$SERVICE_NAME')]" \
        2>/dev/null)
    
    if [[ "$scaling_policies" == "[]" || -z "$scaling_policies" ]]; then
        echo "❌ No scaling policies found"
        echo ""
        echo "🔧 You need to create scaling policies for CPU and/or memory:"
        echo ""
        echo "# Scale UP policy"
        echo "aws application-autoscaling put-scaling-policy \\"
        echo "    --service-namespace ecs \\"
        echo "    --resource-id service/$CLUSTER_NAME/$SERVICE_NAME \\"
        echo "    --scalable-dimension ecs:service:DesiredCount \\"
        echo "    --policy-name cpu-scale-up \\"
        echo "    --policy-type TargetTrackingScaling \\"
        echo "    --target-tracking-scaling-policy-configuration file://scale-up-policy.json \\"
        echo "    --region $REGION"
        echo ""
        return 1
    fi
    
    echo "✅ Scaling policies found:"
    echo "$scaling_policies" | jq -r '.[] | "   Policy: \(.PolicyName)\n   Type: \(.PolicyType)"'
    echo ""
    
    # Show detailed policy configuration
    for policy_arn in $(echo "$scaling_policies" | jq -r '.[].PolicyARN'); do
        local policy_details=$(aws application-autoscaling describe-scaling-policies \
            --policy-names $(basename "$policy_arn") \
            --service-namespace ecs \
            --region $REGION \
            --query 'ScalingPolicies[0]' 2>/dev/null)
        
        if [[ "$policy_details" != "null" ]]; then
            local policy_name=$(echo "$policy_details" | jq -r '.PolicyName')
            echo "   📊 Policy Details: $policy_name"
            
            if echo "$policy_details" | jq -e '.TargetTrackingScalingPolicyConfiguration' > /dev/null; then
                local target_value=$(echo "$policy_details" | jq -r '.TargetTrackingScalingPolicyConfiguration.TargetValue')
                local metric_type=$(echo "$policy_details" | jq -r '.TargetTrackingScalingPolicyConfiguration.PredefinedMetricSpecification.PredefinedMetricType')
                echo "      Target Value: $target_value%"
                echo "      Metric: $metric_type"
            fi
            echo ""
        fi
    done
}

# Function to check CloudWatch metrics
check_cloudwatch_metrics() {
    echo "📊 Checking CloudWatch Metrics..."
    echo ""
    
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
    local start_time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%S.000Z)
    
    # Check CPU utilization
    echo "🔍 CPU Utilization (last hour):"
    local cpu_metrics=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ECS \
        --metric-name CPUUtilization \
        --dimensions Name=ServiceName,Value=$SERVICE_NAME Name=ClusterName,Value=$CLUSTER_NAME \
        --start-time $start_time \
        --end-time $end_time \
        --period 300 \
        --statistics Average,Maximum \
        --region $REGION \
        --query 'Datapoints[*].[Timestamp,Average,Maximum]' \
        --output table 2>/dev/null || echo "❌ Could not retrieve CPU metrics")
    
    echo "$cpu_metrics"
    echo ""
    
    # Check Memory utilization
    echo "🔍 Memory Utilization (last hour):"
    local memory_metrics=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ECS \
        --metric-name MemoryUtilization \
        --dimensions Name=ServiceName,Value=$SERVICE_NAME Name=ClusterName,Value=$CLUSTER_NAME \
        --start-time $start_time \
        --end-time $end_time \
        --period 300 \
        --statistics Average,Maximum \
        --region $REGION \
        --query 'Datapoints[*].[Timestamp,Average,Maximum]' \
        --output table 2>/dev/null || echo "❌ Could not retrieve Memory metrics")
    
    echo "$memory_metrics"
    echo ""
}

# Function to check IAM permissions
check_iam_permissions() {
    echo "🔐 Checking IAM Permissions..."
    echo ""
    
    # Check if current user/role has necessary permissions
    local caller_identity=$(aws sts get-caller-identity --query 'Arn' --output text)
    echo "Current identity: $caller_identity"
    
    # Test key permissions
    local permissions_ok=true
    
    echo "Testing permissions:"
    
    # Test ECS permissions
    if aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION &>/dev/null; then
        echo "   ✅ ECS describe-services: OK"
    else
        echo "   ❌ ECS describe-services: FAILED"
        permissions_ok=false
    fi
    
    # Test Application Auto Scaling permissions
    if aws application-autoscaling describe-scalable-targets --service-namespace ecs --region $REGION &>/dev/null; then
        echo "   ✅ Application Auto Scaling: OK"
    else
        echo "   ❌ Application Auto Scaling: FAILED"
        permissions_ok=false
    fi
    
    # Test CloudWatch permissions
    if aws cloudwatch list-metrics --namespace AWS/ECS --region $REGION &>/dev/null; then
        echo "   ✅ CloudWatch: OK"
    else
        echo "   ❌ CloudWatch: FAILED"
        permissions_ok=false
    fi
    
    if [[ "$permissions_ok" == false ]]; then
        echo ""
        echo "⚠️  Some permissions are missing. Make sure your IAM user/role has:"
        echo "   - ECS full access (or specific ECS permissions)"
        echo "   - Application Auto Scaling permissions"
        echo "   - CloudWatch read permissions"
    fi
    
    echo ""
}

# Function to provide scaling recommendations
provide_recommendations() {
    echo "💡 Scaling Recommendations"
    echo "========================="
    echo ""
    
    echo "1. **Verify Auto-Scaling Setup:**"
    echo "   - Ensure scalable targets are registered"
    echo "   - Check max capacity is not too low"
    echo "   - Verify scaling policies exist and are configured correctly"
    echo ""
    
    echo "2. **Monitor Scaling Activities:**"
    echo "   aws application-autoscaling describe-scaling-activities \\"
    echo "       --service-namespace ecs \\"
    echo "       --region $REGION"
    echo ""
    
    echo "3. **Common CPU Scaling Policy (Target Tracking):**
    echo "   Create a file 'cpu-scaling-policy.json':"
    echo '   {'
    echo '     "TargetValue": 70.0,'
    echo '     "PredefinedMetricSpecification": {'
    echo '       "PredefinedMetricType": "ECSServiceAverageCPUUtilization"'
    echo '     },'
    echo '     "ScaleOutCooldown": 300,'
    echo '     "ScaleInCooldown": 300'
    echo '   }'
    echo ""
    
    echo "4. **Create the scaling policy:**"
    echo "   aws application-autoscaling put-scaling-policy \\"
    echo "       --service-namespace ecs \\"
    echo "       --resource-id service/$CLUSTER_NAME/$SERVICE_NAME \\"
    echo "       --scalable-dimension ecs:service:DesiredCount \\"
    echo "       --policy-name cpu-scaling-policy \\"
    echo "       --policy-type TargetTrackingScaling \\"
    echo "       --target-tracking-scaling-policy-configuration file://cpu-scaling-policy.json \\"
    echo "       --region $REGION"
    echo ""
    
    echo "5. **Troubleshooting Tips:**"
    echo "   - Check ECS service events for errors"
    echo "   - Verify sufficient EC2 capacity (if using EC2 launch type)"
    echo "   - Monitor CloudWatch logs for application errors"
    echo "   - Check if tasks are failing health checks"
    echo ""
}

# Main execution
main() {
    check_aws_cli
    discover_ecs_resources
    check_ecs_service
    check_auto_scaling
    check_cloudwatch_metrics
    check_iam_permissions
    provide_recommendations
    
    echo "🎉 Diagnostic complete!"
    echo ""
    echo "If you're still having issues, check:"
    echo "1. ECS Service Events in AWS Console"
    echo "2. CloudWatch Logs for your application"
    echo "3. Auto Scaling Activity History"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi