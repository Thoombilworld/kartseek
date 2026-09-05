# KARTSEEK Super App — Comprehensive Audit Report

**Date:** 2026-07-24
**Scope:** Full monorepo — API (NestJS microservices), Web (Next.js), Mobile (3× Flutter), MCP server, shared libs, infrastructure
**Author:** Engineering audit (automated, evidence-based)

---

## 1. Executive Summary

KARTSEEK is a **large, genuinely-built super-app monorepo** — not a skeleton. It contains 26 domain
microservices plus an API gateway (27 NestJS apps), 15 shared libraries, a 1,077-file Next.js web app,
three Flutter clients, and an MCP server. The architecture (gRPC + TCP + Kafka microservice mesh, WebSocket
gateways, Redis, GraphQL, comprehensive security middleware) is professionally structured and substantially
implemented.

However, at the start of this audit **neither the API nor the web app would type-check**, and both were
blocked by a mix of one trivial config/syntax issue each plus real code defects — several of them
runtime-affecting. The dominant cause of the web breakage was a **botched automated refactor**
(`refactor_taxi.js` / `fix_jsx.js`, still present in the repo) that lowercased property names and duplicated
object keys across dozens of files.

**Outcome of this audit:** all **60 production-code TypeScript errors were fixed** (26 API + 34 web) plus the
two build blockers. **Both the API production code and the entire web app now type-check cleanly (exit 0).**
The one remaining category is **54 errors confined to API `.spec.ts` test files** (tests that drifted from
current service APIs), plus several configuration/hygiene items flagged below that require an `npm install`
or a live app-run to fix safely.

### Are all modules functional, routed, navigable, and integrated?

**Mostly yes at the code/integration level, with important caveats:**

| Dimension | Status |
|---|---|
| **Routing (API)** | ✅ Gateway exposes 32 controllers routing to all verticals; global `/api/v1` prefix, versioning, Swagger, GraphQL all wired. |
| **Routing (Web)** | ✅ App Router has route groups for every vertical (marketplace, grocery, restaurant, pharmacy, doctor, taxi, hotel, franchise, seller, admin, …). Compiles cleanly. |
| **Navigation (Mobile)** | ✅ Customer app router wires dozens of feature screens; substantial. Partner app is thinner. |
| **Service integration** | ✅ Gateway registers 9 gRPC + 21 TCP clients + Kafka. ⚠️ 4 services double-registered on both gRPC **and** TCP (verify intent). |
| **Build health** | ✅ API prod + Web type-check clean **after fixes**. ❌ API test suite does not compile (54 spec errors). |
| **Edge auth** | ❌ Next.js middleware (role-based route protection) is **disabled** (renamed to `.bak`). |
| **Persistence** | ⚠️ 9 services are Redis/Kafka-backed with **no SQL entities** — functional but not durably persisted. |

---

## 2. Methodology & Honest Scope Note

A literal "read every file" is not meaningful for a repo of this size (the tree includes `node_modules`,
`.next`, `dist`, `build`, `.dart_tool`, and a 838 KB lockfile — well over 100k files). Instead this audit is
**systematic and evidence-based**:

- Full structural map of every source directory (excluding dependencies/build output).
- **Objective build signals**: ran `tsc --noEmit` on both the API and the web app — the authoritative test of
  whether code is internally consistent.
- Per-service inventory (file counts, LOC, controllers, modules, entities) to gauge implementation depth.
- Targeted reads of every file implicated by a compiler error, plus core integration files (gateway module,
  API clients, routers, Redis service).
- `TODO/FIXME/stub` scan across the API.

Completion percentages below are **code-completeness estimates** from these signals (depth, build health,
integration wiring, persistence). They are **not** end-to-end runtime verification against live
Postgres/Redis/Kafka — that requires standing up the full `docker-compose` stack and exercising each flow.

---

## 3. Codebase Snapshot

| Area | Files | Notes |
|---|---|---|
| API services (`apps/api/apps`) | 411 `.ts` | 26 microservices + gateway |
| API shared libs (`apps/api/libs`) | 81 `.ts` | 15 libs (security, database, kafka, redis, grpc, region, gdpr, …) |
| Web (`apps/web/src`) | 1,077 `.ts/.tsx` | Next.js App Router PWA |
| Customer app (`apps/customer/lib`) | 318 `.dart` | Flutter — extensive |
| Seller app (`apps/seller/lib`) | 179 `.dart` | Flutter |
| Partner app (`apps/partner/lib`) | 78 `.dart` | Flutter — thinnest |
| MCP server (`apps/mcp-server/src`) | 14 `.ts` | Standalone (not in npm workspace) |

