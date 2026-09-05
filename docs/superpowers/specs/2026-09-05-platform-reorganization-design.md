# KARTSEEK platform reorganization — design

**Date:** 2026-09-05
**Status:** approved in discussion, awaiting written review
**Branch:** `chore/platform-reorg` (stacked on `chore/rspack-builder`, eight commits ahead of `main`)

## 1. Purpose

Make the repository intuitive for a developer who has never seen it, and close
the platform gaps that a production microservice system needs: pipelines,
images for every deployable, a database per service, and a monitoring baseline.

The request that produced this design had two parts. The first asked for a
review and restructure of the directory tree, accurate names for every
component, an updated architecture, and rewritten READMEs. The second listed
the steps of a microservice build: service boundaries, an API gateway,
data isolation, asynchronous messaging, CI/CD with Docker and Kubernetes,
testing, and monitoring and security. Most of the second list already exists
here. This design keeps what exists and adds what does not.

### Decisions already taken

| Question | Decision |
|---|---|
| Execute or document? | Execute in this repository, in verified commits on one branch. |
| Restructure depth | Tidy in place. `apps/`, `modules/` and `packages/` stay where they are. |
| Gaps to close now | CI/CD, Docker images for every deployable, database-per-service, monitoring baseline. |
| CI host | GitHub Actions. |
| Approach | Conventions plus a machine-readable service registry that generators and a drift check read from. |

## 2. Current state

Numbers below were measured on 2026-09-05 against the tracked tree
(3,490 files: `apps/` 2,070, `modules/` 761, `packages/` 494, `docs/` 102).

### 2.1 What is sound

- Three top-level buckets: `apps/` (Next.js shell, the core Nest monorepo, three
  Flutter apps, an MCP server), `modules/<vertical>/{backend,frontend}` for
  eight verticals, `packages/` for shared code.
- Workspace names are uniform: `@kartseek/<vertical>-backend`,
  `@kartseek/<vertical>-frontend`, `kartseek-web`, `kartseek-api`,
  `kartseek_customer`, `kartseek_partner`, `kartseek_seller`.
- Component files are kebab-case in 55 of 60 cases.
- Module frontends are real Next.js zones with `basePath`, mounted by the shell's
  rewrites.
- Module backends already prefer a dedicated database (`<MODULE>_DB_*`), Compose
  already runs one Postgres per module under the `isolated` profile, and
  `apps/api/scripts/split-databases.ts` copies and verifies a schema into it.
- The build is rspack, tests are Vitest on the backend, a type-import gate
  exists (`scripts/check-type-imports.js`), and the API gateway has real
  liveness and readiness routes.

### 2.2 What misleads a new developer

1. **The root README describes a tree that does not exist.** It documents
   `apps/mobile/` and `design-system/tokens/`; neither exists. It omits
   `modules/` entirely. `ARCHITECTURE.md` says 26 services,
   `apps/api/docs/architecture.md` says 27. The true count is 18 in
   `apps/api/apps` plus 8 module backends = 26 Nest deployables, plus 9 Next.js
   deployables (shell + 8 zones).
2. **Root modules are named four different ways.** 11 services bootstrap
   `<name>-service.module.ts`, 13 bootstrap `<name>.module.ts`, 2 bootstrap
   `app.module.ts`. Four services (order, payment, audit-log, loyalty) carry a
   `<name>-service.module.ts` that nothing imports.
3. **Health routes are buried under controller prefixes.** 36 `@Get('health')`
   handlers exist, almost all mounted under a prefix (`/cart/health`,
   `/grocery/health`). Only the gateway, auth, order, payment and marketplace
   answer `GET /health` at the root, so the Kubernetes generator falls back to
   port-open probes for everyone else. There is no metrics endpoint anywhere and
   the shared logger is `console.log` with a timestamp.
4. **Four hand-maintained port tables disagree**: `k8s/gen-microservices.sh`,
   `apps/api/.env.example`, `k8s/config.yaml`, `apps/api/docs/runbook.md`, and
   the defaults inside each `main.ts`.
5. **Three Postman homes**: `docs/api/postman` (27 collections, 8 environments,
   31 committed *reports*), `apps/api/postman` (2 collections),
   `tests/postman` (1 collection, 1 environment, a newman script).
6. **`scripts/` mixes one-off codemods with the one real gate.** Its README
   lists a file that no longer exists and points Flutter commands at
   `apps/mobile/`. Three throwaway scripts sit tracked at the root of
   `apps/web`; `apps/api` tracks `snap.cjs` (a schema dump with hard-coded
   credentials), `jest-e2e.js` (Jest is gone), and a `.dockerignore` that no
   build reads. `apps/api/package.json` references `scaffold-services.js` and
   `install-deps.js`, which do not exist, and its `start:prod` path predates the
   rspack output layout.
7. **Tracked odds and ends at the root**: `reg.tmp.js`, `MAPS_API_KEY.md`
   (a key-rotation note, not a key), `apps/MOBILE_APPS_README.md` outside any
   app, `docs/` holding 19 audit reports beside the product specification with
   no index.
8. **No CI of any kind.** No `.github/`, no pipeline file. Dockerfiles exist
   only for `apps/api` (three files whose names do not say what they build:
   `Dockerfile` is the generic core-service image, `Dockerfile.prod` is the
   gateway, `Dockerfile.marketplace` is one module).
