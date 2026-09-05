# Phase 1C — Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every README in the repository describes the tree as it is after plans 1A and 1B, a new developer can go from clone to a running platform by following the root README alone, and the architecture documents describe the running system rather than the original brief.

**Architecture:** Docs are split by audience (spec D7): `docs/guides/` for tasks, `docs/architecture/` for how it is built, `docs/adr/` for why, `docs/product/` for what it must do, `docs/audits/` and `docs/archive/` for history. Operational READMEs sit next to what they operate. Port tables are never typed by hand: they are the `<!-- registry:start -->…<!-- registry:end -->` block that `npm run registry:generate` (plan 1B) fills from `services.yaml`. A link checker keeps every relative link true. Spec: sections 5.5 and 5.6.

**Tech Stack:** Markdown, Mermaid (rendered by GitHub), Node 26 for the link checker, `node --test` for its tests.

## Global Constraints

- Plans 1A and 1B are complete before this one starts: all paths below are the post-1A paths and `npm run registry:generate` exists.
- Facts in documents come from the repository, not from memory. Where a task says "from `<file>`", read that file and transcribe; do not paraphrase numbers.
- Never hand-write a port number in prose. Put a registry block in the document and run the generator.
- Every relative Markdown link must resolve; `node scripts/docs/check-links.mjs` is part of the gate (Task 10). Historical documents under `docs/audits/` and `docs/archive/` are checked too, but their *content* is not edited beyond link repair.
- Line length: wrap prose at 80–100 columns; run `npx prettier --write` on every Markdown file you create or edit before committing (the repo's `format` script formats Markdown; do not commit files it would rewrite).
- One commit per task, Conventional Commits `docs:` type, footer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Documents are written for a competent developer who has never seen this repository. Every document opens with one paragraph saying what it covers and who it is for.

---

## File map

| Create | Modify | Delete |
|---|---|---|
| `docs/README.md`; `docs/adr/0001…0005`; `docs/guides/{running-services,testing,database-migrations,seeding,troubleshooting,conventions}.md`; `docs/architecture/{data-ownership,messaging,frontend-zones,security}.md`; `apps/api/README.md`, `apps/web/README.md`, `apps/mcp-server/README.md`, `apps/customer/README.md`, `apps/partner/README.md`; `modules/README.md` + 16 module READMEs; `packages/{shared-core,shared-ui,shared-mobile}/README.md`; `infra/README.md`; `tests/README.md`; `scripts/docs/check-links.mjs` + test | root `README.md`, `ARCHITECTURE.md`; `docs/guides/{local-setup,secrets}.md`; `docs/architecture/mobile.md`; `docs/archive/README.md`; `apps/api/docs/{architecture,runbook}.md`; `apps/seller/README.md`; `infra/k8s/README.md`; `tests/postman/README.md`; `scripts/README.md`; root `package.json` (`docs:check-links` script) | `infra/k8s/QUICKSTART.md` (merged into the README) |

---

### Task 1: The docs index and the ADR scaffold

**Files:**
- Create: `docs/README.md`, `docs/adr/README.md`, `docs/adr/0001-record-architecture-decisions.md`

**Interfaces:**
- Produces: the ADR template every later ADR follows (sections: Status, Context, Decision, Consequences).

- [ ] **Step 1: Write `docs/README.md`**

```markdown
# KARTSEEK documentation

Start with the [root README](../README.md) for setup and
[ARCHITECTURE.md](../ARCHITECTURE.md) for the shape of the system. This folder
holds everything else, split by what you are trying to do.

| Folder | Read it when you want to… |
| --- | --- |
| [`guides/`](guides/) | do a task: run services, test, migrate a database, seed data, handle secrets, fix a broken local setup, follow the conventions |
| [`architecture/`](architecture/) | understand how a part of the system is built: the service list, data ownership, messaging, the frontend zones, mobile, security |
| [`adr/`](adr/) | know why a decision was made (Architecture Decision Records) |
| [`product/`](product/) | know what the product must do — the specification the platform is built against |
| [`audits/`](audits/) | read a dated finding from an earlier review; history, not current state |
| [`archive/`](archive/) | read superseded material kept for its reasoning |
| [`superpowers/`](superpowers/) | read the design specs and implementation plans behind larger changes |

## Guides

- [Local setup](guides/local-setup.md) — clone to running platform
- [Running services](guides/running-services.md) — which command starts what, ports, `SKIP_DB`
- [Testing](guides/testing.md) — unit, integration, e2e, Postman, the smoke test
- [Database migrations](guides/database-migrations.md)
- [Seeding](guides/seeding.md)
- [Secrets](guides/secrets.md)
- [Troubleshooting](guides/troubleshooting.md)
- [Conventions](guides/conventions.md) — naming, layout, commits, where new code goes

## Architecture

- [Services](architecture/services.md) — generated from `services.yaml`
- [Data ownership](architecture/data-ownership.md)
- [Messaging](architecture/messaging.md)
- [Frontend zones](architecture/frontend-zones.md)
- [Mobile](architecture/mobile.md)
- [Security](architecture/security.md)

## Decisions

See [adr/](adr/README.md) for the index.
```

- [ ] **Step 2: Write the ADR index and the first ADR**

`docs/adr/README.md`:

```markdown
# Architecture Decision Records

One file per decision, numbered, never edited after acceptance except to
change its status (superseded, deprecated) with a link to the successor.
Template: [0001](0001-record-architecture-decisions.md) is written in it.

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-nest-monorepo-on-rspack.md) | One Nest monorepo built with rspack | Accepted |
| [0003](0003-vitest-for-backend-tests.md) | Vitest for the backend test suites | Accepted |
| [0004](0004-next-multi-zone-frontends.md) | One Next.js zone per vertical | Accepted |
| [0005](0005-service-registry.md) | A service registry drives ports, manifests and docs | Accepted |
```

`docs/adr/0001-record-architecture-decisions.md`:

```markdown
# 0001 — Record architecture decisions

**Status:** Accepted, 2026-09-05

## Context

This repository has 35 deployables built by many hands over several months.
The reasoning behind its structural choices lived in commit messages, code
comments and audit reports, none of which a new developer finds first. Several
choices (the builder, the test runner, the zone model) were made after a
painful failure that is worth not repeating.

## Decision

Record every architecture-level decision as an ADR in this folder, using this
file's structure: Status, Context, Decision, Consequences. Number them
sequentially. Write one when a choice constrains future work, is expensive to
reverse, or was made after a failure that must not recur.

## Consequences

Decisions become discoverable and reviewable. The cost is one short document
per decision, written when the decision is made rather than reconstructed
later.
```

- [ ] **Step 3: Verify and commit**

Run: `npx prettier --write docs/README.md docs/adr/*.md && ls docs/adr`
Expected: two files listed.

```bash
git add docs/README.md docs/adr && git commit -q -m "docs: add the docs index and the ADR scaffold

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: ADRs 0002–0005

**Files:**
- Create: `docs/adr/0002-nest-monorepo-on-rspack.md`, `docs/adr/0003-vitest-for-backend-tests.md`, `docs/adr/0004-next-multi-zone-frontends.md`, `docs/adr/0005-service-registry.md`

Sources to read before writing (transcribe their reasoning; do not invent):
- 0002: `apps/api/rspack.config.js` header comment; `apps/api/nest-cli.json` `compilerOptions`; root `package.json` `_comment_*` keys; commit `fff5a06` and `284878a` messages (`git show -s --format=%B fff5a06 284878a`).
- 0003: `apps/api/test/vitest-backend.mts` header comments; `apps/api/test/vitest-setup.ts`; commit `a741037`.
- 0004: `modules/grocery/frontend/next.config.mjs` header comment; `apps/web/next.config.mjs` `rewrites()` comments; `packages/shared-ui/src/zone-link.tsx`.
- 0005: the spec, section 5.4, and `services.yaml`.

- [ ] **Step 1: Write 0002**

Structure (fill Context and Consequences from the sources above; the Decision text is fixed):

```markdown
# 0002 — One Nest monorepo built with rspack

**Status:** Accepted, 2026-09-05 (records a decision made 2026-08)

## Context
<from sources: webpack builder limits, TypeScript 6 dropping baseUrl, the three
runtime faults the migration surfaced — dual @nestjs/core through
nodeExternals, TDZ on circular entities, the legacy nest-cli key — and why
`nest build` of all 26 projects is the acceptance test>

## Decision
All 18 core services and the 8 module backends compile with the Nest CLI's
rspack builder through the single `apps/api/rspack.config.js`. `@app/*`
resolves through explicit `paths` and the `appLibs` alias list in that file;
no `baseUrl`. Entity lists are explicit arrays, never globs, because a bundled
`main.js` has no `__dirname` tree to glob.

## Consequences
<from sources: faster builds; every new shared library must be registered in
five places (nest-cli.json, apps/api tsconfig paths, rspack appLibs, the eight
module tsconfigs, the Vitest alias map); a build that passes can still fail at
boot, so the smoke test in tests/smoke is part of the gate>
```

- [ ] **Step 2: Write 0003**

Decision text: "Backend suites run under Vitest through the shared factory in `apps/api/test/vitest-backend.mts`; Jest remains for the Next.js workspaces. `globalThis.jest = vi` is a migration shim to be deleted once specs use `vi` directly." Context and Consequences from the sources.

- [ ] **Step 3: Write 0004**

Decision text: "Each vertical's customer-facing frontend is its own Next.js application with `basePath: '/<vertical>'`, built and deployed independently; the shell at `apps/web` rewrites `/<vertical>/*` and `/<vertical>/_next/*` to it. Cross-zone links go through `<ZoneLink>` in `packages/shared-ui`, never through `next/link` with a raw path; same-zone links built from the shared route helpers pass through `zoneHref()` in `packages/shared-core`, which strips the zone’s own basePath." Context: the extraction from a single app, the `_next` asset 404 without basePath, the image-config failure. Consequences: nine deployables, shared code only through `packages/`, every zone needs its own image config.

- [ ] **Step 4: Write 0005**

```markdown
# 0005 — A service registry drives ports, manifests and docs

**Status:** Accepted, 2026-09-05

## Context

On 2026-09-05 the platform's ports were declared in five places: each
service's `main.ts` defaults, `apps/api/.env.example`, `infra/k8s/config.yaml`,
the table inside `k8s/gen-microservices.sh`, and `apps/api/docs/runbook.md`.
They disagreed, and a mismatch between a gateway default and a service's bind
port had already caused a silent outage that `.env` masked on every developer
machine.

## Decision

`services.yaml` at the repository root is the only place a deployable's name,
kind, path, ports, environment-variable names, health paths, database and
dependencies are declared. `scripts/registry/validate.mjs` fails when any
`main.ts` default, `.env.example`, Kubernetes ConfigMap or generated artifact
disagrees with it, and runs in the gate and in CI. `scripts/registry/generate.mjs`
emits everything derived from it: the services table in
`docs/architecture/services.md`, the port block in every workspace README,
and (from phases 2 and 3) the Kubernetes service manifests and the Compose
services file.

## Consequences

Adding a service means adding a registry entry first; the validator tells you
what else is missing. Port tables in documentation cannot drift because they
are not typed. The registry is one more file to maintain, and generated files
are committed so that a diff shows what a registry change does.
```

- [ ] **Step 5: Verify and commit**

Run: `npx prettier --write docs/adr/*.md && grep -c '^## ' docs/adr/000[2-5]-*.md`
Expected: `3` for each file (Context, Decision, Consequences).

```bash
git add docs/adr && git commit -q -m "docs: record the rspack, Vitest, zone and registry decisions as ADRs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Developer guides

**Files:**
- Modify: `docs/guides/local-setup.md` (full rewrite), `docs/guides/secrets.md` (rewrite around the existing rotation note)
- Create: `docs/guides/running-services.md`, `docs/guides/testing.md`, `docs/guides/database-migrations.md`, `docs/guides/seeding.md`, `docs/guides/troubleshooting.md`, `docs/guides/conventions.md`

Sources: root `package.json` scripts; `apps/api/package.json` scripts (`dev:all`, `dev:marketplace`, `start:*`, `migration:*`, `db:split`, `test:e2e`); `.claude/launch.json`; `apps/api/.env.example`; `infra/docker/compose.infra.yml` header; `apps/api/data-source.ts` header; `apps/api/scripts/migration-baseline.ts` header; `apps/api/scripts/seed/seed-all.ts` header; `apps/api/scripts/create-kafka-topics.js` header; `tests/smoke/boot-all.mjs` header; `apps/web/e2e/`; the spec section 3 (D1–D3).

- [ ] **Step 1: Rewrite `docs/guides/local-setup.md`**

Required sections and content:

1. **Prerequisites** — Node 26.5.0 (`.nvmrc`; `nvm use`), npm ≥ 10, Docker Desktop with Compose v2.20+, Git, and for mobile only Flutter 3.44 / Dart 3.12. Windows note: paths with spaces work but always quote them; use Git Bash or PowerShell as documented per command.
2. **Clone and install** — `git clone …`, `npm ci` from the root and only the root (explain: one lockfile, workspaces; nested installs leave stale copies).
3. **Environment** — `cp .env.example .env` at the root; `cp apps/api/.env.example apps/api/.env`; each module backend has its own `.env.example` if you run it outside the default. State exactly who reads what: Compose interpolates only the root `.env`; every Nest service reads `.env` from its own working directory (`apps/api/.env` for the gateway and the 17 core services, `modules/<v>/backend/.env` for a module backend, which also falls back to `apps/api/.env` — see the `envFilePath` arrays in each module's root module); the web shell reads `apps/web/.env.local`.
4. **Infrastructure** — `npm run infra:up` (what it starts: Postgres on 5432, Redis 6379, Kafka 9092, MongoDB 27017, Elasticsearch, Kafka UI 8080; the `isolated` and `tools` profiles), and `npm run kafka:topics` is part of `infra:up`.
5. **Run** — `npm run dev` (everything through Turbo), or `npm run dev:api` + `npm run dev:web` + a zone; open `http://localhost:3000`; the API at `http://localhost:3001/api/v1/health`; Swagger at `/api/docs`.
6. **Verify** — `npm run smoke` after `npm run build`; what a green table looks like.
7. **Mobile** — `cd apps/customer && flutter pub get && flutter run`; same for partner and seller; link to `docs/architecture/mobile.md`.
8. **Where next** — links to running-services, testing, troubleshooting.

Also keep the "your Windows username contains spaces" warning from the old guide, and add one line on the untracked clutter (`*.log`, `nuget.exe`, `build/`, `Users/`) that git ignores and that can be deleted freely.

- [ ] **Step 2: Write `docs/guides/running-services.md`**

Sections: **The three ways to run things** (Turbo `dev` for all; `dev:api` = `apps/api`'s `dev:all` with the list of what it starts, transcribed; per-service `start:*`); **Ports** — a registry block:

```markdown
<!-- registry:start -->
<!-- registry:end -->
```

then `npm run registry:generate` fills it; **Zones** — the shell on 3000 rewrites to 3002–3009, `*_ZONE_ORIGIN` env vars from `apps/web/next.config.mjs`; **Flags** — `SKIP_DB`, `SKIP_KAFKA`, `SKIP_REDIS` (from `infra/k8s/config.yaml` and the gateway's env validation), `DEV_AUTH_BYPASS` with the warning that anonymous requests become SUPER_ADMIN when it is on; **Logs** — where each runner writes.

- [ ] **Step 3: Write `docs/guides/testing.md`**

Sections: **Unit** (`npm test`; Vitest for backends via the shared factory, Jest for `apps/web` and zones; per-workspace `-w`); **Integration** (`npm run test:integration -w @kartseek/marketplace-backend`, needs `infra:up`; they are excluded from `npm test` and why); **End-to-end** (`npm run test:e2e -w kartseek-api` for the two gateway specs; `npm run test:e2e -w kartseek-web` for Playwright, list the five journeys in `apps/web/e2e/`); **Contract** (`apps/api/test/gateway-service-contract.spec.ts` — what it asserts); **Smoke** (`npm run smoke`, what it boots and probes); **Postman** (`tests/postman/README.md`); **Type gates** (`npm run type-check` includes `scripts/check-type-imports.js`; why `tsc` alone is not enough); **Authorization tests** — never set `DEV_AUTH_BYPASS` when testing authorization; always send an `Authorization` header.

- [ ] **Step 4: Write `docs/guides/database-migrations.md`**

From `apps/api/data-source.ts` and `migration-baseline.ts` headers: migrations are hand-written SQL, fully schema-qualified, one ledger in `public`; `migration:show|run|revert|baseline` commands; `synchronize` is development-only and what it silently cannot do (expression indexes, backfills, constraint replacement); the two Postgres-on-5432 trap; how module databases (`<MODULE>_DB_*`, `isolated` profile, `npm run db:split -w kartseek-api`) work today; a pointer that phase 5 moves ledgers per service.

- [ ] **Step 5: Write `docs/guides/seeding.md`**

The `db:seed*` root scripts and what each seeds (from the seed files' headers); `seed-all.ts` order; idempotency notes from `apps/api/scripts/seed/seed-marketplace.ts` (upsert by slug); the `create-kafka-topics.js` requirement before anything that publishes.

- [ ] **Step 6: Rewrite `docs/guides/secrets.md`**

Keep the existing rotation instructions verbatim as a section titled "Incident: the Google Maps key (rotate it)". Add before it: **Where secrets live** (`.env` files, never committed; `.env.example` holds names and safe defaults only; `*.key`, `*.pem`, keystores are git-ignored — list from `.gitignore`); **How to add a new secret** (name in `.env.example` with a comment, Joi validation in the consuming service's `env.validation.ts` or module, ConfigMap/Secret in `infra/k8s/config.yaml`); **Scanning** (gitleaks in CI from phase 4).

- [ ] **Step 7: Write `docs/guides/troubleshooting.md`**

One entry per known trap, each with *Symptom / Cause / Fix*:
`localhost` resolving to `::1` (use `127.0.0.1`; the ~200 ms connect penalty on benchmarks); two Postgres instances on 5432; health 200 but every DB route 500 (entity globs in a bundle — keep lists explicit); `Nest can't resolve dependencies` at boot after adding a library (the five registration points); `UnknownDependenciesException` on a module backend (a stub root module shadowing the real one — history in 1A Task 3 comments); `Can't resolve @nestjs/common/internal` (two `@nestjs/core` copies; `npm ls @nestjs/core`); Next dev returns 200 for `notFound()` (check for a page marker, not the status); a zone renders once then 404s on its JavaScript (`basePath` missing); `.env` masking a port mismatch (run `npm run registry:check`); CSP/CORS "could not reach the sign-in service" (browser-only; curl will not reproduce); Kafka topics gone after `docker compose down -v` (`npm run kafka:topics`).

- [ ] **Step 8: Write `docs/guides/conventions.md`**

From the spec section 3: D1 skeletons per workspace kind (with a tree for each), D2 root-module naming with one example, D3 file/symbol casing and Dart naming; **Where new code goes** (a new vertical → `modules/<name>/{backend,frontend}` + registry entry; a new core service → `apps/api/apps/<name>-service` + `nest-cli.json` + registry; shared backend code → `apps/api/libs/<name>` + the five registration points; shared web code → `packages/shared-core` or `shared-ui`); **Commits** — Conventional Commits, `commitlint` config in root `package.json`; **Type imports** — why `import type` matters here and the gate that enforces it; **Formatting** — Prettier settings from root `package.json`.

- [ ] **Step 9: Generate, verify, commit**

```bash
npm run registry:generate
npx prettier --write docs/guides/*.md
grep -c 'registry:start' docs/guides/running-services.md
git add docs/guides && git commit -q -m "docs: write the developer guides

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
Expected: the grep prints `1` and the block between the markers is filled.

---

### Task 4: Architecture documents

**Files:**
- Create: `docs/architecture/data-ownership.md`, `docs/architecture/messaging.md`, `docs/architecture/frontend-zones.md`, `docs/architecture/security.md`
- Modify: `docs/architecture/mobile.md` (rewrite from the moved `MOBILE_APPS_README.md`)
- Exists (generated in 1B): `docs/architecture/services.md`

- [ ] **Step 1: `data-ownership.md`**

A table with one row per Nest deployable: service, database name, schema, tables it maps (from its `entities/` folder — list the entity class names), raw-SQL tables it touches (`git grep -nE "query\(|tablePath" apps/api/apps/<svc> modules/<m>/backend/src` — list the table names found), notes. Rows for the gateway must list every entity in `apps/api/apps/api-gateway/src/api-gateway.module.ts` `registerPostgres([...])` (Taxi*, Partner*, PageLayout, StaticPage, User). Mark rows where two services map the same table (`users` at minimum) in bold. Close with a section "What phase 5 must decide" listing those shared tables. This is the seed of the phase 5 inventory; be exhaustive rather than tidy.

- [ ] **Step 2: `messaging.md`**

From `apps/api/scripts/create-kafka-topics.js` (the topic list, transcribed), `apps/api/libs/kafka/src/kafka.module.ts` (group id = `${KAFKA_GROUP_ID}-${service}`; why one group per service), the three explicit consumers (`audit-log-consumers`, `search-indexer`, `notification-password-reset`), `apps/api/apps/api-gateway/src/contracts/domain-events.ts` (event names), and the TCP `@MessagePattern` transport (`contracts/service-patterns.ts`; the `send(cmd, payload, fallback)` shape and the recorded fact that a missing handler falls back rather than failing — link the audit in `docs/audits/`). Include a Mermaid sequence diagram of one event: order placed → Kafka → notification and audit-log consumers.

- [ ] **Step 3: `frontend-zones.md`**

The shell/zone model (ADR 0004), the rewrite table from `apps/web/next.config.mjs` (`/marketplace`, `/grocery`, … with their `*_ZONE_ORIGIN` variables), what lives in `packages/shared-core` and `packages/shared-ui` (list the top-level folders of each `src/`), how i18n is shared (`packages/shared-core/src/i18n/request.ts` loaded by every `next.config.mjs`), the linking rule (cross-zone links use `<ZoneLink>` from `packages/shared-ui`; same-zone links built from the shared route helpers pass through `zoneHref()` in `packages/shared-core` to strip the zone’s own basePath), the `components/india/` note from the spec (country-specific implementations pending the localization registry), and the three web route areas with their sizes (admin 250 pages, seller 181, hotel-owner 33 — from `git ls-files apps/web/src/app/<area> | grep -c page.tsx`).

- [ ] **Step 4: `security.md`**

From `apps/api/apps/api-gateway/src/guards/`, `libs/security`, `libs/guards`, `apps/api/apps/auth-service/src/jwt.strategy.ts`, the gateway's `env.validation.ts` and `config/cors-origins.ts`: JWT access + refresh (expiry values from `infra/k8s/config.yaml`), one refresh slot per user (a second login invalidates the first device), guards are per-controller and there is no global `APP_GUARD` (so a new route ships open unless it declares a guard — say this plainly), `DEV_AUTH_BYPASS`, the seller approval workflow (`users.status` + `sellers.verificationStatus`, `SellerApprovalGuard`), rate limiting and `trust proxy`, CSP/CORS origins, WebSocket room authorisation (grants from HTTP routes, room names as membership). Link the relevant audits.

- [ ] **Step 5: Rewrite `mobile.md`**

Keep the accurate parts of the moved file (three apps, package names, bundle ids, entry points, feature lists — verify each against `apps/*/pubspec.yaml` and `lib/`), replace the tree (it still shows `apps/api` and `apps/web` under "mobile"), rename `shared_mobile` to `kartseek_shared_mobile`, add `packages/vendor/objective_c` with a link to `packages/vendor/README.md`, add the state of the catalogues (mock-first: screens render `MockData` regardless of the API — link the audit), and how to run each app.

- [ ] **Step 6: Verify and commit**

```bash
npx prettier --write docs/architecture/*.md
ls docs/architecture
git add docs/architecture && git commit -q -m "docs: describe data ownership, messaging, zones, security and mobile as built

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
Expected: six files (`services.md` from 1B plus the five above).

---

### Task 5: The root `README.md`

**Files:**
- Modify: `README.md` (full rewrite; target ≤ 150 lines)

- [ ] **Step 1: Replace the file with this structure**

```markdown
# KARTSEEK

KARTSEEK is a multi-country super app: marketplace, grocery, restaurant,
pharmacy, doctor appointments, hotel booking, taxi, wallet and loyalty, with
seller, franchise and admin portals, served to web and to three Flutter apps.
It detects the customer's country and city and localises storefronts, currency,
tax and nearby vendors. This repository holds all of it: 26 NestJS services
behind one API gateway, a Next.js shell with eight independently deployed
zones, three Flutter apps, and the infrastructure to run them.

## Repository map

<a tree of the real top level: apps/ (api, web, customer, partner, seller,
mcp-server), modules/<vertical>/{backend,frontend} ×8, packages/, infra/,
tests/, docs/, scripts/, services.yaml, docker-compose.yml — one line each
with a purpose>

## Prerequisites

<Node 26.5.0 via .nvmrc, npm ≥ 10, Docker Desktop (Compose v2.20+); Flutter
3.44 for mobile only>

## Ten-minute local setup

```bash
git clone <url> && cd KARTSEEKAPP
nvm use
npm ci
cp .env.example .env && cp apps/api/.env.example apps/api/.env
npm run infra:up
npm run dev
```

Open http://localhost:3000. The API answers at
http://localhost:3001/api/v1/health and documents itself at
http://localhost:3001/api/docs. Full walkthrough, including mobile:
[docs/guides/local-setup.md](docs/guides/local-setup.md).

## Ports

<!-- registry:start -->
<!-- registry:end -->

## Everyday commands

<table: npm run dev / dev:api / dev:web / build / test / type-check / lint /
smoke / registry:check / registry:generate / infra:up|down / db:seed /
kafka:topics — one line each, from package.json>

## Where to go next

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the system fits together
- [docs/](docs/README.md) — guides, architecture, decisions, product spec
- [services.yaml](services.yaml) — the service registry every port table comes from
- [docs/guides/conventions.md](docs/guides/conventions.md) — before your first PR
```

Fill every `<…>` from the repository. Nothing from the old README's sections 6–12 (module plans, production rules, QA checklist, handover) is kept here; that material is the product specification, which lives at `docs/product/project-specification.md` and is linked from `docs/README.md`.

- [ ] **Step 2: Generate, verify length, commit**

```bash
npm run registry:generate
npx prettier --write README.md
wc -l README.md
git add README.md && git commit -q -m "docs: rewrite the root README as a true entry point

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
Expected: line count ≤ 150 (the generated block included).

---

### Task 6: The root `ARCHITECTURE.md`

**Files:**
- Modify: `ARCHITECTURE.md` (full rewrite)

Sources: `services.yaml`; `apps/api/apps/api-gateway/src/main.ts` (global prefix `api`, URI versioning default `1`, Swagger path); `apps/api/apps/api-gateway/src/api-gateway.module.ts` (what it wires); `apps/api/libs/*` (one line per library, from each `index.ts`); `apps/web/next.config.mjs`; `infra/docker/compose.infra.yml`; the architecture docs from Task 4.

- [ ] **Step 1: Write the document with these sections**

1. **System at a glance** — a Mermaid `graph LR` with: clients (web shell, 8 zones, 3 Flutter apps) → API gateway (REST `/api/v1`, Socket.IO) → 17 core services + 8 module services (TCP message patterns, gRPC where the registry says so) → data (Postgres per module + `kartseek_db`, Redis, MongoDB, Elasticsearch) and Kafka between services.
2. **Deployables** — the counts (26 Nest, 9 Next) and a link to `docs/architecture/services.md`; the registry as the source.
3. **Request path** — one numbered walk-through of `GET /api/v1/marketplace/products`: shell rewrite → gateway controller → guard/interceptor pipeline → `send()` to marketplace-service over TCP (or gRPC for the catalogue) → response envelope shape (`{ data: { data: [...] } }` for lists — say it, it trips people).
4. **Communication** — REST at the edge; TCP `@MessagePattern`; gRPC (`apps/api/proto/*.proto`, which services); Kafka (link messaging.md); Socket.IO (the `/orders` namespace and room authorisation, link security.md).
5. **Shared backend libraries** — table of `apps/api/libs/*` with one line each and the five registration points rule.
6. **Frontends** — shell + zones (link frontend-zones.md), shared packages, PWA.
7. **Data** — Postgres per module and schema-per-service in `kartseek_db` today, link data-ownership.md; Redis uses; MongoDB (audit logs); Elasticsearch (search).
8. **Security** — five sentences and a link to security.md.
9. **Local and deployed topology** — Compose (link `infra/README.md`), Kubernetes (link `infra/k8s/README.md`), images (link `infra/docker/`), and a pointer that CI/CD and observability arrive in phases 2–4 of the spec.
10. **Known gaps** — link to the latest audits and to the spec's follow-ups (section 13).

Every number in the document comes from `services.yaml` or a `git ls-files | grep -c` you ran; write the command you used in a trailing HTML comment so the next editor can re-run it.

- [ ] **Step 2: Verify and commit**

```bash
npx prettier --write ARCHITECTURE.md
grep -c '```mermaid' ARCHITECTURE.md
git add ARCHITECTURE.md && git commit -q -m "docs: rewrite ARCHITECTURE.md from the running system

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
Expected: at least `1` Mermaid block.

---

### Task 7: Application READMEs

**Files:**
- Create: `apps/api/README.md`, `apps/web/README.md`, `apps/mcp-server/README.md`, `apps/customer/README.md`, `apps/partner/README.md`
- Modify: `apps/seller/README.md` (replace the three-line Flutter default), `apps/api/docs/architecture.md`, `apps/api/docs/runbook.md`

Every README has the same five headings in this order: **What this is**, **Run**, **Test**, **Configuration**, **Layout**. Nest and Next READMEs also carry a registry block under Configuration.

- [ ] **Step 1: `apps/api/README.md`**

What this is: the Nest monorepo — `apps/api-gateway` + 17 core services under `apps/`, shared libraries under `libs/`, protos, migrations, seeds; the module backends live in `modules/*/backend` and build against these `libs/` through the shared rspack config. Run: `npm run dev:api` (what `dev:all` starts), a single service with `npm run start:<name> -w kartseek-api`, production with `node dist/apps/<project>/main.js`. Test: `npm test -w kartseek-api`, `test:e2e`, `type-check`. Configuration: `.env.example` walkthrough (DB, Redis, Kafka, JWT, service TCP ports, `SKIP_*`), a registry block for the gateway. Layout: the service skeleton (D1/D2) with `order-service` as the worked example, the `libs/` table (reuse from ARCHITECTURE.md by link, not copy), `scripts/{seed,maintenance}`, `migrations/`, `test/`.

- [ ] **Step 2: Shorten `apps/api/docs/architecture.md` and `apps/api/docs/runbook.md`**

`architecture.md`: replace the 231-line document with ≤ 40 lines: what the API workspace is, the service list is `docs/architecture/services.md`, communication is described in the root `ARCHITECTURE.md`, and the two things that are API-workspace-specific (the rspack build and the five registration points, link ADR 0002). Delete the stale Mermaid map with wrong ports.

`runbook.md`: keep the headings (Health checks, Service ports, Common operations, Incident response…) but replace the port table with a registry block (marker pair), fix the health-check examples to the real paths (`/api/v1/health` for the gateway; per-service paths as `services.yaml` records them until phase 2), remove `seller-service` (no such deployable), and link `infra/k8s/README.md` for cluster commands.

- [ ] **Step 3: `apps/web/README.md`**

What this is: the Next.js shell on 3000 — home, account, auth, cart, checkout, orders, search, admin (250 pages), seller portal (181), hotel-owner (33), static pages, `sitemap.ts`/`robots.ts`, `src/app/api/*` route handlers; it rewrites each vertical path to its zone. Run: `npm run dev:web`; needs the API on 3001 and whichever zones you open. Test: Jest (`npm test -w kartseek-web`), Playwright (`test:e2e`, needs the platform up), `type-check`, `lint` (note the advisory react-hooks baseline: compare counts, do not chase zero). Configuration: `NEXT_PUBLIC_API_URL` (includes `/api/v1`), `NEXT_PUBLIC_WS_URL` (bare origin), `*_ZONE_ORIGIN` — all resolved through `src/lib/config/api-base.ts`, never `process.env` directly; the consent banner's `--consent-banner-height` variable; registry block. Layout: `src/app` route groups, `src/components/{admin,seller,taxi,india,guards}`, `src/lib`, `scripts/build-og-image.mjs`, `e2e/`.

- [ ] **Step 4: `apps/mcp-server/README.md`**

From `apps/mcp-server/package.json` and `src/`: an MCP server exposing KARTSEEK REST endpoints as tools for AI agents; it is not an npm workspace (own lockfile — say so and why it is left that way); run/test commands from its manifest; how it authenticates to the gateway (from `src/client.ts`); the tool list from `src/tools/`.

- [ ] **Step 5: The three Flutter READMEs**

For each of `apps/customer`, `apps/partner`, `apps/seller`: package name, app id and version from `pubspec.yaml`; audience and modules (from `docs/architecture/mobile.md`); Run (`flutter pub get`, `flutter run`, `flutter run -d windows` where `windows/` exists); Test (`flutter analyze`, `flutter test`); Configuration (`.env.example` keys, the `dependency_overrides` and why — link `packages/vendor/README.md`; seller's `path_provider_foundation` pin); Layout (`lib/features/<module>/`, `lib/routing/`, shared code in `packages/shared-mobile` as `kartseek_shared_mobile`); the mock-first caveat with a link to the audit.

- [ ] **Step 6: Generate, verify, commit**

```bash
npm run registry:generate
npx prettier --write apps/api/README.md apps/api/docs/*.md apps/web/README.md apps/mcp-server/README.md apps/customer/README.md apps/partner/README.md apps/seller/README.md
grep -l 'registry:start' apps/api/README.md apps/web/README.md apps/api/docs/runbook.md | wc -l
git add apps && git commit -q -m "docs: write the application READMEs and shorten the API workspace docs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
Expected: `3`.

---

### Task 8: Module READMEs (17 files)

**Files:**
- Create: `modules/README.md`, and `modules/<v>/backend/README.md` + `modules/<v>/frontend/README.md` for `doctor`, `franchise`, `grocery`, `hotel`, `marketplace`, `pharmacy`, `restaurant`, `taxi`

- [ ] **Step 1: `modules/README.md`**

The shared shape of a vertical: `backend/` is a Nest service built against `apps/api/libs` through the shared rspack config, with its own database (`<MODULE>_DB_*`, falling back to the platform database), TCP message patterns for the gateway and gRPC where declared; `frontend/` is a Next.js zone with `basePath: /<vertical>` mounted by the shell. A table of the eight verticals with backend workspace, frontend workspace, and one line on what is special (marketplace: gRPC catalogue + `HttpSurfaceGuard`; grocery: gRPC; restaurant, taxi: gRPC; franchise: no customer zone content beyond the opportunity pages; doctor, hotel, pharmacy: TCP only). How to add a vertical (link conventions.md). Where each module's admin and seller screens live (`apps/web/src/app/admin/<vertical>`, `apps/web/src/app/seller/<vertical>`) and the four shared shells.

- [ ] **Step 2: Scaffold the sixteen from one template, then fill the three hand-written lines**

Write `$TEMP/module-readme.mjs`:

```js
// Run from the repository root: node "$TEMP/module-readme.mjs"
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { loadRegistry, repoRoot } = await import(pathToFileURL(path.resolve('scripts/registry/lib.mjs')).href);

const root = repoRoot();
const reg = loadRegistry(root);
const name = (v) => v.charAt(0).toUpperCase() + v.slice(1);

for (const s of reg.services.filter((s) => s.kind === 'module-service' || s.kind === 'web-zone')) {
  const vertical = s.path.split('/')[1];
  const side = s.kind === 'module-service' ? 'backend' : 'frontend';
  const file = path.join(root, s.path, 'README.md');
  if (fs.existsSync(file)) continue;
  const body = side === 'backend'
    ? `# ${name(vertical)} service

<!-- ONE LINE: what this vertical's backend owns (its entities and the customer, seller and admin flows it serves). -->

Part of the [${vertical} vertical](../../README.md). A NestJS service built against \`apps/api/libs\`; the API gateway reaches it over TCP message patterns${s.ports.grpc ? ' and gRPC' : ''}.

## Run

\`\`\`bash
npm run dev -w ${s.build.workspace}
\`\`\`

Needs \`npm run infra:up\` first. Copy \`.env.example\` to \`.env\` to run against a dedicated database instead of the platform one.

## Test

\`\`\`bash
npm test -w ${s.build.workspace}
npm run type-check -w ${s.build.workspace}
\`\`\`

<!-- ONE LINE: name any integration spec and what it needs. -->

## Configuration

<!-- registry:start -->
<!-- registry:end -->

## Layout

<!-- ONE LINE: the src/ folders that are specific to this module and what each holds. -->
`
    : `# ${name(vertical)} zone

<!-- ONE LINE: which customer journeys this zone renders. -->

Part of the [${vertical} vertical](../../README.md). An independently built Next.js application mounted by the shell at \`${s.basePath}\`; see [frontend zones](../../../docs/architecture/frontend-zones.md).

## Run

\`\`\`bash
npm run dev -w ${s.build.workspace}
\`\`\`

Open it through the shell at http://localhost:3000${s.basePath}, not on its own port — links and assets are emitted under the base path.

## Test

\`\`\`bash
npm test -w ${s.build.workspace}
npm run type-check -w ${s.build.workspace}
\`\`\`

## Configuration

<!-- registry:start -->
<!-- registry:end -->

## Layout

<!-- ONE LINE: the src/app routes this zone owns. -->
`;
  fs.writeFileSync(file, body);
  console.log('wrote', path.relative(root, file));
}
```

Run: `node "$TEMP/module-readme.mjs"`
Expected: 16 `wrote …` lines.

Then open each file and replace every `<!-- ONE LINE: … -->` with the real sentence, from the module's `src/` tree and `src/app` routes. No `ONE LINE` comment may survive:

Run: `git grep -c 'ONE LINE' -- modules` → expected: no output.

- [ ] **Step 3: Generate, verify, commit**

```bash
npm run registry:generate
npx prettier --write modules/README.md modules/*/*/README.md
git grep -L 'registry:start' -- 'modules/*/*/README.md'
git add modules && git commit -q -m "docs: add a README to every module backend and zone, ports generated from the registry

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
Expected: the `git grep -L` prints nothing (every module README has the block).

---

### Task 9: Packages, infra, tests and scripts READMEs

**Files:**
- Create: `packages/shared-core/README.md`, `packages/shared-ui/README.md`, `packages/shared-mobile/README.md`, `infra/README.md`, `tests/README.md`
- Modify: `infra/k8s/README.md` (rewrite, absorbing `QUICKSTART.md`), `tests/postman/README.md`, `scripts/README.md`, `docs/archive/README.md`
- Delete: `infra/k8s/QUICKSTART.md`

- [ ] **Step 1: Package READMEs**

`packages/shared-core/README.md`: what it is (web-side shared code: API client and endpoints, auth token, i18n and localization registry, routes, hooks, contexts, SEO, socket, sanitize-html, types, demo data), how it is consumed (through `tsconfig` `paths` from the shell and every zone — not an npm workspace; link the follow-up in the spec section 13), the rule that currency, language lists, address fields and payment methods come from the localization registry and are never hard-coded, one line per top-level `src/` folder (list from `ls packages/shared-core/src`).

`packages/shared-ui/README.md`: shared React components (`app-shell`, `kartseek-loader`, `marketplace-product-thumb` — the one `ProductThumb` that owns every product image well, `orders/`, `profile/`, `recommendations/`, `seo/`, `shared/`, `ui-widgets/`, `ui.tsx`, `zone-link.tsx`), consumption through `paths`, `tailwind.config.ts` shared preset, and the linking rule: `<ZoneLink>` for cross-zone links, `zoneHref()` (in `packages/shared-core`) only for same-zone links built from the shared route helpers.

`packages/shared-mobile/README.md`: `kartseek_shared_mobile` — what it holds (from `lib/`: core infrastructure, auth, region service, common features), consumed by path from the three apps, `flutter analyze` baseline (the one known `deprecated_export_use` warning), the `objective_c` override.

- [ ] **Step 2: `infra/README.md` and the Kubernetes README**

`infra/README.md`: the four folders — `docker/`, `k8s/`, `nginx/` (what the reverse proxy fronts, TLS via `npm run nginx:certs`), `postgres/` (`init-extensions.sql` and why it exists — transcribe its header) — one paragraph each with a link to the folder's own README where one exists. State that images for every deployable and the generated Compose services file arrive in phase 3, and monitoring in phase 2, with a link to the spec.

`infra/docker/README.md` (create): the three Dockerfiles, each with the exact `docker build` command from its header and what it produces (`core-service.Dockerfile` + `--build-arg APP=<nestProject>` → any of the 17 core services; `api-gateway.Dockerfile` → the gateway; `marketplace-service.Dockerfile` → the one module image that exists today); why every build runs from the repository root (one lockfile, workspace install, rspack deps in the root manifest — from the headers); `compose.infra.yml` with its profiles (`isolated`, `marketplace-isolated`, `tools`) and what the root `docker-compose.yml` `include:` list will grow to in phases 2–3; where the root `.dockerignore` is and that it is the only one.

`infra/k8s/README.md`: rewrite the 499-line file into ≤ 200 lines that are true today: prerequisites (from the old README's list, verified), the manifest files and what each holds (`namespace.yaml`, `config.yaml`, `databases.yaml`, `storage*.yaml`, `api-gateway.yaml`, `microservices.yaml`, `microservices-generated.yaml` + `gen-microservices.sh` and its per-service `case` overrides — say plainly that the generator moves to `scripts/registry` in phase 2), `ingress.yaml`, `marketplace-hpa.yaml`; `deploy.sh` usage (`./infra/k8s/deploy.sh dev`) and the placeholder-secret check it performs; `utils.sh` commands; the known constraints from the 2026-08-13 audit (resource quota rejects init containers without resources; `fsGroup` does not apply to `hostPath`; `--validate=strict` passes manifests that cannot run — link the audit). Merge the useful parts of `QUICKSTART.md` (the 5-minute local Docker Desktop path) into a "Quick start" section and delete `QUICKSTART.md`:

```bash
git rm -q infra/k8s/QUICKSTART.md
```

- [ ] **Step 3: `tests/README.md` and the Postman README**

`tests/README.md`: what lives here — `postman/` (collections, environments, data, newman runners), `smoke/` (`boot-all.mjs`, `logs/` ignored); how they relate to the per-workspace unit/integration/e2e tests (link `docs/guides/testing.md`).

`tests/postman/README.md`: fix the counts (34 collection files — 31 numbered + hotel + pharmacy + payment), the two local environments (`KARTSEEK_Local` for the numbered suite, `local` for the payment runner), `scripts/run-all.js` flags (from its header), `newman/run-payment-tests.sh`, where reports go (`reports/`, git-ignored), the import-into-Postman steps with the new paths (already `sed`-ed in 1A; re-read the whole file and fix anything else stale, such as the "31 collections" figure and any `docs/api` mention).

- [ ] **Step 4: Extend `scripts/README.md`; refresh the archive README**

Plan 1B already added the two `registry/*` rows and the `npm run test:scripts` line to `scripts/README.md`. Add one more row, for `docs/check-links.mjs` (the file lands in Task 10; add the row now):

```markdown
| `docs/check-links.mjs` | Resolves every relative link in every tracked Markdown file; exits 1 listing `file:line → target` for each broken one. Runs in the gate and in CI. | `npm run docs:check-links` |
```

`docs/archive/README.md`: update the "For the current picture, prefer" list to `README.md`, `ARCHITECTURE.md`, `docs/architecture/`, the dated audits in `docs/audits/`, and the contract spec.

- [ ] **Step 5: Verify and commit**

```bash
npx prettier --write packages/*/README.md infra/README.md infra/k8s/README.md tests/README.md tests/postman/README.md scripts/README.md docs/archive/README.md
wc -l infra/k8s/README.md
git add -A && git commit -q -m "docs: READMEs for packages, infra, tests and scripts; fold the k8s quick start into its README

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
Expected: `infra/k8s/README.md` ≤ 200 lines.

---

### Task 10: The link checker, wired into the gate

**Files:**
- Create: `scripts/docs/check-links.mjs`, `scripts/docs/check-links.test.mjs`
- Modify: root `package.json` (`docs:check-links` script)

**Interfaces:**
- Produces: `npm run docs:check-links` → exit 0 when every relative link in every tracked `.md` resolves; exit 1 listing `file:line → target` otherwise. Exported for tests: `extractLinks(markdown) → [{ line, target }]`, `resolveTarget(fromFile, target, root) → string | null`.

- [ ] **Step 1: Write the failing test**

`scripts/docs/check-links.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractLinks, resolveTarget, checkTree } from './check-links.mjs';

test('extractLinks finds inline links and skips URLs, anchors and mailto', () => {
  const md = [
    'See [setup](guides/local-setup.md) and [arch](../ARCHITECTURE.md#data).',
    'Not these: [web](https://example.com), [anchor](#here), [mail](mailto:a@b.c).',
    'Image: ![diagram](img/flow.png)',
    'Code: `[not](a-link.md)`',
  ].join('\n');
  assert.deepEqual(extractLinks(md), [
    { line: 1, target: 'guides/local-setup.md' },
    { line: 1, target: '../ARCHITECTURE.md' },
    { line: 3, target: 'img/flow.png' },
  ]);
});

test('resolveTarget returns the path when it exists and null when it does not', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'links-'));
  fs.mkdirSync(path.join(root, 'docs/guides'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/guides/a.md'), '');
  const from = path.join(root, 'docs/README.md');
  assert.equal(resolveTarget(from, 'guides/a.md', root), path.join(root, 'docs/guides/a.md'));
  assert.equal(resolveTarget(from, 'guides/missing.md', root), null);
  assert.equal(resolveTarget(from, 'guides/', root), path.join(root, 'docs/guides'));
});

