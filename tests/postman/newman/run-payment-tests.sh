#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Newman Test Runner for KARTSEEK Centralized Payment Service
# ─────────────────────────────────────────────────────────────────────────────
# Usage:
#   ./run-payment-tests.sh            # Run against local
#   ./run-payment-tests.sh staging    # Run against staging
#   ./run-payment-tests.sh production # Run against production
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"
ENV="${1:-local}"
REPORT_DIR="$TESTS_DIR/reports"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  KARTSEEK Payment Service — API Test Suite                     ║"
echo "║  Environment: $ENV                                              ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# Create report directory
mkdir -p "$REPORT_DIR"

# Run Newman
npx newman run "$TESTS_DIR/payment-service.postman_collection.json" \
  -e "$TESTS_DIR/environments/${ENV}.postman_environment.json" \
  --reporters cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/payment-test-report-${ENV}.html" \
  --reporter-json-export "$REPORT_DIR/payment-test-report-${ENV}.json" \
  --timeout-request 15000 \
  --delay-request 100 \
  --bail

EXIT_CODE=$?

echo ""
echo "─────────────────────────────────────────────────────"
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All tests PASSED"
else
  echo "❌ Some tests FAILED (exit code: $EXIT_CODE)"
fi
echo "📄 HTML Report: $REPORT_DIR/payment-test-report-${ENV}.html"
echo "📊 JSON Report: $REPORT_DIR/payment-test-report-${ENV}.json"
echo "─────────────────────────────────────────────────────"

exit $EXIT_CODE
