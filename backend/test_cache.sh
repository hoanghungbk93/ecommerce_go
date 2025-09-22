#!/bin/bash

echo "Testing Product List API with Redis Caching"
echo "==========================================="

API_BASE="http://localhost:8080/api/v1"

echo "1. Testing first request (should be cache miss):"
curl -w "\nTime: %{time_total}s\n" -s "$API_BASE/products?page=1&limit=20" | jq '.total, .page, .limit'

echo ""
echo "2. Testing second request (should be cache hit):"
curl -w "\nTime: %{time_total}s\n" -s "$API_BASE/products?page=1&limit=20" | jq '.total, .page, .limit'

echo ""
echo "3. Testing different page (should be cache miss):"
curl -w "\nTime: %{time_total}s\n" -s "$API_BASE/products?page=2&limit=20" | jq '.total, .page, .limit'

echo ""
echo "4. Testing page 2 again (should be cache hit):"
curl -w "\nTime: %{time_total}s\n" -s "$API_BASE/products?page=2&limit=20" | jq '.total, .page, .limit'

echo ""
echo "5. Testing with search parameter (should be cache miss):"
curl -w "\nTime: %{time_total}s\n" -s "$API_BASE/products?page=1&limit=20&search=test" | jq '.total, .page, .limit'

echo ""
echo "6. Testing same search again (should be cache hit):"
curl -w "\nTime: %{time_total}s\n" -s "$API_BASE/products?page=1&limit=20&search=test" | jq '.total, .page, .limit'

echo ""
echo "Test completed. Check the server logs to see cache hit/miss messages."