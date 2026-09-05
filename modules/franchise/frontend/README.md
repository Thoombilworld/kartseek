# Franchise zone

Only `opportunity` and `opportunity/apply` are customer-facing (franchise sign-up); every other route is the franchise owner's own cross-vertical management console, not a customer journey.

Part of the [franchise vertical](../../README.md). An independently built Next.js application mounted by the shell at `/franchise`; see [frontend zones](../../../docs/architecture/frontend-zones.md).

## Run

```bash
npm run dev -w @kartseek/franchise-frontend
```

Open it through the shell at http://localhost:3000/franchise, not on its own port — links and assets are emitted under the base path.

## Test

```bash
npm test -w @kartseek/franchise-frontend
npm run type-check -w @kartseek/franchise-frontend
```

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3009 | — |
<!-- prettier-ignore-end -->

Mounted by the shell at `/franchise`; open it through http://localhost:3000/franchise.
Image: `kartseek/franchise-frontend`. Workspace: `@kartseek/franchise-frontend`.

<!-- registry:end -->

## Layout

`opportunity[/apply]` is the public sign-up flow; `login`, `orders`, `payouts`, `staff`, `vendors[/new]`, `zones[/new]`, `commissions[/payout]`, `customers`, `delivery-partners`, `marketing`, `settings`, `support` and `analytics` are the owner console's own screens, plus a `<vertical>/` section for each of doctor, grocery, hotel-booking, marketplace, pharmacy, restaurant and taxi, each with its own `analytics`/`orders`/`settings`-style pages.
