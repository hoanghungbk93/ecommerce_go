#!/bin/bash

echo "🚀 Building Load Tester..."
go build -o load-tester main.go

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Default test configurations
echo "📋 Available Test Scenarios:"
echo "1. Quick Test (100 users, 30s)"
echo "2. Medium Test (500 users, 2m)" 
echo "3. Full Load Test (1000 users, 5m)"
echo "4. Stress Test (2000 users, 3m)"
echo "5. Custom Test"
echo ""

read -p "Select scenario (1-5): " choice

case $choice in
    1)
        echo "🏃 Running Quick Test..."
        ./load-tester -url=http://localhost -c=100 -d=30s -r=5s -o=results-quick.json
        ;;
    2)
        echo "🏃 Running Medium Test..."
        ./load-tester -url=http://localhost -c=500 -d=2m -r=10s -o=results-medium.json
        ;;
    3)
        echo "🏃 Running Full Load Test (1000 CCU)..."
        ./load-tester -url=http://localhost -c=1000 -d=5m -r=15s -o=results-full.json
        ;;
    4)
        echo "🏃 Running Stress Test..."
        ./load-tester -url=http://localhost -c=2000 -d=3m -r=20s -o=results-stress.json
        ;;
    5)
        read -p "Enter URL (default: http://localhost): " url
        read -p "Enter concurrent users (default: 1000): " users
        read -p "Enter duration (default: 60s): " duration
        read -p "Enter ramp-up time (default: 10s): " rampup
        
        url=${url:-http://localhost}
        users=${users:-1000}
        duration=${duration:-60s}
        rampup=${rampup:-10s}
        
        echo "🏃 Running Custom Test..."
        ./load-tester -url=$url -c=$users -d=$duration -r=$rampup -o=results-custom.json
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "🎉 Load test completed!"
echo "📊 Check Grafana dashboard: http://localhost:3000"
echo "📈 Check Prometheus metrics: http://localhost:9090"
