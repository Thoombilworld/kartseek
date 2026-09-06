import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — a list price on every marketplace offer.
 *
 * `products.mrp` is one figure for the whole catalogue. Once the same product
 * is offered in more than one market (a Qatari seller in riyals, an Indian one
 * in rupees) that single number cannot be the struck-through "was" price for
 * both, so the offer itself carries it: `product_listings.mrp`, nullable, in
 * the seller's own currency. Readers use it when set and fall back to the
 * product's figure.
 *
 * Development runs with `synchronize`, which added the column silently; this
 * migration is what production needs. The backfill copies the product figure
 * onto existing offers so nothing changes on screen until a seller or the
 * market seed sets a market-specific list price.
 */
export class ProductListingListPrice1786501500000 implements MigrationInterface {
  name = 'ProductListingListPrice1786501500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marketplace"."product_listings"
        ADD COLUMN IF NOT EXISTS "mrp" numeric(10,2)
    `);
    await queryRunner.query(`
      UPDATE "marketplace"."product_listings" l
         SET "mrp" = p."mrp"
        FROM "marketplace"."products" p
       WHERE p."id" = l."product_id" AND l."mrp" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marketplace"."product_listings" DROP COLUMN IF EXISTS "mrp"
    `);
  }
}
