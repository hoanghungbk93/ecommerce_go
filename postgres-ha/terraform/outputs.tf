output "haproxy_public_ip" {
  description = "Public IP of HAProxy node"
  value       = aws_instance.haproxy_node.public_ip
}

output "haproxy_public_dns" {
  description = "Public DNS of HAProxy node"
  value       = aws_instance.haproxy_node.public_dns
}

output "postgres_node1_public_ip" {
  description = "Public IP of PostgreSQL node 1"
  value       = aws_instance.postgres_node1.public_ip
}

output "postgres_node2_public_ip" {
  description = "Public IP of PostgreSQL node 2"
  value       = aws_instance.postgres_node2.public_ip
}

output "postgres_connection_string" {
  description = "Connection string for Odoo to connect to PostgreSQL HA cluster"
  value       = "postgresql://postgres:secret@${aws_instance.haproxy_node.public_ip}:5432/odoo"
}

output "admin_connection_info" {
  description = "Admin connection information"
  value = {
    haproxy_ssh    = "ssh -i ~/.ssh/postgres-ha-key ubuntu@${aws_instance.haproxy_node.public_ip}"
    postgres1_ssh  = "ssh -i ~/.ssh/postgres-ha-key ubuntu@${aws_instance.postgres_node1.public_ip}"
    postgres2_ssh  = "ssh -i ~/.ssh/postgres-ha-key ubuntu@${aws_instance.postgres_node2.public_ip}"
    haproxy_stats  = "http://${aws_instance.haproxy_node.public_ip}:8404/stats"
  }
}