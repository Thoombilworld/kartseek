# KARTSEEK Marketplace — Product Detail Page Audit and Remediation

Date: 2026-09-13 · Branch: `feat/admin-platform-upgrade` · Backend/API/data commits: `a2c974e`, `e308376`, `c70d289`, `4ce9c52`, `dd24d77`, `db78aa4`, `7ba3b44`, `c5a76ae`, `41445dd` · Frontend/UX commits: see §I (session 6b)

Two sessions shared this brief and split it by layer: this document is the single report. Sections A–F and the API rows of §H are the backend/gateway/data work; §G, the page rows of §H and §I come from the zone, seller-portal and shared-client work.

## 0. The data flow as it actually runs

```
Browser
  └─ Next shell :3000  (rewrites /marketplace/* → zone; X-Country-Code from proxy.ts)
       └─ Marketplace zone :3002  app/product/[id]/page.tsx  (server component, cache())
            │  getProductById(uuid, country)   packages/shared-core/src/api/marketplace.ts
            └─ API gateway :3001  GET /api/v1/marketplace/products/:id?country=XX   @PublicCache(120) + Vary
                 │  TCP get_product_by_id { id, country, _requestId }
                 └─ marketplace backend  TCP :4002  MarketplaceController → CatalogService.getProductById
                      ├─ Redis  marketplace:v3:<market>:product:<idOrSlug>   (TTL productDetail)
                      ├─ Postgres 5432 kartseek_db, schema marketplace.*
                      │    products (+brand, category, subcategory) · product_images · product_listings (+sellers)
                      │    product_variants · product_attribute_values (+product_attributes)
                      └─ response: public product row + images + listings[seller: public projection]
                                   + variants + attributes + specificationGroups + highlights
            │  client-side after hydration (each market-scoped):
            │    /products/:id/reviews · /products/:id/questions · /products/:id/offers?country
            │    /products/:id/emi-options?country · /categories/:slug/attributes · /products?category=…
```

Route parameter: `/marketplace/product/<slug>-<uuid>`; only the uuid resolves the product, a bare slug still resolves and is 308-redirected to the canonical form. Region: cookie/header → `?country=` on server fetches, `X-Region-Code` on browser fetches. Auth: the detail read is public; cart, wishlist, reviews and Q&A writes need a JWT; seller and admin routes have their own guards.

## A. Audit summary

| Severity  | Count  | Items                                                                                                                                                                                                                                                                                                                                 |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical  | 2      | A1 seller PII on every offer · A2 unpublished products publicly readable                                                                                                                                                                                                                                                              |
| High      | 7      | A3 no product attribute model · A4 offers not scoped to product/market · A5 EMI hard-coded to India on list price · A6 reviewer customer ids in public payloads · A7 hard-coded warranty/replacement/badge claims on the page (6b) · A8 demo price on the EMI page (6b) · A9 SEO `inStock` true for a 0-stock listing (6b)            |
| Medium    | 7      | A10 no `Vary` on market-specific public caches · A11 invented seller rating/review counts · A12 seller `specifications`/`highlights` silently dropped · A13 internal columns on the public row · A14 duplicate review answered 500, rating unvalidated · A15 attribute `type` case drift · A16 seller edit form faked its submit (6b) |
| Low       | 3      | A17 minted `KS-…` stand-in published as a GTIN · A18 Q&A answers shape never rendered (6b) · A19 category-attributes route 500 window during entity change (self-inflicted, transient)                                                                                                                                                |
| **Total** | **19** |                                                                                                                                                                                                                                                                                                                                       |

## B. Fixed issues (backend, API, data)

### B1 · Seller PII on every offer (Critical)

- **Issue**: `GET /marketplace/products/:id` returned each offer's full `Seller` row: `bankAccountNumber`, `bankIfscCode`, `panNumber`, `gstNumber`, owner `email`/`phone`, `kycDocuments`, `commissionRate`, `approvedBy`, `ownerId`. Confirmed live before the fix.
- **Root cause**: `relations: ['seller']` loads the entity; nothing projected it for the public read (the order read already used `PUBLIC_SELLER_FIELDS`).
- **Files**: `entities/seller.public-fields.ts` (`toPublicSeller`), `catalog/catalog.service.ts`.
- **Backend**: offers carry the 14-field projection; other public reads probed clean (sellers/verified, products list, trending, offers).
- **Security impact**: banking and identity data of every seller was readable by anyone with a product URL. Closed.
- **Test**: live probe shows `id, businessName, storeSlug, description, logoUrl, bannerUrl, sellerRating, totalReviews, totalProducts, totalOrders, verificationStatus, isActive, regionCode, createdAt` only; catalogue spec 57/57.

