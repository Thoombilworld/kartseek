# Seller Portal Production Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the marketplace Seller Portal a production-grade, market-isolated, server-authorised system that stays in step with the customer storefront, the regional admin and the super admin — with tests and a two-market end-to-end proof.

**Architecture:** The gateway is the only authorisation point (JWT subject → seller membership → market → permission); the marketplace backend owns the seller data model, the order state machine, the stock ledger, notifications and settlements; commission-service and payout-service take the seller's market and apply that market's rules; the portal reads real data through one client (`sellerApi`) and one table component. Spec: `docs/superpowers/specs/2026-09-13-seller-portal-design.md`; audit: `docs/audits/2026-09-13-seller-portal-audit.md`.

**Tech Stack:** NestJS 11 (gateway + microservices, TCP/gRPC/Kafka), TypeORM + Postgres (schema `marketplace`, module runner as `marketplace_user`), Redis, Socket.IO (Redis adapter), Next.js 16 + React 19 + Tailwind (portal), vitest (api/backends), jest (web), Playwright (e2e, `channel: 'chrome'`).

## Global Constraints

- Branch `feat/admin-platform-upgrade`, shared with six peer sessions: stage only your own paths, never `git stash` or `git add -A`, one workspace per commit (`apps/api`, `modules/marketplace/backend`, `apps/web`, `packages/shared-core` each separately), commit subject ≤ 100 chars, lower-case, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` verbatim.
- Push each verified task (`git fetch origin`, ahead/behind check, fast-forward only, never mid-task, tell the peers).
- Seller routes: `JwtAuthGuard + RolesGuard + SellerOwnershipGuard + SellerModuleGuard + SellerApprovalGuard`, `@Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)`, `@SellerModule('marketplace')`; identity only from the JWT subject / `:sellerId` after the guard; market only from `req.seller.regionCode`.
- Any new or renamed gateway route: send its census/exception entry to kartseekapp-a8 as text (the regression + contract specs are held by M7); never lower a floor.
- Every new `kafka.publish('<literal>')` is declared in `apps/api/libs/kafka/src/kafka-topics.constants.ts` (`KAFKA_TOPICS` + `PUBLISHED_TOPICS`) and provisioned with `npm run kafka:topics`.
- Migrations: timestamps 1786503500000–1786503599999, in `modules/marketplace/backend/migrations/`, registered in `data-source.ts`, idempotent (`IF NOT EXISTS`), with `down()`, run on BOTH databases the module env resolves (`kartseek_db` and `kartseek_marketplace`), `npm run verify:schema-drift` (apps/api) reports 0.
- DTOs: `class-validator`, `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`; booleans read off `obj` (see `BooleanParam()` in `admin-pharmacy.dto.ts`).
- Lists answer `{ data, total, page, limit }`; failures are 4xx/503 with a message, never invented data.
- Live probes use a private gateway on `127.0.0.1:3097` (`PORT=3097 SMOKE_PORT_OFFSET=30000`) or the dev fleet's `:3001` read-only; never kill the developer's `npm run dev` fleet; pace calls (100/min, 20/5 s per loopback IP).
- Local anonymous requests are a super-admin (`DEV_AUTH_BYPASS`): every probe sends `Authorization`.

---

## File map

| File                                                                                                              | Responsibility                                            |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `apps/api/apps/api-gateway/src/dto/seller-portal.dto.ts` (new)                                                    | every seller write body                                   |
| `apps/api/apps/api-gateway/src/guards/seller-ownership.guard.ts`                                                  | membership + market + permission, stamps `req.seller`     |
| `apps/api/apps/api-gateway/src/guards/seller-access.decorator.ts` (new)                                           | `@SellerAccess('perm')`, `SELLER_PERMISSIONS`             |
| `apps/api/apps/api-gateway/src/guards/seller-approval.guard.ts`                                                   | `SELLER_PARAMS = ['sellerId']`                            |
| `apps/api/apps/api-gateway/src/services/seller-request.ts` (new)                                                  | `sellerMarket(req)`, `sellerOf(req)`                      |
| `apps/api/apps/api-gateway/src/controllers/seller.controller.ts`                                                  | `/seller/*` token-derived surface                         |
| `apps/api/apps/api-gateway/src/controllers/seller-marketplace.controller.ts`                                      | `/sellers/:sellerId/*`                                    |
| `apps/api/apps/api-gateway/src/controllers/public-sellers.controller.ts`                                          | register (+ promotion), application status, kyc-documents |
| `apps/api/apps/api-gateway/src/controllers/seller-identity.regression.spec.ts` (new)                              | body-spread + param census                                |
| `apps/api/apps/api-gateway/src/gateways/seller.gateway.ts`                                                        | rooms                                                     |
| `apps/api/libs/region/src/region.config.ts`                                                                       | `platformFeeTax`, `payout.minimum` per market             |
| `apps/api/apps/commission-service/src/commission.service.ts`                                                      | market tax                                                |
| `apps/api/apps/payout-service/src/payout.service.ts`                                                              | transactional payout                                      |
| `modules/marketplace/backend/src/entities/{order-event,listing-stock-movement,seller-settlement}.entity.ts` (new) | ledgers                                                   |
| `modules/marketplace/backend/src/seller/order-state.ts` (new)                                                     | transition table                                          |
| `modules/marketplace/backend/src/seller/seller-notify.service.ts` (new)                                           | notification rows                                         |
| `modules/marketplace/backend/src/seller/seller.service.ts`                                                        | owner/members, orders, stock, product fields              |
| `modules/marketplace/backend/migrations/17865035x0000-*.ts` (new ×4)                                              | schema                                                    |
| `apps/web/src/components/seller/marketplace/{data-table,confirm-dialog,money}.tsx` (new)                          | UI primitives                                             |
| `apps/web/src/app/seller/marketplace/**`                                                                          | pages                                                     |
| `packages/shared-core/src/modules/seller-api.ts`                                                                  | client                                                    |
| `apps/api/scripts/verification/seller-portal-authz.mjs` (new)                                                     | live authz proof                                          |
| `apps/web/e2e/seller-portal.spec.ts` (new)                                                                        | two-market E2E                                            |

Execution: T1, T3, T5 inline by the session (hot files); T2, T4, T6, T7 dispatched as subagents on disjoint paths once T1 lands. Ledger: `.superpowers/sdd/2026-09-13-seller-portal-plan/progress.md`.

---

### Task 1: Gateway identity, DTOs, honest errors, WS rooms (SP-001/002/003/004/005/012/014/015/016)

**Files:**

- Create: `apps/api/apps/api-gateway/src/dto/seller-portal.dto.ts`
- Create: `apps/api/apps/api-gateway/src/services/seller-request.ts`
- Create: `apps/api/apps/api-gateway/src/controllers/seller-identity.regression.spec.ts`
- Modify: `apps/api/apps/api-gateway/src/guards/seller-ownership.guard.ts` (SELLER_PARAMS, stamp `req.seller`)
- Modify: `apps/api/apps/api-gateway/src/guards/seller-approval.guard.ts:18`
- Modify: `apps/api/apps/api-gateway/src/controllers/seller.controller.ts` (remove `:id/wallet` 450, `orders/:id/status` 202; rename `listings/:id` → `:listingId`; identity-last spreads; DTOs; no admin-dashboard fallback; 503s)
- Modify: `apps/api/apps/api-gateway/src/controllers/seller-marketplace.controller.ts` (identity-last spreads ×24; DTOs; `sellerMarket(req)` at 210/234/246/324/1622/1666/2028; flash-deal/sponsored `catch → success` → 503)
- Modify: `apps/api/apps/api-gateway/src/gateways/seller.gateway.ts:164-173` (join_room), `:122-126` (admin market rooms), `notifyNewOrder` and the four other emitters (fan out to `admin:sellers:<market>`)
- Modify: `modules/marketplace/backend/src/seller/seller.service.ts:329` `getSellerOwner` returns `regionCode` (already) — unchanged in T1; `addProductImage` URL validation at `:1634`
- Test: `apps/api/apps/api-gateway/src/guards/seller-ownership.guard.spec.ts`, `apps/api/apps/api-gateway/src/gateways/seller.gateway.spec.ts` (new)

**Interfaces:**

- Produces: `req.seller = { id: string; regionCode: string | null; role: 'owner' | 'admin' | 'manager' | 'catalog' | 'finance' | 'support' }` on every `/sellers/:sellerId/*` request after the guard; `sellerMarket(req): SupportedCountryCode` (throws 409 `SELLER_MARKET_UNSET` when null); `SellerProductCreateDto`, `SellerProductUpdateDto`, `SellerStockDto`, `SellerListingCreateDto`, `SellerListingUpdateDto`, `SellerOrderRejectDto`, `SellerOrderShipDto`, `SellerReturnRejectDto`, `SellerReviewReplyDto`, `SellerPromotionDto`, `SellerStaffDto`, `SellerSettingsDto`, `SellerProfileDto`, `SellerStorefrontDto`, `SellerBrandDto`, `SellerBankAccountDto`, `SellerPayoutRequestDto { amount: number; bankAccountId: string }`, `SellerSupportTicketDto`, `SellerSupportReplyDto`, `SellerShippingDto`, `SellerProductImageDto { url; altText?; isPrimary? }`, `SellerVariantDto`, `SellerQuestionAnswerDto`, `SellerBulkProductsDto`, `SellerBulkEditDto`.

- [ ] **Step 1: Write the identity regression spec (fails today)**

```ts
// apps/api/apps/api-gateway/src/controllers/seller-identity.regression.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FILES = [
  'seller.controller.ts',
  'seller-marketplace.controller.ts',
  'public-sellers.controller.ts',
];
const src = (f: string) => readFileSync(join(__dirname, f), 'utf8');

describe('seller identity cannot come from the body', () => {
  for (const f of FILES) {
    it(`${f}: no "{ sellerId, ...body }" spread (identity must be last)`, () => {
      const bad = [...src(f).matchAll(/\{\s*sellerId\b[^}]*\.\.\.(body|dto|payload)\b/g)].map(
        (m) => m[0],
      );
      expect(bad, `identity-first spreads in ${f}:\n${bad.join('\n')}`).toEqual([]);
    });
    it(`${f}: every mutating route takes a typed DTO`, () => {
      const untyped = [...src(f).matchAll(/@Body\(\)\s+\w+:\s*(any|\{[^}]*\})/g)].map((m) => m[0]);
      expect(untyped, `untyped bodies in ${f}:\n${untyped.join('\n')}`).toEqual([]);
    });
  }
  it('no seller route names a non-seller resource ":id"', () => {
    for (const f of FILES) {
      const ids = [...src(f).matchAll(/@(Get|Post|Put|Patch|Delete)\('([^']*)'\)/g)]
        .map((m) => m[2])
        .filter((p) => /(^|\/):id(\/|$)/.test(p));
      expect(ids, `${f} uses :id — use :sellerId or a named resource param`).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Run it** — `cd apps/api && npx vitest run apps/api-gateway/src/controllers/seller-identity.regression.spec.ts` → FAIL (29 spreads, 32 untyped bodies, 3 `:id` routes).

- [ ] **Step 3: Create the DTO module** (`dto/seller-portal.dto.ts`). Every class is `whitelist`-safe; numbers use `@Type(() => Number)`; booleans use the `BooleanParam()` pattern from `admin-pharmacy.dto.ts`. Core shapes:

```ts
export class SellerProductCreateDto {
  @IsString() @Length(3, 200) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(20000) longDescription?: string;
  @IsUUID() categoryId!: string;
  @IsOptional() @IsUUID() subcategoryId?: string;
  @IsOptional() @IsUUID() brandId?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) sellingPrice!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) mrp?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9._-]{1,64}$/) sku?: string;
  @IsOptional() @IsString() @Matches(/^\d{8,14}$/) gtin?: string;
  @IsOptional() @IsIn(['NEW', 'REFURBISHED', 'USED']) condition?: string;
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE']) status?: string;
  @IsOptional() @IsObject() attributes?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(20) hsnCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() gstBracket?: number;
  // T2 adds: weightGrams, dimensionsCm, minOrderQty, maxOrderQty, videoUrl, taxCategory, seo
}
export class SellerStockDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) stock!: number;
}
export class SellerOrderRejectDto {
  @IsString() @Length(3, 500) reason!: string;
}
export class SellerOrderShipDto {
  @IsString() @Length(2, 80) courier!: string;
  @IsString() @Length(3, 80) trackingId!: string;
  @IsOptional() @IsUrl({ require_protocol: true }) trackingUrl?: string;
}
export class SellerPayoutRequestDto {
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsUUID() bankAccountId!: string;
}
export class SellerProductImageDto {
  @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2048) url!: string;
  @IsOptional() @IsString() @MaxLength(200) altText?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}
```

- [ ] **Step 4: `seller-request.ts`**

```ts
import { ConflictException } from '@nestjs/common';
import { isActiveRegion, type SupportedCountryCode } from '@app/region';
export interface SellerRequest {
  seller?: { id: string; regionCode: string | null; role: string };
}
export function sellerOf(req: SellerRequest) {
  if (!req.seller?.id) throw new ConflictException('This route needs a seller context.');
  return req.seller;
}
/** The seller's registered market — never the X-Region-Code header. */
export function sellerMarket(req: SellerRequest): SupportedCountryCode {
  const code = sellerOf(req).regionCode;
  if (!isActiveRegion(code)) {
    throw new ConflictException({
      message: 'This seller has no active market on record. Contact seller support.',
      errorCode: 'SELLER_MARKET_UNSET',
    });
  }
  return code!.toUpperCase() as SupportedCountryCode;
}
```

- [ ] **Step 5: Guard changes.** In `seller-ownership.guard.ts`: `SELLER_PARAMS = ['sellerId'] as const`; after a successful owner/admin check set `request.seller = { id: sellerId, regionCode, role: ownerId === userId ? 'owner' : 'admin' }` (T5 extends with members). Same constant in `seller-approval.guard.ts`. For `/seller/*` routes with no param, the controller's `resolveSellerId(req)` stamps `req.seller` from `get_seller_by_owner` (`{ id, regionCode }`).

- [ ] **Step 6: Controllers.** In every handler replace `{ sellerId, ...body }` with `{ ...body, sellerId }` (and `{ ...body, sellerId, productId }` etc.); replace `@Body() body: any` with the DTO; replace `requestRegion(req)` on seller routes with `sellerMarket(req)`; delete `PUT /seller/orders/:id/status` and `GET /seller/:id/wallet`; rename `PATCH listings/:id` → `listings/:listingId`; in `/seller/dashboard` remove the `get_admin_dashboard` fallback (throw 503); in `/seller/orders` remove the empty-list catch (503); in flash-deal/sponsored handlers replace `catch { return { success: true … } }` with `throw new ServiceUnavailableException(...)`; `sendTo(..., fallback)` calls whose fallback is `{ data: [] }` become `forwardOrThrow` unless the backend explicitly answers `dataAvailable: false`.

- [ ] **Step 7: WS rooms** (`seller.gateway.ts`):

```ts
@SubscribeMessage('join_room')
async handleJoinGenericRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
  const user = (client as any).user; const room = String(data?.room ?? '');
  const m = /^(seller|pharmacy|grocery|restaurant):([0-9a-f-]{36})$/.exec(room);
  const isAdmin = ADMIN_ROLES.has(String(user?.role ?? '').toUpperCase());
  if (!user) return client.emit('error', { message: 'Not authenticated' });
  if (room.startsWith('admin:')) {
    if (!isAdmin) return client.emit('error', { code: 'FORBIDDEN', message: 'Admin rooms are not available to sellers.' });
    const scope = marketScopeOfUser(user); // locked → own market only
    if (scope.locked && room !== `admin:sellers:${scope.market}`) return client.emit('error', { code: 'FORBIDDEN', message: 'Outside your market.' });
    await client.join(room); return client.emit('room_joined', { room });
  }
  if (!m) return client.emit('error', { code: 'BAD_ROOM', message: 'Unknown room.' });
  const ownerOk = isAdmin
    ? await this.sellerOwnership.inMarket(m[2], marketScopeOfUser(user))
    : await this.sellerOwnership.owns(user.id, m[2]);
  if (!ownerOk) return client.emit('error', { code: 'FORBIDDEN', message: 'You do not have access to this room.' });
  await client.join(room); client.emit('room_joined', { room });
}
```

`handleConnection`: a locked admin naming `userId` is refused unless the seller's market matches; admins join `admin:sellers` only when global, else `admin:sellers:<market>`. Every `this.server.to('admin:sellers').emit(...)` also emits to `admin:sellers:${regionCode}` (resolve the seller's market through `SellerOwnershipService.marketOf(sellerId)`, cached 60 s).

- [ ] **Step 8: Tests.** Guard spec: stamps `req.seller`; `:id` param ignored. Gateway spec (new): `join_room` refuses `seller:<other>`, accepts own, refuses `admin:*` for sellers, market-locks admins. Run `npx vitest run apps/api-gateway` → green; `nest build api-gateway` exits 0.

- [ ] **Step 9: Live proof** on `:3097` with two sellers (6b's fixture `pdp-seller2-1789316799@kartseek.test` and one new): `POST /seller/products` with `sellerId: <B>` in the body → product lands on A; `PUT /sellers/A/orders/x/ship` with `{ courier, trackingId, sellerId: B }` → 400 (non-whitelisted); WS `join_room seller:<B>` → FORBIDDEN.

- [ ] **Step 10: Commit** (apps/api only): `fix(gateway): seller identity is never read from the body, rooms are owned, bodies validated`. Send a8 the census entries for the removed/renamed routes.

---

### Task 2: Product model columns, seller form, PDP (SP-019)

**Files:**

- Create: `modules/marketplace/backend/migrations/1786503500000-SellerProductLogistics.ts`
- Modify: `modules/marketplace/backend/src/entities/product.entity.ts`, `data-source.ts`
- Modify: `modules/marketplace/backend/src/seller/seller.service.ts:718` (addProduct), `:2122` (`SELLER_EDITABLE_PRODUCT_FIELDS`), `:2184` (updateProduct)
- Modify: `apps/api/apps/api-gateway/src/dto/seller-portal.dto.ts` (fields)
- Modify: `apps/web/src/app/seller/marketplace/products/product-form.tsx`, `packages/shared-core/src/marketplace/product-detail.ts`, `modules/marketplace/frontend/src/app/product/[id]/page.tsx` (`generateMetadata`), cart quantity stepper (`packages/shared-ui` or zone component that renders quantity)
- Test: `modules/marketplace/frontend/src/__tests__/product-detail.spec.ts`, `modules/marketplace/backend/src/seller/seller.service.spec.ts`

**Interfaces:**

- Produces on `Product`: `weightGrams: number | null`, `dimensionsCm: { l: number; w: number; h: number } | null`, `minOrderQty: number` (default 1), `maxOrderQty: number | null`, `videoUrl: string | null`, `taxCategory: string | null`, `seo: { metaTitle?: string; metaDescription?: string; keywords?: string[] } | null`. `ProductDetail` gains the same names.

- [ ] **Step 1: Migration**

```ts
export class SellerProductLogistics1786503500000 implements MigrationInterface {
  name = 'SellerProductLogistics1786503500000';
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE marketplace.products
      ADD COLUMN IF NOT EXISTS weight_grams integer NULL,
      ADD COLUMN IF NOT EXISTS dimensions_cm jsonb NULL,
      ADD COLUMN IF NOT EXISTS min_order_qty integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS max_order_qty integer NULL,
      ADD COLUMN IF NOT EXISTS video_url varchar NULL,
      ADD COLUMN IF NOT EXISTS tax_category varchar NULL,
      ADD COLUMN IF NOT EXISTS seo jsonb NULL`);
    await q.query(
      `ALTER TABLE marketplace.products ADD CONSTRAINT IF NOT EXISTS products_order_qty_chk CHECK (min_order_qty >= 1 AND (max_order_qty IS NULL OR max_order_qty >= min_order_qty))`,
    );
  }
  async down(q: QueryRunner) {
    /* DROP the seven columns + constraint */
  }
}
```

(Postgres has no `ADD CONSTRAINT IF NOT EXISTS`; guard with a `DO $$ … IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = …)` block.)

- [ ] **Step 2: Entity + service.** Columns with explicit `type:` (nullable reflection rule). `addProduct` reads `dto.weightGrams` etc.; `updateProduct` adds them to `SELLER_EDITABLE_PRODUCT_FIELDS` — only `name/short_description/long_description/mrp` and category/brand/attributes trigger re-review; logistics/SEO edits do NOT reset approval (document the rule in the method comment).

- [ ] **Step 3: DTO fields** (`seller-portal.dto.ts`): `weightGrams` int 1–200000, `dimensionsCm` nested `{ l, w, h }` each 0.1–500, `minOrderQty` int ≥ 1, `maxOrderQty` int ≥ minOrderQty (custom validator), `videoUrl` https URL, `taxCategory` string ≤ 40, `seo` nested (`metaTitle` ≤ 70, `metaDescription` ≤ 160, `keywords` ≤ 10 × 40 chars).

- [ ] **Step 4: Form + PDP.** Two new sections in `product-form.tsx` ("Shipping & tax", "Search listing"); `normaliseProductDetail` maps the fields; `generateMetadata` prefers `seo.metaTitle`/`metaDescription`; the quantity stepper clamps to `[minOrderQty, min(maxOrderQty ?? ∞, stock)]`; cart pricing at the gateway refuses `quantity` outside the range (`PRICE_ORDER_ITEMS` path, 400).

- [ ] **Step 5: Tests + migration run** on both DBs; `verify:schema-drift` 0; unit specs green; `nest build`; web `type-check`.

- [ ] **Step 6: Commits** (one per workspace): `feat(marketplace): weight, dimensions, order quantity bounds, video and seo on products`; `feat(web): seller form and pdp carry logistics, quantity bounds and seo`.

---

### Task 3: Order state machine, stock ledger, cancel projection, notifications (SP-006/007/011/020)

**Files:**

- Create: `modules/marketplace/backend/src/seller/order-state.ts`, `src/seller/seller-notify.service.ts`, `src/entities/order-event.entity.ts`, `src/entities/listing-stock-movement.entity.ts`
- Create: `modules/marketplace/backend/migrations/1786503510000-OrderEventsStockMovements.ts`
- Modify: `seller.service.ts` (`acceptOrder`…`markDelivered` 2393-2531, `updateInventory` 1088, `createSellerOrders` 122, `setLowStockThreshold` 2372, `getLowStock` 2359), `seller.messages.controller.ts` (`cancel_seller_orders`, `bulk_update_inventory`, `get_stock_movements`, `notify_seller`, `get_order_events`), `catalog.service.ts:1140` (`releaseListingStock` writes movements), `marketplace.service.ts` (`approveProduct`/`rejectProduct` call `notify.productDecision`), `product-listing.entity.ts` (`lowStockThreshold`)
- Modify: `apps/api/apps/api-gateway/src/services/marketplace-order.service.ts:487` (cancel → `cancel_seller_orders`), `seller-marketplace.controller.ts` (`PATCH :sellerId/inventory/bulk`, `GET :sellerId/inventory/:productId/movements`, `GET :sellerId/orders/:orderId/events`)
- Test: `src/seller/order-state.spec.ts`, `seller.service.spec.ts` (release on reject, movements), `apps/api/.../marketplace-order.service.spec.ts`

**Interfaces:**

- `ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]>`; `assertTransition(from, to): void` throws `ConflictException('An order cannot go from X to Y.')`.
- `SellerNotifyService.push(sellerId, { type: 'ORDER'|'INVENTORY'|'CATALOG'|'PAYOUT'|'RETURN', title, message, actionUrl? })`.
- TCP: `cancel_seller_orders { orderId, reason, actorId }` → `{ cancelled: string[] , released: number }`; `bulk_update_inventory { sellerId, countryCode, rows: [{ productId, stock }] }` → `{ results: [{ productId, ok, stock?, error? }] }`; `get_stock_movements { sellerId, productId, page, limit }`; `get_order_events { sellerId, orderId }`; `notify_seller { sellerId, type, title, message, actionUrl }`.

- [ ] **Step 1: Transition table + spec**

```ts
export const ORDER_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'READY', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
} as const;
```

Spec: every illegal pair in the audit (DELIVERED→CANCELLED, CANCELLED→SHIPPED, PENDING→SHIPPED) throws; each legal pair passes; the table is total over the entity enum.

- [ ] **Step 2: Migration** — `marketplace.order_events (id uuid pk default gen_random_uuid(), order_id uuid not null references marketplace.marketplace_orders(id) on delete cascade, from_status varchar null, to_status varchar not null, actor_type varchar not null, actor_id varchar null, reason text null, created_at timestamptz default now())` + index `(order_id, created_at)`; `marketplace.listing_stock_movements (id, listing_id uuid references product_listings(id) on delete cascade, delta int not null, resulting_qty int not null, reason varchar not null, reference varchar null, actor_type varchar not null, actor_id varchar null, created_at)` + index `(listing_id, created_at desc)`; `ALTER TABLE product_listings ADD COLUMN IF NOT EXISTS low_stock_threshold int NOT NULL DEFAULT 5`.

- [ ] **Step 3: Service.** `transition(order, to, actor, reason?)` = assert + save + event row + `invalidateDashboard` + Kafka (existing topics) + notification. `rejectOrder` and `cancelSellerOrders` call `catalog.releaseListingStock(lines)` and write `release` movements; `acceptSellerReturn` restocks. `updateInventory` becomes `UPDATE … SET "stockQuantity" = :q, ... WHERE id = :id AND seller_id = :seller RETURNING`, movement `seller_set`, low-stock notification when crossing the threshold. Threshold read/write moves to the column; delete the Redis key writes.

- [ ] **Step 4: Gateway.** `cancel()` chains `cancel_seller_orders` after order-service succeeds (errors logged at ERROR with orderId; the customer's cancel still succeeds — the projection is retried by the admin's "resync" later; recorded). New routes with DTOs `SellerBulkStockDto { rows: [{ productId: uuid, stock: int }] (≤500) }`.

- [ ] **Step 5: Declare topics** `marketplace.order.cancelled`, `inventory.released`, `seller.notification.created`; `npm run kafka:topics`.

- [ ] **Step 6: Tests + live proof** (reject releases stock: listing qty before/after; DELIVERED→CANCELLED = 409; notification row appears after a COD order).

- [ ] **Step 7: Commits**: `feat(marketplace): seller order transitions are validated and every move is journalled`; `feat(marketplace): stock movements ledger, atomic stock writes, release on reject and cancel`; `feat(gateway): customer cancel reaches the seller projection; bulk stock and movement routes`.

---

### Task 4: Settlement table, market tax, payout hardening (SP-008/009/010)

**Files:**

- Modify: `apps/api/libs/region/src/region.types.ts`, `region.config.ts` (add `platformFeeTax`, `payout`), `region.config.spec.ts`
- Modify: `apps/api/apps/commission-service/src/commission.service.ts:170-172,195-260`, `commission.controller.ts` (payload gains `regionCode`)
- Modify: `apps/api/apps/payout-service/src/payout.service.ts:131` (transaction + lock + bank account + market minimum + RpcException), `payout.controller.ts`
- Create: `modules/marketplace/backend/src/entities/seller-settlement.entity.ts`, `migrations/1786503520000-SellerSettlements.ts`; `seller.service.ts` `recordSettlement`, `getSettlements`; `seller.messages.controller.ts` `record_order_settlement`, `get_seller_settlements`, `get_seller_bank_account`
- Modify: `seller-marketplace.controller.ts` deliver (429-500: pass `regionCode`, `currency`; call `record_order_settlement`), payouts POST (996: DTO, bankAccountId), commissions GET (1033: read settlements)
- Test: `region.config.spec.ts` (every market has both blocks), `commission.service.spec.ts` (IN vs QA vs AE), `payout.service.spec.ts` (double request → second refused; minimum per market; foreign bank account refused), `seller.service.spec.ts` (settlement idempotent on order_id)

**Interfaces:**

- `RegionConfig.platformFeeTax: { name: string; rate: number; withholding?: { name: string; rate: number } }`, `RegionConfig.payout: { minimum: number }`, `PLATFORM_FEE_TAX_VERSION = '2026-09'`.
- `calculate_commission` payload adds `regionCode: string`; record adds `currency`, `feeTax`, `withholding`, `taxVersion` (keeps `gstOnCommission`, `tdsAmount` as aliases).
- `record_order_settlement { orderId, sellerId, regionCode, currency, orderTotal, breakdown }` → `{ id }` (idempotent on `orderId`); `get_seller_settlements { sellerId, page, limit }` → `{ data, total, page, limit, totals: { commission, feeTax, withholding, earning } }`.
- `request_payout { sellerId, amount, bankAccountId, regionCode }` → `{ payout }` or `RpcException({ statusCode: 400|409, message })`.

- [ ] **Step 1: Registry + spec.** Values from the design §2.4; spec asserts every `SUPPORTED_COUNTRY_CODES` entry has `platformFeeTax.rate ∈ [0,100]` and `payout.minimum > 0`.
- [ ] **Step 2: Commission.** `const tax = getRegionConfig(regionCode)?.platformFeeTax ?? { name: 'none', rate: 0 }`; `feeTax = round(commission * tax.rate/100)`; `withholding = round(orderTotal * (tax.withholding?.rate ?? 0)/100)`; spec: QA order of 1000 → feeTax 0, withholding 0; IN → 18%/1%; AE → 5%/0.
- [ ] **Step 3: Settlement entity + migration** (columns in the design); `recordSettlement` upserts by `order_id` (`INSERT … ON CONFLICT (order_id) DO NOTHING RETURNING`) — a second delivery attempt never double-records.
- [ ] **Step 4: Payout.** `dataSource.transaction(async m => { const w = await m.findOne(SellerWallet, { where: { sellerId }, lock: { mode: 'pessimistic_write' } }); … })`; `bankAccountId` → `get_seller_bank_account { sellerId, accountId }` over TCP (marketplace) → must exist and belong; store `bankAccountId` + masked `last4` on the payout row (new nullable columns via payout-service migration — payout schema is in `kartseek_db`, main runner `data-source.main.ts`); minimum from the registry in the seller's market; refusals `throw new RpcException({ statusCode: 400, message })` and the gateway maps them (`rpcHttpError`).
- [ ] **Step 5: Gateway routes** (deliver/payout/commissions) as listed; `HOME_CURRENCY` uses are replaced by the seller's market currency (`getRegionConfig(sellerMarket(req)).currencyCode`).
- [ ] **Step 6: Tests + live proof** (deliver a QA order → settlement row with QAR, feeTax 0; IN → INR, 18/1; two concurrent payout requests for the full balance → exactly one succeeds).
- [ ] **Step 7: Commits**: `feat(region): platform-fee tax and payout minimum per market`; `fix(commission): fees taxed by the seller's market, not india`; `fix(payout): one transactional debit, saved bank accounts only, market minimum`; `feat(marketplace): durable seller settlements written at delivery`; `feat(gateway): delivery records the settlement; payouts and commissions read real rows`.

