#!/bin/bash

# Quick script to add products after making user admin
# This script will guide you through the process

BACKEND_URL="http://dev-ecommerce-alb-415161429.ap-southeast-1.elb.amazonaws.com:8080"

echo "🎯 Quick Product Setup Script"
echo "============================="
echo ""

# Step 1: Check if we have an admin user
echo "📝 Step 1: Checking admin user status..."
ADMIN_CHECK=$(curl -s -X POST "$BACKEND_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@ecommerce.com", "password": "admin123"}')

ROLE=$(echo "$ADMIN_CHECK" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)

if [ "$ROLE" != "admin" ]; then
    echo "❌ User is not admin yet (current role: $ROLE)"
    echo ""
    echo "🔧 Please make the user admin first:"
    echo ""
    echo "   METHOD 1 - AWS RDS Query Editor:"
    echo "   1. Go to AWS Console → RDS → Query Editor"
    echo "   2. Connect to: dev-ecommerce-db (username: ecommerce, password: ecommerce123!)"
    echo "   3. Run: UPDATE users SET role = 'admin' WHERE email = 'admin@ecommerce.com';"
    echo ""
    echo "   METHOD 2 - Use psql if you have database access:"
    echo "   psql \"postgres://ecommerce:ecommerce123!@dev-ecommerce-db.cf6y662suv2x.ap-southeast-1.rds.amazonaws.com:5432/ecommerce\""
    echo "   UPDATE users SET role = 'admin' WHERE email = 'admin@ecommerce.com';"
    echo ""
    echo "   Then run this script again!"
    exit 1
fi

echo "✅ User is admin! Proceeding with product creation..."

# Get access token
ACCESS_TOKEN=$(echo "$ADMIN_CHECK" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    exit 1
fi

# Step 2: Create categories
echo ""
echo "📂 Step 2: Creating categories..."

categories=(
    '{"name": "Electronics", "description": "Electronic devices and gadgets", "is_active": true}'
    '{"name": "Clothing", "description": "Fashion and apparel", "is_active": true}'
    '{"name": "Books", "description": "Books and educational materials", "is_active": true}'
    '{"name": "Home & Garden", "description": "Home improvement and garden supplies", "is_active": true}'
    '{"name": "Sports", "description": "Sports equipment and accessories", "is_active": true}'
)

for category in "${categories[@]}"; do
    RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/admin/categories" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "$category")
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        echo "  ✓ Category created"
    else
        echo "  ⚠ Category creation failed or already exists"
    fi
done

echo "✅ Categories created"

# Step 3: Create products
echo ""
echo "📦 Step 3: Creating demo products..."

products=(
    '{
        "name": "iPhone 15 Pro",
        "slug": "iphone-15-pro", 
        "description": "The latest iPhone with advanced camera system and A17 Pro chip. Perfect for photography enthusiasts and power users.",
        "short_description": "Latest iPhone with A17 Pro chip",
        "price": 999.99,
        "sku": "IPH15PRO001",
        "stock": 50,
        "image_url": "https://images.unsplash.com/photo-1592286385-8566f9d8eaca?w=500",
        "category_id": 1,
        "brand": "Apple",
        "tags": "smartphone,apple,premium",
        "is_featured": true,
        "is_active": true
    }'
    '{
        "name": "Samsung Galaxy Watch 6",
        "slug": "samsung-galaxy-watch-6",
        "description": "Advanced smartwatch with health monitoring, GPS, and long battery life. Track your fitness and stay connected.",
        "short_description": "Advanced smartwatch with health monitoring", 
        "price": 329.99,
        "sku": "SGW6001",
        "stock": 30,
        "image_url": "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=500",
        "category_id": 1,
        "brand": "Samsung", 
        "tags": "smartwatch,fitness,health",
        "is_featured": true,
        "is_active": true
    }'
    '{
        "name": "Nike Air Max 270",
        "slug": "nike-air-max-270",
        "description": "Comfortable running shoes with Max Air cushioning. Perfect for daily workouts and casual wear.",
        "short_description": "Comfortable running shoes with Max Air cushioning",
        "price": 150.00,
        "sku": "NAM270001", 
        "stock": 100,
        "image_url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500",
        "category_id": 2,
        "brand": "Nike",
        "tags": "shoes,running,sports,nike",
        "is_featured": false,
        "is_active": true
    }'
    '{
        "name": "MacBook Pro 14-inch",
        "slug": "macbook-pro-14",
        "description": "Powerful laptop with M3 chip, perfect for professionals and creatives. Features Liquid Retina XDR display.",
        "short_description": "Powerful laptop with M3 chip",
        "price": 1999.99,
        "sku": "MBP14M3001",
        "stock": 25,
        "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500", 
        "category_id": 1,
        "brand": "Apple",
        "tags": "laptop,apple,professional,m3",
        "is_featured": true,
        "is_active": true
    }'
    '{
        "name": "Wireless Bluetooth Headphones",
        "slug": "wireless-bluetooth-headphones",
        "description": "High-quality wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers.",
        "short_description": "High-quality wireless headphones with noise cancellation",
        "price": 199.99,
        "sku": "WBH001",
        "stock": 75,
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
        "category_id": 1,
        "brand": "AudioTech",
        "tags": "headphones,wireless,music,audio",
        "is_featured": true,
        "is_active": true
    }'
)

product_count=0
for product in "${products[@]}"; do
    RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/admin/products" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "$product")
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        echo "  ✓ Product created"
        ((product_count++))
    else
        echo "  ⚠ Product creation failed: $(echo "$RESPONSE" | head -100)"
    fi
done

echo ""
echo "🎉 Product setup completed!"
echo "📊 Summary:"
echo "   📂 5 Categories created"
echo "   📦 $product_count Products created"
echo ""
echo "🌐 View your products at:"
echo "   http://dev-ecommerce-alb-415161429.ap-southeast-1.elb.amazonaws.com"
echo ""
echo "🔑 Admin login:"
echo "   Email: admin@ecommerce.com"
echo "   Password: admin123"
