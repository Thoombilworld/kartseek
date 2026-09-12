# Module Backends & Admin Command Coverage Implementation Plan (MODULES)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Date: 2026-09-12 · Branch: `feat/admin-platform-upgrade` · Audit: `docs/audits/2026-09-12-admin-platform-audit-2.md` (workstream **MODULES**, 27 rows) · Design: `docs/superpowers/specs/2026-09-11-admin-platform-design.md` §3–3.1 · Programme: `docs/superpowers/plans/2026-09-11-admin-platform-program.md` §3 (C1–C8) · Predecessor: `docs/superpowers/plans/2026-09-11-admin-authz-isolation-plan.md` (Plan A, landed)

**Goal:** Every admin route the console or the gateway declares has a real, market-scoped backend handler that reads and writes its own module's database. No admin route returns a literal or a fabricated fallback. No module publishes an admin HTTP surface that bypasses the gateway's guards. A contract check in CI fails the build when a gateway command has no `@MessagePattern`.

**Architecture:** The shape is already proven by Plan A and by the hotel/grocery backends. The gateway resolves the market from the signed token (`guards/market-scope.ts` → `this.scopeOf(req, requested, what)`), forwards it as `scope`, and never lets a client body name a market. Each module backend owns an `admin/` directory whose controller declares `@MessagePattern({ cmd: 'admin.<module>.<verb>' })`, takes `{ scope, actorId, ...dto }`, and enforces the market a second time with `marketPredicate` in the query and `assertInMarket` on the loaded row (`@app/common`). Where an entity has no market column of its own, the module attributes it through the one documented owner join — order → store, menu-item → restaurant, room/booking/review → hotel, appointment → doctor → clinic — exactly as grocery already does through `storeId → store.regionCode`. Where neither a column nor a join exists, the handler calls `refuseUnattributable` and says so; it never answers with every market's rows under one market's heading. The gateway's `send(cmd, payload)` helpers carry no `fallback` argument on any admin route: a missing handler surfaces as a 503 naming the command, which is what the new CI check then forbids from ever shipping.