9. **Core services share `kartseek_db`**, separated by schema. Nine of them
   configure TypeORM by hand instead of through `@app/database`; four of those
   open a connection with `entities: []`.
10. **Dart naming**: `packages/native-bindings` is a vendored, patched copy of
    pub.dev `objective_c` 9.4.1; `packages/shared-mobile` publishes as
    `shared_mobile` without the `kartseek_` prefix every other package carries;
    `apps/customer/lib/test_variants.dart` is a debug script at the library
    root.

The working copy also holds untracked clutter (20 log files, `nuget.exe`, a
CMake `build/`, a `Users/` mirror, `DockerDesktopWSL/`, two files named
`package.json;C`). Git already ignores all of it. It is a one-line note in the
setup guide, not a restructure.

## 3. Decisions

**D1. One skeleton per workspace kind.** Every Nest deployable has
`src/main.ts`, a root module named after the deployable, `src/dto/`, and
`src/entities/` only when it owns tables. Every Next.js deployable has
`src/app/`, `src/components/`, `src/lib/`. Every Flutter app has `lib/main.dart`,
`lib/features/`, `lib/routing/`.

**D2. Root module = `<deployable>.module.ts`, class `<Deployable>Module`.**
This is what `nest g app <name>` generates and what 11 of 26 already use.
Examples: `order-service.module.ts` / `OrderServiceModule`,
`api-gateway.module.ts` / `ApiGatewayModule`,
`marketplace-service.module.ts` / `MarketplaceServiceModule`. Feature modules
keep domain names (`order.module.ts` is fine as a *feature* module, never as
the root).

**D3. File names are kebab-case; exported symbols are PascalCase.** Applies to
TypeScript and TSX. Dart follows Dart: snake_case files, `kartseek_` package
prefix.

**D4. One service registry, `services.yaml`, at the repository root.** It is
the only place ports, images, database ownership and dependencies are declared.
Generators emit the Kubernetes service manifests, the Compose services file, the
docs port table, and the port block inside each workspace README. A validator
fails CI when any `main.ts` default, `.env.example`, Compose file or Kubernetes
ConfigMap disagrees with it.

**D5. Infrastructure lives under `infra/`**: `infra/docker/`, `infra/k8s/`,
`infra/nginx/`, `infra/postgres/`, `infra/observability/`.

**D6. Tests that span services live under `tests/`**: Postman collections and
environments, newman runners, the boot smoke test.

**D7. Docs are split by audience**: `docs/guides/` for developers doing a task,
`docs/architecture/` for how the system is built, `docs/adr/` for why,
`docs/product/` for what it must do, `docs/audits/` for dated findings,
`docs/archive/` for superseded material. Operational READMEs sit next to what
they operate (`infra/k8s/README.md`, `infra/docker/README.md`,
`tests/postman/README.md`).

**D8. Templates, not copies, for Docker.** Three Dockerfiles cover 35 images.

**D9. Observability is a shared library, `@app/observability`**, imported by
all 26 Nest deployables. Root-mounted `/health`, `/health/ready`, `/metrics`;
pino-backed JSON logging with a request id.

**D10. Database-per-service for core services is mechanism first, cutover
last, gated on an ownership inventory.** No service is cut over until the
tables it reads are known to be its own or reachable through another service's
API.

**D11. Deletions over relocations for dead tooling.** One-off codemods and
debug scripts are removed; git history keeps them.

**D12. Every phase ends with the same verification gate** (section 11). A
phase is not done until the gate passes.

## 4. Target layout

```
KARTSEEKAPP/
├── apps/
│   ├── api/                     Nest monorepo: api-gateway + 17 core services + libs/
│   │   ├── apps/<service>/      one dir per core service (unchanged names)
│   │   ├── libs/                shared libraries (@app/*), + observability (phase 2)
│   │   ├── migrations/          moved into each owning service in phase 5 (see 9.3)
│   │   ├── scripts/
│   │   │   ├── seed/            seed-*.ts, seed-all.ts
│   │   │   └── maintenance/     one-off data repairs kept for reference
│   │   ├── docs/                runbook.md, architecture.md (rewritten, short, links out)
│   │   ├── proto/               gRPC contracts
│   │   └── README.md
│   ├── web/                     Next.js shell (port 3000)
│   ├── customer/  partner/  seller/     Flutter apps
│   └── mcp-server/
├── modules/<vertical>/
│   ├── backend/                 Nest service (unchanged), README generated block
│   └── frontend/                Next.js zone (unchanged), README generated block
├── packages/
│   ├── shared-core/             web: API client, i18n, routes, hooks
│   ├── shared-ui/               web: shared components
│   ├── shared-mobile/           Dart: kartseek_shared_mobile
│   └── vendor/objective_c/      patched pub.dev objective_c 9.4.1 (was native-bindings)
├── infra/
│   ├── docker/                  core-service.Dockerfile, module-service.Dockerfile,
│   │                            nextjs.Dockerfile, compose.infra.yml,
│   │                            compose.services.yml (generated), compose.observability.yml
│   ├── k8s/                     base manifests + generated/services.yaml
│   ├── nginx/
│   ├── observability/           prometheus.yml, grafana provisioning + dashboard
│   └── postgres/
├── tests/
│   ├── postman/                 collections/ environments/ data/ newman/ README.md
│   └── smoke/                   boot-all.mjs: start every service, poll /health
├── docs/
│   ├── README.md                index
│   ├── guides/                  local-setup, running-services, testing, database-migrations,
│   │                            seeding, secrets, troubleshooting, conventions
│   ├── architecture/            services.md (generated), data-ownership.md, messaging.md,
│   │                            frontend-zones.md, mobile.md, security.md, observability.md,
│   │                            deployment.md
│   ├── adr/
│   ├── product/                 project-specification.md
│   ├── audits/                  dated reports
│   ├── archive/
│   └── superpowers/specs/       design specs (this file)
├── scripts/
│   ├── check-type-imports.js
│   ├── registry/                validate.mjs, generate.mjs
│   └── docs/check-links.mjs
├── .github/workflows/           ci.yml, deploy.yml, nightly-e2e.yml
├── services.yaml                the service registry (D4)
├── docker-compose.yml           `include:` of the three compose files
├── README.md  ARCHITECTURE.md  package.json  turbo.json  ...
```

