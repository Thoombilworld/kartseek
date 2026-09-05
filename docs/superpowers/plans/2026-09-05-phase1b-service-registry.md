# Phase 1B — Service Registry and Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One machine-readable registry of the 35 deployables, a validator that fails when any port declaration in the repository disagrees with it, a generator for the docs table and README port blocks, and a smoke test that boots all 26 Nest services and probes their health.

**Architecture:** `services.yaml` at the root is the source of truth (spec D4, section 5.4). `scripts/registry/lib.mjs` loads and shape-checks it; `validate.mjs` runs the seven drift checks; `generate.mjs` renders derived files and can verify them (`--check`). `tests/smoke/boot-all.mjs` starts each service from its built `dist/`, exactly as the Docker images do, and polls the health path the registry records. All scripts are plain ES modules on Node 26 with `node --test`; the only dependency added is `yaml`.

**Tech Stack:** Node 26.5.0, `yaml` 2.9, `node:test`, `node:child_process`, the existing Nest builds.

## Global Constraints

- Plan 1A is complete: paths are `infra/k8s/…`, root modules are renamed, Dockerfiles live in `infra/docker/`.
- `npm install` only from the repository root. `yaml` is added as a root devDependency.
- Scripts are ES modules (`.mjs`), no TypeScript, no build step, no dependency beyond `yaml`.
- The registry records the platform *as it is*: current health paths (mostly prefixed), `live: null` where a service has no HTTP health route. Phase 2 changes the paths, not the schema.
- Generated files are committed. A generator run must be idempotent (running twice changes nothing).
- Every script prints the offending entry and file on failure and exits 1; generators write to a temp file and rename, never partial output.
- One commit per task, Conventional Commits, footer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File map

| File | Responsibility |
|---|---|
| `services.yaml` | The registry. 35 entries. |
| `scripts/registry/lib.mjs` | `loadRegistry`, `validateShape`, `repoRoot`, kind helpers. No I/O beyond reading the YAML. |
| `scripts/registry/lib.test.mjs` | Shape rules. |
| `scripts/registry/validate.mjs` | The seven drift checks; CLI. Exports `parseMainDefaults`, `findDuplicatePorts`, `runChecks`. |
| `scripts/registry/validate.test.mjs` | Pure-function tests for the parsers and duplicate detection. |
| `scripts/registry/generate.mjs` | Renders `docs/architecture/services.md` and README blocks; `--check`. Exports `renderServicesTable`, `renderReadmeBlock`, `replaceBlock`, `generateAll`. |
| `scripts/registry/generate.test.mjs` | Rendering and block replacement. |
| `docs/architecture/services.md` | Generated. |
| `tests/smoke/boot-all.mjs` | Boots every Nest entry from `dist/`, probes health, prints a table, exits non-zero on failure. |
| root `package.json` | `registry:check`, `registry:generate`, `smoke`, `test:scripts`. |
| `.gitignore` | `tests/smoke/logs/`. |
| `scripts/README.md` | Two new rows. |

---

### Task 1: The registry file and its loader

**Files:**
- Create: `services.yaml`, `scripts/registry/lib.mjs`, `scripts/registry/lib.test.mjs`
- Modify: root `package.json` (devDependency `yaml`, script `test:scripts`)

**Interfaces:**
- Produces:
  - `loadRegistry(root?: string) → Registry` — throws `RegistryError` (with `.problems: string[]`) when the shape is wrong.
  - `validateShape(doc: unknown) → string[]` — empty when valid.
  - `repoRoot() → string`; `nestEntries(reg)`, `webEntries(reg)`; constants `KINDS`, `NEST_KINDS`, `WEB_KINDS`, `INFRA`.
  - Registry entry shape (used by every later task):
    ```
    { name, kind, path, build: { workspace, nestProject? }, image,
      ports: { http, tcp?, grpc? }, env?: { http, tcp?, grpc? },
      health?: { live: string|null, ready: string|null },
      database?: { name, schema, envPrefix } | null,
      dependsOn?: string[], kafka?: { groupId }, basePath? }
    ```

- [ ] **Step 1: Add the YAML parser**

Run: `npm install -D yaml@^2.9.0`
Expected: `package.json` devDependencies gains `"yaml": "^2.9.0"`; the lockfile changes (the package was already present transitively, so no new download).

- [ ] **Step 2: Write `services.yaml`**

