# Taxi service

Owns vendors, drivers (documents, disciplinary actions), rides, rate cards, payout records and complaints, plus per-country configuration — serving rider ride-matching/booking flows and the JWT+role-gated `admin/vendors` and `admin/drivers` management surface.

Part of the [taxi vertical](../../README.md). A NestJS service built against `apps/api/libs`; the API gateway reaches it over TCP message patterns and gRPC.

## Run

```bash
npm run dev -w @kartseek/taxi-backend
```

Needs `npm run infra:up` first. Copy `.env.example` to `.env` to run against a dedicated database instead of the platform one.

## Test

```bash
npm test -w @kartseek/taxi-backend
npm run type-check -w @kartseek/taxi-backend
```

No integration spec; `__tests__/taxi.service.spec.ts` covers the service at the unit level.

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3021 | `TAXI_SERVICE_PORT` |
| TCP (message patterns) | 4027 | `TAXI_TCP_PORT` |
| gRPC | 5007 | `TAXI_GRPC_PORT` |
<!-- prettier-ignore-end -->

Health: `/taxi/health` (live).
Database: `kartseek_taxi`, schema `taxi` (`TAXI_DB_*`).
Image: `kartseek/taxi-service`. Depends on: postgres, redis, kafka.

<!-- registry:end -->

## Layout

`services/` holds the eight domain services split out of the controller: ride matching, fare calculation, driver dispatch and onboarding, vendor management, payouts, complaints and per-country rate configuration.