Infrastructure (`docker-compose.yml`): postgres, redis, kafka (+kafka-ui), mongodb, elasticsearch (+kibana),
pgadmin, redis-insight, nginx. Comprehensive.

---

## 4. Issues Found & Fixed

### 4.1 Build blockers (fixed)

| # | Severity | File | Problem | Fix |
|---|---|---|---|---|
| 1 | 🟠 High | `apps/api/tsconfig.json` | `baseUrl` triggers a hard TS 6.x deprecation error, halting the **entire** API type-check before any code is examined. | Added `"ignoreDeprecations": "6.0"`. |
| 2 | 🔴 Critical | `apps/web/.../seller/restaurant/(public)/landing/page.tsx` | Syntax error — doubled `}` closed `COUNTRY_CONTENT` early, orphaning `GB`/`US`/`};`. Broke the web build. | Removed the stray brace. |

### 4.2 API production-code defects (26 errors, all fixed)

| Service | Problem | Severity | Fix |
|---|---|---|---|
| **delivery-service** | Called `redis.geoSearch/geoAdd/geoRemove` — **none exist** (correct names: `georadius`/`geoadd`/`geodel`); also read `partner.distance` instead of `.dist`. **Would throw at runtime**, breaking driver geo-matching. | 🔴 Critical | Corrected all method names + property. |
| commission-service | 4 interfaces (`CategoryRate`, `CommissionRate`, `CommissionRecord`, `SellerOverride`) imported by the controller but not exported. | 🟠 High | Added `export`. |
| payout-service | `PayoutRecord` not exported; `processPayout` called with an extra `adminId` arg it didn't accept. | 🟠 High | Exported type; added optional `adminId` param (threaded into the audit log). |
| refund-service | `RefundRequest` not exported. | 🟠 High | Added `export`. |
| search-service | HTTP-string query params passed into typed unions (`sortBy`, `SearchableModule`). | 🟡 Medium | Exported `SearchFilters`; cast the three boundary values. |
| admin / notification / payout / delivery / search | 13× `error.message` accessed on an `unknown` catch variable (TS strict). | 🟡 Medium | Narrowed via `(err as Error).message`. |

### 4.3 Web defects (34 errors, all fixed) — mostly codemod fallout

| Category | Count | Files | Fix |
|---|---|---|---|
| Property casing (`countrycode`→`countryCode`, `regioncode`→`regionCode`) | 17 | admin/taxi {complaints, compliance, drivers, payouts, vendors}, taxi {login, register, drive/login}, seller/taxi/otp | Restored correct casing. |
| Duplicate object keys (TS1117) | 11 | admin/taxi & admin/restaurant landing-editors, drivers/vendors/payouts `FLAGS`, `useTaxiRegionFilter`, `use-background-refresh`, `seller-api`, seller approval-status ×2 | Removed duplicated/corrupted entries. |
| Duplicate `TrendingUp` import | 1 | franchise/hotel-booking/analytics | Deduped import. |
| Missing `./sw` (Swahili) locale (not in `SupportedLocale`) | 2 | i18n/locales/index.ts | Removed the dangling import + map entry. |
| Seller context type mismatches | 2 | seller/marketplace {layout `taxId`, shipping `id`} | Added optional `taxId` to `SellerIdentity`; corrected `seller?.seller?.sellerId`. |

> **Note on corrupted data:** the same codemod left cosmetic damage — e.g. taxi admin mock rows show Nairobi
> place-names ("Thika Road", "Southern Bypass") under `countryCode: 'IN'`, and a taxi config/geo-bounds entry
> for an East-African country was mislabeled as `IN` with blanked currency. These are **demo data**, not
> compile errors; the duplicates were removed but the mislabeled values were left as-is (intended country
> unknown).

---

## 5. Per-Module Completion Estimate

Basis: implementation depth (LOC/files), build health (now green for production), gateway/web/mobile
integration, and persistence model. **Estimates, not runtime-certified.**

### Core verticals

