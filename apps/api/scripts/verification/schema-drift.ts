/* eslint-disable no-console */
/**
 * Does the database match the entities? — for all eight module databases.
 *
 *     npm run verify:schema-drift                 # all eight, from apps/api
 *     npm run verify:schema-drift -- --module marketplace
 *     npm run verify:schema-drift -- --json
 *
 * Exit 0 when there is no drift, 1 when there is (or when a module cannot be
 * reached — an unreachable database is not evidence of agreement).
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * IN3 gave every module an initial migration whose `up()` is idempotent, so it
 * could be recorded against the databases `synchronize` had already built. Every
 * `CREATE TABLE` carries `IF NOT EXISTS` — which means that against a table that
 * already exists, the statement does **nothing at all** and the ledger then
 * records the migration as applied. Any column the entity gained while
 * `synchronize` was off is therefore missing, permanently, with a green
 * `migration:show`.
 *
 * That is not hypothetical: `ProductListing.mrp` was added on 2026-09-06
 * (d701572), dev auto-sync never applied it, the initial migration declared it,
 * `CREATE TABLE IF NOT EXISTS` skipped the table, and
 * `GET /api/v1/marketplace/products` answered 500 for everyone — masked for days
 * by the Redis cache in front of it.
 *
 * For a database that already exists, the ledger is not evidence. The only
 * truth is this comparison.
 *
 * ── What it will not do ─────────────────────────────────────────────────────
 *
 * It never writes. No `synchronize`, no `RdbmsSchemaBuilder`, no
 * `queryRunner.createTable` — it reads `information_schema.columns` with a
 * parameterised SELECT and compares that against `connection.entityMetadatas`,
 * which TypeORM builds in memory at `initialize()`. Fixing what it finds is a
 * migration, never an `ALTER` typed into psql: see
 * `docs/guides/database-migrations.md`.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import type { DataSource, EntityMetadata } from 'typeorm';

import { MarketplaceDataSource } from '../../../../modules/marketplace/backend/data-source';
import { GroceryDataSource } from '../../../../modules/grocery/backend/data-source';
import { RestaurantDataSource } from '../../../../modules/restaurant/backend/data-source';
import { PharmacyDataSource } from '../../../../modules/pharmacy/backend/data-source';
import { DoctorDataSource } from '../../../../modules/doctor/backend/data-source';
import { HotelDataSource } from '../../../../modules/hotel/backend/data-source';
import { TaxiDataSource } from '../../../../modules/taxi/backend/data-source';
import { FranchiseDataSource } from '../../../../modules/franchise/backend/data-source';
import { resolveMarketplaceDbConfig } from '../../../../modules/marketplace/backend/src/db-config';
import { resolveGroceryDbConfig } from '../../../../modules/grocery/backend/src/db-config';
import { resolveRestaurantDbConfig } from '../../../../modules/restaurant/backend/src/db-config';
import { resolvePharmacyDbConfig } from '../../../../modules/pharmacy/backend/src/db-config';
import { resolveDoctorDbConfig } from '../../../../modules/doctor/backend/src/db-config';
import { resolveHotelDbConfig } from '../../../../modules/hotel/backend/src/db-config';
import { resolveTaxiDbConfig } from '../../../../modules/taxi/backend/src/db-config';
import { resolveFranchiseDbConfig } from '../../../../modules/franchise/backend/src/db-config';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

type EnvReader = (key: string) => string | undefined;
type Resolved = { host: string; port: number; username: string; database: string };

interface ModuleTarget {
  module: string;
  dataSource: DataSource;
  resolve: (read: EnvReader) => Resolved & { password: string };
}

const MODULES: ModuleTarget[] = [
  { module: 'marketplace', dataSource: MarketplaceDataSource, resolve: resolveMarketplaceDbConfig },
  { module: 'grocery', dataSource: GroceryDataSource, resolve: resolveGroceryDbConfig },
  { module: 'restaurant', dataSource: RestaurantDataSource, resolve: resolveRestaurantDbConfig },
  { module: 'pharmacy', dataSource: PharmacyDataSource, resolve: resolvePharmacyDbConfig },
  { module: 'doctor', dataSource: DoctorDataSource, resolve: resolveDoctorDbConfig },
  { module: 'hotel', dataSource: HotelDataSource, resolve: resolveHotelDbConfig },
  { module: 'taxi', dataSource: TaxiDataSource, resolve: resolveTaxiDbConfig },
  { module: 'franchise', dataSource: FranchiseDataSource, resolve: resolveFranchiseDbConfig },
];

// ── the comparison, which is the part worth testing ─────────────────────────

/** One column as the entity metadata declares it. */
export interface ExpectedColumn {
  name: string;
  /** TypeORM's own `driver.normalizeType`, lower-cased. */
  type: string;
  nullable: boolean;
}

/** One table as the entity metadata declares it. */
export interface ExpectedTable {
  schema: string;
  table: string;
  columns: ExpectedColumn[];
}

