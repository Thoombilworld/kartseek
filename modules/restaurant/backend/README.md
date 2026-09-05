# Restaurant service

Owns restaurants, menus, tables, reservations, orders, promotions, reviews and staff — serving customer dine-in/takeaway ordering and table-booking flows, and platform admin oversight of restaurant status (block/suspend) and commission.

Part of the [restaurant vertical](../../README.md). A NestJS service built against `apps/api/libs`; the API gateway reaches it over TCP message patterns and gRPC.

## Run

```bash
npm run dev -w @kartseek/restaurant-backend
```

Needs `npm run infra:up` first. Copy `.env.example` to `.env` to run against a dedicated database instead of the platform one.

## Test

```bash
npm test -w @kartseek/restaurant-backend
npm run type-check -w @kartseek/restaurant-backend
```

No integration spec; `__tests__/restaurant.service.spec.ts` covers the service at the unit level.

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3019 | `RESTAURANT_SERVICE_PORT` |
| TCP (message patterns) | 4018 | `RESTAURANT_TCP_PORT` |
| gRPC | 5005 | `RESTAURANT_GRPC_PORT` |
<!-- prettier-ignore-end -->

Health: `/restaurants/health` (live).
Database: `kartseek_restaurant`, schema `restaurant` (`RESTAURANT_DB_*`).
Image: `kartseek/restaurant-service`. Depends on: postgres, redis, kafka.

<!-- registry:end -->

## Layout

`franchise/` holds `franchise-view.service.ts`, the read-only slice the franchise portal's `franchise_restaurant_*` patterns call into.
