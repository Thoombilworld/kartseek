# Grocery service

Owns stores, warehouses and delivery zones, products (with variants and stock movements), categories, orders, flash deals, reviews and wishlists — serving customer catalogue/search/order flows, per-store seller management (`stores/:id/products`, low-stock, promotions, analytics), the flash-deal admin approval workflow, and the franchise portal's read-only view.

Part of the [grocery vertical](../../README.md). A NestJS service built against `apps/api/libs`; the API gateway reaches it over TCP message patterns and gRPC.

## Run

```bash
npm run dev -w @kartseek/grocery-backend
```

Needs `npm run infra:up` first. Copy `.env.example` to `.env` to run against a dedicated database instead of the platform one.

## Test

```bash
npm test -w @kartseek/grocery-backend
npm run type-check -w @kartseek/grocery-backend
```

`src/__tests__/controller.integration.spec.ts` drives `GroceryController` through supertest with the service layer mocked; `vitest.config.mts` excludes it from `npm test`, citing the live PostgreSQL a real run would need.

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3018 | `GROCERY_SERVICE_PORT` |
| TCP (message patterns) | 4008 | `GROCERY_TCP_PORT` |
| gRPC | 5010 | `GROCERY_GRPC_PORT` |
<!-- prettier-ignore-end -->

Health: `/grocery/health` (live).
Database: `kartseek_grocery`, schema `grocery` (`GROCERY_DB_*`).
Image: `kartseek/grocery-service`. Depends on: postgres, redis, kafka.

<!-- registry:end -->

## Layout

`admin/` holds the platform-admin service, `catalog/` the category-tree builder, `franchise/` the read-only slice the franchise portal's `franchise_grocery_*` patterns call into, and `transport/` the gRPC catalogue controller and its payload types.
