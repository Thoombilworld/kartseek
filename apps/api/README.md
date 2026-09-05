# KARTSEEK API

## What this is

The NestJS monorepo behind KARTSEEK: `apps/api-gateway` plus the 17 core
services under `apps/api/apps` (auth, user, cart, order, payment, wallet,
loyalty, delivery, location, search, notification, admin, audit-log,
commission, payout, refund, report), the 15 shared libraries under
`apps/api/libs` that they import as `@app/<name>`, the platform's protobuf
contracts (`apps/api/proto`), its migrations and seed scripts, and the
`data-source.ts` the migration CLI runs against. The eight module backends
(marketplace, grocery, restaurant, pharmacy, doctor, hotel, taxi, franchise)
are their own npm workspaces under `modules/*/backend`, but they build
against these same `libs/` through the shared alias list in
`apps/api/rspack.config.js`, so a change here can reach them too. See
[`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) for how a request actually
travels from a client to one of these services and back.

## Run

- **Everything in this workspace** — `npm run dev:api` from the repository
  root (`turbo run dev --filter=kartseek-api`), which runs this workspace's
  own `dev` script, `dev:all`: the gateway plus all 17 core services,
  concurrently. The eight module backends are separate workspaces and are
  not part of `dev:all` — the root `npm run dev` starts those too. See
  [`../../docs/guides/running-services.md`](../../docs/guides/running-services.md)
  for the full process list and the narrower `dev:marketplace` script.
- **One service on its own** — `npm run start:<name> -w kartseek-api` (for
  example `npm run start:order`), which runs `nest start <project> --watch`
  directly.
- **Production** — `npm run build` first, then from `apps/api`,
  `node dist/apps/<project>/main.js` (for example
  `node dist/apps/api-gateway/main.js`).
- **Database and maintenance scripts** — `npm run migration:show`,
  `migration:run`, `migration:revert` and `migration:baseline` run the
  TypeORM CLI against `data-source.ts`; `npm run db:split` previews or
  applies the per-module Postgres split; `npm run verify:isolation` checks
  the franchise-service data boundary. See
  [`../../docs/guides/database-migrations.md`](../../docs/guides/database-migrations.md)
  and [`../../docs/guides/seeding.md`](../../docs/guides/seeding.md).

## Test

- `npm test -w kartseek-api` — unit tests (Vitest, `vitest run`).
- `npm run test:e2e -w kartseek-api` — the two specs that need Postgres,
  Redis, Kafka and the gateway itself reachable.
- `npm run type-check -w kartseek-api` — `tsc --noEmit` followed by the
  type-import gate (`check:type-imports`); `tsc` alone is not the gate.

Integration specs, the gateway↔service contract check, the boot smoke test,
and the Postman collections are covered in
[`../../docs/guides/testing.md`](../../docs/guides/testing.md).

## Configuration

Copy `.env.example` to `.env` (see
[`../../docs/guides/local-setup.md`](../../docs/guides/local-setup.md)). The
file is grouped by concern:

- **Application** — `NODE_ENV`, `PORT`, `SKIP_DB` (and `SKIP_KAFKA`/
  `SKIP_REDIS`, validated the same way).
- **Trading markets** — `ACTIVE_REGIONS`, which must agree with the web
  client's `NEXT_PUBLIC_ACTIVE_REGIONS`.
- **Reverse proxy and CORS** — `TRUST_PROXY_HOPS`, `WEB_APP_URL`,
  `CORS_ORIGINS`.
- **Database (Postgres)** — `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/
  `DB_NAME`, `DB_SYNCHRONIZE` (keep `false`), `DB_POOL_SIZE`,
  `DB_POOL_TIMEOUT_MS`, and a commented-out block of per-module
  `<MODULE>_DB_*` variables for the database-per-service opt-in.
- **Redis** — `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`.
- **Kafka** — `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`.
- **JWT / auth** — `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`,
  `JWT_REFRESH_EXPIRES_IN`, `ALLOW_WS_DEV_AUTH`.
- **Per-service TCP ports** — one `<NAME>_TCP_PORT` variable per deployable
  that has a TCP client, named in `services.yaml` and listed in the registry
  block below; never hardcode a port anywhere else.
- **Payments, storage, email/SMS, push** — `RAZORPAY_*`/`STRIPE_*`,
  `STORAGE_PROVIDER` plus its provider-specific block, `SMTP_*`/`TWILIO_*`,
  `FIREBASE_SERVICE_ACCOUNT_KEY`.

Never commit a real value — see
[`../../docs/guides/secrets.md`](../../docs/guides/secrets.md).

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Name | Kind | Path | HTTP | TCP | gRPC | Database / schema | Health or base path | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `api-gateway` | API gateway | `apps/api/apps/api-gateway` | 3001 | — | — | kartseek_db / public | `/api/v1/health` | postgres, redis, kafka, mongodb |
| `admin-service` | core service | `apps/api/apps/admin-service` | 3027 | 4017 | — | kartseek_db / admin | `/admin/health` | postgres, redis, kafka |
| `audit-log-service` | core service | `apps/api/apps/audit-log-service` | 3028 | — | — | — | `/audit-logs/health` | mongodb, redis, kafka |
| `auth-service` | core service | `apps/api/apps/auth-service` | 3010 | — | 5001 | kartseek_db / public | `/health` | postgres |
| `cart-service` | core service | `apps/api/apps/cart-service` | 3013 | 4003 | — | — | `/cart/health` | redis, kafka |
| `commission-service` | core service | `apps/api/apps/commission-service` | 3030 | 4020 | — | kartseek_db / commission | `/commission/health` | postgres, redis, kafka |
| `delivery-service` | core service | `apps/api/apps/delivery-service` | 3022 | — | 5008 | kartseek_db / delivery | `/delivery/health` | postgres, redis, kafka |
| `location-service` | core service | `apps/api/apps/location-service` | 3023 | 4013 | — | kartseek_db / location | `/location/health` | postgres, redis |
| `loyalty-service` | core service | `apps/api/apps/loyalty-service` | 3015 | 4005 | — | — | `/loyalty/health` | redis, kafka |
| `notification-service` | core service | `apps/api/apps/notification-service` | 3026 | — | 5004 | — | `/notifications/health` | redis, kafka |
| `order-service` | core service | `apps/api/apps/order-service` | 3014 | 4004 | 5002 | kartseek_db / order | `/health` | postgres, redis, kafka |
| `payment-service` | core service | `apps/api/apps/payment-service` | 3025 | 4026 | 5003 | kartseek_db / payment | `/health` | postgres, redis, kafka |
| `payout-service` | core service | `apps/api/apps/payout-service` | 3031 | 4021 | — | kartseek_db / payout | `/payouts/health` | postgres, redis, kafka |
| `refund-service` | core service | `apps/api/apps/refund-service` | 3032 | 4022 | — | kartseek_db / refund | `/refunds/health` | postgres, redis, kafka |
| `report-service` | core service | `apps/api/apps/report-service` | 3034 | 4024 | — | kartseek_db / report | `/reports/health` | postgres, redis, kafka |
| `search-service` | core service | `apps/api/apps/search-service` | 3033 | 4023 | — | — | `/search/health` | redis, kafka, elasticsearch |
| `user-service` | core service | `apps/api/apps/user-service` | 3011 | — | 5009 | kartseek_db / user | `—` | postgres, redis |
| `wallet-service` | core service | `apps/api/apps/wallet-service` | 3024 | 4014 | — | kartseek_db / wallet | `/wallet/health` | postgres, redis, kafka |
| `doctor-service` | module service | `modules/doctor/backend` | 3017 | 4007 | — | kartseek_doctor / doctor | `/doctors/health` | postgres, redis, kafka |
| `franchise-service` | module service | `modules/franchise/backend` | 3016 | 4006 | — | kartseek_franchise / franchise | `—` | postgres, redis, kafka |
| `grocery-service` | module service | `modules/grocery/backend` | 3018 | 4008 | 5010 | kartseek_grocery / grocery | `/grocery/health` | postgres, redis, kafka |
| `hotel-service` | module service | `modules/hotel/backend` | 3035 | 4025 | — | kartseek_hotel / hotel | `/hotels/health` | postgres, redis, kafka |
| `marketplace-service` | module service | `modules/marketplace/backend` | 3012 | 4002 | 5006 | kartseek_marketplace / marketplace | `/health` | postgres, redis, kafka |
| `pharmacy-service` | module service | `modules/pharmacy/backend` | 3020 | 4010 | — | kartseek_pharmacy / pharmacy | `/pharmacy/health` | postgres, redis, kafka |
| `restaurant-service` | module service | `modules/restaurant/backend` | 3019 | 4018 | 5005 | kartseek_restaurant / restaurant | `/restaurants/health` | postgres, redis, kafka |
| `taxi-service` | module service | `modules/taxi/backend` | 3021 | 4027 | 5007 | kartseek_taxi / taxi | `/taxi/health` | postgres, redis, kafka |
| `web` | web shell | `apps/web` | 3000 | — | — | — | `/` | — |
| `marketplace-frontend` | web zone | `modules/marketplace/frontend` | 3002 | — | — | — | `/marketplace` | — |
| `grocery-frontend` | web zone | `modules/grocery/frontend` | 3003 | — | — | — | `/grocery` | — |
| `restaurant-frontend` | web zone | `modules/restaurant/frontend` | 3004 | — | — | — | `/restaurant` | — |
| `pharmacy-frontend` | web zone | `modules/pharmacy/frontend` | 3005 | — | — | — | `/pharmacy` | — |
| `doctor-frontend` | web zone | `modules/doctor/frontend` | 3006 | — | — | — | `/doctor` | — |
| `hotel-frontend` | web zone | `modules/hotel/frontend` | 3007 | — | — | — | `/hotel-booking` | — |
| `taxi-frontend` | web zone | `modules/taxi/frontend` | 3008 | — | — | — | `/taxi` | — |
| `franchise-frontend` | web zone | `modules/franchise/frontend` | 3009 | — | — | — | `/franchise` | — |
<!-- prettier-ignore-end -->
<!-- registry:end -->

## Layout

```
apps/api/
├── apps/<name>-service/   # one Nest deployable per directory
├── libs/<name>/           # shared code, imported as @app/<name>
├── proto/                 # gRPC contracts
├── migrations/            # hand-written TypeORM migrations
├── seeds/                 # one-off seed data used by scripts/seed
├── scripts/
│   ├── seed/              # demo-data seed scripts
│   └── maintenance/       # one-off backfills and repairs
└── test/                  # e2e specs and the gateway↔service contract check
```

Every Nest deployable follows the same skeleton — root module named
`<deployable>.module.ts`, `dto/`, `entities/` where it owns tables — recorded
as decision D1/D2 in
[`../../docs/guides/conventions.md`](../../docs/guides/conventions.md).
`order-service` is a representative example:
`apps/api/apps/order-service/src/order-service.module.ts` is the root
module, alongside `order.controller.ts`, `order.service.ts`, `dto/` and
`entities/`.

The 15 shared libraries and what each provides are listed in
[`../../ARCHITECTURE.md`](../../ARCHITECTURE.md#5-shared-backend-libraries) —
adding a new one means registering it in five places, not one; see the same
section and [ADR 0002](../../docs/adr/0002-nest-monorepo-on-rspack.md).
