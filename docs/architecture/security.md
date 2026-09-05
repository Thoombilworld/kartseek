# Security: authentication, authorization and network controls

This document is for anyone adding a gateway route, a WebSocket event, or a
new inter-service call, who needs to know what actually enforces access
control here versus what merely looks like it does. It covers JWT issuance
and rotation, why guards are declared per-controller rather than globally,
the seller approval workflow, the dev auth bypass, rate limiting and
`trust proxy`, CORS/CSP, and how a WebSocket client is authorized to join a
tracking room. Sources: `apps/api/apps/api-gateway/src/guards/`,
`apps/api/libs/security`, `apps/api/libs/guards`,
`apps/api/apps/auth-service/src/jwt.strategy.ts`, the gateway's
`config/env.validation.ts` and `config/cors-origins.ts`, and
`infra/k8s/config.yaml`.

## JWT: access and refresh

`JWT_EXPIRES_IN` defaults to `900` (15 minutes) and `JWT_REFRESH_EXPIRES_IN`
is `7d`, both set in `infra/k8s/config.yaml`. `env.validation.ts` requires
`JWT_SECRET` to be at least 16 characters and rejects an obviously
development-looking value in production; in any other environment, an unset
secret falls back to a hardcoded dev string with a startup warning.

There are two `JwtStrategy` implementations, not one: `apps/api/libs/security`
is the shared one the gateway uses, and `apps/api/apps/auth-service` carries
its own, near-identical copy. The shared one is the more defensive of the
two — it tolerates a missing `role` claim (defaulting to `CUSTOMER` with a
warning instead of rejecting the token) and carries `sellerType`, `type`,
`jti` and `exp` through into `req.user`, which is what lets a guard tell an
access token from a refresh token and lets a single session be revoked by its
own `jti`.

### One refresh slot per user

`AuthController` (`gateway.controller.ts`) stores the refresh token as a
single Redis key per user — `refresh:<userId>`, holding a hash of the current
token, TTL-matched to `JWT_REFRESH_EXPIRES_IN`. Refreshing rotates that same
key. Because there is exactly one key per user rather than one per device or
session, a second login overwrites the first login's stored hash: the first
device's next refresh attempt compares its (now stale) token hash against
what is currently in Redis, fails the match, and is rejected as "Refresh
token has been revoked" — signing in on a new device silently signs the
previous device out the next time it tries to refresh its access token.

## No global auth guard

There is no `APP_GUARD` for authentication or authorization in
`api-gateway.module.ts` — the only global guard registered there is
`ThrottlerGuard`, for rate limiting. Every `JwtAuthGuard`/`RolesGuard`
application is a `@UseGuards(...)` decorator the controller author had to
write. Concretely: **a new route ships open to anonymous callers unless its
controller explicitly declares a guard** — `@ApiBearerAuth('JWT')` only draws
a padlock icon in Swagger UI, it enforces nothing.

This is not hypothetical: `user.controller.ts`'s own top-of-file comment
documents a real incident where thirteen of its fifteen routes had no guard
at all — anyone could read or overwrite any user's profile, saved addresses,
or a partner's wallet balance by id, with no credential of any kind — because
`@ApiBearerAuth` at the class level made it look protected in the docs while
protecting nothing. That controller is fixed now, and the fix was
institutionalized rather than left to code review alone:
`guards/route-exposure.regression.spec.ts` walks every controller looking for
an HTTP route decorator with neither an auth guard nor an explicit
`@Public()`, and fails the build on any it finds — new unguarded routes must
either add a guard or add themselves to that test's public-surface allowlist,
which is deliberately a visible, reviewable change.

## `DEV_AUTH_BYPASS`

