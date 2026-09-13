# KARTSEEK Marketplace — Consistency Root-Cause Report

Date: 2026-09-13 · Branch: `feat/admin-platform-upgrade` · Commits: `a84644e`, `29f7a6e`, `980135e`, `5c185e9` (+ the e2e pacing and this report)

The symptom under investigation: the same category URL (`/marketplace/category/mobiles-tablets`) and the same product URL rendered different content across refreshes, after navigating away and back, and after switching products, and the fleet logged `TimeoutNegativeWarning: -1788135873001` and a Kafka consumer group shared by eight modules. This report records what was actually wrong, in the order the evidence was found, what was changed, and how each change is proven.

## 0. Summary

| #   | Root cause                                                                                                                                                                                                                                                                     | Layer              | Fix                                                                                                                                                 | Proof                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | The marketplace service read the shared Postgres on **5432** whose `marketplace.*` copy was stale (one SUSPENDED Qatar store, no India/UAE/Saudi sellers) while every seed and proof had run against the dedicated **5433** instance                                           | Database           | Seeded 5432; restored the Qatar store; `MarketCoverageCheck` now logs the database target and per-market seller coverage at boot and errors at zero | API rows per market before/after (§B.1)           |
| 2   | The header's GPS lookup called `setSelectedRegion()` on every page load, rewriting the market cookie after the server had rendered another market                                                                                                                              | Client state       | GPS may only name the city; the market changes only through the picker                                                                              | SSR HTML and hydrated DOM now agree (§B.2)        |
| 3   | Two filter implementations copied server props into client state in an effect, one frame after painting the previous category's rows, and reset only part of that state                                                                                                        | Zone               | One `CatalogListing` shell + one `CatalogFilters` keyed on `(category, filter, market)`; no effect copies props                                     | e2e: five refreshes, away/back, sort leak (§E)    |
| 4   | Catalogue cache keys were built from the raw filter object (key order and `country` leaked in), seller writes never invalidated, and the gateway's `PublicCache` emitted `stale-while-revalidate`                                                                              | Redis / HTTP cache | `marketplace:v2:<market>:<kind>[:identity]` over a canonical hash; every write path invalidates after commit; SWR removed                           | Unit specs; e2e cache-invalidation scenario (§E)  |
| 5   | Sorted reads had no unique tiebreak, so equal prices/ratings came back in whichever order Postgres chose                                                                                                                                                                       | SQL                | Every sort ends on the primary key; closure-table category reads sorted in code                                                                     | e2e: ten concurrent reads, cold vs warm (§E)      |
| 6   | Categories were served by two gateway route families (gRPC `/categories`, TCP `/category-list*`) with two clients in shared-core                                                                                                                                               | Gateway / client   | One route family over TCP, one client pair                                                                                                          | 404 on the retired alias (§E)                     |
| 7   | Storefront pages fell back to bundled demo products when the feed was empty or slow, so a broken fetch looked like a different catalogue                                                                                                                                       | Zone               | Live feed or an explicit "feed unavailable" state; demo catalogue deleted                                                                           | No `demo-data` import on any storefront page (§H) |
| 8   | Every `ClientKafka` derived its identity from the launch shape; `require.main` is undefined inside rspack bundles, so eight modules fell to `app` and shared one consumer group, and every producer joined a group for nothing                                                 | Messaging          | `KafkaModule.forService(name)`; producer-only clients; per-instance bridge group; shutdown hooks                                                    | Broker group list (§D.1)                          |
| 9   | kafkajs 2.2.4 scheduled `setTimeout(throttledUntil(-1) - Date.now())` whenever nothing was pending                                                                                                                                                                             | Library            | Patched at the calculation; pinned by a spec against the installed module                                                                           | `TimeoutNegativeWarning` gone (§D.8)              |
| 10  | Both loading skeletons drew a hero the pages no longer had                                                                                                                                                                                                                     | Zone               | Both `loading.tsx` re-export the listing skeleton                                                                                                   | Screenshots (§F)                                  |
| 11  | Admin approval or rejection of a single **offer** recomputed the buy box but never invalidated the catalogue cache, so the category listing kept the rejected offer and its price until the TTL (found by the new write-then-read e2e scenario, which failed on its first run) | Redis              | `approveListing` / `rejectListing` invalidate the product's caches after commit                                                                     | e2e cache-invalidation scenario passes (§E)       |

