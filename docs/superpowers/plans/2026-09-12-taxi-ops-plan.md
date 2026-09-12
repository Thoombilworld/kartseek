# Taxi Operations Platform Implementation Plan (Plan D)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The taxi admin surface becomes one consistent, market-scoped, role-gated operations platform. Drivers, vehicles, trips, fares/surge, payouts and disputes each have a real backend handler (not a gateway fallback), a real cache keyed by market, a real console page with honest states, and the two legacy taxi controllers stop exposing admin actions without a role, without a market and without a handler.

**Architecture:** Taxi is a module-owned microservice (`modules/taxi/backend`, HTTP :3021 · TCP :4027 · gRPC :5007) with its own `taxi` schema. The gateway's `admin-taxi.controller.ts` is the only public admin surface: it authenticates (`JwtAuthGuard`), authorises (`RolesGuard` + `@Roles` with a `perm:` key), resolves the market with `this.scopeOf(req, requested, what)` and forwards `{ ...dto, countryCode: market, scope }` over TCP. The backend enforces the market again on the loaded row (`assertInMarket` from `@app/common`) and in the query predicate (`marketPredicate`). Two parallel copies of that surface exist today and both are removed here: the module's own HTTP `admin/*` routes (34, role-free) and the gateway's legacy `/taxi/admin/*` block (11, role-gated but market-free and partly fabricated). Fare and surge collapse from two implementations to one, keyed on a server-derived country.

**Tech Stack:** NestJS 11 on rspack, TypeORM (schema `taxi`), vitest (`npx vitest run <file>` from `modules/taxi/backend` or from `apps/api`), Node 26, Redis (`@app/redis`), Kafka (`@app/kafka`), Next.js console (`apps/web`), client layer `packages/shared-core/src/api/admin-taxi.ts` (imported by pages as `@/lib/api/admin-taxi`).

---

## Global Constraints

Verbatim from the mandate — every task is measured against these:

> Do not use mock data. Do not leave fake buttons. Do not leave placeholder APIs. Do not rely on frontend-only permissions. Do not allow regional data leakage. Do not break existing modules while upgrading Admin. Do not mark functionality complete without testing the real workflow.

And, specific to this workstream:

- **Market column.** Taxi's market column is `countryCode`, ISO-2 upper case — _not_ `regionCode`. This is a recorded deviation (audit I7/F-17); the rename is **out of scope** for Plan D (it would touch nine entities, the seeds and every existing spec at once). Every entity created here uses `countryCode` for consistency with its siblings, and every new entity's docstring records the deviation in one line so I7 stops being undocumented.
- **Every admin handler.** In the gateway: `this.scopeOf(` in the handler body _and_ `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.taxi')` — the permission key comes from `apps/api/libs/common/src/admin/permissions.ts` (`modules.taxi` is the only taxi key in the registry; money routes additionally carry `perm:finance.payouts`, which is in the same registry). In the backend: a `countryCode` predicate on every list and `assertInMarket(row.countryCode, d.scope, '<what>', this.logger)` on every single-row read and every write.
- **Cache keys carry the market.** The taxi namespace after this plan is exactly:

  | key                                        | written by                           | purged by                                          |
  | ------------------------------------------ | ------------------------------------ | -------------------------------------------------- |
  | `taxi:config:<cc>`                         | `TaxiConfigService.getCountryConfig` | `upsertCountryConfig`                              |
  | `taxi:rates:<cc>` (the list)               | `getRateCards`                       | `upsertRateCard` / `deleteRateCard`                |
  | `taxi:rates:<cc>:<vehicleType>` (one card) | `getRateCard`                        | same                                               |
  | `taxi:surge:<cc>:<zone>`                   | `SurgeService.setMultiplier`         | `SurgeService` writes and `admin.taxi.updateSurge` |
  | `taxi:zone:demand:<cc>:<zone>`             | `RideMatchingService.matchRide`      | TTL, and the surge admin write                     |
  | `taxi:driver:loc:<id>`                     | `DriverDispatchService`              | driver going offline                               |
  | `taxi:ride:<id>`                           | `TaxiService`                        | ride terminal state                                |

  Removed entirely: `fare:rate:*`, `surge:${zoneId}`, `zone:demand:${zoneId|'DEFAULT_ZONE'}`, `cache:fare_rule:*`, `cache:surge_rule:*`. An admin write purges **exactly the affected market** — `purgeMarket('QA')` must not touch a single `IN` key, and T10 proves that against a live Redis.

- **DTOs validated.** Every new body is a `class` with `class-validator` decorators in `apps/api/apps/api-gateway/src/dto/admin-taxi.dto.ts` (an `interface` has no metatype and the global pipe skips it — H-12's failure mode). Path ids keep `ParseUUIDPipe`.
- **The taxi module owns its database.** `modules/taxi/backend` connects with `TAXI_DB_*` (falling back to `DB_*`) at `schema: 'taxi'` and runs `synchronize` outside production; **no migration runner exists for it** (`apps/api/package.json` has only `migration:run` and `migration:run:main`, both pointed at other databases). Every task here writes its migration file to `modules/taxi/backend/migrations/` and expects the **INFRA plan** to add `apps/api/data-source.taxi.ts` + `npm run migration:run:taxi`. **Dependency, stated once:** until INFRA lands, the DDL is verified in dev by boot-with-`synchronize` plus `\d taxi.<table>`, and each task's commit message says `(migration pending INFRA runner)`. Do not invent a runner here.
- **Commits.** Lower-case subject, ≤ 100 characters, one per task. **Module, gateway and web changes commit separately** — a task touching two of them makes two commits. Trailer on every commit:

  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  ```

- **Suites stay green.** `modules/taxi/backend` ≥ 20 passing (it is 20 today; this plan adds to it), `apps/api` 677, `apps/web` 610. A task that lowers any of those three is not done. Build gate is `npx nest build` from `modules/taxi/backend` and `npx nest build --all` from `apps/api` — `tsc` alone is not the gate.
- **Live probes.** A temporary gateway on `API_GATEWAY_PORT=3099` bound to loopback, with the taxi backend started from its own `dist` (`node dist/main.js` after `npx nest build`), and **real staff tokens** for three identities: `qa-admin` (region-locked QA), `india-admin` (region-locked IN) and the seeded global `superadmin`. `DEV_AUTH_BYPASS=true` makes an anonymous local request SUPER_ADMIN, so **every probe sends an `Authorization` header** — an unauthenticated 200 proves nothing.
- **Branch:** `feat/admin-platform-upgrade`.

---

## Dependencies on the sibling plans

| Interface                                                                                                                                                                                                                                | Owner        | What this plan assumes                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-market-scope.regression.spec.ts` collector widened from `/^(admin-.*\|ddos-admin)\.controller\.ts$/` to **any controller file whose class or route block carries `@Roles(...)` with an admin role**                               | **REGIONAL** | T2's `/taxi/admin/*` routes must comply with the _existing_ rule (`SCOPED` regex: `resolveMarket(`, `marketScopeOf(`, `assertRecordInScope(`, `this.scopeOf(`, `refuseLockedAdmin(`) or carry `@GlobalEntity(reason)`. T2 writes the compliance; REGIONAL writes the collector change. T2 Step 1 adds a **local** copy of the widened collector as a taxi-specific spec so this plan is not blocked. |
| `apiCall` with `AbortController`, `X-Region-Code`, 401-refresh and a `string \| string[]` → `string` error normaliser; `DataTable<T>`, `EmptyState`, `ErrorState`, `Skeleton`, `StatusBadge`, `Money` in `packages/shared-ui/src/admin/` | **CONSOLE**  | T8 consumes them. If CONSOLE has not landed, T8 Step 2 keeps the page-local states but **must** route every call through `adminTaxiApi` (never a bare `fetch`) and must render an error state — the honesty requirement does not wait on the design system.                                                                                                                                          |
| `/admin-fleet` Socket.IO namespace, room authorisation, and `joinAsDriver`/`updateDriverLocation` taking the driver from the token (AUD2-062, AUD2-133)                                                                                  | **EVENTS**   | T9 does **not** create the namespace. It provides the taxi-side contract EVENTS fans out (`taxi:driver:loc:<id>` payload carrying `countryCode`, room name `fleet:<cc>`) and the console consumer. AUD2-062 and AUD2-133 are referenced, not closed here.                                                                                                                                            |
| `data-source.taxi.ts`, `modules/taxi/backend/migrations/`, `npm run migration:run:taxi`                                                                                                                                                  | **INFRA**    | T4, T5, T6 write migration files against that path.                                                                                                                                                                                                                                                                                                                                                  |

---

## File structure

| File                                                                      | Responsibility                                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `modules/taxi/backend/src/transport/http-surface.guard.ts` (new)          | closes the module's HTTP surface to health only (copy of marketplace's)                                                        |
| `modules/taxi/backend/src/transport/http-surface.spec.ts` (new)           | proves every non-health route is refused over HTTP                                                                             |
| `modules/taxi/backend/src/main.ts`                                        | bind loopback, global `HttpSurfaceGuard` + `InternalServiceGuard`, drop `enableCors()`                                         |
| `modules/taxi/backend/src/taxi.controller.ts`                             | 34 `admin/*` HTTP decorators removed; the TCP handler block grows to 37 patterns                                               |
| `apps/api/apps/api-gateway/src/controllers/taxi.controller.ts`            | legacy `/taxi/admin/*` block resolved (7 deleted, 4 kept with roles + perm + scope); the duplicate fare implementation deleted |
| `apps/api/apps/api-gateway/src/controllers/taxi.controller.spec.ts` (new) | pins the legacy block's disposition and the estimate delegation                                                                |
| `apps/api/apps/api-gateway/src/guards/taxi-admin-exposure.spec.ts` (new)  | every `/taxi/admin/*` route carries a role, a perm key and a scope call                                                        |
| `apps/api/libs/region/src/region.geo.ts` (new)                            | `countryFromCoords(lat, lng)` — the bounding boxes extracted from `RegionService`                                              |
| `apps/api/libs/region/src/region.geo.spec.ts` (new)                       | unit tests for the extraction                                                                                                  |
| `modules/taxi/backend/src/services/taxi-config.service.ts`                | market-keyed rate cards, `purgeMarket`, currency from the registry                                                             |
| `modules/taxi/backend/src/services/fare-calculation.service.ts`           | country from coordinates; `zoneId` no longer prices anything                                                                   |
| `modules/taxi/backend/src/services/surge.service.ts` (new)                | surge zones with a market, `taxi:surge:<cc>:<zone>`, demand counters                                                           |
| `modules/taxi/backend/src/services/taxi-admin.service.ts` (new)           | dashboard, fleet, pending approvals, compliance, routes, settings                                                              |
| `modules/taxi/backend/src/services/trip-admin.service.ts` (new)           | trip list/detail/timeline, disputes                                                                                            |
| `modules/taxi/backend/src/entities/taxi-surge-zone.entity.ts` (new)       | `countryCode`, zone key, multiplier, window, cap                                                                               |
| `modules/taxi/backend/src/entities/taxi-vehicle.entity.ts` (new)          | plate, category, vendor/driver, inspection, `countryCode`                                                                      |
| `modules/taxi/backend/src/entities/taxi-service-area.entity.ts` (new)     | GeoJSON polygon, `countryCode`, city, active                                                                                   |
| `modules/taxi/backend/src/entities/taxi-trip-event.entity.ts` (new)       | ride id, type, at, lat/lng, actor, `countryCode`                                                                               |
| `modules/taxi/backend/src/entities/taxi-dispute.entity.ts` (new)          | ride, party, amount, status, `countryCode`                                                                                     |
| `modules/taxi/backend/migrations/*.ts` (new, 3 files)                     | DDL for the five entities (pending the INFRA runner)                                                                           |
| `apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts`      | perm keys on all routes; new vehicle/trip/dispute/surge-zone routes; paging echoed                                             |
| `apps/api/apps/api-gateway/src/dto/admin-taxi.dto.ts`                     | new validated bodies; `emergencyNumber` made required-when-present                                                             |
| `packages/shared-core/src/api/admin-taxi.ts`                              | the missing client methods; paged list type; honest errors                                                                     |
| `apps/web/src/app/admin/taxi/**`                                          | pages on `adminTaxiApi` with real states; dead pages resolved                                                                  |
| `apps/api/scripts/verification/taxi-ops-authz.mjs` (new)                  | the live three-identity proof                                                                                                  |

---

### Task 1 (D1): The taxi module's HTTP surface is closed — 34 role-free `admin/*` routes stop existing

**Closes: AUD2-057** (= H-02, privilege escalation: any authenticated customer can approve payouts, block vendors, delete rate cards).

**Files:**

- Create: `modules/taxi/backend/src/transport/http-surface.guard.ts`
- Create: `modules/taxi/backend/src/transport/http-surface.spec.ts`
- Modify: `modules/taxi/backend/src/main.ts:16-36`
- Modify: `modules/taxi/backend/src/taxi.controller.ts` (remove 34 `admin/*` HTTP decorators; `@AllowHttp()` on health; `adminId` from the payload, never the body)

**Interfaces:**

- Produces: `HttpSurfaceGuard`, `AllowHttp()` (`ALLOW_HTTP_KEY = 'taxi:allowHttp'`), identical in behaviour to `modules/marketplace/backend/src/transport/http-surface.guard.ts` — 404 on any non-`@AllowHttp()` HTTP route, `true` for every non-HTTP context so TCP and gRPC are untouched.
- Consumes: `InternalServiceGuard` (`@app/security`), `Reflector` (`@nestjs/core`).
- Produces (TCP, in T5): `admin.taxi.vendor.register`, `admin.taxi.vendor.reactivate`, `admin.taxi.vendor.drivers.add/remove`, `admin.taxi.driver.register`, `admin.taxi.driver.onboarding`, `admin.taxi.documents.submit`, `admin.taxi.documents.byOwner`, `admin.taxi.rate_card.delete`, `admin.taxi.payouts.approve`, `admin.taxi.payouts.retry`, `admin.taxi.config.requiredDocuments`.

**Route disposition — all 34, one per row.** `twin` = an `admin-taxi.controller.ts` route already reaches an equivalent TCP handler, so the HTTP method is deleted outright. `→ TCP` = no twin exists; the HTTP decorator is deleted and the method body moves to a `@MessagePattern` in the task named.

