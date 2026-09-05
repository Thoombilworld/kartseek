#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# KARTSEEK Kubernetes Deployment Script
# Usage: ./infra/k8s/deploy.sh [environment]
# Environments: dev, staging, production
# ══════════════════════════════════════════════════════════════════════════════

set -e

ENVIRONMENT=${1:-dev}
NAMESPACE="kartseek"
KUBECONFIG=${KUBECONFIG:-~/.kube/config}

# Manifests live beside this script; run it from anywhere.
cd "$(dirname "${BASH_SOURCE[0]}")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ── Step 1: Validate environment ───────────────────────────────────────────────
log_info "Validating Kubernetes cluster..."
if ! kubectl cluster-info &> /dev/null; then
  log_error "Kubernetes cluster not accessible. Check kubeconfig: $KUBECONFIG"
fi
log_success "Kubernetes cluster connected"

# ── Step 2: Create namespace if it doesn't exist ─────────────────────────────
log_info "Creating namespace '$NAMESPACE'..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
log_success "Namespace '$NAMESPACE' ready"

# ── Step 3: Create image pull secret (if using private registry) ────────────
log_info "Setting up image pull credentials..."
kubectl create secret docker-registry regcred \
  --docker-server=docker.io \
  --docker-username=${DOCKER_USERNAME:-your-username} \
  --docker-password=${DOCKER_PASSWORD:-your-password} \
  --docker-email=${DOCKER_EMAIL:-admin@kartseek.com} \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -
log_success "Image pull secret configured"

# ── Step 4: Preflight — refuse to ship placeholder credentials ────────────
# The gateway's own Joi schema rejects a JWT_SECRET containing change/example/
# dev/test/placeholder when NODE_ENV=production, and requires ENCRYPTION_KEY.
# Catching that here costs a second; missing it costs a CrashLoopBackOff that
# looks like a networking problem.
if [ "$ENVIRONMENT" = "production" ]; then
  log_info "Preflighting secrets..."
  if grep -qE 'CHANGE_IN_PRODUCTION|change-in-production|xxxxxxxx|^\s*ENCRYPTION_KEY: "0{64}"' ./config.yaml; then
    log_error "infra/k8s/config.yaml still holds placeholder secrets. Replace them (or
  switch to the External Secrets Operator) before deploying to production."
  fi
  log_success "No placeholder secrets found"
fi

# ── Step 5: Apply ConfigMaps and Secrets ──────────────────────────────────
log_info "Deploying ConfigMaps and Secrets..."
kubectl apply -f ./config.yaml --namespace=$NAMESPACE
log_success "ConfigMaps and Secrets deployed"

# ── Step 6: Apply RBAC, Network Policies, LimitRange and Quota ────────────
# Must precede every workload: the ResourceQuota rejects pods that omit
# resource requests, and the LimitRange in the same file is what supplies them.
log_info "Configuring RBAC and Network Policies..."
kubectl apply -f ./namespace.yaml
log_success "RBAC and Network Policies configured"

# ── Step 7: Apply StorageClasses and dev PersistentVolumes ────────────────
# This step did not exist. Without it the `fast-ssd` StorageClass every
# volumeClaimTemplate names is absent, so all database PVCs sit Pending and no
# database ever starts.
log_info "Deploying StorageClasses..."
kubectl apply -f ./storage.yaml
log_success "StorageClasses deployed"

# ── Step 8: Deploy Databases (PostgreSQL, Redis, Kafka) ───────────────────
log_info "Deploying databases..."
kubectl apply -f ./databases.yaml --namespace=$NAMESPACE

for sts in postgres postgres-marketplace redis kafka; do
  log_info "Waiting for $sts to be ready..."
  kubectl rollout status statefulset/$sts --namespace=$NAMESPACE --timeout=5m || \
    log_warning "$sts did not become ready in time — check 'kubectl describe statefulset/$sts -n $NAMESPACE'"
done

log_success "Databases deployed"

# ── Step 9: Deploy Microservices ─────────────────────────────────────────
# Before the gateway, not after: the gateway opens a TCP client to every service
# at boot, so bringing it up first guarantees a round of connection errors.
log_info "Deploying Microservices..."
kubectl apply -f ./microservices.yaml --namespace=$NAMESPACE
kubectl apply -f ./microservices-generated.yaml --namespace=$NAMESPACE
kubectl apply -f ./marketplace-hpa.yaml --namespace=$NAMESPACE
log_info "Waiting for all microservice deployments..."
kubectl wait --for=condition=Available deployment --all \
  --namespace=$NAMESPACE --timeout=10m || \
  log_warning "Some deployments are not Available — see 'kubectl get pods -n $NAMESPACE'"
log_success "Microservices deployed"

# ── Step 10: Deploy API Gateway ───────────────────────────────────────────
log_info "Deploying API Gateway..."
kubectl apply -f ./api-gateway.yaml --namespace=$NAMESPACE
kubectl rollout status deployment/api-gateway --namespace=$NAMESPACE --timeout=10m
log_success "API Gateway deployed"

# ── Step 11: Deploy Ingress (if cert-manager is installed) ──────────────
if kubectl get crd certificates.cert-manager.io &> /dev/null; then
  log_info "Deploying Ingress..."
  kubectl apply -f ./ingress.yaml --namespace=$NAMESPACE
  log_success "Ingress deployed"
else
  log_warning "cert-manager not found. Skipping Ingress deployment."
  log_info "To install cert-manager: helm repo add jetstack https://charts.jetstack.io && helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true"
fi

# ── Step 12: Verify deployments ───────────────────────────────────────────
log_info "Verifying deployments..."
echo ""
echo "=== Deployment Status ==="
kubectl get deployments -n $NAMESPACE

echo ""
echo "=== Pod Status ==="
kubectl get pods -n $NAMESPACE

echo ""
echo "=== Services ==="
kubectl get svc -n $NAMESPACE

# ── Step 13: Display access information ──────────────────────────────────
log_success "✨ KARTSEEK Kubernetes deployment complete!"
echo ""
echo "=== Access Information ==="
echo "Namespace: $NAMESPACE"
echo "API Gateway: kubectl port-forward -n $NAMESPACE svc/api-gateway 3001:3001"
echo "PostgreSQL:  kubectl port-forward -n $NAMESPACE svc/postgres 5432:5432"
echo "Redis:       kubectl port-forward -n $NAMESPACE svc/redis 6379:6379"
echo ""
echo "View logs:"
echo "  kubectl logs -f -n $NAMESPACE deployment/api-gateway"
echo "  kubectl logs -f -n $NAMESPACE deployment/auth-service"
echo ""
echo "Get all resources:"
echo "  kubectl get all -n $NAMESPACE"
echo ""
echo "Next steps:"
echo "  1. Install Prometheus/Grafana: helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring"
echo "  2. Install Ingress Controller: helm install nginx-ingress ingress-nginx/ingress-nginx"
echo "  3. Install cert-manager for TLS: helm install cert-manager jetstack/cert-manager --set installCRDs=true"
echo ""

log_success "Happy deploying! 🚀"