## A. Root causes in detail

### A.1 Wrong database behind the marketplace service

Two Postgres instances exist on this machine: `kartseek-postgres` on **5432** (database `kartseek_db`, shared by the platform services, with a `marketplace` schema) and `kartseek-postgres-marketplace` on **5433** (database `kartseek_marketplace`, dedicated). The marketplace module's own `.env` wins over `apps/api/.env`, and by the INFRA ruling the service reads the shared instance on 5432. Every seed and every earlier proof had been run against 5433.

On 5432 the `marketplace.*` copy held one Qatar store, and it was `SUSPENDED`; India, UAE and Saudi had no seller at all. The listing query left-joins live offers (`isActive AND approvalStatus = 'APPROVED'` on listings of non-suspended sellers), so:

- Qatar rendered every card, but with an empty buy box: the card fell back to the list price (`mrp`, 5 850 QAR for the iPhone) instead of the offer (5 050 QAR). Depending on which cache slot answered (see A.4), a refresh showed one or the other.
- India, UAE and Saudi returned zero rows and the page showed its empty state.

This was the first point of divergence for the category symptom: the HTML was faithful to what the API returned, and the API was faithful to the database it was pointed at.

### A.2 The market cookie was rewritten after render

`marketplace-layout-client.tsx` ran a Nominatim reverse-geocode on every page load and called `setSelectedRegion(country_code)` with the result. The server had already rendered the page for the cookie's market; the client then switched the market, re-formatted prices in another currency, and the _next_ refresh served a different catalogue. GPS now only names the city; the market changes only through the picker.

### A.3 Two filter implementations, both copying props into state

`category/[id]/category-filters.tsx` (553 lines) and `subcategory/[id]/subcategory-filters.tsx` (179 lines) each kept a client copy of the server-fetched rows, filled by a `useEffect` after the first paint. The effect ran one frame after the previous category's rows had been shown, and reset only some of the state, so sort and filter selections leaked between categories and the "show more" path lost the market. Both are deleted; one `CatalogFilters` renders from props and is remounted by key when the category, the active filter or the market changes.

### A.4 Cache keys were not canonical, and writes did not invalidate

The catalogue cache key was `JSON.stringify` of the incoming filter object. Property order, the `country` parameter and `undefined` members all changed the key, so one logical listing had several slots that aged separately and a refresh could hit a slot filled minutes earlier. Seller price, stock and image writes, variant stock, and admin approve/reject/suspend never invalidated anything, so a new price stayed invisible until the TTL. The gateway's `PublicCache` decorator added `stale-while-revalidate`, which let any intermediary serve an expired body while refreshing.

### A.5 Ordering without a tiebreak

`ORDER BY price ASC` (and rating, and created date) with equal values is unspecified in Postgres; the planner is free to return equal rows in different orders between executions, and the closure-table `findDescendants` is unordered. Two concurrent reads of the same listing could therefore produce two card orders, and the client's keyed reconciliation then moved cards around.

### A.6 Two category route families

`GET /marketplace/categories` went over gRPC; `GET /marketplace/category-list` and `/category-list/:id` went over TCP; shared-core had `getCategories()` and `marketplaceApi.categories` pointing at different ones. The listing header (category name, count) and the listing body could come from different caches with different ages.

### A.7 Demo data on the storefront

