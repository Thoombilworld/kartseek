# KARTSEEK — Developer Work Order: Path to "Verified Functional"

**For:** Engineering (whoever picks up the next stint)
**From:** Audit 2026-07-24 (see [KARTSEEK_AUDIT_2026-07-24.md](../audits/2026-07-24-kartseek-audit.md))
**Prereq (already done):** All 60 production-code type errors + 2 build blockers fixed. `apps/api` production
code and `apps/web` both type-check clean. Start from a clean `git status` on top of those fixes.

**Do these four phases strictly in order.** Each phase has a definition of done; don't start the next until
the current one's acceptance check passes.

---

## Phase 1 — Repair the API test suite ⟵ **START HERE**

**Why first:** the suite currently won't compile (54 `tsc` errors), so `npm test` gives you nothing. Until
tests run, every later phase is unguarded. These are _test-to-implementation drift_ errors — the services are
correct; the specs call renamed/removed methods and stale shapes.

**How to work:** one service at a time. For each, open the service file to see the real current API, then
update its `.spec.ts` to match (rename calls, fix arg counts, fix expected shapes). Re-run per service:
`cd apps/api && npx jest <service>` and `npx tsc --noEmit -p tsconfig.json`.

**The 54 errors, grouped by file (fix in this order — cheapest first):**

