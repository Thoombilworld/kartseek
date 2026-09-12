# KARTSEEK

KARTSEEK is a multi-country super app: marketplace, grocery, restaurant,
pharmacy, doctor appointments, hotel booking, taxi, wallet and loyalty, with
seller, franchise and admin portals, served to web and to three Flutter apps.
It detects the customer's country and city and localises storefronts, currency,
tax and nearby vendors. This repository holds all of it: 26 NestJS services
behind one API gateway, a Next.js shell with eight independently deployed
zones, three Flutter apps, and the infrastructure to run them.

## Repository map

- `apps/api` — the NestJS monorepo: `api-gateway` plus 17 core services
  (auth, user, cart, order, payment, wallet, loyalty, delivery, location,
  search, notification, admin, audit-log, commission, payout, refund,
  report), and their shared `libs/`
- `apps/web` — the Next.js shell; see the port table below for each zone
- `apps/customer`, `apps/partner`, `apps/seller` — the three Flutter apps
- `apps/mcp-server` — an MCP server exposing the platform to AI tooling
- `modules/<vertical>/{backend,frontend}` — the eight verticals (`doctor`,
  `franchise`, `grocery`, `hotel`, `marketplace`, `pharmacy`, `restaurant`,
  `taxi`), each a backend workspace and a Next.js frontend zone
- `packages/shared-core`, `packages/shared-ui` — TypeScript shared across web
  and the module frontends
- `packages/shared-mobile` — the Dart package (`kartseek_shared_mobile`)
  shared across the three Flutter apps
- `packages/vendor/objective_c` — a vendored native dependency
- `infra/{docker,k8s,nginx,postgres}` — container, cluster, proxy and
  database configuration
- `tests/{postman,smoke}` — the Postman collections and the cross-service
  smoke test
- `docs/` — guides, architecture, ADRs, and the product specification
- `scripts/` — the service registry generator and repo-wide checks
- `services.yaml` — the service registry every port table comes from
- `docker-compose.yml` — the local infrastructure stack (Postgres, Redis,
  Kafka, MongoDB, Elasticsearch)

## Prerequisites

- Node 26.5.0 (see `.nvmrc`), npm ≥ 10
- Docker Desktop with Compose v2.20+ (the root compose file uses `include:`)
- Flutter 3.44, only if you're working on `apps/customer`, `apps/partner` or
  `apps/seller`

## Ten-minute local setup

```bash
git clone <url> && cd KARTSEEKAPP
nvm use            # or: nvm use 26.5.0 (nvm-windows)
npm ci
cp .env.example .env && cp apps/api/.env.example apps/api/.env
npm run infra:up
npm run dev
```

Open http://localhost:3000. The API answers at
http://localhost:3001/api/v1/health and documents itself at
http://localhost:3001/api/docs. Full walkthrough, including mobile:
[docs/guides/local-setup.md](docs/guides/local-setup.md).

