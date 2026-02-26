#!/bin/bash
# =============================================================================
# OnHyper Performance Benchmark Script
# Uses Apache Benchmark (ab) to measure throughput and response times
# =============================================================================

set -e

# Configuration
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
CONCURRENT="${CONCURRENT:-10}"
REQUESTS="${REQUESTS:-1000}"
RESULTS_DIR="benchmark-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== OnHyper Performance Benchmark ===${NC}"
echo "Base URL: $BASE_URL"
echo "Concurrent requests: $CONCURRENT"
echo "Total requests: $REQUESTS"
echo "Results directory: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check if server is running
echo -e "${YELLOW}Checking server availability...${NC}"
if ! curl -s --max-time 5 "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: Server not responding at $BASE_URL${NC}"
    echo "Start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Function to run benchmark and save results
run_benchmark() {
    local name="$1"
    local url="$2"
    local extra_flags="${3:-}"
    
    echo -e "${YELLOW}Benchmarking: $name${NC}"
    echo "  URL: $url"
    
    local output_file="$RESULTS_DIR/${TIMESTAMP}_${name}.txt"
    
    # Run ab benchmark
    ab $extra_flags -n $REQUESTS -c $CONCURRENT -g "$RESULTS_DIR/${TIMESTAMP}_${name}.gnuplot" "$url" > "$output_file" 2>&1
    
    # Extract key metrics
    local rps=$(grep "Requests per second" "$output_file" | awk '{print $4}')
    local tpr=$(grep "Time per request" "$output_file" | head -1 | awk '{print $4}')
    local failed=$(grep "Failed requests" "$output_file" | awk '{print $3}')
    local p50=$(grep "50%" "$output_file" | awk '{print $2}')
    local p95=$(grep "95%" "$output_file" | awk '{print $2}')
    local p99=$(grep "99%" "$output_file" | awk '{print $2}')
    
    echo -e "  ${GREEN}✓${NC} requests/sec: ${GREEN}$rps${NC}"
    echo -e "    mean latency: ${tpr}ms"
    echo -e "    p50: ${p50}ms, p95: ${p95}ms, p99: ${p99}ms"
    if [ "$failed" != "0" ]; then
        echo -e "    ${RED}Failed requests: $failed${NC}"
    fi
    echo ""
}

# =============================================================================
# STATIC PAGE SERVING BENCHMARKS
# =============================================================================
echo -e "${GREEN}--- Static Page Serving ---${NC}"
echo ""

# Health check (lightweight JSON response)
run_benchmark "health" "$BASE_URL/health"

# API status (lightweight JSON response)
run_benchmark "api_status" "$BASE_URL/api/status"

# API info (static JSON response)
run_benchmark "api_info" "$BASE_URL/api"

# Homepage (SPA - serves index.html)
run_benchmark "homepage" "$BASE_URL/"

# Well-known skill (markdown file)
run_benchmark "wellknown_skill" "$BASE_URL/.well-known/skill.md"

# =============================================================================
# API ENDPOINT BENCHMARKS (Public, no auth required)
# =============================================================================
echo -e "${GREEN}--- Public API Endpoints ---${NC}"
echo ""

# Waitlist stats
run_benchmark "waitlist_stats" "$BASE_URL/api/waitlist/stats"

# Subdomain check
run_benchmark "subdomain_check" "$BASE_URL/api/subdomains/check?name=testapp123"

# Chat status
run_benchmark "chat_status" "$BASE_URL/api/chat/status"

# Feature flags
run_benchmark "features" "$BASE_URL/api/features"

# =============================================================================
# PROXY ENDPOINT BENCHMARKS
# =============================================================================
echo -e "${GREEN}--- Proxy Info Endpoints ---${NC}"
echo ""

# Proxy info
run_benchmark "proxy_info" "$BASE_URL/proxy"

# WorkOS proxy info
run_benchmark "workos_info" "$BASE_URL/proxy/auth/workos"

# Clerk proxy info
run_benchmark "clerk_info" "$BASE_URL/proxy/auth/clerk"

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${GREEN}=== Benchmark Complete ===${NC}"
echo ""
echo "Results saved to: $RESULTS_DIR/"
ls -la "$RESULTS_DIR/${TIMESTAMP}"*.txt 2>/dev/null | head -5
echo ""

# Generate summary CSV
SUMMARY_FILE="$RESULTS_DIR/${TIMESTAMP}_summary.csv"
echo "endpoint,requests_per_sec,mean_latency_ms,p50_ms,p95_ms,p99_ms,failed_requests" > "$SUMMARY_FILE"

for f in "$RESULTS_DIR/${TIMESTAMP}"*.txt; do
    if [ -f "$f" ] && [[ ! "$f" == *"_summary"* ]]; then
        name=$(basename "$f" .txt | sed "s/${TIMESTAMP}_//")
        rps=$(grep "Requests per second" "$f" | awk '{print $4}')
        tpr=$(grep "Time per request" "$f" | head -1 | awk '{print $4}')
        failed=$(grep "Failed requests" "$f" | awk '{print $3}')
        p50=$(grep "50%" "$f" | awk '{print $2}')
        p95=$(grep "95%" "$f" | awk '{print $2}')
        p99=$(grep "99%" "$f" | awk '{print $2}')
        echo "$name,$rps,$tpr,$p50,$p95,$p99,$failed" >> "$SUMMARY_FILE"
    fi
done

echo -e "${GREEN}Summary CSV: $SUMMARY_FILE${NC}"
cat "$SUMMARY_FILE"