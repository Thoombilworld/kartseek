import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — listing-level moderation, and a buy box that is actually computed
 *
 * Adds `product_listings.approvalStatus` / `.rejectionReason`, so a seller's
 * *offer* can be reviewed independently of the *product* it attaches to.
 *
 * Why the two decisions have to be separate: until now the only way to create a
 * listing was `addProduct`, which always minted a new catalogue entry alongside
 * it — so product approval and listing approval were the same event, and
 * `approveProduct` could reasonably do `UPDATE product_listings SET isActive =
 * true WHERE product_id = :id`. Now that a second seller can offer on an
 * existing product, that statement would put every competing seller's unreviewed
 * offer on sale the moment the first one was approved, at whatever price and
 * condition they had entered.
 *
 * ⚠️  BACKFILL — this is the dangerous part of the migration.
 *
 * The column defaults to 'PENDING'. Applied naively to a populated database that
 * means every listing currently on sale becomes unapproved, and since every
 * catalogue read now requires `approvalStatus = 'APPROVED'`, the entire
 * storefront empties on deploy. The backfill below therefore runs in the same
 * transaction as the column addition, and grandfathers in what was already live:
 *
 *   - `isActive = true`  → APPROVED. It was on sale, under the old rule where
 *     `isActive` alone meant "approved and selling". That decision was already
 *     taken by an admin; this migration is not entitled to revoke it.
 *   - `isActive = false` → PENDING, but only where the parent product is not
 *     APPROVED. An inactive listing under an approved product was deliberately
 *     switched off by its seller, not held back by moderation.
 *
 * Then every product's buy box is recomputed from scratch, because the flag has
 * never been maintained: `isBuyBoxWinner` was written once at creation and never
 * revisited, so it currently points at whichever listing happened to be created
 * first — regardless of price, stock, or whether that listing is still active.
 */
export class ListingApprovalAndBuyBox1786300000000 implements MigrationInterface {
  name = 'ListingApprovalAndBuyBox1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE marketplace.product_listings
        ADD COLUMN IF NOT EXISTS "approvalStatus" character varying NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "rejectionReason" text
    `);

    // ── Backfill: nothing that is on sale today may go dark on deploy ─────────
    await queryRunner.query(`
      UPDATE marketplace.product_listings
         SET "approvalStatus" = 'APPROVED'
       WHERE "isActive" = true
    `);

    // An inactive listing under an approved product was switched off by its
    // seller; approving it keeps that distinction meaningful (their switch, not
    // ours) and lets them turn it back on without a second review.
    await queryRunner.query(`
      UPDATE marketplace.product_listings pl
         SET "approvalStatus" = 'APPROVED'
       WHERE pl."isActive" = false
         AND EXISTS (
           SELECT 1 FROM marketplace.products p
            WHERE p.id = pl.product_id AND p.approval_status = 'APPROVED'
         )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_approval_status" ON marketplace.product_listings ("approvalStatus")`,
    );

    // The partial index the buy-box subquery and the region predicates hit now
    // that both filter on approval as well as activity.
    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."IDX_listings_product_active"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_product_live"
        ON marketplace.product_listings (product_id, "sellingPrice")
     WHERE "isActive" = true AND "approvalStatus" = 'APPROVED'
    `);

    // ── Recompute every buy box ───────────────────────────────────────────────
    //
    // Same ranking as `CatalogService.recomputeBuyBox`: cheapest first, then
    // fulfilled-by-KartSeek, then seller rating, then oldest listing as a stable
    // tie-break. Kept in one statement so a large catalogue does not need a
    // round trip per product.
    await queryRunner.query(`UPDATE marketplace.product_listings SET "isBuyBoxWinner" = false WHERE "isBuyBoxWinner" = true`);
    await queryRunner.query(`
      WITH ranked AS (
        SELECT pl.id,
               ROW_NUMBER() OVER (
                 PARTITION BY pl.product_id
                 ORDER BY pl."sellingPrice" ASC,
                          pl."isFulfilledByKartseek" DESC,
                          COALESCE(s."sellerRating", 0) DESC,
                          pl."createdAt" ASC
               ) AS rank
          FROM marketplace.product_listings pl
          LEFT JOIN marketplace.sellers s ON s.id = pl.seller_id
         WHERE pl."isActive" = true
           AND pl."approvalStatus" = 'APPROVED'
           AND pl."stockQuantity" > 0
      )
      UPDATE marketplace.product_listings pl
         SET "isBuyBoxWinner" = true
        FROM ranked
       WHERE pl.id = ranked.id AND ranked.rank = 1
    `);

    await queryRunner.query(`ANALYZE marketplace.product_listings`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting drops the distinction between "switched off by the seller" and
    // "not approved", so anything still pending is left inactive rather than
    // being silently put on sale under the old `isActive`-only rule.
    await queryRunner.query(`
      UPDATE marketplace.product_listings
         SET "isActive" = false
       WHERE "approvalStatus" <> 'APPROVED'
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."IDX_listings_product_live"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_product_active"
        ON marketplace.product_listings (product_id) WHERE "isActive" = true
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."IDX_listings_approval_status"`);
    await queryRunner.query(`
      ALTER TABLE marketplace.product_listings
        DROP COLUMN IF EXISTS "rejectionReason",
        DROP COLUMN IF EXISTS "approvalStatus"
    `);
  }
}
