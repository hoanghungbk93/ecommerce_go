# Load Testing Tool for Webhook Service

A high-performance load testing tool designed to simulate 1,000+ concurrent users hitting your webhook service infrastructure.

## 🚀 Features

- **High Concurrency**: Supports 1,000+ concurrent users
- **Realistic Payloads**: Generates realistic webhook payloads with various event types
- **Gradual Ramp-up**: Gradually increases load to avoid overwhelming the system
- **Comprehensive Metrics**: Tracks latency percentiles, success rates, and throughput
- **Real-time Monitoring**: Live progress updates during test execution
- **Flexible Configuration**: Command-line flags for all parameters
- **Results Export**: JSON output for further analysis

## 📋 Quick Start

### 1. Build the Load Tester
```bash
go build -o load-tester main.go
```

### 2. Run Pre-configured Tests
```bash
./run-test.sh
```

### 3. Monitor in Real-time
```bash
./monitor.sh
```

## 🎯 Test Scenarios

### Quick Test (100 users, 30s)
```bash
./load-tester -url=http://localhost -c=100 -d=30s -r=5s
```

### Medium Test (500 users, 2m)
```bash
./load-tester -url=http://localhost -c=500 -d=2m -r=10s
```

### **Full Load Test (1000 CCU)**
```bash
./load-tester -url=http://localhost -c=1000 -d=5m -r=15s -o=results.json
```

### Stress Test (2000 users, 3m)
```bash
./load-tester -url=http://localhost -c=2000 -d=3m -r=20s
```

## ⚙️ Command Line Options

| Flag | Description | Default |
|------|-------------|---------|
| `-url` | Target URL for load testing | `http://localhost` |
| `-c` | Number of concurrent users | `1000` |
| `-d` | Test duration (e.g., 60s, 5m) | `60s` |
| `-r` | Ramp-up duration | `10s` |
| `-o` | Output file for results (JSON) | none |

## 📊 Metrics Collected

### Performance Metrics
- **Total Requests**: Total number of HTTP requests sent
- **Success Rate**: Percentage of successful requests (2xx status codes)
- **Requests/sec**: Throughput (requests per second)
- **Latency Statistics**:
  - Average, Min, Max latency
  - 50th, 95th, 99th percentile latency

### Test Configuration
- **Test Duration**: Actual test execution time
- **Concurrent Users**: Number of simultaneous virtual users
- **Ramp-up Time**: Time taken to reach full concurrency

## 📈 Monitoring Integration

The load tester works seamlessly with your monitoring stack:

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
- **Real-time Monitor**: `./monitor.sh`

## 🔧 Webhook Payload Generation

The tool generates realistic webhook payloads with:

- **Event Types**: `payment.completed`, `payment.failed`, `order.created`, etc.
- **Random Data**: Order IDs, user IDs, amounts, timestamps
- **Metadata**: Source, region, customer information
- **JSON Format**: Properly formatted JSON payloads

Example payload:
```json
{
  "event": "payment.completed",
  "order_id": "order_123456",
  "amount": 99.99,
  "timestamp": 1692789123,
  "user_id": "user_78901",
  "metadata": {
    "source": "load_test",
    "region": "us-east-1",
    "customer_id": 12345
  }
}
```

## 📋 Sample Output

```
=== LOAD TEST RESULTS ===
Test Duration: 5m0s
Total Requests: 45678
Successful Requests: 45234
Failed Requests: 444
Success Rate: 99.03%
Requests/sec: 152.26

Latency Statistics:
  Average: 45ms
  Minimum: 12ms
  Maximum: 234ms
  50th percentile: 38ms
  95th percentile: 89ms
  99th percentile: 156ms
```

## 🎯 Performance Expectations

### Target Metrics (1000 CCU)
- **Throughput**: 500+ requests/sec
- **Success Rate**: >99%
- **Average Latency**: <100ms
- **95th Percentile**: <200ms

### Resource Usage
- **Memory**: ~50-100MB per 1000 users
- **Network**: Optimized connection pooling
- **CPU**: Multi-core utilization

## 🔍 Troubleshooting

### Common Issues

1. **Connection refused**: Ensure webhook service is running
2. **High latency**: Check system resources and network
3. **Build errors**: Verify Go version (1.19+)

### Optimizations

- Adjust `-r` (ramp-up) time for gradual load increase
- Monitor system resources during tests
- Use `-o` flag to save detailed results

## 🚦 Best Practices

1. **Start Small**: Begin with 100-200 users
2. **Gradual Scaling**: Use appropriate ramp-up times
3. **Monitor Resources**: Watch CPU, memory, and network
4. **Baseline Testing**: Test without load first
5. **Multiple Runs**: Average results over multiple test runs
