# Regional Integrity Implementation Plan (REGIONAL workstream)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Regional Admin operation respects `Country → Region → Module → Entity` at the gateway, at the service and inside the query, under **one** rule set — and every open cross-region vector in `docs/audits/2026-09-12-admin-platform-audit-2.md` §3(a) is closed and pinned by a spec that fails the build if it reopens.

**Architecture:** The claim chain is already right and is not touched: `users.region_code` + `users.region_locked` → `AuthController.issueTokens` → JWT → `JwtStrategy.validate` → `req.user`. This plan fixes the three links below it.

1. **Gateway** — `marketScopeOf` / `resolveMarket` / `assertRecordInScope` / `refuseLockedAdmin` (`apps/api/apps/api-gateway/src/guards/market-scope.ts`). Nine controllers hold a byte-identical `private scopeOf(req, requested, what)`; Task 11 collapses them onto one exported `resolveScope` while keeping the method name so the regression regex still matches. Guards that short-circuit for an admin role (`SellerOwnershipGuard`) become scope-aware rather than scope-blind (Task 1).
2. **Backend** — `assertInMarket` / `marketPredicate` / `refuseUnattributable` / `normaliseMarket` (`apps/api/libs/common/src/market/market-scope.ts`). Every private re-implementation is deleted (`fulfillment.service.ts`'s `assertCouponInMarket`/`denyMarket`, Task 2).
3. **Query** — a market predicate in the SQL, added through one `applyMarketFilter` helper (Task 11) so `qb.where` can never again replace the clause a region `andWhere` built (Task 3).

**Tech Stack:** NestJS 11 on rspack (`apps/api`), TypeORM, vitest (`npx vitest run <file>` from `apps/api` or from a module root), Jest for `apps/web`, Node 26, PostgreSQL 16 (`kartseek_db` on :5432 plus eight module databases), Redis, Kafka.

---

## Global Constraints

Copied verbatim from the mandate, and binding on every task:

> Do not use mock data. Do not leave fake buttons. Do not leave placeholder APIs. Do not rely on frontend-only permissions. Do not allow regional data leakage. Do not break existing modules while upgrading Admin. Do not mark functionality complete without testing the real workflow.

Repo rules, equally binding:

- Every admin handler calls `this.scopeOf(` (or one of `resolveMarket(` / `marketScopeOf(` / `assertRecordInScope(` / `refuseLockedAdmin(`) **or** is decorated `@GlobalEntity(reason)`. A route that is neither fails `admin-market-scope.regression.spec.ts`.
- Every admin route carries `@Roles(...)` with a `perm:` key that exists in `apps/api/libs/common/src/admin/permissions.ts`. A `perm:` key absent from `ADMIN_PERMISSIONS` is a build failure (`permissions.spec.ts`).
- Global-money routes (wallet, loyalty, payout, refund, commission) call `refuseLockedAdmin` **first**, before any other statement in the handler.
- Bodies are validated DTOs — `class-validator` classes, never interfaces (Nest skips validation when there is no metatype), with `whitelist: true` and `forbidNonWhitelisted: true`.
- `nest build --all` is the build gate, not `tsc`. Run it at the end of every task that touches `apps/api`.
- Commits: lower-case subject, ≤ 100 characters, one per task (API and web committed **separately** when a task touches both), trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Suites must stay green: `apps/api` vitest **677**, `apps/web` jest **610**, marketplace **250**, grocery **104**, hotel **25**, taxi **20**, restaurant **18**, doctor **16**, pharmacy **12**. A task that adds specs raises its own number; it never lowers another's.
- Live probes run on a **temporary** gateway on `API_GATEWAY_PORT=3099` started from `apps/api/dist` (the dev fleet on :3001 runs stale code), with real staff tokens: `POST /auth/login` → read `devCode` from the 2FA challenge → `POST /auth/mfa/verify`. `DEV_AUTH_BYPASS=true` makes an **anonymous** request SUPER_ADMIN, so every probe must send an `Authorization` header or it passes vacuously (V15).
- Accounts: `qa-admin@kartseek.com` (QA-locked), `india-admin@kartseek.com` (IN-locked), `superadmin@kartseek.com`, `admin@kartseek.com` (global ADMIN). Password for all four: `AdminPass123!`.
- Denial copy is fixed: gateway `Your account is restricted to the <SCOPE> market; <what> belongs to <TARGET>.`; backend `This <what> belongs to <OWNER>, not to the <SCOPE> market.`; unattributable `This <what> cannot be attributed to a market yet.` Every denial logs the `[region-scope-denied]` prefix.
- Branch: `feat/admin-platform-upgrade`.

---

## Interfaces this plan publishes

Later plans consume these; they are the contract, not a suggestion.

**`apps/api/apps/api-gateway/src/guards/market-scope.ts`** (Task 11 adds the first, Task 1 the second):

```ts
/** The one implementation behind every controller's `private scopeOf`. */
export function resolveScope(
  req: any,
  requested?: string | null,
  what?: string,
): { scope?: string; market?: string };

/** Resolve a seller's market over TCP (cached) — used by SellerOwnershipGuard. */
export interface SellerScopeLookup {
  resolveSellerMarket(sellerId: string): Promise<string | null>;
}
```

**`apps/api/libs/common/src/market/market-scope.ts`** (Task 11):

```ts
/**
 * Add the market predicate to a list query. `expression` names the column in
 * the query's own vocabulary (`'s.regionCode'`, `'o.region_code'`). Returns the
 * builder so it chains. Always `andWhere` — never `where` (AUD2-006).
 */
export function applyMarketFilter<T extends { andWhere(e: string, p?: object): T }>(
  qb: T,
  expression: string,
  scope: string | undefined,
  requested?: string | null,
): T;

/**
 * Load-then-assert in one call, for handlers that already have the row.
 * Equivalent to `assertInMarket(row[column], scope, what, logger)` but refuses
 * a missing row with NotFound first, so "no such id" and "not your market"
 * stay distinguishable.
 */
export function assertRecordMarket<T>(
  row: T | null | undefined,
  column: keyof T,
  scope: string | undefined,
  what: string,
  logger?: { warn(m: string): void },
): asserts row is T;
```

**Route behaviours later plans may rely on** (all as a region-locked ADMIN):

| Route                                                                           | Behaviour after this plan                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET /sellers/:sellerId/*` (111 routes)                                         | 403 when the seller's `regionCode` is not the caller's market; 200 when it is (Task 1) |
| `PUT /marketplace/returns/:id/status`                                           | 403 cross-market; the decision still writes for an in-market return (Task 2)           |
| `PUT/DELETE/POST /marketplace/variants*`                                        | 403 cross-market via the owning seller's `regionCode` (Task 2)                         |
| `POST/PUT/DELETE /admin/marketplace/coupons*`                                   | new admin twin of the seller coupon routes, `this.scopeOf(` + `scope` (Task 2)         |
| `GET /admin/marketplace/bank-offers?activeOnly=true`                            | market predicate survives the status filter (Task 3)                                   |
| `GET /admin/users`, `PUT /admin/users/:id/ban`                                  | scoped on `users.region_code`, not `users.country` (Task 4)                            |
| `/grocery/admin/*`, `/pharmacy/admin/*`                                         | carry `scope`; their backends assert (Task 5)                                          |
| `/restaurants/admin/*` (30 routes)                                              | **gone** — `/admin/restaurant/*` is the only admin surface (Task 5)                    |
| `/payments/admin/*` (6 routes)                                                  | `countryCode: market` forwarded and predicated (Task 6)                                |
| `GET /franchise/:id/*`                                                          | 403 for a non-owner; staff additionally market-checked (Task 6)                        |
| `PUT /admin/static-pages/:slug`, `PUT /admin/layouts/:m/:p`, `POST /admin/seo*` | `refuseLockedAdmin` + validated DTO (Task 7)                                           |
| `GET /admin/marketplace/analytics/*` (10)                                       | 200 with market-predicated figures, no longer 403 (Task 9)                             |
| `GET /admin/reports/revenue`                                                    | 200 with `orders.region_code` predicate, no longer 501 (Task 9)                        |
| `GET /admin/hotel/stats`, `/revenue`                                            | 200 predicated through `hotel_bookings.hotelCountryCode` / `hotels→reviews` (Task 9)   |
| `GET /admin/staff?regionCode=`                                                  | a locked admin sees and edits staff whose `regionCode` equals their own (Task 12)      |

**For the MODULES plan:** every new admin handler takes `scope?: string` as its **last** parameter and calls `applyMarketFilter` (lists) or `assertRecordMarket` (single row) or `refuseUnattributable` (no column, no join). No new private refusal helper is permitted — Task 2 deletes the last one.

**For the TESTS plan:** §13's matrix scripts against the routes above. Rows X-03/04/05/55 (V1), X-07 (V6), X-10 (V4), X-12/39 (V7), X-15 (V2), X-19 (V3), X-21 (V14), X-24 (V8), X-36 (V5), X-41 (V9), X-46/47 (V12), X-54 (V10) flip from FAIL to PASS in tasks 1–7; X-26 and QA-15/16/17 flip from "403 fail-closed" to "200 QA-only" in Task 9. Rows X-34 (V11, module HTTP surfaces) and X-28/29/33/37/42/45 (missing handlers) stay as they are — they belong to the MODULES plan.

---

## File structure

| File                                                                                                                                                        | Responsibility                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `apps/api/apps/api-gateway/src/guards/seller-ownership.guard.ts`                                                                                            | market check after the admin short-circuit (T1)                                   |
| `apps/api/apps/api-gateway/src/guards/seller-ownership.guard.spec.ts` (new)                                                                                 | pins T1                                                                           |
| `modules/marketplace/backend/src/seller/seller.service.ts`                                                                                                  | `getSellerOwner` also returns `regionCode` (T1)                                   |
| `apps/api/apps/api-gateway/src/controllers/marketplace.controller.ts`                                                                                       | `private scopeOf`; `scope` on returns, variants, logistics, reports (T2, T6)      |
| `modules/marketplace/backend/src/fulfillment/fulfillment.service.ts`                                                                                        | `sellerMarket()`; variant asserts; private refusal helpers deleted (T2)           |
| `modules/marketplace/backend/src/admin/admin.service.ts`                                                                                                    | `qb.where` → `qb.andWhere`; analytics and campaign predicates (T3, T9)            |
| `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts`                                                                                 | banner delete assert; admin coupon routes; taxonomy aliases (T2, T3, T6)          |
| `apps/api/apps/admin-service/src/admin.service.ts`                                                                                                          | users on `region_code`; counters per market; revenue report (T4, T9)              |
| `apps/api/migrations/1786501900000-UserMarketBackfill.ts` (new)                                                                                             | `users.region_code` backfill + index (T4)                                         |
| `apps/api/migrations/1786502000000-MoneyPathMarket.ts` (new)                                                                                                | `region_code` on `payout.payouts`, `refund.*`, `payment.settlement_records` (T11) |
| `apps/api/apps/api-gateway/src/controllers/grocery.controller.ts`, `pharmacy.controller.ts`                                                                 | `scope` on every admin duplicate (T5)                                             |
| `apps/api/apps/api-gateway/src/controllers/restaurant.controller.ts`                                                                                        | 30 admin routes deleted (T5)                                                      |
| `modules/restaurant/backend/src/restaurant.service.ts`                                                                                                      | one market match, prefix-normalised (T5)                                          |
| `modules/pharmacy/backend/src/pharmacy.service.ts`                                                                                                          | first `assertInMarket` in the module (T5)                                         |
| `apps/api/apps/api-gateway/src/controllers/payment.controller.ts`, `franchise.controller.ts`                                                                | scope + tenancy (T6)                                                              |
| `apps/api/apps/api-gateway/src/controllers/static-pages.controller.ts`, `admin-layout.controller.ts`, `admin-seo.controller.ts`, `ddos-admin.controller.ts` | `refuseLockedAdmin` + DTOs (T7)                                                   |
| `apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts`                                                                                | collector widened to every controller declaring an admin role (T8)                |
| `modules/marketplace/backend/src/analytics/analytics.service.ts`                                                                                            | ten reads take a market (T9)                                                      |
| `modules/hotel/backend/src/hotel.service.ts`                                                                                                                | stats/revenue predicated (T9)                                                     |
| `modules/grocery/backend/src/grocery.service.ts`                                                                                                            | per-market category purges (T10)                                                  |
| `modules/taxi/backend/src/services/h3-zone.ts` (new)                                                                                                        | the shared cell derivation (T10)                                                  |
| `apps/api/apps/search-service/src/search.service.ts`                                                                                                        | country check in the ES-down fallback (T10)                                       |
| `apps/api/apps/api-gateway/src/controllers/admin-access.controller.ts`                                                                                      | staff per market; market-lock end state (T12)                                     |
| `packages/shared-core/src/hooks/useMarketplaceRegionFilter.ts` + admin API clients                                                                          | every admin fetch names a market (T12)                                            |
| `apps/api/scripts/verification/regional-integrity.mjs` (new)                                                                                                | the live proof for tasks 1–9                                                      |

---

### Task 1 (R1): `SellerOwnershipGuard` checks the market, closing 111 seller-portal routes in one edit

**Closes: AUD2-004** (V1 / E F-01; §13 rows X-03, X-04, X-05, X-55)

**Files:**

- Modify: `modules/marketplace/backend/src/seller/seller.service.ts:309-316` (`getSellerOwner`)
- Modify: `apps/api/apps/api-gateway/src/guards/seller-ownership.guard.ts:38-127`
- Create: `apps/api/apps/api-gateway/src/guards/seller-ownership.guard.spec.ts`

**Interfaces:**

- Consumes: `assertRecordInScope`, `marketScopeOf` (`./market-scope`).
- Produces: RPC `get_seller_owner` answers `{ sellerId, ownerId: string | null, regionCode: string | null }`. The third field is new and additive; `public-sellers.controller.ts:166` and `admin-marketplace.controller.ts:250` read only `ownerId` and are unaffected.
- Produces: the guard's Redis entry changes shape from a bare owner id to `"<ownerId>|<regionCode>"` under a new key prefix `seller-scope:v2:` — a warm `seller-owner:<id>` from the old build can never be misread as the new shape.

- [ ] **Step 1: Write the failing spec**

Create `apps/api/apps/api-gateway/src/guards/seller-ownership.guard.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { SellerOwnershipGuard } from './seller-ownership.guard';

const ctx = (user: any, sellerId = 'seller-in') =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params: { sellerId },
        method: 'GET',
        originalUrl: `/api/v1/sellers/${sellerId}/orders`,
        headers: {},
      }),
    }),
  }) as any;

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const owner = { id: 'owner-1', role: 'SELLER' };

function build(row: { ownerId: string | null; regionCode: string | null }) {
  const client = { send: vi.fn(() => of({ sellerId: 'seller-in', ...row })) };
  const redis = { get: vi.fn(async () => null), set: vi.fn(async () => undefined) };
  return { guard: new SellerOwnershipGuard(client as any, redis as any), client, redis };
}

describe('SellerOwnershipGuard market scope', () => {
  let sub: ReturnType<typeof build>;
  beforeEach(() => {
    sub = build({ ownerId: 'owner-1', regionCode: 'IN' });
  });

  it('refuses a QA-locked admin reaching an IN seller', async () => {
    await expect(sub.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(ForbiddenException);
    await expect(sub.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(
      'Your account is restricted to the QA market; this seller belongs to IN.',
    );
  });

  it('admits a QA-locked admin reaching a QA seller — the control that stops "403 everywhere" passing', async () => {
    const qa = build({ ownerId: 'owner-1', regionCode: 'QA' });
    await expect(qa.guard.canActivate(ctx(qaAdmin))).resolves.toBe(true);
  });

  it('refuses a locked admin on a seller with no market — nobody owns it regionally', async () => {
    const none = build({ ownerId: 'owner-1', regionCode: null });
    await expect(none.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(
      'this seller belongs to every market',
    );
  });

  it('admits a global admin anywhere, and does not pay for a lookup', async () => {
    await expect(sub.guard.canActivate(ctx(globalAdmin))).resolves.toBe(true);
    expect(sub.client.send).not.toHaveBeenCalled();
  });

  it('still admits the owning seller and still refuses one who does not own it', async () => {
    await expect(sub.guard.canActivate(ctx(owner))).resolves.toBe(true);
    await expect(sub.guard.canActivate(ctx({ id: 'other', role: 'SELLER' }))).rejects.toThrow(
      'You do not have access to this seller account.',
    );
  });

  it('fails closed when the lookup throws — an outage is not an authorisation bypass', async () => {
    const broken = build({ ownerId: 'owner-1', regionCode: 'QA' });
    broken.client.send = vi.fn(() => {
      throw new Error('marketplace down');
    });
    await expect(broken.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(ForbiddenException);
  });

  it('caches the market alongside the owner under a versioned key', async () => {
    await sub.guard.canActivate(ctx(owner));
    expect(sub.redis.set).toHaveBeenCalledWith('seller-scope:v2:seller-in', 'owner-1|IN', 60);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

From `apps/api`: `npx vitest run apps/api-gateway/src/guards/seller-ownership.guard.spec.ts`

Expected: FAIL — `1`, `2`, `3` fail because `canActivate` returns `true` at `seller-ownership.guard.ts:64` before any market check (so the refusals resolve instead of rejecting); `7` fails because the key is `seller-owner:seller-in` and the value is `'owner-1'`.

- [ ] **Step 3: Return the seller's market from the ownership lookup**

In `modules/marketplace/backend/src/seller/seller.service.ts`, replace `getSellerOwner` (lines 309-316) with:

```ts
  /**
   * The owner and the market of one seller, for the gateway's
   * SellerOwnershipGuard.
   *
   * `regionCode` is here because the guard short-circuits for any ADMIN role
   * and had nothing to check a market against: a QA-locked admin could read and
   * write an Indian seller's orders, wallet, bank accounts, staff and products
   * across 111 routes. Read-only, no PII.
   */
  async getSellerOwner(
    sellerId: string,
  ): Promise<{ sellerId: string; ownerId: string | null; regionCode: string | null }> {
    if (!sellerId) return { sellerId, ownerId: null, regionCode: null };
    const seller = await this.sellerRepo.findOne({
      where: { id: sellerId },
      select: ['id', 'ownerId', 'regionCode'],
    });
    return {
      sellerId,
      ownerId: seller?.ownerId ?? null,
      regionCode: seller?.regionCode ?? null,
    };
  }
```

- [ ] **Step 4: Make the guard market-aware**

In `apps/api/apps/api-gateway/src/guards/seller-ownership.guard.ts` add to the import block:

```ts
import { assertRecordInScope, marketScopeOf } from './market-scope';
```

Replace the closing paragraph of the class docstring (lines 38-41):

```ts
 * Fail-closed throughout: an unknown seller, a seller with no `owner_id`, a
 * seller with no `region_code` reached by a region-locked admin, or an
 * unreachable lookup all deny. A 403 (never 404) is returned for a non-owner so
 * seller ids cannot be probed for existence.
```

Replace the constants and `canActivate` (lines 46-83) with:

```ts
  private static readonly LOOKUP_TIMEOUT_MS = 3000;
  private static readonly CACHE_TTL_SECONDS = 60;
  /**
   * v2 because the cached value gained the market. A warm v1 entry holds a bare
   * owner id, which the v2 parser would read as `regionCode = null` — a locked
   * admin refused on a seller that is in fact theirs. A new key namespace lets
   * the two builds run side by side through a rollout.
   */
  private static readonly CACHE_PREFIX = 'seller-scope:v2:';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('You must be logged in to access seller resources.');
    }

    const sellerId = this.extractSellerId(request);
    // No seller in the path — nothing object-level to authorise here.
    if (!sellerId) return true;

    // An admin skips the OWNERSHIP test — support and moderation act on
    // accounts they do not own — but never the MARKET test. This used to be a
    // bare `return true`, which is what opened all 111 `/sellers/:sellerId/*`
    // routes to a region-locked admin from every other market (audit V1).
    // A global admin is not locked, so the lookup is paid for only when its
    // answer can change the outcome.
    if (ADMIN_ROLES.has(String(user.role ?? '').toUpperCase())) {
      if (!marketScopeOf(request).locked) return true;
      const { regionCode } = await this.resolveSeller(sellerId);
      assertRecordInScope(request, regionCode, 'this seller');
      return true;
    }

    const userId = user.id ?? user.userId ?? user.sub;
    if (!userId) {
      throw new ForbiddenException('You do not have access to this seller account.');
    }

    const { ownerId } = await this.resolveSeller(sellerId);
    if (ownerId && ownerId === userId) return true;

    this.logger.warn(
      `Blocked seller access: user=${userId} role=${user.role} seller=${sellerId}` +
        (ownerId ? '' : ' (no owner_id on record — unknown seller or needs backfill)'),
    );
    throw new ForbiddenException('You do not have access to this seller account.');
  }
