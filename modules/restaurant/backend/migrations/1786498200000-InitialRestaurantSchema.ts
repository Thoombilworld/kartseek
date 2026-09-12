import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The restaurant module's schema, as its entities define it (IN3 / AUD2-003).
 *
 * Generated with `migration:generate` against an EMPTY scratch database, so it
 * is the whole schema rather than a diff against whatever `synchronize` had
 * built. Before this file the restaurant database had no way to be created except by
 * booting the service with auto-sync on and hoping; that is off by default in
 * every environment now (`src/restaurant-service.module.ts`), and this is the schema.
 *
 * ── It starts from nothing ─────────────────────────────────────────────────
 *
 * The first two statements are `CREATE SCHEMA IF NOT EXISTS "restaurant"` and
 * `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, because a dedicated module
 * database arrives with neither and every primary key below defaults to
 * `uuid_generate_v4()`. Nothing else in a deploy creates them: dev
 * `synchronize` used to create the schema, and IN3 turned that off. This works
 * only because the ledger lives in `public.restaurant_migrations` rather than inside
 * this schema — TypeORM builds the ledger before the first `up()` runs, so a
 * ledger in `restaurant` would need the schema that this line creates.
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
export class InitialRestaurantSchema1786498200000 implements MigrationInterface {
  name = 'InitialRestaurantSchema1786498200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The schema itself, and it has to be first. A dedicated module
    // database is created empty and nothing else in the deploy creates
    // this schema — dev `synchronize` used to, and IN3 turned that off.
    // The ledger is deliberately `public.restaurant_migrations` (see
    // data-source.ts), so TypeORM does not need this schema to exist
    // before this line runs.
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "restaurant"`);
    // Every table below defaults its primary key to uuid_generate_v4().
    // A plain postgres image does not ship this enabled.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."menu_items_dietarytype_enum" AS ENUM('VEG', 'NON_VEG', 'VEGAN', 'EGG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."menu_items_foodtype_enum" AS ENUM('APPETIZER', 'MAIN_COURSE', 'DESSERT', 'BEVERAGE', 'SIDE', 'COMBO', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."menu_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_id" uuid, "restaurantId" character varying NOT NULL, "name" character varying(255) NOT NULL, "slug" character varying(128), "description" text, "price" numeric(10,2) NOT NULL DEFAULT '0', "originalPrice" numeric(10,2), "taxPercent" numeric(5,2) NOT NULL DEFAULT '0', "dietaryType" "restaurant"."menu_items_dietarytype_enum" NOT NULL DEFAULT 'NON_VEG', "foodType" "restaurant"."menu_items_foodtype_enum" NOT NULL DEFAULT 'MAIN_COURSE', "allergens" text, "nutritionInfo" jsonb, "tags" text, "prepTime" integer NOT NULL DEFAULT '15', "imageUrl" character varying, "galleryUrls" jsonb, "customizations" jsonb, "sizeVariants" jsonb, "isAvailable" boolean NOT NULL DEFAULT true, "isPendingApproval" boolean NOT NULL DEFAULT false, "stockQuantity" integer, "maxQuantityPerOrder" integer NOT NULL DEFAULT '20', "availableHours" jsonb, "rating" numeric(3,1) NOT NULL DEFAULT '0', "ratingCount" integer NOT NULL DEFAULT '0', "orderCount" integer NOT NULL DEFAULT '0', "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_57e6188f929e5dc6919168620c8" PRIMARY KEY ("id")); COMMENT ON COLUMN "restaurant"."menu_items"."restaurantId" IS 'Denormalized for fast queries'; COMMENT ON COLUMN "restaurant"."menu_items"."originalPrice" IS 'Original price before discount'; COMMENT ON COLUMN "restaurant"."menu_items"."taxPercent" IS 'Tax percentage on this item'; COMMENT ON COLUMN "restaurant"."menu_items"."allergens" IS 'e.g. Gluten, Peanuts, Dairy'; COMMENT ON COLUMN "restaurant"."menu_items"."nutritionInfo" IS '{ calories, protein, carbs, fat }'; COMMENT ON COLUMN "restaurant"."menu_items"."tags" IS 'e.g. Bestseller, New, Chefs Special'; COMMENT ON COLUMN "restaurant"."menu_items"."prepTime" IS 'Preparation time in minutes'; COMMENT ON COLUMN "restaurant"."menu_items"."customizations" IS 'Add-on groups with options and pricing'; COMMENT ON COLUMN "restaurant"."menu_items"."sizeVariants" IS 'Size variants with different prices'; COMMENT ON COLUMN "restaurant"."menu_items"."isPendingApproval" IS 'Admin must approve menu changes'; COMMENT ON COLUMN "restaurant"."menu_items"."stockQuantity" IS 'Null = unlimited'; COMMENT ON COLUMN "restaurant"."menu_items"."maxQuantityPerOrder" IS 'Max qty per order'; COMMENT ON COLUMN "restaurant"."menu_items"."availableHours" IS 'Time-based availability'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_20cff56c44dd4fe52d5aa2b96f" ON "restaurant"."menu_items" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a8ff5699334d3ca7b07421af0a" ON "restaurant"."menu_items" ("restaurantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."menu_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "name" character varying(128) NOT NULL, "slug" character varying(128), "description" text, "imageUrl" character varying, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "availableHours" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_124ae987900336f983881cb04e6" PRIMARY KEY ("id")); COMMENT ON COLUMN "restaurant"."menu_categories"."sortOrder" IS 'Display ordering'; COMMENT ON COLUMN "restaurant"."menu_categories"."availableHours" IS 'Time-based visibility { startTime, endTime }'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a1650861201d802c0ad078fff8" ON "restaurant"."menu_categories" ("restaurant_id") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."restaurant_orders_ordertype_enum" AS ENUM('DELIVERY', 'TAKEAWAY', 'DINE_IN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."restaurant_orders_paymentmethod_enum" AS ENUM('ONLINE', 'COD', 'WALLET', 'CARD_ON_DELIVERY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."restaurant_orders_paymentstatus_enum" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."restaurant_orders_status_enum" AS ENUM('PLACED', 'RESTAURANT_ACCEPTED', 'RESTAURANT_REJECTED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CUSTOMER_PICKED_UP', 'SERVED', 'COMPLETED', 'CANCELLED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."restaurant_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderNumber" character varying NOT NULL, "restaurant_id" uuid NOT NULL, "customerId" character varying NOT NULL, "driverId" character varying, "orderType" "restaurant"."restaurant_orders_ordertype_enum" NOT NULL DEFAULT 'DELIVERY', "items" jsonb NOT NULL, "itemTotal" numeric(10,2) NOT NULL, "deliveryFee" numeric(10,2) NOT NULL DEFAULT '0', "packagingFee" numeric(10,2) NOT NULL DEFAULT '0', "platformFee" numeric(10,2) NOT NULL DEFAULT '0', "taxAmount" numeric(10,2) NOT NULL DEFAULT '0', "tip" numeric(10,2) NOT NULL DEFAULT '0', "discount" numeric(10,2) NOT NULL DEFAULT '0', "couponCode" character varying, "grandTotal" numeric(10,2) NOT NULL, "paymentMethod" "restaurant"."restaurant_orders_paymentmethod_enum" NOT NULL, "paymentStatus" "restaurant"."restaurant_orders_paymentstatus_enum" NOT NULL DEFAULT 'PENDING', "paymentTransactionId" character varying, "deliveryAddress" jsonb, "deliveryInstructions" text, "deliverySlot" jsonb, "deliveryOtp" character varying(6), "scheduledPickupAt" TIMESTAMP WITH TIME ZONE, "customerPhone" character varying(20), "tableId" character varying, "guestCount" integer, "status" "restaurant"."restaurant_orders_status_enum" NOT NULL DEFAULT 'PLACED', "cancelReason" text, "cancelledBy" character varying, "orderNotes" text, "acceptedAt" TIMESTAMP WITH TIME ZONE, "preparedAt" TIMESTAMP WITH TIME ZONE, "pickedUpAt" TIMESTAMP WITH TIME ZONE, "deliveredAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "estimatedDeliveryAt" TIMESTAMP WITH TIME ZONE, "idempotencyKey" character varying(36), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_07857e408d157736f3423c29d99" PRIMARY KEY ("id")); COMMENT ON COLUMN "restaurant"."restaurant_orders"."orderNumber" IS 'Human-readable order number e.g. RST-10042'; COMMENT ON COLUMN "restaurant"."restaurant_orders"."paymentTransactionId" IS 'Payment gateway transaction ID'; COMMENT ON COLUMN "restaurant"."restaurant_orders"."deliverySlot" IS '{ date, startTime, endTime } for scheduled'; COMMENT ON COLUMN "restaurant"."restaurant_orders"."deliveryOtp" IS 'OTP for delivery/pickup confirmation'; COMMENT ON COLUMN "restaurant"."restaurant_orders"."idempotencyKey" IS 'Idempotency key to prevent duplicate orders'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_693a1a6f94fa0f56c3dfb27192" ON "restaurant"."restaurant_orders" ("orderNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_418200ee146b3249f65c0fa829" ON "restaurant"."restaurant_orders" ("restaurant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0571f66c0b06af9678396478b7" ON "restaurant"."restaurant_orders" ("customerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."reservations_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'WAITLISTED', 'SEATED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingRef" character varying NOT NULL, "restaurant_id" uuid NOT NULL, "customerId" character varying NOT NULL, "customerName" character varying(255) NOT NULL, "customerPhone" character varying(20), "customerEmail" character varying(255), "date" date NOT NULL, "time" character varying(10) NOT NULL, "guests" integer NOT NULL, "tableId" character varying, "seatingPreference" character varying(50), "occasion" character varying(100), "specialRequests" text, "depositAmount" numeric(10,2) NOT NULL DEFAULT '0', "depositPaid" boolean NOT NULL DEFAULT false, "depositTransactionId" character varying, "status" "restaurant"."reservations_status_enum" NOT NULL DEFAULT 'PENDING', "cancellationReason" text, "cancelledBy" character varying, "confirmedAt" TIMESTAMP WITH TIME ZONE, "seatedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "reminderSent" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d78c840458c985a6b6da59af153" UNIQUE ("bookingRef"), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id")); COMMENT ON COLUMN "restaurant"."reservations"."bookingRef" IS 'Human-readable booking ref e.g. TBK-20263'; COMMENT ON COLUMN "restaurant"."reservations"."time" IS 'e.g. 19:30'; COMMENT ON COLUMN "restaurant"."reservations"."seatingPreference" IS 'e.g. indoor, outdoor, rooftop, private'; COMMENT ON COLUMN "restaurant"."reservations"."occasion" IS 'e.g. Birthday, Anniversary'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d78c840458c985a6b6da59af15" ON "restaurant"."reservations" ("bookingRef") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ee6b00404309108652a2307c66" ON "restaurant"."reservations" ("restaurant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_487ec4ed757eed0d34c7ddee79" ON "restaurant"."reservations" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."restaurant_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "customerId" character varying NOT NULL, "customerName" character varying(128) NOT NULL, "customerAvatar" character varying, "orderId" character varying, "rating" smallint NOT NULL, "comment" text, "photos" jsonb, "restaurantReply" text, "repliedAt" TIMESTAMP WITH TIME ZONE, "isFlagged" boolean NOT NULL DEFAULT false, "isVisible" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b8103daf77b1e7dfd2cfa3ba73a" PRIMARY KEY ("id")); COMMENT ON COLUMN "restaurant"."restaurant_reviews"."orderId" IS 'Links to the order being reviewed'; COMMENT ON COLUMN "restaurant"."restaurant_reviews"."rating" IS '1-5 star rating'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a1f816622fc3b59d1f2e752134" ON "restaurant"."restaurant_reviews" ("restaurant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_59fcdd4727e81af5ebea3740cb" ON "restaurant"."restaurant_reviews" ("customerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."restaurant_tables_status_enum" AS ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."restaurant_tables" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "tableNumber" character varying(20) NOT NULL, "capacity" integer NOT NULL, "area" character varying(50) NOT NULL DEFAULT 'main', "shape" character varying(50), "status" "restaurant"."restaurant_tables_status_enum" NOT NULL DEFAULT 'AVAILABLE', "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b4f4ef7ad8394abee2c1f4d57e" PRIMARY KEY ("id")); COMMENT ON COLUMN "restaurant"."restaurant_tables"."tableNumber" IS 'e.g. T-01, A5, Patio-3'; COMMENT ON COLUMN "restaurant"."restaurant_tables"."capacity" IS 'Maximum seating capacity'; COMMENT ON COLUMN "restaurant"."restaurant_tables"."area" IS 'e.g. main, rooftop, outdoor, private, patio'; COMMENT ON COLUMN "restaurant"."restaurant_tables"."shape" IS 'e.g. round, square, booth'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6e427d754031d04cc6cf557dbe" ON "restaurant"."restaurant_tables" ("restaurant_id") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."restaurant_promotions_type_enum" AS ENUM('PERCENTAGE', 'FLAT', 'FREE_DELIVERY', 'BUY_ONE_GET_ONE', 'COMBO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."restaurant_promotions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text, "code" character varying(50), "type" "restaurant"."restaurant_promotions_type_enum" NOT NULL DEFAULT 'PERCENTAGE', "discountValue" numeric(10,2) NOT NULL DEFAULT '0', "minOrderAmount" numeric(10,2) NOT NULL DEFAULT '0', "maxDiscount" numeric(10,2), "usageLimit" integer, "usedCount" integer NOT NULL DEFAULT '0', "perUserLimit" integer, "validFrom" TIMESTAMP WITH TIME ZONE NOT NULL, "validUntil" TIMESTAMP WITH TIME ZONE NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "applicableItemIds" text, "applicableOrderType" character varying(50), "platformFunded" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7736aac005dd3e4ae60df678a3d" PRIMARY KEY ("id")); COMMENT ON COLUMN "restaurant"."restaurant_promotions"."code" IS 'Coupon code e.g. FIRST20'; COMMENT ON COLUMN "restaurant"."restaurant_promotions"."discountValue" IS 'Discount value (% or flat)'; COMMENT ON COLUMN "restaurant"."restaurant_promotions"."minOrderAmount" IS 'Minimum order to qualify'; COMMENT ON COLUMN "restaurant"."restaurant_promotions"."maxDiscount" IS 'Cap on discount'; COMMENT ON COLUMN "restaurant"."restaurant_promotions"."usageLimit" IS 'Max total usages'; COMMENT ON COLUMN "restaurant"."restaurant_promotions"."perUserLimit" IS 'Max usages per customer'; COMMENT ON COLUMN "restaurant"."restaurant_promotions"."applicableItemIds" IS 'Restrict to specific menu item IDs'; COMMENT ON COLUMN "restaurant"."restaurant_promotions"."applicableOrderType" IS 'e.g. DELIVERY_ONLY, TAKEAWAY_ONLY'; COMMENT ON COLUMN "restaurant"."restaurant_promotions"."platformFunded" IS 'Platform-funded or restaurant-funded'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_974ea2c02122e8490b12533a70" ON "restaurant"."restaurant_promotions" ("restaurant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b316246cae8fd74481451590c5" ON "restaurant"."restaurant_promotions" ("code") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."restaurant_staff_role_enum" AS ENUM('OWNER', 'MANAGER', 'CHEF', 'KITCHEN_STAFF', 'WAITER', 'CASHIER', 'DELIVERY_COORDINATOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."restaurant_staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "userId" character varying NOT NULL, "name" character varying(128) NOT NULL, "email" character varying(255), "phone" character varying(20), "role" "restaurant"."restaurant_staff_role_enum" NOT NULL DEFAULT 'KITCHEN_STAFF', "permissions" jsonb, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6b47b2ff71d81e5d3c18117b228" PRIMARY KEY ("id")); COMMENT ON COLUMN "restaurant"."restaurant_staff"."userId" IS 'Links to Auth Service user'; COMMENT ON COLUMN "restaurant"."restaurant_staff"."permissions" IS 'Granular permissions e.g. { canManageMenu, canAcceptOrders, canViewReports }'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_14050e881d650b217075f1110c" ON "restaurant"."restaurant_staff" ("restaurant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0beeb075286d7c348c526b4a08" ON "restaurant"."restaurant_staff" ("userId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "restaurant"."restaurants_status_enum" AS ENUM('PENDING_KYC', 'PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'BLOCKED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."restaurants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(128) NOT NULL, "description" text, "translations" jsonb, "ownerId" character varying NOT NULL, "address" text NOT NULL, "city" character varying(100), "state" character varying(100), "pincode" character varying(20), "latitude" numeric(10,7) NOT NULL, "longitude" numeric(10,7) NOT NULL, "region_code" character varying(8), "zone_id" character varying, "cuisines" text NOT NULL, "tags" text, "logoUrl" character varying, "bannerUrl" character varying, "photos" jsonb, "phone" character varying(20), "email" character varying(255), "website" character varying(255), "openingHours" jsonb, "holidays" jsonb, "isOnline" boolean NOT NULL DEFAULT false, "isTemporarilyClosed" boolean NOT NULL DEFAULT false, "avgPrepTime" integer NOT NULL DEFAULT '30', "minOrderAmount" numeric(10,2) NOT NULL DEFAULT '0', "deliveryFee" numeric(10,2) NOT NULL DEFAULT '0', "deliveryRadius" numeric(5,2) NOT NULL DEFAULT '10', "packagingFee" numeric(10,2) NOT NULL DEFAULT '0', "costForTwo" integer NOT NULL DEFAULT '600', "deliveryEnabled" boolean NOT NULL DEFAULT true, "takeawayEnabled" boolean NOT NULL DEFAULT false, "dineInEnabled" boolean NOT NULL DEFAULT false, "tableBookingEnabled" boolean NOT NULL DEFAULT false, "rating" numeric(3,1) NOT NULL DEFAULT '0', "ratingCount" integer NOT NULL DEFAULT '0', "totalOrders" integer NOT NULL DEFAULT '0', "commissionRate" numeric(5,2) NOT NULL DEFAULT '15', "taxRate" numeric(5,2) NOT NULL DEFAULT '0', "bankDetails" jsonb, "kycDocuments" jsonb, "foodLicenseNumber" character varying, "foodLicenseExpiry" date, "status" "restaurant"."restaurants_status_enum" NOT NULL DEFAULT 'PENDING_KYC', "rejectionReason" text, "franchiseId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e2133a72eb1cc8f588f7b503e68" PRIMARY KEY ("id")); COMMENT ON COLUMN "restaurant"."restaurants"."translations" IS 'Localized name/description translations'; COMMENT ON COLUMN "restaurant"."restaurants"."ownerId" IS 'Links to Auth Service user (restaurant owner)'; COMMENT ON COLUMN "restaurant"."restaurants"."cuisines" IS 'e.g. Indian, Chinese, Italian'; COMMENT ON COLUMN "restaurant"."restaurants"."tags" IS 'e.g. Fine Dining, Casual, Fast Food'; COMMENT ON COLUMN "restaurant"."restaurants"."openingHours" IS '{ mon: { open: "10:00", close: "23:00" }, ... }'; COMMENT ON COLUMN "restaurant"."restaurants"."holidays" IS 'Array of ISO dates for holidays'; COMMENT ON COLUMN "restaurant"."restaurants"."avgPrepTime" IS 'Average preparation time in minutes'; COMMENT ON COLUMN "restaurant"."restaurants"."deliveryRadius" IS 'Delivery radius in km'; COMMENT ON COLUMN "restaurant"."restaurants"."packagingFee" IS 'Packaging fee per order'; COMMENT ON COLUMN "restaurant"."restaurants"."costForTwo" IS 'Cost for two persons in local currency'; COMMENT ON COLUMN "restaurant"."restaurants"."commissionRate" IS 'Platform commission percentage'; COMMENT ON COLUMN "restaurant"."restaurants"."taxRate" IS 'GST/VAT percentage'; COMMENT ON COLUMN "restaurant"."restaurants"."bankDetails" IS 'Bank details for settlements'; COMMENT ON COLUMN "restaurant"."restaurants"."foodLicenseNumber" IS 'Food license / FSSAI number'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_afb6330c019768b4c3f9a65303" ON "restaurant"."restaurants" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9519e81d388514ec631d23fefc" ON "restaurant"."restaurants" ("ownerId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "restaurant"."menu_items" ADD CONSTRAINT "FK_20cff56c44dd4fe52d5aa2b96f8" FOREIGN KEY ("category_id") REFERENCES "restaurant"."menu_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "restaurant"."menu_categories" ADD CONSTRAINT "FK_a1650861201d802c0ad078fff8e" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "restaurant"."restaurant_orders" ADD CONSTRAINT "FK_418200ee146b3249f65c0fa8292" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"."restaurants"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "restaurant"."reservations" ADD CONSTRAINT "FK_ee6b00404309108652a2307c66c" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "restaurant"."restaurant_reviews" ADD CONSTRAINT "FK_a1f816622fc3b59d1f2e7521347" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "restaurant"."restaurant_tables" ADD CONSTRAINT "FK_6e427d754031d04cc6cf557dbe9" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "restaurant"."restaurant_promotions" ADD CONSTRAINT "FK_974ea2c02122e8490b12533a70b" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "restaurant"."restaurant_staff" ADD CONSTRAINT "FK_14050e881d650b217075f1110c4" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"."restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "restaurant"."restaurant_staff" DROP CONSTRAINT "FK_14050e881d650b217075f1110c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant"."restaurant_promotions" DROP CONSTRAINT "FK_974ea2c02122e8490b12533a70b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant"."restaurant_tables" DROP CONSTRAINT "FK_6e427d754031d04cc6cf557dbe9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant"."restaurant_reviews" DROP CONSTRAINT "FK_a1f816622fc3b59d1f2e7521347"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant"."reservations" DROP CONSTRAINT "FK_ee6b00404309108652a2307c66c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant"."restaurant_orders" DROP CONSTRAINT "FK_418200ee146b3249f65c0fa8292"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant"."menu_categories" DROP CONSTRAINT "FK_a1650861201d802c0ad078fff8e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant"."menu_items" DROP CONSTRAINT "FK_20cff56c44dd4fe52d5aa2b96f8"`,
    );
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_9519e81d388514ec631d23fefc"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_afb6330c019768b4c3f9a65303"`);
    await queryRunner.query(`DROP TABLE "restaurant"."restaurants"`);
    await queryRunner.query(`DROP TYPE "restaurant"."restaurants_status_enum"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_0beeb075286d7c348c526b4a08"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_14050e881d650b217075f1110c"`);
    await queryRunner.query(`DROP TABLE "restaurant"."restaurant_staff"`);
    await queryRunner.query(`DROP TYPE "restaurant"."restaurant_staff_role_enum"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_b316246cae8fd74481451590c5"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_974ea2c02122e8490b12533a70"`);
    await queryRunner.query(`DROP TABLE "restaurant"."restaurant_promotions"`);
    await queryRunner.query(`DROP TYPE "restaurant"."restaurant_promotions_type_enum"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_6e427d754031d04cc6cf557dbe"`);
    await queryRunner.query(`DROP TABLE "restaurant"."restaurant_tables"`);
    await queryRunner.query(`DROP TYPE "restaurant"."restaurant_tables_status_enum"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_59fcdd4727e81af5ebea3740cb"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_a1f816622fc3b59d1f2e752134"`);
    await queryRunner.query(`DROP TABLE "restaurant"."restaurant_reviews"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_487ec4ed757eed0d34c7ddee79"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_ee6b00404309108652a2307c66"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_d78c840458c985a6b6da59af15"`);
    await queryRunner.query(`DROP TABLE "restaurant"."reservations"`);
    await queryRunner.query(`DROP TYPE "restaurant"."reservations_status_enum"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_0571f66c0b06af9678396478b7"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_418200ee146b3249f65c0fa829"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_693a1a6f94fa0f56c3dfb27192"`);
    await queryRunner.query(`DROP TABLE "restaurant"."restaurant_orders"`);
    await queryRunner.query(`DROP TYPE "restaurant"."restaurant_orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "restaurant"."restaurant_orders_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE "restaurant"."restaurant_orders_paymentmethod_enum"`);
    await queryRunner.query(`DROP TYPE "restaurant"."restaurant_orders_ordertype_enum"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_a1650861201d802c0ad078fff8"`);
    await queryRunner.query(`DROP TABLE "restaurant"."menu_categories"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_a8ff5699334d3ca7b07421af0a"`);
    await queryRunner.query(`DROP INDEX "restaurant"."IDX_20cff56c44dd4fe52d5aa2b96f"`);
    await queryRunner.query(`DROP TABLE "restaurant"."menu_items"`);
    await queryRunner.query(`DROP TYPE "restaurant"."menu_items_foodtype_enum"`);
    await queryRunner.query(`DROP TYPE "restaurant"."menu_items_dietarytype_enum"`);
    // The schema last, and only if nothing is left in it. RESTRICT
    // raises dependent_objects_still_exist when it still holds objects
    // this migration did not create — exactly the case where dropping it
    // would take somebody else's tables with it.
    await queryRunner.query(`DO $guard$ BEGIN
  DROP SCHEMA IF EXISTS "restaurant" RESTRICT;
EXCEPTION WHEN dependent_objects_still_exist THEN NULL;
END $guard$`);
  }
}