| #   | route (`modules/taxi/backend/src/taxi.controller.ts`) | line | disposition                                                                                                |
| --- | ----------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| 1   | `GET admin/vendors`                                   | 224  | twin (`admin.taxi.vendors`) — **delete**                                                                   |
| 2   | `GET admin/vendors/:id`                               | 230  | → TCP `admin.taxi.vendorDetail` (**T5**)                                                                   |
| 3   | `GET admin/vendors/:id/dashboard`                     | 236  | → TCP `admin.taxi.vendor.dashboard` (**T5**)                                                               |
| 4   | `POST admin/vendors`                                  | 242  | → TCP `admin.taxi.vendor.register` (**T5**)                                                                |
| 5   | `POST admin/vendors/:id/approve`                      | 248  | → TCP `admin.taxi.approveVendor` (**T5**)                                                                  |
| 6   | `POST admin/vendors/:id/reject`                       | 254  | → TCP `admin.taxi.rejectVendor` (**T5**)                                                                   |
| 7   | `POST admin/vendors/:id/suspend`                      | 260  | → TCP `admin.taxi.suspendVendor` (**T5**)                                                                  |
| 8   | `POST admin/vendors/:id/block`                        | 266  | → TCP `admin.taxi.blockVendor` (**T5**)                                                                    |
| 9   | `POST admin/vendors/:id/reactivate`                   | 272  | → TCP `admin.taxi.vendor.reactivate` (**T5**)                                                              |
| 10  | `POST admin/vendors/:vendorId/drivers`                | 278  | → TCP `admin.taxi.vendor.drivers.add` (**T5**)                                                             |
| 11  | `DELETE admin/vendors/:vendorId/drivers/:driverId`    | 284  | → TCP `admin.taxi.vendor.drivers.remove` (**T5**)                                                          |
| 12  | `GET admin/drivers`                                   | 297  | twin (`admin.taxi.drivers`) — **delete**                                                                   |
| 13  | `GET admin/drivers/:id`                               | 303  | → TCP `admin.taxi.driverDetail` (**T5**)                                                                   |
| 14  | `GET admin/drivers/:id/onboarding`                    | 309  | → TCP `admin.taxi.driver.onboarding` (**T5**)                                                              |
| 15  | `POST admin/drivers`                                  | 315  | → TCP `admin.taxi.driver.register` (**T5**)                                                                |
| 16  | `POST admin/drivers/:id/approve`                      | 321  | → TCP `admin.taxi.approveDriver` (**T5**)                                                                  |
| 17  | `POST admin/drivers/:id/suspend`                      | 327  | twin (`admin.taxi.driver.suspend`) — **delete**                                                            |
| 18  | `POST admin/drivers/:id/block`                        | 333  | twin (`admin.taxi.driver.block`) — **delete**                                                              |
| 19  | `GET admin/documents/pending`                         | 343  | twin (`admin.taxi.documents.pending`) — **delete**                                                         |
| 20  | `GET admin/documents/:ownerType/:ownerId`             | 349  | → TCP `admin.taxi.documents.byOwner` (**T5**)                                                              |
| 21  | `POST admin/documents`                                | 358  | → TCP `admin.taxi.documents.submit` (**T5**)                                                               |
| 22  | `POST admin/documents/:id/review`                     | 364  | twin (`admin.taxi.documents.review`) — **delete**                                                          |
| 23  | `GET admin/config`                                    | 374  | twin (`admin.taxi.configs`) — **delete**                                                                   |
| 24  | `GET admin/config/:countryCode`                       | 380  | twin (`admin.taxi.config.get`) — **delete**                                                                |
| 25  | `PUT admin/config/:countryCode`                       | 386  | twin (`admin.taxi.config.upsert`) — **delete**                                                             |
| 26  | `GET admin/config/:cc/documents/:ownerType`           | 392  | → TCP `admin.taxi.config.requiredDocuments` (**T5**)                                                       |
| 27  | `GET admin/rates/:countryCode`                        | 405  | twin (`admin.taxi.rate_cards`) — **delete**                                                                |
| 28  | `PUT admin/rates/:cc/:vehicleType`                    | 411  | twin (`admin.taxi.rate_card.upsert`) — **delete**                                                          |
| 29  | `DELETE admin/rates/:cc/:vehicleType`                 | 421  | → TCP `admin.taxi.rate_card.delete` (**T3**)                                                               |
| 30  | `GET admin/payouts`                                   | 434  | twin (`admin.taxi.payouts`) — **delete**                                                                   |
| 31  | `GET admin/payouts/summary`                           | 440  | twin (`admin.taxi.payouts.summary`) — **delete**                                                           |
| 32  | `POST admin/payouts/approve`                          | 454  | → TCP `admin.taxi.payouts.approve` (**T5**) — **and the approver comes from the token, not `dto.adminId`** |
| 33  | `POST admin/payouts/process`                          | 466  | twin (`admin.taxi.payouts.process`) — **delete**                                                           |
| 34  | `POST admin/payouts/:id/retry`                        | 472  | → TCP `admin.taxi.payouts.retry` (**T5**)                                                                  |

The 11 non-admin vendor-portal routes (`vendor/:vendorId/*`) and 5 driver-portal routes (`driver/:driverId/*`) are closed by the same guard. They have no caller: nothing outside `modules/taxi/backend` references port 3021 except `health.controller.ts`'s port report and the k8s probes, which are `tcpSocket`, not `httpGet` (`infra/k8s/microservices-generated.yaml:1544,1550`). Step 2 re-proves that before the guard goes in.

- [ ] **Step 1: Write the failing spec**

`modules/taxi/backend/src/transport/http-surface.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpSurfaceGuard } from './http-surface.guard';

const CONTROLLER = path.join(__dirname, '..', 'taxi.controller.ts');

function ctx(type: 'http' | 'rpc', url = '/taxi/admin/payouts/approve'): ExecutionContext {
  return {
    getType: () => type,
    getHandler: () => function handler() {},
    getClass: () => class Cls {},
    switchToHttp: () => ({ getRequest: () => ({ method: 'POST', url }) }),
  } as unknown as ExecutionContext;
}

describe('taxi HTTP surface', () => {
  const guard = new HttpSurfaceGuard(new Reflector());

  it('refuses an HTTP request with 404, not 403 — a 403 confirms the route exists', () => {
    expect(() => guard.canActivate(ctx('http'))).toThrow(NotFoundException);
  });

  it('never touches TCP or gRPC — the real transports', () => {
    expect(guard.canActivate(ctx('rpc'))).toBe(true);
  });

  it('declares no admin HTTP route at all', () => {
    const src = fs.readFileSync(CONTROLLER, 'utf8');
    const admin = src.match(/@(?:Get|Post|Put|Patch|Delete)\(\s*'admin[^']*'/g) ?? [];
    expect(admin).toEqual([]);
  });

  it('never takes the acting admin from a request body', () => {
    const src = fs.readFileSync(CONTROLLER, 'utf8');
    expect(src).not.toMatch(/dto\.adminId/);
  });
});
```

- [ ] **Step 2: Run it, and re-prove nothing calls the HTTP surface**

Run from `modules/taxi/backend`: `npx vitest run src/transport/http-surface.spec.ts`
Expected: FAIL — `Cannot find module './http-surface.guard'`.

Then, from the repo root:

```bash
grep -rn "3021\|TAXI_SERVICE_PORT\|taxi-service:3021" --include=*.ts --include=*.tsx --include=*.dart --include=*.yaml --include=*.yml . | grep -v node_modules | grep -v "/dist/"
```

Expected: only `apps/api/.env`, `health.controller.ts:268` (a port _report_, not a call), `infra/k8s/{config,microservices-generated}.yaml`, `services.yaml`, `modules/taxi/backend/{.env.example,package.json,src/main.ts,src/taxi-service.module.ts}`. No caller. If a caller appears, stop and route it through the gateway first.

- [ ] **Step 3: Add the guard**

`modules/taxi/backend/src/transport/http-surface.guard.ts` — copy `modules/marketplace/backend/src/transport/http-surface.guard.ts` verbatim, changing only the metadata key and the docstring:

```ts
export const ALLOW_HTTP_KEY = 'taxi:allowHttp';

/**
 * Marks a route as intentionally reachable over HTTP. Health probes only.
 */
export const AllowHttp = () => SetMetadata(ALLOW_HTTP_KEY, true);

/**
 * HttpSurfaceGuard — closes the taxi service's HTTP surface.
 *
 * This service is reached by the API Gateway over TCP (:4027) and gRPC (:5007).
 * `app.listen(3021)` also published a second, parallel copy of the entire API,
 * including 34 `admin/*` routes that carried `@UseGuards(JwtAuthGuard)` and no
 * `RolesGuard` and no `@Roles`. Any authenticated customer with reach to the
 * port could approve and process payout batches, block or approve vendors and
 * DELETE a country's rate cards (H-02 / AUD2-057); `adminApprovePayouts` took
 * the approving identity from `dto.adminId` in the request body, so the audit
 * trail for money leaving the platform was caller-supplied.
 *
 * The surface is closed rather than re-guarded: every one of those routes has
 * a TCP twin behind the gateway, or gains one in Plan D tasks 3-7, and the
 * gateway authorises, permission-checks and market-scopes all of them.
 *
 * Answers 404, not 403: a 403 confirms the route exists and is worth attacking.
 */
```

- [ ] **Step 4: Bind it in `main.ts`**

Replace lines 16-18 and 33-36 of `modules/taxi/backend/src/main.ts`:

```ts
import { NestFactory, Reflector } from '@nestjs/core';
import { InternalServiceGuard } from '@app/security';
import { HttpSurfaceGuard } from './transport/http-surface.guard';
```

```ts
const app = await NestFactory.create(TaxiServiceModule);
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
// Ordered first so it rejects before any route-level guard runs. TCP and
// gRPC contexts pass straight through; InternalServiceGuard still
// authenticates those when INTERNAL_SERVICE_SECRET is configured.
app.useGlobalGuards(new HttpSurfaceGuard(app.get(Reflector)), new InternalServiceGuard());
// `enableCors()` with no arguments reflects any origin. Removed: a
// health-only surface has no browser caller, and if one ever does it goes
// through the gateway.
```

and the listen block:

```ts
const httpPort = +(process.env.TAXI_SERVICE_PORT ?? 3021);
// Loopback by default; the k8s probes are tcpSocket on the pod IP, so the
// manifest sets TAXI_HTTP_HOST=0.0.0.0 explicitly. The guard is what makes
// that safe — the bind address is defence in depth.
const httpHost = process.env.TAXI_HTTP_HOST ?? '127.0.0.1';
await app.listen(httpPort, httpHost);
Logger.log(
  `🚖 Taxi Service — TCP :${tcpPort} | gRPC :${grpcPort} | health http://${httpHost}:${httpPort}/taxi/health`,
  'Bootstrap',
);
```

- [ ] **Step 5: Strip the 34 admin decorators and fix the payout actor**

In `modules/taxi/backend/src/taxi.controller.ts`:

1. `@AllowHttp()` on `health()` (line 87), importing `AllowHttp` from `./transport/http-surface.guard`.
2. Delete the 20 methods marked **delete** in the table above, together with their decorators and the now-unused DTO imports.
3. For the 14 marked **→ TCP**, delete only the `@Get/@Post/@Put/@Delete('admin/...')` + `@UseGuards(JwtAuthGuard)` decorator pair and move the method into the TCP block as a `@MessagePattern`, in the task named. If the owning task has not run yet, leave the method as a plain (undecorated) private helper with a `// → @MessagePattern in Plan D T<n>` comment — it is unreachable either way and the spec in Step 1 only asserts that no `admin` HTTP decorator survives.
4. `adminApprovePayouts` moves to T5 as `admin.taxi.payouts.approve` taking `adminId` from the **payload the gateway wrote from the token**; the `dto.adminId` read and the `BadRequestException` guarding it are deleted along with the HTTP route. Remove `adminId` from the module's `PayoutBatchDto` (`modules/taxi/backend/src/dto/taxi.dto.ts:384-386`) so a body can never supply one again.

- [ ] **Step 6: Run the spec, the suite and the build**

```
cd modules/taxi/backend
npx vitest run src/transport/http-surface.spec.ts     # 4 passed
npx vitest run                                         # ≥ 24 passed (20 baseline + 4)
npx nest build                                         # exits 0
```

- [ ] **Step 7: Live probe**

Start the taxi backend from its dist, then:

```bash
# a plain customer token — register/login as a customer on the gateway first
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer $CUSTOMER" \
  -H 'Content-Type: application/json' -d '{"payoutIds":["x"],"adminId":"me"}' \
  http://127.0.0.1:3021/taxi/admin/payouts/approve          # 404 (was 200/201)
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $CUSTOMER" \
  http://127.0.0.1:3021/taxi/admin/drivers                   # 404
curl -s -w "\n%{http_code}\n" http://127.0.0.1:3021/taxi/health   # 200, {"status":...}
# the gateway path still works, as SUPER_ADMIN, over TCP:
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $SUPER" \
  http://127.0.0.1:3099/api/v1/admin/taxi/drivers            # 200
```

- [ ] **Step 8: Commit (module only)**

```bash
git add modules/taxi/backend/src/main.ts modules/taxi/backend/src/transport modules/taxi/backend/src/taxi.controller.ts modules/taxi/backend/src/dto/taxi.dto.ts
git commit -m "fix(taxi): close the module http surface; 34 role-free admin routes stop existing" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2 (D2): The gateway's legacy `/taxi/admin/*` block is resolved, and the regression spec can see it

**Closes: the Plan B carry-over "`/taxi/admin/*` blind spot and its second audit trail".** Prepares AUD2-019 (T3 deletes the duplicate fare implementation in the same file).

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/taxi.controller.ts:1504-1710` (the `ADMIN ENDPOINTS` block)
- Create: `apps/api/apps/api-gateway/src/guards/taxi-admin-exposure.spec.ts`
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts` (two new routes absorb what is kept)

**Interfaces:**

- Consumes: `marketScopeOf`, `resolveMarket`, `refuseLockedAdmin` (`../guards/market-scope`); `assertInMarket` (`@app/common`).
- Produces: `GET /admin/taxi/sos`, `GET /admin/taxi/disputes` on `admin-taxi.controller.ts` (the two legacy reads worth keeping), sending `admin.taxi.sos` and `admin.taxi.disputes` — **both implemented in T6**, so this task declares them and T6 fills them. Declaring a route whose handler lands two tasks later is the one place the gateway may temporarily answer 503; the spec in Step 1 asserts the 503 is honest (no fallback, no invented body).
- The **REGIONAL** interface: this file becomes collectable. Its class has no class-level `@Roles`, so the widened collector will pick up the route blocks that carry one. Every surviving `/taxi/admin/*` route must therefore contain `this.scopeOf(` / `resolveMarket(` / `refuseLockedAdmin(` in its handler block, or `@GlobalEntity(reason)`.

**Route disposition — all 11.**

| #   | route                                 | line | disposition                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `GET taxi/admin/dashboard`            | 1506 | **delete.** Returns six hard-coded integers (`activeRides: 2, onlineDrivers: 12, …`) — mock data on a live admin route. `GET /admin/taxi/dashboard` is the real one (T7).                                                                                                                                                                                                                                          |
| 2   | `GET taxi/admin/vendors`              | 1522 | **delete.** `db.find(TaxiVendor)` with no market predicate, superseded by `GET /admin/taxi/vendors` (`admin.taxi.vendors`, scoped since Plan A).                                                                                                                                                                                                                                                                   |
| 3   | `POST taxi/admin/vendors/:id/approve` | 1534 | **delete.** Superseded by `PATCH /admin/taxi/vendors/:id/approve` (T5).                                                                                                                                                                                                                                                                                                                                            |
| 4   | `POST taxi/admin/vendors/:id/reject`  | 1557 | **delete.** T5 adds `PATCH /admin/taxi/vendors/:id/reject`.                                                                                                                                                                                                                                                                                                                                                        |
| 5   | `GET taxi/admin/drivers`              | 1578 | **delete.** Superseded by `GET /admin/taxi/drivers`.                                                                                                                                                                                                                                                                                                                                                               |
| 6   | `POST taxi/admin/drivers/:id/approve` | 1588 | **delete.** Superseded by `PATCH /admin/taxi/drivers/:id/approve` (T5).                                                                                                                                                                                                                                                                                                                                            |
| 7   | `GET taxi/admin/fare-rules`           | 1609 | **delete.** `TaxiFareRule` is the second fare model; T3 deletes the whole duplicate.                                                                                                                                                                                                                                                                                                                               |
| 8   | `POST taxi/admin/fare-rules`          | 1620 | **delete.** Same; rate cards are `POST /admin/taxi/rates`.                                                                                                                                                                                                                                                                                                                                                         |
| 9   | `GET taxi/admin/sos`                  | 1683 | **keep, move.** No twin exists and SOS is real operational data. Becomes `GET /admin/taxi/sos` on `admin-taxi.controller.ts` with roles + `perm:modules.taxi` + `this.scopeOf(`.                                                                                                                                                                                                                                   |
| 10  | `GET taxi/admin/disputes`             | 1694 | **keep, move.** Becomes `GET /admin/taxi/disputes` (T6 owns the handler and the entity).                                                                                                                                                                                                                                                                                                                           |
| 11  | `GET taxi/admin/audit-logs`           | 1705 | **delete.** This is the "second audit trail": `TaxiAuditLog` rows written only by routes 3/4/6/8, all of which are deleted here. Taxi admin actions belong in the platform audit trail (`audit-log-service`, which Plan B made the single store). Writes to `TaxiAuditLog` from the deleted routes go with them; the entity stays in `../entities` because the gateway's non-admin taxi routes still reference it. |

Net: 9 deleted, 2 moved, 0 remaining under `/taxi/admin`.

- [ ] **Step 1: Write the failing spec**

`apps/api/apps/api-gateway/src/guards/taxi-admin-exposure.spec.ts` — a local pre-image of the widened collector, so this task is provable before REGIONAL lands:

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CONTROLLERS = path.join(__dirname, '..', 'controllers');
const HTTP = /^\s*@(Get|Post|Put|Patch|Delete|All)\(\s*(?:'([^']*)')?\s*\)/;
const ADMIN_ROLE = /@Roles\([^)]*(UserRole\.(SUPER_ADMIN|ADMIN)|'(SUPER_ADMIN|ADMIN)')/;
const PERM = /@Roles\([^)]*'perm:[a-z.]+'/;
const SCOPED =
  /resolveMarket\(|marketScopeOf\(|assertRecordInScope\(|this\.scopeOf\(|refuseLockedAdmin\(/;

/**
 * The blind spot this closes: `admin-market-scope.regression.spec.ts` collects
 * only files matching `admin-*.controller.ts`, and every admin route it knows
 * about is under the `/admin` path. `taxi.controller.ts` is `@Controller('taxi')`
 * and its admin block sits at `/taxi/admin/*`, so eleven role-gated,
 * market-free admin routes were invisible to both regression specs — including
 * one that returned six hard-coded integers as a live dashboard.
 */
