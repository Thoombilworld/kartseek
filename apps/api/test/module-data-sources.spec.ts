import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage, type DataSource } from 'typeorm';
import { MarketplaceDataSource } from '../../../modules/marketplace/backend/data-source';
import { GroceryDataSource } from '../../../modules/grocery/backend/data-source';
import { RestaurantDataSource } from '../../../modules/restaurant/backend/data-source';
import { PharmacyDataSource } from '../../../modules/pharmacy/backend/data-source';
import { DoctorDataSource } from '../../../modules/doctor/backend/data-source';
import { HotelDataSource } from '../../../modules/hotel/backend/data-source';
import { TaxiDataSource } from '../../../modules/taxi/backend/data-source';
import { FranchiseDataSource } from '../../../modules/franchise/backend/data-source';
import { resolveMarketplaceDbConfig } from '../../../modules/marketplace/backend/src/db-config';
import { resolveGroceryDbConfig } from '../../../modules/grocery/backend/src/db-config';
import { resolveRestaurantDbConfig } from '../../../modules/restaurant/backend/src/db-config';
import { resolvePharmacyDbConfig } from '../../../modules/pharmacy/backend/src/db-config';
import { resolveDoctorDbConfig } from '../../../modules/doctor/backend/src/db-config';
import { resolveHotelDbConfig } from '../../../modules/hotel/backend/src/db-config';
import { resolveTaxiDbConfig } from '../../../modules/taxi/backend/src/db-config';
import { resolveFranchiseDbConfig } from '../../../modules/franchise/backend/src/db-config';

