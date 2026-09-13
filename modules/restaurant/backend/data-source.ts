import 'dotenv/config';
import { DataSource } from 'typeorm';
import { resolveRestaurantDbConfig, RESTAURANT_MIGRATIONS_TABLE } from './src/db-config';
import {
  Restaurant,
  MenuCategory,
  MenuItem,
  RestaurantOrder,
  Reservation,
  RestaurantReview,
  RestaurantTable,
  RestaurantPromotion,
  RestaurantStaff,
  RestaurantCuisine,
  RestaurantDeliveryZone,
  RestaurantComplaint,
} from './src/entities';

/**
 * The TypeORM CLI's DataSource for the **restaurant module's own** database.
 * **Migrations only**; no application code imports this.
 *
 *     npm run migration:show    # what is pending here
 *     npm run migration:run     # apply it
 *     npm run migration:revert  # undo the last one
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * This module had no migration runner. Its schema came from `synchronize`,
 * which is on for every non-production `NODE_ENV`, and that is not a
 * deployment path — it is a development convenience with a destructive edge.
 * Narrowing a column in an entity made `synchronize` DROP and recreate it on
 * the next boot, silently emptying the rows that had a value (R11,
 * 2026-09-12, on `marketplace.bank_offers`). A column change needs a
 * migration that says what it does; an annotation a sync engine interprets is
 * not one.
 *
 * ── Note for the INFRA plan ─────────────────────────────────────────────────
 *
 * Deliberately the MINIMUM runner for one module, added because R11 needed to
 * drop a dead market column and had nowhere to put it. Grocery, taxi, doctor
 * and franchise have the same gap. Generalising this — one runner per module
 * database, a shared `migration:*` script shape, and a CI gate that fails
 * when an entity column has no migration behind it — is INFRA's, not this
 * task's. Four things to keep:
 *
 *   • credentials resolve `RESTAURANT_DB_*` first and `DB_*` second, exactly as
 *     this module's own TypeORM factory does, so the runner and the service can
 *     never reach different databases;
 *   • `schema: 'restaurant'`, because the `migrations` ledger has to live
 *     beside the tables it describes;
 *   • migrations listed explicitly, never a glob: a bundled build makes a
 *     `__dirname` glob match nothing.
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
 *
 * ── The schema, and where the ledger lives ──────────────────────────────────
 *
 * This DataSource deliberately declares **no `schema`**. TypeORM builds the
 * migration ledger inside `options.schema` and does it *before* the first
 * migration's `up()` runs, so with `schema: 'restaurant'` a fresh dedicated database
 * died on `CREATE TABLE "restaurant"."migrations"` — schema does not exist — and no
 * `CREATE SCHEMA` inside a migration could ever run early enough to help. The
 * ledger is `public.restaurant_migrations` (see `src/db-config.ts`), and
 * `migrations/*-InitialRestaurantSchema.ts` creates the schema as its first
 * statement. Each entity names `schema: 'restaurant'` itself, so `migration:generate`
 * still diffs the right schema.
 *
 * Connection details come from `resolveRestaurantDbConfig` — the same function
 * `src/restaurant-service.module.ts` calls, so the runner and the service cannot
 * resolve to different databases. `RESTAURANT_DB_*` wins, `DB_*` answers next.
 */
export const RestaurantDataSource = new DataSource({
  type: 'postgres',
  // One resolver, shared with the service — see src/db-config.ts.
  ...resolveRestaurantDbConfig((key) => process.env[key]),
  // No `schema` here on purpose: TypeORM would build the ledger inside it,
  // before the first migration could create it. The entities name it instead.
  entities: [
    Restaurant,
    MenuCategory,
    MenuItem,
    RestaurantOrder,
    Reservation,
    RestaurantReview,
    RestaurantTable,
    RestaurantPromotion,
    RestaurantStaff,
    RestaurantCuisine,
    RestaurantDeliveryZone,
    RestaurantComplaint,
  ],
  migrations: [
    'migrations/1786498200000-InitialRestaurantSchema.ts',
    'migrations/1786502400000-DropDeadMarketColumns.ts',
    'migrations/1786503200000-RestaurantAdminSurfaces.ts',
  ],
  migrationsTableName: RESTAURANT_MIGRATIONS_TABLE,
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export: the TypeORM CLI refuses a file that exports more than one
// DataSource instance.
