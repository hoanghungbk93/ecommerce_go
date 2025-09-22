# E-commerce Backend Performance Testing Suite

A comprehensive performance testing suite for your Go-based e-commerce backend API using Artillery.

## 📋 Prerequisites

1. **Backend Server**: Your Go backend is deployed on AWS at:
   `http://dev-ecommerce-alb-415161429.ap-southeast-1.elb.amazonaws.com:8080`

2. **Node.js & npm**: Required for Artillery
   ```bash
   # Check if installed
   node --version
   npm --version
   ```

3. **Artillery** (will be auto-installed if missing)
   ```bash
   npm install -g artillery
   ```

## 🚀 Quick Start

1. **Make scripts executable**:
   ```bash
   chmod +x run-performance-tests.sh analyze-results.sh
   ```

2. **Run basic performance test**:
   ```bash
   ./run-performance-tests.sh
   ```
   Select option 1 for a basic performance test (recommended for first run).

3. **Analyze results**:
   ```bash
   ./analyze-results.sh
   ```

## 📊 Test Types

### 1. Basic Performance Test (`artillery.yml`)
- **Duration**: ~4 minutes
- **Load Pattern**: 5 → 10 → 20 requests/second
- **Scenarios**:
  - Health check tests
  - Public API tests (products, categories)
  - Authentication flow
  - Authenticated user actions
  - Product search and detail views

### 2. Stress Test (`stress-test.yml`)
- **Duration**: ~8 minutes
- **Load Pattern**: 50 → 100 requests/second
- **Purpose**: Test system under high load
- **Scenarios**: Critical path, authentication stress, database operations

### 3. Individual Endpoint Tests
- **Method**: Quick targeted tests
- **Endpoints**: Health, Products, Categories
- **Load**: 100 requests with 10 concurrent users per endpoint

## 📁 File Structure

```
performance-test/
├── artillery.yml           # Main test configuration
├── stress-test.yml         # High-load test configuration
├── test-data.csv          # Test user data
├── run-performance-tests.sh   # Main test runner script
├── analyze-results.sh     # Results analysis script
├── README.md              # This file
└── results/               # Test results directory
    ├── *.json            # Raw test data
    ├── *.log             # Test execution logs
    └── *.html            # HTML reports
```

## 🎯 Test Scenarios Covered

### Authentication Flow
- User registration
- User login
- Token-based authentication
- Profile access

### Product Operations
- Product listing (with pagination)
- Product detail retrieval
- Category listing

### Cart Operations
- Cart retrieval
- Cart operations (requires authentication)

### Health Monitoring
- Health endpoint checks
- Server availability

## 📈 Metrics Analyzed

### Response Time Metrics
- **Min/Max**: Fastest and slowest responses
- **Median (P50)**: Middle value response time
- **P95**: 95th percentile response time
- **P99**: 99th percentile response time

### Throughput Metrics
- **Request Rate**: Requests per second
- **Success Rate**: Percentage of successful requests
- **Error Rate**: Failed requests and timeouts

### Performance Thresholds
- ✅ **Good**: Median < 500ms, P95 < 1000ms, Success > 99%
- ⚠️ **Warning**: Median < 1000ms, P95 < 2000ms, Success > 95%
- ❌ **Critical**: Above warning thresholds

## 🛠️ Usage Examples

### Run specific test types:
```bash
# Basic test only
./run-performance-tests.sh
# Choose option 1

# Stress test only (high load)
./run-performance-tests.sh
# Choose option 2

# All tests including stress
./run-performance-tests.sh
# Choose option 5
```

### Analyze results:
```bash
# Latest results
./analyze-results.sh
# Choose option 1

# Full analysis
./analyze-results.sh
# Choose option 6
```

### Manual Artillery commands:
```bash
# Basic test
artillery run artillery.yml --output results/my-test.json

# Stress test
artillery run stress-test.yml --output results/stress.json

# Generate HTML report
artillery report results/my-test.json --output results/report.html

# Quick endpoint test
artillery quick --count 50 --num 5 http://localhost:8080/api/v1/products
```

## 🔧 Customization

### Modify Load Patterns
Edit `artillery.yml` or `stress-test.yml`:
```yaml
config:
  phases:
    - duration: 60        # Test duration in seconds
      arrivalRate: 10     # Requests per second
      name: "Custom load"
```

### Add New Scenarios
Add to `artillery.yml`:
```yaml
scenarios:
  - name: "My Custom Test"
    weight: 20
    flow:
      - post:
          url: "/api/v1/my-endpoint"
          json:
            key: "value"
```

### Change Test Data
Edit `test-data.csv` to add more test users or modify existing data.

## 📊 Understanding Results

### HTML Reports
- Open `results/*.html` files in your browser
- Interactive charts and detailed metrics
- Response time distributions
- Request/response rates over time

### JSON Data
- Raw test data in `results/*.json`
- Can be processed with custom scripts
- Compatible with other analysis tools

### Console Output
- Real-time test progress
- Quick summary metrics
- Error detection and reporting

## 🚨 Performance Alerts

The analysis script will automatically flag:
- **High response times** (> 500ms median)
- **Low success rates** (< 99%)
- **Timeout errors**
- **High error rates**

## 🔍 Troubleshooting

### Common Issues:

1. **"Backend server not running"**
   - Check if your AWS backend is accessible
   - Verify the load balancer is running
   - Test with: `curl http://dev-ecommerce-alb-415161429.ap-southeast-1.elb.amazonaws.com:8080/health`

2. **"Artillery not found"**
   ```bash
   npm install -g artillery
   ```

3. **Permission denied**
   ```bash
   chmod +x *.sh
   ```

4. **Test fails with authentication errors**
   - Ensure test user exists: `admin@test.com` with password `admin123`
   - Check if user registration is working

5. **High error rates**
   - Check database connection
   - Verify all dependencies are running
   - Monitor system resources (CPU, memory)

## 💡 Best Practices

1. **Start with basic tests** before running stress tests
2. **Monitor system resources** during stress tests
3. **Run tests multiple times** for consistent baselines
4. **Test in isolated environment** to avoid interference
5. **Analyze trends over time** rather than single test results
6. **Document performance requirements** before testing

## 🎯 Performance Goals

Recommended targets for e-commerce APIs:
- **Response Time**: < 500ms median, < 1000ms P95
- **Availability**: > 99.9% success rate
- **Throughput**: Handle expected peak load + 50% buffer
- **Concurrency**: Support expected concurrent users
- **Error Rate**: < 0.1% under normal load

## 📝 Notes

- Tests use realistic e-commerce user flows
- Authentication tokens are properly handled
- Database operations are included in stress tests
- Results are automatically cleaned up (keeps last 5 runs)
- All tests are non-destructive and safe to run repeatedly