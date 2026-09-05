# Hotel service

Owns hotels, rooms, seasonal pricing, bookings, guests, staff and payouts — serving customer search/booking/review flows through `HotelController`, hotel-owner management through `OwnerController`, platform admin oversight through `AdminController`, and payment-provider callbacks through `WebhookController`.

Part of the [hotel vertical](../../README.md). A NestJS service built against `apps/api/libs`; the API gateway reaches it over TCP message patterns.

## Run

```bash
npm run dev -w @kartseek/hotel-backend
```

Needs `npm run infra:up` first. Copy `.env.example` to `.env` to run against a dedicated database instead of the platform one.

## Test

```bash
npm test -w @kartseek/hotel-backend
npm run type-check -w @kartseek/hotel-backend
```

No integration spec; `__tests__/hotel.service.spec.ts` covers the service at the unit level.

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3035 | `HOTEL_SERVICE_PORT` |
| TCP (message patterns) | 4025 | `HOTEL_TCP_PORT` |
<!-- prettier-ignore-end -->

Health: `/hotels/health` (live).
Database: `kartseek_hotel`, schema `hotel` (`HOTEL_DB_*`).
Image: `kartseek/hotel-service`. Depends on: postgres, redis, kafka.

<!-- registry:end -->

## Layout

`admin/` holds the platform-admin controller, `owner/` the hotel-owner management controller, and `webhooks/` the payment-provider webhook handler.
