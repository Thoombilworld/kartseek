# infra/docker/

Dockerfiles for the platform's deployable services, and the Compose stack
used for local infrastructure. This is for anyone building a `kartseek/*`
image or running the local Postgres/Redis/Kafka/Elasticsearch stack outside
of `npm run infra:up`'s defaults.

## The four Dockerfiles

Each is built from the **repository root**, not from `infra/docker/` or the
workspace it packages — the repository has one lockfile, at the root,
installed through npm workspaces, and the rspack builder's own dependencies
are declared in the root manifest. A build scoped to a single workspace
directory cannot run `npm ci` or `nest build` at all.

| Dockerfile                  | Build command                                                                                                                                | Produces                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `api-gateway.Dockerfile`    | `docker build -f infra/docker/api-gateway.Dockerfile -t kartseek/api-gateway:2.0.0 .`                                                        | The API gateway.                                                                                 |
| `core-service.Dockerfile`   | `docker build -f infra/docker/core-service.Dockerfile --build-arg APP=order-service --build-arg PORT=3014 -t kartseek/order-service:2.0.0 .` | Any of the 17 `apps/api` core services, selected by `--build-arg APP=<nestProject>`.             |
| `module-service.Dockerfile` | `docker build -f infra/docker/module-service.Dockerfile --build-arg APP=grocery --build-arg PORT=3018 -t kartseek/grocery-service:2.0.0 .`   | Any of the 8 module backends, selected by `--build-arg APP=<module>`.                            |
| `nextjs.Dockerfile`         | `docker build -f infra/docker/nextjs.Dockerfile --build-arg WORKSPACE_DIR=apps/web --build-arg PORT=3000 -t kartseek/web:2.0.0 .`            | Any Next workspace: the web shell, or a module zone (add `--build-arg HEALTH_PATH=<basePath>/`). |

Read each Dockerfile's own header comment for the full reasoning; the table
above is a summary.

### `--build-arg PORT` is not optional

`PORT` is not the port the service binds — every core service reads its own
`<SVC>_SERVICE_PORT`, every module backend its `<MODULE>_SERVICE_PORT` — it is
the port the image's `HEALTHCHECK` probes, and it has to be told.

`core-service.Dockerfile` used to fall back to `process.env.PORT || 3000`,
which nothing sets, so every image built from it reported `unhealthy` for ever
regardless of how well the service was running; an orchestrator that restarts
on a failed check would never have let one stay up (AUD2-020).
`marketplace-service.Dockerfile` had the port right but only because it was
hard-coded to the one module it built.

There is deliberately **no default**, so a build that forgets the argument
fails at `EXPOSE` — louder than an image that is quietly never healthy. Pass
`--build-arg HEALTH_PATH=<path>` too wherever `/health` is not the right path:
a Next module zone serves under its own `basePath`, so `/` on one is a 404.

`module-service.Dockerfile` replaced `marketplace-service.Dockerfile`, which
hard-coded a single module and baked its three transport ports as `ENV`. The
ports now come from Compose and Kubernetes, which is where they are declared.

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

Each role **owns** its own schema and everything already in it — tables,
sequences and views — and gets `ALL` by default on whatever it creates later.
Ownership rather than grants, because `ALTER TABLE`, `DROP TABLE` and
`CREATE INDEX` are owner-only: a role holding every grant PostgreSQL can
express still cannot run a migration against a table `postgres` owns. The
transfer runs over `pg_tables` / `pg_sequences` / `pg_views` and is idempotent,
so re-run the script after anything adds objects to a module schema as another
role (a `migration:run` executed as `postgres`, a seed script).

It gets nothing on another module's schema and no `CREATE` on `public`, where
`users`, `orders` and the gateway's own tables live — so a module cannot create
a table there that shadows one of them.

Two things sit outside the schema and are deliberate:

- **`CREATE` on the database.** Every module's initial migration opens with
  `CREATE SCHEMA IF NOT EXISTS "<module>"`, and PostgreSQL checks the CREATE
  privilege on the database _before_ it checks whether the schema exists — so
  that statement fails with `permission denied for database kartseek_db` for a
  role without it, even though the script has already created the schema and
  the statement would do nothing. Without this grant a module role cannot run
  `migration:run` at all. What it actually permits is creating _new_ schemas;
  it confers nothing on any schema that already exists, and `CREATE SCHEMA` on
  a name already taken is an error, so it is not a route to another module's
  data.
- **The migration ledger**, `public.<module>_migrations`. IN3 put it there
  because TypeORM builds the ledger before the first migration's `up()` runs
  and a schema that does not exist yet cannot hold it. The role has no `CREATE`
  on `public`, so TypeORM cannot create it — the script creates it instead,
  with the three columns TypeORM's Postgres driver expects, and hands it to the
  role. That removes what used to be a superuser bootstrap step: a module role
  can now build its whole schema from empty and record that it did.

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

The eight module backends now connect as these roles — see
[`docs/guides/local-setup.md`](../../docs/guides/local-setup.md), "Moving a
module onto its own database role", for the per-module procedure and what to
check after each one.

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