| Module | Est. % | Evidence / gaps |
|---|---:|---|
| Marketplace | **85%** | 7,314 LOC, 18 entities, 4 gateway controllers, full web + mobile. Deepest vertical. |
| Payment | **80%** | 3,078 LOC, Stripe/Razorpay adapters, orchestrator. Verify live gateway creds. |
| Taxi | **80%** | 4,718 LOC, 9 entities, live-tracking WS. Web pages were codemod-damaged (now fixed). |
| Doctor | **80%** | 2,043 LOC, 13 entities, queue gateway. |
| Grocery | **80%** | 2,341 LOC, 7 entities. |
| Restaurant | **78%** | 1,798 LOC, 9 entities. |
| Hotel | **78%** | 2,309 LOC, 9 entities, 4 controllers, owner + admin portals. |
| Pharmacy | **77%** | 1,631 LOC, 8 entities, prescription upload. |
| Wallet | **72%** | 387 LOC, 1 entity. |
| Loyalty | **70%** | 367 LOC, Redis-backed (no SQL entities). |
| Search | **70%** | 554 LOC, Elasticsearch with Redis fallback (ES optional). |
| Delivery | **68%** | 428 LOC, Redis-geo. **Had a critical runtime bug (fixed)**; no SQL entities. |

### Platform & supporting services

| Module | Est. % | Evidence / gaps |
|---|---:|---|
| Seller (portal/service) | **75%** | 1,194 LOC + gateway seller/marketplace/public controllers. |
| Cart | **75%** | Redis-backed, clean. Simple by design. |
| Region / Localization | **75%** | `libs/region` + gateway controllers. |
| Admin | **72%** | 502 LOC service + 8 gateway admin controllers (per vertical). |
| Order | **72%** | 510 LOC, order WS gateway. |
| Franchise | **72%** | 952 LOC + WS gateway. |
| Notification | **72%** | 470 LOC, FCM/Twilio/SendGrid adapters (log-only fallback when unconfigured). |
| Location | **70%** | 481 LOC, 7 entities. |
| Auth | **70%** | Thin service (246 LOC); most logic in gateway `AuthController` + `libs/security`. Verify token/refresh e2e. |
| User | **70%** | 304 LOC + gateway `UserController`. |
| Audit-log | **70%** | 206 LOC, compliance logging. |
| Commission | **68%** | 755 LOC, Redis-backed. |
| Payout | **68%** | 543 LOC, escrow/wallet. |
| Refund | **65%** | 447 LOC, Redis-backed. |
| Report | **65%** | 591 LOC, Redis-backed analytics. |

### Clients

| Client | Est. % | Evidence / gaps |
|---|---:|---|
| Web (Next.js) | **78%** | All routes present, type-clean. ⚠️ Edge middleware disabled; some demo data. |
| Customer (Flutter) | **72%** | 318 files, extensive router. |
| Seller (Flutter) | **65%** | 179 files. |
| Partner (Flutter) | **50%** | 78 files — least developed client. |
| MCP server | **60%** | 14 files, standalone. |

**Weighted platform estimate: ~74% code-complete.** The backend mesh and web are the most mature; the
partner mobile app, durable persistence for Redis-only services, the test suite, and end-to-end runtime
verification are the biggest gaps to 100%.

---

## 6. Remaining Issues (flagged, NOT auto-fixed) — with reasons

| # | Severity | Issue | Why not auto-fixed | Recommended fix |
|---|---|---|---|---|
| R1 | 🟠 High | **54 API `.spec.ts` errors** — tests call renamed/removed methods (`getBooking`, `listDoctors`, `createReservation`, `geoSearch` mock, wrong arg counts). Test suite won't compile. | Correct fixes require reading each service's current API and rewriting expectations per service (11 services); rushing risks vacuous/incorrect tests. | Dedicated test-repair pass, one service at a time (see plan §7). |
| R2 | 🟠 High | **Next.js Edge middleware disabled** (`src/middleware.ts.bak`, no active `middleware.ts`). Role-based route protection for seller/driver/admin/franchise is not running. | May have been disabled to avoid redirect loops; re-enabling blindly could lock out or loop all protected routes. Needs a live app run to verify. | Review `.bak`, re-enable, and test each protected route's auth redirect. |
| R3 | 🟠 High | **Root `typeorm: ^1.0.0` vs API `^0.3.20`.** API code targets the 0.3.x DataSource API. Root/lock resolve 1.0.0. Currently the API uses its nested 0.3.20 so it compiles, but it's a footgun. | Editing root deps desyncs the 838 KB lockfile; a correct fix needs `npm install` to regenerate the lock, which shouldn't run blind. | Remove the spurious root `typeorm` (nothing at root uses it) **or** align to `^0.3.20`, then `npm install` + verify. |
| R4 | 🟡 Medium | **`dev:all` starts only 12 of 26 services** (missing taxi, delivery, wallet, loyalty, cart, search, location, notification, admin, seller, refund, commission, payout, audit, report). | Behavior/intent choice (may be to reduce local load). | Add remaining `start:*` entries or document the subset. |
| R5 | 🟡 Medium | **9 services have no SQL entities** (cart, delivery, loyalty, refund, commission, report, search, notification, audit-log). Cart/session/geo/events are fine on Redis; commission/payout/refund/report/audit arguably need durable persistence. | Design decision — needs product/architecture input on durability requirements. | Add TypeORM entities + repositories where durability/audit is required. |
| R6 | 🟢 Low | **Leftover codemod/utility scripts** in repo: `fix_jsx.js`, `apps/web/{refactor_taxi.js, fix_jsx? , check_links.js, fix_broken_links.js}`, `apps/web/src/middleware.ts.bak`. `refactor_taxi.js` caused the casing/duplicate-key corruption fixed above. | Deletion is destructive; `.bak` also signals the disabled-middleware issue (R2). | Delete the one-off scripts after confirming they're orphaned; resolve `.bak` via R2. |
| R7 | 🟢 Low | **4 services double-registered** on gRPC **and** TCP in the gateway (grocery, restaurant, payment, taxi). | Could be an intentional migration state. | Confirm the intended transport per service; drop the redundant registration. |
| R8 | 🟢 Low | **`mcp-server` excluded from npm workspaces** (has its own lockfile). | May be intentionally standalone. | Confirm intent; add to workspaces if it should share deps. |

