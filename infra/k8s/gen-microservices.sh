#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# KARTSEEK — generate Deployment + Service manifests for the microservices that
# were missing from microservices.yaml (which only covers auth/order/payment).
#
# Ports come from each service's main.ts (HTTP / gRPC / TCP). Edit the table below
# if a service's ports change, then re-run:  bash infra/k8s/gen-microservices.sh
#
# Probes use tcpSocket (port-open) rather than httpGet /health, so they work for
# every service regardless of whether it exposes an HTTP health route.
#
# PER-SERVICE OVERRIDES — read this before editing the output by hand.
# microservices-generated.yaml carried hand-written marketplace-service changes
# (2.1.0 image, dedicated-DB init container, httpGet probe, larger resources)
# that this script would have silently reverted on its next run, without a diff
# to warn anyone. Those changes now live in the `case` blocks below, so
# regenerating is idempotent. If a service needs to differ from the defaults,
# add it there — never patch the generated file.
# ══════════════════════════════════════════════════════════════════════════════
set -e
OUT="$(dirname "$0")/microservices-generated.yaml"

# svc-name                http  grpc(-)  tcp(-)
SERVICES="
admin-service         3027  -     4017
audit-log-service     3028  -     -
cart-service          3013  -     4003
commission-service    3030  -     4020
delivery-service      3022  5008  -
doctor-service        3017  -     4007
franchise-service     3016  -     4006
grocery-service       3018  5010  4008
hotel-service         3035  -     4025
location-service      3023  -     4013
loyalty-service       3015  -     4005
marketplace-service   3012  5006  4002
notification-service  3026  5004  -
payout-service        3031  -     4021
pharmacy-service      3020  -     4010
refund-service        3032  -     4022
report-service        3034  -     4024
restaurant-service    3019  5005  4018
search-service        3033  -     4023
taxi-service          3021  5007  4027
user-service          3011  5009  -
wallet-service        3024  -     4014
"

{
echo "# ═══════════════════════════════════════════════════════════════════════════"
echo "# KARTSEEK — Microservice Deployments + Services (GENERATED — do not edit by hand)"
echo "# Source: infra/k8s/gen-microservices.sh   |   ports from each service's main.ts"
echo "# Covers the 22 services missing from microservices.yaml (auth/order/payment)."
echo "# Per-service differences belong in the case blocks of the generator."
echo "# ═══════════════════════════════════════════════════════════════════════════"

echo "$SERVICES" | while read -r svc http grpc tcp; do
  [ -z "$svc" ] && continue

  # ── Defaults ───────────────────────────────────────────────────────────────
  version="2.0.0"
  cpu_req="200m"; mem_req="256Mi"; cpu_lim="500m"; mem_lim="512Mi"
  init_name="wait-for-db"
  init_host="postgres.kartseek.svc.cluster.local"
  init_msg="waiting for db"

  # Probe the HTTP port by default. pharmacy-service binds HTTP to 127.0.0.1 by
  # design (unguarded endpoints kept off the pod network), so probe its TCP port
  # (bound 0.0.0.0) instead — otherwise the kubelet could never reach it.
  probe_kind="tcp"
  probe="$http"
  [ "$svc" = "pharmacy-service" ] && probe="$tcp"

  # ── Per-service overrides ──────────────────────────────────────────────────
  case "$svc" in
    marketplace-service)
      # Owns a dedicated database and serves the highest-volume path in the app.
      version="2.1.0"
      cpu_req="300m"; mem_req="384Mi"; cpu_lim="1000m"; mem_lim="1Gi"
      init_name="wait-for-marketplace-db"
      init_host="postgres-marketplace.kartseek.svc.cluster.local"
      init_msg="waiting for marketplace db"
      probe_kind="http"
      ;;
  esac

  # pharmacy-service's HTTP listener is bound to loopback, so a Service port
  # pointing at it is a black hole — publish only the reachable TCP transport.
  if [ "$svc" = "pharmacy-service" ]; then
    svcports="    - { name: tcp, port: $tcp, targetPort: $tcp, protocol: TCP }"
  else
    svcports="    - { name: http, port: $http, targetPort: $http, protocol: TCP }"
  fi
  ctrports="            - { name: http, containerPort: $http, protocol: TCP }"

  if [ "$grpc" != "-" ]; then
    svcports="$svcports"$'\n'"    - { name: grpc, port: $grpc, targetPort: $grpc, protocol: TCP }"
    ctrports="$ctrports"$'\n'"            - { name: grpc, containerPort: $grpc, protocol: TCP }"
  fi
  if [ "$tcp" != "-" ]; then
    [ "$svc" = "pharmacy-service" ] || \
      svcports="$svcports"$'\n'"    - { name: tcp, port: $tcp, targetPort: $tcp, protocol: TCP }"
    ctrports="$ctrports"$'\n'"            - { name: tcp, containerPort: $tcp, protocol: TCP }"
  fi

  if [ "$probe_kind" = "http" ]; then
    probeblock="httpGet: { path: /health, port: http }"
  else
    probeblock="tcpSocket: { port: $probe }"
  fi

  cat <<EOF
---
apiVersion: v1
kind: Service
metadata:
  name: $svc
  namespace: kartseek
  labels: { app: $svc, tier: microservice }
spec:
  type: ClusterIP
  selector: { app: $svc }
  ports:
$svcports
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $svc
  namespace: kartseek
  labels: { app: $svc, tier: microservice, version: "$version" }
spec:
  replicas: 2
  strategy: { type: RollingUpdate, rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } }
  selector: { matchLabels: { app: $svc } }
  template:
    metadata:
      labels: { app: $svc, tier: microservice, version: "$version" }
    spec:
      serviceAccountName: microservice
      imagePullSecrets: [{ name: regcred }]
      securityContext: { runAsNonRoot: true, runAsUser: 1000, fsGroup: 1000 }
      initContainers:
        # resources are mandatory — the namespace ResourceQuota's admission check
        # walks init containers and rejects the pod when they are unset.
        - name: $init_name
          image: busybox:1.36
          command: ['sh','-c','until nc -z $init_host 5432; do echo $init_msg; sleep 2; done']
          resources:
            requests: { cpu: "10m", memory: "16Mi" }
            limits: { cpu: "50m", memory: "64Mi" }
      containers:
        - name: $svc
          image: kartseek/$svc:$version
          imagePullPolicy: IfNotPresent
          envFrom:
            - configMapRef: { name: kartseek-config }
            - secretRef: { name: kartseek-secrets }
          ports:
$ctrports
          livenessProbe:
            $probeblock
            initialDelaySeconds: 30
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            $probeblock
            initialDelaySeconds: 15
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          resources:
            requests: { cpu: "$cpu_req", memory: "$mem_req" }
            limits: { cpu: "$cpu_lim", memory: "$mem_lim" }
          securityContext:
            allowPrivilegeEscalation: false
            runAsNonRoot: true
            runAsUser: 1000
            capabilities: { drop: [ALL] }
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector: { matchExpressions: [{ key: app, operator: In, values: [$svc] }] }
                topologyKey: kubernetes.io/hostname
      terminationGracePeriodSeconds: 30
EOF
done
} > "$OUT"

echo "Generated $OUT"
echo "Services:    $(grep -c 'kind: Service' "$OUT")"
echo "Deployments: $(grep -c 'kind: Deployment' "$OUT")"
