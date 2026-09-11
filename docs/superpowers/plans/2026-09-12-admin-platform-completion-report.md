# KARTSEEK Admin Platform — Completion Report (Plans A + B)

**Date:** 2026-09-12 · **Branch:** `feat/admin-platform-upgrade` (from `fix/system-check-2026-09-06`)
**Scope delivered:** the Master Developer Implementation Task's phases 1–6, 9–11 for the Super Admin and
Regional Admin panels — discovery, gap analysis, architecture, identity/RBAC, regional isolation at the
API and DB layers, the audit trail, DTO validation, and honest consoles for every screen whose API
exists. Phases 7 (module backends), 8 (taxi ops platform), the console design system (Plan E) and the
per-market E2E programme (Plan F) are planned in
`docs/superpowers/plans/2026-09-11-admin-platform-program.md` §3 and are **REMAINING** (see L).

Every statement below is backed by a commit, a spec, or a live probe recorded in the task reports under
`.superpowers/sdd/2026-09-11-admin-identity-rbac-audit-plan/` (Plan B) and
`docs/superpowers/plans/2026-09-11-plan-a-execution-record.md` (Plan A).

---

## A. Existing System Report (what was found — Phase 1)

Full inventory: `docs/audits/2026-09-11-admin-platform-audit.md` (§0–§6).

| Area      | Finding at audit time                                                                                                                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Console   | 250 admin pages in `apps/web/src/app/admin`; role stamped `SUPER_ADMIN` client-side; admin OTP checked in the browser against `NEXT_PUBLIC_ADMIN_OTP \|\| '123456'`; roles/staff/audit pages static or in-memory; header notifications, dashboard activity and the DDoS console fully synthetic |
| Gateway   | 356 admin routes across 11 controllers; market scope on 28 (marketplace promotions only); `DdosAdminController` had `JwtAuthGuard` and no `@Roles` (P0); 0 DTO-validated admin bodies; ~440 routes answer 200 with invented data when a service is down                                         |
| Backends  | 76 RPC commands with no handler (taxi 22, pharmacy 17, restaurant 13, doctor 12, hotel 12); 45 literal-only marketplace routes; three unconnected audit stores (console memory, admin-service Redis list, audit-log-service Mongo that nothing queried)                                         |
| Identity  | Two effective roles (`ADMIN`, `SUPER_ADMIN`); `SUPPORT_AGENT`/`FINANCE_MANAGER`/`PRODUCT_MANAGER` existed in the enum but every admin route refused them; no permission model; refresh rebuilt the user from stale claims; deactivated staff kept working                                       |
| Isolation | `users.region_code`/`region_locked` existed but only the promotions routes honoured them                                                                                                                                                                                                        |

## B. Professional Mistakes Found

Register: `docs/audits/2026-09-11-admin-platform-audit.md` §4 (SEC-01…14) and §5 (BUG-001…026) —
each row now carries its status and the commit that fixed it.

Headline mistakes, all FIXED on this branch: security console open to any authenticated user (SEC-01);
regional admins reading/mutating other markets across users, KYC, sellers, products, taxi fares, grocery
stores (SEC-02, BUG-002…005); fabricated console role and browser-side OTP (SEC-03/04, BUG-006/007);
static roles/staff pages (BUG-008); audit trail fabricated in the console and mutable in Redis
(SEC-05/08, BUG-009/010); zero DTO validation (BUG-017); header/dashboard literals, dead nav items,
duplicate entries (BUG-020/025); seller approval recording the literal string `ADMIN` as the actor
(BUG-010); `sendToMarketplace` packing positional args into an array so approving one seller approved a
different one (Plan A); the taxi settings screen PUT-ing the whole response envelope back and always
saying "Saved!" (B7b); a pricing page posting shapes no route served; an unauthenticated HTTP surface on
the audit service (final review); staff deactivation leaving the access token live (final review).

## C. Features Added