/** One column as `information_schema.columns` reports it. */
export interface ActualColumn {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  udt_name?: string;
}

export type Finding =
  | { kind: 'missing-table'; schema: string; table: string }
  | { kind: 'missing-column'; schema: string; table: string; column: string; type: string }
  | { kind: 'extra-column'; schema: string; table: string; column: string; type: string }
  | {
      kind: 'nullable-mismatch';
      schema: string;
      table: string;
      column: string;
      expected: boolean;
      actual: boolean;
    }
  | {
      kind: 'type-mismatch';
      schema: string;
      table: string;
      column: string;
      expected: string;
      actual: string;
    };

/**
 * TypeORM's type names on the left, `information_schema.data_type` on the right.
 *
 * Both sides are normalised to one canonical token before comparison, so
 * `varchar` / `character varying`, `int` / `integer` and `timestamp` /
 * `timestamp without time zone` do not read as drift. A pair that reaches
 * neither table is reported as a mismatch rather than skipped — an unrecognised
 * type is exactly where a real difference would hide, and the fix is to add it
 * here deliberately.
 */
const CANONICAL: Record<string, string> = {
  // TypeORM side
  varchar: 'varchar',
  'character varying': 'varchar',
  character: 'char',
  text: 'text',
  uuid: 'uuid',
  int: 'int',
  int4: 'int',
  integer: 'int',
  smallint: 'smallint',
  int2: 'smallint',
  bigint: 'bigint',
  int8: 'bigint',
  decimal: 'numeric',
  numeric: 'numeric',
  float: 'float8',
  float8: 'float8',
  'double precision': 'float8',
  real: 'float4',
  float4: 'float4',
  boolean: 'bool',
  bool: 'bool',
  json: 'json',
  jsonb: 'jsonb',
  date: 'date',
  time: 'time',
  'time without time zone': 'time',
  timestamp: 'timestamp',
  'timestamp without time zone': 'timestamp',
  timestamptz: 'timestamptz',
  'timestamp with time zone': 'timestamptz',
  bytea: 'bytea',
  tsvector: 'tsvector',
  // An enum column is `USER-DEFINED` in information_schema; the udt_name carries
  // the type's real name, which is compared separately where it is available.
  enum: 'enum',
  'user-defined': 'enum',
  'simple-array': 'text',
  'simple-json': 'text',
};

export function canonicalType(raw: string): string | null {
  return CANONICAL[raw.trim().toLowerCase()] ?? null;
}

/**
 * Do the entity's type and the database's describe the same thing?
 *
 * Identical spellings agree, whatever the map says — a type this file has never
 * heard of is not drift when both sides call it the same name, and treating it
 * as drift is how a checker earns the habit of being ignored (`tsvector` was
 * exactly that). Different spellings have to canonicalise to the same token,
 * and a spelling with no entry is reported rather than assumed equal: an
 * unrecognised type is precisely where a real difference would hide.
 */
export function typesAgree(expected: string, actual: string): boolean {
  if (expected.trim().toLowerCase() === actual.trim().toLowerCase()) return true;
  const want = canonicalType(expected);
  const got = canonicalType(actual);
  return want !== null && want === got;
}

/**
 * Compare one table's expected columns against what the database reports.
 *
 * `actual` empty means the table itself is absent — an empty table with no
 * columns is not a thing Postgres reports.
 */
export function diffTable(expected: ExpectedTable, actual: ActualColumn[]): Finding[] {
  const { schema, table } = expected;
  if (actual.length === 0) return [{ kind: 'missing-table', schema, table }];

  const findings: Finding[] = [];
  const byName = new Map(actual.map((c) => [c.column_name, c]));

  for (const column of expected.columns) {
    const found = byName.get(column.name);
    if (!found) {
      findings.push({
        kind: 'missing-column',
        schema,
        table,
        column: column.name,
        type: column.type,
      });
      continue;
    }
    const actualNullable = found.is_nullable === 'YES';
    if (actualNullable !== column.nullable) {
      findings.push({
        kind: 'nullable-mismatch',
        schema,
        table,
        column: column.name,
        expected: column.nullable,
        actual: actualNullable,
      });
    }
    if (!typesAgree(column.type, found.data_type)) {
      findings.push({
        kind: 'type-mismatch',
        schema,
        table,
        column: column.name,
        expected: column.type,
        actual: found.data_type,
      });
    }
  }

  const declared = new Set(expected.columns.map((c) => c.name));
  for (const column of actual) {
    if (!declared.has(column.column_name)) {
      findings.push({
        kind: 'extra-column',
        schema,
        table,
        column: column.column_name,
        type: column.data_type,
      });
    }
  }

  return findings;
}