Nothing moves inside `apps/api/apps/*/src`, `modules/*/backend/src` or any
`src/app` route tree except the renames in section 5.3.

## 5. Phase 1 — Repo tidy, naming, documentation

### 5.1 Moves

| From | To | Also update |
|---|---|---|
| `k8s/**` | `infra/k8s/**` | `deploy.sh` and `utils.sh` literal `k8s/` paths become `$(dirname "$0")`-relative; `.dockerignore`; docs |
| `nginx/**` | `infra/nginx/**` | root `package.json` `nginx:*` scripts; `docker-compose.yml` volume mounts |
| `apps/api/Dockerfile*` (3) | `infra/docker/` unchanged, renamed `core-service.Dockerfile`, `api-gateway.Dockerfile`, `marketplace-service.Dockerfile` | `.gitattributes`; docs. Phase 3 replaces them with templates |
| `docker-compose.yml` body | `infra/docker/compose.infra.yml`; root file becomes `include:` | relative volume paths (`./infra/postgres/…` → `../postgres/…`); verify interpolation still reads the root `.env` |
| `docs/api/postman/{collections,environments,data,scripts,newman.config.js,README.md}` | `tests/postman/` | `.gitattributes`; the README's paths |
| `apps/api/postman/*.json` (2) | `tests/postman/collections/` | — |
| `tests/postman/payment-service.postman_collection.json` | `tests/postman/collections/` | `newman/run-payment-tests.sh` |
| `docs/api/postman/reports/*` (31 reports, `summary.json`, `_working_environment.json`, `test-results.txt`) | deleted; `tests/postman/reports/.gitkeep` kept; `tests/postman/reports/*` gitignored | — |
| `docs/*AUDIT*.md`, `docs/MARKETPLACE_*.md`, `docs/FRONTEND_DATA_AUDIT.md`, `docs/MODULE_ISOLATION_AUDIT_*.md`, `docs/stabilization/*` | `docs/audits/` | `docs/README.md` index |
| `docs/PROJECT_SPECIFICATION.md` | `docs/product/project-specification.md` | links |
| `docs/KARTSEEK_WORKPLAN_PHASE1-4.md` | `docs/archive/` (superseded by this program) | — |
| `docs/API_SETUP_GUIDE.md` | rewritten as `docs/guides/local-setup.md` | — |
| `MAPS_API_KEY.md` | folded into `docs/guides/secrets.md` (rotation note kept verbatim) | — |
| `apps/MOBILE_APPS_README.md` | split into `docs/architecture/mobile.md` and the three app READMEs | — |
| `apps/api/scripts/seed-*.ts`, `seed-all.ts` | `apps/api/scripts/seed/` | root `package.json` `db:seed*` scripts |
| `apps/api/scripts/{align-franchise-markets,backfill-seller-owner,sync-restaurant-tables}.ts`, `create-order-table.sql` | `apps/api/scripts/maintenance/` with a README stating what each did and when | — |
| `packages/native-bindings` | `packages/vendor/objective_c` | `apps/customer/pubspec.yaml`, `apps/partner/pubspec.yaml` path deps; new README explaining the patch |

### 5.2 Deletions (tracked files)

Root: `reg.tmp.js`.
`apps/api`: `snap.cjs`, `jest-e2e.js`, `.dockerignore`, `scripts/hotel-api-test.js`,
`scripts/hotel-diagnostic.js`; the `jest` block and `jest`/`ts-jest`/`@types/jest`
devDependencies; the `scaffold`, `install:deps` and `test:e2e` (Jest) scripts.
The two e2e specs under `apps/api/test/` are kept and become reachable through
Vitest (`test:e2e` reruns them with `vitest run --config test/vitest.e2e.mts`
against live infrastructure).
`apps/web`: `check_links.js`, `fix_broken_links.js`, `refactor_taxi.js`.
`apps/customer/lib/test_variants.dart`.
`scripts/`: `fix-dark-theme.js`, `fix_jsx.js`, `web/fix_accessibility_lint.js`,
`mobile/fix_const_errors.js`, `mobile/fix_static_declarations.js`,
`mobile/fix_undeclared_variables.js`, `mobile/replace_hardcoded_currency.js`,
`mobile/fix_objective_c_bug.ps1`, `mobile/recreate_dummy_objective_c.ps1`
(superseded by the vendored package), `mobile/run_customer_app.ps1`,
`mobile/run_partner_app.ps1` (reference `apps/mobile/`; the app READMEs give the
`flutter run` command), `api/*` (four generators for the initial scaffold).
`docs/archive/validate-fixes.sh` stays; it is archive.
Dead root-module wrappers: `order-service.module.ts`,
`payment-service.module.ts`, `audit-log-service.module.ts`,
`loyalty-service.module.ts` (each referenced by zero files), deleted *before*
the renames in 5.3 so the names are free.

