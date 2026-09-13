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
 * ── What it compares ────────────────────────────────────────────────────────
 *
 *   • the column exists, and nothing exists that no entity declares;
 *   • nullability;
 *   • the base type, through a canonical map (`varchar` ≡ `character varying`),
 *     with an array compared on its element type via `udt_name`;
 *   • **precision, scale and length — but only where the entity declares one.**
 *     An entity that says plain `numeric` or plain `varchar` is asking for
 *     whatever the database has; one that says `numeric(10,2)` is not, and
 *     `numeric(5,2)` behind it rejects every list price over 999.99 at INSERT
 *     time. Neither type name carries the modifier, so this reads
 *     `numeric_precision` / `numeric_scale` / `character_maximum_length`
 *     directly. Precision and scale are only meaningful for `numeric` and length
 *     only for the character types, so they are compared only there;
 *   • **enum labels**, from `pg_enum` via the column's `udt_schema`/`udt_name`.
 *     `information_schema` reports every enum as `USER-DEFINED`, so without the
 *     labels an entity enum agrees with any user-defined type in the database.
 *
 * Not compared: indexes, foreign keys, defaults, unique constraints, collations.
 * A missing index degrades quietly rather than answering 500, which is why
 * columns came first.
 *
 * ── What it will not do ─────────────────────────────────────────────────────
 *
 * It never writes. No `synchronize`, no `RdbmsSchemaBuilder`, no
 * `queryRunner.createTable` — it reads `information_schema.columns` and
 * `pg_enum` with parameterised SELECTs and compares those against
 * `connection.entityMetadatas`, which TypeORM builds in memory at
 * `initialize()`. Fixing what it finds is a migration, never an `ALTER` typed
 * into psql: see `docs/guides/database-migrations.md`.
 *
 * ── One thing to know about `information_schema` ────────────────────────────
 *
 * It is privilege-filtered: a role sees only the columns it has some privilege
 * on. A table the role cannot touch returns zero rows and reads here as
 * MISSING TABLE, and columns it cannot see are invisible to the extra-column
 * check. That is the right behaviour for this checker rather than a hazard,
 * because each module connects **as its own role** over **its own schema**
 * (IN5): the question being asked is "can this service's entities be served by
 * what this service's role can see", and a column the role cannot read is not
 * usable by the service either. It would matter if one role were ever asked
 * about another's schema — `pg_catalog` is the unfiltered alternative if that
 * day comes.
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
  /** TypeORM's own `driver.normalizeType`, lower-cased. For an array, the ELEMENT type. */
  type: string;
  nullable: boolean;
  /** `@Column({ array: true })` — the database reports `ARRAY` and `_<element>`. */
  isArray?: boolean;
  /** Only when the entity declares one; `null` means "whatever the database has". */
  precision?: number | null;
  scale?: number | null;
  length?: number | null;
  /** `@Column({ type: 'enum', enum: [...] })` — the declared labels, unsorted. */
  enumValues?: string[] | null;
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
  /** `varchar` → `varchar`; an array → `_varchar`; an enum → the enum type's name. */
  udt_name?: string;
  udt_schema?: string;
  numeric_precision?: number | null;
  numeric_scale?: number | null;
  character_maximum_length?: number | null;
  /** Labels of the enum type named by `udt_schema`.`udt_name`, in sort order. Attached by the runner. */
  enum_labels?: string[] | null;
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
    }
  | {
      kind: 'modifier-mismatch';
      schema: string;
      table: string;
      column: string;
      modifier: 'precision' | 'scale' | 'length';
      expected: number;
      actual: number | null;
    }
  | {
      kind: 'enum-labels-missing';
      schema: string;
      table: string;
      column: string;
      type: string;
      labels: string[];
    }
  | {
      kind: 'enum-labels-extra';
      schema: string;
      table: string;
      column: string;
      type: string;
      labels: string[];
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
  // An enum column is `USER-DEFINED` in information_schema. Matching on that
  // alone would make every entity enum agree with every user-defined type in the
  // database — a different enum, a domain, a PostGIS type — so `diffTable`
  // additionally compares the type's labels, which the runner reads from
  // `pg_enum` via the column's `udt_schema`/`udt_name`.
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
 * Which modifiers mean anything for this type.
 *
 * `numeric_precision` is populated for every numeric type — an `integer` reports
 * 32 — and `datetime_precision` is a different column entirely, so comparing
 * blind would read an entity's `@Column({ type: 'timestamp', precision: 6 })`
 * against a NULL `numeric_precision` and call it drift. Precision and scale are
 * therefore only compared for `numeric`/`decimal`, and length only for the
 * character types, which is where a narrowing actually silently truncates.
 */
function comparableModifiers(type: string): { numeric: boolean; length: boolean } {
  const canonical = canonicalType(type);
  return {
    numeric: canonical === 'numeric',
    length: canonical === 'varchar' || canonical === 'char',
  };
}

/**
 * An array column, compared through `udt_name`.
 *
 * `@Column({ type: 'text', array: true })` normalises to `text` on the entity
 * side while `information_schema.data_type` says `ARRAY` and only `udt_name`
 * carries the element type, as `_text`. Without this every array column would
 * report a permanent, unfixable type mismatch — the kind of noise that teaches
 * people to skim past this checker, which is the one thing it cannot survive.
 */
function arrayElementType(actual: ActualColumn): string | null {
  if (actual.data_type.trim().toUpperCase() !== 'ARRAY') return null;
  const udt = actual.udt_name ?? '';
  return udt.startsWith('_') ? udt.slice(1) : udt || null;
}

/**
 * `numeric(10,2)` against `numeric(12,2)`, and `varchar(255)` against
 * `varchar(50)`.
 *
 * Neither side carries a modifier in its type name — `normalizeType` returns the
 * bare `numeric`, and `information_schema.data_type` is `numeric` for every
 * precision — so a narrowed column used to pass as agreement. `mrp` is
 * `numeric(10,2)`: held as `numeric(5,2)` it would reject every list price over
 * 999.99 at INSERT time, which is the missing-column failure again with the same
 * green report in front of it.
 *
 * Compared only where the ENTITY declares a modifier. An entity that says plain
 * `numeric` or plain `varchar` is asking for whatever the database has, and
 * saying otherwise would fail every such column forever.
 */
function diffModifiers(
  { schema, table }: ExpectedTable,
  column: ExpectedColumn,
  found: ActualColumn,
): Finding[] {
  const findings: Finding[] = [];
  const applies = comparableModifiers(column.type);

  const check = (
    modifier: 'precision' | 'scale' | 'length',
    declared: number | null | undefined,
    reported: number | null | undefined,
  ) => {
    if (typeof declared !== 'number' || !Number.isFinite(declared)) return;
    const actual = typeof reported === 'number' ? reported : null;
    if (actual === declared) return;
    findings.push({
      kind: 'modifier-mismatch',
      schema,
      table,
      column: column.name,
      modifier,
      expected: declared,
      actual,
    });
  };

  if (applies.numeric) {
    check('precision', column.precision, found.numeric_precision);
    check('scale', column.scale, found.numeric_scale);
  }
  if (applies.length) {
    check('length', column.length, found.character_maximum_length);
  }
  return findings;
}

/**
 * The labels of the enum type behind a `USER-DEFINED` column.
 *
 * Without this an entity enum agrees with *any* user-defined type: a different
 * enum, a domain, a PostGIS geometry. `doctor` alone has ten enum columns, and
 * an entity that gains a status value the database's type does not have fails at
 * INSERT, not at boot — silently, on one code path, whenever that value is first
 * written.
 *
 * Labels the database has and the entity does not are reported too. They are
 * usually a value being retired rather than a fault, but they are still a
 * difference between the schema of record and the database, and the report is
 * the place to see it.
 */
function diffEnumLabels(
  { schema, table }: ExpectedTable,
  column: ExpectedColumn,
  found: ActualColumn,
): Finding[] {
  if (!column.enumValues || column.enumValues.length === 0) return [];
  const type = `${found.udt_schema ?? schema}.${found.udt_name ?? '?'}`;

  // No labels came back for a column the entity says is an enum: either the
  // database type is not an enum at all, or the runner could not read pg_enum.
  if (!found.enum_labels) {
    return [
      {
        kind: 'enum-labels-missing',
        schema,
        table,
        column: column.name,
        type,
        labels: [...column.enumValues].sort(),
      },
    ];
  }

  const declared = new Set(column.enumValues.map(String));
  const present = new Set(found.enum_labels.map(String));
  const findings: Finding[] = [];

  const missing = [...declared].filter((l) => !present.has(l)).sort();
  if (missing.length > 0) {
    findings.push({
      kind: 'enum-labels-missing',
      schema,
      table,
      column: column.name,
      type,
      labels: missing,
    });
  }
  const extra = [...present].filter((l) => !declared.has(l)).sort();
  if (extra.length > 0) {
    findings.push({
      kind: 'enum-labels-extra',
      schema,
      table,
      column: column.name,
      type,
      labels: extra,
    });
  }
  return findings;
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
    // An array is `ARRAY` in `data_type` and `_<element>` in `udt_name`; a
    // scalar compares against `data_type` as before.
    const element = arrayElementType(found);
    const actualType = column.isArray && element ? element : found.data_type;
    if (column.isArray && element === null) {
      findings.push({
        kind: 'type-mismatch',
        schema,
        table,
        column: column.name,
        expected: `${column.type}[]`,
        actual: found.data_type,
      });
    } else if (!typesAgree(column.type, actualType)) {
      findings.push({
        kind: 'type-mismatch',
        schema,
        table,
        column: column.name,
        expected: column.isArray ? `${column.type}[]` : column.type,
        actual: column.isArray ? `${actualType}[]` : actualType,
      });
    } else {
      // Only once the base types agree: a precision difference on top of a type
      // difference is noise, and the type line already says to look.
      findings.push(...diffModifiers(expected, column, found));
      findings.push(...diffEnumLabels(expected, column, found));
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
    case 'modifier-mismatch':
      return `  ${f.modifier.toUpperCase().padEnd(15)} ${where}.${f.column} — entity ${f.expected}, database ${f.actual ?? 'unspecified'}`;
    case 'enum-labels-missing':
      return `  ENUM MISSING    ${where}.${f.column} (${f.type}) — the entity declares ${f.labels.join(', ')}, the type does not have it`;
    case 'enum-labels-extra':
      return `  ENUM EXTRA      ${where}.${f.column} (${f.type}) — the type has ${f.labels.join(', ')}, no entity value declares it`;
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
    columns: metadata.columns.map((column) => {
      const isEnum = column.type === 'enum' || Boolean(column.enum);
      // `length` is a string on ColumnMetadata — '' when the entity did not
      // declare one, which is the "whatever the database has" case.
      const declaredLength = column.length === '' ? null : Number(column.length);
      return {
        name: column.databaseName,
        type: String(
          isEnum ? 'enum' : driverNormalize(column as never) || column.type,
        ).toLowerCase(),
        nullable: column.isNullable,
        isArray: column.isArray === true,
        precision: typeof column.precision === 'number' ? column.precision : null,
        scale: typeof column.scale === 'number' ? column.scale : null,
        length: Number.isFinite(declaredLength) ? declaredLength : null,
        enumValues: isEnum && Array.isArray(column.enum) ? column.enum.map(String) : null,
      };
    }),
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
    // Every enum type in the database, once, keyed by schema.name. Read from
    // `pg_enum`/`pg_type` rather than `information_schema`, which has no view of
    // enum labels at all.
    const enumRows: Array<{ udt_schema: string; udt_name: string; labels: string[] }> =
      await ds.query(
        // `enumlabel` is of type `name`, and node-postgres has no array parser
        // for `name[]` — it hands back the raw `{A,B}` string. The ::text cast
        // makes it a `text[]`, which does parse into a JS array.
        `SELECT n.nspname AS udt_schema,
                t.typname AS udt_name,
                array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
           FROM pg_type t
           JOIN pg_namespace n ON n.oid = t.typnamespace
           JOIN pg_enum e ON e.enumtypid = t.oid
          GROUP BY n.nspname, t.typname`,
      );
    const enums = new Map(enumRows.map((r) => [`${r.udt_schema}.${r.udt_name}`, r.labels]));

    const findings: Finding[] = [];
    for (const metadata of ds.entityMetadatas) {
      const expected = expectedFrom(metadata, (column) =>
        String(ds.driver.normalizeType(column)).toLowerCase(),
      );
      const actual: ActualColumn[] = await ds.query(
        `SELECT column_name, data_type, is_nullable, udt_name, udt_schema,
                numeric_precision, numeric_scale, character_maximum_length
           FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2`,
        [expected.schema, expected.table],
      );
      for (const column of actual) {
        // Attached here rather than fetched per column: one query for the whole
        // database, and `diffTable` stays a pure function over plain rows.
        column.enum_labels = enums.get(`${column.udt_schema}.${column.udt_name}`) ?? null;
      }
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

/**
 * `--module <name>` or `--module=<name>`, and nothing else silently passes.
 *
 * `--module` with no value used to yield `undefined`, which then read as "no
 * filter" and checked all eight — a narrowing flag that quietly does the
 * opposite of narrowing. Returning `undefined` here means the caller exits 2.
 */
export function parseModuleFlag(argv: string[]): string | null | undefined {
  const inline = argv.find((a) => a.startsWith('--module='));
  if (inline) {
    const value = inline.slice('--module='.length);
    return value === '' ? undefined : value;
  }
  const at = argv.indexOf('--module');
  if (at === -1) return null;
  const value = argv[at + 1];
  return value === undefined || value.startsWith('-') ? undefined : value;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const only = parseModuleFlag(argv);

  if (only === undefined) {
    console.error(
      `--module needs a value: --module <name> or --module=<name> ` +
        `(have ${MODULES.map((m) => m.module).join(', ')})`,
    );
    process.exit(2);
  }

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

/**
 * Run as a script; stay inert when the spec imports the pure functions above.
 *
 * The third case is the one that matters: anything else — the compiled `.js`
 * under a different name, a `node -e` wrapper, a path this match does not
 * recognise — used to print nothing and exit **0**, which a `--json`-consuming
 * CI step reads as "no drift". A gate whose silence means success is not a gate.
 */
const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
const underTestRunner =
  process.env.VITEST !== undefined ||
  process.env.JEST_WORKER_ID !== undefined ||
  /[/](vitest|jest)[/]/.test(entry);
// The documented door for another script that wants `diffTable` and friends
// without the CLI. Deliberate and named, unlike the silent exit 0 this replaced.
const importedOnPurpose = process.env.SCHEMA_DRIFT_NO_RUN === 'true';

if (/schema-drift\.(ts|js)$/.test(entry)) {
  main().catch((err) => {
    // Anything thrown after a connection is open — a privilege error on one
    // table, a driver fault — lands here rather than as an unhandled rejection.
    // Exit 2: this is the checker failing, which is not the same claim as
    // "the database drifted" (1) or "it agrees" (0).
    console.error(`schema-drift failed: ${(err as Error).message}`);
    process.exit(2);
  });
} else if (!underTestRunner && !importedOnPurpose) {
  console.error(
    `schema-drift: not invoked as a script (argv[1] = ${entry || '<none>'}). ` +
      `Run \`npm run verify:schema-drift\` from apps/api, or set SCHEMA_DRIFT_NO_RUN=true ` +
      `to import the comparison functions without the CLI.`,
  );
  process.exit(2);
}
