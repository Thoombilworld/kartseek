# Marketplace Remediation — page-by-page tracker

Scope: the three marketplace surfaces, taken one page-group at a time.

| Surface | Route prefix | Pages |
| --- | --- | --- |
| Customer storefront | `/marketplace/**` | 48 |
| Seller portal | `/seller/marketplace/**` | 65 |
| Super admin | `/admin/marketplace/**` | 95 |

Verification for each page: load it in Chrome as the right role, watch every
network call it makes, and read the rendered text. A page is only "done" when
the calls return 2xx **and** the values on screen match what the API returned.

---

## Harness

Two scripts, kept outside the repo in the session scratchpad:

- `ids.mjs` — logs in as customer / seller / admin against the running gateway
  and writes `ids.json` (tokens + real product/category/brand/seller/order ids).
- `endpoints.mjs` — extracts the path of every `api.get/post/put/...` call in
  `apps/web/src`, substitutes real ids for `${…}` holes, and probes each GET
  with the role that surface uses. This is what produced the inventory below.
- `audit.mjs <surface>` — drives Chrome (`channel: 'chrome'`; the Playwright
  browsers are not installed) over every route of one surface with an injected
  session, recording document status, console errors, failed requests and
  give-away strings (`Invalid Date`, `NaN`, `₹ 0.00`).
- `probe.mjs <surface> <route>` — the same instrumentation for one page, with
  the full request list and rendered text printed. This is the per-page tool.

Two things the harness has to respect, both learned the hard way:

- **Settle on `networkidle`, not a fixed delay.** Client fetches are gated
  behind auth hydration; a 3.5 s wait screenshots a skeleton and reports a
  broken page as healthy (and vice versa).
- **Watch for machine contention.** With ~110 node processes already running,
  a full 95-page sweep starves the dev server and produces 90 s navigation
  timeouts and spurious 503s. Per-page probes are reliable; whole-surface
  sweeps need a quiet machine.

---

## API inventory: 212 client GET calls probed, 39 broken

### Routes the client calls that the gateway does not define (404)

Customer:

- `/marketplace/featured`, `/marketplace/deals` — dead helpers in
  `lib/api/marketplace.ts`; the live routes are `featured-products`,
  `deals-of-the-day` / `deals-of-day` (two spellings exist, also worth merging).
- `/marketplace/returns/:id`, `/marketplace/coupons/:id`,
  `/marketplace/variants/:id`, `/marketplace/recently-viewed/:userId`
- `/marketplace/brands/:id` — no single-brand route; `getBrandById` already
  works around this by filtering the list.
- `/orders/:orderId`, `/search` — bare paths in `lib/api-endpoints.ts`.

Admin:

- `/admin/marketplace/sellers/:id/health`

Seller — 22 routes, the largest single gap. The portal's pages for these
subjects currently have no backend at all:

```
brand/analytics          warehouses               analytics/:type
products/:id/seo         returns/policy           gst/compliance
gst/report               performance/health       advertising
a-plus                   brand/follower-updates   settings/notifications
settings/sessions        settings/2fa             onboarding
developer/api-keys       developer/webhooks       shipping/labels
shipping/manifests       fbk                      translations
```

### 403s that are role-scoping, not defects

`/wallet/:id/balance`, `/wallet/:id/transactions`, `/marketplace/cart/:userId`,
`/marketplace/wishlist/:userId`, `/marketplace/coupons/:id/usage`,
`/marketplace/delivery-assignments*`, `/marketplace/sellers/:id/low-stock-variants`.
These answered 403 because the probe used a customer token on seller/admin
routes. Re-probe with the owning role before treating any of them as a bug.

### Intermittent

`/marketplace/category-list` and `/marketplace/best-sellers` returned 503 on a
cold call and 200 on the retry. The gateway's TCP call to marketplace-service
times out on first hit. Worth a warm-up or a longer first-call timeout — the
customer sees an empty category rail.

---

## Page groups

### ✅ Customer · Orders (list, detail, tracking, invoice)

