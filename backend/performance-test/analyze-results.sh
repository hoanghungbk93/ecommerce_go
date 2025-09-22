#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"

echo "📊 Performance Test Results Analysis"
echo "===================================="
echo ""

if [[ ! -d "$RESULTS_DIR" ]]; then
    echo "❌ Results directory not found: $RESULTS_DIR"
    echo "Run performance tests first using: ./run-performance-tests.sh"
    exit 1
fi

analyze_json_results() {
    local json_file="$1"
    local test_name="$2"
    
    echo "📈 Analysis for: $test_name"
    echo "----------------------------------------"
    
    if [[ ! -f "$json_file" ]]; then
        echo "❌ JSON file not found: $json_file"
        return
    fi
    
    if command -v jq &> /dev/null; then
        echo "🎯 Key Metrics:"
        
        local total_requests=$(jq '.aggregate.counters."http.requests" // 0' "$json_file")
        local total_responses=$(jq '.aggregate.counters."http.responses" // 0' "$json_file")
        local error_count=$(jq '.aggregate.counters."http.request_timeout" // 0' "$json_file")
        
        local min_response_time=$(jq '.aggregate.histograms."http.response_time".min // 0' "$json_file")
        local max_response_time=$(jq '.aggregate.histograms."http.response_time".max // 0' "$json_file")
        local median_response_time=$(jq '.aggregate.histograms."http.response_time".median // 0' "$json_file")
        local p95_response_time=$(jq '.aggregate.histograms."http.response_time".p95 // 0' "$json_file")
        local p99_response_time=$(jq '.aggregate.histograms."http.response_time".p99 // 0' "$json_file")
        
        echo "  📊 Total Requests: $total_requests"
        echo "  📊 Total Responses: $total_responses"
        echo "  ❌ Errors/Timeouts: $error_count"
        echo "  ⏱️  Response Times (ms):"
        echo "     Min: $min_response_time"
        echo "     Median: $median_response_time"
        echo "     95th percentile: $p95_response_time"
        echo "     99th percentile: $p99_response_time"
        echo "     Max: $max_response_time"
        
        if [[ $total_requests -gt 0 ]]; then
            local success_rate=$(echo "scale=2; ($total_responses * 100) / $total_requests" | bc -l 2>/dev/null || echo "N/A")
            echo "  ✅ Success Rate: $success_rate%"
        fi
        
        echo "  📋 Status Codes:"
        jq -r '.aggregate.counters | to_entries[] | select(.key | startswith("http.codes.")) | "     \(.key | sub("http.codes."; "")): \(.value)"' "$json_file" 2>/dev/null | sort || echo "     No status code data"
        
    else
        echo "⚠️  jq not installed, showing raw summary..."
        grep -E "(requests|responses|codes|response_time)" "$json_file" | head -10 || echo "No data found"
    fi
    
    echo ""
}

