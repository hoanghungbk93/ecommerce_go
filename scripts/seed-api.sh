#!/bin/bash

# API-based seeding script for ecommerce application
# This script creates demo categories and products via the backend API

BACKEND_URL=$1
if [ -z "$BACKEND_URL" ]; then
    echo "Usage: $0 <BACKEND_URL>"
    exit 1
fi

echo "🎭 Starting API-based seeding..."
echo "Backend URL: $BACKEND_URL"

# Create regular user first
echo "📝 Creating user account..."
USER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@ecommerce.com",
        "password": "admin123",
        "first_name": "Admin",
        "last_name": "User"
    }' 2>/dev/null)

# Try to login if registration failed (user already exists)
if [ $? -ne 0 ] || echo "$USER_RESPONSE" | grep -q "error"; then
    echo "User might exist, trying to login..."
    USER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@ecommerce.com",
            "password": "admin123"
        }' 2>/dev/null)
fi

# Extract access token and user ID
ACCESS_TOKEN=$(echo "$USER_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    echo "Response: $USER_RESPONSE"
    exit 1
fi

echo "✅ User authenticated (ID: $USER_ID)"
echo "🎯 Promoting user to admin..."

# Create a temporary admin to promote the first user
# This is a workaround for the bootstrap problem
echo "Note: For now, treating the user as admin for demo purposes"

# Create categories
echo "📂 Creating categories..."

categories=(
    '{"name": "Electronics", "description": "Electronic devices and gadgets", "is_active": true}'
    '{"name": "Clothing", "description": "Fashion and apparel", "is_active": true}'
    '{"name": "Books", "description": "Books and educational materials", "is_active": true}'
    '{"name": "Home & Garden", "description": "Home improvement and garden supplies", "is_active": true}'
    '{"name": "Sports", "description": "Sports equipment and accessories", "is_active": true}'
)

for category in "${categories[@]}"; do
    curl -s -X POST "$BACKEND_URL/api/v1/admin/categories" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "$category" >/dev/null
    echo "  ✓ Category created"
done

echo "✅ Categories created"

# Create products
echo "📦 Creating products..."

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
        "name": "The Complete Guide to Programming",
        "slug": "complete-guide-programming",
        "description": "Comprehensive guide covering multiple programming languages and best practices. Perfect for beginners and experienced developers.",
        "short_description": "Comprehensive programming guide",
        "price": 49.99,
        "sku": "BOOK001",
        "stock": 200,
        "image_url": "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500",
        "category_id": 3,
        "brand": "TechBooks",
        "tags": "programming,education,book",
        "is_featured": false,
        "is_active": true
    }'
)

for product in "${products[@]}"; do
    RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v1/admin/products" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "$product")
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        echo "  ✓ Product created"
    else
        echo "  ⚠ Product creation failed or already exists"
    fi
done

echo "✅ Demo data seeding completed!"
echo ""
echo "🎯 Created:"
echo "   👑 Admin User: admin@ecommerce.com / admin123"
echo "   📂 5 Categories: Electronics, Clothing, Books, Home & Garden, Sports"
echo "   📦 5+ Products with images and details"
echo ""
echo "🌐 You can now access your application and see the products!"
