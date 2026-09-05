#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# KARTSEEK Kubernetes Utilities
# Helpful commands for managing KARTSEEK on Kubernetes
# ══════════════════════════════════════════════════════════════════════════════

set -e

NAMESPACE="${NAMESPACE:-kartseek}"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

show_help() {
  cat << EOF
KARTSEEK Kubernetes Utilities

Usage: ./infra/k8s/utils.sh [command] [options]

Commands:
  logs [service]           Show logs for a service (default: api-gateway)
  port-forward [service]   Port forward a service (default: api-gateway)
  scale [service] [replicas] Scale a service to N replicas
  restart [service]        Restart a service
  status                   Show deployment status
  resources                Show resource usage
  events                   Show recent events
  shell [pod]              Open shell in a pod
  exec [pod] [cmd]         Execute command in pod
  test-db                  Test database connection
  test-redis               Test Redis connection
  test-api                 Test API endpoint
  cleanup                  Delete all KARTSEEK resources
  backup                   Backup database
  help                     Show this help message

Environment:
  NAMESPACE                Kubernetes namespace (default: kartseek)

Examples:
  ./infra/k8s/utils.sh logs auth-service
  ./infra/k8s/utils.sh port-forward redis
  NAMESPACE=staging ./infra/k8s/utils.sh status
EOF
}

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ── Logs ───────────────────────────────────────────────────────────────────────
cmd_logs() {
  local service=${1:-api-gateway}
  log_info "Showing logs for $service..."
  kubectl logs -f -n $NAMESPACE deployment/$service --tail=50
}

# ── Port Forward ───────────────────────────────────────────────────────────────
cmd_port_forward() {
  local service=${1:-api-gateway}
  local port=${2:-3001}
  
  case $service in
    api-gateway) port=3001 ;;
    auth-service) port=3010 ;;
    order-service) port=3014 ;;
    payment-service) port=3015 ;;
    postgres) port=5432 ;;
    redis) port=6379 ;;
    kafka) port=9092 ;;
  esac
  
  log_info "Port forwarding $service to localhost:$port..."
  kubectl port-forward -n $NAMESPACE svc/$service $port:$port
}

# ── Scale ──────────────────────────────────────────────────────────────────────
cmd_scale() {
  local service=$1
  local replicas=$2
  
  if [ -z "$service" ] || [ -z "$replicas" ]; then
    log_error "Usage: scale [service] [replicas]"
  fi
  
  log_info "Scaling $service to $replicas replicas..."
  kubectl scale deployment/$service --replicas=$replicas -n $NAMESPACE
  kubectl rollout status deployment/$service -n $NAMESPACE
  log_success "Scaled to $replicas replicas"
}

# ── Restart ────────────────────────────────────────────────────────────────────
cmd_restart() {
  local service=${1:-api-gateway}
  log_info "Restarting $service..."
  kubectl rollout restart deployment/$service -n $NAMESPACE
  kubectl rollout status deployment/$service -n $NAMESPACE
  log_success "$service restarted"
}

# ── Status ─────────────────────────────────────────────────────────────────────
cmd_status() {
  log_info "Deployment Status:"
  kubectl get deployments -n $NAMESPACE
  
  echo ""
  log_info "Pod Status:"
  kubectl get pods -n $NAMESPACE -o wide
  
  echo ""
  log_info "Service Status:"
  kubectl get svc -n $NAMESPACE
  
  echo ""
  log_info "StatefulSet Status:"
  kubectl get statefulset -n $NAMESPACE
}

# ── Resources ──────────────────────────────────────────────────────────────────
cmd_resources() {
  log_info "Node Resources:"
  kubectl top nodes
  
  echo ""
  log_info "Pod Resources (top 10):"
  kubectl top pods -n $NAMESPACE --sort-by=memory | head -11
}

# ── Events ─────────────────────────────────────────────────────────────────────
cmd_events() {
  log_info "Recent Events:"
  kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'
}