`.gitignore` gains `/Users/`, `/build/`, `tests/postman/reports/*` with
`!tests/postman/reports/.gitkeep`.

### 5.3 Renames

**Root modules (D2).** 15 files, 15 classes, every importer including specs.

| Deployable | Today | Becomes |
|---|---|---|
| admin-service | `admin.module.ts` / `AdminModule` | `admin-service.module.ts` / `AdminServiceModule` |
| api-gateway | `app.module.ts` / `AppModule` | `api-gateway.module.ts` / `ApiGatewayModule` |
| audit-log-service | `audit-log.module.ts` / `AuditLogModule` | `audit-log-service.module.ts` / `AuditLogServiceModule` |
| auth-service | `app.module.ts` / `AppModule` | `auth-service.module.ts` / `AuthServiceModule` |
| loyalty-service | `loyalty.module.ts` / `LoyaltyModule` | `loyalty-service.module.ts` / `LoyaltyServiceModule` |
| order-service | `order.module.ts` / `OrderModule` | `order-service.module.ts` / `OrderServiceModule` |
| payment-service | `payment.module.ts` / `PaymentModule` | `payment-service.module.ts` / `PaymentServiceModule` |
| payout-service | `payout.module.ts` / `PayoutModule` | `payout-service.module.ts` / `PayoutServiceModule` |
| user-service | `user.module.ts` / `UserModule` | `user-service.module.ts` / `UserServiceModule` |
| wallet-service | `wallet.module.ts` / `WalletModule` | `wallet-service.module.ts` / `WalletServiceModule` |
| franchise | `franchise.module.ts` / `FranchiseModule` | `franchise-service.module.ts` / `FranchiseServiceModule` |
| grocery | `grocery.module.ts` / `GroceryModule` | `grocery-service.module.ts` / `GroceryServiceModule` |
| hotel | `hotel.module.ts` / `HotelModule` | `hotel-service.module.ts` / `HotelServiceModule` |
| marketplace | `marketplace.module.ts` / `MarketplaceModule` | `marketplace-service.module.ts` / `MarketplaceServiceModule` |
| taxi | `taxi.module.ts` / `TaxiModule` | `taxi-service.module.ts` / `TaxiServiceModule` |

Unchanged (already conform): cart, commission, delivery, location,
notification, refund, report, search, doctor, pharmacy, restaurant.

**Component files (D3).** Five renames, imports updated:
`apps/web/src/components/india/PinCodeInput.tsx` → `pin-code-input.tsx`,
`StateDistrictSelector.tsx` → `state-district-selector.tsx`,
`apps/web/src/components/taxi/RentalCompliancePanel.tsx` →
`rental-compliance-panel.tsx`, `RentalDocumentPanel.tsx` →
`rental-document-panel.tsx`, `VehicleHandoverPanel.tsx` →
`vehicle-handover-panel.tsx`. The `india/` grouping stays; it is documented in
`docs/architecture/frontend-zones.md` as a country-specific implementation that
the localization registry should eventually drive.

**Dart package (D3).** `shared_mobile` → `kartseek_shared_mobile`: `pubspec.yaml`
name, three app `pubspec.yaml` dependencies, 662 `package:shared_mobile/`
imports. Directory stays `packages/shared-mobile`. This step runs only after a
baseline `flutter analyze` of the four Dart workspaces completes on this
machine (Flutter 3.44.0 is installed); if the baseline cannot run, the rename
is deferred to a follow-up and the READMEs say so.

**Package scripts.** `apps/api/package.json` `start:prod` becomes
`node dist/apps/api-gateway/main.js` (the rspack output path).

### 5.4 Service registry (D4)

`services.yaml`, schema version 1:

```yaml
version: 1
defaults:
  registry: ghcr.io/<github-owner>/kartseek   # filled in when the GitHub remote exists; --registry overrides
  node: 26.5.0
services:
  - name: order-service
    kind: core-service                     # gateway | core-service | module-service | web-shell | web-zone
    path: apps/api/apps/order-service
    build: { workspace: kartseek-api, nestProject: order-service }
    image: kartseek/order-service
    ports:  { http: 3014, tcp: 4004, grpc: 5002 }
    env:    { http: ORDER_SERVICE_PORT, tcp: ORDER_TCP_PORT, grpc: ORDER_GRPC_PORT }
    health: { live: /health, ready: /health/ready, metrics: /metrics }
    database: { schema: order }            # null when the service owns no tables
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: order-service }
    k8s: { replicas: 2, resources: { requests: {cpu: 100m, memory: 256Mi}, limits: {cpu: 500m, memory: 512Mi} } }
  - name: grocery-frontend
    kind: web-zone
    path: modules/grocery/frontend
    build: { workspace: "@kartseek/grocery-frontend" }
    image: kartseek/grocery-frontend
    ports: { http: 3003 }
    basePath: /grocery
```

