import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { DataSource } from 'typeorm';
import { MarketplaceDataSource } from '../../../modules/marketplace/backend/data-source';
import { GroceryDataSource } from '../../../modules/grocery/backend/data-source';
import { RestaurantDataSource } from '../../../modules/restaurant/backend/data-source';
import { PharmacyDataSource } from '../../../modules/pharmacy/backend/data-source';
import { DoctorDataSource } from '../../../modules/doctor/backend/data-source';
import { HotelDataSource } from '../../../modules/hotel/backend/data-source';
import { TaxiDataSource } from '../../../modules/taxi/backend/data-source';
import { FranchiseDataSource } from '../../../modules/franchise/backend/data-source';

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
}

const RUNNERS: ModuleRunner[] = [
  { module: 'marketplace', schema: 'marketplace', dataSource: MarketplaceDataSource },
  { module: 'grocery', schema: 'grocery', dataSource: GroceryDataSource },
  { module: 'restaurant', schema: 'restaurant', dataSource: RestaurantDataSource },
  { module: 'pharmacy', schema: 'pharmacy', dataSource: PharmacyDataSource },
  { module: 'doctor', schema: 'doctor', dataSource: DoctorDataSource },
  { module: 'hotel', schema: 'hotel', dataSource: HotelDataSource },
  { module: 'taxi', schema: 'taxi', dataSource: TaxiDataSource },
  { module: 'franchise', schema: 'franchise', dataSource: FranchiseDataSource },
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

describe.each(RUNNERS)('$module module migration runner', ({ module, schema, dataSource }) => {
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

  it('never auto-syncs, and keeps its ledger beside its tables', () => {
    expect(options.synchronize).toBe(false);
    expect(options.schema).toBe(schema);
    expect(options.migrationsTableName).toBe('migrations');
  });

  it('declares its entities explicitly', () => {
    // Populated, unlike the two DataSources in apps/api: `migration:generate`
    // diffs entities against a database, and an empty list diffs nothing
    // against everything — it emits a DROP for every table there is. A glob
    // is worse still, because a bundled build makes it match nothing.
    const entities = options.entities;
    expect(Array.isArray(entities)).toBe(true);
    expect((entities as unknown[]).length).toBeGreaterThan(0);
    expect((entities as unknown[]).every((e) => typeof e === 'function')).toBe(true);
  });
});

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