---

### Task 5: Registration completeness, role promotion, staff RBAC (SP-013/017/018)

**Files:**

- Create: `modules/marketplace/backend/migrations/1786503530000-SellerStaffMembership.ts` (`seller_staff.user_id uuid null unique(seller_id,user_id)`, `permissions text[] not null default '{}'`, `invited_at`, `accepted_at`; `seller_kyc.registration_numbers jsonb null`, `seller_kyc.vat_number varchar null`)
- Create: `apps/api/apps/api-gateway/src/guards/seller-access.decorator.ts` (`SELLER_PERMISSIONS` table from the design, `@SellerAccess(...perms)`, `permissionsForRole(role)`)
- Modify: `seller-ownership.guard.ts` (members + permission check), `seller.controller.ts` (`resolveSellerId` via `get_seller_by_member`), `seller-marketplace.controller.ts` (`@SellerAccess` on finance/bank/staff/settings routes; `PUT :sellerId/kyc-documents`), `public-sellers.controller.ts:84` (promotion + fresh tokens; needs `AuthTokenService` — extract `issueTokens` from `gateway.controller.ts` into `services/auth-tokens.service.ts` shared by both), `gateway.controller.ts:554` (`@Throttle({ default: { limit: 10, ttl: 60000 } })`, `country: requestRegion(req)`)
- Modify: `seller.service.ts` (`getSellerOwner` returns `members`; `getSellerByMember`; `addStaff` links/creates the user through user-service `create_staff_user` — or the gateway creates it; `updateKycDocuments`; `registerSeller` persists registration numbers), `seller.messages.controller.ts`
- Modify: `apps/web/src/app/seller/register/page.tsx` (upload documents after registration, attach keys, store new tokens), `apps/web/src/app/seller/approval-status/page.tsx` (documents + KYC state), `packages/shared-core/src/modules/seller-api.ts` (`uploadKycDocument`, `attachKycDocuments`)
- Test: guard spec (member roles, permission refusals, owner passes all), `public-sellers.controller.spec.ts` (customer promoted, seller unchanged, second registration 409), `seller.service.spec.ts` (staff invite links existing user, creates new), e2e in T7

