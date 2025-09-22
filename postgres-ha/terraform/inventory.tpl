[postgres_nodes]
postgres-node1 ansible_host=${postgres_node1_ip} private_ip=${postgres_node1_private_ip} patroni_node_id=1
postgres-node2 ansible_host=${postgres_node2_ip} private_ip=${postgres_node2_private_ip} patroni_node_id=2

[haproxy_nodes]
haproxy-node ansible_host=${haproxy_node_ip} private_ip=${haproxy_node_private_ip}

[etcd_nodes]
haproxy-node ansible_host=${haproxy_node_ip} private_ip=${haproxy_node_private_ip}

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/postgres-ha-key
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
postgres_version=15
patroni_scope=odoo-ha
replication_user=replicator
replication_password=secret
postgres_password=secret