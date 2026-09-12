# Pharmacy service

Owns pharmacy stores, items, categories, promotions, orders, reviews, staff and the prescription
queue — serving customer catalogue/order and prescription-upload flows, per-store seller order
access (`:storeId/seller-orders`), and platform admin approval/suspension and commission
management for stores and pending prescriptions.

Part of the [pharmacy vertical](../../README.md). A NestJS service built against `apps/api/libs`; the API gateway reaches it over TCP message patterns.

## Run

```bash
npm run dev -w @kartseek/pharmacy-backend
```

Needs `npm run infra:up` first. Copy `.env.example` to `.env` to run against a dedicated
database instead of the platform one.

## Test

```bash
npm test -w @kartseek/pharmacy-backend
npm run type-check -w @kartseek/pharmacy-backend
```

No integration spec; `__tests__/pharmacy.service.spec.ts` covers the service at the unit level.

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3020 | `PHARMACY_SERVICE_PORT` |
| TCP (message patterns) | 4010 | `PHARMACY_TCP_PORT` |
<!-- prettier-ignore-end -->

Health: `/health` (live), `/health/ready` (ready).
Database: `kartseek_pharmacy`, schema `pharmacy` (`PHARMACY_DB_*`).
Image: `kartseek/pharmacy-service`. Depends on: postgres, redis, kafka.

<!-- registry:end -->

## Layout

`franchise/` holds `franchise-view.service.ts`, the read-only slice the franchise portal's
`franchise_pharmacy_*` patterns call into.