Every field on these pages was read under a name the gateway does not send.

| Page read | Gateway sends | Symptom |
| --- | --- | --- |
| `createdAt` | `placedAt` | "Ordered on Invalid Date" on all 13 orders |
| `item.qty` | `item.quantity` | "Qty:" with nothing after it |
| `itemTotal` | `subtotal` | Price Details showed ₹0.00 |
| `grandTotal` | `totalAmount` | Total showed ₹0.00 |
| `discountAmount` | `discount` | discount row never rendered |
| `shippingAddress` (object) | `deliveryAddress` (JSON **string**) | four blank address lines |
| lower-case status | `PENDING` etc. | badge rendered blank; filter tabs matched nothing |

Fixed by:

- `lib/marketplace/order-status.ts` — new. One alias table maps every wire
  spelling (order-service SCREAMING_CASE, `libs/common` lower_snake, courier
  `OFD`/`RTO`) onto nine canonical statuses, with labels, badge classes, the
  forward progression, the list's filter buckets, and `paymentStatusLabel`
  (a COD order no longer reports "PENDING" in bold green).
- `lib/utils.ts` — `formatDate`/`formatDateTime` now parse through a guard and
  return `—` instead of the string "Invalid Date"; added `isValidDate`.
- Orders list — real field names, loading skeleton, error state with retry,
  empty state, per-tab counts, per-line totals, ETA. **Removed the seven
  hard-coded `DEMO_ORDERS`** that were swapped in whenever the API failed,
  which made a dead orders API look like a healthy account.
- Order detail — correct money/date/address mapping, shared status module,
  seller name resolved from `sellerId`, wallet deduction row, ETA.
- Invoice — gateway now parses the stored address and resolves the seller name
  (so the invoice names the merchant, not "KartSeek Marketplace"); page shows
  the full order number (was truncated to 8 characters), both order and invoice
  dates, and the buyer's address. Re-laid out on white with print rules — a tax
  invoice is a document people print, and it was previously on a dark gradient.

### ✅ Customer · Catalogue (home, category directory, category, subcategory, search, product)

**The category hierarchy never reached the storefront.** `marketplace.categories`
holds 113 rows, 93 of them with a `parent_id`, under 20 roots — but
`CatalogService.getCategories()` used `find()` on a tree entity, which loads
neither `parent` nor `children`. Every consumer therefore saw a flat list with
no levels and no counts: the home page's header rail and "Shop by Category" grid
rendered all 113 rows as peers ("Mobiles & Tablets" beside "Smartphones",
"Cases & Covers" and "Diapers") under a heading that promised 20.

- `catalog.service.ts` — `getCategories()` now loads the parent relation and
  attaches `parentId`, `parentSlug`, `isSubcategory`, `imageUrl` and a real
  `productCount` per row (counted on `category_id` for roots and
  `subcategory_id` for children, in one grouped query).
- `marketplace.service.ts` — the home feed's `categories` is top-level only,
  falling back to the flat list if no row carries a parent.
- `category-list/page.tsx` — groups the flat list into parents + children
  itself, shows real counts ("Explore 178 products across 20 categories"), and
  **drops the demo-data fallback** for an honest error state. A parent's own
  count already covers its whole subtree, so children are not added back in —
  doing so advertised 24 phones on a category whose own page listed 12.

**Search facets were two hard-coded arrays.** `BRANDS = ['Apple', … 'Dyson']`
and `CATEGORIES_FILTER = ['Mobiles', … 'Appliances']` were rendered identically
on every search: they advertised brands the catalogue may not stock, omitted the
ones it does, and carried no counts, so ticking one could only narrow the list to
nothing. Facets are now derived from the result set with counts, each dimension
computed with its own selection excluded (so ticking "Apple" doesn't collapse the
brand list to Apple alone). A search for "iphone" now offers
`Mobiles & Tablets (3)` / `Apple (2)` / `boAt (1)`.

**Fabricated content removed from the storefront home page:**

