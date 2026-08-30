# KARTSEEK — Marketplace, Seller Portal & Super Admin Audit

**Date:** 2026-07-27
**Scope:** `marketplace-service` · gateway marketplace/seller/admin controllers ·
`apps/web/src/app/marketplace` (46 pages) · `app/seller/marketplace` (69) ·
`app/admin/marketplace` (105) — 220 pages / 235 files, plus 1,026 gateway routes.
**Method:** static analysis plus live probing of the running stack (web :3000,
gateway :3001, marketplace-service :3012/:4002/:5006, Postgres, Redis).

---

## Headline

The **module boundary is clean**. What is broken is everything in front of it.

**The entire Super Admin marketplace API (158 routes) and the entire Seller Portal
API (80 routes) return `403` to every caller, including a valid `SUPER_ADMIN`.**
A guard-ordering defect in the gateway makes ~538 role-gated routes platform-wide
unconditionally unreachable. Much of the UI does not notice, because large parts of
it are wired to hardcoded arrays or to a second, in-memory backend that lives inside
the Next.js app.

So: isolated, yes. Operational for end-users, no.

| Area | Status |
| --- | --- |
| Module isolation (marketplace-service) | ✅ clean |
| Frontend cross-module coupling | ✅ none |
| Nav → page integrity | ✅ 0 broken links |
| Storefront read path | ✅ working (10/10 endpoints 200) |
| **Role-gated API (admin + seller)** | ❌ **100% failing** |
| Object-level authorisation on seller routes | ❌ absent (masked by the above) |
| Admin UI ↔ real backend | ❌ 73/105 pages call no API |
| Pagination limits | ❌ uncapped |

---

## C1 — Every role-gated route returns 403 ⛔ CRITICAL

`apps/api-gateway/src/main.ts:129`

```ts
app.useGlobalGuards(new RolesGuard(reflector));
```

Global guards execute **before** controller-level guards. `JwtAuthGuard` is applied at
the controller level, so when the global `RolesGuard` runs, `request.user` has not been
populated yet. `libs/guards/src/roles.guard.ts:34`:

```ts
if (!user?.role) return false;   // → 403 Forbidden resource
```

Any route carrying `@Roles()` is therefore rejected before authentication has a chance
to run. Routes without `@Roles()` are unaffected — `RolesGuard` returns `true` when the
metadata is absent.

### Proven live

Same controller, same `JwtAuthGuard`, same `SUPER_ADMIN` token. The only difference is
the presence of `@Roles()`:

```
GET /api/v1/marketplace/coupons/abc/usage   → 403     (@Roles present)
GET /api/v1/marketplace/wishlist            → 200     (no @Roles)
GET /api/v1/marketplace/categories          → 200     (public)
```

And role is irrelevant — all four are rejected identically:

```
role=SELLER → 403   role=ADMIN → 403   role=SUPER_ADMIN → 403   role=CUSTOMER → 403
```

Authentication itself works: a malformed token returns `401`, a valid one reaches the
handler (`/marketplace/cart` → `503`, i.e. past auth, downstream service down).

### Blast radius — ~538 routes

| Controller | Routes behind `@Roles` |
| --- | ---: |
| `admin-marketplace.controller.ts` | **158** |
| `seller-marketplace.controller.ts` | **80** |
| `restaurant.controller.ts` | 61 |
| `taxi.controller.ts` | 30 |
| `admin-taxi.controller.ts` | 26 |
| `pharmacy.controller.ts` | 25 |
| `admin-pharmacy.controller.ts` | 19 |
| `marketplace.controller.ts` | 19 |
| `admin-grocery.controller.ts` | 18 |
| `admin-hotel.controller.ts` | 17 |
| others | ~85 |

This is not marketplace-specific — it disables the role-gated API of every vertical.

### Why nobody noticed

