import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — the category → variant schema, and the product `metadata` store
 *
 * Two things the storefront, the seller portal and the Super Admin panel all
 * needed and none of them had.
 *
 * ── 1. `product_attributes` becomes the variant contract ─────────────────────
 *
 * The table existed (created by `synchronize`; the only migration that mentions
 * it, `AuditRemediation`, is baselined and uses bare table names). What it could
 * not express was the one fact all three surfaces needed: **which attributes
 * split a product into SKUs**. Colour and Size do; Battery Capacity and Warranty
 * describe the product and must not become buttons on a detail page. With
 * nothing recording that distinction, each surface guessed from the attribute's
 * name — so the storefront's swatch test, the seller portal's axis list and the
 * admin panel's editor could and did disagree.
 *
 * `isVariantAxis` records it once. `options` is widened from bare strings to
 * `[{ label, value, hex? }]` so a COLOR option can carry the fill the storefront
 * paints: without it a shade the web bundle's hard-coded lookup did not know —
 * "Titanium Natural", or any name a seller invents — could only ever render as a
 * neutral grey chip.
 *
 * The `slug` unique constraint moves from global to per-category. "Size" belongs
 * to Fashion *and* to Footwear with different values, and a platform-wide unique
 * slug made the second one impossible to create: the admin panel reported
 * "already exists" for a category that had no attributes at all.
 *
 * ── 2. `products.metadata` ───────────────────────────────────────────────────
 *
 * The storefront has read `product.metadata.*` from the beginning —
 * `richDescriptionHtml`, `specifications`, `imageGalleryUrls`,
 * `variantDimensions`, and now `spin360Urls` for the 360° viewer. **The column
 * did not exist.** Every one of those reads resolved to `undefined` and each
 * caller fell through to its `|| ''` branch, so nothing surfaced as an error.
 * `CatalogService.getProductById` even synthesises the key on the way out
 * (`(product as any).metadata ?? {}`), which is why the API response carried a
 * `metadata` object the whole time and no one noticed the store behind it was
 * missing. A seller who saved 360° frames got a 200 and an empty database.
 *
 * Writes to it are deliberately narrow in the application layer — nothing
 * accepts a whole `metadata` object from a seller or admin payload, because
 * `richDescriptionHtml` is rendered by an SSR'd server component and a blanket
 * write would be a stored-XSS surface. Each key gets its own validated endpoint.
 */
export class CategoryVariantSchema1786400000000 implements MigrationInterface {
  name = 'CategoryVariantSchema1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The table is created here as well as by `synchronize`, so a database built
    // from migrations alone lands in the same place as a development one. Every
    // name is schema-qualified: the migrations ledger lives in `public`, so a
    // bare `product_attributes` would resolve against `search_path` and build a
    // second table there shadowing the real one.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS marketplace.product_attributes (
        "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"         character varying NOT NULL,
        "slug"         character varying NOT NULL,
        "type"         character varying NOT NULL DEFAULT 'TEXT',
        "options"      jsonb,
        "unit"         character varying,
        "isRequired"   boolean NOT NULL DEFAULT true,
        "isFilterable" boolean NOT NULL DEFAULT true,
        "isSearchable" boolean NOT NULL DEFAULT false,
        "sortOrder"    integer NOT NULL DEFAULT 0,
        "categoryId"   uuid REFERENCES marketplace.categories(id) ON DELETE SET NULL,
        "isActive"     boolean NOT NULL DEFAULT true,
        "createdAt"    TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE marketplace.product_attributes
        ADD COLUMN IF NOT EXISTS "isVariantAxis" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN marketplace.product_attributes."isVariantAxis"
        IS 'True when this attribute splits a product into SKUs (Colour, Size) rather than describing it'
    `);

    // ── Widen `options` from string[] to [{ label, value, hex? }] ─────────────
    //
    // Rewritten in SQL rather than left to the application to normalise on read:
    // three services and two front ends index into this array, and a column that
    // holds two shapes pushes the branch into every one of them. Rows already in
    // the object form are left alone, so this is safe to re-run.
    await queryRunner.query(`
      UPDATE marketplace.product_attributes
         SET "options" = (
               SELECT jsonb_agg(
                        jsonb_build_object(
                          'label', opt,
                          'value', regexp_replace(regexp_replace(lower(opt), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
                        )
                        ORDER BY ord
                      )
                 FROM jsonb_array_elements_text("options") WITH ORDINALITY AS t(opt, ord)
             )
       WHERE "options" IS NOT NULL
         AND jsonb_typeof("options") = 'array'
         AND jsonb_array_length("options") > 0
         -- Only the legacy shape: every element a bare string.
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements("options") AS e
            WHERE jsonb_typeof(e) <> 'string'
         )
    `);

    // ── Unique per category, not platform-wide ───────────────────────────────
    //
    // Only the *global* slug constraint is dropped — that is the one that was
    // wrong. Both spellings are tried because a database built by `synchronize`
    // and one built from these migrations would name it differently.
    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."IDX_product_attributes_slug"`);
    await queryRunner.query(`
      ALTER TABLE marketplace.product_attributes
        DROP CONSTRAINT IF EXISTS "UQ_product_attributes_slug"
    `);