**Interfaces:**

- `get_seller_owner` → `{ sellerId, ownerId, regionCode, members: Record<string, 'admin'|'manager'|'catalog'|'finance'|'support'> }` (cache key `seller-scope:v3:<id>`, purged by `applySellerDecision`, `add/update/remove_seller_staff`).
- `get_seller_by_member { userId }` → the seller the user owns, else the seller they are an active member of, else null.
- `POST /sellers/register` → `201 { seller, accessToken?, refreshToken?, promoted: boolean }`.
- `PUT /sellers/:sellerId/kyc-documents` body `SellerKycDocumentsDto { documents: [{ type: string ≤40, key: string ≤200, fileName ≤200, mimeType ≤80 }] }` (≤ 12) — keys must start with `kyc/` and belong to the caller (the upload route names the owner in the key: `kyc/<userId>/…`).

- [ ] **Step 1–2:** migration + entity fields; run on both DBs; drift 0.
- [ ] **Step 3:** `SELLER_PERMISSIONS` + decorator + guard: owner → all; admin role → all but `finance.payout finance.bank staff.manage`; per-route `@SellerAccess`. Routes: payouts POST + bank-accounts _ → `finance.payout`/`finance.bank`; wallet/transactions/commissions GET → `finance.read`; staff _ → `staff.manage`; settings PUT → `settings.write`; products/inventory writes → `catalog.write`/`inventory.write`; orders actions → `orders.write`; returns → `returns.write`; reviews reply/questions answer → `reviews.write`; support → `support.write`; reads default to any member.
- [ ] **Step 4:** promotion in `/sellers/register`; throttle + country on `/auth/seller/register`; registration numbers persisted; kyc-documents route; wizard uploads; application status lists documents.
- [ ] **Step 5:** tests + live proof (customer → register → token carries SELLER; staff `catalog` GET wallet → 403 `finance.read`; owner OK).
- [ ] **Step 6:** commits per workspace: `feat(gateway): seller staff roles and permissions are enforced at the guard`; `fix(gateway): registering a seller promotes the customer and returns matching tokens`; `feat(marketplace): staff membership, registration numbers and kyc documents on the seller record`; `feat(web): the seller wizard uploads kyc documents and keeps the promoted session`.