```

Replace `resolveOwner` (lines 93-127) with:

```ts
  /**
   * The owning user and the market of a seller, or nulls when unknown.
   *
   * Nulls deny in both directions: an unresolvable owner denies a seller, and an
   * unresolvable market denies a locked admin (`assertRecordInScope` refuses a
   * `null` region). A failed lookup is neither cached nor retried into a pass —
   * a marketplace-service outage must not become an authorisation bypass.
   */
  private async resolveSeller(
    sellerId: string,
  ): Promise<{ ownerId: string | null; regionCode: string | null }> {
    const cacheKey = `${SellerOwnershipGuard.CACHE_PREFIX}${sellerId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        const [o, r] = String(cached).split('|');
        return { ownerId: o || null, regionCode: r || null };
      }
    } catch {
      // Cache miss or Redis down — fall through to the authoritative lookup.
    }

    let row: { ownerId: string | null; regionCode: string | null };
    try {
      const res = await firstValueFrom(
        this.sellerClient
          .send<{ sellerId: string; ownerId: string | null; regionCode: string | null }>(
            { cmd: 'get_seller_owner' },
            { sellerId },
          )
          .pipe(timeout(SellerOwnershipGuard.LOOKUP_TIMEOUT_MS)),
      );
      row = { ownerId: res?.ownerId ?? null, regionCode: res?.regionCode ?? null };
    } catch (e) {
      this.logger.error(`Ownership lookup failed for seller=${sellerId}: ${(e as Error).message}`);
      return { ownerId: null, regionCode: null };
    }

    try {
      await this.redis.set(
        cacheKey,
        `${row.ownerId ?? ''}|${row.regionCode ?? ''}`,
        SellerOwnershipGuard.CACHE_TTL_SECONDS,
      );
    } catch {
      // Caching is best-effort.
    }

    return row;
  }
```

- [ ] **Step 5: Run the spec, the module suite and the build**

From `apps/api`: `npx vitest run apps/api-gateway/src/guards/seller-ownership.guard.spec.ts` → **7 passed**.
From `modules/marketplace`: `npx vitest run` → **250 passed** (the extra field on `getSellerOwner` breaks nothing).
From `apps/api`: `npx vitest run` → **684 passed** (677 + 7). Then `npx nest build --all` → exit 0.

- [ ] **Step 6: Live probe on the temporary gateway**

Start the gateway once for this task and leave it up for tasks 2–9:

```bash
cd apps/api
npx nest build --all
API_GATEWAY_PORT=3099 DEV_MFA_ECHO=true DEV_AUTH_BYPASS=false node dist/apps/api-gateway/main.js > /tmp/gw3099.log 2>&1 &
export B=http://localhost:3099/api/v1
```

`apps/api/scripts/verification/regional-integrity.mjs` is created in Task 9 and carries this logic; until then, log in by hand:

```bash
tok() {
  node -e '
    const B=process.env.B, [email]=process.argv.slice(1);
    (async()=>{
      let j=await (await fetch(B+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password:"AdminPass123!"})})).json();
      if(j.requires2FA) j=await (await fetch(B+"/auth/mfa/verify",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({challengeToken:j.challengeToken,code:j.devCode})})).json();
      if(!j.accessToken) throw new Error("login failed: "+JSON.stringify(j).slice(0,200));
      console.log(j.accessToken);
    })()' "$1"
}
QA=$(tok qa-admin@kartseek.com); IN=$(tok india-admin@kartseek.com); SU=$(tok superadmin@kartseek.com)
QASELLER=$(docker exec kartseek-postgres-marketplace psql -U kartseek -d kartseek_marketplace -tAc \
  "SELECT id FROM marketplace.sellers WHERE region_code='QA' LIMIT 1")
INSELLER=$(docker exec kartseek-postgres-marketplace psql -U kartseek -d kartseek_marketplace -tAc \
  "SELECT id FROM marketplace.sellers WHERE region_code='IN' LIMIT 1")
for p in orders wallet bank-accounts reports/export; do
  printf 'QA->IN /%s: ' "$p"
  curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" "$B/sellers/$INSELLER/$p"
done
printf 'QA->QA /orders (control): '; curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" "$B/sellers/$QASELLER/orders"
printf 'SUPER->IN /orders: ';        curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $SU" "$B/sellers/$INSELLER/orders"
printf 'IN->IN /orders (control): '; curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $IN" "$B/sellers/$INSELLER/orders"
```

Expected: the four `QA->IN` lines `403` (§13 X-03, X-04, X-05, X-55); `QA->QA` `200` (§13 X-56 control); `SUPER->IN` `200`; `IN->IN` `200`. A `403` on a control line means the guard refuses everything and proves nothing — fix before committing. `grep -c 'region-scope-denied.*this seller' /tmp/gw3099.log` → `4`.

If the marketplace `sellers` table holds no `region_code='QA'` row, seed one first (`UPDATE marketplace.sellers SET region_code='QA' WHERE id=<one id>`) — an empty control is SKIPPED, never PASS (§13 X-57).

- [ ] **Step 7: Commit (API only)**

```bash
git add apps/api/apps/api-gateway/src/guards/seller-ownership.guard.ts \
        apps/api/apps/api-gateway/src/guards/seller-ownership.guard.spec.ts \
        modules/marketplace/backend/src/seller/seller.service.ts
git commit -m "fix(gateway): the admin short-circuit on the seller guard no longer skips the market check" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2 (R2): The money and catalogue writes that skipped `scope` — returns, variants, coupons — and the last private refusal helper

**Closes: AUD2-005, AUD2-007, AUD2-016, AUD2-078** (V2, V4 / E F-02, F-04, F-16; §13 rows X-10, X-15)

`marketplace.controller.ts` (the gateway's non-admin marketplace surface) carries 22 routes with `@Roles(ADMIN, SUPER_ADMIN)` and no scope helper at all. Four of them move money or stock. They forward `_actor` — which carries `regionCode` only as a courtesy — but never `scope`, so `assertInMarket(row.regionCode, undefined)` returns on its first line and a QA admin refunds an Indian return or zeroes an Indian variant's stock.

Coupons are the same story with a third spelling: `fulfillment.service.ts` re-implements the refusal privately (`assertCouponInMarket`, `denyMarket`) against `Actor.regionCode`. It happens to be correct today, which is exactly why it is dangerous: a second implementation of one rule drifts silently. This task deletes it and gives the admin console real `/admin/marketplace/coupons` write routes so the admin path and the seller path stop sharing one handler.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/marketplace.controller.ts` (add `private scopeOf`; lines 646-662 returns, 940-1002 variants, 812-840 coupons)
- Modify: `modules/marketplace/backend/src/fulfillment/fulfillment.service.ts:128-171` (delete the private helpers), `:799-861` (variant writes)
- Modify: `modules/marketplace/backend/src/marketplace.controller.ts:2431-2434, 2797-2818` (forward `scope`)
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts` (three new coupon write routes next to `@Get('coupons')` at :3000)
- Modify: `packages/shared-core/src/modules/admin-marketplace-api.ts:322,324,326` (point the admin console at the admin routes)
- Create: `modules/marketplace/backend/src/fulfillment/fulfillment-scope.spec.ts`
- Create: `apps/api/apps/api-gateway/src/controllers/marketplace-scope.spec.ts`

**Interfaces:**

- Produces on `marketplace.controller.ts` (gateway): `private scopeOf(req, requested?, what?): { scope?: string; market?: string }` — the same shape as the nine admin controllers, so Task 11's shared `resolveScope` absorbs it too and the regression regex `this.scopeOf(` matches.
- Produces RPC payload additions (all optional, all written by the gateway from the token): `update_return_status { …, scope? }` (already read), `create_variant { productId, dto, _actor, scope? }`, `update_variant { id, dto, _actor, scope? }`, `delete_variant { id, _actor, scope? }`, `update_variant_stock { id, quantity, operation, _actor, scope? }`, `create_coupon | update_coupon | delete_coupon { …, scope? }`.
- Produces service signatures: `createVariant(productId, dto, actor?, scope?)`, `updateVariant(id, dto, actor?, scope?)`, `deleteVariant(id, actor?, scope?)`, `updateVariantStock(id, dto, actor?, scope?)`, `createCoupon(dto, actor?, scope?)`, `updateCoupon(id, dto, actor?, scope?)`, `deleteCoupon(id, actor?, scope?)`, and a new `private sellerMarket(sellerId): Promise<string | null>`.
- Produces HTTP: `POST /admin/marketplace/coupons`, `PUT /admin/marketplace/coupons/:id`, `DELETE /admin/marketplace/coupons/:id` — `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:promotions.manage')`, each calling `this.scopeOf(req, dto.regionCode, 'that coupon')`.
- Removes: `MarketplaceFulfillmentService.assertCouponInMarket` and `.denyMarket`. Any later code that wants "refuse a foreign record" calls `assertInMarket` from `@app/common`. There is then **one** implementation on the backend and one at the gateway, and no third.

- [ ] **Step 1: Write the failing backend spec**

Create `modules/marketplace/backend/src/fulfillment/fulfillment-scope.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { MarketplaceFulfillmentService } from './fulfillment.service';

const admin = { ownerId: 'u-admin', role: 'ADMIN' };

/**
 * A fulfillment service with just enough doubles to reach the scope check.
 * `variantSellerId` resolves through the variant's own column, so one variant
 * row and one seller row is the whole fixture.
 */
function service(sellerRegion: string | null) {
  const variantRepo = {
    findOne: vi.fn(async () => ({
      id: 'v-1',
      productId: 'p-1',
      sellerId: 's-1',
      stockQuantity: 5,
    })),
    update: vi.fn(async () => ({ affected: 1 })),
    create: vi.fn((x: any) => x),
    save: vi.fn(async (x: any) => ({ ...x, id: 'v-new' })),
  };
  const productRepo = {
    findOne: vi.fn(async () => ({ id: 'p-1', seller_id: 's-1' })),
  };
  const sellerRepo = {
    findOne: vi.fn(async () => ({ id: 's-1', regionCode: sellerRegion })),
  };
  const returnRepo = {
    findOne: vi.fn(async () => ({
      id: 'r-1',
      sellerId: 's-1',
      regionCode: 'IN',
      status: 'RECEIVED',
    })),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const dataSource = {
    transaction: vi.fn(async () => ({ newQty: 0, sku: 'SKU', lowStockThreshold: 1 })),
  };
  const svc = Object.create(
    MarketplaceFulfillmentService.prototype,
  ) as MarketplaceFulfillmentService;
  Object.assign(svc, {
    variantRepo,
    productRepo,
    sellerRepo,
    returnRepo,
    kafka,
    dataSource,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, variantRepo, returnRepo, kafka };
}

describe('variant writes respect the owning seller market', () => {
  it('refuses stock, update, delete and create on an IN seller for a QA admin, and writes nothing', async () => {
    for (const call of [
      (s: any) => s.updateVariantStock('v-1', { quantity: 0, operation: 'SET' }, admin, 'QA'),
      (s: any) => s.updateVariant('v-1', { sellingPrice: 1 }, admin, 'QA'),
      (s: any) => s.deleteVariant('v-1', admin, 'QA'),
      (s: any) => s.createVariant('p-1', { sku: 'X' }, admin, 'QA'),
    ]) {
      const { svc, variantRepo, kafka } = service('IN');
      await expect(call(svc)).rejects.toThrow(ForbiddenException);
      await expect(call(svc)).rejects.toThrow('This variant belongs to IN, not to the QA market.');
      expect(variantRepo.update).not.toHaveBeenCalled();
      expect(variantRepo.save).not.toHaveBeenCalled();
      expect(kafka.publish).not.toHaveBeenCalled();
    }
  });

  it('allows the same writes on a QA seller — the control', async () => {
    const { svc, variantRepo } = service('QA');
    await expect(
      svc.updateVariant('v-1', { sellingPrice: 199 }, admin, 'QA'),
    ).resolves.toMatchObject({ success: true });
    expect(variantRepo.update).toHaveBeenCalled();
  });

  it('leaves a global admin (no scope) free in any market', async () => {
    const { svc, variantRepo } = service('IN');
    await expect(svc.deleteVariant('v-1', admin)).resolves.toMatchObject({ success: true });
    expect(variantRepo.update).toHaveBeenCalledWith('v-1', { isActive: false });
  });

  it('refuses a variant whose seller has no market at all', async () => {
    const { svc } = service(null);
    await expect(svc.deleteVariant('v-1', admin, 'QA')).rejects.toThrow(
      'This variant belongs to every market, not to the QA market.',
    );
  });
});

describe('return decisions respect the return market', () => {
  it('refuses REFUNDED on an IN return for a QA admin and writes nothing', async () => {
    const { svc, returnRepo, kafka } = service('IN');
    await expect(
      svc.updateReturnStatus('r-1', { status: 'REFUNDED' }, admin, 'QA'),
    ).rejects.toThrow(ForbiddenException);
    expect(returnRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it — FAIL**

From `modules/marketplace`: `npx vitest run src/fulfillment/fulfillment-scope.spec.ts`

Expected: FAIL — the four variant calls resolve instead of rejecting (`updateVariant` and friends take only three parameters; the fourth argument is ignored and no market is ever read). The return test already passes: `updateReturnStatus` reads `scope` correctly (`fulfillment.service.ts:291`) — it is the **gateway** that never sends it, which Step 6 fixes.

- [ ] **Step 3: Add `sellerMarket` and assert it on every variant write**

In `modules/marketplace/backend/src/fulfillment/fulfillment.service.ts`, immediately after `variantSellerId` (which ends around line 205), add:

```ts
  /**
   * The market a seller trades in, for the scope check on catalogue writes.
   *
   * A variant carries no market of its own; the seller who owns it does, and
   * that is the documented attribution join for the whole product tree (see
   * `admin/admin.service.ts:630-652`). `null` — an unattributed seller — is
   * refused for a scoped caller by `assertInMarket`, which is the right
   * default: a row nobody can place is not a regional admin's to edit.
   */
  private async sellerMarket(sellerId: string | null | undefined): Promise<string | null> {
    if (!sellerId) return null;
    const seller = await this.sellerRepo.findOne({
      where: { id: sellerId } as any,
      select: ['id', 'regionCode'] as any,
    });
    return seller?.regionCode ?? null;
  }
```

Then change the four variant writes. `createVariant` (line 799):

```ts
  async createVariant(productId: string, dto: any, actor?: Actor, scope?: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    await this.assertOwns(actor, product.seller_id, 'product');
    // `assertOwns` short-circuits for every ADMIN role, so it answers "may this
    // caller act on this seller's rows?" and never "is this seller in this
    // caller's market?". Without the line below a QA-locked admin created,
    // repriced, deleted and zeroed the stock of Indian listings (audit V4).
    assertInMarket(await this.sellerMarket(product.seller_id), scope, 'variant', this.logger);
```

`updateVariant` (line 830):

```ts
  async updateVariant(id: string, dto: any, actor?: Actor, scope?: string) {
    const { sellerId } = await this.variantSellerId(id);
    await this.assertOwns(actor, sellerId, 'variant');
    assertInMarket(await this.sellerMarket(sellerId), scope, 'variant', this.logger);
```

`deleteVariant` (line 846):

```ts
  async deleteVariant(id: string, actor?: Actor, scope?: string) {
    const { sellerId } = await this.variantSellerId(id);
    await this.assertOwns(actor, sellerId, 'variant');
    assertInMarket(await this.sellerMarket(sellerId), scope, 'variant', this.logger);
```

`updateVariantStock` (line 854):

```ts
  async updateVariantStock(
    id: string,
    dto: { quantity: number; operation: 'SET' | 'INCREMENT' | 'DECREMENT' },
    actor?: Actor,
    scope?: string,
  ) {
    const { sellerId } = await this.variantSellerId(id);
    await this.assertOwns(actor, sellerId, 'variant');
    assertInMarket(await this.sellerMarket(sellerId), scope, 'variant', this.logger);
```

`assertInMarket` is already imported in this file (it is used at line 291); if the import was narrowed, restore `import { assertInMarket } from '@app/common';`.

- [ ] **Step 4: Delete the third refusal implementation**

Still in `fulfillment.service.ts`, delete `assertCouponInMarket` (lines 155-161) and `denyMarket` (lines 163-171) outright, and rewrite `couponMarketFor` (lines 128-153) to take `scope` instead of reading it off `Actor`:

```ts
  /**
   * The market a new coupon is issued for, given who is issuing it: the
   * caller's own market when the gateway sent a `scope` (any other market named
   * in the body is refused); the requested one for a global admin (none = the
   * platform's, runs everywhere); a seller's own market by default.
   *
   * This used to read `actor.regionCode` and refuse through a private
   * `denyMarket` — a third spelling of a rule that already had two correct
   * implementations. One drifted copy of an authorisation rule is worse than
   * one copy in the wrong place, so the private pair is gone and this reads the
   * same `scope` every other handler reads.
   */
  private async couponMarketFor(
    actor: Actor | undefined,
    requested?: string | null,
    scope?: string,
  ): Promise<string | null> {
    const lock = normaliseMarket(scope);
    const wanted = normaliseMarket(requested ?? undefined) ?? null;
    if (lock) {
      if (wanted && wanted !== lock) {
        assertInMarket(wanted, lock, 'coupon', this.logger);
      }
      return lock;
    }
    if (wanted) return wanted;
    if (MarketplaceFulfillmentService.isAdmin(actor)) return null;
    const ownerId = actor?.ownerId;
    if (!ownerId) return null;
    const seller = await this.sellerRepo.findOne({
      where: { ownerId } as any,
      select: ['id', 'regionCode'] as any,
    });
    return normaliseMarket(seller?.regionCode ?? undefined) ?? null;
  }
```

Add `normaliseMarket` to the `@app/common` import. Then, at every former `assertCouponInMarket(actor, coupon, what)` call site, substitute:

```ts
assertInMarket(coupon.regionCode, scope, 'coupon', this.logger);
```

and thread `scope?: string` onto `createCoupon`, `updateCoupon` and `deleteCoupon` as the last parameter. Find the call sites with:

```bash
grep -n "assertCouponInMarket\|denyMarket\|couponMarketFor" modules/marketplace/backend/src/fulfillment/fulfillment.service.ts
```

After the edit that command must print nothing but the `couponMarketFor` definition and its calls.

- [ ] **Step 5: Forward `scope` in the module's TCP controller**

`modules/marketplace/backend/src/marketplace.controller.ts` — four handlers:

```ts
  @MessagePattern({ cmd: 'update_variant_stock' })
  tcpUpdateStock(@Payload() data: any) {
    return this.fulfillment.updateVariantStock(data?.id, data, actorOf(data), data?.scope);
  }
```

```ts
  @MessagePattern({ cmd: 'create_variant' })
  tcpCreateVariant(@Payload() data: any) {
    return this.fulfillment.createVariant(data?.productId, data?.dto ?? data, actorOf(data), data?.scope);
  }

  @MessagePattern({ cmd: 'update_variant' })
  tcpUpdateVariant(@Payload() data: any) {
    return this.fulfillment.updateVariant(data?.id, data?.dto ?? data, actorOf(data), data?.scope);
  }

  @MessagePattern({ cmd: 'delete_variant' })
  tcpDeleteVariant(@Payload() data: any) {
    return this.fulfillment.deleteVariant(
      typeof data === 'string' ? data : data?.id,
      actorOf(data),
      typeof data === 'string' ? undefined : data?.scope,
    );
  }
```

and the three coupon patterns (`create_coupon`, `update_coupon`, `delete_coupon`) gain `data?.scope` as their last argument the same way.

- [ ] **Step 6: Give the gateway's marketplace controller a `scopeOf`, and send `scope`**

`apps/api/apps/api-gateway/src/controllers/marketplace.controller.ts` — widen the import at line 72:

```ts
import { marketScopeOf, resolveMarket } from '../guards/market-scope';
```

and add, immediately after `actor()` (which ends at line 140):

```ts
  /**
   * The market this request may act in, as `scope` for the backend.
   *
   * This controller is not an `/admin/*` controller, but 22 of its routes carry
   * `@Roles(ADMIN, SUPER_ADMIN)` — and four of them move money or stock. They
   * forwarded `_actor` and nothing else, so every `assertInMarket(row, scope)`
   * downstream returned on its first line (audit V2, V4). `market` is the
   * filter to send; `scope` is set only when the caller is locked and is the
   * proof the backend checks against the row.
   */
  private scopeOf(
    req: any,
    requested?: string,
    what = 'that market',
  ): { scope?: string; market?: string } {
    const market = resolveMarket(req, requested, what);
    const scope = marketScopeOf(req).locked ? market : undefined;
    return { scope, market };
  }
```

Then thread it through the five routes. `updateReturnStatus` (line 657):

```ts
return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_RETURN_STATUS, {
  id,
  ...payload,
  _actor: this.actor(req),
  scope: this.scopeOf(req, undefined, 'that return request').scope,
});
```

`createVariant` (line ~940), `updateVariant` (line 966), `deleteVariant` (line 979) and `updateVariantStock` (line 996) each gain the same line:

```ts
      scope: this.scopeOf(req, undefined, 'that variant').scope,
```

and `createCoupon` (line 819), `updateCoupon` (line 838) and `deleteCoupon` gain:

```ts
      scope: this.scopeOf(req, (payload as any)?.regionCode, 'that coupon').scope,
```

- [ ] **Step 7: Write the failing gateway spec**

Create `apps/api/apps/api-gateway/src/controllers/marketplace-scope.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { MarketplaceController } from './marketplace.controller';
import { MARKETPLACE_PATTERNS } from '../contracts/marketplace.patterns';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const seller = { id: 'u-s', role: 'SELLER' };
const req = (user: object) => ({ user, method: 'PUT', originalUrl: '/x', headers: {} });

function build() {
  const client = { send: vi.fn(() => of({ success: true })) };
  const noop = { send: vi.fn(() => of({})) } as any;
  const ctrl = Object.create(MarketplaceController.prototype) as MarketplaceController;
  Object.assign(ctrl, { marketplaceClient: client, orderClient: noop, orders: noop });
  // `sendToMarketplace` is the one seam these routes share.
  (ctrl as any).sendToMarketplace = (cmd: string, payload: any) => {
    client.send({ cmd }, payload);
    return Promise.resolve({ success: true });
  };
  return { ctrl, client };
}

describe('MarketplaceController forwards scope on the admin-reachable writes', () => {
  it('sends the caller market as scope on a return decision', async () => {
    const { ctrl, client } = build();
    await ctrl.updateReturnStatus(req(qaAdmin), 'r-1', { status: 'REFUNDED' } as any);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: MARKETPLACE_PATTERNS.UPDATE_RETURN_STATUS },
      expect.objectContaining({ id: 'r-1', status: 'REFUNDED', scope: 'QA' }),
    );
  });

  it('sends scope on every variant write', async () => {
    const { ctrl, client } = build();
    await ctrl.createVariant(req(qaAdmin), 'p-1', { sku: 'A' } as any);
    await ctrl.updateVariant(req(qaAdmin), 'v-1', { sellingPrice: 1 } as any);
    await ctrl.deleteVariant(req(qaAdmin), 'v-1');
    await ctrl.updateVariantStock(req(qaAdmin), 'v-1', { quantity: 0, operation: 'SET' } as any);
    expect(client.send.mock.calls).toHaveLength(4);
    for (const call of client.send.mock.calls) expect(call[1]).toMatchObject({ scope: 'QA' });
  });

  it('sends no scope for a global admin or a seller — the backend must not narrow them', async () => {
    for (const user of [globalAdmin, seller]) {
      const { ctrl, client } = build();
      await ctrl.deleteVariant(req(user), 'v-1');
      expect(client.send.mock.calls[0][1].scope).toBeUndefined();
    }
  });

  it('refuses a locked admin who names another market on a coupon', async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.createCoupon(req(qaAdmin), { code: 'X', regionCode: 'IN' } as any),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });
});
```

Run from `apps/api`: `npx vitest run apps/api-gateway/src/controllers/marketplace-scope.spec.ts` → **4 passed** once steps 3–6 are in (run it before Step 6 to see the `scope: 'QA'` assertions fail).

- [ ] **Step 8: Add the admin coupon write routes and repoint the console**

In `admin-marketplace.controller.ts`, directly below the existing `@Get('coupons')` block (line 3000), add:

```ts
  /**
   * Admin coupon writes.
   *
   * The console's coupon page read through this controller and wrote through
   * `POST /marketplace/coupons` — the seller route, gated `SELLER, ADMIN,
   * SUPER_ADMIN`. That route is scoped now (Task R2 step 6), but a promotions
   * screen whose reads and writes sit on two different controllers with two
   * different guard stacks is a hole waiting to be reopened. These three are the
   * admin path, and `perm:promotions.manage` is the key the console's role grid
   * already grants.
   */
  @Post('coupons')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:promotions.manage')
  @ApiOperation({ summary: 'Create a platform coupon in one market' })
  async createCoupon(@Req() req: any, @Body() dto: AdminCouponDto) {
    const { scope, market } = this.scopeOf(req, dto.regionCode, 'that coupon');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_COUPON, {
      ...dto,
      regionCode: market ?? null,
      scope,
    });
  }

  @Put('coupons/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:promotions.manage')
  @ApiOperation({ summary: 'Update a platform coupon' })
  async updateCoupon(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminCouponDto,
  ) {
    const { scope, market } = this.scopeOf(req, dto.regionCode, 'that coupon');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_COUPON, {
      id,
      dto: { ...dto, ...(market ? { regionCode: market } : {}) },
      scope,
    });
  }

  @Delete('coupons/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:promotions.manage')
  @ApiOperation({ summary: 'Delete a platform coupon' })
  async deleteCoupon(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that coupon');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.DELETE_COUPON, { id, scope });
  }
```

`AdminCouponDto` is a **class**, not an interface — Nest skips validation entirely when there is no metatype. Add it to `apps/api/apps/api-gateway/src/dto/admin-marketplace.dto.ts`:

```ts
export class AdminCouponDto {
  @ApiProperty({ example: 'QASUMMER25' })
  @IsString()
  @Length(3, 32)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'code must be upper-case letters, digits, _ or -' })
  code!: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'] })
  @IsIn(['PERCENTAGE', 'FIXED'])
  discountType!: 'PERCENTAGE' | 'FIXED';

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  discountValue!: number;

  @ApiPropertyOptional({ example: 'QA', description: 'ISO-2 market; omitted = every market' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2}$/, { message: 'regionCode must be a two-letter ISO country code' })
  regionCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minOrderValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(1_000_000) usageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 300) description?: string;
}
```

The global pipe already runs `whitelist: true, forbidNonWhitelisted: true`, so an unknown key is a 400 rather than a silent pass-through.

Then repoint the console in `packages/shared-core/src/modules/admin-marketplace-api.ts` lines 322/324/326, changing the three coupon write URLs from `${BASE_URL}/marketplace/coupons…` to `${BASE_URL}/admin/marketplace/coupons…`. Leave the seller portal's own calls alone.

- [ ] **Step 9: Run everything**

From `modules/marketplace`: `npx vitest run` → **256 passed** (250 + the 6 new `it`s).
From `apps/api`: `npx vitest run` → **688 passed** (684 after Task 1 + 4). `npx nest build --all` → exit 0.
From repo root: `npm run build --workspace=@kartseek/shared-core` (or `npx tsc -p packages/shared-core`) → exit 0; `npm --prefix apps/web run test` → **610 passed**.

- [ ] **Step 10: Live probe**

```bash
INRET=$(docker exec kartseek-postgres-marketplace psql -U kartseek -d kartseek_marketplace -tAc \
  "SELECT id FROM marketplace.return_requests WHERE region_code='IN' LIMIT 1")
QARET=$(docker exec kartseek-postgres-marketplace psql -U kartseek -d kartseek_marketplace -tAc \
  "SELECT id FROM marketplace.return_requests WHERE region_code='QA' LIMIT 1")
INVAR=$(docker exec kartseek-postgres-marketplace psql -U kartseek -d kartseek_marketplace -tAc \
  "SELECT v.id FROM marketplace.product_variants v JOIN marketplace.sellers s ON s.id = v.seller_id
   WHERE s.region_code='IN' LIMIT 1")

printf 'X-15 QA->IN return REFUNDED: '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"status":"REFUNDED"}' "$B/marketplace/returns/$INRET/status"
printf 'X-56 QA->QA return (control): '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"status":"QC_PASSED"}' "$B/marketplace/returns/$QARET/status"
printf 'X-10 QA->IN variant stock: '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"quantity":0,"operation":"SET"}' "$B/marketplace/variants/$INVAR/stock"
printf 'QA->IN variant delete: '
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE -H "Authorization: Bearer $QA" "$B/marketplace/variants/$INVAR"
printf 'coupon: QA admin naming IN: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"code":"XMARKET","discountType":"PERCENTAGE","discountValue":5,"regionCode":"IN"}' \
  "$B/admin/marketplace/coupons"
printf 'coupon: QA admin in QA (control): '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"code":"QAONLY1","discountType":"PERCENTAGE","discountValue":5}' \
  "$B/admin/marketplace/coupons"
printf 'coupon: junk key rejected by the DTO: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"code":"QAONLY2","discountType":"PERCENTAGE","discountValue":5,"isAdmin":true}' \
  "$B/admin/marketplace/coupons"
```

Expected: `403`, `200`, `403`, `403`, `403`, `201`, `400`. Then confirm the coupon that was created carries the market:

```bash
docker exec kartseek-postgres-marketplace psql -U kartseek -d kartseek_marketplace -tAc \
  "SELECT code, region_code FROM marketplace.coupons WHERE code IN ('XMARKET','QAONLY1')"
```

Expected: exactly one row, `QAONLY1|QA`. `XMARKET` must not exist — a 403 that still wrote the row is a fail.

- [ ] **Step 11: Commit (API and web separately)**

```bash
git add apps/api/apps/api-gateway/src/controllers/marketplace.controller.ts \
        apps/api/apps/api-gateway/src/controllers/marketplace-scope.spec.ts \
        apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts \
        apps/api/apps/api-gateway/src/dto/admin-marketplace.dto.ts \
        modules/marketplace/backend/src/fulfillment/fulfillment.service.ts \
        modules/marketplace/backend/src/fulfillment/fulfillment-scope.spec.ts \
        modules/marketplace/backend/src/marketplace.controller.ts
git commit -m "fix(marketplace): returns, variants and coupons carry the caller market to the row that decides" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add packages/shared-core/src/modules/admin-marketplace-api.ts
git commit -m "fix(web): the admin coupon page writes through the admin routes, not the seller ones" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3 (R3): The query filter that replaced the market predicate, and the missing id that flushed every market's home cache

**Closes: AUD2-006, AUD2-093** (V3, V14 / E F-03, F-14; §13 rows X-19, X-21, QA-12, QA-13)

Two small, exactly-located defects with large blast radii. `qb.where(...)` on a TypeORM builder **replaces** the WHERE clause rather than adding to it, so the region `andWhere` above it is discarded the moment a caller passes `?activeOnly=true` or `?status=ACTIVE`. And `deleteBanner` puts its scope assertion inside `if (target)`, so an id that matches nothing skips the check and then calls `invalidateHomeFeeds(null)`, which flushes `marketplace:home:*` for every market on the platform.

**Files:**

- Modify: `modules/marketplace/backend/src/admin/admin.service.ts:1919`, `:1987`
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts:1622-1645`
- Create: `modules/marketplace/backend/src/admin/offer-list-scope.spec.ts`
- Create: `apps/api/apps/api-gateway/src/controllers/admin-marketplace-banner.spec.ts`

**Interfaces:**

- No signature changes. `listBankOffers(activeOnly, category, region, regionStrict)` and `listExchangeOffers(activeOnly, targetCategory, region, regionStrict)` keep their shapes; only the builder call changes.
- `POST /admin/marketplace/banners/:type/:id/delete` gains a behaviour: a missing id is now `404 Banner <id> not found`, and no cache is touched. Callers that relied on a 200 for an already-deleted banner must handle the 404 — the admin console's `deleteBanner` already surfaces non-2xx as an error toast.

- [ ] **Step 1: Write the failing offer-list spec**

Create `modules/marketplace/backend/src/admin/offer-list-scope.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { MarketplaceAdminService } from './admin.service';

/**
 * A query builder that records the ORDER and KIND of every predicate call, so
 * the spec can prove the market clause survived. Recording only the strings
 * would pass against `qb.where` — which discards everything before it — which
 * is exactly the bug (audit V3).
 */
function recordingQb() {
  const calls: Array<{ kind: 'where' | 'andWhere'; sql: string }> = [];
  const qb: any = {
    orderBy: () => qb,
    addOrderBy: () => qb,
    where: (sql: string) => {
      calls.push({ kind: 'where', sql });
      return qb;
    },
    andWhere: (sql: string) => {
      calls.push({ kind: 'andWhere', sql });
      return qb;
    },
    getManyAndCount: async () => [[], 0],
  };
  return { qb, calls };
}

function service() {
  const bank = recordingQb();
  const exchange = recordingQb();
  const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
  Object.assign(svc, {
    bankOfferRepo: { createQueryBuilder: () => bank.qb },
    exchangeOfferRepo: { createQueryBuilder: () => exchange.qb },
    logger: { log: vi.fn(), warn: vi.fn() },
  });
  return { svc, bank, exchange };
}

describe('offer lists keep their market predicate under every filter', () => {
  it('never calls qb.where — a reset discards the region clause built above it', async () => {
    const { svc, bank, exchange } = service();
    await svc.listBankOffers(true, undefined, 'QA', true);
    await svc.listExchangeOffers(true, undefined, 'QA', true);
    expect(bank.calls.filter((c) => c.kind === 'where')).toEqual([]);
    expect(exchange.calls.filter((c) => c.kind === 'where')).toEqual([]);
  });

  it('keeps the strict market clause alongside the activeOnly clauses (bank offers)', async () => {
    const { svc, bank } = service();
    await svc.listBankOffers(true, undefined, 'QA', true);
    const sql = bank.calls.map((c) => c.sql);
    expect(sql).toContain('bo.regionCode = :region');
    expect(sql).toContain('bo.status = :status');
    expect(bank.calls.findIndex((c) => c.sql.includes('regionCode'))).toBeLessThan(
      bank.calls.findIndex((c) => c.sql.includes('status')),
    );
  });

  it('keeps the strict market clause alongside the activeOnly clauses (exchange offers)', async () => {
    const { svc, exchange } = service();
    await svc.listExchangeOffers(true, 'phones', 'QA', true);
    const sql = exchange.calls.map((c) => c.sql);
    expect(sql).toContain('eo.applicableCountries = :region');
    expect(sql).toContain('eo.status = :status');
  });

  it('still filters by market when no status filter is asked for', async () => {
    const { svc, bank } = service();
    await svc.listBankOffers(false, undefined, 'QA', true);
    expect(bank.calls.map((c) => c.sql)).toEqual(['bo.regionCode = :region']);
  });
});
```

- [ ] **Step 2: Run it — FAIL**

From `modules/marketplace`: `npx vitest run src/admin/offer-list-scope.spec.ts`

Expected: FAIL on tests 1 and 2 — `bank.calls` contains `{ kind: 'where', sql: 'bo.status = :status' }` because `admin.service.ts:1919` calls `qb.where`. Test 3 fails the same way at `:1987`.

- [ ] **Step 3: The two-character fix, with the reason recorded**

`modules/marketplace/backend/src/admin/admin.service.ts` line 1917-1922:

```ts
if (activeOnly) {
  const now = new Date();
  // `andWhere`, never `where`: TypeORM's `where()` REPLACES the whole WHERE
  // clause, so it discarded the region predicate built ten lines above and
  // `?activeOnly=true` returned every market's bank offers to a locked
  // admin (audit V3). Same at `listExchangeOffers` below.
  qb.andWhere('bo.status = :status', { status: 'ACTIVE' })
    .andWhere('bo.startsAt <= :now', { now })
    .andWhere('bo.expiresAt >= :now', { now });
}
```

and line 1985-1990:

```ts
if (activeOnly) {
  const now = new Date();
  qb.andWhere('eo.status = :status', { status: 'ACTIVE' })
    .andWhere('eo.startsAt <= :now', { now })
    .andWhere('eo.expiresAt >= :now', { now });
}
```

- [ ] **Step 4: Sweep the rest of the repository for the same shape**

A one-off fix leaves the pattern free to come back. Run:

```bash
grep -rn "qb\.where(\|\.where(" --include=*.ts modules/*/backend/src apps/api/apps \
  | grep -v node_modules | grep -v "/dist/" | grep -v "\.spec\.ts" \
  | grep -v "createQueryBuilder(.*)\s*$" | grep -B0 -A0 "qb\.where("
```

Every remaining `qb.where(` must be the **first** predicate on its builder. Record any that is not, fix it the same way, and extend the spec above with one `it` per site. As of this plan the only two are the ones in Step 3; a third would be a finding, not a surprise.

- [ ] **Step 5: Write the failing banner spec**

Create `apps/api/apps/api-gateway/src/controllers/admin-marketplace-banner.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminMarketplaceController } from './admin-marketplace.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'POST', originalUrl: '/x', headers: {} });

function build(banners: any[]) {
  const store = new Map<string, any>([['marketplace:hero-banners', banners]]);
  const redis = {
    getJson: vi.fn(async (k: string) => store.get(k) ?? null),
    setJson: vi.fn(async (k: string, v: any) => void store.set(k, v)),
    del: vi.fn(async () => undefined),
    delPattern: vi.fn(async () => 0),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const ctrl = Object.create(AdminMarketplaceController.prototype) as AdminMarketplaceController;
  Object.assign(ctrl, { redis, kafka, logger: { log: vi.fn(), warn: vi.fn() } });
  return { ctrl, redis, kafka, store };
}

describe('banner delete', () => {
  it('404s on an id that does not exist and touches no cache', async () => {
    const { ctrl, redis, kafka } = build([{ id: 'b-qa', regions: ['QA'] }]);
    await expect(ctrl.deleteBanner(req(qaAdmin), 'hero', 'does-not-exist')).rejects.toThrow(
      NotFoundException,
    );
    // The bug: with the assert inside `if (target)`, a missing id fell through
    // to invalidateHomeFeeds(null) and flushed marketplace:home:* for every
    // market on the platform (audit V14).
    expect(redis.delPattern).not.toHaveBeenCalled();
    expect(redis.setJson).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('refuses a banner from another market and leaves it in place', async () => {
    const { ctrl, store, redis } = build([{ id: 'b-in', regions: ['IN'] }]);
    await expect(ctrl.deleteBanner(req(qaAdmin), 'hero', 'b-in')).rejects.toThrow(
      ForbiddenException,
    );
    expect(store.get('marketplace:hero-banners')).toHaveLength(1);
    expect(redis.setJson).not.toHaveBeenCalled();
  });

  it("deletes the locked admin's own banner and purges only their market", async () => {
    const { ctrl, redis, store } = build([
      { id: 'b-qa', regions: ['QA'] },
      { id: 'b-in', regions: ['IN'] },
    ]);
    await expect(ctrl.deleteBanner(req(qaAdmin), 'hero', 'b-qa')).resolves.toMatchObject({
      success: true,
    });
    expect(store.get('marketplace:hero-banners').map((b: any) => b.id)).toEqual(['b-in']);
    const purged = redis.del.mock.calls.flat().concat(redis.delPattern.mock.calls.flat());
    expect(purged.some((k: string) => String(k).includes('IN'))).toBe(false);
  });

  it('lets a global admin delete an untargeted banner', async () => {
    const { ctrl } = build([{ id: 'b-all', regions: [] }]);
    await expect(ctrl.deleteBanner(req(globalAdmin), 'hero', 'b-all')).resolves.toMatchObject({
      success: true,
    });
  });
});
```

- [ ] **Step 6: Move the assertion out of the conditional**

`apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts` lines 1622-1634:

```ts
  @Post('banners/:type/:id/delete')
  @ApiOperation({ summary: 'Delete a banner' })
  async deleteBanner(@Req() req: any, @Param('type') type: string, @Param('id') id: string) {
    const key = `marketplace:${type}-banners`;
    const existing: any[] = (await this.redis.getJson(key)) || [];
    const target = existing.find((b: any) => b.id === id);
    // 404 before anything else. The assertion used to sit inside `if (target)`,
    // so a banner id that matched nothing skipped the market check entirely and
    // fell through to `invalidateHomeFeeds(null)` — a home-feed flush for every
    // market on the platform, triggerable by any locked admin with a typo
    // (audit V14).
    if (!target) throw new NotFoundException(`Banner ${id} not found`);
    assertRecordInScope(req, AdminMarketplaceController.bannerMarket(target), 'this banner');

    const filtered = existing.filter((b: any) => b.id !== id);
    await this.redis.setJson(key, filtered, 0);
    await this.invalidateHomeFeeds(
      Array.isArray(target.regions) && target.regions.length ? target.regions : null,
    );
```

Add `NotFoundException` to the `@nestjs/common` import list if it is not already there.

- [ ] **Step 7: Run both specs, both suites and the build**

From `modules/marketplace`: `npx vitest run src/admin/offer-list-scope.spec.ts` → **4 passed**; `npx vitest run` → **260 passed**.
From `apps/api`: `npx vitest run apps/api-gateway/src/controllers/admin-marketplace-banner.spec.ts` → **4 passed**; `npx vitest run` → **692 passed**. `npx nest build --all` → exit 0.

- [ ] **Step 8: Live probe**

```bash
printf 'X-19 QA bank-offers?activeOnly=true — IN rows present? '
curl -s -H "Authorization: Bearer $QA" "$B/admin/marketplace/bank-offers?activeOnly=true" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
      const rows=d.data?.data??d.data??[];
      JSON.stringify({n:rows.length,markets:[...new Set(rows.map(r=>r.regionCode))]})'
printf 'QA exchange-offers?status=ACTIVE — markets: '
curl -s -H "Authorization: Bearer $QA" "$B/admin/marketplace/exchange-offers?status=ACTIVE" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
      const rows=d.data?.data??d.data??[];
      JSON.stringify({n:rows.length,markets:[...new Set(rows.map(r=>r.applicableCountries))]})'
printf 'X-21 QA delete a banner id that does not exist: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  "$B/admin/marketplace/banners/hero/does-not-exist/delete"
docker exec kartseek-redis redis-cli --scan --pattern 'marketplace:home:*'
```

Expected: both list lines show `markets: ["QA"]` and `n > 0` (§13 X-57 — an empty list is SKIPPED, not PASS; seed a QA bank offer and a QA exchange offer first if the tables hold none). The delete line returns `404`. The `redis-cli` scan afterwards must still list any `marketplace:home:*` keys that were warm before the probe — the read is the proof nothing global was flushed, so warm one first with `curl -s -H 'X-Region-Code: AE' $B/marketplace/home > /dev/null`.

The gateway log must carry **no** `[region-scope-denied]` line for the 404 — a missing banner is a 404, not a market denial.

- [ ] **Step 9: Commit**

```bash
git add modules/marketplace/backend/src/admin/admin.service.ts \
        modules/marketplace/backend/src/admin/offer-list-scope.spec.ts \
        apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts \
        apps/api/apps/api-gateway/src/controllers/admin-marketplace-banner.spec.ts
git commit -m "fix(marketplace): a status filter no longer resets the market predicate; a missing banner 404s" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4 (R4): Users are scoped on `users.region_code`, with the backfill that makes the column true, and the dashboard counters gain a market

**Closes: AUD2-009, AUD2-077, AUD2-095** (V6 / E F-06, I2/F-22; C §2 #5; §13 rows IN-01, X-07)

`admin-service` scopes users on `users.country`, which defaults to `'IN'` for every row ever created (`user-service/src/entities/user.entity.ts:39`, confirmed live: 51 of 51 rows carry `'IN'`). So an IN-locked admin lists and bans every customer on the platform including the Qatari ones, and a QA-locked admin gets an empty list. The claim is minted from `users.region_code`; the query must read the same column.

Switching the column alone would hand every regional admin an empty list, because `region_code` is populated on staff accounts only (3 of 51 rows). This task therefore ships the switch **and** the backfill together, derived from a signal that is real: the market of the customer's most recent order. Rows with no order keep `region_code = NULL` and are excluded from a locked admin's list — fail closed, the same rule `assertInMarket(null, scope)` applies everywhere else.

**Files:**

- Create: `apps/api/migrations/1786501900000-UserMarketBackfill.ts`
- Modify: `apps/api/data-source.main.ts` (migration list + the classification docstring)
- Modify: `apps/api/apps/admin-service/src/admin.service.ts:113`, `:241-252`, `:265-290`, `:335-343`, `:616-651`
- Modify: `apps/api/apps/admin-service/src/admin.scope.spec.ts` (extend)
- Create: `apps/api/apps/admin-service/src/admin-counters.spec.ts`

**Interfaces:**

- Produces the platform's answer to "a customer's market" (AUD2-077 / I2), stated once here and referenced by every later plan:
  - **identity screens** (`/admin/users`, KYC, staff, bans) read `users.region_code`;
  - **commerce screens** (`/admin/marketplace/customers`, order and revenue reports) read `orders.region_code` / `marketplace_orders.region_code`, because a customer can order in more than one market and the row being decided upon is the order;
  - the two are consistent because the backfill below **derives** `users.region_code` from the customer's most recent order.
- Produces: `admin:counter:revenue:<market>:<dateKey>`, `admin:counter:orders:<market>:<dateKey>`, `admin:counter:revenue:<market>:<module>` — the market segment is `GLOBAL` for an event that carries none. `incrementCounter(kind, amount, market?)` gains the third parameter. The old unsegmented keys are left in place, unread, and expire with their existing one-year TTL.
- Unchanged: `getUsersList(page, limit, role?, country?, search?, scope?)`, `banUser(userId, reason, adminId, scope?)`, `unbanUser(userId, adminId, scope?)`. Only what they read changes.

- [ ] **Step 1: Write the failing spec**

Extend `apps/api/apps/admin-service/src/admin.scope.spec.ts`. The existing `makeService` helper builds a query builder that records predicates; add `region_code` to its raw row and append these four `it`s:

```ts
describe('AdminService scopes users on the market the claim is minted from', () => {
  it('narrows the users list on u.region_code, not on u.country', async () => {
    const { svc, where } = makeService();
    await svc.getUsersList(1, 20, undefined, undefined, undefined, 'QA');
    expect(where.some((w) => w.includes('u.region_code = :scope'))).toBe(true);
    // `users.country` defaults to 'IN' on every row, so scoping on it handed an
    // IN admin every customer on the platform and a QA admin none (audit V6).
    expect(where.some((w) => w.includes('u.country'))).toBe(false);
  });

  it('ignores a conflicting ?country= filter when the caller is locked', async () => {
    const { svc, where } = makeService();
    await svc.getUsersList(1, 20, undefined, 'IN', undefined, 'QA');
    expect(where.filter((w) => w.includes('region_code'))).toEqual(['u.region_code = :scope']);
  });

  it('lets a global admin filter by market without a scope predicate', async () => {
    const { svc, where } = makeService();
    await svc.getUsersList(1, 20, undefined, 'in', undefined, undefined);
    expect(where).toContain('u.region_code = :market');
    expect(where.some((w) => w.includes(':scope'))).toBe(false);
  });

  it('refuses to ban a user whose region_code is another market, and one with none at all', async () => {
    for (const region of ['IN', null]) {
      const { svc, kafka } = makeService({ userRegion: region });
      await expect(svc.banUser('user-1', 'fraud', 'admin-qa', 'QA')).rejects.toThrow(
        ForbiddenException,
      );
      expect(kafka.publish).not.toHaveBeenCalled();
    }
  });

  it('bans a user in the same market — the control', async () => {
    const { svc, kafka } = makeService({ userRegion: 'QA' });
    await expect(svc.banUser('user-1', 'fraud', 'admin-qa', 'QA')).resolves.toBeDefined();
    expect(kafka.publish).toHaveBeenCalled();
  });

  it('excludes an unattributable user from the Redis fallback list rather than showing them', async () => {
    const { svc } = makeService({
      index: [
        { id: 'a', regionCode: 'QA' },
        { id: 'b', regionCode: 'IN' },
        { id: 'c', regionCode: null, country: 'IN' },
      ],
      dbDown: true,
    });
    const res = await svc.getUsersList(1, 20, undefined, undefined, undefined, 'QA');
    expect(res.data.map((u: any) => u.id)).toEqual(['a']);
  });
});
```

`makeService` gains two options: `userRegion` (which the `getRawOne` double returns as `u_region_code`) and `dbDown`/`index` (which makes `isDbActive()` false and seeds `admin:users:index`).

Create `apps/api/apps/admin-service/src/admin-counters.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { AdminService } from './admin.service';

function svcWithRedis() {
  const keys: string[] = [];
  const redis = {
    get: vi.fn(async () => '0'),
    set: vi.fn(async (k: string) => void keys.push(k)),
    incrbyfloat: vi.fn(async (k: string) => void keys.push(k)),
    getJson: vi.fn(async () => null),
    setJson: vi.fn(async () => undefined),
  };
  const svc = Object.create(AdminService.prototype) as AdminService;
  Object.assign(svc, { redis, logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } });
  return { svc, redis, keys };
}

describe('dashboard counters carry a market', () => {
  it('buckets revenue and orders per market', async () => {
    const { svc, keys } = svcWithRedis();
    await (svc as any).incrementCounter('revenue', 100, 'QA');
    await (svc as any).incrementCounter('orders', 1, 'IN');
    expect(keys.some((k) => k.includes(':QA:'))).toBe(true);
    expect(keys.some((k) => k.includes(':IN:'))).toBe(true);
  });

  it('buckets an event with no market under GLOBAL rather than mixing it in', async () => {
    const { svc, keys } = svcWithRedis();
    await (svc as any).incrementCounter('revenue', 5);
    expect(keys.every((k) => k.includes(':GLOBAL:'))).toBe(true);
  });

  it('never writes the old unsegmented key shape', async () => {
    const { svc, keys } = svcWithRedis();
    await (svc as any).incrementCounter('revenue', 5, 'QA');
    expect(keys.some((k) => /^admin:counter:revenue:\d{4}-\d{2}-\d{2}$/.test(k))).toBe(false);
  });
});
```

- [ ] **Step 2: Run both — FAIL**

From `apps/api`:
`npx vitest run apps/admin-service/src/admin.scope.spec.ts` → FAIL: the predicates read `u.country`.
`npx vitest run apps/admin-service/src/admin-counters.spec.ts` → FAIL: `incrementCounter` takes two parameters and writes `admin:counter:revenue:<date>`.

- [ ] **Step 3: Write the backfill migration**

Create `apps/api/migrations/1786501900000-UserMarketBackfill.ts`:

```ts
import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — make `users.region_code` true for customers, not only for staff.
 *
 * `1786501600000-UserRegionScope` added the column for the regional-admin lock,
 * so only staff accounts ever received a value. Every admin query that needed
 * "which market is this user in?" therefore reached for `users.country`, which
 * carries a `'IN'` DEFAULT and is `'IN'` on every row in dev — so an IN-locked
 * admin listed and banned Qatari customers and a QA-locked admin saw nobody
 * (2026-09-12 audit, V6 / AUD2-009).
 *
 * The backfill derives the market from the customer's most recent order, which
 * is the one signal on the platform that is actually a market rather than a
 * default: `"order".orders.region_code` is written from the resolved market at
 * checkout. A customer with no order keeps NULL and is excluded from a locked
 * admin's list — fail closed, the same rule `assertInMarket(null, scope)`
 * applies to every other unattributable row.
 *
 * `users.country` is NOT dropped. It is the customer's own declared country for
 * addresses, tax and localisation; it is simply not the staff scope column.
 * The docstring on `user.entity.ts` says so after this migration.
 *
 * Main database (`users` + the `order` schema both live there) — see the
 * classification note in `data-source.main.ts`.
 */
