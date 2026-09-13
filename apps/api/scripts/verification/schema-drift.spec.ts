import { describe, it, expect } from 'vitest';
import {
  diffTable,
  typesAgree,
  canonicalType,
  formatFinding,
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