function adminRoutes(file: string) {
  const src = fs
    .readFileSync(path.join(CONTROLLERS, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .split('\n');
  const base = (src.join('\n').match(/@Controller\(\s*'([^']*)'/) || [])[1] ?? '';
  const lines = src.map((l, i) => ({ l, i })).filter(({ l }) => HTTP.test(l));
  return lines.map(({ l, i }, idx) => {
    const next = idx + 1 < lines.length ? lines[idx + 1].i : src.length;
    let start = i;
    while (start > 0 && /^\s*(@|\)|\*|\/\/)/.test(src[start - 1])) start--;
    const block = src.slice(start, next).join('\n');
    const sub = l.match(HTTP)![2] ?? '';
    return {
      verb: l.match(HTTP)![1].toUpperCase(),
      path: ('/' + base + (sub ? '/' + sub : '')).replace(/\/+/g, '/'),
      adminRole: ADMIN_ROLE.test(block),
      perm: PERM.test(block),
      scoped: SCOPED.test(block),
    };
  });
}

describe('the legacy taxi controller exposes no unscoped admin route', () => {
  const routes = adminRoutes('taxi.controller.ts');

  it('declares nothing under /taxi/admin any more', () => {
    const left = routes.filter((r) => r.path.startsWith('/taxi/admin'));
    expect(left.map((r) => `${r.verb} ${r.path}`)).toEqual([]);
  });

  it('every admin-role route in the file resolves a market', () => {
    const report = routes
      .filter((r) => r.adminRole && !r.scoped)
      .map((r) => `  ${r.verb} ${r.path}`)
      .join('\n');
    expect(report).toBe('');
  });
});

describe('admin-taxi.controller.ts carries a permission key on every route', () => {
  const routes = adminRoutes('admin-taxi.controller.ts');

  it('has a perm: key on each, so an ADMIN without modules.taxi is refused', () => {
    // The class-level @Roles(ADMIN, SUPER_ADMIN) admits every admin in the
    // platform. The permission claim (Plan B) is what distinguishes a taxi
    // operations admin from a marketplace one; without a perm: key the
    // distinction exists in the console nav only — frontend-only permission.
    const report = routes
      .filter((r) => !r.perm)
      .map((r) => `  ${r.verb} ${r.path}`)
      .join('\n');
    expect(report).toBe('');
  });

  it('every route resolves a market', () => {
    expect(routes.filter((r) => !r.scoped).map((r) => r.path)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it — FAIL on 11 + ~40 lines**

Run from `apps/api`: `npx vitest run apps/api-gateway/src/guards/taxi-admin-exposure.spec.ts`
Expected: FAIL on all four `it`s — 11 `/taxi/admin/*` routes listed, 11 unscoped, and every `admin-taxi.controller.ts` route missing a `perm:` key.

- [ ] **Step 3: Delete the nine, move the two**

Delete lines 1504-1682 and 1705-1715 of `apps/api/apps/api-gateway/src/controllers/taxi.controller.ts`, leaving a tombstone comment:

```ts
// ─── ADMIN ENDPOINTS ────────────────────────────────────────────────────────
//
// Removed 2026-09-12 (Plan D T2). Eleven routes lived here under
// `/taxi/admin/*`: role-gated to SUPER_ADMIN, but market-free, invisible to
// `admin-market-scope.regression.spec.ts` (which collects `admin-*.controller.ts`
// only), and in one case — `GET admin/dashboard` — six hard-coded integers
// served as live counters. Nine were duplicates of `/admin/taxi/*`, which is
// scoped, permission-keyed and backed by taxi-service. `admin/sos` and
// `admin/disputes` moved to `admin-taxi.controller.ts`. `admin/audit-logs`
// read `TaxiAuditLog`, a second audit trail written only by the routes
// deleted here; taxi admin actions are in the platform trail
// (audit-log-service) from Plan B onward.
```

Add to `admin-taxi.controller.ts`:

```ts
  // ── Safety & disputes ─────────────────────────────────────────────────────

  @Get('sos')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.taxi')
  @ApiOperation({ summary: 'Active SOS emergency cases in a market' })
  @ApiQuery({ name: 'countryCode', required: false })
  async sosCases(
    @Req() req: any,
    @Query('countryCode') countryCode?: string,
    @Query('status') status?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those SOS cases');
    return this.send('admin.taxi.sos', { countryCode: market, status, scope });
  }

  @Get('disputes')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.taxi')
  @ApiOperation({ summary: 'Fare and conduct disputes in a market' })
  @ApiQuery({ name: 'countryCode', required: false })
  async disputes(
    @Req() req: any,
    @Query('countryCode') countryCode?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those disputes');
    return this.send('admin.taxi.disputes', {
      countryCode: market,
      status,
      page: +page,
      limit: +limit,
      scope,
    });
  }
```

- [ ] **Step 4: Put a permission key on every `admin-taxi.controller.ts` route**

The class keeps `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)`; each route adds its own, which `RolesGuard` merges (route metadata overrides class metadata, so the route decorator must repeat the roles). Apply mechanically:

- reads and writes on drivers, vendors, vehicles, rides, complaints, fleet, surge, rates, config, routes, settings, compliance, pending-approvals, documents, dashboard, sos, disputes →
  `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.taxi')`
- payouts (`payouts`, `payouts/process`, `payouts/summary`, `payouts/:id/approve`) →
  `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')`

Both keys exist in `apps/api/libs/common/src/admin/permissions.ts` (`modules.taxi` at :71, `finance.payouts` in the Finance group). Do **not** invent a new key; if a route needs one the registry lacks, add it to `permissions.ts` in the same commit and to the role defaults for `regional_admin`.

- [ ] **Step 5: Run the spec, the whole gateway suite and the build**

```
cd apps/api
npx vitest run apps/api-gateway/src/guards/taxi-admin-exposure.spec.ts   # 4 passed
npx vitest run apps/api-gateway                                          # green
npx nest build --all                                                     # exits 0
```

`/admin/taxi/sos` and `/admin/taxi/disputes` answer 503 until T6 — assert that, and assert the body is the gateway's own `Taxi service unavailable`, not an invented list.

- [ ] **Step 6: Live probe (three identities)**

```bash
for T in "$QA" "$IN" "$SUPER"; do
  curl -s -o /dev/null -w "%{http_code} " -H "Authorization: Bearer $T" \
    http://127.0.0.1:3099/api/v1/taxi/admin/dashboard        # 404 404 404
done; echo
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" \
  "http://127.0.0.1:3099/api/v1/admin/taxi/sos?countryCode=IN"          # 403
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $SUPER" \
  "http://127.0.0.1:3099/api/v1/admin/taxi/sos?countryCode=IN"          # 503 until T6
```

- [ ] **Step 7: Commit (gateway only)**

```bash
git add apps/api/apps/api-gateway/src/controllers/taxi.controller.ts apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts apps/api/apps/api-gateway/src/guards/taxi-admin-exposure.spec.ts
git commit -m "fix(gateway): retire the legacy /taxi/admin block; permission keys on every admin taxi route" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3 (D3): One fare implementation, keyed on the market the ride actually happens in

**Closes: AUD2-018** (`zoneId?.split('-')[0] || 'IN'` prices every market off India), **AUD2-019** (the gateway's second fare implementation with `DEFAULT_ZONE` keys and hard-coded `INR`), and the `pricing` / `updatePricing` handlers from the census.

**Files:**

- Create: `apps/api/libs/region/src/region.geo.ts`, `region.geo.spec.ts`; export from `apps/api/libs/region/src/index.ts`
- Modify: `apps/api/libs/region/src/region.service.ts:170-199` (delegate)
- Modify: `modules/taxi/backend/src/services/fare-calculation.service.ts:48-78,189-230`
- Modify: `modules/taxi/backend/src/services/taxi-config.service.ts:23-30,133-236`
- Create: `modules/taxi/backend/src/services/__tests__/fare-market.spec.ts`
- Modify: `apps/api/apps/api-gateway/src/controllers/taxi.controller.ts:88-191` (delete the duplicate; delegate)
- Modify: `modules/taxi/backend/src/taxi.controller.ts` (TCP `admin.taxi.pricing`, `admin.taxi.updatePricing`, `admin.taxi.rate_card.delete`)

**Interfaces:**

- Produces (`@app/region`): `countryFromCoords(lat: number, lng: number): SupportedCountryCode | null` — pure, no I/O, the bounding boxes lifted out of `RegionService.resolveCountryFromCoords`.
- `FareCalculationService.estimateAllVehicleTypes({ pickupLat, pickupLng, dropLat, dropLng, countryCode? })` — `zoneId` is **gone from the signature**. `countryCode` is accepted only as a server-supplied override (the rider's verified market claim); when absent it is derived from the pickup point; when neither resolves, the estimate refuses rather than guessing.
- `TaxiConfigService.getRateCard(countryCode, vehicleType)` — unchanged signature, key renamed to `taxi:rates:<cc>:<vt>`; `purgeMarket(countryCode)` added.
- TCP: `admin.taxi.pricing { countryCode, scope }` → `{ countryCode, currency, rateCards, surgeLimits, peakHourConfig }`; `admin.taxi.updatePricing { countryCode, vehicleType, …RateCardUpsertDto, scope, adminId }`; `admin.taxi.rate_card.delete { countryCode, vehicleType, scope, adminId }`.

- [ ] **Step 1: Write the failing specs**

`apps/api/libs/region/src/region.geo.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { countryFromCoords } from './region.geo';

describe('countryFromCoords', () => {
  it('puts Doha in Qatar and Mumbai in India', () => {
    expect(countryFromCoords(25.2854, 51.531)).toBe('QA');
    expect(countryFromCoords(19.076, 72.8777)).toBe('IN');
  });
  it('resolves the Gulf neighbours the taxi module trades in', () => {
    expect(countryFromCoords(25.2048, 55.2708)).toBe('AE'); // Dubai
    expect(countryFromCoords(24.7136, 46.6753)).toBe('SA'); // Riyadh
    expect(countryFromCoords(29.3759, 47.9774)).toBe('KW'); // Kuwait City
  });
  it('returns null in the middle of the Atlantic rather than a default', () => {
    // The bug this replaces defaulted to 'IN'. A fare engine that guesses a
    // market silently prices a Qatari ride off India's card.
    expect(countryFromCoords(0, -30)).toBeNull();
  });
});
```

`modules/taxi/backend/src/services/__tests__/fare-market.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FareCalculationService } from '../fare-calculation.service';

function build() {
  const store = new Map<string, unknown>();
  const redis = {
    getJson: vi.fn(async (k: string) => store.get(k) ?? null),
    setJson: vi.fn(async (k: string, v: unknown) => void store.set(k, v)),
    get: vi.fn(async (k: string) => (store.get(k) as string) ?? null),
    georadius: vi.fn(async () => ['drv-1', 'drv-2']),
  };
  const asked: Array<[string, string]> = [];
  const config = {
    getRateCard: vi.fn(async (cc: string, vt: string) => {
      asked.push([cc, vt]);
      return { baseFare: 10, distanceRate: 2, timeRate: 1, minimumFare: 12, waitingRate: 1 };
    }),
    getCountryConfig: vi.fn(async (cc: string) => ({
      countryCode: cc,
      currency: cc === 'QA' ? 'QAR' : 'INR',
    })),
  };
  const surge = { getMultiplier: vi.fn(async () => 1) };
  const svc = new FareCalculationService(redis as any, config as any, surge as any);
  return { svc, asked, redis, config, surge };
}

describe('the fare engine prices in the market the ride happens in', () => {
  it('derives Qatar from Doha pickup coordinates — no zoneId anywhere', async () => {
    const { svc, asked } = build();
    await svc.estimateAllVehicleTypes({
      pickupLat: 25.2854,
      pickupLng: 51.531,
      dropLat: 25.32,
      dropLng: 51.52,
    });
    expect(asked.every(([cc]) => cc === 'QA')).toBe(true);
    expect(asked.some(([cc]) => cc === 'IN')).toBe(false);
  });

  it('asks the surge service for that market and zone, never a bare zone', async () => {
    const { svc, surge } = build();
    await svc.estimateAllVehicleTypes({
      pickupLat: 25.2854,
      pickupLng: 51.531,
      dropLat: 25.32,
      dropLng: 51.52,
    });
    expect(surge.getMultiplier).toHaveBeenCalledWith('QA', expect.stringMatching(/^h3:/));
  });

  it('returns the market currency, not a hard-coded INR', async () => {
    const { svc } = build();
    const out = await svc.estimateAllVehicleTypes({
      pickupLat: 25.2854,
      pickupLng: 51.531,
      dropLat: 25.32,
      dropLng: 51.52,
    });
    expect(out.currency).toBe('QAR');
  });

  it('refuses an estimate it cannot attribute to a market', async () => {
    const { svc } = build();
    await expect(
      svc.estimateAllVehicleTypes({ pickupLat: 0, pickupLng: -30, dropLat: 0, dropLng: -29 }),
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Run both — FAIL**

`npx vitest run libs/region/src/region.geo.spec.ts` (from `apps/api`) → `Cannot find module './region.geo'`.
`npx vitest run src/services/__tests__/fare-market.spec.ts` (from `modules/taxi/backend`) → the constructor takes `(redis, taxiConfig)`, `estimateAllVehicleTypes` returns an array not `{ currency, estimates }`, and `asked` is `[['IN', …]]`.

- [ ] **Step 3: Extract the geo helper**

`apps/api/libs/region/src/region.geo.ts`:

```ts
import { REGION_CONFIGS } from './region.config';
import { type SupportedCountryCode } from './region.types';

/**
 * Which market a point is in, or null.
 *
 * Lifted verbatim out of `RegionService.resolveCountryFromCoords`, which was
 * private and lived on an injectable that needs Redis and an HTTP client. The
 * taxi fare engine needs the same answer with no I/O, and the alternative it
 * had been using — `zoneId?.split('-')[0] || 'IN'` on a client-optional field
 * no caller ever sends — priced every ride in every country off India's card.
 *
 * Null is a real answer. A fare engine that guesses a market is worse than one
 * that refuses.
 */
const BOXES: Array<[SupportedCountryCode, number, number, number, number]> = [
  ['IN', 8, 37, 68, 97],
  ['SG', 1.1, 1.5, 103.5, 104.1],
  ['BH', 25.5, 26.4, 50.3, 50.8],
  ['QA', 24.4, 26.3, 50.7, 52.0],
  ['KW', 28.5, 30.2, 46.5, 48.5],
  ['AE', 22, 26.5, 51, 56.5],
  ['OM', 16.6, 26.4, 51.8, 59.8],
  ['SA', 16, 32, 34, 56],
  ['US', 24, 49, -125, -66],
  ['GB', 49, 61, -8, 2],
];

export function countryFromCoords(lat: number, lng: number): SupportedCountryCode | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const [code, latMin, latMax, lngMin, lngMax] of BOXES) {
    if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
      if (code in REGION_CONFIGS) return code;
    }
  }
  return null;
}
```

Order matters — the boxes overlap (QA sits inside the SA box), so the narrower Gulf entries come before `SA`, exactly as the original ordering had them. Export from `index.ts`, and make `RegionService.resolveCountryFromCoords` a one-line delegate so there is only one table.

- [ ] **Step 4: Rewrite the fare engine**

`fare-calculation.service.ts`, replacing lines 48-78 and the two private helpers at 189-230:

```ts
  constructor(
    private readonly redis: RedisService,
    private readonly taxiConfig: TaxiConfigService,
    private readonly surge: SurgeService,
  ) {}

  /**
   * Fare estimates for every vehicle type the market enables.
   *
   * `zoneId` used to be a parameter. It was optional, client-supplied, never
   * sent by any caller in the repository, and its first segment was read as a
   * country code with `'IN'` as the fallback — so every estimate everywhere
   * read `taxi:rates:IN` and a Qatari admin's rate card was never priced
   * against. The market now comes from where the ride starts.
   */
  async estimateAllVehicleTypes(params: {
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    /** Server-supplied only: the rider's verified market. Never a client field. */
    countryCode?: string;
  }): Promise<{ countryCode: string; currency: string; estimates: FareEstimate[] }> {
    const market =
      normaliseMarket(params.countryCode) ??
      countryFromCoords(params.pickupLat, params.pickupLng);
    if (!market) {
      throw new BadRequestException(
        'We could not work out which market this pickup point is in, so we cannot price the ride.',
      );
    }

    const distKm = this.haversineDistance(
      params.pickupLat, params.pickupLng, params.dropLat, params.dropLng,
    );
    const durationMin = this.estimateDuration(distKm);
    const zone = this.surge.zoneKey(params.pickupLat, params.pickupLng);
    const surgeMultiplier = await this.surge.getMultiplier(market, zone);
    const config = await this.taxiConfig.getCountryConfig(market);
    const peakMultiplier = this.getPeakMultiplier(config);

    const vehicleTypes = config.enabledVehicleTypes?.length
      ? config.enabledVehicleTypes
      : Object.keys(FareCalculationService.DEFAULT_RATES);

    const estimates: FareEstimate[] = [];
    for (const type of vehicleTypes) {
      const rate = await this.taxiConfig.getRateCard(market, type);
      const { fare } = this.calculateFare(distKm, durationMin, rate, surgeMultiplier, peakMultiplier);
      estimates.push({
        vehicleType: type,
        distanceKm: Math.round(distKm * 10) / 10,
        durationMinutes: Math.round(durationMin),
        baseFare: rate.baseFare,
        distanceFare: Math.round(distKm * rate.distanceRate),
        timeFare: Math.round(durationMin * rate.timeRate),
        surgeMultiplier,
        peakMultiplier,
        estimatedFare: fare,
      });
    }

    return { countryCode: market, currency: config.currency, estimates };
  }
```

Delete `private getRateCard(vehicleType, zoneId?)` and `private getSurgeForZone(lat, lng, zoneId?)` entirely — with them go the `fare:rate:${zoneId || 'DEFAULT_ZONE'}:*`, `surge:${zoneId}` and `zone:demand:${zoneId || 'DEFAULT_ZONE'}` reads. `getPeakMultiplier` takes the country config so the DB-backed `peakHourConfig` is used and the hard-coded `PEAK_HOURS` become the fallback _for a market with none configured_, not the always-path.

Remove `zoneId` from `EstimateFareDto` (`modules/taxi/backend/src/dto/taxi.dto.ts`) and from `TaxiService.estimateFare`, which forwards to this method.

- [ ] **Step 5: Move the rate cards into the `taxi:` namespace and add `purgeMarket`**

In `taxi-config.service.ts`:

```ts
  /**
   * Drop every cached read for one market, and only that market.
   *
   * `taxi:rates:<cc>` is the list and `taxi:rates:<cc>:<vt>` each card, so one
   * pattern covers both. The old single-card key was `fare:rate:<cc>:<vt>` —
   * outside the module's namespace, which is why the cache-prefix spec could
   * not tell it apart from anyone else's `fare:` keys.
   */
  async purgeMarket(countryCode: string): Promise<void> {
    const cc = countryCode.toUpperCase();
    await this.redis.del(`taxi:config:${cc}`);
    await this.redis.del(`taxi:rates:${cc}`);
    await this.redis.delPattern(`taxi:rates:${cc}:*`);
    await this.redis.delPattern(`taxi:surge:${cc}:*`);
    this.logger.log(`🧹 taxi cache purged for ${cc}`);
  }
```

`getRateCard` key becomes `` `taxi:rates:${cc}:${vehicleType}` ``; `getRateCards`, `getCountryConfig` upper-case their `countryCode` before keying (a `qa` and a `QA` were two cache entries). `upsertRateCard`, `deleteRateCard` and `upsertCountryConfig` call `purgeMarket(countryCode)` instead of their two `del`s.

`DEFAULTS.currency = 'INR'` is wrong for every market but one. Replace with a per-market default from the registry:

```ts
import { getRegionConfig } from '@app/region';
```

```ts
  /** Defaults for a market with no stored config. Currency and tax come from
   *  the localisation registry — never a literal, and never '₹'. */
  private defaultsFor(countryCode: string): Partial<TaxiCountryConfigEntity> {
    const region = getRegionConfig(countryCode.toUpperCase());
    return {
      ...TaxiConfigService.DEFAULTS,
      currency: region?.currencyCode ?? TaxiConfigService.DEFAULTS.currency,
      taxRate: region ? region.tax.rate / 100 : 0,
      distanceUnit: 'km',
    };
  }
```

used in both branches of `getCountryConfig` and `upsertCountryConfig`. Remove `currency: 'INR'` from the static `DEFAULTS`.

- [ ] **Step 6: Delete the gateway's duplicate fare implementation**

In `apps/api/apps/api-gateway/src/controllers/taxi.controller.ts`, replace the whole `estimateFare` body (88-191) with a delegation to taxi-service, and delete the `TaxiFareRule`/`TaxiSurgeRule` imports if nothing else uses them:

```ts
  @Post('estimate')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiOperation({ summary: 'Fare estimate for a ride, priced in the rider’s market' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['pickupLat', 'pickupLng', 'dropLat', 'dropLng'],
      properties: {
        pickupLat: { type: 'number', example: 25.2854 },
        pickupLng: { type: 'number', example: 51.531 },
        dropLat: { type: 'number', example: 25.3208 },
        dropLng: { type: 'number', example: 51.5238 },
      },
    },
  })
  async estimateFare(@Req() req: any, @Body() dto: EstimateFareBodyDto) {
    // There used to be a second fare engine here: it cached under
    // `cache:fare_rule:<vehicleType>:DEFAULT_ZONE` and `cache:surge_rule:DEFAULT_ZONE`
    // for every market, never invalidated either key, read neither X-Region-Code
    // nor the token's market claim, and returned `currency: 'INR'` to everyone.
    // One engine now, in taxi-service, keyed on the market the pickup point is in.
    const claimed = normaliseMarket(req?.user?.regionCode) ?? normaliseMarket(req?.headers?.['x-region-code']);
    return this.send('estimate_taxi_fare', { ...dto, countryCode: claimed });
  }
```

`this.send` here is the gateway's existing `TAXI_SERVICE` forwarder; if `TaxiController` has no ClientProxy yet, inject `@Inject('TAXI_SERVICE') private readonly taxiClient: ClientProxy` and copy the `send` helper from `admin-taxi.controller.ts` (with `rpcCatch`, no fallback). `EstimateFareBodyDto` is a new validated class in `apps/api/apps/api-gateway/src/dto/` with four `@IsLatitude`/`@IsLongitude` fields and **no `zoneId`**.

Then remove the two dead keys platform-wide:

```bash
grep -rn "cache:fare_rule\|cache:surge_rule\|DEFAULT_ZONE\|fare:rate:" --include=*.ts . | grep -v node_modules | grep -v "/dist/"
```

Expected after the edit: zero hits outside this plan's own comments.

- [ ] **Step 7: The three TCP handlers**

In `modules/taxi/backend/src/taxi.controller.ts`:

```ts
  @MessagePattern({ cmd: 'admin.taxi.pricing' })
  async tcpPricing(@Payload() d: { countryCode: string; scope?: string }) {
    assertInMarket(d?.countryCode, d?.scope, 'pricing', this.logger);
    const [config, rateCards] = await Promise.all([
      this.config.getCountryConfig(d.countryCode),
      this.config.getRateCards(d.countryCode),
    ]);
    return {
      countryCode: config.countryCode,
      currency: config.currency,
      surgeLimits: config.surgeLimits,
      peakHourConfig: config.peakHourConfig,
      platformCommissionRate: config.platformCommissionRate,
      rateCards,
    };
  }

  @MessagePattern({ cmd: 'admin.taxi.updatePricing' })
  async tcpUpdatePricing(
    @Payload() d: { countryCode: string; vehicleType: string; scope?: string; adminId?: string; [k: string]: unknown },
  ) {
    assertInMarket(d?.countryCode, d?.scope, 'pricing', this.logger);
    const { countryCode, vehicleType, scope: _s, adminId, ...rest } = d ?? ({} as any);
    const saved = await this.config.upsertRateCard(countryCode, vehicleType, rest);
    await this.kafka.publish('taxi.pricing.updated', { countryCode, vehicleType, adminId });
    return saved;
  }

  @MessagePattern({ cmd: 'admin.taxi.rate_card.delete' })
  async tcpDeleteRateCard(
    @Payload() d: { countryCode: string; vehicleType: string; scope?: string; adminId?: string },
  ) {
    assertInMarket(d?.countryCode, d?.scope, 'rate card', this.logger);
    await this.config.deleteRateCard(d.countryCode, d.vehicleType);
    await this.kafka.publish('taxi.rate_card.deleted', { ...d, scope: undefined });
    return { deleted: true, countryCode: d.countryCode, vehicleType: d.vehicleType };
  }
```

Gateway: `admin-taxi.controller.ts` already sends `admin.taxi.pricing` / `admin.taxi.updatePricing`; add `@Delete('rates/:countryCode/:vehicleType')` sending `admin.taxi.rate_card.delete` with roles, perm key and `this.scopeOf(req, countryCode, 'that rate card')`.

- [ ] **Step 8: Run everything**

```
cd apps/api            && npx vitest run libs/region && npx nest build --all
cd modules/taxi/backend && npx vitest run && npx nest build
```

Expected: region specs 3 passed, taxi suite ≥ 28 passed, both builds 0.

- [ ] **Step 9: Live probe — the highest-value check in this plan**

```bash
redis-cli --scan --pattern 'taxi:rates:*' | xargs -r redis-cli DEL
# Qatari admin sets a QA card
curl -s -X POST -H "Authorization: Bearer $QA" -H 'Content-Type: application/json' \
  -d '{"countryCode":"QA","vehicleType":"economy","baseFare":9,"distanceRate":2,"timeRate":1,"minimumFare":12}' \
  http://127.0.0.1:3099/api/v1/admin/taxi/rates
# a rider estimates a Doha ride, no zoneId
curl -s -X POST -H "Authorization: Bearer $RIDER" -H 'Content-Type: application/json' \
  -d '{"pickupLat":25.2854,"pickupLng":51.531,"dropLat":25.3208,"dropLng":51.5238}' \
  http://127.0.0.1:3099/api/v1/taxi/estimate
```

Expected: `countryCode: "QA"`, `currency: "QAR"`, and the economy row priced off `baseFare 9`. Then:

```bash
redis-cli --scan --pattern 'taxi:rates:*'   # taxi:rates:QA, taxi:rates:QA:economy, … — no :IN
redis-cli --scan --pattern 'cache:fare_rule:*'   # empty
```

Repeat with Mumbai coordinates (`19.076, 72.8777`) and confirm QA's just-cached card is **not** returned and `currency` is `INR`. Then purge: `POST /admin/taxi/rates` for QA again and assert `taxi:rates:IN*` keys survive untouched.

- [ ] **Step 10: Commit (two commits)**

```bash
git add apps/api/libs/region modules/taxi/backend/src/services modules/taxi/backend/src/dto modules/taxi/backend/src/taxi.controller.ts modules/taxi/backend/src/services/__tests__/fare-market.spec.ts
git commit -m "fix(taxi): price every ride in the market its pickup is in; rate cache moves under taxi:" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/api-gateway/src/controllers/taxi.controller.ts apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts apps/api/apps/api-gateway/src/dto
git commit -m "fix(gateway): delete the duplicate fare engine; /taxi/estimate uses the module's rate cards" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4 (D4): Surge gets a market dimension, so it stops failing closed

**Closes: AUD2-060** (the `admin.taxi.updateSurge` half — `updatePricing` closed in T3), **AUD2-127** (`surge:${zoneId}` has no writer), **AUD2-126 (surge-zone half)**.

**Files:**

- Create: `modules/taxi/backend/src/entities/taxi-surge-zone.entity.ts`; export from `entities/index.ts`; register in `taxi-service.module.ts` `ENTITIES`
- Create: `modules/taxi/backend/migrations/1789000000000-TaxiSurgeZones.ts`
- Create: `modules/taxi/backend/src/services/surge.service.ts`, `src/services/__tests__/surge.spec.ts`
- Modify: `modules/taxi/backend/src/services/ride-matching.service.ts:120-121,417` (demand counter gains the market)
- Modify: `modules/taxi/backend/src/taxi.controller.ts` (`admin.taxi.surge` no longer refuses; `admin.taxi.updateSurge` implemented)
- Modify: `apps/api/apps/api-gateway/src/dto/admin-taxi.dto.ts` (`SurgeUpdateDto` gains bounds)

**Interfaces:**

- Entity `TaxiSurgeZoneEntity` → table `taxi.taxi_surge_zones`, unique on `(countryCode, zoneKey)`.
- `SurgeService.zoneKey(lat, lng): string` — the H3 grid key, moved off `RideMatchingService` so both callers use one implementation.
- `SurgeService.getMultiplier(countryCode, zoneKey): Promise<number>` — reads `taxi:surge:<cc>:<zone>`, falls back to the stored zone row, then to the demand/supply ratio clamped by the market's `surgeLimits`.
- `SurgeService.setMultiplier(countryCode, zoneKey, multiplier, { ttlSeconds, adminId })` — clamps to the market's `surgeLimits`, writes the row and the cache key.
- `SurgeService.listZones(countryCode): Promise<TaxiSurgeZoneEntity[]>`.
- TCP: `admin.taxi.surge { countryCode, scope, lat?, lng? }`, `admin.taxi.updateSurge { countryCode, zoneId, multiplier, ttlSeconds?, scope, adminId }`.

- [ ] **Step 1: Write the failing spec**

`modules/taxi/backend/src/services/__tests__/surge.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SurgeService } from '../surge.service';

function build(limits = { minMultiplier: 1, maxMultiplier: 2, autoEnabled: true }) {
  const keys = new Map<string, string>();
  const redis = {
    get: vi.fn(async (k: string) => keys.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => void keys.set(k, v)),
    del: vi.fn(async (k: string) => void keys.delete(k)),
    georadius: vi.fn(async () => ['d1', 'd2']),
  };
  const rows: any[] = [];
  const repo = {
    findOne: vi.fn(
      async ({ where }: any) =>
        rows.find((r) => r.countryCode === where.countryCode && r.zoneKey === where.zoneKey) ??
        null,
    ),
    find: vi.fn(async ({ where }: any) => rows.filter((r) => r.countryCode === where.countryCode)),
    create: vi.fn((d: any) => d),
    save: vi.fn(async (d: any) => (rows.push(d), d)),
  };
  const config = {
    getCountryConfig: vi.fn(async (cc: string) => ({ countryCode: cc, surgeLimits: limits })),
  };
  return { svc: new SurgeService(repo as any, redis as any, config as any), keys, rows };
}

describe('SurgeService is market-dimensioned', () => {
  it('keys the cache by market and zone, never by zone alone', async () => {
    const { svc, keys } = build();
    await svc.setMultiplier('QA', 'h3:8:2:4', 1.5, { adminId: 'a1' });
    expect([...keys.keys()]).toEqual(['taxi:surge:QA:h3:8:2:4']);
  });

  it('a Doha surge does not move a Mumbai rider', async () => {
    const { svc } = build();
    await svc.setMultiplier('QA', 'h3:8:2:4', 2, { adminId: 'a1' });
    expect(await svc.getMultiplier('QA', 'h3:8:2:4')).toBe(2);
    expect(await svc.getMultiplier('IN', 'h3:8:2:4')).toBe(1);
  });

  it("clamps to the market's own surgeLimits rather than a platform constant", async () => {
    const { svc } = build({ minMultiplier: 1, maxMultiplier: 1.5, autoEnabled: true });
    await expect(svc.setMultiplier('QA', 'h3:8:2:4', 3, { adminId: 'a1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lists only the asked-for market', async () => {
    const { svc } = build();
    await svc.setMultiplier('QA', 'h3:8:2:4', 1.2, { adminId: 'a' });
    await svc.setMultiplier('IN', 'h3:8:9:9', 1.4, { adminId: 'a' });
    expect((await svc.listZones('QA')).map((z: any) => z.zoneKey)).toEqual(['h3:8:2:4']);
  });
});
```

- [ ] **Step 2: Run it — FAIL** (`Cannot find module '../surge.service'`).

- [ ] **Step 3: The entity**

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A surge zone, per market.
 *
 * Surge had no data model at all: `fare-calculation.service.ts` read
 * `surge:${zoneId}` from Redis and nothing anywhere in the repository wrote it,
 * while `admin.taxi.updateSurge` had no message handler, so the console's
 * "update surge" button returned a fabricated success through the gateway's
 * RPC fallback. Because a zone could not be attributed to a market, a
 * region-locked admin was refused outright (`refuseUnattributable`) — correct,
 * and the reason this entity exists.
 *
 * Market column note: taxi uses `countryCode` (ISO-2) where most modules use
 * `regionCode`. Kept for consistency with its nine sibling entities; the
 * platform-wide rename is not part of Plan D.
 */
@Entity('taxi_surge_zones')
@Unique(['countryCode', 'zoneKey'])
export class TaxiSurgeZoneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 2 })
  @Index()
  countryCode: string;

  /** The H3 grid key from `SurgeService.zoneKey(lat, lng)`, e.g. `h3:8:2299:4684`. */
  @Column({ type: 'varchar', length: 64 })
  @Index()
  zoneKey: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  label: string | null;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 1.0 })
  multiplier: number;

  /** When an administrator set it manually; null means the automatic ratio rules. */
  @Column({ type: 'timestamptz', nullable: true })
  manualUntil: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  setBy: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
