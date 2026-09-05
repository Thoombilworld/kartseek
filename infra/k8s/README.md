# Kubernetes manifests

Plain `kubectl`-applied manifests (no Helm, no Kustomize) for running the
KARTSEEK platform on a real cluster: the namespace and its RBAC/quota, the
databases, every microservice, the API gateway, ingress and autoscaling. This
is for anyone deploying the platform to Kubernetes, or debugging a cluster
that already runs it.

## Prerequisites

- `kubectl`, configured against the target cluster (`kubectl cluster-info`
  should succeed).
- A cluster: Docker Desktop with Kubernetes enabled, or `kind`, for local
  work; a managed EKS/GKE/AKS cluster otherwise.
- `metrics-server` installed, only if you apply `marketplace-hpa.yaml`.
- `cert-manager` and an ingress controller installed, only if you apply
  `ingress.yaml`.
- No image named `kartseek/*` is published anywhere — build or load each one
  yourself first, see [`infra/docker/README.md`](../docker/README.md).

## The manifests

| File                           | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `namespace.yaml`               | The namespace, RBAC, NetworkPolicies, a `LimitRange` and a `ResourceQuota`, and a `PodDisruptionBudget` for pods labeled `critical`. Apply first — see "Known constraints" below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `config.yaml`                  | The `ConfigMap` and `Secret` every service reads its environment from.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `databases.yaml`               | StatefulSets for the shared Postgres, the dedicated marketplace Postgres, Redis and Kafka.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `storage.yaml`                 | The four cloud StorageClasses (`fast-ssd`, `standard`, `high-performance`, `archive`), backed by the AWS EBS CSI driver.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `storage-local-dev.yaml`       | The same four StorageClass names, backed by the cluster's own dynamic provisioner — for Docker Desktop or `kind`. Apply exactly one of these two files; StorageClass fields are immutable, so switching means deleting the old classes first.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `api-gateway.yaml`             | The gateway's Deployment, Service, HPA and PodDisruptionBudget.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `microservices.yaml`           | Hand-written Deployments and Services for `auth-service`, `order-service` and `payment-service`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `microservices-generated.yaml` | The other 22 services, generated by `gen-microservices.sh` from a table of ports at the top of that script — **do not edit this file by hand**. A service that must differ from the generated defaults (today, only `marketplace-service`: a newer image tag, a dedicated-DB init container, an HTTP liveness probe, larger resources) gets a `case` block in the generator instead, so regenerating stays idempotent. This generator and file are replaced in phase 2 by `scripts/registry/generate.mjs` writing `infra/k8s/generated/services.yaml` — see [the platform reorganization design](../../docs/superpowers/specs/2026-09-05-platform-reorganization-design.md), section 5.4. |
| `ingress.yaml`                 | The `Ingress`, `ClusterIssuer`s, `ServiceMonitor`s and a `PrometheusRule`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `marketplace-hpa.yaml`         | A `HorizontalPodAutoscaler` for `marketplace-service`; requires `metrics-server`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `deploy.sh`                    | Applies all of the above in dependency order. See below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `utils.sh`                     | Day-to-day operational commands. See below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `gen-microservices.sh`         | Regenerates `microservices-generated.yaml`. Re-run it after changing a service's ports or resources; never edit the generated file directly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Quick start (local, Docker Desktop)

1. Docker Desktop → Settings → Kubernetes → Enable Kubernetes (or
   `kind create cluster`).
2. `kubectl apply -f infra/k8s/namespace.yaml`
3. `kubectl apply -f infra/k8s/storage-local-dev.yaml` — `deploy.sh` (next
   step) applies the cloud `storage.yaml` unconditionally, which does not
   work on a laptop cluster, so apply the local one yourself first and skip
   that step when it runs.
4. Build or load the images you need into the cluster's own Docker daemon
   (Docker Desktop shares it with `kubectl`) — see
   [`infra/docker/README.md`](../docker/README.md).
5. `./infra/k8s/deploy.sh dev`
6. `kubectl get pods -n kartseek` until everything reports `Running`.

## `deploy.sh`

```bash
./infra/k8s/deploy.sh dev          # or: staging, production
```

Applies, in order: the namespace/RBAC/quota, an image-pull secret,
`config.yaml`, `storage.yaml`, the databases (waiting for each StatefulSet's
rollout), the microservices and `marketplace-hpa.yaml`, the API gateway, and
`ingress.yaml` if a `cert-manager` CRD is present. For `production` only, it
first refuses to continue if `config.yaml` still holds a placeholder secret
(`CHANGE_IN_PRODUCTION`, an all-`x` value, or an all-zero
`ENCRYPTION_KEY`) — the gateway's own startup validation would reject the
same values, and failing here is faster than a `CrashLoopBackOff` that looks
like a networking problem.

## `utils.sh`

```bash
./infra/k8s/utils.sh <command>
```

`logs`, `port-forward`, `scale`, `restart`, `status`, `resources`, `events`,
`shell`, `exec`, `test-db`, `test-redis`, `test-api`, `backup` and `cleanup`,
each scoped to `$NAMESPACE` (default `kartseek`). Run `./infra/k8s/utils.sh
help` for each command's arguments.

## Known constraints

Three things about this cluster are invisible until you actually run it,
found and fixed in an infrastructure audit:

- **A `ResourceQuota` tracking `requests`/`limits` rejects any pod whose
  containers — including init containers — omit them.** Every generated
  Deployment carries a resourceless `wait-for-db` init container, so the
  `LimitRange` in `namespace.yaml` supplies defaults for exactly that case;
  it must be applied, and applied before the quota takes effect.
- **`fsGroup` is not applied to `hostPath`-backed volumes**, so a node-local
  PV stays root-owned and a non-root database container cannot write to it.
  `storage-local-dev.yaml` uses the cluster's own dynamic provisioner
  instead, which creates world-writable directories, for exactly this
  reason.
- **`kubectl apply --validate=strict` passes manifests that cannot run.**
  Schema validity does not catch a Kafka `node.id` that isn't an integer, a
  probe referencing `$(ENV_VAR)` in a context where only `command`/`args`
  expand it, a container `runAsUser` that doesn't match its image's actual
  user, or a `NetworkPolicy` selector using the wrong label. Treat a clean
  `--validate=strict` as "well-formed," not "will start."
