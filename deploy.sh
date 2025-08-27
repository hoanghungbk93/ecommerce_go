#!/bin/bash

# =============================================================================
# Production Deployment Script for Ecommerce & Webhook Services
# =============================================================================
# This script handles deployment of both ecommerce-app and webhook-service
# to your production server with proper error handling and rollback support.

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/tmp/deployment_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${1//\\033[*([0-9;])m/}" >> "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}❌ Error: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker is not running. Please start Docker and try again."
    fi
    success "Docker is running"
}

# Function to check if Git repo is clean
check_git_status() {
    local project_path="$1"
    local project_name="$2"
    
    cd "$project_path"
    
    if [[ -n $(git status --porcelain) ]]; then
        warning "Git repository has uncommitted changes in $project_name"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error_exit "Deployment cancelled by user"
        fi
    fi
}

# Function to backup current state
backup_project() {
    local project_path="$1"
    local project_name="$2"
    
    cd "$project_path"
    
    info "Creating backup for $project_name..."
    
    # Create backup directory if it doesn't exist
    mkdir -p ../backups
    
    # Backup current state
    local backup_name="${project_name}_backup_${TIMESTAMP}"
    tar -czf "../backups/${backup_name}.tar.gz" . --exclude='.git' --exclude='node_modules' --exclude='vendor'
    
    success "Backup created: ../backups/${backup_name}.tar.gz"
    echo "$backup_name" > "../backups/latest_backup.txt"
}

# Function to deploy ecommerce backend
deploy_ecommerce() {
    local project_path="$1"
    
    info "🚀 Starting ecommerce-app deployment..."
    
    cd "$project_path/ecommerce-app"
    
    # Check git status
    check_git_status "$project_path/ecommerce-app" "ecommerce-app"
    
    # Create backup
    backup_project "$project_path/ecommerce-app" "ecommerce-app"
    
    # Pull latest changes
    info "Pulling latest changes..."
    git fetch origin
    git pull origin master
    
    # Stop existing containers
    info "Stopping existing containers..."
    docker-compose down || warning "Some containers were not running"
    
    # Build and start services
    info "Building and starting containers..."
    docker-compose build --no-cache
    docker-compose up -d
    
    # Wait for services to start
    sleep 15
    
    # Health check
    info "Performing health check..."
    local health_url="http://localhost:8080/api/health"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$health_url" >/dev/null 2>&1; then
            success "Backend health check passed"
            break
        else
            warning "Health check attempt $attempt/$max_attempts failed. Retrying in 10 seconds..."
            sleep 10
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        error_exit "Backend health check failed after $max_attempts attempts"
    fi
    
    # Show container status
    info "Container status:"
    docker-compose ps
    
    success "✅ Ecommerce-app deployment completed successfully!"
}

# Function to deploy webhook service
deploy_webhook() {
    local project_path="$1"
    
    info "🚀 Starting webhook-service deployment..."
    
    cd "$project_path/webhook-service"
    
    # Check git status
    check_git_status "$project_path/webhook-service" "webhook-service"
    
    # Create backup
    backup_project "$project_path/webhook-service" "webhook-service"
    
    # Pull latest changes
    info "Pulling latest changes..."
    git fetch origin
    git pull origin master
    
    # Stop existing containers
    info "Stopping existing containers..."
    docker-compose down || warning "Some containers were not running"
    
    # Clean up old images
    info "Cleaning up old Docker images..."
    docker image prune -f
    
    # Build and start services
    info "Building and starting containers..."
    docker-compose build --no-cache
    docker-compose up -d
    
    # Wait for services to start
    sleep 20
    
    # Health check for API Gateway
    info "Performing health check for API Gateway..."
    local api_health_url="http://localhost:8080/health"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$api_health_url" >/dev/null 2>&1; then
            success "API Gateway health check passed"
            break
        else
            warning "API Gateway health check attempt $attempt/$max_attempts failed. Retrying in 10 seconds..."
            sleep 10
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        error_exit "API Gateway health check failed after $max_attempts attempts"
    fi
    
    # Show container status
    info "Container status:"
    docker-compose ps
    
    # Show recent logs
    info "Recent logs:"
    docker-compose logs --tail=20
    
    success "✅ Webhook-service deployment completed successfully!"
}

# Function to rollback deployment
rollback() {
    local project_path="$1"
    local project_name="$2"
    
    warning "🔄 Rolling back $project_name..."
    
    cd "$project_path"
    
    # Check if backup exists
    if [[ ! -f "../backups/latest_backup.txt" ]]; then
        error_exit "No backup found for rollback"
    fi
    
    local backup_name=$(cat "../backups/latest_backup.txt")
    local backup_file="../backups/${backup_name}.tar.gz"
    
    if [[ ! -f "$backup_file" ]]; then
        error_exit "Backup file not found: $backup_file"
    fi
    
    # Stop current containers
    docker-compose down
    
    # Restore backup
    info "Restoring backup: $backup_name"
    rm -rf ./*
    tar -xzf "$backup_file" -C .
    
    # Restart services
    docker-compose up -d
    
    success "✅ Rollback completed for $project_name"
}

# Main deployment function
main() {
    info "🚀 Starting deployment process..."
    log "Deployment started at $(date)"
    log "Log file: $LOG_FILE"
    
    # Default project path (can be overridden)
    local project_path="${1:-/opt/projects}"
    
    # Check prerequisites
    check_docker
    
    # Check if project directories exist
    if [[ ! -d "$project_path/ecommerce-app" ]]; then
        error_exit "Ecommerce-app directory not found at $project_path/ecommerce-app"
    fi
    
    if [[ ! -d "$project_path/webhook-service" ]]; then
        error_exit "Webhook-service directory not found at $project_path/webhook-service"
    fi
    
    # Ask which service to deploy
    echo "Which service would you like to deploy?"
    echo "1) Ecommerce App"
    echo "2) Webhook Service"
    echo "3) Both"
    read -p "Enter your choice (1-3): " -n 1 -r choice
    echo
    
    case $choice in
        1)
            deploy_ecommerce "$project_path"
            ;;
        2)
            deploy_webhook "$project_path"
            ;;
        3)
            deploy_ecommerce "$project_path"
            deploy_webhook "$project_path"
            ;;
        *)
            error_exit "Invalid choice"
            ;;
    esac
    
    success "🎉 All deployments completed successfully!"
    info "📋 Deployment log saved to: $LOG_FILE"
}

# Handle script arguments
case "${1:-}" in
    --rollback-ecommerce)
        rollback "${2:-/opt/projects}/ecommerce-app" "ecommerce-app"
        ;;
    --rollback-webhook)
        rollback "${2:-/opt/projects}/webhook-service" "webhook-service"
        ;;
    --help|-h)
        echo "Usage: $0 [PROJECT_PATH]"
        echo "       $0 --rollback-ecommerce [PROJECT_PATH]"
        echo "       $0 --rollback-webhook [PROJECT_PATH]"
        echo ""
        echo "PROJECT_PATH: Path to the parent directory containing ecommerce-app and webhook-service"
        echo "              Default: /opt/projects"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
