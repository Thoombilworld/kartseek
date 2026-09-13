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
  yourself first, see [`infra/docker/README.md`](../docker/README.md). Every
  Deployment references `<image>:${KARTSEEK_TAG}`, which `deploy.sh` substitutes
  (default `dev`, which is what the Docker build produces). Applying a manifest
  with plain `kubectl apply` leaves the literal in place and the pod reports
  `InvalidImageName`.
- The repository-root `.env`, for the credentials. `npm run env:init` writes it.

## The manifests

| File                           | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `namespace.yaml`               | The namespace, RBAC, NetworkPolicies, a `LimitRange` and a `ResourceQuota`, and a `PodDisruptionBudget` for pods labeled `critical`. Applied after `config.yaml`; must precede every workload because the `ResourceQuota` rejects pods missing resource requests, and the `LimitRange` supplies defaults.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `config.yaml`                  | The `ConfigMap` and `Secret` every service reads its environment from.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `databases.yaml`               | StatefulSets for every datastore the registry depends on: the shared Postgres (which mounts `infra/postgres/init-extensions.sql` and `init-roles.sh`, so the eight module login roles exist in-cluster), the dedicated marketplace Postgres, Redis, Kafka, MongoDB and Elasticsearch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `storage.yaml`                 | The four cloud StorageClasses (`fast-ssd`, `standard`, `high-performance`, `archive`), backed by the AWS EBS CSI driver.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `storage-local-dev.yaml`       | The same four StorageClass names, backed by the cluster's own dynamic provisioner — for Docker Desktop or `kind`. Apply exactly one of these two files; StorageClass fields are immutable, so switching means deleting the old classes first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `api-gateway.yaml`             | The gateway's Deployment, Service, HPA and PodDisruptionBudget.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `microservices-generated.yaml` | Every deployable except the gateway — 25 Nest services and the 9 Next zones, one Deployment and one Service each — generated by `scripts/registry/k8s.mjs` from [`services.yaml`](../../services.yaml). **Do not edit this file by hand**: `npm run registry:check` fails when it disagrees with the registry, and the pre-commit hook runs that check. Change the registry (ports, health routes, dependencies) or the renderer (manifest shape). It absorbed the hand-written `microservices.yaml`, which held a second copy of auth/order/payment. **Eight of the nine Next images cannot be built yet** — only `apps/web` sets `output: 'standalone'` (Task IN11) — so `deploy.sh` skips any Deployment whose image the local Docker daemon does not have, naming it, rather than leaving pods in `ErrImagePull`. |
| `ingress.yaml`                 | The `Ingress`, `ClusterIssuer`s, `ServiceMonitor`s and a `PrometheusRule`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `marketplace-hpa.yaml`         | A `HorizontalPodAutoscaler` for `marketplace-service`; requires `metrics-server`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `deploy.sh`                    | Applies all of the above in dependency order. See below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `utils.sh`                     | Day-to-day operational commands. See below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `gen-microservices.sh`         | A wrapper around `npm run registry:generate`, kept for muscle memory. It prints the resulting Service/Deployment/probe counts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Quick start (local, Docker Desktop)

1. Docker Desktop → Settings → Kubernetes → Enable Kubernetes (or
   `kind create cluster`).
2. `kubectl apply -f infra/k8s/namespace.yaml`
3. `kubectl apply -f infra/k8s/storage-local-dev.yaml` — the cloud
   `storage.yaml` cannot work on a laptop cluster. `deploy.sh` still tries it
   and now treats the rejection as a warning rather than aborting, but the
   local classes have to exist first or every database PVC sits `Pending`.
4. Build or load the images you need into the cluster's own Docker daemon
   (Docker Desktop shares it with `kubectl`) — see
   [`infra/docker/README.md`](../docker/README.md). Anything you do not build is
   skipped by name, not applied.
5. `npm run env:init` if the repository-root `.env` does not exist yet — that is
   where `deploy.sh` reads the credentials from (see **Secrets** below).
6. `./infra/k8s/deploy.sh dev`
7. `kubectl get pods -n kartseek` until everything reports `Running`.

## Secrets

`config.yaml` holds a `Secret` whose every value is empty. That is the point: it
is the list of credential NAMES the platform reads, so a missing one is a
visible gap rather than a service that boots and fails later. It used to hold
placeholder literals, which is a password published in tracked source.

**There is one way to fill it, and it is a script:**

```bash
./infra/k8s/deploy.sh dev
```

`deploy.sh` takes the names from `config.yaml`, the values from the
repository-root `.env` (and `apps/api/.env` for the integration keys), and
counts what it built. A name marked `# optional` in the template — the
third-party block: Razorpay, Stripe, AWS, SMTP, Twilio, Firebase, documented in
`apps/api/.env.example` — may be absent, and is named and skipped. Every other
name is the platform's own (the twelve the repository-root `.env.example`
documents, plus the eight module passwords) and its absence **stops the
deploy**, unless the cluster's existing Secret already carries it. Set
`SECRETS_ENV_FILE=<file>` to take the values from one file instead.