`packages/shared-core/src/demo-data/marketplace.ts` (454 lines) and the `BRAND_PROMOS` / hero tiles in `marketplace-home.ts` were rendered by the zone home, the brand page and the cart whenever the live feed was empty or slow. A throttled or failed fetch therefore produced a plausible but different page rather than an error.

### A.8 Kafka identity and membership

`serviceIdentity()` resolved the client id from `npm_lifecycle_event`, then `process.cwd()`, then `require.main.filename`, then `'app'`. `require.main` is `undefined` inside every rspack bundle, so the production branch was dead code; the smoke harness, vitest-booted modules and the container images all fell to `app`. Eight modules joined `kartseek-consumers-app-client`; the gateway's clients joined `kartseek-gateway-app-client`. Every client also ran a consumer although no service does request/reply over Kafka (every `.send()` in the codebase is a TCP `ClientProxy`). The broker log shows what that costs: a join into a group that still holds a killed member waits out that member's remaining session timeout, **12.7 s and 20.2 s** measured, and every hot reload under `nest --watch` is such a kill.

### A.9 kafkajs negative timer

`RequestQueue.scheduleCheckPendingRequests()` computed `this.throttledUntil - Date.now()` with `throttledUntil = -1` and handed the negative number to `setTimeout` whenever nothing was pending, which Node reports once per process as `TimeoutNegativeWarning`.

### A.10 Offer-level approval did not invalidate

`approveListing` and `rejectListing` in `marketplace.service.ts` saved the offer, recomputed the buy box and published the event, but did not drop the cached lists that embed the product; the product-level approve/reject paths did. The new e2e scenario that rejects an offer and reads the category listing again caught it on its first run: the API still returned the offer. Both methods now call the same `invalidateCatalogueCaches(productId)` helper after the commit.

## B. Reproduction and the first point of divergence

### B.1 Category page, five refreshes

Before the fix, with the Qatar cookie, `curl` of the gateway showed `listings: []` for every product in `mobiles-tablets`; the page rendered list prices and, on some refreshes, the buy-box price from an older cache slot. After seeding 5432 and restoring the store:

| Market | Rows | Buy box on first row | Price        |
| ------ | ---- | -------------------- | ------------ |
| QA     | 12   | yes                  | 5 050.00 QAR |
| IN     | 12   | yes                  | ₹            |
| AE     | 12   | yes                  | AED          |
| SA     | 12   | yes                  | SAR          |

The e2e matrix now compares card ids, prices and the visible count across five refreshes and finds them equal.

### B.2 Region drift

With the India cookie, the SSR HTML carried ₹ prices; after hydration the header's GPS callback set the market to QA and the DOM re-rendered in QAR. Removing the `setSelectedRegion` call ends it: `curl` with the India cookie and the hydrated page now show the same currency.

### B.3 Product A → B → refresh

The product page's `VariantProvider` kept its state across product changes; it is now keyed `product.id:market`. The e2e matrix opens A, refreshes five times, opens B, refreshes, goes back and forward, refreshes, and checks the title and the URL each time.

### B.4 A red herring worth recording

A "24 cards instead of 12" reading came from counting anchors in the HTML: React's streaming renders a hidden segment (`div#S:2`, `display:none`) that duplicates the list during hydration. It is not user-visible and was discarded as a lead.

## C. The architecture as it actually runs

```
Browser
  └─ Next shell :3000  (rewrites /marketplace/* → zone; zoneHref; X-Country-Code from proxy.ts)
       └─ Marketplace zone :3002  (basePath /marketplace; server components; cache())
            └─ API gateway :3001  /api/v1  (Throttler 600/min + DDoS layer 100/min, 20/5 s; PublicCache)
                 └─ marketplace backend  HTTP :3012 · TCP :4002 · gRPC :5006
                      ├─ Postgres 5432 kartseek_db, schema marketplace.*  (5433 exists and is NOT used)
                      ├─ Redis  marketplace:v2:<market>:<kind>[:identity]
                      └─ Kafka  producer-only (kartseek-marketplace-service-client)
```

