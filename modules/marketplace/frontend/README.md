# Marketplace zone

Category, brand and seller browsing, product discovery (search, deals, recommendations, comparisons), cart and checkout, and post-purchase order, return and review management for marketplace shoppers.

Part of the [marketplace vertical](../../README.md). An independently built Next.js application mounted by the shell at `/marketplace`; see [frontend zones](../../../docs/architecture/frontend-zones.md).

## Run

```bash
npm run dev -w @kartseek/marketplace-frontend
```

Open it through the shell at http://localhost:3000/marketplace, not on its own port — links and assets are emitted under the base path.

## Test

```bash
npm test -w @kartseek/marketplace-frontend
npm run type-check -w @kartseek/marketplace-frontend
```

## Configuration

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Purpose | Port | Environment variable |
| --- | --- | --- |
| HTTP | 3002 | — |
<!-- prettier-ignore-end -->

Mounted by the shell at `/marketplace`; open it through http://localhost:3000/marketplace.
Image: `kartseek/marketplace-frontend`. Workspace: `@kartseek/marketplace-frontend`.

<!-- registry:end -->

## Layout

`category[/id]`, `subcategory[/id]`, `brand[/id]`, `brands[/feed,following]`, `seller[/id]`, `sellers`, `product/[id]`, `search`, `deals`, `flash-deals`, `best-sellers`, `new-arrivals`, `trending`, `recommended`, `compare[/detail]` and `recently-viewed` cover discovery; `cart`, `checkout[/failed,success]`, `orders[/id]`, `returns[/new,[id]]`, `exchange` and `payments` cover the order lifecycle; `addresses[/manage]`, `coupons`, `gift-cards[/balance]`, `offers`, `subscribe`, `wishlist`, `notifications`, `reviews`, `help` and `profile` round out the account area.
