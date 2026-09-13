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

    /**
     * The service module reaches the SAME database the CLI runner does — run,
     * not read.
     *
     * This was a source-text check ("does the file contain
     * `resolve<M>DbConfig(`?"), which is a proxy for the thing that matters and
     * a weak one: a factory can call the resolver and then override `host`
     * three lines later, and the grep is still happy. The reason given was that
     * importing the service module would boot Nest — it does not. Importing it
     * evaluates the decorators and builds the module METADATA; nothing
     * instantiates a provider until a Nest application is created, which
     * nothing here does. So the factory can simply be taken off the metadata
     * and called.
     *
     * What is compared is the connection target the factory produces against
     * the one `data-source.ts` produces, from the same environment (IN3 review
     * N2).
     */
    it('is the same resolver the service module calls', async () => {
      const mod = await import(
        `../../../modules/${module}/backend/src/${module}-service.module.ts`
      );
      const pascal = module[0].toUpperCase() + module.slice(1);
      const ServiceModule = mod[`${pascal}ServiceModule`];
      expect(
        ServiceModule,
        `${module}-service.module.ts exports no ${pascal}ServiceModule`,
      ).toBeDefined();

      // `@Module({ imports: [...] })` is stored as design metadata.
      //
      // `TypeOrmModule.forRootAsync(...)` does not carry the factory itself: it
      // returns `{ module: TypeOrmModule, imports: [TypeOrmCoreModule.forRootAsync(…)] }`,
      // and the options provider — token `TypeOrmModuleOptions` — is one level
      // down. Matching on "the first provider with a useFactory" instead finds
      // `HealthModule`'s HEALTH_CHECK and silently tests the wrong thing, which
      // is what the token name below is here to prevent.
      const imports: any[] = Reflect.getMetadata('imports', ServiceModule) ?? [];
      const provider = imports
        .flatMap((i: any) => i?.imports ?? [])
        .flatMap((i: any) => i?.providers ?? [])
        .find(
          (p: any) =>
            typeof p?.useFactory === 'function' && String(p?.provide) === 'TypeOrmModuleOptions',
        );
      expect(
        provider,
        `${module}: no TypeOrmModule.forRootAsync options factory in the module imports`,
      ).toBeDefined();
      // A ConfigService stand-in: `get(key, fallback?)` over the real
      // environment, which is what the module is handed at runtime.
      const cfg = {
        get: (key: string, fallback?: unknown) => process.env[key] ?? fallback,
      };
      const options = await provider.useFactory(cfg);
      const resolved = resolve((key) => process.env[key]);

      expect({
        host: options.host,
        port: options.port,
        username: options.username,
        password: options.password,
        database: options.database,
      }).toEqual(resolved);

      // The schema is the module's own and is not negotiable: the ledger
      // ruling depends on entities naming it while the connection does not.
      expect(options.schema).toBe(schema);
      // 30s, not the 5s default: this is the only case here that imports a
      // service module, and a module's whole graph — entities, controllers,
      // services, the eight shared libs — is a few seconds to transform on a
      // cold cache. It took 3.1s in isolation and timed out at 5s once the
      // other 109 files were competing for the same worker pool.
    }, 30_000);

    /**
     * …and it asks the shared credential helper for THIS module's prefix.
     *
     * Kept as a source check, and this one genuinely cannot be behavioural:
     * `databaseCredentials` resolves a password and the resolver above
     * overrides it, so a wrong prefix is invisible in the factory's OUTPUT on a
     * machine where both variables happen to be set — which is every machine in
     * this repository, because the module ConfigModule falls back to
     * apps/api/.env. Spreading it without a prefix made the factory refuse to
     * boot on `DB_PASSWORD`, a variable no module .env.example declares; a
     * prefix belonging to a DIFFERENT module would be worse, resolving a
     * password for a database this service does not use.
     */
    it('asks the credential helper for its own prefix', () => {
      const file = path.join(
        REPO_ROOT,
        'modules',
        module,
        'backend',
        'src',
        `${module}-service.module.ts`,
      );
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain(
        `databaseCredentials(cfg, { envPrefix: '${module.toUpperCase()}_DB' })`,
      );
      // The old shape, which is what drifted.
      expect(source).not.toContain(`cfg.get<string>('${module.toUpperCase()}_DB_HOST')`);
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
      // Either of the two supplies it.
      for (const key of [`${module.toUpperCase()}_DB_PASSWORD`, 'DB_PASSWORD']) {
        expect(resolve((k) => (k === key ? 'secret' : undefined)).password).toBe('secret');
      }
      // And the third spelling no longer does. `DB_PASS` was an alias for the
      // same secret that `scripts/registry/compose.mjs` did not blank for the
      // ten `database: null` services, so it carried the superuser password
      // into every credential-free container (whole-branch review N2). One
      // secret, one name — an environment with only the old spelling must
      // refuse, naming the variable to set.
      expect(() => resolve((k) => (k === 'DB_PASS' ? 'superuser-secret' : undefined))).toThrow(
        new RegExp(`${module.toUpperCase()}_DB_PASSWORD or DB_PASSWORD`),
      );
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

  /**
   * `<timestamp>-<PascalCaseWhatItDoes>.ts`, in all nine folders.
   *
   * The timestamp half is checked above because TypeORM orders by it. The name
   * half matters for a different reason: it is what a reviewer reads in
   * `migration:show` output and what a runbook names, and it is the only
   * description a migration has. `1786502400000-fix.ts` and
   * `1786502400000-update_stuff.ts` both run perfectly well and tell nobody
   * anything.
   *
   * The class inside must match the file, because TypeORM reports the CLASS
   * name in the ledger and in `migration:show` — a file and class that disagree
   * make a ledger row unsearchable in the repository (dispatch addendum item 7).
   */
  it('names every migration <timestamp>-<PascalCase>.ts', () => {
    const wrong = allMigrationFiles()
      .map((f) => path.basename(f.where))
      .filter((name) => !/^\d{13}-[A-Z][A-Za-z0-9]*\.ts$/.test(name));
    expect(wrong).toEqual([]);
  });

  it('gives each migration a class named after its file', () => {
    const dirs = [
      path.join(REPO_ROOT, 'apps', 'api', 'migrations'),
      ...RUNNERS.map((r) => migrationsDir(r.module)),
    ];
    const mismatched: string[] = [];
    for (const dir of dirs) {
      for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
        const [timestamp, rest] = [file.split('-')[0], file.split('-').slice(1).join('-')];
        const expected = `${rest.replace(/\.ts$/, '')}${timestamp}`;
        const src = fs.readFileSync(path.join(dir, file), 'utf8');
        if (!new RegExp(`export class ${expected}\\b`).test(src)) {
          const found = /export class (\w+)/.exec(src)?.[1] ?? '(none)';
          mismatched.push(`${file}: expected ${expected}, found ${found}`);
        }
      }
    }
    expect(mismatched).toEqual([]);
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