export class UserMarketBackfill1786501900000 implements MigrationInterface {
  name = 'UserMarketBackfill1786501900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users" u
         SET "region_code" = UPPER(o."region_code")
        FROM (
          SELECT DISTINCT ON ("customerId") "customerId", "region_code"
            FROM "order"."orders"
           WHERE "region_code" IS NOT NULL AND "region_code" <> ''
           ORDER BY "customerId", "placedAt" DESC
        ) o
       WHERE u."id"::text = o."customerId"
         AND (u."region_code" IS NULL OR u."region_code" = '')
    `);

    // Staff accounts are the authority on their own market; never overwritten
    // above (the guard clause excludes a populated column), asserted here.
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "CHK_users_region_code_iso2"
        CHECK ("region_code" IS NULL OR "region_code" ~ '^[A-Z]{2}$')
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_region_code" ON "users" ("region_code")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_region_code"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_region_code_iso2"`,
    );
    // The backfilled values are not reverted: there is no record of which rows
    // were NULL before, and a blanket NULL would erase the staff locks too.
  }
}
```

Register it in `apps/api/data-source.main.ts` — append to the `migrations` array:

```ts
    'migrations/1786501900000-UserMarketBackfill.ts',
```

and add to the classification docstring, after the `1786501600000-UserRegionScope` paragraph:

```
 *   1786501900000-UserMarketBackfill
 *       Backfills `users.region_code` from `"order".orders.region_code`, adds
 *       the ISO-2 CHECK and `IDX_users_region_code`. Reads the `order` schema
 *       and writes `users`; both live in this database.
```

`data-source.main.spec.ts` asserts that every file in `migrations/` is named in exactly one DataSource list, so omitting this line fails the suite — which is the point.

- [ ] **Step 4: Apply it and check what it produced**

```bash
cd apps/api && npx typeorm-ts-node-commonjs migration:run -d data-source.main.ts
docker exec kartseek-postgres psql -U postgres -d kartseek_db -c \
  "SELECT role, region_code, count(*) FROM public.users GROUP BY 1,2 ORDER BY 1,2"
```

Expected: the three staff rows keep `IN`/`QA`/`AE`; customers who have placed an order gain that order's market (dev holds 4 such customers across `AE`, `IN`, `QA`, `SA`); the remaining rows stay NULL. If **no** customer gains a market the probe in Step 8 will be vacuous — place one order per market through the storefront, or `UPDATE "order".orders SET region_code='QA' WHERE id IN (…)` on a handful of rows, and re-run.

- [ ] **Step 5: Switch the queries to the column the claim comes from**

`apps/api/apps/admin-service/src/admin.service.ts`.

Dashboard aggregate, line 113:

```ts
           FROM public.users${scope ? ' WHERE region_code = $2' : ''}`,
```

`getUsersList`, lines 241-252:

```ts
    const market = marketPredicate(scope, country);

    if (this.isDbActive()) {
      try {
        const qb = this.em!.createQueryBuilder().select('u').from('users', 'u');

        if (role) qb.andWhere('u.role = :role', { role });
        // `region_code`, not `country`: the lock in the token is minted from
        // `users.region_code`, and `users.country` carries an 'IN' DEFAULT that
        // made every customer look Indian (audit V6). A scoped caller also gets
        // NULL rows excluded — an unattributable user is nobody's to moderate.
        if (scope) qb.andWhere('u.region_code = :scope', { scope: market });
        else if (market) qb.andWhere('u.region_code = :market', { market });
```

Redis fallback, lines 265-290 — replace the `country` filter and the market filter:

```ts
if (role) filtered = filtered.filter((u) => u.role === role);
if (market && !scope) {
  filtered = filtered.filter(
    (u) => marketPredicate(undefined, u.regionCode ?? u.region_code) === market,
  );
}
if (search) {
  const s = search.toLowerCase();
  filtered = filtered.filter(
    (u) => u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s),
  );
}
// A locked admin must not see every market's users just because the DB
// query above failed or is switched off — fail closed: a user with no
// resolvable market is excluded, not shown. `country` is deliberately not a
// fallback source here; it is 'IN' on every row and would re-open V6.
if (scope) {
  filtered = filtered.filter(
    (u) => marketPredicate(undefined, u.regionCode ?? u.region_code) === marketPredicate(scope),
  );
}
```

`userMarket`, lines 335-343:

```ts
  /** The market a user belongs to, for the scope check on ban/unban. */
  private async userMarket(userId: string): Promise<string | null> {
    if (!this.isDbActive() || !this.em) return null;
    const row = await this.em
      .createQueryBuilder()
      .select(['u.id', 'u.region_code'])
      .from('users', 'u')
      .where('u.id = :id', { id: userId })
      .getRawOne<{ u_id: string; u_region_code: string | null }>();
    if (!row) throw new NotFoundException('User not found');
    return row.u_region_code ?? null;
  }
```

Note `banUser`/`unbanUser` currently guard the assert with `if (scope)`. Leave that: `assertInMarket` already no-ops without a lock, and the guard saves a query for a global admin.

- [ ] **Step 6: Give the counters a market**

Lines 616-651 — `incrementCounter` and its two call sites:

```ts
  /**
   * A dashboard counter, bucketed by market.
   *
   * These keys had no market segment at all, so there was exactly one revenue
   * figure and one order count for the whole platform and no per-market number
   * could ever be produced from them (audit C §2 #5 / AUD2-095). `GLOBAL` is
   * the bucket for an event that genuinely carries no market, so "not yet
   * attributed" stays distinguishable from "everyone's".
   */
  private async incrementCounter(
    kind: 'revenue' | 'orders',
    amount: number,
    market?: string,
  ): Promise<void> {
    const bucket = marketPredicate(market) ?? 'GLOBAL';
    const dateKey = new Date().toISOString().slice(0, 10);
    const key = `admin:counter:${kind}:${bucket}:${dateKey}`;
    const current = Number((await this.redis.get(key)) ?? 0);
    await this.redis.set(key, String(current + amount), AdminService.COUNTER_TTL_SECONDS);
  }
```

Every caller passes the market from the event it is processing (`event.regionCode ?? event.countryCode ?? event.country`). Find them with `grep -n "incrementCounter(" apps/api/apps/admin-service/src/admin.service.ts` and thread the value through; an event with no such field passes `undefined` and lands in `GLOBAL`.

Leave the reader alone in this task — `getRevenueReport` still refuses a scoped caller, and Task 9 replaces it with a real order-service query. Reading a `GLOBAL` bucket as if it were a market is the failure mode both halves exist to prevent.

- [ ] **Step 7: Run the suites and the build**

From `apps/api`: `npx vitest run apps/admin-service` → all green including the 9 new `it`s; `npx vitest run` → **701 passed**; `npx nest build --all` → exit 0.

- [ ] **Step 8: Live probe**

```bash
printf 'IN-01 IN admin /admin/users markets: '
curl -s -H "Authorization: Bearer $IN" "$B/admin/users?limit=100" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
      const rows=d.data?.data??d.data??[];
      JSON.stringify({n:rows.length,markets:[...new Set(rows.map(u=>u.regionCode??u.region_code??null))]})'
printf 'QA admin /admin/users markets: '
curl -s -H "Authorization: Bearer $QA" "$B/admin/users?limit=100" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
      const rows=d.data?.data??d.data??[];
      JSON.stringify({n:rows.length,markets:[...new Set(rows.map(u=>u.regionCode??u.region_code??null))]})'
printf 'QA admin asking for IN: '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" "$B/admin/users?country=IN"
QAUSER=$(docker exec kartseek-postgres psql -U postgres -d kartseek_db -tAc \
  "SELECT id FROM public.users WHERE region_code='QA' AND role='customer' LIMIT 1")
printf 'X-07 IN admin bans a QA customer: '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $IN" \
  -H 'Content-Type: application/json' -d '{"reason":"probe"}' "$B/admin/users/$QAUSER/ban"
printf 'X-56 QA admin bans the same QA customer (control): '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"reason":"probe"}' "$B/admin/users/$QAUSER/ban"
curl -s -o /dev/null -X PUT -H "Authorization: Bearer $QA" "$B/admin/users/$QAUSER/unban"
```

Expected: the IN list shows `markets: ["IN"]` with `n > 0`; the QA list shows `markets: ["QA"]` with `n > 0`; `?country=IN` as QA → `403`; IN banning a QA customer → `403`; QA banning it → `200`. If either list comes back `n: 0`, the backfill produced nothing for that market — Step 4 says what to do; an empty list is SKIPPED, never PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/migrations/1786501900000-UserMarketBackfill.ts \
        apps/api/data-source.main.ts \
        apps/api/apps/admin-service/src/admin.service.ts \
        apps/api/apps/admin-service/src/admin.scope.spec.ts \
        apps/api/apps/admin-service/src/admin-counters.spec.ts
git commit -m "fix(admin-core): users are scoped on region_code, backfilled from orders; counters carry a market" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5 (R5): The unscoped module duplicates — 30 restaurant routes deleted, 11 grocery and 7 pharmacy routes scoped, and one market match for restaurant

**Closes: AUD2-008, AUD2-010, AUD2-011, AUD2-079** (V5, V7, V9 / E F-05, F-07, F-08, I4/F-19; §13 rows X-12, X-36, X-39, X-41, IN-04)

Three modules expose a second, unscoped admin surface beside the scoped `/admin/<module>/*` one. They are not identical cases and must not get identical treatment:

- **Restaurant** — 30 routes at `restaurant.controller.ts:650-1244` duplicating decisions `/admin/restaurant/*` already scopes. `grep` over `apps/web/src`, `packages/*/src`, the Flutter apps and the Postman collection finds **zero** callers. **Delete them.**
- **Grocery** — 11 routes the admin console genuinely calls (`packages/shared-core/src/api/admin-grocery.ts:150,157,159` hit `/grocery/admin/products/*`, and there is no `/admin/grocery/products/pending` twin). Deleting them breaks the moderation screen, which the constraints forbid. **Scope them in place.**
- **Pharmacy** — 7 routes, no `assertInMarket` anywhere in the module. Scope the routes **and** add the module's first record assertions.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/restaurant.controller.ts` (delete lines 650-1244)
- Modify: `modules/restaurant/backend/src/restaurant.service.ts:1214` and its exact-match siblings
- Modify: `apps/api/apps/api-gateway/src/controllers/grocery.controller.ts:172,180,190,273,302,310,786,799,926,934` + the two `admin/catalog/backfill-*` routes
- Modify: `modules/grocery/backend/src/grocery.controller.ts:581,658,678,803,808` and `grocery.service.ts:531,579,1147,2492,2559`
- Modify: `apps/api/apps/api-gateway/src/controllers/pharmacy.controller.ts:465-521`
- Modify: `modules/pharmacy/backend/src/pharmacy.controller.ts:468-490`, `pharmacy.service.ts:761-812`
- Create: `modules/pharmacy/backend/src/pharmacy-scope.spec.ts`
- Create: `modules/grocery/backend/src/grocery-admin-scope.spec.ts`
- Modify: `modules/restaurant/backend/src/restaurant.service.spec.ts` (extend)

**Interfaces:**

- Removed: the 30 `/restaurants/admin/*` and `/restaurants/:id/{approve,reject,analytics,orders,payouts}` and `/restaurants/approvals/pending` routes. `/admin/restaurant/*` (17 routes) is the only restaurant admin surface from here on; the MODULES plan adds handlers there, never back here.
- Produces: `normaliseMarket` gains the prefix rule — `normaliseMarket('QA-DOH')` returns `'QA'`. This is the single place restaurant's `LEFT(regionCode,2)` and its exact matches converge (AUD2-079 / I4). It is additive for every other caller: an ISO-2 input is unchanged.
- Produces RPC payload additions: `set_grocery_product_approval { …, scope? }`, `get_grocery_pending_products { …, scope? }`, `set_grocery_brand_approval { …, scope? }`, `create_grocery_category | update_grocery_category { …, scope? }`, `approve_pharmacy_store | suspend_pharmacy_store | set_pharmacy_commission | verify_prescription { …, scope? }`.
- Produces service signatures: `setProductApproval(productId, status, reason?, actor?, scope?)`, `getPendingProducts(page, limit, storeId?, scope?)`, `setBrandApproval(brandId, status, reason?, scope?)`, `approveStore(storeId, scope?)`, `suspendStore(storeId, reason?, scope?)`, `setCommission(storeId, rate, scope?)`.

- [ ] **Step 1: Prove the restaurant routes are dead before deleting them**

```bash
grep -rn "restaurants/admin\|restaurants/approvals\|/restaurants/[^\"']*\/\(approve\|reject\|payouts\|analytics\)" \
  --include=*.ts --include=*.tsx --include=*.dart --include=*.json \
  apps packages modules postman 2>/dev/null \
  | grep -v node_modules | grep -v '\.next' \
  | grep -v 'apps/api/apps/api-gateway/src/controllers/restaurant.controller.ts'
```

Expected: **no output**. Anything printed is a live caller and must be repointed at its `/admin/restaurant/*` twin in the same commit; if no twin exists, scope the route in place instead of deleting it and record that in the task report.

- [ ] **Step 2: Write the failing restaurant market-match spec**

Append to `modules/restaurant/backend/src/restaurant.service.spec.ts`:

```ts
describe('one market match on both sides of the restaurant reads', () => {
  it('finds a QA-DOH restaurant for a QA admin list and for a QA customer discovery', async () => {
    // Discovery prefix-matched LEFT(regionCode,2) while the admin list matched
    // exactly, so a 'QA-DOH' row was invisible to a QA admin AND 403'd on
    // approve — the restaurant existed for shoppers and not for the people who
    // moderate it (audit I4).
    const { svc, admin, discovery } = serviceWithRestaurants([
      { id: 'r-doh', regionCode: 'QA-DOH' },
      { id: 'r-qa', regionCode: 'QA' },
      { id: 'r-in', regionCode: 'IN' },
    ]);
    const adminRows = await svc.getAdminRestaurants({ regionCode: 'QA' });
    const publicRows = await svc.getRestaurants({ regionCode: 'QA' });
    expect(adminRows.data.map((r: any) => r.id).sort()).toEqual(['r-doh', 'r-qa']);
    expect(publicRows.data.map((r: any) => r.id).sort()).toEqual(['r-doh', 'r-qa']);
    expect(admin.predicates).toEqual(discovery.predicates);
  });

  it('approves a QA-DOH restaurant for a QA-scoped admin', async () => {
    const { svc } = serviceWithRestaurants([{ id: 'r-doh', regionCode: 'QA-DOH' }]);
    await expect(svc.approveRestaurant('r-doh', 'admin-qa', 'QA')).resolves.toMatchObject({
      success: true,
    });
  });

  it('still refuses an IN restaurant for a QA-scoped admin', async () => {
    const { svc } = serviceWithRestaurants([{ id: 'r-in', regionCode: 'IN' }]);
    await expect(svc.approveRestaurant('r-in', 'admin-qa', 'QA')).rejects.toThrow(
      'This restaurant belongs to IN, not to the QA market.',
    );
  });

  it('rejectRestaurant takes a scope like its three siblings', async () => {
    const { svc } = serviceWithRestaurants([{ id: 'r-in', regionCode: 'IN' }]);
    await expect(svc.rejectRestaurant('r-in', 'blurry', 'QA')).rejects.toThrow(
      'not to the QA market',
    );
  });
});
```

- [ ] **Step 3: Normalise the market once, in `@app/common`**

`apps/api/libs/common/src/market/market-scope.ts` — replace `normaliseMarket`:

```ts
/**
 * A market code, normalised to the platform's ISO-2 form.
 *
 * Sub-region codes ('QA-DOH', 'IN-MH') normalise to their country, because the
 * platform's unit of scope is the country: `users.region_code`, the JWT claim
 * and every `?country=` filter are ISO-2. Restaurant stored sub-regions and
 * then matched them two different ways — a prefix on the customer read, an
 * exact string on the admin read — so a 'QA-DOH' restaurant was invisible to
 * the QA admin who was supposed to moderate it and 403'd on approve (audit I4).
 * Normalising here means one rule serves both sides and no caller has to
 * remember which.
 */
export function normaliseMarket(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toUpperCase();
  if (!v) return undefined;
  const country = v.split(/[-_]/)[0];
  return country.length >= 2 ? country.slice(0, 2) : undefined;
}
```

`market-scope.spec.ts` gains:

```ts
it('normalises a sub-region code to its country', () => {
  expect(normaliseMarket('QA-DOH')).toBe('QA');
  expect(normaliseMarket('in_mh')).toBe('IN');
  expect(normaliseMarket('Q')).toBeUndefined();
});
```

Then in `modules/restaurant/backend/src/restaurant.service.ts`, make the admin reads use the same prefix predicate `scopeToRegion` already uses at line 1214 — replace the two `where.regionCode = regionCode` exact matches (`getAdminRestaurants` around line 1050 and its sibling) with a query-builder call through `scopeToRegion`, and update `scopeToRegion`'s docstring to point at `normaliseMarket` as the source of the rule. Thread `scope?: string` onto `rejectRestaurant` and call `assertInMarket(restaurant.regionCode, scope, 'restaurant', this.logger)` exactly as `approveRestaurant` (line 980) and `suspendRestaurant` (line 1005) already do — `rejectRestaurant` is the one decision of the four that never checks.

`assertInMarket` routes both sides through `normaliseMarket`, so `assertInMarket('QA-DOH', 'QA', …)` now passes with no change at the call sites.

- [ ] **Step 4: Delete the 30 restaurant gateway routes**

Delete `apps/api/apps/api-gateway/src/controllers/restaurant.controller.ts` lines 650-1244 in full, and leave a comment where they were:

```ts
// The 30 admin routes that used to live here (`/restaurants/admin/*`,
// `/restaurants/:id/{approve,reject,analytics,orders,payouts}`,
// `/restaurants/approvals/pending`) were deleted on 2026-09-12. They carried
// `@Roles(ADMIN, SUPER_ADMIN)`, called no scope helper and sent no `scope`,
// so they were an unscoped twin of decisions `/admin/restaurant/*` already
// scopes — `POST /restaurants/admin/<IN-id>/block` answered 200 for a
// QA-locked admin (audit V5). No client called them: the console's
// `admin-restaurant.ts` uses `/admin/restaurant/*` throughout. New restaurant
// admin work belongs in `admin-restaurant.controller.ts`, never here.
```

Remove any import left unused by the deletion (`RolesGuard`, `Roles`, `UserRole` may still be needed by the surviving seller routes — let `nest build --all` and the lint gate decide, do not guess).

- [ ] **Step 5: Scope the grocery duplicates in place**

`apps/api/apps/api-gateway/src/controllers/grocery.controller.ts` — add, next to `actor()` at line 90:

```ts
  /**
   * The market this request may act in, as `scope` for grocery-service.
   *
   * These routes are the admin console's real moderation path — the console
   * calls `/grocery/admin/products/*` because `/admin/grocery/*` has no
   * pending-products twin — so they are scoped rather than deleted. They sent
   * no `scope` at all, which made `assertInMarket(…, undefined)` a no-op and
   * let any admin approve or reject any market's listings, brands, flash deals
   * and categories (audit V7).
   */
  private scopeOf(
    req: any,
    requested?: string,
    what = 'that market',
  ): { scope?: string; market?: string } {
    const market = resolveMarket(req, requested, what);
    const scope = marketScopeOf(req).locked ? market : undefined;
    return { scope, market };
  }
```

with `import { marketScopeOf, resolveMarket } from '../guards/market-scope';` and `import { refuseLockedAdmin } from '../guards/market-scope';` (one import line, three names).

Then, per route:

| Route                                                                                    | Change                                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /grocery/categories` (:172)                                                        | `refuseLockedAdmin(req, 'grocery taxonomy', 'The grocery category tree is managed globally.')` — matches the marketplace taxonomy rule (§2(b) I8) and closes X-12 |
| `PATCH /grocery/categories/:id` (:180)                                                   | same                                                                                                                                                              |
| `DELETE /grocery/categories/cache` (:190)                                                | same                                                                                                                                                              |
| `POST /grocery/admin/catalog/rebuild-tree`, `/backfill-entities`, `/backfill-warehouses` | same — platform-wide catalogue maintenance                                                                                                                        |
| `PATCH /grocery/admin/brands/:brandId/approve` (:302)                                    | `const { scope } = this.scopeOf(req, undefined, 'that brand request');` → `scope` in the payload                                                                  |
| `PATCH /grocery/admin/brands/:brandId/reject` (:310)                                     | same                                                                                                                                                              |
| `GET /grocery/admin/products/pending` (:780)                                             | `const { scope, market } = this.scopeOf(req, regionCode, 'those listings');` → `{ …, regionCode: market, scope }`                                                 |
| `PATCH /grocery/admin/products/:productId/approve` (:786)                                | `const { scope } = this.scopeOf(req, undefined, 'that listing');` → `scope` in the payload                                                                        |
| `PATCH /grocery/admin/products/:productId/reject` (:799)                                 | same                                                                                                                                                              |
| `PATCH /grocery/flash-deals/:id/approve` (:926)                                          | `const { scope } = this.scopeOf(req, undefined, 'that flash deal');` → `scope` (the backend already reads it — `grocery.service.ts:3337`)                         |
| `PATCH /grocery/flash-deals/:id/reject` (:934)                                           | same (`grocery.service.ts:3368`)                                                                                                                                  |

Each of those routes also gains its permission key: `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.grocery')` — the key exists in `ADMIN_PERMISSIONS` (`permissions.ts:66`).

- [ ] **Step 6: Make grocery-service read the scope it is now sent**

`modules/grocery/backend/src/grocery.controller.ts`:

```ts
  @MessagePattern({ cmd: 'set_grocery_product_approval' })
  msgSetProductApproval(
    @Payload()
    d: {
      productId: string;
      status: 'APPROVED' | 'REJECTED';
      reason?: string;
      actorId?: string;
      actorRole?: string;
      actorIp?: string;
      scope?: string;
    },
  ) {
    return this.svc.setProductApproval(
      requireId(d?.productId, 'product'),
      d?.status,
      d?.reason,
      { actorId: d?.actorId, actorRole: d?.actorRole, actorIp: d?.actorIp },
      d?.scope,
    );
  }

  @MessagePattern({ cmd: 'get_grocery_pending_products' })
  msgPendingProducts(@Payload() d: { page?: number; limit?: number; storeId?: string; scope?: string }) {
    return this.svc.getPendingProducts(d?.page, d?.limit, d?.storeId, d?.scope);
  }

  @MessagePattern({ cmd: 'set_grocery_brand_approval' })
  msgSetBrandApproval(
    @Payload() d: { brandId: string; status: 'APPROVED' | 'REJECTED'; reason?: string; scope?: string },
  ) {
    return this.svc.setBrandApproval(requireId(d?.brandId, 'brand'), d?.status, d?.reason, d?.scope);
  }
```

`modules/grocery/backend/src/grocery.service.ts` — `setProductApproval` (line 2492), after the `product` lookup at line 2500:

```ts
if (!product) throw new NotFoundException(`Product ${productId} not found`);
// A grocery item carries no market of its own; the store that stocks it
// does, and that join is the documented attribution for the whole grocery
// catalogue (`admin/admin.service.ts:407-420`).
assertInMarket(await this.storeMarket(product.storeId), scope, 'listing', this.logger);
```

`getPendingProducts` (line 2559) gains the predicate rather than a post-filter, so pagination cannot widen it:

```ts
  async getPendingProducts(page = 1, limit = 30, storeId?: string, scope?: string) {
    ({ page, limit } = paginate(page, limit, 30));
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .leftJoin('grocery_stores', 'store', 'store.id = item.storeId')
      .where('item.approvalStatus = :status', { status: 'PENDING' });
    if (storeId) qb.andWhere('item.storeId = :storeId', { storeId });
    // In the query, not after it: a post-filter over `take(limit)` rows returns
    // a short page that looks like "no listings awaiting review" (audit X-57).
    applyMarketFilter(qb, 'store.regionCode', scope);
```

and `setBrandApproval` (line 1147) resolves the requesting store's market the same way. Add the shared helper:

```ts
  /** The market a grocery store trades in — the attribution join for its items. */
  private async storeMarket(storeId: string | null | undefined): Promise<string | null> {
    if (!storeId) return null;
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      select: ['id', 'regionCode'],
    });
    return store?.regionCode ?? null;
  }
```