type DbResolver = (read: (key: string) => string | undefined) => {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

/**
 * The nine databases now have nine migration runners, and this is what keeps
 * each one honest about what it will load.
 *
 * `data-source.main.spec.ts` does this for the two DataSources that share
 * `apps/api/migrations/`. The module runners have the opposite hazard: one
 * directory each, so nothing can be misfiled — but a migration list is written
 * by hand, and a file that is added to `migrations/` and forgotten in
 * `data-source.ts` is simply never run. It shows up as a deploy where the
 * column is missing and `migration:show` says nothing is pending, which is the
 * hardest shape of this failure to see. Eight modules × a hand-kept list is
 * eight chances at it.
 *
 * Everything here reads `options` off the DataSource rather than the source
 * text, so what is asserted is what the CLI will actually load.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..');

interface ModuleRunner {
  module: string;
  schema: string;
  dataSource: DataSource;
  resolve: DbResolver;
}

const RUNNERS: ModuleRunner[] = [
  {
    module: 'marketplace',
    schema: 'marketplace',
    dataSource: MarketplaceDataSource,
    resolve: resolveMarketplaceDbConfig,
  },
  {
    module: 'grocery',
    schema: 'grocery',
    dataSource: GroceryDataSource,
    resolve: resolveGroceryDbConfig,
  },
  {
    module: 'restaurant',
    schema: 'restaurant',
    dataSource: RestaurantDataSource,
    resolve: resolveRestaurantDbConfig,
  },
  {
    module: 'pharmacy',
    schema: 'pharmacy',
    dataSource: PharmacyDataSource,
    resolve: resolvePharmacyDbConfig,
  },
  {
    module: 'doctor',
    schema: 'doctor',
    dataSource: DoctorDataSource,
    resolve: resolveDoctorDbConfig,
  },
  { module: 'hotel', schema: 'hotel', dataSource: HotelDataSource, resolve: resolveHotelDbConfig },
  { module: 'taxi', schema: 'taxi', dataSource: TaxiDataSource, resolve: resolveTaxiDbConfig },
  {
    module: 'franchise',
    schema: 'franchise',
    dataSource: FranchiseDataSource,
    resolve: resolveFranchiseDbConfig,
  },
];

const migrationsDir = (module: string) =>
  path.join(REPO_ROOT, 'modules', module, 'backend', 'migrations');

/** The migration paths a DataSource declares, as bare file names. */
function declared(ds: DataSource, module: string): string[] {
  const list = (ds.options as unknown as { migrations?: unknown }).migrations;
  if (!Array.isArray(list)) {
    throw new Error(
      `${module}: migrations must be an explicit array, never a glob — ` +
        `a bundled build makes a __dirname glob match nothing`,
    );
  }
  return list.map((entry) => {
    if (typeof entry !== 'string') {
      throw new Error(`${module}: migrations entries must be paths, got ${typeof entry}`);
    }
    return path.basename(entry);
  });
}

const filesOnDisk = (module: string) =>
  fs
    .readdirSync(migrationsDir(module))
    .filter((f) => f.endsWith('.ts'))
    .sort();

describe.each(RUNNERS)(
  '$module module migration runner',
  ({ module, schema, dataSource, resolve }) => {
    const options = dataSource.options as unknown as Record<string, unknown>;

    it('lists every file in migrations/ exactly once', () => {
      const onDisk = filesOnDisk(module);
      const listed = declared(dataSource, module);

      const unlisted = onDisk.filter((f) => !listed.includes(f));
      const duplicated = listed.filter((f, i) => listed.indexOf(f) !== i);
      const missing = listed.filter((f) => !onDisk.includes(f));

      // Named so a failure says which file and what to do about it: add it to
      // `migrations` in modules/<m>/backend/data-source.ts, or delete it.
      expect({ unlisted, duplicated, missing }).toEqual({
        unlisted: [],
        duplicated: [],
        missing: [],
      });
    });

    it('runs the migrations in timestamp order, initial schema first', () => {
      const listed = declared(dataSource, module);
      const timestamps = listed.map((f) => Number(f.split('-')[0]));

      expect(timestamps.every((t) => Number.isInteger(t) && t > 0)).toBe(true);
      expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);
      // TypeORM orders by timestamp, not by position in this array, so the
      // initial schema has to carry the lowest one — otherwise a fresh deploy
      // runs an ALTER against a table that does not exist yet.
      expect(listed[0]).toMatch(/^\d+-Initial/);
    });

    it('never auto-syncs', () => {
      expect(options.synchronize).toBe(false);
    });

    it('keeps its ledger in public, under its own name', () => {
      // NOT `<m>.migrations`. TypeORM builds the ledger inside `options.schema`
      // and does it *before* the first migration's `up()` runs, so a fresh
      // dedicated database died on `CREATE TABLE "<m>"."migrations"` — the
      // schema does not exist yet and no migration could create it in time.
      // `migrationsSchema` is private and derived from `options.schema`, so the
      // only way to move the ledger is to declare no schema here; the entities
      // carry it instead (asserted below). The per-module name keeps the eight
      // ledgers apart if they ever share a database, where plain
      // `public.migrations` is already the platform's own.
      expect(options.schema).toBeUndefined();
      expect(options.migrationsTableName).toBe(`${module}_migrations`);
    });

    it('declares its entities explicitly, and every one of them names the schema', () => {
      // Populated, unlike the two DataSources in apps/api: `migration:generate`
      // diffs entities against a database, and an empty list diffs nothing
      // against everything — it emits a DROP for every table there is. A glob
      // is worse still, because a bundled build makes it match nothing.
      const entities = options.entities as unknown[];
      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBeGreaterThan(0);
      expect(entities.every((e) => typeof e === 'function')).toBe(true);

      // With no schema on the connection, an entity that does not name one
      // falls back to `public` — `migration:generate` would then propose
      // creating the whole module in the wrong schema and dropping it from the
      // right one. Read from TypeORM's decorator storage, so this is what the
      // decorator actually recorded.
      const tables = getMetadataArgsStorage().tables;
      const unqualified = entities
        .map((target) => tables.find((t) => t.target === target))
        .filter((t) => t?.schema !== schema)
        .map((t) => t?.name ?? 'unknown');
      expect(unqualified).toEqual([]);
    });

    it('resolves its connection through the module resolver the service also uses', () => {
      // `data-source.ts` spreads `resolve<M>DbConfig(...)`, so these must be
      // equal by construction — this fails the moment someone re-inlines the
      // five `process.env` reads and they start drifting from the service's.
      const resolved = resolve((key) => process.env[key]);
      expect({
        host: options.host,
        port: options.port,
        username: options.username,
        password: options.password,
        database: options.database,
      }).toEqual(resolved);
    });

    it('is the same resolver the service module calls', () => {
      // A source check on purpose: the service module cannot be imported here
      // without booting the Nest module it declares. What matters is that it
      // has not gone back to reading the env itself.
      const file = path.join(
        REPO_ROOT,
        'modules',
        module,
        'backend',
        'src',
        `${module}-service.module.ts`,
      );
      const source = fs.readFileSync(file, 'utf8');
      const pascal = module[0].toUpperCase() + module.slice(1);
      expect(source).toContain(`resolve${pascal}DbConfig(`);
      // The old shape, which is what drifted.
      expect(source).not.toContain(`cfg.get<string>('${module.toUpperCase()}_DB_HOST')`);

      // …and it spreads the shared helper with THIS module's prefix. Spreading
      // it without one made the factory refuse to boot on `DB_PASSWORD`, which
      // no module .env.example declares and no module reads — invisible in this
      // repository, where the module ConfigModule falls back to apps/api/.env,
      // and fatal for a module lifted out of it into an image of its own. A
      // prefix belonging to a *different* module would be worse than none: it
      // would resolve a password for a database this service does not use.
      expect(source).toContain(
        `databaseCredentials(cfg, { envPrefix: '${module.toUpperCase()}_DB' })`,
      );
    });

    it('prefers the module-specific variables, then the shared ones', () => {
      const UC = module.toUpperCase();
      const both = resolve(
        (key) =>
          ({
            [`${UC}_DB_HOST`]: 'dedicated',
            [`${UC}_DB_PORT`]: '5499',
            [`${UC}_DB_PASSWORD`]: 'dedicated-secret',
            DB_HOST: 'shared',
            DB_PORT: '5432',
            DB_PASSWORD: 'shared-secret',
          })[key],
      );
      expect(both.host).toBe('dedicated');
      expect(both.port).toBe(5499);
      expect(both.password).toBe('dedicated-secret');

      const sharedOnly = resolve(
        (key) => ({ DB_HOST: 'shared', DB_NAME: 'kartseek_db', DB_PASSWORD: 'shared-secret' })[key],
      );
      expect(sharedOnly.host).toBe('shared');
      expect(sharedOnly.database).toBe('kartseek_db');
      expect(sharedOnly.password).toBe('shared-secret');

      // The last resorts, which used to differ between the runner and the
      // service: the runner fell back to the dedicated container, the service
      // to the shared platform database. The password has none — see below.
      const nothing = resolve((key) => (key === 'DB_PASSWORD' ? 'supplied' : undefined));
      expect(nothing).toEqual({
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'supplied',
        database: 'kartseek_db',
      });
    });

    it('refuses to resolve without a password rather than defaulting to a literal', () => {
      // AUD2-074 (IN4). The last resort used to be the real development
      // password, in tracked source, and it was reached by BOTH sides of this
      // resolver: the migration CLI and the running service. A host that is
      // wrong fails loudly on connect; a password that is wrong used to succeed
      // against the development database and quietly write there.
      expect(() => resolve(() => undefined)).toThrow(
        new RegExp(`${module.toUpperCase()}_DB_PASSWORD or DB_PASSWORD`),
      );
      // An empty value is a missing value — `DB_PASSWORD=` in a .env must not
      // read as "connect with no password".
      expect(() => resolve((key) => (key === 'DB_PASSWORD' ? '' : undefined))).toThrow(
        /DB_PASSWORD/,
      );
      // Any one of the three supplies it.
      for (const key of [`${module.toUpperCase()}_DB_PASSWORD`, 'DB_PASSWORD', 'DB_PASS']) {
        expect(resolve((k) => (k === key ? 'secret' : undefined)).password).toBe('secret');
      }
    });
  },
);

