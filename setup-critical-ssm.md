# ⚠️ CRITICAL SSM Parameters - Service CANNOT Run Without These

## 🚨 Required for Backend to Start

### 1. DATABASE_URL (CRITICAL)
**Without this: Backend crashes on startup**
```bash
# Set automatically by: make dev-setup-ssm
# Format: postgres://username:password@host:port/database?sslmode=disable
/dev/ecommerce/db/url
```
**Error if missing:** `panic: failed to connect to database`

### 2. JWT_SECRET (CRITICAL) 
**Without this: Authentication fails, users cannot login**
```bash
# Set automatically by: make dev-setup-ssm
# Should be a strong random string in production
/dev/ecommerce/jwt/secret
```
**Error if missing:** `panic: JWT secret not configured`

## 💳 Required for Payment Features

### 3. VNPAY_TMN_CODE (REQUIRED for payments)
**Without this: All payments fail**
```bash
# Must be updated with real VNPAY merchant code
/dev/ecommerce/vnpay/tmn-code
```
**Error if missing:** `VNPAY payment failed: invalid merchant code`

### 4. VNPAY_HASH_KEY (REQUIRED for payments)  
**Without this: Payment verification fails**
```bash
# Must be updated with real VNPAY hash key
/dev/ecommerce/vnpay/hash-key
```
**Error if missing:** `VNPAY payment failed: signature verification failed`

## 🔐 Required for OAuth Login

### 5. GOOGLE_CLIENT_ID (REQUIRED for Google login)
**Without this: Google OAuth login fails**
```bash
# Must be updated with real Google OAuth client ID
/dev/ecommerce/google/client-id
```
**Error if missing:** Frontend shows "OAuth configuration error"

## 🌐 Auto-Updated Parameters

### 6. VNPAY_RETURN_URL (Auto-updated)
```bash
# Automatically updated after ALB deployment
# Format: http://your-alb-dns/payment/return
/dev/ecommerce/vnpay/return-url
```

### 7. VNPAY_URL (Sandbox)
```bash
# Sandbox URL for testing
# Change to production URL for prod environment
/dev/ecommerce/vnpay/url
```

---

## 🚀 Quick Setup Commands

### Step 1: Deploy Infrastructure
```bash
cd ~/Desktop/HungHC/Projects/Studies/Ecommerce/ecommerce-app
make dev-deploy-permanent
```

### Step 2: Setup Critical Parameters
```bash
make dev-setup-ssm
```

### Step 3: Update Real Values (IMPORTANT!)
```bash
# Update VNPAY credentials (get from VNPAY merchant account)
aws ssm put-parameter \
    --name "/dev/ecommerce/vnpay/tmn-code" \
    --value "YOUR_REAL_TMN_CODE" \
    --type "SecureString" \
    --overwrite \
    --region ap-southeast-1

aws ssm put-parameter \
    --name "/dev/ecommerce/vnpay/hash-key" \
    --value "YOUR_REAL_HASH_KEY" \
    --type "SecureString" \
    --overwrite \
    --region ap-southeast-1

# Update Google OAuth client ID (get from Google Cloud Console)
aws ssm put-parameter \
    --name "/dev/ecommerce/google/client-id" \
    --value "your-real-client-id.apps.googleusercontent.com" \
    --type "SecureString" \
    --overwrite \
    --region ap-southeast-1
```

### Step 4: Deploy Application
```bash
make dev-deploy-app
```

### Step 5: Verify All Parameters
```bash
make list-ssm-params
```

---

## 🔍 How to Get Real Values

### VNPAY Credentials
1. Register merchant account at: https://vnpay.vn
2. Get TMN_CODE and HASH_KEY from merchant dashboard
3. For testing: Use sandbox environment
4. For production: Switch to production URLs

### Google OAuth Client ID  
1. Go to: https://console.cloud.google.com
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins
6. Copy Client ID

---

## 🚨 Troubleshooting

### Backend Won't Start
```bash
# Check if DATABASE_URL is set
aws ssm get-parameter --name "/dev/ecommerce/db/url" --with-decryption --region ap-southeast-1

# Check backend logs
make logs
```

### Payments Not Working
```bash
# Check VNPAY parameters
aws ssm get-parameter --name "/dev/ecommerce/vnpay/tmn-code" --with-decryption --region ap-southeast-1
aws ssm get-parameter --name "/dev/ecommerce/vnpay/hash-key" --with-decryption --region ap-southeast-1
```

### Google Login Not Working
```bash
# Check Google client ID
aws ssm get-parameter --name "/dev/ecommerce/google/client-id" --with-decryption --region ap-southeast-1
```

---

## 📋 Complete Parameter Checklist

- [ ] `/dev/ecommerce/db/url` - Auto-set by make dev-setup-ssm
- [ ] `/dev/ecommerce/jwt/secret` - Auto-set by make dev-setup-ssm  
- [ ] `/dev/ecommerce/vnpay/tmn-code` - ⚠️ **MUST UPDATE WITH REAL VALUE**
- [ ] `/dev/ecommerce/vnpay/hash-key` - ⚠️ **MUST UPDATE WITH REAL VALUE**
- [ ] `/dev/ecommerce/vnpay/url` - Auto-set (sandbox)
- [ ] `/dev/ecommerce/vnpay/return-url` - Auto-updated after ALB deployment
- [ ] `/dev/ecommerce/google/client-id` - ⚠️ **MUST UPDATE WITH REAL VALUE**

**Remember: The service will start but features will not work properly without real VNPAY and Google credentials!**