### B2 · Unpublished products publicly readable (Critical)

- **Issue**: the detail read applied no moderation filter; a PENDING, REJECTED, inactive or DELETED product answered 200 by uuid or slug (the list read had always filtered).
- **Root cause**: `where = { id } | { slug }` only.
- **Files**: `catalog/catalog.service.ts` (`PUBLIC_PRODUCT` in the WHERE; 404 otherwise, never cached).
- **Security impact**: IDOR on moderation state; closed. Proof: the Dell laptop was set REJECTED, `GET` by uuid and by slug both answered 404, then restored.
- **Test**: catalogue spec "answers 404 for a product that exists but is not public".

### B3 · No product attribute model (High)

- **Issue**: specifications came from `metadata.specifications`, which 0 of 178 products carried; sellers' `specifications`/`highlights` were assigned to non-existent columns and lost; the page could not show anything product-specific beyond name, brand, price, variants and images.
- **Root cause**: `product_attributes` held definitions only; no value table; no validation.
- **Database**: `marketplace.product_attribute_values` (`id`, `product_id` FK CASCADE, `attribute_id` FK CASCADE, `value_text`, `value_number numeric(18,4)`, `value_bool`, `value_json`, timestamps; unique `(product_id, attribute_id)`; indexes on `(attribute_id, value_number)` and `(attribute_id, value_text)`). `product_attributes` gains `groupName`, `isHighlight`, `minValue`, `maxValue`. Migration `1786503000000-ProductAttributeValues` (idempotent DDL, run through the module runner as `marketplace_user`, `verify:schema-drift --module=marketplace` = 0).
- **Backend**: `catalog/attribute-values.service.ts` — definitions resolved for a category + ancestors + global (child wins by slug); server-side validation per type (`TEXT`, `NUMBER`, `BOOLEAN`, `SELECT`, `MULTI_SELECT`, `COLOR`, `DATE`, `RANGE`): datatype, option membership, min/max in unit, required (never for variant axes), HTML refused, 500-char cap, duplicates refused; transactional replace; presentation as `attributes[]`, `specificationGroups[]` (first-seen group order, only groups with values) and `highlights[]` (≤ 8, from flagged definitions; a true boolean is its name alone). Seller create/update accept `attributes[{ attributeId | slug, value }]`; a refusal is `400 { message, errors: [{ slug, message }] }` (travels as a reply because the RPC error channel is flat by design; the gateway re-raises it).
- **Data**: `scripts/seed-product-attributes.ts` — 120 definitions across smartphones, laptops, headphones-and-earbuds, tvs, refrigerators, washing-machines, air-conditioners, fashion (inherited by mens/womens-clothing), running-shoes, makeup, office-furniture; values on 12 real approved products (public manufacturer specifications), every value passed through the same validator.
- **Test**: `attribute-values.service.spec.ts` 14 cases incl. the brief's `RAM="hello"`, `Battery=-5000`, `Screen size=999999`, `Weight=-20`; seller spec: refusal by field, re-review, untouched values when the field is omitted.

### B4 · Offers not scoped to product or market (High)

- **Issue**: `/products/:id/offers` answered with every active offer for a category _name_ and ignored the product and the market.
- **Fix**: `get_product_offers` (new `catalog/catalog.controller.ts` + `product-offers.service.ts`): product must be public; bank offers filtered by validity window, `applicableCategories` (slug or name of category/subcategory) and `applicableCountries`; exchange offers by validity, product/brand targeting or `targetCategory`; public fields only. Gateway sends `country`.
- **Test**: live QA/IN both 200 with `market` echoed and empty lists (no live offer targets these products).

### B5 · EMI hard-coded to India on the list price (High)

- **Issue**: rupee plans, Indian banks and a ₹3,000 threshold on `product.mrp` for every market.
- **Fix**: `get_product_emi_options` quotes per market on the market's buy-box price; only IN has configured plans; others answer `{ eligible: false, reason }` and the page hides the section. Plans live in a per-market table in code (open item G3: move to data).
- **Test**: live QA → ineligible; IN → 6 plans on 132 603 INR.

