# KARTSEEK — Comprehensive Platform Audit & Strategic Implementation Plan

**Date:** 2026-07-25
**Scope:** All application layers — Customer app, Customer website, Seller app, Seller portal, Partner app, Super-admin panel — plus the NestJS API, Kubernetes deployment, and repo infrastructure.

## Methodology & depth (honest disclosure)

Two review depths are used, and each finding is labelled accordingly:

- **Deep-audited** (implementation read line-by-line, cross-checked, and in most cases *fixed + build-verified* this session): the **Marketplace module** (API gateway + service), the **Kubernetes** layer, **API build health**, **order-service** ownership, and **auth/order/payment health probes**.
- **Sweep-audited** (structure enumerated + integration-reality greps for mock/demo/placeholder/TODO + data-sourcing determination + key-file spot reads; *not* every screen read): Customer/Seller/Partner Flutter apps, Admin/Seller-portal/Franchise/Hotel-owner web areas, and API service handler coverage. This depth was used because the multi-agent orchestration was unavailable (Workflow tool disabled + subagent classifier outage), so the sweep was run directly with read-only tooling.

Every quantitative claim below comes from repository greps run on 2026-07-25.

---

## Executive summary

KARTSEEK is a large, genuinely ambitious build — 27 API microservices exposing **1,032 gateway routes**, three Flutter apps (~138k LOC), and a Next.js web app spanning customer + admin + seller + franchise. The **architecture and UI are premium-grade**; the dominant risk across the platform is **pervasive mock/demo/fabricated data standing in for real integration**, plus **security patterns that are correct in some controllers and absent in others**.

The Marketplace module was taken from "looks done" to "actually works" this session (security, money-integrity, de-fabrication, dead-code removal — all build-verified). The same **classes** of issue recur elsewhere and should be remediated using Marketplace as the template.

### Health scorecard

| Layer | Depth | Status | Health | Headline |
|---|---|---|---|---|
| Marketplace module (API+web) | deep (fixed) | mostly-complete | **80** | Secured + de-faked this session; production-track |
| API build & infra | deep (fixed) | mostly-complete | **80** | All 27 services build; `@app/*` + storage fixed |
| Super-admin panel (web) | sweep | mostly-complete | **74** | 119/264 files real-API-wired |
| Customer app (Flutter) | sweep | mostly-complete | **72** | Real per-feature API services; mock fallbacks; 70 TODOs |
| Customer website (non-mktp) | sweep | mostly-complete | **70** | Real-wired; marketplace now on real feed |
| Seller portal (web) | sweep | mostly-complete | **70** | 63/189 files real-API-wired |
| Seller app (Flutter) | sweep | partial | **55** | Real `seller_api_service` exists but only 15/179 screens use it; 34 hardcoded-data files |
| K8s deployment | deep (partial fix) | partial | **50** | NetworkPolicies fixed; probes/PDB/Kafka-DNS still open |
| Partner app (Flutter) | sweep | prototype | **45** | Thin wiring (17 API refs), 63 TODOs |
| Franchise portal (web) | sweep | prototype | **30** | Static — 1 API call across 63 files |
| Hotel-owner portal (web) | sweep | prototype | **25** | Pure static UI — 0 API calls across 34 files |

---

## Cross-cutting themes (the important ones)

1. **Fabricated/mock data is systemic, not isolated.** Beyond Marketplace, **22 API service files** contain `Math.random()`/hardcoded-array fabrication (same pattern fixed in marketplace/payment analytics). Web areas show high mock-string density (admin 569, seller 412) — though most admin/seller *files* do call the real API (see per-layer). Flutter apps carry heavy demo fallbacks (customer 468, seller 224).
2. **Security is inconsistent across gateway controllers.** Marketplace was missing IDOR/RBAC guards until fixed this session; the same audit must be applied to the other ~40 gateway controllers (payment, taxi, wallet, etc.). Service-to-service transport is plaintext (mitigated in marketplace via opt-in `InternalServiceGuard`; not yet elsewhere).
3. **Two web portals are unwired prototypes** — Franchise and Hotel-owner render static UI with essentially no backend integration.
4. **The Seller mobile app has a real API layer it doesn't use** — `seller_api_service.dart` calls real `/seller/*` endpoints, but most screens render hardcoded lists/Unsplash images instead.
5. **Build & deploy health is now good** — the `@app/*` webpack break is fixed and all 27 services compile; the remaining deploy risks are in the K8s manifests (probes, PDB, Kafka DNS).

