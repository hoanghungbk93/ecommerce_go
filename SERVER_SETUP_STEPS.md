# 🚀 Server Setup Instructions

Follow these exact steps to set up your server at **103.176.179.183** for domain **ecommerce.itmf.com.vn**

## Step 1: Push Your Code to GitHub (Local Machine)

```bash
# Create GitHub repository called "ecommerce" at github.com
# Then run these commands:

cd /Users/admin/Desktop/HungHC/Projects/Studies/Ecommerce
git remote add origin https://github.com/YOUR_USERNAME/ecommerce.git
git push -u origin master
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 2: Login to Your Server

```bash
ssh YOUR_USERNAME@103.176.179.183
```

## Step 3: Clone Repository on Server

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/ecommerce.git
```

This creates `~/ecommerce/` containing both `ecommerce-app/` and `webhook-service/`

## Step 4: Upload and Run Setup Script

**Option A: Copy from your local machine**
```bash
# From your local machine, upload the script:
scp setup-server.sh YOUR_USERNAME@103.176.179.183:~/

# Then SSH to server and run:
ssh YOUR_USERNAME@103.176.179.183
chmod +x setup-server.sh
sudo ./setup-server.sh
```

**Option B: Create directly on server**
```bash
# SSH to server and create the script:
ssh YOUR_USERNAME@103.176.179.183
nano setup-server.sh
# Copy the entire script content from setup-server.sh
# Save and exit (Ctrl+X, Y, Enter)

chmod +x setup-server.sh
sudo ./setup-server.sh
```

## Step 5: Verify Setup

After running the setup script, check:

```bash
# Check if repository is cloned
ls -la ~/ecommerce/

# Check Docker
docker --version
docker-compose --version

# Check Nginx configuration
sudo nginx -t

# Check if site is enabled
ls -la /etc/nginx/sites-enabled/
```

## Step 6: Test Deployment

From your local machine, make a test change and push:

```bash
cd /Users/admin/Desktop/HungHC/Projects/Studies/Ecommerce
echo "# Ecommerce Platform" > README.md
git add README.md
git commit -m "Add README"
git push origin master
```

## Step 7: Monitor Deployment

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. Watch the deployment progress
4. Check logs if anything fails

## Step 8: Verify Services

After successful deployment, check these URLs:

- **Main site**: http://ecommerce.itmf.com.vn
- **Health check**: http://ecommerce.itmf.com.vn/health
- **Direct backend**: http://103.176.179.183:8080/api/health
- **Direct frontend**: http://103.176.179.183:3000

## 🎯 Your GitHub Secrets Should Be:

- `SERVER_HOST`: `103.176.179.183`
- `SERVER_USER`: Your server username
- `SERVER_PASSWORD`: Your server password

## 🔧 Troubleshooting

**If deployment fails:**
```bash
# SSH to server and check logs
ssh YOUR_USERNAME@103.176.179.183

# Check ecommerce services
cd ~/ecommerce/ecommerce-app
docker-compose logs

# Check webhook services  
cd ~/ecommerce/webhook-service
docker-compose logs

# Check nginx
sudo systemctl status nginx
sudo nginx -t
```

**If domain doesn't work:**
- Verify `ecommerce.itmf.com.vn` points to `103.176.179.183`
- Check DNS propagation
- Verify nginx configuration

## ✅ Success Indicators

- ✅ Repository cloned to `~/ecommerce/`
- ✅ Docker and Docker Compose installed  
- ✅ Nginx configured for domain
- ✅ GitHub Actions deployment succeeds
- ✅ Website accessible at http://ecommerce.itmf.com.vn
- ✅ API responding at http://ecommerce.itmf.com.vn/api/health