Entries: 1 gateway, 17 core services, 8 module services, 1 web shell, 8 web
zones = 35. Flutter apps and the MCP server are not deployables here and are
not listed.

`scripts/registry/validate.mjs` checks, and exits non-zero on the first
failure:

1. every `path` exists and holds `src/main.ts` or `next.config.mjs`;
2. every `nest-cli.json` project of type `application` and every
   `modules/*/backend` and `modules/*/frontend` workspace has exactly one entry,
   and every entry maps back;
3. the numeric defaults in each `main.ts` (`?? 3014`, `?? 4004`, …) equal the
   registry ports, and the env var names match `env`;
4. `apps/api/.env.example` and each module `.env.example` default the same
   ports;
5. `infra/k8s/config.yaml` `*_SERVICE_PORT` values match;
6. no two entries share a port; no two share a Kafka group id;
7. every generated artifact (5.5) is byte-identical to a fresh generation
   (`--check`).

`scripts/registry/generate.mjs` writes: `infra/k8s/generated/services.yaml`
(Deployment + Service per Nest entry; `httpGet` probes on `health.live` and
`health.ready`; Prometheus scrape annotations; per-entry `k8s` overrides;
replaces `gen-microservices.sh` and `microservices-generated.yaml`, and the
hand-written auth/order/payment Deployments in `microservices.yaml` move into
registry overrides so one generator covers all 26), `infra/docker/compose.services.yml`
(section 7), `docs/architecture/services.md` (a table), and the block between
`<!-- registry:start -->` and `<!-- registry:end -->` in every workspace README.
Phase 1 ships the registry, the validator and the docs/README generators; the
k8s generator lands in phase 2 with the probe change; the Compose generator in
phase 3.

Phase 1 also adds `tests/smoke/boot-all.mjs` (section 10), because the gate in
section 11 uses it from the first phase on. Until phase 2, `health.live`
records each service's *current* route (for example `/cart/health`); a service
with no HTTP health route records `live: null`, and the smoke test falls back
to a TCP connect on its HTTP port, as the Kubernetes probes do today.

### 5.5 Documentation

**Root `README.md`** (target under 150 lines): what KARTSEEK is in three
sentences; the real repo map; prerequisites (Node 26.5.0 via `.nvmrc`,
npm 11, Docker Desktop, Flutter 3.44 for mobile); a ten-minute local setup
(`npm ci` → `cp .env.example .env` → `npm run infra:up` → `npm run dev` →
open `http://localhost:3000`); the generated port table; where to go next.

**Root `ARCHITECTURE.md`** rewritten from the running system: the 35
deployables and how they talk (REST at the gateway, TCP `@MessagePattern` and
gRPC inside, Kafka events, Socket.IO for tracking), the zone model, the data
layer (Postgres per module today, per core service after phase 5, Redis,
MongoDB for audit logs, Elasticsearch for search), the security model
(JWT + refresh slots, guards per controller, the seller approval workflow),
and links into `docs/architecture/`. Diagrams as Mermaid.

**`docs/`**: `README.md` index; `guides/` — `local-setup.md`,
`running-services.md` (which `dev:*` starts what, ports, `SKIP_DB`),
`testing.md` (Vitest, Jest for web, Playwright, integration specs and their
infrastructure), `database-migrations.md`, `seeding.md`, `secrets.md`,
`troubleshooting.md` (seeded from the recorded gotchas: the two Postgres on
5432, `localhost` vs `127.0.0.1`, `DEV_AUTH_BYPASS`), `conventions.md` (D1–D3,
commit format, where new code goes); `architecture/` — `services.md`
(generated), `data-ownership.md` (the schema-per-service map as it is today;
phase 5 turns it into the ownership inventory), `messaging.md` (Kafka topics,
one consumer group per service, `create-kafka-topics.js`), `frontend-zones.md`,
`mobile.md`, `security.md`, `observability.md` (phase 2), `deployment.md`
(phases 3–4); `adr/` — `0001-record-architecture-decisions.md`,
`0002-nest-monorepo-on-rspack.md`, `0003-vitest-for-backend-tests.md`,
`0004-next-multi-zone-frontends.md`, `0005-service-registry.md`; later phases
add `0006-observability-baseline.md`, `0007-database-per-service.md`,
`0008-shared-packages-as-workspaces.md` (follow-up, see section 13).

**Workspace READMEs**, each with purpose, how to run, how to test, env vars,
and the generated port block: `apps/api`, `apps/web`, `apps/mcp-server`,
`apps/customer`, `apps/partner`, `apps/seller`, `modules/README.md` (the shared
shape) plus one per `modules/<v>/backend` and `modules/<v>/frontend` (16,
short, generated block + three hand-written lines each), `packages/*` (4),
`infra/README.md`, `infra/k8s/README.md` (rewritten from the current
README + QUICKSTART, reflecting the generated manifests), `tests/postman/README.md`,
`scripts/README.md`. `apps/api/docs/architecture.md` and `runbook.md` are
rewritten short and link to the root documents rather than repeating them.

`scripts/docs/check-links.mjs` resolves every relative Markdown link in
tracked `.md` files and fails on a missing target. It runs in the gate and in
CI.

### 5.6 Phase 1 verification

