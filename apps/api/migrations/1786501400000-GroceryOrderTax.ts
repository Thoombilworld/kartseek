import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Record the consumption tax inside a grocery order.
 *
 * Every market's rate is inclusive (`REGION_CONFIGS[x].tax.isInclusive`), so
 * `grandTotal` was already the correct amount to charge — but nothing stored how
 * much of it was tax. The receipt derived the figure as
 * `grandTotal - (itemTotal + deliveryFee - discount)`, which is exactly zero by
 * construction, so a Saudi order printed "VAT 0.00" against a 15% VAT sale and an
 * Indian one "GST 0.00" against 18% GST. Marketplace orders have carried
 * `taxAmount` since they were built; this brings grocery into line.
 *
 * Rate and label are stored beside the amount so that changing a market's rate
 * cannot retroactively restate what an already-issued receipt says.
 *
 * Existing rows keep 0/0/NULL. They are not backfilled: the rate in force when
 * an order was placed is not recoverable from the row, and writing today's rate
 * onto a historical sale would be inventing a tax figure — the exact failure this
 * column exists to stop.
 */
export class GroceryOrderTax1786501400000 implements MigrationInterface {
  name = 'GroceryOrderTax1786501400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `IF NOT EXISTS` so this is safe to re-run, and safe on a database where
    // dev `synchronize` has already added the columns.
    await queryRunner.query(`
      ALTER TABLE "grocery"."grocery_orders"
        ADD COLUMN IF NOT EXISTS "taxAmount" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "taxRate"   numeric(5,2)  NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "taxName"   character varying(32)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "grocery"."grocery_orders"
        DROP COLUMN IF EXISTS "taxName",
        DROP COLUMN IF EXISTS "taxRate",
        DROP COLUMN IF EXISTS "taxAmount"
    `);
  }
}