`applyMarketFilter` is defined in Task 11; until that task lands, write `if (scope) qb.andWhere('store.regionCode = :scope', { scope })` and Task 11's step 4 converts it.

- [ ] **Step 7: Scope the pharmacy routes, and give the module its first `assertInMarket`**

`apps/api/apps/api-gateway/src/controllers/pharmacy.controller.ts:465-521` — add the same `private scopeOf` as Step 5, then:

```ts
  @Post('admin/:storeId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy')
  @ApiOperation({ summary: 'Admin: approve pharmacy store' })
  approveStore(@Req() req: any, @Param('storeId', ParseUUIDPipe) storeId: string) {
    const { scope } = this.scopeOf(req, undefined, 'that pharmacy');
    return this.send('approve_pharmacy_store', { storeId, scope });
  }
```

and the same shape for `suspend` (:474), `admin/stores` (:482 — `{ status, page, limit, regionCode: market, scope }`), `admin/:storeId/commission` (:492), `admin/prescriptions/:prescId/verify` (:500) and `admin/prescriptions/pending` (:508). `GET /pharmacy/franchise/:franchiseId/stores` (:521) is franchise-scoped, not market-scoped — it gets `refuseLockedAdmin(req, 'franchise estates')` until Task 6 resolves franchise tenancy, and Task 6 replaces that with the owner check.

`modules/pharmacy/backend/src/pharmacy.service.ts` — the module's first three record assertions:

```ts
  async approveStore(storeId: string, scope?: string) {
    const store = await this.storeRepo.findOneBy({ id: storeId });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);
    // The first `assertInMarket` in this module. Until now suspend, approve and
    // commission decisions crossed markets freely — `PUT /pharmacy/admin/<IN
    // store>/commission {"rate":90}` answered 200 for a QA admin (audit V9).
    assertInMarket(store.regionCode, scope, 'pharmacy', this.logger);
    store.status = PharmacyStoreStatus.APPROVED;
```

```ts
  async suspendStore(storeId: string, reason?: string, scope?: string) {
    const store = await this.storeRepo.findOneBy({ id: storeId });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);
    assertInMarket(store.regionCode, scope, 'pharmacy', this.logger);
```

```ts
  async setCommission(storeId: string, rate: number, scope?: string) {
    const store = await this.storeRepo.findOneBy({ id: storeId });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);
    assertInMarket(store.regionCode, scope, 'pharmacy', this.logger);
    // `update(storeId, …)` used to write without reading, so there was no row
    // to check a market against and no 404 for an id that matched nothing.
    await this.storeRepo.update(storeId, { commissionRate: rate });
    return { success: true, storeId, commissionRate: rate };
  }
```

with `import { assertInMarket } from '@app/common';` at the top of the file.

**F-34 note, recorded not fixed here:** pharmacy stores are seeded with `regionCode` values like `MUM-CBD`. Step 3's `normaliseMarket` turns those into `MU`, which is Mauritius, not India — so `assertInMarket` would refuse an Indian admin on an Indian store. Before this task is done, reseed them as ISO-2:

```bash
docker exec kartseek-postgres-pharmacy psql -U kartseek -d kartseek_pharmacy -c \
  "UPDATE pharmacy.pharmacy_stores SET \"regionCode\" = 'IN' WHERE \"regionCode\" LIKE 'MUM-%'"
docker exec kartseek-postgres-pharmacy psql -U kartseek -d kartseek_pharmacy -tAc \
  "SELECT \"regionCode\", count(*) FROM pharmacy.pharmacy_stores GROUP BY 1"
```

Expected afterwards: only two-letter codes. Fix the seed file in `modules/pharmacy/backend/src/seeds/` in the same commit, or a reseed puts them back.

- [ ] **Step 8: Write the two module specs**

`modules/pharmacy/backend/src/pharmacy-scope.spec.ts` — four `it`s, same shape as `modules/marketplace/backend/src/admin/admin-scope.spec.ts`: refuse approve / suspend / setCommission on an `IN` store for a `QA` scope with no `save` or `update` called; allow all three on a `QA` store; allow all three for a global admin on any store; refuse a store whose `regionCode` is null.

`modules/grocery/backend/src/grocery-admin-scope.spec.ts` — five `it`s: `setProductApproval` refuses an item in an IN store and writes nothing; allows one in a QA store; `getPendingProducts` puts the market in the **query** (assert the recorded predicates contain `store.regionCode`) rather than filtering afterwards; `setBrandApproval` refuses cross-market; a global admin is unaffected.

- [ ] **Step 9: Run everything**

```
cd modules/restaurant && npx vitest run           # 22 passed (18 + 4)
cd ../pharmacy       && npx vitest run           # 16 passed (12 + 4)
cd ../grocery        && npx vitest run           # 109 passed (104 + 5)
cd ../../apps/api    && npx vitest run           # 702 passed (701 + 1 in market-scope.spec)
npx nest build --all                             # exit 0
cd ../.. && for m in restaurant pharmacy grocery; do (cd modules/$m/backend && npx nest build); done
```

- [ ] **Step 10: Live probe**

```bash
INREST=$(docker exec kartseek-postgres-restaurant psql -U kartseek -d kartseek_restaurant -tAc \
  "SELECT id FROM restaurant.restaurants WHERE \"regionCode\" LIKE 'IN%' LIMIT 1")
INITEM=$(docker exec kartseek-postgres-grocery psql -U kartseek -d kartseek_grocery -tAc \
  "SELECT i.id FROM grocery.grocery_items i JOIN grocery.grocery_stores s ON s.id = i.\"storeId\"
   WHERE s.region_code='IN' LIMIT 1")
INPHARM=$(docker exec kartseek-postgres-pharmacy psql -U kartseek -d kartseek_pharmacy -tAc \
  "SELECT id FROM pharmacy.pharmacy_stores WHERE \"regionCode\"='IN' LIMIT 1")

printf 'X-36 POST /restaurants/admin/<IN>/block: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" "$B/restaurants/admin/$INREST/block"
printf 'X-35 PATCH /admin/restaurant/restaurants/<IN>/suspend (still works): '
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH -H "Authorization: Bearer $QA" \
  "$B/admin/restaurant/restaurants/$INREST/suspend"
printf 'X-12 POST /grocery/categories: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"name":"Probe","slug":"probe"}' "$B/grocery/categories"
printf 'X-39 PATCH /grocery/admin/products/<IN>/reject: '
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"reason":"probe"}' "$B/grocery/admin/products/$INITEM/reject"
printf 'grocery pending list markets for QA: '
curl -s -H "Authorization: Bearer $QA" "$B/grocery/admin/products/pending?limit=100" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const r=d.data?.data??d.data??[];
      JSON.stringify({n:r.length,stores:[...new Set(r.map(x=>x.storeId))].length})'
printf 'X-41 POST /pharmacy/admin/<IN>/suspend: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"reason":"probe"}' "$B/pharmacy/admin/$INPHARM/suspend"
printf 'IN->IN pharmacy suspend (control): '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $IN" \
  -H 'Content-Type: application/json' -d '{"reason":"probe"}' "$B/pharmacy/admin/$INPHARM/suspend"
printf 'IN-04 IN admin restaurant count (must include IN-MH rows): '
curl -s -H "Authorization: Bearer $IN" "$B/admin/restaurant/restaurants?limit=100" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const r=d.data?.data??d.data??[];
      JSON.stringify({n:r.length,markets:[...new Set(r.map(x=>x.regionCode))]})'
```

Expected: `404` (the route is gone — not 403, the route no longer exists), `403`, `403`, `403`, a QA-only pending list with `n > 0`, `403`, `200`, and an IN restaurant list whose `markets` array may contain `IN` **and** `IN-MH` while `n` equals the database's own count:

```bash
docker exec kartseek-postgres-restaurant psql -U kartseek -d kartseek_restaurant -tAc \
  "SELECT count(*) FROM restaurant.restaurants WHERE LEFT(\"regionCode\",2)='IN'"
```

- [ ] **Step 11: Commit (one commit; all API)**

```bash
git add apps/api/apps/api-gateway/src/controllers/restaurant.controller.ts \
        apps/api/apps/api-gateway/src/controllers/grocery.controller.ts \
        apps/api/apps/api-gateway/src/controllers/pharmacy.controller.ts \
        apps/api/libs/common/src/market/market-scope.ts \
        apps/api/libs/common/src/market/market-scope.spec.ts \
        modules/restaurant/backend/src modules/grocery/backend/src modules/pharmacy/backend/src
git commit -m "fix(modules): the unscoped admin twins are gone or scoped; one market match for restaurant" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6 (R6): The remaining unscoped gateway admin routes — payments, logistics and product reports, franchise tenancy, taxonomy aliases

**Closes: AUD2-012, AUD2-014, AUD2-015, AUD2-083** (V8, V10, V12 / E F-09, F-11, F-13, I8/F-21; §13 rows X-24, X-46, X-47)

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/payment.controller.ts:343-390`
- Modify: `apps/api/apps/payment-service/src/payment.controller.ts` + `payment.service.ts` (the six read handlers)
- Modify: `apps/api/apps/api-gateway/src/controllers/marketplace.controller.ts:727,745,772,1097-1174,2122`
- Modify: `modules/marketplace/backend/src/fulfillment/fulfillment.service.ts` (delivery-assignment writes) and `admin/admin.service.ts` (product reports)
- Modify: `apps/api/apps/api-gateway/src/controllers/franchise.controller.ts` (all 54 routes)
- Modify: `modules/franchise/backend/src/franchise.controller.ts`, `franchise.service.ts`
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts:750,791,838,882,3290`
- Create: `apps/api/apps/api-gateway/src/guards/franchise-access.guard.ts` + `.spec.ts`
- Create: `apps/api/apps/api-gateway/src/controllers/payment-scope.spec.ts`
- Create: `apps/api/apps/api-gateway/src/controllers/taxonomy-write-refusal.spec.ts`

**Interfaces:**

- Produces: `FranchiseAccessGuard` — the franchise twin of `SellerOwnershipGuard`. Resolves `:id` over TCP (`franchise.get_access` → `{ id, ownerId, countryCode }`, cached 60 s under `franchise-scope:v1:<id>`), admits the owner, admits a global staff role, market-checks a locked staff role, refuses everyone else. Bound class-wide on `FranchiseGatewayController`; `@Public()` routes and `GET /franchise/me` are exempt because they carry no `:id`.
- Produces RPC: `franchise.get_access { id } → { id, ownerId, countryCode }` (new, read-only), plus `scope?: string` on every `franchise.*` command that takes an `id`.
- Produces payment payload additions: `get_payment_dashboard | get_settlement_dashboard | get_seller_balance | get_franchise_earnings | get_module_revenue | get_reconciliation { …, countryCode?: string, scope?: string }`. `payments.countryCode` and `invoices.countryCode` already exist and were never read; these six handlers now predicate on them.
- Produces: `delivery_assignments` writes assert `assignment.regionCode` (the column exists and nothing read it).
- Behaviour change: `GET /franchise/:id/*` returns **403** for a caller who neither owns the franchise nor holds a staff role, where it previously returned 200 for **any authenticated user** — including a plain customer (X-47). The seller and franchise portals pass `:id` from their own `GET /franchise/me`, so no legitimate client is affected; verify with the probe in Step 9 before committing.

- [ ] **Step 1: Write the failing payment spec**

Create `apps/api/apps/api-gateway/src/controllers/payment-scope.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { PaymentGatewayController } from './payment.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build() {
  const client = { send: vi.fn(() => of({ data: [] })) };
  const ctrl = Object.create(PaymentGatewayController.prototype) as PaymentGatewayController;
  Object.assign(ctrl, { paymentClient: client, logger: { error: vi.fn() } });
  (ctrl as any).send = (cmd: string, payload: any) => {
    client.send({ cmd }, payload);
    return Promise.resolve({ data: [] });
  };
  return { ctrl, client };
}

describe('/payments/admin/* carries the caller market', () => {
  it('forwards the locked market on all six reads', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(qaAdmin), {});
    await ctrl.getSettlementDashboard(req(qaAdmin), {});
    await ctrl.getSellerBalance(req(qaAdmin), 'seller-1');
    await ctrl.getFranchiseEarnings(req(qaAdmin), 'fr-1');
    await ctrl.getModuleRevenue(req(qaAdmin), 'marketplace', '2026-09-01', '2026-09-30');
    await ctrl.getReconciliation(req(qaAdmin), '2026-09-01');
    expect(client.send.mock.calls).toHaveLength(6);
    for (const call of client.send.mock.calls) {
      expect(call[1]).toMatchObject({ countryCode: 'QA', scope: 'QA' });
    }
  });

  it('refuses a locked admin who filters for another market', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.getDashboard(req(qaAdmin), { countryCode: 'IN' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('leaves a global admin unscoped, and passes their own filter through', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(globalAdmin), { countryCode: 'in' });
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('drops a client-supplied `scope` — only the gateway writes that key', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(globalAdmin), { scope: 'IN', countryCode: 'QA' } as any);
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });
});
```

Run from `apps/api`: `npx vitest run apps/api-gateway/src/controllers/payment-scope.spec.ts` → FAIL, the handlers take no `@Req()` and forward `filters` verbatim (so test 4 also proves the current code would pass a forged `scope` straight to payment-service).

- [ ] **Step 2: Scope the six payment reads**

`apps/api/apps/api-gateway/src/controllers/payment.controller.ts`. Add the standard `private scopeOf` (as in Task 2 Step 6) and rewrite the block at 343-390:

```ts
  // ── Settlement (admin) ────────────────────────────────────────────────────
  //
  // These six read money across markets. `payments.countryCode` and
  // `invoices.countryCode` have existed the whole time and nothing read them,
  // so `GET /payments/admin/settlement/seller/<IN-seller>` answered 200 for a
  // QA-locked admin (audit V8). `filters` is no longer forwarded verbatim: a
  // client-supplied `scope` key would otherwise reach payment-service as if the
  // gateway had written it.

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('admin/dashboard')
  @ApiOperation({ summary: 'Payment dashboard for one market, or all' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getDashboard(@Req() req: any, @Query() filters: PaymentAdminFilterDto) {
    const { scope, market } = this.scopeOf(req, filters?.countryCode, 'that dashboard');
    return this.send('get_payment_dashboard', {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      countryCode: market,
      scope,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('admin/settlement/dashboard')
  async getSettlementDashboard(@Req() req: any, @Query() filters: PaymentAdminFilterDto) {
    const { scope, market } = this.scopeOf(req, filters?.countryCode, 'that dashboard');
    return this.send('get_settlement_dashboard', {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      countryCode: market,
      scope,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('admin/settlement/seller/:sellerId')
  async getSellerBalance(@Req() req: any, @Param('sellerId') sellerId: string) {
    const { scope, market } = this.scopeOf(req, undefined, "that seller's balance");
    return this.send('get_seller_balance', { sellerId, countryCode: market, scope });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.view')
  @Get('admin/settlement/franchise/:franchiseId')
  async getFranchiseEarnings(@Req() req: any, @Param('franchiseId') franchiseId: string) {
    const { scope, market } = this.scopeOf(req, undefined, "that franchise's earnings");
    return this.send('get_franchise_earnings', { franchiseId, countryCode: market, scope });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.reports')
  @Get('admin/revenue/:module')
  async getModuleRevenue(
    @Req() req: any,
    @Param('module') module: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that report');
    return this.send('get_module_revenue', { module, startDate, endDate, countryCode: market, scope });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:finance.reports')
  @Get('admin/reconciliation/:date')
  async getReconciliation(@Req() req: any, @Param('date') date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new BadRequestException('date must be a calendar date in YYYY-MM-DD form.');
    }
    const { scope, market } = this.scopeOf(req, undefined, 'that reconciliation');
    return this.send('get_reconciliation', { date, countryCode: market, scope });
  }
```

`PaymentAdminFilterDto` is a new class in `apps/api/apps/api-gateway/src/dto/payment.dto.ts` with `@IsOptional() @IsDateString() startDate?: string`, the same for `endDate`, and `@IsOptional() @Matches(/^[A-Za-z]{2}$/) countryCode?: string`. `forbidNonWhitelisted` then rejects a forged `scope` with a 400 before the handler runs, which is why test 4 above passes either way.

In `apps/api/apps/payment-service/src/`, each of the six handlers takes `d?.countryCode` (already the resolved market) and adds `if (market) qb.andWhere('p.countryCode = :market', { market })` to its query — the column is `countryCode` on `payments`, `invoices` and `settlement_records`. Where a handler aggregates over several tables, predicate each one; a half-scoped total is worse than none, so any leg that cannot be predicated makes the whole handler call `refuseUnattributable(d?.scope, 'report', this.logger)` instead and the task report names which.

- [ ] **Step 3: Scope the eleven `/marketplace/*` admin routes**

`apps/api/apps/api-gateway/src/controllers/marketplace.controller.ts` — `this.scopeOf` exists from Task 2. Per route:

| Line | Route                                                   | Change                                                                                                                              |
| ---- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 727  | `GET /marketplace/admin/product-reports`                | `const { scope, market } = this.scopeOf(req, country, 'those reports');` → `{ …, region: market, scope }`                           |
| 745  | `PUT /marketplace/admin/product-reports/:id`            | `scope` in the payload; backend asserts the reported product's seller market                                                        |
| 772  | `PUT /marketplace/returns/:id/assign-pickup`            | `scope` in the payload; `fulfillment.service` asserts `ret.regionCode`                                                              |
| 1097 | `GET /marketplace/delivery-assignments`                 | `{ …, region: market, scope }`                                                                                                      |
| 1108 | `GET /marketplace/delivery-assignments/:id`             | `scope`; backend asserts `assignment.regionCode`                                                                                    |
| 1128 | `POST /marketplace/delivery-assignments`                | `scope`; backend **stamps** `regionCode` from the order rather than trusting the body                                               |
| 1145 | `PUT /marketplace/delivery-assignments/:id/status`      | `scope`; backend asserts                                                                                                            |
| 1154 | `POST …/:id/verify-otp`                                 | `scope`; backend asserts                                                                                                            |
| 1163 | `POST …/:id/proof`                                      | `scope`; backend asserts                                                                                                            |
| 1174 | `GET /marketplace/sellers/:sellerId/low-stock-variants` | `scope`; backend asserts the seller's market                                                                                        |
| 2122 | `POST /marketplace/brands/:id/updates`                  | `refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.')` — a brand update post is platform content |

In `modules/marketplace/backend/src/fulfillment/fulfillment.service.ts`, every delivery-assignment write gains, after its existing ownership check:

```ts
assertInMarket(assignment.regionCode, scope, 'delivery assignment', this.logger);
```

`delivery_assignments.region_code` already exists — the audit's point is that the row carries the column and nothing ever read it. On create, stamp it from the order being assigned (`order.regionCode`), never from the request body: a body-supplied market is a market the caller chose.

- [ ] **Step 4: Write the failing franchise guard spec**

Create `apps/api/apps/api-gateway/src/guards/franchise-access.guard.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { FranchiseAccessGuard } from './franchise-access.guard';

const ctx = (user: any, id: string | undefined = 'fr-in') =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params: id ? { id } : {},
        method: 'GET',
        originalUrl: `/api/v1/franchise/${id}/dashboard`,
        headers: {},
      }),
    }),
  }) as any;

const customer = { id: 'u-c', role: 'CUSTOMER' };
const ownerUser = { id: 'owner-1', role: 'FRANCHISE_OWNER' };
const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN' };

function build(row = { ownerId: 'owner-1', countryCode: 'IN' }) {
  const client = { send: vi.fn(() => of({ id: 'fr-in', ...row })) };
  const redis = { get: vi.fn(async () => null), set: vi.fn(async () => undefined) };
  return { guard: new FranchiseAccessGuard(client as any, redis as any), client, redis };
}

describe('FranchiseAccessGuard', () => {
  it('X-47 refuses a plain customer asking for any franchise by id', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctx(customer))).rejects.toThrow(ForbiddenException);
  });

  it('admits the franchise owner', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctx(ownerUser))).resolves.toBe(true);
  });

  it('refuses an owner asking for a franchise they do not own', async () => {
    const { guard } = build({ ownerId: 'someone-else', countryCode: 'IN' });
    await expect(guard.canActivate(ctx(ownerUser))).rejects.toThrow(
      'You do not have access to this franchise.',
    );
  });

  it('X-46 refuses a QA-locked admin on an IN franchise', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctx(qaAdmin))).rejects.toThrow(
      'Your account is restricted to the QA market; this franchise belongs to IN.',
    );
  });

  it('admits a QA-locked admin on a QA franchise — the control', async () => {
    const { guard } = build({ ownerId: 'owner-1', countryCode: 'QA' });
    await expect(guard.canActivate(ctx(qaAdmin))).resolves.toBe(true);
  });

  it('admits a global admin anywhere', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctx(superAdmin))).resolves.toBe(true);
  });

  it('lets a route with no :id through — GET /franchise/me resolves from the token', async () => {
    const { guard, client } = build();
    await expect(guard.canActivate(ctx(ownerUser, undefined))).resolves.toBe(true);
    expect(client.send).not.toHaveBeenCalled();
  });

  it('fails closed when the lookup throws', async () => {
    const { guard, client } = build();
    client.send = vi.fn(() => {
      throw new Error('franchise-service down');
    });
    await expect(guard.canActivate(ctx(ownerUser))).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 5: Build the guard and bind it**

Create `apps/api/apps/api-gateway/src/guards/franchise-access.guard.ts`, modelled line for line on `seller-ownership.guard.ts` after Task 1: resolve `{ ownerId, countryCode }` over `{ cmd: 'franchise.get_access' }` with a 3 s timeout and a 60 s Redis cache under `franchise-scope:v1:<id>`; a lookup failure returns nulls and therefore denies; a caller in `STAFF_ROLES` passes the ownership test and takes `assertRecordInScope(req, countryCode, 'this franchise')`; a non-staff caller must match `ownerId`; everyone else gets `ForbiddenException('You do not have access to this franchise.')`.

In `franchise.controller.ts`, replace the 54 per-route `@UseGuards(JwtAuthGuard)` decorators with one class-level pair and add the role list to the staff-only routes:

```ts
@ApiTags('🏢 Franchise Operations')
@UseGuards(JwtAuthGuard, FranchiseAccessGuard)
@ApiBearerAuth('JWT')
@Controller('franchise')
export class FranchiseGatewayController {
```

`@Public()` routes keep working — `JwtAuthGuard` short-circuits them and the access guard sees no `:id`. Then add `scope` to every `franchise.*` payload that names an `:id`:

```ts
return this.send('franchise.get_dashboard', {
  id,
  scope: this.scopeOf(req, undefined, 'that franchise').scope,
});
```

with the same `private scopeOf` as elsewhere, and in `modules/franchise/backend/src/franchise.service.ts` each of those methods loads the franchise and calls `assertInMarket(franchise.countryCode, scope, 'franchise', this.logger)` — defence in depth, because the guard is a gateway artefact and the TCP surface must stand on its own.

Add the handler in `modules/franchise/backend/src/franchise.controller.ts`:

```ts
  /** Owner and market of one franchise, for the gateway's FranchiseAccessGuard. */
  @MessagePattern({ cmd: 'franchise.get_access' })
  getAccess(@Payload() data: { id: string }) { return this.svc.getFranchiseAccess(data?.id); }
```

backed by a `select: ['id', 'ownerId', 'countryCode']` read that returns nulls for an unknown id.

- [ ] **Step 6: Make the taxonomy aliases express the rule they rely on**

`admin-marketplace.controller.ts` lines 750, 791, 838, 882, 3290 each call `this.scopeOf(req, undefined, 'that taxonomy')` and then delegate to a handler that calls `refuseLockedAdmin`. The refusal does happen — but the alias _resolves a market_ for an entity that has none, which is the wrong rule stated at the route the regression spec reads (audit I8). Replace each with the rule itself:

```ts
refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
```

Then pin it so it cannot drift back. Create `apps/api/apps/api-gateway/src/controllers/taxonomy-write-refusal.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Every write to the global catalogue taxonomy refuses a region-locked admin in
 * its OWN handler block. Five `PUT`/`PATCH` aliases used to call `scopeOf`
 * instead and lean on the handler they delegated to — which is a rule stated in
 * one place and enforced in another (audit I8).
 */
const FILE = path.join(__dirname, 'admin-marketplace.controller.ts');
const TAXONOMY = /\/(categories|subcategories|attributes|brands|hsn-codes)(\/:id)?'/;

describe('taxonomy writes refuse locked admins at the route', () => {
  const src = fs.readFileSync(FILE, 'utf8').split('\n');
  const routes = src
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /^\s*@(Post|Put|Patch|Delete)\(/.test(l) && TAXONOMY.test(l));

  it('finds the taxonomy write routes at all', () => {
    expect(routes.length).toBeGreaterThanOrEqual(12);
  });

  it('every one calls refuseLockedAdmin and none calls this.scopeOf', () => {
    const offenders: string[] = [];
    for (const { l, i } of routes) {
      const block = src.slice(i, i + 12).join('\n');
      if (!/refuseLockedAdmin\(/.test(block) || /this\.scopeOf\(/.test(block)) {
        offenders.push(`${l.trim()} (line ${i + 1})`);
      }
    }
    expect(offenders.join('\n')).toBe('');
  });
});
```

- [ ] **Step 7: Run everything**

From `apps/api`: `npx vitest run apps/api-gateway/src/controllers/payment-scope.spec.ts apps/api-gateway/src/guards/franchise-access.guard.spec.ts apps/api-gateway/src/controllers/taxonomy-write-refusal.spec.ts` → **4 + 8 + 2 = 14 passed**; `npx vitest run` → **716 passed**; `npx nest build --all` → exit 0.
From `modules/marketplace`: `npx vitest run` → **260 passed**. From `modules/franchise/backend`: `npx vitest run` (add a `franchise-scope.spec.ts` if the module has no suite yet — a module gaining its first authorisation rule gets its first spec with it).

- [ ] **Step 8: Live probe**

```bash
INSELLER=$(docker exec kartseek-postgres-marketplace psql -U kartseek -d kartseek_marketplace -tAc \
  "SELECT id FROM marketplace.sellers WHERE region_code='IN' LIMIT 1")
INFR=$(docker exec kartseek-postgres psql -U postgres -d kartseek_db -tAc \
  "SELECT id FROM franchise.franchises WHERE country_code='IN' LIMIT 1")
CUST=$(tok customer@kartseek.com 2>/dev/null || echo SKIP)

printf 'X-24 QA->IN settlement: '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" \
  "$B/payments/admin/settlement/seller/$INSELLER"
printf 'QA payments dashboard?countryCode=IN: '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" \
  "$B/payments/admin/dashboard?countryCode=IN"
printf 'QA payments dashboard (control): '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" "$B/payments/admin/dashboard"
printf 'X-46 QA->IN franchise dashboard: '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" "$B/franchise/$INFR/dashboard"
printf 'X-47 customer->any franchise dashboard: '
[ "$CUST" = SKIP ] && echo 'SKIPPED (no customer account)' || \
  curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $CUST" "$B/franchise/$INFR/dashboard"
printf 'IN admin->IN franchise (control): '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $IN" "$B/franchise/$INFR/dashboard"
printf 'X-22 QA PATCH hsn-codes (taxonomy): '
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"description":"probe"}' "$B/admin/marketplace/hsn-codes/8517"
printf 'QA PUT hsn-codes (the alias): '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"description":"probe"}' "$B/admin/marketplace/hsn-codes/8517"
printf 'SUPER PUT hsn-codes (control): '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $SU" \
  -H 'Content-Type: application/json' -d '{"description":"probe"}' "$B/admin/marketplace/hsn-codes/8517"
```

Expected: `403`, `403`, `200`, `403`, `403`, `200`, `403`, `403`, `200`. The two `403`s on the taxonomy aliases must carry `belongs to every market` (the `refuseLockedAdmin` wording), not `belongs to IN` — check the body, not just the code.

- [ ] **Step 9: Confirm no legitimate franchise client broke**

The franchise guard is the one behaviour change in this plan that can deny a caller who was previously allowed. Before committing:

```bash
grep -rn "franchise/\${\|/franchise/" --include=*.ts --include=*.tsx --include=*.dart \
  apps/web/src packages/*/src apps/*mobile* 2>/dev/null | grep -v node_modules | head -20
```

Every hit must either be `@Public()` (`/franchise/markets`), `/franchise/me`, or a path whose `:id` came from `/franchise/me`. Anything that takes the id from a URL parameter, a dropdown of all franchises, or client state is a screen a franchise owner could use to read someone else's estate — record it in the task report and hand it to the CONSOLE plan.

- [ ] **Step 10: Commit**

```bash
git add apps/api/apps/api-gateway/src/controllers/payment.controller.ts \
        apps/api/apps/api-gateway/src/controllers/marketplace.controller.ts \
        apps/api/apps/api-gateway/src/controllers/franchise.controller.ts \
        apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts \
        apps/api/apps/api-gateway/src/controllers/payment-scope.spec.ts \
        apps/api/apps/api-gateway/src/controllers/taxonomy-write-refusal.spec.ts \
        apps/api/apps/api-gateway/src/guards/franchise-access.guard.ts \
        apps/api/apps/api-gateway/src/guards/franchise-access.guard.spec.ts \
        apps/api/apps/api-gateway/src/dto/payment.dto.ts \
        apps/api/apps/payment-service/src \
        modules/marketplace/backend/src/fulfillment/fulfillment.service.ts \
        modules/franchise/backend/src
git commit -m "fix(gateway): payments, logistics and franchise routes resolve a market; a franchise id is not a key" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7 (R7): Platform-wide content and the security console refuse a locked admin, with real DTOs behind them

**Closes: AUD2-013, AUD2-085, AUD2-097, AUD2-098, AUD2-099** (V10, V16, V17 / E F-10, I10/F-24; H-11, H-12; D #18, #19; §13 row X-54)

Four controllers write content that applies to every market — the privacy policy, a module's homepage layout, a path's SEO override, the platform's IP ban list — and none of them refuses a region-locked admin. Two of them also read the request body raw, so the global validation pipe never sees it: `admin-layout.controller.ts:80` reads `req.body?.sections` (unbounded JSON, persisted), and `admin-seo.controller.ts` types its body as an `interface`, which leaves Nest with no metatype and validation skipped entirely — including `updatedBy`, which is taken from the body (`:190`) and is therefore whatever the caller says it is.

Three of the four sit in the regression spec's `GLOBAL_ROUTES` allowlist, which is why none of this was visible: the allowlist says "this route has no market", which is true, and says nothing about whether a locked admin may write it.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/static-pages.controller.ts:26-113`
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-layout.controller.ts:11-89`
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-seo.controller.ts:23-72, 79-250`
- Modify: `apps/api/apps/api-gateway/src/controllers/ddos-admin.controller.ts:47-52` and each of the 8 mutating handlers
- Create: `apps/api/apps/api-gateway/src/dto/admin-content.dto.ts`
- Create: `apps/api/apps/api-gateway/src/entities/seo-override.entity.ts` + a migration
- Modify: `apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts` (`GLOBAL_ROUTES` reasons)
- Create: `apps/api/apps/api-gateway/src/controllers/global-content-refusal.spec.ts`

**Interfaces:**

- Produces: `SaveLayoutDto`, `SavePageDto`, `SeoOverrideDto`, `BulkSeoDto` in `dto/admin-content.dto.ts` — all classes with `class-validator`, all size-capped (`@ArrayMaxSize(50)` on `sections`, `@MaxLength` on every string, `@ValidateNested`). The global pipe's `whitelist: true, forbidNonWhitelisted: true` then rejects unknown keys with a 400.
- Produces: `seo_overrides` table (gateway-owned, main database) — `id uuid`, `path text unique`, `module text`, the meta/OG/twitter/schema columns as `jsonb` or `text`, `updated_by uuid`, `updated_at timestamptz`. The module-level `Map` is deleted: overrides that vanish on restart and differ per replica are not a store.
- Behaviour: `PUT /admin/static-pages/:slug`, `PUT /admin/static-pages/:slug/publish`, `PUT /admin/layouts/:module/:page`, `POST /admin/seo`, `POST /admin/seo/bulk-update`, `DELETE /admin/seo/:id` and the 8 mutating `/admin/security/*` routes return **403** for a region-locked admin with the `belongs to every market` wording. Reads stay open to them and are marked `@GlobalEntity`.
- Behaviour: `updatedBy` on an SEO override is the verified `req.user.id`. A body that carries `updatedBy` is now a 400, not an impersonation.
- Produces permission keys on routes that had none: `perm:content.manage` (static pages, layouts, SEO writes), `perm:content.view` (their reads), `perm:security.manage` (already present on the DDoS controller).

- [ ] **Step 1: Write the failing refusal spec**

Create `apps/api/apps/api-gateway/src/controllers/global-content-refusal.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { AdminStaticPagesController } from './static-pages.controller';
import { AdminLayoutController } from './admin-layout.controller';
import { AdminSeoController } from './admin-seo.controller';
import { DdosAdminController } from './ddos-admin.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'PUT', originalUrl: '/x', headers: {} });

const repo = () => ({
  find: vi.fn(async () => []),
  findOne: vi.fn(async () => null),
  create: vi.fn((x: any) => x),
  save: vi.fn(async (x: any) => ({ id: 'p-1', ...x })),
  delete: vi.fn(async () => ({ affected: 1 })),
});

describe('platform-wide content refuses a region-locked admin', () => {
  it('static pages: save and publish', async () => {
    const r = repo();
    const ctrl = new AdminStaticPagesController(r as any);
    await expect(ctrl.savePage(req(qaAdmin), 'privacy', { title: 'x' } as any)).rejects.toThrow(
      'Your account is restricted to the QA market; a platform page belongs to every market.',
    );
    await expect(ctrl.togglePublish(req(qaAdmin), 'privacy')).rejects.toThrow(ForbiddenException);
    expect(r.save).not.toHaveBeenCalled();
  });

  it('page layouts: save', async () => {
    const r = repo();
    const ctrl = new AdminLayoutController(r as any);
    await expect(
      ctrl.saveLayout(req(qaAdmin), 'marketplace', 'homepage', { sections: [] } as any),
    ).rejects.toThrow(ForbiddenException);
    expect(r.save).not.toHaveBeenCalled();
  });

  it('seo overrides: upsert, bulk and delete', async () => {
    const r = repo();
    const ctrl = new AdminSeoController(r as any);
    await expect(
      ctrl.upsertOverride(req(qaAdmin), { path: '/x', module: 'marketplace' } as any),
    ).rejects.toThrow(ForbiddenException);
    await expect(ctrl.bulkUpdate(req(qaAdmin), { overrides: [] } as any)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(ctrl.deleteOverride(req(qaAdmin), 'seo_1')).rejects.toThrow(ForbiddenException);
    expect(r.save).not.toHaveBeenCalled();
  });

  it('the security console: every mutation', async () => {
    const monitor = {
      banIp: vi.fn(),
      unbanIp: vi.fn(),
      whitelistIp: vi.fn(),
      resetAttackMode: vi.fn(),
    };
    const ctrl = new DdosAdminController(monitor as any);
    for (const call of [
      () => ctrl.banIp(req(qaAdmin), { ip: '1.2.3.4' } as any),
      () => ctrl.unbanIp(req(qaAdmin), '1.2.3.4'),
      () => ctrl.whitelistIp(req(qaAdmin), { ip: '1.2.3.4' } as any),
      () => ctrl.resetAttackMode(req(qaAdmin)),
    ]) {
      await expect(Promise.resolve().then(call)).rejects.toThrow(ForbiddenException);
    }
    expect(monitor.banIp).not.toHaveBeenCalled();
  });

  it('a global admin writes all four — the control that stops "403 everywhere" passing', async () => {
    const r = repo();
    await expect(
      new AdminStaticPagesController(r as any).savePage(req(superAdmin), 'privacy', {
        title: 'x',
      } as any),
    ).resolves.toMatchObject({ success: true });
    await expect(
      new AdminLayoutController(r as any).saveLayout(req(superAdmin), 'marketplace', 'homepage', {
        sections: [],
      } as any),
    ).resolves.toBeDefined();
  });

  it('a locked admin may still READ all four', async () => {
    const r = repo();
    await expect(new AdminStaticPagesController(r as any).listPages()).resolves.toBeDefined();
    await expect(
      new AdminLayoutController(r as any).getLayout('marketplace', 'homepage'),
    ).resolves.toBeDefined();
  });
});

describe('the actor on an SEO override comes from the token', () => {
  it('ignores a body-supplied updatedBy', async () => {
    const r = repo();
    const ctrl = new AdminSeoController(r as any);
    await ctrl.upsertOverride(req(superAdmin), {
      path: '/x',
      module: 'marketplace',
      updatedBy: 'someone-else',
    } as any);
    expect(r.save).toHaveBeenCalledWith(expect.objectContaining({ updatedBy: 'u-s' }));
  });
});
```

- [ ] **Step 2: Run it — FAIL**

From `apps/api`: `npx vitest run apps/api-gateway/src/controllers/global-content-refusal.spec.ts`

Expected: FAIL on every `it` — none of the four handlers takes a `@Req()`, `AdminSeoController` takes no repository (it writes a module-level `Map`), and `updatedBy` is `body.updatedBy || 'admin'`.

- [ ] **Step 3: The DTOs**

Create `apps/api/apps/api-gateway/src/dto/admin-content.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * A page-layout section.
 *
 * `saveLayout` used to read `req.body?.sections` straight off the request, so
 * the global validation pipe never saw it and unbounded JSON went to the
 * database under a key of `(moduleName, pageName)` — one homepage for every
 * market, writable by any admin (audit V16 / H-11).
 */
export class LayoutSectionDto {
  @ApiProperty() @IsString() @Length(1, 64) id!: string;
  @ApiProperty() @IsString() @Length(1, 64) type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(999) order?: number;
}

export class SaveLayoutDto {
  @ApiProperty({ type: [LayoutSectionDto], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50, { message: 'a page layout may hold at most 50 sections' })
  @ValidateNested({ each: true })
  @Type(() => LayoutSectionDto)
  sections!: LayoutSectionDto[];
}

export class SavePageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(320) metaDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) heroGradient?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) heroIcon?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;

  @ApiPropertyOptional({ type: [Object], maxItems: 100 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  sections?: unknown[];
  // `adminId` is deliberately absent: the editor is `req.user.id`.
}

export class SeoOverrideDto {
  @ApiProperty({ example: '/marketplace/product/iphone-17-pro' })
  @IsString()
  @Matches(/^\/[\w\-/.:%]*$/, { message: 'path must be an absolute site path' })
  @MaxLength(512)
  path!: string;

  @ApiProperty() @IsString() @Length(1, 32) module!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) metaDescription?: string;
  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  keywords?: string[];
  @ApiPropertyOptional() @IsOptional() @IsUrl({ protocols: ['https'] }) canonicalUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() robotsIndex?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() robotsFollow?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sitemapInclude?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) sitemapPriority?: number;
  @ApiPropertyOptional({
    enum: ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'],
  })
  @IsOptional()
  @IsIn(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])
  sitemapChangeFreq?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl({ protocols: ['https'] }) ogImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) ogTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) ogDescription?: string;
  // `updatedBy` is deliberately absent — see SavePageDto.
}

