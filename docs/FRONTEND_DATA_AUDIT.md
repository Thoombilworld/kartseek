# Frontend data audit — where the storefronts get their content

Measured 30 August 2026, after the seven-module micro-frontend extraction.

## The headline

**161 of 206 route pages (78%) never call their module's API.** They render
hardcoded arrays declared in the page file or imported from `lib/demo-data`.

This is not the same problem as a broken endpoint. Every module's API works —
each was verified end to end against its own database during extraction. The
pages simply do not ask.

| Module | Pages calling the API | Hardcoded only |
|---|---:|---:|
| marketplace | 2 | 48 |
| hotel | 2 | 33 |
| pharmacy | 4 | 29 |
| restaurant | 9 | 19 |
| doctor | 6 | 10 |
| taxi | 5 | 10 |
| grocery | 17 | 12 |

Grocery is the outlier in the right direction — most of its pages are wired to
its service. It is the model for what the others should look like.

## Why this is easy to miss

The pages look correct. They render products, prices, ratings and stock levels,
and a reviewer scrolling the UI sees a working storefront. `/marketplace`
renders "Best of Electronics" with discount badges from
`lib/demo-data/marketplace-home`, while `/api/v1/marketplace/products` returns
178 real products from `kartseek_marketplace` that no page displays.

Two consequences worth being explicit about:

- Seeding a module changes nothing on screen. Doctor and hotel were seeded and
  their pages still show whatever was hardcoded, except where a page happens to
  be one of the few that fetches.
- A broken API is invisible. If a module's service is down, a hardcoded page
  renders exactly as it does when the service is healthy.

## Currency is hardcoded too

290 occurrences of a literal `₹` across 71 files in all seven zones:

| Module | Files | Occurrences |
|---|---:|---:|
| pharmacy | 17 | 108 |
| doctor | 6 | 75 |
| restaurant | 12 | 50 |
| marketplace | 17 | 28 |
| hotel | 6 | 13 |
| grocery | 9 | 12 |
| taxi | 4 | 4 |

Most sit inside the mock arrays above (`minOrder: '₹499'`), so they disappear
with the data they belong to. The rest are display formatting and should use
`formatCurrencyValue` from the region context, which already resolves the
market's currency, or `formatMoney` from `shared-core/localization`.

Until then every market sees Indian pricing, including the Qatar storefront
these modules were largely built and demonstrated against.

## Pharmacy in detail

Asked for specifically. `modules/pharmacy/frontend/src/app/page.tsx` declares
seven hardcoded arrays — `CATEGORIES`, `STORES`, `BRANDS`, `FLASH_DEALS`,
`FEATURED_PRODUCTS`, `SPONSORED_PRODUCTS`, `PROMOS` — and makes exactly one
network call, for its admin-configured page layout. It never asks
pharmacy-service for anything, although that service holds 6 stores and 162
items in `kartseek_pharmacy` and answers `/api/v1/pharmacy/stores` correctly.

Store records carry literal strings such as `minOrder: '₹499'` and
`deliveryFee: '₹40'`, so the fake data and the fake currency are the same
problem in the same lines.

## Recommended order of work

1. **One page, end to end, as the reference.** Pharmacy's store list is the
   smallest useful target: the API exists, returns real rows, and the page is
   self-contained. Grocery's store list is the pattern to copy.
2. **Home pages next**, module by module. They are the highest-traffic pages and
   the biggest single block of demo data.
3. **Currency last**, once the mock arrays are gone — most of the 290 literals
   go with them, and what remains is a mechanical swap to `formatCurrencyValue`.

Not recommended: a bulk find-and-replace of `₹`. It would leave the fake prices
in place and correctly formatted, which is worse than obviously wrong.

## How this was measured

Per page, whether the file references its module API client or fetches from
`API_BASE`. It undercounts pages that receive data through a parent or a shared
hook, so the true figure is somewhat better than 161 — but spot-checking the
largest offenders (marketplace and pharmacy home pages) confirmed both are
genuinely demo-driven.

```bash
for z in marketplace grocery restaurant pharmacy doctor hotel taxi; do
  for f in $(find modules/$z/frontend/src/app -name page.tsx); do
    grep -qE "Api\.|fetch\(\`\\\$\{API_BASE" "$f" || echo "$z $f"
  done
done
```
