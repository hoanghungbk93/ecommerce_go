#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🚀 E-commerce Backend Performance Testing Suite"
echo "=================================================="
echo "Timestamp: $(date)"
echo "Results directory: ${RESULTS_DIR}"
echo ""

mkdir -p "${RESULTS_DIR}"

check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    if ! command -v artillery &> /dev/null; then
        echo "❌ Artillery is not installed. Installing..."
        npm install -g artillery
    else
        echo "✅ Artillery is installed: $(artillery version)"
    fi
    
    if ! curl -s http://dev-ecommerce-alb-415161429.ap-southeast-1.elb.amazonaws.com:8080/health > /dev/null; then
        echo "❌ Backend server is not running on http://dev-ecommerce-alb-415161429.ap-southeast-1.elb.amazonaws.com:8080"
        echo "Please check your AWS backend server deployment"
        exit 1
    else
        echo "✅ Backend server is running"
    fi
    
    echo ""
}

run_basic_test() {
    echo "📊 Running Basic Performance Test..."
    echo "Test duration: ~4 minutes"
    echo "Load pattern: 5 → 10 → 20 requests/second"
    
    artillery run \
        --output "${RESULTS_DIR}/basic_test_${TIMESTAMP}.json" \
        "${SCRIPT_DIR}/artillery.yml" | tee "${RESULTS_DIR}/basic_test_${TIMESTAMP}.log"
    
    echo "✅ Basic test completed"
    echo ""
}

run_stress_test() {
    echo "🔥 Running Stress Test..."
    echo "Test duration: ~8 minutes"
    echo "Load pattern: 50 → 100 requests/second"
    echo "⚠️  This will put significant load on your system"
    
    read -p "Continue with stress test? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        artillery run \
            --output "${RESULTS_DIR}/stress_test_${TIMESTAMP}.json" \
            "${SCRIPT_DIR}/stress-test.yml" | tee "${RESULTS_DIR}/stress_test_${TIMESTAMP}.log"
        
        echo "✅ Stress test completed"
    else
        echo "⏭️  Stress test skipped"
    fi
    
    echo ""
}

run_endpoint_test() {
    echo "🎯 Running Individual Endpoint Tests..."
    
    local endpoints=(
        "/health"
        "/api/v1/products"
        "/api/v1/categories"
    )
    
    for endpoint in "${endpoints[@]}"; do
        echo "Testing endpoint: ${endpoint}"
        
        artillery quick \
            --count 100 \
            --num 10 \
            "http://dev-ecommerce-alb-415161429.ap-southeast-1.elb.amazonaws.com:8080${endpoint}" \
            --output "${RESULTS_DIR}/endpoint_$(echo $endpoint | tr '/' '_')_${TIMESTAMP}.json" \
            2>&1 | tee "${RESULTS_DIR}/endpoint_$(echo $endpoint | tr '/' '_')_${TIMESTAMP}.log"
    done
    
    echo "✅ Individual endpoint tests completed"
    echo ""
}

generate_reports() {
    echo "📈 Generating HTML Reports..."
    
    for json_file in "${RESULTS_DIR}"/*.json; do
        if [[ -f "$json_file" ]]; then
            base_name=$(basename "$json_file" .json)
            echo "Generating report for: $base_name"
            
            artillery report "$json_file" --output "${RESULTS_DIR}/${base_name}.html"
        fi
    done
    
    echo "✅ HTML reports generated"
    echo ""
}

show_summary() {
    echo "📋 Test Summary"
    echo "==============="
    echo "Results location: ${RESULTS_DIR}"
    echo ""
    echo "Generated files:"
    ls -la "${RESULTS_DIR}/"*"${TIMESTAMP}"*
    echo ""
    echo "📊 Open the HTML reports in your browser to view detailed results"
    echo ""
    echo "Quick metrics from latest basic test:"
    if [[ -f "${RESULTS_DIR}/basic_test_${TIMESTAMP}.log" ]]; then
        echo "----------------------------------------"
        grep -E "(http.response_time|http.request_rate|http.codes)" "${RESULTS_DIR}/basic_test_${TIMESTAMP}.log" | tail -10
        echo "----------------------------------------"
    fi
}

cleanup_old_results() {
    echo "🧹 Cleaning up old test results (keeping last 5 runs)..."
    
    find "${RESULTS_DIR}" -name "*.json" -o -name "*.log" -o -name "*.html" | \
        head -n -15 | \
        xargs rm -f 2>/dev/null || true
    
    echo "✅ Cleanup completed"
    echo ""
}

main() {
    echo "Select test type:"
    echo "1) Basic performance test (recommended)"
    echo "2) Stress test (high load)"
    echo "3) Individual endpoint tests"
    echo "4) All tests (basic + endpoint)"
    echo "5) Full suite (all tests including stress)"
    echo ""
    
    read -p "Enter choice (1-5): " choice
    
    check_prerequisites
    cleanup_old_results
    
    case $choice in
        1)
            run_basic_test
            ;;
        2)
            run_stress_test
            ;;
        3)
            run_endpoint_test
            ;;
        4)
            run_basic_test
            run_endpoint_test
            ;;
        5)
            run_basic_test
            run_endpoint_test
            run_stress_test
            ;;
        *)
            echo "Invalid choice. Running basic test..."
            run_basic_test
            ;;
    esac
    
    generate_reports
    show_summary
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi