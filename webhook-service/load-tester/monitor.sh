#!/bin/bash

echo "📊 Real-time Load Test Monitor"
echo "=============================="
echo ""

while true; do
    clear
    echo "📊 Real-time Load Test Monitor - $(date)"
    echo "=============================="
    echo ""
    
    # Services Status
    echo "🟢 Services Status:"
    curl -s "http://localhost:9090/api/v1/query?query=up" | jq -r '.data.result[] | "  \(.metric.job) - \(.metric.instance): \(if .value[1] == "1" then "UP ✅" else "DOWN ❌" end)"' 2>/dev/null || echo "  Could not fetch service status"
    echo ""
    
    # Webhook Metrics
    echo "🔄 Webhook Metrics:"
    WEBHOOK_REQUESTS=$(curl -s "http://localhost:9090/api/v1/query?query=webhook_requests_total" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null)
    WEBHOOK_RATE=$(curl -s "http://localhost:9090/api/v1/query?query=webhook_requests_per_minute" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null)
    WEBHOOK_RESPONSE_TIME=$(curl -s "http://localhost:9090/api/v1/query?query=webhook_avg_response_time_ms" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null)
    WEBHOOK_ERROR_RATE=$(curl -s "http://localhost:9090/api/v1/query?query=webhook_error_rate" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null)
    
    echo "  Total Requests: $WEBHOOK_REQUESTS"
    echo "  Requests/min: $WEBHOOK_RATE"
    echo "  Avg Response Time: ${WEBHOOK_RESPONSE_TIME}ms"
    echo "  Error Rate: ${WEBHOOK_ERROR_RATE}%"
    echo ""
    
    # Nginx Metrics
    echo "🌐 Nginx Load Balancer:"
    NGINX_CONNECTIONS=$(curl -s "http://localhost:9090/api/v1/query?query=nginx_connections_active" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null)
    NGINX_REQUESTS=$(curl -s "http://localhost:9090/api/v1/query?query=nginx_http_requests_total" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null)
    
    echo "  Active Connections: $NGINX_CONNECTIONS"
    echo "  Total HTTP Requests: $NGINX_REQUESTS"
    echo ""
    
    # RabbitMQ Metrics
    echo "🐰 RabbitMQ:"
    RMQ_CONNECTIONS=$(curl -s "http://localhost:9090/api/v1/query?query=rabbitmq_connections" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null)
    RMQ_QUEUES=$(curl -s "http://localhost:9090/api/v1/query?query=rabbitmq_queues" | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null)
    
    echo "  Connections: $RMQ_CONNECTIONS"
    echo "  Queues: $RMQ_QUEUES"
    echo ""
    
    # System Resources
    echo "💻 System Resources:"
    echo "  Memory Usage (MB):"
    curl -s "http://localhost:9090/api/v1/query?query=process_resident_memory_bytes/1024/1024" | jq -r '.data.result[] | "    \(.metric.job): \(.value[1] | tonumber | floor)MB"' 2>/dev/null | head -5
    echo ""
    
    echo "Press Ctrl+C to stop monitoring"
    sleep 3
done