| Service `.spec.ts`                                 |   # | What's wrong (fix the test to match the service)                                                                                                                             |
| -------------------------------------------------- | --: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-service/src/admin.service.spec`             |   1 | Result typed `unknown` → assert/narrow before reading `.sections`.                                                                                                           |
| `location-service/src/location.service.spec`       |   1 | `getDeliveryZones` no longer exists — use the current method name.                                                                                                           |
| `franchise-service/src/franchise.service.spec`     |   2 | Expected `monthlyRevenue`/`kpiScores` not on the returned shape — update expectations.                                                                                       |
| `pharmacy-service/src/pharmacy.service.spec`       |   2 | `searchItems` renamed; `imageUrl` not a valid prescription field.                                                                                                            |
| `delivery-service/src/delivery.service.spec`       |   4 | **Mocks `geoSearch`/`geoRemove` — service now uses `georadius`/`geodel`.** Update the RedisService mock + calls.                                                             |
| `restaurant-service/src/restaurant.service.spec`   |   5 | `getMenu`/`createReservation` renamed; `menuItemId`→`itemId`; `'CARD'` not in `RestaurantPaymentMethod`; arg count.                                                          |
| `doctor-service/src/doctor.service.spec`           |   5 | `listDoctors`→ current name; `getAppointments`→`getAllAppointments`; `'IN_PERSON'`→`'in-clinic'`; `patientId` not in `CreateAppointmentDto`.                                 |
| `hotel-service/src/hotel.service.spec`             |   6 | `getBooking`/`getRooms` renamed; two calls pass wrong arg counts; one result is `unknown`.                                                                                   |
| `payment-service/src/payment.service.spec`         |   8 | `getPaymentByNumber`→`getPaymentByOrder`; `refundPayment`/`getPaymentHistory` gone; `PaymentStatus.PENDING` missing; `VerifyPaymentDto` passed as string; `startMeter` mock. |
| `marketplace-service/src/marketplace.service.spec` |   8 | Results typed `unknown` → narrow before reading `data`/`sellers`/`products`/`orders`/`revenue`/`country`/`trustBadges`.                                                      |
| `loyalty-service/src/loyalty.service.spec`         |  11 | Multiple arg-count mismatches; expected `newPoints`/`remainingPoints`/`reversedPoints` not on shapes; `getTierBenefits`/`getPointsHistory` gone.                             |

**Done when:** `cd apps/api && npx tsc --noEmit -p tsconfig.json` → **0 errors**, and `npm test` runs green
(or with only intentional, documented skips).

---

## Phase 2 — Re-enable & validate the Edge middleware

**Why:** `apps/web/src/middleware.ts.bak` is a full role-based route guard (reads `kartseek_token` /
`kartseek_user_role` / `kartseek_seller_type` cookies to gate seller, driver, admin, franchise, hotel-owner
routes). It is renamed to `.bak`, so **it does not run** — protected routes are currently unguarded.

**Steps:**

1. Review `middleware.ts.bak` route rules against the current App Router structure; confirm every protected
   prefix and `loginUrl` still exists.
2. Rename `middleware.ts.bak` → `middleware.ts` and start the app (`npm run dev:web`).
3. Test each role's redirect **logged out** and **logged in with the wrong role** — watch specifically for
   redirect loops (the likely reason it was disabled). Fix any loop in the rule table before committing.
4. Confirm public sub-paths (login/register/otp/landing) stay reachable without auth.

**Done when:** middleware is active, all protected routes redirect unauthenticated/wrong-role users to the
correct login, no redirect loops, and public paths load.

---

## Phase 3 — Stand up the docker-compose stack

**Why:** every backend flow needs Postgres/Redis/Kafka (+ Elasticsearch/Mongo) to actually run. Code review
and type-checks can't confirm data flows.

**Steps:**

1. Copy env: `apps/api/.env.example` → `.env` (and web env). Set DB/Redis/Kafka hosts to the compose services.
2. `npm run infra:up` (postgres, redis, kafka, mongodb, elasticsearch, nginx, + UIs). Verify with
   `npm run infra:status`.
3. Run migrations / seeds: `npm run db:seed` (grocery, marketplace, restaurant, pharmacy seeders exist).
4. Boot the mesh. **Fix `dev:all` first** — it currently starts only 12 of 26 services; add the missing
   `start:*` scripts (taxi, delivery, wallet, loyalty, cart, search, location, notification, admin, seller,
   refund, commission, payout, audit, report) so the whole platform comes up.
5. Confirm the gateway reaches services: hit `GET /api/v1/health` and the per-vertical health endpoints;
   check Swagger at `/docs` and GraphQL at `/graphql`.

**Done when:** infra is healthy, all 26 services + gateway boot, health checks pass, and seed data is present.

---

## Phase 4 — End-to-end smoke test per vertical → **Verified Functional**

**Why:** this is what converts the audit's _code-completeness_ estimates into _verified_ functionality.

**For each vertical, exercise the full happy path** (via the web app and/or Swagger), confirming data
persists and events fire:

- [ ] **Marketplace** — browse → product detail → add to cart → checkout → order → payment → notification
- [ ] **Grocery** — store list → catalog → cart → checkout → order
- [ ] **Restaurant** — restaurant → menu → cart → checkout → order (+ table booking)
- [ ] **Pharmacy** — catalog → prescription upload → order
- [ ] **Doctor** — search → slot → appointment booking → queue update
- [ ] **Hotel** — search → availability → booking → owner notification
- [ ] **Taxi** — estimate → book → live driver tracking (WebSocket) → complete → payout
- [ ] **Delivery** — order → partner geo-match (`georadius`) → assignment → status tracking
- [ ] **Wallet / Loyalty / Refund** — credit/debit, points accrue/redeem, refund lifecycle
- [ ] **Search** — query with Elasticsearch up, then with ES down (Redis fallback)
- [ ] **Seller / Franchise / Admin portals** — dashboard loads with real (seeded) data, KYC/approval flows

**Track results** in a checklist; log any flow that fails with the failing service + error. Anything that
fails here is the _real_ remaining work — the type-checks can't surface it.

**Done when:** every vertical's happy path completes end-to-end against live infra. **That is the
"verified functional" state.**

---

### Ordering rationale

Tests first (Phase 1) so later work is guarded → middleware (Phase 2) so the app is safe to run with real
auth → infra (Phase 3) so flows can execute → smoke tests (Phase 4) to prove it. Do not reorder; each phase
depends on the previous one's guarantee.
