# KARTSEEK — Module Isolation Audit

**Date:** 2026-07-27
**Scope:** Marketplace, Grocery, Restaurant, Pharmacy, Taxi, Hotel, Doctor, Wallet, Loyalty, Franchise
**Question:** Is true module isolation (own backend, own data store, own API, no cross-module DB access) already in place?

> **Status: Phase 0 and the Franchise/Seller decoupling have been implemented.**
> Sections 1–6 describe the state as found. [Section 8](#8-remediation-applied-2026-07-27)
> records what was changed, what was verified, and what remains.

---

## Verdict

**No. True module isolation is not in place.**

KARTSEEK is currently a **distributed monolith**: 27 independently-startable NestJS processes that
all share a single PostgreSQL database (`kartseek_db`), with several services reading and writing
tables owned by other modules — including raw cross-module SQL.

Process isolation and API isolation are largely real. **Data isolation is absent**, and it is the
layer that actually determines whether modules can be deployed, scaled, and updated independently.

| Isolation dimension | Status |
| --- | --- |
| Separate deployable process per module | ✅ Yes (27 services, own `main.ts`, own k8s Deployment) |
| Separate API surface per module | ⚠️ Mostly (Taxi is the exception) |
| Separate data store per module | ❌ **No — one shared database** |
| No direct cross-module DB access | ❌ **No — 5 confirmed violations** |
| Independent build/dependency graph | ❌ No (one `package.json`, one Dockerfile) |
| No service-to-service business coupling | ✅ Yes (hub-and-spoke via gateway, no mesh) |

---

## 1. Evidence — the data layer is shared

Every database-connected service resolves the same connection:

```ts
database: cfg.get<string>('DB_NAME', 'kartseek_db')
```

Verified identical in **17 services**: admin, commission, delivery, doctor, grocery, hotel,
marketplace, order, payment, payout, pharmacy, refund, report, restaurant, seller, taxi, user —
plus `libs/database/src/database.module.ts:33` used by gateway, auth, franchise, location, wallet.

This is not just a default that deployment overrides — it is baked in at every layer:

- `docker-compose.yml:22` — one Postgres container, `POSTGRES_DB: kartseek_db`
- `k8s/databases.yaml:44` — **one** Postgres StatefulSet
- `k8s/databases.yaml:81-85` — `POSTGRES_DB` reads key `DB_NAME` from ConfigMap `kartseek-config`
- `k8s/microservices.yaml` — every one of the 26 Deployments injects that same `DB_NAME`

No entity anywhere declares a `schema:` option, so there is not even schema-level separation.
All **156 entities** live in one flat `public` namespace.

**Consequence:** a schema migration, a lock, a runaway query, a connection-pool exhaustion, or a
restore in any one module hits all ten. No module can be scaled, versioned, or rolled back
independently at the data tier.

---

## 2. Evidence — duplicate table ownership

The same physical table is defined by multiple services, with **conflicting** definitions:

| Table | Defined in | Conflict |
| --- | --- | --- |
| `users` | `api-gateway`, `auth-service`, `user-service` | 3 competing definitions |
| `taxi_rides` | `api-gateway`, `taxi-service` | **Incompatible primary keys** |
| `taxi_drivers`, `taxi_vendors` | `api-gateway`, `taxi-service` | Divergent columns |
| `sellers` | `marketplace-service`, `franchise-service` | Shadow entity |
| `orders` | `api-gateway`, `order-service` | Divergent |
| `restaurants` | `api-gateway`, `restaurant-service` | Divergent |
| `page_layouts` | `api-gateway`, `admin-service` | Duplicate |

The `taxi_rides` conflict is concrete and unsafe:

```ts
// api-gateway/src/entities/taxi.entity.ts:180
@PrimaryGeneratedColumn('uuid') id: string;      // DB-generated uuid

// taxi-service/src/entities/taxi-ride.entity.ts:23
@PrimaryColumn({ length: 50 }) id: string;       // app-assigned varchar(50)
```

### This is a live hazard, not a theoretical one

**17 services run `synchronize: cfg.get('NODE_ENV') !== 'production'`** — i.e. auto-schema-sync is
ON in every non-production environment, against the *shared* database. Each service will `ALTER`
the shared tables to match its own entity definitions on boot. **The resulting schema depends on
service boot order.** `user-service/src/entities/user.entity.ts:1-9` already carries a comment
acknowledging this and asking future authors to keep columns nullable to avoid the collision.

---

## 3. Evidence — direct cross-module database access

Five confirmed violations, ordered by severity.

### 3.1 `franchise-service` — raw SQL against four other modules ⛔ worst offender

`apps/api/apps/franchise-service/src/franchise.service.ts` issues raw SQL directly against tables
owned by Grocery, Restaurant, Pharmacy, and Doctor:

| Line | Tables read/written |
| --- | --- |
| 162, 179 | `grocery_stores` |
| 195-196 | `grocery_orders` JOIN `grocery_stores` |
| 212-213 | `grocery_items` JOIN `grocery_stores` |
| 249, 261 | `restaurants` |
| 277 | `restaurant_orders` JOIN `restaurants` |
| 293-295 | `menu_items` JOIN `menu_categories` JOIN `restaurants` |
| 326, 338, 385 | `pharmacy_stores` |
| 353 | `pharmacy_orders` JOIN `pharmacy_stores` |
| 368-369 | `pharmacy_items` JOIN `pharmacy_stores` |
| 409-412, 424 | `doctors`, `appointments`, `clinics` |
| 439, 453 | `appointments`, `doctors` JOIN `clinics` |
| 573-574 | dynamic `FROM ${orderTable} JOIN ${entityTable}` |
| **600** | **`UPDATE ${table} SET status = $1 ...` — writes other modules' tables** |

Line 600 is the sharpest edge: Franchise **mutates** Grocery/Restaurant/Pharmacy rows directly,
bypassing those modules' validation, domain rules, and events entirely.

### 3.2 `api-gateway` reimplements Taxi against the database ⛔

`apps/api/apps/api-gateway/src/controllers/taxi.controller.ts` is **1,674 lines** containing the
full ride lifecycle — ride creation, status transitions, fare rules, surge, cancellation fees, fare
breakdowns, driver-rating updates, disputes — executed via `EntityManager` directly on the taxi
tables. Measured: **120 direct DB operations, 0 calls to `taxi-service`.**

`taxi-service` exists, is deployed, has its own entities and its own TCP transport — and is
**bypassed entirely** for the customer ride path. Taxi is effectively implemented twice, against one
set of tables, with conflicting schemas.

### 3.3 `seller-service` imports Marketplace entities across the folder boundary ⛔

`apps/api/apps/seller-service/src/seller.module.ts:10-16`

```ts
import { Seller }           from '../../marketplace-service/src/entities/seller.entity';
import { Product }          from '../../marketplace-service/src/entities/product.entity';
import { ProductListing }   from '../../marketplace-service/src/entities/product-listing.entity';
import { MarketplaceOrder } from '../../marketplace-service/src/entities/marketplace-order.entity';
import { Review }           from '../../marketplace-service/src/entities/review.entity';
import { Brand }            from '../../marketplace-service/src/entities/brand.entity';
import { Category }         from '../../marketplace-service/src/entities/category.entity';
```

All seven are registered in seller-service's own TypeORM connection (line 30) and exposed as
repositories (line 34) — so seller-service reads and writes Marketplace's tables directly. It also
runs `synchronize` on them (line 31), meaning **seller-service can alter Marketplace's schema.**
The same imports leak into `seller-kyc.entity.ts:2` and `seller-settings.entity.ts:2`.

### 3.4 `franchise-service` shadow entity on Marketplace's `sellers` table ⛔

`apps/api/apps/franchise-service/src/entities/franchise-seller.entity.ts:3`

```ts
@Entity('sellers')          // ← Marketplace owns this table
export class FranchiseSeller { ... }
```

A second class mapped onto another module's table, with columns the comment at line 26 admits
"might not exist in actual DB yet". Registered with `synchronize` at `franchise.module.ts:28`.

### 3.5 `admin-service` writes the `users` table directly ⚠️

`apps/api/apps/admin-service/src/admin.service.ts:231,251`

```ts
await this.em!.query(`UPDATE users SET status = 'BANNED', banned_reason = $1 WHERE id = $2`, ...);
await this.em!.query(`UPDATE users SET status = 'ACTIVE', banned_reason = NULL WHERE id = $1`, ...);
```

Ban/unban bypasses auth-service and user-service — no token revocation, no domain event.

---

## 4. What is genuinely well isolated

Credit where due — these are real strengths and should be preserved:

- **No service-to-service mesh.** Verified: no module service holds a `ClientProxy` to another
  module service. All inter-module traffic is hub-and-spoke through the gateway. This is the
  single best structural property of the current design.
- **Gateway proxying is correct for 8 of 10 modules.** Grocery (43 sends), Restaurant (115),
  Pharmacy (43), Doctor (36), Hotel (30), Franchise (51), Loyalty (6), Wallet (4) all route through
  `ClientProxy.send()` rather than touching the DB.
- **Shared libraries are infrastructure-only.** `libs/` contains redis, kafka, logger, security,
  guards, storage, region, gdpr — platform concerns, not business logic. No shared domain code
  across modules. (`libs/dto` and `libs/events` are empty stubs.)
- **Web layer is clean.** `apps/web` has no database driver in its dependency tree and talks only
  to the gateway.
- **Per-service deployment scaffolding exists.** 27 `tsconfig.app.json`, 26 k8s Deployments with
  distinct images (`kartseek/<service>:2.0.0`), distinct TCP ports.

---

## 5. Per-module isolation status

Legend: ✅ isolated · ⚠️ partial · ❌ violated

| Module | Own service | Own API | Own tables | Own DB | Nothing reads its data | It reads nothing else | **Verdict** |
| --- | :--: | :--: | :--: | :--: | :--: | :--: | --- |
| **Marketplace** | ✅ | ⚠️ | ✅ | ❌ | ❌ | ✅ | **Not isolated** |
| **Grocery** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | **Not isolated** |
| **Restaurant** | ✅ | ✅ | ⚠️ | ❌ | ❌ | ✅ | **Not isolated** |
| **Pharmacy** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | **Not isolated** |
| **Taxi** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | **Severely violated** |
| **Hotel** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | **Closest to isolated** |
| **Doctor** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | **Not isolated** |
| **Wallet** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | **Near-isolated** |
| **Loyalty** | ✅ | ✅ | n/a | n/a | ✅ | ✅ | **Isolated, but not durable** |
| **Franchise** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | **Not isolated (it is the violator)** |

### Module notes

- **Marketplace** — Own API is ⚠️ because the gateway keeps `bank_offers` and `exchange_offers`
  under direct repository access (`marketplace.controller.ts:38-40`, 6 query sites) instead of
  proxying. Its tables are read by both `seller-service` and `franchise-service`.
- **Restaurant** — Own tables ⚠️: the gateway defines a competing `restaurants` entity.
- **Taxi** — The only module whose primary read/write path lives outside its own service. Two
  conflicting definitions of `taxi_rides`, `taxi_drivers`, `taxi_vendors`.
- **Hotel** — The cleanest module. Franchise's hotel methods (`franchise.service.ts:543-562`)
  return stubs rather than querying hotel tables, so it escaped the raw-SQL coupling.
- **Wallet** — Clean boundaries; only blocked from full isolation by the shared database.
- **Loyalty** — Fully decoupled by accident: it has **no entities at all** and stores balances in
  Redis with a 300s TTL (`loyalty.service.ts:31`). Isolated, but **points are cache-resident and
  not durably persisted** — a separate correctness concern from isolation.
- **Franchise** — Structurally the inverse problem: nothing reads *its* data, but it reads and
  writes four other modules' tables.

---

## 6. Independence assessment against the stated goal

> "every module can be developed, deployed, scaled, and updated independently without impacting the others"

| Capability | Achievable today? | Blocker |
| --- | --- | --- |
| **Developed** independently | ❌ | `seller-service` compiles against Marketplace sources; one shared `package.json` — a dependency bump touches all 27 services |
| **Deployed** independently | ⚠️ | Processes yes; but a Franchise deploy can break Grocery via schema/SQL assumptions. No per-service Dockerfile or `package.json` — every image rebuilds from the same dependency set |
| **Scaled** independently | ❌ | All modules contend for one Postgres instance's connections, locks, and IO |
| **Updated** independently | ❌ | One shared schema with duplicate ownership and `synchronize: true`; a Marketplace column rename breaks Seller and Franchise silently at runtime |

---

## 7. Recommended remediation (in dependency order)

**Phase 0 — Stop the bleeding (low risk, do first)**

1. Set `synchronize: false` everywhere; move all schema change to explicit migrations. There are
   currently only 4 migrations for 156 entities — the schema is effectively defined by whichever
   service booted last.
2. Delete the duplicate entity definitions in `api-gateway` for tables it does not own
   (taxi, restaurants, orders, users, page_layouts, delivery, partner).

**Phase 1 — Eliminate cross-module data access (the isolation-critical work)**

3. `franchise-service` → replace all raw cross-module SQL with `ClientProxy` calls to grocery,
   restaurant, pharmacy, and doctor services; add the corresponding `@MessagePattern` handlers.
   Delete the `FranchiseSeller` shadow entity in favour of a call to marketplace/seller service.
4. `seller-service` → remove the seven cross-boundary entity imports; call marketplace-service.
5. `api-gateway/taxi.controller.ts` → move the 1,674 lines of ride logic into `taxi-service`,
   reduce the controller to a proxy. Reconcile the two `taxi_rides` schemas first (decide which PK
   strategy wins — this needs a data migration).
6. `admin-service` → ban/unban via user-service, so tokens are revoked and events emitted.
7. Move `bank_offers` / `exchange_offers` out of the gateway into marketplace-service.

**Phase 2 — Split the data tier**

8. Choose an isolation strategy (schema-per-module vs database-per-module) and migrate. This is
   only safe *after* Phase 1, because today's cross-module joins would break the moment tables
   move apart — which is precisely the point, but it must be sequenced.
9. Give Loyalty a durable store; Redis-with-TTL is not a system of record for a points balance.

**Phase 3 — Build independence**

10. Per-service `package.json` + Dockerfile so dependency and image lifecycles decouple.
11. Add contract tests at each module boundary and populate the empty `libs/events` with versioned
    event schemas.

---

## 8. Remediation applied (2026-07-27)

Phase 0 and the Franchise/Seller decoupling from §7 have been implemented. Target end-state for
the data tier is **schema-per-module on one Postgres instance** (Phase 2, not yet started).

### 8.1 Phase 0 — stopped the schema thrash

**Auto-sync is off by default.** All 17 services moved from
`synchronize: cfg.get('NODE_ENV') !== 'production'` to
`synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true'`. Enabling it is now a deliberate,
explicit act rather than the default in every non-production environment. `DB_SYNCHRONIZE` is
registered in `apps/api-gateway/src/config/env.validation.ts` and documented in `.env`,
`.env.example` and `.env.docker`.

**Gateway no longer claims tables it does not own.** Deleted `api-gateway/src/entities/order.entity.ts`
and `restaurant.entity.ts` — both were registered on the gateway's DataSource but never queried.
`entities/index.ts` now carries an explicit note about what may not be added back.

`delivery.entity.ts` and `taxi.entity.ts` were **kept**: unlike the other two they are live —
`partner.controller.ts` and `taxi.controller.ts` query them. Removing them is Phase 1 work that
needs the logic moved first, and both are flagged in the barrel file as still violating.

### 8.2 Phase 1 — Franchise decoupled from four modules

Each owning module gained a `FranchiseViewService` that queries **only its own repositories** and
exposes the result over `franchise_*` message patterns:

| Module | New file | Patterns |
| --- | --- | --- |
| Grocery | `grocery-service/src/franchise-view.service.ts` | 6 |
| Restaurant | `restaurant-service/src/franchise-view.service.ts` | 6 |
| Pharmacy | `pharmacy-service/src/franchise-view.service.ts` | 8 |
| Doctor | `doctor-service/src/franchise-view.service.ts` | 6 |
| Marketplace | `marketplace-service/src/franchise-view.service.ts` | 4 |

`franchise.service.ts` was rewritten: every raw cross-module query became a `ClientProxy` call with
a 5s timeout that degrades to a safe default on transport failure. Status changes are now applied
by the module that owns the row, scoped to the franchise, so a franchise can no longer mutate an
entity outside its own estate. The `FranchiseSeller` shadow entity was deleted.

**franchise-service now owns exactly one table: `franchises`.**

### 8.3 What this uncovered — every Franchise vertical was silently broken

The isolation violation was hiding a total feature outage. Because Franchise hand-wrote SQL against
schemas it did not own, it guessed wrong on all five verticals, and each failure was swallowed by a
`catch` that returned zeros — so the dashboards rendered plausible empty data instead of an error.

Verified directly against the running database:

| Module | Franchise's query | Actual schema | Result |
| --- | --- | --- | --- |
| Grocery | `status = 'ACTIVE'` | enum is `PENDING_KYC/APPROVED/SUSPENDED` | `ERROR: invalid input value for enum` |
| Grocery | `SUM(total_products)`, `SUM(revenue)` | neither column exists | error |
| Restaurant | `WHERE franchise_id = $1` | column is `franchiseId` | `ERROR: column "franchise_id" does not exist` |
| Pharmacy | `WHERE franchise_id = $1` | column is `franchiseId` | `ERROR: column "franchise_id" does not exist` |
| Pharmacy | `pi.stock_quantity` | column is `stockLevel` | error |
| Pharmacy | `license_verified = true` | column does not exist | error |
| Doctor | `appointments a JOIN clinics c ON a.clinic_id` | no `clinic_id`; path is `doctorId -> doctors.clinicId` | `ERROR: column a.clinic_id does not exist` |
| Marketplace | `FranchiseSeller` shadow entity | 6 of its columns never existed on `sellers` | error |

Side-by-side on the same data, the old query errors where the new one returns rows:

```text
--- OLD franchise-service query (FranchiseSeller shadow columns) ---
ERROR:  column "verification_status" does not exist
HINT:   Perhaps you meant to reference the column "sellers.verificationStatus".

--- NEW marketplace-owned query ---
 active_sellers | total_sellers
----------------+---------------
              1 |             1
```

Two further latent bugs surfaced while writing the replacements: `menu_items.restaurantId` and
`products.seller_id` are `varchar` while the primary keys they reference are `uuid`. Those joins
now carry an explicit `::text` cast. The underlying type inconsistency is worth a migration.

### 8.4 Phase 1 — Seller folded into Marketplace

seller-service was not a module; it was the seller-facing API of Marketplace, operating on
Marketplace's own tables (55 repository calls across `sellers`, `products`, `product_listings`,
`marketplace_orders`, `reviews`). The gateway already fanned seller traffic across **both**
`SELLER_SERVICE` and `MARKETPLACE_SERVICE` clients, which is the tell.