---

### Task 6: Portal UI — sidebar, DataTable, orders, inventory, tax, settings, SEO, images, responsive (SP-021/012/027)

**Files:**

- Create: `apps/web/src/components/seller/marketplace/data-table.tsx`, `confirm-dialog.tsx`, `money.tsx`, `page-header.tsx`, `status-badge.tsx`
- Modify: `apps/web/src/app/seller/marketplace/layout.tsx` (nav registry: backed pages + "Coming soon" group), `orders/page.tsx`, `orders/[id]/page.tsx`, `inventory/page.tsx`, `low-stock/page.tsx`, `gst/page.tsx` (→ market tax page; `DEMO_GST` deleted), `settings/page.tsx`, `settings/notifications/page.tsx`, `settings/security/page.tsx`, `returns/policy/page.tsx`, `products/[id]/seo/page.tsx`, `products/[id]/images/page.tsx` (file upload via `POST /upload/product-image`), `commissions/page.tsx`, `payouts/page.tsx` (bank account picker), `staff/page.tsx` (roles), `transactions/page.tsx`
- Modify: `packages/shared-core/src/modules/seller-api.ts` (new calls: `getOrderEvents`, `bulkUpdateStock`, `getStockMovements`, `getSettlements`, `uploadProductImage`, `updateReturnPolicy`, `getMyStaffRole`), `packages/shared-core/src/api/api-error.ts` if `ApiError` lacks `errors[]`
- Test: `apps/web/src/__tests__/seller-data-table.spec.tsx`, `seller-nav.spec.ts` (every nav href has a page and is not a stub), Playwright responsive shots in T7