---

## Per-layer findings

### 1. Marketplace module — DEEP (fixed this session) · Health 80
Reviewed the gateway controller, service controller (100+ TCP handlers), and the 3,194-line `MarketplaceService` façade. **Fixed & build-verified:**
- **Security:** applied `JwtAuthGuard` + `ResourceOwnershipGuard` (IDOR) + `RolesGuard` (RBAC) across cart/wishlist/orders/returns/coupon/variant routes; identity now derived from JWT, not client input; added opt-in `InternalServiceGuard` for service-to-service auth.
- **Correctness:** added ~35 missing `@MessagePattern` handlers (wishlist/reviews/coupons/variants/gift-cards were mis-wired to `GET_PRODUCTS`); fixed `getOrderInvoice` (JSONB `items` was queried as a relation → always-500); made `createProduct`/`updateProduct` persist; made return/refund approvals persist.
- **Money integrity:** wrapped gift-card redemption, coupon redemption, and variant stock decrement in row-locked transactions (were read-modify-write → double-spend/oversell).
- **Honesty:** de-fabricated analytics — real aggregations where data exists (revenue daily, regional from order addresses), honest `dataAvailable:false` where it doesn't (SLA, fraud, penalties, ad campaigns).
- **Cleanup:** removed **12 dead, divergent sub-services (~2,500 lines)**.
- **Web:** homepage wired to the real `/marketplace/home` feed (was demo + 5s poll); product cards got functional Add-to-Cart + wishlist.
- **Still open (medium):** search `to_tsquery` hardening, courier-webhook signature verification, duplicate-review conflict handling, hardcoded home-feed brand-promo *data*.

### 2. API build & infrastructure — DEEP (fixed) · Health 80
- Fixed the monorepo-wide build break: `apps/api/tsconfig.json` was missing `baseUrl`, so `tsconfig-paths-webpack-plugin` resolved **no** `@app/*` aliases → every service failed. **All 27 services now build.**
- `libs/storage` lazily imports `@aws-sdk/client-s3` / `@google-cloud/storage` (not installed) → marked as webpack externals.
- **Gotcha documented:** `baseUrl` is required for the webpack build but trips a `tsc` deprecation (TS5101); it can't be silenced with `ignoreDeprecations` because the ts-loader TypeScript rejects the value (TS5103). Net: webpack build clean; standalone `tsc` shows one deprecation.