```yaml
# KARTSEEK service registry — the single source of truth for what is deployed.
#
# Every deployable is listed once: its path, how it is built, its image name,
# the ports it binds and the environment variables that set them, its health
# routes, the database it owns and the infrastructure it needs.
#
#   npm run registry:check      fail if any main.ts default, .env.example,
#                               Kubernetes ConfigMap or generated file disagrees
#   npm run registry:generate   rewrite docs/architecture/services.md and the
#                               <!-- registry:start/end --> block in every README
#
# Rules: ports are unique across the platform; `env` names the variable each
# port is read from in main.ts; `health.live` is the route Kubernetes and the
# smoke test probe today (null = no HTTP health route yet; phase 2 makes every
# service answer /health); `database` is null for services that own no tables.
version: 1

defaults:
  registry: ghcr.io/<github-owner>/kartseek   # set when the GitHub remote exists
  node: 26.5.0
  infra: [postgres, redis, kafka, mongodb, elasticsearch]

services:
  # ── Gateway ────────────────────────────────────────────────────────────────
  - name: api-gateway
    kind: gateway
    path: apps/api/apps/api-gateway
    build: { workspace: kartseek-api, nestProject: api-gateway }
    image: kartseek/api-gateway
    ports: { http: 3001 }
    env: { http: API_GATEWAY_PORT }
    health: { live: /api/v1/health, ready: /api/v1/health/ready }
    database: { name: kartseek_db, schema: public, envPrefix: DB }
    dependsOn: [postgres, redis, kafka, mongodb]

  # ── Core services (apps/api/apps) ──────────────────────────────────────────
  - name: admin-service
    kind: core-service
    path: apps/api/apps/admin-service
    build: { workspace: kartseek-api, nestProject: admin-service }
    image: kartseek/admin-service
    ports: { http: 3027, tcp: 4017 }
    env: { http: ADMIN_SERVICE_PORT, tcp: ADMIN_TCP_PORT }
    health: { live: /admin/health, ready: null }
    database: { name: kartseek_db, schema: admin, envPrefix: DB }
    dependsOn: [postgres, redis, kafka]

  - name: audit-log-service
    kind: core-service
    path: apps/api/apps/audit-log-service
    build: { workspace: kartseek-api, nestProject: audit-log-service }
    image: kartseek/audit-log-service
    ports: { http: 3028 }
    env: { http: AUDIT_LOG_SERVICE_PORT }
    health: { live: /audit-logs/health, ready: null }
    database: null
    dependsOn: [mongodb, redis, kafka]
    kafka: { groupId: audit-log-consumers }

  - name: auth-service
    kind: core-service
    path: apps/api/apps/auth-service
    build: { workspace: kartseek-api, nestProject: auth-service }
    image: kartseek/auth-service
    ports: { http: 3010, grpc: 5001 }
    env: { http: AUTH_SERVICE_PORT, grpc: AUTH_GRPC_PORT }
    health: { live: /health, ready: /health/ready }
    database: { name: kartseek_db, schema: public, envPrefix: DB }
    dependsOn: [postgres]

  - name: cart-service
    kind: core-service
    path: apps/api/apps/cart-service
    build: { workspace: kartseek-api, nestProject: cart-service }
    image: kartseek/cart-service
    ports: { http: 3013, tcp: 4003 }
    env: { http: CART_SERVICE_PORT, tcp: CART_TCP_PORT }
    health: { live: /cart/health, ready: null }
    database: null
    dependsOn: [redis, kafka]

  - name: commission-service
    kind: core-service
    path: apps/api/apps/commission-service
    build: { workspace: kartseek-api, nestProject: commission-service }
    image: kartseek/commission-service
    ports: { http: 3030, tcp: 4020 }
    env: { http: COMMISSION_SERVICE_PORT, tcp: COMMISSION_TCP_PORT }
    health: { live: /commission/health, ready: null }
    database: { name: kartseek_db, schema: commission, envPrefix: DB }
    dependsOn: [postgres, redis, kafka]

  - name: delivery-service
    kind: core-service
    path: apps/api/apps/delivery-service
    build: { workspace: kartseek-api, nestProject: delivery-service }
    image: kartseek/delivery-service
    ports: { http: 3022, grpc: 5008 }
    env: { http: DELIVERY_SERVICE_PORT, grpc: DELIVERY_GRPC_PORT }
    health: { live: /delivery/health, ready: null }
    database: { name: kartseek_db, schema: delivery, envPrefix: DB }
    dependsOn: [postgres, redis, kafka]

  - name: location-service
    kind: core-service
    path: apps/api/apps/location-service
    build: { workspace: kartseek-api, nestProject: location-service }
    image: kartseek/location-service
    ports: { http: 3023, tcp: 4013 }
    env: { http: LOCATION_SERVICE_PORT, tcp: LOCATION_TCP_PORT }
    health: { live: /location/health, ready: null }
    database: { name: kartseek_db, schema: location, envPrefix: DB }
    dependsOn: [postgres, redis]

  - name: loyalty-service
    kind: core-service
    path: apps/api/apps/loyalty-service
    build: { workspace: kartseek-api, nestProject: loyalty-service }
    image: kartseek/loyalty-service
    ports: { http: 3015, tcp: 4005 }
    env: { http: LOYALTY_SERVICE_PORT, tcp: LOYALTY_TCP_PORT }
    health: { live: /loyalty/health, ready: null }
    database: null
    dependsOn: [redis, kafka]

  - name: notification-service
    kind: core-service
    path: apps/api/apps/notification-service
    build: { workspace: kartseek-api, nestProject: notification-service }
    image: kartseek/notification-service
    ports: { http: 3026, grpc: 5004 }
    env: { http: NOTIFICATION_SERVICE_PORT, grpc: NOTIFICATION_GRPC_PORT }
    health: { live: /notifications/health, ready: null }
    database: null
    dependsOn: [redis, kafka]
    kafka: { groupId: notification-password-reset }

  - name: order-service
    kind: core-service
    path: apps/api/apps/order-service
    build: { workspace: kartseek-api, nestProject: order-service }
    image: kartseek/order-service
    ports: { http: 3014, tcp: 4004, grpc: 5002 }
    env: { http: ORDER_SERVICE_PORT, tcp: ORDER_TCP_PORT, grpc: ORDER_GRPC_PORT }
    health: { live: /health, ready: /health/ready }
    database: { name: kartseek_db, schema: order, envPrefix: DB }
    dependsOn: [postgres, redis, kafka]

  - name: payment-service
    kind: core-service
    path: apps/api/apps/payment-service
    build: { workspace: kartseek-api, nestProject: payment-service }
    image: kartseek/payment-service
    ports: { http: 3025, tcp: 4026, grpc: 5003 }
    env: { http: PAYMENT_SERVICE_PORT, tcp: PAYMENT_TCP_PORT, grpc: PAYMENT_GRPC_PORT }
    health: { live: /health, ready: /health/ready }
    database: { name: kartseek_db, schema: payment, envPrefix: DB }
    dependsOn: [postgres, redis, kafka]

  - name: payout-service
    kind: core-service
    path: apps/api/apps/payout-service
    build: { workspace: kartseek-api, nestProject: payout-service }
    image: kartseek/payout-service
    ports: { http: 3031, tcp: 4021 }
    env: { http: PAYOUT_SERVICE_PORT, tcp: PAYOUT_TCP_PORT }
    health: { live: /payouts/health, ready: null }
    database: { name: kartseek_db, schema: payout, envPrefix: DB }
    dependsOn: [postgres, redis, kafka]

  - name: refund-service
    kind: core-service
    path: apps/api/apps/refund-service
    build: { workspace: kartseek-api, nestProject: refund-service }
    image: kartseek/refund-service
    ports: { http: 3032, tcp: 4022 }
    env: { http: REFUND_SERVICE_PORT, tcp: REFUND_TCP_PORT }
    health: { live: /refunds/health, ready: null }
    database: { name: kartseek_db, schema: refund, envPrefix: DB }
    dependsOn: [postgres, redis, kafka]

  - name: report-service
    kind: core-service
    path: apps/api/apps/report-service
    build: { workspace: kartseek-api, nestProject: report-service }
    image: kartseek/report-service
    ports: { http: 3034, tcp: 4024 }
    env: { http: REPORT_SERVICE_PORT, tcp: REPORT_TCP_PORT }
    health: { live: /reports/health, ready: null }
    database: { name: kartseek_db, schema: report, envPrefix: DB }
    dependsOn: [postgres, redis, kafka]

  - name: search-service
    kind: core-service
    path: apps/api/apps/search-service
    build: { workspace: kartseek-api, nestProject: search-service }
    image: kartseek/search-service
    ports: { http: 3033, tcp: 4023 }
    env: { http: SEARCH_SERVICE_PORT, tcp: SEARCH_TCP_PORT }
    health: { live: /search/health, ready: null }
    database: null
    dependsOn: [redis, kafka, elasticsearch]
    kafka: { groupId: search-indexer }

  - name: user-service
    kind: core-service
    path: apps/api/apps/user-service
    build: { workspace: kartseek-api, nestProject: user-service }
    image: kartseek/user-service
    ports: { http: 3011, grpc: 5009 }
    env: { http: USER_SERVICE_PORT, grpc: USER_GRPC_PORT }
    health: { live: null, ready: null }
    database: { name: kartseek_db, schema: user, envPrefix: DB }
    dependsOn: [postgres, redis]

  - name: wallet-service
    kind: core-service
    path: apps/api/apps/wallet-service
    build: { workspace: kartseek-api, nestProject: wallet-service }
    image: kartseek/wallet-service
    ports: { http: 3024, tcp: 4014 }
    env: { http: WALLET_SERVICE_PORT, tcp: WALLET_TCP_PORT }
    health: { live: /wallet/health, ready: null }
    database: { name: kartseek_db, schema: wallet, envPrefix: DB }
    dependsOn: [postgres, redis, kafka]

  # ── Module services (modules/*/backend) ────────────────────────────────────
  - name: doctor-service
    kind: module-service
    path: modules/doctor/backend
    build: { workspace: "@kartseek/doctor-backend" }
    image: kartseek/doctor-service
    ports: { http: 3017, tcp: 4007 }
    env: { http: DOCTOR_SERVICE_PORT, tcp: DOCTOR_TCP_PORT }
    health: { live: /doctors/health, ready: null }
    database: { name: kartseek_doctor, schema: doctor, envPrefix: DOCTOR_DB }
    dependsOn: [postgres, redis, kafka]

  - name: franchise-service
    kind: module-service
    path: modules/franchise/backend
    build: { workspace: "@kartseek/franchise-backend" }
    image: kartseek/franchise-service
    ports: { http: 3016, tcp: 4006 }
    env: { http: FRANCHISE_SERVICE_PORT, tcp: FRANCHISE_TCP_PORT }
    health: { live: null, ready: null }
    database: { name: kartseek_franchise, schema: franchise, envPrefix: FRANCHISE_DB }
    dependsOn: [postgres, redis, kafka]

  - name: grocery-service
    kind: module-service
    path: modules/grocery/backend
    build: { workspace: "@kartseek/grocery-backend" }
    image: kartseek/grocery-service
    ports: { http: 3018, tcp: 4008, grpc: 5010 }
    env: { http: GROCERY_SERVICE_PORT, tcp: GROCERY_TCP_PORT, grpc: GROCERY_GRPC_PORT }
    health: { live: /grocery/health, ready: null }
    database: { name: kartseek_grocery, schema: grocery, envPrefix: GROCERY_DB }
    dependsOn: [postgres, redis, kafka]

  - name: hotel-service
    kind: module-service
    path: modules/hotel/backend
    build: { workspace: "@kartseek/hotel-backend" }
    image: kartseek/hotel-service
    ports: { http: 3035, tcp: 4025 }
    env: { http: HOTEL_SERVICE_PORT, tcp: HOTEL_TCP_PORT }
    health: { live: /hotels/health, ready: null }
    database: { name: kartseek_hotel, schema: hotel, envPrefix: HOTEL_DB }
    dependsOn: [postgres, redis, kafka]

  - name: marketplace-service
    kind: module-service
    path: modules/marketplace/backend
    build: { workspace: "@kartseek/marketplace-backend" }
    image: kartseek/marketplace-service
    ports: { http: 3012, tcp: 4002, grpc: 5006 }
    env: { http: MARKETPLACE_SERVICE_PORT, tcp: MARKETPLACE_TCP_PORT, grpc: MARKETPLACE_GRPC_PORT }
    health: { live: /health, ready: null }
    database: { name: kartseek_marketplace, schema: marketplace, envPrefix: MARKETPLACE_DB }
    dependsOn: [postgres, redis, kafka]

  - name: pharmacy-service
    kind: module-service
    path: modules/pharmacy/backend
    build: { workspace: "@kartseek/pharmacy-backend" }
    image: kartseek/pharmacy-service
    ports: { http: 3020, tcp: 4010 }
    env: { http: PHARMACY_SERVICE_PORT, tcp: PHARMACY_TCP_PORT }
    health: { live: /pharmacy/health, ready: null }
    database: { name: kartseek_pharmacy, schema: pharmacy, envPrefix: PHARMACY_DB }
    dependsOn: [postgres, redis, kafka]

  - name: restaurant-service
    kind: module-service
    path: modules/restaurant/backend
    build: { workspace: "@kartseek/restaurant-backend" }
    image: kartseek/restaurant-service
    ports: { http: 3019, tcp: 4018, grpc: 5005 }
    env: { http: RESTAURANT_SERVICE_PORT, tcp: RESTAURANT_TCP_PORT, grpc: RESTAURANT_GRPC_PORT }
    health: { live: /restaurants/health, ready: null }
    database: { name: kartseek_restaurant, schema: restaurant, envPrefix: RESTAURANT_DB }
    dependsOn: [postgres, redis, kafka]

  - name: taxi-service
    kind: module-service
    path: modules/taxi/backend
    build: { workspace: "@kartseek/taxi-backend" }
    image: kartseek/taxi-service
    ports: { http: 3021, tcp: 4027, grpc: 5007 }
    env: { http: TAXI_SERVICE_PORT, tcp: TAXI_TCP_PORT, grpc: TAXI_GRPC_PORT }
    health: { live: /taxi/health, ready: null }
    database: { name: kartseek_taxi, schema: taxi, envPrefix: TAXI_DB }
    dependsOn: [postgres, redis, kafka]

  # ── Web shell and zones ────────────────────────────────────────────────────
  - name: web
    kind: web-shell
    path: apps/web
    build: { workspace: kartseek-web }
    image: kartseek/web
    ports: { http: 3000 }

  - name: marketplace-frontend
    kind: web-zone
    path: modules/marketplace/frontend
    build: { workspace: "@kartseek/marketplace-frontend" }
    image: kartseek/marketplace-frontend
    ports: { http: 3002 }
    basePath: /marketplace

  - name: grocery-frontend
    kind: web-zone
    path: modules/grocery/frontend
    build: { workspace: "@kartseek/grocery-frontend" }
    image: kartseek/grocery-frontend
    ports: { http: 3003 }
    basePath: /grocery

  - name: restaurant-frontend
    kind: web-zone
    path: modules/restaurant/frontend
    build: { workspace: "@kartseek/restaurant-frontend" }
    image: kartseek/restaurant-frontend
    ports: { http: 3004 }
    basePath: /restaurant

  - name: pharmacy-frontend
    kind: web-zone
    path: modules/pharmacy/frontend
    build: { workspace: "@kartseek/pharmacy-frontend" }
    image: kartseek/pharmacy-frontend
    ports: { http: 3005 }
    basePath: /pharmacy

  - name: doctor-frontend
    kind: web-zone
    path: modules/doctor/frontend
    build: { workspace: "@kartseek/doctor-frontend" }
    image: kartseek/doctor-frontend
    ports: { http: 3006 }
    basePath: /doctor

  - name: hotel-frontend
    kind: web-zone
    path: modules/hotel/frontend
    build: { workspace: "@kartseek/hotel-frontend" }
    image: kartseek/hotel-frontend
    ports: { http: 3007 }
    basePath: /hotel

  - name: taxi-frontend
    kind: web-zone
    path: modules/taxi/frontend
    build: { workspace: "@kartseek/taxi-frontend" }
    image: kartseek/taxi-frontend
    ports: { http: 3008 }
    basePath: /taxi

  - name: franchise-frontend
    kind: web-zone
    path: modules/franchise/frontend
    build: { workspace: "@kartseek/franchise-frontend" }
    image: kartseek/franchise-frontend
    ports: { http: 3009 }
    basePath: /franchise
```

