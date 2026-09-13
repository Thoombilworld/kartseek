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

### Per-module database roles

Two init scripts are mounted into the shared `postgres` service, and the
entrypoint runs them in name order when the data directory is first created:

| Mounted as          | Source                               | What it does                                                   |
| ------------------- | ------------------------------------ | -------------------------------------------------------------- |
| `10-extensions.sql` | `infra/postgres/init-extensions.sql` | `uuid-ossp`, `pg_trgm`, `postgis` in `POSTGRES_DB`.            |
| `20-roles.sh`       | `infra/postgres/init-roles.sh`       | One login role per module, with rights to its own schema only. |

`20-roles.sh` reads the eight `<MODULE>_DB_USER` / `<MODULE>_DB_PASSWORD`
pairs the root `.env` already defines for the `isolated` profile — the same
credential for a module whether it has its own instance or a schema in the
shared one. **It exits non-zero, naming the variable, if any of the eight
passwords is unset**, so the container fails to start rather than creating a
role with a password anyone could guess. It also creates the three extensions
in every database it touches, because IN3's initial migrations open with
`CREATE EXTENSION IF NOT EXISTS` and that needs superuser — doing it here once
means a module role never does.

Each role gets `USAGE, CREATE` on its own schema and `ALL` on that schema's
tables and sequences (including, by default privileges, ones it creates later).
It gets nothing on another module's schema and no `CREATE` on `public`, where
`users`, `orders` and the gateway's own tables live — so a module cannot create
a table there that shadows one of them.

The one exception is the module's own migration ledger. IN3 put it at
`public.<module>_migrations` (TypeORM builds the ledger before the first
migration runs, and a schema that does not exist yet cannot hold it), so the
script grants the role `ALL` on that table and its sequence — **where the table
already exists**. Without it `migration:run` would build the whole schema and
then fail to record that it had, and re-run everything on the next deploy.
Because the role has no `CREATE` on `public`, the first migration run against a
genuinely empty database is still a superuser job; run it as `postgres` once,
then re-run this script to pick up the ledger grant.

**Init scripts run only on an empty data directory.** An existing volume — any
machine that ran `npm run infra:up` before this file existed — needs it applying
by hand, once. The script is mounted, not copied, so it is the same file:

```bash
# From the repository root, with the eight passwords set in .env
docker compose -f infra/docker/compose.infra.yml up -d postgres   # picks up the mount + env
docker compose -f infra/docker/compose.infra.yml exec postgres bash /docker-entrypoint-initdb.d/20-roles.sh

# Or, without recreating the container, pipe the same file in with the
# variables the script reads (bash/zsh; `set -a` exports what .env defines):
set -a; . ./.env; set +a
env_flags=$(for m in MARKETPLACE GROCERY RESTAURANT PHARMACY DOCTOR HOTEL TAXI FRANCHISE; do
  printf -- '-e %s_DB_USER -e %s_DB_PASSWORD -e %s_DB_NAME ' "$m" "$m" "$m"
done)
docker exec -i $env_flags kartseek-postgres bash -s < infra/postgres/init-roles.sh

# Eight roles
docker exec kartseek-postgres psql -U postgres -d kartseek_db -c '\du' | grep _user
```

Re-running is safe: every statement is idempotent, and `ALTER ROLE … PASSWORD`
is unconditional, so a password changed in `.env` is rotated in the database by
running the script again.

Nothing connects as these roles yet — the services still use `DB_USER`. Moving
a service onto its own role is one `<MODULE>_DB_USER` change at a time, with
that module's suite run after each, and is tracked as IN5.

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
