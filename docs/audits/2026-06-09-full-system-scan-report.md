# KARTSEEK — Full System Scan Report

**Date:** 2026-06-09
**Sprint:** Emergency Stabilization
**Status:** SCAN COMPLETE

---

## 1. Detected Applications

| App | Location | Type | Status |
| --- | --- | --- | --- |
| Customer Web | `apps/web` | Next.js 15 | ✅ Running (dev server active) |
| API Gateway | `apps/api` | NestJS monorepo | ⚠️ Configured (SKIP_DB/SKIP_REDIS/SKIP_KAFKA=true) |
| Customer Mobile | `apps/mobile` (main_customer.dart) | Flutter | ✅ Running on emulator |
| Partner Mobile | `apps/mobile` (main_partner.dart) | Flutter | ✅ Entry point exists |

## 2. Detected Backend Microservices (26 total)

All located under `apps/api/apps/`:

| Service | Directory | Has Source |
| --- | --- | --- |
| API Gateway | api-gateway | ✅ |
| Auth Service | auth-service | ✅ |
| User Service | user-service | ✅ |
| Marketplace Service | marketplace-service | ✅ |
| Grocery Service | grocery-service | ✅ |
| Restaurant Service | restaurant-service | ✅ |
| Pharmacy Service | pharmacy-service | ✅ |
| Doctor Service | doctor-service | ✅ |
| Taxi Service | taxi-service | ✅ |
| Delivery Service | delivery-service | ✅ |
| Order Service | order-service | ✅ |
| Cart Service | cart-service | ✅ |
| Payment Service | payment-service | ✅ |
| Wallet Service | wallet-service | ✅ |
| Loyalty Service | loyalty-service | ✅ |
| Notification Service | notification-service | ✅ |
| Location Service | location-service | ✅ |
| Search Service | search-service | ✅ |
| Seller Service | seller-service | ✅ |
| Commission Service | commission-service | ✅ |
| Payout Service | payout-service | ✅ |
| Refund Service | refund-service | ✅ |
| Report Service | report-service | ✅ |
| Admin Service | admin-service | ✅ |
| Audit Log Service | audit-log-service | ✅ |
| Franchise Service | franchise-service | ✅ |

## 3. Detected Shared Libraries (14 total)

All under `apps/api/libs/`: common, database, decorators, dto, events, gdpr, grpc, guards, kafka, logger, redis, region, security, validators

## 4. Web Route Inventory

### Customer Routes (20 route groups)

| Route | Has page.tsx | Status |
| --- | --- | --- |
| `/` | ✅ | Working |
| `/auth/login` | ✅ | NEW - just created |
| `/auth/signup` | ✅ | NEW - just created |
| `/marketplace` | ✅ | Working |
| `/grocery` | ✅ | Working |
| `/restaurant` | ✅ | Working |
| `/pharmacy` | ✅ | Working |
| `/doctor` | ✅ | Working |
| `/taxi` | ✅ | Working |
| `/cart` | ✅ | Working |
| `/checkout` | ✅ | Working (now protected) |
| `/orders` | ✅ | Working |
| `/notifications` | ✅ | Working |
| `/search` | ✅ | Working |
| `/wishlist` | ✅ | Working |
| `/support` | ✅ | Working |
| `/profile` | ✅ | Working (account layout) |
| `/profile/addresses` | ✅ | Working |
| `/profile/security` | ✅ | Working |
| `/loyalty` | ✅ | Working (account layout) |
| `/wallet` | ✅ | Working (account layout) |

### Admin Routes (27 subdirectories)

All under `apps/web/src/app/admin/` — comprehensive admin panel with layout.

### Portal Routes

- **Seller**: 10 sub-sections (marketplace, grocery, pharmacy, restaurant, taxi, delivery, etc.)
- **Franchise**: 4 sub-sections (commissions, restaurant, vendors, zones)

## 5. Critical Issues Found

### 🔴 HIGH — Route Conflicts

- `app/profile/orders/` exists OUTSIDE the `(account)` route group
- `app/profile/restaurant-orders/` exists OUTSIDE the `(account)` route group
- These may shadow or conflict with `(account)/profile/` routes

### 🔴 HIGH — SiteHeader Not Integrated

- `components/site-header.tsx` created but never imported into any layout
- Homepage (`page.tsx`) has its own inline header (not auth-aware)
- Account layout has its own simplified header

### 🟡 MEDIUM — useSearchParams Without Suspense

- 5 files use `useSearchParams()` without a Suspense boundary:
  - `auth/login/page.tsx`
  - `taxi/search/page.tsx`
  - `restaurant/takeaway/success/page.tsx`
  - `marketplace/search/page.tsx`
  - `admin/content/edit/page.tsx`
- This causes build warnings/errors in Next.js 15+

### 🟡 MEDIUM — Missing Route Pages

- `/privacy` — linked from footer but no page exists
- `/wallet` top-level — links from header go to `/wallet` which maps to `(account)/wallet/`

### 🟢 LOW — Cosmetic

- `dummy_objective_c/` dir at root (workaround artifact)
- `migrate_apps.py` at root (one-time script, should be in scripts/)

## 6. Security Check

| Check | Status |
| --- | --- |
| `.env` in `.gitignore` | ✅ Properly excluded |
| `.env.example` exists | ✅ Template provided |
| JWT secret | ✅ Dev-only placeholder with "change_in_production" note |
| No production secrets | ✅ All values are local dev defaults |
| `*.pem` in `.gitignore` | ✅ |
| No hardcoded API keys in source | ✅ Verified |

## 7. Flutter App Structure

| Component | Status |
| --- | --- |
| Customer entry | `main_customer.dart` ✅ |
| Partner entry | `main_partner.dart` ✅ |
| Core module | `lib/core/` ✅ |
| Feature modules (16) | auth, cart, checkout, doctor, grocery, home, marketplace, orders, partner, pharmacy, profile, restaurant, returns, support, taxi, wishlist |

## 8. Build Blockers

- No critical TypeScript build errors observed in running dev server
- Dev server has been running for 10+ hours without crash
- Flutter customer app running on emulator for 12+ hours

## 9. Missing Directories

| Expected | Status |
| --- | --- |
| `services/` (standalone) | ❌ Not present — all services in `apps/api/apps/` (NestJS monorepo pattern) — this is intentional |
| `packages/` (shared npm) | ❌ Not present — `design-system/` fills this role |
| `infrastructure/` | ❌ Not present — `docker-compose.yml` at root handles infra |

---

**Next Steps:** Fix route conflicts, integrate SiteHeader, add Suspense boundaries, create missing pages.