Every port and variable name above was read from the service's `main.ts` (or the zone's `dev` script and `next.config.mjs`) on 2026-09-05; Task 2's validator re-derives them, so a transcription error fails there, not in production.

- [ ] **Step 3: Write the failing shape tests**

`scripts/registry/lib.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateShape, loadRegistry, nestEntries, webEntries } from './lib.mjs';

const nest = {
  name: 'order-service', kind: 'core-service', path: 'apps/api/apps/order-service',
  build: { workspace: 'kartseek-api', nestProject: 'order-service' }, image: 'kartseek/order-service',
  ports: { http: 3014, tcp: 4004 }, env: { http: 'ORDER_SERVICE_PORT', tcp: 'ORDER_TCP_PORT' },
  health: { live: '/health', ready: null }, database: { name: 'kartseek_db', schema: 'order', envPrefix: 'DB' },
  dependsOn: ['postgres'],
};
const zone = {
  name: 'grocery-frontend', kind: 'web-zone', path: 'modules/grocery/frontend',
  build: { workspace: '@kartseek/grocery-frontend' }, image: 'kartseek/grocery-frontend',
  ports: { http: 3003 }, basePath: '/grocery',
};
const valid = { version: 1, services: [nest, zone] };

test('a valid document has no problems', () => {
  assert.deepEqual(validateShape(valid), []);
});

test('wrong version, unknown kind and duplicate names are reported', () => {
  const doc = { version: 2, services: [nest, { ...zone, name: 'order-service', kind: 'lambda' }] };
  const problems = validateShape(doc);
  assert.ok(problems.some((p) => p.includes('version')));
  assert.ok(problems.some((p) => p.includes('kind')));
  assert.ok(problems.some((p) => p.includes('duplicate name')));
});

test('a nest entry must name an env var for every port it binds', () => {
  const bad = { ...nest, env: { http: 'ORDER_SERVICE_PORT' } };
  assert.ok(validateShape({ version: 1, services: [bad] }).some((p) => p.includes('env.tcp')));
});

test('a zone must have a basePath and a shell must not', () => {
  assert.ok(validateShape({ version: 1, services: [{ ...zone, basePath: undefined }] }).some((p) => p.includes('basePath')));
  assert.ok(validateShape({ version: 1, services: [{ ...zone, kind: 'web-shell', name: 'web' }] }).some((p) => p.includes('basePath')));
});

test('the real registry loads and splits into 26 nest and 9 web entries', () => {
  const reg = loadRegistry();
  assert.equal(nestEntries(reg).length, 26);
  assert.equal(webEntries(reg).length, 9);
});
```

