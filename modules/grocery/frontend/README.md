# Grocery zone

Store and category browsing, product search, cart and checkout, order tracking, wishlist and
subscriptions, and delivery-zone/address management for grocery shoppers.

Part of the [grocery vertical](../../README.md). An independently built Next.js application mounted by the shell at `/grocery`; see [frontend zones](../../../docs/architecture/frontend-zones.md).

## Run

```bash
npm run dev -w @kartseek/grocery-frontend
```

Open it through the shell at http://localhost:3000/grocery, not on its own port — links and
assets are emitted under the base path.

## Test

```bash
npm test -w @kartseek/grocery-frontend
npm run type-check -w @kartseek/grocery-frontend
```

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3003 | — |
<!-- prettier-ignore-end -->

Mounted by the shell at `/grocery`; open it through http://localhost:3000/grocery.
Image: `kartseek/grocery-frontend`. Workspace: `@kartseek/grocery-frontend`.

<!-- registry:end -->

## Layout

`store[/slug]`, `category[/slug]`, `brand[/slug]`, `product/[id]`, `search` and `deals` cover
discovery; `cart`, `checkout[/payment,success]`, `orders[/id]` and `zone-check` cover the order
lifecycle; `subscriptions`, `coupons`, `gift-cards`, `wishlist`, `addresses`, `profile`,
`recently-viewed`, `notifications` and `help` round out the account area.
