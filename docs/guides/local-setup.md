# Local setup

This guide takes a fresh checkout of KARTSEEK to a running platform on your own
machine: what to install, how to configure it, how to start it, and how to
confirm it actually came up. It is for anyone doing their first checkout —
backend, web, or mobile — and links out to the guides that cover what comes
after (running services day to day, testing, and troubleshooting).

## Prerequisites

- **Node.js** — `.nvmrc` pins `26.5.0`; run `nvm use` from the repository root
  to pick it up. `package.json`'s `engines` field allows anything `>=25`, so a
  Node 25 install works too, but `26.5.0` via `.nvmrc` is the version this repo
  is actually developed and verified against.
- **npm** `>= 10`. The installed `packageManager` is npm 11; anything 10 or
  newer resolves the workspace the same way.
- **Docker Desktop** with Compose v2.20 or newer (`docker compose version`),
  for Postgres, Redis, Kafka, MongoDB, and Elasticsearch.
- **Git.**
- **Mobile only** — Flutter 3.44 with Dart 3.12, for the three apps under
  `apps/customer`, `apps/partner`, and `apps/seller`.

**Windows note.** If your Windows username contains spaces (for example
`Hp EliteBook`), every path under your profile does too — always wrap them in
quotes. Commands below are shown for Git Bash; where a command only works in
PowerShell (or only in Git Bash) it says so.

## Clone and install

```bash
git clone <repository-url> KARTSEEKAPP
cd KARTSEEKAPP
npm ci
```