### B6 · Reviewer customer ids public, duplicate review 500, rating unvalidated (High/Medium)

- **Fix**: `/products/:id/reviews` strips `customerId`, adds `ratingDistribution {1..5}` (one GROUP BY) and computes the average over the same published set; the inline `reviews` array is removed from the detail; create validates integer 1..5 (400), caps title/comment, maps the unique-index violation to 409 with a message that discloses nothing about others. Review schema and moderation semantics unchanged (another plan owns moderation).
- **Test**: marketplace service spec; live shape check.

### B7 · No `Vary` on market-specific public caches (Medium)

- **Fix**: `PublicCache` emits `Vary: X-Region-Code, Accept-Language` beside `Cache-Control: public, max-age=0, s-maxage=N`; the regression spec still pins every catalogue route.

### B8 · Invented seller social proof (Medium)

- **Issue**: `sellers.seller_rating / total_reviews / total_products` are seed columns nothing writes (4.8 from 1,250 reviews over an empty reviews table).
- **Fix**: the detail's seller projection takes the same read-time `sellerStats()` the seller directory uses. Live: Official Store → rating 0, reviews 0, products 178.

### B9 · Internal columns on the public row, stand-in GTIN (Medium/Low)

- **Fix**: `seller_id`, `approval_status`, `is_active`, `status`, `is_featured`, `isPanIndia`, `availablePincodes`, `translations`, `created_at`, `updated_at`, `globalTradeItemNumber` projected off; `gtin` published only when 8–14 digits. `hsnCode`/`gstBracket` stay (tax facts; null on seed data).

### B10 · Edit-after-approval semantics (§17 of the brief)

- A content edit (name, descriptions, category, brand, attributes) on an APPROVED product sets `approval_status = PENDING`; the public read hides it until an admin re-approves; the reply says so (`reReview: true`). Price and stock edits go through the listing routes and never trigger it. There is no revision table, so the previously approved content cannot stay live beside the edit — the honest trade-off, stated in the seller form.

### B12 · Seller product routes refused the owning seller (High, found during 6b's probe)

- **Issue**: `GET/PUT /seller/products/:id` and `PATCH /seller/products/:id/stock` answered 403 "You do not have access to this seller account" to the seller who owns the product (list 200, detail 403 with the same token).
- **Root cause**: `SellerOwnershipGuard` reads any `:id` route param as a SELLER id, looks it up in `sellers`, misses, and refuses. PUT and PATCH had that shape before this pass; the new GET inherited it.
- **Fix**: the routes take `:productId`; with no seller param the guard defers to the handler, which resolves the seller from the JWT and loads the row by (id, seller_id). The market-scope census records the renamed routes. Commit `4ce9c52`.

### B13 · Q&A reads published account ids (Medium)

- `GET /products/:id/questions` rows carried each asker's `customerId`, `/questions/:id/answers` each author's `authorId`. Both stripped; the per-question answer COUNT loop became one grouped query. Commit `dd24d77`.

### B14 · Structured validation errors could not reach a client (Medium)

- Both exception filters in `libs/common` rebuilt every error as `{ statusCode, message, errorCode }`, so the seller form could never receive the per-attribute list. With the infrastructure owner's sign-off the filters now carry `errors` when a 4xx thrower attached an `errors`/`details` array (bounded: 100 entries, plain fields, strings cut at 500 chars, never on a 5xx); the RPC filter mirrors it and the gateway forwards it. Commit `db78aa4`. The interim reply-envelope workaround was removed once this landed.

### B15 · Seller product list without price, stock or SKU (Medium)

- `GET /sellers/:sellerId/products` returned bare catalogue rows; the portal rendered NaN. Each row now carries the seller's own `listing`, `category`, `approvalStatus` and `isActive`, from one query per page. Commit `7ba3b44`.

### B11 · Cache and invalidation

- Catalogue cache version `v2 → v3` retires every stale detail shape at once. Seller content edits invalidate `product` + listing keys after the transaction commits (existing `invalidateProductAndListings`); admin approve/reject already did.

## C. API audit (product page surface)