describe('migration timestamps across all nine databases', () => {
  /**
   * A timestamp is how TypeORM orders migrations and how a human refers to one
   * in a runbook. They are only useful for the second if they are unique
   * platform-wide — the regional review found `1786502400000` on five files in
   * five different databases, which makes "apply 1786502400000 in staging"
   * ambiguous by a factor of five.
   *
   * Those five are grandfathered: they are recorded as applied in dev and
   * renaming an applied migration orphans its ledger row. Nothing may be added
   * to this list — pick the next free slot instead. The convention and the
   * allocation table are in `docs/guides/database-migrations.md`.
   */
  const GRANDFATHERED_COLLISION = 1786502400000;

  function allMigrationFiles(): Array<{ timestamp: number; where: string }> {
    const dirs = [
      path.join(REPO_ROOT, 'apps', 'api', 'migrations'),
      ...RUNNERS.map((r) => migrationsDir(r.module)),
    ];
    return dirs.flatMap((dir) =>
      fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.ts'))
        .map((f) => ({
          timestamp: Number(f.split('-')[0]),
          where: `${path.relative(REPO_ROOT, path.join(dir, f)).replace(/\\/g, '/')}`,
        })),
    );
  }

  it('gives every migration its own timestamp', () => {
    const byTimestamp = new Map<number, string[]>();
    for (const { timestamp, where } of allMigrationFiles()) {
      byTimestamp.set(timestamp, [...(byTimestamp.get(timestamp) ?? []), where]);
    }

    const collisions = [...byTimestamp.entries()]
      .filter(([timestamp, files]) => files.length > 1 && timestamp !== GRANDFATHERED_COLLISION)
      .map(([timestamp, files]) => `${timestamp}: ${files.join(', ')}`);

    expect(collisions).toEqual([]);
  });

  it('has not grown the grandfathered collision', () => {
    const shared = allMigrationFiles().filter((f) => f.timestamp === GRANDFATHERED_COLLISION);
    expect(shared.map((f) => f.where).sort()).toEqual([
      'apps/api/migrations/1786502400000-RegionalAdminStaffPermissions.ts',
      'modules/grocery/backend/migrations/1786502400000-GrocerySettingsMarket.ts',
      'modules/hotel/backend/migrations/1786502400000-DropDeadMarketColumns.ts',
      'modules/pharmacy/backend/migrations/1786502400000-DropDeadMarketColumns.ts',
      'modules/restaurant/backend/migrations/1786502400000-DropDeadMarketColumns.ts',
    ]);
  });

  it('gives all eight modules a runner', () => {
    // The point of IN3: taxi, doctor and franchise had no `data-source.ts` and
    // no way to build their schema except auto-sync.
    const withRunner = RUNNERS.filter((r) =>
      fs.existsSync(path.join(REPO_ROOT, 'modules', r.module, 'backend', 'data-source.ts')),
    );
    expect(withRunner.map((r) => r.module)).toHaveLength(8);
  });
});
