import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — a place to record that a product is featured
 *
 * The admin console had "Add to Featured" and "Remove from Featured" controls
 * wired to `addFeaturedProduct` / `removeFeaturedProduct`, and both did this:
 *
 *   await this.kafka.publish('featured.added', dto);
 *   await this.redis.del('marketplace:featured');
 *   return { success: true };
 *
 * A Kafka event with no consumer, a cache eviction, and a success response.
 * Nothing was written, because there was no column to write to — so featuring a
 * product changed nothing, and un-featuring it changed nothing either. The
 * storefront's "Featured" rail meanwhile ranked by `averageRating`, so it could
 * not be curated even in principle.
 *
 * Defaults to false: no product is retroactively promoted by this migration.
 * The rail keeps its rating-ranked ordering as a fallback while the curated set
 * is empty, which is a defensible default — those are real products with real
 * ratings — rather than a fabrication.
 */
export class ProductFeaturedFlag1786500900000 implements MigrationInterface {
  name = 'ProductFeaturedFlag1786500900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marketplace"."products"
      ADD COLUMN IF NOT EXISTS "is_featured" boolean NOT NULL DEFAULT false
    `);

    // Partial index: the storefront only ever asks for the featured ones, and
    // they are a small fraction of the catalogue.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_featured"
        ON "marketplace"."products" ("is_featured", "is_active")
        WHERE "is_featured" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "marketplace"."IDX_products_featured"`);
    await queryRunner.query(`ALTER TABLE "marketplace"."products" DROP COLUMN IF EXISTS "is_featured"`);
  }
}