| Endpoint                                                                             | Method   | Purpose                        | Auth                | Authorization / scope                                                                  | Status      |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------ | ------------------- | -------------------------------------------------------------------------------------- | ----------- |
| `/marketplace/products/:id`                                                          | GET      | product detail                 | none                | public products only; market via `?country`/`X-Region-Code`; `PublicCache(120)` + Vary | PASS        |
| `/marketplace/products/:id/reviews`                                                  | GET      | paged reviews + histogram      | none                | published only; no customer ids                                                        | PASS        |
| `/marketplace/products/:id/reviews`                                                  | POST     | write a review                 | JWT                 | customer from token; rating 1..5; one per product (409)                                | PASS        |
| `/marketplace/products/:id/questions`, `/questions/:id/answers`                      | GET/POST | Q&A                            | GET none / POST JWT | unchanged (fulfillment path held by another plan)                                      | PASS (read) |
| `/marketplace/products/:id/offers`                                                   | GET      | bank + exchange offers         | none                | product + market + validity                                                            | PASS        |
| `/marketplace/products/:id/emi-options`                                              | GET      | finance quote                  | none                | per market, buy-box price                                                              | PASS        |
| `/marketplace/categories/:slug/attributes`                                           | GET      | category schema                | none                | uppercase `type`, group/highlight/bounds                                               | PASS        |
| `/marketplace/cart`                                                                  | POST     | add line                       | JWT                 | server-priced (`PRICE_ORDER_ITEMS`); DTO whitelist forbids `price` (400)               | PASS        |
| `/seller/products`                                                                   | GET/POST | list / create                  | JWT + seller guards | seller from token; attributes validated; structured 400                                | PASS        |
| `/seller/products/:id`                                                               | GET/PUT  | read for edit / content update | JWT + seller guards | row by (id, seller_id); re-review on content change                                    | PASS        |
| `/seller/products/:id/stock`                                                         | PATCH    | stock                          | JWT + seller guards | unchanged                                                                              | PASS        |
| `/admin/marketplace/products/:id/{approve,reject}`, `/listings/:id/{approve,reject}` | PATCH    | moderation                     | JWT admin           | market scope; invalidates caches                                                       | PASS        |

Error contract on the surface: 400 malformed id / validation, 401 no token, 403 wrong role or scope, 404 unknown or non-public product, 409 duplicate review, 429 rate limit (gateway Throttler + DDoS layer), 503 only when the service is unreachable. No stack traces reach the client (`RpcAwareExceptionsFilter` + gateway filter).

## D. Database audit

| Item                       | Finding                                                                                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tables read by the PDP     | `products`, `brands`, `categories` (closure table), `product_images`, `product_listings`, `sellers`, `product_variants`, `product_attribute_values`, `product_attributes`, `reviews`, `product_questions/answers`, `bank_offers`, `exchange_offers`                  |
| Relations                  | product → brand/category/subcategory (ManyToOne); images/listings/variants/values → product (CASCADE); values → definition (CASCADE, documented: deleting a definition drops its values); listing → seller                                                           |
| Indexes added              | `IDX_pav_product_attribute` UNIQUE (`product_id`,`attribute_id`); `IDX_pav_attribute_number`; `IDX_pav_attribute_text`                                                                                                                                               |
| Existing indexes relied on | products: (`is_active`,`approval_status`), category, subcategory, brand, `seller_id`; listings: product+seller; variants: (`productId`,`sku`) unique, (`productId`,`isActive`); reviews: (`productId`,`status`), unique (`productId`,`customerId`) where not deleted |
| Queries                    | detail: 1 product + 4 parallel reads (images, listings+seller, variants, values+definitions) + 1 seller-stats aggregate; reviews: 1 page + 1 GROUP BY; no N+1 (values joined via relation in one query)                                                              |
| Ordering                   | every read ends on a primary-key tiebreak (from the earlier consistency work)                                                                                                                                                                                        |
| Constraints                | `numeric(18,4)` values; unique per (product, attribute); FK cascades named `FK_pav_product`, `FK_pav_attribute`; drift check 0                                                                                                                                       |
| Latency (dev, QA)          | detail cold 178 ms, warm 18–20 ms; reviews 23 ms; offers 32 ms; EMI 18 ms; category attributes 31 ms                                                                                                                                                                 |

## E. Security audit

