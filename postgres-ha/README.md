# PostgreSQL HA Cluster with Patroni, etcd, and HAProxy

This project deploys a highly available PostgreSQL cluster using Patroni for automatic failover, etcd for cluster coordination, and HAProxy for load balancing.

## Architecture

- **Node 1**: PostgreSQL 15 + Patroni (Primary/Secondary)
- **Node 2**: PostgreSQL 15 + Patroni (Primary/Secondary)
- **Node 3**: etcd + HAProxy (Load Balancer)

## Features

- ✅ PostgreSQL 15 with automatic failover
- ✅ Patroni for cluster management
- ✅ etcd for consensus and coordination
- ✅ HAProxy for connection load balancing
- ✅ Automatic replication configuration
- ✅ Idempotent deployment scripts
- ✅ Comprehensive testing suite
- ✅ Both Terraform and CloudFormation support

## Quick Start

### Prerequisites

1. AWS CLI configured with appropriate permissions
2. SSH key pair (default: `~/.ssh/postgres-ha-key`)
3. Terraform (for Terraform deployment) or AWS CLI (for CloudFormation)
4. Ansible for configuration management

### Deploy with Terraform

```bash
cd postgres-ha
make deploy-full-terraform
```

### Deploy with CloudFormation

```bash
cd postgres-ha
make deploy-full-cloudformation
```

### Configuration

After deployment, the cluster will be automatically configured with:

- **Scope**: `odoo-ha`
- **Replication User**: `replicator` / `secret`
- **Superuser**: `postgres` / `secret`
- **Admin User**: `admin` / `admin123`
- **Databases**: `odoo`, `test_db`

## Connection Information

### For Applications (Odoo)

```bash
# Get connection info
make connection-info

# Example output:
postgresql://postgres:secret@<HAPROXY_IP>:5432/odoo
```

### Direct Access

```bash
# SSH to nodes
make ssh-postgres1
make ssh-postgres2
make ssh-haproxy

# Check cluster status
make status
```

## Testing

### Test Replication

```bash
make test-replication
```

This will:
1. Create test data on the primary
2. Verify replication to secondary
3. Check Patroni cluster status
4. Verify HAProxy routing

### Test Failover

```bash
make test-failover
```

This will:
1. Stop the current primary node
2. Wait for automatic failover
3. Test connectivity through HAProxy
4. Restart the failed node
5. Verify cluster recovery

## Monitoring

### HAProxy Stats

Access HAProxy statistics at: `http://<HAPROXY_IP>:8404/stats`
- Username: `admin`
- Password: `admin`

### Cluster Status

```bash
make status
```

### Logs

```bash
make logs-patroni
make logs-haproxy
```

## Management Commands

```bash
# Deploy infrastructure
make deploy-terraform          # Deploy with Terraform
make deploy-cloudformation     # Deploy with CloudFormation

# Configure services
make configure                 # Run Ansible playbooks

# Testing
make test-replication         # Test replication
make test-failover           # Test failover scenarios

# Monitoring
make status                  # Check cluster status
make connection-info         # Get connection details

# Cleanup
make clean-terraform         # Destroy Terraform resources
make clean-cloudformation    # Destroy CloudFormation stack
```

## File Structure

```
postgres-ha/
├── terraform/               # Terraform infrastructure
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── user_data.sh
│   └── inventory.tpl
├── cloudformation/          # CloudFormation template
│   └── postgres-ha.yml
├── ansible/                 # Ansible configuration
│   ├── site.yml
│   └── roles/
│       ├── postgresql/
│       ├── patroni/
│       ├── etcd/
│       └── haproxy/
├── scripts/                 # Management scripts
│   ├── test-replication.sh
│   ├── test-failover.sh
│   ├── create-admin.sh
│   ├── cluster-status.sh
│   └── get-logs.sh
├── Makefile                 # Deployment automation
└── README.md               # This file
```

## Configuration Details

### PostgreSQL Configuration

- **Version**: 15
- **WAL Settings**:
  - `wal_level = replica`
  - `max_wal_senders = 10`
  - `max_replication_slots = 10`
- **Archive Mode**: Enabled
- **Checksums**: Enabled

### Patroni Configuration

- **Scope**: `odoo-ha`
- **REST API**: Port 8008
- **TTL**: 30 seconds
- **Loop Wait**: 10 seconds
- **Retry Timeout**: 60 seconds

### HAProxy Configuration

- **Primary Port**: 5432 (routes to current primary)
- **Replica Port**: 5433 (routes to read replicas)
- **Stats Port**: 8404
- **Health Checks**: Patroni REST API

### Security

- **SSH Access**: Port 22 (restricted to your IP)
- **PostgreSQL Access**: Port 5432 (through HAProxy only)
- **Internal Communication**: Ports 2379-2380 (etcd), 8008 (Patroni)

## Troubleshooting

### Check Service Status

```bash
make status
```

### View Logs

```bash
make logs-patroni
make logs-haproxy
```

### SSH to Nodes

```bash
make ssh-postgres1
make ssh-postgres2
make ssh-haproxy
```

### Common Issues

1. **Connection Refused**: Check if services are running with `make status`
2. **Failover Not Working**: Verify etcd is running and Patroni can connect
3. **HAProxy Not Routing**: Check backend health in stats page

## Customization

### Environment Variables

```bash
export STACK_NAME=my-postgres-cluster
export KEY_NAME=my-ssh-key
export REGION=us-east-1
export INSTANCE_TYPE=t3.large
export SSH_KEY_PATH=~/.ssh/my-key
```

### Configuration Files

- Modify `ansible/roles/patroni/templates/patroni.yml.j2` for Patroni settings
- Modify `ansible/roles/haproxy/templates/haproxy.cfg.j2` for HAProxy settings
- Modify `terraform/variables.tf` or CloudFormation parameters for infrastructure

## Production Considerations

1. **Security**:
   - Change default passwords
   - Restrict security group access
   - Enable SSL/TLS

2. **Monitoring**:
   - Set up CloudWatch alarms
   - Monitor HAProxy stats
   - Set up log aggregation

3. **Backup**:
   - Configure WAL archiving to S3
   - Set up automated backups
   - Test restore procedures

4. **Performance**:
   - Tune PostgreSQL parameters
   - Monitor connection pooling
   - Consider read replicas for scaling

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs with `make logs-patroni` or `make logs-haproxy`
3. Verify cluster status with `make status`