# One-off data repairs

Scripts that were run once against a development database to repair data,
kept so the repair is reproducible and reviewable. None of them is part of any
`npm` script, and none should be run without reading it first.

| Script | What it did |
| --- | --- |
| `align-franchise-markets.ts` | Re-aligned each franchise's `country`/`currency` with the market registry after the multi-region change. |
| `backfill-seller-owner.ts` | Filled `sellers.owner_id` for rows created before seller ownership existed, so the owner-based authorisation on seller routes had something to check. |
| `sync-restaurant-tables.ts` | Created the restaurant tables that `synchronize` could not express, before the restaurant module had migrations. |
| `create-order-table.sql` | The first hand-written `orders` DDL, from before `order-service` mapped the `Order` entity. Superseded by the migrations in `apps/api/migrations/`. |
| `marketplace-catalog/marketplace-seed.js` | The original marketplace catalogue seed (8 categories, 10 brands, products, listings); superseded by `scripts/seed/seed-marketplace.ts`, kept because the image-repair scripts below assume its IDs. |
| `marketplace-catalog/marketplace-catalog-extra.js` | Added the 12 top-level categories and 13 subcategories the storefront's bundled category grid advertised but the seed never created. |
| `marketplace-catalog/marketplace-seed-variants.js` | Populated `product_variants`, which existed but was empty, so the colour and size pickers had data. |
| `marketplace-catalog/marketplace-update-images.js` | First pass replacing placeholder product images with Unsplash photography. |
| `marketplace-catalog/marketplace-audit-images.js` | Read-only: reports which product image URLs are placeholders and which no longer resolve. |
| `marketplace-catalog/marketplace-fix-images.js` | Repaired rotted URLs, remaining placeholders and single-image products by donating images within a category. |
| `marketplace-catalog/marketplace-revert-crosscategory-images.js` | Undid the donations from `marketplace-fix-images.js` that crossed subcategories. |
| `marketplace-catalog/marketplace-fill-placeholder-images.js` | Replaced the last `placehold.co` tiles with representative photos of each product type. |

Run a TypeScript repair from `apps/api` with
`npx ts-node -r tsconfig-paths/register scripts/maintenance/<name>.ts`; the
plain-JavaScript catalogue scripts run with
`node scripts/maintenance/marketplace-catalog/<name>.js` from `apps/api` (they
resolve `pg` from the working directory). All eight catalogue scripts have
already been applied to the development database; run them again only against
a database you intend to reshape. New data repairs belong here too, with a row
in this table.
