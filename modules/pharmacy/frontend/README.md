# Pharmacy zone

Pharmacy and product browsing, prescription upload and tracking, cart and checkout, and generic-alternative lookups for pharmacy customers.

Part of the [pharmacy vertical](../../README.md). An independently built Next.js application mounted by the shell at `/pharmacy`; see [frontend zones](../../../docs/architecture/frontend-zones.md).

## Run

```bash
npm run dev -w @kartseek/pharmacy-frontend
```

Open it through the shell at http://localhost:3000/pharmacy, not on its own port — links and assets are emitted under the base path.

## Test

```bash
npm test -w @kartseek/pharmacy-frontend
npm run type-check -w @kartseek/pharmacy-frontend
```

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3005 | — |
<!-- prettier-ignore-end -->

Mounted by the shell at `/pharmacy`; open it through http://localhost:3000/pharmacy.
Image: `kartseek/pharmacy-frontend`. Workspace: `@kartseek/pharmacy-frontend`.

<!-- registry:end -->

## Layout

`stores[/id]`, `near-me`, `categories`, `brands`, `product/[id]`, `search`, `offers`, `generic-alternatives` and `how-it-works` cover discovery; `prescription[/upload]`, `prescriptions[/[id]]`, `prescription-upload`, `cart` and `checkout[/coupon,delivery-slot]` cover the order and prescription flow; `orders[/id]`, `wallet`, `wishlist`, `favourites`, `addresses`, `profile`, `notifications`, `compliance`, `support` and `sell-on-kartseek` round out the account and seller-signup area.