Market resolution: `proxy.ts` → `X-Country-Code` header/cookie → `requestCountry()` on the server → `?country=` on API calls; the client sends `X-Region-Code` from the cookie. The zone does not run its own region detection any more.

## D. Fixes by layer

### D.1 Kafka and messaging (`a84644e`)

- `apps/api/libs/kafka/src/kafka.module.ts`: `KafkaModule.forService('<services.yaml name>')` declares the identity; `SERVICE_NAME` (read through `ConfigService`, so a module `.env` counts) overrides; a blank or invalid name throws. Client id is `kartseek-<service>` (Nest appends `-client`). `KAFKA_CLIENT_ID` is no longer read by the library.
- All clients are `producerOnlyMode: true`: no consumer, no group membership. The consumer `groupId` remains configured as `${KAFKA_GROUP_ID}-<service>` for any future consumer, and is inert today.
- The gateway WebSocket bridge (`kafka-consumer.service.ts`) keeps a **per-instance** group `kartseek-consumers-event-bridge-<host>-<pid>` by design: every replica must see every event for its own sockets. Empty groups are garbage-collected by the broker after `offsets.retention.minutes`.
- `app.enableShutdownHooks()` in all 26 `main.ts`, so a stopping process leaves its group instead of timing out.
- `KafkaProducerService` gained `onModuleDestroy`, `isConnected`, `identity` and `health(ms)` (admin `describeCluster` with a deadline; never throws) for readiness checks.
- Tokens moved to `kafka.tokens.ts` because the module ↔ producer import cycle produced `@Inject(undefined)`.
- Broker after the change (`kafka-consumer-groups.sh --list`): `audit-log-consumers-server`, `notification-password-reset`, `notification-service.events`, `search-indexer-server`, and the bridge groups. No `*-app-client` group exists.

The real consumers in the platform are four: search indexer, audit log, notification password-reset, and the gateway bridge. The `@EventPattern` handlers in loyalty, payment, payout and wallet are unreachable because those `main.ts` connect only the TCP transport; flagged in §G, not changed here.

### D.2 Redis cache scheme and invalidation (`29f7a6e`)

`modules/marketplace/backend/src/catalog/catalog-cache.ts`:

