import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from './data-source';
import { MainDataSource } from './data-source.main';

/**
 * The migration folder is partitioned between two databases, and this is what
 * keeps it partitioned.
 *
 * There used to be one DataSource with `migrations: ['migrations/*.ts']`, and it
 * resolves `MARKETPLACE_DB_*` before `DB_*` — so the CLI's only runnable path
 * pointed at the marketplace database while five of the files change `users`,
 * `order.orders` and the `admin` schema, which live in the gateway's. Running
 * them built `admin.admin_roles` in the wrong database and left
 * `users.admin_role_id` uncreated, and `AuthController` reads that column on
 * every sign-in: a fresh deploy would answer 500 to every staff login. In dev
 * the three newest were applied by hand, which is precisely why the gap stayed
 * invisible.
 *
 * A glob cannot express "these seven go elsewhere", so both DataSources now name
 * their migrations. Naming them is only safe if something notices a file that
 * belongs to neither list — which is this spec. It reads `options.migrations`
 * from the two DataSources rather than the source text, so what is asserted is
 * what the CLI will actually load.
 */

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/** The migration paths a DataSource declares, as bare file names. */
function declared(ds: { options: { migrations?: unknown } }): string[] {
  const list = ds.options.migrations;
  if (!Array.isArray(list)) {
    throw new Error('migrations must be an explicit array, never a glob — see data-source.main.ts');
  }
  return list.map((entry) => {
    if (typeof entry !== 'string') {
      throw new Error(`migrations entries must be paths, got ${typeof entry}`);
    }
    return path.basename(entry);
  });
}

const onDisk = fs.readdirSync(MIGRATIONS_DIR).sort();
const tsOnDisk = onDisk.filter((f) => f.endsWith('.ts'));
const marketplace = declared(AppDataSource);
const main = declared(MainDataSource);

describe('migration classification', () => {
  it('assigns every migration file to exactly one DataSource', () => {
    const unassigned = tsOnDisk.filter((f) => !marketplace.includes(f) && !main.includes(f));
    const both = tsOnDisk.filter((f) => marketplace.includes(f) && main.includes(f));

    // Named so a failure says which file and what to do about it.
    expect({ unassigned, both }).toEqual({ unassigned: [], both: [] });
  });

  it('names no migration that does not exist', () => {
    const missing = [...marketplace, ...main].filter((f) => !tsOnDisk.includes(f));
    expect(missing).toEqual([]);
  });

  it('covers the folder exactly — no duplicates inside either list', () => {
    const all = [...marketplace, ...main];
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(tsOnDisk.length);
  });

  it('sends the main-database migrations to the main-database DataSource', () => {
    // The seven whose `up()` targets `users`, `order.orders`, `admin.*`, or a
    // table the gateway process itself owns. `data-source.main.ts` carries the
    // reasoning per file; this is the list that reasoning produced.
    expect(main.sort()).toEqual(
      [
        '1785600000000-UserSellerType.ts',
        '1786500400000-GatewayOwnedTables.ts',
        '1786501600000-UserRegionScope.ts',
        '1786501700000-OrderMarket.ts',
        '1786501800000-AdminRoles.ts',
        '1786501900000-UserMarketBackfill.ts',
        '1786502000000-UserBanColumns.ts',
      ].sort(),
    );
  });

  it('keeps the baselined marketplace schema out of the main database', () => {
    // `1719468000000-InitialMarketplaceSchema` creates a bare `users` table as
    // part of the original all-in-one schema, so a "does it mention users" rule
    // would pull it across and rebuild the whole marketplace catalogue inside
    // the gateway's database. It is baselined and never executed.
    expect(main).not.toContain('1719468000000-InitialMarketplaceSchema.ts');
    expect(marketplace).toContain('1719468000000-InitialMarketplaceSchema.ts');
  });

  it('has exactly one non-TypeScript file, which neither runner loads', () => {
    // `1753660800000-GatewayOfferTables.sql` is raw SQL with no
    // `MigrationInterface` class; it is applied by hand. A second one appearing
    // silently is what this catches.
    expect(onDisk.filter((f) => !f.endsWith('.ts'))).toEqual([
      '1753660800000-GatewayOfferTables.sql',
    ]);
  });
});

describe('the two DataSources point at different databases', () => {
  it('resolves the main database from DB_*, with no marketplace fallback', () => {
    const o = MainDataSource.options as Record<string, unknown>;
    expect(o.database).toBe(process.env.DB_NAME || 'kartseek_db');
    expect(o.port).toBe(Number(process.env.DB_PORT || 5432));
    expect(o.synchronize).toBe(false);
    // Empty entity list: a populated one would permit `schema:sync` /
    // `migration:generate` against a partial view of a shared database, which
    // emits DROP statements for every table it cannot see.
    expect(o.entities).toEqual([]);
  });

  it('reads the same ledger table, per database', () => {
    expect((MainDataSource.options as Record<string, unknown>).migrationsTableName).toBe(
      'migrations',
    );
    expect((AppDataSource.options as Record<string, unknown>).migrationsTableName).toBe(
      'migrations',
    );
  });
});
