# Seller Portal production upgrade — design

Date: 2026-09-13. Branch: `feat/admin-platform-upgrade`. Audit:
`docs/audits/2026-09-13-seller-portal-audit.md` (findings SP-001…028).
Session owner: kartseekapp-3b. Peer rulings honoured: a8's admin-program
rules (identity from the JWT subject, `requireMarket`/`assertInMarket`,
shrink-only census, declared Kafka topics, one workspace per commit,
migrations 1786503500000–1786503599999 through the module runner on both
`kartseek_db` and `kartseek_marketplace`).

## 1. Goal and non-goals

Goal: the marketplace seller lifecycle — registration, approval, catalogue,
inventory, orders, returns, settlement, payouts, staff, real-time — works as
one authorised, market-scoped system with the customer storefront, the
regional admin and the super admin, on real data, with server-side rules,
tests and an end-to-end proof in two markets.

Non-goals (recorded, not built): advertising platform, A+ content, FBK
fulfilment, developer API keys/webhooks, translations workbench, pricing
intelligence, growth insights, shipping labels/manifests, warehouses. They
have no backend today; the portal stops advertising them as features
(sidebar "Coming soon" group, honest page state) rather than inventing one.

## 2. Architecture decisions

### 2.1 Identity and authorisation (T1, T5)

- **The seller id is never taken from the request body.** Gateway handlers
  build the RPC payload as `{ ...dto, sellerId, <ids from params> }` — the
  authorised identity always wins. A regression spec parses both seller
  controllers and fails on any `{ sellerId, ...` spread.
- **`SELLER_PARAMS = ['sellerId']`.** The `/seller/*` surface derives the
  seller from the token via `resolveSellerId(req)`; `/seller/:id/wallet` is
  removed (the `/sellers/:sellerId/wallet` route is the one the portal
  calls); listing routes use `:listingId`. `PUT /seller/orders/:id/status`
  is deleted — the four owned transitions are the only status writes.
- **The seller's market is server truth.** `SellerOwnershipGuard` already
  resolves `{ ownerId, regionCode }` for the seller; it now stamps
  `req.seller = { id, regionCode, role }`. Controllers read
  `sellerMarket(req)`; `requestRegion(req)` is no longer called on seller
  routes. The backend keeps taking `countryCode` in payloads (unchanged
  contract) but the gateway sends the seller's own.
- **Seller RBAC.** `seller_staff` gains `user_id` (uuid, unique per seller),
  `permissions` (text[] — derived from role at write time, editable later)
  and `invited_at/accepted_at`. Roles and their permission sets:

  | role                                 | permissions                                                                                                                  |
  | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
  | owner (implicit: `sellers.owner_id`) | `*`                                                                                                                          |
  | admin                                | everything except `finance.payout`, `finance.bank`, `staff.manage`                                                           |
  | manager                              | `catalog.read catalog.write inventory.write orders.read orders.write returns.write reviews.write support.write reports.read` |
  | catalog                              | `catalog.read catalog.write inventory.write reports.read`                                                                    |
  | finance                              | `finance.read reports.read orders.read`                                                                                      |
  | support                              | `orders.read reviews.write support.write`                                                                                    |

  `get_seller_owner` returns `{ ownerId, regionCode, members: { <userId>: role } }`
  (cached under `seller-scope:v3:<id>`). The guard accepts owner or active
  member and stamps `req.seller.role`. Routes declare
  `@SellerAccess('finance.payout')`; the guard checks the permission set
  (owner passes everything). Routes without the decorator require the
  `catalog.read`-level default of "any member". `resolveSellerId` on
  `/seller/*` uses `get_seller_by_member` (owner or staff).
  Staff invite: `POST /sellers/:sellerId/staff` with email + role → if a user
  with that email exists it is linked; otherwise a user is created with
  `role=SELLER`, `sellerType=marketplace`, `status=active`, a random
  password and `mustResetPassword=true`, and `seller.staff.invited` is
  published (notification-service sends the reset link through the
  existing password-reset chain). Staff never appear as `sellers.owner_id`.

