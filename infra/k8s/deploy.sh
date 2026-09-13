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

# The image tag the manifests carry as the literal `${KARTSEEK_TAG}`. The
# generated Deployments and api-gateway.yaml are written with the placeholder so
# that no tag is baked into tracked source (they used to say 2.0.0, and no image
# with that tag has ever been built); this is where it becomes a real reference.
# `dev` is what infra/docker builds locally.
KARTSEEK_TAG=${KARTSEEK_TAG:-dev}

# Where the credentials come from. config.yaml's Secret is a list of NAMES with
# empty values, on purpose — see its header. Point this at a file of KEY=value
# lines (the root .env filtered down to its secrets) and the Secret is created
# from it; leave it unset and an existing kartseek-secrets is left alone.
SECRETS_ENV_FILE=${SECRETS_ENV_FILE:-}

# Applies a manifest with the image tag substituted.
apply_manifest() {
  sed "s|\${KARTSEEK_TAG}|${KARTSEEK_TAG}|g" "$1" | kubectl apply -f - --namespace=$NAMESPACE
}

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

# ── Step 4: Apply the ConfigMap ───────────────────────────────────────────
# The ConfigMap document only. config.yaml's second document is the Secret, and
# every value in it is empty by design — applying it over a Secret the pipeline
# has already filled would blank every credential on the platform. The
# ConfigMap is everything up to the second `---`.
log_info "Deploying the ConfigMap..."
awk '/^---$/ { d++ } d < 2 { print }' ./config.yaml | kubectl apply -f - --namespace=$NAMESPACE
log_success "ConfigMap deployed"

# ── Step 5: The Secret ────────────────────────────────────────────────────
# From SECRETS_ENV_FILE when given; otherwise whatever is already in the
# cluster. The name template in config.yaml is applied only when there is no
# Secret at all, so that a first deploy fails loudly on an empty JWT_SECRET
# (the gateway's Joi schema refuses it under NODE_ENV=production) rather than
# on a missing Secret, which reads as a mounting problem.
if [ -n "$SECRETS_ENV_FILE" ]; then
  log_info "Creating kartseek-secrets from $SECRETS_ENV_FILE..."
  kubectl create secret generic kartseek-secrets \
    --from-env-file="$SECRETS_ENV_FILE" --namespace=$NAMESPACE \
    --dry-run=client -o yaml | kubectl apply -f -
  log_success "Secret created"
elif kubectl get secret kartseek-secrets --namespace=$NAMESPACE &> /dev/null; then
  log_info "kartseek-secrets already exists — left untouched"
else
  log_warning "No SECRETS_ENV_FILE and no kartseek-secrets in the cluster."
  log_warning "Applying the empty name template from config.yaml; every pod that"
  log_warning "needs a credential will refuse to start until it is filled:"
  log_warning "  grep -E '^[A-Z0-9_]+(PASSWORD|SECRET|KEY)=' .env > secrets.env"
  log_warning "  SECRETS_ENV_FILE=secrets.env ./infra/k8s/deploy.sh $ENVIRONMENT"
  awk '/^---$/ { d++ } d == 2 { print }' ./config.yaml | kubectl apply -f - --namespace=$NAMESPACE
fi

# ── Step 5b: Preflight — refuse to ship an unfilled credential ────────────
# The gateway's own Joi schema rejects a JWT_SECRET containing change/example/
# dev/test/placeholder when NODE_ENV=production, and requires a 64-hex
# ENCRYPTION_KEY. Catching that here costs a second; missing it costs a
# CrashLoopBackOff that looks like a networking problem.
if [ "$ENVIRONMENT" = "production" ]; then
  log_info "Preflighting secrets..."
  for key in JWT_SECRET ENCRYPTION_KEY POSTGRES_PASSWORD; do
    value="$(kubectl get secret kartseek-secrets --namespace=$NAMESPACE \
      -o "jsonpath={.data.$key}" 2>/dev/null || true)"
    [ -n "$value" ] || log_error "kartseek-secrets.$key is empty. Fill the Secret
  (SECRETS_ENV_FILE=..., or the External Secrets Operator) before deploying to production."
  done
  log_success "Credentials are present"
fi

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

# ── Step 8: Deploy Databases ──────────────────────────────────────────────
# The Postgres StatefulSet mounts infra/postgres/init-extensions.sql and
# init-roles.sh — the same two files Compose mounts — so the eight module login
# roles exist in the cluster too. Built from the files rather than pasted into
# databases.yaml, where a 250-line copy would drift from the original. Without
# it the Postgres pod stays in ContainerCreating naming this ConfigMap.
log_info "Building the Postgres init-script ConfigMap..."
kubectl create configmap kartseek-postgres-init \
  --from-file=../postgres/init-extensions.sql \
  --from-file=../postgres/init-roles.sh \
  --namespace=$NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
log_success "Init scripts loaded"

log_info "Deploying databases..."
kubectl apply -f ./databases.yaml --namespace=$NAMESPACE

for sts in postgres postgres-marketplace redis kafka mongodb elasticsearch; do
  log_info "Waiting for $sts to be ready..."
  kubectl rollout status statefulset/$sts --namespace=$NAMESPACE --timeout=5m || \
    log_warning "$sts did not become ready in time — check 'kubectl describe statefulset/$sts -n $NAMESPACE'"
done

log_success "Databases deployed"

# ── Step 9: Deploy Microservices ─────────────────────────────────────────
# Before the gateway, not after: the gateway opens a TCP client to every service
# at boot, so bringing it up first guarantees a round of connection errors.
# microservices.yaml is gone: it held hand-written copies of auth/order/payment
# that the generated file now covers, and two definitions of one Deployment in
# one directory is a `kubectl apply` where the last file read wins.
log_info "Deploying Microservices (tag: $KARTSEEK_TAG)..."
apply_manifest ./microservices-generated.yaml
kubectl apply -f ./marketplace-hpa.yaml --namespace=$NAMESPACE
log_info "Waiting for all microservice deployments..."
kubectl wait --for=condition=Available deployment --all \
  --namespace=$NAMESPACE --timeout=10m || \
  log_warning "Some deployments are not Available — see 'kubectl get pods -n $NAMESPACE'"
log_success "Microservices deployed"

# ── Step 10: Deploy API Gateway ───────────────────────────────────────────
log_info "Deploying API Gateway (tag: $KARTSEEK_TAG)..."
apply_manifest ./api-gateway.yaml
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