- The flash-deal countdown started at a hard-coded `{h: 2, m: 34, s: 18}` on
  every page load and wrapped to 23:59:59 at zero — every visitor was told the
  same sale ended in about two and a half hours, forever. It now takes a real
  end time or renders nothing. (The flash-deals endpoint returns plain catalogue
  rows with no deal window on them, so the chip is currently hidden; it will
  light up on its own when the backend starts scheduling deals.)
- Eight category sections (Electronics, Fashion, Home & Kitchen, Beauty, Sports,
  Toys, Appliances, Recommended) padded their grids with bundled demo products —
  invented inventory with prices and Add to Cart buttons. They now render real
  catalogue rows only; the per-market fetch was widened from 60 to 250 so the
  long tail stops falling off the end.
- A "VERIFIED SELLER" badge was stamped on every injected card unconditionally,
  and the banner above counted all of them as verified. Both now require the
  catalogue to actually report the seller as verified.
- The green "Live catalog — showing real marketplace data" strip was a developer
  diagnostic shown to shoppers.

**Product page:** Q&A read `answersCount`/`upvotes`/`helpfulVotes` where the API
sends `answerCount`/`upvoteCount`/`helpfulCount` (so every question rendered a
bare "answers" with no number), and the seller badge compared `'seller'` against
the `SELLER` enum so it never appeared. The header claimed "12,400 Ratings &
Reviews" directly above a panel reading "No reviews yet" — the aggregate is a
*ratings* tally, now labelled as such, and the empty reviews state reports it
instead of contradicting it.

### ✅ Customer · Purchase path (cart, checkout, payments, coupons, gift cards)

**The delivery fee had three different answers and the customer was charged the
one no page showed.**

| Where | Rule | Result on a ₹152 basket |
| --- | --- | --- |
| Cart page | `subtotal > 49900 ? 0 : 99` | ₹99 (threshold written in paise against a subtotal in rupees, so "free over ₹499" only began at ₹49,900) |
| Checkout page | `const delivery = 0` | ₹0 — "Delivery FREE", always |
| Footer | per-market table, IN = ₹499 | promised free over ₹499 |
| **order-service** | `estimateDeliveryFee` **never read** its own `freeDeliveryThreshold` | **₹60, charged** |

So checkout displayed a total of ₹152 and the customer was billed ₹212.

- `order-service` now applies `freeDeliveryThreshold` (marketplace ₹2,000),
  measured on the subtotal *before* discounts so a coupon cannot cost the
  customer their free delivery. Verified end to end: a ₹152 basket is charged
  ₹60 → ₹212; a ₹115,900 basket is charged ₹0.
- New `lib/marketplace/delivery.ts` mirrors that rule for the storefront; cart,
  checkout and the footer all read it. Cart, checkout and the placed order now
  agree to the rupee.
- The footer's per-market thresholds (QA 100, IN 499, GB 35…) were never backed
  by anything server-side — order-service prices every market off one config.
  The table is kept, unused, for when the backend can price per market.

**Cart:** line items carry no MRP, so `mrp` was set equal to `price` — every
line rendered a struck-through copy of its own price and a "0% off" badge, and
the summary printed "You Save (MRP) − ₹0.00" on every basket. Both now appear
only when there is a real saving. "You're saving ₹99" was a flat constant added
whenever delivery came out free; it now reports the fee actually waived. Line
totals are shown for quantities above one.

