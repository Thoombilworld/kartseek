# infra/docker/

Dockerfiles for the platform's deployable services, and the Compose stack
used for local infrastructure. This is for anyone building a `kartseek/*`
image or running the local Postgres/Redis/Kafka/Elasticsearch stack outside
of `npm run infra:up`'s defaults.

## The three Dockerfiles

Each is built from the **repository root**, not from `infra/docker/` or the
workspace it packages — the repository has one lockfile, at the root,
installed through npm workspaces, and the rspack builder's own dependencies
are declared in the root manifest. A build scoped to a single workspace
directory cannot run `npm ci` or `nest build` at all.

| Dockerfile                       | Build command                                                                                                          | Produces                                                                                                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `core-service.Dockerfile`        | `docker build -f infra/docker/core-service.Dockerfile --build-arg APP=order-service -t kartseek/order-service:2.0.0 .` | Any of the 17 `apps/api` core services, selected by `--build-arg APP=<nestProject>`.                                                                                                                                                 |
| `api-gateway.Dockerfile`         | `docker build -f infra/docker/api-gateway.Dockerfile -t kartseek/api-gateway:2.0.0 .`                                  | The API gateway.                                                                                                                                                                                                                     |
| `marketplace-service.Dockerfile` | `docker build -f infra/docker/marketplace-service.Dockerfile -t kartseek/marketplace-service:2.0.0 .`                  | The marketplace module service — the one module image that exists today. It builds against `apps/api/libs` through the shared rspack config, so its builder stage needs both the `apps/api` and `modules/marketplace/backend` trees. |

Read each Dockerfile's own header comment for the full reasoning; the table
above is a summary.

## `compose.infra.yml`

The local infrastructure stack: Postgres (one shared instance plus, under a
profile, one dedicated instance per module), Redis, Kafka, MongoDB,
Elasticsearch, nginx, and optional GUI tools. Profiles:

- **`isolated`** — brings up a dedicated Postgres per module
  (marketplace, grocery, restaurant, pharmacy, doctor, hotel, taxi,
  franchise) instead of everything sharing the platform database. Nine
  Postgres containers in total; expect roughly 1–2 GB of memory for the
  databases alone.
- **`marketplace-isolated`** — the marketplace database only, a subset of
  `isolated` for anyone working on just that module.
- **`tools`** — pgAdmin, Redis Insight and Kibana, none of which the
  platform needs to run.

The default `docker compose up` (via `npm run infra:up`) starts none of
these; every module falls back to the shared Postgres instance, which is the
lighter way to work on one module at a time.

## The root `docker-compose.yml`

The root `docker-compose.yml` pulls in `compose.infra.yml` (and only that
file today) with Compose's `include:`. Its own header comment already names
what joins it later: `compose.observability.yml` (Prometheus and Grafana,
under a `monitoring` profile, phase 2) and `compose.services.yml` (one
service per deployable in the registry, generated, phase 3). See
[the platform reorganization design](../../docs/superpowers/specs/2026-09-05-platform-reorganization-design.md)
for both.

## `.dockerignore`

One `.dockerignore` at the repository root
([`../../.dockerignore`](../../.dockerignore)) serves all three Dockerfiles
above — there is no second one anywhere else in the repository.