generate_comparison_report() {
    echo "📋 Test Comparison Summary"
    echo "=========================="
    echo ""
    
    local json_files=($(find "$RESULTS_DIR" -name "*.json" -type f | sort))
    
    if [[ ${#json_files[@]} -eq 0 ]]; then
        echo "❌ No JSON result files found"
        return
    fi
    
    printf "%-30s %-12s %-12s %-12s %-12s\n" "Test Name" "Requests" "Median(ms)" "P95(ms)" "Success%"
    printf "%-30s %-12s %-12s %-12s %-12s\n" "$(printf '%.0s-' {1..30})" "$(printf '%.0s-' {1..12})" "$(printf '%.0s-' {1..12})" "$(printf '%.0s-' {1..12})" "$(printf '%.0s-' {1..12})"
    
    for json_file in "${json_files[@]}"; do
        local test_name=$(basename "$json_file" .json | sed 's/_[0-9]*$//')
        
        if command -v jq &> /dev/null; then
            local requests=$(jq '.aggregate.counters."http.requests" // 0' "$json_file")
            local responses=$(jq '.aggregate.counters."http.responses" // 0' "$json_file")
            local median=$(jq '.aggregate.histograms."http.response_time".median // 0' "$json_file")
            local p95=$(jq '.aggregate.histograms."http.response_time".p95 // 0' "$json_file")
            
            local success_rate="N/A"
            if [[ $requests -gt 0 ]]; then
                success_rate=$(echo "scale=1; ($responses * 100) / $requests" | bc -l 2>/dev/null || echo "N/A")
                if [[ "$success_rate" != "N/A" ]]; then
                    success_rate="${success_rate}%"
                fi
            fi
            
            printf "%-30s %-12s %-12s %-12s %-12s\n" "$test_name" "$requests" "$median" "$p95" "$success_rate"
        else
            printf "%-30s %-12s %-12s %-12s %-12s\n" "$test_name" "?" "?" "?" "?"
        fi
    done
    
    echo ""
}

check_performance_thresholds() {
    echo "⚡ Performance Threshold Check"
    echo "============================="
    echo ""
    
    local json_files=($(find "$RESULTS_DIR" -name "*.json" -type f))
    
    for json_file in "${json_files[@]}"; do
        local test_name=$(basename "$json_file" .json)
        echo "🔍 Checking: $test_name"
        
        if command -v jq &> /dev/null; then
            local median=$(jq '.aggregate.histograms."http.response_time".median // 0' "$json_file")
            local p95=$(jq '.aggregate.histograms."http.response_time".p95 // 0' "$json_file")
            local requests=$(jq '.aggregate.counters."http.requests" // 0' "$json_file")
            local responses=$(jq '.aggregate.counters."http.responses" // 0' "$json_file")
            local errors=$(jq '.aggregate.counters."http.request_timeout" // 0' "$json_file")
            
            local success_rate=100
            if [[ $requests -gt 0 ]]; then
                success_rate=$(echo "scale=2; ($responses * 100) / $requests" | bc -l 2>/dev/null || echo "100")
            fi
            
            echo "  Median response time: ${median}ms"
            if (( $(echo "$median > 1000" | bc -l) )); then
                echo "  ⚠️  WARNING: Median response time > 1000ms"
            elif (( $(echo "$median > 500" | bc -l) )); then
                echo "  ⚠️  NOTICE: Median response time > 500ms"
            else
                echo "  ✅ Good: Median response time acceptable"
            fi
            
            echo "  95th percentile: ${p95}ms"
            if (( $(echo "$p95 > 2000" | bc -l) )); then
                echo "  ⚠️  WARNING: P95 response time > 2000ms"
            elif (( $(echo "$p95 > 1000" | bc -l) )); then
                echo "  ⚠️  NOTICE: P95 response time > 1000ms"
            else
                echo "  ✅ Good: P95 response time acceptable"
            fi
            
            echo "  Success rate: ${success_rate}%"
            if (( $(echo "$success_rate < 95" | bc -l) )); then
                echo "  ❌ CRITICAL: Success rate < 95%"
            elif (( $(echo "$success_rate < 99" | bc -l) )); then
                echo "  ⚠️  WARNING: Success rate < 99%"
            else
                echo "  ✅ Good: Success rate acceptable"
            fi
            
            if [[ $errors -gt 0 ]]; then
                echo "  ❌ NOTICE: $errors timeout errors detected"
            fi
            
        else
            echo "  ⚠️  Cannot analyze (jq not installed)"
        fi
        
        echo ""
    done
}

show_latest_results() {
    echo "🕐 Latest Test Results"
    echo "==================="
    echo ""
    
    local latest_json=$(find "$RESULTS_DIR" -name "*.json" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -n "$latest_json" ]]; then
        local test_name=$(basename "$latest_json" .json)
        echo "📄 Latest test: $test_name"
        echo "📅 File: $latest_json"
        echo ""
        analyze_json_results "$latest_json" "$test_name"
    else
        echo "❌ No test results found"
    fi
}

install_dependencies() {
    echo "🔧 Installing analysis dependencies..."
    
    if ! command -v jq &> /dev/null; then
        echo "Installing jq..."
        if command -v brew &> /dev/null; then
            brew install jq
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y jq
        else
            echo "⚠️  Please install jq manually for better analysis"
        fi
    fi
    
    if ! command -v bc &> /dev/null; then
        echo "Installing bc..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get install -y bc
        fi
    fi
    
    echo "✅ Dependencies check completed"
    echo ""
}

main() {
    echo "Select analysis type:"
    echo "1) Show latest test results"
    echo "2) Analyze all test results"
    echo "3) Generate comparison report"
    echo "4) Performance threshold check"
    echo "5) Install/check dependencies"
    echo "6) Full analysis (all options)"
    echo ""
    
    read -p "Enter choice (1-6): " choice
    
    case $choice in
        1)
            show_latest_results
            ;;
        2)
            for json_file in "$RESULTS_DIR"/*.json; do
                if [[ -f "$json_file" ]]; then
                    test_name=$(basename "$json_file" .json)
                    analyze_json_results "$json_file" "$test_name"
                fi
            done
            ;;
        3)
            generate_comparison_report
            ;;
        4)
            check_performance_thresholds
            ;;
        5)
            install_dependencies
            ;;
        6)
            install_dependencies
            show_latest_results
            generate_comparison_report
            check_performance_thresholds
            ;;
        *)
            echo "Invalid choice. Showing latest results..."
            show_latest_results
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi