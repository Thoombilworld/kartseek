import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  PharmacyStore,
  PharmacyCategory,
  PharmacyItem,
  PharmacyOrder,
  Prescription,
  PharmacyReview,
  PharmacyStaff,
  PharmacyPromotion,
} from './src/entities';

/**
 * The TypeORM CLI's DataSource for the **pharmacy module's own** database.
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
 *   • credentials resolve `PHARMACY_DB_*` first and `DB_*` second, exactly as
 *     this module's own TypeORM factory does, so the runner and the service can
 *     never reach different databases;
 *   • `schema: 'pharmacy'`, because the `migrations` ledger has to live
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
 */
export const PharmacyDataSource = new DataSource({
  type: 'postgres',
  host: process.env.PHARMACY_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.PHARMACY_DB_PORT || process.env.DB_PORT || 5436),
  username: process.env.PHARMACY_DB_USER || process.env.DB_USER || 'pharmacy_user',
  password:
    process.env.PHARMACY_DB_PASSWORD ||
    process.env.DB_PASSWORD ||
    process.env.DB_PASS ||
    'postgres',
  database: process.env.PHARMACY_DB_NAME || process.env.DB_NAME || 'kartseek_pharmacy',
  schema: 'pharmacy',
  entities: [
    PharmacyStore,
    PharmacyCategory,
    PharmacyItem,
    PharmacyOrder,
    Prescription,
    PharmacyReview,
    PharmacyStaff,
    PharmacyPromotion,
  ],
  migrations: [
    'migrations/1786498300000-InitialPharmacySchema.ts',
    'migrations/1786502400000-DropDeadMarketColumns.ts',
  ],
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export: the TypeORM CLI refuses a file that exports more than one
// DataSource instance.
