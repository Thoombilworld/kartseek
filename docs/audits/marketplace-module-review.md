# KARTSEEK — Marketplace Module Review

**Reviewer:** Code review pass, 2026-07-25
**Scope:** `apps/api/apps/marketplace-service/**` (backend) + `apps/web/src/app/marketplace/**`,
`apps/web/src/app/admin/marketplace/**`, `apps/web/src/app/api/marketplace/**`, and the
`apps/web/src/lib` data layer (frontend).

## Verdict

**Backend: production-grade and comprehensive. Frontend: partially wired — NOT yet ready for real-world
use.** The customer purchase funnel is broken at checkout, search is entirely mock, ~20 customer pages run on
hardcoded data, and the seller→admin→display product flow runs on a disconnected in-memory store. The strong
backend is largely not exercised by the UI.

---

## 1. Backend — `marketplace-service` ✅ Strong

Genuinely real and mature. No stubs found (a red-flag scan returned 3 hits, all legitimate comments).

- **Controller** (`marketplace.controller.ts`, **1,268 lines**): full REST surface + gRPC (`@GrpcMethod`) +
  TCP (`@MessagePattern`) handlers for the API gateway. Public browse, authenticated cart/wishlist/orders/
  reviews, and a large admin governance surface (catalog, banners, flash-deals, campaigns, promotions,
  commissions, payouts, reviews moderation, complaints, settings, audit logs, reports, page-builder, SEO,
  HSN/tax, analytics, seller wallets, QA moderation, India-ops). Guards (`JwtAuthGuard`/`RolesGuard`) and
  `ValidationPipe` are applied consistently.
- **Domain services** (15): decomposed from a 3,036-line monolith into `catalog`, `order`, `seller-domain`,
  `review`, `return`, `marketplace-cart`, `tracking`, `analytics`, `coupon`, `gift-card`, `qa`, `wishlist`,
  `brand-follow` (+ facade `marketplace.service.ts`). Spot-check of
  [order.service.ts](../../modules/marketplace/backend/src/marketplace.service.ts) (the facade's `// ── Orders ──`
  section in `modules/marketplace/backend`): real TypeORM repositories,
  `findAndCount`, status transitions, Kafka domain events. ~20 entities.
- **Tests:** `marketplace.service.spec.ts` passes (part of the now-green API suite).

**Caveat:** verified as real/complete by structure + spot-checks + type-clean build; not yet exercised
end-to-end against live Postgres (that's Phase 3/4 of the platform plan).

---

## 2. Frontend data architecture — ⚠️ Three disconnected layers

The web app pulls marketplace data from **three** different places, inconsistently:

| Layer                                           | Source                                                  | Reaches real backend?      |
| ----------------------------------------------- | ------------------------------------------------------- | -------------------------- |
| `@/lib/api/marketplace` → `@/lib/api-endpoints` | NestJS gateway `http://localhost:3001/api/v1`, JWT+CSRF | **Yes** — the correct path |
| BFF routes `/api/marketplace/*`                 | `@/lib/product-store` **in-memory singleton**           | **No** — resets on restart |
| Page-level constants                            | hardcoded arrays (`ALL_PRODUCTS`, `MOCK_*`, `DEMO_*`)   | **No**                     |

`product-store.ts` says so in its own header: _"Replace this with a real database query (TypeORM / Prisma)
once Docker is up."_ The **seller-submit → admin-approve → marketplace-display** flow runs entirely on this
in-memory store, disconnected from `marketplace-service`.

**Coverage:** ~**7** customer pages import the real API client; ~**27** import demo/mock data (some overlap =
API-first with mock fallback).

---

## 3. Critical path — findings

| Step                    | Page                                | Status                                                                                                                                                                                      |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search                  | `marketplace/search/page.tsx`       | ❌ **100% mock** — filters a hardcoded `ALL_PRODUCTS` (12 items) client-side; never calls `/marketplace/search` (which exists).                                                             |
| Product detail          | `marketplace/product/[id]/page.tsx` | ✅ API-first (`getProductById`) with mock fallback + curated-image fallback. Robust; includes server-side HTML sanitizer.                                                                   |
| Cart                    | `marketplace/cart/page.tsx`         | ✅ API-first (`getCart`) with `DEMO_CART` fallback. But available coupons / bank offers are hardcoded client arrays.                                                                        |
| Checkout                | `marketplace/checkout/page.tsx`     | ❌ **Order is never placed.** "Place Order" is `onClick={() => setPlaced(true)}` (line 419); `placeOrder()` is not imported or called. Cart is read via API; the order is pure local state. |
| Orders list             | `marketplace/orders/page.tsx`       | ✅ API-first (`getOrders`) with `DEMO_ORDERS` fallback.                                                                                                                                     |
| Order detail / tracking | `marketplace/orders/[id]/page.tsx`  | ❌ Hardcoded `MOCK` record keyed by id.                                                                                                                                                     |

**Other mock-only customer pages:** addresses (`MOCK_ADDRESSES`), reviews (`MOCK_REVIEWS`), returns
(`MOCK_RETURNS`), plus deals / flash-deals / best-sellers / new-arrivals / sellers / brand / subcategory /
offers.

**Admin dashboard** (`admin/marketplace/page.tsx`): **hybrid** — it _does_ fetch real data via
`useAdminData(() => adminMarketplaceApi.getDashboard(...))`, but the region KPI breakdowns (`REGION_KPIs`),
pending-approval tables, country status, and audit log are hardcoded arrays.

---

## 4. Cross-cutting risk: silent mock fallback

The wired pages use _try-API-then-fall-back-to-mock_. That's good for dev resilience but **dangerous in
production**: a backend outage renders identically to a healthy system (users see plausible fake data instead
of an error). Fallbacks should be dev-only or surface a clear degraded state.

---

## 5. Must-fix before "real-world use" (prioritized)

1. **Wire checkout to `placeOrder()`** — create the order, handle payment method, redirect to a real
   confirmation using the returned order id. (Blocks the entire revenue path.)
2. **Wire search to `/marketplace/search`** — replace `ALL_PRODUCTS` with the real endpoint (+ filters,
   pagination, empty/loading/error states).
3. **Unify the data layer** — point the BFF `/api/marketplace/*` (and the seller-submit/admin-approve flow)
   at `marketplace-service` instead of the in-memory `product-store`; retire `product-store.ts`.
4. **Replace mock-only pages** (order detail, addresses, reviews, returns, deals/flash-deals/best-sellers/
   new-arrivals/sellers/brand/subcategory) with their real endpoints — most already exist on the backend.
5. **Gate mock fallbacks** behind a dev flag and show real error/empty states in production.
6. **Admin dashboard**: replace `REGION_KPIs` / pending tables / audit arrays with the real
   `admin/dashboard` + analytics endpoints (all present in the controller).

**Bottom line:** the backend can support a real marketplace today; the frontend needs the wiring above before
it's production-ready. The gap is integration, not missing backend capability.
