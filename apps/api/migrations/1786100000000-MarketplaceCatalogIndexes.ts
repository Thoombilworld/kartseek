import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — marketplace catalogue indexes and the products→sellers foreign key
 *
 * `marketplace.products` carried no index beyond its three unique keys (`id`,
 * `globalTradeItemNumber`, `slug`). Every storefront read therefore scanned the
 * table. Measured with EXPLAIN ANALYZE against the dev dataset:
 *
 *     Limit → Sort (averageRating DESC)
 *       └ Nested Loop
 *          ├ Seq Scan on categories      (112 rows removed by filter)
 *          └ Seq Scan on products        (is_active AND approval_status)
 *               SubPlan → Seq Scan on product_listings
 *               SubPlan → Seq Scan on sellers
 *
 * At 178 products that runs in under a millisecond, which is exactly why it was
 * never noticed. The plan is O(N) by construction and does not survive a real
 * catalogue.
 *
 * Two structural fixes and a set of indexes:
 *
 * 1. `products.seller_id` becomes `uuid` with a real foreign key. It was an
 *    unconstrained `varchar`, so the region predicate compared
 *    `sellers.id::text = products.seller_id` — a cast on the indexed side, which
 *    can never use an index (the `Seq Scan on sellers` above). Nothing prevented
 *    a product referencing a seller that does not exist, either.
 *
 * 2. Foreign keys already exist on `category_id`, `subcategory_id` and
 *    `brand_id`, but Postgres does not index the referencing side of a
 *    constraint — so the category and brand landing pages scanned too.
 *
 * 3. Search had no usable index at all. `to_tsvector(...) @@ websearch_to_tsquery(...)`
 *    needs a GIN index over the *same expression* to be used, and the
 *    `name ILIKE '%q%'` fallback needs pg_trgm.
 *
 * The column indexes are also declared on the entities, because this module runs
 * with `synchronize: true` outside production and would otherwise drop an index
 * it has no metadata for. The two expression indexes cannot be expressed as
 * decorators and exist only here.
 *
 * CONCURRENTLY is deliberately not used: TypeORM wraps each migration in a
 * transaction and `CREATE INDEX CONCURRENTLY` cannot run inside one. On a large
 * production table, build these by hand outside the migration runner instead.
 *
 * ⚠️  DEV CAVEAT — `synchronize` drops the two expression indexes.
 *
 * MarketplaceServiceModule sets `synchronize: NODE_ENV !== 'production'`, and TypeORM's
 * schema sync drops any index it has no entity metadata for. The column indexes
 * survive because they are declared as `@Index()` on the entities; the GIN
 * indexes below cannot be expressed as decorators, so every dev restart removes
 * them. Verified: they were dropped within one watch-reload of being created.
 *
 * They persist in production, where synchronize is off. To keep them in dev,
 * turn `synchronize` off for this module and run migrations instead — which is
 * the right end state regardless, since this database is shared by every
 * service and no other module's tables are protected from a stray sync either.
 */