- [ ] **Step 4: Run to see it fail**

Run: `node --test scripts/registry/`
Expected: FAIL — `Cannot find module './lib.mjs'`.

- [ ] **Step 5: Write `lib.mjs`**

```js
/**
 * Loader and shape rules for services.yaml, the service registry.
 * No repository I/O beyond reading the YAML; the drift checks live in
 * validate.mjs and the renderers in generate.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const KINDS = ['gateway', 'core-service', 'module-service', 'web-shell', 'web-zone'];
export const NEST_KINDS = ['gateway', 'core-service', 'module-service'];
export const WEB_KINDS = ['web-shell', 'web-zone'];
export const INFRA = ['postgres', 'redis', 'kafka', 'mongodb', 'elasticsearch'];
const PORT_KEYS = ['http', 'tcp', 'grpc'];

export class RegistryError extends Error {
  constructor(problems) {
    super(`services.yaml is malformed:\n  - ${problems.join('\n  - ')}`);
    this.problems = problems;
  }
}

export function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}

export function loadRegistry(root = repoRoot()) {
  const doc = YAML.parse(fs.readFileSync(path.join(root, 'services.yaml'), 'utf8'));
  const problems = validateShape(doc);
  if (problems.length) throw new RegistryError(problems);
  return doc;
}

export const nestEntries = (reg) => reg.services.filter((s) => NEST_KINDS.includes(s.kind));
export const webEntries = (reg) => reg.services.filter((s) => WEB_KINDS.includes(s.kind));

const isInt = (v) => Number.isInteger(v);
const isStr = (v) => typeof v === 'string' && v.length > 0;

export function validateShape(doc) {
  const problems = [];
  const bad = (m) => problems.push(m);
  if (!doc || typeof doc !== 'object') return ['document is not a mapping'];
  if (doc.version !== 1) bad(`version must be 1, got ${JSON.stringify(doc.version)}`);
  if (!Array.isArray(doc.services) || doc.services.length === 0) return [...problems, 'services must be a non-empty list'];

  const names = new Set();
  doc.services.forEach((s, i) => {
    const id = s?.name ? `services[${i}] (${s.name})` : `services[${i}]`;
    if (!isStr(s?.name) || !/^[a-z][a-z0-9-]*$/.test(s.name)) bad(`${id}: name must be lower-case kebab`);
    else if (names.has(s.name)) bad(`${id}: duplicate name`);
    names.add(s?.name);
    if (!KINDS.includes(s?.kind)) bad(`${id}: kind must be one of ${KINDS.join(', ')}`);
    if (!isStr(s?.path) || s.path.endsWith('/')) bad(`${id}: path must be a relative directory without a trailing slash`);
    if (!isStr(s?.image) || !/^kartseek\/[a-z0-9-]+$/.test(s.image)) bad(`${id}: image must look like kartseek/<name>`);
    if (!isStr(s?.build?.workspace)) bad(`${id}: build.workspace is required`);

    if (!s?.ports || typeof s.ports !== 'object' || !isInt(s.ports.http)) bad(`${id}: ports.http (integer) is required`);
    for (const k of Object.keys(s?.ports ?? {})) {
      if (!PORT_KEYS.includes(k)) bad(`${id}: unknown ports key ${k}`);
      else if (!isInt(s.ports[k])) bad(`${id}: ports.${k} must be an integer`);
    }

    if (NEST_KINDS.includes(s?.kind)) {
      if (['gateway', 'core-service'].includes(s.kind) && !isStr(s.build?.nestProject)) bad(`${id}: build.nestProject is required for ${s.kind}`);
      for (const k of Object.keys(s.ports ?? {})) if (!isStr(s.env?.[k])) bad(`${id}: env.${k} must name the variable ${k} is read from`);
      for (const k of Object.keys(s.env ?? {})) {
        if (!(k in (s.ports ?? {}))) bad(`${id}: env.${k} has no matching port`);
        else if (!/^[A-Z][A-Z0-9_]*$/.test(s.env[k])) bad(`${id}: env.${k} must be an UPPER_SNAKE variable name`);
      }
      if (!s.health || typeof s.health !== 'object') bad(`${id}: health { live, ready } is required`);
      else for (const k of ['live', 'ready']) {
        if (!(k in s.health)) bad(`${id}: health.${k} is required (string path or null)`);
        else if (s.health[k] !== null && !(isStr(s.health[k]) && s.health[k].startsWith('/'))) bad(`${id}: health.${k} must be null or a path starting with /`);
      }
      if (!('database' in s)) bad(`${id}: database is required (mapping or null)`);
      else if (s.database !== null) for (const k of ['name', 'schema', 'envPrefix']) if (!isStr(s.database?.[k])) bad(`${id}: database.${k} is required`);
      if (!Array.isArray(s.dependsOn)) bad(`${id}: dependsOn must be a list`);
      else for (const d of s.dependsOn) if (!INFRA.includes(d)) bad(`${id}: dependsOn has unknown infrastructure ${d}`);
      if (s.kafka !== undefined && !isStr(s.kafka?.groupId)) bad(`${id}: kafka.groupId must be a string when kafka is present`);
      if ('basePath' in s) bad(`${id}: basePath is only for web-zone`);
    }

    if (s?.kind === 'web-zone' && !(isStr(s.basePath) && s.basePath.startsWith('/'))) bad(`${id}: basePath starting with / is required for web-zone`);
    if (s?.kind === 'web-shell' && 'basePath' in s) bad(`${id}: basePath is not allowed on web-shell`);
  });
  return problems;
}
```

