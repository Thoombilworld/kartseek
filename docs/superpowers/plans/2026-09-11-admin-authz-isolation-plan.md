# Admin Authorization & Regional Isolation Implementation Plan (Plan A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the P0 authorization holes in the admin API: a role check on the security controller, and server-side market scope on every admin route (core, marketplace, taxi, grocery, hotel, restaurant, pharmacy, doctor) with a regression spec that fails the build when a new admin route ships unscoped.

**Architecture:** Keep the proven model from the 2026-09-06 fourth pass — market scope is a signed claim (`regionCode`/`regionLocked`), the gateway resolves the market with `resolveMarket`/`assertRecordInScope` (`guards/market-scope.ts`), and the backend enforces it again with `assertInMarket` on the loaded row and a predicate in the query. This plan moves `assertInMarket` into `@app/common`, applies the pattern to the remaining 328 admin routes, deletes the dead legacy guards, and pins everything with unit specs plus a live authorization script.

**Tech Stack:** NestJS 11 on rspack (`apps/api`), TypeORM, vitest (`npx vitest run <file>` from `apps/api`), Node 26, the existing dev fleet (`npm run dev:all` from `apps/api` plus each module backend).

## Global Constraints

- `nest build --all` is the build gate (tsc alone is not) — run it at the end of every task that touches `apps/api`.
- `DEV_AUTH_BYPASS=true` makes anonymous local requests SUPER_ADMIN: every spec and every live probe sends an `Authorization` header.
- Denial copy: `Your account is restricted to the <SCOPE> market; <what> belongs to <TARGET>.` (already in `market-scope.ts`); backend copy: `This <what> belongs to <OWNER>, not to the <SCOPE> market.`
- Every denial is logged with the `[region-scope-denied]` prefix.
- A `scope` field in an RPC payload is written **only** by the gateway from the token. Client-supplied filters travel as `country` / `countryCode` / `regionCode` and are passed through `resolveMarket` first.
- No handler returns a placeholder entity or an empty list on error. Failures propagate (`rpcCatch` already maps them to HTTP statuses).
- Commits: one per task, message in the repo style (`fix(gateway): …`), ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Commit `apps/api` changes separately from any web change.
- Branch: `feat/admin-platform-upgrade` created from `fix/system-check-2026-09-06`.

---

## File structure

| File                                                                                                                                                | Responsibility                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- | -------------------------------------- | -------------------------- |
| `apps/api/libs/common/src/market/market-scope.ts` (new)                                                                                             | `assertInMarket`, `normaliseMarket` — the backend half of scope, shared by every module |
| `apps/api/libs/common/src/market/market-scope.spec.ts` (new)                                                                                        | unit tests for the helper                                                               |
| `apps/api/libs/common/src/index.ts`                                                                                                                 | export the new module                                                                   |
| `apps/api/apps/api-gateway/src/guards/market-scope.ts`                                                                                              | unchanged API; gains `scopeOf(req)` convenience re-export                               |
| `apps/api/apps/api-gateway/src/guards/market-scope.spec.ts` (new)                                                                                   | unit tests for `marketScopeOf`, `resolveMarket`, `assertRecordInScope`                  |
| `apps/api/apps/api-gateway/src/decorators/global-entity.decorator.ts` (new)                                                                         | `@GlobalEntity(reason)` metadata for routes that are legitimately market-free           |
| `apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts` (new)                                                                  | every `/admin` route is scoped or declared global                                       |
| `apps/api/apps/api-gateway/src/guards/route-exposure.regression.spec.ts`                                                                            | new assertion: every `/admin` route carries `@Roles`                                    |
| `apps/api/apps/api-gateway/src/controllers/ddos-admin.controller.ts`                                                                                | role guard                                                                              |
| `apps/api/apps/api-gateway/src/controllers/admin-core.controller.ts`                                                                                | scope on users/KYC/audit/revenue                                                        |
| `apps/api/apps/admin-service/src/admin.controller.ts`, `admin.service.ts`                                                                           | enforce scope                                                                           |
| `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts`                                                                         | scope on sellers/products/approvals + payload fixes                                     |
| `modules/marketplace/backend/src/marketplace.controller.ts`, `marketplace.service.ts`, `admin/admin.service.ts`                                     | scope predicates and asserts                                                            |
| `apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts` + `modules/taxi/backend/src/taxi.controller.ts` + services                     | scope                                                                                   |
| `apps/api/apps/api-gateway/src/controllers/admin-grocery.controller.ts` + `modules/grocery/backend/src/admin/admin.service.ts` + grocery controller | scope                                                                                   |
| `admin-hotel                                                                                                                                        | restaurant                                                                              | pharmacy | doctor.controller.ts` + their backends | scope on existing handlers |
| deleted: `guards/region.guard.ts`, `decorators/region.decorator.ts`, `libs/security/src/region-isolation.guard.ts`                                  | dead code                                                                               |
| `apps/api/scripts/verification/admin-scope-authz.mjs` (new)                                                                                         | live proof as the QA, IN and global admins                                              |

---

### Task 1 (A1): The security controller requires an admin role, and the exposure spec pins it for every `/admin` route

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/ddos-admin.controller.ts:1-44`
- Modify: `apps/api/apps/api-gateway/src/guards/route-exposure.regression.spec.ts` (add one `it`)

**Interfaces:**

- Consumes: `RolesGuard` (`../guards/roles.guard`), `Roles` (`../decorators/roles.decorator`), `UserRole` (`@app/common`).
- Produces: nothing new; the spec's `Route` gains `adminRole: boolean`.

- [ ] **Step 1: Write the failing assertion in the exposure spec**

In `route-exposure.regression.spec.ts`, extend the `Route` interface and `collectRoutes()`:

```ts
interface Route {
  file: string;
  verb: string;
  path: string;
  guarded: boolean;
  declaredPublic: boolean;
  /** True when the class block or the route block carries @Roles(...) with an admin role. */
  adminRole: boolean;
}
```

Inside `collectRoutes()`, after `const classPublic = /@Public\(\)/.test(classBlock);` add:

```ts
const ADMIN_ROLE = /@Roles\([^)]*(UserRole\.(SUPER_ADMIN|ADMIN)|'(SUPER_ADMIN|ADMIN)')/;
const classAdminRole = ADMIN_ROLE.test(classBlock);
```

and in the `routes.push({...})` object add:

```ts
        adminRole: classAdminRole || ADMIN_ROLE.test(block),
```

Then add the test after `'exposes no route that is neither authenticated nor intentionally public'`:

```ts
it('requires an admin role on every /admin route', () => {
  // A JwtAuthGuard alone admits any signed-in customer. /admin/security was
  // exactly that: authenticated, unrolled, and able to ban IPs.
  const unrolled = routes.filter((r) => r.path.startsWith('/admin') && !r.adminRole);
  const report = unrolled.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
  expect(report).toBe('');
});
```

- [ ] **Step 2: Run the spec and watch it fail on the eleven security routes**

Run from `apps/api`: `npx vitest run apps/api-gateway/src/guards/route-exposure.regression.spec.ts`
Expected: FAIL — the report lists `GET /admin/security/status … POST /admin/security/attack-mode/reset` (11 lines, all `ddos-admin.controller.ts`).

- [ ] **Step 3: Guard the controller**

In `ddos-admin.controller.ts` replace the imports of `JwtAuthGuard` and the class decorators:

```ts
import { DdosMonitorService, JwtAuthGuard } from '@app/security';
import { UserRole } from '@app/common';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
```

```ts
/**
 * DDoS Admin Controller — Security dashboard API.
 *
 * Requires an admin role, not merely a session: with JwtAuthGuard alone any
 * signed-in customer could read the threat board, ban or whitelist IPs and
 * reset attack mode. Base path: /api/v1/admin/security
 */
