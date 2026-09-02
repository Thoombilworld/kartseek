import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — SKU uniqueness becomes per-seller instead of platform-wide
 *
 * `product_listings.sellerSku` and `product_variants.sku` were both declared
 * `unique`, which is wrong for a multi-vendor catalogue. A SKU is a seller's own
 * internal code for their own stock; sellers do not coordinate namespaces and
 * cannot be asked to. The global constraint meant the first seller to list
 * `TSHIRT-001` reserved that string for the entire marketplace, and every later
 * seller's insert failed on a row they cannot see, with a message naming a
 * conflict they had no way to find or resolve.
 *
 * New scopes:
 *
 *   product_listings  UNIQUE (seller_id, "sellerSku")
 *   product_variants  UNIQUE (product_id, sku)
 *
 * `product_variants` is scoped to the parent product rather than the seller
 * because the product already belongs to exactly one seller, so the two scopes
 * coincide — and the product id is on the row, which avoids a join in the index.
 *
 * ⚠️  Existing data. The new indexes are strictly weaker than the ones they
 * replace, so any dataset that satisfied the old constraint satisfies the new
 * one. No de-duplication pass is needed and none is performed. The drops are
 * `IF EXISTS` because the constraint may exist under either a TypeORM-generated
 * name (`UQ_<hash>`) or none at all, depending on whether the table was built by
 * `synchronize` or by the initial migration; both spellings are handled below.
 *
 * Reverting is NOT always possible: once two sellers share a SKU, restoring the
 * global unique index will fail. `down()` therefore reports what collides rather
 * than failing with a bare constraint error.
 */
export class ScopeSkuUniquenessToSeller1786200000000 implements MigrationInterface {
  name = 'ScopeSkuUniquenessToSeller1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── product_listings.sellerSku ────────────────────────────────────────────
    //
    // Dropped by lookup rather than by name: `synchronize` names these with a
    // content hash (`UQ_<hash>`) that differs between deployments, so a
    // hard-coded DROP CONSTRAINT would silently miss on half of them and leave
    // the global constraint in place — which is the whole bug.
    await queryRunner.query(`
      DO $$
      DECLARE c record;
      BEGIN
        FOR c IN
          SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace ns ON ns.oid = rel.relnamespace
           WHERE ns.nspname = 'marketplace'
             AND rel.relname = 'product_listings'
             AND con.contype = 'u'
             -- attname is of type name, and name[] = text[] has no operator.
             AND (SELECT array_agg(att.attname::text ORDER BY att.attname::text)
                    FROM unnest(con.conkey) k
                    JOIN pg_attribute att
                      ON att.attrelid = con.conrelid AND att.attnum = k)
                 = ARRAY['sellerSku']
        LOOP
          EXECUTE format('ALTER TABLE marketplace.product_listings DROP CONSTRAINT %I', c.conname);
        END LOOP;
      END $$;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."IDX_listings_sellerSku"`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_listings_seller_sku"
        ON marketplace.product_listings (seller_id, "sellerSku")
    `);

    // ── product_variants.sku ──────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$
      DECLARE c record;
      BEGIN
        FOR c IN
          SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace ns ON ns.oid = rel.relnamespace
           WHERE ns.nspname = 'marketplace'
             AND rel.relname = 'product_variants'
             AND con.contype = 'u'
             -- attname is of type name, and name[] = text[] has no operator.
             AND (SELECT array_agg(att.attname::text ORDER BY att.attname::text)
                    FROM unnest(con.conkey) k
                    JOIN pg_attribute att
                      ON att.attrelid = con.conrelid AND att.attnum = k)
                 = ARRAY['sku']
        LOOP
          EXECUTE format('ALTER TABLE marketplace.product_variants DROP CONSTRAINT %I', c.conname);
        END LOOP;
      END $$;
    `);
    // The entity declared this one as a named unique index, so it may exist as
    // an index rather than a constraint.
    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."IDX_product_variants_sku"`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_variants_product_sku"
        ON marketplace.product_variants (product_id, sku)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restoring the global constraint is only possible while no two sellers
    // share a SKU. Report the collisions instead of failing opaquely.
    const listingClashes: Array<{ count: string }> = await queryRunner.query(`
      SELECT COUNT(*)::text AS count FROM (
        SELECT "sellerSku" FROM marketplace.product_listings
         GROUP BY "sellerSku" HAVING COUNT(*) > 1
      ) t
    `);
    if (Number(listingClashes?.[0]?.count ?? 0) > 0) {
      throw new Error(
        `Cannot revert: ${listingClashes[0].count} SKU value(s) are used by more than one seller. ` +
        'Re-key those listings before restoring the platform-wide unique constraint.',
      );
    }

    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."UQ_variants_product_sku"`);
    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."UQ_listings_seller_sku"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_variants_sku"
        ON marketplace.product_variants (sku)
    `);
    await queryRunner.query(`
      ALTER TABLE marketplace.product_listings
        ADD CONSTRAINT "UQ_product_listings_sellerSku" UNIQUE ("sellerSku")
    `);
  }
}