- [ ] **Step 6: Run the tests**

Run: `node --test scripts/registry/`
Expected: 5 passed. If the last test fails on counts, the registry has a typo — fix `services.yaml`, not the test.

- [ ] **Step 7: Wire the test command and commit**

Add to root `package.json` scripts: `"test:scripts": "node --test scripts/"`.

```bash
npm run test:scripts
git add services.yaml scripts/registry package.json package-lock.json
git commit -q -m "feat(registry): add services.yaml and its loader

35 deployables — 1 gateway, 17 core services, 8 module services, 1 web shell,
8 zones — with ports, env names, health paths, databases and dependencies.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: The drift validator

**Files:**
- Create: `scripts/registry/validate.mjs`, `scripts/registry/validate.test.mjs`
- Modify: root `package.json` (`registry:check`)
- Possibly modify: `infra/k8s/config.yaml`, `apps/api/.env.example`, any `main.ts` the validator proves inconsistent (see step 6)

**Interfaces:**
- Consumes: `loadRegistry`, `repoRoot`, `nestEntries`, `webEntries`, `NEST_KINDS` from `lib.mjs`; `checkGenerated(reg, root)` from `generate.mjs` (Task 3 — until then the import is guarded, see the code).
- Produces: `parseMainDefaults(text) → Map<string, number>`; `findDuplicatePorts(reg) → string[]`; `runChecks(reg, root) → string[]` (failures); CLI exit 0/1.

- [ ] **Step 1: Write the failing tests**

`scripts/registry/validate.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMainDefaults, findDuplicatePorts } from './validate.mjs';

test('parseMainDefaults reads ?? and || defaults for process.env reads', () => {
  const src = `
    const tcpPort = +(process.env.ORDER_TCP_PORT ?? 4004);
    const httpPort = +(process.env.ORDER_SERVICE_PORT ?? 3014);
    const port = process.env.API_GATEWAY_PORT || 3001;
    const other = process.env.NOT_A_PORT ?? 'x';
  `;
  assert.deepEqual([...parseMainDefaults(src)], [
    ['ORDER_TCP_PORT', 4004], ['ORDER_SERVICE_PORT', 3014], ['API_GATEWAY_PORT', 3001],
  ]);
});