The gateway's admin and seller controllers wrap nearly every proxy call in a `catch`
that returns empty data (76 in `admin-marketplace`, 75 in `seller-marketplace`). A 403
therefore renders as an empty table, not an error. Combined with C4 below, the panels
look populated with plausible data while the API behind them is entirely unreachable.

---

## C2 — No object-level authorisation on seller routes ⛔ CRITICAL (latent)

`apps/api-gateway/src/controllers/seller-marketplace.controller.ts` — `@Controller('sellers')`,
**80 routes** shaped `/:sellerId/...`. Guarding is class-level only:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
```

That authenticates the caller and checks their *role*. Nothing checks that the caller
owns `:sellerId`. The handler forwards the path parameter straight through:

```ts
async getSellerOrders(@Param('sellerId') sellerId: string, …) {
  return await lastValueFrom(
    this.sellerClient.send({ cmd: 'get_seller_orders' }, { sellerId, … })
  );
}
```

The frontend supplies `sellerId` from client state (`lib/modules/seller-api.ts` —
`/sellers/${sellerId}/dashboard`, `/products`, `/orders`, …), so it is fully
attacker-controlled.

`SellerOwnershipGuard` in marketplace-service does not help here: it returns `true` for
RPC contexts by design, and its own docblock states *"the gateway is responsible for …
confirming that the JWT subject owns `sellerId` before it forwards."* **The gateway does
not do that.** I wrote that guard in a previous pass and documented the obligation
without verifying the gateway upheld it — it does not.

**Currently unexploitable only because C1 rejects every request first.** Fixing C1
without fixing C2 turns this into a live IDOR across 80 routes covering orders,
inventory, payouts, storefront and brand data.

---

## H1 — A second, in-memory backend inside the Next.js app 🔴 HIGH

`apps/web/src/lib/product-store.ts` (467 lines) keeps products in
`globalThis.__kartseek_products`, seeded with demo rows. It backs seven Next.js API
routes:

```
/api/marketplace/all-products      /api/marketplace/products
/api/marketplace/pending           /api/marketplace/products/[id]
/api/marketplace/seller-products   /api/marketplace/products/[id]/approve
/api/marketplace/action                                    …/[id]/reject
```

Consumed by `app/admin/marketplace/product-approvals`, `app/admin/marketplace/products`
and `app/marketplace` (storefront home).

Consequences:

- **Product approval/rejection does nothing to real data.** An admin approving a product
  mutates a process-local array; the actual `products` table is untouched.
- **No authentication.** These routes bypass the gateway, the JWT guard and every
  role check.
- **Does not survive a restart and is not shared between instances** — behaviour differs
  per Node process, so it cannot work behind more than one replica.
- `/api/marketplace/home` and `/api/marketplace/categories` return hardcoded constants.

---

## H2 — Most of the Super Admin panel is a static shell 🔴 HIGH

| Surface | Pages | Make **no** API call | Use demo/mock data |
| --- | ---: | ---: | ---: |
| `app/admin/marketplace` | 105 | **73** | 6 |
| `app/seller/marketplace` | 69 | 1 | **49** |
| `app/marketplace` | 46 | — | 22 |

Sampled admin pages render hardcoded arrays:

- `reports/revenue/page.tsx:29` — `const kpis = [ … ]`
- `commissions/tiers/page.tsx:16` — `const initialTiers: TierRate[] = [ … ]`
- `feature-flags/page.tsx:6` — `const flags = [ … ]`

The seller portal is better wired (68 of 69 files use `lib/modules/seller-api.ts`) but
49 pages still fall back to demo data — which is precisely what masks C1.

---

## H3 — Unbounded pagination 🔴 HIGH (DoS / performance)

13 gateway marketplace routes accept a `limit` query parameter. None cap it.

```
GET /api/v1/marketplace/products?limit=100000  →  200   (unauthenticated)
```

An anonymous caller can force a full-table scan and serialisation of the entire catalogue.
`searchMarketplace` is the sole exception (`Math.min(…, 100)`).

---

## M1 — Unhandled routes (verified 404 live) 🟠 MEDIUM

| Called by | Path | Reality |
| --- | --- | --- |
| `app/admin/marketplace/delivery-zones/page.tsx:35` **and the admin nav** (`layout.tsx:68`) | `GET /api/admin/marketplace/delivery-zones` | No such Next.js route — 404 |
| `app/marketplace/gift-cards/balance/page.tsx` | `GET /api/v1/marketplace/gift-cards/{code}/balance` | Gateway only has `POST gift-cards/balance` (code in body) — **verified 404** |

The delivery-zones one is reachable from the admin sidebar, so it is a user-visible
broken page, not just a dead call.

Otherwise the API contract is sound: of 413 distinct frontend API paths diffed against
1,026 gateway routes, only the gift-card path had no match.

---

## M2 — 53 of 184 static pages are unreachable 🟠 MEDIUM

Never linked from any file in `app/`, `components/`, `lib/` or `hooks/`:

- **Seller Portal — 15**: `bundles`, `coupons`, `fbk`, `labels`, `manifests`,
  `translations`, `insights/{buy-box,demographics,forecasting}`,
  `performance/{health,sla}`, `products/bulk-edit`,
  `products/bulk-upload/import-export`, `reviews/{manage,qa}`
- **Super Admin — 27**: `ab-tests`, `feature-flags`, `webhooks`, `search-config`,
  `recommendations`, `analytics/{behavior,gmv,traffic}`, `reports/*` (7 pages),
  `*/create` (6 pages), `commissions/{config,tiers}`, `compliance/tax`,
  `settings/global-config`, `shipping-rates/config`, `reviews/moderation`
- **Storefront — 11**: `checkout/success`, `checkout/failed`, `gift-cards/balance`,
  `buy-again`, `subscribe`, `exchange`, `notifications`, `returns/new`,
  `addresses/manage`, `brands/following`, `compare/detail`

`checkout/success` and `checkout/failed` are dead code specifically: the marketplace
checkout renders its success state inline (`app/marketplace/checkout/page.tsx:148`)
and never navigates to them. The only `/checkout/success` reference in the codebase
points at the *generic* top-level checkout, not the marketplace one.

Nav integrity itself is clean — **0 of 95 nav links across the three layouts point at a
non-existent page.**

---

## M3 — Stubbed gateway controllers 🟠 MEDIUM

- `order.controller.ts` — 12 routes, injects `ClientKafka`, every handler returns a
  hardcoded object literal. The gateway order API is a stub.
- `user.controller.ts` — user profiles read/written to Redis only
  (`redis.setJson('user:'+id, …)`), never to `users`. Redis is a cache, not a store.

---

## L1 — Third-party call from the browser 🟡 LOW

`https://ipapi.co/json/` is called client-side for geo lookup — a privacy disclosure
(user IPs to a third party) and an availability dependency on an external free tier.