### 3. Super-admin panel (web) — SWEEP · Health 74
264 files; **119 import the real API** vs only 4 importing demo-data → the panel is genuinely backend-wired (the 569 "mock/placeholder" string hits are mostly empty-state copy and variable names, not demo data). **Action:** confirm the ~40 admin sub-areas' endpoints resolve against real backend data, and that admin analytics screens don't consume the fabricated API analytics (see theme #1).

### 4. Customer app (Flutter) — SWEEP · Health 72
318 files / 74.8k LOC, **323 API-call references**, per-feature API services (`doctor_api_service`, `grocery_api_service`, `hotel_api_service`, …) against `https://api.kartseek.com/api`. Real-wired with demo/mock **fallbacks** (468 hits) and 70 TODOs. **Action:** triage the 70 TODOs; verify fallbacks degrade gracefully rather than mask failures.

### 5. Customer website (non-marketplace routes) — SWEEP · Health 70
Real-API-wired (grocery/restaurant/pharmacy/doctor/taxi/hotel routes). Marketplace homepage now on the real feed. **Action:** spot-check each vertical's route against its service.

### 6. Seller portal (web) — SWEEP · Health 70
189 files; **63 real-API vs 7 demo-data** → mostly wired. **Action:** confirm onboarding/OTP and per-vertical dashboards end-to-end.

### 7. Seller app (Flutter) — SWEEP · Health 55 · ⚠ partial
Real `seller_api_service.dart` calling `/seller/dashboard`, `/seller/orders`, `/seller/products`, `/seller/payouts`, etc. — **but only 15/179 screens reference an API service, while 34 files carry hardcoded demo lists / Unsplash images**, and a stray `gulftechstore.com` base URL appears. **Action (high):** wire the existing screens to the existing API service; remove hardcoded catalogs; standardize the base URL to `api.kartseek.com`.

### 8. K8s deployment — DEEP (partially fixed) · Health 50
- **Fixed:** NetworkPolicies — corrected the phantom port-4000 mesh rule to real ports and added the missing Kafka policy (9092/29093).
- **Still open (high/critical):** readiness probes hit `/health/ready` which only the gateway defined (fixed for auth/order/payment via new health controllers, but the *manifests* still assume it platform-wide); `PodDisruptionBudget minAvailable:2` on single-replica StatefulSets blocks node drains; Kafka `serviceName: kafka-headless` has no matching Service → broker DNS won't resolve; single-replica Postgres/Redis/Kafka (no HA); only 3 of 26 services have manifests; `deploy.sh` ends with a blocking `kubectl get -w`.

### 9. Partner/Delivery app (Flutter) — SWEEP · Health 45 · ⚠ prototype
78 files / 12.4k LOC, **only 17 API refs and 63 TODOs**; real navigation deep-links (Google/Apple/Waze) but thin backend wiring. **Action:** treat as prototype — build out real delivery/ride/earnings integration against `delivery-service`/`taxi-service`.

### 10. Franchise portal (web) — SWEEP · Health 30 · ⚠ prototype
63 files, **1 API call total** → effectively static. `franchise-service` has 51 handlers ready. **Action:** wire the portal to `franchise-service`.

### 11. Hotel-owner portal (web) — SWEEP · Health 25 · ⚠ prototype
34 files, **0 API calls** → pure static UI. `hotel-service` has 66 handlers ready. **Action:** wire to `hotel-service` or descope.

### 12. API backend (non-marketplace) — SWEEP · Health 65
27 services, 1,032 gateway routes. Handler distribution: **rich** — seller (104), pharmacy/grocery (86), doctor (74), taxi (70), hotel (66), restaurant (57), franchise (51), payment (34); **thin** — auth (3, gRPC-only by design), user (5), refund/search/audit-log (6). **22 files contain `Math.random()`/hardcoded fabrication** (same pattern fixed in marketplace). **Action:** run the marketplace de-fabrication + IDOR/RBAC audit across the other gateway controllers and thin services.

---

## Prioritized findings

### 🔴 Critical / High
1. **Systemic fabricated data** across ~22 API files + admin analytics — apply the marketplace de-fabrication pattern (real-where-possible, `dataAvailable:false` otherwise). *[theme #1]*
2. **Security-guard gaps in non-marketplace gateway controllers** — IDOR/RBAC audit of all ~40 controllers using the marketplace fixes as the template. *[theme #2]*
3. **K8s deploy blockers** — probe paths, single-replica PDB deadlock, Kafka `serviceName`/DNS, 23 missing service manifests, `deploy.sh -w` hang. *[layer 8]*
4. **Franchise + Hotel-owner portals unwired** — static prototypes despite ready backends (51/66 handlers). *[layers 10–11]*
5. **Seller app screens bypass its own API layer** — 34 hardcoded-data files. *[layer 7]*

### 🟡 Medium
6. Partner app is a thin prototype (63 TODOs). 7. Customer app: 70 TODOs + fallback-masking risk. 8. Marketplace residuals (search hardening, webhook signatures, review-dup, brand-promo data). 9. K8s single-replica stateful (no HA) + secrets-in-repo pattern. 10. `tsc` baseUrl deprecation (build works; standalone type-check shows one deprecation).

---

## Strategic implementation plan (phased)

### Phase 0 — Deploy-ability (1–2 weeks)
Finish the K8s layer: add `/health` + `/health/ready` to all services (done for auth/order/payment) and reconcile manifests; fix Kafka Service/`serviceName`; fix the PDB/replica mismatch; generate manifests for the remaining 23 services; de-hang `deploy.sh`. Outcome: the platform can actually deploy and stay healthy.

### Phase 1 — Trust the data (2–4 weeks)
Roll the **marketplace de-fabrication template** across the other services: replace `Math.random()`/hardcoded analytics with real aggregations or explicit `dataAvailable:false`. Decide per admin analytic: build the data pipeline (funnel/SLA/fraud/ads) or mark unavailable. Outcome: no screen shows invented numbers.

### Phase 2 — Security parity (2–3 weeks)
Apply the marketplace security pattern (`JwtAuthGuard` + `ResourceOwnershipGuard` + `RolesGuard` + JWT-derived identity + `InternalServiceGuard`) to all gateway controllers. Add a CI check that flags routes handling user-scoped resources without ownership guards. Outcome: consistent authz platform-wide.

### Phase 3 — Close the client gaps (3–5 weeks)
Wire Franchise + Hotel-owner portals to their (ready) services; connect the Seller app's screens to `seller_api_service`; build out the Partner app against delivery/taxi services; triage customer/seller TODOs. Outcome: every client surface shows real data.

### Phase 4 — Hardening (ongoing)
HA for stateful services (managed RDS/ElastiCache/MSK), external secret management (External Secrets Operator/SealedSecrets), search/webhook hardening, and the ts-loader/TypeScript alignment to clear the `baseUrl` deprecation.

---

## Appendix — fixes already applied this session (build-verified)
- Marketplace: guards (IDOR/RBAC), ~35 message handlers, transport auth, money-integrity transactions, `getOrderInvoice`, product/return/refund persistence, analytics de-fabrication, −2,500 LOC dead code, web homepage real-feed wiring + card quick-actions.
- order-service: `getOrderByIdForRequester` ownership check (IDOR).
- auth/order/payment: root `HealthController` (`/health` + `/health/ready`).
- K8s: NetworkPolicy mesh-port + Kafka fixes.
- Build: `apps/api/tsconfig.json` `baseUrl`; `webpack.config.js` storage externals. All 27 services compile.

---

## Phase 0 & Phase 2 progress (applied 2026-07-25/26, build-verified)

### Phase 0 — K8s deploy-ability (substantially complete)
- Fixed PDB deadlock (`minAvailable:2` → `maxUnavailable:1`), Kafka `serviceName`/`KAFKA_BROKERS` DNS, and the `deploy.sh` `-w` hang.
- Generated Deployment+Service manifests for the **23 missing services** via `k8s/gen-microservices.sh` → `k8s/microservices-generated.yaml` (ports from each `main.ts`; `tcpSocket` probes; pharmacy probes its TCP port since it binds HTTP to loopback by design), wired into `deploy.sh`.
- **Remaining (ops decisions):** stateful HA (managed RDS/ElastiCache/MSK), external secret management, per-service image build/push pipeline.

### Phase 2 — Security parity (in progress)
Structural root cause: **only `RolesGuard` is global; `JwtAuthGuard` is not** — routes without an explicit `@UseGuards(JwtAuthGuard)` are unauthenticated.

**Fixed & build-verified:**
- `seller.controller` — was fully unauthenticated (payout request, wallet, product CRUD) with client-supplied `?sellerId=`; added class-level `JwtAuthGuard + RolesGuard` + `@Roles(SELLER, ADMIN, SUPER_ADMIN)`.
- `admin-layout.controller` + `static-pages.controller` — unauthenticated admin CMS writes; guarded with `JwtAuthGuard + RolesGuard` + `@Roles(ADMIN, SUPER_ADMIN)` (public `pages` reader left open).
- `payment.controller` — `@Public()` on `webhook/:gateway` (was JWT-blocked → gateways got 401); `@Roles(ADMIN, SUPER_ADMIN)` on all 6 `admin/*` routes (were reachable by any authenticated user); `ResourceOwnershipGuard` + `@ResourceOwner('customerId')` on `customer/:customerId` and `invoices/customer/:customerId` (were IDOR).

**Remaining Phase 2 backlog:**
- **Auth-model:** the JWT lacks a `sellerId` claim, so seller-scoped routes can't be tied to the token owner (seller-to-seller IDOR remains behind the new auth guard). Fix = add `sellerId` to the JWT at login (auth-service) or a per-request seller lookup; then close seller + payment `settlement/seller/:sellerId` ownership.
- **Per-route RBAC review:** `hotel` (13 mutations, JWT-only), `franchise` (9, no roles/ownership), `delivery` (4, JWT-only), `grocery` (ownership but no roles) — classify each mutation (seller/admin/driver vs public) and add `@Roles`/ownership.
- **Webhook signatures:** payment + marketplace courier webhooks are now reachable but need gateway-signature verification.
- **CI guardrail:** flag any route touching a user-scoped resource without an ownership/role guard.