@ApiTags('🛡️ Security')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/security')
export class DdosAdminController {
```

- [ ] **Step 4: Run the spec and the build**

Run: `npx vitest run apps/api-gateway/src/guards/route-exposure.regression.spec.ts` → PASS (all `it`s).
Run: `npx nest build api-gateway` → exits 0.

- [ ] **Step 5: Live probe (fleet up)**

```bash
# a customer token: register or log in as any customer, then
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $CUSTOMER_TOKEN" http://localhost:3001/api/v1/admin/security/status
```

Expected: `403`. With `$ADMIN_TOKEN` (qa-admin or the global admin): `200`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/apps/api-gateway/src/controllers/ddos-admin.controller.ts apps/api/apps/api-gateway/src/guards/route-exposure.regression.spec.ts
git commit -m "fix(gateway): the security console requires an admin role; every /admin route must carry one" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2 (A2): Shared `assertInMarket` in `@app/common`, unit specs for both halves of scope, dead guards deleted

**Files:**

- Create: `apps/api/libs/common/src/market/market-scope.ts`
- Create: `apps/api/libs/common/src/market/market-scope.spec.ts`
- Modify: `apps/api/libs/common/src/index.ts`
- Modify: `modules/marketplace/backend/src/admin/admin.service.ts:685-699` (delegate)
- Create: `apps/api/apps/api-gateway/src/guards/market-scope.spec.ts`
- Delete: `apps/api/apps/api-gateway/src/guards/region.guard.ts`, `apps/api/apps/api-gateway/src/decorators/region.decorator.ts`, `apps/api/libs/security/src/region-isolation.guard.ts`; remove its line from `apps/api/libs/security/src/index.ts`

**Interfaces:**

- Produces (`@app/common`):
  - `normaliseMarket(value: unknown): string | undefined` — trimmed upper-case ISO-2 or `undefined`.
  - `assertInMarket(recordRegion: string | null | undefined, scope: string | undefined, what: string, logger?: { warn(msg: string): void }): void` — throws `ForbiddenException` when `scope` is set and differs from the record's market (a record with no market is refused too).
  - `marketPredicate(scope: string | undefined, requested?: string | null): string | undefined` — the market a list query should filter on: `scope` when set, else the normalised request.
- Consumed by every backend task below.

- [ ] **Step 1: Write the failing spec for the shared helper**

`apps/api/libs/common/src/market/market-scope.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { assertInMarket, marketPredicate, normaliseMarket } from './market-scope';

describe('normaliseMarket', () => {
  it('upper-cases and trims an ISO code', () => {
    expect(normaliseMarket(' qa ')).toBe('QA');
  });
  it('returns undefined for empty or non-string input', () => {
    expect(normaliseMarket('')).toBeUndefined();
    expect(normaliseMarket(undefined)).toBeUndefined();
    expect(normaliseMarket(42)).toBeUndefined();
  });
});

describe('assertInMarket', () => {
  it('does nothing without a scope (global admin)', () => {
    expect(() => assertInMarket('IN', undefined, 'seller')).not.toThrow();
  });
  it('accepts a record in the scoped market, case-insensitively', () => {
    expect(() => assertInMarket('qa', 'QA', 'seller')).not.toThrow();
  });
  it('refuses a record from another market with the platform wording and a log line', () => {
    const lines: string[] = [];
    expect(() => assertInMarket('IN', 'QA', 'seller', { warn: (m) => lines.push(m) })).toThrow(
      ForbiddenException,
    );
    expect(() => assertInMarket('IN', 'QA', 'seller')).toThrow(
      'This seller belongs to IN, not to the QA market.',
    );
    expect(lines[0]).toContain('[region-scope-denied]');
  });
  it("refuses a record with no market — it is nobody's to touch regionally", () => {
    expect(() => assertInMarket(null, 'QA', 'banner')).toThrow(
      'This banner belongs to every market, not to the QA market.',
    );
  });
});

describe('marketPredicate', () => {
  it('is the scope when locked, whatever was requested', () => {
    expect(marketPredicate('QA', 'IN')).toBe('QA');
  });
  it('is the normalised request when global', () => {
    expect(marketPredicate(undefined, 'in')).toBe('IN');
    expect(marketPredicate(undefined, undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run from `apps/api`: `npx vitest run libs/common/src/market/market-scope.spec.ts`
Expected: FAIL — `Cannot find module './market-scope'`.

- [ ] **Step 3: Implement the helper**

`apps/api/libs/common/src/market/market-scope.ts`:

```ts
import { ForbiddenException, Logger } from '@nestjs/common';

/**
 * The backend half of staff market scope.
 *
 * The gateway resolves the market a request may act in from the signed token
 * (`guards/market-scope.ts`) and forwards it as `scope`. A handler must not
 * trust that alone: it loads the row, reads the row's own market and calls
 * `assertInMarket` — so a regional admin who reaches a handler by any path
 * (query, body, path id, header, a future route someone forgot to scope) is
 * still refused by the record itself.
 */
const fallbackLogger = new Logger('MarketScope');

export function normaliseMarket(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toUpperCase();
  return v.length > 0 ? v : undefined;
}

/** The market a list query filters on: the lock wins over whatever was requested. */
export function marketPredicate(
  scope: string | undefined,
  requested?: string | null,
): string | undefined {
  return normaliseMarket(scope) ?? normaliseMarket(requested ?? undefined);
}

export function assertInMarket(
  recordRegion: string | null | undefined,
  scope: string | undefined,
  what: string,
  logger: { warn(message: string): void } = fallbackLogger,
): void {
  const lock = normaliseMarket(scope);
  if (!lock) return;
  const owner = normaliseMarket(recordRegion ?? undefined) ?? null;
  if (owner === lock) return;
  logger.warn(
    `[region-scope-denied] ${what} in ${owner ?? 'every market'} refused for a ${lock}-scoped admin`,
  );
  throw new ForbiddenException(
    `This ${what} belongs to ${owner ?? 'every market'}, not to the ${lock} market.`,
  );
}
```

Append to `apps/api/libs/common/src/index.ts`:

```ts
// ─── Staff market scope (backend half) ───────────────────────────────────────
export * from './market/market-scope';
```

- [ ] **Step 4: Run the spec — PASS**

Run: `npx vitest run libs/common/src/market/market-scope.spec.ts` → 8 passed.

- [ ] **Step 5: Make the marketplace admin service delegate to it**

In `modules/marketplace/backend/src/admin/admin.service.ts` add `assertInMarket as assertInMarketShared` to the `@app/common` import (or add a new import line `import { assertInMarket as assertInMarketShared } from '@app/common';`) and replace the private method body (lines 685-699) with:

```ts
  private assertInMarket(
    recordRegion: string | null | undefined,
    scope: string | undefined,
    what: string,
  ): void {
    assertInMarketShared(recordRegion, scope, what, this.logger);
  }
```

- [ ] **Step 6: Write the failing spec for the gateway half**

`apps/api/apps/api-gateway/src/guards/market-scope.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { assertRecordInScope, marketScopeOf, resolveMarket } from './market-scope';

const reqAs = (user: Record<string, unknown>) => ({
  user,
  method: 'GET',
  originalUrl: '/api/v1/admin/test',
  headers: { 'x-request-id': 'req-1' },
});

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'ADMIN' };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN', regionCode: 'QA', regionLocked: true };

describe('marketScopeOf', () => {
  it('locks a region-locked ADMIN to their market', () => {
    expect(marketScopeOf(reqAs(qaAdmin))).toMatchObject({
      locked: true,
      region: 'QA',
      userId: 'u-qa',
    });
  });
  it('never locks SUPER_ADMIN, whatever the columns say', () => {
    expect(marketScopeOf(reqAs(superAdmin)).locked).toBe(false);
  });
  it('treats an unlocked ADMIN as global', () => {
    expect(marketScopeOf(reqAs(globalAdmin)).locked).toBe(false);
  });
  it('does not lock on a regionCode without the lock flag', () => {
    expect(marketScopeOf(reqAs({ role: 'ADMIN', regionCode: 'QA' })).locked).toBe(false);
  });
});

describe('resolveMarket', () => {
  it('returns the request unchanged for a global admin (undefined = every market)', () => {
    expect(resolveMarket(reqAs(globalAdmin), 'in')).toBe('IN');
    expect(resolveMarket(reqAs(globalAdmin), undefined)).toBeUndefined();
  });
  it('returns the locked market when nothing or the same market is requested', () => {
    expect(resolveMarket(reqAs(qaAdmin), undefined, 'those users')).toBe('QA');
    expect(resolveMarket(reqAs(qaAdmin), 'qa', 'those users')).toBe('QA');
  });
  it('refuses another market with the platform wording', () => {
    expect(() => resolveMarket(reqAs(qaAdmin), 'IN', 'those users')).toThrow(ForbiddenException);
    expect(() => resolveMarket(reqAs(qaAdmin), 'IN', 'those users')).toThrow(
      'Your account is restricted to the QA market; those users belongs to IN.',
    );
  });
});

describe('assertRecordInScope', () => {
  it('lets a global admin touch anything', () => {
    expect(() => assertRecordInScope(reqAs(globalAdmin), 'IN', 'that seller')).not.toThrow();
  });
  it('lets a locked admin touch their own market', () => {
    expect(() => assertRecordInScope(reqAs(qaAdmin), 'qa', 'that seller')).not.toThrow();
  });
  it('refuses another market and a global record', () => {
    expect(() => assertRecordInScope(reqAs(qaAdmin), 'IN', 'that seller')).toThrow(
      ForbiddenException,
    );
    expect(() => assertRecordInScope(reqAs(qaAdmin), null, 'that banner')).toThrow(
      'that banner belongs to every market',
    );
  });
});
```

- [ ] **Step 7: Run it — it passes against the existing implementation (this spec pins behaviour before A3–A7 lean on it)**

Run: `npx vitest run apps/api-gateway/src/guards/market-scope.spec.ts` → 11 passed.

- [ ] **Step 8: Delete the dead guards after proving nothing imports them**

```bash
grep -rn "RegionGuard\|RequireRegion\|REQUIRE_REGION_KEY\|RegionIsolationGuard\|region-isolation.guard\|region.guard\|region.decorator" apps/api --include=*.ts | grep -v node_modules | grep -v "dist/"
```

Expected: only the three files themselves and `libs/security/src/index.ts`. Then:

```bash
git rm apps/api/apps/api-gateway/src/guards/region.guard.ts apps/api/apps/api-gateway/src/decorators/region.decorator.ts apps/api/libs/security/src/region-isolation.guard.ts
```

and delete the line `export * from './region-isolation.guard';` from `apps/api/libs/security/src/index.ts`.

- [ ] **Step 9: Build and run the whole gateway + common test set**

Run: `npx nest build --all` → 0. Run: `npx vitest run apps/api-gateway libs/common` → all green.

- [ ] **Step 10: Commit**

```bash
git add -A apps/api/libs/common apps/api/libs/security apps/api/apps/api-gateway/src/guards apps/api/apps/api-gateway/src/decorators modules/marketplace/backend/src/admin/admin.service.ts
git commit -m "refactor(api): one shared assertInMarket for every backend; scope helpers pinned by specs; dead region guards removed" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3 (A3): Admin core (users, KYC, audit, revenue) is market-scoped end to end

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/admin-core.controller.ts`
- Modify: `apps/api/apps/admin-service/src/admin.controller.ts:43-88`
- Modify: `apps/api/apps/admin-service/src/admin.service.ts` (`getUsersList`, `banUser`, `unbanUser`, `getPendingKyc`, `approveKyc`, `rejectKyc`, `getAuditLogs`, `getRevenueReport`)
- Create: `apps/api/apps/api-gateway/src/controllers/admin-core.controller.spec.ts`
- Create: `apps/api/apps/admin-service/src/admin.scope.spec.ts`

**Interfaces:**

- Consumes: `resolveMarket`, `marketScopeOf` (gateway); `assertInMarket`, `marketPredicate` (`@app/common`).
- Produces (RPC payloads, all optional `scope?: string`):
  - `admin_users_list { page, limit, role?, country?, search?, scope? }`
  - `admin_ban_user { userId, reason, adminId, scope? }`, `admin_unban_user { userId, adminId, scope? }`
  - `admin_kyc_pending { page, limit, scope? }`, `admin_kyc_approve|reject { entityId, entityType, adminId, reason?, scope? }`
  - `admin_audit_logs { …, scope? }`, `admin_revenue_report { startDate, endDate, groupBy, scope? }`
  - Service signatures: `getUsersList(page, limit, role?, country?, search?, scope?)`, `banUser(userId, reason, adminId, scope?)`, `unbanUser(userId, adminId, scope?)`, `getPendingKyc(page, limit, scope?)`, `approveKyc(entityId, entityType, adminId, scope?)`, `rejectKyc(entityId, entityType, adminId, reason, scope?)`, `getAuditLogs(page, limit, filters & { scope? })`, `getRevenueReport(start, end, groupBy, scope?)`.

- [ ] **Step 1: Write the failing gateway spec**

`admin-core.controller.spec.ts` (uses the `FakeJwtAuthGuard` idea from `guards.regression.spec.ts` but drives the controller directly — no HTTP needed):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminCoreController } from './admin-core.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

describe('AdminCoreController market scope', () => {
  let client: { send: ReturnType<typeof vi.fn> };
  let ctrl: AdminCoreController;

  beforeEach(() => {
    client = { send: vi.fn(() => of({ data: [], total: 0 })) };
    ctrl = new AdminCoreController(client as any);
  });

  it("forces a locked admin's users list into their market", async () => {
    await ctrl.users(req(qaAdmin), 1, 20, undefined, undefined, undefined);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin_users_list' },
      expect.objectContaining({ scope: 'QA', country: 'QA' }),
    );
  });

  it('refuses a locked admin who asks for another market', async () => {
    await expect(ctrl.users(req(qaAdmin), 1, 20, undefined, 'IN', undefined)).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it("passes a global admin's filter through and no scope", async () => {
    await ctrl.users(req(globalAdmin), 1, 20, undefined, 'in', undefined);
    const payload = client.send.mock.calls[0][1];
    expect(payload.country).toBe('IN');
    expect(payload.scope).toBeUndefined();
  });

  it('carries scope on ban, unban, kyc and audit calls', async () => {
    await ctrl.banUser(req(qaAdmin), 'user-1', { reason: 'fraud' });
    await ctrl.unbanUser(req(qaAdmin), 'user-1');
    await ctrl.pendingKyc(req(qaAdmin), 1, 20);
    await ctrl.approveKyc(req(qaAdmin), 'e-1', { entityType: 'seller' });
    await ctrl.rejectKyc(req(qaAdmin), 'e-1', { entityType: 'seller', reason: 'blurry' });
    await ctrl.auditLogs(req(qaAdmin), 1, 50);
    await ctrl.revenueReport(req(qaAdmin));
    for (const call of client.send.mock.calls) expect(call[1]).toMatchObject({ scope: 'QA' });
  });
});
```

- [ ] **Step 2: Run it — FAIL**

Run: `npx vitest run apps/api-gateway/src/controllers/admin-core.controller.spec.ts`
Expected: FAIL — `ctrl.users` does not accept `req` as its first argument (TypeScript/arity) and no `scope` is sent.

- [ ] **Step 3: Scope every route in the gateway controller**

Replace the handlers in `admin-core.controller.ts` (keep the class header, `send`, `actorId`):

```ts
import { marketScopeOf, resolveMarket } from '../guards/market-scope';
```

```ts
  /**
   * The market this request may act in, as `scope` for the backend. A locked
   * admin gets their market (and any other market they name is refused and
   * logged); a global admin gets undefined — every market — or the market they
   * filtered on.
   */
  private scopeOf(req: any, requested?: string, what = 'that market'): { scope?: string; market?: string } {
    const market = resolveMarket(req, requested, what);
    const scope = marketScopeOf(req).locked ? market : undefined;
    return { scope, market };
  }

  // ── Overview ───────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform-wide admin dashboard counters' })
  @ApiQuery({ name: 'country', required: false })
  dashboard(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that dashboard');
    return this.send('get_admin_dashboard', { country: market, scope });
  }

  @Get('platform/health')
  @ApiOperation({ summary: 'Platform health summary across services' })
  platformHealth() {
    return this.send('admin_platform_health', {});
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List platform users' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'search', required: false })
  users(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('role') role?: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those users');
    return this.send('admin_users_list', { page, limit, role, country: market, search, scope });
  }

  @Put('users/:userId/ban')
  @ApiOperation({ summary: 'Ban a user' })
  banUser(@Req() req: any, @Param('userId', ParseUUIDPipe) userId: string, @Body() dto: { reason?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that user');
    return this.send('admin_ban_user', {
      userId, reason: dto?.reason ?? '', adminId: this.actorId(req), scope,
    });
  }

  @Put('users/:userId/unban')
  @ApiOperation({ summary: 'Lift a ban' })
  unbanUser(@Req() req: any, @Param('userId', ParseUUIDPipe) userId: string) {
    const { scope } = this.scopeOf(req, undefined, 'that user');
    return this.send('admin_unban_user', { userId, adminId: this.actorId(req), scope });
  }

  // ── KYC queue ──────────────────────────────────────────────────────────────

  @Get('kyc/pending')
  @ApiOperation({ summary: 'Identity checks awaiting a decision' })
  pendingKyc(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that queue');
    return this.send('admin_kyc_pending', { page, limit, scope });
  }

  @Post('kyc/:entityId/approve')
  @ApiOperation({ summary: 'Approve an identity check' })
  approveKyc(@Req() req: any, @Param('entityId') entityId: string, @Body() dto: { entityType?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that identity check');
    return this.send('admin_kyc_approve', {
      entityId, entityType: dto?.entityType ?? 'seller', adminId: this.actorId(req), scope,
    });
  }

  @Post('kyc/:entityId/reject')
  @ApiOperation({ summary: 'Reject an identity check, with a reason' })
  rejectKyc(
    @Req() req: any,
    @Param('entityId') entityId: string,
    @Body() dto: { entityType?: string; reason?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that identity check');
    return this.send('admin_kyc_reject', {
      entityId,
      entityType: dto?.entityType ?? 'seller',
      adminId: this.actorId(req),
      reason: dto?.reason ?? '',
      scope,
    });
  }

  // ── Audit trail ────────────────────────────────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'Administrative actions, newest first' })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'adminId', required: false })
  auditLogs(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('adminId') adminId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that audit trail');
    return this.send('admin_audit_logs', { page, limit, action, adminId, startDate, endDate, scope });
  }

  @Post('audit-logs')
  @ApiOperation({ summary: 'Record an administrative action' })
  addAuditLog(
    @Req() req: any,
    @Body() dto: { action: string; entityType: string; entityId: string; details?: unknown },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that audit trail');
    return this.send('admin_audit_log_add', { ...dto, adminId: this.actorId(req), country: scope ?? 'ALL' });
  }

  // ── Reporting ──────────────────────────────────────────────────────────────

  @Get('reports/revenue')
  @ApiOperation({ summary: 'Revenue over a date range' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  @ApiQuery({ name: 'country', required: false })
  revenueReport(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    const end = endDate ?? new Date().toISOString().slice(0, 10);
    const start =
      startDate ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    return this.send('admin_revenue_report', {
      startDate: start, endDate: end, groupBy: groupBy ?? 'day', country: market, scope,
    });
  }
```

Add `ParseUUIDPipe` to the `@nestjs/common` import list.

- [ ] **Step 4: Run the gateway spec — PASS**

Run: `npx vitest run apps/api-gateway/src/controllers/admin-core.controller.spec.ts` → 4 passed.

- [ ] **Step 5: Write the failing admin-service spec**

`apps/api/apps/admin-service/src/admin.scope.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';

/** Minimal doubles: a Redis with the pending-KYC keys, an EntityManager whose
 *  query builder records the predicates it was given, a Kafka that swallows. */
function makeService(overrides: { userCountry?: string | null; kyc?: Record<string, any> } = {}) {
  const store = new Map<string, any>(Object.entries(overrides.kyc ?? {}));
  const redis = {
    keys: vi.fn(async (pattern: string) =>
      [...store.keys()].filter((k) => k.startsWith(pattern.replace('*', ''))),
    ),
    getJson: vi.fn(async (k: string) => store.get(k) ?? null),
    setJson: vi.fn(async () => undefined),
    get: vi.fn(async () => '0'),
    set: vi.fn(async () => undefined),
    del: vi.fn(async (k: string) => {
      store.delete(k);
    }),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const where: string[] = [];
  const qb: any = {
    select: () => qb,
    from: () => qb,
    andWhere: (s: string) => {
      where.push(s);
      return qb;
    },
    where: (s: string) => {
      where.push(s);
      return qb;
    },
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () => [[], 0],
    getRawOne: async () => ({ u_id: 'user-1', u_country: overrides.userCountry ?? 'IN' }),
  };
  const em: any = { createQueryBuilder: () => qb, query: vi.fn(async () => [{ id: 'user-1' }]) };
  // Constructor order as of 2026-09-11: (redis, kafka, layoutRepo, em).
  const svc = new AdminService(redis as any, kafka as any, {} as any, em);
  return { svc, where, kafka, store };
}

describe('AdminService market scope', () => {
  it('adds the scope predicate to the users list and ignores a conflicting country', async () => {
    const { svc, where } = makeService();
    await svc.getUsersList(1, 20, undefined, 'IN', undefined, 'QA');
    expect(where.some((w) => w.includes('u.country = :scope'))).toBe(true);
    expect(where.some((w) => w.includes('u.country = :country'))).toBe(false);
  });

  it('refuses to ban a user from another market', async () => {
    const { svc, kafka } = makeService({ userCountry: 'IN' });
    await expect(svc.banUser('user-1', 'fraud', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it("lists only the scoped market's pending KYC records", async () => {
    const { svc } = makeService({
      kyc: {
        'admin:kyc:pending:seller:a': { id: 'a', country: 'QA', submittedAt: '2026-09-01' },
        'admin:kyc:pending:seller:b': { id: 'b', country: 'IN', submittedAt: '2026-09-02' },
      },
    });
    const res = await svc.getPendingKyc(1, 20, 'QA');
    expect(res.data.map((r: any) => r.id)).toEqual(['a']);
    expect(res.total).toBe(1);
  });

  it('refuses to approve a KYC record from another market and leaves it pending', async () => {
    const { svc, store } = makeService({
      kyc: { 'admin:kyc:pending:seller:b': { id: 'b', country: 'IN', submittedAt: '2026-09-02' } },
    });
    await expect(svc.approveKyc('b', 'seller', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(store.has('admin:kyc:pending:seller:b')).toBe(true);
  });
});
```

The constructor order (`apps/api/apps/admin-service/src/admin.service.ts` lines 16-21) is `RedisService`, `KafkaProducerService`, `Repository<PageLayout>`, `EntityManager | null`; re-check it before running if the file has moved on.

- [ ] **Step 6: Run — FAIL** (`getUsersList` ignores the sixth argument; `banUser`/`getPendingKyc`/`approveKyc` have no scope parameter).

- [ ] **Step 7: Enforce scope in admin-service**

In `admin.controller.ts` replace the five handlers:

```ts
  @MessagePattern({ cmd: 'admin_users_list' })
  msgUsersList(@Payload() d: { page?: number; limit?: number; role?: string; country?: string; search?: string; scope?: string }) {
    return this.svc.getUsersList(d?.page, d?.limit, d?.role, d?.country, d?.search, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_ban_user' })
  msgBanUser(@Payload() d: { userId: string; reason: string; adminId: string; scope?: string }) {
    return this.svc.banUser(d?.userId, d?.reason, d?.adminId, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_unban_user' })
  msgUnbanUser(@Payload() d: { userId: string; adminId: string; scope?: string }) {
    return this.svc.unbanUser(d?.userId, d?.adminId, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_kyc_pending' })
  msgPendingKyc(@Payload() d: { page?: number; limit?: number; scope?: string }) {
    return this.svc.getPendingKyc(d?.page, d?.limit, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_kyc_approve' })
  msgApproveKyc(@Payload() d: { entityId: string; entityType: string; adminId: string; scope?: string }) {
    return this.svc.approveKyc(d?.entityId, d?.entityType, d?.adminId, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_kyc_reject' })
  msgRejectKyc(@Payload() d: { entityId: string; entityType: string; adminId: string; reason: string; scope?: string }) {
    return this.svc.rejectKyc(d?.entityId, d?.entityType, d?.adminId, d?.reason, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_audit_logs' })
  msgAuditLogs(@Payload() d: { page?: number; limit?: number; action?: string; adminId?: string; startDate?: string; endDate?: string; scope?: string }) {
    return this.svc.getAuditLogs(d?.page, d?.limit, {
      action: d?.action, adminId: d?.adminId, startDate: d?.startDate, endDate: d?.endDate, scope: d?.scope,
    });
  }

  @MessagePattern({ cmd: 'admin_revenue_report' })
  msgRevenueReport(@Payload() d: { startDate: string; endDate: string; groupBy?: 'day' | 'week' | 'month'; country?: string; scope?: string }) {
    return this.svc.getRevenueReport(d?.startDate, d?.endDate, d?.groupBy ?? 'day', d?.scope ?? d?.country);
  }
```

In `admin.service.ts` import `assertInMarket, marketPredicate` from `@app/common` and change:

`getUsersList` — signature `async getUsersList(page = 1, limit = 20, role?: string, country?: string, search?: string, scope?: string)`; replace the `if (country) …` line with:

```ts
const market = marketPredicate(scope, country);
if (scope) qb.andWhere('u.country = :scope', { scope: market });
else if (market) qb.andWhere('u.country = :country', { country: market });
```

Add a private helper and use it in `banUser`/`unbanUser` before `applyUserStatus`:

```ts
  /** The market a user belongs to, for the scope check on ban/unban. */
  private async userMarket(userId: string): Promise<string | null> {
    if (!this.isDbActive() || !this.em) return null;
    const row = await this.em
      .createQueryBuilder()
      .select(['u.id', 'u.country'])
      .from('users', 'u')
      .where('u.id = :id', { id: userId })
      .getRawOne<{ u_id: string; u_country: string | null }>();
    if (!row) throw new NotFoundException('User not found');
    return row.u_country ?? null;
  }
```

```ts
  async banUser(userId: string, reason: string, adminId: string, scope?: string) {
    if (scope) assertInMarket(await this.userMarket(userId), scope, 'user', this.logger);
    await this.applyUserStatus(
```

```ts
  async unbanUser(userId: string, adminId: string, scope?: string) {
    if (scope) assertInMarket(await this.userMarket(userId), scope, 'user', this.logger);
```

`getPendingKyc(page = 1, limit = 20, scope?: string)` — after collecting `pendingRecords`, before sorting:

```ts
const market = marketPredicate(scope);
const inScope = market
  ? pendingRecords.filter(
      (r) => marketPredicate(undefined, r.country ?? r.countryCode ?? r.regionCode) === market,
    )
  : pendingRecords;
```

and use `inScope` in place of `pendingRecords` for the sort, slice and `total`.

`approveKyc(entityId, entityType, adminId, scope?)` and `rejectKyc(entityId, entityType, adminId, reason, scope?)` — first statement:

```ts
const key = `admin:kyc:pending:${entityType}:${entityId}`;
const pending = await this.redis.getJson<any>(key);
if (!pending) throw new NotFoundException('No pending identity check with that id');
assertInMarket(
  pending.country ?? pending.countryCode ?? pending.regionCode ?? null,
  scope,
  'identity check',
  this.logger,
);
```

(Keep the existing `await this.redis.del(key)` etc. after it. Import `NotFoundException` from `@nestjs/common`.)

`getAuditLogs(page, limit, filters?: { …; scope?: string })` — add after the existing filters:

```ts
if (filters?.scope) {
  const market = marketPredicate(filters.scope);
  filtered = filtered.filter(
    (l) => marketPredicate(undefined, l.country) === market || l.country === 'ALL',
  );
}
```

and in `addAuditLog` persist `country: entry.country ?? 'ALL'` on the log object (the gateway now sends it).

`getRevenueReport(startDate, endDate, groupBy = 'day', scope?: string)`: first run `grep -n "Math.random\|Math.floor(Math" apps/api/apps/admin-service/src/admin.service.ts` and read lines 422-460. If the series is synthesised (the loop fills `revenue` from random or constant values rather than a query), replace the body with an honest refusal until Plan C1 wires it to order-service:

```ts
  async getRevenueReport(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day', scope?: string) {
    // The previous implementation generated a series with no query behind it.
    // Revenue lives in order-service (orders carry region_code and currency);
    // Plan C1 routes this report there per market. Until then the platform says
    // so rather than drawing a chart.
    throw new NotImplementedException(
      `Revenue reporting${scope ? ` for ${scope}` : ''} is not connected to order-service yet.`,
    );
  }
```

If it is a real query, add `if (scope) qb.andWhere('o.region_code = :scope', { scope })` to that query and keep the rest.

- [ ] **Step 8: Run the admin-service spec — PASS**; build

Run: `npx vitest run apps/admin-service/src/admin.scope.spec.ts` → 4 passed. Run: `npx nest build --all` → 0.

- [ ] **Step 9: Live probe as the QA admin (fleet up)**

```bash
QA=$(curl -s -X POST localhost:3001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"qa-admin@kartseek.com","password":"AdminPass123!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "localhost:3001/api/v1/admin/users?country=IN"      # 403
curl -s -H "Authorization: Bearer $QA" "localhost:3001/api/v1/admin/users" | node -pe 'JSON.stringify([...new Set(JSON.parse(require("fs").readFileSync(0)).data.map(u=>u.country))])'   # ["QA"] or []
```

- [ ] **Step 10: Commit**

```bash
git add apps/api/apps/api-gateway/src/controllers/admin-core.controller.ts apps/api/apps/api-gateway/src/controllers/admin-core.controller.spec.ts apps/api/apps/admin-service/src
git commit -m "fix(admin-core): users, KYC, audit and revenue confined to the caller's market on both sides of the wire" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4 (A4): Marketplace sellers, products and approvals are scoped; the filter payload bugs are fixed; no placeholder on outage

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts` (sellers block 239-420, products block 422-560, plus the routes listed in Step 7)
- Modify: `modules/marketplace/backend/src/marketplace.controller.ts` (`admin_get_sellers`, `admin_get_seller_by_id`, `admin_get_products`, `admin_get_pending_products`, seller/product decision handlers)
- Modify: `modules/marketplace/backend/src/marketplace.service.ts` (`approveSeller`, `suspendSeller`, `rejectSeller`, `reactivateSeller`, `approveProduct`, `rejectProduct`)
- Modify: `modules/marketplace/backend/src/admin/admin.service.ts` (`getPendingSellers`, `getPendingProducts`, `blockSeller`)
- Create: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.scope.spec.ts`
- Create: `modules/marketplace/backend/src/admin/admin-scope.spec.ts`

**Interfaces:**

- RPC payloads gain `scope?: string`; list payloads are always **objects** (`{ page, limit, status, search, region, scope }`), never positional arrays.
- Backend: `catalog.getSellersForAdmin({ region, status, page, limit })` (exists); new `admin.getProductsForAdmin({ region, status, page, limit })`; `getPendingSellers(scope?)`, `getPendingProducts(scope?)`; `approveSeller(sellerId, adminId, scope?)` and siblings; `approveProduct(productId, adminId, scope?)`, `rejectProduct(productId, adminId, reason, scope?)`.

- [ ] **Step 1: Write the failing gateway spec**

`admin-marketplace.scope.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AdminMarketplaceController } from './admin-marketplace.controller';
import { MARKETPLACE_PATTERNS } from '../contracts/marketplace.patterns';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build(sendImpl: (cmd: any, payload: any) => any) {
  const client = { send: vi.fn((cmd, payload) => of(sendImpl(cmd, payload))) };
  const noop = { send: vi.fn(() => of({})) };
  const ctrl = new AdminMarketplaceController(
    { get: vi.fn(), set: vi.fn(), del: vi.fn(), delPattern: vi.fn() } as any, // redis
    { publish: vi.fn(async () => undefined) } as any, // kafka
    client as any, // marketplace
    { update: vi.fn(), findOne: vi.fn() } as any, // userRepo
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
    noop as any,
  );
  return { ctrl, client };
}

describe('AdminMarketplaceController — sellers and products', () => {
  it('sends the seller list filters as an object with the resolved market', async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await ctrl.getSellers(req(globalAdmin), 2, 25, 'acme', 'PENDING', 'in');
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS },
      { page: 2, limit: 25, search: 'acme', status: 'PENDING', region: 'IN', scope: undefined },
    );
  });

  it("confines a locked admin's seller list and refuses another market", async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await ctrl.getSellers(req(qaAdmin), 1, 20, undefined, undefined, undefined);
    expect(client.send.mock.calls[0][1]).toMatchObject({ region: 'QA', scope: 'QA' });
    await expect(ctrl.getSellers(req(qaAdmin), 1, 20, undefined, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('asks for PENDING sellers on the pending route', async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await ctrl.getPendingSellers(req(globalAdmin), undefined);
    expect(client.send.mock.calls[0][1]).toMatchObject({ status: 'PENDING' });
  });

  it('sends the product list as an object, not an array', async () => {
    const { ctrl, client } = build(() => ({ data: [], total: 0 }));
    await ctrl.getProducts(req(globalAdmin), 3, 10, 'APPROVED', undefined);
    const payload = client.send.mock.calls[0][1];
    expect(Array.isArray(payload)).toBe(false);
    expect(payload).toMatchObject({ page: 3, limit: 10, status: 'APPROVED' });
  });

  it('propagates an outage instead of inventing a seller', async () => {
    const { ctrl } = build(() => {
      throw new HttpException('Marketplace service unavailable', 503);
    });
    await expect(
      ctrl.getSellerById(req(globalAdmin), '11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow(HttpException);
  });

  it('refuses a locked admin a seller from another market after loading it', async () => {
    const { ctrl } = build((cmd) =>
      cmd.cmd === MARKETPLACE_PATTERNS.ADMIN_GET_SELLER_BY_ID
        ? { id: 's-in', regionCode: 'IN' }
        : {},
    );
    await expect(
      ctrl.getSellerById(req(qaAdmin), '11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('carries scope and the real actor on seller decisions', async () => {
    const { ctrl, client } = build(() => ({ success: true, sellerId: 's-1' }));
    await ctrl.approveSeller(req(qaAdmin), '11111111-1111-4111-8111-111111111111', {});
    const [cmd, payload] = client.send.mock.calls.find(
      ([c]) => c.cmd === MARKETPLACE_PATTERNS.ADMIN_APPROVE_SELLER,
    )!;
    expect(cmd).toBeTruthy();
    expect(payload).toMatchObject({ scope: 'QA', adminId: 'u-qa' });
  });
});
```

Adjust the constructor argument order in `build()` to the real order of `AdminMarketplaceController`'s constructor (`redis, kafka, marketplaceClient, userRepo, commissionClient, payoutClient, walletClient, loyaltyClient, orderClient, refundClient` as read on 2026-09-11 — re-check lines 40-60 before running).

- [ ] **Step 2: Run — FAIL** (`getSellers` has no `req` parameter; payload is empty; `getSellerById` returns a placeholder; approve sends `'ADMIN'`).

- [ ] **Step 3: Rewrite the seller routes in the gateway**

Add the import `import { assertRecordInScope, marketScopeOf, resolveMarket } from '../guards/market-scope';` if not present, and a private helper next to `sendToMarketplace`:

```ts
  /** Market for the backend: `scope` only when the caller is locked; `market` = the filter to apply. */
  private scopeOf(req: any, requested?: string, what = 'that market'): { scope?: string; market?: string } {
    const market = resolveMarket(req, requested, what);
    return { scope: marketScopeOf(req).locked ? market : undefined, market };
  }
```

Replace `getSellers`, `getPendingSellers`, `getSellerById`, `approveSeller`, `rejectSeller`, `suspendSeller`, `reactivateSeller`, `blockSeller`:

```ts
  @Get('sellers')
  @ApiOperation({ summary: 'List sellers with filters, confined to the caller\'s market' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED', 'VERIFIED'] })
  @ApiQuery({ name: 'country', required: false })
  async getSellers(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those sellers');
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS, {
      page: Number(page), limit: Number(limit), search, status, region: market, scope,
    });
    return {
      ...(result as any),
      page: Number(page),
      limit: Number(limit),
      hasMore: (result as any).total > Number(page) * Number(limit),
    };
  }

  @Get('sellers/pending')
  @ApiOperation({ summary: 'Sellers awaiting approval in the caller\'s market' })
  @ApiQuery({ name: 'country', required: false })
  async getPendingSellers(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those sellers');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS, {
      status: 'PENDING', region: market, scope, page: 1, limit: 100,
    });
  }

  @Get('sellers/:id')
  @ApiOperation({ summary: 'Seller detail' })
  async getSellerById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    // No catch: an unreachable service is a 503, not a seller called "".
    const seller = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLER_BY_ID, id);
    if (!seller) throw new NotFoundException('Seller not found');
    assertRecordInScope(req, (seller as any).regionCode ?? (seller as any).region_code, 'that seller');
    return { data: seller };
  }

  @Patch('sellers/:id/approve')
  @ApiOperation({ summary: 'Approve a seller' })
  async approveSeller(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body?: { reason?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that seller');
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_APPROVE_SELLER, {
      id, adminId: this.actorId(req), scope,
    });
    await this.applySellerDecision(id, 'active');
    await this.kafka.publish(KAFKA_TOPICS.SELLER_APPROVED || 'seller.approved', {
      sellerId: id, actorId: this.actorId(req), regionCode: scope ?? (result as any)?.regionCode ?? null,
    });
    return { success: true, sellerId: id, status: 'approved', result };
  }
```

Apply the same three changes (add `@Req() req`, pass `{ id, adminId: this.actorId(req), scope, ...reason }`, publish with `actorId`) to `rejectSeller`, `suspendSeller`, `reactivateSeller` and `blockSeller`. If the controller has no `actorId` helper yet, add the same one as admin-core:

```ts
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
  }
```

Add `NotFoundException` and `ParseUUIDPipe` to the `@nestjs/common` import.

- [ ] **Step 4: Rewrite the product routes in the gateway**

```ts
  @Get('products')
  @ApiOperation({ summary: 'Products across sellers, confined to the caller\'s market' })
  @ApiQuery({ name: 'country', required: false })
  async getProducts(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those products');
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, {
      page: Number(page), limit: Number(limit), status, region: market, scope,
    });
    return { ...(result as any), hasMore: (result as any).total > Number(page) * Number(limit) };
  }

  @Get('products/pending')
  @ApiOperation({ summary: 'Products awaiting approval, with queue counts, in the caller\'s market' })
  @ApiQuery({ name: 'country', required: false })
  async getPendingProducts(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those products');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PENDING_PRODUCTS, { region: market, scope });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Product detail for admin review' })
  async getProductById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const product = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCT_BY_ID, id);
    if (!product) throw new NotFoundException('Product not found');
    assertRecordInScope(req, (product as any).sellerRegionCode ?? (product as any).seller?.regionCode, 'that product');
    return { data: product };
  }
```

For `approve`, `reject`, `request-correction`, `publish`, `unpublish`, `suspend`, `feature`, `unfeature` on `products/:id` and `approve`/`reject` on `listings/:id`: add `@Req() req`, compute `const { scope } = this.scopeOf(req, undefined, 'that product');`, and include `scope` and `adminId: this.actorId(req)` in the payload object sent to the backend. Remove every `catch` that returns a literal in these handlers.

- [ ] **Step 5: Write the failing backend spec**

`modules/marketplace/backend/src/admin/admin-scope.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { MarketplaceService } from '../marketplace.service';

describe('MarketplaceService seller decisions respect scope', () => {
  function service(sellerRegion: string) {
    const sellerRepo = {
      findOne: vi.fn(async () => ({
        id: 's-1',
        regionCode: sellerRegion,
        verificationStatus: 'PENDING',
      })),
      save: vi.fn(async (s: any) => s),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const svc = Object.create(MarketplaceService.prototype) as MarketplaceService;
    Object.assign(svc, { sellerRepo, kafka, logger: { log: vi.fn(), warn: vi.fn() } });
    return { svc, sellerRepo, kafka };
  }

  it("approves a seller in the admin's market", async () => {
    const { svc, sellerRepo } = service('QA');
    await expect(svc.approveSeller('s-1', 'admin-qa', 'QA')).resolves.toMatchObject({
      success: true,
    });
    expect(sellerRepo.save).toHaveBeenCalled();
  });

  it('refuses a seller from another market and writes nothing', async () => {
    const { svc, sellerRepo, kafka } = service('IN');
    await expect(svc.approveSeller('s-1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(sellerRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });
});
```

Run from `modules/marketplace/backend`: `npx vitest run src/admin/admin-scope.spec.ts` (if the module has no vitest config, run from `apps/api` with the path `../../modules/marketplace/backend/src/admin/admin-scope.spec.ts` — check `apps/api/vitest.config.mts` `include` first; the marketplace integration specs already run from `apps/api`).
Expected: FAIL — `approveSeller` takes two arguments and never checks the market.

- [ ] **Step 6: Enforce in the backend**

`marketplace.service.ts` — import `assertInMarket` from `@app/common`; change the six decision methods. Pattern for `approveSeller`:

```ts
  async approveSeller(sellerId: string, adminId: string, scope?: string) {
    if (!sellerId) throw new BadRequestException('A seller id is required.');
    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');
    assertInMarket(seller.regionCode, scope, 'seller', this.logger);
    seller.verificationStatus = 'VERIFIED';
    await this.sellerRepo.save(seller);
    await this.kafka.publish('seller.approved', { id: sellerId, approvedBy: adminId, regionCode: seller.regionCode });
    this.logger.log(`Seller ${sellerId} approved by ${adminId}`);
    return { success: true, sellerId, regionCode: seller.regionCode };
  }
```

Do the same insertion (`assertInMarket(seller.regionCode, scope, 'seller', this.logger)` immediately after the `NotFoundException` check, `scope?` as the last parameter, `regionCode` on the event) in `suspendSeller`, `rejectSeller`, `reactivateSeller`. For `approveProduct(productId, adminId, scope?)` and `rejectProduct(productId, adminId, reason, scope?)`: after the product is loaded, load its seller and assert:

```ts
const owner = await this.sellerRepo.findOne({
  where: { id: product.sellerId },
  select: ['id', 'regionCode'],
});
assertInMarket(owner?.regionCode ?? null, scope, 'product', this.logger);
```

`admin/admin.service.ts` — `blockSeller(sellerId, reason, adminId, scope?)` gets the same assert after its row lookup; replace `getPendingSellers` and `getPendingProducts` and add `getProductsForAdmin`:

```ts
  async getPendingSellers(scope?: string) {
    const where: Record<string, unknown> = { verificationStatus: 'PENDING' };
    if (scope) where.regionCode = scope.toUpperCase();
    const [data, total] = await this.sellerRepo.findAndCount({ where, order: { createdAt: 'DESC' } });
    return { data, total };
  }

  /** Products joined to their seller so the market predicate applies to every admin list. */
  private adminProductQuery(region?: string) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .innerJoin('sellers', 's', 's.id = p.sellerId')
      .addSelect('s.region_code', 'p_seller_region');
    if (region) qb.andWhere('s.region_code = :region', { region: region.toUpperCase() });
    return qb;
  }

  async getProductsForAdmin(opts: { region?: string; status?: string; page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const qb = this.adminProductQuery(opts.region);
    if (opts.status) qb.andWhere('p.approval_status = :status', { status: opts.status.toUpperCase() });
    const [data, total] = await qb.orderBy('p.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async getPendingProducts(scope?: string) {
    const region = scope?.toUpperCase();
    const products = await this.adminProductQuery(region).andWhere("p.approval_status = 'PENDING'").getMany();
    const count = (status: string) =>
      this.adminProductQuery(region).andWhere('p.approval_status = :status', { status }).getCount();
    const stats = {
      pending: products.length,
      approved: await count('APPROVED'),
      rejected: await count('REJECTED'),
      correctionRequested: await count('CORRECTION_REQUESTED'),
    };
    return { data: products, count: products.length, stats };
  }
```

(`'sellers'` is the table name the marketplace schema uses for `Seller`; confirm with `grep -n "@Entity" modules/marketplace/backend/src/entities/seller.entity.ts` and use `tablePath` if the entity declares a schema — see `project_marketplace_schema_decoys`.)

`marketplace.controller.ts` handlers:

```ts
  @MessagePattern({ cmd: 'admin_get_sellers' })
  tcpAdminGetSellers(@Payload() data: any) {
    return this.catalog.getSellersForAdmin({
      region: data?.scope ?? this.payloadRegion(data),
      status: data?.status,
      page: data?.page,
      limit: data?.limit,
    });
  }

  @MessagePattern({ cmd: 'admin_get_products' })
  tcpAdminGetProducts(@Payload() data: any) {
    return this.admin.getProductsForAdmin({
      region: data?.scope ?? this.payloadRegion(data),
      status: data?.status,
      page: data?.page,
      limit: data?.limit,
    });
  }

  @MessagePattern({ cmd: 'admin_get_pending_products' })
  tcpAdminGetPendingProducts(@Payload() data?: any) {
    return this.admin.getPendingProducts(data?.scope);
  }
```

and thread `d?.scope` into the approve/reject/suspend/reactivate/block handlers as the new last argument (e.g. `this.svc.approveSeller(d.id, d.adminId, d.scope)`).

- [ ] **Step 7: The remaining marketplace record routes**

Apply the same two-line pattern to each of these, using the record field named in the table for `assertRecordInScope` on reads and passing `scope` (backend asserts on the same field) on writes:

| Route(s)                                                                                        | `what`                             | Record market field            |
| ----------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------ | -------------------------------------- | ------------------ | ------ | --------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `GET seller-approvals`, `GET seller-approvals/counts`, `GET product-approvals`                  | those approvals                    | list → `region: market, scope` |
| `GET customers`, `PATCH customers/:id/block`                                                    | that customer                      | `country` (users)              |
| `GET complaints`, `PATCH complaints/:id`                                                        | that complaint                     | complaint → order `regionCode` |
| `GET disputes`                                                                                  | those disputes                     | order `regionCode`             |
| `GET reviews`, `PATCH reviews/:id/flag                                                          | hide`                              | that review                    | review → product → seller `regionCode` |
| `GET returns`, `POST returns/:id/approve                                                        | reject`                            | that return                    | `return_request.region_code`           |
| `GET refunds`, `POST refunds/:id/approve                                                        | process`, `PUT refunds/:id/reject` | that refund                    | refund → order `regionCode`            |
| `GET payouts`, `GET payouts/stats`, `PATCH payouts/:id/approve                                  | process`, `POST payouts/:id/retry` | that payout                    | payout → seller `regionCode`           |
| `GET commissions*`, `POST commissions/overrides`, `DELETE commissions/overrides/:sellerId`      | that commission                    | seller `regionCode`            |
| `GET seller-wallets`, `POST seller-wallets/:id/adjust`, `wallet/*`                              | that wallet                        | seller/user market             |
| `GET loyalty/users/:userId`, `POST loyalty/adjust`                                              | that loyalty account               | user `country`                 |
| `GET analytics/*`, `GET dashboard`, `GET seller-health`, `GET listing-quality`, `GET inventory` | that report                        | list → `region: market, scope` |
| `GET categories                                                                                 | subcategories                      | attributes                     | brands                                 | hsn-codes` (reads) | —      | `@GlobalEntity('catalogue taxonomy is shared by every market')` |
| `POST                                                                                           | PATCH                              | DELETE categories              | subcategories                          | attributes         | brands | hsn-codes`                                                      | that taxonomy | global write: `if (marketScopeOf(req).locked) throw new ForbiddenException('Catalogue taxonomy is managed globally.')` |

Where the backend handler for a row cannot yet resolve the record's market (the entity has no market column and no one-join owner — see audit §9), the gateway still passes `scope` and the backend returns `403` for a locked admin with the message `This <what> cannot be attributed to a market yet.` — never a silent pass. Plan C adds the columns.

- [ ] **Step 8: Run both specs — PASS; build**

Run: `npx vitest run apps/api-gateway/src/controllers/admin-marketplace.scope.spec.ts` → 7 passed.
Run the backend spec → 2 passed. Run: `npx nest build --all` → 0. Restart marketplace backend + gateway.

- [ ] **Step 9: Live probe**

```bash
# as the global admin, find one IN seller id
IN_SELLER=$(curl -s -H "Authorization: Bearer $SUPER" "localhost:3001/api/v1/admin/marketplace/sellers?country=IN&limit=1" | node -pe 'JSON.parse(require("fs").readFileSync(0)).data[0].id')
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH -H "Authorization: Bearer $QA" "localhost:3001/api/v1/admin/marketplace/sellers/$IN_SELLER/approve"   # 403
curl -s -H "Authorization: Bearer $QA" "localhost:3001/api/v1/admin/marketplace/sellers" | node -pe 'JSON.stringify([...new Set(JSON.parse(require("fs").readFileSync(0)).data.map(s=>s.regionCode))])'   # ["QA"]
curl -s -H "Authorization: Bearer $SUPER" "localhost:3001/api/v1/admin/marketplace/products?page=2&limit=5" | node -pe 'const j=JSON.parse(require("fs").readFileSync(0)); j.page+"/"+j.limit'   # 2/5
```

Check the gateway log shows `[region-scope-denied] user=… scope=QA target=IN what="that seller"`.

- [ ] **Step 10: Commit (two commits: gateway, then module)**

```bash
git add apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts apps/api/apps/api-gateway/src/controllers/admin-marketplace.scope.spec.ts
git commit -m "fix(gateway): marketplace seller and product administration confined to the caller's market; list filters actually sent" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add modules/marketplace/backend/src
git commit -m "fix(marketplace): admin seller and product handlers assert the record's market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5 (A5): Taxi administration is market-scoped; the suspend command name is fixed

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts` (every handler)
- Modify: `modules/taxi/backend/src/taxi.controller.ts:556-640` (admin handlers)
- Modify: `modules/taxi/backend/src/services/driver-onboarding.service.ts` (`suspendDriver`, `blockDriver`, `reviewDocument`), `vendor-management.service.ts`, `taxi-config.service.ts` (`upsertRateCard`, `upsertConfig`), `taxi-payout.service.ts` (`processPayouts`)
- Create: `apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.spec.ts`

**Interfaces:**

- Every RPC payload gains `scope?: string`; list payloads carry `countryCode` = resolved market.
- Backend: `suspendDriver(driverId, reason, scope?)`, `blockDriver(driverId, reason, scope?)`, `reviewDocument({..., scope?})`, `upsertRateCard(countryCode, vehicleType, dto, scope?)`, `upsertConfig(countryCode, dto, scope?)`, `processPayouts(payoutIds, scope?)`.

- [ ] **Step 1: Write the failing gateway spec**

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminTaxiController } from './admin-taxi.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = () => {
  const client = { send: vi.fn(() => of({ data: [], total: 0 })) };
  return { ctrl: new AdminTaxiController(client as any), client };
};

describe('AdminTaxiController market scope', () => {
  it("lists drivers in the locked admin's market and refuses another", async () => {
    const { ctrl, client } = build();
    await ctrl.getDrivers(req(qaAdmin), 1, undefined, undefined);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.taxi.drivers' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
    await expect(ctrl.getDrivers(req(qaAdmin), 1, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("refuses a locked admin another country's config and rate card", async () => {
    const { ctrl } = build();
    await expect(ctrl.upsertConfig(req(qaAdmin), 'IN', {})).rejects.toThrow(ForbiddenException);
    await expect(
      ctrl.upsertRateCard(req(qaAdmin), { countryCode: 'IN', vehicleType: 'sedan' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(ctrl.rateCards(req(qaAdmin), 'IN')).rejects.toThrow(ForbiddenException);
  });

  it('sends the working suspend command name with scope and actor', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendDriver(req(qaAdmin), '11111111-1111-4111-8111-111111111111', {
      reason: 'docs',
    });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.taxi.driver.suspend' },
      expect.objectContaining({
        driverId: '11111111-1111-4111-8111-111111111111',
        reason: 'docs',
        scope: 'QA',
        adminId: 'u-qa',
      }),
    );
  });

  it('scopes a payout batch', async () => {
    const { ctrl, client } = build();
    await ctrl.processPayouts(req(qaAdmin), { payoutIds: ['p-1'] });
    expect(client.send.mock.calls[0][1]).toMatchObject({ payoutIds: ['p-1'], scope: 'QA' });
  });

  it('lets a global admin pick any market and sends no scope', async () => {
    const { ctrl, client } = build();
    await ctrl.getDrivers(req(globalAdmin), 1, undefined, 'in');
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — FAIL** (handlers have no `req`; `suspendDriver` sends `admin.taxi.suspendDriver`).

- [ ] **Step 3: Scope the gateway controller**

Add the imports and helper (same `scopeOf` as A3). Then rewrite every handler so that: (a) the first parameter is `@Req() req: any`; (b) list handlers accept `@Query('countryCode') countryCode?: string` and send `countryCode: market, scope`; (c) record handlers send `scope` and `adminId: this.actorId(req)`; (d) country-keyed handlers resolve the path/body country. The full set:

```ts
  @Get('dashboard')
  async getDashboard(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that dashboard');
    return { data: await this.send('admin.taxi.dashboard', { countryCode: market, scope }) };
  }

  @Get('vendors')
  async getVendors(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those vendors');
    return await this.send('admin.taxi.vendors', { page: +page, limit: +limit, status, countryCode: market, scope });
  }

  @Get('vendors/:id')
  async getVendorById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that vendor');
    return { data: await this.send('admin.taxi.vendorDetail', { id, scope }) };
  }

  @Patch('vendors/:id/approve')
  async approveVendor(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that vendor');
    return { data: await this.send('admin.taxi.approveVendor', { id, scope, adminId: this.actorId(req) }) };
  }

  @Patch('vendors/:id/suspend')
  async suspendVendor(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: { reason?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that vendor');
    return { data: await this.send('admin.taxi.suspendVendor', { id, reason: body?.reason ?? '', scope, adminId: this.actorId(req) }) };
  }

  @Get('drivers')
  async getDrivers(@Req() req: any, @Query('page') page = 1, @Query('status') status?: string, @Query('countryCode') countryCode?: string, @Query('limit') limit = 20, @Query('search') search?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those drivers');
    return await this.send('admin.taxi.drivers', { page: +page, limit: +limit, status, search, countryCode: market, scope });
  }

  @Get('drivers/nearby')
  async nearbyDrivers(@Req() req: any, @Query('lat') lat: string, @Query('lng') lng: string, @Query('radiusKm') radiusKm?: string, @Query('vehicleType') vehicleType?: string, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that fleet');
    return this.send('admin.taxi.drivers.nearby', {
      lat: Number(lat), lng: Number(lng), radiusKm: radiusKm ? Number(radiusKm) : 5, vehicleType, countryCode: market, scope,
    });
  }

  @Get('drivers/:id')
  async getDriverById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that driver');
    return { data: await this.send('admin.taxi.driverDetail', { id, scope }) };
  }

  @Patch('drivers/:id/approve')
  async approveDriver(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that driver');
    return { data: await this.send('admin.taxi.approveDriver', { id, scope, adminId: this.actorId(req) }) };
  }

  @Patch('drivers/:id/suspend')
  async suspendDriver(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: { reason: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that driver');
    // taxi-service implements `admin.taxi.driver.suspend`; the previous name had no handler.
    return { data: await this.send('admin.taxi.driver.suspend', { driverId: id, reason: body?.reason ?? '', scope, adminId: this.actorId(req) }) };
  }

  @Post('drivers/:driverId/block')
  async blockDriver(@Req() req: any, @Param('driverId', ParseUUIDPipe) driverId: string, @Body() dto: { reason?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that driver');
    return this.send('admin.taxi.driver.block', { driverId, reason: dto?.reason ?? '', scope, adminId: this.actorId(req) });
  }

  @Get('rides')
  async getRides(@Req() req: any, @Query('page') page = 1, @Query('status') status?: string, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those rides');
    return await this.send('admin.taxi.rides', { page: +page, status, countryCode: market, scope });
  }

  @Get('rides/:id')
  async getRideById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that ride');
    return { data: await this.send('admin.taxi.rideDetail', { id, scope }) };
  }

  @Get('pricing')
  async getPricing(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that pricing');
    return { data: await this.send('admin.taxi.pricing', { countryCode: market, scope }) };
  }

  @Post('pricing')
  async updatePricing(@Req() req: any, @Body() body: { countryCode?: string; [k: string]: unknown }) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'that pricing');
    return { data: await this.send('admin.taxi.updatePricing', { ...body, countryCode: market, scope, adminId: this.actorId(req) }) };
  }

  @Get('surge')
  async getSurge(@Req() req: any, @Query('countryCode') countryCode?: string, @Query('lat') lat?: string, @Query('lng') lng?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those surge zones');
    return { data: await this.send('admin.taxi.surge', { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined, countryCode: market, scope }) };
  }

  @Post('surge')
  async updateSurge(@Req() req: any, @Body() body: { countryCode?: string; [k: string]: unknown }) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'those surge zones');
    return { data: await this.send('admin.taxi.updateSurge', { ...body, countryCode: market, scope, adminId: this.actorId(req) }) };
  }

  @Get('complaints')
  async getComplaints(@Req() req: any, @Query('page') page = 1, @Query('status') status?: string, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those complaints');
    return await this.send('admin.taxi.complaints', { page: +page, status, countryCode: market, scope });
  }

  @Patch('complaints/:id/resolve')
  async resolveComplaint(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: { resolution: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that complaint');
    return { data: await this.send('admin.taxi.resolveComplaint', { id, resolution: body?.resolution ?? '', scope, adminId: this.actorId(req) }) };
  }

  @Get('fleet')
  async getFleet(@Req() req: any, @Query('page') page = 1, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that fleet');
    return await this.send('admin.taxi.fleet', { page: +page, countryCode: market, scope });
  }

  @Get('payouts')
  async getPayouts(@Req() req: any, @Query('page') page = 1, @Query('status') status?: string, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those payouts');
    return await this.send('admin.taxi.payouts', { page: +page, status, countryCode: market, scope });
  }

  @Post('payouts/process')
  async processPayouts(@Req() req: any, @Body() dto: { payoutIds?: string[] }) {
    const { scope } = this.scopeOf(req, undefined, 'those payouts');
    return this.send('admin.taxi.payouts.process', { payoutIds: dto?.payoutIds ?? [], scope, adminId: this.actorId(req) });
  }

  @Get('payouts/summary')
  async payoutSummary(@Req() req: any, @Query('countryCode') countryCode?: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that summary');
    return this.send('admin.taxi.payouts.summary', { countryCode: market, startDate, endDate, scope });
  }

  @Post('payouts/:id/approve')
  async approvePayout(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that payout');
    return { data: await this.send('admin.taxi.approvePayout', { id, scope, adminId: this.actorId(req) }) };
  }

  @Get('routes')
  async getRoutes(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those routes');
    return { data: await this.send('admin.taxi.routes', { countryCode: market, scope }) };
  }

  @Post('routes')
  async createRoute(@Req() req: any, @Body() body: { countryCode?: string; [k: string]: unknown }) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'that route');
    return { data: await this.send('admin.taxi.createRoute', { ...body, countryCode: market, scope, adminId: this.actorId(req) }) };
  }

  @Get('pending-approvals')
  async getPendingApprovals(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that queue');
    return { data: await this.send('admin.taxi.pendingApprovals', { countryCode: market, scope }) };
  }

  @Get('compliance')
  async getCompliance(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that compliance view');
    return { data: await this.send('admin.taxi.compliance', { countryCode: market, scope }) };
  }

  @Get('settings')
  async getSettings(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those settings');
    return { data: await this.send('admin.taxi.settings', { countryCode: market, scope }) };
  }

  @Post('settings')
  async updateSettings(@Req() req: any, @Body() body: { countryCode?: string; [k: string]: unknown }) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'those settings');
    return { data: await this.send('admin.taxi.updateSettings', { ...body, countryCode: market, scope, adminId: this.actorId(req) }) };
  }

  @Get('documents/pending')
  async pendingDocuments(@Req() req: any, @Query('countryCode') countryCode?: string, @Query('ownerType') ownerType?: 'vendor' | 'driver', @Query('page') page?: string, @Query('limit') limit?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those documents');
    return this.send('admin.taxi.documents.pending', { countryCode: market, ownerType, page: page ? +page : 1, limit: limit ? +limit : 20, scope });
  }

  @Post('documents/:documentId/approve')
  async approveDocument(@Req() req: any, @Param('documentId', ParseUUIDPipe) documentId: string) {
    const { scope } = this.scopeOf(req, undefined, 'that document');
    return this.send('admin.taxi.documents.review', { documentId, adminId: this.actorId(req), decision: 'approved', scope });
  }

  @Post('documents/:documentId/reject')
  async rejectDocument(@Req() req: any, @Param('documentId', ParseUUIDPipe) documentId: string, @Body() dto: { reason?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that document');
    return this.send('admin.taxi.documents.review', { documentId, adminId: this.actorId(req), decision: 'rejected', rejectionReason: dto?.reason, scope });
  }

  @Get('rates')
  async rateCards(@Req() req: any, @Query('countryCode') countryCode: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those rate cards');
    if (!market) throw new BadRequestException('countryCode is required');
    return this.send('admin.taxi.rate_cards', { countryCode: market, scope });
  }

  @Post('rates')
  async upsertRateCard(@Req() req: any, @Body() dto: { countryCode: string; vehicleType: string; [k: string]: unknown }) {
    const { scope, market } = this.scopeOf(req, dto?.countryCode, 'that rate card');
    if (!market) throw new BadRequestException('countryCode is required');
    return this.send('admin.taxi.rate_card.upsert', { ...dto, countryCode: market, scope, adminId: this.actorId(req) });
  }

  @Get('config')
  async allConfigs(@Req() req: any) {
    const { scope } = this.scopeOf(req, undefined, 'those configurations');
    return this.send('admin.taxi.configs', { scope });
  }

  @Get('config/:countryCode')
  async getConfig(@Req() req: any, @Param('countryCode') countryCode: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that configuration');
    return this.send('admin.taxi.config.get', { countryCode: market, scope });
  }

  @Put('config/:countryCode')
  async upsertConfig(@Req() req: any, @Param('countryCode') countryCode: string, @Body() dto: Record<string, unknown>) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that configuration');
    return this.send('admin.taxi.config.upsert', { ...dto, countryCode: market, scope, adminId: this.actorId(req) });
  }
```

Keep the existing `@ApiOperation`/`@ApiQuery` decorators above each handler; add `ParseUUIDPipe` and `BadRequestException` to the `@nestjs/common` import.

- [ ] **Step 4: Run the gateway spec — PASS**

- [ ] **Step 5: Enforce in the taxi backend**

`taxi.controller.ts` — the implemented handlers become:

```ts
  @MessagePattern({ cmd: 'admin.taxi.vendors' })
  tcpAdminGetVendors(@Payload() d: { countryCode?: string; scope?: string; status?: string; search?: string; page?: number; limit?: number }) {
    return this.vendors.getVendors({ ...d, countryCode: d?.scope ?? d?.countryCode });
  }

  @MessagePattern({ cmd: 'admin.taxi.drivers' })
  tcpAdminGetDrivers(@Payload() d: { countryCode?: string; scope?: string; vendorId?: string; status?: string; search?: string; page?: number; limit?: number }) {
    return this.onboarding.getDrivers({ ...d, countryCode: d?.scope ?? d?.countryCode });
  }

  @MessagePattern({ cmd: 'admin.taxi.documents.pending' })
  tcpPendingDocuments(@Payload() d: { countryCode?: string; scope?: string; ownerType?: 'vendor' | 'driver'; page?: number; limit?: number }) {
    return this.onboarding.getPendingDocuments({ ...(d ?? {}), countryCode: d?.scope ?? d?.countryCode });
  }

  @MessagePattern({ cmd: 'admin.taxi.documents.review' })
  tcpReviewDocument(@Payload() d: { documentId: string; adminId: string; decision: 'approved' | 'rejected'; rejectionReason?: string; scope?: string }) {
    return this.onboarding.reviewDocument(d);
  }

  @MessagePattern({ cmd: 'admin.taxi.driver.suspend' })
  tcpSuspendDriver(@Payload() d: { driverId: string; reason: string; scope?: string }) {
    return this.onboarding.suspendDriver(d.driverId, d.reason, d.scope);
  }

  @MessagePattern({ cmd: 'admin.taxi.driver.block' })
  tcpBlockDriver(@Payload() d: { driverId: string; reason: string; scope?: string }) {
    return this.onboarding.blockDriver(d.driverId, d.reason, d.scope);
  }

  @MessagePattern({ cmd: 'admin.taxi.rate_cards' })
  tcpRateCards(@Payload() d: { countryCode: string; scope?: string }) {
    assertInMarket(d.countryCode, d.scope, 'rate card');
    return this.config.getRateCards(d.countryCode);
  }

  @MessagePattern({ cmd: 'admin.taxi.rate_card.upsert' })
  tcpUpsertRateCard(@Payload() d: { countryCode: string; vehicleType: string; scope?: string; [k: string]: unknown }) {
    assertInMarket(d.countryCode, d.scope, 'rate card');
    const { scope: _s, adminId: _a, ...dto } = d;
    return this.config.upsertRateCard(dto as any);
  }

  @MessagePattern({ cmd: 'admin.taxi.configs' })
  async tcpAllConfigs(@Payload() d?: { scope?: string }) {
    const all = await this.config.getAllConfigs();
    return d?.scope ? all.filter((c) => c.countryCode?.toUpperCase() === d.scope!.toUpperCase()) : all;
  }

  @MessagePattern({ cmd: 'admin.taxi.config.get' })
  tcpGetConfig(@Payload() d: { countryCode: string; scope?: string }) {
    assertInMarket(d.countryCode, d.scope, 'configuration');
    return this.config.getConfig(d.countryCode);
  }

  @MessagePattern({ cmd: 'admin.taxi.config.upsert' })
  tcpUpsertConfig(@Payload() d: { countryCode: string; scope?: string; [k: string]: unknown }) {
    assertInMarket(d.countryCode, d.scope, 'configuration');
    const { scope: _s, adminId: _a, ...dto } = d;
    return this.config.upsertConfig(dto as any);
  }

  @MessagePattern({ cmd: 'admin.taxi.payouts' })
  tcpPayouts(@Payload() d: { countryCode?: string; scope?: string; recipientType?: 'vendor' | 'driver'; status?: string; search?: string; page?: number; limit?: number }) {
    return this.payouts.getPayouts({ ...d, countryCode: d?.scope ?? d?.countryCode });
  }

  @MessagePattern({ cmd: 'admin.taxi.payouts.process' })
  tcpProcessPayouts(@Payload() d: { payoutIds: string[]; scope?: string }) {
    return this.payouts.processPayouts(d.payoutIds, d.scope);
  }

  @MessagePattern({ cmd: 'admin.taxi.payouts.summary' })
  tcpPayoutSummary(@Payload() d: { countryCode?: string; scope?: string; startDate?: string; endDate?: string }) {
    return this.payouts.getPayoutSummary({ ...d, countryCode: d?.scope ?? d?.countryCode });
  }

  @MessagePattern({ cmd: 'admin.taxi.drivers.nearby' })
  tcpNearbyDrivers(@Payload() d: { lat: number; lng: number; radiusKm?: number; vehicleType?: string; countryCode?: string; scope?: string }) {
    return this.dispatch.findNearbyDrivers({ ...d, countryCode: d?.scope ?? d?.countryCode });
  }
```

(`import { assertInMarket } from '@app/common';`; if `upsertRateCard`/`upsertConfig`/`getPayouts`/`getPayoutSummary`/`findNearbyDrivers` take positional arguments today, keep their call shape and only add the `countryCode` resolution — read each signature first; the `assertInMarket` lines are the non-negotiable part.)

Services: in `driver-onboarding.service.ts` `suspendDriver(driverId, reason, scope?)` and `blockDriver(driverId, reason, scope?)` add `assertInMarket(driver.countryCode, scope, 'driver', this.logger)` right after the driver is loaded and before any write; in `reviewDocument` load the document, then `assertInMarket(doc.countryCode ?? doc.driver?.countryCode ?? doc.vendor?.countryCode, d.scope, 'document', this.logger)` before writing the decision; in `taxi-payout.service.ts` `processPayouts(payoutIds, scope?)` load the payout rows first and assert each `payout.countryCode`; in `findNearbyDrivers` add `if (countryCode) qb.andWhere('d.countryCode = :cc', { cc: countryCode })` (or filter the Redis geo results by the driver profile's `countryCode`) so a QA admin's fleet map never plots an Indian driver.

- [ ] **Step 6: Build, restart taxi + gateway, live probe**

Run: `npx nest build --all` → 0 (from `apps/api`) and the taxi backend's build (`npm run build` in `modules/taxi/backend`).

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT -H "Authorization: Bearer $QA" -H 'Content-Type: application/json' -d '{"currency":"INR"}' localhost:3001/api/v1/admin/taxi/config/IN    # 403
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "localhost:3001/api/v1/admin/taxi/rates?countryCode=IN"   # 403
curl -s -H "Authorization: Bearer $QA" "localhost:3001/api/v1/admin/taxi/drivers" | node -pe 'JSON.stringify([...new Set(JSON.parse(require("fs").readFileSync(0)).data.map(d=>d.countryCode))])'   # ["QA"] or []
```

- [ ] **Step 7: Commit (gateway, then module)**

```bash
git add apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.spec.ts
git commit -m "fix(gateway): taxi administration confined to the caller's market; suspend reaches its handler" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add modules/taxi/backend/src
git commit -m "fix(taxi): admin handlers assert the driver, vendor, document, payout and configuration market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6 (A6): Grocery administration is market-scoped through the store

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/admin-grocery.controller.ts` (all 22 handlers)
- Modify: `modules/grocery/backend/src/admin/admin.service.ts` (`listStores`, `getStoreDetail`, `setStoreStatus`, `listOrders`, `listDeliveryZones`, `createDeliveryZone`, `updateDeliveryZone`, `deleteDeliveryZone`, `listFlashDeals`, `getDashboard`, `getReports`, `updateSettings`)
- Modify: the grocery TCP controller admin handlers (lines ~715-790 of `modules/grocery/backend/src/grocery.controller.ts`)
- Create: `modules/grocery/backend/src/admin/admin-scope.spec.ts`

**Interfaces:**

- Payloads gain `scope?: string`; `listStores(opts & { regionCode? })`, `listOrders(opts & { regionCode? })`, `listFlashDeals(opts & { regionCode? })`, `getStoreDetail(id, scope?)`, `setStoreStatus(id, status, reason?, actorId?, scope?)`, `createDeliveryZone(body, scope?)`, `updateDeliveryZone(id, body, scope?)`, `deleteDeliveryZone(id, scope?)`, `getDashboard(scope?)`, `getReports(period, scope?)`, `updateSettings(body, actorId?, scope?)`.

- [ ] **Step 1: Write the failing backend spec**

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { GroceryAdminService } from './admin.service';

function qbRecorder(rows: any[] = []) {
  const where: string[] = [];
  const qb: any = {
    leftJoinAndSelect: () => qb,
    innerJoin: () => qb,
    andWhere: (s: string) => {
      where.push(s);
      return qb;
    },
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () => [rows, rows.length],
  };
  return { qb, where };
}

describe('GroceryAdminService market scope', () => {
  it('filters stores by the scoped market', async () => {
    const { qb, where } = qbRecorder();
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    Object.assign(svc, { storeRepo: { createQueryBuilder: () => qb } });
    await svc.listStores({ regionCode: 'QA' });
    expect(where).toContain('s.regionCode = :regionCode');
  });

  it("filters orders through the store's market", async () => {
    const { qb, where } = qbRecorder();
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    Object.assign(svc, { orderRepo: { createQueryBuilder: () => qb } });
    await svc.listOrders({ regionCode: 'QA' });
    expect(where).toContain('store.regionCode = :regionCode');
  });

  it('refuses to change the status of a store in another market', async () => {
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    const storeRepo = {
      findOne: vi.fn(async () => ({ id: 'st-in', regionCode: 'IN', status: 'PENDING_KYC' })),
      save: vi.fn(),
    };
    Object.assign(svc, { storeRepo, logger: { warn: vi.fn(), log: vi.fn() } });
    await expect(
      svc.setStoreStatus('st-in', 'APPROVED', undefined, 'admin-qa', 'QA'),
    ).rejects.toThrow(ForbiddenException);
    expect(storeRepo.save).not.toHaveBeenCalled();
  });
});
```

Confirm the class name and repo property names with `grep -n "class \|Repo:" modules/grocery/backend/src/admin/admin.service.ts` before running.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Enforce in the backend**

`listStores`: accept `regionCode?: string` in `opts`; after `createQueryBuilder('s')` add `if (opts.regionCode) qb.andWhere('s.regionCode = :regionCode', { regionCode: opts.regionCode.toUpperCase() });`
`listOrders`: same option; after the join add `if (opts.regionCode) qb.andWhere('store.regionCode = :regionCode', { regionCode: opts.regionCode.toUpperCase() });`
`listFlashDeals`: add `.leftJoin('d.store', 'store')` (confirm the relation name on the flash-deal entity) and the same predicate.
`getStoreDetail(id, scope?)` and `setStoreStatus(id, status, reason?, actorId?, scope?)`: after loading the store, `assertInMarket(store.regionCode, scope, 'store', this.logger)`.
`createDeliveryZone(body, scope?)`: `if (scope) body.regionCode = scope;` then save; `updateDeliveryZone(id, body, scope?)` and `deleteDeliveryZone(id, scope?)`: load the zone, `assertInMarket(zone.regionCode, scope, 'delivery zone', this.logger)`.
`getDashboard(scope?)` and `getReports(period, scope?)`: every store/order/product count and sum in those two methods gains the predicate — for store queries `s.regionCode = :scope`, for order queries a join to `store` and `store.regionCode = :scope`, for product queries a join to the product's store. Read both bodies (lines 47-100 and 281-346) and add the predicate to each `createQueryBuilder`/`count`/`find` call; a `count({ where })` becomes `count({ where: { ...where, regionCode: scope } })` for stores and a query-builder join for orders/products.
`updateSettings(body, actorId?, scope?)`: settings are global — `if (scope) throw new ForbiddenException('Grocery settings are managed globally.');` `getSettings` stays readable.

TCP handlers: pass `d?.scope` through (`listStores({ ...d, regionCode: d?.scope ?? d?.regionCode })`, `setStoreStatus(id, 'APPROVED', d?.reason, d?.actorId, d?.scope)`, etc.).

- [ ] **Step 4: Scope the gateway controller**

Same mechanics as A5: add `@Req() req`, the `scopeOf` helper, `@Query('regionCode') regionCode?` on lists, and send `{ ..., regionCode: market, scope, actorId: this.actorId(req) }`. Two examples; apply to all 22:

```ts
  @Get('stores')
  @ApiQuery({ name: 'regionCode', required: false })
  getStores(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string, @Query('search') search?: string, @Query('regionCode') regionCode?: string) {
    const { scope, market } = this.scopeOf(req, regionCode, 'those stores');
    return this.send('admin.grocery.stores', { page: +page, limit: +limit, status, search, regionCode: market, scope });
  }

  @Patch('stores/:id/approve')
  approveStore(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: { reason?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that store');
    return this.send('admin.grocery.approve', { id, reason: dto?.reason, actorId: this.actorId(req), scope });
  }
```

`GET categories` and `GET flash-deals` reads may be listed under `@GlobalEntity` only if the grocery category entity is declared global — it carries a market column (`grocery-category` has one), so it is **scoped**, not global.

- [ ] **Step 5: Specs, build, live probe, commit**

Run the backend spec → 3 passed; `npx nest build --all` → 0; grocery backend build → 0. Probe: as `$QA`, `PATCH /admin/grocery/stores/<IN store>/suspend` → 403; `GET /admin/grocery/orders` → every `store.regionCode` is `QA`.

```bash
git add apps/api/apps/api-gateway/src/controllers/admin-grocery.controller.ts
git commit -m "fix(gateway): grocery administration confined to the caller's market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add modules/grocery/backend/src
git commit -m "fix(grocery): admin lists and decisions scoped through the store's market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7 (A7): Hotel, restaurant, pharmacy and doctor — the routes that have handlers are scoped

**Files:**

- Modify: `admin-hotel.controller.ts`, `admin-restaurant.controller.ts`, `admin-pharmacy.controller.ts`, `admin-doctor.controller.ts`
- Modify: `modules/hotel/backend/src/admin/admin.controller.ts` (+ the service it calls); the restaurant/pharmacy/doctor admin handlers found by `grep -rn "admin" modules/<m>/backend/src/*.controller.ts`
- Create: one spec per gateway controller, `admin-<module>.controller.spec.ts`, with the same three cases as A5's first test (locked list confined, other market refused, global passes filter)

- [ ] **Step 1: Gateway** — every handler gets `@Req() req`, `scopeOf`, `countryCode: market, scope, actorId`. Commands that still have no backend handler (audit §4.1) keep answering 503 — the payload shape is settled now so Plan C handlers are scoped from their first line.
- [ ] **Step 2: Backends** — hotel `admin_list_hotels` filters `h.countryCode = :scope`; `admin_approve_hotel`/`admin_suspend_hotel`/`admin.hotel.approve`/`admin.hotel.suspend` load the hotel and `assertInMarket(hotel.countryCode, d.scope, 'hotel', this.logger)`; `admin_hotel_stats`, `admin_fraud_flags`, `admin_compliance`, `admin_revenue`, `admin_onboarding` add the predicate to their hotel-joined queries. Restaurant (4 handlers), pharmacy (3), doctor (3): list → predicate on the entity's market column (`restaurant.country`/`countryCode`, `pharmacy_store.country`/`countryCode`, `clinic.country`/`countryCode` — read the entity to pick the actual property), record → assert. The market column names to use: `grep -n -iE "country|region" modules/<m>/backend/src/entities/<entity>.entity.ts`.
- [ ] **Step 3: Specs green, `nest build --all` 0, one commit per controller/backend pair.**

---

### Task 8 (A8): Regression spec — every `/admin` route is market-scoped or declared global with a reason

**Files:**

- Create: `apps/api/apps/api-gateway/src/decorators/global-entity.decorator.ts`
- Create: `apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts`

**Interfaces:**

- `GlobalEntity(reason: string)` — `SetMetadata('admin:global-entity', reason)`; documentation + parser marker only.

- [ ] **Step 1: The decorator**

```ts
import { SetMetadata } from '@nestjs/common';

export const GLOBAL_ENTITY_KEY = 'admin:global-entity';

/**
 * Marks an admin route as deliberately market-free — catalogue taxonomy, static
 * pages, platform health. The market-scope regression spec allows only routes
 * that either resolve a market or carry this marker with a reason a reviewer
 * can read. A locked admin may still only READ a global entity; writes must
 * refuse `marketScopeOf(req).locked` themselves.
 */
export const GlobalEntity = (reason: string) => SetMetadata(GLOBAL_ENTITY_KEY, reason);
```

- [ ] **Step 2: The spec**

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CONTROLLERS = path.join(__dirname, '..', 'controllers');
const HTTP = /^\s*@(Get|Post|Put|Patch|Delete|All)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?\s*\)/;
const SCOPED = /resolveMarket\(|marketScopeOf\(|assertRecordInScope\(|this\.scopeOf\(/;
const GLOBAL = /@GlobalEntity\(/;

/**
 * Routes that are market-free by nature. Anything else under /admin must
 * resolve a market in its handler body. Add here only with a reason.
 */
const GLOBAL_ROUTES: Array<[RegExp, string]> = [
  [/^\/admin\/security\//, 'DDoS board is per gateway, not per market'],
  [/^\/admin\/platform\/health$/, 'service liveness'],
  [
    /^\/admin\/layouts\//,
    'page layouts are per module page, not per market (Plan E may scope them)',
  ],
  [
    /^\/admin\/seo/,
    'SEO overrides are per path; market-specific paths carry their market in the path',
  ],
  [/^\/admin\/marketplace\/system-health$/, 'service liveness'],
];

interface AdminRoute {
  file: string;
  verb: string;
  path: string;
  scoped: boolean;
  global: boolean;
}

function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function collect(): AdminRoute[] {
  const out: AdminRoute[] = [];
  for (const file of fs
    .readdirSync(CONTROLLERS)
    .filter((f) => /^(admin-.*|ddos-admin)\.controller\.ts$/.test(f))) {
    const src = stripComments(fs.readFileSync(path.join(CONTROLLERS, file), 'utf8')).split('\n');
    const base = (src.join('\n').match(/@Controller\(\s*['"`]([^'"`]*)['"`]/) || [])[1] ?? '';
    const routeLines = src.map((l, i) => ({ l, i })).filter(({ l }) => HTTP.test(l));
    routeLines.forEach(({ l, i }, idx) => {
      const m = l.match(HTTP)!;
      const end = idx + 1 < routeLines.length ? routeLines[idx + 1].i : src.length;
      // decorator block above + handler body until the next route decorator
      let a = i;
      while (a > 0 && /^\s*(@|\)|\*|\/\/)/.test(src[a - 1])) a--;
      const block = src.slice(a, end).join('\n');
      const sub = m[2] ?? m[3] ?? m[4] ?? '';
      out.push({
        file,
        verb: m[1].toUpperCase(),
        path: ('/' + base + (sub ? '/' + sub : '')).replace(/\/+/g, '/'),
        scoped: SCOPED.test(block),
        global: GLOBAL.test(block),
      });
    });
  }
  return out;
}

describe('admin market scope regression', () => {
  const routes = collect();

  it('parses every admin controller', () => {
    expect(routes.length).toBeGreaterThan(300);
  });

  it('resolves a market on every /admin route that is not declared global', () => {
    const offenders = routes.filter(
      (r) => !r.scoped && !r.global && !GLOBAL_ROUTES.some(([re]) => re.test(r.path)),
    );
    const report = offenders.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
    expect(report).toBe('');
  });

  it('allows @GlobalEntity on reads only — a write to a global entity must refuse locked admins itself', () => {
    // A locked admin may read taxonomy; a write must call marketScopeOf(req)
    // and refuse. Writes therefore may not carry the marker at all: the SCOPED
    // regex above is what proves they looked at the caller's scope.
    const offenders = routes.filter((r) => r.global && r.verb !== 'GET');
    const report = offenders.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
    expect(report).toBe('');
  });
});
```

- [ ] **Step 3: Run it.** Expected after A1–A7: PASS. Before them it lists every unscoped route — which is the point. If it still lists routes, those are the ones A3–A7 missed: fix them, do not extend `GLOBAL_ROUTES` without a reason a reviewer accepts.

- [ ] **Step 4: Commit**

```bash
git add apps/api/apps/api-gateway/src/decorators/global-entity.decorator.ts apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts
git commit -m "test(gateway): every admin route resolves a market or declares itself global with a reason" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9 (A9): Live authorization proof across users, sellers, products, taxi and grocery

**Files:**

- Create: `apps/api/scripts/verification/admin-scope-authz.mjs`
- Modify: `apps/api/package.json` — add `"verify:admin-scope": "node scripts/verification/admin-scope-authz.mjs"`

- [ ] **Step 1: The script**

```js
// Live proof that a regional admin is confined on the admin API. Run with the
// fleet up: `npm run verify:admin-scope` from apps/api. Every request carries a
// bearer so DEV_AUTH_BYPASS never applies.
const BASE = process.env.API_BASE ?? 'http://localhost:3001/api/v1';
const ACCOUNTS = {
  qa: { email: 'qa-admin@kartseek.com', password: 'AdminPass123!' },
  in: { email: 'india-admin@kartseek.com', password: 'AdminPass123!' },
  global: {
    email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@kartseek.com',
    password: process.env.SUPER_ADMIN_PASSWORD ?? 'AdminPass123!',
  },
};
let pass = 0,
  fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
};

async function login({ email, password }) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.accessToken)
    throw new Error(`login failed for ${email}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.accessToken;
}
async function call(token, method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await r.json();
  } catch {}
  return { status: r.status, json };
}
const rows = (j) => j?.data?.data ?? j?.data ?? [];

(async () => {
  const qa = await login(ACCOUNTS.qa),
    ind = await login(ACCOUNTS.in),
    g = await login(ACCOUNTS.global);

  console.log('users');
  ok(
    'QA admin refused IN users by query',
    (await call(qa, 'GET', '/admin/users?country=IN')).status === 403,
  );
  const qaUsers = await call(qa, 'GET', '/admin/users?limit=50');
  ok(
    'QA admin sees only QA users',
    qaUsers.status === 200 &&
      rows(qaUsers.json).every((u) => (u.country ?? 'QA').toUpperCase() === 'QA'),
  );
  const inUsers = await call(g, 'GET', '/admin/users?country=IN&limit=1');
  const inUser = rows(inUsers.json)[0];
  if (inUser)
    ok(
      'QA admin cannot ban an IN user',
      (await call(qa, 'PUT', `/admin/users/${inUser.id}/ban`, { reason: 'probe' })).status === 403,
    );

  console.log('marketplace sellers / products');
  ok(
    'QA admin refused IN sellers by query',
    (await call(qa, 'GET', '/admin/marketplace/sellers?country=IN')).status === 403,
  );
  const qaSellers = await call(qa, 'GET', '/admin/marketplace/sellers?limit=50');
  ok(
    'QA admin sees only QA sellers',
    qaSellers.status === 200 &&
      rows(qaSellers.json).every((s) => (s.regionCode ?? s.region_code) === 'QA'),
  );
  const inSeller = rows(
    (await call(g, 'GET', '/admin/marketplace/sellers?country=IN&limit=1')).json,
  )[0];
  if (inSeller) {
    const before = (await call(g, 'GET', `/admin/marketplace/sellers/${inSeller.id}`)).json;
    ok(
      'QA admin refused IN seller detail',
      (await call(qa, 'GET', `/admin/marketplace/sellers/${inSeller.id}`)).status === 403,
    );
    ok(
      'QA admin refused approving an IN seller',
      (await call(qa, 'PATCH', `/admin/marketplace/sellers/${inSeller.id}/approve`)).status === 403,
    );
    const after = (await call(g, 'GET', `/admin/marketplace/sellers/${inSeller.id}`)).json;
    ok(
      'IN seller unchanged after refused approve',
      JSON.stringify(before?.data?.verificationStatus) ===
        JSON.stringify(after?.data?.verificationStatus),
    );
    ok(
      'IN admin may read their own seller',
      (await call(ind, 'GET', `/admin/marketplace/sellers/${inSeller.id}`)).status === 200,
    );
  }
  const p2 = await call(g, 'GET', '/admin/marketplace/products?page=2&limit=5');
  ok(
    'global admin product list honours page and limit',
    p2.json?.page === 2 && p2.json?.limit === 5,
  );
  ok(
    'QA admin refused IN pending products',
    (await call(qa, 'GET', '/admin/marketplace/products/pending?country=IN')).status === 403,
  );

  console.log('taxi');
  ok(
    'QA admin refused IN rate cards',
    (await call(qa, 'GET', '/admin/taxi/rates?countryCode=IN')).status === 403,
  );
  ok(
    'QA admin refused writing IN config',
    (await call(qa, 'PUT', '/admin/taxi/config/IN', { currency: 'INR' })).status === 403,
  );
  ok(
    'QA admin refused IN drivers by query',
    (await call(qa, 'GET', '/admin/taxi/drivers?countryCode=IN')).status === 403,
  );
  const qaDrivers = await call(qa, 'GET', '/admin/taxi/drivers');
  ok(
    'QA admin sees only QA drivers',
    qaDrivers.status === 200 && rows(qaDrivers.json).every((d) => d.countryCode === 'QA'),
  );
  ok(
    'global admin may read IN rate cards',
    (await call(g, 'GET', '/admin/taxi/rates?countryCode=IN')).status === 200,
  );

  console.log('grocery');
  ok(
    'QA admin refused IN stores by query',
    (await call(qa, 'GET', '/admin/grocery/stores?regionCode=IN')).status === 403,
  );
  const inStore = rows(
    (await call(g, 'GET', '/admin/grocery/stores?regionCode=IN&limit=1')).json,
  )[0];
  if (inStore)
    ok(
      'QA admin refused suspending an IN store',
      (await call(qa, 'PATCH', `/admin/grocery/stores/${inStore.id}/suspend`, { reason: 'probe' }))
        .status === 403,
    );
  const qaOrders = await call(qa, 'GET', '/admin/grocery/orders?limit=50');
  ok(
    'QA admin sees only QA grocery orders',
    qaOrders.status === 200 &&
      rows(qaOrders.json).every((o) => (o.store?.regionCode ?? 'QA') === 'QA'),
  );

  console.log('security');
  ok(
    'IN admin may read the security board (role, not market)',
    (await call(ind, 'GET', '/admin/security/status')).status === 200,
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
```

Set `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` to the seeded global admin from `apps/api/apps/api-gateway/src/services/test-seed.service.ts` (read the first entry of its account list).

- [ ] **Step 2: Run with the fleet up**

`npm run verify:admin-scope` → `N passed, 0 failed` (N ≥ 18 depending on seeded IN rows). Every ✗ is a real hole: fix it in the task that owns the route, re-run.

- [ ] **Step 3: Also re-run the existing proof** — `node scripts/verification/regional-isolation-authz.mjs` → 36/36 (promotions unchanged).

- [ ] **Step 4: Commit**

```bash
git add apps/api/scripts/verification/admin-scope-authz.mjs apps/api/package.json
git commit -m "test(api): live proof that regional admins are confined across users, sellers, products, taxi and grocery" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

- **Spec coverage.** Phase 3 (regional admin cannot view/modify another market's customers, sellers, promotions, taxes, orders, taxi operations, reports; enforced at the API/database layer): A3 users/KYC/revenue, A4 sellers/products/orders/refunds/payouts/commissions (Step 7 table), A5 taxi incl. fares/config/payouts, A6 grocery, A7 the other modules, A8 pins it for every future route, A9 proves it live. Phase 4 cache keys and events are Plan C (documented in the program); Phase 8's "test authorization directly against APIs" is A9. SEC-01 is A1; BUG-023 is A2.
- **Placeholders.** A7 names the entity fields to look up rather than inventing them; each is a one-line grep with the exact pattern. A4 Step 7 gives the field per route. No "TBD".
- **Type consistency.** `scopeOf(req, requested?, what)` returns `{ scope?, market? }` in every controller; backend signatures all take `scope?: string` as the last parameter; `assertInMarket(recordRegion, scope, what, logger?)` everywhere; command names unchanged except `admin.taxi.driver.suspend`.