---

## Isolation status

**Unchanged and clean** from the 2026-07-27 module audit:

- `marketplace-service` — 38 files, zero relative imports escaping the service, only
  `@app/*` infra libs, zero outbound service calls, all entity relations in-module,
  publishes 87 Kafka topics and consumes none.
- No other service declares an entity on a marketplace table; no raw SQL from elsewhere
  touches them.
- **Frontend**: zero cross-module imports between `app/marketplace`,
  `app/seller/marketplace`, `app/admin/marketplace` and any other vertical.
- Seller Portal is correctly *inside* the Marketplace module (folded 2026-07-27).

**Remaining coupling:** `bank_offers` / `exchange_offers` still live in the gateway with
direct repository access (27 call sites) rather than in marketplace-service. And the
shared database (`kartseek_db`, 77 tables in one `public` schema) remains the one
structural blocker — Phase 2 of the isolation plan.

---

## Implementation plan

Ordered by dependency. **P0 items must ship together** — fixing C1 alone activates C2.

### P0 — Restore the API and close the IDOR (ship as one change)

1. **Fix guard ordering.** Remove `app.useGlobalGuards(new RolesGuard(reflector))` from
   `main.ts:129`. Every controller that uses `@Roles()` already pairs it correctly with
   `@UseGuards(JwtAuthGuard, RolesGuard)` — **except `payment.controller.ts`** (6
   `@Roles`, no local `RolesGuard`), which must have the guard added in the same commit
   or it becomes role-unchecked.
   *Alternative if a global guard is wanted:* register it as an `APP_GUARD` provider
   **after** a global `JwtAuthGuard`, so ordering is explicit.
