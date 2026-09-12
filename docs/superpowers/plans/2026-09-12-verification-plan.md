# Verification & Evidence Implementation Plan (VERIFICATION / TESTS workstream)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This plan runs LAST.** It consumes what REGIONAL, INFRA, MODULES, CONSOLE, TAXI and EVENTS produced. Every **Interfaces** entry marked _(assumed)_ names a symbol, script or profile whose owning plan was not yet written when this file was authored — confirm each one against the sibling plan before starting the task that consumes it, and record any rename in the task's step 1.

**Goal:** one command set proves the platform. `npm run verify:all` runs every unit suite, every build gate, every static census and every live proof against real services, and writes a machine-readable evidence file (`docs/audits/evidence/<date>.json`) plus a Markdown summary. The final completion report is **generated from that file**, not written by hand — so no section of it can claim something the run did not observe.

**Architecture:** Three layers, each with its own gate.

1. **Static** — specs and censuses that need no running service: the vitest/jest suites, `nest build --all`, `next build`, `admin-console-census.mjs`, the widened market-scope regression spec, and a new gateway↔backend command-drift check. These run first because they are fast and because a broken build reads as "all ok" to every live probe downstream (`project_responsive_audit_harness`).
2. **Live, host-run** — a temporary gateway built from `dist` on `API_GATEWAY_PORT=3099` with `DEV_AUTH_BYPASS=false`, driven by `.mjs` probes that carry real staff tokens: `admin-scope-authz`, `regional-isolation-authz`, the new `regional-matrix`, `api-error-matrix`, `cache-isolation` and `db-readiness`. Port 3099 keeps the proofs off the developer's own `--watch` fleet on 3001, whose restarts read as outages (`project_dev_watch_restart_gotcha`).
3. **Containerised** — the Docker `admin` profile brought up by the INFRA plan, driven by Playwright through the real console at `http://localhost:3000`, asserting the network responses **and** the rows those requests wrote in Postgres/Mongo/Redis through `docker exec`. This is the only layer that proves the mandate's chain end to end: Browser → Admin Frontend → API Gateway → Backend Service → PostgreSQL/MongoDB → Redis → events → response → UI.

Every layer writes one JSON fragment into the evidence file. `verify:all` merges the fragments, applies the gates, and exits non-zero on the first hard failure — but it runs **every** suite first, so one red suite never hides the other twelve.

**Tech Stack:** Node 26 (`node:` builtins only), vitest 4 (`apps/api`, the 8 module backends), jest 30 + Testing Library (`apps/web`), `@playwright/test` 1.61 already in `apps/web` (browsers are **not** installed — drive system Chrome with `channel: 'chrome'`, per `project_marketplace_mobile_verification`), `pg` and `ioredis` from `apps/api`'s dependencies, `mongoose`'s bundled driver for Mongo, plain `fetch` for Elasticsearch and every HTTP probe. **No new dependency is added by this plan.** `newman` is absent from every workspace manifest and is therefore gated, never assumed (Task 7).

## Global Constraints

- **"Do not mark functionality complete without testing the real workflow."**
- Every live probe sends a real staff token. `DEV_AUTH_BYPASS=true` makes an anonymous local request a **SUPER_ADMIN**, so an unauthenticated probe passes vacuously and proves nothing (`project_dev_auth_bypass_masks_probes`, audit V15). The temp gateway runs with `DEV_AUTH_BYPASS=false` and `DEV_MFA_ECHO=true`; the only request in the whole suite that omits an `Authorization` header is the deliberate 401 row.
- The temp gateway runs on `API_GATEWAY_PORT=3099` **from `dist`** (`node dist/apps/api-gateway/main.js`) for every host-run proof; the Docker `admin` profile serves the container E2E. Never point a proof at a `nest start --watch` process.
- Accounts: `qa-admin@kartseek.com` (QA-locked), `india-admin@kartseek.com` (IN-locked), `superadmin@kartseek.com`, `admin@kartseek.com`; password `AdminPass123!`; MFA completed through the echoed `devCode` on the login response.
- **Never mutate seed data without restoring it.** A probe that must write creates its own fixture through the API as superadmin and deletes it in a `finally`. A probe that cannot create a fixture is `SKIPPED` with the reason named — never silently passed.
- An empty list is never a pass. Every "market X only" assertion also asserts `rows.length > 0`; an empty result is `SKIPPED` (audit §13 X-57). Every denial assertion is paired with a control that must succeed (audit §13 X-56).
- `nest build --all` is the build gate for `apps/api`, not `tsc` (`project_rspack_builder_migration`). `next build` is the gate for `apps/web`.
- Drive the web app at `localhost`, never `127.0.0.1` (`project_web_verification_gotchas`).
- Commits: one per task, message **lower-case, ≤ 100 characters**, ending with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Commit `apps/api`, `apps/web` and root-script changes in separate commits where a task touches more than one.
- Branch: `feat/admin-platform-upgrade`.

---

## File structure

| File                                                                                  | Responsibility                                                                                                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts` (modify) | collect every `*.controller.ts`, select by `@Roles(ADMIN)` — not by filename (AUD2-066)                                              |
| `apps/api/scripts/check-admin-commands.mjs` (new)                                     | gateway `send(cmd)` vs backend `@MessagePattern` drift; fails on any unhandled command (AUD2-135)                                    |
| `apps/api/scripts/verification/lib/probe.mjs` (new)                                   | shared `login()`, `call()`, `listOf()`, `Recorder` — one copy instead of five                                                        |
| `apps/api/scripts/verification/regional-matrix.rows.json` (new)                       | audit §13 E.1–E.4 as data: one object per request                                                                                    |
| `apps/api/scripts/verification/regional-matrix.mjs` (new)                             | runs the rows, bootstraps and tears down its fixtures (AUD2-134)                                                                     |
| `apps/api/scripts/verification/api-error-matrix.mjs` (new)                            | one real request per status class, 400…503 + network + timeout                                                                       |
| `apps/api/apps/api-gateway/src/controllers/fault-injection.controller.ts` (new)       | `/admin/__fault/*`, registered only under `ALLOW_FAULT_INJECTION=true`                                                               |
| `apps/api/apps/api-gateway/src/controllers/fault-injection.controller.spec.ts` (new)  | proves the fault routes do not exist without the flag                                                                                |
| `apps/web/src/components/admin/__tests__/api-error-states.spec.tsx` (new)             | jest render specs: each status → the console state it must show                                                                      |
| `apps/api/scripts/verification/cache-isolation.mjs` (new)                             | live write-as-A / read-as-B across 10 surfaces + invalidation on a market-setting change                                             |
| `apps/api/test/cache-key-market.spec.ts` (new)                                        | static: every market-dimensioned Redis key template carries the market on **both** sides                                             |
| `apps/api/scripts/verification/db-readiness.mjs` (new)                                | audit §6 readiness as a script: 9 Postgres, Mongo, Redis, Elasticsearch                                                              |
| `apps/web/e2e/admin/*.spec.ts` (new, 4 files)                                         | Super Admin + Regional A/B journeys against the containerised console                                                                |
| `apps/web/e2e/admin/helpers/{auth,db,frame}.ts` (new)                                 | MFA login, `docker exec` datastore queries, responsive screenshots                                                                   |
| `apps/web/playwright.admin.config.ts` (new)                                           | `channel: 'chrome'`, four widths, no `webServer` (the stack is already up)                                                           |
| `tests/postman/collections/05-admin-panel.postman_collection.json` (modify)           | real routes, `pm.test` assertions, regional folders                                                                                  |
| `scripts/verify/verify-all.mjs` (new)                                                 | the orchestrator; writes `docs/audits/evidence/<date>.json` + `.md`                                                                  |
| `scripts/verify/gates.mjs` (new)                                                      | the pass/fail rules, in one readable table                                                                                           |
| `scripts/report/completion-report.mjs` (new)                                          | renders the A–L report from the evidence file + `aud2-status.json`                                                                   |
| `docs/audits/evidence/aud2-status.json` (new)                                         | per-AUD2-id ruling the executor maintains: PASS / FIXED / REMAINING                                                                  |
| `package.json` (modify)                                                               | `verify:all`, `verify:regional-matrix`, `verify:errors`, `verify:cache`, `db:readiness`, `check:admin-commands`, `report:completion` |

---

### Task 1 (V1): The scope regression spec sees every admin route, and a command-drift check joins the build

**Closes:** AUD2-066, AUD2-135.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts` (the collector, ~line 90)
- Create: `apps/api/scripts/check-admin-commands.mjs`
- Modify: `apps/api/package.json` (add `check:admin-commands`), `package.json` (root passthrough)

**Interfaces:**

- Consumes: `@GlobalEntity(reason)` and `scopeOf`/`resolveMarket` from Plan A (landed); the REGIONAL plan's new scoped controllers _(assumed: same decorators, no new opt-out mechanism)_.
- Produces: `check-admin-commands.mjs` exits 1 and prints `cmd → no handler` lines; consumed by `verify:all` (Task 8) as the `commandDrift` fragment.

- [ ] **Step 1: See the hole before closing it**

The spec's collector today admits only `admin-*.controller.ts` and `ddos-admin.controller.ts`, so 182 admin-reachable routes in eight other controllers never reach the assertion. Confirm the current blind spot:

```bash
cd /c/KARTSEEKAPP/apps/api
grep -n "controller.ts" apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts | head
npx vitest run apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts
```

Expected: PASS today — that is the bug. Record the current route count printed by the spec.

- [ ] **Step 2: Widen the collector to every controller, selected by role not by filename**

Replace the filename filter with a full walk plus a role test:

```ts
/**
 * Every controller, not every file whose name starts with `admin-`.
 *
 * The previous collector matched `/^(admin-.*|ddos-admin)\.controller\.ts$/`,
 * which is a naming convention, not a security boundary: 182 routes carrying
 * `@Roles(UserRole.ADMIN)` lived in controllers named for their domain
 * (`marketplace.controller.ts`, `taxi.controller.ts`, `sellers.controller.ts`,
 * …) and were invisible to this spec. A route is in scope because an admin can
 * reach it, so select on the role.
 */
const ADMIN_ROLE = /@Roles\([^)]*(UserRole\.(SUPER_ADMIN|ADMIN)|'(SUPER_ADMIN|ADMIN)')/;

function controllerFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.next'].includes(e.name)) continue;
      controllerFiles(f, out);
    } else if (e.name.endsWith('.controller.ts') && !e.name.endsWith('.spec.ts')) {
      out.push(f);
    }
  }
  return out;
}
```

and in `collectRoutes()`, keep a route when **either** its path starts with `/admin` **or** its class block or route block matches `ADMIN_ROLE`:

```ts
const adminReachable =
  routePath.startsWith('/admin') || ADMIN_ROLE.test(classBlock) || ADMIN_ROLE.test(block);
if (!adminReachable) continue;
```

- [ ] **Step 3: Run it and expect a long failure list**

```bash
npx vitest run apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts
```

Expected: FAIL, listing every newly-visible route that carries neither a scope helper nor `@GlobalEntity`. **Do not weaken the spec to make it pass.** Each line is either a REGIONAL-plan route that must already be scoped (if it is not, that plan is incomplete — report it and stop) or a route that is legitimately market-free and needs `@GlobalEntity('<reason>')`. Annotate only the genuinely global ones, then re-run to green.

- [ ] **Step 4: Write the command-drift check**

`apps/api/scripts/check-admin-commands.mjs`:

```js
#!/usr/bin/env node
/* global process, console */
/**
 * check-admin-commands.mjs — every command the gateway sends has a handler.
 *
 *   node apps/api/scripts/check-admin-commands.mjs [--json out.json]
 *
 * The gateway's `send(cmd, payload, fallback)` answers 200 with invented data
 * when no backend `@MessagePattern` matches (project_gateway_rpc_fallback), so
 * a misspelled or never-implemented command is indistinguishable from a working
 * one at the HTTP layer. That is how 75 unhandled commands and the
 * `admin.hotel.*` naming split survived eight audits. This is a static join, so
 * it needs nothing running.
 *
 * Two failure modes are reported separately, because the fixes differ:
 *   MISSING  — no handler anywhere: the feature is not implemented.
 *   MISROUTED— a handler exists, but in a service the gateway does not inject
 *              for that controller (project_gateway_command_ownership).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');

function walk(dir, test, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.next', 'coverage'].includes(e.name)) continue;
      walk(f, test, out);
    } else if (test(f)) out.push(f);
  }
  return out;
}

/** Strip comments and template literals so a commented-out cmd is not counted. */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

/** Resolve `PATTERNS.FOO` style constants from the contracts files. */
function patternConstants() {
  const map = new Map();
  for (const f of walk(path.join(ROOT, 'apps/api/apps/api-gateway/src/contracts'), (f) =>
    f.endsWith('.ts'),
  )) {
    const src = strip(fs.readFileSync(f, 'utf8'));
    const objs = src.matchAll(/export const (\w+)\s*=\s*\{([\s\S]*?)\n\}/g);
    for (const [, objName, body] of objs) {
      for (const [, key, val] of body.matchAll(/(\w+)\s*:\s*'([^']+)'/g)) {
        map.set(`${objName}.${key}`, val);
      }
    }
  }
  return map;
}

