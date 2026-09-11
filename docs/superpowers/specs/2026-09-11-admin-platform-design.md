# KARTSEEK Admin Platform — Architecture & UX Design

Date: 2026-09-11 · Status: approved for planning · Source audit: `docs/audits/2026-09-11-admin-platform-audit.md`

This is deliverable 3 (UX/UI upgrade plan, screen by screen) and deliverable 4 (architecture plan) of the Super Admin + Regional Admin upgrade. It states the target, the rules every task must obey, and what is kept from the current build. It does not restate the audit.

## 1. Principles

1. **Preserve what works.** The marketplace promotion isolation, the token-based identity, the guard regression specs, the admin-service and module admin handlers that persist real rows, and the 124 marketplace routes that reach their backend are kept as they are. The console's existing page routes stay (URLs are not renamed) so bookmarks and the seven sub-navs keep working while pages are upgraded underneath.
2. **Authorization lives on the server, three times.** Gateway (`resolveMarket`/`assertRecordInScope`), backend handler (`assertInMarket` on the loaded row), and the query itself (a market predicate in the SQL). The console shows what the API allows; it never decides.
3. **No invented data.** A route either reaches a service/repository/Redis or answers `501 Not Implemented` with a message naming what is missing. A page either renders API rows or renders an explicit empty/error state. `catch` never returns a placeholder entity.
4. **One market on every read and write.** `Country → Region → Module → Entity`: every admin request resolves to exactly one market (regional admin) or an explicit "all markets" (global admin) before it reaches a handler; every cache key and every event carries it.
5. **Module independence.** Each module owns its admin handlers, DTOs, entities, cache prefix, events and audit action names. The gateway's `admin-<module>.controller.ts` is the only cross-module seam and it never touches another module's tables. Core (users, KYC, roles, audit, countries) is a module too, owned by `admin-service` + `audit-log-service`.
6. **Density over decoration.** Amazon Seller Central / Flipkart Seller Hub / Noon Partner conventions: dense tables, sticky filters, inline status, bulk actions, keyboard reachability. KARTSEEK's own tokens (`globals.css` layers, emerald primary, slate neutrals) stay; no new visual language.

## 2. Identity, roles and scope

### 2.1 Roles (unchanged enum, now used)

`apps/api/libs/common/src/enums/role.enum.ts` already defines `SUPER_ADMIN`, `ADMIN`, `SUPPORT_AGENT`, `FINANCE_MANAGER`, `PRODUCT_MANAGER`. Meaning after the upgrade:

| Role                                                  | Scope                                             | Admin console          | Notes                                                                      |
| ----------------------------------------------------- | ------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `SUPER_ADMIN`                                         | Global, all modules, all permissions              | Yes                    | Only role that manages countries, roles, staff, security, system config    |
| `ADMIN` (unlocked)                                    | Global, permissions from its admin role           | Yes                    | Platform operations staff                                                  |
| `ADMIN` (locked, `region_locked=true`)                | One market, permissions from its admin role       | Yes — "Regional Admin" | Country selector replaced by a fixed badge                                 |
| `SUPPORT_AGENT`, `FINANCE_MANAGER`, `PRODUCT_MANAGER` | Global or locked, permissions from its admin role | Yes                    | Reach only routes whose `@Roles` lists them or whose `perm:` key they hold |
| everything else                                       | —                                                 | No                     | `proxy.ts` and the shell refuse; the API's `RolesGuard` refuses            |

### 2.2 Admin roles and permissions (new persistence)