| Check                    | Result           | Evidence / remediation                                                                                                               |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| IDOR (moderation state)  | PASS             | rejected product → 404 by uuid and slug; restored                                                                                    |
| IDOR (seller reads)      | PASS             | `GET /seller/products/:id` loads by (id, seller from JWT); another seller's product → 404 (probed)                                   |
| SQL injection            | PASS             | uuid/slug format check before any query (`' OR 1=1--` → 400); TypeORM parameters elsewhere                                           |
| XSS / HTML injection     | PASS             | attribute values refuse `<`/`>` server-side; descriptions pass through the allowlist sanitiser on render; React escapes names/values |
| Authorization boundaries | PASS             | customer ≠ seller ≠ admin guards unchanged; new seller route registered in the market-scope census                                   |
| Rate limiting            | PASS (with note) | Throttler 600/min + DDoS layer 100/min, 20 per 5 s per address; loopback exemption in dev handled by the infra plan                  |
| Data exposure            | PASS             | seller PII removed; internal product columns removed; reviewer ids removed; stand-in GTIN not published                              |
| Price tampering          | PASS             | cart line priced by `PRICE_ORDER_ITEMS`; a client `price` field is rejected (400 `property price should not exist`)                  |

## F. Regional isolation

| Market           | Result | Evidence (iPhone 15 Pro detail)                                                                                                                                   |
| ---------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| India (IN)       | PASS   | offer from "KartSeek Official Store India", region IN, 132 603.00; EMI eligible in INR                                                                            |
| Qatar (QA)       | PASS   | "KartSeek Official Store", region QA, 5 050.00; EMI not offered                                                                                                   |
| GCC — UAE (AE)   | PASS   | region AE, 5 095.09                                                                                                                                               |
| GCC — Saudi (SA) | PASS   | region SA, 5 202.61                                                                                                                                               |
| UK               | N/A    | not an active market (`NEXT_PUBLIC_ACTIVE_REGIONS` / gateway `ACTIVE_REGIONS` = QA, IN, AE, SA); a request for GB resolves no sellers and no plans, nothing leaks |
| USA              | N/A    | as UK                                                                                                                                                             |

Cache keys are market-segmented (`marketplace:v3:<market>:product:<id>`), offers and EMI take the market, and the same nine variants and 18 attributes appear in every market while the offer, seller and currency differ.

## G. Responsive testing

| Viewport                      | Result                     |
| ----------------------------- | -------------------------- |
| Mobile (320 × 640, 375 × 812) | PASS                       |
| Tablet (768)                  | PASS (sticky bar boundary) |
| Laptop / Desktop (1440 × 900) | PASS                       |

Checked in the in-app browser (375×812 emulation) and by Playwright (320×640 and 1440×900): no horizontal overflow (`scrollWidth === clientWidth`), sticky Add to Cart / Buy Now bar present below 768 px and hidden above, thumbnails scroll, specification rows stack (`dt` over `dd`) under 640 px, breadcrumb category levels collapse to "Home / <title>" on phones (JSON-LD keeps the full trail), quantity control 40 px targets, review histogram and sort fit at 320 px.

## H. End-to-end testing

| Area               | Result                 | Where                                                                                                                                        |
| ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Product loading    | PASS                   | product-detail.spec.ts: phone, fashion, no-attribute product; legacy uuid URL 308 → canonical; 400/404 pages                                 |
| Product attributes | PASS                   | API: 18 attributes / 8 groups / 7 highlights on the iPhone; page: specs/highlights match the API, fashion shows no phone rows, no "N/A" rows |
| Variants           | PASS                   | consistency suite A/B/C; product-detail: storage switch moves the price and SKU                                                              |
| Price              | PASS                   | buy-box per market; tamper refused (400); JSON-LD agrees with the page                                                                       |
| Inventory          | PASS                   | availability badge and Add to Cart gated on the same SKU stock                                                                               |
| Cart               | PASS                   | guest Add to Cart with variantId; server-priced line                                                                                         |
| Wishlist           | PASS (auth-gated)      | real toggle; signed-out write skipped under DEV_AUTH_BYPASS                                                                                  |
| Checkout           | unchanged in this pass |                                                                                                                                              |
| Reviews            | PASS (API)             | histogram, no ids, 1..5, 409; page renders the server histogram                                                                              |
| Region             | PASS                   | §F; QA vs IN differ in offer, symbol and price on the page                                                                                   |
| Authorization      | PASS                   | §E; signed-out review/question asserts 401 wherever the guard is live                                                                        |
| Security           | PASS                   | §E; page shows no seller banking/identity/internal columns                                                                                   |