`env.validation.ts` defaults `DEV_AUTH_BYPASS` to `'false'`. When explicitly
set to `'true'` outside production, and only for a request carrying no
`Authorization` header, `JwtAuthGuard`
(`apps/api/libs/security/src/jwt-auth.guard.ts`) injects a synthetic
`req.user` rather than rejecting the request. The injected role is
`DEV_AUTH_BYPASS_ROLE`, which itself defaults to `CUSTOMER` — not an admin
role — specifically because an earlier version hardcoded `CUSTOMER`
unconditionally, which made every `@Roles`-protected admin/seller route
answer 403 under the bypass regardless of intent. Whoever sets
`DEV_AUTH_BYPASS_ROLE=SUPER_ADMIN` in a local `.env` has, for that
environment, turned every anonymous request into a super-admin request; that
is a per-environment configuration choice, not the shipped default, and it is
worth checking for before trusting any "it works" observed against a local
gateway.

## Seller approval: two columns, one guard

Approval is not a single flag. `users.status` and `sellers.verificationStatus`
are both consulted, and `SellerApprovalGuard`
(`apps/api/apps/api-gateway/src/guards/seller-approval.guard.ts`) is what
actually enforces the second one at the API layer — its own comment explains
why it had to be added: the seller portal's client-side `SellerRoleGuard`
read `users.status` and hid the UI, but nothing server-side checked
`sellers.verificationStatus`, so an admin suspending or rejecting a seller in
the console changed that column and nothing else — the account kept placing
orders, changing prices and requesting payouts through the API regardless.
`SellerApprovalGuard` denies unless `verificationStatus` is exactly
`'VERIFIED'`, fails closed on an unknown seller, an unreadable status or an
unreachable lookup, exempts `SUPER_ADMIN`/`ADMIN`/`FRANCHISE_ADMIN` so
back-office tooling can still act on a suspended account, and runs after
`SellerOwnershipGuard` — by the time it can deny, the caller has already been
proven to own the seller account, so the 403 reveals nothing new.

## Guard inventory