There is deliberately no copy-pasteable `kubectl create secret` here any more.
The one that used to be in `config.yaml`'s header lost its line continuations in
an edit; pasted, it created an **empty** `kartseek-secrets`, and the next deploy
found that Secret, left it untouched, and brought a cluster up on blank
credentials. A script cannot be half-pasted.

In production, use the [External Secrets Operator](https://external-secrets.io/)
and let it own the Secret's contents; `deploy.sh` will not overwrite a key an
external store has already filled.

## The Postgres init scripts

The shared Postgres StatefulSet mounts `infra/postgres/init-extensions.sql` and
`infra/postgres/init-roles.sh` — the same two files Compose mounts — so the
cluster gets the same eight module login roles (`grocery_user` and the rest),
each owning its own schema. They arrive as a ConfigMap built from the files,
not pasted into `databases.yaml` where a 250-line copy would drift:

```bash
kubectl create configmap kartseek-postgres-init \
  --from-file=infra/postgres/init-extensions.sql \
  --from-file=infra/postgres/init-roles.sh \
  --namespace=kartseek --dry-run=client -o yaml | kubectl apply -f -
```

`deploy.sh` does this before applying `databases.yaml`. Without it the Postgres
pod stays in `ContainerCreating` naming the missing ConfigMap.

Init scripts run **once**, when the data directory is first created. Against a
volume that already exists, run the roles script by hand — it is idempotent:

```bash
kubectl exec -n kartseek postgres-0 -- bash /docker-entrypoint-initdb.d/20-roles.sh
```

## `deploy.sh`

```bash
./infra/k8s/deploy.sh dev          # or: staging, production
KARTSEEK_TAG=2.1.0 ./infra/k8s/deploy.sh staging
SECRETS_ENV_FILE=/tmp/kartseek-secrets.env ./infra/k8s/deploy.sh dev
```

Applies, in order: the bare namespace, an image-pull secret, the `ConfigMap`
from `config.yaml`, the `Secret` (from `SECRETS_ENV_FILE`, or left alone if it
already exists), `namespace.yaml` (RBAC, NetworkPolicies, LimitRange,
ResourceQuota, PodDisruptionBudget), `storage.yaml`, the Postgres init-script
ConfigMap, the databases (waiting for each StatefulSet's rollout), the
generated microservices and `marketplace-hpa.yaml`, the API gateway, and
`ingress.yaml` if a `cert-manager` CRD is present.

Two environment variables change what it does: `KARTSEEK_TAG` (default `dev`)
is substituted into every `<image>:${KARTSEEK_TAG}` on the way to the cluster,
and `SECRETS_ENV_FILE` names the file the `Secret` is built from.

For `production` only, it refuses to continue while `JWT_SECRET`,
`ENCRYPTION_KEY` or `POSTGRES_PASSWORD` is empty in the cluster's Secret — the
gateway's own startup validation would reject the same values, and failing here
is faster than a `CrashLoopBackOff` that looks like a networking problem.

## `utils.sh`

```bash
./infra/k8s/utils.sh <command>
```

`logs`, `port-forward`, `scale`, `restart`, `status`, `resources`, `events`,
`shell`, `exec`, `test-db`, `test-redis`, `test-api`, `backup` and `cleanup`,
each scoped to `$NAMESPACE` (default `kartseek`). Run `./infra/k8s/utils.sh
help` for each command's arguments.

## Known constraints

Five things about this cluster are invisible until you actually run it, found
and fixed in infrastructure audits:

- **A `ResourceQuota` tracking `requests`/`limits` rejects any pod whose
  containers — including init containers — omit them.** Every init container the
  renderer emits now carries `resources`, and `k8s.test.mjs` asserts it; the
  `LimitRange` in `namespace.yaml` is the safety net for anything hand-written
  that forgets, and it must be applied before the quota takes effect.
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
  `--validate=strict` as "well-formed," not "will start." `kubectl apply
--dry-run=server -f infra/k8s/` is the stronger check — it runs admission as
  well as schema validation — and it is still not a rollout.
- **`runAsUser` is per image, not per platform.** The core-service image ends
  `USER node` (uid 1000); the gateway, module-service and Next images each add
  a user at uid 1001. Every manifest here said 1000, which for three of the
  four is a uid with no passwd entry and no ownership of anything the build
  chowned. `scripts/registry/k8s.mjs` derives it from the entry's kind and
  `k8s.test.mjs` asserts it.
- **A probe is only as honest as the route it asks for.** `tcpSocket` passes
  the moment Nest binds, so a pod whose database is gone stays in its Service's
  endpoint list; a bare `/health` is a 404 behind the gateway's global prefix,
  so the probe never passes at all. Probe paths come from `services.yaml`.
