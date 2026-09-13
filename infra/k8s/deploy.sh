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

# Where the credential VALUES come from. The NAMES come from config.yaml's
# Secret document, which is a list of names with empty values on purpose (see
# its header). Unset, this script reads the repository-root `.env` and
# `apps/api/.env`; set it to read one file of KEY=value lines instead.
#
# This script is the only documented way to fill kartseek-secrets. A
# copy-pasteable `kubectl create secret` used to live in config.yaml's header,
# lost its line continuations in an edit, and when pasted created an EMPTY
# Secret that the next deploy found and left alone — a cluster on blank
# credentials. A script cannot be half-pasted, and this one counts what it built.
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
#
# The NAMES come from config.yaml's own Secret document; the VALUES from the
# developer's env files (or SECRETS_ENV_FILE). A name marked `# optional` there
# is a third-party integration and may be absent — it is named and skipped.
# Anything else is the platform's own credential and its absence STOPS the
# deploy unless the cluster's existing Secret already carries it.
#
# That count is the whole point. The previous version accepted any existing
# Secret untouched, so an EMPTY kartseek-secrets — which is what the mangled
# `kubectl create secret` in config.yaml's header produced when pasted — meant a
# dev cluster came up with every credential blank and nothing said so.
#
# No value is ever echoed: they go into a 0600 temp file, into
# `kubectl create secret`, and the file is removed on exit.

# `''` or `""`, because a template key written the other way would otherwise be
# invisible here and silently never filled, while still passing k8s.test.mjs's
# no-secret-literal check — which accepts both. One rule, in both places.
EMPTY='\(\x27\x27\|""\)'
secret_template_keys() {
  sed -n '/^stringData:/,/^---/p' ./config.yaml | sed -n "s/^  \([A-Z0-9_]*\): $EMPTY.*\$/\1/p"
}
secret_optional_keys() {
  sed -n '/^stringData:/,/^---/p' ./config.yaml |
    sed -n "s/^  \([A-Z0-9_]*\): $EMPTY # optional\$/\1/p"
}

# The first non-empty `KEY=value` across the sources, in order.
secret_value_of() {
  local key="$1" file value
  for file in "${SECRET_SOURCES[@]}"; do
    [ -f "$file" ] || continue
    value="$(sed -n "s/^${key}=//p" "$file" | head -1)"
    if [ -n "$value" ]; then printf '%s' "$value"; return 0; fi
  done
  return 1
}

if [ -n "$SECRETS_ENV_FILE" ]; then
  SECRET_SOURCES=("$SECRETS_ENV_FILE")
else
  # The repository root, then the API workspace: the platform's own credentials
  # live in the first (npm run env:init writes it) and the integration keys, when
  # anyone has them, in the second.
  SECRET_SOURCES=("../../.env" "../../apps/api/.env")
fi

SECRET_TMP="$(mktemp)"
chmod 600 "$SECRET_TMP"
trap 'rm -f "$SECRET_TMP"' EXIT

OPTIONAL_KEYS=" $(secret_optional_keys | tr '\n' ' ') "
TOTAL_KEYS=$(secret_template_keys | grep -c .)
built=0
missing_required=""
absent_optional=""

while read -r key; do
  [ -n "$key" ] || continue
  if value="$(secret_value_of "$key")"; then
    printf '%s=%s\n' "$key" "$value" >> "$SECRET_TMP"
    built=$((built + 1))
  elif [ "${OPTIONAL_KEYS#* $key }" != "$OPTIONAL_KEYS" ]; then
    absent_optional="$absent_optional $key"
  else
    missing_required="$missing_required $key"
  fi
done <<EOF
$(secret_template_keys)
EOF

if [ -n "$missing_required" ]; then
  # One more place to look: a Secret an external store has already filled is
  # better than anything this script can build, so check the cluster before
  # refusing — and refuse on whatever is in neither.
  still_missing=""
  for key in $missing_required; do
    value="$(kubectl get secret kartseek-secrets --namespace=$NAMESPACE \
      -o "jsonpath={.data.$key}" 2>/dev/null || true)"
    [ -n "$value" ] || still_missing="$still_missing $key"
  done
  if [ -n "$still_missing" ]; then
    log_error "kartseek-secrets would be short of:$still_missing
  They are in neither ${SECRET_SOURCES[*]} nor the cluster's existing Secret.
  Run 'npm run env:init' to write the repository-root .env, or point
  SECRETS_ENV_FILE at a file of KEY=value lines. Refusing to deploy a cluster
  onto blank credentials."
  fi
  log_warning "Kept from the existing Secret (absent from the env files):$missing_required"
fi