Per-controller, in `apps/api/apps/api-gateway/src/guards/`:
`roles.guard.ts` (role-based access, reading the `UserRole` type from
`@app/common` through the `@Roles()` decorator — most controllers use this
one; `marketplace.controller.ts` in both the gateway and the marketplace
module backend instead share a second `RolesGuard`/`UserRole` pair from
`@app/guards`), `seller-ownership.guard.ts`, `seller-module.guard.ts`
(keeps a seller inside their own portal's routes), `seller-approval.guard.ts`
(above), `grocery-store-ownership.guard.ts` (ownership resolved from
`grocery_stores.ownerId`, which `SellerOwnershipGuard` cannot see), and
`region.guard.ts`.

In `apps/api/libs/security/src/`: `jwt-auth.guard.ts` and `jwt.strategy.ts`
(authentication); `resource-ownership.guard.ts` (generic IDOR protection —
verifies the authenticated user owns the URL's resource) with its
`resource-owner.decorator.ts`; `region-isolation.guard.ts`;
`csrf-protection.guard.ts` (double-submit cookie plus `X-CSRF-Token` header
for browser clients); `account-lockout.service.ts` (progressive lockout after
repeated failed logins, account-scoped rather than IP-scoped, so it survives
an attacker rotating IPs); `ddos-protection.middleware.ts` and
`ddos-monitor.service.ts`; `ws-ddos.guard.ts` (per-namespace Socket.IO abuse
limits); `pci-compliance.interceptor.ts` and `pci-security.service.ts`;
`pii-encryption.interceptor.ts` and `encryption.service.ts`;
`input-sanitizer.middleware.ts`; `request-id.middleware.ts`; and two guards
meant for service-to-service calls — `api-key.guard.ts` and
`internal-service.guard.ts` (its own comment: the TCP/Redis/NATS transport is
"plaintext and unauthenticated: any process that can reach a service's
message port can invoke any `@MessagePattern` handler," which this guard is
meant to close). **Neither `ApiKeyGuard` nor `InternalServiceGuard` is applied
anywhere** — no controller or microservice handler in `apps/api` references
either — so that plaintext, unauthenticated internal transport is the
platform's actual current state, not a historical risk that has since been
mitigated.

## Rate limiting and `trust proxy`

`ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }])` plus
`{ provide: APP_GUARD, useClass: ThrottlerGuard }` in `api-gateway.module.ts`
is the one global rate limit — 600 requests per 60 seconds, keyed on
`req.ip`. The module's own comment records why it is 600 and not the
originally-chosen 100: a single grocery homepage load makes about eleven API
calls, React StrictMode doubles that in development, and a few page views
exhausted a 100/minute budget and made ordinary browsing answer 429.
A route that needs a tighter limit (credential endpoints, specifically)
overrides it locally with `@Throttle(...)` rather than the platform lowering
the shared bucket.

`req.ip` is only correct because `main.ts` calls
`app.set('trust proxy', trustProxyHops)`, with `trustProxyHops` read from
config (default `1`) — Express otherwise reports the reverse proxy's own
address for every request, which previously made the "600 requests per IP"
limit into 600 requests for the entire platform combined, sharable by any one
noisy client. The value is a hop count, never `true`: trusting every hop
would let a client that can reach the app directly spoof
`X-Forwarded-For` and impersonate someone else's rate-limit bucket or
audit-log entry.

## CORS and CSP

`resolveCorsOrigins()`
(`apps/api/apps/api-gateway/src/config/cors-origins.ts`) builds the gateway's
allowed browser origins from `CORS_ORIGINS` (comma-separated) and
`WEB_APP_URL`, always including a regex that matches `kartseek.com` and any
subdomain of it, and additionally allowing `localhost:3000`/`3001`/`5173`
outside production. This is enforced by the browser, not logged by the
gateway: a missing origin fails the preflight before the request leaves the
page, which surfaces to a user as "we could not reach the sign-in service,"
not as anything visible server-side.

Separately, the web shell (`apps/web/next.config.mjs`) sets its own
`Content-Security-Policy` per response, built by
`buildContentSecurityPolicy()` (`apps/web/config/csp.cjs`) from the
configured `NEXT_PUBLIC_API_URL`/`API_URL` and `NEXT_PUBLIC_WS_URL` — this is
the browser-side header the storefront sends, distinct from the gateway's
CORS allowlist above. The shell deliberately does not send an HSTS header
from `next.config.mjs` (it would apply to `http://localhost:3000` too, and a
browser that honours a year-long HSTS entry for `localhost` makes all local
development on that machine unreachable over plain HTTP); HSTS is instead set
by `proxy.ts`, gated on the request's host actually being `kartseek.com`.

## WebSocket room authorization

Socket.IO connections are JWT-authenticated, but that alone does not mean a
client may join any room it names. `OrderGateway`'s live order-tracking rooms
are protected by `WsTrackingGrantService`
(`apps/api/apps/api-gateway/src/services/ws-tracking-grant.service.ts`): its
own comment documents the incident it exists to prevent — the gateway used
to join a socket to `order:<orderId>` from an id the client supplied with no
check at all, so any signed-in customer could name any order and receive
every `order_status` and `partner_location` broadcast for it, including the
delivery partner's name, phone number and live coordinates. The gateway
itself cannot resolve order ownership (orders live across four different
services, each with its own table), so the fix has the HTTP routes that
already perform an ownership check record that they did —
`WsTrackingGrantService.grant(orderId, userId)` — and the socket join calls
`has(orderId, userId)` before allowing it. A grant expires after three hours,
so a leaked or shared order id does not confer permanent access. The general
pattern this establishes — **a WebSocket room's membership is granted by an
HTTP route's own authorization check, not re-derived at the socket layer** —
is the model for any other gateway that joins a client to a
resource-scoped room.

## Related

- [`messaging.md`](./messaging.md) for the TCP transport this document's
  `InternalServiceGuard` finding applies to, and for the order-tracking room
  this section's grant model protects.
- [`data-ownership.md`](./data-ownership.md) for the `users` table this
  document's JWT/refresh model authenticates against.
- [`services.md`](./services.md) for every service's port and health route.
