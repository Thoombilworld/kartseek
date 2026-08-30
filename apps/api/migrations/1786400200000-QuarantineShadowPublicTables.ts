import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — move the `public` tables that shadow `marketplace` out of the way
 *
 * `public` held a duplicate of 25 marketplace tables — `products`, `sellers`,
 * `categories`, `orders`, `reviews` and the rest — carrying July test fixtures
 * ("Test Store", "customer-1", "MacBook Pro M3"). They are inert to TypeORM,
 * which qualifies every table it generates with the connection's configured
 * schema. They are **not** inert to hand-written SQL: a bare table name resolves
 * through `search_path`, which is still `"$user", public`, so it finds the copy
 * first.
 *
 * That is not hypothetical. It is exactly how the `UserSellerType` backfill
 * silently did nothing — its `UPDATE ... FROM sellers` matched the empty
 * `public.sellers` and reported success. The region-scoping predicates in
 * `CatalogService` had the same bug and emptied the entire storefront until they
 * were qualified. Every such fault is invisible: the query is valid, it just
 * reads the wrong table.
 *
 * Moving them to their own schema keeps `search_path` from ever finding them
 * again while losing nothing — the rows are still there, still queryable as
 * `legacy_marketplace_public.products`, and `down()` puts them back.
 *
 * ── The guard ────────────────────────────────────────────────────────────────
 *
 * Only a `public` table whose name is also a table in `marketplace` is moved.
 * That is precisely the shadowing condition, and it is what makes this safe to
 * run anywhere: a deployment that keeps legitimate application tables in
 * `public` (the gateway's own `users`, `bank_offers`, `exchange_offers` and the
 * `migrations` ledger itself) has no `marketplace` counterpart for them, so they
 * are not touched. On a database that never had the duplicates — a fresh
 * production one — this migration moves nothing and is a no-op.
 */
export class QuarantineShadowPublicTables1786400200000 implements MigrationInterface {
  name = 'QuarantineShadowPublicTables1786400200000';

  private static readonly LEGACY_SCHEMA = 'legacy_marketplace_public';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const shadowed: Array<{ table_name: string }> = await queryRunner.query(`
      SELECT p.table_name
        FROM information_schema.tables p
       WHERE p.table_schema = 'public'
         AND p.table_type = 'BASE TABLE'
         AND EXISTS (
           SELECT 1 FROM information_schema.tables m
            WHERE m.table_schema = 'marketplace'
              AND m.table_type = 'BASE TABLE'
              AND m.table_name = p.table_name
         )
       ORDER BY p.table_name
    `);

    if (shadowed.length === 0) return;

    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${QuarantineShadowPublicTables1786400200000.LEGACY_SCHEMA}`);
    await queryRunner.query(`
      COMMENT ON SCHEMA ${QuarantineShadowPublicTables1786400200000.LEGACY_SCHEMA}
        IS 'Pre-2026-08 duplicates of marketplace tables that sat in public and shadowed the real ones through search_path. Retained for inspection; nothing reads them.'
    `);

    for (const { table_name: table } of shadowed) {
      // Quoted, and moved one at a time: `SET SCHEMA` carries the table's
      // indexes, constraints and sequences with it, and doing them individually
      // means a name that cannot move (an unexpected dependency) fails loudly
      // on that table rather than silently skipping the whole set.
      await queryRunner.query(
        `ALTER TABLE public."${table}" SET SCHEMA ${QuarantineShadowPublicTables1786400200000.LEGACY_SCHEMA}`,
      );
    }

    // eslint-disable-next-line no-console
    console.log(
      `[QuarantineShadowPublicTables] moved ${shadowed.length} shadowing table(s) out of public: ` +
      shadowed.map((r) => r.table_name).join(', '),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schemaExists: Array<{ exists: boolean }> = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) AS exists`,
      [QuarantineShadowPublicTables1786400200000.LEGACY_SCHEMA],
    );
    if (!schemaExists?.[0]?.exists) return;

    const quarantined: Array<{ table_name: string }> = await queryRunner.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`,
      [QuarantineShadowPublicTables1786400200000.LEGACY_SCHEMA],
    );

    for (const { table_name: table } of quarantined) {
      // A table that has since been recreated in `public` blocks the move back.
      // Skipping it is the right call: the live one wins, and the archived copy
      // stays where it is rather than colliding.
      const clash: Array<{ exists: boolean }> = await queryRunner.query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
         ) AS exists`,
        [table],
      );
      if (clash?.[0]?.exists) continue;
      await queryRunner.query(
        `ALTER TABLE ${QuarantineShadowPublicTables1786400200000.LEGACY_SCHEMA}."${table}" SET SCHEMA public`,
      );
    }

    // Dropped only when empty — `RESTRICT` is the default, so a schema still
    // holding a skipped table is left intact rather than taking its contents
    // with it.
    await queryRunner.query(
      `DROP SCHEMA IF EXISTS ${QuarantineShadowPublicTables1786400200000.LEGACY_SCHEMA} RESTRICT`,
    ).catch((): undefined => undefined);
  }
}
