import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The grocery module's schema, as its entities define it (IN3 / AUD2-003).
 *
 * Generated with `migration:generate` against an EMPTY scratch database, so it
 * is the whole schema rather than a diff against whatever `synchronize` had
 * built. Before this file the grocery database had no way to be created except by
 * booting the service with auto-sync on and hoping; that is off by default in
 * every environment now (`src/grocery-service.module.ts`), and this is the schema.
 *
 * ── Why every statement in up() is guarded ──────────────────────────────────
 *
 * The dev and staging databases already hold these tables — `synchronize` built
 * them, with no ledger row to say so. This migration has to be recordable
 * against those without dropping a single row, so `up()` is idempotent:
 * `CREATE TABLE` / `CREATE INDEX` carry `IF NOT EXISTS`, and the two statements
 * Postgres has no `IF NOT EXISTS` for — `CREATE TYPE` and
 * `ALTER TABLE … ADD CONSTRAINT` — run inside a DO block that swallows
 * `duplicate_object` and nothing else. An existing table is skipped whole,
 * its COMMENTs included, so a column that has drifted since cannot fail the
 * run. On an empty database every guard is a no-op and this builds the schema.
 *
 * ── down() ─────────────────────────────────────────────────────────────────
 *
 * The generated reverse: it DROPs every table up() creates. That is the honest
 * inverse of an initial schema, and it is what `npm run migration:revert` will
 * do to the module's whole database. Read the ledger before running it.
 */
