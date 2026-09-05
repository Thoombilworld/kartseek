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

Run any of them from `apps/api` with
`npx ts-node -r tsconfig-paths/register scripts/maintenance/<name>.ts`.
New data repairs belong here too, with a row in this table.