- Keys: `marketplace:v2:<market>:<kind>[:identity]`, `market` = the ISO code or `global`. Kinds: categories, categoryAttributes, brands, topBrands, verifiedSellers, products, product, featured, deals, flashDeals, search, home. Listing keys end in `canonicalFilterHash()` (sorted keys, `undefined` dropped, `country` excluded because the market is already the key's segment).
- TTL tiers in `CATALOG_TTL` (catalogue structure long, listings short, product medium).
- `CatalogCache.invalidateProduct / invalidateListings / invalidateProductAndListings / invalidateCategories / invalidateCategoryAttributes / invalidateBrands / invalidateSellers`, each logging `reqId=`.
- Invalidation is called **after** the write commits: seller `updateListing` (price/stock/condition/availability), image writes, variant stock (after the transaction, which returns the `productId`), admin approve/reject/suspend for products and sellers, admin approve/reject for single offers (added after the e2e write scenario caught the gap), and the home feed. No event is published before the commit.
- Region/language/currency: currency and language are derived from the market on the client and never enter a cache key; a listing is cached once per market, and the market is a key segment, so India and Qatar cannot share a slot (e2e: "two markets never share a cached listing").

Next.js side: no global `no-store`. Server components read through `cache()` per request; the shell's `PublicCache(600)` on category reads now emits `public, max-age=0, s-maxage=600` (no `stale-while-revalidate`), and paginated "show more" carries the market.

### D.3 Gateway (`980135e`)

- `GET /marketplace/categories` and `GET /marketplace/categories/:idOrSlug` over TCP (`{ id: idOrSlug }`); `/category-list*` removed; gRPC no longer used for categories.
- `sendToMarketplace(cmd, payload, req)` adds `_internalSecret` and `_requestId` (from `req.requestId ?? req.headers['x-request-id']`) to every catalogue command.
- `PublicCache(seconds)` → `public, max-age=0, s-maxage=<seconds>`; regression spec lists the routes that carry it.

### D.4 SSR, hydration and state ownership (`5c185e9`)

- One owner per piece of state: the server fetch owns the rows, the URL owns the active filter, the cookie owns the market. `CatalogFilters` receives all three as props and is remounted by key `${category.id}:${activeSub}:${country}` (subcategory: plus sort/min/max). Nothing copies props into state.
- Product cards carry stable keys (`product.id`), and `mapCatalogRow()` is the single mapping from an API row to a card.
- The GPS lookup no longer changes the market.
- The home page renders the live feed or `HomeFeedUnavailable` with a retry; `pickProducts(feedArr)` has no fallback.
- Both `loading.tsx` re-export `CatalogListingSkeleton`, so the loading state has the final layout.

### D.5 Database and ordering (`29f7a6e`)

- Every sorted read ends on the primary key (`addOrderBy('p.id', 'ASC')`, `order: { …, id: 'ASC' }`); category trees are sorted in code (`sortCategories/sortTree`) because `findDescendants` is unordered.
- The service logs the database it opened (`host:port/db`) and, per active market, live sellers and listings at boot; zero is an ERROR naming the seed command, so "readiness is green and every market but one is empty" cannot recur silently.
- Seeded 5432 with the same seed as 5433 and restored the Qatar store; verified both instances hold identical seller/listing counts per market.

### D.6 Category and product identity

- A category is addressed by slug in URLs and resolved to one id by `GET /marketplace/categories/:idOrSlug`; the e2e scenario resolves `mobiles-tablets` five times and gets one id.
- A product URL is `<slug>-<uuid>`; the uuid does the lookup and the slug is decorative. No href gains a second `/marketplace` prefix (e2e).

### D.7 Correlation ids

`X-Request-Id` (gateway) → `_requestId` on the TCP payload → `RpcContextInterceptor` strips it and runs the handler inside `requestContext.run` (AsyncLocalStorage) → `currentRequestId()` in cache and read logs (`reqId=`). The same id therefore appears in the gateway access log, the backend read log and the cache hit/miss/invalidate log for one page render.

### D.8 `TimeoutNegativeWarning`

`patches/kafkajs+2.2.4.patch` (applied by the root `postinstall`): `scheduleCheckPendingRequests()` returns early when nothing is pending and the queue is not throttled, and otherwise schedules `max(throttledUntil - now, CHECK_PENDING_REQUESTS_INTERVAL)`; a second schedule while one is armed is a no-op. `kafkajs-request-queue.spec.ts` pins the behaviour against the installed module (a control test proves a negative `setTimeout` still warns, so the spec would fail if the patch were lost on an upgrade).

## E. Tests and verification

### E.1 Automated

| Suite                                   | Result                        |
| --------------------------------------- | ----------------------------- |
| marketplace backend (vitest)            | 310 / 310                     |
| `libs/kafka` (vitest, incl. patch pin)  | 15 / 15                       |
| gateway marketplace + PublicCache specs | 34 / 34                       |
| marketplace zone (jest)                 | 24 / 24                       |
| web `region-copy`                       | 11 / 11                       |
| `tsc --noEmit` zone, web, api           | clean                         |
| eslint on every touched file            | clean (lint-staged on commit) |

### E.2 End-to-end matrix (`apps/web/e2e/marketplace-consistency.spec.ts`, system Chrome)

Scenarios: category ×5 refresh; navigate away and back, then refresh; subcategory chip and the dedicated subcategory route; sort/filter never leaks into another category; product A → refresh ×5, A → B → refresh, B → back → forward → refresh; no double `/marketplace` prefix; one scenario per market (QA, IN, AE, SA) comparing every card to the gateway's buy box; two markets never share a cached listing; ten concurrent identical reads return one dataset; cold vs warm cache; slug resolves to one id five times; the retired alias is 404; an admin rejecting and re-approving an offer is visible on the next read, API and page, without a TTL wait.

Pacing: the gateway's DDoS layer counts every request from one address (100 per 60 s, 20 per 5 s, five violations = 15-minute ban) and in development the runner, the Next server's own fetches and the developer's browser all arrive as `127.0.0.1`. The suite charges every page load and API call against a sliding window sized under those limits, using measured costs (category page 2 server + 2 client requests, product page 1 + 15 with StrictMode doubling), opens on a fresh 60-second window, and runs one worker in file order. `E2E_GATEWAY_UNLIMITED=1` skips the pacing once the gateway exempts the address.

Runs on record (all on system Chrome, one worker):

| Run                      | Outcome                             | What it showed                                                                                                                                                 |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 (before pacing)        | 4 / 15, then the address was banned | The suite itself tripped the DDoS layer; every later page rendered "couldn't load"                                                                             |
| 3 (paced)                | 3 / 16, then the worker stopped     | A click that raced hydration (fixed with a retry-until-open), and the fresh-window wait exceeding the hook's own 30 s limit                                    |
| 4 (paced, fixed harness) | 15 / 16 in 4.9 min                  | The write scenario failed on its first run and exposed A.10; the backend fix followed and the scenario passed on re-run (7.3 s)                                |
| 5 (final, after the fix) | **16 / 16 in 5.5 min**              | Every scenario green with no 429 and no strike; the whole run stayed inside the gateway's budget while another session was hot-reloading the gateway libraries |

Run it with:

```bash
cd apps/web && npx playwright test e2e/marketplace-consistency.spec.ts --project=chrome --workers=1
```

### E.3 Fleet health

Checked at 16:47 local time after the e2e run, while the infrastructure session's fix wave was live-editing the gateway libraries (so the gateway had been hot-reloaded during the run). Each zone answers on its own base path; a bare `/` on a zone port is a 404 by design (basePath).

| Port | What                     | Probe                | Status |
| ---- | ------------------------ | -------------------- | ------ |
| 3000 | Next shell (`dev`)       | `GET /`              | 200    |
| 3001 | API gateway              | `GET /api/v1/health` | 200    |
| 3002 | marketplace zone         | `GET /marketplace`   | 200    |
| 3003 | grocery zone             | `GET /grocery`       | 200    |
| 3004 | restaurant zone          | `GET /restaurant`    | 200    |
| 3005 | pharmacy zone            | `GET /pharmacy`      | 200    |
| 3006 | doctor zone              | `GET /doctor`        | 200    |
| 3007 | hotel zone               | `GET /hotel-booking` | 200    |
| 3008 | taxi zone                | `GET /taxi`          | 200    |
| 3009 | franchise zone           | `GET /franchise`     | 200    |
| 3012 | marketplace backend HTTP | `GET /health`        | 200    |
| 4002 | marketplace backend TCP  | connect              | open   |
| 5006 | marketplace backend gRPC | connect              | open   |

No port was changed. `.claude/launch.json` no longer lists two entries on 3000 (`web` was a strict subset of `dev`).

## F. Design system

The listing pages were rebuilt on `packages/shared-ui` tokens rather than local styles: `design-tokens.css`, `.card`, `.btn`, `.chip` / `.chip-active`, `card-grid-2-4`, `chip-row`, `font-heading` (Outfit) and the `brand-*` palette; every product image goes through `ProductThumb`. `CatalogListingHeader` carries the breadcrumb trail, category icon (`components/category-icon.tsx`, the one icon map, also used by the product card), title, count and subcategory chips; `CatalogListingNotice` is the empty state; `CatalogListingSkeleton` is the loading state with the final layout; `HomeFeedUnavailable` is the error state with a retry. Verified by screenshot at desktop and mobile widths.

## G. Findings outside this change

1. **The DDoS layer throttles the Next server as one client.** In development every SSR fetch, the runner and the developer's browser share `127.0.0.1`; in production the Next pods reach the gateway from a handful of addresses, and a product page alone makes 15 client-side gateway requests (8 distinct calls, doubled by StrictMode in dev) against a 20-per-5-second burst limit, so two product views within five seconds from one address is a violation. A Firefox session on this machine took a `burst_flood` strike during the investigation. The infrastructure session is exempting loopback in development; server-to-server calls need a trusted-origin path (an internal header the gateway verifies), and the product page's fan-out should be consolidated. The Throttler guard also overwrites the DDoS layer's `X-RateLimit-*` headers, so clients cannot see the budget that actually applies.
2. `@EventPattern` handlers in loyalty, payment, payout and wallet are unreachable (their `main.ts` connect only TCP). Either connect a Kafka microservice transport in those four, or delete the handlers.
3. The gateway's `config/app.config.ts` still reads `KAFKA_CLIENT_ID` (infrastructure session's path).
4. External seed image hosts answer 500 for some product images; `ProductThumb` shows its placeholder.
5. The admin console's `marketplace-context.tsx` still seeds from `demo-data/marketplace-home.ts` and `marketplace-images.ts`; those two files remain only for it (admin-platform program).
6. Five `kartseek-consumers-event-bridge-desktop-*` groups on the broker are the gateway's restarts during this work; they hold no members and expire with the broker's offset retention.
7. `apps/web/playwright.config.ts` still lists `chromium` and `mobile-chrome` projects that need the Playwright browser download; `chrome` is the one that runs on this machine.