The gate in section 11, plus: `git grep -nE '(^|[^A-Za-z0-9_./-])(k8s|nginx)/'`
and `git grep -n 'docs/api/postman\|apps/api/postman\|native-bindings\|package:shared_mobile/'`
return nothing outside `docs/audits/`, `docs/archive/` and
`docs/superpowers/`; `flutter analyze` passes for the four Dart workspaces;
`node scripts/registry/validate.mjs` passes; `node scripts/docs/check-links.mjs`
passes.

## 6. Phase 2 — Observability baseline

### 6.1 `@app/observability`

New library `apps/api/libs/observability`, registered in the five places every
shared library needs: `apps/api/nest-cli.json` projects,
`apps/api/tsconfig.json` paths, the `appLibs` array in `apps/api/rspack.config.js`,
the eight `modules/*/backend/tsconfig.json` paths, and the alias map in
`apps/api/test/vitest-backend.mts`.

Exports:

- `ObservabilityModule.forService({ name, version?, readiness })` where
  `readiness` lists what `GET /health/ready` must ping: `postgres` (the
  service's TypeORM `DataSource`), `redis` (`@app/redis`), `kafka` (a
  metadata fetch through `@app/kafka`), `mongo` (Mongoose connection). Each
  check reports `up | down` with latency; any `down` makes the route answer 503.
- `GET /health` — liveness: `{ status, service, version, uptime, timestamp }`,
  no dependencies touched, `@SkipThrottle()`.
- `GET /metrics` — `prom-client` registry: default process metrics prefixed
  `kartseek_`, `kartseek_service_info{service,version} 1`, and
  `http_server_request_duration_seconds{service,method,route,status}` from an
  interceptor the module registers globally.
- `@ProbeRoute()` marker on the three controllers so services that close their
  HTTP surface (marketplace's `HttpSurfaceGuard`) can allow-list them.
- `RequestContext` (AsyncLocalStorage): the request id from `x-request-id` or a
  new UUID on HTTP; carried in a `meta.requestId` field on gateway → service
  TCP messages and read back by an interceptor; echoed as `x-request-id` on
  responses.

The gateway keeps its richer health controller (service catalog, memory) but
its `/health`, `/health/ready` and the new `/metrics` come from the library.
Its routes stay under the global `/api/v1` prefix because the existing image
health check and manifests use `/api/v1/health`; the registry records that.
Its JSON `/health/metrics` route is retired in favour of `/metrics`;
`/health/services` stays.

### 6.2 Removals

The 36 controller-scoped `@Get('health')` handlers and the HTTP-only parts of
the 29 `healthCheck()` service methods are removed. `@MessagePattern('health')`
handlers stay: the gateway uses them to probe services over TCP.

### 6.3 Logging

`@app/logger`'s `KartseekLogger` keeps its interface and becomes pino-backed:
JSON lines with `time, level, service, context, requestId, msg` in production;
an in-process `pino-pretty` stream when `NODE_ENV !== 'production'` and stdout
is a TTY. Pino's worker-thread transports are *not* used: a bundled `main.js`
cannot resolve the worker file. `pino` and `pino-pretty` are declared by
`apps/api` (the platform set every module compiles against) and stay external
in the rspack bundle.

### 6.4 Kubernetes and local monitoring

The generated manifests switch every probe to `httpGet` on the registry's
health paths and add `prometheus.io/scrape|path|port` annotations. The
`PrometheusRule` in `infra/k8s/ingress.yaml` is updated to the new metric names.
`infra/observability/` holds `prometheus.yml` (static scrape of the 26
services on the host ports) and Grafana provisioning with one dashboard:
service up, request rate, p95 latency, 5xx rate, per service.
`infra/docker/compose.observability.yml` runs Prometheus and Grafana under the
`monitoring` profile.

### 6.5 Phase 2 verification

The gate, plus: every one of the 26 services answers 200 on `/health`, 200 on
`/health/ready` with infrastructure up and 503 with Redis stopped, and `/metrics`
contains `kartseek_service_info`; the marketplace service still refuses a
non-probe HTTP route; `docker compose --profile monitoring up` shows all 26
targets up in Prometheus.

## 7. Phase 3 — Docker images for every deployable

### 7.1 Templates

`infra/docker/core-service.Dockerfile` — from today's `apps/api/Dockerfile`,
with `ARG APP`, `ARG PORT`, `ARG HEALTH_PATH=/health`; the gateway builds from
it with `APP=api-gateway PORT=3001 HEALTH_PATH=/api/v1/health`, which retires
the separate gateway Dockerfile. Runtime stays `WORKDIR /repo/apps/api`,
`CMD ["node","dist/main.js"]`, non-root user.

`infra/docker/module-service.Dockerfile` — from today's marketplace Dockerfile,
with `ARG MODULE`. Ports are not baked as `ENV`; they come from the registry at
run time through Compose and Kubernetes. The builder stage always creates
`proto/` so the runtime `COPY` succeeds for modules without gRPC.

`infra/docker/nextjs.Dockerfile` — `ARG WORKSPACE_DIR` (e.g.
`modules/grocery/frontend`), `ARG PORT`, `ARG NEXT_PUBLIC_API_URL`,
`ARG NEXT_PUBLIC_WS_URL`. Requires `output: 'standalone'` and
`outputFileTracingRoot` set to the repository root in all nine
`next.config.mjs` files (none has it today). Runtime copies
`.next/standalone`, `.next/static` and `public`. Zone URLs the shell rewrites to
are server-side env and stay runtime-configurable.

One root `.dockerignore` serves all three; it stops excluding `apps/web/**` and
`modules/*/frontend/**`.

Image names stay `kartseek/<service>`; tags are the git SHA and, on release,
the version. `scripts/registry/build-image.mjs <name>|--all [--push]` reads
the registry, picks the template by `kind`, and runs `docker build` from the
repository root. CI calls the same script.

### 7.2 Compose

`infra/docker/compose.services.yml` is generated: one service per registry
entry, `profiles: [apps]`, `image: kartseek/<name>:${KARTSEEK_TAG:-dev}`,
ports from the registry, `depends_on` with `condition: service_healthy` on the
infrastructure it declares, env from the root `.env`. `docker compose --profile apps up`
runs the platform from images; `npm run infra:up` is unchanged.

### 7.3 Phase 3 verification

The gate, plus: `build-image.mjs --all` builds 35 images; `docker compose --profile apps up`
brings every service healthy; the shell at `http://localhost:3000` renders each
zone's own markup (a zone-specific marker string, since Next returns 200 for
`notFound()` in dev).

