import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Franchise } from './src/entities/franchise.entity';

/**
 * The TypeORM CLI's DataSource for the **franchise module's own** database.
 * **Migrations only**; no application code imports this.
 *
 *     npm run migration:show      # what is pending here
 *     npm run migration:run       # apply it
 *     npm run migration:revert    # undo the last one
 *     npm run migration:generate -- migrations/AddSomething
 *
 * ── Why this file exists (IN3) ──────────────────────────────────────────────
 *
 * Until now this module had no migration runner at all. Its one table came
 * from `synchronize`, which was on for every non-production `NODE_ENV` — a
 * development convenience with a destructive edge, not a deployment path.
 * Narrowing a column in an entity made `synchronize` DROP and recreate it on
 * the next boot, emptying the rows that had a value (three times during the
 * regional plan). As of IN3 `synchronize` defaults to false in every
 * environment and this directory is the only thing that builds the schema.
 *
 * One table is not a reason to skip the runner. `franchises` carries the
 * per-franchise country and currency the whole multi-region money path reads
 * (`project_franchise_multi_region`), and a single unversioned table is a
 * deploy that either has the column or does not, with nothing to say which.
 *
 * ── The two lists that must not drift ───────────────────────────────────────
 *
 *   • `entities` is written out explicitly and matches
 *     `src/franchise-service.module.ts` verbatim. It has to be populated, not
 *     `[]`: `migration:generate` diffs the entities against a database, so an
 *     empty list diffs nothing against everything and emits a DROP for every
 *     table. Never a `__dirname` glob: a bundled build makes one match nothing.
 *   • `migrations` names every file rather than globbing them, and
 *     `apps/api/test/module-data-sources.spec.ts` fails when a file in
 *     `migrations/` is missing from it or named twice.
 *
 * Credentials resolve `FRANCHISE_DB_*` first and `DB_*` second, exactly as
 * `franchise-service.module.ts` does, so the runner and the service can never
 * reach different databases — in dev that difference is real: the module's own
 * `.env` points at `kartseek_franchise` on :5440 while `DB_*` is the shared
 * instance on :5432.
 *
 * `dotenv/config` reads `.env` from the process's working directory, so **run
 * these scripts from this directory**. Run them from the repository root and
 * `FRANCHISE_DB_*` is unset, `DB_*` answers instead, and the migration lands in
 * the shared database's `franchise` schema.
 */
export const FranchiseDataSource = new DataSource({
  type: 'postgres',
  host: process.env.FRANCHISE_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.FRANCHISE_DB_PORT || process.env.DB_PORT || 5440),
  username: process.env.FRANCHISE_DB_USER || process.env.DB_USER || 'franchise_user',
  password:
    process.env.FRANCHISE_DB_PASSWORD ||
    process.env.DB_PASSWORD ||
    process.env.DB_PASS ||
    'postgres',
  database: process.env.FRANCHISE_DB_NAME || process.env.DB_NAME || 'kartseek_franchise',
  schema: 'franchise',
  entities: [Franchise],
  migrations: ['migrations/1786498700000-InitialFranchiseSchema.ts'],
  migrationsTableName: 'migrations',
  // One transaction per migration: a failure rolls that migration back and
  // leaves every earlier one applied.
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export: the TypeORM CLI refuses a file that exports more than one
// DataSource instance.
