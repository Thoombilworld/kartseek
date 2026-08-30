#!/bin/bash
# KARTSEEK — Fixes Validation Script
# Verifies that all 12 code review fixes have been applied correctly

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}KARTSEEK Code Review Fixes Validation${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}\n"

PASSED=0
FAILED=0

check_fix() {
  local name=$1
  local condition=$2
  
  if eval "$condition"; then
    echo -e "${GREEN}✅${NC} $name"
    ((PASSED++))
  else
    echo -e "${RED}❌${NC} $name"
    ((FAILED++))
  fi
}

# 1. Dockerfile Node 25 Upgrade
check_fix "Node 25 in Dockerfile" "grep -q 'FROM node:25-alpine' apps/api/Dockerfile"
check_fix "Node 25 in Dockerfile.prod" "grep -q 'FROM node:25-alpine' apps/api/Dockerfile.prod"

# 2. CSP Security (Nonce)
check_fix "CSP nonce in main.ts" "grep -q 'scriptNonce' apps/api/apps/api-gateway/src/main.ts"
check_fix "CSP no unsafe-inline" "! grep -q 'scriptSrc.*unsafe-inline' apps/api/apps/api-gateway/src/main.ts"

# 3. Credentials Environment Variables
check_fix "Postgres uses env vars" "grep -q 'POSTGRES_PASSWORD.*\${' docker-compose.yml"
check_fix "Redis uses env vars" "grep -q 'REDIS_PASSWORD.*\${' docker-compose.yml"
check_fix "Mongo uses env vars" "grep -q 'MONGO_ROOT_PASSWORD.*\${' docker-compose.yml"
check_fix ".env.local.example exists" "[ -f .env.local.example ]"

# 4. Bootstrap Error Handling
check_fix "Bootstrap has try-catch" "grep -q 'try {' apps/api/apps/api-gateway/src/main.ts | grep -q 'catch'"
check_fix "Bootstrap catches EADDRINUSE" "grep -q 'EADDRINUSE' apps/api/apps/api-gateway/src/main.ts"

# 5. Health Check Rate Limit Bypass
check_fix "@SkipThrottle on /health" "grep -B1 '@Get.*health' apps/api/apps/api-gateway/src/controllers/health.controller.ts | grep -q 'SkipThrottle'"
check_fix "@SkipThrottle on /health/ready" "grep -B2 '@Get.*health/ready' apps/api/apps/api-gateway/src/controllers/health.controller.ts | grep -q 'SkipThrottle'"
check_fix "@SkipThrottle on /health/metrics" "grep -B2 '@Get.*health/metrics' apps/api/apps/api-gateway/src/controllers/health.controller.ts | grep -q 'SkipThrottle'"
check_fix "@SkipThrottle on /health/services" "grep -B2 '@Get.*health/services' apps/api/apps/api-gateway/src/controllers/health.controller.ts | grep -q 'SkipThrottle'"

# 6. Database Synchronize Validation
check_fix "Database validator exists" "[ -f apps/api/libs/database/src/database.validator.ts ]"
check_fix "DB validator checks SYNCHRONIZE" "grep -q 'DB_SYNCHRONIZE' apps/api/libs/database/src/database.validator.ts"
check_fix "Main.ts calls validator" "grep -q 'validateDatabaseConfig' apps/api/apps/api-gateway/src/main.ts"

# 7. CORS Headers
check_fix "CORS has X-Device-ID" "grep -q 'X-Device-ID' apps/api/apps/api-gateway/src/main.ts"
check_fix "CORS has X-Session-ID" "grep -q 'X-Session-ID' apps/api/apps/api-gateway/src/main.ts"

# 8. Nginx SSL Directory
check_fix "nginx:certs creates directory" "grep -q 'mkdir -p nginx/ssl' package.json"

# 9. WebSocket Memory Leak Fixes
check_fix "Taxi gateway cleanup" "grep -q 'removeAllListeners' apps/api/apps/api-gateway/src/gateways/taxi-tracking.gateway.ts"
check_fix "Doctor gateway cleanup" "grep -q 'removeAllListeners' apps/api/apps/api-gateway/src/gateways/doctor.gateway.ts"
check_fix "Recommendation gateway cleanup" "grep -q 'removeAllListeners' apps/api/apps/api-gateway/src/gateways/recommendation.gateway.ts"
check_fix "Seller gateway cleanup" "grep -q 'removeAllListeners' apps/api/apps/api-gateway/src/gateways/seller.gateway.ts"

# 10. Authorization Tests
check_fix "Authorization tests exist" "[ -f apps/api/test/authorization.e2e-spec.ts ]"
check_fix "Tests check unauthenticated 401" "grep -q '401' apps/api/test/authorization.e2e-spec.ts"
check_fix "Tests check RolesGuard NOT global" "grep -q 'NOT register RolesGuard' apps/api/test/authorization.e2e-spec.ts"

# 11. Documentation Files
check_fix "CODE_REVIEW_ISSUES.md exists" "[ -f CODE_REVIEW_ISSUES.md ]"
check_fix "FIXES_APPLIED.md exists" "[ -f FIXES_APPLIED.md ]"
check_fix "QUICK_START_FIXES.md exists" "[ -f QUICK_START_FIXES.md ]"
check_fix "ALL_FIXES_COMPLETE.md exists" "[ -f ALL_FIXES_COMPLETE.md ]"

# 12. TypeScript 6 Documentation
check_fix "webpack.config.js has TS6 comment" "grep -q 'TypeScript 6' apps/api/webpack.config.js"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Results: ${GREEN}${PASSED} Passed${NC} ${YELLOW}|${NC} ${RED}${FAILED} Failed${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}\n"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All fixes validated successfully!${NC}\n"
  echo "Next steps:"
  echo "  1. npm run type-check"
  echo "  2. npm test -- authorization.e2e-spec.ts"
  echo "  3. npm run build"
  echo "  4. docker build -f apps/api/Dockerfile.prod apps/api"
  exit 0
else
  echo -e "${RED}❌ ${FAILED} fix(es) not found or failed${NC}\n"
  exit 1
fi