export class BulkSeoDto {
  @ApiProperty({ type: [SeoOverrideDto], maxItems: 200 })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SeoOverrideDto)
  overrides!: SeoOverrideDto[];
}
```

- [ ] **Step 4: Static pages**

`static-pages.controller.ts` — the two reads gain `@GlobalEntity('platform pages are one document per slug for every market')` and `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.view')`; the two writes gain `@Roles(..., 'perm:content.manage')` and:

```ts
  @Put(':slug')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.manage')
  @ApiOperation({ summary: 'Save static page content' })
  async savePage(@Req() req: any, @Param('slug') slug: string, @Body() dto: SavePageDto) {
    // The privacy policy, the terms and the grievance page are one document for
    // every market. A region-locked admin could rewrite and publish all ten —
    // and this controller was invisible to the market-scope regression spec,
    // which only scanned `admin-*.controller.ts` (audit V10, and F-15 for why
    // nobody saw it).
    refuseLockedAdmin(req, 'a platform page');
    let page = await this.repo.findOne({ where: { slug } });
    …
      lastEditedBy: this.actorId(req),
```

with `private actorId(req: any) { return req?.user?.id ?? req?.user?.sub ?? 'system'; }` replacing every `body.adminId` — the editor is the token, never the body. `togglePublish` gains the same `refuseLockedAdmin` first line.

- [ ] **Step 5: Page layouts — one rule, and the market question answered**

`admin-layout.controller.ts`:

```ts
  @Put(':moduleName/:pageName')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.manage')
  @ApiOperation({ summary: 'Save page layout configuration' })
  async saveLayout(
    @Req() req: any,
    @Param('moduleName') moduleName: string,
    @Param('pageName') pageName: string,
    @Body() dto: SaveLayoutDto,
  ) {
    // `page_layouts` is keyed `(moduleName, pageName)` and has no market
    // column, so one row IS every market's homepage. Until it gains one, a
    // locked admin is refused rather than allowed to rewrite Qatar's homepage
    // and India's with the same request (audit V16 / I10).
    //
    // Marketplace's own `/admin/marketplace/page-layout` is scoped with a
    // gateway-forced country against a different store — the two are
    // deliberately left as two stores here, and reconciling them is a MODULES
    // task with a migration, not a scope fix.
    refuseLockedAdmin(req, 'page layouts');
    let layout = await this.layoutRepo.findOne({ where: { moduleName, pageName } });
    if (!layout) layout = this.layoutRepo.create({ moduleName, pageName, sections: dto.sections });
    else layout.sections = dto.sections;
    return this.layoutRepo.save(layout);
  }
```

and `getLayout` gains `@GlobalEntity('page layouts are per module page, not per market')` plus `perm:content.view`.

- [ ] **Step 6: SEO overrides — a class, a table, and an actor from the token**

Create `apps/api/apps/api-gateway/src/entities/seo-override.entity.ts` and a migration `1786502100000-SeoOverrides.ts` in `apps/api/migrations`, registered in `data-source.main.ts` (the gateway owns the table, so it belongs in the main list and the docstring gains a paragraph — `data-source.main.spec.ts` enforces this).

Then rewrite `admin-seo.controller.ts`: delete `const seoOverrides: Map<...>` at line 73 and the `export interface SeoOverride` at line 23 (keep a type alias to the entity if other files import the name — `grep -rn "SeoOverride" --include=*.ts apps/api | grep -v admin-seo` first). Inject `@InjectRepository(SeoOverride)`. Every read becomes a repository read, every write a repository write, and:

```ts
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:content.manage')
  async upsertOverride(@Req() req: any, @Body() dto: SeoOverrideDto) {
    // An SEO override applies to one path across every market, so a locked
    // admin may not write one. The body used to be typed as an `interface`,
    // which leaves Nest with no metatype and skips validation entirely — which
    // is how `updatedBy` came to be whatever the caller wrote (audit V17/H-12).
    refuseLockedAdmin(req, 'an SEO override');
    const existing = await this.repo.findOne({ where: { path: dto.path } });
    const row = this.repo.create({
      ...(existing ?? {}),
      ...dto,
      updatedBy: req?.user?.id ?? req?.user?.sub ?? null,
      updatedAt: new Date(),
    });
    const saved = await this.repo.save(row);
    return { success: true, message: existing ? 'SEO override updated' : 'SEO override created', data: saved };
  }
```

`bulkUpdate(@Req() req, @Body() dto: BulkSeoDto)` refuses first, then loops; `deleteOverride(@Req() req, @Param('id', ParseUUIDPipe) id)` refuses first, then deletes and **404s** when nothing matched (it used to answer `{ success: false }` with a 200). The three reads gain `@GlobalEntity('SEO overrides are per path; a market-specific path carries its market in the path')`.

- [ ] **Step 7: The security console**

`ddos-admin.controller.ts` already carries `@Roles(SUPER_ADMIN, ADMIN, 'perm:security.manage')` (line 50). The gap is that a custom role granted `security.manage` **and** a market lock can ban IPs platform-wide. Add to each of the 8 mutating handlers, as the first statement:

```ts
refuseLockedAdmin(req, 'the security console');
```

and add `@Req() req: any` to their signatures. The 3 read handlers keep `@GlobalEntity('DDoS board is per gateway, not per market')`. Update the class docstring to say the board is global **and** that writing it is a global act.

- [ ] **Step 8: Say why each allowlist entry is allowlisted**

In `admin-market-scope.regression.spec.ts`, the `GLOBAL_ROUTES` reasons now state what the route does about locked admins, so the next reader cannot mistake "no market" for "anyone may write it":

```ts
const GLOBAL_ROUTES: Array<[RegExp, string]> = [
  [
    /^\/admin\/security\//,
    'DDoS board is per gateway; every mutation calls refuseLockedAdmin (R7)',
  ],
  [/^\/admin\/platform\/health$/, 'service liveness'],
  [
    /^\/admin\/layouts\//,
    'page layouts are per module page, not per market; the write calls refuseLockedAdmin (R7)',
  ],
  [
    /^\/admin\/seo/,
    'SEO overrides are per path; a market-specific path carries its market in the path, and every write calls refuseLockedAdmin (R7)',
  ],
  [/^\/admin\/marketplace\/system-health$/, 'service liveness'],
];
```

Note that `/admin/static-pages/*` is **not** added to this list: after Step 4 its writes call `refuseLockedAdmin` and its reads carry `@GlobalEntity`, so Task 8's widened collector passes it on its own merits. An allowlist entry would hide it again.

- [ ] **Step 9: Run and build**

From `apps/api`: `npx vitest run apps/api-gateway/src/controllers/global-content-refusal.spec.ts` → **7 passed**; `npx vitest run` → **723 passed**; `npx nest build --all` → exit 0. Apply the new migration: `npx typeorm-ts-node-commonjs migration:run -d data-source.main.ts`, then `\d public.seo_overrides` to confirm the table.

- [ ] **Step 10: Live probe**

```bash
printf 'X-54 QA PUT /admin/static-pages/privacy: '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"title":"probe"}' "$B/admin/static-pages/privacy"
printf 'QA PUT /admin/static-pages/privacy/publish: '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $QA" "$B/admin/static-pages/privacy/publish"
printf 'SUPER PUT /admin/static-pages/privacy (control): '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $SU" \
  -H 'Content-Type: application/json' -d '{"title":"Privacy Policy"}' "$B/admin/static-pages/privacy"
printf 'V16 QA PUT /admin/layouts/marketplace/homepage: '
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"sections":[]}' "$B/admin/layouts/marketplace/homepage"
printf 'SUPER layout with 500 sections (size cap): '
node -e 'console.log(JSON.stringify({sections:Array.from({length:500},(_,i)=>({id:"s"+i,type:"hero_slider"}))}))' > /tmp/big.json
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $SU" \
  -H 'Content-Type: application/json' --data @/tmp/big.json "$B/admin/layouts/marketplace/homepage"
printf 'V17 QA POST /admin/seo: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"path":"/probe","module":"marketplace"}' "$B/admin/seo"
printf 'SUPER POST /admin/seo with a forged updatedBy: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $SU" \
  -H 'Content-Type: application/json' -d '{"path":"/probe","module":"marketplace","updatedBy":"someone-else"}' "$B/admin/seo"
printf 'SUPER POST /admin/seo clean (control): '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $SU" \
  -H 'Content-Type: application/json' -d '{"path":"/probe","module":"marketplace"}' "$B/admin/seo"
printf 'D#19 QA POST /admin/security/ban-ip: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"ip":"203.0.113.9"}' "$B/admin/security/ban-ip"
printf 'QA GET /admin/security/status (read stays open): '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" "$B/admin/security/status"
```

Expected: `403`, `403`, `200`, `403`, `400` (the 500-section body exceeds `ArrayMaxSize(50)`), `403`, `400` (`forbidNonWhitelisted` rejects `updatedBy`), `201`, `403`, `200`. Then confirm the SEO override survives a restart and names the right actor:

```bash
docker exec kartseek-postgres psql -U postgres -d kartseek_db -tAc \
  "SELECT path, updated_by FROM public.seo_overrides WHERE path='/probe'"
```

Expected: one row whose `updated_by` is the superadmin's uuid, not `someone-else` and not `admin`.

- [ ] **Step 11: Commit**

```bash
git add apps/api/apps/api-gateway/src/controllers/static-pages.controller.ts \
        apps/api/apps/api-gateway/src/controllers/admin-layout.controller.ts \
        apps/api/apps/api-gateway/src/controllers/admin-seo.controller.ts \
        apps/api/apps/api-gateway/src/controllers/ddos-admin.controller.ts \
        apps/api/apps/api-gateway/src/controllers/global-content-refusal.spec.ts \
        apps/api/apps/api-gateway/src/dto/admin-content.dto.ts \
        apps/api/apps/api-gateway/src/entities \
        apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts \
        apps/api/migrations/1786502100000-SeoOverrides.ts \
        apps/api/data-source.main.ts
git commit -m "fix(gateway): platform pages, layouts, seo and the security console refuse a market-locked admin" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8 (R8): The regression spec sees every controller that declares an admin role, not every file whose name begins with `admin-`

**Closes: AUD2-066** (E F-15/I11 — a TESTS-workstream row, executed here because it is the CI gate for every REGIONAL row above; until it lands, tasks 1–7 can regress silently)

The collector at `admin-market-scope.regression.spec.ts:88-90` filters **filenames**:

```ts
    .filter((f) => /^(admin-.*|ddos-admin)\.controller\.ts$/.test(f))
```

That admits 13 files and 362 routes, all of which pass. It admits none of `marketplace.controller.ts`, `grocery.controller.ts`, `restaurant.controller.ts`, `pharmacy.controller.ts`, `payment.controller.ts`, `seller-marketplace.controller.ts`, `static-pages.controller.ts`, `taxi.controller.ts`, `doctor.controller.ts`, `region.controller.ts` or `upload.controller.ts` — so every P0 this plan fixes was invisible to CI while it was open.

**Measured on the current tree** (`feat/admin-platform-upgrade`, HEAD `e0c7832`), selecting routes whose class block or handler block carries `@Roles(... UserRole.ADMIN | UserRole.SUPER_ADMIN ...)`:

|                          | Files |  Routes | Unscoped after the `GLOBAL_ROUTES` allowlist |
| ------------------------ | ----: | ------: | -------------------------------------------: |
| Today's filename filter  |    13 | **362** |                                        **0** |
| `@Roles`-based selection |    24 | **579** |                                      **217** |

The 217 break down as: `seller-marketplace` 111 (Task 1), `restaurant` 30 (Task 5 deletes them), `marketplace` 22 (Tasks 2 and 6), `grocery` 13 (Task 5), `taxi` 11 (unfixed — see the allowlist below), `pharmacy` 7 (Task 5), `payment` 6 (Task 6), `static-pages` 5 (Task 7), `upload` 5, `doctor` 4, `region` 3.

This task is therefore ordered **after** tasks 1–7: widening the collector first would make the suite red for 217 routes at once and the plan would be executed under a broken gate.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts`

**Interfaces:**

- Produces: the collector's contract for every later plan — **a route is in scope for this spec when its class block or its own handler block carries `@Roles(...)` naming `UserRole.ADMIN` or `UserRole.SUPER_ADMIN`**, whatever the file is called. A new admin route in a new controller is covered the moment it is written; no registration step, no filename convention.
- Produces: `GUARD_SCOPED` — controllers whose class-level `@UseGuards` binds a guard that performs the market check itself. One entry: `SellerOwnershipGuard`. A second `it` asserts that guard's source really calls `assertRecordInScope`, so the exemption cannot become a hiding place.
- Produces: `AdminRoute` gains `adminRole: boolean` and `guardScoped: boolean`.

- [ ] **Step 1: Widen the collector and watch it go red**

Replace lines 5-13 of `admin-market-scope.regression.spec.ts`:

```ts
const CONTROLLERS = path.join(__dirname, '..', 'controllers');
const HTTP = /^\s*@(Get|Post|Put|Patch|Delete|All)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?\s*\)/;
// `refuseLockedAdmin(` counts: it reads `marketScopeOf(req)` itself and refuses
// a region-locked caller outright, which is how a route whose target has no
// market dimension yet resolves the caller's scope. It is not an exemption —
// a global admin still passes, and the denial is logged like any other.
const SCOPED =
  /resolveMarket\(|marketScopeOf\(|assertRecordInScope\(|this\.scopeOf\(|refuseLockedAdmin\(/;
const GLOBAL = /@GlobalEntity\(/;
/**
 * A route is an ADMIN route when it says so, not when its file is called
 * `admin-something`.
 *
 * The filename filter this replaced admitted 13 files and 362 routes and hid
 * 217 admin-reachable routes in 11 other controllers — `seller-marketplace`
 * (111), `restaurant` (30), `marketplace` (22), `grocery` (13), `taxi` (11),
 * `pharmacy` (7), `payment` (6), `static-pages` (5), `upload` (5), `doctor`
 * (4) and `region` (3). Every P0 cross-region vector in the 2026-09-12 audit
 * lived in that blind spot and passed this spec while it was open (AUD2-066).
 */
const ADMIN_ROLE =
  /@Roles\([^)]*(?:UserRole\.(?:SUPER_ADMIN|ADMIN)|'(?:SUPER_ADMIN|ADMIN)'|"(?:SUPER_ADMIN|ADMIN)")/;
/**
 * Controllers whose class-level guard performs the market check itself, so the
 * handler bodies legitimately carry no scope call. One entry, and the spec
 * below reads that guard's source to prove it — an entry here is a claim about
 * code, not a way to be excused from the rule.
 */
const GUARD_SCOPED: Array<[RegExp, string, string]> = [
  [
    /@UseGuards\([^)]*SellerOwnershipGuard/,
    'SellerOwnershipGuard',
    'seller-ownership.guard.ts resolves the seller and calls assertRecordInScope (R1)',
  ],
];
```

Extend the interface at line 72:

```ts
interface AdminRoute {
  file: string;
  verb: string;
  path: string;
  scoped: boolean;
  global: boolean;
  /** The route or its class declares an ADMIN / SUPER_ADMIN role. */
  adminRole: boolean;
  /** Its class binds a guard that does the market check (see GUARD_SCOPED). */
  guardScoped: boolean;
}
```

Replace `collect()` (lines 86-116):

```ts
function collect(): AdminRoute[] {
  const out: AdminRoute[] = [];
  for (const file of fs.readdirSync(CONTROLLERS).filter((f) => /\.controller\.ts$/.test(f))) {
    const joined = stripComments(fs.readFileSync(path.join(CONTROLLERS, file), 'utf8'));
    const src = joined.split('\n');
    // The class block is everything above `export class …` — the decorators
    // that apply to every route in the file.
    const classEnd = src.findIndex((l) => /^export class /.test(l));
    const classBlock = src.slice(0, classEnd + 1).join('\n');
    const classAdminRole = ADMIN_ROLE.test(classBlock);
    const guardScoped = GUARD_SCOPED.some(([re]) => re.test(classBlock));
    const declared = (joined.match(/@(?:Get|Post|Put|Patch|Delete|All)\(/g) ?? []).length;
    const base = (joined.match(/@Controller\(\s*['"`]([^'"`]*)['"`]/) || [])[1] ?? '';
    const routeLines = src.map((l, i) => ({ l, i })).filter(({ l }) => HTTP.test(l));
    let parsed = 0;
    routeLines.forEach(({ l, i }, idx) => {
      const m = l.match(HTTP)!;
      const nextRoute = idx + 1 < routeLines.length ? routeLines[idx + 1].i : src.length;
      const { start, end } = handlerBlock(src, i, nextRoute);
      const block = src.slice(start, end).join('\n');
      parsed++;
      const adminRole = classAdminRole || ADMIN_ROLE.test(block);
      if (!adminRole) return;
      const sub = m[2] ?? m[3] ?? m[4] ?? '';
      out.push({
        file,
        verb: m[1].toUpperCase(),
        path: ('/' + base + (sub ? '/' + sub : '')).replace(/\/+/g, '/'),
        scoped: SCOPED.test(block),
        global: GLOBAL.test(block),
        adminRole,
        guardScoped,
      });
    });
    if (declared !== parsed) {
      parserGaps.push(
        `${file}: ${declared} route decorators declared, ${parsed} parsed (multi-line decorator?)`,
      );
    }
  }
  return out;
}
```

Note the parser-gap counter now counts **every** route decorator in the file against every route line parsed, before the admin filter — so a multi-line decorator in a non-admin controller still fails loudly rather than quietly reducing the admin count.

- [ ] **Step 2: Run it against the tree as it stands after Task 7 and record the number**

From `apps/api`: `npx vitest run apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts`

Expected after tasks 1–7: the offender report lists only the routes those tasks did not touch —

```
  GET /taxi/admin/dashboard   (taxi.controller.ts)
  GET /taxi/admin/vendors   (taxi.controller.ts)
  POST /taxi/admin/vendors/:id/approve   (taxi.controller.ts)
  POST /taxi/admin/vendors/:id/reject   (taxi.controller.ts)
  GET /taxi/admin/drivers   (taxi.controller.ts)
  POST /taxi/admin/drivers/:id/approve   (taxi.controller.ts)
  GET /taxi/admin/fare-rules   (taxi.controller.ts)
  POST /taxi/admin/fare-rules   (taxi.controller.ts)
  GET /taxi/admin/sos   (taxi.controller.ts)
  GET /taxi/admin/disputes   (taxi.controller.ts)
  GET /taxi/admin/audit-logs   (taxi.controller.ts)
  POST /upload/profile-image   (upload.controller.ts)
  POST /upload/product-image   (upload.controller.ts)
  POST /upload/delivery-proof   (upload.controller.ts)
  POST /upload/brand-image   (upload.controller.ts)
  POST /upload/category-image   (upload.controller.ts)
  GET /regions/stats   (region.controller.ts)
  GET /regions/stats/region   (region.controller.ts)
  GET /regions/india/stats   (region.controller.ts)
  PUT /doctor/hospitals/:hospitalId/status   (doctor.controller.ts)
  PUT /doctor/clinics/:clinicId/status   (doctor.controller.ts)
  PUT /doctor/doctors/:doctorId/status   (doctor.controller.ts)
  GET /doctor/admin/appointments   (doctor.controller.ts)
```

23 routes, four files. If the report lists anything from `seller-marketplace`, `marketplace`, `grocery`, `restaurant`, `pharmacy`, `payment` or `static-pages`, an earlier task is incomplete — go back to it rather than allowlisting it here.

- [ ] **Step 3: Deal with the 23 honestly — three different answers, not one allowlist**

**`doctor.controller.ts` (4)** — these are real cross-region holes of the same shape as V7/V9 and the module already has the market column (`clinics.region_code`). Scope them here, in this task, the way Task 5 scoped grocery: add `private scopeOf`, forward `scope`, and in `modules/doctor/backend/src/doctor.service.ts` assert the clinic's market on each status write. `GET /doctor/admin/appointments` has no handler (§2(a) row 37), so it gets `scope` in the payload and stays a 503 until the MODULES plan implements it — a missing handler is not an excuse to send an unscoped payload.

**`taxi.controller.ts` (11)** — `/taxi/admin/*` is a second taxi admin surface beside the scoped `/admin/taxi/*` (38 routes). Check for callers exactly as Task 5 Step 1 did:

```bash
grep -rn "taxi/admin" --include=*.ts --include=*.tsx --include=*.dart apps packages modules \
  | grep -v node_modules | grep -v '\.next' | grep -v 'api-gateway/src/controllers/taxi.controller.ts'
```

With no callers, delete them and leave the same kind of note Task 5 left. With callers, scope them. Either way they leave the offender list; they do not enter the allowlist. This is the one part of this task that may grow it — if the 11 turn out to need real handler work, split them into the TAXI workstream and add a **time-boxed** allowlist entry naming that plan, not a permanent one.

**`upload.controller.ts` (5) and `region.controller.ts` (3)** — genuinely market-free, and the honest fix is to say so in the code rather than in a list:

```ts
  @Post('product-image')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SELLER, 'perm:content.manage')
  @GlobalEntity('an uploaded file has no market; the row that references it carries one')
```

```ts
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:system.health')
  @GlobalEntity('region statistics are the registry itself, not one market\'s data')
```

`@GlobalEntity` on a GET is already permitted by the third `it`; on `POST /upload/*` it is not, because that `it` refuses the marker on any non-GET. Those five uploads therefore call `refuseLockedAdmin`? No — an upload is not a global **entity** write, it is a file. Give them `marketScopeOf(req)` and stamp the resolved market onto the stored object's metadata:

```ts
  async uploadProductImage(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    // The file itself has no market, but the audit trail of who uploaded what
    // from which market does — and calling the helper is what proves this route
    // considered the question.
    const { market } = this.scopeOf(req, undefined, 'that upload');
    return this.uploads.store(file, { actorId: this.actorId(req), market });
  }
```

- [ ] **Step 4: Add the guard-scoped exemption and the assertion that polices it**

In the second `it`, exclude guard-scoped routes and add a third `it` that reads the guard:

```ts
it('resolves a market on every admin route that is not declared global or guard-scoped', () => {
  const offenders = routes.filter(
    (r) =>
      !r.scoped && !r.global && !r.guardScoped && !GLOBAL_ROUTES.some(([re]) => re.test(r.path)),
  );
  const report = offenders.map((r) => `  ${r.verb} ${r.path}   (${r.file})`).join('\n');
  expect(report).toBe('');
});

it('every guard named in GUARD_SCOPED really performs the market check', () => {
  // The exemption is a claim about a guard's source. Reading it here is what
  // stops GUARD_SCOPED becoming the new filename filter: a guard that stops
  // calling assertRecordInScope fails this spec, not silently 111 routes.
  const GUARDS = path.join(__dirname);
  const failures: string[] = [];
  for (const [, guardName, why] of GUARD_SCOPED) {
    const file = path.join(
      GUARDS,
      guardName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() + '.ts',
    );
    const src = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (!/assertRecordInScope\(/.test(src)) failures.push(`${guardName}: ${why} — but it does not`);
  }
  expect(failures.join('\n')).toBe('');
});
```

- [ ] **Step 5: Update the route-count assertion so a shrinking scan is a failure**

The first `it` currently asserts `routes.length > 300`, which the widened collector satisfies whether it scans 24 files or 13. Replace it with a floor that a narrowing regex cannot meet:

```ts
it('scans every controller and finds the admin routes in all of them', () => {
  // 579 admin-role routes across 24 files on 2026-09-12, before this plan
  // deleted 30 restaurant routes and 11 taxi ones. The floor is deliberately
  // close to the real number: a collector that silently stops seeing a
  // controller drops ~100 routes and must fail here rather than pass with
  // fewer things to check.
  expect(routes.length).toBeGreaterThan(500);
  const files = new Set(routes.map((r) => r.file));
  expect(files.size).toBeGreaterThanOrEqual(18);
  // The blind spot by name, so it cannot come back unnoticed.
  for (const f of [
    'seller-marketplace.controller.ts',
    'marketplace.controller.ts',
    'grocery.controller.ts',
    'pharmacy.controller.ts',
    'payment.controller.ts',
    'static-pages.controller.ts',
  ]) {
    expect(files.has(f)).toBe(true);
  }
});
```

- [ ] **Step 6: Run the whole gateway suite**

From `apps/api`:

```
npx vitest run apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts
```

Expected: **6 passed** (`scans every controller…`, `resolves a market…`, `@GlobalEntity on reads only…`, `every guard named in GUARD_SCOPED…`, `sees every route decorator…`, `does not let a helper…`), with the offender report empty.

Then `npx vitest run` → **725 passed** and `npx nest build --all` → exit 0.

- [ ] **Step 7: Prove the spec bites**

A regression spec nobody has seen fail is a spec nobody has tested. Temporarily remove the scope call from one handler and confirm the failure names it:

```bash
cd apps/api
sed -i 's/^\(\s*\)const { scope } = this.scopeOf(req, undefined, .that listing.);$/\1const scope = undefined;/' \
  apps/api-gateway/src/controllers/grocery.controller.ts
npx vitest run apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts
git checkout apps/api-gateway/src/controllers/grocery.controller.ts
```

Expected: FAIL with `PATCH /grocery/admin/products/:productId/approve   (grocery.controller.ts)` in the report, then green again after the checkout. Record the failure text in the task report.

- [ ] **Step 8: Commit**

```bash
git add apps/api/apps/api-gateway/src/guards/admin-market-scope.regression.spec.ts \
        apps/api/apps/api-gateway/src/controllers/doctor.controller.ts \
        apps/api/apps/api-gateway/src/controllers/taxi.controller.ts \
        apps/api/apps/api-gateway/src/controllers/upload.controller.ts \
        apps/api/apps/api-gateway/src/controllers/region.controller.ts \
        modules/doctor/backend/src
git commit -m "test(gateway): the scope regression spec selects routes by their role, not by their filename" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9 (R9): The fail-closed reads that should be filters — marketplace analytics, platform revenue, hotel stats — and the orphaned report path

**Closes: AUD2-080, AUD2-087, AUD2-088, AUD2-091, AUD2-096** (E F-20, F-26, F-27, F-30; C §2 #5; §3(b) "must become a filter"; §13 rows QA-15, QA-16, X-26, X-33)

A regional admin today has **no** marketplace analytics (10 routes, all `refuseScopedReport`), **no** platform revenue report (501), and **no** hotel statistics — while grocery produces a real per-market report from the same shape of data (`modules/grocery/backend/src/admin/admin.service.ts:440-461`). Section 3(b) is explicit that these are holes, not safety properties: the attribution joins already exist. `marketplace_orders.region_code`, `sellers.regionCode`, `return_requests.region_code`, `"order".orders.region_code` and `hotel_bookings.hotelCountryCode` are all present columns.

This task adopts grocery's join-and-predicate model in the three places that refuse, and closes the orphaned `report-service` path that would answer the global total to any caller who wired a route to it.

**Files:**

- Modify: `modules/marketplace/backend/src/analytics/analytics.service.ts` (all ten methods)
- Modify: `modules/marketplace/backend/src/marketplace.controller.ts:2580-2652` (delete `refuseScopedReport`, pass the market)
- Modify: `apps/api/apps/admin-service/src/admin.service.ts:595-610` (`getRevenueReport`)
- Modify: `apps/api/apps/admin-service/src/admin.module.ts` (inject `ORDER_SERVICE`)
- Modify: `apps/api/apps/order-service/src/order.controller.ts` + `order.service.ts` (a revenue aggregate)
- Modify: `modules/hotel/backend/src/hotel.service.ts:587-617`, `modules/hotel/backend/src/admin/admin.controller.ts:107,144`
- Modify: `apps/api/apps/report-service/src/report.service.ts:39`
- Create: `modules/marketplace/backend/src/analytics/analytics-scope.spec.ts`
- Create: `modules/hotel/backend/src/hotel-report-scope.spec.ts`
- Modify: `apps/api/apps/admin-service/src/admin.scope.spec.ts` (extend)
- Create: `apps/api/scripts/verification/regional-integrity.mjs`

**Interfaces:**

- Produces: every analytics method takes `market?: string` as its **last** parameter — `getRevenueAnalytics(period?, market?)`, `getConversionFunnel(period?, market?)`, `getSellerRankings(sortBy?, market?)`, `getCategoryPerformance(market?)`, `getRegionalPerformance(market?)`, `getInventoryAging(market?)`, `getReturnRateAnalysis(market?)`, `getFraudAlerts(market?)`, `getSLACompliance(sellerId?, market?)`, `getPenaltyLedger(sellerId?, market?)`. `undefined` means every market (a global admin), exactly as `scope` does everywhere else.
- Produces RPC: `admin_revenue_report { startDate, endDate, groupBy, country?, scope? }` answers `{ range, groupBy, market, series: [{ date, orders, revenue, currency }], totals }` — real rows from `"order".orders`, never a synthesised series.
- Produces RPC: `orders.revenue_by_period { startDate, endDate, groupBy, market? }` on order-service (new).
- Produces: `admin_hotel_stats` / `admin_revenue` take `scope` and answer per-market figures; `getAdminAnalytics(market?)` predicates hotels on `countryCode`, bookings on `hotelCountryCode`, and reviews through `hotel_reviews → hotels`.
- Produces: `apps/api/scripts/verification/regional-integrity.mjs` and the npm script `verify:regional` — the live harness tasks 1–9 probe against, and the file the TESTS plan extends into the full §13 matrix.
- Removes: `MarketplaceController.refuseScopedReport`. A report that cannot be attributed still calls `refuseUnattributable` directly; there is no per-controller wrapper to drift.

- [ ] **Step 1: Write the failing analytics spec**

Create `modules/marketplace/backend/src/analytics/analytics-scope.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { MarketplaceAnalyticsService } from './analytics.service';

/**
 * Repositories that record the `where` they were given, so the spec asserts the
 * market reached the QUERY. Asserting on returned rows would pass against a
 * post-filter over `take(500)`, which is the failure mode that makes a report
 * look like "this market had a quiet month" (audit X-57).
 */
