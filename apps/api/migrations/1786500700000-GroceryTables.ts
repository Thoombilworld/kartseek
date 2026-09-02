import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — grocery tables
 *
 * `GrocerySchema1786500100000` created the `grocery` schema and nothing else,
 * noting that "production needs generated DDL per vertical". This is that DDL,
 * plus the four schema additions the module audit required:
 *
 *   • `grocery_stores.productCount` — `createProduct` / `deleteProduct` /
 *     `bulkImportProducts` all called `increment(…, 'productCount')` against a
 *     column that did not exist. TypeORM threw *after* the write had committed,
 *     into a catch block that fabricated a result — a fully successful bulk
 *     import reported `{ uploaded: 0, errors: <every row> }`.
 *
 *   • `grocery_items.translations` — `updateProductTranslation` assigned to
 *     `(product as any).translations` on an entity with no such column, so
 *     TypeORM dropped it on save and `getProductTranslated` returned the
 *     untranslated row for every locale. The whole feature was a no-op.
 *
 *   • `grocery_delivery_zones` — the admin console has always had a Delivery
 *     Zones screen and the gateway has always exposed the commands for it, but
 *     nothing ever stored a zone.
 *
 *   • `grocery_settings` — same story for the admin Settings screen, whose Save
 *     button reported success without writing anything.
 *
 * Development builds these through `synchronize`, which is why the gap survived:
 * a developer's database has had these columns since the entity changed, and
 * only production — which correctly runs with `DB_SYNCHRONIZE=false` — would
 * have hit `column "productCount" does not exist`.
 *
 * Idempotent throughout (`IF NOT EXISTS`), so it is safe on an environment where
 * `synchronize` has already created some of this.
 *
 * TypeORM's default naming strategy is camelCase, so identifiers are quoted to
 * match what the entities emit; the two snake_case columns (`franchise_id`,
 * `region_code`) carry an explicit `name` in the entity and are spelled that way
 * here.
 */
export class GroceryTables1786500700000 implements MigrationInterface {
  name = 'GroceryTables1786500700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "grocery"`);
    // `uuid_generate_v4()` comes from uuid-ossp; `gen_random_uuid()` is built in
    // from PG13 and needs no extension, so it is what the defaults use.