# ── Create, or MERGE. Never `apply`. ───────────────────────────────────────
#
# `kubectl apply` prunes: a key that was in the resource's
# last-applied-configuration and is absent from the new one is DELETED. Since
# this script is the one documented way to fill the Secret, a previous run of it
# is exactly what puts keys in last-applied — so a second run with a narrower
# source (a shorter SECRETS_ENV_FILE, or apps/api/.env gone) would have removed
# the very credentials the warning above promises to keep, and the pods would
# lose them. `create` on the first run and a merge `patch` afterwards cannot do
# that: a merge patch adds and overwrites the keys it names and leaves the rest
# alone.
if kubectl get secret kartseek-secrets --namespace=$NAMESPACE --ignore-not-found -o name | grep -q .; then
  # `stringData`, not `data`: the API server base64s it on write, so nothing
  # here has to. It is write-only — reading the Secret back shows `data` — which
  # is why this is a patch body and not a comparison.
  #
  # The values are double-quoted YAML scalars, so a backslash or a quote in a
  # generated password has to be escaped. Two substitutions, in that order.
  SECRET_PATCH="$(mktemp)"
  chmod 600 "$SECRET_PATCH"
  trap 'rm -f "$SECRET_TMP" "$SECRET_PATCH"' EXIT
  {
    echo 'stringData:'
    while IFS= read -r line; do
      [ -n "$line" ] || continue
      printf '  %s: "%s"\n' "${line%%=*}" \
        "$(printf '%s' "${line#*=}" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    done < "$SECRET_TMP"
  } > "$SECRET_PATCH"
  log_info "Patching kartseek-secrets — $built of $TOTAL_KEYS template keys, the rest kept..."
  kubectl patch secret kartseek-secrets --namespace=$NAMESPACE \
    --type merge --patch-file "$SECRET_PATCH"
  rm -f "$SECRET_PATCH"
else
  log_info "Creating kartseek-secrets — $built of $TOTAL_KEYS template keys..."
  kubectl create secret generic kartseek-secrets \
    --from-env-file="$SECRET_TMP" --namespace=$NAMESPACE
fi
rm -f "$SECRET_TMP"
if [ -n "$absent_optional" ]; then
  log_warning "Optional integration keys absent:$absent_optional"
fi
log_success "Secret written ($built of $TOTAL_KEYS keys)"

if [ "$ENVIRONMENT" = "production" ]; then
  # Everything blank has already been refused above; this is the reminder that a
  # production cluster should not be taking its credentials from a developer's
  # .env at all.
  log_info "production: prefer an ExternalSecret over this script's env files."
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
#
# Non-fatal. `storage.yaml` is the AWS EBS set, and a laptop cluster carries the
# same four names from `storage-local-dev.yaml` — a StorageClass's provisioner is
# immutable, so this apply is REJECTED there, and under `set -e` that took the
# whole deploy down while the classes it needed already existed.
log_info "Deploying StorageClasses..."
if ! kubectl apply -f ./storage.yaml 2> /dev/null; then
  log_warning "storage.yaml was rejected — the cluster already has same-named classes."
  log_warning "Expected on Docker Desktop / kind, where storage-local-dev.yaml supplies"
  log_warning "fast-ssd, standard, high-performance and archive. Continuing."
fi
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
# A Deployment whose image is not in the local Docker daemon is SKIPPED, by
# name. No `kartseek/*` image is published anywhere, and the eight zone images
# cannot even be built yet — only apps/web sets `output: 'standalone'` (Task
# IN11) — so applying all 34 unconditionally left pods in ErrImagePull while
# `kubectl wait` sat for its full timeout with nothing to read. This skips them;
# it never builds anything.
log_info "Deploying Microservices (tag: $KARTSEEK_TAG)..."
MANIFEST_TMP="$(mktemp)"
sed "s|\${KARTSEEK_TAG}|${KARTSEEK_TAG}|g" ./microservices-generated.yaml > "$MANIFEST_TMP"

if command -v docker > /dev/null 2>&1 && docker image ls > /dev/null 2>&1; then
  wanted="$(sed -n 's/^ *image: \(kartseek\/[^ ]*\)$/\1/p' "$MANIFEST_TMP" | sort -u)"
  have="$(docker image ls --format '{{.Repository}}:{{.Tag}}' | sort -u)"
  absent="$(comm -23 <(printf '%s\n' "$wanted") <(printf '%s\n' "$have") | tr '\n' ' ')"
  if [ -n "$(printf '%s' "$absent" | tr -d ' ')" ]; then
    for image in $absent; do
      log_warning "skipping the Deployment for $image — no such image in the local daemon"
    done
    FILTERED_TMP="$(mktemp)"
    # Document-at-a-time: drop a Deployment whose image is in the skip list, keep
    # its Service (DNS costs nothing and the name stays resolvable).
    awk -v skip="$absent" '
      function flush(  i) {
        if (doc == "") return
        if (index(doc, "kind: Deployment\n") > 0)
          for (i = 1; i <= n; i++)
            if (index(doc, "image: " a[i] "\n") > 0) { doc = ""; return }
        printf "%s", doc
      }
      BEGIN { n = split(skip, a, " ") }
      /^---$/ { flush(); doc = "---\n"; next }
      { doc = doc $0 "\n" }
      END { flush() }
    ' "$MANIFEST_TMP" > "$FILTERED_TMP"
    mv "$FILTERED_TMP" "$MANIFEST_TMP"
  fi
else
  log_warning "docker is not answering — applying every Deployment, including any"
  log_warning "whose image has not been built (those pods report ErrImagePull)."
fi

kubectl apply -f "$MANIFEST_TMP" --namespace=$NAMESPACE
kubectl apply -f ./marketplace-hpa.yaml --namespace=$NAMESPACE

# Only what was actually applied, so a skipped zone does not cost ten minutes.
log_info "Waiting for the deployments that were applied..."
for deployment in $(awk '/^kind: Deployment$/ { d = 1; next } d && /^  name: / { print $2; d = 0 }' "$MANIFEST_TMP"); do
  kubectl rollout status deployment/"$deployment" --namespace=$NAMESPACE --timeout=5m || \
    log_warning "$deployment is not Available — 'kubectl describe deployment/$deployment -n $NAMESPACE'"
done
rm -f "$MANIFEST_TMP"
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
