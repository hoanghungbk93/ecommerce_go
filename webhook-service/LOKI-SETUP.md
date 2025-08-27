# Loki Integration for Webhook Service Monitoring

This document describes the Loki setup for log aggregation and monitoring of your webhook service.

## Architecture Overview

The monitoring stack now includes:
- **Loki**: Log aggregation system
- **Promtail**: Log collection agent
- **Grafana**: Visualization with Loki as a data source
- **Prometheus**: Metrics collection (existing)

## Components Added

### 1. Loki Configuration (`monitoring/loki-config.yml`)
- Configured for local filesystem storage
- Set up with embedded cache for query performance
- Listening on port 3100

### 2. Promtail Configuration (`monitoring/promtail-config.yml`)
- Collects logs from Docker containers with `logging=promtail` label
- Automatically discovers containers via Docker API
- Parses JSON logs and extracts structured data
- Forwards logs to Loki

### 3. Grafana Integration
- **Data Source**: Automatically provisioned Loki data source
- **Dashboard**: Pre-configured webhook logs dashboard
- **Provisioning**: Automatic setup on container start

### 4. Docker Compose Updates
- Added Loki and Promtail services
- Added logging labels to all application services
- Configured volume mounts for log access

## Services with Logging Labels

All application services now have logging labels for Promtail collection:
- `api-gateway-1` & `api-gateway-2`: `service=api-gateway`
- `request-handler-1` & `request-handler-2`: `service=request-handler`
- `consumer-1` & `consumer-2`: `service=consumer`

## Dashboard Features

The webhook logs dashboard includes:
1. **Recent Webhook Logs**: All service logs in chronological order
2. **Log Volume by Service**: Statistics showing log volume per service
3. **Error Logs**: Filtered view of error messages
4. **Service-specific Log Panels**: Separate panels for each service type

## Getting Started

1. **Start the services**:
   ```bash
   docker-compose up -d
   ```

2. **Access Grafana**:
   - URL: http://localhost:3000
   - Username: admin
   - Password: admin

3. **View Webhook Logs**:
   - Navigate to Dashboards → Browse
   - Open "Webhook Service Logs" dashboard

## Useful Loki Queries

### Basic Queries
```logql
# All logs from API Gateway
{service="api-gateway"}

# All logs from Request Handler
{service="request-handler"}

# All logs from Consumer
{service="consumer"}

# All webhook service logs
{service=~"api-gateway|request-handler|consumer"}
```

### Filtered Queries
```logql
# Error logs only
{service=~"api-gateway|request-handler|consumer"} |~ "(?i)(error|fail|exception)"

# HTTP 5xx errors
{service="api-gateway"} |~ "5[0-9][0-9]"

# Database related logs
{service="consumer"} |~ "(?i)(database|postgres|sql)"

# Webhook processing logs
{service="request-handler"} |~ "(?i)webhook"
```

### Metrics Queries
```logql
# Log rate per service (logs per second)
rate({service=~"api-gateway|request-handler|consumer"}[5m])

# Error rate
rate({service=~"api-gateway|request-handler|consumer"} |~ "(?i)error"[5m])

# Log count over time
count_over_time({service=~"api-gateway|request-handler|consumer"}[5m])
```

## Ports and Access

- **Loki API**: http://localhost:3100
- **Grafana Dashboard**: http://localhost:3000
- **Prometheus**: http://localhost:9090 (existing)

## Log Storage

Logs are stored in the `loki_data` Docker volume and will persist across container restarts.

## Customization

### Adding More Log Sources
To monitor additional services, add these labels to your Docker Compose service:
```yaml
labels:
  - "logging=promtail"
  - "service=your-service-name"
```

### Custom Log Parsing
Edit `monitoring/promtail-config.yml` to add custom pipeline stages for your log format.

### Dashboard Customization
The dashboard JSON can be modified in `monitoring/webhook-logs-dashboard.json` or through the Grafana UI.

## Troubleshooting

### Loki Not Receiving Logs
1. Check Promtail logs: `docker-compose logs promtail`
2. Verify Docker socket is accessible
3. Ensure services have the correct logging labels

### Dashboard Not Loading
1. Check Grafana logs: `docker-compose logs grafana`
2. Verify Loki data source is configured
3. Ensure dashboard JSON is valid

### Performance Issues
1. Adjust Loki configuration for your log volume
2. Consider retention policies for long-term storage
3. Monitor resource usage of Loki container

## Next Steps

1. Set up alerting rules for error conditions
2. Configure log retention policies
3. Add more specific log parsing for your application format
4. Create additional dashboards for specific use cases
