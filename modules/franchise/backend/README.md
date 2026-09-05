# Franchise service

Owns the single `Franchise` entity — registration, region/market assignment, dashboard and
compliance state — and proxies the rest over TCP to marketplace, grocery, restaurant, pharmacy
and doctor's own `franchise_<vertical>_*` handlers for the franchise owner's per-vertical KPI,
listing and status-update screens (taxi and hotel are still stub/cache-backed, since neither
table carries a `franchise_id` yet).

Part of the [franchise vertical](../../README.md). A NestJS service built against `apps/api/libs`; the API gateway reaches it over TCP message patterns.

## Run

```bash
npm run dev -w @kartseek/franchise-backend
```

Needs `npm run infra:up` first. Copy `.env.example` to `.env` to run against a dedicated
database instead of the platform one.

## Test

```bash
npm test -w @kartseek/franchise-backend
npm run type-check -w @kartseek/franchise-backend
```

No integration spec; `franchise.service.spec.ts` covers the service, including its per-vertical
proxy calls, at the unit level.

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3016 | `FRANCHISE_SERVICE_PORT` |
| TCP (message patterns) | 4006 | `FRANCHISE_TCP_PORT` |
<!-- prettier-ignore-end -->

Health: no HTTP health route yet.
Database: `kartseek_franchise`, schema `franchise` (`FRANCHISE_DB_*`).
Image: `kartseek/franchise-service`. Depends on: postgres, redis, kafka.

<!-- registry:end -->

## Layout

No module-specific subfolder beyond the shared skeleton — `franchise.controller.ts` and
`franchise.service.ts` alone implement this vertical's own `franchise.*` patterns and the seven
`franchise.<vertical>.*` proxies into the other module services.