```

Migration `1789000000000-TaxiSurgeZones.ts` creates `taxi.taxi_surge_zones` with the unique constraint and the two indexes, fully qualified (`CREATE TABLE "taxi"."taxi_surge_zones"` — a bare name resolves against `search_path` and builds a shadow table in `public`, the trap recorded for the marketplace migrations).

- [ ] **Step 4: The service**

`modules/taxi/backend/src/services/surge.service.ts` — `zoneKey` is the grid function moved out of `RideMatchingService` (which now delegates), `getMultiplier` reads in this order: manual cache key → active row within `manualUntil` → demand/supply ratio, clamped:

```ts
  async getMultiplier(countryCode: string, zoneKey: string): Promise<number> {
    const cc = countryCode.toUpperCase();
    const cached = await this.redis.get(`taxi:surge:${cc}:${zoneKey}`);
    if (cached) return this.clamp(await this.limits(cc), parseFloat(cached));

    const row = await this.repo.findOne({ where: { countryCode: cc, zoneKey, isActive: true } });
    if (row?.manualUntil && row.manualUntil.getTime() > Date.now()) {
      return this.clamp(await this.limits(cc), Number(row.multiplier));
    }

    const limits = await this.limits(cc);
    if (!limits.autoEnabled) return limits.minMultiplier;
    // Demand is counted per market as well as per zone: an H3 cell is globally
    // unique, but the counter used to be `zone:demand:${zoneId || 'DEFAULT_ZONE'}`,
    // and with no zoneId ever supplied every country shared one bucket — a
    // Mumbai demand spike raised the surge shown to a Doha rider.
    const demand = Number(await this.redis.get(`taxi:zone:demand:${cc}:${zoneKey}`)) || 0;
    const supply = (await this.redis.georadius('drivers:locations', ...)).length || 1;
    const ratio = demand / supply;
    const auto = ratio > 5 ? 2.0 : ratio > 3 ? 1.5 : ratio > 2 ? 1.2 : 1.0;
    return this.clamp(limits, auto);
  }