    // ── grocery.grocery_categories ───────────────────────────────────────────
    // Primary key is the slug ('fruits-vegetables'), which is also the join key
    // on `grocery_items.category`.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grocery"."grocery_categories" (
        "id"               character varying(64) NOT NULL,
        "name"             character varying(128) NOT NULL,
        "emoji"            character varying(8),
        "gradient"         character varying(64),
        "description"      text,
        "imageUrl"         character varying,
        "translations"     jsonb,
        "parentId"         character varying,
        "sortOrder"        integer NOT NULL DEFAULT 0,
        "isActive"         boolean NOT NULL DEFAULT true,
        "productCount"     integer NOT NULL DEFAULT 0,
        "subcategoryCount" integer NOT NULL DEFAULT 0,
        "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grocery_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "grocery"."grocery_categories"
        DROP CONSTRAINT IF EXISTS "FK_grocery_categories_parent"
    `);
    await queryRunner.query(`
      ALTER TABLE "grocery"."grocery_categories"
        ADD CONSTRAINT "FK_grocery_categories_parent"
        FOREIGN KEY ("parentId") REFERENCES "grocery"."grocery_categories"("id") ON DELETE SET NULL
    `);

    // ── grocery.grocery_stores ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grocery"."grocery_stores" (
        "id"                            uuid NOT NULL DEFAULT gen_random_uuid(),
        "name"                          character varying(255) DEFAULT '',
        "slug"                          character varying(128),
        "translations"                  jsonb,
        "ownerId"                       character varying DEFAULT '',
        "address"                       text,
        "latitude"                      numeric(10,7) DEFAULT 0,
        "longitude"                     numeric(10,7) DEFAULT 0,
        "storeTypes"                    text,
        "isOnline"                      boolean NOT NULL DEFAULT false,
        "isHyperlocalDeliveryAvailable" boolean NOT NULL DEFAULT true,
        "deliveryRadius"                numeric(5,2) NOT NULL DEFAULT 10,
        "minOrderAmount"                numeric(10,2) NOT NULL DEFAULT 0,
        "deliveryFee"                   numeric(10,2) NOT NULL DEFAULT 0,
        "openingHours"                  jsonb,
        "tags"                          text,
        "rating"                        numeric(3,1) NOT NULL DEFAULT 0,
        "totalOrders"                   integer NOT NULL DEFAULT 0,
        "productCount"                  integer NOT NULL DEFAULT 0,
        "logoUrl"                       character varying,
        "bannerUrl"                     character varying,
        "phone"                         character varying(20),
        "status"                        character varying NOT NULL DEFAULT 'PENDING_KYC',
        "franchise_id"                  character varying,
        "region_code"                   character varying(8),
        "createdAt"                     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"                     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grocery_stores" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_grocery_stores_slug" UNIQUE ("slug"),
        CONSTRAINT "CHK_grocery_stores_status"
          CHECK ("status" IN ('PENDING_KYC', 'APPROVED', 'SUSPENDED'))
      )
    `);
    // On an environment where `synchronize` built the table before the column
    // existed, add it rather than skipping the whole CREATE above.
    await queryRunner.query(`
      ALTER TABLE "grocery"."grocery_stores"
        ADD COLUMN IF NOT EXISTS "productCount" integer NOT NULL DEFAULT 0
    `);
    // The seller portal resolves a store from the signed-in owner on every screen
    // (`GET /grocery/stores/mine`), and the gateway's ownership guard hits it on
    // every seller write.
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_stores_owner"     ON "grocery"."grocery_stores" ("ownerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_stores_status"    ON "grocery"."grocery_stores" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_stores_franchise" ON "grocery"."grocery_stores" ("franchise_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_stores_region"    ON "grocery"."grocery_stores" ("region_code")`);

    // ── grocery.grocery_items ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grocery"."grocery_items" (
        "id"                     uuid NOT NULL DEFAULT gen_random_uuid(),
        "name"                   character varying(255) DEFAULT '',
        "description"            text,
        "category"               character varying(64) DEFAULT '',
        "subCategory"            character varying(64),
        "isAvailable"            boolean NOT NULL DEFAULT true,
        "weightVariants"         jsonb NOT NULL,
        "preparationPreferences" jsonb,
        "imageUrl"               character varying,
        "translations"           jsonb,
        "brand"                  character varying(128),
        "barcode"                character varying(64),
        "isPromoted"             boolean NOT NULL DEFAULT false,
        "rating"                 numeric(3,1) NOT NULL DEFAULT 0,
        "reviewCount"            integer NOT NULL DEFAULT 0,
        "searchVector"           tsvector,
        "storeId"                uuid NOT NULL,
        "createdAt"              TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"              TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grocery_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_grocery_items_store"
          FOREIGN KEY ("storeId") REFERENCES "grocery"."grocery_stores"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "grocery"."grocery_items"
        ADD COLUMN IF NOT EXISTS "translations" jsonb
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_items_store"    ON "grocery"."grocery_items" ("storeId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_items_category" ON "grocery"."grocery_items" ("category")`);
    // GIN, not the btree TypeORM's bare @Index() would build — a tsvector is only
    // searchable at speed through GIN.
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_items_search"   ON "grocery"."grocery_items" USING GIN ("searchVector")`);

    // ── grocery.grocery_orders ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grocery"."grocery_orders" (
        "id"                  uuid NOT NULL DEFAULT gen_random_uuid(),
        "orderNumber"         character varying NOT NULL,
        "customerId"          character varying NOT NULL,
        "driverId"            character varying,
        "storeId"             uuid NOT NULL,
        "items"               jsonb NOT NULL,
        "itemTotal"           numeric(10,2) NOT NULL,
        "deliveryFee"         numeric(10,2) NOT NULL DEFAULT 0,
        "discount"            numeric(10,2) NOT NULL DEFAULT 0,
        "grandTotal"          numeric(10,2) NOT NULL,
        "paymentMethod"       character varying NOT NULL,
        "status"              character varying NOT NULL DEFAULT 'PLACED',
        "deliveryAddress"     jsonb,
        "deliverySlot"        jsonb,
        "estimatedDeliveryAt" TIMESTAMP WITH TIME ZONE,
        "deliveredAt"         TIMESTAMP WITH TIME ZONE,
        "cancelReason"        text,
        "createdAt"           TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grocery_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_grocery_orders_number" UNIQUE ("orderNumber"),
        CONSTRAINT "CHK_grocery_orders_payment"
          CHECK ("paymentMethod" IN ('ONLINE', 'COD', 'WALLET')),
        CONSTRAINT "CHK_grocery_orders_status"
          CHECK ("status" IN ('PLACED','CONFIRMED','PACKING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','REFUNDED')),
        -- RESTRICT, not SET NULL: an order must always name the store that owes
        -- the customer their groceries, and \`storeId\` is NOT NULL, so the
        -- entity's SET NULL rule could only ever have failed at delete time.
        CONSTRAINT "FK_grocery_orders_store"
          FOREIGN KEY ("storeId") REFERENCES "grocery"."grocery_stores"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_orders_customer" ON "grocery"."grocery_orders" ("customerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_orders_store"    ON "grocery"."grocery_orders" ("storeId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_orders_status"   ON "grocery"."grocery_orders" ("status")`);
    // The admin order list and every report are ordered by recency.
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_orders_created"  ON "grocery"."grocery_orders" ("createdAt" DESC)`);

    // ── grocery.grocery_flash_deals ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grocery"."grocery_flash_deals" (
        "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
        "storeId"         uuid NOT NULL,
        "storeName"       character varying NOT NULL,
        "productId"       uuid NOT NULL,
        "productName"     character varying NOT NULL,
        "productEmoji"    character varying,
        "category"        character varying NOT NULL,
        "originalPrice"   numeric(10,2) NOT NULL,
        "flashPrice"      numeric(10,2) NOT NULL,
        "discountPercent" integer NOT NULL,
        "startTime"       TIMESTAMP NOT NULL,
        "endTime"         TIMESTAMP NOT NULL,
        "stockLimit"      integer NOT NULL DEFAULT 0,
        "soldCount"       integer NOT NULL DEFAULT 0,
        "status"          character varying NOT NULL DEFAULT 'draft',
        "submittedAt"     TIMESTAMP,
        "approvedAt"      TIMESTAMP,
        "rejectedReason"  character varying,
        "approvedBy"      character varying,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grocery_flash_deals" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_grocery_flash_deals_status"
          CHECK ("status" IN ('draft','pending','approved','active','paused','expired','rejected')),
        CONSTRAINT "CHK_grocery_flash_deals_window" CHECK ("endTime" > "startTime"),
        CONSTRAINT "FK_grocery_flash_deals_store"
          FOREIGN KEY ("storeId") REFERENCES "grocery"."grocery_stores"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_grocery_flash_deals_product"
          FOREIGN KEY ("productId") REFERENCES "grocery"."grocery_items"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_flash_deals_store"   ON "grocery"."grocery_flash_deals" ("storeId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_flash_deals_product" ON "grocery"."grocery_flash_deals" ("productId")`);
    // The admin moderation queue filters on status; it is the screen's only query.
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_flash_deals_status"  ON "grocery"."grocery_flash_deals" ("status")`);

    // ── grocery.grocery_reviews ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grocery"."grocery_reviews" (
        "id"                 uuid NOT NULL DEFAULT gen_random_uuid(),
        "productId"          uuid NOT NULL,
        "storeId"            uuid NOT NULL,
        "customerId"         character varying NOT NULL,
        "customerName"       character varying,
        "rating"             integer NOT NULL,
        "comment"            text,
        "isVerifiedPurchase" boolean NOT NULL DEFAULT false,
        "createdAt"          TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grocery_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_grocery_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5),
        -- The service refuses a second review from the same customer; the
        -- constraint makes that true under concurrency as well.
        CONSTRAINT "UQ_grocery_reviews_customer_product" UNIQUE ("customerId", "productId"),
        CONSTRAINT "FK_grocery_reviews_product"
          FOREIGN KEY ("productId") REFERENCES "grocery"."grocery_items"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_grocery_reviews_store"
          FOREIGN KEY ("storeId") REFERENCES "grocery"."grocery_stores"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_reviews_product"  ON "grocery"."grocery_reviews" ("productId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_reviews_store"    ON "grocery"."grocery_reviews" ("storeId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_reviews_customer" ON "grocery"."grocery_reviews" ("customerId")`);

    // ── grocery.grocery_wishlists ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grocery"."grocery_wishlists" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "customerId"  character varying NOT NULL,
        "productId"   uuid NOT NULL,
        "storeId"     uuid NOT NULL,
        "productName" character varying,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grocery_wishlists" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_grocery_wishlists_customer_product" UNIQUE ("customerId", "productId"),
        CONSTRAINT "FK_grocery_wishlists_product"
          FOREIGN KEY ("productId") REFERENCES "grocery"."grocery_items"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_wishlists_customer" ON "grocery"."grocery_wishlists" ("customerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_wishlists_product"  ON "grocery"."grocery_wishlists" ("productId")`);

    // ── grocery.grocery_delivery_zones ───────────────────────────────────────
    // New: the admin Delivery Zones screen and its two gateway commands existed,
    // and there was never a table under them.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grocery"."grocery_delivery_zones" (
        "id"             uuid NOT NULL DEFAULT gen_random_uuid(),
        "name"           character varying(128) NOT NULL,
        "region_code"    character varying(8),
        "city"           character varying(128),
        "pincodes"       text,
        "centerLat"      numeric(10,7),
        "centerLng"      numeric(10,7),
        "radiusKm"       numeric(5,2) NOT NULL DEFAULT 10,
        "deliveryFee"    numeric(10,2) NOT NULL DEFAULT 0,
        "minOrderAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "etaMinutes"     integer NOT NULL DEFAULT 45,
        "isActive"       boolean NOT NULL DEFAULT true,
        "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grocery_delivery_zones" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_zones_region" ON "grocery"."grocery_delivery_zones" ("region_code")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_grocery_zones_active" ON "grocery"."grocery_delivery_zones" ("isActive")`);

    // ── grocery.grocery_settings ─────────────────────────────────────────────
    // New: key/value so operations can add a policy without a migration. The
    // admin Settings screen wrote nowhere before this.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grocery"."grocery_settings" (
        "key"       character varying(64) NOT NULL,
        "value"     jsonb NOT NULL,
        "updatedBy" character varying(128),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grocery_settings" PRIMARY KEY ("key")
      )
    `);
  }

  /**
   * Drops only what this migration adds that is safe to drop.
   *
   * The seven core tables are NOT dropped: by the time anyone reverts this,
   * they hold real orders and real catalogue data, and a schema rollback must
   * not be the thing that deletes them. Reverting removes the two new tables
   * and the two new columns, which is what "undo this migration" means here.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "grocery"."grocery_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "grocery"."grocery_delivery_zones"`);
    await queryRunner.query(`ALTER TABLE "grocery"."grocery_items"  DROP COLUMN IF EXISTS "translations"`);
    await queryRunner.query(`ALTER TABLE "grocery"."grocery_stores" DROP COLUMN IF EXISTS "productCount"`);
  }
}
