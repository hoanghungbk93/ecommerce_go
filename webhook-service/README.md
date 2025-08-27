# Webhook Service System

A scalable, production-ready webhook processing service built with Go, designed to handle payment webhooks with high availability, security, and monitoring.

## Architecture

```
Internet → Load Balancer (Nginx) → API Gateway → Request Handler → RabbitMQ → Consumer → Database
                                                                           ↓
                                                                    Business Logic
```

### Components

1. **Load Balancer (Nginx)** - Distributes traffic across API Gateway instances
2. **API Gateway** - Rate limiting, request routing, and monitoring
3. **Request Handler** - Webhook validation, SHA256 verification, and message queuing
4. **RabbitMQ** - Message queue for reliable webhook processing
5. **Consumer** - Processes messages and handles business logic
6. **Monitoring** - Prometheus & Grafana for metrics and dashboards

## Features

### Security
- **SHA256 HMAC Verification** - All webhooks are cryptographically verified
- **Rate Limiting** - Protects against DoS attacks
- **Input Validation** - Comprehensive request validation
- **SSL/TLS Support** - HTTPS endpoints with self-signed certificates

### Scalability
- **Load Balancing** - Multiple instances of each service
- **Horizontal Scaling** - Easy to add more instances
- **Message Queuing** - Asynchronous processing with RabbitMQ
- **Connection Pooling** - Optimized database and Redis connections

### Reliability
- **Health Checks** - All services expose health endpoints
- **Retry Logic** - Failed messages are retried with exponential backoff
- **Dead Letter Queues** - Failed messages are preserved for investigation
- **Graceful Shutdown** - Services handle shutdown signals properly

### Monitoring
- **Metrics Collection** - Prometheus integration
- **Request Tracing** - Distributed tracing with request IDs
- **Error Logging** - Comprehensive logging system
- **Dashboards** - Grafana dashboards for visualization

## Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB+ RAM recommended
- Ports 80, 443, 3000, 5432, 5672, 6379, 9090, 15672 available

### 1. Clone and Setup
```bash
cd webhook-service
```

### 2. Configuration
Update environment variables in `docker-compose.yml`:
```yaml
environment:
  - WEBHOOK_SECRET=your-production-secret-key
  - DATABASE_URL=postgres://user:pass@host:port/db
```

### 3. Start Services
```bash
docker-compose up -d
```

### 4. Verify Services
```bash
# Check all services are healthy
curl http://localhost/health

# Check individual services
curl http://localhost:8080/health  # API Gateway
curl http://localhost:8081/health  # Request Handler
curl http://localhost:8082/health  # Consumer
```

## API Endpoints

### Webhook Endpoint
```bash
POST /api/v1/webhooks/payment
Content-Type: application/json
X-Webhook-Signature: sha256=<signature>

{
  "order_id": "ORD-123456",
  "transaction_id": "TXN-789012",
  "amount": 100000.00,
  "currency": "VND",
  "status": "completed",
  "payment_method": "vnpay",
  "event_type": "payment.completed",
  "timestamp": 1677123456,
  "metadata": {
    "customer_id": "CUST-123",
    "product_ids": ["PROD-1", "PROD-2"]
  }
}
```

### Health Check
```bash
GET /health
```

### Metrics
```bash
GET /api/v1/metrics
```

## Signature Verification

Webhooks are secured using SHA256 HMAC signatures:

### Generate Signature (Node.js example)
```javascript
const crypto = require('crypto');

function generateSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('hex');
}

// Usage
const payload = JSON.stringify(webhookData);
const signature = generateSignature(payload, 'your-webhook-secret');
// Send as header: X-Webhook-Signature: sha256=<signature>
```

### Generate Signature (Python example)
```python
import hmac
import hashlib
import json

def generate_signature(payload, secret):
    if isinstance(payload, dict):
        payload = json.dumps(payload, separators=(',', ':'))
    
    signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature

# Usage
payload = json.dumps(webhook_data, separators=(',', ':'))
signature = generate_signature(payload, 'your-webhook-secret')
# Send as header: X-Webhook-Signature: sha256={signature}
```

## Webhook Statuses

The system handles the following payment statuses:

- **pending** - Payment initiated but not confirmed
- **completed** - Payment successfully processed
- **failed** - Payment failed or rejected
- **cancelled** - Payment cancelled by user
- **refunded** - Payment refunded

## Queue Routing

Messages are routed to specific queues based on status:

```
webhook.payment.pending    → webhook_payment_pending
webhook.payment.completed  → webhook_payment_completed  
webhook.payment.failed     → webhook_payment_failed
webhook.payment.cancelled  → webhook_payment_cancelled
webhook.payment.refunded   → webhook_payment_refunded
```

## Monitoring & Observability

### Access Points
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **RabbitMQ Management**: http://localhost:15672 (admin/password)

### Key Metrics
- Request throughput and latency
- Error rates and status codes
- Queue depths and processing times
- System resource utilization
- Database connection pools

### Health Checks
All services expose health endpoints that check:
- Service uptime
- Database connectivity
- RabbitMQ connectivity
- Redis connectivity (API Gateway)

## Production Deployment

### Security Checklist
- [ ] Change all default passwords
- [ ] Use proper SSL certificates
- [ ] Set strong webhook secret
- [ ] Configure firewall rules
- [ ] Enable log aggregation
- [ ] Set up alerting

### Performance Tuning
- [ ] Adjust worker processes per service load
- [ ] Tune database connection pools
- [ ] Configure Redis memory limits
- [ ] Set appropriate timeouts
- [ ] Monitor and scale based on metrics

### Backup Strategy
- [ ] Database regular backups
- [ ] RabbitMQ message persistence
- [ ] Configuration backup
- [ ] Disaster recovery plan

## Development

### Adding New Webhook Types
1. Add new queue in `request-handler/main.go`
2. Add routing key in RabbitMQ setup
3. Implement handler in `consumer/main.go`
4. Update monitoring configuration

### Testing
```bash
# Generate test webhook
curl -X POST http://localhost/api/v1/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=<generated-signature>" \
  -d '{
    "order_id": "TEST-123",
    "transaction_id": "TXN-TEST-456",
    "amount": 50000.00,
    "currency": "VND",
    "status": "completed",
    "payment_method": "test"
  }'
```

## Troubleshooting

### Common Issues

1. **Signature Verification Failed**
   - Check webhook secret configuration
   - Verify payload is not modified in transit
   - Ensure consistent JSON serialization

2. **Messages Not Processing**
   - Check RabbitMQ connection
   - Verify queue bindings
   - Check consumer service logs

3. **Database Connection Issues**
   - Verify database credentials
   - Check network connectivity
   - Monitor connection pool usage

4. **High Memory Usage**
   - Check for memory leaks in logs
   - Monitor RabbitMQ queue sizes
   - Adjust service limits

### Logs Location
```bash
# View service logs
docker-compose logs -f <service-name>

# Examples
docker-compose logs -f api-gateway-1
docker-compose logs -f request-handler-1
docker-compose logs -f consumer-1
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

## License

MIT License - see LICENSE file for details
