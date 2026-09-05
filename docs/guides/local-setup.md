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
never edit `package-lock.json` by hand.

## Environment

Two files are copied before anything else:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Each of the eight module backends (`modules/<vertical>/backend/`) also ships
its own `.env.example`, for when you run that module outside the default
setup — copy it the same way if you need it.

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

Two more Compose profiles exist for later, opt-in work: `isolated` starts a
dedicated Postgres instance per module (see
[`database-migrations.md`](database-migrations.md)), and `tools` starts
pgAdmin, RedisInsight, and Kibana. Neither is needed for a first run —
`npm run infra:tools` starts the `tools` profile if you want them.

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
npm run build
npm run smoke
```

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

A checkout that has been built and run for a while accumulates files git
already ignores and that are safe to delete whenever you want the disk space
back: `*.log` files, a stray `nuget.exe`, `build/` output, and a `Users/`
directory that a misconfigured tool can create at the repository root. None of
it is source; removing it changes nothing about the working tree.
