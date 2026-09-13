import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `marketplace.product_listings.mrp` — the column the initial migration could
 * not add.
 *
 * `ProductListing.mrp` was added to the entity on 2026-09-06 (d701572): the
 * struck-through list price for one seller's offer, in that seller's market
 * currency, which readers prefer over `Product.mrp` when it is set.
 *
 * ── Why a second migration, when the initial one declares the column ─────────
 *
 * `1786498000000-InitialMarketplaceSchema` does declare `mrp`, inside its
 * `CREATE TABLE IF NOT EXISTS "marketplace"."product_listings" (…)`. Against the
 * dev databases the table already existed — `synchronize` built it before `mrp`
 * was ever written — so that statement did nothing whatsoever, and the runner
 * then recorded the migration as applied. `migration:show` read `[X]`, the
 * column was absent, and `CatalogService` selects it on every catalogue read:
 * `GET /api/v1/marketplace/products` answered 500 for everyone, superuser
 * included, for as long as the Redis cache in front of it kept serving the last
 * good response.
 *
 * An `IF NOT EXISTS` initial migration can create a database; it cannot
 * reconcile one. That is what `npm run verify:schema-drift` is for — it compares
 * the entity metadata against `information_schema` and would have caught this
 * the day the column was added. This file is the first thing it found.
 *
 * Type and nullability are the entity's, verbatim
 * (`src/entities/product-listing.entity.ts`):
 *
 *     @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
 *     mrp: number | null;
 *
 * Nullable matters twice over: every existing row has no list price to give it,
 * and `NOT NULL` with a default would invent one — a struck-through price no
 * seller set, on every offer in the catalogue.
 */
export class ProductListingMrp1786502700000 implements MigrationInterface {
  name = 'ProductListingMrp1786502700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_listings" ADD COLUMN IF NOT EXISTS "mrp" numeric(10,2)`,
    );
  }

  /**
   * Deliberately a no-op, and `IF EXISTS` would not have made it safe.
   *
   * `up()` is `ADD COLUMN IF NOT EXISTS`, so on a database built from
   * `1786498000000-InitialMarketplaceSchema` it adds nothing — the initial
   * migration already created `"mrp" numeric(10,2)` — and the runner records
   * this migration as applied regardless. A `DROP COLUMN` here would therefore
   * drop a column **the initial migration owns**, on the majority of databases,
   * and leave behind exactly the drift this file exists to fix: the column gone,
   * `1786498000000` still `[X]`, and nothing in the ledger that says why.
   *
   * A `down()` cannot tell those two cases apart — nothing records whether this
   * migration's `ADD COLUMN` was the one that took effect — so it declines to
   * guess. Reverting this migration is a ledger change and nothing else.
   *
   * If the column genuinely has to go, it goes by reverting the initial schema
   * or by a migration written to drop it, where that intent is explicit.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ present }]: Array<{ present: boolean }> = await queryRunner.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'marketplace'
            AND table_name = 'product_listings'
            AND column_name = 'mrp'
       ) AS present`,
    );
    if (present) {
      console.warn(
        '[ProductListingMrp] reverted, and "marketplace"."product_listings"."mrp" is left in ' +
          'place: the initial schema migration declares that column, so dropping it here would ' +
          'destroy something this migration may never have created.',
      );
    }
  }
}