function service() {
  const seen: Record<string, any[]> = { orders: [], sellers: [], returns: [], products: [] };
  const repo = (bucket: string, rows: any[] = []) => ({
    count: vi.fn(async (opts: any) => {
      seen[bucket].push(opts?.where ?? null);
      return rows.length;
    }),
    find: vi.fn(async (opts: any) => {
      seen[bucket].push(opts?.where ?? null);
      return rows;
    }),
    createQueryBuilder: vi.fn(() => {
      const qb: any = {
        preds: [] as string[],
        leftJoin: () => qb,
        select: () => qb,
        addSelect: () => qb,
        where: (s: string) => (qb.preds.push(s), qb),
        andWhere: (s: string) => (seen[bucket].push(s), qb),
        groupBy: () => qb,
        orderBy: () => qb,
        take: () => qb,
        getRawMany: async () => [],
        getRawOne: async () => ({ total: 0 }),
        getManyAndCount: async () => [rows, rows.length],
      };
      return qb;
    }),
  });
  const svc = Object.create(MarketplaceAnalyticsService.prototype) as MarketplaceAnalyticsService;
  Object.assign(svc, {
    orderRepo: repo('orders', [
      { id: 'o-qa', regionCode: 'QA', grandTotal: 100, status: 'DELIVERED', createdAt: new Date() },
    ]),
    sellerRepo: repo('sellers', [{ id: 's-qa', regionCode: 'QA', businessName: 'QA Seller' }]),
    returnRepo: repo('returns'),
    productRepo: repo('products'),
    categoryRepo: repo('products'),
    reviewRepo: repo('products'),
    logger: { log: vi.fn(), warn: vi.fn() },
  });
  return { svc, seen };
}

const naming = (bucket: any[], needle: string) => JSON.stringify(bucket).includes(needle);

describe('marketplace analytics answer per market instead of refusing', () => {
  it('revenue predicates the order query on the market', async () => {
    const { svc, seen } = service();
    const res = await svc.getRevenueAnalytics('month', 'QA');
    expect(res.summary).toBeDefined();
    expect(naming(seen.orders, 'QA') || naming(seen.orders, 'regionCode')).toBe(true);
  });

  it('seller rankings predicate the seller query on the market', async () => {
    const { svc, seen } = service();
    await svc.getSellerRankings('revenue', 'QA');
    expect(naming(seen.sellers, 'QA') || naming(seen.sellers, 'regionCode')).toBe(true);
  });

  it('return analysis and SLA predicate too', async () => {
    const { svc, seen } = service();
    await svc.getReturnRateAnalysis('QA');
    await svc.getSLACompliance(undefined, 'QA');
    expect(naming(seen.returns, 'QA') || naming(seen.returns, 'regionCode')).toBe(true);
  });

  it('a global caller (no market) adds no predicate at all', async () => {
    const { svc, seen } = service();
    await svc.getRevenueAnalytics('month');
    expect(naming(seen.orders, 'regionCode')).toBe(false);
  });

  it('every one of the ten accepts a market parameter', () => {
    const { svc } = service();
    for (const m of [
      'getRevenueAnalytics',
      'getConversionFunnel',
      'getSellerRankings',
      'getCategoryPerformance',
      'getRegionalPerformance',
      'getInventoryAging',
      'getReturnRateAnalysis',
      'getFraudAlerts',
      'getSLACompliance',
      'getPenaltyLedger',
    ]) {
      expect(typeof (svc as any)[m]).toBe('function');
      expect((svc as any)[m].length).toBeGreaterThan(0);
    }
  });
});
```

Run from `modules/marketplace`: `npx vitest run src/analytics/analytics-scope.spec.ts` → FAIL, none of the ten takes a market.

- [ ] **Step 2: Predicate the ten analytics reads**

`modules/marketplace/backend/src/analytics/analytics.service.ts`. The pattern, applied consistently — a helper at the top of the class:

```ts
  /**
   * Narrow a repository `where` to one market, or leave it open.
   *
   * All ten reads used to refuse a scoped caller outright, so a regional admin
   * had no marketplace analytics at all (audit F-26). Every figure they produce
   * is attributable: an order carries `region_code`, a seller carries
   * `regionCode`, a return carries `region_code`, and a product attributes
   * through its seller — which is the same join `adminProductQuery` already
   * documents. Grocery has produced real per-market reports from this shape of
   * data since Plan A (`grocery/admin/admin.service.ts:440`).
   */
  private marketWhere<T extends object>(where: T, market?: string): T {
    const m = normaliseMarket(market);
    return m ? ({ ...where, regionCode: m } as T) : where;
  }
```

Then per method:

- `getRevenueAnalytics(period?, market?)` — every `orderRepo.count()` / `.find()` takes `where: this.marketWhere({}, market)` and `this.marketWhere({ createdAt: MoreThanOrEqual(since) }, market)`. `_getTopCategoryRevenue(market)` counts products through the seller join.
- `getConversionFunnel(period?, market?)` — same on the order counts.
- `getSellerRankings(sortBy?, market?)` — `sellerRepo.find({ where: this.marketWhere({}, market) })`; the per-seller order and return counts already filter by `sellerId`, so they inherit the market.
- `getCategoryPerformance(market?)` / `getInventoryAging(market?)` — the product counts gain `.leftJoin('p.seller','s')` + `applyMarketFilter(qb, 's.regionCode', market)`.
- `getRegionalPerformance(market?)` — when a market is given, the breakdown is by **state/city within** that market, not by market; say so in the response (`{ scope: market ?? 'ALL', groupedBy: market ? 'state' : 'market' }`) so the console cannot draw a national chart under a regional heading.
- `getReturnRateAnalysis(market?)` — `returnRepo` on `regionCode`.
- `getFraudAlerts(market?)`, `getSLACompliance(sellerId?, market?)`, `getPenaltyLedger(sellerId?, market?)` — order and seller predicates.

Where a figure genuinely cannot be attributed, do **not** quietly return the global number: return it as `null` with a sibling flag, exactly as `getCategoryPerformance` already does with `dataAvailable: false`. A half-scoped report that looks whole is the failure this task exists to prevent.

Then in `modules/marketplace/backend/src/marketplace.controller.ts`, delete `refuseScopedReport` (lines 2580-2592) and pass the market through:

```ts
  // The ten analytics reads take the market the gateway resolved. They used to
  // refuse any scoped caller, because `MarketplaceAnalyticsService` had no
  // region parameter and answering would have handed a regional admin the
  // platform's numbers under their own market's name. It has one now (R9), so
  // they answer.
  @MessagePattern({ cmd: 'admin_get_revenue_analytics' })
  tcpRevenueAnalytics(@Payload() data: any) {
    return this.analytics.getRevenueAnalytics(data?.period, marketPredicate(data?.scope, data?.region));
  }
```

…and the same shape for the other nine.

- [ ] **Step 3: Make the platform revenue report real**

`apps/api/apps/order-service/src/order.controller.ts` gains:

```ts
  /**
   * Revenue and order counts over a date range, per market.
   *
   * admin-service owns the admin route but not the orders; `"order".orders`
   * carries `region_code` and `currency` and lives here. This is the query the
   * platform's only revenue report was missing — it answered 501 for every
   * market (audit F-27) after an earlier pass found it synthesising a series.
   */
  @MessagePattern({ cmd: 'orders.revenue_by_period' })
  msgRevenueByPeriod(
    @Payload() d: { startDate: string; endDate: string; groupBy?: 'day' | 'week' | 'month'; market?: string },
  ) {
    return this.svc.revenueByPeriod(d?.startDate, d?.endDate, d?.groupBy ?? 'day', d?.market);
  }
```

backed by a single grouped query in `order.service.ts`:

```ts
  async revenueByPeriod(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
    market?: string,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required.');
    const trunc = { day: 'day', week: 'week', month: 'month' }[groupBy];
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select(`date_trunc('${trunc}', o."placedAt")`, 'bucket')
      .addSelect('COUNT(*)::int', 'orders')
      .addSelect('COALESCE(SUM(o."grandTotal"), 0)', 'revenue')
      .addSelect('o.currency', 'currency')
      .where('o."placedAt" >= :startDate', { startDate })
      .andWhere('o."placedAt" < (:endDate::date + 1)', { endDate })
      .andWhere("o.status::text NOT IN ('CANCELLED','FAILED')")
      .groupBy('bucket')
      .addGroupBy('o.currency')
      .orderBy('bucket', 'ASC');
    applyMarketFilter(qb, 'o.region_code', market);
    const rows = await qb.getRawMany();
    return {
      range: { startDate, endDate },
      groupBy,
      market: market ?? null,
      series: rows.map((r) => ({
        date: new Date(r.bucket).toISOString().slice(0, 10),
        orders: Number(r.orders),
        revenue: Number(r.revenue),
        currency: r.currency,
      })),
      totals: {
        orders: rows.reduce((s, r) => s + Number(r.orders), 0),
        // Deliberately per currency: summing QAR and INR into one number is the
        // kind of figure that reads as revenue and is not.
        revenue: rows.reduce<Record<string, number>>((acc, r) => {
          acc[r.currency] = (acc[r.currency] ?? 0) + Number(r.revenue);
          return acc;
        }, {}),
      },
    };
  }
```

`apps/api/apps/admin-service/src/admin.service.ts:595-610` then forwards instead of refusing:

```ts
  async getRevenueReport(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
    scope?: string,
  ) {
    // Was a NotImplementedException for every market. `"order".orders` carries
    // `region_code`, so the platform's only revenue report can be the real
    // thing rather than a documented absence (audit F-27 / §3(b)).
    return firstValueFrom(
      this.orderClient
        .send({ cmd: 'orders.revenue_by_period' }, {
          startDate, endDate, groupBy, market: marketPredicate(scope),
        })
        .pipe(timeout(10_000), catchError(rpcCatch('Order service unavailable'))),
    );
  }
```

with `ORDER_SERVICE` registered in `admin.module.ts` (copy the `ClientsModule.register` entry from `api-gateway`'s module; the TCP port comes from `env.validation.ts` and must match order-service's own bind port — a mismatch is silently masked by `.env`).

- [ ] **Step 4: Close the orphaned report path**

`apps/api/apps/report-service/src/report.service.ts:39` — `generateRevenueReport` reads the same global counters and has no guard, so anyone who wires a controller to it gets the platform total. It is unreachable today only by accident. Two honest options; take the first unless the service is wanted:

```ts
  async generateRevenueReport(
    startDate: string,
    endDate: string,
    groupBy = 'day',
    scope?: string,
  ) {
    // Fail closed before anyone wires a route to this. It reads
    // `admin:counter:revenue:*`, which had no market dimension at all until
    // 2026-09-12 and still aggregates GLOBAL buckets — so a scoped caller would
    // be handed the platform's total under their own market's name (audit C §2
    // #5 / AUD2-096). `admin-service.getRevenueReport` is the real report; this
    // service has no gateway client injected and never had one.
    refuseUnattributable(scope, 'report', this.logger);
```

If the whole service is dead, delete it and its compose entry instead, and say so in the task report. Do not leave it as it is: an unguarded aggregate one `@Inject` away from a route is the shape of the next finding.

- [ ] **Step 5: Hotel stats and revenue**

`modules/hotel/backend/src/hotel.service.ts:587` — `getAdminAnalytics(market?)`:

```ts
  /**
   * Platform statistics for one market, or all.
   *
   * This refused every scoped caller because `hotel_reviews` carries only
   * `hotelId` and a half-scoped report is worse than none (audit F-30). The
   * join is one hop: `hotel_reviews → hotels.countryCode`. Bookings need no
   * join at all — `hotel_bookings.hotelCountryCode` is a snapshot written at
   * booking time precisely so reports can be attributed without one.
   */
  async getAdminAnalytics(market?: string) {
    const m = normaliseMarket(market);
    const hotelWhere = m ? { countryCode: m } : {};
    const totalHotels = await this.hotelRepo.count({ where: hotelWhere });
    const activeHotels = await this.hotelRepo.count({
      where: { ...hotelWhere, isAcceptingBookings: true },
    });

    const bookingQb = this.bookingRepo.createQueryBuilder('b');
    applyMarketFilter(bookingQb, 'b.hotelCountryCode', m);
    const totalBookings = await bookingQb.getCount();

    const reviewQb = this.reviewRepo
      .createQueryBuilder('r')
      .leftJoin('hotels', 'h', 'h.id = r.hotelId');
    applyMarketFilter(reviewQb, 'h.countryCode', m);
    const totalReviews = await reviewQb.getCount();
    …
  }
```

and `modules/hotel/backend/src/admin/admin.controller.ts:107,144` drop `refuseUnattributable` and pass `d?.scope ?? d?.countryCode` through.

`modules/hotel/backend/src/hotel-report-scope.spec.ts` asserts: a QA market narrows hotels, bookings and reviews (three recorded predicates); no market adds none; the review count uses the **join** rather than a post-filter.

- [ ] **Step 6: Build the live harness**

Create `apps/api/scripts/verification/regional-integrity.mjs`, modelled on `admin-scope-authz.mjs` (same `login` with the MFA step, same `ok`/`skip` counters, same `API_BASE` env var defaulting to `http://localhost:3099/api/v1`). It runs the probes from tasks 1–9 as assertions, and **every** "QA-only" check also asserts `rows.length > 0` — an empty list reports `SKIPPED`, never `PASS` (§13 X-57) — and every refusal check has a same-market control that must return 2xx (§13 X-56).

Add to `apps/api/package.json`:

```json
    "verify:regional": "node scripts/verification/regional-integrity.mjs"
```

- [ ] **Step 7: Run everything**

```
cd modules/marketplace && npx vitest run          # 265 passed
cd ../hotel            && npx vitest run          # 29 passed
cd ../../apps/api      && npx vitest run          # 730 passed
npx nest build --all                              # exit 0
cd ../.. && (cd modules/hotel/backend && npx nest build)
```

- [ ] **Step 8: Live probe**

```bash
printf 'QA-15 QA analytics/revenue: '
curl -s -w ' [%{http_code}]\n' -H "Authorization: Bearer $QA" "$B/admin/marketplace/analytics/revenue" \
  | node -pe 'const t=require("fs").readFileSync(0,"utf8");const c=t.match(/\[(\d+)\]/)[1];
      const d=JSON.parse(t.slice(0,t.lastIndexOf("[")));const s=d.data?.summary??d.summary;
      JSON.stringify({code:c,gmv:s?.totalGMV,orders:s?.totalOrders})'
printf 'SUPER analytics/revenue (must be >= QA): '
curl -s -H "Authorization: Bearer $SU" "$B/admin/marketplace/analytics/revenue" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const s=d.data?.summary??d.summary;
      JSON.stringify({gmv:s?.totalGMV,orders:s?.totalOrders})'
printf 'X-26 QA seller-rankings markets: '
curl -s -H "Authorization: Bearer $QA" "$B/admin/marketplace/analytics/seller-rankings" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const r=d.data?.data??d.data??[];
      JSON.stringify({n:r.length,sellers:r.map(x=>x.sellerId).length})'
printf 'QA-16 QA /admin/reports/revenue: '
curl -s -w ' [%{http_code}]\n' -H "Authorization: Bearer $QA" \
  "$B/admin/reports/revenue?startDate=2026-08-01&endDate=2026-09-12&groupBy=day" | head -c 300; echo
printf 'SA-09 SUPER /admin/reports/revenue: '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $SU" \
  "$B/admin/reports/revenue?startDate=2026-08-01&endDate=2026-09-12&groupBy=day"
printf 'QA /admin/hotel/stats: '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" "$B/admin/hotel/stats"
```

Expected: the QA analytics call returns `200` with non-zero figures; the SUPER call returns figures **greater than or equal to** QA's on every counter (SA-02 ≥ SA-03; if QA's exceeds the platform's, the predicate is inverted); the QA rankings list is non-empty and contains only QA sellers; both revenue reports are `200` with a `series` array; hotel stats is `200`. Cross-check the revenue figure against the database rather than trusting the response:

```bash
docker exec kartseek-postgres psql -U postgres -d kartseek_db -tAc \
  "SELECT region_code, count(*), sum(\"grandTotal\") FROM \"order\".orders
    WHERE \"placedAt\" >= '2026-08-01' AND status::text NOT IN ('CANCELLED','FAILED')
    GROUP BY 1 ORDER BY 1"
```

The QA row must equal the QA admin's totals exactly. A figure that is close but not equal means a leg of the aggregate is unpredicated.

Then run the harness: `cd apps/api && npm run verify:regional` → every row PASS or SKIPPED, zero FAIL.

- [ ] **Step 9: Commit**

```bash
git add modules/marketplace/backend/src/analytics modules/marketplace/backend/src/marketplace.controller.ts \
        modules/hotel/backend/src \
        apps/api/apps/admin-service/src apps/api/apps/order-service/src \
        apps/api/apps/report-service/src/report.service.ts \
        apps/api/scripts/verification/regional-integrity.mjs apps/api/package.json
git commit -m "feat(reports): marketplace analytics, platform revenue and hotel stats answer per market" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10 (R10): The cache keys that serve one market's data to another

**Closes: AUD2-035, AUD2-036, AUD2-094** (C §2 leaks 3 and 4, C §3; §9(e) cases 3, 5, 6)

Three cache defects assigned to REGIONAL. They share one shape — a key that either loses its market or is never purged for the markets it holds.

1. **`zone:demand:${zoneId or 'DEFAULT_ZONE'}`** (`fare-calculation.service.ts:218`) — `getSurgeForZone` reads a client-optional `zoneId` and falls back to the literal `'DEFAULT_ZONE'`, so every country's demand counter is one bucket. Meanwhile `ride-matching.service.ts:121` **writes** the correctly H3-keyed counter, which this read never consults. A demand spike in Mumbai inflates the surge quoted to a Doha rider.
2. **`redisBasedSearch`** (`search-service/src/search.service.ts:331-378`) — the Elasticsearch-down fallback applies price and rating filters and never compares `filters.country` to `doc.metadata.countryCode`, though the ES path does exactly that at `:282`. A country-filtered query returns every market's documents mixed together.
3. **`invalidateCategoryCache`** (`grocery.service.ts:589-604`) — purges `grocery:categories:all` and the per-category keys, and leaves `grocery:categories:stocked:${region}` and `grocery:categories:tree:${market}` stale for the full 300 s. `migrateCategoryTaxonomy` (`:1010-1013`) purges `:tree:` but not `:stocked:`, with a far larger blast radius.

The related rate-card leak (`taxi:rates:IN` for every country, AUD2-018/019) is **TAXI workstream**, not REGIONAL, and is not in this task. Leak 3 below shares its root cause — a client-optional `zoneId` — so this task creates the shared derivation the TAXI plan will also use, and says so.

**Files:**

- Create: `modules/taxi/backend/src/services/h3-zone.ts` + `h3-zone.spec.ts`
- Modify: `modules/taxi/backend/src/services/ride-matching.service.ts:58-76,120,416`
- Modify: `modules/taxi/backend/src/services/fare-calculation.service.ts:208-226`
- Create: `modules/taxi/backend/src/services/surge-zone.spec.ts`
- Modify: `apps/api/apps/search-service/src/search.service.ts:331-378`
- Create: `apps/api/apps/search-service/src/search-fallback-scope.spec.ts`
- Modify: `modules/grocery/backend/src/grocery.service.ts:589-604`, `:1005-1015`
- Create: `modules/grocery/backend/src/grocery-cache-invalidation.spec.ts`

**Interfaces:**

- Produces `modules/taxi/backend/src/services/h3-zone.ts`:

  ```ts
  /** The demand/supply cell a coordinate falls in. Globally unique — two cells in
   *  two countries can never collide, which is the property `DEFAULT_ZONE` lost. */
  export function getH3Zone(lat: number, lng: number, resolution?: number): string;
  /** Self plus the six neighbours, for an expanded search. */
  export function getAdjacentZones(lat: number, lng: number, resolution?: number): string[];
  ```

  `RideMatchingService.getH3Zone` and `.getAdjacentZones` become one-line delegates so both call sites share one derivation. A free function rather than an injected service: `FareCalculationService` and `RideMatchingService` would otherwise form a cycle, and this is arithmetic with no state.

- Produces: `getSurgeForZone(lat, lng)` — the `zoneId?` parameter is **removed**. A client-supplied zone id must not influence a price; the coordinates already name the cell. Callers that passed `dto.zoneId` drop the argument.
- Produces: `redisBasedSearch` honours `filters.country` against `doc.metadata.countryCode ?? doc.metadata.country`, mirroring the ES `term` filter at `:282`.
- Produces: `invalidateCategoryCache()` and `migrateCategoryTaxonomy()` both purge `grocery:categories:stocked:*` and `grocery:categories:tree:*` alongside the unscoped keys.

- [ ] **Step 1: Write the failing surge spec**

Create `modules/taxi/backend/src/services/surge-zone.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { FareCalculationService } from './fare-calculation.service';
import { getH3Zone } from './h3-zone';

const DOHA = { lat: 25.2854, lng: 51.531 };
const MUMBAI = { lat: 19.076, lng: 72.8777 };

function service(demand: Record<string, string>, nearby = 1) {
  const reads: string[] = [];
  const redis = {
    get: vi.fn(async (k: string) => {
      reads.push(k);
      return demand[k] ?? null;
    }),
    georadius: vi.fn(async () => Array.from({ length: nearby }, (_, i) => `d-${i}`)),
  };
  const svc = Object.create(FareCalculationService.prototype) as FareCalculationService;
  Object.assign(svc, {
    redis,
    taxiConfig: { getRateCard: vi.fn(async () => null) },
    logger: { warn: vi.fn() },
  });
  return { svc, reads };
}

describe('surge is derived from the coordinates, not from a client zone id', () => {
  it('never reads the DEFAULT_ZONE bucket', async () => {
    const { svc, reads } = service({});
    await (svc as any).getSurgeForZone(DOHA.lat, DOHA.lng);
    expect(reads.some((k) => k.includes('DEFAULT_ZONE'))).toBe(false);
  });

  it('reads the same cell key ride-matching writes', async () => {
    const cell = getH3Zone(DOHA.lat, DOHA.lng);
    const { svc, reads } = service({ [`zone:demand:${cell}`]: '20' });
    await (svc as any).getSurgeForZone(DOHA.lat, DOHA.lng);
    expect(reads).toContain(`zone:demand:${cell}`);
  });

  it('a Mumbai demand spike does not raise the surge quoted in Doha', async () => {
    const mumbaiCell = getH3Zone(MUMBAI.lat, MUMBAI.lng);
    const dohaCell = getH3Zone(DOHA.lat, DOHA.lng);
    expect(mumbaiCell).not.toBe(dohaCell);
    const { svc } = service({ [`zone:demand:${mumbaiCell}`]: '500' }, 1);
    // Doha's own cell has no demand recorded, so the multiplier is the floor.
    await expect((svc as any).getSurgeForZone(DOHA.lat, DOHA.lng)).resolves.toBe(1.0);
  });

  it('the same spike in the rider own cell does raise it — the control', async () => {
    const dohaCell = getH3Zone(DOHA.lat, DOHA.lng);
    const { svc } = service({ [`zone:demand:${dohaCell}`]: '500' }, 1);
    await expect((svc as any).getSurgeForZone(DOHA.lat, DOHA.lng)).resolves.toBeGreaterThan(1.0);
  });

  it('takes no zoneId parameter at all', () => {
    const { svc } = service({});
    expect((svc as any).getSurgeForZone.length).toBe(2);
  });
});
```

Run from `modules/taxi`: `npx vitest run src/services/surge-zone.spec.ts` → FAIL — `getSurgeForZone` has arity 3, reads `zone:demand:DEFAULT_ZONE`, and `./h3-zone` does not exist.

- [ ] **Step 2: Extract the cell derivation and use it on both sides**

Create `modules/taxi/backend/src/services/h3-zone.ts`:

```ts
/**
 * The demand/supply cell a coordinate falls in.
 *
 * A grid approximation of an H3 cell — roughly 1.2 km across at resolution 8.
 * Two properties matter and neither is about precision:
 *
 *   1. It is derived from coordinates the server already has, never from a
 *      client-supplied `zoneId`. A rider's app could name any zone, and a zone
 *      name that reaches a price is a price the rider chose.
 *   2. It is globally unique. `'DEFAULT_ZONE'` — the literal `getSurgeForZone`
 *      fell back to — is not: every country's demand counter collapsed into one
 *      bucket, so a Mumbai spike inflated the surge quoted to a Doha rider
 *      (audit C leak 3).
 *
 * A free function rather than a service method: `FareCalculationService` and
 * `RideMatchingService` both need it and injecting either into the other makes
 * a cycle. It has no state and no dependencies.
 */
export function getH3Zone(lat: number, lng: number, resolution = 8): string {
  const cellSize = 0.011 * Math.pow(3, 8 - resolution);
  const row = Math.floor(lat / cellSize);
  const col = Math.floor(lng / cellSize);
  return `h3:${resolution}:${row}:${col}`;
}

/** Self plus the six neighbours, for an expanded driver search. */
export function getAdjacentZones(lat: number, lng: number, resolution = 8): string[] {
  const cellSize = 0.011 * Math.pow(3, 8 - resolution);
  const row = Math.floor(lat / cellSize);
  const col = Math.floor(lng / cellSize);
  const offsets: Array<[number, number]> = [
    [0, 0],
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, -1],
    [-1, 1],
  ];
  return offsets.map(([dr, dc]) => `h3:${resolution}:${row + dr}:${col + dc}`);
}
```

`h3-zone.spec.ts` asserts: two coordinates 2 000 km apart never share a cell; the same coordinate is stable across calls; `getAdjacentZones` returns 7 entries whose first is `getH3Zone`.

In `ride-matching.service.ts`, replace the two method bodies (lines 58-64 and 69-76) with delegates and import the free functions, so the key written at `:121` and `:417` is byte-identical to the one read below:

```ts
import { getAdjacentZones, getH3Zone } from './h3-zone';
…
  getH3Zone(lat: number, lng: number, resolution = 8): string {
    return getH3Zone(lat, lng, resolution);
  }

  getAdjacentZones(lat: number, lng: number, resolution = 8): string[] {
    return getAdjacentZones(lat, lng, resolution);
  }
```

In `fare-calculation.service.ts`, replace `getSurgeForZone` (lines 208-226):

```ts
  /**
   * The surge multiplier where the rider is standing.
   *
   * `zoneId` is gone. It was client-optional, defaulted to the literal
   * `'DEFAULT_ZONE'`, and no caller in the repository ever supplied one — so
   * this read a single global demand counter while `ride-matching.service.ts`
   * dutifully incremented per-cell counters that nothing consulted (audit C
   * leak 3). The cell now comes from the pickup coordinates, which is the same
   * derivation the write side uses.
   */
  private async getSurgeForZone(lat: number, lng: number): Promise<number> {
    const cell = getH3Zone(lat, lng);
    const explicit = await this.redis.get(`surge:${cell}`);
    if (explicit) return parseFloat(explicit);

    const nearby = await this.redis.georadius('drivers:locations', lng, lat, 3);
    const demand = await this.redis.get(`zone:demand:${cell}`);
    const demandCount = demand ? parseInt(demand, 10) : 0;
    const supply = nearby.length || 1;
    const ratio = demandCount / supply;
    if (ratio > 5) return 2.0;
    if (ratio > 3) return 1.5;
    if (ratio > 2) return 1.2;
    return 1.0;
  }
