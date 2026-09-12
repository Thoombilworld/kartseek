import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The pharmacy module's schema, as its entities define it (IN3 / AUD2-003).
 *
 * Generated with `migration:generate` against an EMPTY scratch database, so it
 * is the whole schema rather than a diff against whatever `synchronize` had
 * built. Before this file the pharmacy database had no way to be created except by
 * booting the service with auto-sync on and hoping; that is off by default in
 * every environment now (`src/pharmacy-service.module.ts`), and this is the schema.
 *
 * ── It starts from nothing ─────────────────────────────────────────────────
 *
 * The first two statements are `CREATE SCHEMA IF NOT EXISTS "pharmacy"` and
 * `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, because a dedicated module
 * database arrives with neither and every primary key below defaults to
 * `uuid_generate_v4()`. Nothing else in a deploy creates them: dev
 * `synchronize` used to create the schema, and IN3 turned that off. This works
 * only because the ledger lives in `public.pharmacy_migrations` rather than inside
 * this schema — TypeORM builds the ledger before the first `up()` runs, so a
 * ledger in `pharmacy` would need the schema that this line creates.
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
export class InitialPharmacySchema1786498300000 implements MigrationInterface {
  name = 'InitialPharmacySchema1786498300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The schema itself, and it has to be first. A dedicated module
    // database is created empty and nothing else in the deploy creates
    // this schema — dev `synchronize` used to, and IN3 turned that off.
    // The ledger is deliberately `public.pharmacy_migrations` (see
    // data-source.ts), so TypeORM does not need this schema to exist
    // before this line runs.
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "pharmacy"`);
    // Every table below defaults its primary key to uuid_generate_v4().
    // A plain postgres image does not ship this enabled.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "pharmacy"."pharmacy_items_dosageform_enum" AS ENUM('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'INHALER', 'POWDER', 'GEL', 'SPRAY', 'PATCH', 'SUPPOSITORY', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pharmacy"."pharmacy_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "store_id" uuid, "name" character varying(255) DEFAULT '', "slug" character varying(128), "genericName" character varying(255), "composition" text, "description" text, "manufacturer" character varying(128) DEFAULT '', "categoryId" character varying, "price" numeric(10,2) DEFAULT '0', "mrp" numeric(10,2), "taxPercent" numeric(5,2) NOT NULL DEFAULT '0', "dosageForm" "pharmacy"."pharmacy_items_dosageform_enum" NOT NULL DEFAULT 'TABLET', "strength" character varying(50), "packSize" character varying(100), "requiresPrescription" boolean NOT NULL DEFAULT false, "isScheduleHDrug" boolean NOT NULL DEFAULT false, "coldChainRequired" boolean NOT NULL DEFAULT false, "allergens" text, "sideEffects" text, "dosageInstructions" text, "tags" text, "barcode" character varying(20), "gtin" character varying(20), "sku" character varying(64), "imageUrl" character varying, "galleryUrls" jsonb, "isAvailable" boolean NOT NULL DEFAULT true, "stockLevel" integer NOT NULL DEFAULT '0', "reorderLevel" integer NOT NULL DEFAULT '10', "maxQuantityPerOrder" integer NOT NULL DEFAULT '10', "rating" numeric(3,1) NOT NULL DEFAULT '0', "ratingCount" integer NOT NULL DEFAULT '0', "orderCount" integer NOT NULL DEFAULT '0', "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fe187a752594e11bf1f0e7678a8" PRIMARY KEY ("id")); COMMENT ON COLUMN "pharmacy"."pharmacy_items"."genericName" IS 'Generic/salt name e.g. Paracetamol'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."composition" IS 'Full composition e.g. Paracetamol 500mg + Caffeine 50mg'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."categoryId" IS 'Category ID'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."mrp" IS 'Maximum Retail Price'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."taxPercent" IS 'Tax percentage'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."strength" IS 'e.g. 500mg, 250ml'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."packSize" IS 'e.g. Strip of 10 tablets, Bottle of 100ml'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."isScheduleHDrug" IS 'Schedule H / restricted drug'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."coldChainRequired" IS 'Requires cold-chain storage/delivery'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."allergens" IS 'e.g. Lactose, Gluten'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."tags" IS 'e.g. Bestseller, Generic, Organic'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."barcode" IS 'EAN-13 / EAN-8 / UPC-A barcode'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."gtin" IS 'Global Trade Item Number'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."sku" IS 'Manufacturer SKU / internal code'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."stockLevel" IS 'Current stock level'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."reorderLevel" IS 'Reorder alert threshold'; COMMENT ON COLUMN "pharmacy"."pharmacy_items"."maxQuantityPerOrder" IS 'Max qty per order'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3319243b86b749f5c75b0799c4" ON "pharmacy"."pharmacy_items" ("store_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6cd6505e80c440e9a175cf3515" ON "pharmacy"."pharmacy_items" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c0bdfe9173016a9cac9fdc001c" ON "pharmacy"."pharmacy_items" ("barcode") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "pharmacy"."pharmacy_orders_ordertype_enum" AS ENUM('DELIVERY', 'PICKUP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "pharmacy"."pharmacy_orders_paymentmethod_enum" AS ENUM('ONLINE', 'COD', 'WALLET', 'INSURANCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "pharmacy"."pharmacy_orders_paymentstatus_enum" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "pharmacy"."pharmacy_orders_status_enum" AS ENUM('PLACED', 'PRESCRIPTION_PENDING', 'PRESCRIPTION_VERIFIED', 'PRESCRIPTION_REJECTED', 'STORE_ACCEPTED', 'STORE_REJECTED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CUSTOMER_PICKED_UP', 'COMPLETED', 'CANCELLED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pharmacy"."pharmacy_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderNumber" character varying NOT NULL, "store_id" uuid NOT NULL, "customerId" character varying NOT NULL, "driverId" character varying, "orderType" "pharmacy"."pharmacy_orders_ordertype_enum" NOT NULL DEFAULT 'DELIVERY', "items" jsonb NOT NULL, "prescriptionId" character varying, "requiresPrescription" boolean NOT NULL DEFAULT false, "containsScheduleHDrugs" boolean NOT NULL DEFAULT false, "coldChainRequired" boolean NOT NULL DEFAULT false, "itemTotal" numeric(10,2) NOT NULL, "deliveryFee" numeric(10,2) NOT NULL DEFAULT '0', "packagingFee" numeric(10,2) NOT NULL DEFAULT '0', "platformFee" numeric(10,2) NOT NULL DEFAULT '0', "taxAmount" numeric(10,2) NOT NULL DEFAULT '0', "discount" numeric(10,2) NOT NULL DEFAULT '0', "couponCode" character varying, "grandTotal" numeric(10,2) NOT NULL, "paymentMethod" "pharmacy"."pharmacy_orders_paymentmethod_enum" NOT NULL, "paymentStatus" "pharmacy"."pharmacy_orders_paymentstatus_enum" NOT NULL DEFAULT 'PENDING', "paymentTransactionId" character varying, "insuranceClaimId" character varying, "deliveryAddress" jsonb, "deliveryInstructions" text, "deliveryOtp" character varying(6), "status" "pharmacy"."pharmacy_orders_status_enum" NOT NULL DEFAULT 'PLACED', "cancelReason" text, "cancelledBy" character varying, "orderNotes" text, "acceptedAt" TIMESTAMP WITH TIME ZONE, "preparedAt" TIMESTAMP WITH TIME ZONE, "pickedUpAt" TIMESTAMP WITH TIME ZONE, "deliveredAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "estimatedDeliveryAt" TIMESTAMP WITH TIME ZONE, "idempotencyKey" character varying(36), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_15fae3c8551bb068a15c94e3e6c" PRIMARY KEY ("id")); COMMENT ON COLUMN "pharmacy"."pharmacy_orders"."orderNumber" IS 'Human-readable order number e.g. PHM-10042'; COMMENT ON COLUMN "pharmacy"."pharmacy_orders"."prescriptionId" IS 'Links to prescription table'; COMMENT ON COLUMN "pharmacy"."pharmacy_orders"."requiresPrescription" IS 'Whether any item requires prescription'; COMMENT ON COLUMN "pharmacy"."pharmacy_orders"."containsScheduleHDrugs" IS 'Whether any item is Schedule H'; COMMENT ON COLUMN "pharmacy"."pharmacy_orders"."coldChainRequired" IS 'Whether any item needs cold-chain'; COMMENT ON COLUMN "pharmacy"."pharmacy_orders"."insuranceClaimId" IS 'Insurance provider claim ID'; COMMENT ON COLUMN "pharmacy"."pharmacy_orders"."deliveryOtp" IS 'OTP for delivery confirmation'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_4d5d44ae6f18775722a917029c" ON "pharmacy"."pharmacy_orders" ("orderNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_492508d5924403cccf31e3afc6" ON "pharmacy"."pharmacy_orders" ("store_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_2c9735ee8c309dc4b91f6d3445" ON "pharmacy"."pharmacy_orders" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pharmacy"."pharmacy_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "store_id" uuid NOT NULL, "customerId" character varying NOT NULL, "orderId" character varying, "customerName" character varying(128) NOT NULL DEFAULT 'Anonymous', "rating" integer NOT NULL, "comment" text, "photos" jsonb, "storeReply" text, "storeRepliedAt" TIMESTAMP WITH TIME ZONE, "isVisible" boolean NOT NULL DEFAULT true, "isFlagged" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_73b601d145ef902addc13f91ba5" PRIMARY KEY ("id")); COMMENT ON COLUMN "pharmacy"."pharmacy_reviews"."orderId" IS 'Links to pharmacy_orders'; COMMENT ON COLUMN "pharmacy"."pharmacy_reviews"."rating" IS 'Rating 1-5'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_720b81f44b99276de22b64b857" ON "pharmacy"."pharmacy_reviews" ("store_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f5d94b253db6b196a7130e7a40" ON "pharmacy"."pharmacy_reviews" ("customerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "pharmacy"."pharmacy_staff_role_enum" AS ENUM('PHARMACIST', 'MANAGER', 'CASHIER', 'DELIVERY_COORDINATOR', 'INVENTORY_MANAGER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pharmacy"."pharmacy_staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "store_id" uuid NOT NULL, "name" character varying(128) NOT NULL, "phone" character varying(20) NOT NULL, "email" character varying(255), "role" "pharmacy"."pharmacy_staff_role_enum" NOT NULL DEFAULT 'CASHIER', "registrationNumber" character varying, "isActive" boolean NOT NULL DEFAULT true, "photoUrl" character varying, "schedule" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e85e9c72c8e7fb824244de2ded6" PRIMARY KEY ("id")); COMMENT ON COLUMN "pharmacy"."pharmacy_staff"."registrationNumber" IS 'Pharmacist registration number (for PHARMACIST role)'; COMMENT ON COLUMN "pharmacy"."pharmacy_staff"."photoUrl" IS 'Avatar/photo URL'; COMMENT ON COLUMN "pharmacy"."pharmacy_staff"."schedule" IS 'Shift schedule'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9f4d3468a71ae874cc1fc0ce28" ON "pharmacy"."pharmacy_staff" ("store_id") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "pharmacy"."pharmacy_promotions_type_enum" AS ENUM('PERCENTAGE', 'FLAT', 'BUY_X_GET_Y', 'FREE_DELIVERY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pharmacy"."pharmacy_promotions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "store_id" uuid NOT NULL, "title" character varying(128) NOT NULL, "description" text, "code" character varying(32) NOT NULL, "type" "pharmacy"."pharmacy_promotions_type_enum" NOT NULL DEFAULT 'PERCENTAGE', "value" numeric(10,2) NOT NULL, "minOrderAmount" numeric(10,2) NOT NULL DEFAULT '0', "maxDiscountAmount" numeric(10,2), "maxUses" integer NOT NULL DEFAULT '0', "usedCount" integer NOT NULL DEFAULT '0', "usesPerCustomer" integer NOT NULL DEFAULT '1', "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "applicableCategories" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_12b99eac0f37ed6981fe16714ec" PRIMARY KEY ("id")); COMMENT ON COLUMN "pharmacy"."pharmacy_promotions"."value" IS 'Discount value (percent or flat amount)'; COMMENT ON COLUMN "pharmacy"."pharmacy_promotions"."minOrderAmount" IS 'Min order amount to apply'; COMMENT ON COLUMN "pharmacy"."pharmacy_promotions"."maxDiscountAmount" IS 'Max discount cap (for percentage type)'; COMMENT ON COLUMN "pharmacy"."pharmacy_promotions"."maxUses" IS 'Max uses across all customers; 0 = unlimited'; COMMENT ON COLUMN "pharmacy"."pharmacy_promotions"."usesPerCustomer" IS 'Per-customer usage limit'; COMMENT ON COLUMN "pharmacy"."pharmacy_promotions"."applicableCategories" IS 'Restrict to specific category IDs'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_302a192213cd2458e35258878b" ON "pharmacy"."pharmacy_promotions" ("store_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_c9c8d007f496b6455795c6a5ca" ON "pharmacy"."pharmacy_promotions" ("code") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "pharmacy"."pharmacy_stores_status_enum" AS ENUM('PENDING_KYC', 'PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'BLOCKED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pharmacy"."pharmacy_stores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(128) NOT NULL, "description" text, "ownerId" character varying NOT NULL, "address" text NOT NULL, "city" character varying(100), "state" character varying(100), "pincode" character varying(20), "latitude" numeric(10,7) NOT NULL, "longitude" numeric(10,7) NOT NULL, "region_code" character varying(8), "zone_id" character varying, "logoUrl" character varying, "bannerUrl" character varying, "photos" jsonb, "phone" character varying(20), "email" character varying(255), "website" character varying(255), "openingHours" jsonb, "is24hr" boolean NOT NULL DEFAULT false, "isOnline" boolean NOT NULL DEFAULT false, "isTemporarilyClosed" boolean NOT NULL DEFAULT true, "avgPrepTime" integer NOT NULL DEFAULT '20', "minOrderAmount" numeric(10,2) NOT NULL DEFAULT '0', "deliveryFee" numeric(10,2) NOT NULL DEFAULT '0', "deliveryRadius" numeric(5,2) NOT NULL DEFAULT '5', "deliveryEnabled" boolean NOT NULL DEFAULT true, "pickupEnabled" boolean NOT NULL DEFAULT false, "drugLicenseNumber" character varying, "drugLicenseExpiry" date, "pharmacistRegNumber" character varying, "pharmacistName" character varying(128), "canDispenseScheduleH" boolean NOT NULL DEFAULT false, "kycDocuments" jsonb, "rating" numeric(3,1) NOT NULL DEFAULT '0', "ratingCount" integer NOT NULL DEFAULT '0', "totalOrders" integer NOT NULL DEFAULT '0', "commissionRate" numeric(5,2) NOT NULL DEFAULT '12', "taxRate" numeric(5,2) NOT NULL DEFAULT '0', "bankDetails" jsonb, "status" "pharmacy"."pharmacy_stores_status_enum" NOT NULL DEFAULT 'PENDING_KYC', "rejectionReason" text, "franchiseId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ec3b5c6ca9e06a6bdeb232bad85" PRIMARY KEY ("id")); COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."ownerId" IS 'Links to Auth Service user (pharmacy owner)'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."openingHours" IS '{ mon: { open: "08:00", close: "22:00" }, ... }'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."is24hr" IS '24-hour pharmacy'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."avgPrepTime" IS 'Average preparation time in minutes'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."deliveryRadius" IS 'Delivery radius in km'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."drugLicenseNumber" IS 'Drug license number (e.g. DL-20B-KEN-12345)'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."pharmacistRegNumber" IS 'Pharmacist registration number'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."pharmacistName" IS 'Licensed pharmacist on duty'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."canDispenseScheduleH" IS 'Can dispense Schedule H drugs'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."commissionRate" IS 'Platform commission percentage'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."taxRate" IS 'GST/VAT percentage'; COMMENT ON COLUMN "pharmacy"."pharmacy_stores"."bankDetails" IS 'Bank details for settlements'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_b8d8455e73b0d457c6168563d8" ON "pharmacy"."pharmacy_stores" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_09ef6b44393a45a257fb478663" ON "pharmacy"."pharmacy_stores" ("ownerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pharmacy"."pharmacy_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(128) NOT NULL, "slug" character varying(128) NOT NULL, "description" text, "imageUrl" character varying, "emoji" character varying(10), "parentId" character varying, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "requiresPrescription" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_497596e12f0e900be0585c5d381" PRIMARY KEY ("id")); COMMENT ON COLUMN "pharmacy"."pharmacy_categories"."emoji" IS 'Emoji icon for UI display'; COMMENT ON COLUMN "pharmacy"."pharmacy_categories"."parentId" IS 'Parent category ID for nesting'; COMMENT ON COLUMN "pharmacy"."pharmacy_categories"."sortOrder" IS 'Display ordering'; COMMENT ON COLUMN "pharmacy"."pharmacy_categories"."requiresPrescription" IS 'Whether items in this category require a prescription'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_e2722bad14fa4cf54654a0687e" ON "pharmacy"."pharmacy_categories" ("slug") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "pharmacy"."prescriptions_status_enum" AS ENUM('PENDING_VERIFICATION', 'VERIFIED_APPROVED', 'REJECTED_INVALID', 'REJECTED_EXPIRED', 'REJECTED_UNREADABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pharmacy"."prescriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerId" character varying NOT NULL, "orderId" character varying, "storeId" character varying, "patientName" character varying(255) NOT NULL, "patientAge" integer, "fileUrl" text NOT NULL, "extractedMedicines" jsonb, "containsScheduleHDrugs" boolean NOT NULL DEFAULT false, "doctorName" text, "hospitalName" text, "prescriptionDate" date, "status" "pharmacy"."prescriptions_status_enum" NOT NULL DEFAULT 'PENDING_VERIFICATION', "verifiedByAdminId" character varying, "verifiedAt" TIMESTAMP WITH TIME ZONE, "rejectionReason" text, "pharmacistNotes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_097b2cc2f2b7e56825468188503" PRIMARY KEY ("id")); COMMENT ON COLUMN "pharmacy"."prescriptions"."orderId" IS 'Links to PharmacyOrder if order-attached'; COMMENT ON COLUMN "pharmacy"."prescriptions"."storeId" IS 'Target pharmacy store'; COMMENT ON COLUMN "pharmacy"."prescriptions"."fileUrl" IS 'S3/GCP Storage URL of the prescription image/PDF'; COMMENT ON COLUMN "pharmacy"."prescriptions"."extractedMedicines" IS 'Medicines detected by OCR or manual entry'; COMMENT ON COLUMN "pharmacy"."prescriptions"."doctorName" IS 'Doctor name if readable'; COMMENT ON COLUMN "pharmacy"."prescriptions"."hospitalName" IS 'Hospital/clinic name'; COMMENT ON COLUMN "pharmacy"."prescriptions"."prescriptionDate" IS 'Date on the prescription'; COMMENT ON COLUMN "pharmacy"."prescriptions"."verifiedByAdminId" IS 'Pharmacist/admin who verified'; COMMENT ON COLUMN "pharmacy"."prescriptions"."pharmacistNotes" IS 'Pharmacist notes'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_32612701e76be10cc0a1e1fe2b" ON "pharmacy"."prescriptions" ("customerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "pharmacy"."pharmacy_items" ADD CONSTRAINT "FK_3319243b86b749f5c75b0799c4a" FOREIGN KEY ("store_id") REFERENCES "pharmacy"."pharmacy_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "pharmacy"."pharmacy_orders" ADD CONSTRAINT "FK_492508d5924403cccf31e3afc6a" FOREIGN KEY ("store_id") REFERENCES "pharmacy"."pharmacy_stores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "pharmacy"."pharmacy_reviews" ADD CONSTRAINT "FK_720b81f44b99276de22b64b857a" FOREIGN KEY ("store_id") REFERENCES "pharmacy"."pharmacy_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "pharmacy"."pharmacy_staff" ADD CONSTRAINT "FK_9f4d3468a71ae874cc1fc0ce289" FOREIGN KEY ("store_id") REFERENCES "pharmacy"."pharmacy_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "pharmacy"."pharmacy_promotions" ADD CONSTRAINT "FK_302a192213cd2458e35258878bc" FOREIGN KEY ("store_id") REFERENCES "pharmacy"."pharmacy_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pharmacy"."pharmacy_promotions" DROP CONSTRAINT "FK_302a192213cd2458e35258878bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pharmacy"."pharmacy_staff" DROP CONSTRAINT "FK_9f4d3468a71ae874cc1fc0ce289"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pharmacy"."pharmacy_reviews" DROP CONSTRAINT "FK_720b81f44b99276de22b64b857a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pharmacy"."pharmacy_orders" DROP CONSTRAINT "FK_492508d5924403cccf31e3afc6a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pharmacy"."pharmacy_items" DROP CONSTRAINT "FK_3319243b86b749f5c75b0799c4a"`,
    );
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_32612701e76be10cc0a1e1fe2b"`);
    await queryRunner.query(`DROP TABLE "pharmacy"."prescriptions"`);
    await queryRunner.query(`DROP TYPE "pharmacy"."prescriptions_status_enum"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_e2722bad14fa4cf54654a0687e"`);
    await queryRunner.query(`DROP TABLE "pharmacy"."pharmacy_categories"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_09ef6b44393a45a257fb478663"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_b8d8455e73b0d457c6168563d8"`);
    await queryRunner.query(`DROP TABLE "pharmacy"."pharmacy_stores"`);
    await queryRunner.query(`DROP TYPE "pharmacy"."pharmacy_stores_status_enum"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_c9c8d007f496b6455795c6a5ca"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_302a192213cd2458e35258878b"`);
    await queryRunner.query(`DROP TABLE "pharmacy"."pharmacy_promotions"`);
    await queryRunner.query(`DROP TYPE "pharmacy"."pharmacy_promotions_type_enum"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_9f4d3468a71ae874cc1fc0ce28"`);
    await queryRunner.query(`DROP TABLE "pharmacy"."pharmacy_staff"`);
    await queryRunner.query(`DROP TYPE "pharmacy"."pharmacy_staff_role_enum"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_f5d94b253db6b196a7130e7a40"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_720b81f44b99276de22b64b857"`);
    await queryRunner.query(`DROP TABLE "pharmacy"."pharmacy_reviews"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_2c9735ee8c309dc4b91f6d3445"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_492508d5924403cccf31e3afc6"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_4d5d44ae6f18775722a917029c"`);
    await queryRunner.query(`DROP TABLE "pharmacy"."pharmacy_orders"`);
    await queryRunner.query(`DROP TYPE "pharmacy"."pharmacy_orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "pharmacy"."pharmacy_orders_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE "pharmacy"."pharmacy_orders_paymentmethod_enum"`);
    await queryRunner.query(`DROP TYPE "pharmacy"."pharmacy_orders_ordertype_enum"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_c0bdfe9173016a9cac9fdc001c"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_6cd6505e80c440e9a175cf3515"`);
    await queryRunner.query(`DROP INDEX "pharmacy"."IDX_3319243b86b749f5c75b0799c4"`);
    await queryRunner.query(`DROP TABLE "pharmacy"."pharmacy_items"`);
    await queryRunner.query(`DROP TYPE "pharmacy"."pharmacy_items_dosageform_enum"`);
    // The schema last, and only if nothing is left in it. RESTRICT
    // raises dependent_objects_still_exist when it still holds objects
    // this migration did not create — exactly the case where dropping it
    // would take somebody else's tables with it.
    await queryRunner.query(`DO $guard$ BEGIN
  DROP SCHEMA IF EXISTS "pharmacy" RESTRICT;
EXCEPTION WHEN dependent_objects_still_exist THEN NULL;
END $guard$`);
  }
}