export class MarketplaceCatalogIndexes1786100000000 implements MigrationInterface {
  name = 'MarketplaceCatalogIndexes1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. seller_id → uuid, with a foreign key ───────────────────────────────
    //
    // Guarded: a row whose seller_id is not a well-formed uuid, or points at no
    // seller, would fail the cast or the constraint and take the whole migration
    // down. Both are cleared to NULL first, rather than discovered as a failed
    // deploy.
    //
    // Branched on the column's *current* type, because by the time this first
    // ran there was no migration runner and `synchronize` had already performed
    // the varchar→uuid change on its own from the entity. Against that database
    // the original text-only cleanup was not merely redundant, it errored:
    // `seller_id !~ '…'` and `s.id::text = p.seller_id` are both `text = uuid`
    // comparisons once the column is uuid, and Postgres has no such operator —
    // so the migration failed on its first statement and could never be applied.
    await queryRunner.query(`
      DO $$
      DECLARE col_type text;
      BEGIN
        SELECT data_type INTO col_type
          FROM information_schema.columns
         WHERE table_schema = 'marketplace'
           AND table_name = 'products'
           AND column_name = 'seller_id';

        IF col_type IS DISTINCT FROM 'uuid' THEN
          -- Still text: clear anything that will not survive the cast, then cast.
          UPDATE marketplace.products
             SET seller_id = NULL
           WHERE seller_id IS NOT NULL
             AND seller_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

          UPDATE marketplace.products p
             SET seller_id = NULL
           WHERE p.seller_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM marketplace.sellers s WHERE s.id::text = p.seller_id);

          ALTER TABLE marketplace.products
            ALTER COLUMN seller_id TYPE uuid USING seller_id::uuid;
        ELSE
          -- Already uuid. Only the orphan sweep is still needed, and it compares
          -- uuid to uuid.
          UPDATE marketplace.products p
             SET seller_id = NULL
           WHERE p.seller_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM marketplace.sellers s WHERE s.id = p.seller_id);
        END IF;
      END $$;
    `);

    // ON DELETE SET NULL, not CASCADE: removing a seller must not silently
    // delete the catalogue history their products appear in (orders reference
    // products by id).
    //
    // `ADD CONSTRAINT` has no IF NOT EXISTS, and this migration has to be safe to
    // apply to a database that `synchronize` has already partly shaped.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_seller'
        ) THEN
          ALTER TABLE marketplace.products
            ADD CONSTRAINT "FK_products_seller"
            FOREIGN KEY (seller_id) REFERENCES marketplace.sellers(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // ── 2. Column indexes ─────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_active_approval" ON marketplace.products (is_active, approval_status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_category"        ON marketplace.products (category_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_subcategory"     ON marketplace.products (subcategory_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_brand"           ON marketplace.products (brand_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_seller"          ON marketplace.products (seller_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_created_at"      ON marketplace.products (created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_rating"          ON marketplace.products ("averageRating" DESC, "reviewCount" DESC)`);

    // Partial: the region-scope EXISTS and every buy-box lookup filter on
    // isActive, so the inactive listings do not belong in the index.
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_listings_product_active" ON marketplace.product_listings (product_id) WHERE "isActive" = true`);

    // Review lists and the rating aggregate both filter on status.
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_product_status" ON marketplace.reviews (product_id, status)`);

    // Tree descent (`findDescendants`, roots via parent_id IS NULL).
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_categories_parent" ON marketplace.categories (parent_id)`);

    // ── 3. Search ─────────────────────────────────────────────────────────────
    //
    // The expression must match CatalogService.searchProducts exactly or the
    // planner will not use the index.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_fts"
        ON marketplace.products
     USING GIN (to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(short_description, '')))
    `);

    // Trigram index for the `name ILIKE '%q%'` fallback, which no btree can serve.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_name_trgm" ON marketplace.products USING GIN (name gin_trgm_ops)`);

    // Give the planner real statistics for the new shape before the next query.
    await queryRunner.query(`ANALYZE marketplace.products`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of [
      'IDX_products_name_trgm',
      'IDX_products_fts',
      'IDX_categories_parent',
      'IDX_reviews_product_status',
      'IDX_listings_product_active',
      'IDX_products_rating',
      'IDX_products_created_at',
      'IDX_products_seller',
      'IDX_products_brand',
      'IDX_products_subcategory',
      'IDX_products_category',
      'IDX_products_active_approval',
    ]) {
      await queryRunner.query(`DROP INDEX IF EXISTS marketplace."${index}"`);
    }

    await queryRunner.query(`ALTER TABLE marketplace.products DROP CONSTRAINT IF EXISTS "FK_products_seller"`);
    await queryRunner.query(`ALTER TABLE marketplace.products ALTER COLUMN seller_id TYPE character varying USING seller_id::text`);
    // pg_trgm is left installed — other work may since have come to rely on it,
    // and dropping an extension is not a safe inverse of creating one.
  }
}
