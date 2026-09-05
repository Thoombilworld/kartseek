# Hotel zone

Destination and hotel search, detail and comparison, the multi-step booking checkout, booking
management, reviews and price alerts for hotel guests.

Part of the [hotel vertical](../../README.md). An independently built Next.js application mounted by the shell at `/hotel-booking`; see [frontend zones](../../../docs/architecture/frontend-zones.md).

## Run

```bash
npm run dev -w @kartseek/hotel-frontend
```

Open it through the shell at http://localhost:3000/hotel-booking, not on its own port — links
and assets are emitted under the base path.

## Test

```bash
npm test -w @kartseek/hotel-frontend
npm run type-check -w @kartseek/hotel-frontend
```

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3007 | — |
<!-- prettier-ignore-end -->

Mounted by the shell at `/hotel-booking`; open it through http://localhost:3000/hotel-booking.
Image: `kartseek/hotel-frontend`. Workspace: `@kartseek/hotel-frontend`.

<!-- registry:end -->

## Layout

`search`, `destinations`, `map`, `deals`, `hotel/[hotelId]`, `[slug]` and `compare[/detail]`
cover discovery; `checkout/[hotelId]` starts the booking checkout, with `checkout/guests`,
`checkout/loyalty`, `checkout/offers`, `checkout/payment`, `checkout/processing`,
`checkout/summary` and `checkout/wallet` as sibling steps under `checkout/`, not nested inside
`[hotelId]`; `booking/[bookingId]` (with `confirmation` and `pending`) and
`booking/payment-failed` cover the outcome; `my-bookings`, `review/[bookingId]`, `price-alerts`,
`trip-planner`, `cancellation-policy`, `faq`, `terms`, `profile` and `notifications` round out
the account area.
