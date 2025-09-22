#!/bin/bash
set -e

# Update system
apt-get update
apt-get install -y python3 python3-pip curl wget

# Install required packages for configuration management
pip3 install --upgrade pip
apt-get install -y software-properties-common

# Create user for ansible
useradd -m -s /bin/bash ansible || true
usermod -aG sudo ansible
echo "ansible ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Setup SSH for ansible user
mkdir -p /home/ansible/.ssh
chmod 700 /home/ansible/.ssh
chown ansible:ansible /home/ansible/.ssh

# Allow password-less sudo for ubuntu user (for ansible)
echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create marker file to indicate user_data completion
touch /var/log/user_data_complete

# Node-specific initialization
echo "NODE_TYPE=${node_type}" >> /etc/environment
echo "NODE_ID=${node_id}" >> /etc/environment

# Log completion
echo "$(date): User data script completed for ${node_type} node ${node_id}" >> /var/log/user_data.log