| Feature                                                                                                                                                                                                                                                                                                    | Where                                  | Status        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------- |
| Signed market scope: `regionCode`/`regionLocked` claims → `guards/market-scope.ts` → per-controller `scopeOf` → backend `assertInMarket`; 355 admin routes scoped or declared `@GlobalEntity(reason)`; regression spec pins every route                                                                    | Plan A (44 commits, merged as e1f3e11) | FIXED         |
| Staff roles accepted end to end (`STAFF_ROLES` in `@app/common` and shared-core; console edge + shell)                                                                                                                                                                                                     | B1                                     | FIXED         |
| Server-side MFA for staff (`/auth/login` → challenge JWT → `/auth/mfa/verify`, 5 attempts, code echoed only in development); Kafka consumer delivering the email/SMS                                                                                                                                       | B2                                     | FIXED         |
| `admin.admin_roles` + `users.admin_role_id`; six system roles; `/admin/roles` and `/admin/staff` CRUD (SUPER_ADMIN writes, `staff.view` reads); opt-in seeded super admin                                                                                                                                  | B3                                     | FIXED         |
| `adminPermissions` claim signed at login/refresh, returned in the sign-in body and `/auth/profile`; `RolesGuard` `perm:` keys with wildcard; refresh re-reads the account and refuses inactive users; 39 permission-gated routes (finance, refunds/returns, staff, security, dashboard)                    | B4, B7a                                | FIXED         |
| One audit trail: audit-log-service over TCP (`audit.query`, `audit.record`), Mongo `kartseek_audit`, scoped per market, normalised on write; `GET/POST /admin/audit-logs`, entity view; console audit pages, marketplace audit page and dashboard activity on it; console actions posted with machine keys | B5, B7a                                | FIXED         |
| Validated DTOs for every admin-core (3) and admin-taxi (12) body, reconciled to the real taxi columns with a drift test; ban/whitelist DTOs validated                                                                                                                                                      | B6, B7a                                | FIXED         |
| Security console on the real DDoS routes only (status, trend, endpoints, offenders, bans, whitelist, attack-mode reset) with forbidden / not-connected states                                                                                                                                              | B7a                                    | FIXED         |
| Dashboard on real counters + audit trail; per-market revenue only; no invented module figures                                                                                                                                                                                                              | B7a                                    | FIXED         |
| Per-admin notification inbox (`GET /admin/marketplace/notifications` returns the caller's rows + unread count; fabricated rows deleted)                                                                                                                                                                    | B7a                                    | FIXED         |
| KYC, sellers and the four taxi consoles read the API and post the validated contracts through authenticated clients                                                                                                                                                                                        | B7b                                    | FIXED         |
| Shared honest states `components/admin/api-states.tsx`; `lib/audit-trail.ts`                                                                                                                                                                                                                               | B5/B7a                                 | FIXED         |
| Main-database migration path (`data-source.main.ts`, `migration:*:main`)                                                                                                                                                                                                                                   | final fix wave                         | FIXED (see K) |
| Immediate session revocation on staff deactivation; partner login cannot sign a staff role                                                                                                                                                                                                                 | final fix wave                         | FIXED (see K) |

## D. Features Preserved

No existing working functionality was removed. Evidence: the eight module/gateway test suites that
existed before the branch still pass (K); every admin route the audit counted still exists except the
stubs that returned `{ data: [], total: 0 }` (`GET /admin/marketplace/audit-logs`) and the audit
service's unauthenticated HTTP routes, both replaced by real paths; the console's nav lost only the dead
`/admin/order-disputes` item and a duplicate Loyalty entry. Customer and seller flows are untouched
(`register`, `seller/register`, OTP login for customers keep their behaviour; only staff go through MFA).

## E. API Report

| Item                                | Result                                                                                                                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin routes scoped                 | 355 routes: each resolves a market or declares `@GlobalEntity(reason)`; `guards/admin-market-scope.regression.spec.ts` fails the build for any new unscoped route                                                                                     |
| Permission-gated routes             | 39 with `perm:` keys (finance.view/payouts, orders.view/refund, staff.view/manage, security.manage, dashboard.view, audit.logs)                                                                                                                       |
| New routes                          | `POST /auth/mfa/verify`; `GET/POST/PATCH/DELETE /admin/roles`, `GET/POST/PATCH /admin/staff`; `GET/POST /admin/audit-logs`, `GET /admin/audit-logs/entity/:type/:id`; audit-log-service TCP `audit.query`/`audit.record` on `AUDIT_LOG_TCP_PORT` 4028 |
| Removed                             | `GET /admin/marketplace/audit-logs` stub; audit-log-service HTTP read/write routes (health kept)                                                                                                                                                      |
| Validated bodies                    | 15 admin-core/admin-taxi handlers + `AuditEntryDto` + ban/whitelist DTOs under whitelist + forbidNonWhitelisted; 48+ validation cases; live 400s with exact messages                                                                                  |
| Still missing (REMAINING, Plan C/D) | 76 RPC commands without backend handlers; 45 literal marketplace routes; `GET /admin/taxi/payouts` cannot page; no `sellers/:id/unblock`; `GET /admin/marketplace/reports` stub                                                                       |

## F. Security Report

| Control                                                                                            | Status                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Security console requires an admin role and `security.manage`                                      | FIXED (A1, B4)                                                                                                                                                                                               |
| Staff MFA, server-side, throttled (`@Throttle` 10/min on login and verify), attempt-limited        | FIXED (B2)                                                                                                                                                                                                   |
| Console role and permissions come from the token; the transitional ADMIN wildcard is gone          | FIXED (B1, B4)                                                                                                                                                                                               |
| Permissions enforced at the API (`RolesGuard`), not only in the nav                                | FIXED (B4)                                                                                                                                                                                                   |
| Refresh re-reads the account; inactive users cannot refresh; deactivation revokes the live session | FIXED (B4, final wave)                                                                                                                                                                                       |
| Actor on every audit entry from the token; console cannot author actor or market                   | FIXED (B5)                                                                                                                                                                                                   |
| No secret echoed outside development (`DEV_MFA_ECHO` + `NODE_ENV`)                                 | FIXED (B2)                                                                                                                                                                                                   |
| Mass assignment / undeclared fields refused on admin bodies                                        | FIXED (B6, B7a)                                                                                                                                                                                              |
| Partner login cannot sign a staff role                                                             | FIXED (final wave)                                                                                                                                                                                           |
| Remaining (Plan C)                                                                                 | `/auth/otp/verify` looks up the raw phone against encrypted values; no staff password reset; `RolesGuard` decode fallback ignores token type; last-SUPER_ADMIN self-demotion; MFA attempt counter not atomic |

## G. Regional Isolation Report

Locked admins are confined by a signed claim at three layers: gateway (`scopeOf`/`refuseLockedAdmin`),
backend (`assertInMarket` / market predicates), and the audit trail (`country ∈ {scope, ALL}`). Live proof
scripts: `npm run verify:admin-scope` (apps/api) and `scripts/verification/regional-isolation-authz.mjs`
— see K for the final run. Plan B additions verified live: the QA admin sees only QA audit rows, the IN
admin none of them, `?country=QA` as the IN admin → 403; staff and roles are global entities refused to
locked admins; the personal notification inbox is scoped by user, not market. REMAINING: the security
console has no `refuseLockedAdmin` (only reachable via a custom role granted `security.manage`, Plan C).

## H. Module Independence Report

Plan B touched one module backend (`modules/marketplace/backend`: the admin notification handler and its
scope spec). Every other module (grocery, hotel, taxi, restaurant, doctor, pharmacy) is unchanged since
Plan A and its suite is green (K). The gateway depends on no new module-internal shape: the audit trail
and roles live in platform services (audit-log-service, the main database). REMAINING: the shared
`kartseek_db` and Taxi-in-gateway still block full isolation (Plans C/D).

## I. Taxi Report

Plan A scoped the 38 taxi admin routes and the backend filters by `countryCode`; B6 typed all 12 taxi
admin bodies against the real columns (`distanceRate`, `platformCommissionRate` as a fraction, …) with a
drift test; B7b moved the settings, drivers, payouts and pricing consoles onto the authenticated client
posting exactly those DTOs (config saves no longer blank 20 columns; the Rentals/Intercity tabs say
honestly that no route serves them). REMAINING (Plan D): 22 taxi RPC commands without handlers, six
console pages that 404, `/taxi/admin/*` routes invisible to the regression specs, payouts paging, the
ops platform (vehicles, service areas, surge zones, trip events, disputes, `/admin-fleet` namespace).

## J. Testing Report

Per task: RED→GREEN specs recorded in each `task-N-report.md`; every task reviewed (spec compliance +
code quality) with one to two fix rounds, then a whole-branch review (`final-review.md`) and one fix
wave. Live probes ran on a temporary gateway (`127.0.0.1:3099`) with real tokens (login → MFA →
verify), because `DEV_AUTH_BYPASS=true` makes anonymous requests SUPER_ADMIN locally. The console dev
server on :3000 is wired to the stale fleet gateway on :3001, so page behaviour was proven with render
specs (`renderToStaticMarkup` + mocked clients; RTL is not installed) rather than a browser walkthrough —
this is the one workflow not exercised end to end in a browser (see L).

## K. Build Report

Exit gate on the final tree (HEAD `0a048cb`; suites and builds ran at `ba2fae4`, the last code commit —
`0a048cb` changes only the proof script):

| Suite / build                                                                                            | Result                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apps/api vitest                                                                                          | 677 passed / 63 files                                                                                                                                                                                                                                                           |
| apps/web jest                                                                                            | 610 passed / 28 suites                                                                                                                                                                                                                                                          |
| modules/marketplace vitest                                                                               | 250 passed / 13 files                                                                                                                                                                                                                                                           |
| modules/grocery · hotel · taxi · restaurant · doctor · pharmacy (unchanged since Plan A; run at 414dcfa) | 104 · 25 · 20 · 18 · 16 · 12 passed                                                                                                                                                                                                                                             |
| `nest build --all` (28 projects)                                                                         | exit 0                                                                                                                                                                                                                                                                          |
| 7 module builds                                                                                          | ok                                                                                                                                                                                                                                                                              |
| `next build` (apps/web)                                                                                  | exit 0                                                                                                                                                                                                                                                                          |
| `npm run verify:admin-scope` on a temporary gateway (:3099, real tokens)                                 | 39 passed · 0 failed · 5 skipped (the skips are decision probes whose pharmacy/doctor handlers do not exist yet — Plan C)                                                                                                                                                       |
| `regional-isolation-authz.mjs` (legacy proof)                                                            | 36 / 36                                                                                                                                                                                                                                                                         |
| `migration:show:main`                                                                                    | lists the 5 main-DB migrations only; `UserRegionScope`, `OrderMarket`, `AdminRoles` show as _pending_ because their DDL was applied by hand in dev without ledger rows — all three `up()`s are idempotent, so `npm run migration:run:main` will only record them (not run here) |

Whole-branch review: `final-review.md` — verdict **MERGEABLE** after the fix wave (`195d612`, `e63a8ed`,
`edea039`, `ba2fae4`). Commits: Plan A 44 (merged fast-forward as e1f3e11), Plan B 41 + 5 (fix wave and
proof script); ~155 files changed since the audit base 3e6be86. **No git remote exists**, so the branch is
local; integration is the user's call (merge into `fix/system-check-2026-09-06` as with Plan A, or push
once a remote is configured).