**Tech Stack:** NestJS 11 on rspack (`apps/api`), TypeORM, vitest (`npx vitest run <file>` from `apps/api`; `npx vitest run` from each `modules/<m>/backend`), Node 26, the dev fleet (`npm run dev:all` from `apps/api` plus each module backend's `dev`).

## Global Constraints

Verbatim from the mandate, and they are the acceptance test for every task here:

- Do not use mock data.
- Do not leave fake buttons.
- Do not leave placeholder APIs.
- Do not rely on frontend-only permissions.
- Do not allow regional data leakage.
- Do not break existing modules while upgrading Admin.
- Do not mark functionality complete without testing the real workflow.

And, specific to this workstream:

- Every new handler takes `{ scope, actorId, ...dto }` from the gateway and applies `marketPredicate(scope, requested)` to the query and/or `assertInMarket(row.<marketColumn>, scope, what, this.logger)` to the loaded row. **A market is never read from the request body.** `scope` is written only by the gateway, only from the token.
- Each module owns its own database. No handler in this plan reads or writes another module's tables. Cross-module facts come over that module's API (the pattern `admin-service.getDashboardStats` already follows with its `crossModule` marker).
- The gateway's `send(cmd, payload, fallback)` form must **not** be used on an admin route. All six module admin controllers already have the fallback-free `private async send<T>(cmd, payload)` (e.g. `admin-doctor.controller.ts:75-86`); keep it that way. A missing handler is a 503 whose message names the command.
- Every request body on an admin route is a class-validator DTO under the gateway's global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true`). No `@Body() dto: any`, no inline-typed bodies, no `req.body`.
- Every new gateway admin handler calls `this.scopeOf(` and carries `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:<key>')` with a key that exists in `apps/api/libs/common/src/admin/permissions.ts`. A method-level `@Roles` **replaces** the class-level one, so restate the roles alongside the key (documented at `admin-marketplace.controller.ts:60-66`).
- `nest build --all` is the build gate for `apps/api` (tsc alone is not). Each module backend builds with its own `npm run build`.
- Suites stay green: `apps/api` vitest **677**, marketplace **250**, grocery **104**, hotel **25**, taxi **20**, restaurant **18**, doctor **16**, pharmacy **12**. A task that adds specs raises its own number; it may not lower another's.
- `DEV_AUTH_BYPASS=true` makes an anonymous local request SUPER_ADMIN. Every spec and every live probe sends an `Authorization` header.
- Live probes run against a **temporary** gateway on `API_GATEWAY_PORT=3099` with real staff tokens (`qa-admin@kartseek.com`, `india-admin@kartseek.com`, the global admin), with the module backend started from its own `dist` on its registry TCP port — doctor 4007, grocery 4008, pharmacy 4010, restaurant 4018, hotel 4025, taxi 4027, marketplace 4002, order 4004, refund 4022. Do not restart the developer's running fleet.
- Commits: message lower-case, ≤ 100 characters, repo style (`fix(pharmacy): …`); `apps/api` changes and `modules/<m>` changes are **separate commits**; every commit ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Denial copy is the platform's existing wording. Gateway: `Your account is restricted to the <SCOPE> market; <what> belongs to <TARGET>.` Backend: `This <what> belongs to <OWNER>, not to the <SCOPE> market.` Every denial logs with the `[region-scope-denied]` prefix.

---

## Interfaces (cross-plan)

**What this plan produces for the CONSOLE plan.** Each row is a route the console may call once the named task lands, with the response shape it returns. All are `GET` unless stated, all under `/api/v1`.

| Route                                                                                                                                                | Task | Response shape                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/marketplace/orders?page&limit&status&search&country`                                                                                         | M1   | `{ data: AdminOrderRow[], total, page, limit }`, `AdminOrderRow = { id, orderNumber, orderId, customerId, sellerId, totalAmount, currency, regionCode, status, escrowStatus, paymentMethod, placedAt }` |
| `/admin/marketplace/orders/:orderNumber`                                                                                                             | M1   | `{ data: AdminOrderRow & { items, subtotal, deliveryFee, discount, walletDeduction, deliveryAddress, notes, estimatedDeliveryAt, updatedAt } }`                                                         |
| `/admin/marketplace/returns?page&limit&status&country`                                                                                               | M1   | `{ data: ReturnRequest[], total, page, limit }` (rows carry `regionCode`)                                                                                                                               |
| `/admin/marketplace/refunds?page&limit&country`                                                                                                      | M1   | `{ data: RefundRequest[], total, page, limit }` (rows now carry `regionCode`)                                                                                                                           |
| `/admin/marketplace/payments?page&limit&status&country`                                                                                              | M1   | `{ data: Payment[], total, page, limit }` (rows carry `countryCode`)                                                                                                                                    |
| `/admin/marketplace/reviews?page&limit&status&rating&country`                                                                                        | M9   | `{ data: Review[], total, page, limit }` — the real moderation queue, no longer products                                                                                                                |
| `/admin/marketplace/bank-offers`                                                                                                                     | M9   | unchanged shape, now always the real region-scoped rows                                                                                                                                                 |
| `/admin/pharmacy/{dashboard,stores/:id,products,orders,prescriptions,verifications,commissions,settlements,reports,settings}` and the five decisions | M3   | `{ data: … }`; lists `{ data, total, page, limit }`; decisions `{ success: true, id, status }`                                                                                                          |
| `/admin/restaurant/{dashboard,restaurants/:id,orders,menu-approvals,complaints,commissions,cuisines,analytics,zones}` and the four decisions         | M4   | same shapes                                                                                                                                                                                             |
| `/admin/hotel/{rooms,bookings,bookings/:id,amenities,pricing,reports,reviews,settings}` and the four writes                                          | M5   | same shapes                                                                                                                                                                                             |
| `/admin/doctor/{dashboard,clinics/:id,doctors/:id,appointments,prescriptions,specialties,reports,settings}` and the four decisions                   | M6   | same shapes                                                                                                                                                                                             |
| `/admin/taxi/{vendors/:id,drivers/:id,pending-approvals}` + vendor/driver/payout approvals                                                           | M7   | same shapes                                                                                                                                                                                             |

Routes **removed** in M2 (their console callers are listed in that task for the CONSOLE plan to repoint or retire): `brand-center`, `campaigns`, `reports`, `loyalty/analytics`, `gift-cards`, `banners` (GET), `logistics`, `delivery-partners`, `delivery-zones`, `shipping-rates`, `gst-invoicing`, `abandoned-carts`, `ip-violations`.

**What this plan consumes.**

- From **INFRA**: the per-module migration path — `modules/<m>/backend/migrations/` with a runner wired into that backend's `npm run migration:run`, since the module databases synchronize in dev but must not in production (audit §6, AUD2-030/AUD2-033). M6 (doctor `doctors.region_code`) and M11 (backfills) declare a hard dependency on it; every other module in this plan attributes through an existing owner join and needs no DDL.
- From **REGIONAL**: `assertInMarket`, `marketPredicate`, `normaliseMarket`, `refuseUnattributable` (`apps/api/libs/common/src/market/market-scope.ts`, landed in Plan A) and the gateway half `marketScopeOf`, `resolveMarket`, `assertRecordInScope`, `refuseLockedAdmin` (`apps/api/apps/api-gateway/src/guards/market-scope.ts`). This plan adds no scope helper of its own; if a task needs one, it belongs in REGIONAL.
- From **REGIONAL** also: ownership of `/admin/seo` (AUD2-099), `/admin/layouts` (AUD2-085/098), the grocery public-controller duplicates (AUD2-010) and the marketplace stub routes' _scoping_ rules. M2 removes the dead routes; REGIONAL decides what replaces them.

---

## File structure

| File                                                                                                    | Responsibility                                                                     |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/api/apps/order-service/src/order.controller.ts`, `order.service.ts`                               | `admin_list_orders`, `admin_get_order` with a `region_code` predicate              |
| `apps/api/apps/order-service/src/dto/admin-order.dto.ts` (new)                                          | validated admin list/detail payloads                                               |
| `apps/api/apps/refund-service/src/refund.service.ts`, `refund.controller.ts`                            | `regionCode` on the stored refund; `get_pending_refunds` filters on it             |
| `apps/api/apps/payment-service/src/payment.controller.ts`, `payment.service.ts`                         | `admin_list_payments` with a `countryCode` predicate                               |
| `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts`                             | orders/returns/refunds/payments wired; 13 literal stubs removed; reviews repointed |
| `apps/api/apps/api-gateway/src/controllers/admin-{pharmacy,restaurant,hotel,doctor,taxi}.controller.ts` | `perm:` keys, DTOs, command names aligned                                          |
| `apps/api/apps/api-gateway/src/dto/admin-{pharmacy,restaurant,hotel,doctor}.dto.ts` (new)               | class-validator bodies                                                             |
| `modules/pharmacy/backend/src/admin/{admin.controller.ts,admin.service.ts,dto/}` (new)                  | 17 handlers, store-join attribution                                                |
| `modules/restaurant/backend/src/admin/{admin.controller.ts,admin.service.ts,dto/}` (new)                | 13 handlers, restaurant-join attribution                                           |
| `modules/hotel/backend/src/admin/admin.controller.ts`, `admin.service.ts` (new)                         | 12 handlers, hotel-join attribution                                                |
| `modules/doctor/backend/src/admin/{admin.controller.ts,admin.service.ts,dto/}` (new)                    | 12 handlers, clinic-join attribution                                               |
| `modules/taxi/backend/src/admin/admin.controller.ts` (new)                                              | the seven approval/detail handlers MODULES owns                                    |
| `apps/api/libs/security/src/http-surface.guard.ts` (new)                                                | the shared surface closer, lifted from marketplace                                 |
| `modules/{restaurant,doctor,grocery,hotel,pharmacy}/backend/src/main.ts`                                | loopback bind, no `enableCors()`, `HttpSurfaceGuard`                               |
| `apps/api/scripts/check-admin-commands.mjs` (new)                                                       | the CI census: gateway command → `@MessagePattern`                                 |
| `apps/api/test/gateway-service-contract.spec.ts`                                                        | camelCase commands visible; comment stripper fixed                                 |
| `apps/api/package.json`                                                                                 | `pretest` runs the census                                                          |
| `modules/{restaurant,pharmacy}/backend/src/entities/*.entity.ts` + seeds                                | alpha-3 `countryCode` retired, ISO-2 `regionCode` seeded                           |
| `apps/api/scripts/verification/admin-modules-authz.mjs` (new)                                           | live proof across all six module consoles                                          |

---

### Task 1 (M1): Marketplace orders, returns, refunds and payments are real admin reads, scoped to the caller's market

`Closes: AUD2-049`

The nine console pages that read `GET /admin/marketplace/orders` have shown "no orders" since the route was written, because the handler is `return { data: [], total: 0, … }` (`admin-marketplace.controller.ts:1015-1028`) and `orders/:id` fabricates `{ id, status: 'PENDING' }` for any id (`:1030-1037`). Returns (`:1073-1081`) and payments (`:3164-3171`) are the same literal. Refunds (`:1110-1136`) do call refund-service but blunt-refuse every locked admin, because a refund carries no market.

**Files:**

- Modify: `apps/api/apps/order-service/src/order.service.ts:337-369` (add `listOrdersForAdmin`, `getOrderForAdmin`), `order.controller.ts:50-83` (two patterns)
- Create: `apps/api/apps/order-service/src/dto/admin-order.dto.ts`
- Create: `apps/api/apps/order-service/src/order.admin.spec.ts`
- Modify: `apps/api/apps/refund-service/src/refund.service.ts:26-42` (interface), `:60-…` (`requestRefund` stamps the market), `:242-267` (`getPendingRefunds` filters)
- Create: `apps/api/apps/refund-service/src/refund.scope.spec.ts`
- Modify: `apps/api/apps/payment-service/src/payment.controller.ts` (add `admin_list_payments`), `payment.service.ts`
- Modify: `modules/marketplace/backend/src/fulfillment/fulfillment.service.ts:222-242` (`getReturnRequests` takes `scope`), `modules/marketplace/backend/src/marketplace.controller.ts:2200-2203` (`get_returns` forwards it)
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts:1014-1037, 1072-1081, 1109-1136, 3163-3171`
- Create: `apps/api/apps/api-gateway/src/dto/admin-orders.dto.ts`
- Create: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.orders.spec.ts`

**Interfaces:**

- Produces (RPC): `admin_list_orders { page, limit, status?, search?, region?, scope? }` → `{ data, total, page, limit }`; `admin_get_order { orderNumber, scope? }` → the wire order or `NotFound`; `admin_list_payments { page, limit, status?, region?, scope? }`; `get_returns { page, limit, status?, region?, scope? }` (existing pattern, now scope-aware); `get_pending_refunds { page, limit, region?, scope? }` (existing pattern, now scope-aware).
- Produces (HTTP): the five console routes in the Interfaces table above.
- Consumes: `marketPredicate`, `assertInMarket` (`@app/common`); `this.scopeOf` (gateway).

- [ ] **Step 1: Write the failing order-service spec**

`apps/api/apps/order-service/src/order.admin.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';

function makeService(rows: any[]) {
  const captured: any = {};
  const orderRepo: any = {
    findAndCount: vi.fn(async (opts: any) => {
      captured.where = opts.where;
      return [rows, rows.length];
    }),
    findOne: vi.fn(
      async (opts: any) => rows.find((r) => r.orderNumber === opts.where.orderNumber) ?? null,
    ),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const redis: any = { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) };
  const kafka: any = { publish: vi.fn(async () => undefined) };
  return { svc: new OrderService(orderRepo, redis, kafka), captured, orderRepo };
}

const row = (orderNumber: string, regionCode: string | null) => ({
  id: `id-${orderNumber}`,
  orderNumber,
  customerId: 'c1',
  sellerId: 's1',
  items: [],
  subtotal: 10,
  deliveryFee: 0,
  discount: 0,
  walletDeduction: 0,
  totalAmount: 10,
  deliveryAddress: 'x',
  serviceType: 'marketplace',
  paymentMethod: 'COD',
  status: 'PENDING',
  escrowStatus: 'PENDING',
  couponCode: null,
  couponId: null,
  regionCode,
  currency: 'QAR',
  notes: null,
  estimatedDeliveryAt: null,
  placedAt: new Date(),
  updatedAt: new Date(),
});

describe('OrderService admin reads', () => {
  it('narrows the admin list to the scoped market and ignores a conflicting request', async () => {
    const { svc, captured } = makeService([row('ORD-1', 'QA')]);
    await svc.listOrdersForAdmin({ page: 1, limit: 20, region: 'IN', scope: 'QA' });
    expect(captured.where).toMatchObject({ regionCode: 'QA' });
  });

  it("applies a global admin's requested market, and none when they ask for none", async () => {
    const a = makeService([row('ORD-1', 'IN')]);
    await a.svc.listOrdersForAdmin({ page: 1, limit: 20, region: 'in' });
    expect(a.captured.where).toMatchObject({ regionCode: 'IN' });
    const b = makeService([row('ORD-1', 'IN')]);
    await b.svc.listOrdersForAdmin({ page: 1, limit: 20 });
    expect(b.captured.where.regionCode).toBeUndefined();
  });

  it('refuses an order from another market on the detail read', async () => {
    const { svc } = makeService([row('ORD-9', 'IN')]);
    await expect(svc.getOrderForAdmin('ORD-9', 'QA')).rejects.toThrow(ForbiddenException);
  });

  it('refuses an order with no market to a scoped admin, and 404s an unknown id', async () => {
    const { svc } = makeService([row('ORD-7', null)]);
    await expect(svc.getOrderForAdmin('ORD-7', 'QA')).rejects.toThrow(ForbiddenException);
    await expect(svc.getOrderForAdmin('ORD-nope', undefined)).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run it — FAIL**

From `apps/api`: `npx vitest run apps/order-service/src/order.admin.spec.ts`
Expected: FAIL — `svc.listOrdersForAdmin is not a function`.

- [ ] **Step 3: Implement the two admin reads in order-service**

`apps/api/apps/order-service/src/dto/admin-order.dto.ts`:

```ts
import { IsIn, IsInt, IsOptional, IsString, Max, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * The admin list payload. `scope` is written by the gateway from the token and
 * is the only market a locked caller can be given; `region` is what a global
 * admin asked to filter on. Never read a market from anywhere else.
 */
export class AdminListOrdersDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsString() @Length(1, 40) status?: string;
  @IsOptional() @IsString() @Length(1, 120) search?: string;
  @IsOptional() @IsString() @Length(2, 8) region?: string;
  @IsOptional() @IsString() @Length(2, 8) scope?: string;
}

export class AdminGetOrderDto {
  @IsString() @Length(1, 64) orderNumber!: string;
  @IsOptional() @IsString() @Length(2, 8) scope?: string;
}

export const ADMIN_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUND_REQUESTED',
  'REFUNDED',
] as const;
export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];
```

In `order.service.ts`, add `ILike` to the `typeorm` import and `assertInMarket, marketPredicate` to a new `@app/common` import, then append after `getOrdersByCustomer` (`:337-369`):

```ts
  /**
   * The admin order list — the read nine console pages have been waiting for.
   *
   * `GET /admin/marketplace/orders` answered `{ data: [], total: 0 }` inline for
   * as long as it existed, so "no orders" and "this route was never built" were
   * the same screen. Orders carry `region_code` (recorded at placement), so the
   * market is a column predicate here and needs no join.
   *
   * The lock wins over the request: a QA-locked admin asking for IN was already
   * refused at the gateway, and `marketPredicate` makes a second attempt by any
   * other path harmless.
   */
  async listOrdersForAdmin(q: {
    page?: number; limit?: number; status?: string; search?: string;
    region?: string; scope?: string;
  }) {
    const take = Math.min(Math.max(Number(q.limit) || 20, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const market = marketPredicate(q.scope, q.region);

    const where: Record<string, unknown> = {};
    if (market) where.regionCode = market;
    if (q.status) where.status = String(q.status).toUpperCase() as OrderStatus;
    // One search box over the two identifiers an admin actually has to hand.
    const criteria = q.search
      ? [
          { ...where, orderNumber: ILike(`%${q.search}%`) },
          { ...where, customerId: ILike(`%${q.search}%`) },
        ]
      : where;

    const [rows, total] = await this.orderRepo.findAndCount({
      where: criteria as any,
      order: { placedAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { data: rows.map((r) => this.toWire(r)), total, page, limit: take };
  }

  /**
   * One order for an admin, refused when it is not theirs to read.
   *
   * Goes to the table, not the cache: the cached copy is the customer-facing
   * projection and an admin reading a stale status is how a decision gets taken
   * on the wrong state.
   */
  async getOrderForAdmin(orderNumber: string, scope?: string) {
    const row = await this.orderRepo.findOne({ where: { orderNumber } });
    if (!row) throw new NotFoundException(`Order ${orderNumber} not found`);
    assertInMarket(row.regionCode, scope, 'order', this.logger);
    return this.toWire(row);
  }
```

In `order.controller.ts`, after `msgUpdateStatus` (`:81-82`):

```ts
  // ─── Admin reads ─────────────────────────────────────────────────────────
  // Added because the gateway had no order pattern to call at all: its admin
  // list and detail routes returned a literal empty page and a fabricated
  // PENDING status. `scope` is the caller's market, set by the gateway.
  @MessagePattern({ cmd: 'admin_list_orders' })
  msgAdminListOrders(@Payload() d: AdminListOrdersDto) {
    return this.svc.listOrdersForAdmin(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_get_order' })
  msgAdminGetOrder(@Payload() d: AdminGetOrderDto) {
    return this.svc.getOrderForAdmin(d?.orderNumber, d?.scope);
  }
```

with `import { AdminGetOrderDto, AdminListOrdersDto } from './dto/admin-order.dto';` and `@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))` on the class (next to the existing `@UseFilters(RpcAwareExceptionsFilter)` at `:11-12`).

- [ ] **Step 4: Run the order spec — PASS**

Run: `npx vitest run apps/order-service/src/order.admin.spec.ts` → 4 passed.

- [ ] **Step 5: Give a refund a market, so the queue can stop refusing locked admins**

`refund-service` stores refunds as JSON in Redis (`refund.service.ts:26-42` `RefundRequest`, `:242-267` `getPendingRefunds`) — there is no table and therefore no migration. Add the field, stamp it at creation, filter on it.

In `RefundRequest` (`:26-42`) add after `orderId`:

```ts
  /**
   * The market the refunded order was placed in.
   *
   * Without it the pending queue was the whole platform's, which is why the
   * gateway blunt-refused every region-locked admin rather than show one market
   * another's refunds under its own heading. Stamped from the order at request
   * time; refunds created before this field is absent and are treated as
   * unattributable (a scoped admin does not see them).
   */
  regionCode?: string | null;
```

In `requestRefund`, take `regionCode` from the caller's payload (the gateway forwards the order's market) and persist it on the stored object. In `getPendingRefunds` change the signature to `(page = 1, limit = 20, scope?: string)` and, inside the loop, after the expiry check:

```ts
const market = marketPredicate(scope);
if (market && normaliseMarket(refund.regionCode ?? undefined) !== market) continue;
```

with `import { marketPredicate, normaliseMarket } from '@app/common';`. Forward `d?.scope` from `refund.controller.ts:47-50`.

`apps/api/apps/refund-service/src/refund.scope.spec.ts` asserts: a QA-scoped call returns only `regionCode === 'QA'` rows; a refund with no `regionCode` is excluded from a scoped call and included for a global one; an unscoped call returns everything.

- [ ] **Step 6: Scope the returns list and add the payments list**

`fulfillment.service.ts:222-242` — add `region?: string; scope?: string` to the filter type and, before `findAndCount`:

```ts
// `return_requests.region_code` is on the row (entity :134-135) and the
// decision path already asserts it (`updateReturnStatus`, :271). The list
// did not, so the admin returns queue was every market's.
const market = marketPredicate(filters.scope, filters.region);
if (market) where.regionCode = market;
```

`payment-service` — `payment.entity.ts:150` carries `countryCode`. Add to `payment.service.ts`:

```ts
  /**
   * The admin payments list.
   *
   * `GET /admin/marketplace/payments` was a literal empty page while this
   * service held every payment with a `country_code` on it; `/payments/admin/*`
   * meanwhile read them with no scope at all (audit V8).
   */
  async listPaymentsForAdmin(q: { page?: number; limit?: number; status?: string; region?: string; scope?: string }) {
    const take = Math.min(Math.max(Number(q.limit) || 20, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const market = marketPredicate(q.scope, q.region);
    const where: Record<string, unknown> = {};
    if (market) where.countryCode = market;
    if (q.status) where.status = q.status;
    const [data, total] = await this.paymentRepo.findAndCount({
      where: where as any, order: { createdAt: 'DESC' }, skip: (page - 1) * take, take,
    });
    return { data, total, page, limit: take };
  }
```

and `@MessagePattern({ cmd: 'admin_list_payments' })` forwarding to it, with a `AdminListPaymentsDto` mirroring `AdminListOrdersDto`.

- [ ] **Step 7: Write the failing gateway spec**

`apps/api/apps/api-gateway/src/controllers/admin-marketplace.orders.spec.ts` — build the controller with the ten-client constructor (the doubles pattern from `admin-marketplace.scope.spec.ts`) and assert:

```ts
it('forwards the order list to order-service with the locked market', async () => {
  await ctrl.getOrders(req(qaAdmin), 1, 20, undefined, undefined, undefined);
  expect(orderClient.send).toHaveBeenCalledWith(
    { cmd: 'admin_list_orders' },
    expect.objectContaining({ region: 'QA', scope: 'QA', page: 1, limit: 20 }),
  );
});

it('refuses a locked admin who names another market, before any RPC', async () => {
  await expect(ctrl.getOrders(req(qaAdmin), 1, 20, undefined, undefined, 'IN')).rejects.toThrow(
    ForbiddenException,
  );
  expect(orderClient.send).not.toHaveBeenCalled();
});

it('propagates an order-service outage as 503 rather than an empty page', async () => {
  orderClient.send.mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')));
  await expect(ctrl.getOrders(req(globalAdmin), 1, 20)).rejects.toMatchObject({ status: 503 });
});

it('no longer fabricates an order on the detail route', async () => {
  await ctrl.getOrderById(req(globalAdmin), 'ORD-1');
  expect(orderClient.send).toHaveBeenCalledWith(
    { cmd: 'admin_get_order' },
    { orderNumber: 'ORD-1', scope: undefined },
  );
});

it('lets a locked admin read the refunds queue now that refunds carry a market', async () => {
  await ctrl.getRefunds(req(qaAdmin), 1, 20, undefined);
  expect(refundClient.send.mock.calls[0][1]).toMatchObject({ scope: 'QA', region: 'QA' });
});
```

Run: `npx vitest run apps/api-gateway/src/controllers/admin-marketplace.orders.spec.ts` → FAIL (the handlers return literals and take a different arity).

- [ ] **Step 8: Wire the four gateway routes**

Replace `getOrders` (`:1014-1028`) and `getOrderById` (`:1030-1037`):

```ts
  @Get('orders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:orders.view')
  @ApiOperation({ summary: 'List marketplace orders (admin view)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'country', required: false })
  async getOrders(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those orders');
    return this.sendTo(this.orderClient, 'Order service', 'admin_list_orders', {
      page: +page, limit: +limit, status, search, region: market, scope,
    });
  }

  @Get('orders/:orderNumber')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:orders.view')
  @ApiOperation({ summary: 'One order, refused when it is not the caller\'s market' })
  async getOrderById(@Req() req: any, @Param('orderNumber') orderNumber: string) {
    const { scope } = this.scopeOf(req, undefined, 'that order');
    return { data: await this.sendTo(this.orderClient, 'Order service', 'admin_get_order', { orderNumber, scope }) };
  }
```

(The param is renamed from `:id` because order-service looks orders up by `orderNumber`, which is what the console shows — `project_customer_order_identifiers`.)

`getReturns` (`:1072-1081`) forwards `MARKETPLACE_PATTERNS.GET_RETURNS` with `{ page, limit, status, region: market, scope }`. `getRefunds` (`:1109-1136`) loses its `refuseLockedAdmin(req, 'the refund queue')` line and the paragraph of comment that explains it, replaced by one sentence recording that refunds now carry `regionCode`. `getPayments` (`:3163-3171`) forwards to `payment-service` via a new `@Inject('PAYMENT_SERVICE')` client and `admin_list_payments`.

- [ ] **Step 9: Run every touched suite and both builds**

From `apps/api`: `npx vitest run apps/order-service apps/refund-service apps/payment-service apps/api-gateway/src/controllers` → all green, `apps/api` total ≥ 677 + the new files' counts.
From `modules/marketplace/backend`: `npx vitest run` → 250 passed.
Run: `npx nest build --all` (apps/api) → 0; `npm run build` (marketplace) → 0.

- [ ] **Step 10: Live probe on the temporary gateway**

```bash
# from apps/api, with order-service, refund-service, payment-service and marketplace-service up
API_GATEWAY_PORT=3099 npm run start:gateway &
B=http://localhost:3099/api/v1
QA=$(node scripts/verification/_token.mjs qa-admin@kartseek.com)      # or the login helper in admin-scope-authz.mjs
IN=$(node scripts/verification/_token.mjs india-admin@kartseek.com)
SU=$(node scripts/verification/_token.mjs admin@kartseek.com)

curl -s -H "Authorization: Bearer $QA" "$B/admin/marketplace/orders" \
  | node -pe '[...new Set(JSON.parse(require("fs").readFileSync(0)).data.map(o=>o.regionCode))]'   # ["QA"]
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "$B/admin/marketplace/orders?country=IN"   # 403
IN_ORDER=$(curl -s -H "Authorization: Bearer $IN" "$B/admin/marketplace/orders" | node -pe 'JSON.parse(require("fs").readFileSync(0)).data[0].orderNumber')
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "$B/admin/marketplace/orders/$IN_ORDER"    # 403
curl -s -H "Authorization: Bearer $SU" "$B/admin/marketplace/orders" \
  | node -pe '[...new Set(JSON.parse(require("fs").readFileSync(0)).data.map(o=>o.regionCode))].length > 1'        # true
```

Expected: own-market rows only for each regional admin, 403 on the foreign order, more than one market for the super admin. Repeat the three shapes for `/returns`, `/refunds` and `/payments`.

- [ ] **Step 11: Commit (two commits)**

```bash
git add apps/api/apps/order-service apps/api/apps/refund-service apps/api/apps/payment-service apps/api/apps/api-gateway/src
git commit -m "feat(api): admin orders, refunds and payments are real market-scoped reads" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add modules/marketplace/backend/src
git commit -m "fix(marketplace): the admin returns queue filters on the return's own market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2 (M2): The thirteen remaining literal-returning admin routes are removed, and their console callers handed to CONSOLE

`Closes: —` (no MODULES row of its own; it clears the stub half of AUD2-005, AUD2-012, AUD2-014 and AUD2-090, which REGIONAL owns, and it is what makes the M10 census check enforceable.)

The census counts **24** stubbed admin routes (`node apps/api/scripts/verification/admin-console-census.mjs`, `adminRoutesStubbed`). M1 removed two (`orders`, `orders/:id`); three more (`returns`, `refunds`, `payments`) became real there. Six are `/admin/seo` and belong to REGIONAL (AUD2-099, in-memory `seoOverrides` Map). That leaves **thirteen** here, every one a `return { data: [], total: 0, message: '…' }`:

| Route                   | Line         | Console callers                                                    |
| ----------------------- | ------------ | ------------------------------------------------------------------ |
| `GET brand-center`      | `:859-866`   | `/admin/marketplace/brand-center`                                  |
| `GET campaigns`         | `:939-948`   | `/admin/marketplace/campaigns`                                     |
| `GET reports`           | `:1441-1448` | `/admin/marketplace/reports`, `/admin/analytics`                   |
| `GET loyalty/analytics` | `:2726`      | `/admin/loyalty`                                                   |
| `GET gift-cards`        | `:3032-3038` | `/admin/marketplace/gift-cards`                                    |
| `GET banners`           | `:3040-3046` | `/admin/marketplace/banners`                                       |
| `GET logistics`         | `:3132-3138` | `/admin/marketplace/logistics`                                     |
| `GET delivery-partners` | `:3140-3146` | `/admin/delivery/partners`, `/admin/marketplace/delivery-partners` |
| `GET delivery-zones`    | `:3148-3154` | `/admin/marketplace/delivery-zones`                                |
| `GET shipping-rates`    | `:3156-3162` | `/admin/marketplace/shipping-rates`                                |
| `GET gst-invoicing`     | `:3180-3186` | `/admin/marketplace/gst-invoicing`                                 |
| `GET abandoned-carts`   | `:3188-3199` | `/admin/marketplace/abandoned-carts`                               |
| `GET ip-violations`     | `:3201-3207` | `/admin/marketplace/ip-violations`                                 |

Two of the thirteen have a real handler waiting and are **wired**, not removed; eleven have no data model at all and are **removed**. `GET system-health` (`:3209`) is not a stub in the same sense — it reads the fleet — and stays.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts`
- Modify: `modules/marketplace/backend/src/admin/admin.service.ts` (banner list)
- Create: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.no-stubs.spec.ts`

**Interfaces:**

- Produces: `GET /admin/marketplace/banners` → `{ data: Banner[], total }` from `admin_get_banners`; `GET /admin/marketplace/delivery-zones` → the grocery-style zone list is **not** built here — the route is removed and the CONSOLE plan points that page at the module that owns zones.
- Produces for CONSOLE: the eleven removed routes above, with their callers, so CONSOLE renders "not built" instead of an empty table.

- [ ] **Step 1: Write the failing regression spec**

`admin-marketplace.no-stubs.spec.ts` — a source-parsing spec in the style of `route-exposure.regression.spec.ts`, so it keeps working as the file changes:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

const FILE = path.join(__dirname, 'admin-marketplace.controller.ts');

/**
 * No admin route may answer with a literal.
 *
 * `{ data: [], total: 0, message: 'Zone configuration' }` is indistinguishable
 * from "this market has no zones", and thirteen screens read exactly that for
 * as long as these handlers existed. A handler either calls a service or it is
 * not a route.
 */
describe('admin-marketplace has no literal-returning routes', () => {
  it('every @Get/@Post/@Patch/@Put/@Delete handler reaches a service', () => {
    const source = fs
      .readFileSync(FILE, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const blocks = source.split(/\n  @(?=Get|Post|Patch|Put|Delete)/).slice(1);
    const offenders = blocks
      .filter((b) => !/this\.\w+\(/.test(b) && /return\s*\{/.test(b))
      .map((b) => b.split('\n')[0]);
    expect(offenders).toEqual([]);
  });
});
```

Run: `npx vitest run apps/api-gateway/src/controllers/admin-marketplace.no-stubs.spec.ts` → FAIL, listing thirteen `@Get(...)` lines.

- [ ] **Step 2: Wire the two that have a handler**

`GET banners` (`:3040-3046`) — marketplace-service already serves `admin_create_banner` / `admin_update_banner` / `admin_delete_banner` (`marketplace.controller.ts:1096-1103`) and the gateway exposed only a literal GET beside them, so the Banners screen could save a banner it could never list. Add `ADMIN_GET_BANNERS: 'admin_get_banners'` to `MARKETPLACE_PATTERNS` (`contracts/marketplace.patterns.ts`), a `tcpAdminGetBanners` in marketplace-service forwarding to the existing banner read in `admin/admin.service.ts` (`bannerMarket()`/`scopeBanner()` already attribute a banner by its `regions[]`), and:

```ts
  @Get('banners')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, 'perm:content.view')
  @ApiOperation({ summary: 'List homepage banners for this market' })
  @ApiQuery({ name: 'country', required: false })
  async getAllBanners(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those banners');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_BANNERS, { region: market, scope });
  }
```

`GET brand-center` (`:859-866`) is `GET brands` under a second name — the console's brand-centre page wants the same rows with their approval counts. Repoint it at `MARKETPLACE_PATTERNS.ADMIN_GET_BRANDS` and delete the `@GlobalEntity` duplication note, or, if the counts are wanted, add them to `admin_get_brands` rather than to a second route.

- [ ] **Step 3: Remove the eleven that have nothing behind them**

Delete the handlers for `campaigns` (GET), `reports`, `loyalty/analytics`, `gift-cards`, `logistics`, `delivery-partners`, `delivery-zones`, `shipping-rates`, `gst-invoicing`, `abandoned-carts`, `ip-violations`. Leave one comment block where the group sat:

```ts
// Removed 2026-09-12: eleven routes here returned `{ data: [], total: 0 }`
// with a `message` naming the feature. There is no campaigns table, no report
// generator, no logistics or delivery-partner domain, no gift-card ledger and
// no IP-violation register anywhere behind the gateway — so every one of them
// told an administrator that their market had none of these, forever. A route
// that cannot answer is worse than a missing route: the console cannot tell
// "none" from "never built". The pages that called them are listed in
// docs/superpowers/plans/2026-09-12-module-backends-plan.md (M2) for the
// console plan to render "not built" instead.
```

The campaign **write** routes (`PUT campaigns/:id`, approve/reject/pause/resume) call `admin_update_campaign`, which is implemented; they stay. So does `GET system-health`.

- [ ] **Step 4: Run the spec, the contract spec and the build**

Run: `npx vitest run apps/api-gateway/src/controllers` → the no-stubs spec passes.
Run: `npx vitest run test/gateway-service-contract.spec.ts` → still green (no new orphan commands).
Run: `npx nest build --all` → 0. Re-run the census: `node apps/api/scripts/verification/admin-console-census.mjs --json "$TMP/c.json" --md "$TMP/c.md"` and confirm `adminRoutesStubbed` has fallen from 24 to 6 (the `/admin/seo` six REGIONAL owns).

- [ ] **Step 5: Live probe**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "$B/admin/marketplace/gift-cards"   # 404
curl -s -H "Authorization: Bearer $QA" "$B/admin/marketplace/banners" | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.length >= 0'  # real rows
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "$B/admin/marketplace/banners?country=IN"   # 403
```

- [ ] **Step 6: Commit (two commits)**

```bash
git add apps/api/apps/api-gateway/src
git commit -m "fix(gateway): eleven admin routes that returned a literal are gone; banners and brands wired" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add modules/marketplace/backend/src
git commit -m "feat(marketplace): an admin banner list scoped to the caller's market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3 (M3): Pharmacy — 17 admin handlers, attributed through the store

`Closes: AUD2-050 (pharmacy half), AUD2-052`

`admin-pharmacy.controller.ts` sends 19 commands; **17 have no `@MessagePattern` anywhere** (the module implements only `admin.pharmacy.stores` and `admin.pharmacy.categories`, `pharmacy.controller.ts:567,577`). Every pharmacy console screen therefore 503s. Worse, the one predicate that does exist — `pharmacy.service.ts:800` `where.regionCode` — matches nothing, because the seeds put Mumbai district codes (`MUM-*`) in `pharmacy_stores.region_code` (AUD2-052).

Attribution: `pharmacy_items` (`:33`), `pharmacy_orders` (`:59`) and `prescriptions` (`:24`) all carry `storeId`, and `pharmacy_stores` carries `region_code` (`pharmacy-store.entity.ts:58-59`). **No migration is needed** — the market is a join, exactly as grocery does it (`grocery/admin/admin.service.ts:407-420`).

The missing 17: `admin.pharmacy.dashboard`, `storeDetail`, `approve`, `suspend`, `products`, `approveProduct`, `orders`, `prescriptions`, `approvePrescription`, `verifications`, `verifyLicense`, `createCategory`, `commissions`, `settlements`, `reports`, `settings`, `updateSettings`.

**Files:**

- Create: `modules/pharmacy/backend/src/admin/admin.controller.ts`, `admin.service.ts`, `dto/admin.dto.ts`, `admin-scope.spec.ts`
- Modify: `modules/pharmacy/backend/src/pharmacy-service.module.ts` (register the controller and service)
- Modify: `modules/pharmacy/backend/src/pharmacy.controller.ts:567-580` (move the two existing admin patterns into the new controller)
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-pharmacy.controller.ts` (perm keys + DTO bodies)
- Create: `apps/api/apps/api-gateway/src/dto/admin-pharmacy.dto.ts`
- Modify: `apps/api/scripts/seed/*pharmacy*` (ISO-2 `regionCode`) — see M11 for the shared seed pass

**Interfaces:**

- Produces: seventeen `@MessagePattern({ cmd: 'admin.pharmacy.<verb>' })` handlers taking `{ scope, actorId, ...dto }`.
- Consumes: `assertInMarket`, `marketPredicate`, `refuseUnattributable`, `requireId`, `RpcAwareExceptionsFilter` (`@app/common`).
- For CONSOLE: the ten `/admin/pharmacy/*` routes in the Interfaces table.

- [ ] **Step 1: Write the failing admin-scope spec**

`modules/pharmacy/backend/src/admin/admin-scope.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PharmacyAdminService } from './admin.service';

/** A query builder that records the predicates it was handed. */
function qbSpy(rows: any[] = []) {
  const where: Array<[string, any]> = [];
  const qb: any = {
    leftJoin: () => qb,
    leftJoinAndSelect: () => qb,
    innerJoin: () => qb,
    select: () => qb,
    addSelect: () => qb,
    andWhere: (s: string, p: any) => {
      where.push([s, p]);
      return qb;
    },
    where: (s: string, p: any) => {
      where.push([s, p]);
      return qb;
    },
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () => [rows, rows.length],
    getRawMany: async () => rows,
    getCount: async () => rows.length,
  };
  return { qb, where };
}

function makeService(opts: { store?: any; rows?: any[] } = {}) {
  const { qb, where } = qbSpy(opts.rows ?? []);
  const storeRepo: any = {
    findOne: vi.fn(async () => opts.store ?? null),
    createQueryBuilder: () => qb,
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const repo = () => ({
    createQueryBuilder: () => qb,
    findOne: vi.fn(async () => null),
    update: vi.fn(async () => ({ affected: 1 })),
  });
  const kafka: any = { publish: vi.fn(async () => undefined) };
  const svc = new PharmacyAdminService(
    storeRepo,
    repo() as any,
    repo() as any,
    repo() as any,
    repo() as any,
    kafka,
  );
  return { svc, where, storeRepo, kafka };
}

describe('PharmacyAdminService market scope', () => {
  it('joins products to their store and filters on the store market', async () => {
    const { svc, where } = makeService();
    await svc.listProducts({ page: 1, limit: 20, scope: 'QA' });
    expect(where.some(([s]) => s.includes('store.regionCode = :market'))).toBe(true);
    expect(where.find(([s]) => s.includes('store.regionCode'))?.[1]).toMatchObject({
      market: 'QA',
    });
  });

  it('ignores a market named in the request when the caller is locked', async () => {
    const { svc, where } = makeService();
    await svc.listOrders({ page: 1, limit: 20, region: 'IN', scope: 'QA' });
    expect(where.find(([s]) => s.includes('store.regionCode'))?.[1]).toMatchObject({
      market: 'QA',
    });
  });

  it('refuses a decision on a store in another market and writes nothing', async () => {
    const { svc, storeRepo, kafka } = makeService({ store: { id: 's1', regionCode: 'IN' } });
    await expect(svc.approveStore('s1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(storeRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('refuses a decision on a store with no market at all', async () => {
    const { svc } = makeService({ store: { id: 's1', regionCode: null } });
    await expect(svc.suspendStore('s1', 'gone bad', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('404s an unknown store rather than reporting success', async () => {
    const { svc } = makeService({ store: null });
    await expect(svc.getStoreDetail('nope', 'QA')).rejects.toThrow(NotFoundException);
  });

  it('refuses the settlement report to a scoped caller until settlements carry a market', async () => {
    const { svc } = makeService();
    await expect(svc.getSettlements({ scope: 'QA' })).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Run it — FAIL** (`Cannot find module './admin.service'`).

From `modules/pharmacy/backend`: `npx vitest run src/admin/admin-scope.spec.ts`

- [ ] **Step 3: Write `PharmacyAdminService`**

`modules/pharmacy/backend/src/admin/admin.service.ts`. The shape every list follows:

```ts
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertInMarket, marketPredicate, refuseUnattributable } from '@app/common';
import { KafkaProducerService } from '@app/kafka';
import { PharmacyStore } from '../entities/pharmacy-store.entity';
import { PharmacyItem } from '../entities/pharmacy-item.entity';
import { PharmacyOrder } from '../entities/pharmacy-order.entity';
import { Prescription } from '../entities/prescription.entity';
import { PharmacyCategory } from '../entities/pharmacy-category.entity';

/**
 * The pharmacy admin console's backend.
 *
 * Seventeen of the nineteen commands the gateway sends had no handler at all,
 * so every screen in this module answered 503 (and, before the gateway's
 * fallbacks were removed, a fabricated empty success).
 *
 * The market: `pharmacy_stores.region_code` is the only market column in this
 * module. Items, orders and prescriptions carry `store_id` and nothing else, so
 * each list joins the store and filters on the store's market — the same
 * attribution grocery documents at `grocery/admin/admin.service.ts:407-420`.
 * A row whose store is gone is unattributable and is not shown to a scoped
 * caller: it is nobody's market's, and guessing is the leak.
 */
@Injectable()
export class PharmacyAdminService {
  private readonly logger = new Logger(PharmacyAdminService.name);

  constructor(
    @InjectRepository(PharmacyStore) private readonly storeRepo: Repository<PharmacyStore>,
    @InjectRepository(PharmacyItem) private readonly itemRepo: Repository<PharmacyItem>,
    @InjectRepository(PharmacyOrder) private readonly orderRepo: Repository<PharmacyOrder>,
    @InjectRepository(Prescription) private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PharmacyCategory) private readonly categoryRepo: Repository<PharmacyCategory>,
    private readonly kafka: KafkaProducerService,
  ) {}

  /** The store a scoped read may see, or nothing when the caller is global. */
  private market(scope?: string, requested?: string) {
    return marketPredicate(scope, requested);
  }

  /** Load a store for a decision and refuse it when it is not the caller's. */
  private async storeInMarket(storeId: string, scope?: string): Promise<PharmacyStore> {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      select: { id: true, regionCode: true, name: true, status: true } as any,
    });
    if (!store) throw new NotFoundException(`Pharmacy store ${storeId} not found`);
    assertInMarket(store.regionCode, scope, 'pharmacy store', this.logger);
    return store;
  }

  async listProducts(q: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    scope?: string;
  }) {
    const take = Math.min(Math.max(Number(q.limit) || 20, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const market = this.market(q.scope, q.region);
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.store', 'store')
      .orderBy('item.createdAt', 'DESC')
      .skip((page - 1) * take)
      .take(take);
    if (market) qb.andWhere('store.regionCode = :market', { market });
    if (q.status) qb.andWhere('item.status = :status', { status: q.status });
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit: take };
  }

  async approveStore(storeId: string, actorId: string, scope?: string) {
    const store = await this.storeInMarket(storeId, scope);
    await this.storeRepo.update(storeId, {
      status: 'ACTIVE' as any,
      verifiedAt: new Date(),
    } as any);
    await this.kafka.publish('pharmacy.store.approved', {
      id: storeId,
      market: store.regionCode,
      actorId,
      at: new Date().toISOString(),
    });
    return { success: true, id: storeId, status: 'ACTIVE' };
  }
  // …suspendStore, approveProduct, approvePrescription, verifyLicense follow the
  // same three lines: load in market, write, publish with actor + market.
}
```

`listOrders`, `listPrescriptions`, `listVerifications` and `getDashboard` join the store the same way. `getCommissions`, `getSettlements` and `getReports` call `refuseUnattributable(scope, 'settlement report', this.logger)` **only** where the underlying rows genuinely carry no store link; where they do (orders → store), they are predicated like the rest. `getSettings`/`updateSettings` read and write the module's own settings row; `updateSettings` refuses a locked admin (`refuseUnattributable`) until settings carry a market, matching grocery's documented split. `createCategory` refuses a locked admin — the catalogue tree is global, the same ruling as marketplace taxonomy.

- [ ] **Step 4: Write `PharmacyAdminController`**

`modules/pharmacy/backend/src/admin/admin.controller.ts` — one `@MessagePattern` per gateway command, names taken **verbatim** from `admin-pharmacy.controller.ts` (the M10 census is what keeps them in step):

```ts
@UseFilters(RpcAwareExceptionsFilter)
@Controller('admin')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PharmacyAdminController {
  constructor(private readonly svc: PharmacyAdminService) {}

  @MessagePattern({ cmd: 'admin.pharmacy.dashboard' })
  dashboard(@Payload() d: AdminScopedQueryDto) {
    return this.svc.getDashboard(d);
  }

  @MessagePattern({ cmd: 'admin.pharmacy.storeDetail' })
  storeDetail(@Payload() d: AdminIdDto) {
    return this.svc.getStoreDetail(requireId(d?.id, 'pharmacy store'), d?.scope);
  }

  @MessagePattern({ cmd: 'admin.pharmacy.approve' })
  approve(@Payload() d: AdminDecisionDto) {
    return this.svc.approveStore(requireId(d?.id, 'pharmacy store'), d?.actorId, d?.scope);
  }
  // …suspend, products, approveProduct, orders, prescriptions, approvePrescription,
  //   verifications, verifyLicense, createCategory, commissions, settlements,
  //   reports, settings, updateSettings
}
```

The class is **not** an HTTP controller in practice — M8 closes the HTTP surface — but `@Controller('admin')` is kept so the module's route table stays readable, exactly as hotel does (`hotel/backend/src/admin/admin.controller.ts:25`).

Move `admin.pharmacy.stores` and `admin.pharmacy.categories` out of `pharmacy.controller.ts:567-580` into this controller so all nineteen live in one file; register both classes in `pharmacy-service.module.ts`.

- [ ] **Step 5: Run the spec and the build — PASS**

From `modules/pharmacy/backend`: `npx vitest run` → 12 existing + 6 new = 18 passed. `npm run build` → 0.

- [ ] **Step 6: Add the permission keys and DTOs on the gateway side**

In `admin-pharmacy.controller.ts`, every handler gains `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy')`, and the four write routes additionally restate the roles with `'perm:sellers.approve'` for store decisions and `'perm:kyc.approve'` for licence verification. Every `@Body()` becomes a DTO from the new `apps/api/apps/api-gateway/src/dto/admin-pharmacy.dto.ts` (`SuspendStoreDto { @IsString() @Length(3, 500) reason: string }`, `VerifyLicenceDto`, `UpdatePharmacySettingsDto`, …). No handler keeps an inline body type.

- [ ] **Step 7: Run the gateway suites and build**

From `apps/api`: `npx vitest run apps/api-gateway` → green; `npx nest build --all` → 0.

- [ ] **Step 8: Live probe**

```bash
# pharmacy-service from dist on 4010, temporary gateway on 3099
node modules/pharmacy/backend/dist/main.js &
curl -s -H "Authorization: Bearer $QA" "$B/admin/pharmacy/stores" \
  | node -pe '[...new Set(JSON.parse(require("fs").readFileSync(0)).data.map(s=>s.regionCode))]'   # ["QA"]
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH -H "Authorization: Bearer $QA" "$B/admin/pharmacy/stores/$IN_STORE/approve"   # 403
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH -H "Authorization: Bearer $IN" "$B/admin/pharmacy/stores/$IN_STORE/approve"   # 200
curl -s -H "Authorization: Bearer $SU" "$B/admin/pharmacy/orders" | node -pe 'JSON.parse(require("fs").readFileSync(0)).total > 0'   # true
```

Expected: own-market rows only, 403 on the foreign store, the super admin sees every market. (Run M11's seed fix first, or every pharmacy probe returns zero rows because of the `MUM-*` codes.)

- [ ] **Step 9: Commit (two commits)**

```bash
git add modules/pharmacy/backend/src
git commit -m "feat(pharmacy): seventeen admin handlers, each scoped through the store's market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/api-gateway/src
git commit -m "feat(gateway): pharmacy admin routes carry permission keys and validated bodies" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4 (M4): Restaurant — 13 admin handlers, attributed through the restaurant

`Closes: AUD2-050 (restaurant half)`

`admin-restaurant.controller.ts` sends 17 commands; **13 have no handler**: `admin.restaurant.dashboard`, `get`, `orders`, `menuApprovals`, `approveMenu`, `complaints`, `resolveComplaint`, `commissions`, `updateCommissions`, `createCuisine`, `analytics`, `zones`, `createZone`. The four that work are `list`, `approve`, `suspend`, `cuisines` (`restaurant.controller.ts:729-755`).

Attribution: `restaurants.region_code` (`restaurant.entity.ts:62-63`); `menu_items` (`:37`), `reservations` (`:30`), `restaurant_orders` (`:81`) and `restaurant_promotions` (`:24`) all carry `restaurantId`. **No migration needed.**

One live inconsistency this task must settle (E row 24): customer discovery narrows with `LEFT(r.regionCode, 2) = :country` (`restaurant.service.ts:1216-1221`) while the admin list uses an exact match (`:1050`). A `QA-DOH` restaurant is therefore visible to customers in QA and invisible — and un-decidable, 403 — to the QA admin. The admin side adopts the same prefix helper, and the helper gets a one-line comment saying it is the platform's answer for sub-regional codes.

**Files:**

- Create: `modules/restaurant/backend/src/admin/admin.controller.ts`, `admin.service.ts`, `dto/admin.dto.ts`, `admin-scope.spec.ts`
- Modify: `modules/restaurant/backend/src/restaurant.service.ts:1041-1055` (`getAdminRestaurantList` uses the prefix helper), `:1214-1222` (comment)
- Modify: `modules/restaurant/backend/src/restaurant-service.module.ts`
- Modify: `modules/restaurant/backend/src/restaurant.controller.ts:729-755` (move the four existing admin patterns across)
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-restaurant.controller.ts`
- Create: `apps/api/apps/api-gateway/src/dto/admin-restaurant.dto.ts`

**Interfaces:**

- Produces: thirteen `admin.restaurant.<verb>` handlers + the four moved ones, all `{ scope, actorId, ...dto }`.
- Produces for CONSOLE: the nine `/admin/restaurant/*` routes listed in the Interfaces table.

- [ ] **Step 1: Failing spec** — `modules/restaurant/backend/src/admin/admin-scope.spec.ts`, same six shapes as M3 (predicate present; lock wins; decision on a foreign restaurant refused with no write; decision on a market-less restaurant refused; unknown id 404s; an unattributable report refused), plus one the other modules do not need:

```ts
it('matches a sub-regional restaurant the way the storefront does', async () => {
  const { svc, where } = makeService();
  await svc.listRestaurants({ page: 1, limit: 20, scope: 'QA' });
  // 'QA-DOH' is a QA restaurant. An exact match made it invisible to the QA
  // admin while the storefront listed it — two answers for one market.
  expect(where.some(([s]) => s.includes('LEFT(r.regionCode, 2) = :market'))).toBe(true);
});
```

- [ ] **Step 2: Run — FAIL.** From `modules/restaurant/backend`: `npx vitest run src/admin/admin-scope.spec.ts`

- [ ] **Step 3: Write `RestaurantAdminService`** with `restaurantInMarket(id, scope)` (load `{ id, regionCode }`, `assertInMarket`) and the seven joined lists (`orders`, `menuApprovals`, `complaints`, `commissions`, `analytics`, `zones`, `dashboard`) each doing `.leftJoin('o.restaurant', 'r').andWhere('LEFT(r.regionCode, 2) = :market', { market })`. `updateCommissions`, `createZone` and `createCuisine` load or stamp the market from the scope; a locked admin may not create a global cuisine (`refuseUnattributable`).

- [ ] **Step 4: Write `RestaurantAdminController`** — thirteen `@MessagePattern`s named exactly as the gateway sends, plus the four moved from `restaurant.controller.ts`. Register in `restaurant-service.module.ts`.

- [ ] **Step 5: Run — PASS.** `npx vitest run` from `modules/restaurant/backend` → 18 existing + 7 new = 25 passed. `npm run build` → 0.

- [ ] **Step 6: Gateway perms and DTOs** — `'perm:modules.restaurant'` on every handler; `'perm:sellers.approve'` on approve/suspend/approveMenu; `'perm:finance.view'` on commissions; DTOs for all eight bodies.

- [ ] **Step 7: Run and build.** `npx vitest run apps/api-gateway` and `npx nest build --all` from `apps/api` → green, 0.

- [ ] **Step 8: Live probe** — as M3, against `/admin/restaurant/restaurants`, `/orders`, `/menu-approvals`, and the approve decision, with the extra check that a `QA-DOH` restaurant appears for `qa-admin` and 403s for `india-admin`.

- [ ] **Step 9: Commit (two commits)**

```bash
git add modules/restaurant/backend/src
git commit -m "feat(restaurant): thirteen admin handlers and one market rule for admin and storefront" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/api-gateway/src
git commit -m "feat(gateway): restaurant admin routes carry permission keys and validated bodies" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5 (M5): Hotel — 12 admin handlers, and one spelling for every hotel command

`Closes: AUD2-050 (hotel half), AUD2-117`

The hotel backend already has an admin controller (`modules/hotel/backend/src/admin/admin.controller.ts`) implementing eight commands — but it implements `admin_hotel_stats`, `admin_list_hotels`, `admin_approve_hotel`, `admin_suspend_hotel`, `admin_fraud_flags`, `admin_compliance`, `admin_revenue`, `admin_onboarding` while the gateway sends `admin.hotel.*`. Only five of the seventeen line up (AUD2-117). Twelve have no handler: `rooms`, `bookings`, `bookingDetail`, `amenities`, `createAmenity`, `pricing`, `updatePricing`, `reports`, `reviews`, `moderateReview`, `settings`, `updateSettings`.

Attribution: `hotels` carries **both** `countryCode` and `regionCode`, and the Plan A ruling is that scope uses `countryCode` (E row 21; `hotel.service.ts:170,179,527,545,568`). `hotel_rooms` (`:50-51`), `hotel_bookings` (`:75-76`) and `hotel_reviews` carry `hotelId`. **No migration needed** — the join exists; what is missing is that anything uses it.

**Decision on naming:** rename the **gateway** side, not the backend. `admin_list_hotels` and friends are already handled and already called from elsewhere; the `admin.hotel.*` spellings are handled nowhere. Moving the gateway to the implemented names is the change that removes commands from the unhandled list rather than adding to it, and the M10 census makes the choice permanent either way. The two commands the backend added for the console (`admin.hotel.approve`, `admin.hotel.suspend`, `:167-176`) are folded back into `admin_approve_hotel` / `admin_suspend_hotel` and deleted, so one decision has one name.

**Files:**

- Modify: `modules/hotel/backend/src/admin/admin.controller.ts` (12 new patterns; drop the two duplicate dot-notation aliases)
- Create: `modules/hotel/backend/src/admin/admin.service.ts` (the joined reads; `HotelService` keeps the hotel-level ones)
- Create: `modules/hotel/backend/src/admin/admin-scope.spec.ts`
- Modify: `modules/hotel/backend/src/hotel-service.module.ts`
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-hotel.controller.ts` (command names, perms, DTOs)
- Create: `apps/api/apps/api-gateway/src/dto/admin-hotel.dto.ts`

**Interfaces:**

- Produces: `admin_hotel_rooms`, `admin_hotel_bookings`, `admin_hotel_booking_detail`, `admin_hotel_amenities`, `admin_hotel_create_amenity`, `admin_hotel_pricing`, `admin_hotel_update_pricing`, `admin_hotel_reports`, `admin_hotel_reviews`, `admin_hotel_moderate_review`, `admin_hotel_settings`, `admin_hotel_update_settings` — all `{ scope, actorId, ...dto }`.
- Retires: `admin.hotel.approve`, `admin.hotel.suspend` and the twelve unhandled `admin.hotel.*` spellings.

- [ ] **Step 1: Failing spec** — `admin-scope.spec.ts`: rooms/bookings/reviews join `hotel` and filter `hotel.countryCode`; a booking in another market 404s/403s on the detail read; `moderateReview` on a foreign hotel's review is refused and writes nothing; `admin_hotel_reports` stays `refuseUnattributable` while it aggregates reviews (the existing ruling at `:100-117`), and the spec pins that it still throws for a scoped caller rather than quietly returning platform figures.

- [ ] **Step 2: Run — FAIL.** From `modules/hotel/backend`: `npx vitest run src/admin/admin-scope.spec.ts`

- [ ] **Step 3: Write `HotelAdminService`** — one private helper mirrored from M3:

```ts
  /** The market a room, booking or review belongs to: its hotel's. */
  private async hotelMarketOf(hotelId: string): Promise<string | null> {
    const hotel = await this.hotelRepo.findOne({ where: { id: hotelId }, select: { id: true, countryCode: true } as any });
    return hotel?.countryCode ?? null;
  }
```

and lists that `.innerJoin('room.hotel', 'hotel').andWhere('hotel.countryCode = :market', { market })`.

- [ ] **Step 4: Add the twelve patterns and remove the two aliases** in `admin.controller.ts`, after `msgOnboarding` (`:155-158`). Delete `tcpAdminApproveHotel` (`:167-170`) and `tcpAdminSuspendHotel` (`:172-175`) and the comment block above them (`:161-166`), replacing it with:

```ts
// The gateway now sends the names this controller has always implemented
// (`admin_approve_hotel`, `admin_suspend_hotel`). It used to send
// `admin.hotel.approve`/`.suspend`, which were added here as aliases — two
// names for one decision, and twelve more `admin.hotel.*` spellings with no
// handler at all. One spelling per command; the census check enforces it.
```

- [ ] **Step 5: Repoint the gateway** — in `admin-hotel.controller.ts`, change each `this.send('admin.hotel.<x>', …)` to the implemented name, add `'perm:modules.hotel'` to every handler and DTOs to all five bodies.

- [ ] **Step 6: Run and build.** `npx vitest run` from `modules/hotel/backend` → 25 + 6 = 31 passed; `npm run build` → 0. From `apps/api`: `npx vitest run apps/api-gateway test/gateway-service-contract.spec.ts` → green; `npx nest build --all` → 0.

- [ ] **Step 7: Live probe** — hotel-service from `dist` on 4025:

```bash
curl -s -H "Authorization: Bearer $QA" "$B/admin/hotel/bookings" \
  | node -pe '[...new Set(JSON.parse(require("fs").readFileSync(0)).data.map(b=>b.hotel.countryCode))]'   # ["QA"]
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "$B/admin/hotel/bookings/$IN_BOOKING"   # 403
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "$B/admin/hotel/reports"               # 403 (unattributable, by design)
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $SU" "$B/admin/hotel/reports"               # 200
```

- [ ] **Step 8: Commit (two commits)**

```bash
git add modules/hotel/backend/src
git commit -m "feat(hotel): rooms, bookings, reviews and settings admin handlers scoped by the hotel" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/api-gateway/src
git commit -m "fix(gateway): one spelling per hotel admin command, with permission keys and dtos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6 (M6): Doctor — 12 admin handlers, and the market column a practitioner never had

`Closes: AUD2-050 (doctor half), AUD2-119`

**Depends on INFRA** for the module migration path. This is the one module in the plan that needs DDL.

Twelve commands have no handler: `admin.doctor.dashboard`, `clinicDetail`, `approveClinic`, `doctorDetail`, `verifyDoctor`, `suspendDoctor`, `appointments`, `createSpecialty`, `prescriptions`, `reports`, `settings`, `updateSettings`. Three are implemented (`clinics`, `doctors`, `specialties`, `doctor.controller.ts:524,549,560`).

Attribution: `clinics.region_code` exists (`clinic.entity.ts:80-81`) and is the module's market. `doctors` has **no market column** and carries nullable `hospitalId`/`clinicId` (`doctor.entity.ts:66-79`), so the current handler fails closed (`doctor.controller.ts:545-556`) — which is correct but leaves the directory unusable for every regional admin. `appointments` (`:12`) and `doctor_prescriptions` (`:25`) carry `doctorId` only, so they inherit the same gap.

**AUD2-119's ruling for this module:** add `doctors.region_code`, denormalised at write time from the clinic or hospital the practitioner is attached to, backfilled once; then `appointments` and `prescriptions` are attributable by the documented join `appointment → doctor → region_code`. The other entities AUD2-119 names are settled where they live: pharmacy/restaurant/hotel by the owner joins in M3–M5, marketplace `review`/`product-qa` by the existing two-hop `reviewMarket()` (`marketplace/admin/admin.service.ts:798-810`), and marketplace `gift-card`/`seller-promotion` plus payout-service `payout`/`seller-wallet` are recorded in the Deferred section as REGIONAL/INFRA work, not module work.

**Files:**

- Create: `modules/doctor/backend/migrations/<ts>-DoctorRegionCode.ts` (INFRA's runner)
- Modify: `modules/doctor/backend/src/entities/doctor.entity.ts` (add the column)
- Create: `modules/doctor/backend/src/admin/admin.controller.ts`, `admin.service.ts`, `dto/admin.dto.ts`, `admin-scope.spec.ts`
- Modify: `modules/doctor/backend/src/doctor.service.ts` (stamp `regionCode` in the create/attach paths)
- Modify: `modules/doctor/backend/src/doctor.controller.ts:515-565` (move the three admin patterns across)
- Modify: `modules/doctor/backend/src/doctor-service.module.ts`
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-doctor.controller.ts`
- Create: `apps/api/apps/api-gateway/src/dto/admin-doctor.dto.ts`

**Interfaces:**

- Consumes from INFRA: `modules/doctor/backend/migrations/` + `npm run migration:run` in that package.
- Produces: twelve `admin.doctor.<verb>` handlers; `doctors.region_code` as the module's second market column.

- [ ] **Step 1: Write the migration**

```ts
export class DoctorRegionCode<ts> implements MigrationInterface {
  /**
   * A practitioner had no market.
   *
   * `doctors` carries a nullable `clinicId` and a nullable `hospitalId` and
   * nothing else that places a person anywhere, so the admin directory failed
   * closed for every regional administrator: correct, and unusable. The market
   * is denormalised here rather than joined at read time because a doctor may
   * have neither parent, and a three-way LEFT JOIN that can produce NULL is not
   * a predicate a reviewer can check.
   */
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE doctors ADD COLUMN IF NOT EXISTS region_code varchar NULL`);
    await q.query(`
      UPDATE doctors d SET region_code = c.region_code
      FROM clinics c WHERE d."clinicId" = c.id AND d.region_code IS NULL`);
    await q.query(`
      UPDATE doctors d SET region_code = h.region_code
      FROM hospitals h WHERE d."hospitalId" = h.id AND d.region_code IS NULL`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_doctors_region_code ON doctors (region_code)`);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS idx_doctors_region_code`);
    await q.query(`ALTER TABLE doctors DROP COLUMN IF EXISTS region_code`);
  }
}
```

(Check `hospitals` for its own market column first — `grep -n "region" modules/doctor/backend/src/entities/hospital.entity.ts`. If it has none, drop the second `UPDATE` and say so in the comment rather than inventing a value.)

- [ ] **Step 2: Failing spec** — `modules/doctor/backend/src/admin/admin-scope.spec.ts`: the doctors list filters `d.regionCode = :market` instead of refusing; a doctor with a null `regionCode` is excluded from a scoped list and present in a global one; `verifyDoctor`/`suspendDoctor` on a foreign practitioner throw and write nothing; `appointments` joins `doctor` and filters on `doctor.regionCode`; `approveClinic` asserts `clinic.regionCode`; `createSpecialty` refuses a locked admin (the taxonomy is global).

- [ ] **Step 3: Run — FAIL.** From `modules/doctor/backend`: `npx vitest run src/admin/admin-scope.spec.ts`

- [ ] **Step 4: Add the column, stamp it, write the service and controller.** The `Doctor` entity gains:

```ts
  /**
   * The market this practitioner works in, copied from their clinic or hospital
   * when they are attached to one. Denormalised on purpose — see the migration.
   */
  @Column({ type: 'varchar', name: 'region_code', nullable: true })
  regionCode: string | null;
```

Note the `T | null` column needs the explicit `type:` (`project_typeorm_nullable_reflection`). Stamp it wherever `clinicId`/`hospitalId` is set. Then `DoctorAdminService` + `DoctorAdminController` as in M3, and remove the `refuseUnattributable` from `tcpAdminGetDoctors` (`doctor.controller.ts:545-556`), replacing the comment with one that records why the column now exists.

- [ ] **Step 5: Run, migrate, build.** `npm run migration:run` (doctor), `npx vitest run` → 16 + 6 = 22 passed, `npm run build` → 0.

- [ ] **Step 6: Gateway perms and DTOs** — `'perm:modules.doctor'`; `'perm:kyc.approve'` on `verifyDoctor`; DTOs for the four bodies.

- [ ] **Step 7: Run and build** from `apps/api` → green, 0.

- [ ] **Step 8: Live probe** — doctor-service from `dist` on 4007; the three shapes against `/admin/doctor/doctors`, `/clinics/:id`, `/appointments`, plus the proof that `qa-admin` now gets a **populated** doctor list where it used to get 403.

- [ ] **Step 9: Commit (three commits)**

```bash
git add modules/doctor/backend/migrations
git commit -m "feat(doctor): a market column on doctors, backfilled from clinic and hospital" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add modules/doctor/backend/src
git commit -m "feat(doctor): twelve admin handlers scoped by clinic and practitioner market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/api-gateway/src
git commit -m "feat(gateway): doctor admin routes carry permission keys and validated bodies" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7 (M7): Taxi — the seven approval and detail handlers MODULES owns; grocery confirmed complete

`Closes: AUD2-050 (taxi half — approvals and details only)`

Twenty-one taxi commands have no handler. **Fourteen belong to the TAXI plan and must not be touched here** — `dashboard`, `rides`, `rideDetail`, `fleet`, `pricing`, `updatePricing`, `updateSurge` (AUD2-060), `complaints`, `resolveComplaint`, `routes`, `createRoute`, `compliance`, `settings`, `updateSettings`. They depend on entities that do not exist yet (`vehicles`, surge zones — AUD2-126) or on the fare/zone rework (AUD2-018/019).

**Seven are onboarding and approval decisions whose services already exist** and which this plan finishes, because they are the same pattern as M3–M6 and because the approval queue is what every other module's task delivers: `admin.taxi.vendorDetail`, `admin.taxi.approveVendor`, `admin.taxi.suspendVendor`, `admin.taxi.driverDetail`, `admin.taxi.approveDriver`, `admin.taxi.approvePayout`, `admin.taxi.pendingApprovals`.

Attribution: every taxi entity carries `countryCode` — `taxi_drivers`, `taxi_vendors`, `taxi_payout_records`, `taxi_documents` via the driver. `vendor-management.service.ts`, `driver-onboarding.service.ts` and `taxi-payout.service.ts` hold the implementations; only the patterns are missing, exactly the situation hotel was in.

**Grocery:** the census finds **zero** unhandled grocery commands, and grocery is the audit's best-implemented module (E row 26, "canonical"). Its open rows are REGIONAL's (AUD2-010 unscoped duplicates on the public controller, AUD2-084 settings split, AUD2-094 cache invalidation) and INFRA's. This task adds a spec that pins that state so a later change cannot quietly regress it.

**Files:**

- Create: `modules/taxi/backend/src/admin/admin.controller.ts`, `admin-scope.spec.ts`
- Modify: `modules/taxi/backend/src/taxi-service.module.ts`
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-taxi.controller.ts` (perms on the seven; DTOs)
- Create: `apps/api/test/module-command-coverage.spec.ts` (the grocery pin, extended by M10)

**Interfaces:**

- Produces: the seven `admin.taxi.*` handlers, `{ scope, actorId, ...dto }`, asserting `countryCode`.
- Explicitly **not** produced (TAXI plan owns): the fourteen ops commands listed above.

- [ ] **Step 1: Failing spec** — `modules/taxi/backend/src/admin/admin-scope.spec.ts`: `approveVendor` on a vendor whose `countryCode` is another market throws and writes nothing; `driverDetail` on a foreign driver throws; `pendingApprovals` filters drivers and vendors on `countryCode`; `approvePayout` asserts the payout record's `countryCode`; a global caller sees all.

- [ ] **Step 2: Run — FAIL.** From `modules/taxi/backend`: `npx vitest run src/admin/admin-scope.spec.ts`

- [ ] **Step 3: Write `TaxiAdminController`** — seven `@MessagePattern`s delegating to the existing services, each preceded by `assertInMarket(row.countryCode, d?.scope, '<what>', this.logger)` inside the service method (add the parameter where it is missing; `driver-onboarding.service.ts` already asserts for suspend/block, per E row 15).

```ts
// These seven were the last unhandled taxi commands whose implementation
// already existed: vendor and driver onboarding decisions and the payout
// approval. The fourteen remaining `admin.taxi.*` commands are the operations
// console (rides, fleet, surge, pricing, complaints, routes, compliance,
// settings) and are the taxi plan's: they need entities this module does not
// have yet. They are deliberately still unhandled rather than pointed at a
// near-enough method that would answer with another market's fleet.
```

- [ ] **Step 4: Pin grocery.** `apps/api/test/module-command-coverage.spec.ts`:

```ts
it('grocery sends no admin command without a handler', () => {
  const orphans = sentFrom('admin-grocery.controller.ts').filter((c) => !handled.has(c));
  expect(orphans).toEqual([]);
});
```

- [ ] **Step 5: Run and build.** `npx vitest run` from `modules/taxi/backend` → 20 + 5 = 25 passed; `npm run build` → 0. From `apps/api`: `npx vitest run test apps/api-gateway`; `npx nest build --all` → 0.

- [ ] **Step 6: Live probe** — taxi-service from `dist` on 4027. Note the seed gap (AUD2-113: 0 vendors, 0 drivers, 0 rides): seed two vendors and two drivers, one per market, as part of M11 first, or the probe can only show 403s and not the positive case.

- [ ] **Step 7: Commit (two commits)**

```bash
git add modules/taxi/backend/src
git commit -m "feat(taxi): vendor, driver and payout approval handlers assert the record's market" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/apps/api-gateway/src apps/api/test
git commit -m "feat(gateway): taxi approval routes carry permission keys; grocery coverage pinned" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8 (M8): The five module HTTP surfaces stop being a second, unauthenticated admin API

`Closes: AUD2-017`

`modules/{restaurant,doctor,grocery,hotel,pharmacy}/backend/src/main.ts` call `app.enableCors()` with no arguments (reflects any origin, `Access-Control-Allow-Credentials: true`) and four of the five call `app.listen(httpPort)` with **no host**, which binds `0.0.0.0`. Their controllers carry no class guard, so `PUT /admin/hotels/:id/suspend` (`hotel/backend/src/admin/admin.controller.ts:45-47`), `restaurant.controller.ts:302,312,322` and `pharmacy.controller.ts:465-521` are reachable **with no credential at all** from any LAN peer or pod. Pharmacy already binds loopback (`pharmacy/backend/src/main.ts:30`) but still enables CORS and still publishes the routes.

Marketplace solved this in one file: `HttpSurfaceGuard` (`modules/marketplace/backend/src/transport/http-surface.guard.ts`) answers 404 to every HTTP request except those marked `@AllowHttp()` (health), while TCP and gRPC are untouched. Lift it into `@app/security` and apply it everywhere.

**Files:**

- Create: `apps/api/libs/security/src/http-surface.guard.ts` (moved), `http-surface.guard.spec.ts`
- Modify: `apps/api/libs/security/src/index.ts`
- Modify: `modules/marketplace/backend/src/transport/http-surface.guard.ts` → delete; `main.ts:7` imports from `@app/security`
- Modify: `modules/{restaurant,doctor,grocery,hotel,pharmacy}/backend/src/main.ts`
- Modify: each module's health controller/route with `@AllowHttp()`
- Create: `apps/api/test/module-http-surface.regression.spec.ts`

**Interfaces:**

- Produces (`@app/security`): `HttpSurfaceGuard`, `AllowHttp()`, `ALLOW_HTTP_KEY`.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing regression spec**

`apps/api/test/module-http-surface.regression.spec.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

const MODULES = path.resolve(__dirname, '..', '..', '..', 'modules');

/**
 * A module backend publishes one API, over TCP, through the gateway.
 *
 * Five of them also published their whole HTTP API on 0.0.0.0 with wildcard
 * CORS and no guard on any controller, so `suspend`, `block` and `commission`
 * were callable with no credential at all from any peer that could reach the
 * port. The bind address is defence in depth; the guard is the control.
 */
describe('module HTTP surfaces are closed', () => {
  const mains = fs
    .readdirSync(MODULES)
    .map((m) => path.join(MODULES, m, 'backend', 'src', 'main.ts'))
    .filter((p) => fs.existsSync(p));

  it('binds HTTP to loopback unless the host is configured', () => {
    const open = mains.filter((p) =>
      /await app\.listen\(\s*\w+\s*\)/.test(fs.readFileSync(p, 'utf8')),
    );
    expect(open.map((p) => path.relative(MODULES, p))).toEqual([]);
  });

  it('never calls enableCors() with no arguments', () => {
    const wide = mains.filter((p) => /app\.enableCors\(\s*\)/.test(fs.readFileSync(p, 'utf8')));
    expect(wide.map((p) => path.relative(MODULES, p))).toEqual([]);
  });

  it('registers HttpSurfaceGuard in every module backend', () => {
    const missing = mains.filter((p) => !/HttpSurfaceGuard/.test(fs.readFileSync(p, 'utf8')));
    expect(missing.map((p) => path.relative(MODULES, p))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it — FAIL.** From `apps/api`: `npx vitest run test/module-http-surface.regression.spec.ts` — five files in the first two lists, six in the third (taxi and franchise included).

- [ ] **Step 3: Move the guard into `@app/security`**

`git mv modules/marketplace/backend/src/transport/http-surface.guard.ts apps/api/libs/security/src/http-surface.guard.ts`, generalise its header comment from "the marketplace service" to "a module backend", add `export * from './http-surface.guard';` to `libs/security/src/index.ts`, and change `modules/marketplace/backend/src/main.ts:7` to import it from `@app/security`. Keep the 404-not-403 behaviour and the reason recorded in the comment.

- [ ] **Step 4: Apply it in the five mains**

For each of restaurant, doctor, grocery, hotel, pharmacy, replace the bootstrap tail with marketplace's (`marketplace/backend/src/main.ts:24-56`), adapted:

```ts
// HttpSurfaceGuard closes this service's HTTP surface to everything but the
// health probe. Until now every controller here was published twice: once
// over TCP behind the gateway's guards, and once over plain HTTP with no
// guard on any route, on 0.0.0.0, with `enableCors()` reflecting any origin.
// Suspend, block and commission were callable with no credential.
app.useGlobalGuards(new HttpSurfaceGuard(app.get(Reflector)), new InternalServiceGuard());

// CORS deliberately not enabled: a health-only surface has no browser caller.

const httpPort = +(process.env.HOTEL_SERVICE_PORT ?? 3025);
const httpHost = process.env.HOTEL_HTTP_HOST ?? '127.0.0.1';
await app.listen(httpPort, httpHost);
```

and mark each module's health route `@AllowHttp()`.

- [ ] **Step 5: Remove the duplicated admin routes those controllers publish**

With the surface closed the HTTP routes are unreachable, but they are still a second copy of the admin API that the next reader will believe in. Delete the `@Get/@Put/@Patch` admin decorators (keeping the methods, which the `@MessagePattern`s call) from `restaurant.controller.ts:650-1244`, `pharmacy.controller.ts:465-521`, `grocery.controller.ts:172,180,302,310,786,799,926,934`, `hotel/admin/admin.controller.ts:32-87` and the doctor equivalents. One comment per file records that the gateway is the only admin surface.

- [ ] **Step 6: Run everything**

From `apps/api`: `npx vitest run test/module-http-surface.regression.spec.ts libs/security` → PASS. From each module backend: `npx vitest run` → the baselines hold (marketplace 250, grocery 104, hotel 25 + M5's, taxi 20 + M7's, restaurant 18 + M4's, doctor 16 + M6's, pharmacy 12 + M3's). `npx nest build --all` from `apps/api` → 0; `npm run build` in each module → 0.

- [ ] **Step 7: Live probe — the point of the whole task**

```bash
node modules/hotel/backend/dist/main.js &
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3025/health                       # 200
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://127.0.0.1:3025/admin/hotels/$ID/suspend   # 404 (was 200/201)
curl -s -o /dev/null -w "%{http_code}\n" http://$(hostname -I | awk '{print $1}'):3025/health     # connection refused
# and the gateway path still works, as the caller it is:
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH -H "Authorization: Bearer $SU" "$B/admin/hotel/hotels/$ID/suspend" -d '{"reason":"probe"}' -H 'Content-Type: application/json'   # 200
```

Repeat for restaurant (3018), doctor (3007), grocery (3008), pharmacy (3020).

- [ ] **Step 8: Commit (two commits)**

```bash
git add apps/api/libs/security apps/api/test
git commit -m "feat(security): one shared http surface guard for every module backend" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add modules
git commit -m "fix(modules): close the unguarded http admin surface on all five module backends" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9 (M9): No admin surface fabricates: reviews, bank offers, dashboard counters, KYC bytes and the dead cache purges

`Closes: AUD2-051, AUD2-053, AUD2-054, AUD2-055, AUD2-115, AUD2-116, AUD2-145`

Seven places where a real backend exists beside a fake answer.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/admin-marketplace.controller.ts:2239-2260` (reviews)
- Modify: `modules/marketplace/backend/src/admin/admin.service.ts:1819-1840` (`getBankOffers`), `:2046-2051` (dead `delPattern`), + new `getReviewsForAdmin`
- Modify: `modules/marketplace/backend/src/marketplace.controller.ts` (`admin_get_reviews` pattern)
- Modify: `modules/marketplace/backend/src/marketplace.service.ts:87-107` (`createProduct`, `updateProduct` invalidation)
- Modify: `modules/marketplace/backend/src/catalog/catalog.service.ts:1736-1745` (verified-seller purge on the write path)
- Modify: `apps/api/apps/admin-service/src/admin.service.ts:93-140` (`getDashboardStats`)
- Modify: `apps/api/apps/api-gateway/src/controllers/upload.controller.ts:60-79,105-119`; `apps/api/libs/storage/src/storage.service.ts:111-115`
- Create: `modules/marketplace/backend/src/admin/admin-reviews.spec.ts`, `apps/api/apps/api-gateway/src/controllers/upload.controller.spec.ts`

**Interfaces:**

- Produces: `admin_get_reviews { page, limit, status?, rating?, region?, scope? }` → `{ data: Review[], total, page, limit }`; `GET /admin/marketplace/reviews` finally returns reviews.
- Produces: `uploadKycDocument` / `uploadProfileImage` return the key the storage layer actually wrote, or throw.

- [ ] **Step 1: Failing specs**

`admin-reviews.spec.ts`: `getReviewsForAdmin({ scope: 'QA' })` joins product → seller and filters on `seller.regionCode`; a review whose product or seller is gone is excluded for a scoped caller and included for a global one; the list is not the product list (assert on the repository it queries).

`upload.controller.spec.ts`: `uploadKycDocument` calls `storage.upload` exactly once with the file buffer, and rejects when `storage.upload` rejects — no URL is returned on failure.

Run both → FAIL.

- [ ] **Step 2: The review moderation queue**

`marketplace/admin/admin.service.ts` already has `reviewMarket()` (`:798-810`) doing the two-hop attribution for decisions. Give the list the same path as a join:

```ts
  /**
   * The review moderation queue — the queue that did not exist.
   *
   * `GET /admin/marketplace/reviews` was pointed at `admin_get_products` and
   * returned products, because there was no review handler to point it at. The
   * decisions (`admin_flag_review`, `admin_hide_review`) were real all along, so
   * an admin could act on a review they had no way to find.
   *
   * A review carries only `product_id`; the product carries only `seller_id`;
   * the seller carries `region_code`. Two joins, and a review whose product or
   * seller has gone is unattributable — excluded from a scoped list rather than
   * shown to whoever happens to be looking.
   */
  async getReviewsForAdmin(q: { page?: number; limit?: number; status?: string; rating?: number; region?: string; scope?: string }) {
    const take = Math.min(Math.max(Number(q.limit) || 20, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const market = marketPredicate(q.scope, q.region);
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoin('marketplace.products', 'product', 'product.id = review.product_id')
      .leftJoin('marketplace.sellers', 'seller', 'seller.id = product.seller_id')
      .addSelect(['seller.region_code'])
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * take)
      .take(take);
    if (market) qb.andWhere('seller.region_code = :market', { market });
    if (q.status) qb.andWhere('review.status = :status', { status: q.status });
    if (q.rating) qb.andWhere('review.rating = :rating', { rating: Number(q.rating) });
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit: take };
  }
```

(Schema-qualify with `tablePath`, never a bare table name — `public.*` copies of these tables shadow the real ones, `project_marketplace_schema_decoys`.) Add `ADMIN_GET_REVIEWS: 'admin_get_reviews'` to `MARKETPLACE_PATTERNS`, a `tcpAdminGetReviews` pattern, and repoint the gateway handler (`:2255`), replacing the six-line "still pointed at products" comment with one sentence recording that the queue now exists.

- [ ] **Step 3: Bank offers stop serving a fixture**

`admin/admin.service.ts:1819` — `getBankOffers()` returns a hard-coded array of HDFC/ICICI offers cached under `admin:bank-offers`, sitting twenty lines above the real, region-scoped `listBankOffers()` (`:1900-1929`). Delete `getBankOffers()` entirely and point its one caller at `listBankOffers(false, undefined, market, regionStrict)`. Delete the `admin:bank-offers` key with it.

- [ ] **Step 4: Two real cache purges and two dead ones**

`invalidateOfferCaches()` (`:2046-2051`) purges `marketplace:bank-offers*` and `marketplace:exchange-offers*` — prefixes **nothing in the repo writes**. Delete those two lines, keep `marketplace:featured:*`, and record why in one line.

`marketplace.service.ts` — `createProduct` (`:87-95`) purges only `marketplace:featured:*` and `updateProduct` (`:97-107`) only the per-product keys, while `products:*` and `search:*` are swept on the approve path alone, so a price change is invisible on listing and search for up to 60 s. Call the existing `invalidateCatalogueCaches(id)` from both.

`catalog.service.ts:1737` — `marketplace:verified-sellers:${region}` has a 300 s TTL and no write path purges it. Add `await this.redis.delPattern('marketplace:verified-sellers:*')` to the seller-verification write path.

- [ ] **Step 5: The dashboard says "unavailable", not "zero"**

`admin.service.ts:93-140` already re-throws a failed aggregate (`:134-138`), but when `isDbActive()` is false the method falls through with `users/orders/revenue` at zero, which reads as a quiet day. Replace the `if (this.isDbActive() && this.em) {` guard with an early refusal:

```ts
if (!this.isDbActive() || !this.em) {
  // Zero counters and an unreachable database are the same screen. They are
  // not the same fact, and an administrator deciding on the strength of
  // "0 orders today" during an outage is the reason this throws.
  throw new ServiceUnavailableException(
    'The platform database is unavailable; counters cannot be read.',
  );
}
```

- [ ] **Step 6: KYC uploads actually store the bytes**

`upload.controller.ts:60-79` and `:105-119` compute a file key, return `"securely uploaded to object storage"` and a CDN URL, and **never call `this.storage.upload`** — so every seller and driver KYC document submitted to date does not exist anywhere. Add the call, return the key the storage layer reports, and make `storage.service.ts:111-115`'s `uploadToS3` catch re-throw instead of returning a well-formed URL.

- [ ] **Step 7: Run everything**

From `modules/marketplace/backend`: `npx vitest run` → 250 + 3 passed. From `apps/api`: `npx vitest run apps/api-gateway apps/admin-service libs/storage` → green; `npx nest build --all` → 0.

- [ ] **Step 8: Live probe**

```bash
curl -s -H "Authorization: Bearer $QA" "$B/admin/marketplace/reviews" \
  | node -pe 'const j=JSON.parse(require("fs").readFileSync(0)); [typeof j.data[0]?.rating, j.data[0]?.productId !== undefined]'  # ["number", true] — reviews, not products
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $QA" "$B/admin/marketplace/reviews?country=IN"   # 403
curl -s -H "Authorization: Bearer $SU" "$B/admin/marketplace/bank-offers" | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.every(o=>o.id !== "bo-1")'  # true — no fixture
# stop the main database, then:
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $SU" "$B/admin/dashboard"   # 503, not 200-with-zeros
# upload a KYC document and confirm the object exists in storage, not just in the response
```

- [ ] **Step 9: Commit (two commits)**

```bash
git add apps/api/apps/api-gateway/src apps/api/apps/admin-service/src apps/api/libs/storage
git commit -m "fix(api): kyc uploads store the bytes; the dashboard reports an outage as an outage" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add modules/marketplace/backend/src
git commit -m "feat(marketplace): a real review moderation queue; bank offers and caches stop lying" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10 (M10): A command census in CI, so an unhandled admin command can never ship again

`Closes: AUD2-117 (the CI half)`

`test/gateway-service-contract.spec.ts` exists and is meant to catch exactly this, but it cannot see the commands that matter. `readSentCommands` (`:157-166`) matches `this.send(…)` with `['"\`]([a-z0-9_.]+)['"\`]`, so every **camelCase** command is invisible: `admin.doctor.clinicDetail`, `admin.pharmacy.storeDetail`, `admin.hotel.moderateReview`, `admin.taxi.approveVendor`and 30-odd others sailed past it, which is why its`UNIMPLEMENTED_COMMANDS`baseline lists 44 while the census finds 75.`stripComments` (`:100-102`) is also order-fragile — it removes `/_ … _/`before`// …`, so a `//`line containing`/_`swallows everything to the next`_/`.

**Files:**

- Create: `apps/api/scripts/check-admin-commands.mjs`
- Modify: `apps/api/test/gateway-service-contract.spec.ts:100-102, 157-166, 49-92`
- Modify: `apps/api/package.json` (add `pretest`)
- Create: `apps/api/test/admin-command-census.spec.ts`

**Interfaces:**

- Produces: `node apps/api/scripts/check-admin-commands.mjs [--json <path>]` → exit 1 with a report when a gateway `/admin` command has no `@MessagePattern`; exit 0 otherwise. `npm test` in `apps/api` runs it first.

- [ ] **Step 1: Write the census script**

`apps/api/scripts/check-admin-commands.mjs` — a dependency-free Node script reusing the proven scanner from `scripts/verification/admin-console-census.mjs` (which already resolves `PATTERNS.` constants and walks `modules/*/backend/src`), narrowed to the question and made to exit non-zero:

```js
/* global process, console */
// Fails when the gateway sends an admin command no service answers.
//
// The gateway's admin controllers address six module backends with dotted,
// camelCase command names. Nothing checked that a name on one side existed on
// the other, so 75 commands were sent into the void: a 503 at best, and —
// while the gateway's send() helpers still took a `fallback` — a fabricated
// empty success at worst. The console could not tell "none" from "not built".
//
// Exit 0 = every command the gateway sends has a @MessagePattern.
```

It must: strip comments in one pass (line comments first, then block comments, over a source where string literals are masked); collect `{ cmd: '…' }`, `this.send*('…')` and `*PATTERNS.KEY` references with a **case-insensitive** identifier class `[A-Za-z0-9_.:-]+`; collect `@MessagePattern({ cmd: '…' })` and `@MessagePattern('…')` from `apps/api/apps/*` (excluding `api-gateway`) and `modules/*/backend/src`; report `cmd  (sent by <file>:<line>)` for every gateway command with no handler; and carry a short, shrink-only `KNOWN_UNHANDLED` list for the fourteen taxi ops commands M7 leaves to the TAXI plan, each with the reason on the line.

- [ ] **Step 2: Run it and watch it fail on today's tree**

`node apps/api/scripts/check-admin-commands.mjs`
Expected before M3–M7 land: exit 1, 75 lines. After them: exit 1 with only the fourteen taxi ops commands, which then go into `KNOWN_UNHANDLED`; exit 0.

- [ ] **Step 3: Fix the existing contract spec so the two agree**

In `gateway-service-contract.spec.ts`, change `stripComments` (`:100-102`) to strip line comments before block comments, and the `this.send` regex (`:162-164`) from `[a-z0-9_.]+` to `[A-Za-z0-9_.:-]+`. Then prune `UNIMPLEMENTED_COMMANDS` (`:49-92`) to what is genuinely still unimplemented — the `it('keeps the unimplemented baseline honest')` test at `:296-302` fails on every entry M3–M7 implemented, which is the list to delete.

- [ ] **Step 4: Wire it into `npm test`**

`apps/api/package.json`:

```json
    "pretest": "node scripts/check-admin-commands.mjs",
    "test": "vitest run",
```

`pretest` runs automatically before `test`, so `npm test` and `turbo run test` from the repo root both gate on it without a shell-specific `&&`.

- [ ] **Step 5: Add the spec that keeps the script honest**

`apps/api/test/admin-command-census.spec.ts` runs the script in-process and asserts it exits 0, so the check also fails a plain `npx vitest run` and not only `npm test`.

- [ ] **Step 6: Run the whole `apps/api` suite and the build**

`npm test` from `apps/api` → the census passes, then vitest ≥ 677 + the new files. `npx nest build --all` → 0.

- [ ] **Step 7: Prove it catches a regression**

Add `this.send('admin.doctor.doesNotExist', {})` to a scratch branch of `admin-doctor.controller.ts`, run `npm test`, confirm exit 1 naming that command **and its file and line**, then revert.

- [ ] **Step 8: Commit**

```bash
git add apps/api/scripts/check-admin-commands.mjs apps/api/test apps/api/package.json
git commit -m "test(api): an unhandled gateway admin command now fails the build" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11 (M11): The seeds the new handlers read — ISO-2 markets, the alpha-3 column retired, the empty tables filled

`Closes: AUD2-052 (seed half), AUD2-113, AUD2-114`

M3–M7's handlers are correct and will still show empty screens, because the data underneath them does not carry the market they filter on.

- `pharmacy_stores.region_code` holds Mumbai district codes (`MUM-*`), so the one predicate pharmacy has matches nothing for any ISO-2 admin (AUD2-052).
- `restaurants.countryCode` and `pharmacy_stores.countryCode` are legacy alpha-3 columns defaulting to `'KEN'` (`restaurant.entity.ts:68-69`, `pharmacy-store.entity.ts:64-65`), sitting beside the real ISO-2 `regionCode`. Two market columns on one row, one of them wrong for every row (AUD2-114).
- Coverage is uneven enough that a correct console reads as broken: taxi 2/9 tables populated (0 vendors, 0 drivers, 0 rides), hotel 4/9 (0 bookings, 0 staff), doctor 7/13 (AUD2-113).

**Files:**

- Modify: `modules/restaurant/backend/src/entities/restaurant.entity.ts:68-69`, `modules/pharmacy/backend/src/entities/pharmacy-store.entity.ts:64-65`
- Create: `modules/{restaurant,pharmacy}/backend/migrations/<ts>-DropLegacyCountryCode.ts` (INFRA's runner)
- Modify: `apps/api/scripts/seed/` — the pharmacy, restaurant, taxi, hotel and doctor seeds
- Create: `apps/api/scripts/seed/seed-module-markets.spec.ts` (or extend the existing seed spec)

**Interfaces:**

- Consumes from INFRA: the per-module migration runner (as M6).
- Produces: at least two rows per module per market for QA and IN, so every live probe in M3–M7 has a positive case and a foreign case.

- [ ] **Step 1: Failing spec** — a seed spec that asserts, for every module table with a market column, that every seeded value matches `/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/` and that both `QA` and `IN` appear. Run it → FAIL on `MUM-01`, `KEN`, and on the taxi/hotel tables with no rows.

- [ ] **Step 2: Reseed the markets** — pharmacy stores get ISO-2 `regionCode`; the district code, if it is still wanted, moves to `zoneId`, which is the column for it (`pharmacy-store.entity.ts:61-62`).

- [ ] **Step 3: Retire the alpha-3 column** — drop `countryCode` from both entities and from the seeds, with a migration that drops the column after confirming nothing reads it (`grep -rn "countryCode" modules/restaurant modules/pharmacy --include=*.ts | grep -v node_modules`). Do **not** backfill it: a second market column is what the row was wrong about.

- [ ] **Step 4: Fill the empty tables** — two taxi vendors and four drivers (two per market) with `countryCode` set; four hotel bookings across two hotels in two markets; the six missing doctor tables. Enough for a list to be non-empty, an approval to be takeable, and a cross-market refusal to be provable — not a demo dataset.

- [ ] **Step 5: Run** the seed, the spec, and every module suite → green.

- [ ] **Step 6: Live probe** — re-run the M3, M5, M6 and M7 probes and confirm each now has both a populated own-market list **and** a 403 on a foreign record. Before this task those probes could only demonstrate the refusal.

- [ ] **Step 7: Commit (two commits)**

```bash
git add modules/restaurant/backend modules/pharmacy/backend
git commit -m "fix(modules): one market column per row; the alpha-3 country code is gone" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"

git add apps/api/scripts/seed
git commit -m "fix(seed): iso-2 markets everywhere, and rows in the tables the consoles read" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12 (M12): The validation and auth residue the audit routed to MODULES

`Closes: AUD2-056, AUD2-118, AUD2-120, AUD2-121, AUD2-122, AUD2-123, AUD2-124, AUD2-125`

Eight rows the audit assigned to this workstream that are not module backends but are the same class of defect — a control that reads as present and is not. They are grouped here because each is small, each has a precise fix, and leaving them scattered across the module tasks would bury them.

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/gateway.controller.ts:658-753` (OTP), `:836-845` (forgot-password)
- Modify: `apps/api/libs/guards/.../roles.guard.ts:45` (decode fallback)
- Modify: `apps/api/apps/api-gateway/src/controllers/admin-access.controller.ts:374, 442-444`
- Modify: `apps/api/apps/api-gateway/src/services/staff-mfa.service.ts:105-121`
- Modify: `apps/api/apps/api-gateway/src/interceptors/audit.interceptor.ts:174-182`; `controllers/geo-security.controller.ts:342-348`
- Modify: the admin controllers still taking untyped bodies (AUD2-118)
- Create: specs beside each

**Interfaces:** none consumed or produced beyond the existing surfaces.

- [ ] **Step 1: AUD2-056 — OTP login stops creating a duplicate account every time**

`gateway.controller.ts:700,702-717` matches the **raw** phone against encrypted column values, so the lookup never matches and a new account is created on every OTP login; that account then stores `phone` in plaintext while every other path encrypts it. Encrypt the lookup value with the same helper the write path uses, and store the encrypted phone. Spec: two OTP verifies for one phone yield one user id, and the stored `phone` is not the plaintext.

- [ ] **Step 2: AUD2-124 + AUD2-149 — OTP and reset are rate-limited where a reader can see it**

`/auth/otp/verify` has no `@Throttle` and no per-phone counter: the code is deleted only on success and the one limiter is IP-keyed while the secret is phone-keyed — on a route that creates an account and issues a session. Store `{ code, attempts }` under `otp:<phone>`, delete after 5 failures, add `@Throttle({ limit: 10, ttl: 60_000 })`. Add `@Throttle({ limit: 5, ttl: 300_000 })` to `/auth/forgot-password` (`:836`) so the limit is visible at the route rather than only in the DDoS middleware.

- [ ] **Step 3: AUD2-123 — the MFA counter is atomic and the TTL is not refreshed**

`staff-mfa.service.ts:105-121` is a read-modify-write, so concurrent verifies each read `attempts` before either writes, and the failure path resets the 300 s TTL, extending how long a code stays live. Use `INCR` and never `EXPIRE` on failure. Spec: five concurrent wrong codes burn the challenge exactly once; the TTL after a failure is lower than before it.

- [ ] **Step 4: AUD2-121 — the RolesGuard decode fallback**

`roles.guard.ts:45` accepts **any** signature-valid token — a 30-day refresh, a 5-minute MFA challenge — with no revocation check. No gateway route reaches it today because class guards run first, which makes it a trap for the first controller that omits one. Remove the fallback. If something genuinely needs it, it must check the token type and revocation; a spec asserts a refresh token and an MFA challenge token are both rejected.

- [ ] **Step 5: AUD2-122 — the last super admin cannot demote themselves**

`admin-access.controller.ts:442-444` blocks only self-**deactivation**; `dto.role` / `dto.adminRoleId` self-changes are unguarded and nothing counts the remaining SUPER_ADMINs. Guard self-role changes and refuse when the change would leave zero active SUPER_ADMINs.

- [ ] **Step 6: AUD2-120 — staff can reset their password**

Staff creation mints a temporary password (`:374`) and `/auth/forgot-password` (`:845`) is not staff-aware, so there is no staff reset path at all. Make the reset flow staff-aware (it already needs the MFA challenge; reuse it).

- [ ] **Step 7: AUD2-125 — the audit trail records the IP, not the caller's claim about it**

`audit.interceptor.ts:174-182` and `geo-security.controller.ts:342-348` read `X-Forwarded-For` / `X-Real-IP` unconditionally, so `actorIp` in the immutable audit trail is caller-supplied and every geo-fencing decision is bypassable with one header. Delete both hand-rolled extractors and use `req.ip`; `main.ts:56-59` already sets `trust proxy` to a hop count. While in `geo-security.controller.ts`, close **AUD2-148** in the same edit: `net.isIP(ip)` before the `ipinfo.io` lookup and `encodeURIComponent` the segment (`:376-378`).

- [ ] **Step 8: AUD2-118 — the DTO programme, controller by controller**

Plan B typed 15 of roughly 120 admin handlers; M1 and M3–M7 type their own. Sweep what remains: `grep -n "@Body() [a-z]*: any\|@Body() [a-z]*: {" apps/api/apps/api-gateway/src/controllers/admin-*.controller.ts` and give each a class-validator DTO under whitelist + `forbidNonWhitelisted`. Add an assertion to `route-exposure.regression.spec.ts` that no `/admin` route declares an inline or `any` body, so the count cannot go back up.

- [ ] **Step 9: Run and build**

`npx vitest run apps/api-gateway libs/guards` from `apps/api` → green; `npm test` → the census and the suite pass; `npx nest build --all` → 0.

- [ ] **Step 10: Live probe**

```bash
# one phone, two OTP logins, one account
# six wrong MFA codes in parallel → the challenge is burned once, TTL not extended
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $REFRESH_TOKEN" "$B/admin/users"   # 401, not 200
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH -H "Authorization: Bearer $SU" "$B/admin/staff/$SU_ID" -d '{"role":"ADMIN"}' -H 'Content-Type: application/json'   # 403 — last super admin
curl -s -H "Authorization: Bearer $SU" -H 'X-Forwarded-For: 1.2.3.4' "$B/admin/audit-logs?limit=1" | node -pe 'JSON.parse(require("fs").readFileSync(0)).data[0].actorIp !== "1.2.3.4"'   # true
```

- [ ] **Step 11: Commit (one commit per concern, four in all)**

```bash
git commit -m "fix(gateway): otp login finds the existing account and is rate limited per phone" …
git commit -m "fix(gateway): the mfa attempt counter is atomic and a failure never extends the ttl" …
git commit -m "fix(gateway): no unrevoked-token fallback; the last super admin cannot demote themselves" …
git commit -m "fix(gateway): the audit trail and geo checks read req.ip, not a caller's header" …
```

each ending `-m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`.

---

## Deferred (P3)

| id       | Row                                                                                                                  | Why it is not in this plan                                                                                                                                                                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUD2-146 | `brand-image` advertises `svg` in its `FileTypeValidator` allow-list while magic-number validation rejects every SVG | Upload policy, not a module backend, and the practical exposure is nil today. It belongs with the rest of the upload surface (AUD2-053 is fixed in M9; the allow-list is a one-line change the INFRA/security follow-up should take with the CSP work, since dropping `svg` without settling `'unsafe-inline'` (AUD2-109) fixes the smaller half). |
| AUD2-147 | The CSRF double-submit machinery is complete on the client and verified nowhere on the server                        | A decision, not a defect: auth is bearer-only, so the real exposure is nil and the choice is _bind the guard_ or _delete both halves and record why CSRF is structurally prevented_. That decision spans `apps/web/src/proxy.ts` and `libs/security`, which is CONSOLE + INFRA, not MODULES.                                                       |
| AUD2-148 | `https://ipinfo.io/${ip}?token=${token}` interpolates unvalidated caller text                                        | **Folded into M12 Step 7** rather than deferred — it is two lines in a file that task already edits. Listed here only so the row is not read as dropped.                                                                                                                                                                                           |
| AUD2-149 | `/auth/forgot-password` carries no `@Throttle`                                                                       | **Folded into M12 Step 2** for the same reason.                                                                                                                                                                                                                                                                                                    |

Two entities AUD2-119 names are also deferred, with their owners: marketplace `gift-card` and `seller-promotion`, and payout-service `payout` / `seller-wallet`. The first pair has no admin surface left after M2 removes the gift-card stub; the second is the money-path work the programme tracks as C1, where the gateway still blunt-refuses locked admins (`refuseLockedAdmin` on the six payout reads and writes) and the fix is a `region_code` denormalised from the seller — INFRA's migration path plus REGIONAL's ruling on what a seller's money belongs to, since `marketplace.seller_wallets` and `payout-service.payouts` currently give two different answers for one question (E row 41).

---

## Self-review

**Every MODULES row appears exactly once.**

| AUD2 | Task                                                                         | AUD2 | Task                                      |
| ---- | ---------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| 017  | M8                                                                           | 118  | M12                                       |
| 049  | M1                                                                           | 119  | M6 (doctor) + deferred (payout/gift-card) |
| 050  | M3 (pharmacy), M4 (restaurant), M5 (hotel), M6 (doctor), M7 (taxi approvals) | 120  | M12                                       |
| 051  | M9                                                                           | 121  | M12                                       |
| 052  | M3 + M11 (seed)                                                              | 122  | M12                                       |
| 053  | M9                                                                           | 123  | M12                                       |
| 054  | M9                                                                           | 124  | M12                                       |
| 055  | M9                                                                           | 125  | M12                                       |
| 056  | M12                                                                          | 145  | M9                                        |
| 113  | M11                                                                          | 146  | Deferred                                  |
| 114  | M11                                                                          | 147  | Deferred                                  |
| 115  | M9                                                                           | 148  | M12 (Step 7)                              |
| 116  | M9                                                                           | 149  | M12 (Step 2)                              |
| 117  | M5 (naming) + M10 (CI)                                                       |      |                                           |

27 rows, 27 placements. AUD2-050 and AUD2-117 are split by module and by half, with each half named; AUD2-119 is split between the module it can be fixed in and the two entities whose owners are elsewhere. Nothing is listed twice without saying which part goes where.

**Placeholder scan.** After M1, M2 and M9, `grep -nE "return \{ *data: \[\] *(as unknown\[\])? *, *total: 0" apps/api/apps/api-gateway/src/controllers/admin-*.controller.ts` returns only the six `/admin/seo` routes REGIONAL owns. `node apps/api/scripts/verification/admin-console-census.mjs` reports `adminRoutesStubbed: 6` (from 24). `grep -rn "message: '.*management'" apps/api/apps/api-gateway/src/controllers/` returns nothing. `grep -rn "send(.*,.*,.*fallback" apps/api/apps/api-gateway/src/controllers/admin-*.controller.ts` returns nothing — none of the six module admin controllers has a fallback parameter today and no task adds one. The marketplace fixture array at `admin/admin.service.ts:1819-1840` is deleted rather than moved.

**Command-name consistency.** The plan takes every backend `@MessagePattern` name **verbatim from what the gateway already sends** (M3, M4, M6, M7), with one deliberate exception: hotel, where M5 moves the _gateway_ onto the names the backend already implements, because those handlers exist and are called from elsewhere while the `admin.hotel.*` spellings are handled nowhere — renaming the smaller, unhandled side is the change that shrinks the unhandled list. Two duplicate aliases (`admin.hotel.approve`, `admin.hotel.suspend`) are deleted so one decision has one name. M10 makes the choice permanent in both directions: the census fails on a gateway command with no handler, and `gateway-service-contract.spec.ts`'s "keeps the unimplemented baseline honest" test fails on a handler that exists but is still listed as missing. The `KNOWN_UNHANDLED` list M10 introduces holds exactly the fourteen taxi ops commands M7 leaves to the TAXI plan, each with its reason on the line, and may only shrink.

**Where this plan could still be wrong.** Three things to check before executing, because they are the kind of detail that moves:

1. Line numbers are current as of `e0c7832`. M1, M2 and M9 name specific lines in `admin-marketplace.controller.ts` (3,200+ lines); re-`grep` the handler name rather than trusting the number if another plan has landed first.
2. M6 assumes `hospitals` carries a market column. It may not — the migration's second `UPDATE` is conditional on that check, which Step 1 makes explicit.
3. M9's review query joins `marketplace.products` and `marketplace.sellers` by schema-qualified name. Confirm against the repository's `tablePath` helper before writing raw join SQL; `public.*` copies of both tables exist and a bare table name reads the wrong one.
