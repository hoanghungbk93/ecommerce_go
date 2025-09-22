terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# VPC
resource "aws_vpc" "postgres_ha_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "postgres-ha-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "postgres_ha_igw" {
  vpc_id = aws_vpc.postgres_ha_vpc.id

  tags = {
    Name = "postgres-ha-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.postgres_ha_vpc.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "postgres-ha-public-subnet-${count.index + 1}"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.postgres_ha_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.postgres_ha_igw.id
  }

  tags = {
    Name = "postgres-ha-public-rt"
  }
}

# Route Table Association
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Group for PostgreSQL nodes
resource "aws_security_group" "postgres_sg" {
  name_description = "Security group for PostgreSQL nodes"
  vpc_id          = aws_vpc.postgres_ha_vpc.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PostgreSQL port
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Patroni REST API
  ingress {
    from_port   = 8008
    to_port     = 8008
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # etcd client port
  ingress {
    from_port   = 2379
    to_port     = 2379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # etcd peer port
  ingress {
    from_port   = 2380
    to_port     = 2380
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "postgres-ha-sg"
  }
}

# Security Group for HAProxy
resource "aws_security_group" "haproxy_sg" {
  name_description = "Security group for HAProxy node"
  vpc_id          = aws_vpc.postgres_ha_vpc.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PostgreSQL port (HAProxy)
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HAProxy stats
  ingress {
    from_port   = 8404
    to_port     = 8404
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # etcd client port
  ingress {
    from_port   = 2379
    to_port     = 2379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # etcd peer port
  ingress {
    from_port   = 2380
    to_port     = 2380
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "postgres-ha-haproxy-sg"
  }
}

# Key Pair
resource "aws_key_pair" "postgres_ha_key" {
  key_name   = "postgres-ha-key"
  public_key = var.ssh_public_key
}

# PostgreSQL Node 1
resource "aws_instance" "postgres_node1" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.postgres_ha_key.key_name
  subnet_id              = aws_subnet.public_subnets[0].id
  vpc_security_group_ids = [aws_security_group.postgres_sg.id]
  private_ip             = "10.0.1.10"

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    node_type = "postgres"
    node_id   = "1"
  }))

  tags = {
    Name = "postgres-ha-node1"
    Role = "postgres"
  }
}

# PostgreSQL Node 2
resource "aws_instance" "postgres_node2" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.postgres_ha_key.key_name
  subnet_id              = aws_subnet.public_subnets[1].id
  vpc_security_group_ids = [aws_security_group.postgres_sg.id]
  private_ip             = "10.0.2.10"

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    node_type = "postgres"
    node_id   = "2"
  }))

  tags = {
    Name = "postgres-ha-node2"
    Role = "postgres"
  }
}

# HAProxy + etcd Node
resource "aws_instance" "haproxy_node" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.postgres_ha_key.key_name
  subnet_id              = aws_subnet.public_subnets[2].id
  vpc_security_group_ids = [aws_security_group.haproxy_sg.id]
  private_ip             = "10.0.3.10"

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    node_type = "haproxy"
    node_id   = "3"
  }))

  tags = {
    Name = "postgres-ha-haproxy"
    Role = "haproxy"
  }
}

# Ansible Inventory Generation
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/inventory.tpl", {
    postgres_node1_ip = aws_instance.postgres_node1.public_ip
    postgres_node2_ip = aws_instance.postgres_node2.public_ip
    haproxy_node_ip   = aws_instance.haproxy_node.public_ip
    postgres_node1_private_ip = aws_instance.postgres_node1.private_ip
    postgres_node2_private_ip = aws_instance.postgres_node2.private_ip
    haproxy_node_private_ip   = aws_instance.haproxy_node.private_ip
  })
  filename = "${path.module}/../ansible/inventory"
}