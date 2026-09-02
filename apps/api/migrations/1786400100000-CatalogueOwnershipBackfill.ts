import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — give every product and variant back its owner
 *
 * Two `seller_id` columns that were never populated, each of which made a
 * seller's own catalogue invisible to them.
 *
 * ── products.seller_id ───────────────────────────────────────────────────────
 *
 * Every seeded product had `seller_id IS NULL` while its listing correctly named
 * a seller. `SellerService.getSellerProducts` filters `p.seller_id = :sellerId`,
 * so that seller's Products page, Inventory, Low-stock list and the dashboard's
 * pending/rejected counts were **all empty for a fully populated catalogue**.
 * Products created through `addProduct` were fine — it sets the column — so this
 * only ever affected rows that arrived any other way, which is most of them.
 *
 * ── product_variants.seller_id ───────────────────────────────────────────────
 *
 * The same column, one level down, and null for every row. It is what
 * `getLowStockVariants` filters on (so low-stock alerts returned nothing) and
 * what `MarketplaceFulfillmentService.assertOwns` reads to decide whether a
 * seller may edit a variant — with it null, a seller could not price or restock
 * their own SKUs.
 *
 * ── Why this is safe to run on a populated database ──────────────────────────
 *
 * Both statements only ever fill a NULL. A product that already names a seller
 * is left exactly as it is, so a deployment where the column was maintained
 * correctly is untouched, and re-running changes nothing.
 *
 * The product backfill additionally refuses to guess: it assigns an owner only
 * where every live listing on that product belongs to **one** seller. A product
 * genuinely offered by several sellers has no single owner — that is what the
 * listings table is for — and picking the cheapest or the first would hand one
 * seller edit rights over a catalogue entry the others also sell.
 */
export class CatalogueOwnershipBackfill1786400100000 implements MigrationInterface {
  name = 'CatalogueOwnershipBackfill1786400100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE marketplace.products p
         SET seller_id = owner.seller_id
        FROM (
          SELECT pl.product_id,
                 MIN(pl.seller_id::text)::uuid AS seller_id
            FROM marketplace.product_listings pl
           WHERE pl."isActive" = true
           GROUP BY pl.product_id
          HAVING COUNT(DISTINCT pl.seller_id) = 1
        ) AS owner
       WHERE owner.product_id = p.id
         AND p.seller_id IS NULL
    `);

    // Stamped from the parent product, which is the column every later
    // ownership check on a variant reads. Done after the product backfill above
    // so it picks up the rows that one just resolved.
    await queryRunner.query(`
      UPDATE marketplace.product_variants v
         SET seller_id = p.seller_id::text
        FROM marketplace.products p
       WHERE p.id = v.product_id
         AND p.seller_id IS NOT NULL
         AND v.seller_id IS NULL
    `);

    // Left deliberately as a log line rather than a hard failure: a multi-seller
    // catalogue legitimately has products with no single owner, and refusing to
    // deploy over that would be wrong.
    const orphans: Array<{ products: string; variants: string }> = await queryRunner.query(`
      SELECT (SELECT count(*) FROM marketplace.products WHERE seller_id IS NULL)::text AS products,
             (SELECT count(*) FROM marketplace.product_variants WHERE seller_id IS NULL)::text AS variants
    `);
    const { products = '0', variants = '0' } = orphans?.[0] ?? {};
    if (Number(products) > 0 || Number(variants) > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[CatalogueOwnershipBackfill] ${products} product(s) and ${variants} variant(s) still have no seller_id — ` +
        'these are offered by more than one seller, or by none. They will not appear in any seller portal.',
      );
    }
  }

  public async down(): Promise<void> {
    // Intentionally not reversed.
    //
    // The backfill cannot tell, after the fact, which rows it set and which
    // already named a seller — the column carries no such mark. Nulling them all
    // would take products that have always had a correct owner away from the
    // seller who owns them, which is a larger fault than the one this migration
    // fixed. Reverting it is a no-op; the forward statements are idempotent, so
    // re-running `up` is safe.
  }
}