```

Note `surge:${zoneId}` becomes `surge:${cell}`: §9(a) records `surge:${zoneId}` as a **dead key — never written anywhere**, so re-pointing it costs nothing and gives the TAXI plan's surge-zone entity a key shape to write into. Update every caller of `getSurgeForZone` to drop the third argument (`grep -n "getSurgeForZone(" modules/taxi/backend/src`).

**Note for the TAXI plan:** `getRateCard(vehicleType, zoneId?)` at `:189` has the identical root cause — `zoneId?.split('-')[0] || 'IN'` prices every market off India's card (AUD2-018). It is not fixed here because it belongs to that workstream, but the fix is the same shape: derive the country from `pickupLat`/`pickupLng` via `getH3Zone` plus `RegionService`, and delete the `zoneId` parameter. Leave a `TODO(TAXI-plan, AUD2-018)` comment on that method pointing at `h3-zone.ts`.

- [ ] **Step 3: The search fallback checks the country the ES path checks**

Create `apps/api/apps/search-service/src/search-fallback-scope.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { SearchService } from './search.service';

function service(docs: Array<{ id: string; country: string }>) {
  const redis = {
    getJson: vi.fn(async (k: string) => {
      if (k.startsWith('search:index:set:')) return docs.map((d) => d.id);
      const id = k.split(':').pop();
      const doc = docs.find((d) => d.id === id);
      return doc
        ? {
            id: doc.id,
            title: 'Widget',
            description: 'A widget',
            price: 10,
            rating: 4,
            metadata: { countryCode: doc.country },
          }
        : null;
    }),
  };
  const svc = Object.create(SearchService.prototype) as SearchService;
  Object.assign(svc, { redis, esAvailable: false, logger: { warn: vi.fn(), log: vi.fn() } });
  return svc;
}

describe('the Elasticsearch-down fallback honours the country filter', () => {
  it('returns only the asked-for market, as the ES term filter does', async () => {
    const svc = service([
      { id: 'in-1', country: 'IN' },
      { id: 'qa-1', country: 'QA' },
    ]);
    const res = await (svc as any).redisBasedSearch('widget', { country: 'QA' }, 1, 20);
    expect(res.results.map((r: any) => r.id)).toEqual(['qa-1']);
    expect(res.total).toBe(1);
  });

  it('returns every market when no country is asked for', async () => {
    const svc = service([
      { id: 'in-1', country: 'IN' },
      { id: 'qa-1', country: 'QA' },
    ]);
    const res = await (svc as any).redisBasedSearch('widget', {}, 1, 20);
    expect(res.results).toHaveLength(2);
  });

  it('excludes a document with no market when a market is asked for', async () => {
    const svc = service([{ id: 'x', country: '' }]);
    const res = await (svc as any).redisBasedSearch('widget', { country: 'QA' }, 1, 20);
    expect(res.results).toHaveLength(0);
  });

  it('matches case-insensitively — the index stores what the writer sent', async () => {
    const svc = service([{ id: 'qa-1', country: 'qa' }]);
    const res = await (svc as any).redisBasedSearch('widget', { country: 'QA' }, 1, 20);
    expect(res.results).toHaveLength(1);
  });
});
```

Then in `search.service.ts`, inside the `if (matchTitle || matchDesc)` block at line 354, alongside the existing price and rating filters:

```ts
// Apply filters
if (filters.minPrice && doc.price && doc.price < filters.minPrice) continue;
if (filters.maxPrice && doc.price && doc.price > filters.maxPrice) continue;
if (filters.rating && doc.rating && doc.rating < filters.rating) continue;
// The market, mirroring the ES `term` filter at :282. Without it a
// country-filtered query returned every market's documents the moment
// Elasticsearch went down — a filter that silently stops filtering is
// worse than one that errors (audit C leak 4).
if (filters.country) {
  const wanted = String(filters.country).trim().toUpperCase();
  const owner = String((doc as any).metadata?.countryCode ?? (doc as any).metadata?.country ?? '')
    .trim()
    .toUpperCase();
  if (owner !== wanted) continue;
}
```

- [ ] **Step 4: Purge every market's grocery category keys**

Create `modules/grocery/backend/src/grocery-cache-invalidation.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { GroceryService } from './grocery.service';

function service() {
  const purged: string[] = [];
  const redis = {
    del: vi.fn(async (k: string) => void purged.push(k)),
    delPattern: vi.fn(async (p: string) => (purged.push(p), 0)),
    getJson: vi.fn(async () => null),
    setJson: vi.fn(async () => undefined),
  };
  const svc = Object.create(GroceryService.prototype) as GroceryService;
  Object.assign(svc, {
    redis,
    categoryRepo: { find: vi.fn(async () => [{ id: 'c-1' }]), save: vi.fn() },
    kafka: { publish: vi.fn(async () => undefined) },
    logger: { log: vi.fn(), warn: vi.fn() },
  });
  return { svc, purged };
}

describe('grocery category invalidation reaches the per-market keys', () => {
  it('purges stocked and tree alongside the unscoped key', async () => {
    const { svc, purged } = service();
    await svc.invalidateCategoryCache();
    expect(purged).toContain('grocery:categories:all');
    // Without these two, every region's narrowed category view stayed stale for
    // the full 300 s after a rename or a deactivation (audit C §3).
    expect(purged).toContain('grocery:categories:stocked:*');
    expect(purged).toContain('grocery:categories:tree:*');
  });

  it('the taxonomy migration purges the same three — it had the larger blast radius', async () => {
    const { svc, purged } = service();
    await (svc as any).purgeCategoryKeys();
    expect(purged).toEqual(
      expect.arrayContaining([
        'grocery:categories:all',
        'grocery:categories:stocked:*',
        'grocery:categories:tree:*',
      ]),
    );
  });
});
```

In `grocery.service.ts`, add one private helper and call it from both paths, so the two can never diverge again:

```ts
  /**
   * Every key the grocery category tree is cached under, in every market.
   *
   * `invalidateCategoryCache` purged only the unscoped key, so
   * `grocery:categories:stocked:<region>` and `grocery:categories:tree:<market>`
   * served the pre-rename tree for the full 300 s TTL — and
   * `migrateCategoryTaxonomy`, whose blast radius is the whole taxonomy, missed
   * `:stocked:` too (audit C §3). One helper, both callers.
   */
  private async purgeCategoryKeys(): Promise<void> {
    await this.redis.del('grocery:categories:all').catch(() => undefined);
    await this.redis.delPattern('grocery:categories:stocked:*').catch(() => undefined);
    await this.redis.delPattern('grocery:categories:tree:*').catch(() => undefined);
  }
```

`invalidateCategoryCache` (line 589) calls `await this.purgeCategoryKeys();` in place of its single `del`, keeping the per-category `grocery:category:<id>` loop below it. `migrateCategoryTaxonomy` (line 1010) replaces its `del` + `ALL_MARKETS` loop with the same call — the loop enumerated known markets, so a market added to the registry later was silently missed; a pattern purge cannot be.

- [ ] **Step 5: Run everything**

```
cd modules/taxi    && npx vitest run     # 28 passed (20 + 5 surge + 3 h3)
cd ../grocery      && npx vitest run     # 111 passed (109 after R5 + 2)
cd ../../apps/api  && npx vitest run     # 734 passed (730 + 4)
npx nest build --all                     # exit 0
cd ../.. && (cd modules/taxi/backend && npx nest build) && (cd modules/grocery/backend && npx nest build)
```

- [ ] **Step 6: Live probe**

The cache probes need the write-then-read-as-another-market shape from §9(e); HTTP status alone proves nothing here.

```bash
# Leak 3 — surge. Seed demand in a Mumbai cell, then quote a Doha ride.
MUMCELL=$(node -e 'const{getH3Zone}=require("./modules/taxi/backend/dist/services/h3-zone");console.log(getH3Zone(19.076,72.8777))')
DOHCELL=$(node -e 'const{getH3Zone}=require("./modules/taxi/backend/dist/services/h3-zone");console.log(getH3Zone(25.2854,51.531))')
docker exec kartseek-redis redis-cli SET "zone:demand:$MUMCELL" 500
docker exec kartseek-redis redis-cli DEL "zone:demand:$DOHCELL"
printf 'Doha estimate surge with a Mumbai spike: '
curl -s -X POST -H "Authorization: Bearer $QA" -H 'Content-Type: application/json' \
  -d '{"pickupLat":25.2854,"pickupLng":51.531,"dropLat":25.3,"dropLng":51.55,"vehicleType":"economy"}' \
  "$B/taxi/estimate" | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
    JSON.stringify({surge:d.data?.surgeMultiplier??d.surgeMultiplier})'
docker exec kartseek-redis redis-cli KEYS 'zone:demand:DEFAULT_ZONE'

# Leak 4 — search fallback. Index one document per market, force ES off.
docker exec kartseek-redis redis-cli SCAN 0 MATCH 'search:index:marketplace:*' COUNT 5
# (with ELASTICSEARCH_NODE unset on the temporary gateway's search-service)
printf 'search country=QA while ES is down: '
curl -s -H "Authorization: Bearer $QA" "$B/search?q=widget&country=QA" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const r=d.data?.results??d.results??[];
    JSON.stringify({n:r.length,markets:[...new Set(r.map(x=>x.metadata?.countryCode))]})'

# C §3 — grocery invalidation. Warm both per-market keys, rename a category, re-read.
curl -s "$B/grocery/categories?stockedOnly=true" -H 'X-Region-Code: QA' > /dev/null
curl -s "$B/grocery/categories?stockedOnly=true" -H 'X-Region-Code: AE' > /dev/null
docker exec kartseek-redis redis-cli KEYS 'grocery:categories:stocked:*'
curl -s -o /dev/null -X PATCH -H "Authorization: Bearer $SU" -H 'Content-Type: application/json' \
  -d '{"name":"Renamed Probe"}' "$B/admin/grocery/categories/<some-category-id>"
docker exec kartseek-redis redis-cli KEYS 'grocery:categories:stocked:*'
docker exec kartseek-redis redis-cli KEYS 'grocery:categories:tree:*'
```

Expected: the Doha surge is `1` and `zone:demand:DEFAULT_ZONE` does not exist; the search result is QA-only with `n > 0` (if `n` is 0, index a QA document first — an empty result is SKIPPED, not PASS); the `stocked:*` listing is non-empty **before** the rename and empty **after** it, and the same for `tree:*`. A `stocked:*` key that survives the rename is the bug still present.

- [ ] **Step 7: Commit**

```bash
git add modules/taxi/backend/src/services/h3-zone.ts \
        modules/taxi/backend/src/services/h3-zone.spec.ts \
        modules/taxi/backend/src/services/surge-zone.spec.ts \
        modules/taxi/backend/src/services/ride-matching.service.ts \
        modules/taxi/backend/src/services/fare-calculation.service.ts \
        modules/grocery/backend/src/grocery.service.ts \
        modules/grocery/backend/src/grocery-cache-invalidation.spec.ts \
        apps/api/apps/search-service/src
git commit -m "fix(cache): surge reads the cell it writes, the search fallback filters by market, grocery purges both" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11 (R11): The rule set as code — one `scopeOf`, one list predicate, one market column on the money path, one encoding

**Closes: AUD2-081, AUD2-082, AUD2-086, AUD2-089** (E I3/I6/I7/I12, F-17, F-18, F-25, F-28; §2(c); §3(b) "acceptable now, must become a filter")

§2(c) states the rule set the platform is supposed to have. Four things stop it being one rule rather than a family of similar ones:

- **Nine copies** of `private scopeOf(req, requested, what)` — byte-identical in eight controllers, near-identical in the ninth (`admin-audit.controller.ts:99`, which hard-codes its `what`). Tasks 2, 5 and 6 added four more. Thirteen copies of an authorisation helper drift; this task makes them thirteen one-line delegates to one implementation.
- **~40 hand-written market predicates**, each spelling `if (scope) qb.andWhere('x.regionCode = :scope', { scope })` slightly differently — and one of them spelled `qb.where` and discarded the clause (Task 3).
- **Four encodings** of "which market this runs in": scalar `region_code` (coupons, flash deals), `regions[]` (banners), `applicableCountries` simple-array (exchange offers), `countries` jsonb (grocery categories). Four bespoke readers, four ways to be wrong.
- **24 money-path routes fail closed** because `payouts`, `refunds`, `wallet_transactions`, commission rows and settlement records carry no market — although every one descends from an order that has one.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/guards/market-scope.ts` (add `resolveScope`)
- Modify: the 13 controllers holding a `private scopeOf`
- Modify: `apps/api/libs/common/src/market/market-scope.ts` (add `applyMarketFilter`, `assertRecordMarket`, `isGlobalMarket`)
- Modify: `apps/api/libs/common/src/market/market-scope.spec.ts`
- Create: `apps/api/migrations/1786502000000-MoneyPathMarket.ts`
- Modify: `apps/api/data-source.main.ts`
- Modify: `apps/api/apps/payout-service/src/*`, `refund-service/src/*`, `wallet-service/src/*`, `commission-service/src/*`
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts` (the 24 `refuseLockedAdmin` money routes)
- Modify: `modules/marketplace/backend/src/entities/{bank-offer,exchange-offer}.entity.ts` + the banner reader
- Create: `apps/api/apps/api-gateway/src/guards/scope-helper-uniqueness.spec.ts`
- Create: `apps/api/apps/payout-service/src/payout-scope.spec.ts`

**Interfaces:** as published in the header block — `resolveScope`, `applyMarketFilter`, `assertRecordMarket`. Plus:

```ts
/** True when a record runs in every market rather than in none. `is_global` is
 *  the explicit flag; a null market with no flag means "not yet attributed". */
export function isGlobalMarket(row: { regionCode?: string | null; isGlobal?: boolean }): boolean;
```

RPC additions: `payouts.list | payouts.process | refunds.list | wallet.transactions | commission.records` all take `scope?: string` and predicate on their new `region_code`.

**Scope of the abstraction, deliberately limited.** `resolveScope` and `applyMarketFilter` earn their place — thirteen and ~forty call sites respectively, one of which was already wrong. Nothing else is extracted. In particular there is **no** `ScopedController` base class and **no** `@MarketScoped()` parameter decorator: a base class hides the call from the regression spec's regex (which reads handler bodies), and a decorator moves an authorisation decision into metadata where it is harder to read than a line of code. The spec's `this.scopeOf(` regex keeps matching because the method name survives.

- [ ] **Step 1: Write the failing uniqueness spec**

Create `apps/api/apps/api-gateway/src/guards/scope-helper-uniqueness.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CONTROLLERS = path.join(__dirname, '..', 'controllers');

/**
 * `private scopeOf` stays as the name every handler calls — the market-scope
 * regression spec matches `this.scopeOf(` in a handler body, and a base class
 * or a parameter decorator would hide the call from it. What must not stay is
 * thirteen copies of the BODY: an authorisation helper duplicated thirteen
 * times is thirteen chances for one of them to drift, which is how `qb.where`
 * came to discard a market predicate (audit V3).
 */
describe('there is one implementation of scopeOf', () => {
  const files = fs.readdirSync(CONTROLLERS).filter((f) => /\.controller\.ts$/.test(f));

  it('every scopeOf delegates to resolveScope and computes nothing itself', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(path.join(CONTROLLERS, file), 'utf8');
      const m = src.match(/private scopeOf\([\s\S]*?\n {2}\}/);
      if (!m) continue;
      const body = m[0];
      if (!/return resolveScope\(/.test(body)) offenders.push(`${file}: does not delegate`);
      if (/marketScopeOf\(/.test(body)) offenders.push(`${file}: still computes the lock itself`);
      // A delegate is three lines at most.
      if (body.split('\n').length > 8) offenders.push(`${file}: body is longer than a delegate`);
    }
    expect(offenders.join('\n')).toBe('');
  });

  it('at least twelve controllers hold one, so the helper is genuinely shared', () => {
    const n = files.filter((f) =>
      /private scopeOf\(/.test(fs.readFileSync(path.join(CONTROLLERS, f), 'utf8')),
    ).length;
    expect(n).toBeGreaterThanOrEqual(12);
  });
});
```

- [ ] **Step 2: Add `resolveScope` and collapse the thirteen copies**

Append to `apps/api/apps/api-gateway/src/guards/market-scope.ts`:

```ts
/**
 * The market a request may act in, and the filter to forward — the gateway half
 * of the rule, in one place.
 *
 * `market` is what a list query should filter on (`undefined` = every market).
 * `scope` is set only when the caller is locked, and is the proof the backend
 * checks the loaded row against. A locked caller naming another market is
 * refused here, by `resolveMarket`, and logged.
 *
 * Thirteen controllers held a byte-identical private copy of this. Each one is
 * now a three-line delegate that keeps the method name, because the market-scope
 * regression spec proves a handler resolved a market by finding `this.scopeOf(`
 * in the handler's own body — a base class or a param decorator would make that
 * unprovable.
 */
export function resolveScope(
  req: any,
  requested?: string | null,
  what = 'that market',
): { scope?: string; market?: string } {
  const market = resolveMarket(req, requested, what);
  return { scope: marketScopeOf(req).locked ? market : undefined, market };
}
```

Then in each of the thirteen controllers (`admin-audit`, `admin-core`, `admin-doctor`, `admin-grocery`, `admin-hotel`, `admin-marketplace`, `admin-pharmacy`, `admin-restaurant`, `admin-taxi`, plus `marketplace`, `grocery`, `pharmacy`, `payment` from tasks 2, 5 and 6):

```ts
  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }
```

`admin-audit.controller.ts:99` keeps its narrower signature and its own default:

```ts
  private scopeOf(req: any, requested?: string) {
    return resolveScope(req, requested, 'that audit trail');
  }
```

Drop the now-unused `marketScopeOf`/`resolveMarket` imports from any controller that used them only here — `nest build --all` and the lint gate will name them.

- [ ] **Step 3: One list predicate, and the record assert that 404s first**

Append to `apps/api/libs/common/src/market/market-scope.ts`:

```ts
/**
 * Add the market predicate to a list query.
 *
 * `expression` names the column in the query's own vocabulary — `'s.regionCode'`
 * for an entity property, `'o.region_code'` for a raw column. Always `andWhere`:
 * TypeORM's `where()` REPLACES the clause, and one hand-written predicate that
 * used it returned every market's bank offers the moment a status filter was
 * applied (audit V3). Returns the builder so it chains.
 *
 * A predicate, never a post-filter: filtering after `take(limit)` returns a
 * short page that reads as "this market has nothing", which is indistinguishable
 * from a leak in the other direction.
 */
export function applyMarketFilter<T extends { andWhere(e: string, p?: object): T }>(
  qb: T,
  expression: string,
  scope: string | undefined,
  requested?: string | null,
): T {
  const market = marketPredicate(scope, requested);
  return market ? qb.andWhere(`${expression} = :__market`, { __market: market }) : qb;
}

/**
 * Load-then-assert, with "no such id" and "not your market" kept apart.
 *
 * A handler that asserts on a row it did not check for existence reports a
 * missing id as a market denial, which sends an operator hunting for a
 * permission problem that is a typo. The parameter name `column` is a keyof, so
 * a renamed column is a compile error rather than an assertion against
 * `undefined` — which passes for a global admin and refuses everyone else.
 */
export function assertRecordMarket<T extends object>(
  row: T | null | undefined,
  column: keyof T,
  scope: string | undefined,
  what: string,
  logger?: { warn(m: string): void },
): asserts row is T {
  if (!row) throw new NotFoundException(`No ${what} with that id`);
  assertInMarket(row[column] as unknown as string | null | undefined, scope, what, logger);
}

/**
 * "Runs in every market" as an explicit flag, not as an absent value.
 *
 * A null market meant two different things — a promotion that runs everywhere,
 * and a row nobody has attributed yet — and four entities encoded the
 * difference four ways (scalar, `regions[]`, `applicableCountries`, `countries`
 * jsonb). `is_global` says which, so `assertInMarket` can keep refusing the
 * unattributed while a genuinely global promotion reads as global.
 */
export function isGlobalMarket(row: {
  regionCode?: string | null;
  isGlobal?: boolean | null;
}): boolean {
  return row.isGlobal === true;
}
```

Then convert the hand-written predicates. Find them:

```bash
grep -rn "andWhere(['\"\`][^'\"\`]*\(regionCode\|region_code\|countryCode\|country_code\)[^'\"\`]*= *:" \
  --include=*.ts modules/*/backend/src apps/api/apps | grep -v node_modules | grep -v '/dist/' | grep -v '\.spec\.ts'
```

Convert each to `applyMarketFilter(qb, '<expression>', scope, requested)`. Leave alone any predicate that is **not** a scope check (a customer's delivery address country, a tax rule's country) — the mechanical tell is whether the value comes from `scope`/`market`; if it comes from a DTO field the user chose, it is a filter, not a boundary.

- [ ] **Step 4: One market column on the money path**

Create `apps/api/migrations/1786502000000-MoneyPathMarket.ts`:

```ts
import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — a market column on the money path.
 *
 * 24 admin routes over payouts, refunds, wallet transactions, commission rows
 * and settlement records fail closed for a region-locked admin — correct while
 * those rows carry no market, and wrong as a design, because every one of them
 * descends from an order that has one (2026-09-12 audit §3(b) / AUD2-089).
 * `seller_wallets` is already predicated through `sellers.regionCode` while the
 * payout routes beside it refuse, so "a seller's spendable money" has two
 * answers depending on which route you ask (AUD2-086 / I12).
 *
 * `region_code` varchar(2), ISO-2, NULL = not yet attributed — the platform's
 * one spelling (I7). `is_global` is deliberately NOT added here: money always
 * belongs to a market, and a payout that runs "in every market" is not a thing.
 *
 * Backfilled from the owning seller (payouts, seller wallets) and from the
 * order (refunds, settlement records). Rows that cannot be attributed keep NULL
 * and stay refused, which is the behaviour they have today — this migration
 * widens what a regional admin can see, and narrows nothing.
 */
export class MoneyPathMarket1786502000000 implements MigrationInterface {
  name = 'MoneyPathMarket1786502000000';

  public async up(q: QueryRunner): Promise<void> {
    for (const [table, _] of [
      ['payout.payouts'],
      ['payout.seller_wallets'],
      ['refund.refunds'],
      ['payment.settlement_records'],
      ['commission.commission_records'],
    ] as Array<[string]>) {
      await q.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "region_code" varchar(2)`);
    }

    // Payouts and seller wallets: the seller's market.
    await q.query(`
      UPDATE payout.payouts p SET "region_code" = UPPER(s.region_code)
        FROM marketplace.sellers s
       WHERE s.id::text = p.seller_id AND p."region_code" IS NULL AND s.region_code IS NOT NULL
    `);
    await q.query(`
      UPDATE payout.seller_wallets w SET "region_code" = UPPER(s.region_code)
        FROM marketplace.sellers s
       WHERE s.id::text = w.seller_id AND w."region_code" IS NULL AND s.region_code IS NOT NULL
    `);

    // Refunds and settlements: the order's market.
    await q.query(`
      UPDATE refund.refunds r SET "region_code" = UPPER(o."region_code")
        FROM "order".orders o
       WHERE o.id::text = r.order_id AND r."region_code" IS NULL AND o."region_code" IS NOT NULL
    `);
    await q.query(`
      UPDATE payment.settlement_records sr SET "region_code" = UPPER(sr."countryCode")
       WHERE sr."region_code" IS NULL AND sr."countryCode" IS NOT NULL
    `);

    for (const [table, idx] of [
      ['payout.payouts', 'IDX_payouts_region_code'],
      ['payout.seller_wallets', 'IDX_seller_wallets_region_code'],
      ['refund.refunds', 'IDX_refunds_region_code'],
      ['payment.settlement_records', 'IDX_settlement_records_region_code'],
      ['commission.commission_records', 'IDX_commission_records_region_code'],
    ]) {
      await q.query(`CREATE INDEX IF NOT EXISTS "${idx}" ON ${table} ("region_code")`);
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const [table, idx] of [
      ['payout.payouts', 'IDX_payouts_region_code'],
      ['payout.seller_wallets', 'IDX_seller_wallets_region_code'],
      ['refund.refunds', 'IDX_refunds_region_code'],
      ['payment.settlement_records', 'IDX_settlement_records_region_code'],
      ['commission.commission_records', 'IDX_commission_records_region_code'],
    ]) {
      await q.query(`DROP INDEX IF EXISTS "${idx}"`);
      await q.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS "region_code"`);
    }
  }
}
```

Check the real table names first — `commission.commission_records` and `refund.refunds` are the expected spellings, confirm with `\dt commission.*` and `\dt refund.*` before writing the file, and correct the migration to match rather than the other way round. Register it in `data-source.main.ts` with its own classification paragraph.

Then, in each service, the write path **stamps** the column from its parent (never from the request body) and each admin read predicates on it:

```ts
  // Stamped from the seller, not from the request: a market a caller supplies
  // is a market a caller chose.
  const payout = this.payoutRepo.create({ …, regionCode: seller.regionCode ?? null });
```

```ts
  async listPayouts(filters: { status?: string; page?: number; limit?: number }, scope?: string) {
    const qb = this.payoutRepo.createQueryBuilder('p').orderBy('p.requestedAt', 'DESC');
    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    applyMarketFilter(qb, 'p.region_code', scope);
    …
  }