**Payments page — was entirely fabricated.** Two saved cards ("HDFC Bank ••••
4521", "ICICI Bank •••• 8903"), two UPI IDs and four linked wallets, all
`useState` literals, with the page making **no API call at all** — under a green
"encrypted and stored securely" banner. Nothing on the platform stores customer
payment instruments; there is no saved-methods endpoint. Rebuilt to show the
methods this market can actually clear (from the localisation registry) and to
state plainly that details are entered at checkout and not retained.

**Gift cards — the send button was a simulation.** `handleSend` called
`setStep('sent')` and nothing else: no payment, no card issued, no email. The
page then displayed "Gift Card Sent! 🎉 A gift card worth ₹2,000 has been sent
to <address>" and promised the recipient a code. The balance checker was fake
too — any code starting `KART-` reported a ₹5,000 balance.

- Balance lookup now calls the real `POST /marketplace/gift-cards/balance`, with
  proper not-found and error states.
- The confirmation screen is **deleted**, not merely unreachable, so it cannot
  be wired back up before issuance exists. Sending now reports that purchase is
  not available yet and that nothing has been charged.
- **Gift card purchase needs building server-side.** The gateway exposes only
  `balance`, `redeem` and a list route — there is no issuance or settlement
  path. This is a real feature gap, not a UI bug.

**Coupons page** was already honest: real API call, correct empty state.

### ✅ Customer · Account (addresses, wishlist, returns, reviews, notifications, buy-again, recently-viewed)

**`GET /marketplace/orders?status=…` ignored the filter entirely.** The gateway
accepted `status`, forwarded it in the message payload, and
`OrderController.msgGetCustomerOrders` dropped it before calling
`getOrdersByCustomer`, which never had a `status` parameter at all. So
`?status=DELIVERED` returned every order the customer had ever placed.

Consequences, both user-visible:

- The **Reviews** page used that filter to decide what could be reviewed. It
  listed all 17 undelivered orders as "Delivered: 2026-08-10" and invited the
  customer to review products that had not shipped.
- The **Returns** page queried the same endpoint, so it offered returns on
  undelivered orders.

`getOrdersByCustomer` now takes a status and filters on it, accepting one value
or a comma-separated list, case-insensitively. Verified: no filter → 17 PENDING;
`DELIVERED` → 0; `PENDING` → 17; `DELIVERED,CANCELLED` → 0. The Reviews page now
correctly reads "Pending (0) · All caught up!".

**Buy Again** priced every product at ₹0.00 and showed "Last ordered:" with
nothing after it — it read `item.unitPrice` and `order.createdAt` where the
snapshot carries `price` and `placedAt`. Same field-name class of bug as the
orders list.

**Returns** printed `Order: 6e7add38-bbf9-4ed4-827d-071f60477429` — the
marketplace projection's uuid, which appears nowhere the customer can look it
up. Only a real `ORD-…` reference is shown now; the raw uuid is dropped rather
than displayed as though it meant something. The return number, which *is* the
customer-facing reference, is unchanged.

Addresses, wishlist, notifications and recently-viewed were already correct:
real API calls, honest empty states.

### ⬜ Remaining

Seller portal: 65 pages — blocked on the 22 missing gateway routes.
Admin: 95 pages.

Known follow-ups deliberately not taken yet:

- Brand promo cards still carry invented discount claims ("Up to 25% Off").
- `/marketplace/featured` and `/marketplace/deals` are still dead helpers in
  `lib/api/marketplace.ts`; nothing calls them, but they should go or be pointed
  at `featured-products` / `deals-of-the-day`.
- The gateway defines both `deals-of-the-day` and `deals-of-day`.
- Product `rating`/`reviewCount` are seeded aggregates with no review rows
  behind them — a seed-data question, not a code one.
- Gift card issuance (above).
- `react-hooks/preserve-manual-memoization` fires across the app, including on
  pages untouched by this work. Codebase-wide, worth its own sweep.
- Returns and Reviews each fetch the same endpoint twice per load (once bare,
  once with a redundant `userId`/`customerId` query the JWT already carries);
  the wishlist page fetches twice as well. Harmless but wasteful.

Known follow-ups deliberately not taken yet:

- Brand promo cards still carry invented discount claims ("Up to 25% Off").
- `/marketplace/featured` and `/marketplace/deals` are still dead helpers in
  `lib/api/marketplace.ts`; nothing calls them, but they should go or be pointed
  at `featured-products` / `deals-of-the-day`.
- The gateway defines both `deals-of-the-day` and `deals-of-day`.
- Product `rating`/`reviewCount` are seeded aggregates with no review rows
  behind them — a seed-data question, not a code one.
