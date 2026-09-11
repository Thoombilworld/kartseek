import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — an order records the market it was placed in.
 *
 * `orders.region_code` and `orders.currency` are set at placement from the
 * market the checkout was priced in. Every amount on the row is in that
 * currency; without the columns an invoice, refund or audit could only guess
 * the market from the delivery address, and a reader browsing another market
 * had nothing telling them the figures were not in their own currency.
 */
export class OrderMarket1786501700000 implements MigrationInterface {
  name = 'OrderMarket1786501700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"."orders"
        ADD COLUMN IF NOT EXISTS "region_code" character varying,
        ADD COLUMN IF NOT EXISTS "currency" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"."orders"
        DROP COLUMN IF EXISTS "currency",
        DROP COLUMN IF EXISTS "region_code"
    `);
  }
}