```

`setMultiplier` throws `BadRequestException` when the value is outside `surgeLimits` — it does **not** silently clamp an administrator's input, because a console that says 3.0 and stores 1.5 is lying. `ttlSeconds` defaults to 3600 and caps at 86400.

`ride-matching.service.ts:121` becomes `await this.redis.incr(\`taxi:zone:demand:${cc}:${zone}\`)`with a`expire(..., 900)`so the counter stops growing forever (audit: "never decremented or expired");`cc`comes from`ride.countryCode`, which `TaxiRideEntity` already carries (`taxi-ride.entity.ts:87`).

- [ ] **Step 5: The two TCP handlers**

Replace `tcpSurge` in `modules/taxi/backend/src/taxi.controller.ts`:

```ts
  @MessagePattern({ cmd: 'admin.taxi.surge' })
  async tcpSurge(
    @Payload() d: { countryCode?: string; scope?: string; lat?: number; lng?: number },
  ) {
    // Was `refuseUnattributable(scope, 'surge zone', …)` — correct while surge
    // zones had no market of their own. They have one now, so a locked admin
    // gets their own market's zones instead of a 403.
    const market = marketPredicate(d?.scope, d?.countryCode);
    if (!market) throw new BadRequestException('A market is required to list surge zones.');
    assertInMarket(market, d?.scope, 'surge zone', this.logger);
    const zones = await this.surge.listZones(market);
    const current =
      typeof d?.lat === 'number' && typeof d?.lng === 'number'
        ? await this.surge.getMultiplier(market, this.surge.zoneKey(d.lat, d.lng))
        : undefined;
    return { countryCode: market, zones, current };
  }

  @MessagePattern({ cmd: 'admin.taxi.updateSurge' })
  async tcpUpdateSurge(
    @Payload()
    d: { countryCode: string; zoneId: string; multiplier: number; ttlSeconds?: number; scope?: string; adminId?: string },
  ) {
    assertInMarket(d?.countryCode, d?.scope, 'surge zone', this.logger);
    const zone = await this.surge.setMultiplier(d.countryCode, d.zoneId, d.multiplier, {
      ttlSeconds: d.ttlSeconds,
      adminId: d.adminId,
    });
    await this.kafka.publish('taxi.surge.updated', {
      countryCode: d.countryCode.toUpperCase(),
      zoneKey: d.zoneId,
      multiplier: zone.multiplier,
      adminId: d.adminId,
    });
    return zone;
  }
```

`SurgeUpdateDto` in `apps/api/apps/api-gateway/src/dto/admin-taxi.dto.ts` gains `@Min(1) @Max(5)` on `multiplier`, `@Matches(/^h3:\d+:-?\d+:-?\d+$/)` on `zoneId` (the zone key is server-derived — a free-form string here was how an arbitrary Redis key got written), and `@Min(60) @Max(86400)` on `ttlSeconds`.

- [ ] **Step 6: Run and build**

```
cd modules/taxi/backend && npx vitest run && npx nest build
cd apps/api             && npx vitest run apps/api-gateway && npx nest build --all
```

- [ ] **Step 7: Live probe**

```bash
curl -s -X POST -H "Authorization: Bearer $QA" -H 'Content-Type: application/json' \
  -d '{"countryCode":"QA","zoneId":"h3:8:2299:4684","multiplier":1.4,"ttlSeconds":600}' \
  http://127.0.0.1:3099/api/v1/admin/taxi/surge                       # 200, multiplier 1.4
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' \
  -d '{"countryCode":"IN","zoneId":"h3:8:2299:4684","multiplier":1.4}' \
  http://127.0.0.1:3099/api/v1/admin/taxi/surge                       # 403
curl -s -H "Authorization: Bearer $QA" http://127.0.0.1:3099/api/v1/admin/taxi/surge  # 200 (was 403), QA zones only
redis-cli KEYS 'taxi:surge:*'                                          # taxi:surge:QA:h3:8:2299:4684 only
```

Then a Doha estimate reflects 1.4× and a Mumbai estimate does not.

- [ ] **Step 8: Commit (two commits)**

```bash
git add modules/taxi/backend/src/entities modules/taxi/backend/src/services modules/taxi/backend/migrations modules/taxi/backend/src/taxi-service.module.ts modules/taxi/backend/src/taxi.controller.ts
git commit -m "feat(taxi): surge zones carry a market; one writer, one cache key per market (migration pending INFRA runner)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/api-gateway/src/dto/admin-taxi.dto.ts apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts
git commit -m "fix(gateway): surge writes are bounded and market-scoped instead of fabricated" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5 (D5): Drivers, vehicles, vendors, documents and payouts become a real fleet backend

**Closes: AUD2-126 (vehicle half)**, **AUD2-128** (the unreachable driver-document workflow), and the Plan B carry-over **taxi payouts paging**. Implements 9 of the 21 missing commands.

**Files:**

- Create: `modules/taxi/backend/src/entities/taxi-vehicle.entity.ts`, `taxi-service-area.entity.ts`; export + register
- Create: `modules/taxi/backend/migrations/1789000100000-TaxiVehiclesAndAreas.ts`
- Create: `modules/taxi/backend/src/services/vehicle.service.ts`, `src/services/__tests__/fleet-admin.spec.ts`
- Modify: `modules/taxi/backend/src/services/taxi-payout.service.ts:171-297`
- Modify: `modules/taxi/backend/src/services/driver-onboarding.service.ts`, `vendor-management.service.ts` (detail + decision methods take `scope`)
- Modify: `modules/taxi/backend/src/taxi.controller.ts` (9 new `@MessagePattern`s + the 11 absorbed from T1)
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts`, `dto/admin-taxi.dto.ts`
- Modify: `packages/shared-core/src/api/admin-taxi.ts`

**Interfaces:**

- `TaxiVehicleEntity` → `taxi.taxi_vehicles`: `id`, `countryCode`, `vendorId|null`, `driverId|null`, `plate` (unique per market), `category`, `make`, `model`, `year`, `colour`, `seats`, `isAccessible`, `inspectionStatus` (`pending|passed|failed|expired`), `inspectionExpiresAt`, `insuranceExpiresAt`, `status` (`pending|active|suspended|retired`), `approvedBy`, `approvedAt`.
- `TaxiServiceAreaEntity` → `taxi.taxi_service_areas`: `id`, `countryCode`, `city`, `name`, `polygon` (`jsonb`, GeoJSON `Polygon`), `isActive`.
- New TCP commands, all taking `scope`: `admin.taxi.driverDetail`, `admin.taxi.approveDriver`, `admin.taxi.vendorDetail`, `admin.taxi.approveVendor`, `admin.taxi.suspendVendor`, `admin.taxi.fleet`, `admin.taxi.pendingApprovals`, `admin.taxi.compliance`, `admin.taxi.approvePayout`; plus the T1 absorptions (`vendor.register`, `vendor.reactivate`, `vendor.dashboard`, `rejectVendor`, `blockVendor`, `vendor.drivers.add`, `vendor.drivers.remove`, `driver.register`, `driver.onboarding`, `documents.submit`, `documents.byOwner`, `config.requiredDocuments`, `payouts.approve`, `payouts.retry`).
- Every list handler returns `{ data, total, page, limit }` — the shape the console's `DataTable` needs, and the shape three taxi lists did not return.
- `processPayouts(payoutIds, scope)` → `{ processed, failed, batchId }` and **throws `BadRequestException` naming any id that did not match an approved payout in the caller's market**.

**Decisions recorded, with reasons** (the plan must not leave these to the implementer):

| decision                                                | ruling                                                                                                      | reason                                                                                                                                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vehicle documents                                       | reuse `TaxiDocumentEntity` with `ownerType: 'vehicle'`                                                      | The polymorphic owner column already exists and `getPendingDocuments` joins through it; a fourth table would fork the review queue. The join gains a third `leftJoin` to `TaxiVehicleEntity` for the market.   |
| A vehicle's market                                      | denormalised `countryCode` on the row, set from the owning vendor or driver at create time                  | Vehicles can be independent (no vendor), so a join is not always available; and a predicate on the vehicle's own column is what the market-scope rule requires.                                                |
| Approving a driver whose documents are not all approved | refused, 409, listing the outstanding document types                                                        | `getRequiredDocuments(countryCode, 'driver')` is the market's own list; approving around it is exactly the KYC hole H-10 describes elsewhere.                                                                  |
| Approving a vehicle with an expired inspection          | refused, 409                                                                                                | Same principle; the date is on the row.                                                                                                                                                                        |
| `processPayouts` partial batches                        | whole batch refused                                                                                         | Already the rule for a cross-market batch (`assertInMarket` loop at `taxi-payout.service.ts:253`); an id that matched nothing was silently dropped and the caller was told `processed: n` as if it had worked. |
| Payout paging                                           | `page`, `limit` (clamped 1..100) echoed in the response; gateway forwards `limit`, which it currently drops | `getAllPayouts` accepts `limit` and the gateway never sent it, so the console could not page past 20 and could not tell how many pages there were.                                                             |

- [ ] **Step 1: Write the failing spec**

`modules/taxi/backend/src/services/__tests__/fleet-admin.spec.ts` — four describes:

```ts
describe('TaxiPayoutService.processPayouts', () => {
  it('refuses the whole batch and names the ids that matched nothing', async () => {
    const { svc } = payoutService([{ id: 'p1', status: 'approved', countryCode: 'QA' }]);
    await expect(svc.processPayouts(['p1', 'p-missing'], 'QA')).rejects.toThrow(/p-missing/);
  });
  it('writes nothing when it refuses', async () => {
    const { svc, save } = payoutService([{ id: 'p1', status: 'approved', countryCode: 'QA' }]);
    await svc.processPayouts(['p1', 'p-missing'], 'QA').catch(() => {});
    expect(save).not.toHaveBeenCalled();
  });
  it('still refuses a batch that mixes markets', async () => {
    const { svc } = payoutService([
      { id: 'p1', status: 'approved', countryCode: 'QA' },
      { id: 'p2', status: 'approved', countryCode: 'IN' },
    ]);
    await expect(svc.processPayouts(['p1', 'p2'], 'QA')).rejects.toThrow(ForbiddenException);
  });
});

describe('every admin list echoes its paging', () => {
  it.each(['getAllPayouts', 'getDrivers', 'listVehicles'])(
    '%s returns page and limit',
    async (m) => {
      const res = await callList(m, { page: 3, limit: 50 });
      expect(res).toMatchObject({ page: 3, limit: 50, total: expect.any(Number) });
    },
  );
  it('clamps a limit of 10000 to 100 and reports the clamped value', async () => {
    expect((await callList('getAllPayouts', { page: 1, limit: 10000 })).limit).toBe(100);
  });
});

describe('VehicleService', () => {
  it('filters by the market and never returns another market’s vehicle', async () => {
    /* … */
  });
  it('takes the vehicle market from its vendor when one is given', async () => {
    /* … */
  });
  it('refuses to approve a vehicle whose inspection has expired', async () => {
    /* … */
  });
});

describe('driver approval honours the market’s required documents', () => {
  it('refuses with 409 and lists the missing document types', async () => {
    /* … */
  });
});
```

- [ ] **Step 2: Run it — FAIL** on every describe.

- [ ] **Step 3: Entities + migration**

Write `taxi-vehicle.entity.ts` and `taxi-service-area.entity.ts` per the Interfaces table, each with the one-line market-column deviation note, `@Index()` on `countryCode`, `@Unique(['countryCode', 'plate'])` on the vehicle. Migration `1789000100000-TaxiVehiclesAndAreas.ts` creates both, fully qualified to the `taxi` schema, `jsonb` for `polygon`, `down()` dropping in reverse order.

- [ ] **Step 4: Paging everywhere**

One shared clamp in `modules/taxi/backend/src/services/paging.ts`:

```ts
/** Page and limit an admin list may use. A caller-supplied `limit` used to go
 *  straight into `take()`, so `?limit=100000` was one query away from an OOM;
 *  and three lists returned `{ data, total }` with no page at all, so the
 *  console could not render a pager or tell how many pages there were. */
export function pageOf(input: { page?: number | string; limit?: number | string }) {
  const page = Math.max(1, Math.floor(Number(input?.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input?.limit) || 20)));
  return { page, limit, skip: (page - 1) * limit };
}
```

Applied in `getAllPayouts`, `getDrivers`, `getVendors`, `getPendingDocuments`, `listVehicles` and every new list, each returning `{ data, total, page, limit }`. In the gateway, `getPayouts` and `getRides` gain `@Query('limit') limit = 20` and forward it (both currently drop it).

- [ ] **Step 5: `processPayouts` refuses unmatched ids**

```ts
const payouts = await this.payoutRepo.find({
  where: { id: In(payoutIds), status: 'approved' },
});

// An id that matched nothing used to be silently dropped: a batch of ten
// where four ids were typos, already settled, or belonged to another
// market returned `{ processed: 6, failed: 0 }` — indistinguishable from
// success, on the path money leaves the platform by.
const found = new Set(payouts.map((p) => p.id));
const unmatched = payoutIds.filter((id) => !found.has(id));
if (unmatched.length > 0) {
  throw new BadRequestException(
    `No approved payout awaiting processing for: ${unmatched.join(', ')}. Nothing was processed.`,
  );
}

for (const payout of payouts) {
  assertInMarket(payout.countryCode, scope, 'payout', this.logger);
}
```

The `assertInMarket` loop stays _after_ the unmatched check so a locked admin naming another market's id gets the market refusal, not "no such payout" — the denial wording is what tells an operator which rule they hit.

- [ ] **Step 6: The handlers**

Add the 9 census commands plus the 14 T1 absorptions to `modules/taxi/backend/src/taxi.controller.ts`, each following the same shape — `assertInMarket` or `marketPredicate` first, service call second, Kafka event third. The single-row reads assert on the **loaded row**, not the request:

```ts
  @MessagePattern({ cmd: 'admin.taxi.driverDetail' })
  async tcpDriverDetail(@Payload() d: { id: string; scope?: string }) {
    const driver = await this.onboarding.getDriverById(d?.id);
    assertInMarket(driver.countryCode, d?.scope, 'driver', this.logger);
    const [documents, vehicles] = await Promise.all([
      this.onboarding.getDocuments('driver', driver.id),
      this.vehicles.listVehicles({ countryCode: driver.countryCode, driverId: driver.id }),
    ]);
    return { ...driver, documents, vehicles: vehicles.data };
  }

  @MessagePattern({ cmd: 'admin.taxi.approveDriver' })
  async tcpApproveDriver(@Payload() d: { id: string; scope?: string; adminId: string }) {
    const driver = await this.onboarding.getDriverById(d?.id);
    assertInMarket(driver.countryCode, d?.scope, 'driver', this.logger);
    return this.onboarding.approveDriver(driver.id, d.adminId);
  }

  @MessagePattern({ cmd: 'admin.taxi.pendingApprovals' })
  async tcpPendingApprovals(@Payload() d: { countryCode?: string; scope?: string }) {
    const cc = marketPredicate(d?.scope, d?.countryCode);
    if (!cc) throw new BadRequestException('A market is required.');
    assertInMarket(cc, d?.scope, 'approval queue', this.logger);
    const [drivers, vendors, vehicles, documents] = await Promise.all([
      this.onboarding.getDrivers({ countryCode: cc, status: 'pending', limit: 100 }),
      this.vendors.getVendors({ countryCode: cc, status: 'pending', limit: 100 }),
      this.vehicles.listVehicles({ countryCode: cc, status: 'pending', limit: 100 }),
      this.onboarding.getPendingDocuments({ countryCode: cc, limit: 100 }),
    ]);
    return {
      countryCode: cc,
      drivers: drivers.data, vendors: vendors.data,
      vehicles: vehicles.data, documents: documents.data,
      counts: {
        drivers: drivers.total, vendors: vendors.total,
        vehicles: vehicles.total, documents: documents.total,
      },
    };
  }

  @MessagePattern({ cmd: 'admin.taxi.compliance' })
  async tcpCompliance(@Payload() d: { countryCode?: string; scope?: string }) {
    const cc = marketPredicate(d?.scope, d?.countryCode);
    if (!cc) throw new BadRequestException('A market is required.');
    assertInMarket(cc, d?.scope, 'compliance view', this.logger);
    // Real counts from real columns — the console page this feeds rendered a
    // hard-coded rule list and fell back to it on any failure.
    return this.vehicles.complianceSummary(cc);
  }
```

`complianceSummary(cc)` returns per-market counts of: drivers with an expired licence document, vehicles with `inspectionExpiresAt` in the past, vehicles with `insuranceExpiresAt` in the past, documents `pending` older than the market's SLA, and the market's own `requiredDriverDocuments`/`requiredVendorDocuments` from `TaxiConfigService`. No invented rule text.

- [ ] **Step 7: Gateway routes + client methods**

`admin-taxi.controller.ts` gains, all with roles + perm key + `this.scopeOf(`:
`GET vehicles`, `GET vehicles/:id`, `PATCH vehicles/:id/approve`, `PATCH vehicles/:id/suspend`, `GET service-areas`, `POST service-areas`, `PATCH service-areas/:id`, `PATCH vendors/:id/reject`, `PATCH vendors/:id/block`, `POST payouts/approve`, `POST payouts/:id/retry`.

`packages/shared-core/src/api/admin-taxi.ts` gains the methods the console needs and the two AUD2-128 gaps:

```ts
  /** The document-review queue. The gateway has declared both of these since
   *  Plan A; the client implemented only `rejectDocument` and no page called
   *  even that, so driver KYC could not be completed from the console at all. */
  getPendingDocuments: (p: ListParams & { ownerType?: 'driver' | 'vendor' | 'vehicle' } = {}) =>
    apiCall<TaxiListPage<TaxiDocumentRow>>(`${BASE_URL}/admin/taxi/documents/pending${buildQuery(p)}`),
  approveDocument: (documentId: string) =>
    apiCall(`${BASE_URL}/admin/taxi/documents/${documentId}/approve`, { method: 'POST' }),
```

plus `getVehicles`, `getVehicleById`, `approveVehicle`, `suspendVehicle`, `getServiceAreas`, `createServiceArea`, `updateServiceArea`, `rejectVendor`, `blockVendor`, `approvePayouts`, `retryPayout`. `TaxiListPage<T>` gains `page: number; limit: number`.

- [ ] **Step 8: Run and build**

```
cd modules/taxi/backend && npx vitest run && npx nest build
cd apps/api             && npx vitest run apps/api-gateway && npx nest build --all
cd apps/web             && npx tsc --noEmit -p tsconfig.json
```

- [ ] **Step 9: Live probe**

```bash
# paging is real
curl -s -H "Authorization: Bearer $SUPER" \
  "http://127.0.0.1:3099/api/v1/admin/taxi/payouts?page=2&limit=5" | node -pe \
  'const j=JSON.parse(require("fs").readFileSync(0));[j.page,j.limit,j.total].join(" ")'   # 2 5 <n>
# an unmatched id refuses the batch
curl -s -X POST -H "Authorization: Bearer $SUPER" -H 'Content-Type: application/json' \
  -d '{"payoutIds":["00000000-0000-0000-0000-000000000000"]}' \
  http://127.0.0.1:3099/api/v1/admin/taxi/payouts/process        # 400, names the id
# cross-market refusal on a vehicle
IN_VEH=$(curl -s -H "Authorization: Bearer $SUPER" "…/admin/taxi/vehicles?countryCode=IN&limit=1" | …)
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "…/admin/taxi/vehicles/$IN_VEH"  # 403
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $IN" "…/admin/taxi/vehicles/$IN_VEH"  # 200
# the document workflow completes end to end
curl -s -H "Authorization: Bearer $QA" "…/admin/taxi/documents/pending" | …   # a QA document id
curl -s -X POST -H "Authorization: Bearer $QA" "…/admin/taxi/documents/$DOC/approve"  # 200, status approved
```

- [ ] **Step 10: Commit (three commits)**

```bash
git add modules/taxi/backend/src modules/taxi/backend/migrations
git commit -m "feat(taxi): vehicles, service areas and a fleet admin backend with real paging (migration pending INFRA runner)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/api-gateway/src
git commit -m "feat(gateway): vehicle, service-area, vendor-decision and payout routes reach real handlers" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add packages/shared-core/src/api/admin-taxi.ts
git commit -m "feat(admin-taxi client): document review, vehicles and paged lists are callable" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6 (D6): Trips, their timeline, complaints and disputes

Implements 4 of the 21 missing commands (`rides`, `rideDetail`, `complaints`, `resolveComplaint`) and fills the `admin.taxi.sos` / `admin.taxi.disputes` declared in T2. **Closes:** the X-29 matrix row (`GET /admin/taxi/rides/<IN-ride>` returns 503 instead of 403) from audit §13.

**Files:**

- Create: `modules/taxi/backend/src/entities/taxi-trip-event.entity.ts`, `taxi-dispute.entity.ts`; export + register
- Create: `modules/taxi/backend/migrations/1789000200000-TaxiTripEventsAndDisputes.ts`
- Create: `modules/taxi/backend/src/services/trip-admin.service.ts`, `src/services/__tests__/trip-admin.spec.ts`
- Modify: `modules/taxi/backend/src/services/ride-matching.service.ts`, `taxi.service.ts` (write a `TaxiTripEvent` at each status transition)
- Modify: `modules/taxi/backend/src/services/complaint-management.service.ts` (scope)
- Modify: `modules/taxi/backend/src/taxi.controller.ts`, `apps/api/.../admin-taxi.controller.ts`, `dto/admin-taxi.dto.ts`

**Interfaces:**

- `TaxiTripEventEntity` → `taxi.taxi_trip_events`: `id`, `rideId` (indexed), `countryCode`, `type` (`requested|matched|accepted|arrived|started|completed|cancelled|sos|location`), `at`, `lat|null`, `lng|null`, `actorType` (`customer|driver|admin|system`), `actorId|null`, `detail jsonb|null`.
- `TaxiDisputeEntity` → `taxi.taxi_disputes`: `id`, `rideId`, `countryCode`, `raisedByType` (`customer|driver`), `raisedById`, `category` (`fare|route|conduct|damage|other`), `amount|null`, `currency`, `status` (`open|investigating|resolved|rejected`), `resolution|null`, `resolvedBy|null`, `resolvedAt|null`.
- TCP: `admin.taxi.rides { countryCode, status?, driverId?, from?, to?, page, limit, scope }` → `{ data, total, page, limit }`; `admin.taxi.rideDetail { id, scope }` → ride + timeline + fare breakdown + dispute; `admin.taxi.ride.timeline { id, scope }`; `admin.taxi.complaints`, `admin.taxi.resolveComplaint`, `admin.taxi.disputes`, `admin.taxi.dispute.resolve { id, status, resolution, refundAmount?, scope, adminId }`, `admin.taxi.sos`.
- The dispute resolve flow **does not move money itself**: it records the decision and publishes `taxi.dispute.resolved { rideId, countryCode, refundAmount, currency, adminId }`. Refunds belong to refund-service (Plan C1). A resolve that names a `refundAmount` while refund-service is not wired answers 501 with that sentence — it does not report success.

- [ ] **Step 1: Write the failing spec**

`trip-admin.spec.ts`:

```ts
describe('TripAdminService', () => {
  it('lists only the scoped market’s rides', async () => {
    const { svc, where } = build();
    await svc.listRides({ countryCode: 'IN', page: 1, limit: 20 }, 'QA');
    expect(where).toContain('r.countryCode = :cc');
    expect(lastParams(where)).toMatchObject({ cc: 'QA' }); // the lock wins over the request
  });

  it('refuses a ride detail from another market with 403, not 503', async () => {
    const { svc } = build({ ride: { id: 'r1', countryCode: 'IN' } });
    await expect(svc.rideDetail('r1', 'QA')).rejects.toThrow(ForbiddenException);
  });

  it('returns the timeline in chronological order with the ride', async () => {
    const { svc } = build({
      ride: { id: 'r1', countryCode: 'QA' },
      events: [
        { type: 'completed', at: new Date('2026-09-01T10:30:00Z') },
        { type: 'requested', at: new Date('2026-09-01T10:00:00Z') },
      ],
    });
    const out = await svc.rideDetail('r1', 'QA');
    expect(out.timeline.map((e: any) => e.type)).toEqual(['requested', 'completed']);
  });

  it('records a dispute decision and never claims a refund it did not make', async () => {
    const { svc } = build({ dispute: { id: 'd1', countryCode: 'QA', status: 'open' } });
    await expect(
      svc.resolveDispute(
        { id: 'd1', status: 'resolved', resolution: 'fare corrected', refundAmount: 20 },
        'QA',
        'admin-1',
      ),
    ).rejects.toThrow(NotImplementedException);
    const noMoney = await svc.resolveDispute(
      { id: 'd1', status: 'rejected', resolution: 'route was as booked' },
      'QA',
      'admin-1',
    );
    expect(noMoney.status).toBe('rejected');
    expect(noMoney.resolvedBy).toBe('admin-1');
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Entities, migration, event writer**

The timeline is only as real as what writes it. Add one private helper on `TaxiService` and call it at each existing status transition (`requestRide`, `driverAcceptRide`, `driverArrived`, `startRide`, `completeRide`, `cancelRide`, and `RideMatchingService.matchRide`):

```ts
  /**
   * One row per thing that happened on a ride.
   *
   * The admin trip screens had nothing to show because nothing recorded the
   * intermediate states: `taxi_rides` keeps only the current status and a
   * handful of timestamps, so "where did this trip go wrong" could not be
   * answered from the console at all.
   */
  private async recordTripEvent(
    ride: { id: string; countryCode: string },
    type: TripEventType,
    actor: { type: 'customer' | 'driver' | 'admin' | 'system'; id?: string },
    at?: { lat: number; lng: number },
    detail?: Record<string, unknown>,
  ): Promise<void> {
    await this.tripEventRepo.save(
      this.tripEventRepo.create({
        rideId: ride.id,
        countryCode: ride.countryCode?.toUpperCase(),
        type, at: new Date(),
        lat: at?.lat ?? null, lng: at?.lng ?? null,
        actorType: actor.type, actorId: actor.id ?? null,
        detail: detail ?? null,
      }),
    );
  }
```

`location` events are **not** written per GPS ping (a ride would generate hundreds); the live position stays in `taxi:driver:loc:<id>` and a `location` event is written only on a route deviation flagged by dispatch.

- [ ] **Step 4: The service and handlers**

`TripAdminService` with `listRides`, `rideDetail`, `timeline`, `listComplaints`, `resolveComplaint`, `listDisputes`, `resolveDispute`, `listSos`; each taking `scope` last and using `marketPredicate` for lists / `assertInMarket` on the loaded row. Wire the eight `@MessagePattern`s. In `admin-taxi.controller.ts`, `getRides` gains `limit`, `driverId`, `from`, `to` query parameters and `GET rides/:id/timeline`, `PATCH disputes/:id/resolve` are added, with roles, perm key and `this.scopeOf(`.

`ResolveDisputeDto` in `admin-taxi.dto.ts`: `@IsIn(['resolved','rejected','investigating']) status`, `@IsString() @Length(3, 1000) resolution`, `@IsOptional() @IsNumber() @Min(0) refundAmount`.

- [ ] **Step 5: Run, build**

```
cd modules/taxi/backend && npx vitest run && npx nest build
cd apps/api             && npx vitest run apps/api-gateway && npx nest build --all
```

- [ ] **Step 6: Live probe**

```bash
IN_RIDE=$(curl -s -H "Authorization: Bearer $SUPER" "…/admin/taxi/rides?countryCode=IN&limit=1" | …)
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA"  "…/admin/taxi/rides/$IN_RIDE"  # 403 (was 503)
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $IN"  "…/admin/taxi/rides/$IN_RIDE"  # 200
curl -s -H "Authorization: Bearer $IN" "…/admin/taxi/rides/$IN_RIDE/timeline" | node -pe \
  'JSON.parse(require("fs").readFileSync(0)).data.map(e=>e.type).join(">")'    # requested>matched>accepted>…
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"status":"resolved","resolution":"x","refundAmount":20}' \
  "…/admin/taxi/disputes/$QA_DISPUTE/resolve"                                  # 501, with the refund-service sentence
```

- [ ] **Step 7: Commit (two commits)**

```bash
git add modules/taxi/backend/src modules/taxi/backend/migrations
git commit -m "feat(taxi): trip events, disputes and a scoped trip admin service (migration pending INFRA runner)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/api-gateway/src
git commit -m "feat(gateway): trip list, timeline, complaints and dispute routes reach real handlers" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7 (D7): The remaining admin handlers — the census closed

**Closes: AUD2-060 residue and the 21-command census in full.** The audit's E report lists "22 commands"; `resolveComplaint` appears twice in that list, so there are **21 unique** commands. Every one is accounted for:

| #   | command                       | gateway route                              | owning task |
| --- | ----------------------------- | ------------------------------------------ | ----------- |
| 1   | `admin.taxi.pricing`          | `GET /admin/taxi/pricing`                  | T3          |
| 2   | `admin.taxi.updatePricing`    | `POST /admin/taxi/pricing`                 | T3          |
| 3   | `admin.taxi.updateSurge`      | `POST /admin/taxi/surge`                   | T4          |
| 4   | `admin.taxi.driverDetail`     | `GET /admin/taxi/drivers/:id`              | T5          |
| 5   | `admin.taxi.approveDriver`    | `PATCH /admin/taxi/drivers/:id/approve`    | T5          |
| 6   | `admin.taxi.vendorDetail`     | `GET /admin/taxi/vendors/:id`              | T5          |
| 7   | `admin.taxi.approveVendor`    | `PATCH /admin/taxi/vendors/:id/approve`    | T5          |
| 8   | `admin.taxi.suspendVendor`    | `PATCH /admin/taxi/vendors/:id/suspend`    | T5          |
| 9   | `admin.taxi.approvePayout`    | `POST /admin/taxi/payouts/:id/approve`     | T5          |
| 10  | `admin.taxi.fleet`            | `GET /admin/taxi/fleet`                    | T5          |
| 11  | `admin.taxi.pendingApprovals` | `GET /admin/taxi/pending-approvals`        | T5          |
| 12  | `admin.taxi.compliance`       | `GET /admin/taxi/compliance`               | T5          |
| 13  | `admin.taxi.rides`            | `GET /admin/taxi/rides`                    | T6          |
| 14  | `admin.taxi.rideDetail`       | `GET /admin/taxi/rides/:id`                | T6          |
| 15  | `admin.taxi.complaints`       | `GET /admin/taxi/complaints`               | T6          |
| 16  | `admin.taxi.resolveComplaint` | `PATCH /admin/taxi/complaints/:id/resolve` | T6          |
| 17  | `admin.taxi.dashboard`        | `GET /admin/taxi/dashboard`                | **T7**      |
| 18  | `admin.taxi.routes`           | `GET /admin/taxi/routes`                   | **T7**      |
| 19  | `admin.taxi.createRoute`      | `POST /admin/taxi/routes`                  | **T7**      |
| 20  | `admin.taxi.settings`         | `GET /admin/taxi/settings`                 | **T7**      |
| 21  | `admin.taxi.updateSettings`   | `POST /admin/taxi/settings`                | **T7**      |

**Files:**

- Create: `modules/taxi/backend/src/entities/taxi-fixed-route.entity.ts`; export + register; migration `1789000300000-TaxiFixedRoutes.ts`
- Create: `modules/taxi/backend/src/services/taxi-admin.service.ts`, `src/services/__tests__/taxi-admin.spec.ts`
- Modify: `modules/taxi/backend/src/taxi.controller.ts` (5 `@MessagePattern`s)
- Modify: `apps/api/apps/api-gateway/src/dto/admin-taxi.dto.ts`

**Interfaces:**

- `admin.taxi.dashboard { countryCode, scope }` → `{ countryCode, currency, onlineDrivers, activeTrips, tripsToday, completionRate, cancellationRate, grossFares, commission, pendingApprovals, openDisputes, openSos }` — **every field from a query or a Redis counter**. A field that has no source is omitted, not zeroed: a zero is indistinguishable from a real zero, which is how `getDashboardStats` misled operators elsewhere (R-7).
- `TaxiFixedRouteEntity` → `taxi.taxi_fixed_routes`: `id`, `countryCode`, `name`, `origin`, `destination`, `originLat/Lng`, `destLat/Lng`, `fixedFare`, `currency`, `vehicleType|null`, `isActive`.
- `admin.taxi.settings { countryCode, scope }` and `updateSettings` map onto `TaxiCountryConfigEntity` — the same row `config.get`/`config.upsert` use. **They are not a second settings store**: `settings` returns the operational subset (`cashEnabled`, `scheduledRidesEnabled`, `otpRequired`, `autoCancelTimeoutSeconds`, `freeWaitingMinutes`, `minimumDriverRating`, `emergencyNumber`, `dispatchMode`) and `updateSettings` writes exactly those columns and purges `taxi:config:<cc>`.

**The `emergencyNumber` fix (Plan B carry-over):** the column is `NOT NULL`, so clearing the field reported success and silently kept the stored value. `SettingsUpdateDto` and `TaxiConfigUpsertDto` mark `emergencyNumber` `@IsString() @IsNotEmpty()` when present, and the console field is `required`. Clearing a mandatory emergency number is not a thing the platform should accept quietly in either direction.

- [ ] **Step 1: Write the failing spec** — `taxi-admin.spec.ts`:

```ts
describe('admin.taxi.dashboard', () => {
  it('counts only the scoped market', async () => {
    /* asserts `countryCode = :cc` on every sub-query */
  });
  it('omits a counter it has no source for rather than reporting zero', async () => {
    const out = await svc.dashboard('QA');
    expect(out).not.toHaveProperty('driverUtilisation'); // no source today
    expect(Object.values(out).every((v) => v !== null)).toBe(true);
  });
  it('reports the market currency from the country config', async () => {
    expect((await svc.dashboard('QA')).currency).toBe('QAR');
  });
});

describe('settings write exactly the columns they name', () => {
  it('does not blank a column the caller omitted', async () => {
    await svc.updateSettings('QA', { cashEnabled: false }, 'admin-1');
    expect(saved).toEqual({ countryCode: 'QA', cashEnabled: false });
  });
  it('refuses an empty emergency number instead of silently keeping the old one', async () => {
    await expect(svc.updateSettings('QA', { emergencyNumber: '' }, 'a')).rejects.toThrow(
      BadRequestException,
    );
  });
  it('purges only the written market', async () => {
    await svc.updateSettings('QA', { cashEnabled: false }, 'a');
    expect(purged).toEqual(['QA']);
  });
});
```

- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement** `TaxiAdminService` + the fixed-route entity and migration + the five `@MessagePattern`s.
- [ ] **Step 4: Prove no command is left unhandled.** Extend the contract check rather than eyeballing it — add to `apps/api/test/gateway-service-contract.spec.ts` (or a new `taxi-contract.spec.ts` if that file's lower-case-only collector is still unfixed, which it is as of Plan B):

```ts
it('every admin.taxi.* command the gateway sends has a handler in taxi-service', () => {
  const sent = new Set(readCommands('apps/api-gateway/src/controllers/admin-taxi.controller.ts'));
  const handled = new Set(readPatterns('../../modules/taxi/backend/src/taxi.controller.ts'));
  expect([...sent].filter((c) => !handled.has(c))).toEqual([]);
});
```

- [ ] **Step 5: Run everything** — taxi suite, `apps/api` 677+, both builds 0.
- [ ] **Step 6: Live probe**

```bash
curl -s -H "Authorization: Bearer $QA" "…/admin/taxi/dashboard" | node -pe \
  'const d=JSON.parse(require("fs").readFileSync(0)).data; [d.countryCode,d.currency,d.onlineDrivers].join(" ")'  # QA QAR <n>
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "…/admin/taxi/dashboard?countryCode=IN"   # 403
curl -s -X POST -H "Authorization: Bearer $QA" -H 'Content-Type: application/json' \
  -d '{"countryCode":"QA","emergencyNumber":""}' "…/admin/taxi/settings"        # 400, not 200
redis-cli KEYS 'taxi:config:*'                                                  # taxi:config:IN survives a QA write
```

- [ ] **Step 7: Commit (two commits)** — module then gateway, messages `feat(taxi): dashboard, fixed routes and operational settings from real queries` and `fix(gateway): taxi settings and dashboard bodies validated; a blank emergency number is refused`.

---

### Task 8 (D8): The console taxi pages tell the truth

**Closes: AUD2-058** (four pages fetching unauthenticated and falling back to fixtures), **AUD2-059** (the landing editor's fire-and-forget save), **AUD2-061** (six pages calling routes the gateway never declares). Also the Plan B carry-over "two coming-soon buttons".

**Files (all under `apps/web/src/app/admin/taxi/`):** `fleet/page.tsx`, `compliance/page.tsx`, `landing-editor/page.tsx`, `routes/page.tsx`, `surge/page.tsx`, `rides/page.tsx`, `complaints/page.tsx`, `complaints/[id]/page.tsx`, `vendors/page.tsx`, `vendors/[id]/page.tsx`, `pending-approvals/page.tsx`, `ratings/page.tsx`, `reconciliation/page.tsx`, `rentals/page.tsx`, `rental-fleet/page.tsx`, `intercity/page.tsx`, `scheduled/page.tsx`, `page.tsx`; plus `packages/shared-core/src/api/admin-taxi.ts`.

**Interfaces consumed from the CONSOLE plan:** `apiCall` (timeout via `AbortController`, `X-Region-Code`, 401-refresh, `string[]` → `string` error normalisation), `DataTable<T>` (`columns`, server paging from `{ data, total, page, limit }`, `loading`, `error`, `empty`), `EmptyState`, `ErrorState`, `Skeleton`, `StatusBadge`, `Money` (formats with the row's market — never a hard-coded `₹` or `QR`). If CONSOLE has not landed, keep the page-local presentation but **do not** keep a bare `fetch` and **do not** keep a fixture fallback.

**Page disposition — all 20.**

| page                                                | today                                                                                                                   | disposition                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/taxi`                                       | `admin.taxi.dashboard` 503; `try/catch` round a non-throwing client so `res.success === false` is never read            | real handler (T7); check `res.success`; `ErrorState` on failure                                                                                                                                                                                                                                                                   |
| `fleet`                                             | 3 unauthenticated `fetch`es polled every 10 s, `catch { }` keeps `mockDrivers`/`mockRides`/`mockSurgeZones`             | `adminTaxiApi.getNearbyDrivers` / `getRides({status:'active'})` / `getSurge`; the three `mock*` consts **deleted**; poll pauses on error and shows "live fleet unavailable — last updated HH:MM"; live positions from T9                                                                                                          |
| `compliance`                                        | unauthenticated `fetch`, `.catch(() => {})` keeps a static rule list                                                    | `adminTaxiApi.getCompliance()` (T5's real counts); the `rules` const deleted                                                                                                                                                                                                                                                      |
| `landing-editor`                                    | GET + PUT unauthenticated, PUT never checks status, `/* Save failed silently */`, then `setSaved(true)` unconditionally | `adminLayoutApi.getLayout/saveLayout` (authenticated); `setSaved(true)` **only** when `res.success`; error surfaced with the server's message; unsaved-changes guard                                                                                                                                                              |
| `routes`                                            | fixture rows; "Route creation form coming soon" toast                                                                   | `getRoutes()` + a real create form posting `RouteCreateDto` (T7)                                                                                                                                                                                                                                                                  |
| `surge`                                             | fixture rows; "New zone creation coming soon" toast                                                                     | `getSurge()` + a real multiplier form posting `SurgeUpdateDto` (T4)                                                                                                                                                                                                                                                               |
| `rides`                                             | hardcoded rows                                                                                                          | `getRides()` + `DataTable`, row → `rides/[id]` detail with the T6 timeline                                                                                                                                                                                                                                                        |
| `complaints`, `complaints/[id]`                     | hardcoded rows                                                                                                          | `getComplaints()` / `resolveComplaint()` (T6)                                                                                                                                                                                                                                                                                     |
| `vendors`, `vendors/[id]`                           | `MOCK_*` + hardcoded rows                                                                                               | `getVendors()`, `getVendorById()`, approve/reject/suspend/block (T5)                                                                                                                                                                                                                                                              |
| `pending-approvals`                                 | hardcoded rows                                                                                                          | `getPendingApprovals()` (T5), four tabs from its `counts`                                                                                                                                                                                                                                                                         |
| `ratings`                                           | hardcoded rows, in the nav                                                                                              | `getRides({ hasRating: true })` ratings view (T6 adds the filter)                                                                                                                                                                                                                                                                 |
| `drivers`, `payouts`, `pricing`, `settings`         | already on `adminTaxiApi` (Plan B B7b)                                                                                  | paging wired to the new `{page,limit,total}`; `Money` replaces the symbol                                                                                                                                                                                                                                                         |
| `reconciliation`                                    | hardcoded rows, no route                                                                                                | **delete the page** and its nav entry. Payout reconciliation is `payouts` + `payouts/summary`; a second screen for the same data with no endpoint is the duplication the audit names.                                                                                                                                             |
| `rentals`, `rental-fleet`, `intercity`, `scheduled` | hardcoded rows, no route, honest "no route serves them" copy from B7b                                                   | **keep, marked not built.** A single `<NotBuiltState feature="…" />` component replaces the fixture tables: title, one sentence saying the feature is not built, and no controls. Fixture rows and non-functioning buttons are removed. These four are the _only_ pages in the module allowed to render no data, and they say so. |

- [ ] **Step 1: Write the failing render specs**

`apps/web/src/app/admin/taxi/__tests__/taxi-console-honesty.spec.tsx` — a source-level scan plus render assertions (RTL is not installed; use `renderToStaticMarkup` with mocked clients, the pattern Plan B used):

```tsx
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '..');
const pages = fs
  .readdirSync(DIR, { recursive: true })
  .filter((f) => String(f).endsWith('page.tsx'))
  .map((f) => path.join(DIR, String(f)));

describe('no taxi console page talks to the API without a token', () => {
  it('contains no bare fetch( against API_BASE_URL', () => {
    const offenders = pages.filter((p) =>
      /fetch\(\s*`?\$\{?API_BASE_URL/.test(fs.readFileSync(p, 'utf8')),
    );
    expect(offenders.map((p) => path.relative(DIR, p))).toEqual([]);
  });

  it('declares no mock or fixture row array', () => {
    // `const mockDrivers = [...]` behind a silent catch is a permanently fake
    // board that a 10-second poll makes look live.
    const offenders = pages.filter((p) =>
      /const\s+(mock[A-Z]\w*|MOCK_[A-Z_]+)\s*[:=]/.test(fs.readFileSync(p, 'utf8')),
    );
    expect(offenders.map((p) => path.relative(DIR, p))).toEqual([]);
  });

  it('leaves no "coming soon" control', () => {
    const offenders = pages.filter((p) => /coming soon/i.test(fs.readFileSync(p, 'utf8')));
    expect(offenders.map((p) => path.relative(DIR, p))).toEqual([]);
  });

  it('never hard-codes a currency symbol', () => {
    const offenders = pages.filter((p) => /[₹]|'QR'|"QR"/.test(fs.readFileSync(p, 'utf8')));
    expect(offenders.map((p) => path.relative(DIR, p))).toEqual([]);
  });
});

describe('the landing editor only claims a save that happened', () => {
  it('renders the server error and does not say Saved when the PUT fails', async () => {
    vi.doMock('@/lib/api/admin-layout', () => ({
      adminLayoutApi: {
        getLayout: async () => ({ success: true, data: { sections: [] } }),
        saveLayout: async () => ({
          success: false,
          error: 'Layout rejected: hero title is required',
        }),
      },
    }));
    const html = await renderAfterSave();
    expect(html).toContain('hero title is required');
    expect(html).not.toContain('Saved');
  });
});
```

- [ ] **Step 2: Run — FAIL**, listing `fleet`, `compliance`, `landing-editor` for bare fetch; ~15 pages for fixtures; `routes` and `surge` for "coming soon"; the `₹` sites.

- [ ] **Step 3: Fix the four unauthenticated pages first (AUD2-058, AUD2-059)**

`fleet/page.tsx` — replace the poll body:

```tsx
// Three unauthenticated `fetch`es used to run here every 10 seconds, each
// with `catch { }` restoring a hard-coded array. With DEV_AUTH_BYPASS on
// they returned data as SUPER_ADMIN; in any other environment they 401'd and
// the board silently showed fixtures, refreshing on a timer so it looked live.
const load = useCallback(async () => {
  const [nearby, rides, surge] = await Promise.all([
    adminTaxiApi.getNearbyDrivers({ lat, lng, radiusKm: 50, countryCode: market }),
    adminTaxiApi.getRides({ status: 'active', countryCode: market, limit: 100 }),
    adminTaxiApi.getSurge({ countryCode: market }),
  ]);
  const failed = [nearby, rides, surge].find((r) => !r.success);
  if (failed) {
    setError(failed.error ?? 'The live fleet board could not be loaded.');
    return; // keep the last good data, labelled stale — never a fixture
  }
  setError(null);
  setLastUpdated(new Date());
  setDrivers(nearby.data ?? []);
  setRides(rides.data?.data ?? []);
  setSurgeZones(surge.data?.zones ?? []);
}, [lat, lng, market]);
```

with `{error && <ErrorState message={error} onRetry={load} />}` above the tabs and a `Last updated {lastUpdated}` line so a frozen board is visibly frozen.

`landing-editor/page.tsx:133-144`:

```tsx
const save = async () => {
  setSaving(true);
  const res = await adminLayoutApi.saveLayout('taxi', 'homepage', {
    sections,
    country: selectedCountry,
  });
  setSaving(false);
  if (!res.success) {
    // This used to be `catch { /* Save failed silently */ }` followed by an
    // unconditional `setSaved(true)`: the editor reported success whether or
    // not anything was written, including when the PUT was rejected for
    // having no Authorization header at all.
    setSaveError(res.error ?? 'The layout could not be saved.');
    return;
  }
  setSaveError(null);
  setSaved(true);
};
```

- [ ] **Step 4: Wire the rest** per the disposition table; delete `reconciliation/`; add `NotBuiltState` to the four unbuilt pages; remove `reconciliation` from `admin-navigation`.

- [ ] **Step 5: Run**

```
cd apps/web
npx vitest run src/app/admin/taxi          # new specs green
npm run test                                # 610+ passing
npx tsc --noEmit -p tsconfig.json
npm run build
```

- [ ] **Step 6: Live walkthrough (browser, three identities)**

With the fleet gateway restarted on :3001 and the console on :3000, sign in as `qa-admin`, `india-admin` and `superadmin` in turn and walk: `/admin/taxi` → `fleet` → `drivers` → a driver detail → approve a document → `pricing` → edit a rate card → `surge` → set a multiplier → `rides` → a ride timeline → `complaints` → resolve → `payouts` → page 2 → process a batch. For the QA admin, confirm every list shows QA rows only and the market badge reads QA. Stop the taxi backend and reload `fleet`: the board must show an error, not fixtures.

- [ ] **Step 7: Commit (web only)**

```bash
git add apps/web/src/app/admin/taxi packages/shared-core/src/api/admin-taxi.ts
git commit -m "fix(web): taxi console pages use the authenticated client and show real states" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9 (D9): The live fleet view, on the namespace EVENTS owns

**Closes: nothing on its own.** `/admin-fleet` room authorisation and the driver-identity hole are **AUD2-133** and **AUD2-062**, both workstream **EVENTS** in the audit's §12. This task supplies the taxi half of that interface and the console consumer, and must not re-implement the namespace.

**Files:**

- Modify: `modules/taxi/backend/src/services/driver-dispatch.service.ts:112` and its 5 read sites (`drivers:locations` → keeps the global GEO set; the per-driver hash moves to `taxi:driver:loc:<id>`)
- Modify: `modules/taxi/backend/src/services/ride-matching.service.ts:204,376`, `taxi.service.ts:299` (`driver:profile:` / `driver:status:` → `taxi:driver:…`; ride cache → `taxi:ride:<id>`)
- Create: `modules/taxi/backend/src/services/__tests__/cache-namespace.spec.ts`
- Modify: `apps/web/src/app/admin/taxi/fleet/page.tsx` (subscribe when the namespace exists)

**Interfaces:**

- **Produced for EVENTS:** every driver position written by taxi-service is `taxi:driver:loc:<driverId>` holding `{ driverId, countryCode, lat, lng, heading, vehicleType, status, at }`. `countryCode` is on the payload so EVENTS can pick the room (`fleet:<cc>`) without a database read on every ping. Ride snapshots are `taxi:ride:<rideId>`.
- **Consumed from EVENTS:** namespace `/admin-fleet`, rooms `fleet:<countryCode>`, event `fleet:position` with that payload, join gated on an admin role **and**, for a locked admin, `room === 'fleet:' + claim.regionCode`.
- If EVENTS has not landed when this task runs, Steps 3-4 are skipped and the console keeps T8's 10-second poll; the cache rename (Steps 1-2) lands regardless because C7 requires the `taxi:` prefix and the poll depends on it.

- [ ] **Step 1: Write the failing namespace spec**

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/** C7: every Redis key a module writes lives under that module's prefix.
 *  Taxi wrote `driver:profile:`, `driver:status:`, `surge:`, `zone:demand:`
 *  and `fare:rate:` — five prefixes indistinguishable from another service's. */
const ALLOWED = /^(taxi:|drivers:locations|matching:)/;

describe('taxi writes only taxi: keys', () => {
  it('uses no key outside the module namespace', () => {
    const offenders: string[] = [];
    for (const file of walk(path.join(__dirname, '..', '..'))) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/redis\.\w+\(\s*[`'"]([^`'"$]*)/g)) {
        if (m[1] && !ALLOWED.test(m[1])) offenders.push(`${path.basename(file)}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — FAIL** listing `driver:profile:`, `driver:status:`, `ride:` and anything T3/T4 left behind. Rename, keeping `drivers:locations` (a single global GEO set bounded by query radius — the audit rates it working, and partitioning it by country would break border searches) and adding the `countryCode` to each member's payload so the _consumer_ can filter.

- [ ] **Step 3: Emit the market on every position write**

```ts
  async updateDriverLocation(driverId: string, lat: number, lng: number, extra: {...}) {
    const driver = await this.driverMeta(driverId);       // cached, market included
    await this.redis.geoadd('drivers:locations', lng, lat, driverId);
    await this.redis.setJson(
      `taxi:driver:loc:${driverId}`,
      { driverId, countryCode: driver.countryCode, lat, lng, ...extra, at: new Date().toISOString() },
      120,
    );
    // The admin fleet map is per market. Putting countryCode on the payload is
    // what lets the /admin-fleet namespace (Plan EVENTS) pick the room without
    // a database read on every ping — and what stops a Doha admin's map from
    // ever receiving a Mumbai driver's coordinates.
    await this.kafka.publish('taxi.driver.position', { driverId, countryCode: driver.countryCode, lat, lng });
  }
```

- [ ] **Step 4: Console subscription (only if EVENTS has landed)**

```tsx
// The namespace, its room authorisation and the driver-identity check on
// `updateDriverLocation` are owned by the EVENTS plan (AUD2-133, AUD2-062).
// This page is a consumer: it joins its own market's room and renders what
// arrives. It never asks for a room — the server derives it from the claim.
useAdminFleet({
  onPosition: (p) => setDrivers((ds) => upsertById(ds, p)),
  onError: (e) => setError(e.message),
});
```

Falling back to T8's poll when the socket is unavailable, with the same "last updated" honesty.

- [ ] **Step 5: Run, build, probe**

Taxi suite green; `redis-cli --scan --pattern 'driver:*'` empty, `'taxi:driver:loc:*'` populated while a driver is online. With EVENTS landed: a QA admin's socket receives only `countryCode: 'QA'` positions; joining `fleet:IN` is refused.

- [ ] **Step 6: Commit**

```bash
git add modules/taxi/backend/src
git commit -m "refactor(taxi): every redis key under the taxi namespace; positions carry their market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10 (D10): The live proof, as three identities

**Closes: nothing new** — it is the evidence for T1-T9, and the E2E-T1/E2E-T2 journeys the program lists.

**Files:**

- Create: `apps/api/scripts/verification/taxi-ops-authz.mjs`
- Modify: `apps/api/package.json` (`"verify:taxi-ops": "node scripts/verification/taxi-ops-authz.mjs"`)

- [ ] **Step 1: Write the script** in the shape of `admin-scope-authz.mjs` (`ok(label, condition)`, `pass`/`fail` counters, `process.exit(fail ? 1 : 0)`), logging in as each identity and running MFA where required. Assertions, at minimum:

```
security
  ✓ module HTTP admin route 404s for a customer token   (POST :3021/taxi/admin/payouts/approve)
  ✓ module health still 200s                            (GET  :3021/taxi/health)
  ✓ /taxi/admin/dashboard is gone                       (404 for all three identities)
  ✓ an ADMIN without perm:modules.taxi is refused       (403 on GET /admin/taxi/drivers)
fares
  ✓ a Doha estimate prices off taxi:rates:QA            (currency QAR, baseFare = the QA card)
  ✓ a Mumbai estimate does not see QA's card            (currency INR)
  ✓ no cache:fare_rule:* or DEFAULT_ZONE key exists
  ✓ a QA rate-card write purges only QA keys            (taxi:rates:IN* survives)
surge
  ✓ QA admin sets a QA zone; IN zone refused 403
  ✓ GET /admin/taxi/surge is 200 for a locked admin     (was 403 — fail-closed no longer needed)
  ✓ a multiplier above the market's cap is 400
fleet
  ✓ QA admin sees only countryCode==='QA' drivers, vendors, vehicles, payouts
  ✓ QA admin refused an IN driver / vendor / vehicle detail (403, and the row is unchanged after)
  ✓ payouts page 2 limit 5 echoes {page:2,limit:5,total}
  ✓ processing a batch with one unknown id is 400 and writes nothing
trips
  ✓ QA admin refused an IN ride detail                  (403, not 503)
  ✓ a ride timeline is chronological and non-empty
  ✓ a dispute resolve naming a refund is 501, not a fake success
handlers
  ✓ every admin.taxi.* route answers something other than 503
console
  ✓ every /admin/taxi/* page renders with a token and shows an error state without one
```

- [ ] **Step 2: Run with the fleet up**

```
cd apps/api && npm run verify:taxi-ops        # N passed, 0 failed
npm run verify:admin-scope                     # still 37+ passed, 0 failed — no regression
node scripts/verification/regional-isolation-authz.mjs   # 36/36
```

Every `✗` is a real hole: fix it in the task that owns the route and re-run. Do not weaken an assertion.

- [ ] **Step 3: Whole-suite gate**

```
cd modules/taxi/backend && npx vitest run && npx nest build          # ≥ 45 passed, 0
cd apps/api             && npx vitest run && npx nest build --all    # ≥ 677 passed, 0
cd apps/web             && npm run test && npm run build             # ≥ 610 passed, build clean
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/scripts/verification/taxi-ops-authz.mjs apps/api/package.json
git commit -m "test(api): live proof of taxi market scope across fares, surge, fleet, trips and payouts" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Deferred (P3)

Nothing in the TAXI workstream is deferred: all ten §12 TAXI rows are closed by T1-T8. Three adjacent items are deliberately **not** in this plan, each with its owner:

| item                                                                                                                          | why not here                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AUD2-062, AUD2-133** — driver-location spoofing and the `/admin-fleet` namespace                                            | Workstream **EVENTS** in the audit. T9 supplies the taxi-side payload and the console consumer against EVENTS' interface; re-implementing the namespace here would fork it.                                                                               |
| **AUD2-102** — the six copy-pasted `apiCall`s (no `AbortController`, no region header, no 401 refresh, raw `string[]` errors) | Workstream **CONSOLE**; `admin-taxi.ts` is one of the six and is fixed there for all six at once. T8 consumes the fixed helper.                                                                                                                           |
| **I7 / F-17** — renaming taxi's `countryCode` to `regionCode`                                                                 | Cross-module consistency, nine entities, every seed and every existing taxi spec. Plan D records the deviation in each new entity's docstring (which is what F-17's "or record the exception" branch asks for) and leaves the rename to a dedicated task. |

---

## Self-review

**AUD2 id → task.** Every §12 row whose Workstream is TAXI, and the §2/§9/§11 taxi findings behind them:

| id           | finding                                                                                      | task                            |
| ------------ | -------------------------------------------------------------------------------------------- | ------------------------------- |
| AUD2-018     | fare country is `zoneId?.split('-')[0] \|\| 'IN'` — every market priced off India            | T3                              |
| AUD2-019     | second fare engine in the gateway, `DEFAULT_ZONE` keys, hard-coded `INR`                     | T3                              |
| AUD2-057     | 34 module `admin/*` routes with `JwtAuthGuard` and no role; `adminId` from the body (= H-02) | T1                              |
| AUD2-058     | four console pages fetch unauthenticated and fall back to fixtures                           | T8                              |
| AUD2-059     | landing-editor save never checks the response, always reports success                        | T8                              |
| AUD2-060     | `admin.taxi.updateSurge` / `updatePricing` have no handler; fabricated success               | T4 (surge), T3 (pricing)        |
| AUD2-061     | six console pages call routes the gateway never declares                                     | T8                              |
| AUD2-126     | no `vehicles` entity, no surge-zone entity                                                   | T5 (vehicles), T4 (surge zones) |
| AUD2-127     | `surge:${zoneId}` read with no writer anywhere                                               | T4                              |
| AUD2-128     | the driver-document approval workflow is unreachable from the console                        | T5 (client), T8 (page)          |
| §2 row 19    | surge zones have no market dimension, so locked admins are fail-closed                       | T4                              |
| §2 row 17    | `taxi_rides`/`taxi_complaints` — 22 commands with no handler                                 | T3-T7 (census table in T7)      |
| §9 leak 3    | `zone:demand:${zoneId \|\| 'DEFAULT_ZONE'}` — one bucket for every country                   | T4                              |
| §11 H-02     | privilege escalation on the module's HTTP surface                                            | T1                              |
| B carry-over | taxi payouts paging                                                                          | T5                              |
| B carry-over | `/taxi/admin/*` blind spot and its second audit trail                                        | T2                              |
| B carry-over | two "coming soon" buttons                                                                    | T8                              |
| B carry-over | clearing `emergencyNumber` reports success and keeps the value                               | T7                              |

Deferred, with owners: AUD2-062 and AUD2-133 (EVENTS), AUD2-102 (CONSOLE), I7/F-17 (documented, rename not scheduled).

**Placeholder scan.** No step says "TBD", "as appropriate" or "implement the handler". Each entity lists its columns; each migration names its file and its schema qualification; each handler shows its payload type and its `assertInMarket`/`marketPredicate` call; each decision the implementer might otherwise guess at (vehicle documents, a vehicle's market, approving around missing documents, partial payout batches, refund ownership, which of the four unbuilt pages survive) is ruled on in the task that hits it, with the reason. The one place a route may answer 503 (T2's `sos`/`disputes` before T6) is named, bounded and asserted.

**Command names.** One spelling per command across all tasks: the census table in T7 is the register, and T7 Step 4 adds a contract spec that fails the build if the gateway sends a command taxi-service does not handle. The two existing irregularities are preserved deliberately — `admin.taxi.driver.suspend` and `admin.taxi.driver.block` use dot-segments while `admin.taxi.approveDriver` is camel; renaming them would break the Plan A specs that pin them, and the contract spec makes the irregularity harmless.

**Cache keys.** The Global Constraints table is the single register; T3 removes `fare:rate:*`, `cache:fare_rule:*`, `cache:surge_rule:*` and `DEFAULT_ZONE`, T4 removes `surge:${zoneId}` and the `zone:demand` literal bucket, T9 removes `driver:profile:`/`driver:status:`/`ride:` and adds the spec that fails on any key outside `taxi:`. `purgeMarket(cc)` is defined once (T3) and is the only purge any task calls, so "purges exactly the affected market" is one function to verify rather than fourteen call sites. `drivers:locations` is the single deliberate exception, with the reason recorded in T9.

**DTO fields.** New and changed bodies live only in `apps/api/apps/api-gateway/src/dto/admin-taxi.dto.ts`, all classes with `class-validator` decorators (never interfaces — H-12's metatype trap). `SurgeUpdateDto.zoneId` is bounded by the same `^h3:` pattern `SurgeService.zoneKey` produces, so the gateway cannot be talked into writing an arbitrary Redis key; `RateCardUpsertDto` is unchanged from B6 and stays the drift-tested source of truth for column names (`distanceRate`, not `distanceFareRate` — the deleted gateway fare model used the other spelling, which is one more reason it goes); `emergencyNumber` is `@IsNotEmpty()` in both DTOs that carry it, matching the `NOT NULL` column. Every list response is `{ data, total, page, limit }` across all six list handlers, which is what `DataTable` binds to.