test('checkTree reports every broken link with file and line', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'links-'));
  fs.writeFileSync(path.join(root, 'ok.md'), '');
  fs.writeFileSync(path.join(root, 'index.md'), '[a](ok.md)\n\n[b](nope.md)\n');
  const broken = checkTree(root, ['index.md', 'ok.md']);
  assert.deepEqual(broken, [{ file: 'index.md', line: 3, target: 'nope.md' }]);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test "scripts/docs/*.test.mjs"`
Expected: FAIL — `Cannot find module './check-links.mjs'`.

- [ ] **Step 3: Write the checker**

`scripts/docs/check-links.mjs`:

```js
#!/usr/bin/env node
/**
 * Relative-link checker for every tracked Markdown file.
 *
 *   node scripts/docs/check-links.mjs          # whole repository
 *   node scripts/docs/check-links.mjs docs/    # one subtree
 *
 * Exit 1 and print `file:line → target` for every relative link whose target
 * does not exist. Absolute URLs, `#anchors` and `mailto:` are skipped; anchors
 * on relative links (`file.md#section`) are stripped before resolving.
 * Historical folders are checked too: a broken link is broken wherever it is.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function extractLinks(markdown) {
  const out = [];
  let inFence = false;
  markdown.split('\n').forEach((raw, i) => {
    if (/^\s*```/.test(raw)) { inFence = !inFence; return; }
    if (inFence) return;
    const line = raw.replace(/`[^`]*`/g, '');   // drop inline code
    for (const m of line.matchAll(LINK)) {
      const target = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
      out.push({ line: i + 1, target: target.replace(/#.*$/, '') });
    }
  });
  return out;
}

export function resolveTarget(fromFile, target, root) {
  const abs = target.startsWith('/')
    ? path.join(root, target)
    : path.resolve(path.dirname(fromFile), decodeURIComponent(target));
  return fs.existsSync(abs) ? path.normalize(abs).replace(/[\\/]+$/, '') : null;
}

export function checkTree(root, files) {
  const broken = [];
  for (const rel of files) {
    const file = path.join(root, rel);
    for (const { line, target } of extractLinks(fs.readFileSync(file, 'utf8'))) {
      if (!target) continue;
      if (resolveTarget(file, target, root) === null) broken.push({ file: rel, line, target });
    }
  }
  return broken;
}

function trackedMarkdown(root, subtree) {
  const args = ['ls-files', '--', ...(subtree ? [subtree] : []), '*.md', '**/*.md'];
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !f.includes('node_modules/'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const files = trackedMarkdown(root, process.argv[2]);
  const broken = checkTree(root, files);
  for (const b of broken) console.error(`${b.file}:${b.line} → ${b.target}`);
  console.log(`${files.length} files, ${broken.length} broken link(s)`);
  process.exit(broken.length ? 1 : 0);
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test "scripts/docs/*.test.mjs"`
Expected: 3 passed.

- [ ] **Step 5: Wire it in and run it on the repository**

Add to root `package.json` scripts: `"docs:check-links": "node scripts/docs/check-links.mjs"`.

Run: `npm run docs:check-links`
Expected: a count and, on first run, some broken links — most in `docs/audits/` and `docs/archive/` pointing at pre-1A paths, and cross-references between the moved audits. Fix every one by updating the link target (never by deleting the sentence); for a target that no longer exists anywhere (a deleted script), replace the link with plain text naming the file and the commit that removed it. Re-run until it prints `0 broken link(s)`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -q -m "docs: add a relative-link checker and fix every broken link it found

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Phase 1C gate and the end-of-phase sweep

- [ ] **Step 1: Documentation gates**

```bash
npm run docs:check-links
npm run registry:check
npm run format:check
```
Expected: all exit 0. (`format:check` covers Markdown; if it flags a file you did not touch, leave it and note it — do not reformat unrelated files in this phase.)

- [ ] **Step 2: Stale-prose sweep**

```bash
git grep -nE 'apps/mobile|design-system/tokens|27 microservices|23 microservices|docs/api/postman|k8s/gen-microservices|MOBILE_APPS_README|MAPS_API_KEY|native-bindings|shared_mobile\b' -- '*.md' ':!docs/audits' ':!docs/archive' ':!docs/superpowers' ':!packages/vendor/objective_c'
```
Expected: empty. Any hit is a document this plan rewrote incompletely; fix it in that document.

- [ ] **Step 3: The full phase 1 gate (spec section 11)**

```bash
npm ci
npm run type-check && npm run lint && npm run build && npm test
npm run registry:check && npm run docs:check-links
npm run infra:up && npm run smoke
```
Expected: all green; the smoke table shows 26 rows with `ok` (or `ok (tcp)` for `user-service` and `franchise-service`, which have no HTTP health route until phase 2).

- [ ] **Step 4: Manual render check**

With `npm run dev` running, open `http://localhost:3000`, `/marketplace`, `/grocery`, `/restaurant`, `/pharmacy`, `/doctor`, `/hotel-booking`, `/taxi`, `/franchise` and confirm each renders its own zone (not the shell's 404). Record the result in the final commit message.

- [ ] **Step 5: Close the phase**

If steps 1–4 needed fix-ups, commit them as `docs:` or `fix:` commits with the gate step named in the body. Then update the spec's status line (`docs/superpowers/specs/2026-09-05-platform-reorganization-design.md`, line 4) to `**Status:** phase 1 complete (2026-…); phases 2–5 pending` and commit:

```bash
git add docs/superpowers/specs/2026-09-05-platform-reorganization-design.md && git commit -q -m "docs(spec): mark phase 1 complete

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
