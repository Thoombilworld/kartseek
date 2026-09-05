# infra/

Everything needed to run KARTSEEK outside of `npm run dev`: local container
infrastructure, Kubernetes manifests for a real cluster, the reverse proxy in
front of the shell and the gateway, and the one-time Postgres setup every
service database needs.

## `docker/`

Dockerfiles for the platform's deployable services, the local infrastructure
Compose file (Postgres, Redis, Kafka, MongoDB, Elasticsearch, nginx, and
optional GUI tools), and the root `docker-compose.yml` that includes it. See
[`docker/README.md`](docker/README.md) for the exact build command for each
image and what each Compose profile brings up.

## `k8s/`

Kubernetes manifests for the namespace, config, databases, storage, the API
gateway, every microservice, ingress and autoscaling, plus the deploy and
utility scripts. See [`k8s/README.md`](k8s/README.md).

## `nginx/`

The reverse proxy that fronts the API gateway and the Next.js shell with
HTTP/2 and TLS termination (`nginx.conf`, `conf.d/default.conf`). For local
development, generate a self-signed certificate into `nginx/ssl/` with:

```bash
npm run nginx:certs
```

## `postgres/`

`init-extensions.sql` — the Postgres extensions every service database needs
(`uuid-ossp` for `@PrimaryGeneratedColumn('uuid')`, `pg_trgm` for the
trigram indexes behind the catalogue's `ILIKE` search). It is mounted into
each Postgres container's `docker-entrypoint-initdb.d`, so it only runs once,
when a data directory is first created — a database created before this file
existed needs the same statements applied by hand, which is what
`scripts/split-databases.ts` does when it provisions a new target.

## What is still to come

Docker images for every deployable and a generated `compose.services.yml`
arrive in phase 3; a Prometheus/Grafana stack under `infra/observability/`
and a `monitoring` Compose profile arrive in phase 2. See
[the platform reorganization design](../docs/superpowers/specs/2026-09-05-platform-reorganization-design.md)
for both.