---

## 7. Implementation Plan (prioritized)

**Phase 0 — DONE in this audit:** fixed both build blockers + all 60 production-code type errors; API
production code and web both type-check clean.

**Phase 1 — Restore test & config integrity (est. 1–2 days)**
1. Repair the API test suite (R1) service-by-service: run `tsc --noEmit`, fix each `.spec.ts` to match the
   current service API, land per service so `npm test` compiles and runs.
2. Reconcile the root `typeorm` dependency (R3): remove/align, `npm install`, confirm API still type-checks,
   commit the regenerated lockfile.
3. Delete leftover codemod scripts (R6) so no one re-runs `refactor_taxi.js`.

**Phase 2 — Re-enable protection & complete wiring (est. 1–2 days)**
4. Re-enable and validate the Edge middleware (R2) against a running web app; test every protected route's
   redirect for each role.
5. Fix `dev:all` to cover all 26 services (R4); confirm the full mesh boots.
6. Resolve gRPC/TCP double-registration (R7).

**Phase 3 — Durability & runtime verification (est. 3–5 days)**
7. Add SQL entities/repositories for services that need durable/audit persistence (R5): commission, payout,
   refund, report, audit-log.
8. **End-to-end smoke test** against the full `docker-compose` stack: for each vertical, exercise
   list→detail→cart→checkout→order→payment→notification and the taxi/delivery live-tracking flows. This is
   what converts the code-completeness estimates in §5 into verified functionality.

**Phase 4 — Client parity (est. ongoing)**
9. Build out the Partner Flutter app (currently ~50%).
10. Clean up corrupted demo data in taxi admin pages (§4.3 note).

---

## 8. Appendix — Files changed in Phase 0

**API (10 files):** `tsconfig.json`; `delivery-service/src/delivery.service.ts`;
`admin-service/src/admin.service.ts`; `notification-service/src/notification.service.ts`;
`payout-service/src/{payout.service.ts}`; `commission-service/src/commission.service.ts`;
`refund-service/src/refund.service.ts`; `search-service/src/{search.service.ts, search.controller.ts}`.

**Web (14 files):** `seller/restaurant/(public)/landing/page.tsx`; `admin/taxi/{complaints,compliance,drivers,payouts,vendors}/page.tsx`;
`admin/{restaurant,taxi}/landing-editor/page.tsx`; `taxi/{login,register,drive/login}/page.tsx`;
`seller/taxi/(public)/otp/page.tsx`; `seller/{approval-status,taxi/(public)/approval-status}/page.tsx`;
`franchise/hotel-booking/analytics/page.tsx`; `hooks/useTaxiRegionFilter.ts`;
`lib/hooks/use-background-refresh.ts`; `lib/modules/seller-api.ts`; `lib/contexts/seller-context.tsx`;
`seller/marketplace/shipping/page.tsx`; `i18n/locales/index.ts`.

**Verification:** `apps/api` → `tsc --noEmit` = production clean (54 spec errors remain, tracked in R1).
`apps/web` → `tsc --noEmit` = **exit 0, fully clean**.