## H. Legacy removed

Deleted outright (no `legacy/old/v1` copies kept):

- `modules/marketplace/frontend/src/app/category/[id]/category-filters.tsx` (553 lines)
- `modules/marketplace/frontend/src/app/subcategory/[id]/subcategory-filters.tsx` (179 lines)
- `packages/shared-core/src/demo-data/marketplace.ts` (454 lines, the demo catalogue)
- `packages/shared-core/src/modules/marketplace-api.ts` (235 lines, the duplicate client)
- `marketplaceApi` endpoint map in `packages/shared-core/src/api-endpoints.ts` (107 lines)
- `apps/api/libs/kafka/src/kafka.topics.ts`
- Gateway `/marketplace/category-list*` routes and the gRPC category path
- `BRAND_PROMOS`, the cashback promotion and the hero tiles in `demo-data/marketplace-home.ts`
- The `web` entry in `.claude/launch.json` (a strict subset of `dev`, both on port 3000)
- Header GPS → `setSelectedRegion` override
- `serviceIdentity()` launch-shape detection and `KafkaModule.register([...])`

## Appendix: commits

| Commit    | Scope                                                                                                  | Files |
| --------- | ------------------------------------------------------------------------------------------------------ | ----- |
| `a84644e` | Kafka identity, producer-only, shutdown hooks, kafkajs patch, `MarketCoverageCheck`                    | 61    |
| `29f7a6e` | Marketplace backend: cache keys, invalidation, ORDER BY, request context                               | 14    |
| `980135e` | Gateway category routes, request ids, `PublicCache`, shared-core client                                | 7     |
| `5c185e9` | Zone listing shell, one-way data flow, no demo fallbacks, shell trending rail, e2e                     | 27    |
| `a0dbc3f` | e2e pacing under the gateway's per-address limits, hydration-safe sort click, write-then-read scenario | 1     |
| `eed98b0` | Offer approve/reject invalidate the catalogue cache (A.10); this report                                | 2     |

Memory notes for future sessions: `project_marketplace_db_target_drift`, `project_marketplace_catalog_cache_scheme`, `project_kafka_identity_and_producer_only`, `project_marketplace_listing_data_flow`.