const CONSTS = patternConstants();
const literal = (expr) => {
  const t = expr.trim();
  const q = t.match(/^'([^']+)'$/);
  if (q) return q[1];
  return CONSTS.get(t) ?? null;
};

// ── what the gateway sends ───────────────────────────────────────────────────
const sent = [];
for (const f of walk(path.join(ROOT, 'apps/api/apps/api-gateway/src'), (f) =>
  f.endsWith('.controller.ts'),
)) {
  const src = strip(fs.readFileSync(f, 'utf8'));
  for (const m of src.matchAll(/\{\s*cmd\s*:\s*([^}]+?)\s*\}/g)) {
    const cmd = literal(m[1]);
    if (cmd) sent.push({ cmd, file: rel(f) });
  }
  // `this.send('admin_users_list', …)` — the thin wrapper most controllers use.
  for (const m of src.matchAll(/\.send\(\s*'([a-zA-Z0-9_.]+)'/g)) {
    sent.push({ cmd: m[1], file: rel(f) });
  }
}

// ── what the backends handle ─────────────────────────────────────────────────
const handled = new Map(); // cmd -> [file]
const backendRoots = [path.join(ROOT, 'apps/api/apps'), path.join(ROOT, 'modules')];
for (const rootDir of backendRoots) {
  for (const f of walk(rootDir, (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))) {
    if (f.includes(`${path.sep}api-gateway${path.sep}`)) continue;
    const src = strip(fs.readFileSync(f, 'utf8'));
    for (const m of src.matchAll(/@MessagePattern\(\s*(?:\{\s*cmd\s*:\s*)?([^)}]+?)\s*\}?\s*\)/g)) {
      const cmd = literal(m[1]);
      if (!cmd) continue;
      if (!handled.has(cmd)) handled.set(cmd, []);
      handled.get(cmd).push(rel(f));
    }
    for (const m of src.matchAll(/@(?:GrpcMethod|EventPattern)\(\s*'([a-zA-Z0-9_.]+)'/g)) {
      if (!handled.has(m[1])) handled.set(m[1], []);
      handled.get(m[1]).push(rel(f));
    }
  }
}

const missing = [];
const seen = new Set();
for (const s of sent) {
  const key = `${s.cmd}@${s.file}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!handled.has(s.cmd)) missing.push(s);
}

const result = {
  sentCommands: seen.size,
  handledCommands: handled.size,
  missing: missing.sort((a, b) => (a.cmd < b.cmd ? -1 : 1)),
};

const i = process.argv.indexOf('--json');
if (i > 0) {
  fs.mkdirSync(path.dirname(path.resolve(process.argv[i + 1])), { recursive: true });
  fs.writeFileSync(path.resolve(process.argv[i + 1]), JSON.stringify(result, null, 2));
}

console.log(`sent ${result.sentCommands} distinct (cmd, controller) pairs`);
console.log(`backends handle ${result.handledCommands} commands`);
if (missing.length) {
  console.log(`\n${missing.length} command(s) with no handler:`);
  for (const m of missing) console.log(`  ✗ ${m.cmd}   (${m.file})`);
  process.exit(1);
}
console.log('✓ every command the gateway sends has a handler');
```

- [ ] **Step 5: Run it and triage**

```bash
cd /c/KARTSEEKAPP && node apps/api/scripts/check-admin-commands.mjs
```

Expected after MODULES/TAXI land: `✓ every command the gateway sends has a handler`. If commands remain, each one is either a MODULES/TAXI gap (report it against its AUD2 id, do not delete the route) or a gateway typo (fix the typo here). Do **not** add an allowlist — the whole value of this check is that it has no escape hatch.

- [ ] **Step 6: Wire the scripts**

In `apps/api/package.json` scripts add `"check:admin-commands": "node scripts/check-admin-commands.mjs"`. In the root `package.json` add `"check:admin-commands": "node apps/api/scripts/check-admin-commands.mjs"`.

- [ ] **Step 7: Build and commit**

```bash
cd /c/KARTSEEKAPP/apps/api && npx vitest run apps/api-gateway/src/guards && npx nest build --all
cd /c/KARTSEEKAPP
git add apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts apps/api/scripts/check-admin-commands.mjs apps/api/package.json package.json
git commit -m "test(api): scope spec sees every admin route; unhandled rpc commands fail the build" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2 (V2): `regional-matrix.mjs` — audit §13 as executable data, with fixtures and a control row

**Closes:** AUD2-134.

**Files:**

- Create: `apps/api/scripts/verification/lib/probe.mjs`
- Create: `apps/api/scripts/verification/regional-matrix.rows.json`
- Create: `apps/api/scripts/verification/regional-matrix.mjs`
- Modify: `apps/api/package.json`, root `package.json`

**Interfaces:**

- Consumes: REGIONAL plan's scoped routes — specifically `GET /admin/users` filtering on `users.region_code` rather than the `'IN'` default _(assumed; audit row V6/IN-01)_, `GET /admin/marketplace/bank-offers` and `/exchange-offers` scoped _(assumed; V3/QA-12/QA-13/X-19)_, `GET /admin/reports/revenue` answering 200 with QA-only figures rather than 501 _(assumed; AUD2-088/QA-16)_. MODULES plan's `GET /admin/{hotel/bookings,restaurant/orders,pharmacy/orders,doctor/appointments}` and `GET /admin/taxi/rides/:id` answering something other than 503 _(assumed; X-29/X-33/X-37/X-42/X-45)_. TAXI plan's `GET /admin/taxi/surge` ruling — 403 for a locked admin is the documented target, so the row asserts 403 _(assumed)_.
- Produces: `regional-matrix.mjs --json <file>` writing `{ passed, failed, skipped, rows: [{id, status, detail}] }`; consumed by Task 8 as the `regionalMatrix` fragment.

- [ ] **Step 1: Extract the shared probe library**

`apps/api/scripts/verification/lib/probe.mjs` — lift `login`, `call` and `listOf` verbatim from `admin-scope-authz.mjs` (they are already correct, including the `json.data.data` envelope walk from `project_gateway_envelope_unwrapping`) and add a recorder:

```js
/* global process, console, fetch, AbortSignal */
/**
 * Shared probe helpers for the live verification scripts.
 *
 * Every one of these scripts had its own copy of `login`/`call`/`listOf`; the
 * copies drifted (two of them read `json.data.length`, which silently leaves
 * the page on bundled demo data). One copy, imported everywhere.
 */
export const BASE = process.env.API_BASE ?? 'http://localhost:3099/api/v1';

export const ACCOUNTS = {
  qa: { email: 'qa-admin@kartseek.com', password: 'AdminPass123!' },
  in: { email: 'india-admin@kartseek.com', password: 'AdminPass123!' },
  super: {
    email: process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@kartseek.com',
    password: process.env.SUPER_ADMIN_PASSWORD ?? 'AdminPass123!',
  },
  global: {
    email: process.env.GLOBAL_ADMIN_EMAIL ?? 'admin@kartseek.com',
    password: process.env.GLOBAL_ADMIN_PASSWORD ?? 'AdminPass123!',
  },
};

/**
 * Signs in, completing the staff second factor when one is demanded.
 * The gateway echoes `devCode` only outside production with DEV_MFA_ECHO or
 * DEV_AUTH_BYPASS on; without it a script cannot read the mailbox, so it says
 * so rather than reporting every downstream check as a failure.
 */
export async function login({ email, password }, base = BASE) {
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let j = await r.json();
  if (j.requires2FA) {
    if (!j.devCode)
      throw new Error(`MFA required for ${email}; run the gateway with DEV_MFA_ECHO=true`);
    const v = await fetch(`${base}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken: j.challengeToken, code: j.devCode }),
    });
    j = await v.json();
  }
  if (!j.accessToken)
    throw new Error(`login failed for ${email}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.accessToken;
}

export async function call(token, method, path, body, extraHeaders = {}, base = BASE) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined || body === null ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.PROBE_TIMEOUT_MS ?? 20_000)),
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    // non-JSON body (204, HTML error page)
  }
  return { status: r.status, json, headers: r.headers };
}

/** The rows in a gateway envelope; walks down `.data` until an array appears. */
export const listOf = (j) => {
  let node = j?.data;
  for (let d = 0; d < 4 && node && !Array.isArray(node); d++) node = node.data;
  return Array.isArray(node) ? node : Array.isArray(j) ? j : null;
};