**Interfaces:**

- `<SellerDataTable columns rows total page limit onPage onSort sortKey sortDir loading error empty bulk?>` — card rows below `md`, sticky header, `aria-sort`, keyboard row focus; `<ConfirmDialog title body confirmLabel destructive onConfirm>`; `<Money amount currency />` via shared-core `formatMoney(market)`; `<StatusBadge status kind="order"|"product"|"payout">`.

- [ ] **Step 1:** nav registry: each item `{ label, href, icon, backed: true }`; stubs move to `{ title: 'Coming soon', collapsed: true }`; spec walks `NAV_GROUPS` and asserts every `backed` href resolves to a page whose file does not import `SellerUnavailable`.
- [ ] **Step 2:** primitives with unit tests (table renders cards at 375, table at 1024; sort emits; empty/error/loading states).
- [ ] **Step 3:** orders list on the table (server pagination, status filter via query, search), confirm dialogs for reject/cancel, toasts on failure (revert optimistic state), detail page with timeline (`GET :sellerId/orders/:orderId/events`), masked customer phone/email, invoice link.
- [ ] **Step 4:** inventory: inline stock edit (PUT inventory/:productId), threshold edit, bulk CSV/paste update (PATCH inventory/bulk), movements drawer.
- [ ] **Step 5:** tax page per market: `getRegionConfig`-equivalent from shared-core localization (`getTaxScheme(market)`), identifier on file (masked, from `/gst`), settlement tax lines (`getSettlements`), no filing calendar; India shows GSTIN/HSN wording, Gulf shows VAT/TRN wording via the registry.
- [ ] **Step 6:** settings pages: notifications prefs (PUT settings `{ notifications }`), security (change password through `/auth/change-password` — verify the route exists; else `POST /sellers/:id/settings/change-password` is added in T5 — 2FA toggle removed with a note), returns policy (PUT settings `{ returnPolicy: { windowDays, restockingFeePct, conditions } }` — column added in T3's migration as `seller_settings.return_policy jsonb`), product SEO page on T2's fields, images page with drag-drop upload.
- [ ] **Step 7:** responsive pass at 375/768/1024/1280/1536 on every marketplace seller page; no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`), nav usable at 375.
- [ ] **Step 8:** commits: `feat(web): one seller data table, confirm dialogs and money formatting`; `feat(web): seller orders, inventory and finance pages read real rows with honest states`; `feat(web): the seller sidebar lists only built features; tax, settings, seo and image upload pages`.

---

### Task 7: Tests, verification script, E2E, infra proofs (SP-022/025/026)

**Files:**

- Create: `apps/api/scripts/verification/seller-portal-authz.mjs` (+ `package.json` script `verify:seller-portal`)
- Create: `apps/web/e2e/seller-portal.spec.ts`
- Modify: `apps/api/scripts/verification/regional-integrity.mjs` (seller rows: IN seller vs QA seller ids, locked admin vs foreign seller)
- Test: everything above; `npm run smoke` unaffected

- [ ] **Step 1:** `seller-portal-authz.mjs`: boots against `GATEWAY_URL` (default `http://127.0.0.1:3097`); creates two sellers (IN, QA) through `/auth/seller/register` + `/sellers/register` + admin approve (super admin MFA via `devCode`); checks (each restores state): A reads B's orders/wallet/products/staff → 403; body `sellerId: B` on product create → product owned by A; `:id` probes → 404/403 never 200; locked IN admin on QA seller → 403; staff `catalog` on wallet → 403; DELIVERED→CANCELLED → 409; reject releases stock; QA settlement carries QAR and 0 tax; two concurrent payouts → one success; WS `join_room seller:B` → FORBIDDEN, `admin:sellers` as seller → FORBIDDEN. Prints `passed/failed/skipped`, exit 1 on failure.
- [ ] **Step 2:** Playwright `seller-portal.spec.ts`: design §3 in IN and QA, paced with `gateway-budget.ts` (`pace(COST.api)` per call, `open()` per navigation), consent dismissed, `readyToSubmit()` from `auth-registration.spec.ts` reused; viewport shots at 375 and 1280 for orders, inventory, products, wallet.
- [ ] **Step 3:** infra: `node scripts/registry/k8s.mjs` renders; `kubectl apply --dry-run=server` (if the cluster answers; else client dry-run and record); `npm run kafka:topics` shows the new topics; `verify:schema-drift` 0; unit suites: `apps/api`, `modules/marketplace/backend`, `apps/web`, `packages/shared-core` green; builds green.
- [ ] **Step 4:** commit: `test(seller): authz verification script and two-market portal e2e`.

---

### Task 8: Final report

- [ ] Write `docs/superpowers/plans/2026-09-13-seller-portal-completion-report.md` with sections A–I from the directive (Completed, Files, APIs verified with backend owners, DB tables/migrations/indexes, Security fixed, Regional isolation per layer, Infrastructure status per component, Testing results with counts, Remaining issues — genuine blockers only). Commit + push.

## Self-review

- Spec coverage: §2.1 → T1/T5; §2.2–2.3 → T3; §2.4 → T4; §2.5 → T2; §2.6 → T5; §2.7 → T1; §2.8 → T1/T6; §2.9 → T6; §3–5 → T7; non-goals → T6 sidebar.
- Type consistency: `req.seller.{id,regionCode,role}` (T1) is what T5's permission check and T4's `sellerMarket(req)` read; `record_order_settlement`/`get_seller_settlements` names match between T4's backend and gateway steps; `cancel_seller_orders` matches T3's backend and gateway; `SellerPayoutRequestDto { amount, bankAccountId }` is the shape T4's payout route and T6's payout page use.
- Deferred by design (reported, not hidden): seller email/phone verification (customer pipeline owner 1a), 2FA enforcement at seller login, warehouses/FBK/ads/A+/developer keys/translations/labels/manifests/pricing/insights pages.