test('findDuplicatePorts names both services and the port kind', () => {
  const reg = { services: [
    { name: 'a', ports: { http: 3000 } },
    { name: 'b', ports: { http: 3001, tcp: 3000 } },
  ] };
  assert.deepEqual(findDuplicatePorts(reg), ['port 3000 is bound by a (http) and b (tcp)']);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `node --test scripts/registry/validate.test.mjs`
Expected: FAIL — `Cannot find module './validate.mjs'`.

- [ ] **Step 3: Write `validate.mjs`**

```js
#!/usr/bin/env node
/**
 * Drift checks between services.yaml and the repository.
 *
 *   node scripts/registry/validate.mjs        (npm run registry:check)
 *
 * Exit 1 with one line per disagreement. The registry is the source of truth:
 * fix the file the message names, or — if the registry itself is wrong —
 * fix the registry and re-run `npm run registry:generate`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry, repoRoot, nestEntries, webEntries, NEST_KINDS } from './lib.mjs';

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

/** `process.env.NAME ?? 1234` or `process.env.NAME || 1234` → Map(NAME → 1234). */
export function parseMainDefaults(text) {
  const out = new Map();
  for (const m of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)\s*(?:\?\?|\|\|)\s*'?(\d{2,5})'?/g)) {
    if (!out.has(m[1])) out.set(m[1], Number(m[2]));
  }
  return out;
}

export function findDuplicatePorts(reg) {
  const seen = new Map();
  const dupes = [];
  for (const s of reg.services) for (const [kind, port] of Object.entries(s.ports)) {
    if (seen.has(port)) dupes.push(`port ${port} is bound by ${seen.get(port)} and ${s.name} (${kind})`);
    else seen.set(port, `${s.name} (${kind})`);
  }
  return dupes;
}

export async function runChecks(reg, root) {
  const fail = [];

  // 1. Every path exists and holds its entry file.
  for (const s of reg.services) {
    if (!exists(root, s.path)) { fail.push(`${s.name}: ${s.path} does not exist`); continue; }
    const entry = NEST_KINDS.includes(s.kind) ? 'src/main.ts' : 'next.config.mjs';
    if (!exists(root, `${s.path}/${entry}`)) fail.push(`${s.name}: ${s.path}/${entry} is missing`);
  }

  // 2. Coverage both ways: nest-cli applications, modules/*/{backend,frontend}, apps/web.
  const nestCli = JSON.parse(read(root, 'apps/api/nest-cli.json'));
  const cliApps = Object.entries(nestCli.projects).filter(([, p]) => p.type === 'application').map(([n]) => n);
  const regApps = reg.services.filter((s) => ['gateway', 'core-service'].includes(s.kind)).map((s) => s.build.nestProject);
  for (const a of cliApps) if (!regApps.includes(a)) fail.push(`apps/api/nest-cli.json project ${a} has no registry entry`);
  for (const a of regApps) if (!cliApps.includes(a)) fail.push(`registry nestProject ${a} is not an application in apps/api/nest-cli.json`);
  const modules = fs.readdirSync(path.join(root, 'modules'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const m of modules) for (const side of ['backend', 'frontend']) {
    const p = `modules/${m}/${side}`;
    if (exists(root, p) && !reg.services.some((s) => s.path === p)) fail.push(`${p} has no registry entry`);
  }
  if (!reg.services.some((s) => s.path === 'apps/web')) fail.push('apps/web has no registry entry');

  // 3. main.ts defaults, zone dev ports and basePaths.
  for (const s of nestEntries(reg)) {
    if (!exists(root, `${s.path}/src/main.ts`)) continue;
    const defaults = parseMainDefaults(read(root, `${s.path}/src/main.ts`));
    for (const [kind, envName] of Object.entries(s.env)) {
      const found = defaults.get(envName);
      if (found === undefined) fail.push(`${s.name}: src/main.ts never defaults ${envName} (registry: ${s.ports[kind]})`);
      else if (found !== s.ports[kind]) fail.push(`${s.name}: src/main.ts defaults ${envName} to ${found}, registry says ${s.ports[kind]}`);
    }
  }
  for (const s of webEntries(reg)) {
    const pkg = JSON.parse(read(root, `${s.path}/package.json`));
    const m = /-p\s+(\d+)/.exec(pkg.scripts?.dev ?? '');
    if (!m) fail.push(`${s.name}: package.json dev script has no "-p <port>"`);
    else if (Number(m[1]) !== s.ports.http) fail.push(`${s.name}: dev script uses port ${m[1]}, registry says ${s.ports.http}`);
    if (s.kind === 'web-zone') {
      const bp = /basePath:\s*'([^']+)'/.exec(read(root, `${s.path}/next.config.mjs`));
      if (!bp) fail.push(`${s.name}: next.config.mjs declares no basePath`);
      else if (bp[1] !== s.basePath) fail.push(`${s.name}: next.config.mjs basePath ${bp[1]}, registry says ${s.basePath}`);
    }
  }

  // 4. .env.example defaults — only variables the registry names.
  const envFiles = ['apps/api/.env.example', ...modules.map((m) => `modules/${m}/backend/.env.example`)].filter((f) => exists(root, f));
  const envDefaults = new Map();
  for (const f of envFiles) for (const line of read(root, f).split('\n')) {
    const m = /^([A-Z][A-Z0-9_]*)=(\d+)\s*$/.exec(line);
    if (m && !envDefaults.has(m[1])) envDefaults.set(m[1], { value: Number(m[2]), file: f });
  }
  for (const s of nestEntries(reg)) for (const [kind, envName] of Object.entries(s.env)) {
    const d = envDefaults.get(envName);
    if (d && d.value !== s.ports[kind]) fail.push(`${d.file}: ${envName}=${d.value}, registry says ${s.ports[kind]}`);
  }

  // 5. Kubernetes ConfigMap ports.
  if (exists(root, 'infra/k8s/config.yaml')) {
    const cm = read(root, 'infra/k8s/config.yaml');
    for (const s of nestEntries(reg)) {
      const m = new RegExp(`^\\s*${s.env.http}:\\s*"?(\\d+)"?\\s*$`, 'm').exec(cm);
      if (m && Number(m[1]) !== s.ports.http) fail.push(`infra/k8s/config.yaml: ${s.env.http}=${m[1]}, registry says ${s.ports.http}`);
    }
  }

  // 6. Uniqueness.
  fail.push(...findDuplicatePorts(reg));
  const groups = new Map();
  for (const s of reg.services) {
    const g = s.kafka?.groupId; if (!g) continue;
    if (groups.has(g)) fail.push(`kafka groupId ${g} is shared by ${groups.get(g)} and ${s.name}`);
    groups.set(g, s.name);
  }

  // 7. Generated artifacts are current (generate.mjs lands in Task 3; skip if absent).
  if (exists(root, 'scripts/registry/generate.mjs')) {
    const { checkGenerated } = await import('./generate.mjs');
    fail.push(...checkGenerated(reg, root));
  }
  return fail;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = repoRoot();
  const reg = loadRegistry(root);
  const failures = await runChecks(reg, root);
  for (const f of failures) console.error(`✗ ${f}`);
  console.log(failures.length ? `${failures.length} problem(s)` : `services.yaml agrees with the repository (${reg.services.length} entries)`);
  process.exit(failures.length ? 1 : 0);
}
```

- [ ] **Step 4: Run the unit tests**

Run: `node --test scripts/registry/validate.test.mjs`
Expected: 2 passed.

- [ ] **Step 5: Wire the command and run it against the repository**

Add to root `package.json` scripts: `"registry:check": "node scripts/registry/validate.mjs"`.

Run: `npm run registry:check`
Expected on first run: either `services.yaml agrees with the repository (35 entries)` or a short list of disagreements.

- [ ] **Step 6: Resolve every disagreement at its source**

For each line printed:
- `src/main.ts defaults X to A, registry says B` → the registry was transcribed from that same file on 2026-09-05, so this means the file changed; read it and correct the registry to the code.
- `infra/k8s/config.yaml: X=A, registry says B` → the ConfigMap is wrong (it was hand-maintained); change it to B.
- `.env.example: X=A, registry says B` → the example is wrong; change it to B.
- `port N is bound by …` → a real collision; the code must change. Stop and report rather than picking a new port silently.

Re-run until clean. Each edited file is part of this task's commit.

- [ ] **Step 7: Commit**

```bash
npm run test:scripts && npm run registry:check
git add -A && git commit -q -m "feat(registry): validate main.ts defaults, env examples and the k8s ConfigMap against services.yaml

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: The generator — services table and README blocks

**Files:**
- Create: `scripts/registry/generate.mjs`, `scripts/registry/generate.test.mjs`, `docs/architecture/services.md` (generated)
- Modify: root `package.json` (`registry:generate`)

**Interfaces:**
- Produces: `renderServicesTable(reg) → string` (whole file), `renderReadmeBlock(entry) → string` (content between markers, without the markers), `replaceBlock(markdown, block) → string | null` (null when markers are absent), `generateAll(reg, root, { check }) → { written: string[], skipped: string[], stale: string[] }`, `checkGenerated(reg, root) → string[]` (stale-file messages for the validator). Markers: `<!-- registry:start -->` and `<!-- registry:end -->` on their own lines.

- [ ] **Step 1: Write the failing tests**

`scripts/registry/generate.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReadmeBlock, replaceBlock, renderServicesTable } from './generate.mjs';

const order = {
  name: 'order-service', kind: 'core-service', path: 'apps/api/apps/order-service', image: 'kartseek/order-service',
  build: { workspace: 'kartseek-api', nestProject: 'order-service' },
  ports: { http: 3014, tcp: 4004, grpc: 5002 }, env: { http: 'ORDER_SERVICE_PORT', tcp: 'ORDER_TCP_PORT', grpc: 'ORDER_GRPC_PORT' },
  health: { live: '/health', ready: '/health/ready' }, database: { name: 'kartseek_db', schema: 'order', envPrefix: 'DB' },
  dependsOn: ['postgres', 'redis'],
};
const zone = { name: 'grocery-frontend', kind: 'web-zone', path: 'modules/grocery/frontend', image: 'kartseek/grocery-frontend',
  build: { workspace: '@kartseek/grocery-frontend' }, ports: { http: 3003 }, basePath: '/grocery' };

test('renderReadmeBlock lists every port with its variable, then database and dependencies', () => {
  const block = renderReadmeBlock(order);
  assert.match(block, /\| HTTP \| 3014 \| `ORDER_SERVICE_PORT` \|/);
  assert.match(block, /\| TCP \(message patterns\) \| 4004 \| `ORDER_TCP_PORT` \|/);
  assert.match(block, /\| gRPC \| 5002 \| `ORDER_GRPC_PORT` \|/);
  assert.match(block, /Database: `kartseek_db`, schema `order` \(`DB_\*`\)/);
  assert.match(block, /Depends on: postgres, redis/);
  assert.match(block, /Health: `\/health` \(live\), `\/health\/ready` \(ready\)/);
});

test('renderReadmeBlock for a zone gives port, base path and image', () => {
  const block = renderReadmeBlock(zone);
  assert.match(block, /\| HTTP \| 3003 \|/);
  assert.match(block, /Mounted by the shell at `\/grocery`/);
  assert.match(block, /Image: `kartseek\/grocery-frontend`/);
});

test('replaceBlock swaps the content between markers and keeps everything else', () => {
  const md = '# T\n\n<!-- registry:start -->\nold\n<!-- registry:end -->\n\ntail\n';
  assert.equal(replaceBlock(md, 'new'), '# T\n\n<!-- registry:start -->\nnew\n<!-- registry:end -->\n\ntail\n');
  assert.equal(replaceBlock('# no markers\n', 'new'), null);
});

test('renderServicesTable has one row per entry and a generated header', () => {
  const table = renderServicesTable({ services: [order, zone] });
  assert.match(table, /^<!-- GENERATED by scripts\/registry\/generate\.mjs from services\.yaml — do not edit -->/);
  assert.equal((table.match(/^\| `/gm) || []).length, 2);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `node --test scripts/registry/generate.test.mjs`
Expected: FAIL — `Cannot find module './generate.mjs'`.

- [ ] **Step 3: Write `generate.mjs`**

```js
#!/usr/bin/env node
/**
 * Renders everything derived from services.yaml.
 *
 *   node scripts/registry/generate.mjs           write (npm run registry:generate)
 *   node scripts/registry/generate.mjs --check   exit 1 if anything is stale
 *
 * Outputs: docs/architecture/services.md (whole file) and the block between
 * <!-- registry:start --> / <!-- registry:end --> in every entry's README.md.
 * A README without markers is skipped and listed, not created.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry, repoRoot, NEST_KINDS } from './lib.mjs';

export const START = '<!-- registry:start -->';
export const END = '<!-- registry:end -->';
const HEADER = '<!-- GENERATED by scripts/registry/generate.mjs from services.yaml — do not edit -->';
const KIND_LABEL = { gateway: 'API gateway', 'core-service': 'core service', 'module-service': 'module service', 'web-shell': 'web shell', 'web-zone': 'web zone' };

const code = (v) => (v == null ? '—' : `\`${v}\``);

export function renderReadmeBlock(s) {
  const lines = [
    '_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._',
    '',
    '| Purpose | Port | Environment variable |',
    '| --- | --- | --- |',
    `| HTTP | ${s.ports.http} | ${s.env?.http ? code(s.env.http) : '—'} |`,
  ];
  if (s.ports.tcp) lines.push(`| TCP (message patterns) | ${s.ports.tcp} | ${code(s.env.tcp)} |`);
  if (s.ports.grpc) lines.push(`| gRPC | ${s.ports.grpc} | ${code(s.env.grpc)} |`);
  lines.push('');
  if (NEST_KINDS.includes(s.kind)) {
    lines.push(`Health: ${s.health.live ? `${code(s.health.live)} (live)` : 'no HTTP health route yet'}${s.health.ready ? `, ${code(s.health.ready)} (ready)` : ''}.`);
    lines.push(s.database ? `Database: ${code(s.database.name)}, schema ${code(s.database.schema)} (${code(`${s.database.envPrefix}_*`)}).` : 'Database: none (owns no tables).');
    lines.push(`Image: ${code(s.image)}. Depends on: ${s.dependsOn.join(', ') || 'nothing'}.${s.kafka ? ` Kafka group: ${code(s.kafka.groupId)}.` : ''}`);
  } else {
    lines.push(s.kind === 'web-zone' ? `Mounted by the shell at ${code(s.basePath)}; open it through http://localhost:3000${s.basePath}.` : 'The shell: serves the top-level routes and rewrites each vertical path to its zone.');
    lines.push(`Image: ${code(s.image)}. Workspace: ${code(s.build.workspace)}.`);
  }
  return lines.join('\n');
}

export function replaceBlock(markdown, block) {
  const a = markdown.indexOf(START), b = markdown.indexOf(END);
  if (a === -1 || b === -1 || b < a) return null;
  return markdown.slice(0, a + START.length) + '\n' + block + '\n' + markdown.slice(b);
}

export function renderServicesTable(reg) {
  const rows = reg.services.map((s) => {
    const db = NEST_KINDS.includes(s.kind) ? (s.database ? `${s.database.name} / ${s.database.schema}` : '—') : '—';
    const health = NEST_KINDS.includes(s.kind) ? (s.health.live ?? '—') : s.basePath ?? '/';
    return `| ${code(s.name)} | ${KIND_LABEL[s.kind]} | ${code(s.path)} | ${s.ports.http} | ${s.ports.tcp ?? '—'} | ${s.ports.grpc ?? '—'} | ${db} | ${code(health)} | ${(s.dependsOn ?? []).join(', ') || '—'} |`;
  });
  return [
    HEADER,
    '',
    '# Services',
    '',
    `${reg.services.length} deployables, declared in [\`services.yaml\`](../../services.yaml). Ports are the local defaults; each is read from the environment variable named in the deployable's README.`,
    '',
    '| Name | Kind | Path | HTTP | TCP | gRPC | Database / schema | Health or base path | Depends on |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

function writeAtomic(file, content) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

export function generateAll(reg, root, { check = false } = {}) {
  const result = { written: [], skipped: [], stale: [] };
  const targets = [
    { rel: 'docs/architecture/services.md', next: () => renderServicesTable(reg), whole: true },
    ...reg.services.map((s) => ({ rel: `${s.path}/README.md`, next: (cur) => replaceBlock(cur, renderReadmeBlock(s)), whole: false })),
  ];
  for (const t of targets) {
    const file = path.join(root, t.rel);
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (!t.whole && current === null) { result.skipped.push(`${t.rel} (no README yet)`); continue; }
    const next = t.whole ? t.next() : t.next(current);
    if (next === null) { result.skipped.push(`${t.rel} (no ${START} markers)`); continue; }
    if (next === current) continue;
    if (check) result.stale.push(`${t.rel} is stale — run npm run registry:generate`);
    else { fs.mkdirSync(path.dirname(file), { recursive: true }); writeAtomic(file, next); result.written.push(t.rel); }
  }
  return result;
}

export const checkGenerated = (reg, root) => generateAll(reg, root, { check: true }).stale;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const root = repoRoot();
  const r = generateAll(loadRegistry(root), root, { check });
  for (const w of r.written) console.log(`wrote   ${w}`);
  for (const s of r.skipped) console.log(`skipped ${s}`);
  for (const s of r.stale) console.error(`✗ ${s}`);
  if (!check) console.log(`${r.written.length} file(s) written, ${r.skipped.length} skipped`);
  process.exit(r.stale.length ? 1 : 0);
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/registry/`
Expected: 11 passed (5 + 2 + 4).

- [ ] **Step 5: Generate, then prove idempotence and the check mode**

Add to root `package.json` scripts: `"registry:generate": "node scripts/registry/generate.mjs"`.

```bash
npm run registry:generate
npm run registry:generate | tail -1
node scripts/registry/generate.mjs --check && echo CHECK-OK
npm run registry:check
head -12 docs/architecture/services.md
```
Expected: first run writes `docs/architecture/services.md` and skips 35 READMEs (none has markers yet — plan 1C adds them); second run prints `0 file(s) written`; `CHECK-OK`; the validator's check 7 passes; the table shows 35 rows.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -q -m "feat(registry): generate the services table and README port blocks from services.yaml

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: The smoke test — boot all 26 and probe health

**Files:**
- Create: `tests/smoke/boot-all.mjs`
- Modify: `.gitignore` (`tests/smoke/logs/`), root `package.json` (`smoke`)

**Interfaces:**
- Consumes: `loadRegistry`, `repoRoot`, `nestEntries` from `scripts/registry/lib.mjs`; the build output layout (`apps/api/dist/apps/<nestProject>/main.js`, `modules/<m>/backend/dist/main.js`); each service's `.env` in its working directory (Nest's `ConfigModule` reads `.env` from `process.cwd()`; module backends also fall back to `../../../apps/api/.env`).
- Produces: `npm run smoke [-- --only=a,b] ` → a table and exit code; per-service logs in `tests/smoke/logs/<name>.log`.

- [ ] **Step 1: Write the script**

`tests/smoke/boot-all.mjs`:

```js
#!/usr/bin/env node
/**
 * Boot every Nest deployable from its built output and probe its health.
 *
 *   npm run build                # once — this script runs dist/, it does not compile
 *   npm run infra:up             # Postgres, Redis, Kafka, MongoDB must be reachable
 *   npm run smoke                # all 26
 *   npm run smoke -- --only=order-service,marketplace-service
 *
 * Services start in batches (SMOKE_BATCH, default 6) so a laptop is not asked
 * for 26 Node processes at once — under contention a healthy service looks
 * like a broken one. Each is given SMOKE_TIMEOUT_MS (default 90000) to answer
 * its registry `health.live` route with 200; a service with no HTTP health
 * route yet (live: null) passes when its HTTP port accepts a TCP connection,
 * which is what the Kubernetes probes do for it today. Every service's stdout
 * and stderr go to tests/smoke/logs/<name>.log. Exit 1 if any service fails.
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { loadRegistry, repoRoot, nestEntries } from '../../scripts/registry/lib.mjs';

const root = repoRoot();
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 90_000);
const BATCH = Number(process.env.SMOKE_BATCH ?? 6);
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').filter(Boolean) : null;
const logDir = path.join(root, 'tests/smoke/logs');
fs.mkdirSync(logDir, { recursive: true });

function launchSpec(s) {
  const core = s.kind !== 'module-service';
  const cwd = path.join(root, core ? 'apps/api' : s.path);
  const script = core ? path.join('dist', 'apps', s.build.nestProject, 'main.js') : path.join('dist', 'main.js');
  return { cwd, script };
}

function launch(s) {
  const { cwd, script } = launchSpec(s);
  if (!fs.existsSync(path.join(cwd, script))) {
    throw new Error(`${s.name}: ${path.join(cwd, script)} is missing — run \`npm run build\` first`);
  }
  const log = fs.openSync(path.join(logDir, `${s.name}.log`), 'w');
  const child = spawn(process.execPath, [script], { cwd, env: process.env, stdio: ['ignore', log, log], windowsHide: true });
  child.on('exit', () => fs.closeSync(log));
  return child;
}

async function probeOnce(s) {
  if (s.health.live) {
    try {
      const res = await fetch(`http://127.0.0.1:${s.ports.http}${s.health.live}`, { signal: AbortSignal.timeout(2000) });
      return res.status === 200 ? 'ok' : `HTTP ${res.status}`;
    } catch { return null; }
  }
  return new Promise((resolve) => {
    const sock = net.connect(s.ports.http, '127.0.0.1');
    sock.once('connect', () => { sock.destroy(); resolve('ok (tcp)'); });
    sock.once('error', () => resolve(null));
  });
}

async function waitHealthy(s, child) {
  const t0 = Date.now();
  while (Date.now() - t0 < TIMEOUT_MS) {
    if (child.exitCode !== null) return { status: `exited ${child.exitCode}`, ms: Date.now() - t0 };
    // Any answer ends the wait: `ok`, `ok (tcp)`, or a non-200 status. Nest mounts
    // every route before it listens, so a 404 here is a wrong path, not "not yet".
    const r = await probeOnce(s);
    if (r) return { status: r, ms: Date.now() - t0 };
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { status: 'timeout', ms: TIMEOUT_MS };
}

function stop(child) {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') { try { execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' }); } catch {} }
  else { try { child.kill('SIGTERM'); } catch {} }
}

const entries = nestEntries(loadRegistry(root)).filter((s) => !only || only.includes(s.name));
if (only && entries.length !== only.length) {
  console.error(`unknown service in --only: ${only.filter((n) => !entries.some((e) => e.name === n)).join(', ')}`);
  process.exit(2);
}

const results = [];
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH);
  const children = batch.map((s) => [s, launch(s)]);
  const settled = await Promise.all(children.map(async ([s, c]) => [s, await waitHealthy(s, c)]));
  for (const [, c] of children) stop(c);
  results.push(...settled);
  await new Promise((r) => setTimeout(r, 500));
}

const pad = (v, n) => String(v).padEnd(n);
console.log(`\n${pad('service', 24)} ${pad('port', 6)} ${pad('probe', 26)} ${pad('result', 14)} time`);
let failed = 0;
for (const [s, r] of results) {
  const ok = r.status.startsWith('ok');
  if (!ok) failed++;
  console.log(`${pad(s.name, 24)} ${pad(s.ports.http, 6)} ${pad(s.health.live ?? '(tcp connect)', 26)} ${pad(ok ? r.status : `FAIL ${r.status}`, 14)} ${(r.ms / 1000).toFixed(1)}s${ok ? '' : `   → tests/smoke/logs/${s.name}.log`}`);
}
console.log(`\n${results.length - failed}/${results.length} healthy`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Ignore the logs and wire the command**

Append to `.gitignore`:

```gitignore
# Smoke-test output (tests/smoke/boot-all.mjs).
tests/smoke/logs/
```

Add to root `package.json` scripts: `"smoke": "node tests/smoke/boot-all.mjs"`.

- [ ] **Step 3: Run it against two services first, then all**

```bash
npm run build
npm run infra:up
npm run smoke -- --only=order-service,marketplace-service
npm run smoke
```
Expected: the first run prints two `ok` rows; the second prints 26 rows, `26/26 healthy`, with `user-service` and `franchise-service` showing `ok (tcp)`.

If a service fails, open `tests/smoke/logs/<name>.log`. Common causes and what they mean:
- `UnknownDependenciesException` / `can't resolve dependencies` → a root-module rename from plan 1A missed an import; fix the service, rebuild that project, rerun with `--only`.
- `EADDRINUSE` → a `dev:*` process is still running; stop it.
- `ECONNREFUSED` to Postgres/Redis/Kafka → infrastructure is not up or `.env` in that service's working directory points elsewhere.
- Timeout with no error in the log → raise `SMOKE_TIMEOUT_MS` once to rule out a slow first Kafka join; if it still times out, the health route is not where the registry says — check the controller prefix and fix the registry.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -q -m "test(smoke): boot every Nest deployable from dist and probe its health route

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Wire-up, README rows and the 1B gate

**Files:**
- Modify: `scripts/README.md` (two rows), `tests/README.md` is written in plan 1C — nothing here

- [ ] **Step 1: Add the registry rows to `scripts/README.md`**

Insert after the `check-type-imports.js` row:

```markdown
| `registry/validate.mjs` | Drift check between `services.yaml` and the repository: paths, `main.ts` port defaults, `.env.example`, the k8s ConfigMap, port uniqueness, generated files. Runs in the gate and in CI. | `npm run registry:check` |
| `registry/generate.mjs` | Renders `docs/architecture/services.md` and the `<!-- registry:start -->` block in every workspace README from `services.yaml`. `--check` exits 1 when stale. | `npm run registry:generate` |
```

and after the table:

```markdown
Tests for these scripts use Node's built-in runner: `npm run test:scripts`.
```

- [ ] **Step 2: Gate**

```bash
npm run test:scripts
npm run registry:check
npm run type-check && npm run lint && npm run build && npm test
npm run smoke
git status --short
```
Expected: all green, `26/26 healthy`, and only `scripts/README.md` modified.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -q -m "docs(scripts): describe the registry commands

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
