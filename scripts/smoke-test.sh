#!/usr/bin/env bash
#
# SirTrav A2A Studio - Smoke Test Script
# Run this after starting `netlify dev` in another terminal
#
# Usage: ./scripts/smoke-test.sh [base_url]
# Default: http://localhost:8888
#

set -euo pipefail

BASE_URL="${1:-http://localhost:8888}"
FUNCTIONS_URL="${BASE_URL}/.netlify/functions"

echo "🚀 SirTrav A2A Studio - Smoke Test"
echo "=================================="
echo "Base URL: ${BASE_URL}"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; exit 1; }
info() { echo -e "${YELLOW}ℹ️  INFO${NC}: $1"; }

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

run_test() {
  local name="$1"
  local cmd="$2"
  local expected="$3"
  
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  echo ""
  info "Testing: ${name}"
  
  response=$(eval "$cmd" 2>/dev/null || echo "CURL_FAILED")
  
  if [[ "$response" == *"$expected"* ]]; then
    pass "$name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "  Expected to contain: $expected"
    echo "  Got: $response"
    fail "$name"
  fi
}

# ============================================================================
# Test 1: Healthcheck
# ============================================================================
run_test "Healthcheck endpoint" \
  "curl -s '${FUNCTIONS_URL}/healthcheck'" \
  "ok"

# ============================================================================
# Test 2: Progress POST (write event)
# ============================================================================
run_test "Progress POST (write event)" \
  "curl -s -X POST '${FUNCTIONS_URL}/progress' \
    -H 'Content-Type: application/json' \
    -d '{\"projectId\":\"smoke-test-001\",\"agent\":\"director\",\"status\":\"completed\",\"message\":\"Smoke test\",\"progress\":100}'" \
  "projectId"

# ============================================================================
# Test 3: Progress GET (read events)
# ============================================================================
run_test "Progress GET (read events)" \
  "curl -s '${FUNCTIONS_URL}/progress?projectId=smoke-test-001'" \
  "smoke-test-001"

# ============================================================================
# Test 4: Progress SSE format
# ============================================================================
run_test "Progress SSE format" \
  "curl -s '${FUNCTIONS_URL}/progress?projectId=smoke-test-001' -H 'Accept: text/event-stream'" \
  "event:"

# ============================================================================
# Test 5: Submit Evaluation POST
# ============================================================================
run_test "Submit Evaluation POST" \
  "curl -s -X POST '${FUNCTIONS_URL}/submit-evaluation' \
    -H 'Content-Type: application/json' \
    -d '{\"projectId\":\"smoke-test-001\",\"rating\":\"good\",\"comments\":\"Smoke test feedback\"}'" \
  "success"

# ============================================================================
# Test 6: Generate Attribution POST
# ============================================================================
run_test "Generate Attribution POST" \
  "curl -s -X POST '${FUNCTIONS_URL}/generate-attribution' \
    -H 'Content-Type: application/json' \
    -d '{\"projectId\":\"smoke-test-001\"}'" \
  "credits"

# ============================================================================
# Test 7: Intake Upload OPTIONS (CORS)
# ============================================================================
run_test "Intake Upload CORS preflight" \
  "curl -s -X OPTIONS '${FUNCTIONS_URL}/intake-upload' -w '%{http_code}'" \
  "200"

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=================================="
echo "🏁 Smoke Test Results"
echo "=================================="
echo -e "Tests passed: ${GREEN}${TESTS_PASSED}${NC} / ${TESTS_TOTAL}"

if [ "$TESTS_PASSED" -eq "$TESTS_TOTAL" ]; then
  echo -e "${GREEN}All tests passed! 🎉${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