## Ports

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Name | Kind | Path | HTTP | TCP | gRPC | Database / schema | Health or base path | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `api-gateway` | API gateway | `apps/api/apps/api-gateway` | 3001 | — | — | kartseek_db / public | `/api/v1/health` | postgres, redis, kafka, mongodb |
| `admin-service` | core service | `apps/api/apps/admin-service` | 3027 | 4017 | — | kartseek_db / admin | `/health` | postgres, redis, kafka |
| `audit-log-service` | core service | `apps/api/apps/audit-log-service` | 3028 | — | — | — | `/health` | mongodb, redis, kafka |
| `auth-service` | core service | `apps/api/apps/auth-service` | 3010 | — | 5001 | kartseek_db / public | `/health` | postgres, redis |
| `cart-service` | core service | `apps/api/apps/cart-service` | 3013 | 4003 | — | — | `/health` | redis, kafka |
| `commission-service` | core service | `apps/api/apps/commission-service` | 3030 | 4020 | — | — | `/health` | postgres, redis, kafka |
| `delivery-service` | core service | `apps/api/apps/delivery-service` | 3022 | — | 5008 | — | `/health` | postgres, redis, kafka |
| `location-service` | core service | `apps/api/apps/location-service` | 3023 | 4013 | — | kartseek_db / location | `/health` | postgres, redis |
| `loyalty-service` | core service | `apps/api/apps/loyalty-service` | 3015 | 4005 | — | — | `/health` | redis, kafka |
| `notification-service` | core service | `apps/api/apps/notification-service` | 3026 | — | 5004 | — | `/health` | redis, kafka |
| `order-service` | core service | `apps/api/apps/order-service` | 3014 | 4004 | 5002 | kartseek_db / order | `/health` | postgres, redis, kafka |
| `payment-service` | core service | `apps/api/apps/payment-service` | 3025 | 4026 | 5003 | kartseek_db / payment | `/health` | postgres, redis, kafka |
| `payout-service` | core service | `apps/api/apps/payout-service` | 3031 | 4021 | — | kartseek_db / payout | `/health` | postgres, redis, kafka |
| `refund-service` | core service | `apps/api/apps/refund-service` | 3032 | 4022 | — | — | `/health` | postgres, redis, kafka |
| `report-service` | core service | `apps/api/apps/report-service` | 3034 | 4024 | — | — | `/health` | postgres, redis, kafka |
| `search-service` | core service | `apps/api/apps/search-service` | 3033 | 4023 | — | — | `/health` | redis, kafka, elasticsearch |
| `user-service` | core service | `apps/api/apps/user-service` | 3011 | — | 5009 | kartseek_db / user | `/health` | postgres, redis |
| `wallet-service` | core service | `apps/api/apps/wallet-service` | 3024 | 4014 | — | kartseek_db / wallet | `/health` | postgres, redis, kafka |
| `doctor-service` | module service | `modules/doctor/backend` | 3017 | 4007 | — | kartseek_doctor / doctor | `/health` | postgres, redis, kafka |
| `franchise-service` | module service | `modules/franchise/backend` | 3016 | 4006 | — | kartseek_franchise / franchise | `/health` | postgres, redis, kafka |
| `grocery-service` | module service | `modules/grocery/backend` | 3018 | 4008 | 5010 | kartseek_grocery / grocery | `/health` | postgres, redis, kafka |
| `hotel-service` | module service | `modules/hotel/backend` | 3035 | 4025 | — | kartseek_hotel / hotel | `/health` | postgres, redis, kafka |
| `marketplace-service` | module service | `modules/marketplace/backend` | 3012 | 4002 | 5006 | kartseek_marketplace / marketplace | `/health` | postgres, redis, kafka |
| `pharmacy-service` | module service | `modules/pharmacy/backend` | 3020 | 4010 | — | kartseek_pharmacy / pharmacy | `/health` | postgres, redis, kafka |
| `restaurant-service` | module service | `modules/restaurant/backend` | 3019 | 4018 | 5005 | kartseek_restaurant / restaurant | `/health` | postgres, redis, kafka |
| `taxi-service` | module service | `modules/taxi/backend` | 3021 | 4027 | 5007 | kartseek_taxi / taxi | `/health` | postgres, redis, kafka |
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

## Everyday commands

| Command                     | What it does                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`               | run every workspace's dev server (via turbo)                                                                          |
| `npm run dev:api`           | run only the API monorepo                                                                                             |
| `npm run dev:web`           | run only the Next.js shell                                                                                            |
| `npm run build`             | build every workspace                                                                                                 |
| `npm run test`              | run every workspace's test suite                                                                                      |
| `npm run type-check`        | run `tsc` across every workspace                                                                                      |
| `npm run lint`              | lint every workspace — currently fails for pre-existing reasons, see [docs/guides/testing.md](docs/guides/testing.md) |
| `npm run smoke`             | boot every service and check it answers                                                                               |
| `npm run registry:check`    | fail if code, `.env.example` or k8s config disagree with `services.yaml`                                              |
| `npm run registry:generate` | rewrite the generated docs and README port tables from `services.yaml`                                                |
| `npm run test:scripts`      | run the unit tests for the repo's own tooling scripts                                                                 |
| `npm run infra:up`          | start Postgres, Redis, Kafka, MongoDB, Elasticsearch (Docker Compose)                                                 |
| `npm run infra:down`        | stop the local infrastructure stack                                                                                   |
| `npm run db:seed`           | seed grocery, marketplace, restaurant and pharmacy data                                                               |
| `npm run kafka:topics`      | create the Kafka topics the platform expects                                                                          |

## Where to go next

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the system fits together
- [docs/](docs/README.md) — guides, architecture, decisions, product spec
- [services.yaml](services.yaml) — the service registry every port table comes from
- [docs/guides/conventions.md](docs/guides/conventions.md) — before your first PR
