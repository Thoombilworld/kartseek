import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * The DataSource the TypeORM CLI uses. **Migrations only** — no application code
 * imports this.
 *
 * Until now nothing in the repo could run a migration. `apps/api/migrations/`
 * held eleven files and there was no `migration:run` script, no DataSource, and
 * no `migrationsRun` anywhere in the Nest modules: every schema change was
 * applied by `synchronize: true`, which each service turns on outside
 * production. Migrations were therefore written, reviewed, committed — and never
 * executed. Three of them are still pending as this is added.
 *
 * That mattered most for the ones `synchronize` cannot express: expression
 * indexes (the search GIN indexes), data backfills, and constraint *replacements*
 * where the old constraint has to go first. `ListingApprovalAndBuyBox` is the
 * sharp case — `synchronize` will happily add its `approvalStatus` column with
 * the `PENDING` default and perform none of the backfill, which takes the
 * storefront dark because every catalogue read now requires `APPROVED`.
 *
 * ── No entities ─────────────────────────────────────────────────────────────
 *
 * Deliberately empty. Loading them would let someone run `schema:sync` or
 * `migration:generate` from here, and this database is shared by every service:
 * a generate run against a DataSource that knows only the marketplace entities
 * would emit DROP statements for every table it cannot see. Migrations here are
 * hand-written SQL and need no metadata.
 *
 * ── Schema ──────────────────────────────────────────────────────────────────
 *
 * `public`, which is where the `migrations` ledger lives — one ledger for the
 * whole platform, not one per service schema. Migration SQL must therefore
 * **fully qualify every table** (`marketplace.products`, not `products`). This
 * is not a style preference: the early migrations in this folder use bare names
 * like `CREATE TABLE "products"`, which resolve against `search_path` and would
 * build a second set of tables in `public` shadowing the real ones in
 * `marketplace`. No such shadow tables exist today (verified against the dev
 * database) and running those migrations is how they would appear — which is
 * why the historical ones are baselined rather than executed. See
 * `scripts/migration-baseline.ts`.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.MARKETPLACE_DB_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.MARKETPLACE_DB_PORT || process.env.DB_PORT || 5432),
  username: process.env.MARKETPLACE_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.MARKETPLACE_DB_PASSWORD || process.env.DB_PASSWORD || 'kartseek123',
  database: process.env.MARKETPLACE_DB_NAME || process.env.DB_NAME || 'kartseek_db',
  schema: 'public',
  entities: [],
  migrations: ['migrations/*.ts'],
  migrationsTableName: 'migrations',
  // Each migration in its own transaction, so a failure rolls that one back and
  // leaves every migration before it applied. `ListingApprovalAndBuyBox` relies
  // on this: its column addition and its backfill must commit together or not at
  // all, or the catalogue is left invisible.
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export. The TypeORM CLI refuses a file that exports more than one
// value ("Given data source file must contain only one export of DataSource
// instance"), so no default re-export and no config helpers alongside it.