/** Tallies a run and can hand the result to the evidence file. */
export class Recorder {
  constructor(name) {
    this.name = name;
    this.rows = [];
  }
  pass(id, detail = '') {
    this.rows.push({ id, status: 'PASS', detail });
    console.log(`  ✓ ${id} ${detail}`);
  }
  fail(id, detail = '') {
    this.rows.push({ id, status: 'FAIL', detail });
    console.log(`  ✗ ${id} ${detail}`);
  }
  skip(id, why) {
    this.rows.push({ id, status: 'SKIP', detail: why });
    console.log(`  ○ ${id} — skipped: ${why}`);
  }
  get summary() {
    const c = (s) => this.rows.filter((r) => r.status === s).length;
    return { suite: this.name, passed: c('PASS'), failed: c('FAIL'), skipped: c('SKIP') };
  }
  /** Prints the tally, writes --json when asked, and exits non-zero on any failure. */
  finish() {
    const s = this.summary;
    console.log(`\n${s.suite}: ${s.passed} passed, ${s.failed} failed, ${s.skipped} skipped`);
    const skips = this.rows.filter((r) => r.status === 'SKIP');
    if (skips.length) {
      console.log('skip reasons:');
      for (const r of skips) console.log(`  ${r.id}: ${r.detail}`);
    }
    const i = process.argv.indexOf('--json');
    if (i > 0) {
      const out = process.argv[i + 1];
      // eslint-disable-next-line no-undef
      const fs = require('node:fs');
      fs.mkdirSync(require('node:path').dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify({ ...s, rows: this.rows }, null, 2));
    }
    process.exitCode = s.failed > 0 ? 1 : 0;
  }
}
```

> In an ESM file `require` is unavailable — replace the two `require` calls in `finish()` with top-level `import fs from 'node:fs'; import path from 'node:path';` and use them directly. Written out here so the mistake is not copied in.

- [ ] **Step 2: Write the rows file — §13 verbatim, as data**

`regional-matrix.rows.json`. Each row is one request. `account` names an `ACCOUNTS` key; `expect.status` is an array (a route may legitimately answer 200 or 201); `invariant` names a checker in the runner's registry; `fixture:<name>` placeholders in `path`/`body` are substituted from the bootstrap. Abridged here to the shape plus the load-bearing rows — **transcribe all of E.1, E.2, E.3 and E.4 (55 + 2 rows), one object each; the matrix is only a proof if it is complete.**

```json
[
  {
    "id": "SA-01",
    "group": "E.1 super admin",
    "account": "super",
    "method": "POST",
    "path": "/auth/login",
    "body": { "email": "superadmin@kartseek.com", "password": "AdminPass123!" },
    "anonymous": true,
    "expect": { "status": [200] },
    "invariant": "tokenHasNoRegion",
    "note": "MFA completed by the runner; the decoded access token must carry no regionCode and no regionLocked"
  },
  {
    "id": "SA-03",
    "group": "E.1 super admin",
    "account": "super",
    "method": "GET",
    "path": "/admin/dashboard?country=QA",
    "expect": { "status": [200] },
    "invariant": "counterSubsetOf",
    "invariantArg": "SA-02",
    "note": "QA-only counters, strictly <= the unfiltered SA-02 board"
  },
  {
    "id": "SA-05",
    "group": "E.1 super admin",
    "account": "super",
    "method": "GET",
    "path": "/admin/marketplace/sellers?country=IN&page=1&limit=5",
    "expect": { "status": [200] },
    "invariant": "everyRowMarket",
    "invariantArg": "IN",
    "pick": ["regionCode", "region_code", "countryCode"],
    "nonEmpty": true,
    "alsoAssert": "pageSize<=5"
  },
  {
    "id": "SA-12",
    "group": "E.1 super admin",
    "account": "super",
    "method": "POST",
    "path": "/admin/staff",
    "body": {
      "email": "fixture-badlock@kartseek.com",
      "role": "ADMIN",
      "regionLocked": true,
      "regionCode": null
    },
    "expect": { "status": [400] },
    "invariant": "validationMessage",
    "note": "regionLocked without a market must be refused by the DTO, not stored"
  },
  {
    "id": "QA-04",
    "group": "E.2 regional admin QA",
    "account": "qa",
    "method": "GET",
    "path": "/admin/marketplace/sellers",
    "expect": { "status": [200] },
    "invariant": "everyRowMarket",
    "invariantArg": "QA",
    "pick": ["regionCode", "region_code", "countryCode"],
    "nonEmpty": true
  },
  {
    "id": "QA-05",
    "group": "E.2 regional admin QA",
    "account": "qa",
    "method": "GET",
    "path": "/admin/marketplace/sellers?page=2&limit=5",
    "expect": { "status": [200] },
    "invariant": "everyRowMarket",
    "invariantArg": "QA",
    "pick": ["regionCode", "region_code", "countryCode"],
    "note": "pagination must not widen the market; page 2 may legitimately be empty -> SKIP, never PASS"
  },
  {
    "id": "QA-09",
    "group": "E.2 regional admin QA",
    "account": "qa",
    "method": "GET",
    "path": "/admin/marketplace/orders",
    "expect": { "status": [200] },
    "invariant": "everyRowMarket",
    "invariantArg": "QA",
    "pick": ["regionCode", "region_code"],
    "nonEmpty": true,
    "closes": "AUD2-088",
    "note": "audit recorded this as a stub returning {data:[]} — PARTIAL, not PASS. After MODULES/C1 it must return real QA rows; an empty list is SKIP with this note"
  },
  {
    "id": "QA-12",
    "group": "E.2 regional admin QA",
    "account": "qa",
    "method": "GET",
    "path": "/admin/marketplace/bank-offers?activeOnly=true",
    "expect": { "status": [200] },
    "invariant": "everyRowMarket",
    "invariantArg": "QA",
    "pick": ["regionCode", "region_code"],
    "nonEmpty": true,
    "closes": "AUD2-134",
    "wasFailing": "V3"
  },
  {
    "id": "QA-14",
    "group": "E.2 regional admin QA",
    "account": "qa",
    "method": "GET",
    "path": "/admin/marketplace/banners/hero",
    "expect": { "status": [200] },
    "invariant": "marketOrUntargeted",
    "invariantArg": "QA",
    "pick": ["regions", "regionCode"],
    "note": "QA-targeted plus untargeted only; an IN-targeted banner in the body is a failure"
  },
  {
    "id": "QA-20",
    "group": "E.2 regional admin QA",
    "account": "qa",
    "method": "GET",
    "path": "/admin/taxi/surge?lat=25.2854&lng=51.5310",
    "expect": { "status": [403] },
    "invariant": "denialWording",
    "note": "fail-closed by design (TAXI plan); if that plan gave surge a market dimension, change this row to 200 + everyRowMarket QA and say so here"
  },
  {
    "id": "QA-21",
    "group": "E.2 regional admin QA",
    "account": "qa",
    "method": "GET",
    "path": "/admin/roles",
    "expect": { "status": [403] },
    "invariant": "messageContains",
    "invariantArg": "Roles and staff are managed globally."
  },
  {
    "id": "QA-22",
    "group": "E.2 regional admin QA",
    "account": "qa",
    "method": "GET",
    "path": "/admin/audit-logs",
    "expect": { "status": [200] },
    "invariant": "everyRowMarketOrAll",
    "invariantArg": "QA",
    "pick": ["country", "regionCode"],
    "nonEmpty": true
  },
  {
    "id": "IN-01",
    "group": "E.3 regional admin IN",
    "account": "in",
    "method": "GET",
    "path": "/admin/users?limit=100",
    "expect": { "status": [200] },
    "invariant": "everyRowMarket",
    "invariantArg": "IN",
    "pick": ["regionCode", "region_code", "country"],
    "nonEmpty": true,
    "wasFailing": "V6",
    "note": "must be IN because the row IS IN — not because users.country defaults to 'IN'. The runner cross-checks against the superadmin's ?country=IN count"
  },
  {
    "id": "IN-04",
    "group": "E.3 regional admin IN",
    "account": "in",
    "method": "GET",
    "path": "/admin/restaurant/restaurants",
    "expect": { "status": [200] },
    "invariant": "countMatchesDirect",
    "invariantArg": "IN",
    "note": "count must equal the IN restaurant count INCLUDING IN-MH style sub-regions (audit I4: region_code and quoted countryCode coexist on this table)"
  },
  {
    "id": "X-03",
    "group": "E.4 QA admin -> IN record",
    "account": "qa",
    "method": "GET",
    "path": "/sellers/fixture:inSellerId/orders",
    "expect": { "status": [403] },
    "invariant": "denialWording",
    "wasFailing": "V1"
  },
  {
    "id": "X-21",
    "group": "E.4 QA admin -> IN record",
    "account": "qa",
    "method": "POST",
    "path": "/admin/marketplace/banners/hero/00000000-0000-4000-8000-000000000000/delete",
    "expect": { "status": [404] },
    "invariant": "cacheNotFlushed",
    "wasFailing": "V14",
    "note": "a missing id must 404 without flushing every market's home cache; the runner warms marketplace:home:QA and marketplace:home:IN first and asserts both survive"
  },
  {
    "id": "X-34",
    "group": "E.4 QA admin -> IN record",
    "account": "qa",
    "method": "PUT",
    "path": "/admin/hotels/fixture:inHotelId/suspend",
    "baseOverride": "HOTEL_DIRECT_BASE",
    "expect": { "status": [401, 403, 404, "ECONNREFUSED"] },
    "invariant": "refusedOrUnreachable",
    "wasFailing": "V11",
    "note": "the module's own HTTP surface must not be an unguarded side door; connection refused is the best outcome"
  },
  {
    "id": "X-56",
    "group": "controls",
    "account": "qa",
    "method": "PATCH",
    "path": "/admin/marketplace/flash-deals/fixture:qaDealId",
    "body": { "discountPercent": 11 },
    "expect": { "status": [200] },
    "invariant": "ok",
    "note": "CONTROL: the same shape of request against a QA record must succeed. A row that is 403 both ways proves nothing."
  },
  {
    "id": "X-57",
    "group": "controls",
    "account": "qa",
    "method": "GET",
    "path": "/admin/marketplace/sellers",
    "expect": { "status": [200] },
    "invariant": "nonEmptyList",
    "note": "CONTROL: every market-only assertion in this file is meaningless against an empty list; this row proves the QA fixture set is populated"
  }
]
```

- [ ] **Step 3: Write the runner**

`apps/api/scripts/verification/regional-matrix.mjs`:

```js
#!/usr/bin/env node
/* global process, console, fetch */
/**
 * regional-matrix.mjs — the audit's §13 matrix, executed.
 *
 *   npm run verify:regional-matrix              (from the repo root)
 *   node apps/api/scripts/verification/regional-matrix.mjs --json out.json
 *
 * Needs the temp gateway on :3099 with DEV_AUTH_BYPASS=false and
 * DEV_MFA_ECHO=true, plus the module backends. Every request carries a real
 * staff token; with the bypass on, every row below would pass vacuously.
 *
 * Fixtures: the rows reference `fixture:<name>` ids. bootstrap() creates what it
 * can through the API as superadmin and *reads* the rest (existing QA/IN sellers,
 * products, hotels) without touching them. teardown() deletes only what
 * bootstrap() created, and runs even when the matrix fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACCOUNTS, BASE, Recorder, call, listOf, login } from './lib/probe.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROWS = JSON.parse(fs.readFileSync(path.join(HERE, 'regional-matrix.rows.json'), 'utf8'));
const rec = new Recorder('regional-matrix');

const tokens = {};
const fixtures = {};
const created = []; // [{method, path}] undone in reverse
const responses = new Map(); // row id -> {status, json}, for cross-row invariants

const marketOf = (row, picks) => {
  for (const k of picks ?? ['regionCode', 'region_code', 'countryCode', 'country']) {
    const v = row?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim().toUpperCase();
  }
  return null;
};

// ── invariants ───────────────────────────────────────────────────────────────
const INVARIANTS = {
  ok: () => true,
  nonEmptyList: (res) => (listOf(res.json) ?? []).length > 0,
  tokenHasNoRegion: (res) => {
    const t = res.json?.accessToken;
    if (!t) return 'no accessToken on the login response';
    const claims = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8'));
    if (claims.regionCode) return `token carries regionCode=${claims.regionCode}`;
    if (claims.regionLocked) return 'token carries regionLocked';
    return true;
  },
  everyRowMarket: (res, want, row) => {
    const list = listOf(res.json);
    if (!list) return 'no list in the envelope';
    if (!list.length) return { skip: 'empty list — nothing to prove (X-57 rule)' };
    const seen = [...new Set(list.map((r) => marketOf(r, row.pick)))];
    return seen.every((m) => m === want) || `saw ${seen.join(',') || 'no market field'}`;
  },
  everyRowMarketOrAll: (res, want, row) => {
    const list = listOf(res.json);
    if (!list) return 'no list in the envelope';
    if (!list.length) return { skip: 'empty list — nothing to prove' };
    const bad = list.filter((r) => {
      const m = marketOf(r, row.pick);
      return m !== want && m !== 'ALL';
    });
    return bad.length === 0 || `${bad.length} row(s) outside ${want}/ALL`;
  },
  marketOrUntargeted: (res, want, row) => {
    const list = listOf(res.json);
    if (!list) return 'no list in the envelope';
    const bad = list.filter((b) => {
      const regions = b.regions ?? (b.regionCode ? [b.regionCode] : []);
      return regions.length > 0 && !regions.map((x) => String(x).toUpperCase()).includes(want);
    });
    return bad.length === 0 || `${bad.length} banner(s) targeted elsewhere`;
  },
  counterSubsetOf: (res, otherId) => {
    const other = responses.get(otherId);
    if (!other) return { skip: `${otherId} did not run` };
    const nums = (j) => Object.entries(j?.data ?? {}).filter(([, v]) => typeof v === 'number');
    for (const [k, v] of nums(res.json)) {
      const total = (other.json?.data ?? {})[k];
      if (typeof total === 'number' && v > total) return `${k}: ${v} > global ${total}`;
    }
    return true;
  },
  denialWording: (res) => {
    const m = String(res.json?.message ?? '');
    return (
      /restricted to the .* market|belongs to .*, not to the .* market/.test(m) ||
      `denial message was ${JSON.stringify(m).slice(0, 120)}`
    );
  },
  messageContains: (res, want) =>
    String(res.json?.message ?? '').includes(want) ||
    `message was ${JSON.stringify(res.json?.message ?? '').slice(0, 120)}`,
  validationMessage: (res) => {
    const m = res.json?.message;
    return Array.isArray(m) || typeof m === 'string' || 'no validation message on the 400';
  },
  refusedOrUnreachable: (res) => res.status !== 200 || 'the direct module port answered 200',
  cacheNotFlushed: async () => {
    const { redisKeysExist } = await import('./lib/stores.mjs');
    const alive = await redisKeysExist(['marketplace:home:QA', 'marketplace:home:IN']);
    return alive.every(Boolean) || `home cache flushed: ${JSON.stringify(alive)}`;
  },
  countMatchesDirect: async (res, want) => {
    const { pgCount } = await import('./lib/stores.mjs');
    const list = listOf(res.json) ?? [];
    const direct = await pgCount(
      'restaurant',
      `select count(*)::int as n from restaurant.restaurants
         where upper(coalesce(region_code, "countryCode")) = $1
            or upper(coalesce(region_code, "countryCode")) like $2`,
      [want, `${want}-%`],
    );
    return list.length === direct || `api ${list.length} vs db ${direct}`;
  },
};

// ── fixtures ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  const s = tokens.super;
  const mk = async (p, body, key, pickId = (j) => j?.data?.id ?? j?.id) => {
    const r = await call(s, 'POST', p, body);
    const id = pickId(r.json);
    if (r.status >= 300 || !id) {
      console.log(`  ! fixture ${key} not created (${r.status}); rows using it will SKIP`);
      return;
    }
    fixtures[key] = id;
    created.push({ method: 'DELETE', path: `${p}/${id}` });
  };

  const iso = (d) => new Date(Date.now() + d * 86_400_000).toISOString();
  await mk(
    '/admin/marketplace/flash-deals',
    {
      title: 'verify QA deal',
      regionCode: 'QA',
      discountPercent: 10,
      startsAt: iso(-1),
      endsAt: iso(2),
    },
    'qaDealId',
  );
  await mk(
    '/admin/marketplace/flash-deals',
    {
      title: 'verify IN deal',
      regionCode: 'IN',
      discountPercent: 10,
      startsAt: iso(-1),
      endsAt: iso(2),
    },
    'inDealId',
  );
  await mk(
    '/admin/marketplace/bank-offers',
    { bankName: 'Verify Bank', regionCode: 'IN', discountPercent: 5, isActive: true },
    'inBankOfferId',
  );

  // Read-only lookups: never mutate a seeded row to make a matrix pass.
  const pick = async (p, key) => {
    const r = await call(s, 'GET', p);
    const id = (listOf(r.json) ?? [])[0]?.id;
    if (id) fixtures[key] = id;
    else console.log(`  ! no record for ${key} (${p}); rows using it will SKIP`);
  };
  await pick('/admin/marketplace/sellers?country=IN&limit=1', 'inSellerId');
  await pick('/admin/marketplace/sellers?country=QA&limit=1', 'qaSellerId');
  await pick('/admin/marketplace/products?country=IN&limit=1', 'inProductId');
  await pick('/admin/hotel/hotels?country=IN&limit=1', 'inHotelId');
  await pick('/admin/taxi/drivers?country=IN&limit=1', 'inDriverId');
}

async function teardown() {
  for (const c of created.reverse()) {
    const r = await call(tokens.super, c.method, c.path);
    if (r.status >= 400 && r.status !== 404)
      console.log(`  ! fixture cleanup ${c.path} answered ${r.status}`);
  }
}

// ── run ──────────────────────────────────────────────────────────────────────
const substitute = (v) =>
  typeof v === 'string'
    ? v.replace(/fixture:(\w+)/g, (_, k) => fixtures[k] ?? `__MISSING_${k}__`)
    : v;

(async () => {
  for (const [k, a] of Object.entries(ACCOUNTS)) {
    try {
      tokens[k] = await login(a);
    } catch (e) {
      console.log(`  ! ${k} login failed: ${e.message}`);
    }
  }
  await bootstrap();

  try {
    let group = '';
    for (const row of ROWS) {
      if (row.group !== group) console.log(`\n${(group = row.group)}`);
      const p = substitute(row.path);
      if (p.includes('__MISSING_')) {
        rec.skip(row.id, `fixture ${p.match(/__MISSING_(\w+)__/)[1]} unavailable`);
        continue;
      }
      const token = row.anonymous ? null : tokens[row.account];
      if (!token && !row.anonymous) {
        rec.skip(row.id, `no token for ${row.account}`);
        continue;
      }
      const base = row.baseOverride ? process.env[row.baseOverride] : undefined;
      let res;
      try {
        res = await call(token, row.method, p, substitute(row.body), {}, base ?? BASE);
      } catch (e) {
        if (row.expect.status.includes('ECONNREFUSED')) {
          rec.pass(row.id, 'connection refused, as required');
          continue;
        }
        rec.fail(row.id, `request threw: ${e.message}`);
        continue;
      }
      responses.set(row.id, res);
      if (!row.expect.status.includes(res.status)) {
        rec.fail(row.id, `status ${res.status}, wanted ${row.expect.status.join('|')}`);
        continue;
      }
      const check = INVARIANTS[row.invariant];
      if (!check) {
        rec.fail(row.id, `no invariant named ${row.invariant}`);
        continue;
      }
      const verdict = await check(res, row.invariantArg, row);
      if (verdict === true) rec.pass(row.id, row.wasFailing ? `(was ${row.wasFailing})` : '');
      else if (verdict && verdict.skip) rec.skip(row.id, verdict.skip);
      else rec.fail(row.id, String(verdict));
    }
  } finally {
    await teardown();
  }
  rec.finish();
})();
```

- [ ] **Step 4: Add `lib/stores.mjs` — the datastore side of two invariants**

`apps/api/scripts/verification/lib/stores.mjs` exports `pgCount(store, sql, params)`, `redisKeysExist(keys)` and `redisGet(key)`, using `pg` and `ioredis` from `apps/api`'s dependencies and the `<MODULE>_DB_*` / `REDIS_*` env names from `apps/api/.env`. Port map: main 5432, marketplace 5433, grocery 5434, restaurant 5435, pharmacy 5436, doctor 5437, hotel 5438, taxi 5439, franchise 5440 (audit §6(c)). It is reused by Tasks 4, 5 and 6.

- [ ] **Step 5: Run the matrix**

```bash
# terminal 1 — the temp gateway, from dist
cd /c/KARTSEEKAPP/apps/api && npx nest build --all
API_GATEWAY_PORT=3099 DEV_AUTH_BYPASS=false DEV_MFA_ECHO=true node dist/apps/api-gateway/main.js
# terminal 2
cd /c/KARTSEEKAPP && npm run verify:regional-matrix
```

Expected: `regional-matrix: N passed, 0 failed, K skipped`, with every skip reason printed. **A skipped row is not a passed row** — if `X-57` skips, the QA fixture set is empty and the whole E.2 block proved nothing; seed it and re-run.

- [ ] **Step 6: Wire and commit**

Root `package.json`: `"verify:regional-matrix": "node apps/api/scripts/verification/regional-matrix.mjs"`.

```bash
git add apps/api/scripts/verification package.json
git commit -m "test(api): the regional test matrix runs as data, with fixtures and a control row" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3 (V3): `api-error-matrix.mjs` + the console render specs for every status class

**Closes:** AUD2-043, AUD2-102, AUD2-103 (proof half).

**Files:**

- Create: `apps/api/apps/api-gateway/src/controllers/fault-injection.controller.ts`
- Create: `apps/api/apps/api-gateway/src/controllers/fault-injection.controller.spec.ts`
- Modify: `apps/api/apps/api-gateway/src/api-gateway.module.ts` (conditional registration)
- Create: `apps/api/scripts/verification/api-error-matrix.mjs`
- Create: `apps/web/src/components/admin/__tests__/api-error-states.spec.tsx`

**Interfaces:**

- Consumes (CONSOLE plan, _all assumed_): `ApiError { status, message, requestId?, body? }` exported from `packages/shared-core/src/api-endpoints.ts`; `apps/web/src/components/admin/api-states.tsx` exporting `AdminLoading`, `AdminNotConnected`, `AdminForbidden` (these three exist today) plus `AdminServiceUnavailable`, `AdminRateLimited` and `AdminValidationError`; `apiErrorMessage()` flattening a class-validator `string[]`. If the CONSOLE plan named these differently, fix the import in step 6 and record the rename.
- Produces: `api-error-matrix.mjs --json` → `{ passed, failed, skipped, rows }`; the `errorMatrix` fragment for Task 8.

- [ ] **Step 1: Establish which statuses the API can actually produce**

```bash
cd /c/KARTSEEKAPP/apps/api
grep -rn "UnprocessableEntity" apps --include=*.ts | grep -v spec | head
grep -rn "@Throttle(" apps/api-gateway/src/controllers/gateway.controller.ts
```

At audit time no route throws 422, and login is `@Throttle({ default: { limit: 10, ttl: 60_000 } })`. Record both findings in the script's header comment; if the REGIONAL/CONSOLE plans introduced a 422, add its row instead of the documented skip.

- [ ] **Step 2: The fault-injection controller (500 and timeout), double-gated**

`fault-injection.controller.ts`:

```ts
import { Controller, Get, InternalServerErrorException, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserRole } from '@app/common';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GlobalEntity } from '../decorators/global-entity.decorator';

/**
 * Deliberate faults, for the error matrix only.
 *
 * A 500 and a client timeout cannot be produced from outside without breaking
 * something real, and "not producible" is a hole in the matrix the console's
 * 500/timeout states would sit behind untested. So the gateway offers them —
 * behind two locks: the module registers this controller only when
 * ALLOW_FAULT_INJECTION=true *and* NODE_ENV is not production, and the routes
 * still require an admin role. `fault-injection.controller.spec.ts` fails the
 * build if either lock is removed.
 */