It was folded in rather than put behind a network hop, which would have added latency and ~25 RPC
contracts without buying any isolation — both halves deploy together either way.

- `seller.service.ts`, `seller.controller.ts` and the spec moved to `marketplace-service/src/seller/`
- `SellerSettings` / `SellerKyc` moved to `marketplace-service/src/entities/`; the seven
  cross-boundary imports collapsed into ordinary local ones
- `apps/seller-service/` deleted; removed from `nest-cli.json`, `package.json`,
  `k8s/microservices-generated.yaml` and `k8s/gen-microservices.sh`
- Gateway's `SELLER_SERVICE` token now resolves to Marketplace's TCP port
- Service count: **27 → 26**

### 8.5 Verification

| Check | Result |
| --- | --- |
| `tsc --noEmit` across the API | clean |
| Full Jest suite | **340 passed / 340**, 28 suites |
| `nest build` — gateway, marketplace, franchise, grocery, restaurant, pharmacy, doctor | all succeed |
| Franchise view queries against the live DB | **25 passed / 25** |
| Cross-service source imports remaining | **none** |
| Raw cross-module SQL in franchise-service | **none** |

`npm run verify:isolation` (in `apps/api`) re-runs every franchise-view query against the live
database — a regression check for exactly the class of bug found in §8.3.

