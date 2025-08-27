# Simple CI/CD Setup Guide

Super simple setup using just your server username and password!

## 🚀 What This Does

- When you push to `master` branch → automatically deploys to your server
- Runs tests before deployment
- Health checks to make sure everything is working
- Shows deployment status and logs

## 🔐 Required GitHub Secrets (Only 3!)

Go to your repository → **Settings** → **Secrets and variables** → **Actions**

Add these 3 secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SERVER_HOST` | Your server IP address | `103.176.179.183` |
| `SERVER_USER` | Your server username | `root` or `ubuntu` |
| `SERVER_PASSWORD` | Your server password | `your_server_password` |

That's it! No SSH keys, no complicated setup.

## 📁 Server Setup (One Time)

On your server, just make sure you have:

1. **Docker installed:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

2. **Your project cloned in home directory:**
```bash
cd ~
git clone https://github.com/your-username/ecommerce.git
```

This creates ~/ecommerce/ containing both ecommerce-app/ and webhook-service/

## ✅ How It Works

1. You push code to `master` branch
2. GitHub Actions automatically:
   - Runs tests
   - Connects to your server with username/password
   - Pulls latest code
   - Rebuilds Docker containers
   - Starts services
   - Checks if everything is healthy

## 🎯 That's It!

- Push to master → automatic deployment
- Check GitHub Actions tab to see deployment progress
- Your services will be running on your server

No SSH keys, no complex configuration, just username and password! 🎉
