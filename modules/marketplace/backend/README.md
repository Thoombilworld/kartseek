# Marketplace service

Owns the product catalogue (products, variants, listings, images, categories, brands), seller
accounts (KYC, bank accounts, staff, promotions, support tickets) and order-adjacent entities —
coupons, gift cards, returns, reviews, wishlists, price alerts — serving customer
catalogue/order flows over gRPC, seller self-service through `SellerController`, platform admin
through `MarketplaceAdminService`, and the franchise portal's read-only view; `HttpSurfaceGuard`
closes the HTTP surface to health probes only.

Part of the [marketplace vertical](../../README.md). A NestJS service built against `apps/api/libs`; the API gateway reaches it over TCP message patterns and gRPC.

## Run

```bash
npm run dev -w @kartseek/marketplace-backend
```

Needs `npm run infra:up` first. Copy `.env.example` to `.env` to run against a dedicated
database instead of the platform one.

## Test

```bash
npm test -w @kartseek/marketplace-backend
npm run type-check -w @kartseek/marketplace-backend
```

`src/__tests__/schema.integration.spec.ts` boots the real `MarketplaceServiceModule` to assert
every entity maps to the `marketplace` schema; run it with `npm run test:integration` once
Postgres, Redis and Kafka are up (`vitest.integration.mts` excludes it from the default
`npm test`).

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3012 | `MARKETPLACE_SERVICE_PORT` |
| TCP (message patterns) | 4002 | `MARKETPLACE_TCP_PORT` |
| gRPC | 5006 | `MARKETPLACE_GRPC_PORT` |
<!-- prettier-ignore-end -->

Health: `/health` (live), `/health/ready` (ready).
Database: `kartseek_marketplace`, schema `marketplace` (`MARKETPLACE_DB_*`).
Image: `kartseek/marketplace-service`. Depends on: postgres, redis, kafka.

<!-- registry:end -->

## Layout

`catalog/` and `transport/grpc.controller.ts` serve the gRPC catalogue (with
`catalog/home-cache.service.ts` caching the homepage); `seller/` is the seller self-service
surface with its own ownership guard; `admin/`, `analytics/`, `brands/` and `fulfillment/` hold
the platform-admin, analytics, brand-follow and delivery-fulfillment services; `franchise/` is
the franchise portal's read-only slice; `transport/http-surface.guard.ts` and
`health.controller.ts` are what the closed HTTP surface actually serves.