## 8. Phase 4 — CI/CD on GitHub Actions

### 8.1 `ci.yml` (push to any branch, pull requests)

Jobs, with `concurrency` per ref and `timeout-minutes` on each:

1. `setup` — `actions/setup-node` with `node-version-file: .nvmrc`, `npm ci`
   from the root, Turbo cache via `actions/cache`; emits the changed-workspace
   list (`dorny/paths-filter`) and the Docker matrix from `services.yaml`.
2. `verify` — `npm run lint`, `npm run type-check` (includes the type-import
   gate), `node scripts/registry/validate.mjs`, `node scripts/docs/check-links.mjs`.
3. `unit` — `npm test` through Turbo filtered to changed workspaces and their
   dependents (`...[origin/main]`, `fetch-depth: 0`).
4. `integration` — the specs excluded from unit runs
   (`vitest.integration.mts` where present, the e2e specs under `apps/api/test/`)
   with Postgres (`postgis/postgis:16-3.4-alpine`) and Redis service
   containers, run serially; `DEV_AUTH_BYPASS` is never set.
5. `build` — `npm run build` filtered; unfiltered when `apps/api/libs/**`,
   `packages/**`, or root config changed.
6. `docker` — matrix from `setup`, `docker/build-push-action` with GHA layer
   cache; builds on pull requests, pushes on `main` and tags to
   `ghcr.io/<owner>/kartseek/<service>`.
7. `k8s` — regenerate manifests, `kubeconform -strict` on `infra/k8s/**`.
8. `flutter` — `subosito/flutter-action@v2` at 3.44.0, `flutter analyze` and
   `flutter test` per app; only when `apps/{customer,partner,seller}/**` or
   `packages/shared-mobile/**` changed.
9. `security` — `gitleaks/gitleaks-action` (blocking) and
   `npm audit --omit=dev --audit-level=high` (reporting only for the first
   month, then blocking; the date is written in the workflow).

### 8.2 `deploy.yml`

Triggered by `v*` tags and `workflow_dispatch`. Builds and pushes all images
with the tag, regenerates manifests with `--registry`, applies them with
`kubectl` behind a `production` environment that requires approval. No cluster
exists yet; the workflow is complete and documented in
`docs/architecture/deployment.md` as ready to point at one.

### 8.3 `nightly-e2e.yml`

Brings the platform up from images (`compose --profile apps`), seeds, runs the
Playwright journeys in `apps/web/e2e`, uploads the report.

### 8.4 Phase 4 verification

Workflows validated with `actionlint`; a dry run of every job's shell steps
locally through `act` where feasible, otherwise the exact commands run by hand
on this machine and their output recorded in the phase's commit message.

## 9. Phase 5 — Database-per-service for the core services

### 9.1 Inventory first

`docs/architecture/data-ownership.md` becomes a matrix: for each of the 18 core
services and the gateway, the tables it maps (entities), the tables it touches
through raw SQL (`query(`, `tablePath`), and which service owns each table.
Known cross-service touches to resolve: `users` (auth-service entities,
user-service entities, gateway controllers), `sellers` (marketplace schema,
gateway seller controllers, `users.sellerType`), and the gateway-owned tables
from the `GatewayOwnedTables` migration. The matrix is committed before any
code changes in this phase.

**Gate.** If the matrix shows a read that cannot be replaced by a call to the
owning service without a product-visible change, the phase stops after 9.2 and
9.3, and the report names the tables and the choice to make.

### 9.2 Mechanism

`@app/database` gains `DatabaseModule.forService(name, { entities })`, which
prefers `<NAME>_DB_HOST|PORT|USER|PASSWORD|NAME` over `DB_*`, sets `schema` to
the service's own, and never enables `synchronize` outside development. The
nine hand-written `TypeOrmModule.forRoot` blocks are replaced by it. The four
services that connect with `entities: []` (commission, delivery, refund,
report) drop their connection entirely once the inventory confirms they run no
SQL; the registry then records `database: null` for them.

### 9.3 Provisioning and tooling