2. **Add object-level authorisation to the 80 gateway seller routes.** Resolve
   `:sellerId → sellers.owner_id` and compare against the JWT subject, admin roles
   bypassing. Mirror `SellerOwnershipGuard`; the gateway needs its own copy backed by a
   marketplace-service lookup (cached) since it holds no seller repository.
3. **Regression tests for both.** A test asserting a `SELLER` token cannot read another
   seller's orders, and one asserting a correct-role token *can* reach a `@Roles` route —
   the second is what would have caught C1.
4. **Verify:** re-run the role matrix (`SELLER/ADMIN/SUPER_ADMIN/CUSTOMER` × representative
   routes) and confirm expected 200/403 rather than uniform 403.

### P1 — Make the panels real

5. **Delete `lib/product-store.ts` and the seven `/api/marketplace/*` routes**; point
   `product-approvals`, `admin/marketplace/products` and the storefront home at the
   gateway. Product approval must hit `marketplace-service`'s real `approveProduct` /
   `rejectProduct` so it mutates the database and emits its events.
6. **Wire the 73 static admin pages** to the (now reachable) `admin-marketplace` API,
   or remove them. Triage first: each page is either a real feature that needs wiring
   or scaffolding that should not ship.
7. **Replace catch-all empty fallbacks** in `admin-marketplace` (76) and
   `seller-marketplace` (75) with error propagation. Returning `[]` on a 403 is what hid
   C1 for the life of the codebase; surface the failure to the UI.

### P2 — Close the gaps

8. **Cap pagination.** `limit = Math.min(Number(limit) || 20, 100)` on all 13 routes;
   apply as a shared `ParseLimitPipe` rather than per-route.
9. **Fix the two unhandled routes.** Add `/api/admin/marketplace/delivery-zones` (or
   remove the page and its nav entry); change the gift-card page to
   `POST /marketplace/gift-cards/balance` with the code in the body.
10. **Triage the 53 unreachable pages.** Link them from nav, or delete. Start by deleting
    `marketplace/checkout/{success,failed}` — confirmed dead.
11. **Un-stub `order.controller.ts`**; move user profiles from Redis to `user-service`.
12. **Move `ipapi.co` server-side** or drop it in favour of the existing region module.

### P3 — Structural

13. Move `bank_offers` / `exchange_offers` into marketplace-service.
14. Schema-per-module data-tier split (Phase 2 of the isolation plan).
15. Contract tests at each gateway↔service boundary, so a route the frontend calls but
    the gateway does not serve fails CI rather than in production.

---

## Appendix — how this was verified

- **Route inventory:** parsed `@Controller`/`@Get|@Post|@Put|@Patch|@Delete` across all
  gateway controllers → 1,026 routes.
- **Frontend call inventory:** walked the three surfaces plus `lib/` for `/api/v1/*`
  literals and api-client calls → 413 distinct paths; diffed with wildcard matching.
- **Reachability:** page tree from `page.tsx` locations vs every internal link/`router.push`
  literal in `app/`, `components/`, `lib/`, `hooks/`.
- **Live probes:** storefront (10 endpoints), admin (9), seller (8), role matrix (4 roles),
  guard-ordering A/B, pagination cap, gift-card 404 — against the running stack.
- **Tokens:** minted locally with the dev `JWT_SECRET` from `apps/api/.env` to exercise
  each role. Read-only probes only; no data was modified.