```

and in `admin-marketplace.controller.ts`, the 24 routes swap `refuseLockedAdmin(req, …)` for `const { scope, market } = this.scopeOf(req, country, 'those payouts');` **one entity at a time**, in this order: payouts → seller wallets → refunds → settlement records → commission records. After each one, run the probe in Step 7 for that entity before moving to the next. Wallet and loyalty **stay** `refuseLockedAdmin`: `wallet_transactions` is per user, not per order, and a user's market is `users.region_code` — which Task 4 only just made true. Record that in the task report as the remaining fail-closed set, so the count in §3(b) moves from 31 to 7 rather than to 0.

- [ ] **Step 5: One encoding, with `is_global` explicit**

For `bank_offers` (scalar `region_code`, already right), `exchange_offers` (`applicableCountries` simple-array) and banners (`regions[]` in Redis), add `is_global boolean NOT NULL DEFAULT false` in the same migration and:

- `exchange_offers`: backfill `region_code` from `applicableCountries` when it holds exactly one entry, `is_global = true` when it is empty or NULL, and leave multi-entry rows alone with a `WARN` log naming their ids — a promotion that runs in three of nine markets is a real case this plan does not have the mandate to model, and inventing one silently is worse than leaving it.
- banners: `bannerMarket()` reads `regions[]` as it does, and gains `isGlobal: regions.length === 0`. The Redis shape is not migrated; the reader now distinguishes "targets nobody" from "targets everybody".
- grocery categories: `countries` jsonb keeps its shape and gains the same reader treatment. §2(a) row 29 records the write path as `refuseLockedAdmin` (Task 5 made it so), so nothing writes the array from a regional admin and the encoding is read-only.

`assertInMarket` gains one line — a genuinely global row is not a locked admin's to **write**, but must not read as "unattributed":

```ts
if (owner === null && (record as any)?.isGlobal === true) {
  // Explicitly every market. Still refused for a locked writer, with the
  // wording that says so rather than "belongs to every market" by accident.
}
```

Keep the refusal; change only the **log line** to distinguish the two cases, so an operator reading `[region-scope-denied]` can tell a global promotion from an unattributed row. Do not widen what a locked admin may write.

- [ ] **Step 6: Record the column-name exceptions where a reader will see them**

AUD2-082 / I7: `regionCode` in eight modules versus `countryCode` in hotel, taxi, franchise and payment, and `restaurants`/`pharmacy_stores`/`hotels` carrying **both**. Renaming four modules' columns is a migration across four databases with no scope benefit — the readers already normalise. What is missing is that the exception is recorded only in a plan ledger. Put it in the entity:

```ts
  /**
   * MARKET COLUMN — ISO-2, the platform's `region_code` under another name.
   *
   * Hotel predates the convention and calls it `countryCode`; every scope check
   * in this module reads THIS column and nothing reads the unused `regionCode`
   * beside it, which is dead and must not be written (2026-09-12 audit I7/I13).
   * A new entity in this module uses `regionCode`.
   */
  @Column({ name: 'country_code', type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;
```

The same paragraph, adjusted, on `taxi-driver.entity.ts:38`, `taxi-vendor.entity.ts`, the franchise entity and the payment entities. Then drop the genuinely dead second columns — `hotels.regionCode`, and the alpha-3 `countryCode` defaults `'KEN'` on `restaurants` and `pharmacy_stores` (F-35) — in the same migration, after confirming nothing reads them:

```bash
grep -rn "\.regionCode" modules/hotel/backend/src --include=*.ts | grep -v spec
grep -rn "countryCode" modules/restaurant/backend/src modules/pharmacy/backend/src --include=*.ts | grep -v spec
```

Anything that reads them is a caller to fix first; if the grep is clean, drop the columns.

- [ ] **Step 7: Run, migrate, probe**

```
cd apps/api
npx vitest run apps/api-gateway/src/guards/scope-helper-uniqueness.spec.ts   # 2 passed
npx vitest run libs/common/src/market/market-scope.spec.ts                   # 16 passed
npx typeorm-ts-node-commonjs migration:run -d data-source.main.ts
npx vitest run                                                               # 740 passed
npx nest build --all                                                         # exit 0
```

```bash
printf 'QA payouts list (was 403): '
curl -s -H "Authorization: Bearer $QA" "$B/admin/marketplace/payouts" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const r=d.data?.data??d.data??[];
      JSON.stringify({n:r.length,markets:[...new Set(r.map(x=>x.regionCode))]})'
printf 'QA seller-wallets markets (was already predicated — must agree): '
curl -s -H "Authorization: Bearer $QA" "$B/admin/marketplace/seller-wallets" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const r=d.data?.data??d.data??[];
      JSON.stringify({n:r.length,markets:[...new Set(r.map(x=>x.regionCode))]})'
INPAYOUT=$(docker exec kartseek-postgres psql -U postgres -d kartseek_db -tAc \
  "SELECT id FROM payout.payouts WHERE region_code='IN' LIMIT 1")
printf 'X-25-shape QA processes an IN payout: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d "{\"payoutIds\":[\"$INPAYOUT\"]}" "$B/admin/marketplace/payouts/process"
printf 'X-48 QA wallet adjust (still fail-closed by design): '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"userId":"x","amount":1}' "$B/admin/marketplace/wallet/adjust"
```

Expected: both lists `markets: ["QA"]` and **agree on `n`'s market set** — that agreement is the whole point of AUD2-086; `403` on the cross-market payout; `403` on wallet adjust (unchanged, and recorded as deliberate).

- [ ] **Step 8: Commit (three commits — the shared helpers, the migration, the services)**

```bash
git add apps/api/apps/api-gateway/src/guards/market-scope.ts \
        apps/api/apps/api-gateway/src/guards/scope-helper-uniqueness.spec.ts \
        apps/api/apps/api-gateway/src/controllers/*.controller.ts \
        apps/api/libs/common/src/market/market-scope.ts \
        apps/api/libs/common/src/market/market-scope.spec.ts
git commit -m "refactor(api): one scopeOf, one market predicate, one record assert for every admin surface" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/migrations/1786502000000-MoneyPathMarket.ts apps/api/data-source.main.ts \
        modules/hotel/backend/src/entities modules/taxi/backend/src/entities \
        modules/franchise/backend/src/entities modules/restaurant/backend/src/entities \
        modules/pharmacy/backend/src/entities
git commit -m "feat(db): region_code on the money path; the column-name exceptions live in their entities" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/payout-service apps/api/apps/refund-service apps/api/apps/commission-service \
        apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts \
        modules/marketplace/backend/src/entities
git commit -m "feat(money): payouts, refunds, settlements and commissions filter by market instead of refusing" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12 (R12): The consistency deltas — settings reads, own-market staff, the market lock that unlocked itself, and a console that asks for one market

**Closes: AUD2-034, AUD2-084, AUD2-092, AUD2-100** (E I9/F-23, F-31, F-32/V13; H-13; §13 rows QA-21, SA-11, SA-12, X-50)

Four deltas that are each small and each visible to an operator:

1. **Settings** — `admin_get_settings` takes a `market` (`marketplace.controller.ts:1479`); grocery's takes nothing (`grocery.controller.ts:1115`). One concept, two answers.
2. **Staff** — a regional admin cannot see or manage staff locked to their own market, though `users.region_code` is right there and `GET /admin/staff` already accepts `?regionCode=`. The blanket `refuseLockedAdmin(req, 'roles and staff')` is right for **roles** and too wide for **staff**.
3. **The market lock** — `PATCH /admin/staff/:id {"regionCode": null}` leaves `region_locked = true` with `region_code = null`. `marketScopeOf` then computes `locked = false`, so the account silently becomes a **global** admin while the console still renders a "region locked" badge. The controller validates the request, not the resulting state.
4. **The console** — 62 of 66 admin pages filter the market **in the browser** after fetching everything, and `useMarketplaceRegionFilter`'s last branch is "no region-related field — include by default". A Super Admin "viewing QA" sees every market's rows under a QA heading, and a regional admin's browser has already received data the server should never have sent. The server side is closed by tasks 1–11; this closes the client side, which is what the operator actually looks at.

**Files:**

- Modify: `modules/grocery/backend/src/grocery.controller.ts:1115` + `grocery.service.ts` (settings read)
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-grocery.controller.ts` (settings routes)
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-access.controller.ts:313-360`, `:426-470`
- Modify: `apps/api/apps/api-gateway/src/dto/admin-access.dto.ts:150-172`
- Create: `apps/api/apps/api-gateway/src/controllers/admin-access-scope.spec.ts`
- Modify: `packages/shared-core/src/hooks/useMarketplaceRegionFilter.ts`
- Modify: `packages/shared-core/src/api/admin-*.ts` (the fetch helpers that omit the market)
- Create: `packages/shared-core/src/hooks/useMarketplaceRegionFilter.spec.ts` (or extend if one exists)

**Interfaces:**

- Produces: `admin.grocery.settings` takes `{ market?: string, scope?: string }` and grocery settings become **per market** with a global fallback row, matching marketplace. The alternative — making both global with `@GlobalEntity` — is rejected because a delivery fee, a minimum basket and a service radius are market facts, and the grocery settings screen already shows a currency.
- Produces: `GET /admin/staff` and `PATCH /admin/staff/:id` admit a region-locked admin **for staff whose `regionCode` equals theirs**. `POST /admin/staff`, `DELETE /admin/staff/:id` and all seven role routes stay `refuseLockedAdmin` — creating an account is a platform act, and a regional admin who could mint accounts could mint one without a lock.
- Produces: `UpdateStaffDto` unchanged in shape; `updateStaff` validates the **resulting** `(regionCode, regionLocked)` pair, so `{"regionCode": null}` on a locked account is a `400`.
- Produces (web): `useMarketplaceRegionFilter`'s default branch **excludes** an unattributable row, and every admin list fetch passes `?country=<selectedRegion>`. The hook keeps its signature; its `include` default flips.

- [ ] **Step 1: Write the failing staff spec**

Create `apps/api/apps/api-gateway/src/controllers/admin-access-scope.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminAccessController } from './admin-access.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build(staff: any = { id: 's-1', role: 'admin', regionCode: 'QA', regionLocked: true }) {
  const preds: string[] = [];
  const qb: any = {
    where: (s: string) => (preds.push(s), qb),
    andWhere: (s: string) => (preds.push(s), qb),
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () => [[staff], 1],
  };
  const userRepo = {
    createQueryBuilder: () => qb,
    findOne: vi.fn(async () => staff),
    save: vi.fn(async (u: any) => u),
    count: vi.fn(async () => 0),
  };
  const roleRepo = {
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => ({ id: 'r-1', key: 'admin' })),
  };
  const ctrl = Object.create(AdminAccessController.prototype) as AdminAccessController;
  Object.assign(ctrl, {
    userRepo,
    roleRepo,
    encryption: { encrypt: (s: string) => s, decrypt: (s: string) => s },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    endSessions: vi.fn(async () => true),
  });
  return { ctrl, userRepo, preds };
}

describe('a regional admin manages their own market staff', () => {
  it('lists staff, narrowed to their market whether or not they asked', async () => {
    const { ctrl, preds } = build();
    await ctrl.listStaff(req(qaAdmin), 1, 20);
    expect(preds.some((p) => p.includes('u.regionCode'))).toBe(true);
  });

  it('refuses a locked admin who filters for another market', async () => {
    const { ctrl } = build();
    await expect(ctrl.listStaff(req(qaAdmin), 1, 20, undefined, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('edits a staff member in their own market', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(qaAdmin), 's-1', { firstName: 'Aisha' } as any),
    ).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalled();
  });

  it('refuses to edit a staff member in another market', async () => {
    const { ctrl, userRepo } = build({
      id: 's-2',
      role: 'admin',
      regionCode: 'IN',
      regionLocked: true,
    });
    await expect(ctrl.updateStaff(req(qaAdmin), 's-2', { firstName: 'X' } as any)).rejects.toThrow(
      ForbiddenException,
    );
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses to edit a GLOBAL staff member — an unlocked account is nobody market', async () => {
    const { ctrl } = build({ id: 's-3', role: 'admin', regionCode: null, regionLocked: false });
    await expect(ctrl.updateStaff(req(qaAdmin), 's-3', { firstName: 'X' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('still refuses a locked admin creating an account or touching roles', async () => {
    const { ctrl } = build();
    await expect(ctrl.createStaff(req(qaAdmin), {} as any)).rejects.toThrow(
      'Roles and staff are managed globally.',
    );
    await expect(ctrl.listRoles(req(qaAdmin))).rejects.toThrow(ForbiddenException);
  });

  it('refuses a locked admin granting a role they could not grant themselves', async () => {
    const { ctrl } = build();
    await expect(
      ctrl.updateStaff(req(qaAdmin), 's-1', { adminRoleId: 'r-other' } as any),
    ).rejects.toThrow('Only a global administrator may change a role assignment.');
  });
});

describe('the market lock is validated on the resulting state', () => {
  it('H-13 refuses clearing the market while the lock stays on', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-1', { regionCode: null } as any),
    ).rejects.toThrow(BadRequestException);
    // The account would otherwise read as GLOBAL to marketScopeOf while the
    // console still drew a "region locked" badge (audit H-13).
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('allows clearing both together', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-1', { regionCode: null, regionLocked: false } as any),
    ).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: null, regionLocked: false }),
    );
  });

  it('allows setting a market while the lock stays on', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-1', { regionCode: 'ae' } as any),
    ).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'AE' }));
  });

  it('refuses turning the lock on for an account with no market', async () => {
    const { ctrl } = build({ id: 's-4', role: 'admin', regionCode: null, regionLocked: false });
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-4', { regionLocked: true } as any),
    ).rejects.toThrow('A locked account needs a market');
  });
});
```

- [ ] **Step 2: Staff per market; roles stay global**

`admin-access.controller.ts` — `listStaff` (line 313) drops the blanket refusal:

```ts
  @Get('staff')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, 'perm:staff.view')
  @ApiOperation({ summary: 'Staff accounts' })
  async listStaff(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('regionCode') regionCode?: string,
  ) {
    // Staff are global as a DIRECTORY and regional as RECORDS. A locked admin
    // was refused the whole screen, so they could not see who administers their
    // own market — while `users.region_code` was sitting right there and this
    // route already accepted `?regionCode=` (audit F-31). Roles stay global:
    // they are the permission vocabulary, not a market's own business.
    const { scope, market } = this.scopeOf(req, regionCode, 'those staff accounts');
    …
    if (roleId) qb.andWhere('u.adminRoleId = :roleId', { roleId });
    if (market) qb.andWhere('UPPER(u.regionCode) = :rc', { rc: market });
    // A locked caller additionally never sees a global account: an unlocked
    // admin belongs to every market, which is not theirs to administer.
    if (scope) qb.andWhere('u.regionLocked = true');
```

and `@GlobalEntity` comes **off** this route — it now resolves a market, which is what the regression spec wants to see.

`updateStaff` (line 426) replaces its blanket refusal with a record check plus two narrower refusals:

```ts
  async updateStaff(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStaffDto) {
    const { scope } = this.scopeOf(req, undefined, 'that staff account');
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user || !(STAFF_ROLES as readonly string[]).includes(String(user.role).toUpperCase())) {
      throw new NotFoundException('Staff member not found');
    }
    // A locked admin may edit staff in their own market — and only staff who
    // are themselves locked to it. A global account belongs to every market.
    if (scope) {
      if (!user.regionLocked) {
        refuseLockedAdmin(req, 'a global staff account');
      }
      assertInMarket(user.regionCode, scope, 'staff account', this.logger);
      // Two things a market's administrator must not do to their own staff:
      // grant a role (the permission vocabulary is platform-wide) and unlock
      // the account (which would make it global — an escalation performed one
      // PATCH at a time).
      if (dto.adminRoleId !== undefined) {
        throw new ForbiddenException('Only a global administrator may change a role assignment.');
      }
      if (dto.regionCode !== undefined || dto.regionLocked !== undefined) {
        throw new ForbiddenException('Only a global administrator may change a market lock.');
      }
    }
```

`createStaff`, the staff delete and all seven role routes keep `refuseLockedAdmin(req, 'roles and staff', 'Roles and staff are managed globally.')` exactly as they are.

- [ ] **Step 3: Validate the resulting lock state, not the request**

Same file, lines 452-456:

```ts
const nextMarket =
  dto.regionCode !== undefined ? (dto.regionCode?.toUpperCase() ?? null) : user.regionCode;
const nextLocked = dto.regionLocked !== undefined ? dto.regionLocked : user.regionLocked;
// The RESULTING pair, not the request. `{"regionCode": null}` on a locked
// account passed the old check — `dto.regionLocked` was undefined — and left
// `region_locked = true` with `region_code = null`. `marketScopeOf` reads
// that as `locked: false`, so the account quietly became a GLOBAL admin
// while the console went on drawing its "region locked" badge (audit H-13).
if (nextLocked && !nextMarket) {
  throw new BadRequestException(
    'A locked account needs a market: set a market, or clear the lock in the same request.',
  );
}
```

`UpdateStaffDto` needs no change — the three cases (`undefined`, `null`, a code) are already distinct and documented at `admin-access.dto.ts:150-162`. Add one line to that docstring pointing at the controller check, so the next reader knows validation of the pair lives there and not here.

- [ ] **Step 4: Grocery settings take a market**

`modules/grocery/backend/src/grocery.controller.ts:1115`:

```ts
  @MessagePattern({ cmd: 'admin.grocery.settings' })
  msgSettings(@Payload() d: { market?: string; scope?: string }) {
    return this.svc.getSettings(marketPredicate(d?.scope, d?.market));
  }
```

and `getSettings(market?: string)` reads the market's row with the global row as a fallback, returning which one it used:

```ts
  /**
   * Grocery settings for one market, falling back to the platform defaults.
   *
   * Marketplace's settings read has taken a `market` since Plan A; grocery's
   * took nothing, so one screen showed a delivery fee, a minimum basket and a
   * service radius that were every market's at once (audit I9). `source` says
   * which row answered, so the console can show "inherited from platform
   * defaults" rather than implying the market set these values.
   */
  async getSettings(market?: string) {
    const m = normaliseMarket(market);
    const [scoped, global] = await Promise.all([
      m ? this.settingRepo.findOne({ where: { regionCode: m } }) : Promise.resolve(null),
      this.settingRepo.findOne({ where: { regionCode: IsNull() } }),
    ]);
    const row = scoped ?? global;
    return {
      settings: row?.values ?? {},
      defaults: global?.values ?? {},
      overridden: scoped ? Object.keys(scoped.values ?? {}) : [],
      market: m ?? null,
      source: scoped ? 'market' : 'platform',
      updatedAt: row?.updatedAt ?? null,
    };
  }
```

`grocery_settings` gains `region_code varchar(2) NULL` in the Task 11 migration (add the column there rather than a second migration; NULL is the platform default row). The gateway's `admin-grocery.controller.ts` settings routes pass `{ market, scope }` on the read and keep `refuseLockedAdmin` on the write until the MODULES plan builds the per-market editor — a read that distinguishes markets and a write that cannot is honest; a write that silently edits every market is not.

- [ ] **Step 5: The console asks the server for one market**

`packages/shared-core/src/hooks/useMarketplaceRegionFilter.ts` — flip the default branch and say why:

```ts
// A row with no region-related field used to be INCLUDED by default, so a
// Super Admin "viewing QA" saw every unattributable row under a QA heading
// and could not tell which figures were Qatar's (audit V13/F-32). Excluding
// is the same rule the server follows: `assertInMarket(null, scope)` refuses
// an unattributed record, and a list should not show what a decision would
// refuse.
//
// This hook is now a SECOND line of defence, not the first. Every admin fetch
// passes `?country=` (below), so a row from another market should never reach
// the browser at all; if one does, that is a server bug and the operator
// should not be shown it while it is open.
return false;
```

Then pass the market on every admin list fetch. The clients are `packages/shared-core/src/api/admin-*.ts` and `packages/shared-core/src/modules/admin-*-api.ts`; each list helper gains `country` in its `ListParams` and `buildQuery` already serialises it. Find the call sites that do not:

```bash
grep -rn "apiCall<Paginated" packages/shared-core/src/api packages/shared-core/src/modules \
  | grep -v 'buildQuery' | head -40
```

and in `apps/web`, the admin pages pass the selected region from the region context into those params. This is the one place where a mechanical sweep is wrong: a page that fetches a **global** entity (roles, taxonomy, static pages) must not pass a market. Work module by module and record the count in the task report.

Add a jest spec `packages/shared-core/src/hooks/useMarketplaceRegionFilter.spec.ts`:

```ts
describe('useMarketplaceRegionFilter', () => {
  it('excludes a row with no region-related field when a region is selected', () => {
    expect(matchesRegion({ id: 'x' }, 'QA')).toBe(false);
  });
  it('includes a row in the selected region, by any of the field spellings', () => {
    for (const row of [
      { regionCode: 'QA' },
      { region_code: 'qa' },
      { countryCode: 'QA' },
      { country: 'QA' },
    ]) {
      expect(matchesRegion(row, 'QA')).toBe(true);
    }
  });
  it('includes everything when no region is selected', () => {
    expect(matchesRegion({ id: 'x' }, undefined)).toBe(true);
  });
  it('excludes a row from another market', () => {
    expect(matchesRegion({ regionCode: 'IN' }, 'QA')).toBe(false);
  });
});
```

- [ ] **Step 6: Run everything**

```
cd apps/api && npx vitest run apps/api-gateway/src/controllers/admin-access-scope.spec.ts   # 11 passed
npx vitest run                                                                              # 751 passed
npx nest build --all                                                                        # exit 0
cd ../../modules/grocery && npx vitest run                                                  # 113 passed
cd ../.. && npm --prefix apps/web run test                                                  # 614 passed
npx next build --no-lint 2>/dev/null || (cd apps/web && npx next build)                      # exit 0
```

- [ ] **Step 7: Live probe**

```bash
printf 'QA-21 QA GET /admin/roles (stays global): '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" "$B/admin/roles"
printf 'F-31 QA GET /admin/staff markets: '
curl -s -H "Authorization: Bearer $QA" "$B/admin/staff" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const r=d.data??[];
      JSON.stringify({n:r.length,markets:[...new Set(r.map(x=>x.regionCode))]})'
printf 'QA GET /admin/staff?regionCode=IN: '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $QA" "$B/admin/staff?regionCode=IN"
INSTAFF=$(docker exec kartseek-postgres psql -U postgres -d kartseek_db -tAc \
  "SELECT id FROM public.users WHERE region_code='IN' AND region_locked = true LIMIT 1")
QASTAFF=$(docker exec kartseek-postgres psql -U postgres -d kartseek_db -tAc \
  "SELECT id FROM public.users WHERE region_code='QA' AND region_locked = true LIMIT 1")
printf 'QA PATCH an IN staff member: '
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"firstName":"Probe"}' "$B/admin/staff/$INSTAFF"
printf 'QA PATCH a QA staff member (control): '
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"firstName":"Probe"}' "$B/admin/staff/$QASTAFF"
printf 'QA tries to unlock their own market staff: '
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH -H "Authorization: Bearer $QA" \
  -H 'Content-Type: application/json' -d '{"regionLocked":false}' "$B/admin/staff/$QASTAFF"
printf 'H-13 SUPER clears the market and leaves the lock: '
curl -s -w ' [%{http_code}]\n' -X PATCH -H "Authorization: Bearer $SU" \
  -H 'Content-Type: application/json' -d '{"regionCode":null}' "$B/admin/staff/$QASTAFF" | tail -c 200
printf 'SA-12 POST /admin/staff regionLocked without a market: '
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $SU" \
  -H 'Content-Type: application/json' \
  -d '{"email":"probe@kartseek.com","role":"ADMIN","adminRoleId":"<a-role-uuid>","regionLocked":true}' \
  "$B/admin/staff"
printf 'I9 QA grocery settings market: '
curl -s -H "Authorization: Bearer $QA" "$B/admin/grocery/settings" \
  | node -pe 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
      JSON.stringify({market:d.data?.market??d.market,source:d.data?.source??d.source})'
```

Expected: `403` (roles stay global), a QA-only staff list with `n > 0`, `403`, `403`, `200`, `403`, `400`, `400`, and `{"market":"QA","source":…}`.

Then verify H-13 really cannot happen any more, from the database rather than the response:

```bash
docker exec kartseek-postgres psql -U postgres -d kartseek_db -tAc \
  "SELECT count(*) FROM public.users WHERE region_locked = true AND (region_code IS NULL OR region_code = '')"
```

Expected: `0`. A non-zero count means an account is drawn as locked and behaves as global — fix the rows before committing.

- [ ] **Step 8: Commit (API and web separately)**

```bash
git add apps/api/apps/api-gateway/src/controllers/admin-access.controller.ts \
        apps/api/apps/api-gateway/src/controllers/admin-access-scope.spec.ts \
        apps/api/apps/api-gateway/src/controllers/admin-grocery.controller.ts \
        apps/api/apps/api-gateway/src/dto/admin-access.dto.ts \
        modules/grocery/backend/src
git commit -m "fix(admin-access): own-market staff are manageable; a cleared market cannot leave a lock behind" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add packages/shared-core/src/hooks packages/shared-core/src/api packages/shared-core/src/modules apps/web/src
git commit -m "fix(web): admin fetches name a market and the region filter excludes what it cannot place" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Deferred (P3)

Two REGIONAL backlog rows are **not** closed by this plan. Each is deferred for a reason about the work, not about effort.

| id           | Row                                                                        | Why it is deferred                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AUD2-090** | Campaigns (7 routes) refuse every locked admin for want of a market column | There is no campaign **row**. `getAdminCampaigns` returns a literal `{data:[]}` and `createCampaign` publishes a Kafka event with an invented `camp-<timestamp>` id and persists nothing (`modules/marketplace/backend/src/admin/admin.service.ts:1162-1186`). Adding `region_code` to a row that does not exist is not a scope fix — building the entity, its CRUD, its Kafka contract and its console screen is a MODULES feature. The seven routes keep `refuseUnattributable`, which is correct while nothing is attributable, and the fail-closed count in §3(b) records them as deliberate. |
| **AUD2-144** | `commission:stats:daily:*` is global-only                                  | The keys are written by `commission.service.ts:437-438,556` and read by **no** controller — the live Redis scan confirms `commission:stats:daily:all` and `:marketplace` both sit unread. Adding a market dimension to a counter nobody reads is a guess about the shape the reader will want. It lands with that reader, in the CONSOLE plan's commission dashboard, which is also where the wrong shape would be noticed. Task 4 has already given `admin:counter:*` a market, so the pattern to copy exists.                                                                                   |

Nothing else is deferred: the other 39 REGIONAL rows each appear in exactly one task's `Closes:` line.

Three items this plan deliberately **narrows** rather than closes, recorded so a later reader does not read them as oversights:

- **AUD2-089** — 24 money-path routes become filters for payouts, seller wallets, refunds, settlement records and commission records (Task 11). Wallet and loyalty adjustments stay `refuseLockedAdmin`: `wallet_transactions` is per **user**, not per order, and a user's market only became true in Task 4. The fail-closed count moves from 31 to 7, and the task report names the 7.
- **AUD2-081** — exchange offers with **more than one** market in `applicableCountries` are left alone with a logged warning. A promotion that runs in three of nine markets is a real case this plan has no mandate to model, and collapsing it to one scalar silently would change what the offer does.
- **AUD2-082** — the four `countryCode` modules are not renamed. The readers already normalise; what was missing is that the exception lived only in a plan ledger. Task 11 puts it in the entity docstring, where the next person to add a column will read it.

---

## Self-review

### Spec coverage — every AUD2 id to the task that closes it

| AUD2 id  | P   | Area                               | Task         | Spec that fails if it regresses                                      |
| -------- | --- | ---------------------------------- | ------------ | -------------------------------------------------------------------- |
| AUD2-004 | P0  | Seller-ownership guard             | R1           | `seller-ownership.guard.spec.ts` (7 `it`s)                           |
| AUD2-005 | P0  | Return status (money)              | R2           | `fulfillment-scope.spec.ts`, `marketplace-scope.spec.ts`             |
| AUD2-006 | P0  | `qb.where` predicate reset         | R3           | `offer-list-scope.spec.ts` (records call **kind**, not just SQL)     |
| AUD2-007 | P0  | Variant stock/update/delete/create | R2           | `fulfillment-scope.spec.ts`                                          |
| AUD2-008 | P0  | 30 restaurant duplicates           | R5           | `admin-market-scope.regression.spec.ts` (after R8) + the caller grep |
| AUD2-009 | P0  | Users on `region_code`             | R4           | `admin.scope.spec.ts` (6 new `it`s)                                  |
| AUD2-010 | P0  | 11 grocery duplicates              | R5           | `grocery-admin-scope.spec.ts`                                        |
| AUD2-011 | P0  | 7 pharmacy routes                  | R5           | `pharmacy-scope.spec.ts`                                             |
| AUD2-012 | P0  | `/payments/admin/*`                | R6           | `payment-scope.spec.ts`                                              |
| AUD2-013 | P0  | Static pages                       | R7           | `global-content-refusal.spec.ts`                                     |
| AUD2-014 | P0  | `/marketplace/*` logistics         | R6           | `admin-market-scope.regression.spec.ts` (after R8)                   |
| AUD2-015 | P0  | Franchise tenancy                  | R6           | `franchise-access.guard.spec.ts` (8 `it`s)                           |
| AUD2-016 | P0  | Admin coupon writes                | R2           | `marketplace-scope.spec.ts`                                          |
| AUD2-034 | P1  | Console market filter              | R12          | `useMarketplaceRegionFilter.spec.ts`                                 |
| AUD2-035 | P1  | Taxi surge demand                  | R10          | `surge-zone.spec.ts` (5 `it`s)                                       |
| AUD2-036 | P1  | Search fallback country            | R10          | `search-fallback-scope.spec.ts`                                      |
| AUD2-077 | P2  | Customer market, named per screen  | R4           | `admin.scope.spec.ts` + the Interfaces table                         |
| AUD2-078 | P2  | Third refusal helper deleted       | R2           | `fulfillment-scope.spec.ts`; `grep` for `denyMarket` returns nothing |
| AUD2-079 | P2  | Restaurant prefix vs exact         | R5           | `restaurant.service.spec.ts`, `market-scope.spec.ts`                 |
| AUD2-080 | P2  | Reporting model                    | R9           | `analytics-scope.spec.ts`, `hotel-report-scope.spec.ts`              |
| AUD2-081 | P2  | Four market encodings              | R11          | `market-scope.spec.ts` (`isGlobalMarket`)                            |
| AUD2-082 | P2  | Market column name                 | R11          | entity docstrings + the dead-column grep                             |
| AUD2-083 | P2  | Taxonomy `PUT` aliases             | R6           | `taxonomy-write-refusal.spec.ts`                                     |
| AUD2-084 | P2  | Settings read                      | R12          | grocery suite                                                        |
| AUD2-085 | P2  | Page layouts, one rule             | R7           | `global-content-refusal.spec.ts`                                     |
| AUD2-086 | P2  | Seller money, one answer           | R11          | `payout-scope.spec.ts` + the two-list agreement probe                |
| AUD2-087 | P2  | Marketplace analytics              | R9           | `analytics-scope.spec.ts` (5 `it`s)                                  |
| AUD2-088 | P2  | Platform revenue report            | R9           | `admin.scope.spec.ts` + the SQL cross-check                          |
| AUD2-089 | P2  | Money-path scoping                 | R11          | `payout-scope.spec.ts` (narrowed — see above)                        |
| AUD2-090 | P2  | Campaigns                          | **deferred** | —                                                                    |
| AUD2-091 | P2  | Hotel reporting                    | R9           | `hotel-report-scope.spec.ts`                                         |
| AUD2-092 | P2  | Own-market staff                   | R12          | `admin-access-scope.spec.ts` (7 `it`s)                               |
| AUD2-093 | P2  | Banner delete global flush         | R3           | `admin-marketplace-banner.spec.ts`                                   |
| AUD2-094 | P2  | Grocery cache invalidation         | R10          | `grocery-cache-invalidation.spec.ts`                                 |
| AUD2-095 | P2  | Dashboard counters                 | R4           | `admin-counters.spec.ts`                                             |
| AUD2-096 | P2  | Orphaned report path               | R9           | report-service guard + spec                                          |
| AUD2-097 | P2  | Security console                   | R7           | `global-content-refusal.spec.ts`                                     |
| AUD2-098 | P2  | Page layout writes                 | R7           | `global-content-refusal.spec.ts` + the 500-section probe             |
| AUD2-099 | P2  | SEO overrides                      | R7           | `global-content-refusal.spec.ts` + the forged-`updatedBy` probe      |
| AUD2-100 | P2  | Market lock end state              | R12          | `admin-access-scope.spec.ts` (4 `it`s)                               |
| AUD2-144 | P3  | Commission counters                | **deferred** | —                                                                    |
| AUD2-066 | P1  | Scope regression collector (TESTS) | R8           | the spec itself + the Step 7 bite test                               |

**41 REGIONAL rows: 39 in tasks, 2 deferred.** Plus AUD2-066 from TESTS, executed here because it is the gate for the other 39.

### §13 matrix rows this plan flips

| Row                    | Today             | After                  | Task |
| ---------------------- | ----------------- | ---------------------- | ---- |
| X-03, X-04, X-05, X-55 | FAIL 200          | 403                    | R1   |
| X-15                   | FAIL 200          | 403                    | R2   |
| X-10                   | FAIL 200          | 403                    | R2   |
| X-19                   | FAIL, IN rows     | QA-only                | R3   |
| X-21                   | FAIL, flushes all | 404, no flush          | R3   |
| X-07, IN-01            | FAIL 200          | 403 / IN-only          | R4   |
| X-36                   | FAIL 200          | 404 (route deleted)    | R5   |
| X-12, X-39             | FAIL 201/200      | 403                    | R5   |
| X-41                   | FAIL 200          | 403                    | R5   |
| IN-04                  | untested          | count includes `IN-MH` | R5   |
| X-24                   | FAIL 200          | 403                    | R6   |
| X-46, X-47             | FAIL 200          | 403                    | R6   |
| X-54                   | FAIL 200          | 403                    | R7   |
| QA-15, X-26            | 403 fail-closed   | 200 QA-only            | R9   |
| QA-16                  | 501               | 200 QA-only            | R9   |
| X-33                   | MISSING 503       | 200 QA-only            | R9   |
| SA-12                  | untested          | 400                    | R12  |

Unchanged and **not** this plan's to fix: X-34 (V11, module HTTP surfaces — AUD2-017, MODULES); X-28, X-29, X-37, X-42, X-45 (missing handlers — AUD2 MODULES/TAXI rows); QA-09 (orders stub); X-48, X-49 (wallet/loyalty, deliberately fail-closed — see Deferred).

### Placeholder scan

Run before declaring the plan executed, from the repository root:

```bash
grep -rn "TBD\|FIXME\|similar to Task\|add appropriate\|as needed\|etc\.$" \
  docs/superpowers/plans/2026-09-12-regional-integrity-plan.md
```

Expected: **no output**. The one `TODO` this plan authorises is the single `TODO(TAXI-plan, AUD2-018)` comment Task 10 places on `getRateCard`, which names its owning plan and its backlog id — a pointer, not a placeholder.

On the code, after execution:

```bash
grep -rn "Math.random\|return { data: \[\] as unknown\[\], total: 0 }\|success: true, // stub" \
  --include=*.ts $(git diff --name-only main...HEAD | grep '\.ts$') 2>/dev/null
```

Expected: no hit in any file this plan touched. A fabricated figure behind a correct scope call is the failure mode §3 of the audit exists to name.

### Type and name consistency

Checked against the current tree, not from memory:

- `scope` is the **only** key the gateway writes from the token. Client filters travel as `country`, `countryCode`, `region` or `regionCode` and pass through `resolveMarket` first. Task 6's `PaymentAdminFilterDto` makes a client-supplied `scope` a 400 rather than a pass-through; the same check belongs on any DTO a later plan adds to an admin route.
- `market` (the filter, `undefined` = every market) and `scope` (the proof, set only when locked) are named the same way in all thirteen `scopeOf` call sites and in `resolveScope`'s return type.
- The market column is `regionCode` / `region_code` everywhere this plan adds one. The four pre-existing `countryCode` modules keep their spelling and gain the docstring (Task 11 Step 6); nothing in this plan introduces a fifth name.
- Backend helpers all come from `@app/common`: `normaliseMarket`, `marketPredicate`, `assertInMarket`, `refuseUnattributable`, and the two this plan adds, `applyMarketFilter` and `assertRecordMarket`. `isGlobalMarket` joins them in Task 11. After Task 2 there is no private re-implementation left — `grep -rn "denyMarket\|assertCouponInMarket" modules apps` returns nothing.
- Gateway helpers all come from `guards/market-scope.ts`: `marketScopeOf`, `resolveMarket`, `assertRecordInScope`, `refuseLockedAdmin`, and `resolveScope` from Task 11.
- Denial wording is the three fixed strings in the Global Constraints. Every spec asserts on the string, not only on the exception class, so a reworded message fails a test rather than confusing an operator.
- Service signatures put `scope?: string` **last**, always optional. That is what lets a handler be scoped without changing any existing caller, and it is the convention the MODULES plan inherits.
- Migration ids are sequential and unique: `1786501900000-UserMarketBackfill` (R4), `1786502000000-MoneyPathMarket` (R11), `1786502100000-SeoOverrides` (R7). All three are main-database migrations and all three must be listed in `data-source.main.ts` — `data-source.main.spec.ts` fails the suite otherwise, which is the intended tripwire.
- Suite counts compound task by task: 677 → 684 (R1) → 688 (R2) → 692 (R3) → 701 (R4) → 702 (R5) → 716 (R6) → 723 (R7) → 725 (R8) → 730 (R9) → 734 (R10) → 740 (R11) → 751 (R12) for `apps/api`; marketplace 250 → 265; grocery 104 → 113; hotel 25 → 29; taxi 20 → 28; restaurant 18 → 22; pharmacy 12 → 16; doctor 16 → 18 (R8); web 610 → 614 (R12). A task whose actual count differs from the number above has added or lost a spec — reconcile before committing, do not adjust the number afterwards.

### Order of execution, and why

Tasks 1–7 close P0 vectors in descending blast radius (111 routes, then the money and catalogue writes, then the two one-line defects, then users, then 48 duplicate routes, then 21 gateway routes, then platform content). Task 8 widens the CI gate **after** them, because widening it first turns the suite red for 217 routes and the rest of the plan is then executed under a broken gate. Tasks 9–11 convert fail-closed reads to filters and consolidate the rule set — work that is only safe once the gate is honest. Task 12 is last because the console must not be narrowed to a market the server cannot yet enforce.

### What this plan does not prove

Stated plainly so the TESTS plan knows what it inherits:

- The live probes exercise one record per market. They prove a vector is closed; they do not prove **every** row of every table is attributed. The §13 harness with the X-56 control and the X-57 non-empty assertion is what makes that claim, and it is the TESTS plan's to build on `regional-integrity.mjs` (Task 9).
- The console changes in Task 12 are verified by jest render specs and by the API probes behind them, not by a browser walkthrough — RTL is not installed and the dev server on :3000 points at the fleet gateway on :3001, not at the temporary one on :3099. A browser pass over the 66 admin pages belongs to the CONSOLE plan.
- Module HTTP surfaces (V11 / AUD2-017) remain reachable without a credential from inside the cluster. Every fix in this plan is at the gateway or in a service's own handler, so a caller that reaches a module's HTTP port directly bypasses all of it. That is MODULES work and it is the largest single thing still open after this plan lands.
