# Restaurant zone

Restaurant and cuisine browsing, item detail, dine-in and takeaway ordering, table booking, and
reviews/loyalty for restaurant customers.

Part of the [restaurant vertical](../../README.md). An independently built Next.js application mounted by the shell at `/restaurant`; see [frontend zones](../../../docs/architecture/frontend-zones.md).

## Run

```bash
npm run dev -w @kartseek/restaurant-frontend
```

Open it through the shell at http://localhost:3000/restaurant, not on its own port — links and
assets are emitted under the base path.

## Test

```bash
npm test -w @kartseek/restaurant-frontend
npm run type-check -w @kartseek/restaurant-frontend
```

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3004 | — |
<!-- prettier-ignore-end -->

Mounted by the shell at `/restaurant`; open it through http://localhost:3000/restaurant.
Image: `kartseek/restaurant-frontend`. Workspace: `@kartseek/restaurant-frontend`.

<!-- registry:end -->

## Layout

`list`, `cuisine/[id]`, `item/[slug]`, `[slug]` and `search` cover discovery;
`dine-in[/checkout,success,track]`, `takeaway[/checkout,success,track]`,
`table-booking/[bookingId]` and `checkout` cover ordering; `orders[/id]`, `review/[orderId]`,
`favorites`, `loyalty`, `coupons`, `gift-cards`, `offers`, `refer`, `addresses`, `profile` and
`help` round out the account area.