export class InitialGrocerySchema1786498100000 implements MigrationInterface {
  name = 'InitialGrocerySchema1786498100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_categories" ("id" character varying(128) NOT NULL, "name" character varying(128) NOT NULL, "emoji" character varying(8), "gradient" character varying(64), "description" text, "imageUrl" character varying, "translations" jsonb, "level" character varying(16) NOT NULL DEFAULT 'category', "parentId" character varying, "countries" jsonb, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "productCount" integer NOT NULL DEFAULT '0', "subcategoryCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b03f112e4d3f816a1370f69a682" PRIMARY KEY ("id")); COMMENT ON COLUMN "grocery"."grocery_categories"."translations" IS 'Localized translations: { ar: { name, description }, ... }'; COMMENT ON COLUMN "grocery"."grocery_categories"."productCount" IS 'Denormalized product count for fast display'`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) DEFAULT '', "description" text, "category" character varying(64) DEFAULT '', "subCategory" character varying(64), "isAvailable" boolean NOT NULL DEFAULT true, "approvalStatus" character varying(16) NOT NULL DEFAULT 'APPROVED', "rejectionReason" text, "weightVariants" jsonb NOT NULL, "preparationPreferences" jsonb, "imageUrl" character varying, "sku" character varying(64), "brandId" uuid, "ingredients" text, "nutrition" jsonb, "allergens" jsonb, "storageInstructions" text, "expiryDate" date, "batchNumber" character varying(64), "complianceStatus" character varying(16) NOT NULL DEFAULT 'NOT_REQUIRED', "minOrderQuantity" integer NOT NULL DEFAULT '1', "maxOrderQuantity" integer, "ageRestriction" integer, "translations" jsonb, "brand" character varying(128), "barcode" character varying(64), "isPromoted" boolean NOT NULL DEFAULT false, "rating" numeric(3,1) NOT NULL DEFAULT '0', "reviewCount" integer NOT NULL DEFAULT '0', "searchVector" tsvector, "storeId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_acc88c7c1495a8c40e651025c33" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ab7be67fbea1e44e6615a76085" ON "grocery"."grocery_items" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bf1b3bfeb25cfbc7baed752ec6" ON "grocery"."grocery_items" ("subCategory") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_79ce5954c895c619efcf839391" ON "grocery"."grocery_items" ("approvalStatus") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ad292a43b926799e1c18160287" ON "grocery"."grocery_items" ("sku") WHERE "sku" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1fe13792a20bd84eb4e8188b42" ON "grocery"."grocery_items" ("brandId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9b42955994078cb7a4b47a09cd" ON "grocery"."grocery_items" ("searchVector") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b89dbf0bcfb41575a38a787a11" ON "grocery"."grocery_items" ("storeId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "grocery"."grocery_orders_paymentmethod_enum" AS ENUM('ONLINE', 'COD', 'WALLET');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "grocery"."grocery_orders_status_enum" AS ENUM('PLACED', 'CONFIRMED', 'PACKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderNumber" character varying NOT NULL, "customerId" character varying NOT NULL, "driverId" character varying, "storeId" uuid NOT NULL, "items" jsonb NOT NULL, "itemTotal" numeric(10,2) NOT NULL, "deliveryFee" numeric(10,2) NOT NULL DEFAULT '0', "discount" numeric(10,2) NOT NULL DEFAULT '0', "grandTotal" numeric(10,2) NOT NULL, "taxAmount" numeric(10,2) NOT NULL DEFAULT '0', "taxRate" numeric(5,2) NOT NULL DEFAULT '0', "taxName" character varying(32), "paymentMethod" "grocery"."grocery_orders_paymentmethod_enum" NOT NULL, "status" "grocery"."grocery_orders_status_enum" NOT NULL DEFAULT 'PLACED', "deliveryAddress" jsonb, "deliverySlot" jsonb, "estimatedDeliveryAt" TIMESTAMP WITH TIME ZONE, "deliveredAt" TIMESTAMP WITH TIME ZONE, "cancelReason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_218e44222e774add2265ae64093" UNIQUE ("orderNumber"), CONSTRAINT "PK_88140a3018690d705e3c54e95de" PRIMARY KEY ("id")); COMMENT ON COLUMN "grocery"."grocery_orders"."deliverySlot" IS '{ date, startTime, endTime } for scheduled deliveries'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_5be6377912d99fde53800d859d" ON "grocery"."grocery_orders" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_85c24370dd3448b0e0ba82a83d" ON "grocery"."grocery_orders" ("storeId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "grocery"."grocery_stores_status_enum" AS ENUM('PENDING_KYC', 'APPROVED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_stores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) DEFAULT '', "slug" character varying(128), "translations" jsonb, "ownerId" character varying DEFAULT '', "address" text, "latitude" numeric(10,7) DEFAULT '0', "longitude" numeric(10,7) DEFAULT '0', "storeTypes" text, "isOnline" boolean NOT NULL DEFAULT false, "isHyperlocalDeliveryAvailable" boolean NOT NULL DEFAULT true, "deliveryRadius" numeric(5,2) NOT NULL DEFAULT '10', "minOrderAmount" numeric(10,2) NOT NULL DEFAULT '0', "deliveryFee" numeric(10,2) NOT NULL DEFAULT '0', "openingHours" jsonb, "tags" text, "rating" numeric(3,1) NOT NULL DEFAULT '0', "totalOrders" integer NOT NULL DEFAULT '0', "productCount" integer NOT NULL DEFAULT '0', "isPromoted" boolean NOT NULL DEFAULT false, "logoUrl" character varying, "bannerUrl" character varying, "phone" character varying(20), "status" "grocery"."grocery_stores_status_enum" NOT NULL DEFAULT 'PENDING_KYC', "franchise_id" character varying, "region_code" character varying(8), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1de3704ee15a1c552d2c2664d63" UNIQUE ("slug"), CONSTRAINT "PK_181264afe6a00234d6436d107af" PRIMARY KEY ("id")); COMMENT ON COLUMN "grocery"."grocery_stores"."translations" IS 'Localized translations for store name and address'; COMMENT ON COLUMN "grocery"."grocery_stores"."deliveryRadius" IS 'Delivery radius in km'; COMMENT ON COLUMN "grocery"."grocery_stores"."minOrderAmount" IS 'Minimum order amount for delivery'; COMMENT ON COLUMN "grocery"."grocery_stores"."openingHours" IS '{ mon: { open: "06:00", close: "22:00" }, ... }'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_194a7eb221d6ed24593a2af864" ON "grocery"."grocery_stores" ("region_code") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "grocery"."grocery_flash_deals_status_enum" AS ENUM('draft', 'pending', 'approved', 'active', 'paused', 'expired', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_flash_deals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "storeId" uuid NOT NULL, "storeName" character varying NOT NULL, "productId" uuid NOT NULL, "productName" character varying NOT NULL, "productEmoji" character varying, "category" character varying NOT NULL, "originalPrice" numeric(10,2) NOT NULL, "flashPrice" numeric(10,2) NOT NULL, "discountPercent" integer NOT NULL, "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP NOT NULL, "stockLimit" integer NOT NULL DEFAULT '0', "soldCount" integer NOT NULL DEFAULT '0', "status" "grocery"."grocery_flash_deals_status_enum" NOT NULL DEFAULT 'draft', "submittedAt" TIMESTAMP, "approvedAt" TIMESTAMP, "rejectedReason" character varying, "approvedBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4ad63c707801482852d73e442bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_51486e83e8a288bea63dda26a3" ON "grocery"."grocery_flash_deals" ("storeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c9a8a916ee4241737286681808" ON "grocery"."grocery_flash_deals" ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_84427f5d32b8838f8045dbd9a4" ON "grocery"."grocery_flash_deals" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "storeId" uuid NOT NULL, "customerId" character varying NOT NULL, "customerName" character varying, "rating" integer NOT NULL, "comment" text, "isVerifiedPurchase" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f7f011658b6f0a441887572c878" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_70d788dea6f86a316d8214b061" ON "grocery"."grocery_reviews" ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_25d9e93d00142f71cc198836fa" ON "grocery"."grocery_reviews" ("storeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3ba8248d6b1a5aa86d8207940e" ON "grocery"."grocery_reviews" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_wishlists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerId" character varying NOT NULL, "productId" uuid NOT NULL, "storeId" uuid NOT NULL, "productName" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0f5c9c8208e6163fcc24ae89953" UNIQUE ("customerId", "productId"), CONSTRAINT "PK_927c062d93aef3a3c12a564b420" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_5a1d806d17cbe3cddf587281cc" ON "grocery"."grocery_wishlists" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ddc3c2af07b2033a5e34e77ca4" ON "grocery"."grocery_wishlists" ("productId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_delivery_zones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(128) NOT NULL, "region_code" character varying(8), "city" character varying(128), "pincodes" text, "centerLat" numeric(10,7), "centerLng" numeric(10,7), "radiusKm" numeric(5,2) NOT NULL DEFAULT '10', "deliveryFee" numeric(10,2) NOT NULL DEFAULT '0', "minOrderAmount" numeric(10,2) NOT NULL DEFAULT '0', "etaMinutes" integer NOT NULL DEFAULT '45', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5216d3cd27ec2021b637a774532" PRIMARY KEY ("id")); COMMENT ON COLUMN "grocery"."grocery_delivery_zones"."radiusKm" IS 'Radius in km from the zone centre'; COMMENT ON COLUMN "grocery"."grocery_delivery_zones"."etaMinutes" IS 'Promised delivery window in minutes'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c6467f5f2f70770b3b5b2018cd" ON "grocery"."grocery_delivery_zones" ("region_code") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_109d9553e0667d2cc37a52bf88" ON "grocery"."grocery_delivery_zones" ("isActive") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_settings" ("key" character varying(64) NOT NULL, "region_code" character varying(2) NOT NULL DEFAULT '*', "value" jsonb NOT NULL, "updatedBy" character varying(128), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_14e8e7abb55117ef0b09c1a2de0" PRIMARY KEY ("key", "region_code")); COMMENT ON COLUMN "grocery"."grocery_settings"."updatedBy" IS 'Admin user id of the last writer'`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_brands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying(160) NOT NULL, "name" character varying(160) NOT NULL, "logoUrl" character varying, "manufacturer" character varying(200), "description" text, "approvalStatus" character varying(16) NOT NULL DEFAULT 'PENDING', "rejectionReason" text, "requestedBySellerId" uuid, "countries" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7884536cea205137fa18ea54691" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_d57d38d3b34364685edff94733" ON "grocery"."grocery_brands" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ec9d0e8ed4ae01443de9bc097e" ON "grocery"."grocery_brands" ("approvalStatus") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_product_variants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "sku" character varying(64) NOT NULL, "barcode" character varying(32), "label" character varying(64) NOT NULL, "unitType" character varying(16), "unitValue" numeric(10,3), "mrp" numeric(12,2) NOT NULL DEFAULT '0', "price" numeric(12,2) NOT NULL DEFAULT '0', "stock" integer NOT NULL DEFAULT '0', "lowStockThreshold" integer NOT NULL DEFAULT '5', "imageUrl" character varying, "isDefault" boolean NOT NULL DEFAULT false, "isAvailable" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_27acf5e40a8dee950ab7fda071d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_819151d60caa79f649bd7509ea" ON "grocery"."grocery_product_variants" ("sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fdbfcc0f114feb909386d7e91e" ON "grocery"."grocery_product_variants" ("barcode") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_61d526c07d5d95e6af42e0dae4" ON "grocery"."grocery_product_variants" ("productId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "variantId" uuid NOT NULL, "productId" uuid NOT NULL, "storeId" uuid NOT NULL, "warehouseId" uuid, "type" character varying(16) NOT NULL, "quantity" integer NOT NULL, "stockAfter" integer NOT NULL, "batchNumber" character varying(64), "expiryDate" date, "reason" text, "actorId" uuid, "orderId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b38d16a99856a3e16775db56d8f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1e5af2312f260e13e1ebffeb8d" ON "grocery"."grocery_stock_movements" ("warehouseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b5d7be064bed815abc2a2fd057" ON "grocery"."grocery_stock_movements" ("batchNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3489ce97a362eb9803381f96a2" ON "grocery"."grocery_stock_movements" ("storeId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_87f28cce02422f33a935fc4e0a" ON "grocery"."grocery_stock_movements" ("variantId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_warehouses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "storeId" uuid NOT NULL, "name" character varying(160) NOT NULL, "code" character varying(32) NOT NULL, "type" character varying(16) NOT NULL DEFAULT 'WAREHOUSE', "address" text, "latitude" numeric(10,7), "longitude" numeric(10,7), "isDefault" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c2722f6463ee90825630ff00ced" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b58c595758c85e697f393e6817" ON "grocery"."grocery_warehouses" ("storeId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "grocery"."grocery_variant_stock" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "variantId" uuid NOT NULL, "warehouseId" uuid NOT NULL, "storeId" uuid NOT NULL, "stock" integer NOT NULL DEFAULT '0', "reserved" integer NOT NULL DEFAULT '0', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a870b2d8d42616d5ef5231aba24" UNIQUE ("variantId", "warehouseId"), CONSTRAINT "PK_9f7f84e3bdfb990cfe6eaa054b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f7b8784f9ba9c936872f6e9a93" ON "grocery"."grocery_variant_stock" ("warehouseId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_categories" ADD CONSTRAINT "FK_b226f72ed89a6e2d60ef90ab3aa" FOREIGN KEY ("parentId") REFERENCES "grocery"."grocery_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_items" ADD CONSTRAINT "FK_b89dbf0bcfb41575a38a787a110" FOREIGN KEY ("storeId") REFERENCES "grocery"."grocery_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_orders" ADD CONSTRAINT "FK_85c24370dd3448b0e0ba82a83de" FOREIGN KEY ("storeId") REFERENCES "grocery"."grocery_stores"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_flash_deals" ADD CONSTRAINT "FK_51486e83e8a288bea63dda26a3e" FOREIGN KEY ("storeId") REFERENCES "grocery"."grocery_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_flash_deals" ADD CONSTRAINT "FK_c9a8a916ee4241737286681808f" FOREIGN KEY ("productId") REFERENCES "grocery"."grocery_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_reviews" ADD CONSTRAINT "FK_70d788dea6f86a316d8214b0614" FOREIGN KEY ("productId") REFERENCES "grocery"."grocery_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_reviews" ADD CONSTRAINT "FK_25d9e93d00142f71cc198836fa6" FOREIGN KEY ("storeId") REFERENCES "grocery"."grocery_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_wishlists" ADD CONSTRAINT "FK_ddc3c2af07b2033a5e34e77ca46" FOREIGN KEY ("productId") REFERENCES "grocery"."grocery_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_wishlists" ADD CONSTRAINT "FK_78dd0193cab402601cf0225b1c0" FOREIGN KEY ("storeId") REFERENCES "grocery"."grocery_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "grocery"."grocery_product_variants" ADD CONSTRAINT "FK_61d526c07d5d95e6af42e0dae4c" FOREIGN KEY ("productId") REFERENCES "grocery"."grocery_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_product_variants" DROP CONSTRAINT "FK_61d526c07d5d95e6af42e0dae4c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_wishlists" DROP CONSTRAINT "FK_78dd0193cab402601cf0225b1c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_wishlists" DROP CONSTRAINT "FK_ddc3c2af07b2033a5e34e77ca46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_reviews" DROP CONSTRAINT "FK_25d9e93d00142f71cc198836fa6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_reviews" DROP CONSTRAINT "FK_70d788dea6f86a316d8214b0614"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_flash_deals" DROP CONSTRAINT "FK_c9a8a916ee4241737286681808f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_flash_deals" DROP CONSTRAINT "FK_51486e83e8a288bea63dda26a3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_orders" DROP CONSTRAINT "FK_85c24370dd3448b0e0ba82a83de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_items" DROP CONSTRAINT "FK_b89dbf0bcfb41575a38a787a110"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grocery"."grocery_categories" DROP CONSTRAINT "FK_b226f72ed89a6e2d60ef90ab3aa"`,
    );
    await queryRunner.query(`DROP INDEX "grocery"."IDX_f7b8784f9ba9c936872f6e9a93"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_variant_stock"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_b58c595758c85e697f393e6817"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_warehouses"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_87f28cce02422f33a935fc4e0a"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_3489ce97a362eb9803381f96a2"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_b5d7be064bed815abc2a2fd057"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_1e5af2312f260e13e1ebffeb8d"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_stock_movements"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_61d526c07d5d95e6af42e0dae4"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_fdbfcc0f114feb909386d7e91e"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_819151d60caa79f649bd7509ea"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_product_variants"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_ec9d0e8ed4ae01443de9bc097e"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_d57d38d3b34364685edff94733"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_brands"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_settings"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_109d9553e0667d2cc37a52bf88"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_c6467f5f2f70770b3b5b2018cd"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_delivery_zones"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_ddc3c2af07b2033a5e34e77ca4"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_5a1d806d17cbe3cddf587281cc"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_wishlists"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_3ba8248d6b1a5aa86d8207940e"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_25d9e93d00142f71cc198836fa"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_70d788dea6f86a316d8214b061"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_reviews"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_84427f5d32b8838f8045dbd9a4"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_c9a8a916ee4241737286681808"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_51486e83e8a288bea63dda26a3"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_flash_deals"`);
    await queryRunner.query(`DROP TYPE "grocery"."grocery_flash_deals_status_enum"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_194a7eb221d6ed24593a2af864"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_stores"`);
    await queryRunner.query(`DROP TYPE "grocery"."grocery_stores_status_enum"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_85c24370dd3448b0e0ba82a83d"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_5be6377912d99fde53800d859d"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_orders"`);
    await queryRunner.query(`DROP TYPE "grocery"."grocery_orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "grocery"."grocery_orders_paymentmethod_enum"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_b89dbf0bcfb41575a38a787a11"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_9b42955994078cb7a4b47a09cd"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_1fe13792a20bd84eb4e8188b42"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_ad292a43b926799e1c18160287"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_79ce5954c895c619efcf839391"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_bf1b3bfeb25cfbc7baed752ec6"`);
    await queryRunner.query(`DROP INDEX "grocery"."IDX_ab7be67fbea1e44e6615a76085"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_items"`);
    await queryRunner.query(`DROP TABLE "grocery"."grocery_categories"`);
  }
}
