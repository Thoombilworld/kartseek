import { describe, it, expect } from 'vitest';
import {
  diffTable,
  typesAgree,
  canonicalType,
  formatFinding,
  parseModuleFlag,
  type ActualColumn,
  type ExpectedTable,
} from './schema-drift';

/**
 * The checker has to catch the thing that got through: a column an entity
 * declares and the database does not have.
 *
 * Driven with a fabricated `information_schema.columns` result rather than a
 * live database, so a failure here means the comparison is wrong and nothing
 * else. The connection half is exercised by running it — the census in
 * `task-3b-report.md` is that evidence.
 *
 * The case that matters is the first one, and it is the real one:
 * `ProductListing.mrp` was added to the entity on 2026-09-06 and never reached
 * the dev database, because the initial migration's `CREATE TABLE IF NOT EXISTS`
 * skipped a table that already existed and the ledger then recorded it as
 * applied. `GET /api/v1/marketplace/products` answered 500 for days behind a
 * Redis cache that made it look fine.
 */

const productListings: ExpectedTable = {
  schema: 'marketplace',
  table: 'product_listings',
  columns: [
    { name: 'id', type: 'uuid', nullable: false },
    { name: 'sellerSku', type: 'varchar', nullable: false },
    { name: 'sellingPrice', type: 'numeric', nullable: false },
    { name: 'mrp', type: 'numeric', nullable: true },
  ],
};