- **Role promotion on `/sellers/register` (J9).** After the seller row is
  created for a caller whose role is CUSTOMER, the gateway sets
  `role=SELLER`, `sellerType=<module>`, `status=pending` on the user and
  returns `{ seller, accessToken, refreshToken }` minted for the new claims;
  the wizard stores them. A caller who already owns a seller gets 409.

### 2.2 Order state machine and inventory (T3)

```
PENDING ──accept──▶ CONFIRMED ──pack──▶ READY ──ship──▶ SHIPPED ──deliver──▶ DELIVERED
   │                    │                 │                │
   └──reject──▶ CANCELLED ◀──────────────┘ (seller cancel allowed until SHIPPED)
customer cancel: PENDING | CONFIRMED | READY → CANCELLED (never SHIPPED+)
DELIVERED ──return requested──▶ RETURN_REQUESTED ──accept──▶ RETURNED ──refund──▶ REFUNDED
```

`SellerService.transition(order, to)` holds the table; an illegal move throws
`ConflictException` (409) naming both states. Every transition writes a
`marketplace.order_events` row (`order_id, from, to, actor_type, actor_id,
reason, at`) — the order timeline the detail page and admin read.

Stock: `listing_stock_movements` (`listing_id, delta, reason
[seller_set|reserve|release|restock|adjust], reference, actor, at,
resulting_qty`). `updateInventory` becomes one atomic `UPDATE … SET
"stockQuantity" = :q RETURNING`, writing a movement. `rejectOrder` and the
customer cancel release the reserved units (`release_listing_stock` with the
order's lines) and write `release` movements; an accepted return restocks.
Customer cancellation: `MarketplaceOrderService.cancel` calls
`cancel_seller_orders { orderId }` on the seller service after order-service
cancels, which transitions each seller projection and releases stock; the
seller is notified over WS and by a notification row. `lowStockThreshold`
moves from Redis to a column on `product_listings` (default 5).
`PATCH /sellers/:sellerId/inventory/bulk` takes `[{ productId, stock }]`
(≤ 500 rows) and answers per-row results.

### 2.3 Notifications (T3)

`MarketplaceNotification` rows are written for the seller (`userId =
sellerId`, the convention the reader already uses) on: order placed,
order cancelled by customer, return requested, product approved / rejected
(admin decisions call `notify_seller`), low stock crossing the threshold,
payout approved / rejected / processed (payout-service publishes; the
gateway bridge writes the row through `notify_seller`). The WS push stays
as it is; the row is the durable copy.

### 2.4 Settlement, tax and payouts (T4)

- **Platform-fee tax per market.** `apps/api/libs/region` gains
  `platformFeeTax: { name, rate, withholding?: { name, rate } }` per
  market: IN `{ GST 18, withholding TDS 1 }`, QA `{ none 0 }`, AE `{ VAT 5 }`,
  SA `{ VAT 15 }`, BH `{ VAT 10 }`, KW `{ none 0 }`, OM `{ VAT 5 }`,
  GB `{ VAT 20 }`, US `{ none 0 }`, with `platformFeeTaxVersion: '2026-09'`.
  commission-service takes `regionCode` in `calculate_commission` and
  applies that market's rates; `gstOnCommission`/`tdsAmount` stay in the
  record shape (named `feeTax`/`withholding` alongside, old names kept for
  readers) and `currency` is carried.
- **Durable settlement.** `marketplace.seller_settlements` (`order_id`
  unique, `seller_id`, `region_code`, `currency`, `order_total`,
  `commission_rate`, `referral_fee`, `closing_fee`, `commission_amount`,
  `fee_tax`, `withholding`, `seller_earning`, `tax_version`, `tier`,
  `settled_at`). The gateway's deliver route records it through
  `record_order_settlement` before crediting the wallet; the commissions
  page and the dashboard read it. Redis history in commission-service stays
  as a cache.
- **Payouts.** `request_payout` runs in a transaction with
  `pessimistic_write` on the wallet row; `bankAccountId` is required and
  resolved through `get_seller_bank_account` (must belong to the seller);
  the minimum is `getRegionConfig(market).payout.minimum` (IN 100, QA 50,
  AE 50, SA 50, BH 5, KW 5, OM 5, GB 10, US 10, in the market's currency);
  refusals throw 400/409 (`RpcException` with a status). The gateway route
  takes `RequestPayoutDto { amount, bankAccountId }` only.

### 2.5 Product model (T2)

Migration `1786503500000-SellerProductAttributes` adds to `products`:
`weight_grams int null`, `dimensions_cm jsonb null` (`{l,w,h}`),
`min_order_qty int not null default 1`, `max_order_qty int null`,
`video_url varchar null`, `tax_category varchar null` (market-neutral
class; `hsnCode`/`gstBracket` stay as the India specialisation),
`seo jsonb null` (`{ metaTitle, metaDescription, keywords[] }`). Seller
create/update DTOs and `SELLER_EDITABLE_PRODUCT_FIELDS` carry them; the
seller form gets a "Shipping & tax" and an "SEO" section; the PDP's
`normaliseProductDetail` exposes `weightGrams`, `dimensionsCm`,
`minOrderQty`, `maxOrderQty`, `videoUrl`; `generateMetadata` on the zone's
product page prefers `seo.metaTitle/metaDescription`; the cart quantity
stepper honours min/max.

### 2.6 Registration (T5)

- `POST /auth/seller/register`: `@Throttle 10/min`, `users.country =
requestRegion(req)` (1a's invariant), unchanged password rule and hashing.
- Wizard: documents are uploaded through `POST /upload/kyc-document`
  (multipart, one call per document) after the seller row exists; the
  returned keys are attached with `PUT /sellers/:sellerId/kyc-documents`
  (`[{ type, key, fileName, mimeType }]` → `sellers.kycDocuments`, status
  PENDING). `registrationNumbers` map is persisted on `seller_kyc`
  (`businessRegistrationNumber`, `taxRegistrationNumber`, `vatNumber`, and
  the full map in `registrationNumbers jsonb`).
- Application status shows the document list and KYC state; email
  verification stays with the customer pipeline (1a) and is reported as
  remaining for sellers.

### 2.7 Real-time (T1)

- `join_room` accepts only `seller:<own id>`, `pharmacy:<own store id>`,
  `grocery:<own store id>` (ownership through `SellerOwnershipService.owns`
  for sellers; module stores resolve through their existing owner lookups
  — a store the caller does not own is refused) and `admin:*` rooms only
  for admins, market-suffixed for locked admins.
- Locked admins observe only sellers in their market (`get_seller_owner`
  gives the market); events fan out to `admin:sellers` (global admins) and
  `admin:sellers:<market>`.

### 2.8 Gateway response and error contract (T1, T6)

Lists: `{ data, total, page, limit }`; single reads/decisions `{ data }` or
the existing seller shapes (unchanged where the portal already reads them).
Errors: the shared envelope `{ statusCode, message, errorCode?, errors?[] ,
requestId }`. Outage = 503 with a user-readable message, never an empty
list; "feature not built" = `dataAvailable: false`, only where the backend
says so. The portal's `sellerApi` surfaces `ApiError.status/message/errors`
and every mutating page shows a toast on failure and reverts optimistic
state.

### 2.9 Portal UI (T6)

Keep the existing frame and design language (`layout.tsx`, Tailwind,
lucide). Changes: sidebar shows backed pages only, plus a collapsed "Coming
soon" group; one `SellerDataTable` (responsive: card rows below `md`,
sticky header, server pagination, sort, filter chips, bulk selection,
empty/loading/error states); orders page on it with confirm dialogs for
reject/cancel and a real detail page (timeline from `order_events`,
customer block with privacy masking, invoice link); inventory page with
inline stock edit, threshold edit, bulk update, movement history drawer;
tax page per market (identifier on file, market tax name/rate, settlement
tax lines — no filing calendar); settings: notifications preferences,
security (change password; 2FA toggle removed until enforced), returns
policy; product SEO page on the new columns; images page with file upload.
Every page tested at 375, 768, 1024, 1280, 1536.

## 3. Data flow (the E2E the program proves)

1. `POST /auth/seller/register` (IN and QA) → `POST /sellers/register` →
   `POST /upload/kyc-document` ×2 → `PUT /sellers/:id/kyc-documents`.
2. Regional admin (IN) lists pending sellers, sees only IN; approves the IN
   seller; the QA admin cannot (403); super admin approves QA.
3. Seller logs in, `/sellers/me`, `POST /seller/products` (attributes,
   weight, SEO) → PENDING; the admin queue shows it in the right market;
   approve → `product.approved` → search index + catalogue cache; the PDP
   in that market renders it; the other market does not.
4. Customer in the market buys it (COD) → `reserve_listing_stock` →
   `place_order` → `create_seller_orders` → WS `new_order` + notification
   row; the seller accepts → packs → ships → delivers; each step writes an
   event and the customer's order status follows; delivery records the
   settlement in the market's currency with the market's tax; the wallet
   credits; the commissions and transactions pages show the rows.
5. Seller requests a payout to a saved bank account; the admin approves;
   the wallet and payout pages agree.
6. Seller B (other market) is refused on every seller-A id; a locked admin
   is refused across the market; a staff member with `catalog` cannot read
   the wallet.

## 4. Error handling and observability

Every refused authorisation logs `[seller-access-denied] user= seller=
route= reason=` at WARN; every state-machine refusal logs at WARN with both
states; settlement, payout and stock-release failures log at ERROR with
`orderId` and are never swallowed into a success. Request ids travel from
the gateway into RPC payloads as `_requestId` where the marketplace backend
already reads them.

## 5. Testing

- Unit/regression (vitest): body-spread census spec; guard specs for
  members/permissions/market stamp; state-machine table spec; stock
  release + movements spec; settlement tax per market spec; payout
  transaction + minimum spec; `join_room` spec; DTO specs.
- API (`scripts/verification/seller-portal-authz.mjs`, gateway :3097):
  seller A vs B, IN vs QA, staff permissions, locked admin, mass-assignment
  probes, state-machine probes — restores what it changes.
- E2E (Playwright `apps/web/e2e/seller-portal.spec.ts`, paced by
  `gateway-budget.ts`): §3 in IN and QA.
- Infra: `npm run kafka:topics` declares the new topics; k8s manifests
  re-rendered and dry-run; WS room isolation proven with two sockets.

## 6. Tasks

| #   | Task                                                                                      | Files (owner: 3b unless noted)                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Gateway identity, DTOs, WS rooms, honest errors                                           | `seller.controller.ts`, `seller-marketplace.controller.ts`, `public-sellers.controller.ts`, `guards/seller-*.ts`, `gateways/seller.gateway.ts`, `dto/seller-portal.dto.ts` (new), backend `seller.messages.controller.ts` + `getSellerOwner` |
| T2  | Product model columns + form + PDP                                                        | migration 1786503500000, `product.entity.ts`, `seller.service.ts` (addProduct/updateProduct fields), `product-form.tsx`, shared-core `product-detail.ts`, zone product page metadata                                                         |
| T3  | Orders state machine, stock ledger, cancel projection, notifications                      | migration 1786503510000, `seller.service.ts`, `catalog.service.ts` (release), `marketplace-order.service.ts` (cancel projection), new entities                                                                                               |
| T4  | Settlement table, market tax, payout hardening                                            | migration 1786503520000, `seller_settlements`, region registry, commission-service, payout-service, gateway deliver/payout/commissions routes                                                                                                |
| T5  | Registration completeness, role promotion, staff RBAC                                     | migration 1786503530000, `seller_staff`, `seller_kyc`, `public-sellers.controller.ts`, `gateway.controller.ts` (throttle+country), wizard, guards (`@SellerAccess`)                                                                          |
| T6  | Portal UI: sidebar, DataTable, orders/inventory/tax/settings/SEO/images pages, responsive | `apps/web/src/app/seller/marketplace/**`, `components/seller/marketplace/**`, `seller-api.ts`                                                                                                                                                |
| T7  | Tests, verification script, E2E, infra proofs                                             | specs beside the code, `scripts/verification/seller-portal-authz.mjs`, `apps/web/e2e/seller-portal.spec.ts`                                                                                                                                  |
| T8  | Final report                                                                              | `docs/superpowers/plans/2026-09-13-seller-portal-completion-report.md`                                                                                                                                                                       |

Order: T1 → (T2 ∥ T4-services ∥ T6-frontend) → T3 → T5 → T7 → T8.
`seller.service.ts` has one owner at a time (T1 → T2 → T3 → T5).