### 8.6 Revised per-module status

| Module | Own API | Own tables | Own DB | Nothing reads its data | Reads nothing else | Verdict |
| --- | :--: | :--: | :--: | :--: | :--: | --- |
| Marketplace | ⚠️ | ✅ | ❌ | ✅ | ✅ | Blocked only by shared DB |
| Grocery | ✅ | ✅ | ❌ | ✅ | ✅ | Blocked only by shared DB |
| Restaurant | ✅ | ⚠️ | ❌ | ✅ | ✅ | Blocked only by shared DB |
| Pharmacy | ✅ | ✅ | ❌ | ✅ | ✅ | Blocked only by shared DB |
| **Taxi** | ❌ | ❌ | ❌ | ❌ | ✅ | **Still severely violated** |
| Hotel | ✅ | ✅ | ❌ | ✅ | ✅ | Blocked only by shared DB |
| Doctor | ✅ | ✅ | ❌ | ✅ | ✅ | Blocked only by shared DB |
| Wallet | ✅ | ✅ | ❌ | ✅ | ✅ | Blocked only by shared DB |
| Loyalty | ✅ | n/a | n/a | ✅ | ✅ | Isolated; **still not durable** |
| Franchise | ✅ | ✅ | ❌ | ✅ | ✅ | **Fixed — was the violator** |

