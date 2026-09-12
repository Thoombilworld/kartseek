import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * The TypeORM CLI's DataSource for the **main** database — the one the API
 * gateway itself connects to. **Migrations only**; no application code imports
 * this.
 *
 *     npm run migration:show:main     # what is pending here
 *     npm run migration:run:main      # apply it
 *     npm run migration:revert:main   # undo the last one
 *
 * ── Why a second DataSource exists ──────────────────────────────────────────
 *
 * `data-source.ts` resolves `MARKETPLACE_DB_*` **before** `DB_*`, and in dev
 * those point at a different Postgres instance entirely (`kartseek_marketplace`
 * on :5433, while the gateway is on `kartseek_db` at :5432). Every migration in
 * `migrations/` was therefore reachable only through a connection to the
 * marketplace database — including the ones that change `users`, `order.orders`
 * and the `admin` schema, which do not live there.
 *
 * The consequence was not theoretical. `1786501800000-AdminRoles` creates
 * `admin.admin_roles` and adds `users.admin_role_id`; run through the old
 * DataSource it would build both in the marketplace database and leave the
 * gateway's `users` table untouched. `AuthController` reads `admin_role_id` on
 * every sign-in, so on a fresh deploy **every login answers 500** — the exact
 * failure the plan's own constraint warns about. In dev the three newest were
 * applied by hand, which is why nobody hit it; nothing made that repeatable.
 *
 * Credentials are the gateway's own: `DB_HOST` / `DB_PORT` / `DB_USER` /
 * `DB_PASSWORD` (with the `DB_PASS` alias `app.config.ts` accepts) / `DB_NAME`,
 * matching `libs/database/src/database.credentials.ts`. No `MARKETPLACE_DB_*`
 * fallback: reaching for one is how a main-DB migration ends up in the
 * marketplace database, which is the bug this file exists to close.
 *
 * ── No entities, same reason as the marketplace DataSource ──────────────────
 *
 * Empty on purpose. Loading them would permit `schema:sync` or
 * `migration:generate` from here, and this database is shared by the gateway,
 * auth, orders and every module that has not been split out — a generate run
 * against a partial entity set emits DROP statements for every table it cannot
 * see. `synchronize` already wanted to drop six live `users` columns once.
 *
 * ── Schema ──────────────────────────────────────────────────────────────────
 *
 * `public`, where this database's `migrations` ledger lives. The ledger is
 * per **database**, so this DataSource and the marketplace one keep separate
 * records even though both read a table called `public.migrations`. Migration
 * SQL must fully qualify anything outside `public` (`admin.admin_roles`,
 * `"order".orders`) — `search_path` is `public` and a bare name silently builds
 * a shadow table there.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CLASSIFICATION — why these seven files and no others
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every migration's `up()` was read and assigned to exactly one DataSource.
 * `data-source.main.spec.ts` asserts the partition: a new file in `migrations/`
 * that is named in neither list — or in both — fails the suite, so this cannot
 * drift back into "there is a glob and nobody knows where it points".
 *
 * The rule: a migration belongs here when its `up()` targets `users`,
 * `order.orders`, the `admin` schema, or a table the **gateway process itself**
 * owns. Everything else stays with `data-source.ts`.
 *
 *   1785600000000-UserSellerType
 *       `ALTER TABLE "users" ADD COLUMN "seller_type"`, two backfill UPDATEs on
 *       `users`, and `IDX_users_seller_type`. Note it *reads*
 *       `marketplace.sellers` in one backfill — harmless where the two
 *       databases are one instance, a no-op backfill where they are split. The
 *       column and the index are what matter and both are `users`.
 *
 *   1786500400000-GatewayOwnedTables
 *       The ~48 entities the gateway registers itself: the whole taxi domain,
 *       the partner and delivery domains, `page_layouts`, `static_pages` — and
 *       `CREATE TYPE "public"."users_role_enum"`, the enum behind `users.role`.
 *       These are the gateway's tables in the gateway's database. Its CREATEs
 *       are *not* `IF NOT EXISTS`, so leaving it pointed at the marketplace
 *       database would also have built forty empty taxi tables there on the
 *       first `migration:run`.
 *
 *   1786501600000-UserRegionScope
 *       `users.region_code` / `users.region_locked` — the regional-admin lock,
 *       read at login and signed into the token.
 *
 *   1786501700000-OrderMarket
 *       `ALTER TABLE "order"."orders"` — the market and currency an order was
 *       placed in. Fully qualified, and the `order` schema is in this database.
 *
 *   1786501800000-AdminRoles
 *       `CREATE SCHEMA "admin"`, `admin.admin_roles`, and
 *       `ALTER TABLE "users" ADD COLUMN "admin_role_id"`. The one whose absence
 *       takes every staff login down.
 *
 *   1786501900000-UserMarketBackfill
 *       Backfills `users.region_code` from `"order".orders.region_code`, adds
 *       the ISO-2 CHECK and `IDX_users_region_code`. Reads the `order` schema
 *       and writes `users`; both live in this database. Its revert ledger,
 *       `public.user_region_backfill_1786501900000`, is created and dropped by
 *       the migration itself.
 *
 *   1786502000000-UserBanColumns
 *       `users.banned_reason` / `users.banned_at` — the record behind a
 *       moderation ban, which the UPDATE in admin-service had always written to
 *       and which had never existed.
 *
 *   1786502100000-SeoOverrides
 *       `public.seo_overrides` — replaces the module-level `Map` in
 *       `admin-seo.controller.ts` (per-process memory, gone on every restart
 *       and inconsistent across replicas) with one row per path. The gateway
 *       process owns and queries this table directly, same as
 *       `page_layouts`/`static_pages` above, so it belongs here rather than
 *       with the marketplace list (R7, audit V17 / H-12).
 *
 * Deliberately **not** here, though each mentions `users` somewhere:
 *
 *   1719468000000-InitialMarketplaceSchema
 *       Creates a bare `CREATE TABLE "users"` as part of the original
 *       all-in-one marketplace schema. It is baselined, never executed — its
 *       unqualified names are exactly the `public.*` shadow tables
 *       `1786400200000-QuarantineShadowPublicTables` exists to quarantine.
 *       Running it here would build the whole marketplace catalogue inside the
 *       main database. It stays with the marketplace list, unrun.
 *
 *   1786500500000-PaymentServiceTables, 1786500600000-LocationServiceTables,
 *   1785840000000-WalletAndPayoutSchemas, 1786500300000-FranchiseTable,
 *   1786500[0-7]00000-* vertical and grocery schemas
 *       Owned by their own services, not by the gateway, and none of them
 *       touches `users`, `orders` or `admin`. They keep whatever database
 *       `data-source.ts` resolves, which is where they were applied. Splitting
 *       them per service is a larger question than this file answers.
 *
 * Not loaded by either DataSource: `1753660800000-GatewayOfferTables.sql`. It
 * is raw SQL (`public.bank_offers`, `public.exchange_offers`) with no
 * `MigrationInterface` class, so no `migrations` glob or list has ever picked
 * it up; it is applied by hand. The spec asserts it is the only non-`.ts` file
 * in the folder, so a second one cannot appear unnoticed.
 *
 * ── Known gap, for the deploy runbook rather than for this file ─────────────
 *
 * Nothing in `migrations/` creates `public.users` in *this* database. It was
 * built by `synchronize` before the databases were split, and the main database
 * is the one that does not synchronize. A genuinely empty main database needs
 * that table before any of the seven below can alter it.
 */
export const MainDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'kartseek123',
  database: process.env.DB_NAME || 'kartseek_db',
  schema: 'public',
  entities: [],
  migrations: [
    'migrations/1785600000000-UserSellerType.ts',
    'migrations/1786500400000-GatewayOwnedTables.ts',
    'migrations/1786501600000-UserRegionScope.ts',
    'migrations/1786501700000-OrderMarket.ts',
    'migrations/1786501800000-AdminRoles.ts',
    'migrations/1786501900000-UserMarketBackfill.ts',
    'migrations/1786502000000-UserBanColumns.ts',
    'migrations/1786502100000-SeoOverrides.ts',
  ],
  migrationsTableName: 'migrations',
  // One transaction per migration, matching the marketplace DataSource: a
  // failure rolls that migration back and leaves every earlier one applied.
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

// Exactly ONE export, for the same reason `data-source.ts` says so: the TypeORM
// CLI refuses a file that exports more than one DataSource instance.
