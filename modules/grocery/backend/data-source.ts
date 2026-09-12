import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  GroceryBrand,
  GroceryProductVariant,
  GroceryStockMovement,
  GroceryWarehouse,
  GroceryVariantStock,
  GroceryCategory,
  GroceryStore,
  GroceryItem,
  GroceryOrder,
  GroceryFlashDeal,
  GroceryReview,
  GroceryWishlist,
  GroceryDeliveryZone,
  GrocerySetting,
} from './src/entities';

/**
 * The TypeORM CLI's DataSource for the **grocery module's own** database.
 * **Migrations only**; no application code imports this.
 *
 *     npm run migration:show    # what is pending here
 *     npm run migration:run     # apply it
 *     npm run migration:revert  # undo the last one
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * The grocery module had no migration runner. Its schema came from
 * `synchronize`, which is on for every non-production `NODE_ENV`
 * (`grocery-service.module.ts`), and that is a development convenience, not a
 * deployment path. R12 added `grocery_settings.region_code` as an entity
 * annotation and nothing else, so the column existed exactly where
 * `synchronize` had been allowed to run: in production `getSettings` would have
 * queried a column that was not there and `GET /admin/grocery/settings` would
 * have answered 500 (review C3 — the failure mode
 * `project_migration_drift_check` records verbatim). The DDL for the table
 * itself lives in `apps/api/migrations/1786500700000-GroceryTables.ts` and is
 * already applied; a change to it needs a migration that says what it does.
 *
 * ── Note for the INFRA plan (IN3) ───────────────────────────────────────────
 *
 * This is the second per-module runner, copied deliberately from
 * `modules/marketplace/backend/data-source.ts` (R11) rather than generalised —
 * two instances is the point at which the shape is known and the abstraction
 * still is not. Every other module backend (hotel, restaurant, pharmacy, taxi,
 * doctor, franchise) has the same gap and the same `synchronize`-in-dev
 * arrangement. One runner per module database, a shared `migration:*` script
 * shape and a CI gate that fails when an entity column has no migration behind
 * it are INFRA's to do. Four things to keep from here:
 *
 *   • credentials resolve `GROCERY_DB_*` first and `DB_*` second, exactly as
 *     `grocery-service.module.ts` does, so the runner and the service can never
 *     reach different databases — in dev that difference is real, the module's
 *     own `.env` points at `kartseek_grocery` on :5434 while `DB_*` is the
 *     shared instance on :5432;
 *   • `schema: 'grocery'`, because the `migrations` ledger has to live beside
 *     the tables it describes and the module owns a dedicated schema;
 *   • migrations listed explicitly rather than by glob: a bundled build makes a
 *     `__dirname` glob match nothing (`project_typeorm_entity_glob_webpack`).
 *
 * `envFilePath` is not a concept `dotenv/config` has: it reads `.env` from the
 * process's working directory, so **run these scripts from this directory**,
 * which is also where `nest start` runs the service from. Run them from the
 * repository root and `GROCERY_DB_*` is unset, `DB_*` answers instead, and the
 * migration lands in the shared database's `grocery` schema.
 *
 * ── The entity list ─────────────────────────────────────────────────────────
 *
 * It used to be `entities: []`, for the reason `data-source.main.ts` gives: a
 * loaded set permits `schema:sync` and `migration:generate` from here, and a
 * generate run against a *partial* set emits a DROP per table it cannot see.
 * IN3 needs it populated — `migration:generate` diffs entities against a
 * database, and an empty list diffs nothing against everything, which emits a
 * DROP for every table there is. The hazard is the same one, so the list is
 * written out explicitly and copied verbatim from the service module's own,
 * never a `__dirname` glob (a bundled build makes one match nothing), and the
 * procedure in `docs/guides/database-migrations.md` greps the generated SQL
 * for DROP before the file is kept. `apps/api/test/module-data-sources.spec.ts`
 * holds the rest of the shape.
 */
export const GroceryDataSource = new DataSource({
  type: 'postgres',
  host: process.env.GROCERY_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.GROCERY_DB_PORT || process.env.DB_PORT || 5432),
  username: process.env.GROCERY_DB_USER || process.env.DB_USER || 'postgres',
  password:
    process.env.GROCERY_DB_PASSWORD ||
    process.env.DB_PASSWORD ||
    process.env.DB_PASS ||
    'kartseek123',
  database: process.env.GROCERY_DB_NAME || process.env.DB_NAME || 'kartseek_db',
  schema: 'grocery',
  entities: [
    GroceryBrand,
    GroceryProductVariant,
    GroceryStockMovement,
    GroceryWarehouse,
    GroceryVariantStock,
    GroceryCategory,
    GroceryStore,
    GroceryItem,
    GroceryOrder,
    GroceryFlashDeal,
    GroceryReview,
    GroceryWishlist,
    GroceryDeliveryZone,
    GrocerySetting,
  ],
  migrations: [
    'migrations/1786498100000-InitialGrocerySchema.ts',
    'migrations/1786502400000-GrocerySettingsMarket.ts',
  ],
  migrationsTableName: 'migrations',
  // One transaction per migration: a failure rolls that migration back and
  // leaves every earlier one applied.
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export: the TypeORM CLI refuses a file that exports more than one
// DataSource instance.