Run `npm ci` **once, from the repository root, and nowhere else.** The whole
tree is one npm workspace with one lockfile (`package.json`'s `workspaces`
lists `apps/web`, `apps/api`, and every `modules/*/backend` and
`modules/*/frontend`). Running `npm install` inside `apps/api` or a module
directory creates a second, nested `node_modules` that npm's own workspace
resolution does not see — those copies go stale silently and are a recurring
source of "it works from the root but not here" bugs. If you ever suspect a
workspace has a stray nested install, delete it and reinstall from the root;
never edit `package-lock.json` by hand. The install also runs husky, which
installs the commit hooks described in [`conventions.md`](conventions.md#commits).

## Environment

Two files come before anything else:

```bash
npm run env:init                          # root .env, with every secret generated
cp apps/api/.env.example apps/api/.env    # then set DB_PASSWORD, see below
```

**Do not `cp .env.example .env`.** Every secret in that file is deliberately
empty, so a straight copy produces a `.env` that Compose refuses — which is the
point. It used to ship a literal placeholder password for `POSTGRES_PASSWORD`
and thirteen more like it, and because `${VAR:?…}` only fires on a value that is
unset or empty — never on a placeholder — the documented first run brought the
whole stack up on a password published in tracked source (AUD2-022).

`npm run env:init` (`scripts/env/generate-secrets.mjs`) copies the example and
fills each empty secret with 24 random bytes as hex. It **refuses to overwrite
an existing `.env`** — Postgres bakes its superuser password into the data
directory at first init, so silently rotating that file would leave a running
stack unable to authenticate against its own volumes. To start over, delete or
rename `.env` yourself and run it again.

Then open `apps/api/.env` and set `DB_PASSWORD` to the `POSTGRES_PASSWORD` that
`env:init` generated in the root `.env`. Those two files must agree and nothing
checks that they do — this is the one value you copy by hand.

Each of the eight module backends (`modules/<vertical>/backend/`) also ships
its own `.env.example`. Those now point at the **shared** Postgres — port
5432, database `kartseek_db`, the module's own login role — because that is
what `npm run infra:up` actually starts. They used to default to the module's
dedicated instance on 5433–5440, which the default profile does **not** start,
so a fresh clone's first boot failed with `ECONNREFUSED` on a port nothing was
listening on (AUD2-021). The dedicated-instance values are still there,
commented out, at the end of each file's database block.

If you already have `modules/<vertical>/backend/.env` files of your own they
are untouched by any of this — they are yours, and untracked. See "Moving a
module onto its own database role" below for what to change in them.

Who reads which file matters, because it is not "everyone reads the same
`.env`":

- **`docker compose`** interpolates variables from the **root `.env` only**.
  It never reads `apps/api/.env`. This is why the two files both carry
  `DB_PASSWORD`/`REDIS_PASSWORD`-shaped values — they have to agree, and
  nothing enforces that automatically.
- **Every Nest service** loads its `.env` from its own working directory:
  `apps/api/.env` for the gateway and the 17 core services that live in
  `apps/api/apps/`, and `modules/<vertical>/backend/.env` for a module
  backend. Each module backend's root module also lists
  `apps/api/.env` as a fallback in its `envFilePath` array (see
  `ConfigModule.forRoot({ envFilePath: [...] })` in each `*.module.ts`), so a
  module that has no `.env` of its own still picks up the shared one.
- **The web shell** (`apps/web`) reads `apps/web/.env.local`, which is not
  copied from an example file by default — create it if you need to override
  the Next.js defaults.

## Infrastructure

```bash
npm run infra:up
```

This runs `docker compose up -d` against the root `docker-compose.yml` (which
`include:`s `infra/docker/compose.infra.yml`) and then `npm run kafka:topics`
automatically — you do not need to run the topic provisioner separately. The
default profile brings up:

- Postgres on 5432 (the shared `kartseek_db`)
- Redis on 6379
- Kafka on 9092, plus Kafka UI on 8080
- MongoDB on 27017
- Elasticsearch

Three more Compose profiles exist for later, opt-in work: `isolated` starts a
dedicated Postgres instance per module (see
[`database-migrations.md`](database-migrations.md)); `marketplace-isolated`
is the narrower version of that, bringing up only the marketplace module's
own Postgres instance; and `tools` starts pgAdmin, RedisInsight, and Kibana.
None is needed for a first run — `npm run infra:tools` starts the `tools`
profile if you want them. **`npm run infra:up` does not start the isolated
instances**, which is why the module `.env.example` files point at the shared
one.

Every datastore port above publishes on `127.0.0.1` by default, not on all
interfaces (`DB_BIND` in the root `.env`, AUD2-140). The gateway in front of
them may be running with `DEV_AUTH_BYPASS=true`, which treats an anonymous
caller as a super-admin, so these are not ports to expose to a network by
accident. Set `DB_BIND=0.0.0.0` if another machine genuinely needs them, and
set it back afterwards.

Elasticsearch requires authentication. `ELASTIC_PASSWORD` from the root `.env`
bootstraps the built-in `elastic` user the first time the cluster starts;
search-service needs it too, as `ELASTICSEARCH_NODE` in `apps/api/.env`:

```dotenv
ELASTICSEARCH_NODE=http://elastic:<ELASTIC_PASSWORD>@localhost:9200
```

Kibana (the `tools` profile) cannot log in as `elastic` — it refuses that
account — so it uses `kibana_system`, whose password has to be set once
through the API after the cluster is up. The command is in `.env.example`
beside `KIBANA_SYSTEM_PASSWORD`.

## Moving a module onto its own database role

Every service used to connect to Postgres as the cluster superuser, so one
compromised service meant read and write on all 25 schemas — plus
`COPY … FROM PROGRAM`, which is shell access on the database host (AUD2-073).
`infra/postgres/init-roles.sh` creates one login role per module schema, and
the eight module backends now connect as those roles rather than as `postgres`.

The whole change, per module, is four lines in
`modules/<vertical>/backend/.env`:

```dotenv
TAXI_DB_HOST=127.0.0.1
TAXI_DB_PORT=5432
TAXI_DB_NAME=kartseek_db
TAXI_DB_USER=taxi_user
TAXI_DB_PASSWORD=<the TAXI_DB_PASSWORD from the repository-root .env>
```

One credential per module, valid in either topology: the same pair is the
dedicated instance's own superuser under the `isolated` profile, so moving a
module between the two does not change what it presents.

Do them **one at a time**. Step 0 applies to the cluster once, not per module,
and skipping it makes step 2 fail immediately:

```bash
# 0. ONCE per cluster. Any Postgres whose roles were created before this
#    existed has no CREATE on the database and no migration ledger, so
#    `migration:run` as a module role fails on the first statement. The script
#    is idempotent; the docker exec one-liner is in infra/docker/README.md.
set -a; . ./.env; set +a
docker exec -i $env_flags kartseek-postgres bash -s < infra/postgres/init-roles.sh

# 1-4, per module:
cd modules/taxi/backend
npm run migration:run     # builds the schema as the module's own role
npm run build && npm test
node dist/main.js         # then read one route that reaches this service
```

The order matters. Start with a module that references no schema but its own —
`taxi`, `doctor` and `hotel` reach nothing outside theirs; `marketplace` and
`franchise` have the most cross-schema references and should be last, since
they may need explicit grants rather than a plain flip.

### `public` is closed to `PUBLIC`

The roles script ends with `REVOKE ALL ON SCHEMA public FROM PUBLIC`, on the
shared database and on each dedicated one. PostgreSQL grants every role USAGE on
`public` by default and no per-role `REVOKE` takes it away, so without this the
per-module isolation has a hole in it: any login role could traverse the schema
holding `users`, `orders` and the gateway's own tables.

**This is a cluster-wide change, and it is safe today for one reason only: all
26 services still connect as `postgres`, and a superuser bypasses permission
checks entirely.** The eight module roles are named explicitly — `grant_in()`
gives each one `GRANT USAGE ON SCHEMA public` _before_ the revoke runs, which is
what keeps its migration ledger at `public.<module>_migrations` reachable.

So: **any non-superuser role added later starts with no access to `public` at
all** and needs an explicit `GRANT USAGE ON SCHEMA public`, plus grants on
whatever tables it is meant to read. That includes the obvious next step of this
work — moving the core services off `DB_USER=postgres` onto roles of their own.
If one of those comes up unable to see `users`, this is why.

### If the role cannot do something

Re-run `infra/postgres/init-roles.sh` (the one-liner is in
[`infra/docker/README.md`](../../infra/docker/README.md)) before assuming the
role is wrong. It is idempotent, and it is what grants the role ownership of
objects that appeared in its schema afterwards — a `migration:run` executed as
`postgres`, or a seed script. Grants alone are not enough there: `ALTER TABLE`,
`DROP TABLE` and `CREATE INDEX` are owner-only, so a role with every grant
PostgreSQL can express still cannot run a migration against a table `postgres`
owns, and the failure does not appear until the first migration that changes a
column.

## Run

The simplest path is everything through Turborepo:

```bash
npm run dev
```

Or start pieces separately — the API gateway plus its 17 core services with
`npm run dev:api`, the web shell with `npm run dev:web`, and any one zone
directly (see [`running-services.md`](running-services.md) for the full list
of `dev:*`/`start:*` commands and what each one starts).

Once things are up (these are the shell's and gateway's default ports; if
yours differ, `services.yaml` is the source of truth — see
[`running-services.md`](running-services.md#ports)):

- The web shell: `http://localhost:3000`
- The API gateway's health route: `http://localhost:3001/api/v1/health`
- Swagger: `http://localhost:3001/api/docs`

## Verify

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 API_URL=http://localhost:3001/api/v1 NEXT_PUBLIC_WS_URL=ws://localhost:3001 npm run build
npm run smoke
```

The three variables are what five of the zones read while prerendering; a
production build without them fails fast on purpose (see
[`testing.md`](testing.md#build)).
`npm run smoke` (`tests/smoke/boot-all.mjs`) starts every Nest deployable from
its **built** output — hence the `npm run build` first, this script does not
compile anything itself — and polls each one's registry-declared health route
until it answers 200 or a service-specific timeout elapses. A service with no
HTTP health route yet passes on a plain TCP connect instead, which is what the
Kubernetes probes do for it today. A healthy run ends with a table of every
service, its port, which route (or "(tcp connect)") was probed, the result,
and how long it took, followed by a summary line like `26/26 healthy`. Any
failure exits non-zero and points you at that service's log under
`tests/smoke/logs/`.

## Mobile

Each Flutter app is its own directory under `apps/`:

```bash
cd apps/customer && flutter pub get && flutter run
```

The same two commands work for `apps/partner` and `apps/seller`. See
[`docs/architecture/mobile.md`](../architecture/mobile.md) for how the mobile
apps talk to the platform.

## Where next

- [`running-services.md`](running-services.md) — every way to start the
  platform, the port registry, zones, and the dev-only flags.
- [`testing.md`](testing.md) — unit, integration, end-to-end, contract, smoke,
  and Postman testing.
- [`troubleshooting.md`](troubleshooting.md) — known traps and how to get past
  them.

## Untracked clutter

A checkout that has been built and run for a while accumulates output git
already ignores. `npm run clean` removes the build output and the Turbo cache
(`.turbo/cache` alone reached 33 GB once); `*.log` files at the root and the
Flutter `build/` and `.dart_tool/` directories can be deleted by hand whenever
you want the disk back. None of it is source. One thing not to delete:
`DockerDesktopWSL/` inside the repository is Docker Desktop's own data disk if
it was ever pointed there; move it from Docker Desktop → Settings → Resources
→ Advanced → Disk image location rather than removing it.
