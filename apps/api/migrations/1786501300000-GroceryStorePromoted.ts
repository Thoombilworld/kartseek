import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * `grocery_stores.isPromoted` — commercial placement for the storefront's
 * "Featured & Sponsored" rail.
 *
 * The rail and its crown badge shipped without any column behind them, so the
 * flag read `undefined` on every store and the section never populated from
 * real data.
 *
 * Idempotent: dev runs with `synchronize` on and will have created the column
 * already, so this must not fail on a database that already has it.
 */
export class GroceryStorePromoted1786501300000 implements MigrationInterface {
  name = 'GroceryStorePromoted1786501300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "grocery"."grocery_stores"
      ADD COLUMN IF NOT EXISTS "isPromoted" boolean NOT NULL DEFAULT false
    `);
    // The rail reads promoted + online + approved; index the flag so that filter
    // does not scan the table as the estate grows.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_grocery_stores_promoted"
      ON "grocery"."grocery_stores" ("isPromoted")
      WHERE "isPromoted" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "grocery"."IDX_grocery_stores_promoted"`);
    await queryRunner.query(`ALTER TABLE "grocery"."grocery_stores" DROP COLUMN IF EXISTS "isPromoted"`);
  }
}
