# Modules

KARTSEEK's eight verticals — doctor, franchise, grocery, hotel, marketplace,
pharmacy, restaurant, taxi — each live under `modules/<vertical>/` as a
`backend` and a `frontend` workspace pair. Every pair follows the same shape:

- **`backend/`** is a NestJS service (a `module-service` in
  [`services.yaml`](../services.yaml)) built against `apps/api/libs` through
  the shared rspack config, per [D1](../docs/guides/conventions.md#d1--one-skeleton-per-workspace-kind).
  It owns its own database — `kartseek_<vertical>`, configured through
  `<VERTICAL>_DB_*` environment variables and falling back to the shared
  platform database (`kartseek_db`) when those are unset — and is reached by
  the API gateway over TCP `@MessagePattern`s, plus gRPC for the four
  verticals that declare a `grpc` port in the registry (grocery,
  marketplace, restaurant, taxi).
- **`frontend/`** is an independently built and deployed Next.js zone (a
  `web-zone` in the registry) with its own `basePath: /<vertical>`, mounted
  by the shell (`apps/web`) through a rewrite rule. See
  [frontend zones](../docs/architecture/frontend-zones.md) for the shell/zone
  split and the rewrite table.

Each `backend/` and `frontend/` workspace has its own README with the
registry-generated port table for that deployable specifically; this page is
the shared overview.

## The eight verticals

<!-- prettier-ignore -->
| Vertical | Backend workspace | Frontend workspace | What's special |
| --- | --- | --- | --- |
| Doctor | `@kartseek/doctor-backend` | `@kartseek/doctor-frontend` | TCP only. |
| Franchise | `@kartseek/franchise-backend` | `@kartseek/franchise-frontend` | TCP only. No customer-facing zone content beyond the `opportunity`/`opportunity/apply` pages — the rest of the frontend is the franchise owner's own cross-vertical management portal. |
| Grocery | `@kartseek/grocery-backend` | `@kartseek/grocery-frontend` | Serves gRPC alongside TCP. |
| Hotel | `@kartseek/hotel-backend` | `@kartseek/hotel-frontend` | TCP only. The zone's `basePath` is `/hotel-booking`, not `/hotel`; `/hotel-owner` is a separate shell route, not this zone. |
| Marketplace | `@kartseek/marketplace-backend` | `@kartseek/marketplace-frontend` | Serves its catalogue over gRPC, and closes its HTTP surface with `HttpSurfaceGuard` — HTTP answers health probes only, everything else goes over TCP/gRPC. |
| Pharmacy | `@kartseek/pharmacy-backend` | `@kartseek/pharmacy-frontend` | TCP only. |
| Restaurant | `@kartseek/restaurant-backend` | `@kartseek/restaurant-frontend` | Serves gRPC alongside TCP. |
| Taxi | `@kartseek/taxi-backend` | `@kartseek/taxi-frontend` | Serves gRPC alongside TCP. |

## Adding a ninth vertical

A new vertical is a new `modules/<name>/backend` and `modules/<name>/frontend`
workspace pair plus a new entry in `services.yaml` — see
["Where new code goes"](../docs/guides/conventions.md#where-new-code-goes)
in the conventions guide for the exact skeleton each side must follow and
what else the registry entry drives (the port table, this vertical's README
block, and `tests/smoke/boot-all.mjs`).

## Admin and seller screens

A vertical's admin console and seller portal are not part of its zone — they
live in the shell instead, alongside the storefront's own routes, so they can
share the shell's login, OTP, registration and approval-status flows:

- Admin: `apps/web/src/app/admin/<vertical>` (hotel's is
  `admin/hotel-booking`, matching the zone's own base path).
- Seller: `apps/web/src/app/seller/<vertical>`, for the six verticals that
  have a seller-facing portal. Hotel has no `seller/hotel` — its vendor
  console is the separate `hotel-owner` shell area — and franchise has
  neither, since the franchise zone is itself the cross-vertical owner
  console.

See [frontend zones](../docs/architecture/frontend-zones.md) for how these
fit together with the storefront and the three web areas that stay in the
shell rather than becoming a zone: admin, seller and hotel-owner.