# ── Shell ──────────────────────────────────────────────────────────────────────
cmd_shell() {
  local pod=$1
  if [ -z "$pod" ]; then
    log_info "Available pods:"
    kubectl get pods -n $NAMESPACE
    log_error "Usage: shell [pod-name]"
  fi
  
  log_info "Opening shell in $pod..."
  kubectl exec -it -n $NAMESPACE $pod -- /bin/sh
}

# ── Exec ───────────────────────────────────────────────────────────────────────
cmd_exec() {
  local pod=$1
  shift
  local cmd=$@
  
  if [ -z "$pod" ] || [ -z "$cmd" ]; then
    log_error "Usage: exec [pod-name] [command...]"
  fi
  
  log_info "Executing in $pod: $cmd"
  kubectl exec -n $NAMESPACE $pod -- $cmd
}

# ── Test Database ──────────────────────────────────────────────────────────────
cmd_test_db() {
  log_info "Testing PostgreSQL connection..."
  
  kubectl exec -it postgres-0 -n $NAMESPACE -- \
    psql -U postgres -d kartseek_db -c "SELECT version();" 2>/dev/null && \
    log_success "PostgreSQL connection successful" || \
    log_error "PostgreSQL connection failed"
}

# ── Test Redis ─────────────────────────────────────────────────────────────────
cmd_test_redis() {
  log_info "Testing Redis connection..."
  
  local password=$(kubectl get secret kartseek-secrets -n $NAMESPACE -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d)
  
  kubectl exec -it redis-0 -n $NAMESPACE -- \
    redis-cli -a $password ping 2>/dev/null && \
    log_success "Redis connection successful" || \
    log_error "Redis connection failed"
}

# ── Test API ───────────────────────────────────────────────────────────────────
cmd_test_api() {
  log_info "Testing API endpoint..."
  
  # Port forward in background
  kubectl port-forward -n $NAMESPACE svc/api-gateway 3001:3001 &
  PF_PID=$!
  sleep 2
  
  local result=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/v1/health)
  local http_code=$(echo "$result" | tail -n 1)
  local body=$(echo "$result" | head -n -1)
  
  kill $PF_PID 2>/dev/null || true
  
  if [ "$http_code" = "200" ]; then
    log_success "API is healthy (HTTP $http_code)"
    echo "$body" | jq . 2>/dev/null || echo "$body"
  else
    log_error "API returned HTTP $http_code"
  fi
}

# ── Cleanup ────────────────────────────────────────────────────────────────────
cmd_cleanup() {
  log_warning "This will delete all KARTSEEK resources in namespace $NAMESPACE"
  read -p "Are you sure? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    log_info "Cleanup cancelled"
    return
  fi
  
  log_info "Deleting namespace $NAMESPACE..."
  kubectl delete namespace $NAMESPACE --wait=true
  log_success "Cleanup complete"
}

# ── Backup Database ────────────────────────────────────────────────────────────
cmd_backup() {
  local backup_file="kartseek_db_$(date +%Y%m%d_%H%M%S).sql.gz"
  
  log_info "Backing up database to $backup_file..."
  
  kubectl exec postgres-0 -n $NAMESPACE -- \
    pg_dump -U postgres -d kartseek_db | gzip > $backup_file
  
  log_success "Database backed up to $backup_file"
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
  local command=$1
  shift || true
  
  case $command in
    logs) cmd_logs "$@" ;;
    port-forward) cmd_port_forward "$@" ;;
    scale) cmd_scale "$@" ;;
    restart) cmd_restart "$@" ;;
    status) cmd_status "$@" ;;
    resources) cmd_resources "$@" ;;
    events) cmd_events "$@" ;;
    shell) cmd_shell "$@" ;;
    exec) cmd_exec "$@" ;;
    test-db) cmd_test_db "$@" ;;
    test-redis) cmd_test_redis "$@" ;;
    test-api) cmd_test_api "$@" ;;
    cleanup) cmd_cleanup "$@" ;;
    backup) cmd_backup "$@" ;;
    help|--help|-h) show_help ;;
    *) log_error "Unknown command: $command. Use 'help' for usage." ;;
  esac
}

main "$@"