| Scenario (product-detail.spec.ts, 9 passed · 1 skipped)                                                                   | Result                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Phone: specs/highlights/price/SKU picker match the API; JSON-LD agrees; storage switch moves the price; guest Add to Cart | PASS                                                                                                                                  |
| Fashion product shows fashion attributes and no phone rows                                                                | PASS                                                                                                                                  |
| Product without attribute values renders no specification section, no "N/A"                                               | PASS                                                                                                                                  |
| Malformed id 400 / missing uuid 404 on the API; both URLs render the 404 page                                             | PASS (after pointing the request context at 127.0.0.1; first run failed on ::1)                                                       |
| Legacy bare-uuid URL 308-redirects to the canonical slug URL                                                              | PASS                                                                                                                                  |
| QA vs IN: different offers, currency symbol and price per market                                                          | PASS                                                                                                                                  |
| Seller banking/identity/internal columns absent; reviews carry no customerId                                              | PASS                                                                                                                                  |
| Signed-out review/question refused                                                                                        | SKIPPED locally (gateway runs DEV_AUTH_BYPASS — detected via anonymous GET /marketplace/cart); asserts 401 wherever the guard is live |
| No horizontal overflow at 320 px; sticky buy bar present                                                                  | PASS                                                                                                                                  |
| No horizontal overflow at 1440 px; sticky buy bar hidden                                                                  | PASS                                                                                                                                  |

Unit: zone jest 51/51 (`product-detail.spec.ts`, `attribute-form.spec.ts` added), web jest 633/633; `tsc --noEmit` clean for the zone and apps/web; eslint 0 errors.