@ApiExcludeController()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@GlobalEntity('fault injection has no market dimension; test-only surface')
@Controller('admin/__fault')
export class FaultInjectionController {
  @Get('500')
  boom(): never {
    throw new InternalServerErrorException('deliberate fault for the error matrix');
  }

  @Get('slow')
  async slow(@Query('ms') ms?: string): Promise<{ sleptMs: number }> {
    const capped = Math.min(Math.max(Number(ms ?? 12_000) || 12_000, 0), 30_000);
    await new Promise((r) => setTimeout(r, capped));
    return { sleptMs: capped };
  }
}
```

In `api-gateway.module.ts`, add to `controllers` conditionally:

```ts
    ...(process.env.ALLOW_FAULT_INJECTION === 'true' && process.env.NODE_ENV !== 'production'
      ? [FaultInjectionController]
      : []),
```

- [ ] **Step 3: Pin the locks with a spec**

`fault-injection.controller.spec.ts` asserts (a) the controller's `@Roles` metadata includes `ADMIN`, (b) `api-gateway.module.ts` source contains both `ALLOW_FAULT_INJECTION === 'true'` and `NODE_ENV !== 'production'` in the same ternary, and (c) the route path is `admin/__fault`. Run `npx vitest run apps/api-gateway/src/controllers/fault-injection.controller.spec.ts` → green.

- [ ] **Step 4: The matrix script**

`apps/api/scripts/verification/api-error-matrix.mjs`:

```js
#!/usr/bin/env node
/* global process, console, fetch, AbortSignal */
/**
 * api-error-matrix.mjs — one real request per status class.
 *
 * The console's job is to tell an admin *which* failure happened. This script
 * produces each failure against the live gateway and records the status and the
 * body shape; `api-error-states.spec.tsx` asserts what the console renders for
 * each. Together they close the audit's §8(b) matrix, where 401/403 degraded
 * silently to inline mock data and 503 had no distinct state at all.
 *
 * Requires: temp gateway :3099, DEV_AUTH_BYPASS=false, ALLOW_FAULT_INJECTION=true.
 */
import { ACCOUNTS, BASE, Recorder, call, login } from './lib/probe.mjs';
import { execFileSync } from 'node:child_process';

const rec = new Recorder('api-error-matrix');
const DEAD = process.env.DEAD_BASE ?? 'http://localhost:3098/api/v1';

const expectStatus = async (id, want, fn) => {
  try {
    const res = await fn();
    if (res.status === want) rec.pass(id, `${want}`);
    else rec.fail(id, `got ${res.status}, wanted ${want}`);
    return res;
  } catch (e) {
    rec.fail(id, `threw: ${e.message}`);
    return null;
  }
};

(async () => {
  const superToken = await login(ACCOUNTS.super);
  const qa = await login(ACCOUNTS.qa);
  const stamp = Date.now();

  // 400 — a DTO that refuses a malformed email. The body must be a string[]:
  // the six copy-pasted module clients assign it raw to a string field.
  const r400 = await expectStatus('ERR-400', 400, () =>
    call(superToken, 'POST', '/admin/staff', { email: 'not-an-email', role: 'ADMIN' }),
  );
  if (r400)
    rec[Array.isArray(r400.json?.message) ? 'pass' : 'fail'](
      'ERR-400-shape',
      `message is ${Array.isArray(r400.json?.message) ? 'string[]' : typeof r400.json?.message}`,
    );

  // 401 — the only request in the whole suite with no Authorization header.
  // It proves DEV_AUTH_BYPASS is genuinely off; if this returns 200 the entire
  // verification run is vacuous and must be re-run with the bypass disabled.
  const r401 = await expectStatus('ERR-401', 401, () => call(null, 'GET', '/admin/dashboard'));
  if (r401 && r401.status === 200)
    rec.fail('ERR-401-bypass', 'DEV_AUTH_BYPASS is ON — every authz row in this run is vacuous');

  // 403 — a market-locked admin on a globally-managed route.
  await expectStatus('ERR-403', 403, () => call(qa, 'GET', '/admin/roles'));

  // 404 — a well-formed uuid that cannot exist.
  await expectStatus('ERR-404', 404, () =>
    call(superToken, 'GET', '/admin/marketplace/sellers/00000000-0000-4000-8000-000000000000'),
  );

  // 409 — the same staff email twice. The first create is a fixture we delete.
  const email = `verify-dup-${stamp}@kartseek.com`;
  const first = await call(superToken, 'POST', '/admin/staff', {
    email,
    name: 'Verify Duplicate',
    role: 'ADMIN',
    regionCode: 'QA',
    regionLocked: true,
    password: 'AdminPass123!',
  });
  if (first.status >= 300)
    rec.skip('ERR-409', `could not create the first staff row (${first.status})`);
  else {
    await expectStatus('ERR-409', 409, () =>
      call(superToken, 'POST', '/admin/staff', {
        email,
        name: 'Verify Duplicate',
        role: 'ADMIN',
        regionCode: 'QA',
        regionLocked: true,
        password: 'AdminPass123!',
      }),
    );
    const id = first.json?.data?.id ?? first.json?.id;
    if (id) await call(superToken, 'DELETE', `/admin/staff/${id}`);
  }

  // 422 — no gateway route throws UnprocessableEntity today (grep in step 1).
  rec.skip('ERR-422', 'no route throws 422; the console state is covered by the jest spec only');

  // 429 — login is @Throttle({ limit: 10, ttl: 60_000 }); the 11th trips it.
  // Deliberately wrong credentials so no session is created.
  let got429 = false;
  for (let i = 0; i < 12 && !got429; i++) {
    const r = await call(null, 'POST', '/auth/login', {
      email: `throttle-${stamp}@kartseek.com`,
      password: 'definitely-wrong',
    });
    if (r.status === 429) got429 = true;
  }
  got429
    ? rec.pass('ERR-429', 'login throttle tripped')
    : rec.fail('ERR-429', 'no 429 after 12 attempts');

  // 500 — the gated fault route.
  if (process.env.ALLOW_FAULT_INJECTION === 'true')
    await expectStatus('ERR-500', 500, () => call(superToken, 'GET', '/admin/__fault/500'));
  else
    rec.skip(
      'ERR-500',
      'ALLOW_FAULT_INJECTION is not true — not producible without fault injection',
    );

  // network — nothing listening on 3098. fetch must reject, not resolve.
  try {
    await call(superToken, 'GET', '/admin/dashboard', undefined, {}, DEAD);
    rec.fail('ERR-NETWORK', 'a request to a dead port resolved');
  } catch (e) {
    rec.pass('ERR-NETWORK', e.name);
  }

  // timeout — the 8 s client budget against a 12 s route.
  if (process.env.ALLOW_FAULT_INJECTION === 'true') {
    try {
      await fetch(`${BASE}/admin/__fault/slow?ms=12000`, {
        headers: { Authorization: `Bearer ${superToken}` },
        signal: AbortSignal.timeout(8_000),
      });
      rec.fail('ERR-TIMEOUT', 'the slow route answered inside the 8 s budget');
    } catch (e) {
      rec[e.name === 'TimeoutError' || e.name === 'AbortError' ? 'pass' : 'fail'](
        'ERR-TIMEOUT',
        e.name,
      );
    }
  } else rec.skip('ERR-TIMEOUT', 'ALLOW_FAULT_INJECTION is not true');

  // 503 — stop one module backend and call a route that needs it.
  // In the container profile this is `docker compose stop`; on the host it is
  // whatever started hotel-service. Either way it is restarted in the finally.
  const svc = process.env.OUTAGE_SERVICE ?? 'hotel-service';
  const compose = process.env.VERIFY_IN_DOCKER === 'true';
  try {
    if (compose)
      execFileSync('docker', ['compose', '--profile', 'admin', 'stop', svc], { stdio: 'ignore' });
    else {
      rec.skip(
        'ERR-503',
        `host mode: stop ${svc} by hand and re-run with OUTAGE_SERVICE set, or run with VERIFY_IN_DOCKER=true`,
      );
    }
    if (compose)
      await expectStatus('ERR-503', 503, () => call(superToken, 'GET', '/admin/hotel/hotels'));
  } finally {
    if (compose)
      execFileSync('docker', ['compose', '--profile', 'admin', 'start', svc], { stdio: 'ignore' });
  }

  rec.finish();
})();
```

- [ ] **Step 5: Run it**

```bash
cd /c/KARTSEEKAPP
API_BASE=http://localhost:3099/api/v1 ALLOW_FAULT_INJECTION=true npm run verify:errors
```

Expected: `ERR-400 … ERR-503` mostly PASS; `ERR-422` and (in host mode) `ERR-503` SKIP with their reasons printed. **`ERR-401-bypass` failing invalidates the whole run** — fix the gateway env and start again.

- [ ] **Step 6: The console render specs**

`apps/web/src/components/admin/__tests__/api-error-states.spec.tsx` — one `it` per status, rendering a small host component that throws the matching `ApiError` and asserting the state the console shows. The audit's §8(b) row for each status is the expectation:

```tsx
import { render, screen } from '@testing-library/react';
import { ApiError } from '@kartseek/shared-core';
import { AdminErrorState } from '@/components/admin/api-states';