- Table `admin.admin_roles` (schema `admin`, main DB; owned by the gateway's auth surface, which already owns `users` and mints the claim — admin-service only reads it): `id uuid`, `key text unique` (`super_admin`, `admin`, `regional_admin`, `finance_manager`, `support_agent`, `product_manager`, custom), `name`, `description`, `permissions text[]`, `is_system boolean`, `created_at`, `updated_at`.
- `users.admin_role_id uuid null` (migration in `apps/api/migrations`, applied by hand in dev — the main DB does not synchronize, see `project_regional_admin_scope`).
- Permission keys are the ones the console already uses in `navSections` (`dashboard.view`, `orders.view`, `users.view`, `sellers.view`, `staff.manage`, `modules.marketplace`, `modules.taxi`, `finance.payouts`, `wallet.audit`, `audit.logs`, `system.settings`, …). The registry of keys is one file, `apps/api/libs/common/src/admin/permissions.ts`, exported for both the API and (copied by a build check) the console.
- Token claim `adminPermissions: string[]` signed at login from the user's role (`SUPER_ADMIN` gets `['*']`). `RolesGuard` already understands `perm:` keys; `'*'` is added as a wildcard. Changing a role's permissions takes effect at the next token refresh (≤ 1 h); revoking staff is immediate via the existing refresh-token revocation.

### 2.3 Market scope (kept, extended)

- Source of truth: `req.user.regionCode` + `req.user.regionLocked` from the signed token, read by `marketScopeOf(req)`.
- Gateway rule for **every** `/admin/**` route: call `resolveMarket(req, requested, what)` and forward the result as `scope` (locked admin) or as the requested filter (global admin) to the backend. Record routes call `assertRecordInScope(req, record.regionCode, what)` after loading — or delegate that to the backend, which is mandatory anyway.
- Backend rule: every admin handler takes `scope?: string` and calls the shared `assertInMarket(recordRegion, scope, what)` from `@app/common` (moved out of `MarketplaceAdminService`), and every list query adds `WHERE region_code = :scope` when `scope` is set. `scope` is never read from a client-controlled field name (`country`, `region`) — the gateway writes `scope` from the token; the client's `?country=` goes to `requested`.
- Global entities (brand, category, attribute, specialty, cuisine, amenity, HSN code, static page, roles): a locked admin may **read** them and may not mutate them; the route declares this with `@GlobalEntity()` (metadata only) so the market-scope regression spec can allowlist it with a reason.
- Cache keys: `<module>:<entity>:<market>[:<id>]`. Global keys use `:global`. Purges are per market (`delPattern('marketplace:home:QA')`), never bare.
- Events: every admin-originated event carries `{ actorId, actorRole, regionCode, requestId }`.

### 2.4 Session and second factor

- Login for a staff role returns `{ requires2FA: true, challengeToken }` (a 5-minute JWT `type: 'mfa'`) and no access token. The code is delivered by the existing Kafka `notification.email`/`notification.sms` path (the same one `otp/send` uses), stored in Redis `mfa:<userId>` with 5 attempts. `POST /auth/mfa/verify { challengeToken, code }` issues the access/refresh pair. `DEV_MFA_ECHO=true` (never in production) returns the code in the challenge response so local and CI flows work without a mail provider.
- The console stores nothing until verify succeeds. `proxy.ts` accepts `kartseek_user_role ∈ {SUPER_ADMIN, ADMIN, SUPPORT_AGENT, FINANCE_MANAGER, PRODUCT_MANAGER}`; the cookie is written from the verified token's role.

## 3. Service architecture

```
                           ┌──────────────────────── api-gateway ────────────────────────┐
 console ──Bearer──►       │ JwtAuthGuard → RolesGuard(role | perm:*) → market-scope      │
                           │ AuditInterceptor (mutations → Kafka audit.log, reads → log)  │
                           │ admin-core ─TCP─► admin-service   (users, KYC, roles, staff, │
                           │                                    countries, page layouts)  │
                           │ admin-audit ─TCP─► audit-log-service (query, export)         │
                           │ admin-marketplace ─TCP─► marketplace backend                 │
                           │        └─ order/refund/payment/commission/payout/wallet/     │
                           │           loyalty clients for the money paths                │
                           │ admin-grocery|taxi|hotel|restaurant|pharmacy|doctor ─TCP─►   │
                           │        the module backend, one controller each               │
                           │ admin-security (DdosMonitorService, in-process)              │
                           └──────────────────────────────────────────────────────────────┘
 each backend: admin/<module>-admin.controller.ts (@MessagePattern 'admin.<module>.<verb>')
               admin/<module>-admin.service.ts    (scope predicate, assertInMarket, audit event)
               dto/admin/*.dto.ts                 (class-validator, forwarded body validated at the gateway)
               cache prefix '<module>:'            events '<module>.<entity>.<verb>'
```

Naming rule for RPC commands: `admin.<module>.<entity>.<verb>` (dotted, lower-case), enforced by `apps/api/scripts/check-admin-commands.mjs` which fails CI when a gateway `send('admin.…')` has no `@MessagePattern` anywhere (the census from the audit, productised). Existing `admin_get_sellers`-style names in marketplace stay (they are handled); the check only requires _existence_, not renaming.

### 3.1 Module ownership table

| Module                          | Admin handlers live in                                                                                                 | Entities that must gain a market column                                                                  | Cache prefix                                                                                    | Audit `service`                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| Core                            | `apps/api/apps/admin-service` (users, KYC, markets, page layouts); the gateway's auth surface for roles, staff and MFA | `users.admin_role_id` (new), `admin.admin_roles` (new)                                                   | `admin:`                                                                                        | `admin-service` / `api-gateway` |
| Audit                           | `apps/api/apps/audit-log-service`                                                                                      | — (Mongo `country` already required)                                                                     | —                                                                                               | `audit-log-service`             |
| Marketplace                     | `modules/marketplace/backend/src/admin`                                                                                | review (via product→seller join, no column), seller-promotion (`region_code`), gift-card (`region_code`) | `marketplace:` / `product:` (existing)                                                          | `marketplace-service`           |
| Grocery                         | `modules/grocery/backend/src/admin`                                                                                    | flash-deal (`region_code`), warehouse (`region_code`), setting (`region_code` nullable = global)         | `grocery:<entity>:<market>`                                                                     | `grocery-service`               |
| Taxi                            | `modules/taxi/backend/src/admin` (new dir)                                                                             | vehicle (new), service-area (new), surge-zone (new) — all `country_code`                                 | `taxi:` (rename `driver:`/`ride:`/`surge:` to `taxi:driver:`, `taxi:ride:`, `taxi:surge:<cc>:`) | `taxi-service`                  |
| Hotel                           | `modules/hotel/backend/src/admin`                                                                                      | room/review/payout via hotel join; seasonal-pricing via hotel                                            | `hotel:`                                                                                        | `hotel-service`                 |
| Restaurant                      | `modules/restaurant/backend/src/admin` (new)                                                                           | restaurant-order, reservation (`region_code` copied from restaurant at write)                            | `restaurant:`                                                                                   | `restaurant-service`            |
| Pharmacy                        | `modules/pharmacy/backend/src/admin` (new)                                                                             | pharmacy-order, prescription (`region_code` from store)                                                  | `pharmacy:`                                                                                     | `pharmacy-service`              |
| Doctor                          | `modules/doctor/backend/src/admin` (new)                                                                               | doctor (`country_code`), appointment (`region_code` from clinic), prescription                           | `doctor:`                                                                                       | `doctor-service`                |
| Orders/Payments/Refunds/Payouts | core services, reached from admin-marketplace and a new `admin-orders.controller.ts`                                   | payout (`region_code` from seller), seller-wallet (`region_code`)                                        | per service                                                                                     | per service                     |

### 3.2 Countries and regions

- Registry stays the code-owned source (`libs/localization`) for currency, language, address and payment formats.
- New table `admin.market_settings` (admin-service): `country_code pk`, `is_active`, `enabled_modules text[]`, `default_language`, `opened_at`, `notes`. `ACTIVE_REGIONS` env becomes the bootstrap default; `getActiveRegionCodes()` reads the table through Redis (`admin:markets`, purged on write) with the env as fallback.
- `/admin/regions` becomes Countries & Markets: activate a market, toggle modules per market, assign regional admins, see per-market counters from each module's `admin.<module>.dashboard { scope }`.

## 4. Taxi operations design (Phase 5)

Taxi is modelled as an operations platform, not CRUD. The current backend already has ride matching, dispatch, fare calculation, onboarding, vendors, complaints, payouts and per-country config/rate cards; the admin surface is what is missing.

Entities to add in `modules/taxi/backend/src/entities`: `taxi-vehicle` (plate, category, vendor/driver, documents, inspection status, `country_code`), `taxi-service-area` (polygon GeoJSON, `country_code`, city, active), `taxi-surge-zone` (area id, multiplier, window, cap from country config), `taxi-trip-event` (ride id, type, at, lat/lng, actor) for the timeline, `taxi-dispute` (ride, party, amount, status).

Admin handlers (all `admin.taxi.*`, all taking `scope`): dashboard (per market: online drivers, active trips, completion rate, cancellations, GMV, commission), drivers (list/detail/approve/suspend/block/availability), vendors (list/detail/approve/suspend/earnings), vehicles (list/detail/approve/categories), documents (existing), trips (list/detail/timeline/cancel-with-reason/force-complete), live fleet (`drivers.nearby` existing + `trips.active` with last positions from Redis `taxi:driver:loc:*`), fares (rate cards existing), surge (zones CRUD + current multipliers), service areas (CRUD + geofence check), promotions (per market codes), payouts (existing + partner earnings), refunds/disputes (open/resolve), ratings (list, flag), complaints (existing), fraud signals (repeated cancellations, GPS jumps, duplicate devices — computed views), reports (per market daily), audit.

Live map: a new Socket.IO namespace `/admin-fleet` with rooms `fleet:<countryCode>`; joining requires an admin role and, for a locked admin, a room in their market. Positions come from the existing `updateDriverLocation` handler which additionally emits to `fleet:<cc>`.

Regional taxi admin sees exactly the above filtered to `scope`; a global admin picks a market or sees all with a market column.

## 5. UX/UI upgrade plan (deliverable 3)

### 5.1 Design system for the console

New package folder `packages/shared-ui/src/admin/` (used by the console only), built once, then adopted page by page:

| Component                              | Purpose                                                                                                                                                               | Replaces                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `AdminPage`                            | title, breadcrumbs, market badge, primary/secondary actions slot                                                                                                      | ad-hoc headers on 250 pages  |
| `DataTable<T>`                         | columns config, server pagination, sort, row selection, bulk action bar, sticky header, overflow container, keyboard navigation, loading skeleton, empty/error states | 144 hand-rolled tables       |
| `FilterBar`                            | search + typed filters (status/date range/market/module) bound to URL search params                                                                                   | per-page filter markup       |
| `StatusBadge`                          | one status→colour map per module (from a registry)                                                                                                                    | 30+ local badge maps         |
| `StatCard`, `StatGrid`                 | dashboard counters with delta and sparkline (dataviz palette)                                                                                                         | fixture cards                |
| `ConfirmDialog`, `ReasonDialog`        | accessible modal, reason capture for approve/reject/suspend                                                                                                           | `confirm()`/inline modals    |
| `Toast` / `useToast`                   | success/error, screen-reader announced                                                                                                                                | `AdminToast` in shared-core  |
| `EmptyState`, `ErrorState`, `Skeleton` | consistent states                                                                                                                                                     | marketplace-only versions    |
| `Timeline`                             | audit/activity timeline                                                                                                                                               | `marketplace-audit-timeline` |
| `MarketSelect`                         | market picker that is disabled/badge for locked admins and writes `?country=`                                                                                         | header switcher only         |
| `Money`                                | formats with the registry for the row's market, never `₹`                                                                                                             | 111 hard-coded symbols       |

Shell upgrade (`admin/layout.tsx`): navigation generated from a single `admin-navigation.ts` registry (label, href, icon, permission, module) validated by a test that every href has a page and every item has a permission; breadcrumbs from the registry; global search (`Ctrl+K`) over users/sellers/orders/drivers via a new `GET /admin/search?q=` that fans out to modules with scope; notifications from `GET /admin/notifications` (real) with unread count; account menu shows role and market from the token; module selector in the header for the seven modules.

### 5.2 Screen-by-screen disposition

Keep = works, restyle onto the design system only. Fix = wire to the real API / scope / validation. Rebuild = replace fixture with real data model and API. Build = new. Remove = delete page and nav item.

| Screen (route under `/admin`)                                                                   | Disposition | What changes                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/` dashboard                                                                                   | Fix         | keep `getDashboard()`; remove `recentActivity/hourlyData/modules` fixtures; per-market counters via `?country=`; activity from audit query                                                                                                                                                                                                                   |
| `/login`                                                                                        | Fix         | role from token; MFA challenge/verify; delete `ADMIN_ACCOUNTS`                                                                                                                                                                                                                                                                                               |
| `/regions`, `/regions/[code]`                                                                   | Rebuild     | Countries & Markets (market_settings CRUD, module toggles, regional admin assignment, per-module counters)                                                                                                                                                                                                                                                   |
| `/customers`                                                                                    | Fix         | wire to `/admin/users?role=CUSTOMER` with scope; drop `sampleOrders`; detail drawer with orders from order-service                                                                                                                                                                                                                                           |
| `/sellers`                                                                                      | Rebuild     | drop `MOCK_SELLERS`; one cross-module sellers/partners view over marketplace sellers, grocery stores, restaurants, pharmacies, hotels, taxi vendors (each module's list with `scope`)                                                                                                                                                                        |
| `/drivers`, `/delivery/*`                                                                       | Fix         | taxi drivers + delivery partners real; live page uses `/admin-fleet`                                                                                                                                                                                                                                                                                         |
| `/franchise`                                                                                    | Fix         | scope; validation                                                                                                                                                                                                                                                                                                                                            |
| `/staff`, `/roles`                                                                              | Rebuild     | API-backed (admin-service roles/staff), SUPER_ADMIN only, market lock assignment, permission matrix                                                                                                                                                                                                                                                          |
| `/kyc-verification`                                                                             | Fix         | wire to `/admin/kyc/pending`, approve/reject with reason dialog                                                                                                                                                                                                                                                                                              |
| `/marketplace/**` (139 pages)                                                                   | Keep/Fix    | promotion pages keep; sellers/products/orders/returns/refunds/payouts/customers get scope + real filters; literal pages (orders, payments, logistics, shipping-rates, gst-invoicing, abandoned-carts, ip-violations, system-health, gift-cards, campaigns approve…) become real or are removed from nav until their service exists (Plan C decides per page) |
| `/grocery/**` (22)                                                                              | Fix         | scope; the 4 twenty-three-line stubs (banners, complaints, offers, refunds) become real or removed                                                                                                                                                                                                                                                           |
| `/restaurant/**`, `/pharmacy/**`, `/doctor/**`, `/hotel-booking/**`                             | Fix/Build   | pages exist; backends built in Plan C; each page moves onto `DataTable` when its handler lands                                                                                                                                                                                                                                                               |
| `/taxi/**` (22)                                                                                 | Rebuild     | on the Phase 5 model: dashboard, drivers, vendors, vehicles, documents, trips, live map, fares, surge, service areas, promotions, payouts, disputes, ratings, complaints, fraud, reports, settings; remove `intercity`, `rentals`, `rental-fleet`, `scheduled`, `landing-editor`, `reconciliation` until a backend exists                                    |
| `/orders`                                                                                       | Fix         | order-service list with scope                                                                                                                                                                                                                                                                                                                                |
| `/payouts`, `/commissions`, `/refunds`, `/wallet-audit`, `/loyalty`                             | Fix         | real services with scope; `/refunds` gets an API                                                                                                                                                                                                                                                                                                             |
| `/analytics`, `/marketplace/reports/*`                                                          | Fix         | real analytics routes; drop `mockData`; `Money` per market                                                                                                                                                                                                                                                                                                   |
| `/notifications`, `/support`, `/sos`                                                            | Fix/Build   | notifications real; support tickets need a backend (Plan C decides); SOS reads taxi complaints of type SOS                                                                                                                                                                                                                                                   |
| `/security`                                                                                     | Fix         | wire to `/admin/security/*` (now role-guarded)                                                                                                                                                                                                                                                                                                               |
| `/two-factor`                                                                                   | Rebuild     | staff MFA enrolment state from the API                                                                                                                                                                                                                                                                                                                       |
| `/audit-logs`, `/marketplace/audit-logs`                                                        | Fix         | `GET /admin/audit-logs` (audit-log-service), filters, export                                                                                                                                                                                                                                                                                                 |
| `/settings`, `/settings/module-titles`, `/system-health`, `/gdpr`                               | Fix         | real config routes; system health from `/admin/platform/health`                                                                                                                                                                                                                                                                                              |
| `/content/*`, `/page-builder`, `/static-pages/*`, `/seo`, `/seller-content`, `/brand-followers` | Keep/Fix    | `content/edit` fixture removed; scope on market-specific content                                                                                                                                                                                                                                                                                             |

### 5.3 Interaction rules

- Every list: server pagination (`page`, `limit ≤ 100`), server sort, server search; URL is the state.
- Every mutation: confirmation dialog with reason for approve/reject/suspend/ban/refund; optimistic UI forbidden for money and status changes; success toast names the entity and market.
- Every page: loading skeleton, empty state with the active filters named, error state with request id and retry.
- Bulk actions: selection across pages by ids; the API takes `ids[]` + reason and returns per-id results.
- Responsive: tables scroll inside their container at 375/768; primary actions reachable at 375; sidebar drawer at < 1024.
- Accessibility: every control labelled; dialogs trap focus; `DismissOnEscape` kept.

## 6. Verification architecture

- Unit: `market-scope.spec.ts`; per-controller specs using the `FakeJwtAuthGuard` pattern from `guards.regression.spec.ts`; `admin-market-scope.regression.spec.ts` (every `/admin` route is scoped or allowlisted with a reason); `route-exposure` extended (every `/admin` route has `@Roles`); `check-admin-commands.mjs` (no gateway command without a handler).
- Live: `regional-isolation-authz.mjs` extended per plan (users, sellers, products, taxi, grocery, hotel, restaurant, pharmacy, doctor); run per market as the QA admin, the IN admin and the global admin.
- E2E: Playwright (system Chrome per `project_marketplace_mobile_verification`) admin journeys per market (Plan E), Postman `05-admin-panel` updated to the new contract.
- Regression: the existing suites (`npm test` in `apps/api`, `apps/web` jest, marketplace integration specs, Postman critical path) must stay green after every plan; the customer, seller and partner flows in `regional-isolation-e2e.mjs` are the customer-side canary.