Eight of ten modules are now blocked from isolation by exactly one thing: the shared database.
Marketplace's API stays ⚠️ because the gateway still holds `bank_offers` / `exchange_offers` under
direct repository access; Restaurant's tables stay ⚠️ because Taxi/Delivery entities in the gateway
keep that neighbourhood coupled until §8.7 item 1 lands.

### 8.7 What remains

**Still-violating cross-module access**

1. **Taxi** — `api-gateway/src/controllers/taxi.controller.ts`, 1,674 lines and 120 direct DB
   operations, must move into `taxi-service`. Needs the `taxi_rides` PK conflict resolved first
   (uuid-generated vs app-assigned varchar(50)) — that is a data migration, not just a code move.
2. **Delivery** — `partner.controller.ts` queries `delivery_*` from the gateway.
3. **`admin-service`** — raw `UPDATE users SET status = 'BANNED'` bypasses auth/user-service, so no
   token revocation and no domain event.
4. **`bank_offers` / `exchange_offers`** — marketplace data under direct gateway repository access.

**Remaining duplicate table ownership**

`users` (api-gateway, auth-service, user-service) · `taxi_rides`, `taxi_drivers`, `taxi_vendors`
(api-gateway, taxi-service) · `page_layouts` (api-gateway, admin-service).
Resolved this pass: `sellers`, `orders`, `restaurants`.

**Phase 2 — split the data tier**

Schema-per-module on one Postgres instance: a schema and DB role per module, with `GRANT`s so
cross-module access fails loudly at the database rather than silently succeeding. Only safe now
that Phase 1 has removed the cross-module joins that would otherwise break.

**Phase 3 — build independence**

Per-service `package.json` and Dockerfile; contract tests at each boundary; populate the empty
`libs/events` with versioned event schemas. Also: give Loyalty a durable store — Redis with a
300s TTL is not a system of record for a points balance.

---

## Appendix — how this was verified

- Table ownership: `@Entity(...)` declarations across `apps/api/apps` (156 total)
- Connection targets: `database:` / `DB_NAME` across all service modules + `libs/database`
- Cross-module code coupling: relative imports crossing `apps/*/src` boundaries
- Cross-module SQL: `.query(` call sites with `FROM`/`JOIN`/`UPDATE` table extraction
- Runtime coupling: `ClientsModule.register` / `ClientProxy` / `@MessagePattern` inventory
- Gateway data access: `@InjectRepository` and `EntityManager` injection sites
- Deployment topology: `docker-compose.yml`, `k8s/databases.yaml`, `k8s/microservices.yaml`