/**
 * The status → state contract, from audit §8(b).
 *
 * Before this spec, 401 and 403 both resolved to `data=null` with no error
 * shown, and the page fell back to inline mock data — indistinguishable from
 * "no data exists". 503 had no distinct state anywhere in the console. Each row
 * below is one of those holes, held open.
 */
const cases: Array<[number, string | string[], RegExp]> = [
  [400, ['email must be an email', 'role should not be empty'], /email must be an email/],
  [401, 'Unauthorized', /sign in again|session (has )?expired/i],
  [
    403,
    'Your account is restricted to the QA market; those users belongs to IN.',
    /restricted to the QA market/,
  ],
  [404, 'Not Found', /not found/i],
  [409, 'A staff account with that email already exists', /already exists/i],
  [422, 'Unprocessable Entity', /could not be processed|check the values/i],
  [429, 'Too Many Requests', /too many requests|try again/i],
  [500, 'Internal Server Error', /something went wrong|unexpected/i],
  [503, 'Service Unavailable', /temporarily unavailable|service is down/i],
];

describe('AdminErrorState renders a distinct state per status', () => {
  it.each(cases)('%s', (status, message, pattern) => {
    render(<AdminErrorState error={new ApiError(status as number, message as never)} />);
    expect(screen.getByText(pattern)).toBeInTheDocument();
  });

  it('never renders the same copy for 401, 403 and 503', () => {
    const texts = [401, 403, 503].map((s) => {
      const { container, unmount } = render(<AdminErrorState error={new ApiError(s, 'x')} />);
      const t = container.textContent ?? '';
      unmount();
      return t;
    });
    expect(new Set(texts).size).toBe(3);
  });

  it('flattens a class-validator string[] instead of concatenating it', () => {
    render(
      <AdminErrorState
        error={new ApiError(400, ['a must be a string', 'b is required'] as never)}
      />,
    );
    expect(screen.getByText(/a must be a string/)).toBeInTheDocument();
    expect(screen.queryByText('a must be a stringb is required')).toBeNull();
  });

  it('shows the request id when the gateway echoed one', () => {
    const e = new ApiError(500, 'boom');
    (e as { requestId?: string }).requestId = 'req-abc123';
    render(<AdminErrorState error={e} />);
    expect(screen.getByText(/req-abc123/)).toBeInTheDocument();
  });
});
```

> `AdminErrorState` is the CONSOLE plan's single dispatcher over `AdminNotConnected`/`AdminForbidden`/`AdminServiceUnavailable`/… _(assumed)_. If that plan kept the three separate components with no dispatcher, rewrite each `it` to render the component the page would choose and keep the "never the same copy" assertion, which is the one that matters.

- [ ] **Step 7: Run and commit**

```bash
cd /c/KARTSEEKAPP/apps/web && npx jest src/components/admin/__tests__/api-error-states.spec.tsx
cd /c/KARTSEEKAPP/apps/api && npx nest build --all
cd /c/KARTSEEKAPP
git add apps/api/apps/api-gateway/src/controllers/fault-injection.controller.ts apps/api/apps/api-gateway/src/controllers/fault-injection.controller.spec.ts apps/api/apps/api-gateway/src/api-gateway.module.ts apps/api/scripts/verification/api-error-matrix.mjs package.json
git commit -m "test(api): every http status class is produced by a real request and recorded" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add apps/web/src/components/admin/__tests__/api-error-states.spec.tsx
git commit -m "test(web): each api status renders its own console state, never the same copy" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4 (V4): Cache isolation — market A's cache is never served to market B, and a market change invalidates it

**Closes:** AUD2-018, AUD2-019, AUD2-035, AUD2-036, AUD2-094, AUD2-115, AUD2-116, AUD2-127 (proof half).

**Files:**

- Create: `apps/api/test/cache-key-market.spec.ts`
- Create: `apps/api/scripts/verification/cache-isolation.mjs`
- Modify: root `package.json`

**Interfaces:**

- Consumes (REGIONAL/TAXI, _assumed_): the renamed key templates from the program's C7 ruling — `grocery:categories:<market>`, `taxi:rates:<cc>`, `taxi:surge:<cc>:<zone>`, `taxi:zone:demand:<cc>:<zone>`, `taxi:driver:loc:<id>`, `taxi:ride:<id>`; the TAXI plan deriving the country server-side from `pickupLat`/`pickupLng` so `getRateCard` no longer defaults to `IN`; a market-settings write route that purges the market's keys (`PUT /admin/markets/:code` _(assumed)_ — if the REGIONAL plan did not ship `admin.market_settings`, use `PUT /admin/taxi/config/QA`, which definitely purges `taxi:config:QA`, and say so in the script header).
- Consumes: `lib/stores.mjs` from Task 2.
- Produces: `cache-isolation.mjs --json` → the `cacheIsolation` fragment.

- [ ] **Step 1: The static spec — both sides of every market-dimensioned key**

`apps/api/test/cache-key-market.spec.ts`. A cache leaks when the **write** carries the market and the **read** does not (audit §9(b) leaks 1–3 are all exactly that). This spec parses the backends for `redis.set*`/`redis.get*`/`delPattern` key expressions and asserts that for every template in the audit's §9(a) market-scoped set, no read site builds the key from a client-supplied or defaulted value:

