import 'dotenv/config';
import { DataSource } from 'typeorm';
import { resolveFranchiseDbConfig, FRANCHISE_MIGRATIONS_TABLE } from './src/db-config';
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
 *
 * ── The schema, and where the ledger lives ──────────────────────────────────
 *
 * This DataSource deliberately declares **no `schema`**. TypeORM builds the
 * migration ledger inside `options.schema` and does it *before* the first
 * migration's `up()` runs, so with `schema: 'franchise'` a fresh dedicated database
 * died on `CREATE TABLE "franchise"."migrations"` — schema does not exist — and no
 * `CREATE SCHEMA` inside a migration could ever run early enough to help. The
 * ledger is `public.franchise_migrations` (see `src/db-config.ts`), and
 * `migrations/*-InitialFranchiseSchema.ts` creates the schema as its first
 * statement. Each entity names `schema: 'franchise'` itself, so `migration:generate`
 * still diffs the right schema.
 *
 * Connection details come from `resolveFranchiseDbConfig` — the same function
 * `src/franchise-service.module.ts` calls, so the runner and the service cannot
 * resolve to different databases. `FRANCHISE_DB_*` wins, `DB_*` answers next.
 */
export const FranchiseDataSource = new DataSource({
  type: 'postgres',
  // One resolver, shared with the service — see src/db-config.ts.
  ...resolveFranchiseDbConfig((key) => process.env[key]),
  // No `schema` here on purpose: TypeORM would build the ledger inside it,
  // before the first migration could create it. The entities name it instead.
  entities: [Franchise],
  migrations: ['migrations/1786498700000-InitialFranchiseSchema.ts'],
  migrationsTableName: FRANCHISE_MIGRATIONS_TABLE,
  // One transaction per migration: a failure rolls that migration back and
  // leaves every earlier one applied.
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export: the TypeORM CLI refuses a file that exports more than one
// DataSource instance.