Unit/integration: marketplace backend 335/335 (incl. 14 attribute-validation cases and the seller write cases); `apps/api` 1512/1512 (1520 with the filter specs; the three failures in the last whole-suite run were another plan's in-flight edits); market-scope gates 44/44; libs/common filter specs 16/16; schema drift 0. Regression: `marketplace-consistency.spec.ts` re-run against the rebuilt page after all commits: 16/16 in 4.8 min (category ×5 refresh, away/back, subcategory, sort leak, product A/B/C, four markets, cross-market cache, ten concurrent reads, cold/warm, slug, retired alias, admin write then read).

## I. Frontend, UX and accessibility (session 6b)

Commits: `ed65d55` (shared-core: one `ProductDetail` model, attribute-form and category-tree helpers, typed clients), `b1ed7e0` (marketplace zone: the product page renders only catalogue data, per market), `340eb53` (web: category-driven seller product form, admin attribute bounds/group/highlight, `e2e/product-detail.spec.ts`). Unit: zone jest 51/51, web jest 633/633; `tsc --noEmit` clean for the zone and apps/web; eslint 0 errors.

### I.1 Information architecture and UX (storefront)

Rendered order on `/marketplace/product/<slug>-<uuid>` (`modules/marketplace/frontend/src/app/product/[id]/page.tsx`):

1. Breadcrumb (`nav[aria-label=Breadcrumb]`, category levels by slug; JSON-LD BreadcrumbList mirrors it)
2. Gallery (swipe track, thumbnails, zoom, 360° only when frames exist; SVG/placeholder hosts served unoptimised instead of "Image unavailable")
3. Brand link + follow (only when the product has a brand id) · Title (h1, `data-testid=product-title`) · Rating badge + "N ratings" link, or "No ratings yet — be the first to review" · SKU (offer's `sellerSku`)
4. Availability badge (`data-availability` = in_stock | low_stock | out_of_stock | unavailable), from the same stock the buy button is gated on; follows the selected SKU
5. Price block: payable price, struck list price with the market's own label (M.R.P. / Was / RRP), saving, and the market's tax treatment from the localization registry ("Inclusive of VAT" / "No sales tax applies in this market")
6. Offers (bank / exchange) — client fetch with market; renders nothing when none
7. Highlights (≤ 8 bullets, derived from attributes flagged `isHighlight`)
8. Variant pickers (colour swatches / size chips; unavailable combinations struck)
9. Quantity (bounded by the SKU's stock)
10. Policies block — only data-backed lines: delivery rule for the market (fee / free-above), tax note, `warranty` attribute, box contents attribute. The literal "1 Year Brand Warranty" / "7 Days Replacement Policy" / "Verified Listing" / "Authorized <Brand> Seller" / "KARTSEEK Buyer Protection" are gone.
11. PIN-code check (India only) · EMI (only when the market quotes plans; deep link to the plans page)
12. Add to Cart / Buy Now (disabled with a reason when out of stock, unavailable, or options unpicked) · Wishlist (real, auth-gated) · Share · Add to Compare; sticky bar on phones offset by the consent-banner height
13. Specifications — grouped `dl` from `specificationGroups`; folds after 8 rows; a product with no attribute values renders no section at all
14. Description — sanitised A+ HTML, else `long_description` paragraphs, else short description; no "No description provided." filler
15. Frequently bought together (market-scoped bundle containing this product; hidden otherwise)
16. Ratings & reviews — server histogram (`ratingDistribution`), sort, paging (5 per page), review photos, seller reply, auth-gated "helpful"; "Verified purchase" only when `isVerifiedPurchase === true`
17. Questions & answers — answers now render (client read `answers`, not `data`); auth-gated ask/upvote/helpful with error toasts; "See all N questions" link
18. Similar products (subcategory first, widened to the category when thin) · Recently viewed (browser trail, same-market prices only)
19. Sidebar: Sold by (public seller projection with read-time stats, condition, Fulfilled by KartSeek only when true, Visit store) · Other sellers (buy-box first; "Default offer" wording) · Help + Report this listing

Sub-pages: `/emi` reads the product's buy-box price and the market's real plans (was a literal 115 900 and five hard-coded Indian banks); `/qa` and `/review` unchanged except wording; `/compare` rows are the union of the compared products' attribute values (was 12 hard-coded phone keys) and the delivery row is the market rule.

### I.2 Frontend data mapping (backend → DTO → client model → component)

One reader: `packages/shared-core/src/marketplace/product-detail.ts` → `ProductDetail`. Components never read the raw entity.

| Backend / DTO field                                                       | ProductDetail                                                                      | Component                                                                      |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `name`                                                                    | `name`                                                                             | h1, breadcrumb, metadata title, JSON-LD name                                   |
| `slug` + `id`                                                             | `slug`, `id`                                                                       | canonical URL (`productPath`), 308 redirect                                    |
| `short_description` / `long_description` / `metadata.richDescriptionHtml` | `shortDescription` / `longDescription` / `richDescriptionHtml`                     | metadata description; description section (sanitised)                          |
| `brand{id,name,slug}`                                                     | `brand`                                                                            | brand link + follow, JSON-LD brand                                             |
| `category` / `subcategory`                                                | `category` / `subcategory`                                                         | breadcrumb, similar-products query (subcategory → `?subcategory=`)             |
| `images[{url,isPrimary,sortOrder}]`                                       | `images[]` (primary first, deduped)                                                | gallery, OG image, JSON-LD image                                               |
| `metadata.spin360Urls`                                                    | `spinFrames`                                                                       | 360° viewer (≥ 8 frames)                                                       |
| `listings[]` (live, market-scoped) → buy box                              | `offer`, `offers[]`, `price`, `listPrice`, `discountPercent`                       | price block, Sold by, Other sellers, JSON-LD Offer/AggregateOffer              |
| `listings[].seller` (14 public fields)                                    | `ProductOffer.sellerName/storeSlug/sellerRating/sellerReviews/verified/regionCode` | Sold by, Other sellers                                                         |
| `listings[].stockQuantity` / `variants[].stockQuantity`                   | `availability{status,stock,hasVariants}`                                           | availability badge, quantity max, Add to Cart gate, JSON-LD availability       |
| `listings[].condition`                                                    | `offer.condition`                                                                  | Sold by, JSON-LD itemCondition                                                 |
| `listings[].sellerSku` / `gtin`                                           | `sku` / `gtin`                                                                     | SKU line, JSON-LD sku/gtin                                                     |
| `variants[]`                                                              | `variants[]` (raw → `VariantProvider`)                                             | pickers, price, gallery, cart line `variantId`                                 |
| `attributes[]`                                                            | `attributes[]` (typed, `displayValue`)                                             | compare rows, warranty / box contents lookups                                  |
| `specificationGroups[]`                                                   | `specificationGroups[]`                                                            | Specifications section                                                         |
| `highlights[]`                                                            | `highlights[]`                                                                     | Highlights section                                                             |
| `averageRating` / `reviewCount`                                           | same                                                                               | rating badge, reviews aggregate, JSON-LD aggregateRating (only when count > 0) |
| `approval_status` / `is_active` (seller preview only)                     | `isPublic`                                                                         | page returns 404 for a non-public row                                          |

Satellites read through typed client functions in `packages/shared-core/src/api/marketplace.ts`: `getProductReviews(page,limit,sort)` → `ProductReviewsPage` (histogram, no customerId), `getAnswers` → `{answers}`, `getEmiOptions(country)`, `getProductOffers(country)`, `getProductBundles(country)`.

### I.3 Accessibility

- Landmarks: `nav[aria-label=Breadcrumb]` with `aria-current=page`; every section is a `section[aria-labelledby]` with its own `h2`; sidebar is an `aside`.
- Rating badge is a link with a full `aria-label` ("Rated 4.9 out of 5 from N ratings. Jump to reviews."); the gallery is a `region` with `aria-roledescription=carousel`, thumbnails are `tab`s.
- Availability is `role=status`; Add to Cart carries `aria-disabled` and a reason toast; swatches keep `aria-label`/`aria-pressed`; quantity buttons have labels and a described hint at the maximum.
- Q&A upvote/helpful buttons have names and `aria-pressed`; the ask form's textarea has a label; review histogram bars are `img` with per-star labels; sort is a labelled `select`.
- Colour is never the only signal (availability has an icon and text; unavailable chips are struck through).
- Known: the react-hooks "set-state-in-effect" lint warnings on the gallery/context/rail are advisory (baseline pattern in the zone).

### I.4 Seller portal (upstream of the PDP)

- `apps/web/src/app/seller/marketplace/products/product-form.tsx` (add + edit): categories from the catalogue (flat rows → tree), attribute fields from `GET /marketplace/categories/:slug/attributes` grouped by `groupName`, typed inputs (number with unit and min/max hint, select, multi-select, boolean, date, range), client validation mirroring the server, server `errors[{slug,message}]` mapped per field, re-review warning + confirmation for approved products, success screen linking to photos / variants / product.
- Add page (`/add`) and edit page (`/[id]/edit`) are thin wrappers; the overview (`/[id]`) shows moderation state, offer, photos, attribute values (no invented KPIs); the list maps catalogue rows to Live / Awaiting review / Correction requested / Draft / Rejected / Not on sale and no longer crashes on search.
- Admin attributes page: definitions gain specification group, highlight flag and min/max bounds.
- Verified in the browser as a fresh seller (fixture created through `POST /auth/seller/register` → `/sellers/register` → admin approval): "RAM is required." shown client-side; a valid submission answered "Submitted for review" and the product appeared in the list and the edit form prefilled 18 attribute inputs.

## J. Open items (not fixed in this pass, with owners)

1. EMI plans are a per-market table in code (`product-offers.service.ts`); a `finance_plans` table per market/bank is the next step. Owner: marketplace backend.
2. No return/replacement policy field exists on product, listing or seller settings; the page renders no such claim until one does. Owner: product/seller model.
3. Attribute values are not yet in the search index or the category filters (`isFilterable` exists on definitions); the value table is indexed for it. Owner: search plan.
4. Review moderation default stays `PUBLISHED`; the admin-console plan (M9) owns a `PENDING` default.
5. Q&A `getAnswers` shape and the fulfillment-side Q&A fixes wait for that path's release (MODULES M1).
6. No product revision table: a content edit takes an approved product off sale until re-approval (§B10).
7. `hsnCode`/`gstBracket` are null on all seed data; India's "inclusive of all taxes" label has nothing to compute from yet.
8. ~~Structured validation errors travel as a `{ success:false }` reply because `RpcAwareExceptionsFilter` flattens exceptions.~~ Resolved in `db78aa4` (§B14).
9. A customer who registers through `POST /sellers/register` and is approved keeps `role=customer`, so every `/seller/*` route answers 403; only `POST /auth/seller/register` mints a SELLER-role user. Owner: MODULES M12 (approval must promote the role, or the route must refuse non-seller users).
10. `SellerOwnershipGuard` treats any `:id` param as a seller id (§B12); other `:id` routes in guard-bound classes deserve the same audit. Owner: MODULES residue.
11. Dev fleet: the marketplace backend's `nest --watch` rebuilt `dist/` without swapping the running process once during this work (runner from 19:20, dist from 19:26); a `touch` on a source file restarted it. Check the `:3012` process start time against `dist/main.js` before trusting a "not fixed" probe.
12. The seeded fixture account `seller@kartseek.com` no longer matches its seeded password (the hash was changed outside this work). Neither session reset it; the frontend e2e used a fresh seller created through `POST /auth/seller/register`. Owner: whoever maintains the seed fixtures.