```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * A key that carries the market on write and a default on read is a leak, not a
 * cache. `taxi:rates:${countryCode}` was written per country and read through
 * `zoneId?.split('-')[0] ?? 'IN'` — every ride on the planet priced off India's
 * card. This spec fails the build on the shape of that mistake, not on one
 * instance of it.
 */
const FORBIDDEN_DEFAULTS = [
  /['"`]DEFAULT_ZONE['"`]/,
  /\?\?\s*['"]IN['"]/,
  /\|\|\s*['"]IN['"]/,
  /split\(['"]-['"]\)\[0\]/,
];

const MARKET_KEYED = [
  'taxi:rates:',
  'taxi:config:',
  'taxi:surge:',
  'taxi:zone:demand:',
  'marketplace:home:',
  'marketplace:featured:',
  'grocery:categories:',
  'grocery:products:',
];
// …collect every `.ts` under apps/api/apps and modules/*/backend/src, find each
// line containing a MARKET_KEYED prefix, and assert no FORBIDDEN_DEFAULTS token
// appears within 10 lines above it (the country resolution).
```

Write the collector, run `npx vitest run test/cache-key-market.spec.ts`, and let it fail on whatever the TAXI plan left. Fix only test-side false positives; a real hit is a TAXI-plan gap to report, not to allowlist.

- [ ] **Step 2: The live script**

`apps/api/scripts/verification/cache-isolation.mjs` — for each of the ten surfaces the mandate names, write as QA, read as IN, assert the IN read is a miss or a refusal, never QA's payload:

```js
#!/usr/bin/env node
/* global process, console */
/**
 * cache-isolation.mjs — write as QA, read as IN.
 *
 * Ten surfaces, one rule: a value cached for one market must never be served to
 * another inside its TTL. Then one market-settings change, and every key that
 * market owns must be gone.
 *
 * The live Redis sample in the audit found *no* warm entries for any
 * market-templated key — the templates simply had not been exercised. So this
 * script warms each key itself (through the API, never by writing Redis
 * directly) before asserting on it: a cold miss on both sides is not proof.
 */
import { ACCOUNTS, Recorder, call, listOf, login } from './lib/probe.mjs';
import { redisGet, redisKeysExist, redisScan } from './lib/stores.mjs';

const rec = new Recorder('cache-isolation');

/** Warm A, read as B, and require that B did not receive A's payload. */
async function crossRead({ id, warm, readAs, forbid, key }) {
  await warm(); // an API call as the QA admin / with X-Region-Code: QA
  const warmed = key ? await redisKeysExist([key]) : [true];
  if (!warmed[0]) return rec.skip(id, `${key} did not warm — the read path may not cache at all`);
  const res = await readAs();
  if (res.status === 403) return rec.pass(id, 'refused (fail-closed)');
  if (res.status !== 200) return rec.fail(id, `status ${res.status}`);
  const rows = listOf(res.json) ?? [];
  const leaked = rows.filter(forbid);
  leaked.length === 0
    ? rec.pass(id, `${rows.length} row(s), none from QA`)
    : rec.fail(id, `${leaked.length} QA row(s) served to IN`);
}

(async () => {
  const qa = await login(ACCOUNTS.qa);
  const ind = await login(ACCOUNTS.in);
  const su = await login(ACCOUNTS.super);
  const isQA = (r) =>
    String(r.regionCode ?? r.region_code ?? r.countryCode ?? '').toUpperCase() === 'QA';

  // 1 products  2 sellers  3 categories  4 promotions  5 banners
  // 6 orders    7 reports  8 taxi rates  9 taxi surge  10 search
  await crossRead({
    id: 'CACHE-01-products',
    key: 'products:*',
    warm: () => call(su, 'GET', '/admin/marketplace/products?country=QA&limit=10'),
    readAs: () => call(ind, 'GET', '/admin/marketplace/products?limit=10'),
    forbid: isQA,
  });
  // … CACHE-02 sellers, CACHE-03 categories (global tree: assert the *stocked*
  //   variant differs per market, audit §9(e) case 3), CACHE-04 coupons +
  //   flash-deals + bank-offers, CACHE-05 hero/promotional banners,
  //   CACHE-06 orders, CACHE-07 reports, CACHE-10 search.

  // 8 — the highest-value row in the suite (audit §9(e) case 4).
  // A fare estimate with Qatari coordinates and NO zoneId must price off QA's
  // card, not the `taxi:rates:IN` every previous estimate wrote.
  const doha = {
    pickupLat: 25.2854,
    pickupLng: 51.531,
    dropLat: 25.32,
    dropLng: 51.52,
    vehicleType: 'SEDAN',
  };
  const mumbai = {
    pickupLat: 19.076,
    pickupLng: 72.8777,
    dropLat: 19.1,
    dropLng: 72.9,
    vehicleType: 'SEDAN',
  };
  await call(su, 'PUT', '/admin/taxi/config/QA', { currency: 'QAR' });
  const qaEst = await call(qa, 'POST', '/taxi/estimate', doha);
  const inEst = await call(ind, 'POST', '/taxi/estimate', mumbai);
  const cur = (r) => r.json?.data?.currency ?? r.json?.currency;
  cur(qaEst) === 'QAR' && cur(inEst) !== 'QAR'
    ? rec.pass('CACHE-08-taxi-rates', `QA ${cur(qaEst)} / IN ${cur(inEst)}`)
    : rec.fail(
        'CACHE-08-taxi-rates',
        `QA ${cur(qaEst)} / IN ${cur(inEst)} — the zone default is still in force`,
      );
  const defaultZone = await redisScan('*DEFAULT_ZONE*');
  defaultZone.length === 0
    ? rec.pass('CACHE-09-default-zone', 'no DEFAULT_ZONE key exists')
    : rec.fail(
        'CACHE-09-default-zone',
        `${defaultZone.length} literal-zone key(s): ${defaultZone.slice(0, 3)}`,
      );

  // ── invalidation: change a market setting, the market's keys must go ────────
  const before = await redisScan('*:QA*');
  await call(su, 'PUT', '/admin/taxi/config/QA', { currency: 'QAR', baseFare: 7 });
  const after = await redisScan('*:QA*');
  const survivors = after.filter((k) => before.includes(k) && /taxi:(config|rates)/.test(k));
  survivors.length === 0
    ? rec.pass('CACHE-INVALIDATE', `${before.length} QA key(s) before, ${after.length} after`)
    : rec.fail('CACHE-INVALIDATE', `stale after a market change: ${survivors.join(', ')}`);
  // and the negative control: IN's keys must be untouched by a QA change.
  const inKeys = await redisScan('*:IN*');
  rec[inKeys.length > 0 ? 'pass' : 'skip'](
    'CACHE-INVALIDATE-control',
    inKeys.length > 0
      ? `${inKeys.length} IN key(s) survived a QA change`
      : 'no IN keys warm — nothing to prove',
  );

  rec.finish();
})();
```

- [ ] **Step 3: Run**

```bash
cd /c/KARTSEEKAPP && API_BASE=http://localhost:3099/api/v1 npm run verify:cache
```

Expected: every `CACHE-*` PASS, or a SKIP naming the surface that does not cache at all. `CACHE-08-taxi-rates` failing means the TAXI plan's server-side country derivation did not land — report against AUD2-018/019, do not adjust the assertion.

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/cache-key-market.spec.ts apps/api/scripts/verification/cache-isolation.mjs package.json
git commit -m "test(api): one market's cache is never served to another, and a market change clears it" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5 (V5): `db:readiness` — the audit's §6 probes as a repeatable script

**Closes:** AUD2-024 (Redis health disclosure, proof half), AUD2-032 (ES doc-count assertion), and gives the evidence file its `database` fragment.

**Files:**

- Create: `apps/api/scripts/verification/db-readiness.mjs`
- Modify: root `package.json` (`db:readiness`)

**Interfaces:**

- Consumes (INFRA, _assumed_): every service carrying the shared `@app/health` controller whose readiness runs `select 1` rather than opening a bare TCP socket; `npm run migration:run:main` having been applied so the main ledger is not three behind.
- Consumes: `pg` and `ioredis` (in `apps/api/package.json`), `mongoose`'s bundled driver, `fetch` for Elasticsearch.
- Produces: `db-readiness.mjs --json` → `{ stores: [{name, reachable, connectMs, schemas, tables, rows, migrations, writeProbe}] }`.

- [ ] **Step 1: Write the script**

The nine Postgres instances (5432 main, 5433 marketplace … 5440 franchise), Mongo, Redis and Elasticsearch, each with the exact probe the audit ran, so a future run is comparable to the audit's table:

```js
#!/usr/bin/env node
/* global process, console, fetch */
/**
 * db-readiness.mjs — audit §6, repeatable.
 *
 * Every store answers four questions: can the *app user* connect, what is in
 * it, is the migration ledger consistent with the schema, and can it take a
 * write. The write probe is BEGIN → INSERT → ROLLBACK and re-counts afterwards:
 * a probe that leaves a row behind is a probe that changed the thing it
 * measured.
 *
 * Two traps this script exists to avoid:
 *  - readiness that opens a TCP socket and calls that "up" (audit P3): a wrong
 *    password, a missing database and a failed DataSource all pass that test.
 *    Here every store runs a real query.
 *  - Redis answering `PONG (memory)` from its in-process emulator while the
 *    real server is down (audit S3). A `PONG` whose payload is not exactly
 *    'PONG' is reported as DEGRADED, never as up.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import Redis from 'ioredis';
import mongoose from 'mongoose';

const STORES = [
  {
    name: 'main',
    port: 5432,
    db: 'kartseek_db',
    userVar: 'DB_USER',
    passVar: 'DB_PASSWORD',
    probe: { schema: 'public', table: 'users' },
  },
  {
    name: 'marketplace',
    port: 5433,
    db: 'kartseek_marketplace',
    userVar: 'MARKETPLACE_DB_USER',
    passVar: 'MARKETPLACE_DB_PASSWORD',
    probe: { schema: 'marketplace', table: 'categories' },
  },
  {
    name: 'grocery',
    port: 5434,
    db: 'kartseek_grocery',
    userVar: 'GROCERY_DB_USER',
    passVar: 'GROCERY_DB_PASSWORD',
    probe: { schema: 'grocery', table: 'grocery_stores' },
  },
  {
    name: 'restaurant',
    port: 5435,
    db: 'kartseek_restaurant',
    userVar: 'RESTAURANT_DB_USER',
    passVar: 'RESTAURANT_DB_PASSWORD',
    probe: { schema: 'restaurant', table: 'restaurants' },
  },
  {
    name: 'pharmacy',
    port: 5436,
    db: 'kartseek_pharmacy',
    userVar: 'PHARMACY_DB_USER',
    passVar: 'PHARMACY_DB_PASSWORD',
    probe: { schema: 'pharmacy', table: 'pharmacy_stores' },
  },
  {
    name: 'doctor',
    port: 5437,
    db: 'kartseek_doctor',
    userVar: 'DOCTOR_DB_USER',
    passVar: 'DOCTOR_DB_PASSWORD',
    probe: { schema: 'doctor', table: 'specialties' },
  },
  {
    name: 'hotel',
    port: 5438,
    db: 'kartseek_hotel',
    userVar: 'HOTEL_DB_USER',
    passVar: 'HOTEL_DB_PASSWORD',
    probe: { schema: 'hotel', table: 'hotels' },
  },
  {
    name: 'taxi',
    port: 5439,
    db: 'kartseek_taxi',
    userVar: 'TAXI_DB_USER',
    passVar: 'TAXI_DB_PASSWORD',
    probe: { schema: 'taxi', table: 'taxi_vendors' },
  },
  {
    name: 'franchise',
    port: 5440,
    db: 'kartseek_franchise',
    userVar: 'FRANCHISE_DB_USER',
    passVar: 'FRANCHISE_DB_PASSWORD',
    probe: { schema: 'franchise', table: 'franchises' },
  },
];
```

For each store: time `connect()`; `select table_schema, count(*) from information_schema.tables group by 1`; `select count(*) from <schema>.<table>` before, `BEGIN; insert … ; ROLLBACK`, then count again and assert equality; read `public.migrations` row count and compare to the migration files on disk for `main` and `marketplace`. For Mongo: `ping`, list databases, `audit_logs` count + index names, and an insert→readback→delete into a temp collection that is then dropped. For Redis: `PING` (fail unless the reply is exactly `PONG`), `DBSIZE`, `INFO memory`, `CONFIG GET maxmemory-policy` and a `SET`(EX 60)→`GET`→`TTL`→`DEL` round trip with the count restored. For Elasticsearch: `GET /_cluster/health` (must be `green` or `yellow`) and `GET /kartseek_marketplace/_count`, compared with the marketplace product count — the audit found 60 docs against 178 products, so the script reports the ratio and **fails below 95%**.

- [ ] **Step 2: Run it**

```bash
cd /c/KARTSEEKAPP && npm run db:readiness
```

Expected: 9 Postgres reachable at 13–46 ms, every write probe `restored`, Mongo `audit_logs` count unchanged, Redis `PONG` (not `PONG (memory)`), ES `green` with the index at parity. Any store that is DEGRADED prints why.

- [ ] **Step 3: Commit**

```bash
git add apps/api/scripts/verification/db-readiness.mjs package.json
git commit -m "test(api): database readiness runs a real query per store and restores every write probe" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6 (V6): The Docker + DB E2E — Browser → console → gateway → service → store → events → UI

**Closes:** AUD2-020, AUD2-067 (proof half); satisfies mandate section 21.

**Files:**

- Create: `apps/web/playwright.admin.config.ts`
- Create: `apps/web/e2e/admin/helpers/{auth.ts,db.ts,frame.ts}`
- Create: `apps/web/e2e/admin/{super-admin.spec.ts,regional-a.spec.ts,regional-b.spec.ts,cross-market.spec.ts}`
- Modify: `apps/web/package.json` (`test:e2e:admin`), root `package.json`

**Interfaces:**

- Consumes (INFRA, _all assumed_): `infra/docker/compose.services.yml` with an `admin` profile covering gateway + console + the admin-path services; root scripts `stack:up:admin`, `stack:down`, `stack:validate`; container names `kartseek-postgres`, `kartseek-redis`, `kartseek-mongo` (these three exist today and are what `docker exec` addresses); the console reachable at `http://localhost:3000` and the gateway at `http://localhost:3001/api/v1`.
- Consumes (CONSOLE, _assumed_): stable `data-testid` hooks on the admin shell — `admin-nav`, `admin-market-badge`, `admin-error-state`, `admin-loading`, and per-page `admin-table`. If the CONSOLE plan did not add testids, add them in that plan's files as part of this task's step 2 and commit them separately.
- Consumes (EVENTS, _assumed_): every admin mutation writing a Mongo `audit_logs` row carrying `actorId`, `entityType`, `entityId` and `country`.
- Produces: Playwright JSON report → the `e2eJourneys` fragment; screenshots under `docs/audits/evidence/screens/<date>/`.

- [ ] **Step 1: The config — system Chrome, four widths, no webServer**

```ts
import { defineConfig, devices } from '@playwright/test';

/**
 * Admin console E2E against the containerised stack.
 *
 * Playwright's own browsers are not installed in this environment, so every
 * project drives system Chrome through `channel: 'chrome'`. The base URL is
 * `localhost`, not `127.0.0.1`: the console's auth and region cookies are host-
 * scoped and a loopback IP silently loses them.
 *
 * No `webServer` block — `npm run stack:up:admin` owns the lifecycle, because
 * the point of these journeys is to exercise the *containers*, not a dev server.
 */
export default defineConfig({
  testDir: './e2e/admin',
  fullyParallel: false, // the journeys write shared rows; serialise them
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: '../../docs/audits/evidence/playwright-admin.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: 'w1440',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'w1024',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'w768',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'w375',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 375, height: 812 },
      },
    },
  ],
});
```

- [ ] **Step 2: The helpers**

`helpers/auth.ts` — `loginAs(page, account)`: fill the form, submit, read the echoed `devCode` from the MFA response (`page.waitForResponse` on `/auth/login`), enter it, wait for `/admin`. Returns the decoded claims so a journey can assert `regionCode`.

`helpers/db.ts` — datastore reads through `docker exec`, because the E2E must prove the row exists, not that the UI said it does:

```ts
import { execFileSync } from 'node:child_process';

/**
 * Query the containerised stores directly.
 *
 * A journey that asserts only on the UI proves the UI. The audit's whole
 * category of "fabricated fallbacks" renders a plausible success over a failed
 * write, so every mutation in these specs is checked against the row it should
 * have produced.
 */
const exec = (args: string[]) => execFileSync('docker', args, { encoding: 'utf8' }).trim();

export const pg = (container: string, db: string, sql: string) =>
  exec(['exec', container, 'psql', '-U', process.env.DB_USER ?? 'postgres', '-d', db, '-tAc', sql]);

export const redis = (cmd: string[]) =>
  exec(['exec', 'kartseek-redis', 'redis-cli', '-a', process.env.REDIS_PASSWORD ?? '', ...cmd]);

export const mongoCount = (collection: string, filter: string) =>
  Number(
    exec([
      'exec',
      'kartseek-mongo',
      'mongosh',
      '--quiet',
      'kartseek_audit',
      '--eval',
      `db.${collection}.countDocuments(${filter})`,
    ]),
  );
```

`helpers/frame.ts` — `captureFrames(page, name)`: screenshot at the current project's width into `docs/audits/evidence/screens/<date>/<name>-<width>.png`, and assert `document.documentElement.scrollWidth <= window.innerWidth + 1` (no horizontal body scroll) — the frame check from `project_responsive_audit_harness`, whose blur-blob false positives are avoided by measuring the document, not an element.

- [ ] **Step 3: The Super Admin journey**

`super-admin.spec.ts` — login with MFA → dashboard renders real counters (assert the dashboard request returned 200 and the rendered total equals the DB count) → a scoped list (`/admin/marketplace/sellers?country=IN`, every visible row IN) → a scoped write (create a flash deal in QA; assert the `marketplace.flash_deals` row exists with `region_code='QA'`) → audit trail shows the write (`mongoCount('audit_logs', "{entityType:'flash_deal'}")` increased by 1) → notifications inbox opens and lists → logout clears the session (assert `redis(['EXISTS', 'session:<id>'])` is `0`, and that a reload lands on the login page).

Each step asserts on the **network response** as well as the DOM:

```ts
const [res] = await Promise.all([
  page.waitForResponse(
    (r) => r.url().includes('/admin/marketplace/flash-deals') && r.request().method() === 'POST',
  ),
  page.getByRole('button', { name: /create deal/i }).click(),
]);
expect(res.status(), await res.text()).toBe(201);
// and the row, not just the toast:
expect(
  pg(
    'kartseek-postgres-marketplace',
    'kartseek_marketplace',
    `select region_code from marketplace.flash_deals where id = '${(await res.json()).data.id}'`,
  ),
).toBe('QA');
```

- [ ] **Step 4: The Regional Admin A and B journeys**

`regional-a.spec.ts` (QA) and `regional-b.spec.ts` (IN) run the same journey with the market swapped: login → the market badge shows the locked market → the nav shows only permitted items → a scoped list is market-pure → a scoped write succeeds and lands with the right `region_code` → the audit row carries `country` = that market → logout.

- [ ] **Step 5: The cross-market denial journey**

`cross-market.spec.ts` — as the QA admin, navigate to an IN record by URL (`/admin/marketplace/sellers/<IN-id>`). The page must render the **forbidden** state (`admin-error-state` with the restricted-market copy), the network response must be 403, and — the assertion that matters — the DB row must be unchanged:

```ts
const before = pg(
  'kartseek-postgres-marketplace',
  'kartseek_marketplace',
  `select status from marketplace.sellers where id = '${inSellerId}'`,
);
await page.goto(`/admin/marketplace/sellers/${inSellerId}`);
await expect(page.getByTestId('admin-error-state')).toContainText(/restricted to the QA market/);
expect(pg(/* same query */)).toBe(before);
```

Also assert the gateway logged the denial: `docker compose --profile admin logs --tail=200 api-gateway | grep '\[region-scope-denied\]'` returns at least one line matching this seller id.

- [ ] **Step 6: Frames at four widths**

Each journey calls `captureFrames` at its dashboard and at one list page. Run the suite once per project; the 375 and 768 projects are where the console's fixed sidebar and the consent banner overlap historically bites (`project_consent_banner_blocks_fixed_ui` — `fixed bottom-0 z-70` eats clicks on any fixed sidebar; if a click times out at 375, check `--consent-banner-height` before blaming the test).

- [ ] **Step 7: Run**

```bash
cd /c/KARTSEEKAPP && npm run stack:up:admin && npm run stack:validate
cd apps/web && npx playwright test --config playwright.admin.config.ts
```

Expected: 4 specs × 4 projects green; `docs/audits/evidence/playwright-admin.json` written; screenshots under `docs/audits/evidence/screens/<date>/`. If Chrome cannot be found, `channel: 'chrome'` needs a system Chrome install — that is an environment fact to record, not a reason to switch to a bundled browser that is not there.

- [ ] **Step 8: Commit**

```bash
git add apps/web/playwright.admin.config.ts apps/web/e2e/admin apps/web/package.json package.json
git commit -m "test(web): containerised admin journeys assert the response, the db row and the audit trail" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7 (V7): Postman `05-admin-panel` matches the real routes, asserts, and runs under newman when newman exists

**Files:**

- Modify: `tests/postman/collections/05-admin-panel.postman_collection.json`
- Modify: `tests/postman/environments/{qatar,india,local}.postman_environment.json`
- Create: `tests/postman/scripts/run-admin.mjs`

**Interfaces:**

- Consumes: the gateway's declared `/admin/**` routes as of this branch — generate the list from `admin-console-census.mjs --json` rather than transcribing it by hand.
- Produces: `run-admin.mjs --json` → the `postman` fragment `{ available: boolean, assertions, failures, reason? }`.

- [ ] **Step 1: Establish newman's availability honestly**

```bash
cd /c/KARTSEEKAPP && node -e "try{require.resolve('newman');console.log('present')}catch{console.log('absent')}"
```

At plan time: **absent** from every workspace manifest, and `tests/postman/newman.config.js` references `newman-reporter-htmlextra`, also absent. This plan does **not** add the dependency (Global Constraints: no new dependencies). `run-admin.mjs` resolves newman and, when it cannot, records `{ available: false, reason: 'newman is not installed; install it with npm i -D newman newman-reporter-htmlextra at the root to enable this fragment' }` and exits 0 — a missing optional tool is not a platform failure, but it must appear in the evidence file as **not run**, never as passed.

- [ ] **Step 2: Regenerate the request list from the census**

```bash
node apps/api/scripts/verification/admin-console-census.mjs --json /tmp/census.json
node -e "const c=require('/tmp/census.json'); const r=new Set(); for(const row of c.rows) for(const call of row.calls) if(call.gateway) r.add(call.verb+' '+call.path); console.log([...r].sort().join('\n'))"
```

Every route in that list that starts with `/admin` belongs in the collection. Routes in the current collection that are **not** in the list are dead (audit §8(d) names `PATCH /admin/marketplace/products/action` and the bare-`/api` delivery-zones call among them) — delete them rather than leaving a green request against a 404.

- [ ] **Step 3: Restructure into four folders and add assertions**

`Auth` (login + MFA, capturing `{{admin_token}}`, `{{qa_admin_token}}`, `{{in_admin_token}}`), `Read`, `Write` (each write followed by its cleanup request), `Regional isolation` (the §13 X-rows that are pure HTTP). Every request gets a `pm.test` block, not just a status check:

```js
pm.test('200 with an envelope', () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json()).to.have.property('data');
});
pm.test('every row is in the caller market', () => {
  // the rows sit at data.data for list endpoints (project_gateway_envelope_unwrapping);
  // reading json.data.length here is how a page silently stayed on demo data.
  const j = pm.response.json();
  const rows = Array.isArray(j.data) ? j.data : (j.data && j.data.data) || [];
  pm.expect(rows.length, 'an empty list proves nothing').to.be.above(0);
  rows.forEach((r) =>
    pm
      .expect((r.regionCode || r.region_code || '').toUpperCase())
      .to.eql(pm.environment.get('market')),
  );
});
```

Add `market` to the qatar (`QA`) and india (`IN`) environments, and a pre-request script on the collection that sets the `Authorization` header from the folder's token variable, so no request can accidentally run anonymously under `DEV_AUTH_BYPASS`.

- [ ] **Step 4: The runner**

`tests/postman/scripts/run-admin.mjs` — resolves newman, runs `05-admin-panel` against `local` + `qatar` + `india`, merges the run summaries into `{ available, assertions, failures, perEnvironment }`, writes `--json`, and exits 1 only when newman ran and something failed.

- [ ] **Step 5: Run**

```bash
cd /c/KARTSEEKAPP && node tests/postman/scripts/run-admin.mjs --json docs/audits/evidence/postman.json
```

Expected with newman absent: `postman: not run — newman is not installed` and exit 0. With newman installed: every assertion green across three environments.

- [ ] **Step 6: Commit**

```bash
git add tests/postman
git commit -m "test(postman): the admin collection matches the live routes and asserts market purity" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8 (V8): `verify:all` — one command, every suite, one evidence file

**Files:**

- Create: `scripts/verify/verify-all.mjs`
- Create: `scripts/verify/gates.mjs`
- Modify: root `package.json`
- Create: `docs/audits/evidence/.gitignore` (keep the JSON, ignore `screens/`)

**Interfaces:**

- Consumes: every script above, plus `npm run smoke` (`tests/smoke/boot-all.mjs`, which boots all 26 from `dist` in batches), `admin-console-census.mjs`, `apps/api/scripts/verification/admin-scope-authz.mjs` (39/0/5 at plan time), `regional-isolation-authz.mjs` (36/36), `stack:validate` _(INFRA, assumed)_.
- Produces: `docs/audits/evidence/<YYYY-MM-DD>.json` and `<YYYY-MM-DD>.md`.

- [ ] **Step 1: The gate table**

`scripts/verify/gates.mjs` — the rules in one readable place, so "what counts as green" is reviewable without reading the runner:

```js
/**
 * What each suite must report for the platform to be called proven.
 *
 * `hard: true` fails the run. `hard: false` is recorded and surfaced in the
 * report's Remaining Issues, which is the honest home for a known gap — better
 * than a suite quietly excluded from the command.
 */
export const GATES = [
  { id: 'build:api', hard: true, rule: (r) => r.exitCode === 0 },
  { id: 'build:web', hard: true, rule: (r) => r.exitCode === 0 },
  { id: 'unit:api', hard: true, rule: (r) => r.exitCode === 0 },
  { id: 'unit:web', hard: true, rule: (r) => r.exitCode === 0 },
  { id: 'unit:modules', hard: true, rule: (r) => r.exitCode === 0 },
  { id: 'typeImports', hard: true, rule: (r) => r.exitCode === 0 },
  { id: 'commandDrift', hard: true, rule: (r) => r.json?.missing?.length === 0 },
  { id: 'smoke', hard: true, rule: (r) => r.exitCode === 0 },
  // The census reports signals, not verdicts — but a fixture on a page an admin
  // is told is live is the audit's MOCK-HARDCODED class, and that must be zero.
  // The census spells that flag FIXTURE; the audit spells it MOCK-HARDCODED.
  {
    id: 'census',
    hard: true,
    rule: (r) => (r.json?.summary?.flagCounts?.FIXTURE ?? 0) === 0,
    detail: (r) =>
      `FIXTURE=${r.json?.summary?.flagCounts?.FIXTURE ?? '?'} (audit class MOCK-HARDCODED)`,
  },
  {
    id: 'census:noRoute',
    hard: true,
    rule: (r) => (r.json?.summary?.flagCounts?.['NO-GATEWAY-ROUTE'] ?? 0) === 0,
  },
  { id: 'adminScope', hard: true, rule: (r) => r.json?.failed === 0 },
  { id: 'regionalAuthz', hard: true, rule: (r) => r.json?.failed === 0 },
  { id: 'regionalMatrix', hard: true, rule: (r) => r.json?.failed === 0 },
  { id: 'errorMatrix', hard: true, rule: (r) => r.json?.failed === 0 },
  { id: 'cacheIsolation', hard: true, rule: (r) => r.json?.failed === 0 },
  {
    id: 'dbReadiness',
    hard: true,
    rule: (r) => r.json?.stores?.every((s) => s.reachable && s.writeProbe === 'restored'),
  },
  { id: 'stackValidate', hard: true, rule: (r) => r.exitCode === 0 },
  { id: 'e2eJourneys', hard: true, rule: (r) => (r.json?.stats?.unexpected ?? 1) === 0 },
  { id: 'postman', hard: false, rule: (r) => r.json?.available !== true || r.json.failures === 0 },
];
```

- [ ] **Step 2: The orchestrator**

`scripts/verify/verify-all.mjs`:

```js
#!/usr/bin/env node
/* global process, console */
/**
 * verify:all — every suite, every live proof, one evidence file.
 *
 *   npm run verify:all                 # static + host-live (needs the temp gateway)
 *   npm run verify:all -- --with-docker   # adds the containerised E2E
 *   npm run verify:all -- --only=census,adminScope
 *
 * Runs every step even when one fails, then applies scripts/verify/gates.mjs
 * and exits non-zero if a hard gate is red. Running to the end matters: a stop-
 * on-first-failure run tells you about one problem per hour.
 *
 * The order is deliberate. Static gates first because a broken build makes every
 * live probe read as "all ok" (project_responsive_audit_harness). The temp
 * gateway is started from dist by this script and stopped in a finally, so a
 * developer's own --watch fleet on 3001 is never mistaken for the system under
 * test (project_dev_watch_restart_gotcha).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GATES } from './gates.mjs';

const ROOT = process.cwd();
const DATE = new Date().toISOString().slice(0, 10);
const EVIDENCE = path.join(ROOT, 'docs/audits/evidence');
const frag = (n) => path.join(EVIDENCE, 'fragments', `${n}.json`);
fs.mkdirSync(path.join(EVIDENCE, 'fragments'), { recursive: true });

const STEPS = [
  { id: 'build:api', cwd: 'apps/api', cmd: 'npx', args: ['nest', 'build', '--all'] },
  { id: 'build:web', cwd: 'apps/web', cmd: 'npx', args: ['next', 'build'] },
  { id: 'typeImports', cwd: 'apps/api', cmd: 'npm', args: ['run', 'check:type-imports'] },
  { id: 'unit:api', cwd: 'apps/api', cmd: 'npx', args: ['vitest', 'run'] },
  { id: 'unit:web', cwd: 'apps/web', cmd: 'npx', args: ['jest', '--ci'] },
  {
    id: 'unit:modules',
    cwd: '.',
    cmd: 'npx',
    args: [
      'turbo',
      'run',
      'test',
      '--continue',
      ...[
        'marketplace',
        'grocery',
        'restaurant',
        'pharmacy',
        'doctor',
        'hotel',
        'taxi',
        'franchise',
      ].flatMap((m) => ['--filter', `@kartseek/${m}-backend`]),
    ],
  },
  {
    id: 'commandDrift',
    cwd: '.',
    cmd: 'node',
    args: ['apps/api/scripts/check-admin-commands.mjs', '--json', frag('commandDrift')],
    json: 'commandDrift',
  },
  {
    id: 'census',
    cwd: '.',
    cmd: 'node',
    args: [
      'apps/api/scripts/verification/admin-console-census.mjs',
      '--json',
      frag('census'),
      '--md',
      path.join(EVIDENCE, `census-${DATE}.md`),
    ],
    json: 'census',
  },
  { id: 'smoke', cwd: '.', cmd: 'node', args: ['tests/smoke/boot-all.mjs'] },
  // ── live, against the temp gateway on 3099 ────────────────────────────────
  {
    id: 'adminScope',
    live: true,
    cwd: '.',
    cmd: 'node',
    args: ['apps/api/scripts/verification/admin-scope-authz.mjs', '--json', frag('adminScope')],
    json: 'adminScope',
  },
  {
    id: 'regionalAuthz',
    live: true,
    cwd: '.',
    cmd: 'node',
    args: [
      'apps/api/scripts/verification/regional-isolation-authz.mjs',
      '--json',
      frag('regionalAuthz'),
    ],
    json: 'regionalAuthz',
  },
  {
    id: 'regionalMatrix',
    live: true,
    cwd: '.',
    cmd: 'node',
    args: ['apps/api/scripts/verification/regional-matrix.mjs', '--json', frag('regionalMatrix')],
    json: 'regionalMatrix',
  },
  {
    id: 'errorMatrix',
    live: true,
    cwd: '.',
    cmd: 'node',
    args: ['apps/api/scripts/verification/api-error-matrix.mjs', '--json', frag('errorMatrix')],
    json: 'errorMatrix',
  },
  {
    id: 'cacheIsolation',
    live: true,
    cwd: '.',
    cmd: 'node',
    args: ['apps/api/scripts/verification/cache-isolation.mjs', '--json', frag('cacheIsolation')],
    json: 'cacheIsolation',
  },
  {
    id: 'dbReadiness',
    live: true,
    cwd: '.',
    cmd: 'node',
    args: ['apps/api/scripts/verification/db-readiness.mjs', '--json', frag('dbReadiness')],
    json: 'dbReadiness',
  },
  {
    id: 'postman',
    live: true,
    cwd: '.',
    cmd: 'node',
    args: ['tests/postman/scripts/run-admin.mjs', '--json', frag('postman')],
    json: 'postman',
  },
  // ── containerised ─────────────────────────────────────────────────────────
  { id: 'stackValidate', docker: true, cwd: '.', cmd: 'npm', args: ['run', 'stack:validate'] },
  {
    id: 'e2eJourneys',
    docker: true,
    cwd: 'apps/web',
    cmd: 'npx',
    args: ['playwright', 'test', '--config', 'playwright.admin.config.ts'],
    json: 'e2eJourneys',
    jsonFile: path.join(EVIDENCE, 'playwright-admin.json'),
  },
];

const run = (s) =>
  new Promise((resolve) => {
    const started = Date.now();
    const p = spawn(s.cmd, s.args, {
      cwd: path.join(ROOT, s.cwd),
      shell: process.platform === 'win32',
      stdio: 'inherit',
      env: { ...process.env, ...(s.live ? { API_BASE: 'http://localhost:3099/api/v1' } : {}) },
    });
    p.on('close', (code) => resolve({ id: s.id, exitCode: code ?? 1, ms: Date.now() - started }));
  });
```

The runner then: starts the temp gateway (`node dist/apps/api-gateway/main.js` with `API_GATEWAY_PORT=3099 DEV_AUTH_BYPASS=false DEV_MFA_ECHO=true ALLOW_FAULT_INJECTION=true`), polls `http://localhost:3099/api/v1/health` until 200 or 90 s, runs the live steps, kills it in a `finally`, skips the `docker: true` steps unless `--with-docker`, reads each fragment, applies `GATES`, writes:

```json
{
  "date": "2026-09-12",
  "branch": "feat/admin-platform-upgrade",
  "commit": "<git rev-parse HEAD>",
  "node": "v26.x",
  "withDocker": true,
  "steps": [
    {
      "id": "regionalMatrix",
      "exitCode": 0,
      "ms": 41230,
      "summary": { "passed": 57, "failed": 0, "skipped": 4 }
    }
  ],
  "gates": [{ "id": "regionalMatrix", "hard": true, "verdict": "PASS", "detail": "" }],
  "verdict": "PASS",
  "hardFailures": []
}
```

plus a Markdown twin with one table of gates and one of skip reasons.

- [ ] **Step 3: Wire the scripts**

Root `package.json`: `"verify:all": "node scripts/verify/verify-all.mjs"`, `"verify:errors": "node apps/api/scripts/verification/api-error-matrix.mjs"`, `"verify:cache": "node apps/api/scripts/verification/cache-isolation.mjs"`, `"db:readiness": "node apps/api/scripts/verification/db-readiness.mjs"`, `"report:completion": "node scripts/report/completion-report.mjs"`.

- [ ] **Step 4: Run it end to end**

```bash
cd /c/KARTSEEKAPP
npm run infra:up
npm run verify:all -- --with-docker
```

Expected (60–90 minutes): every gate `PASS`, `docs/audits/evidence/2026-09-12.json` and `.md` written, exit 0. A red hard gate names the suite and the failing rows; fix the product, not the gate.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify docs/audits/evidence/.gitignore package.json
git commit -m "test: verify:all runs every suite and writes one machine-readable evidence file" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9 (V9): The completion report is generated, not written

**Files:**

- Create: `scripts/report/completion-report.mjs`
- Create: `docs/audits/evidence/aud2-status.json`
- Produces: `docs/audits/2026-09-12-admin-platform-completion-report.md`

**Interfaces:**

- Consumes: `docs/audits/evidence/<date>.json` (Task 8); `docs/audits/2026-09-12-admin-platform-audit-2.md` §12 (parsed for the 153 AUD2 rows: id, priority, class, area, finding, workstream); `docs/audits/evidence/aud2-status.json` (the executor's ruling per id).
- Produces: the mandate's twelve sections, A–L, matching the existing `2026-09-12-admin-platform-completion-report.md` skeleton (A Existing System, B Professional Mistakes, C Features Added, D Features Preserved, E API, F Security, G Regional Isolation, H Module Independence, I Taxi, J Testing, K Build, L Remaining Issues).

- [ ] **Step 1: The status file**

`docs/audits/evidence/aud2-status.json` — one entry per AUD2 id, seeded by parsing §12 and defaulting every row to `REMAINING`. The executor of each workstream plan flips its own rows as it goes:

```json
{
  "AUD2-066": {
    "verdict": "FIXED",
    "by": "V1",
    "evidence": "admin-market-scope.regression.spec.ts collects every controller; 0 unscoped",
    "commit": ""
  },
  "AUD2-134": {
    "verdict": "FIXED",
    "by": "V2",
    "evidence": "regionalMatrix 57 passed / 0 failed",
    "commit": ""
  },
  "AUD2-135": {
    "verdict": "FIXED",
    "by": "V1",
    "evidence": "check-admin-commands.mjs: 0 missing",
    "commit": ""
  },
  "AUD2-001": { "verdict": "REMAINING", "by": "", "evidence": "", "commit": "" }
}
```

Three verdicts only: `PASS` (audited as already correct, no change needed), `FIXED` (changed and proven — `evidence` must name a gate or a row id from the evidence file), `REMAINING` (open — `evidence` says why). The generator **refuses to render** a `FIXED` row whose `evidence` is empty; a claim with no proof is exactly what this whole plan exists to prevent.

- [ ] **Step 2: The generator**

`scripts/report/completion-report.mjs` reads both files and renders each section from data:

- **A/B** — the §12 counts by priority and class, with the `PASS`/`FIXED`/`REMAINING` split per workstream.
- **C/D** — `FIXED` rows grouped by workstream (added) and the census's route/page totals unchanged between the audit and now (preserved).
- **E** — the `commandDrift` and `census` fragments: routes declared, commands sent, commands handled, client calls with no route.
- **F** — the `errorMatrix` rows plus the `adminScope` failures (0) and the `ERR-401-bypass` row, which is the proof the authorization evidence is not vacuous.
- **G** — the `regionalMatrix` fragment rendered as §13's own tables, each row with its observed status; skip reasons listed in full.
- **H** — the module unit-suite results and the `check-admin-commands` per-module missing counts.
- **I** — the taxi rows from the matrix and `CACHE-08-taxi-rates`.
- **J** — every gate with its numbers; this is the section that must not be hand-written.
- **K** — `build:api`, `build:web`, `typeImports`, `smoke` (26/26).
- **L** — every `REMAINING` row, sorted by priority, with its `evidence` explaining why it is still open.

Header block: date, branch, commit, node version, and `verdict` from the evidence file. If `verdict !== 'PASS'`, the generator prints a banner at the top naming every hard failure — the report can be produced from a red run, but it cannot look green.

- [ ] **Step 3: Generate and read it**

```bash
cd /c/KARTSEEKAPP && npm run report:completion
```

Expected: `docs/audits/2026-09-12-admin-platform-completion-report.md` rewritten, twelve sections, no `TODO`, no `TBD`, no bare `—` in a Result column. Read it end to end: any sentence you cannot trace to a row in the evidence file is a bug in the generator.

- [ ] **Step 4: Commit**

```bash
git add scripts/report docs/audits/evidence/aud2-status.json docs/audits/2026-09-12-admin-platform-completion-report.md docs/audits/evidence/2026-09-12.json docs/audits/evidence/2026-09-12.md package.json
git commit -m "docs: the completion report is generated from the evidence file, section by section" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

### Mandate coverage

| Mandate section                | Requirement                                                                                       | Task(s)    | Gate in `verify:all`                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| 12 — Testing (unit)            | unit suites: api, web, 8 module backends                                                          | V8         | `unit:api`, `unit:web`, `unit:modules`                 |
| 12 — Testing (integration)     | marketplace + module integration specs                                                            | V8         | `unit:api`, `unit:modules` (they live in those suites) |
| 12 — Testing (API)             | every admin route exercised with assertions                                                       | V7, V8     | `postman` (soft), `census:noRoute` (hard)              |
| 12 — Testing (permission)      | role + permission enforcement with a real token                                                   | V1, V2, V8 | `adminScope`, `regionalMatrix`, `commandDrift`         |
| 12 — Testing (regional)        | §13's two tables, both directions, control + non-empty                                            | V2         | `regionalMatrix`                                       |
| 12 — Testing (database)        | 9 Postgres, Mongo, Redis, ES — real queries, restored write probes                                | V5         | `dbReadiness`                                          |
| 12 — Testing (Docker)          | the `admin` profile brought up and validated                                                      | V6, V8     | `stackValidate`                                        |
| 12 — Testing (E2E)             | browser → console → gateway → service → store → events → UI                                       | V6         | `e2eJourneys`                                          |
| 12 — Testing (regression)      | nothing that worked before is broken                                                              | V1, V8     | `build:*`, `smoke`, `census`, all unit gates           |
| 20 — Regional test matrix      | SA-01…12, QA-01…23, IN-01…04, X-01…55, + X-56 control, X-57 non-empty                             | V2         | `regionalMatrix`                                       |
| 21 — Docker + DB E2E chain     | containerised, asserting network **and** DB/Mongo/Redis rows, 4 widths                            | V6         | `e2eJourneys`                                          |
| 22 — API error-handling matrix | 400/401/403/404/409/422/429/500/network/timeout/503, observed in the UI                           | V3         | `errorMatrix` + `unit:web` (render specs)              |
| 22 — Cache isolation           | A→B never served; invalidation on a market-config change                                          | V4         | `cacheIsolation`                                       |
| 23 — Definition of done        | UI + API + Auth + Permissions + Validation + Database + Cache + Docker + Error handling + Testing | V8, V9     | the full gate table; rendered as report section J      |

Audit TESTS rows: AUD2-066 → V1; AUD2-134 → V2; AUD2-135 → V1. All three closed.

### Placeholder scan

- No `TODO`, `TBD`, `FIXME`, `<placeholder>` or `...` standing in for logic in any step. Three deliberate, labelled abridgements, each with an instruction to complete it: the rows file in V2 step 2 ("transcribe all of E.1–E.4"), the `crossRead` call list in V4 step 2 (surfaces 2–7 and 10 named in a comment), and the section-render list in V9 step 2 (each section's source named). Every other code block is complete and runnable.
- One deliberate error is left in the V2 step 1 code with an explanatory note beneath it (`require` inside an ESM module) so the executor fixes it rather than copying it — flagged, not hidden.
- Every assumption about a sibling plan is marked _(assumed)_ with the exact symbol/script/profile name and a fallback instruction: V2 (six route behaviours), V3 (`ApiError`, `api-states.tsx` exports, `AdminErrorState`), V4 (key templates, the market-settings write route), V5 (`@app/health`, `migration:run:main`), V6 (`compose.services.yml` + `admin` profile, `stack:up:admin`, `stack:validate`, console testids, audit-log fields), V8 (`stack:validate`).

### Consistency

- Every live probe in every task goes through `lib/probe.mjs`, so the `DEV_AUTH_BYPASS` rule, the MFA `devCode` flow, the `json.data.data` envelope walk and the empty-list-is-a-skip rule have exactly one implementation.
- Port discipline is uniform: `3099` for host-run proofs (from `dist`), `3001`/`3000` inside the Docker `admin` profile, `3098` as the deliberately dead port.
- Every mutating probe in V2, V3 and V6 creates its own fixture and removes it in a `finally`; the two read-only lookups are marked as such.
- Every denial assertion has a paired control (X-56 in V2, `CACHE-INVALIDATE-control` in V4, the unchanged-DB-row assertion in V6 step 5), and every "market X only" assertion has the non-empty guard (X-57, `nonEmpty: true`, `pm.expect(rows.length).to.be.above(0)`).
- Commit messages: nine, all lower-case, all under 100 characters, all carrying the required trailer; `apps/api`, `apps/web` and root-script changes are split where a task spans them (V3).
- The census flag spelling mismatch is handled explicitly rather than silently: the gate keys on `FIXTURE` and its `detail` names the audit's `MOCK-HARDCODED` class, so the report reads in the audit's vocabulary while the code reads the census's.