/** What the database reported before the fix — `mrp` is simply absent. */
const withoutMrp: ActualColumn[] = [
  { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
  { column_name: 'sellerSku', data_type: 'character varying', is_nullable: 'NO' },
  { column_name: 'sellingPrice', data_type: 'numeric', is_nullable: 'NO' },
];

const withMrp: ActualColumn[] = [
  ...withoutMrp,
  { column_name: 'mrp', data_type: 'numeric', is_nullable: 'YES' },
];

describe('schema drift: a column the entity declares and the database lacks', () => {
  it('reports the missing column, and nothing else', () => {
    const findings = diffTable(productListings, withoutMrp);
    expect(findings).toEqual([
      {
        kind: 'missing-column',
        schema: 'marketplace',
        table: 'product_listings',
        column: 'mrp',
        type: 'numeric',
      },
    ]);
  });

  it('says which column and what the entity wanted', () => {
    expect(formatFinding(diffTable(productListings, withoutMrp)[0])).toContain(
      'marketplace.product_listings.mrp',
    );
  });

  it('is silent once the column is there', () => {
    expect(diffTable(productListings, withMrp)).toEqual([]);
  });

  it('reports a table that does not exist at all', () => {
    expect(diffTable(productListings, [])).toEqual([
      { kind: 'missing-table', schema: 'marketplace', table: 'product_listings' },
    ]);
  });
});

describe('schema drift: the other three shapes', () => {
  it('reports a column the database has and no entity declares', () => {
    const findings = diffTable(productListings, [
      ...withMrp,
      { column_name: 'countryCode', data_type: 'character varying', is_nullable: 'YES' },
    ]);
    expect(findings).toEqual([
      {
        kind: 'extra-column',
        schema: 'marketplace',
        table: 'product_listings',
        column: 'countryCode',
        type: 'character varying',
      },
    ]);
  });

  it('reports a nullability difference', () => {
    const findings = diffTable(productListings, [
      ...withoutMrp,
      { column_name: 'mrp', data_type: 'numeric', is_nullable: 'NO' },
    ]);
    expect(findings).toEqual([
      {
        kind: 'nullable-mismatch',
        schema: 'marketplace',
        table: 'product_listings',
        column: 'mrp',
        expected: true,
        actual: false,
      },
    ]);
  });

  it('reports a genuine type difference', () => {
    const findings = diffTable(productListings, [
      ...withoutMrp,
      { column_name: 'mrp', data_type: 'text', is_nullable: 'YES' },
    ]);
    expect(findings).toEqual([
      {
        kind: 'type-mismatch',
        schema: 'marketplace',
        table: 'product_listings',
        column: 'mrp',
        expected: 'numeric',
        actual: 'text',
      },
    ]);
  });
});

describe('type comparison', () => {
  it.each([
    ['varchar', 'character varying'],
    ['int', 'integer'],
    ['decimal', 'numeric'],
    ['timestamp', 'timestamp without time zone'],
    ['float', 'double precision'],
    ['boolean', 'boolean'],
    ['enum', 'USER-DEFINED'],
  ])('accepts %s against %s', (entity, database) => {
    expect(typesAgree(entity, database)).toBe(true);
  });

  it('accepts a type it has never heard of when both sides spell it the same', () => {
    // `tsvector` — the first thing this checker reported, as "entity tsvector,
    // database tsvector". A checker that cries about identical strings is one
    // people learn to skim past.
    expect(canonicalType('tsvector')).not.toBeNull();
    expect(typesAgree('geography(Point,4326)', 'geography(Point,4326)')).toBe(true);
  });

  it('refuses two unrecognised types that are spelled differently', () => {
    // Silence here would be the checker assuming agreement about something it
    // cannot read, which is the failure mode it exists to prevent.
    expect(typesAgree('geography', 'geometry')).toBe(false);
  });

  it.each([
    ['numeric', 'text'],
    ['int', 'bigint'],
    ['timestamp', 'timestamp with time zone'],
  ])('rejects %s against %s', (entity, database) => {
    expect(typesAgree(entity, database)).toBe(false);
  });
});

describe('schema drift: precision, scale and length', () => {
  /**
   * The blind spot the first round shipped with. Neither side carries the
   * modifier in its type name — `normalizeType` returns the bare `numeric`, and
   * `information_schema.data_type` is `numeric` for every precision — so
   * `numeric(10,2)` against `numeric(12,2)` read as agreement, and a `mrp` held
   * as `numeric(5,2)` would have rejected every list price over 999.99 at INSERT
   * time behind a green report.
   */
  const priced: ExpectedTable = {
    schema: 'marketplace',
    table: 'product_listings',
    columns: [
      { name: 'mrp', type: 'numeric', nullable: true, precision: 10, scale: 2 },
      { name: 'sellerSku', type: 'varchar', nullable: false, length: 255 },
    ],
  };
  const asDeclared: ActualColumn[] = [
    {
      column_name: 'mrp',
      data_type: 'numeric',
      is_nullable: 'YES',
      numeric_precision: 10,
      numeric_scale: 2,
    },
    {
      column_name: 'sellerSku',
      data_type: 'character varying',
      is_nullable: 'NO',
      character_maximum_length: 255,
    },
  ];

  it('is silent when the modifiers match', () => {
    expect(diffTable(priced, asDeclared)).toEqual([]);
  });

  it('catches a narrowed precision', () => {
    const narrowed = asDeclared.map((c) =>
      c.column_name === 'mrp' ? { ...c, numeric_precision: 5 } : c,
    );
    expect(diffTable(priced, narrowed)).toEqual([
      {
        kind: 'modifier-mismatch',
        schema: 'marketplace',
        table: 'product_listings',
        column: 'mrp',
        modifier: 'precision',
        expected: 10,
        actual: 5,
      },
    ]);
  });

  it('catches a changed scale', () => {
    const rescaled = asDeclared.map((c) =>
      c.column_name === 'mrp' ? { ...c, numeric_scale: 4 } : c,
    );
    expect(diffTable(priced, rescaled)).toEqual([
      expect.objectContaining({
        kind: 'modifier-mismatch',
        modifier: 'scale',
        expected: 2,
        actual: 4,
      }),
    ]);
  });

  it('catches a narrowed varchar', () => {
    const narrowed = asDeclared.map((c) =>
      c.column_name === 'sellerSku' ? { ...c, character_maximum_length: 50 } : c,
    );
    expect(diffTable(priced, narrowed)).toEqual([
      expect.objectContaining({
        kind: 'modifier-mismatch',
        column: 'sellerSku',
        modifier: 'length',
        expected: 255,
        actual: 50,
      }),
    ]);
  });

  it('says both numbers, so the migration can be written from the line', () => {
    const narrowed = asDeclared.map((c) =>
      c.column_name === 'mrp' ? { ...c, numeric_precision: 5 } : c,
    );
    const line = formatFinding(diffTable(priced, narrowed)[0]);
    expect(line).toContain('marketplace.product_listings.mrp');
    expect(line).toContain('entity 10');
    expect(line).toContain('database 5');
  });

  it('leaves an entity that declares no modifier alone', () => {
    // A plain `numeric` or plain `varchar` is asking for whatever the database
    // has; failing those would be a permanent finding on most columns.
    const unspecified: ExpectedTable = {
      schema: 'marketplace',
      table: 'product_listings',
      columns: [{ name: 'mrp', type: 'numeric', nullable: true }],
    };
    expect(
      diffTable(unspecified, [
        {
          column_name: 'mrp',
          data_type: 'numeric',
          is_nullable: 'YES',
          numeric_precision: 12,
          numeric_scale: 4,
        },
      ]),
    ).toEqual([]);
  });

  it('does not read numeric_precision for a timestamp that declares one', () => {
    // `datetime_precision` is a different column; `numeric_precision` is NULL
    // for a timestamp, so comparing blind would fail every such column forever.
    const stamped: ExpectedTable = {
      schema: 'doctor',
      table: 'appointments',
      columns: [{ name: 'createdAt', type: 'timestamp', nullable: false, precision: 6 }],
    };
    expect(
      diffTable(stamped, [
        {
          column_name: 'createdAt',
          data_type: 'timestamp without time zone',
          is_nullable: 'NO',
          numeric_precision: null,
        },
      ]),
    ).toEqual([]);
  });
});

describe('schema drift: enum labels', () => {
  /**
   * `information_schema` reports every enum as `USER-DEFINED`, so comparing the
   * base type alone makes an entity enum agree with any user-defined type in the
   * database — a different enum, a domain, a PostGIS geometry. `doctor` alone
   * has eighteen enum columns.
   */
  const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const appointments: ExpectedTable = {
    schema: 'doctor',
    table: 'appointments',
    columns: [{ name: 'status', type: 'enum', nullable: false, enumValues: statuses }],
  };
  const dbColumn = (labels: string[] | null): ActualColumn[] => [
    {
      column_name: 'status',
      data_type: 'USER-DEFINED',
      is_nullable: 'NO',
      udt_schema: 'doctor',
      udt_name: 'appointments_status_enum',
      enum_labels: labels,
    },
  ];

  it('is silent when the labels match, whatever their order', () => {
    expect(
      diffTable(appointments, dbColumn(['CANCELLED', 'PENDING', 'COMPLETED', 'CONFIRMED'])),
    ).toEqual([]);
  });

  it('catches a value the entity gained and the database type does not have', () => {
    // The shape that fails at INSERT rather than at boot: silently, on one code
    // path, the first time that status is written.
    expect(diffTable(appointments, dbColumn(['PENDING', 'CONFIRMED', 'COMPLETED']))).toEqual([
      {
        kind: 'enum-labels-missing',
        schema: 'doctor',
        table: 'appointments',
        column: 'status',
        type: 'doctor.appointments_status_enum',
        labels: ['CANCELLED'],
      },
    ]);
  });

  it('names the type and the label on the line', () => {
    const line = formatFinding(
      diffTable(appointments, dbColumn(['PENDING', 'CONFIRMED', 'COMPLETED']))[0],
    );
    expect(line).toContain('doctor.appointments_status_enum');
    expect(line).toContain('CANCELLED');
  });

  it('reports a label the database has and no entity value declares', () => {
    expect(diffTable(appointments, dbColumn([...statuses, 'NO_SHOW']))).toEqual([
      expect.objectContaining({ kind: 'enum-labels-extra', labels: ['NO_SHOW'] }),
    ]);
  });

  it('refuses a USER-DEFINED column that is not an enum at all', () => {
    // A domain or a PostGIS type behind an entity enum: no labels come back, and
    // silence there is the false negative this whole comparison exists for.
    expect(diffTable(appointments, dbColumn(null))).toEqual([
      expect.objectContaining({
        kind: 'enum-labels-missing',
        labels: [...statuses].sort(),
      }),
    ]);
  });
});

describe('schema drift: array columns and views', () => {
  const tagged: ExpectedTable = {
    schema: 'marketplace',
    table: 'products',
    columns: [{ name: 'tags', type: 'text', nullable: true, isArray: true }],
  };

  it('does not report a well-formed array as drift', () => {
    // `normalizeType` returns the ELEMENT type while `data_type` is `ARRAY` and
    // only `udt_name` carries `_text`. Comparing those directly would make every
    // array column a permanent, unfixable mismatch — the noise that teaches
    // people to skim past this checker.
    expect(
      diffTable(tagged, [
        { column_name: 'tags', data_type: 'ARRAY', is_nullable: 'YES', udt_name: '_text' },
      ]),
    ).toEqual([]);
  });

  it('still catches an array whose element type is wrong', () => {
    expect(
      diffTable(tagged, [
        { column_name: 'tags', data_type: 'ARRAY', is_nullable: 'YES', udt_name: '_int4' },
      ]),
    ).toEqual([
      expect.objectContaining({ kind: 'type-mismatch', expected: 'text[]', actual: 'int4[]' }),
    ]);
  });

  it('catches an array entity against a scalar column', () => {
    expect(
      diffTable(tagged, [
        { column_name: 'tags', data_type: 'text', is_nullable: 'YES', udt_name: 'text' },
      ]),
    ).toEqual([expect.objectContaining({ kind: 'type-mismatch', expected: 'text[]' })]);
  });

  it('would compare a view the same way — none exist to try it on', () => {
    // `grep -rln '@ViewEntity' modules/` returns nothing in any of the eight
    // module backends, so view handling is documented rather than exercised
    // against a real one. `information_schema.columns` does list view columns,
    // and TypeORM puts a `@ViewEntity` in `entityMetadatas`, so a view is
    // compared exactly like a table. This pins the shape so the first real view
    // has something to fail against.
    const asView: ExpectedTable = {
      schema: 'marketplace',
      table: 'seller_public_view',
      columns: [{ name: 'id', type: 'uuid', nullable: true }],
    };
    expect(
      diffTable(asView, [{ column_name: 'id', data_type: 'uuid', is_nullable: 'YES' }]),
    ).toEqual([]);
    expect(diffTable(asView, [])).toEqual([
      { kind: 'missing-table', schema: 'marketplace', table: 'seller_public_view' },
    ]);
  });
});

describe('--module', () => {
  it('takes a value, either spelling', () => {
    expect(parseModuleFlag(['--module', 'grocery'])).toBe('grocery');
    expect(parseModuleFlag(['--module=grocery'])).toBe('grocery');
    expect(parseModuleFlag(['--json', '--module', 'taxi'])).toBe('taxi');
  });

  it('is absent when not given', () => {
    expect(parseModuleFlag([])).toBeNull();
    expect(parseModuleFlag(['--json'])).toBeNull();
  });

  it('refuses a flag with no value rather than checking all eight', () => {
    // The bug: `argv[indexOf('--module') + 1]` was `undefined`, which read as
    // "no filter" — a narrowing flag doing the opposite of narrowing. The caller
    // turns `undefined` into exit 2.
    expect(parseModuleFlag(['--module'])).toBeUndefined();
    expect(parseModuleFlag(['--module', '--json'])).toBeUndefined();
    expect(parseModuleFlag(['--module='])).toBeUndefined();
  });
});