## L. Remaining Issues

**Task status (program checklist, `2026-09-11-admin-platform-program.md`):** A1–A9 PASS/FIXED;
B1–B7 PASS/FIXED; C1–C9, D1–D5, E1–E7, F1–F4 REMAINING (planned, not started).

**Deferred from the whole-branch review** (4 Important + 30 Minor, owners in `final-review.md` §F):
Plan C — service hardening (audit `scope` fails open at the service, unreachable via the gateway;
`getDashboardStats` all-zero counters when the DB is down; nothing writes admin notification rows;
`enableImplicitConversion` coercion on ~25 DTO sites; orphaned `admin_audit_log*` patterns; unqualified
`ALTER TABLE "users"`; unscoped `reactivate_seller` TCP pattern; auth recovery items listed in F).
Plan D — taxi payouts paging, `/taxi/admin/*` blind spot and its second audit trail, two "coming soon"
buttons. Plan E — dead `adminId` on three untyped client methods, hard-coded shell fallbacks,
`classifyApiFailure` and the new 401 text, nav-vs-API key mismatches and unused permission keys,
marketplace notifications/messaging pages describing a platform feed, `AuditLogsScreen` page→page
import, the `GET /admin/marketplace/reports` stub, eight remaining fixture pages (`customers`,
`doctor/reviews`, `marketplace/delivery-partners`, `marketplace/reports/revenue`,
`marketplace/return-policies`, `seller-content`, `two-factor`, `pincode-search-log` context), install RTL.
Accepted with no action: MFA echo also honours `DEV_AUTH_BYPASS`; `@IsIP` without CIDR.
Release note: staff sessions issued before this deploy carry no permission claim for ≤ 1 h.
After the fix wave (minor, deferred): the audit service's `getRecentLogs`/`getLogsByUser`/
`getLogsByResource` are now unreachable dead code (Plan C); the Postman collection still requests the
deleted `/admin/marketplace/audit-logs` (Plan F); clearing the taxi emergency number reports success
and silently keeps the stored value because the column is NOT NULL — mark the field required (Plan D);
the partner-login role filter is a deny-list, so `active_role='SELLER'` is still signable (Plan C).

**Environment limitations:** stale fleet gateway on :3001 (browser walkthroughs blocked until the fleet
is restarted); pre-existing platform bugs found and left in place — `PciSecurityService.redactSensitiveData`
turns every `Date` into `{}` in gateway responses, `/auth/otp/verify` matches the raw phone against
encrypted values, `test/gateway-service-contract.spec.ts` collects lower-case commands only.