    // Two attributes with the same slug under the same category would make the
    // schema ambiguous — the seller form and the storefront filter both key on
    // it — so a unique constraint stays, scoped to where it is meaningful.
    //
    // Created only when nothing equivalent is already there. `synchronize`
    // builds this index from the entity's `@Index(['categoryId','slug'])` under
    // a generated hash name, and this module runs with `synchronize` on outside
    // production: adding a second, identically-shaped unique index under our own
    // name would leave every development database carrying both. Conversely a
    // migrations-only database has neither, so it cannot simply be skipped.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
            FROM pg_index i
            JOIN pg_class c   ON c.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'marketplace'
             AND c.relname = 'product_attributes'
             AND i.indisunique
             AND i.indnatts = 2
             AND (
               SELECT array_agg(a.attname::text ORDER BY a.attname)
                 FROM unnest(i.indkey) AS k(attnum)
                 JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
             ) = ARRAY['categoryId', 'slug']
        ) THEN
          CREATE UNIQUE INDEX "IDX_product_attributes_category_slug"
            ON marketplace.product_attributes ("categoryId", "slug");
        END IF;
      END $$;
    `);

    // Every read of this table is "the attributes of this category" — the seller
    // portal issues it on each product form, the storefront on each detail page.
    // Same reasoning as above: the entity declares it, so only create it where
    // `synchronize` has not already.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
            FROM pg_index i
            JOIN pg_class c   ON c.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'marketplace'
             AND c.relname = 'product_attributes'
             AND NOT i.indisunique
             AND i.indnatts = 2
             AND (
               SELECT array_agg(a.attname::text ORDER BY a.attname)
                 FROM unnest(i.indkey) AS k(attnum)
                 JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
             ) = ARRAY['categoryId', 'isActive']
        ) THEN
          CREATE INDEX "IDX_product_attributes_category_active"
            ON marketplace.product_attributes ("categoryId", "isActive");
        END IF;
      END $$;
    `);

    // ── products.metadata ────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE marketplace.products
        ADD COLUMN IF NOT EXISTS "metadata" jsonb
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN marketplace.products."metadata"
        IS 'Presentation extras: spin360Urls, richDescriptionHtml, specifications, imageGalleryUrls. Written only through per-key validated endpoints.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // `metadata` is dropped rather than preserved: nothing read it before this
    // migration, so anything in it was written after — and leaving an orphaned
    // column behind would make a re-run of `up` a no-op on a half-reverted
    // database.
    await queryRunner.query(`ALTER TABLE marketplace.products DROP COLUMN IF EXISTS "metadata"`);

    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."IDX_product_attributes_category_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."IDX_product_attributes_global_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS marketplace."IDX_product_attributes_category_slug"`);

    // Collapse `options` back to bare strings before restoring the global unique
    // index, so the column matches the shape the old code expects.
    await queryRunner.query(`
      UPDATE marketplace.product_attributes
         SET "options" = (
               SELECT jsonb_agg(e->>'label' ORDER BY ord)
                 FROM jsonb_array_elements("options") WITH ORDINALITY AS t(e, ord)
             )
       WHERE "options" IS NOT NULL
         AND jsonb_typeof("options") = 'array'
         AND jsonb_array_length("options") > 0
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements("options") AS e
            WHERE jsonb_typeof(e) = 'object'
         )
    `);

    // Restoring a platform-wide unique slug can genuinely fail — two categories
    // may each legitimately hold a "size" now. Deactivate the later duplicates
    // rather than letting the revert abort: an unreachable attribute is
    // recoverable, a migration stuck half-applied is not.
    await queryRunner.query(`
      UPDATE marketplace.product_attributes a
         SET "isActive" = false
       WHERE EXISTS (
         SELECT 1 FROM marketplace.product_attributes b
          WHERE b."slug" = a."slug" AND b."createdAt" < a."createdAt"
       )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_attributes_slug"
        ON marketplace.product_attributes ("slug")
     WHERE "isActive" = true
    `);

    await queryRunner.query(`
      ALTER TABLE marketplace.product_attributes DROP COLUMN IF EXISTS "isVariantAxis"
    `);
  }
}
