import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * The TypeORM CLI's DataSource for the **marketplace module's own** database.
 * **Migrations only**; no application code imports this.
 *
 *     npm run migration:show    # what is pending here
 *     npm run migration:run     # apply it
 *     npm run migration:revert  # undo the last one
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Until now the marketplace module had no migration runner at all. Its schema
 * came from `synchronize`, which is on for every non-production `NODE_ENV`
 * (`marketplace-service.module.ts:150`), and that is not a deployment path — it
 * is a development convenience with a destructive edge. Narrowing
 * `bank_offers.region_code` from `varchar` to `varchar(2)` in an entity made
 * `synchronize` DROP and recreate the column on the next boot, silently
 * emptying the two rows that had a market (R11, 2026-09-12). A column change
 * needs a migration that says what it does; an annotation that a sync engine
 * interprets is not one.
 *
 * ── Note for the INFRA plan ─────────────────────────────────────────────────
 *
 * This is deliberately the **minimum** runner for one module, added because R11
 * needed three columns and had nowhere to put them. Every other module backend
 * (grocery, hotel, restaurant, pharmacy, taxi, doctor, franchise) has the same
 * gap and the same `synchronize`-in-dev arrangement. Generalising this — one
 * runner per module database, a shared `migration:*` script shape, and a CI gate
 * that fails when an entity column has no migration behind it — is INFRA's to
 * do, not this task's. Four things it will want to keep from here:
 *
 *   • credentials resolve `MARKETPLACE_DB_*` first and `DB_*` second, exactly as
 *     `marketplace-service.module.ts` does, so the runner and the service can
 *     never reach different databases;
 *   • `schema: 'marketplace'`, because the `migrations` ledger has to live
 *     beside the tables it describes, and this database also carries `public.*`
 *     decoy copies of the marketplace tables (`project_marketplace_schema_decoys`)
 *     that an unqualified name resolves to first;
 *   • `entities: []`, for the same reason `data-source.main.ts` says so — a
 *     loaded entity set permits `schema:sync` and `migration:generate` from
 *     here, and a generate run against a partial set emits DROPs;
 *   • migrations listed explicitly rather than by glob: a bundled build makes a
 *     `__dirname` glob match nothing (`project_typeorm_entity_glob_webpack`).
 */
export const MarketplaceDataSource = new DataSource({
  type: 'postgres',
  host: process.env.MARKETPLACE_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.MARKETPLACE_DB_PORT || process.env.DB_PORT || 5432),
  username: process.env.MARKETPLACE_DB_USER || process.env.DB_USER || 'postgres',
  password:
    process.env.MARKETPLACE_DB_PASSWORD ||
    process.env.DB_PASSWORD ||
    process.env.DB_PASS ||
    'kartseek123',
  database: process.env.MARKETPLACE_DB_NAME || process.env.DB_NAME || 'kartseek_marketplace',
  schema: 'marketplace',
  entities: [],
  migrations: ['migrations/1786502300000-OfferMarket.ts'],
  migrationsTableName: 'migrations',
  // One transaction per migration: a failure rolls that migration back and
  // leaves every earlier one applied.
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export: the TypeORM CLI refuses a file that exports more than one
// DataSource instance.