Compose: a Postgres per core service the inventory confirms as a table owner
(today's candidates, by entity folder: auth, user, location, wallet, order,
payment, payout, admin) under an `isolated-core` profile, same image and init
script as the module instances. Kubernetes: one additional
Postgres StatefulSet hosting one database and one role per core service;
instance-level isolation is a per-service `k8s` override in the registry, as it
is for modules.

Migrations move to be owned per service: `apps/api/apps/<service>/migrations/`
and `modules/<vertical>/backend/migrations/`, one `migrations` ledger per
database, a `DataSource` factory in `@app/database` that reads the service's
`<NAME>_DB_*`, and `npm run migration:run -w kartseek-api -- --service=order`.
The existing hand-written SQL migrations (already schema-qualified) are
baselined into the owning service's folder.

`split-databases.ts` is generalised from the eight modules to any registry
entry with a `database`, copying the schema to the target and verifying every
table's row count.

### 9.4 Cutover

Per service, in dependency order: provision, split, flip `<NAME>_DB_*` in
`.env.example`, Compose and the ConfigMap, boot, run the smoke test and the
service's specs. Services whose tables are read by others are cut over last,
after the readers use the owner's API. ADR 0007 records the ownership
decisions.

### 9.5 Phase 5 verification

The gate, plus: each cut-over service boots with its `DB_*` fallbacks removed
from the environment; `split-databases.ts --check` reports zero row-count
differences; the smoke test passes with the shared `kartseek_db` container
stopped for every schema that has moved.

## 10. Cross-cutting

- **Tests.** Every renamed module has its specs updated; the registry
  validator and the link checker have their own unit tests; the smoke test
  `tests/smoke/boot-all.mjs` starts each Nest deployable from the registry
  (`nest start <project>` or `npm run dev -w <workspace>`), polls its
  `health.live` until 200 or a 90-second timeout, prints a table, and exits
  non-zero on any failure.
- **Error handling.** Generators and the validator print the offending
  entry and file path and exit 1; they never write partial output (write to a
  temp file, then rename).
- **Windows.** Renames go through `git mv`. No case-only renames are planned.
  Long file content is written with the editor tool, not shell heredocs.
- **Commits.** One commit per coherent step (a move, a rename set, a doc set),
  Conventional Commits, each passing the gate for the code it touches; the
  phase's final commit passes the whole gate.

## 11. Verification gate

Run from the repository root after every phase, and after any step that
touches code:

```bash
npm ci
npm run type-check          # tsc per workspace + scripts/check-type-imports.js
npm run lint
npm run build               # 26 nest builds + 9 next builds through Turbo
npm test                    # Vitest (backend) + Jest (web, zones)
node scripts/registry/validate.mjs
node scripts/docs/check-links.mjs
npm run infra:up
node tests/smoke/boot-all.mjs      # 26 × GET /health → 200
```

Plus a manual check that `http://localhost:3000` and each zone path render,
and `flutter analyze` for the Dart workspaces when Dart files changed.

## 12. Risks and known hazards

| Hazard | Mitigation |
|---|---|
| New `@app/*` library not resolved in one of the five registration points; builds pass, boot fails | The plan lists all five; the smoke test boots all 26 |
| Two copies of `@nestjs/core` in the bundle after adding dependencies | New deps are declared in `apps/api` only; root pins stay; `npm ls @nestjs/core` in the gate |
| Root-module class rename misses an importer in a spec or a barrel | `tsc` per workspace plus a `git grep` for every old class name |
| Compose `include:` changes how relative paths and `.env` resolve | Verified in phase 1 by `docker compose config` diff before and after |
| pino transports use worker threads that a bundled `main.js` cannot load | In-process pretty stream; no transports |
| Next standalone output with `basePath` and a monorepo root | `outputFileTracingRoot` set; verified per zone by running the image |
| Database split breaks a cross-service read | Inventory and gate in 9.1; cutover of shared-table services last |
| A Dart rename touches 662 imports | Mechanical substitution, `flutter analyze` before and after, single commit, easy to revert |
| `DEV_AUTH_BYPASS` masks authorization failures in tests | Never set in CI; `.env.example` asserts `false`; documented in `testing.md` |
| Historical docs reference old paths | Path checks exclude `docs/audits`, `docs/archive`, `docs/superpowers` |

## 13. Out of scope, recorded as follow-ups

- Full re-layout of the top level (rejected).
- Distributed tracing (OpenTelemetry). ADR 0006 states the decision to stop at
  metrics and structured logs for now.
- Making `packages/shared-core` and `packages/shared-ui` real npm workspaces.
  Today they are reached through `tsconfig` `paths`; adding workspaces changes
  hoisting in a lockfile with recorded dual-package hazards. ADR 0008 captures
  the reasoning and the migration steps for when it is done.
- The gateway owning tables. The phase 5 inventory names an owner; moving
  them is its own change.
- The known behavioural gaps in the existing audits (unimplemented message
  patterns, fabricated fallbacks, mock-first mobile catalogues). This program
  does not change runtime behaviour beyond health, metrics, logging and
  database wiring.
- Renaming Flutter bundle identifiers or app names.

## 14. Order of work

Phase 1 → 2 → 3 → 4 → 5. Each phase gets its own implementation plan under
`docs/superpowers/plans/`, written from this document without a further
design round.