/** One line, in the shape a person can act on. */
export function formatFinding(f: Finding): string {
  const where = `${f.schema}.${f.table}`;
  switch (f.kind) {
    case 'missing-table':
      return `  MISSING TABLE   ${where}`;
    case 'missing-column':
      return `  MISSING COLUMN  ${where}.${f.column} (entity declares ${f.type})`;
    case 'extra-column':
      return `  EXTRA COLUMN    ${where}.${f.column} (${f.type}) — no entity declares it`;
    case 'nullable-mismatch':
      return `  NULLABILITY     ${where}.${f.column} — entity ${f.expected ? 'nullable' : 'NOT NULL'}, database ${f.actual ? 'nullable' : 'NOT NULL'}`;
    case 'type-mismatch':
      return `  TYPE            ${where}.${f.column} — entity ${f.expected}, database ${f.actual}`;
  }
}

/** The entity's columns, as the driver would write them. */
export function expectedFrom(
  metadata: EntityMetadata,
  driverNormalize: (c: never) => string,
): ExpectedTable {
  return {
    schema: metadata.schema ?? 'public',
    table: metadata.tableName,
    columns: metadata.columns.map((column) => ({
      name: column.databaseName,
      type: String(
        column.type === 'enum' || column.enum
          ? 'enum'
          : driverNormalize(column as never) || column.type,
      ).toLowerCase(),
      nullable: column.isNullable,
    })),
  };
}

// ── the runner ──────────────────────────────────────────────────────────────

/**
 * The module's own `.env` first, then this process's environment.
 *
 * This is what the migration runner sees: `dotenv/config` inside
 * `data-source.ts` reads the working directory, and every `migration:*` script
 * is documented to run from the module's directory. Reading it here rather than
 * relying on the caller's cwd is what makes the checker's answer the same
 * answer the runner would give.
 */
function moduleEnvReader(module: string): EnvReader {
  const file = path.join(REPO_ROOT, 'modules', module, 'backend', '.env');
  const parsed = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
  return (key) => parsed[key] ?? process.env[key];
}

interface ModuleReport {
  module: string;
  target: string;
  tables: number;
  findings: Finding[];
  error?: string;
}

async function checkModule(target: ModuleTarget): Promise<ModuleReport> {
  const read = moduleEnvReader(target.module);
  const { password, ...connection } = target.resolve(read);
  const ds = target.dataSource;
  const label = `${connection.username}@${connection.host}:${connection.port}/${connection.database}`;

  // Re-point the runner's DataSource at what the module's own .env names, so the
  // entity list and the connection come from the same place the CLI uses.
  ds.setOptions({ ...connection, password });

  try {
    // `initialize()` builds entity metadata and opens a connection. It does not
    // synchronize: `data-source.ts` sets `synchronize: false` and this never
    // touches a schema builder.
    await ds.initialize();
  } catch (err) {
    return {
      module: target.module,
      target: label,
      tables: 0,
      findings: [],
      error: (err as Error).message,
    };
  }

  try {
    const findings: Finding[] = [];
    for (const metadata of ds.entityMetadatas) {
      const expected = expectedFrom(metadata, (column) =>
        String(ds.driver.normalizeType(column)).toLowerCase(),
      );
      const actual: ActualColumn[] = await ds.query(
        `SELECT column_name, data_type, is_nullable, udt_name
           FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2`,
        [expected.schema, expected.table],
      );
      findings.push(...diffTable(expected, actual));
    }
    return {
      module: target.module,
      target: label,
      tables: ds.entityMetadatas.length,
      findings,
    };
  } finally {
    await ds.destroy();
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const only = argv.includes('--module') ? argv[argv.indexOf('--module') + 1] : null;

  const targets = only ? MODULES.filter((m) => m.module === only) : MODULES;
  if (only && targets.length === 0) {
    console.error(`unknown module: ${only} (have ${MODULES.map((m) => m.module).join(', ')})`);
    process.exit(2);
  }

  const reports: ModuleReport[] = [];
  for (const target of targets) reports.push(await checkModule(target));

  if (json) {
    console.log(JSON.stringify({ reports }, null, 2));
  } else {
    for (const report of reports) {
      if (report.error) {
        console.log(`\n${report.module}  ${report.target}\n  UNREACHABLE     ${report.error}`);
        continue;
      }
      const verdict =
        report.findings.length === 0 ? 'no drift' : `${report.findings.length} finding(s)`;
      console.log(`\n${report.module}  ${report.target}  ${report.tables} tables  — ${verdict}`);
      for (const finding of report.findings) console.log(formatFinding(finding));
    }
    const total = reports.reduce((n, r) => n + r.findings.length, 0);
    const unreachable = reports.filter((r) => r.error).length;
    console.log(
      `\n${total} finding(s) across ${reports.length} module(s)` +
        (unreachable ? `, ${unreachable} unreachable` : ''),
    );
    if (total > 0) {
      console.log(
        'Fix with a migration — `npm run migration:generate` from the module directory, or a\n' +
          'hand-written one. Never an ALTER typed into psql: the next environment would not have it.',
      );
    }
  }

  const failed = reports.some((r) => r.error || r.findings.length > 0);
  process.exit(failed ? 1 : 0);
}

// Only when run as a script. The spec imports the pure functions above and must
// not trigger a database connection by doing so.
const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('scripts/verification/schema-drift.ts')) void main();
