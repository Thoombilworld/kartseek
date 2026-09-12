import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The marketplace module's schema, as its entities define it (IN3 / AUD2-003).
 *
 * Generated with `migration:generate` against an EMPTY scratch database, so it
 * is the whole schema rather than a diff against whatever `synchronize` had
 * built. Before this file the marketplace database had no way to be created except by
 * booting the service with auto-sync on and hoping; that is off by default in
 * every environment now (`src/marketplace-service.module.ts`), and this is the schema.
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
export class InitialMarketplaceSchema1786498000000 implements MigrationInterface {
  name = 'InitialMarketplaceSchema1786498000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "translations" jsonb, "icon" character varying, "image" character varying, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "seo_title" character varying, "seo_description" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "parent_id" uuid, CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."categories"."translations" IS 'Localized translations for category name and SEO metadata'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_88cea2dc9c31951d06437879b4" ON "marketplace"."categories" ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."brands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "logoUrl" character varying, "isVerified" boolean NOT NULL DEFAULT false, "description" text, "bannerUrl" character varying, "followerCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b15428f362be2200922952dc268" UNIQUE ("slug"), CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."product_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying NOT NULL, "altText" character varying, "sortOrder" integer NOT NULL DEFAULT '0', "isPrimary" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid, CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."product_images"."sortOrder" IS 'Display order — lower is first'; COMMENT ON COLUMN "marketplace"."product_images"."isPrimary" IS 'True if this is the primary display image'`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."sellers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessName" character varying NOT NULL, "storeSlug" character varying NOT NULL, "ownerName" character varying, "email" character varying, "phone" character varying, "description" text, "logoUrl" character varying, "bannerUrl" character varying, "gstNumber" character varying, "panNumber" character varying, "bankAccountNumber" character varying, "bankIfscCode" character varying, "bankAccountName" character varying, "address" jsonb, "kycDocuments" jsonb, "kycStatus" character varying NOT NULL DEFAULT 'PENDING', "verificationStatus" character varying NOT NULL DEFAULT 'PENDING', "isActive" boolean NOT NULL DEFAULT true, "sellerRating" double precision NOT NULL DEFAULT '0', "totalReviews" integer NOT NULL DEFAULT '0', "totalProducts" integer NOT NULL DEFAULT '0', "totalOrders" integer NOT NULL DEFAULT '0', "commissionRate" numeric(5,2), "approvedBy" character varying, "approvedAt" TIMESTAMP, "rejectionReason" text, "owner_id" uuid, "franchise_id" character varying, "region_code" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_47613866d7514bed74cc89ed61c" UNIQUE ("storeSlug"), CONSTRAINT "UQ_60a049dd3231ed458dccfdaf406" UNIQUE ("email"), CONSTRAINT "PK_97337ccbf692c58e6c7682de8a2" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."sellers"."gstNumber" IS 'GST registration number (India) or equivalent VAT ID'; COMMENT ON COLUMN "marketplace"."sellers"."panNumber" IS 'PAN card number (India) or equivalent tax ID'; COMMENT ON COLUMN "marketplace"."sellers"."bankAccountNumber" IS 'Encrypted bank account number for payout settlement'; COMMENT ON COLUMN "marketplace"."sellers"."bankIfscCode" IS 'IFSC code (India) or SWIFT/sort code'; COMMENT ON COLUMN "marketplace"."sellers"."address" IS 'Business address: { line1, line2, city, state, postalCode, country }'; COMMENT ON COLUMN "marketplace"."sellers"."kycDocuments" IS 'Array of uploaded KYC documents: [{ type, url, uploadedAt, status }]'; COMMENT ON COLUMN "marketplace"."sellers"."kycStatus" IS 'Overall KYC status: PENDING, VERIFIED, REJECTED'; COMMENT ON COLUMN "marketplace"."sellers"."commissionRate" IS 'Seller-specific commission override. Null = use category/global default.'; COMMENT ON COLUMN "marketplace"."sellers"."approvedBy" IS 'Admin user ID who approved/rejected this seller'; COMMENT ON COLUMN "marketplace"."sellers"."rejectionReason" IS 'Reason for rejection or suspension'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0c5222cb42708b327ae2f764a6" ON "marketplace"."sellers" ("owner_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_096f7d73aec4d1954817529b5d" ON "marketplace"."sellers" ("region_code") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_90c322f4cf3a43b2914c38f1cb" ON "marketplace"."sellers" ("verificationStatus") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."product_listings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sellerSku" character varying NOT NULL, "sellingPrice" numeric(10,2) NOT NULL, "mrp" numeric(10,2), "stockQuantity" integer NOT NULL DEFAULT '0', "condition" character varying NOT NULL DEFAULT 'NEW', "isBuyBoxWinner" boolean NOT NULL DEFAULT false, "isFulfilledByKartseek" boolean NOT NULL DEFAULT false, "approvalStatus" character varying NOT NULL DEFAULT 'PENDING', "rejectionReason" text, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid, "seller_id" uuid, CONSTRAINT "PK_a498461cf2a1fc4dd56fa38a788" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b4b7d5a99faff94c738309f849" ON "marketplace"."product_listings" ("approvalStatus") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_f7b95b6411f343d3437cd1b0dc" ON "marketplace"."product_listings" ("seller_id", "sellerSku") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_a076633eac641807d67cc678ab" ON "marketplace"."product_listings" ("product_id", "seller_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "globalTradeItemNumber" character varying NOT NULL, "name" character varying NOT NULL, "slug" character varying NOT NULL, "short_description" text, "long_description" text, "translations" jsonb, "seller_id" uuid, "mrp" numeric(10,2), "averageRating" double precision NOT NULL DEFAULT '0', "reviewCount" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'ACTIVE', "approval_status" character varying NOT NULL DEFAULT 'PENDING', "is_active" boolean NOT NULL DEFAULT true, "is_featured" boolean NOT NULL DEFAULT false, "hsnCode" character varying, "gstBracket" numeric(5,2), "isPanIndia" boolean NOT NULL DEFAULT true, "availablePincodes" text, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "brand_id" uuid, "category_id" uuid, "subcategory_id" uuid, CONSTRAINT "UQ_0273017a327b59b816c46991d6f" UNIQUE ("globalTradeItemNumber"), CONSTRAINT "UQ_464f927ae360106b783ed0b4106" UNIQUE ("slug"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."products"."translations" IS 'Stores localized translations for dynamic fields like name and descriptions. Format: { "ar": { "name": "تفاحة", "short_description": "..." } }'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9933b23d18e7d8221b60da6581" ON "marketplace"."products" ("averageRating", "reviewCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_995d8194c43edfc98838cabc5a" ON "marketplace"."products" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_425ee27c69d6b8adc5d6475dcf" ON "marketplace"."products" ("seller_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1530a6f15d3c79d1b70be98f2b" ON "marketplace"."products" ("brand_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c9de3a8edea9269ca774c919b9" ON "marketplace"."products" ("subcategory_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9a5f6868c96e0069e699f33e12" ON "marketplace"."products" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bfb1984231c2358e13f4494290" ON "marketplace"."products" ("is_featured", "is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_36ae5a041bdec3149c247bff6c" ON "marketplace"."products" ("is_active", "approval_status") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."bank_offers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying DEFAULT '', "description" text, "bankName" character varying DEFAULT '', "cardType" character varying NOT NULL DEFAULT 'ALL', "cardNetwork" character varying NOT NULL DEFAULT 'ALL', "discountType" character varying NOT NULL DEFAULT 'PERCENTAGE', "discountValue" numeric(10,2) DEFAULT '0', "maxDiscount" numeric(10,2), "minOrderValue" numeric(10,2) NOT NULL DEFAULT '0', "logoUrl" character varying, "termsAndConditions" text, "applicableCategories" text, "applicableCountries" text, "totalUsageLimit" integer, "perUserLimit" integer, "usageCount" integer NOT NULL DEFAULT '0', "startsAt" TIMESTAMP NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "priority" integer NOT NULL DEFAULT '100', "status" character varying NOT NULL DEFAULT 'ACTIVE', "isFeatured" boolean NOT NULL DEFAULT false, "region_code" character varying, "is_global" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_55689b9ac06a632adff8078a22e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."exchange_offers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying DEFAULT '', "description" text, "exchangeCategory" character varying DEFAULT '', "targetCategory" character varying DEFAULT '', "maxExchangeValue" numeric(10,2) DEFAULT '0', "minExchangeValue" numeric(10,2) NOT NULL DEFAULT '0', "bonusAmount" numeric(10,2) NOT NULL DEFAULT '0', "eligibilityCriteria" jsonb, "applicableProductIds" text, "applicableBrandIds" text, "applicableCountries" text, "region_code" character varying(2), "is_global" boolean NOT NULL DEFAULT false, "iconUrl" character varying, "fulfillmentMode" character varying NOT NULL DEFAULT 'PICKUP', "startsAt" TIMESTAMP NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "priority" integer NOT NULL DEFAULT '100', "status" character varying NOT NULL DEFAULT 'ACTIVE', "isFeatured" boolean NOT NULL DEFAULT false, "totalExchanges" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f51e07423eb2c1bf7dc67c354e6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "customer_id" character varying NOT NULL, "customerName" character varying, "rating" smallint NOT NULL, "title" character varying, "comment" text, "imageUrls" text, "isVerifiedPurchase" boolean NOT NULL DEFAULT true, "helpfulCount" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'PUBLISHED', "seller_reply" character varying, "seller_replied_at" TIMESTAMP, "deleted_at" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."reviews"."rating" IS 'Rating 1-5'; COMMENT ON COLUMN "marketplace"."reviews"."imageUrls" IS 'URLs to review images'; COMMENT ON COLUMN "marketplace"."reviews"."helpfulCount" IS 'Number of "helpful" votes'; COMMENT ON COLUMN "marketplace"."reviews"."status" IS 'PUBLISHED, HIDDEN, FLAGGED, PENDING'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_aa17633b6f91f0856429b1ed0e" ON "marketplace"."reviews" ("product_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_d9d121b1dbee65897a7d6ed29c" ON "marketplace"."reviews" ("product_id", "customer_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."wishlists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" character varying NOT NULL, "product_id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d0a37f2848c5d268d315325f359" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_66291670c9d1443777a62c16c6" ON "marketplace"."wishlists" ("customer_id", "product_id") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."marketplace_orders_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."marketplace_orders_paymentmethod_enum" AS ENUM('ONLINE', 'COD', 'WALLET', 'UPI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."marketplace_orders_paymentstatus_enum" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."marketplace_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderNumber" character varying NOT NULL, "customer_id" character varying NOT NULL, "customerName" character varying, "seller_id" uuid NOT NULL, "items" jsonb NOT NULL, "itemTotal" numeric(12,2) NOT NULL, "deliveryFee" numeric(10,2) NOT NULL DEFAULT '0', "taxAmount" numeric(10,2) NOT NULL DEFAULT '0', "discountAmount" numeric(10,2) NOT NULL DEFAULT '0', "grandTotal" numeric(12,2) NOT NULL, "status" "marketplace"."marketplace_orders_status_enum" NOT NULL DEFAULT 'PENDING', "paymentMethod" "marketplace"."marketplace_orders_paymentmethod_enum" NOT NULL DEFAULT 'ONLINE', "paymentStatus" "marketplace"."marketplace_orders_paymentstatus_enum" NOT NULL DEFAULT 'PENDING', "shippingAddress" jsonb, "trackingId" character varying, "courierName" character varying, "franchise_id" character varying, "region_code" character varying, "cancellationReason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bace06905a16f5c45572b5c7b3b" UNIQUE ("orderNumber"), CONSTRAINT "PK_357fa54c892b12b528e30d2b550" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."marketplace_orders"."items" IS 'Snapshot of ordered items with prices at time of purchase'; COMMENT ON COLUMN "marketplace"."marketplace_orders"."shippingAddress" IS 'Delivery address snapshot'; COMMENT ON COLUMN "marketplace"."marketplace_orders"."cancellationReason" IS 'Cancellation/return reason'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d0e3617db05afdfb359f67b96d" ON "marketplace"."marketplace_orders" ("customer_id", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e2d6bc1aa0471ba4322290a970" ON "marketplace"."marketplace_orders" ("seller_id", "status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."return_requests_reason_enum" AS ENUM('WRONG_ITEM', 'DEFECTIVE', 'DAMAGED_IN_TRANSIT', 'NOT_AS_DESCRIBED', 'SIZE_FIT_ISSUE', 'QUALITY_ISSUE', 'LATE_DELIVERY', 'CHANGED_MIND', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."return_requests_status_enum" AS ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'RECEIVED', 'QC_PASSED', 'QC_FAILED', 'REFUNDED', 'REPLACEMENT_SHIPPED', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."return_requests_resolutiontype_enum" AS ENUM('REFUND', 'REPLACEMENT', 'STORE_CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."return_requests_qccondition_enum" AS ENUM('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."return_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "returnNumber" character varying NOT NULL, "order_id" uuid NOT NULL, "customer_id" character varying NOT NULL, "customerName" character varying, "seller_id" uuid NOT NULL, "items" jsonb NOT NULL, "reason" "marketplace"."return_requests_reason_enum" NOT NULL, "reasonDetail" text, "status" "marketplace"."return_requests_status_enum" NOT NULL DEFAULT 'REQUESTED', "resolutionType" "marketplace"."return_requests_resolutiontype_enum" NOT NULL DEFAULT 'REFUND', "refundAmount" numeric(12,2) NOT NULL, "photoUrls" text, "pickupPhotoUrls" text, "pickupAddress" jsonb, "pickupPartnerId" character varying, "pickupScheduledAt" TIMESTAMP, "pickedUpAt" TIMESTAMP, "receivedAt" TIMESTAMP, "refundedAt" TIMESTAMP, "qcCondition" "marketplace"."return_requests_qccondition_enum", "qcNotes" text, "rejectionReason" character varying, "franchise_id" character varying, "region_code" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8d1465de2891c8f0a50b5a5f465" UNIQUE ("returnNumber"), CONSTRAINT "PK_38714de8942bd9bc3a450a06889" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."return_requests"."returnNumber" IS 'Human-readable return ID, e.g. RET-2026-1089'; COMMENT ON COLUMN "marketplace"."return_requests"."items" IS 'Items being returned with quantities'; COMMENT ON COLUMN "marketplace"."return_requests"."reason" IS 'Standardized return reason'; COMMENT ON COLUMN "marketplace"."return_requests"."reasonDetail" IS 'Free-text customer explanation'; COMMENT ON COLUMN "marketplace"."return_requests"."resolutionType" IS 'Customer-selected resolution method'; COMMENT ON COLUMN "marketplace"."return_requests"."refundAmount" IS 'Total refund/credit amount'; COMMENT ON COLUMN "marketplace"."return_requests"."photoUrls" IS 'Photo evidence URLs uploaded by customer'; COMMENT ON COLUMN "marketplace"."return_requests"."pickupPhotoUrls" IS 'Photo evidence URLs from pickup agent'; COMMENT ON COLUMN "marketplace"."return_requests"."pickupAddress" IS 'Pickup address snapshot'; COMMENT ON COLUMN "marketplace"."return_requests"."pickupPartnerId" IS 'Assigned delivery partner ID for reverse pickup'; COMMENT ON COLUMN "marketplace"."return_requests"."pickupScheduledAt" IS 'When the pickup was scheduled'; COMMENT ON COLUMN "marketplace"."return_requests"."qcCondition" IS 'QC assessment of returned item condition'; COMMENT ON COLUMN "marketplace"."return_requests"."qcNotes" IS 'QC inspector notes'; COMMENT ON COLUMN "marketplace"."return_requests"."rejectionReason" IS 'Admin/seller rejection reason'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1047ebf2cb0aa24a18a85e0869" ON "marketplace"."return_requests" ("seller_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ace6fecb931987852fb657bb5f" ON "marketplace"."return_requests" ("customer_id", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_5a41292eca94fd031e1256cac8" ON "marketplace"."return_requests" ("order_id", "status") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."coupons_discounttype_enum" AS ENUM('PERCENTAGE', 'FLAT', 'FREE_SHIPPING', 'CASHBACK', 'BUY_X_GET_Y');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."coupons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(30) NOT NULL, "title" character varying, "description" text, "discountType" "marketplace"."coupons_discounttype_enum" NOT NULL DEFAULT 'PERCENTAGE', "discountValue" numeric(10,2) NOT NULL, "maxDiscount" numeric(10,2), "minOrderValue" numeric(10,2) NOT NULL DEFAULT '0', "usageLimit" integer NOT NULL DEFAULT '-1', "usageLimitPerUser" integer NOT NULL DEFAULT '1', "usedCount" integer NOT NULL DEFAULT '0', "validFrom" TIMESTAMP NOT NULL, "validUntil" TIMESTAMP NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "autoApply" boolean NOT NULL DEFAULT false, "firstOrderOnly" boolean NOT NULL DEFAULT false, "seller_id" uuid, "applicableProductIds" text, "applicableCategoryIds" text, "applicablePaymentMethods" text, "bankName" character varying, "franchise_id" character varying, "region_code" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e025109230e82925843f2a14c48" UNIQUE ("code"), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."coupons"."code" IS 'Unique coupon code, e.g. SAVE20, NEWUSER50'; COMMENT ON COLUMN "marketplace"."coupons"."discountValue" IS 'Discount value (% or flat amount)'; COMMENT ON COLUMN "marketplace"."coupons"."maxDiscount" IS 'Max discount cap for percentage coupons'; COMMENT ON COLUMN "marketplace"."coupons"."minOrderValue" IS 'Minimum order value to apply'; COMMENT ON COLUMN "marketplace"."coupons"."usageLimit" IS 'Total redemption limit (-1 = unlimited)'; COMMENT ON COLUMN "marketplace"."coupons"."usageLimitPerUser" IS 'Max uses per customer'; COMMENT ON COLUMN "marketplace"."coupons"."usedCount" IS 'Current total redemptions'; COMMENT ON COLUMN "marketplace"."coupons"."validFrom" IS 'Coupon valid from'; COMMENT ON COLUMN "marketplace"."coupons"."validUntil" IS 'Coupon valid until'; COMMENT ON COLUMN "marketplace"."coupons"."autoApply" IS 'Automatically applied if eligible (no code entry needed)'; COMMENT ON COLUMN "marketplace"."coupons"."firstOrderOnly" IS 'Only valid for first-time customers'; COMMENT ON COLUMN "marketplace"."coupons"."seller_id" IS 'NULL = platform-wide coupon'; COMMENT ON COLUMN "marketplace"."coupons"."applicableProductIds" IS 'Restrict to specific product IDs'; COMMENT ON COLUMN "marketplace"."coupons"."applicableCategoryIds" IS 'Restrict to specific category IDs'; COMMENT ON COLUMN "marketplace"."coupons"."applicablePaymentMethods" IS 'Restrict to specific payment methods (UPI, CARD, etc.)'; COMMENT ON COLUMN "marketplace"."coupons"."bankName" IS 'Bank name for bank-specific offers'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_349c54aae3ee81ede487f2098e" ON "marketplace"."coupons" ("validFrom", "validUntil") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c9ddce1f48751651a63ea26acf" ON "marketplace"."coupons" ("seller_id", "isActive") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_e025109230e82925843f2a14c4" ON "marketplace"."coupons" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."coupon_usages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "coupon_id" uuid NOT NULL, "customer_id" character varying NOT NULL, "order_id" character varying NOT NULL, "discountApplied" numeric(10,2) NOT NULL, "redeemedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_01ff9a1cac559c4ae2e4179d0a3" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."coupon_usages"."discountApplied" IS 'Actual discount applied'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_f017af60a02209a6b045f673ca" ON "marketplace"."coupon_usages" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_70b32d5fa1b220bbd60ba86396" ON "marketplace"."coupon_usages" ("coupon_id", "customer_id") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."shipment_tracking_events_status_enum" AS ENUM('LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'REACHED_HUB', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERED', 'RETURNED_TO_ORIGIN', 'LOST', 'DAMAGED', 'HELD_AT_CUSTOMS', 'EXCEPTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."shipment_tracking_events_source_enum" AS ENUM('COURIER_API', 'WEBHOOK', 'MANUAL', 'PARTNER_APP', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."shipment_tracking_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "trackingId" character varying NOT NULL, "courierName" character varying, "status" "marketplace"."shipment_tracking_events_status_enum" NOT NULL, "description" text, "location" character varying, "coordinates" jsonb, "timestamp" TIMESTAMP NOT NULL, "courierEventCode" character varying, "deliveryPartnerId" character varying, "photoUrls" text, "receivedBy" character varying, "otpVerified" character varying, "source" "marketplace"."shipment_tracking_events_source_enum" NOT NULL DEFAULT 'SYSTEM', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_99341e3aacf6df7699a33859f9c" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."trackingId" IS 'AWB / tracking number from courier'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."courierName" IS 'Courier/logistics partner name (Delhivery, Ekart, etc.)'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."status" IS 'Standardized shipment status'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."description" IS 'Human-readable description from courier API'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."location" IS 'City/location where event occurred'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."coordinates" IS 'GPS coordinates if available'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."timestamp" IS 'When the event actually happened (from courier)'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."courierEventCode" IS 'Courier-side event code for debugging'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."deliveryPartnerId" IS 'Delivery partner who performed this action'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."photoUrls" IS 'Photo proof URLs (POD)'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."receivedBy" IS 'Recipient name for delivery confirmation'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."otpVerified" IS 'OTP used for delivery verification'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."source" IS 'How this event was ingested'; COMMENT ON COLUMN "marketplace"."shipment_tracking_events"."createdAt" IS 'When this record was created in our system'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_2631899c5412968d34c1df8ec2" ON "marketplace"."shipment_tracking_events" ("trackingId") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_7278e306232cd99f373039be0b" ON "marketplace"."shipment_tracking_events" ("order_id", "timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."product_variants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "sku" character varying NOT NULL, "barcode" character varying, "attributes" jsonb NOT NULL, "variantName" character varying, "mrp" numeric(10,2) NOT NULL, "sellingPrice" numeric(10,2) NOT NULL, "costPrice" numeric(10,2), "stockQuantity" integer NOT NULL DEFAULT '0', "lowStockThreshold" integer NOT NULL DEFAULT '5', "weightKg" numeric(6,3), "dimensions" jsonb, "imageUrls" text, "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "seller_id" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."product_variants"."sku" IS 'Seller SKU for this variant — unique within the parent product'; COMMENT ON COLUMN "marketplace"."product_variants"."barcode" IS 'Barcode (EAN/UPC) for this variant'; COMMENT ON COLUMN "marketplace"."product_variants"."attributes" IS 'Attribute key-value pairs, e.g. { "color": "Midnight Blue", "size": "256GB" }'; COMMENT ON COLUMN "marketplace"."product_variants"."variantName" IS 'Human-readable variant name, e.g. "Midnight Blue - 256GB"'; COMMENT ON COLUMN "marketplace"."product_variants"."mrp" IS 'Maximum Retail Price for this variant'; COMMENT ON COLUMN "marketplace"."product_variants"."sellingPrice" IS 'Selling price (after seller discount)'; COMMENT ON COLUMN "marketplace"."product_variants"."costPrice" IS 'Cost price for margin calculation'; COMMENT ON COLUMN "marketplace"."product_variants"."stockQuantity" IS 'Available stock quantity'; COMMENT ON COLUMN "marketplace"."product_variants"."lowStockThreshold" IS 'Low stock threshold for alerts'; COMMENT ON COLUMN "marketplace"."product_variants"."weightKg" IS 'Weight in kg'; COMMENT ON COLUMN "marketplace"."product_variants"."dimensions" IS 'Package dimensions in cm: { length, width, height }'; COMMENT ON COLUMN "marketplace"."product_variants"."imageUrls" IS 'Image URLs specific to this variant'; COMMENT ON COLUMN "marketplace"."product_variants"."sortOrder" IS 'Display order within the variant group'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c8cbeab08cea4b1d205c620ee9" ON "marketplace"."product_variants" ("product_id", "isActive") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ceaa413b9fe3dbfd6e889dc5a7" ON "marketplace"."product_variants" ("product_id", "sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6343513e20e2deab45edfce131" ON "marketplace"."product_variants" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."product_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "customer_id" character varying NOT NULL, "customerName" character varying, "questionText" text NOT NULL, "upvoteCount" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'PUBLISHED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f4661bdf08fa5d9fecd2ed93049" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."product_questions"."questionText" IS 'The question text'; COMMENT ON COLUMN "marketplace"."product_questions"."upvoteCount" IS 'Number of upvotes on the question'; COMMENT ON COLUMN "marketplace"."product_questions"."status" IS 'PUBLISHED, HIDDEN, FLAGGED, PENDING'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a02521778be3b171bbe0e8a74c" ON "marketplace"."product_questions" ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e8d076b9299ce978d737deae0a" ON "marketplace"."product_questions" ("product_id", "createdAt") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."product_answers_authorrole_enum" AS ENUM('SELLER', 'CUSTOMER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."product_answers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "question_id" uuid NOT NULL, "author_id" character varying NOT NULL, "authorName" character varying, "authorRole" "marketplace"."product_answers_authorrole_enum" NOT NULL DEFAULT 'CUSTOMER', "answerText" text NOT NULL, "helpfulCount" integer NOT NULL DEFAULT '0', "isAccepted" boolean NOT NULL DEFAULT false, "status" character varying NOT NULL DEFAULT 'PUBLISHED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bbbfe03b7b00129d5054d724bdf" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."product_answers"."author_id" IS 'User ID of the person who answered'; COMMENT ON COLUMN "marketplace"."product_answers"."authorRole" IS 'Role of the answer author'; COMMENT ON COLUMN "marketplace"."product_answers"."answerText" IS 'The answer text'; COMMENT ON COLUMN "marketplace"."product_answers"."helpfulCount" IS 'Helpful votes'; COMMENT ON COLUMN "marketplace"."product_answers"."isAccepted" IS 'Marked as the official/accepted answer by seller'; COMMENT ON COLUMN "marketplace"."product_answers"."status" IS 'PUBLISHED, HIDDEN, FLAGGED, PENDING'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b9e8ab2e4761f5f80216a99301" ON "marketplace"."product_answers" ("question_id", "createdAt") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."delivery_assignments_status_enum" AS ENUM('PENDING', 'OFFERED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."delivery_assignments_assignmentmethod_enum" AS ENUM('AUTO', 'MANUAL', 'BROADCAST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."delivery_assignments_deliverymode_enum" AS ENUM('HANDED', 'DOORSTEP', 'NEIGHBOR', 'GUARD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."delivery_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "return_request_id" character varying, "partner_id" character varying NOT NULL, "partnerName" character varying, "partnerPhone" character varying, "status" "marketplace"."delivery_assignments_status_enum" NOT NULL DEFAULT 'PENDING', "isReturnPickup" boolean NOT NULL DEFAULT false, "assignmentMethod" "marketplace"."delivery_assignments_assignmentmethod_enum" NOT NULL DEFAULT 'AUTO', "pickupLocation" jsonb NOT NULL, "dropLocation" jsonb NOT NULL, "distanceKm" numeric(8,2), "estimatedMinutes" integer, "deliveryFee" numeric(10,2), "partnerEarnings" numeric(10,2), "deliveryOtp" character varying, "otpVerified" boolean NOT NULL DEFAULT false, "proofPhotos" text, "deliveryMode" "marketplace"."delivery_assignments_deliverymode_enum", "deliveryNotes" text, "deliveryCoordinates" jsonb, "codAmount" numeric(10,2), "codCollected" boolean NOT NULL DEFAULT false, "offeredAt" TIMESTAMP, "acceptedAt" TIMESTAMP, "pickedUpAt" TIMESTAMP, "deliveredAt" TIMESTAMP, "failureReason" text, "franchise_id" character varying, "region_code" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d1cfabf26db04a5282217fb7b83" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."delivery_assignments"."return_request_id" IS 'Linked return request for reverse pickups'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."partner_id" IS 'Delivery partner/driver user ID'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."isReturnPickup" IS 'True if this is a return/reverse pickup assignment'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."assignmentMethod" IS 'How the partner was selected'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."pickupLocation" IS 'Pickup location'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."dropLocation" IS 'Drop-off location'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."distanceKm" IS 'Estimated distance in km'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."estimatedMinutes" IS 'Estimated delivery time in minutes'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."deliveryFee" IS 'Delivery fee charged to customer'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."partnerEarnings" IS 'Commission/earnings for delivery partner'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."deliveryOtp" IS 'OTP for delivery verification'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."otpVerified" IS 'Whether OTP was verified at delivery'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."proofPhotos" IS 'Photo proof of delivery URLs'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."deliveryMode" IS 'How the package was delivered'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."deliveryNotes" IS 'Delivery notes from partner'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."deliveryCoordinates" IS 'GPS coordinates at delivery confirmation'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."codAmount" IS 'COD amount to be collected'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."codCollected" IS 'Whether COD was collected'; COMMENT ON COLUMN "marketplace"."delivery_assignments"."failureReason" IS 'Reason for rejection/failure'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f32e253bdbdb10b1e1844249e2" ON "marketplace"."delivery_assignments" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_737805bb31584995fc050637a6" ON "marketplace"."delivery_assignments" ("partner_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3442216f1a3836b6e3a97c3e72" ON "marketplace"."delivery_assignments" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."product_attributes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'TEXT', "options" jsonb, "isVariantAxis" boolean NOT NULL DEFAULT false, "unit" character varying, "isRequired" boolean NOT NULL DEFAULT true, "isFilterable" boolean NOT NULL DEFAULT true, "isSearchable" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT '0', "categoryId" uuid, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4fa18fc5c893cb9894fc40ca921" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."product_attributes"."type" IS 'TEXT | NUMBER | SELECT | MULTI_SELECT | BOOLEAN | COLOR'; COMMENT ON COLUMN "marketplace"."product_attributes"."options" IS 'Predefined values: [{ label, value, hex? }]'; COMMENT ON COLUMN "marketplace"."product_attributes"."isVariantAxis" IS 'True when this attribute splits a product into SKUs'; COMMENT ON COLUMN "marketplace"."product_attributes"."unit" IS 'Unit label, e.g. kg, cm, mAh'; COMMENT ON COLUMN "marketplace"."product_attributes"."categoryId" IS 'Category this attribute belongs to (null = global)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_a0fba02040d3d329ddf115f171" ON "marketplace"."product_attributes" ("categoryId", "slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f1be81f6c26a65e2894b50fdb8" ON "marketplace"."product_attributes" ("categoryId", "isActive") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."marketplace_notifications_type_enum" AS ENUM('ORDER_UPDATE', 'PRICE_DROP', 'DELIVERY_UPDATE', 'PROMOTION', 'REVIEW_RESPONSE', 'RETURN_UPDATE', 'REFUND_UPDATE', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."marketplace_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "type" "marketplace"."marketplace_notifications_type_enum" NOT NULL DEFAULT 'SYSTEM', "title" character varying NOT NULL, "message" text NOT NULL, "metadata" jsonb, "actionUrl" character varying, "imageUrl" character varying, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1e820199b8e83ce8a6dea38d533" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."marketplace_notifications"."metadata" IS 'Extra payload: orderId, productId, etc.'; COMMENT ON COLUMN "marketplace"."marketplace_notifications"."actionUrl" IS 'Deep-link URL or route path'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1d80820dde759c01f8c49c9872" ON "marketplace"."marketplace_notifications" ("userId") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."gift_cards_status_enum" AS ENUM('ACTIVE', 'REDEEMED', 'EXPIRED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."gift_cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(20) NOT NULL, "originalAmount" numeric(12,2) NOT NULL, "currentBalance" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'INR', "status" "marketplace"."gift_cards_status_enum" NOT NULL DEFAULT 'ACTIVE', "purchasedByUserId" character varying, "redeemedByUserId" character varying, "recipientEmail" character varying, "recipientName" character varying, "personalMessage" text, "expiresAt" TIMESTAMP, "redeemedAt" TIMESTAMP, "redemptionHistory" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_66a0b66755efd01b1749861b4aa" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."gift_cards"."code" IS 'Unique alphanumeric code, e.g. GIFT-XXXX-XXXX'; COMMENT ON COLUMN "marketplace"."gift_cards"."purchasedByUserId" IS 'User who purchased this gift card'; COMMENT ON COLUMN "marketplace"."gift_cards"."redeemedByUserId" IS 'User who redeemed/owns this gift card'; COMMENT ON COLUMN "marketplace"."gift_cards"."redemptionHistory" IS 'Redemption history: [{orderId, amount, date}]'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_08ff997110a4e3842076964f0e" ON "marketplace"."gift_cards" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."brand_follows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "brand_id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e19b51f1b6991eb53bd9c0a806e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cb49fd85eaf85ed7570678fdcb" ON "marketplace"."brand_follows" ("user_id", "brand_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."brand_updates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "brand_id" uuid NOT NULL, "type" character varying NOT NULL DEFAULT 'ANNOUNCEMENT', "title" character varying NOT NULL, "message" text NOT NULL, "imageUrl" character varying, "actionUrl" character varying, "product_id" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ab5c68b3b651caa99784b6d5aae" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_7727faac800060800125820a95" ON "marketplace"."brand_updates" ("brand_id", "createdAt") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."seller_settings_fulfillmentmode_enum" AS ENUM('SELF', 'KARTSEEK_FULFILLMENT', 'HYBRID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."seller_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_id" uuid NOT NULL, "storeName" character varying, "storeDescription" text, "logoUrl" character varying, "bannerUrl" character varying, "isOnline" boolean NOT NULL DEFAULT true, "autoAcceptOrders" boolean NOT NULL DEFAULT false, "deliveryRadius" integer NOT NULL DEFAULT '0', "minimumOrder" numeric(10,2) NOT NULL DEFAULT '0', "freeDeliveryThreshold" numeric(10,2) NOT NULL DEFAULT '0', "businessHours" jsonb, "fulfillmentMode" "marketplace"."seller_settings_fulfillmentmode_enum" NOT NULL DEFAULT 'SELF', "shippingRates" jsonb, "dispatchSla" integer NOT NULL DEFAULT '2', "bankDetails" jsonb, "commissionRate" numeric(5,2) NOT NULL DEFAULT '10', "taxId" character varying, "notifications" jsonb, "twoFactorEnabled" boolean NOT NULL DEFAULT false, "twoFactorSecret" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a8407e930423684194531392e8d" UNIQUE ("seller_id"), CONSTRAINT "REL_a8407e930423684194531392e8" UNIQUE ("seller_id"), CONSTRAINT "PK_c17096ae2ad050bd6585d3287f6" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."seller_settings"."deliveryRadius" IS 'Delivery radius in km'; COMMENT ON COLUMN "marketplace"."seller_settings"."freeDeliveryThreshold" IS 'Free delivery above this amount'; COMMENT ON COLUMN "marketplace"."seller_settings"."shippingRates" IS 'Default shipping rates by region'; COMMENT ON COLUMN "marketplace"."seller_settings"."dispatchSla" IS 'Default dispatch SLA in days'; COMMENT ON COLUMN "marketplace"."seller_settings"."commissionRate" IS 'Platform commission %'; COMMENT ON COLUMN "marketplace"."seller_settings"."taxId" IS 'GST/VAT number'`,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  CREATE TYPE "marketplace"."seller_kyc_status_enum" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."seller_kyc" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_id" uuid NOT NULL, "ownerFullName" character varying NOT NULL, "ownerEmail" character varying, "ownerPhone" character varying, "businessType" character varying, "businessRegistrationNumber" character varying, "taxRegistrationNumber" character varying, "country_code" character varying NOT NULL, "govIdFrontUrl" character varying, "govIdBackUrl" character varying, "businessLicenseUrl" character varying, "addressProofUrl" character varying, "bankVerificationUrl" character varying, "status" "marketplace"."seller_kyc_status_enum" NOT NULL DEFAULT 'PENDING', "rejectionReason" text, "reviewedBy" character varying, "reviewedAt" TIMESTAMP, "expiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8660cfbc035015d42460f08c9ae" UNIQUE ("seller_id"), CONSTRAINT "REL_8660cfbc035015d42460f08c9a" UNIQUE ("seller_id"), CONSTRAINT "PK_73204faf120a3c60d7de721234f" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."seller_kyc"."govIdFrontUrl" IS 'URL to uploaded govt ID (front)'; COMMENT ON COLUMN "marketplace"."seller_kyc"."govIdBackUrl" IS 'URL to uploaded govt ID (back)'; COMMENT ON COLUMN "marketplace"."seller_kyc"."businessLicenseUrl" IS 'URL to business license document'; COMMENT ON COLUMN "marketplace"."seller_kyc"."addressProofUrl" IS 'URL to address proof document'; COMMENT ON COLUMN "marketplace"."seller_kyc"."bankVerificationUrl" IS 'URL to bank statement / cancelled cheque'; COMMENT ON COLUMN "marketplace"."seller_kyc"."reviewedBy" IS 'Admin who reviewed'; COMMENT ON COLUMN "marketplace"."seller_kyc"."expiresAt" IS 'KYC expiry date for re-verification'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a6e4d50e7108f7f457728c26ee" ON "marketplace"."seller_kyc" ("seller_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."seller_staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_id" uuid NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "role" character varying NOT NULL DEFAULT 'support', "status" character varying NOT NULL DEFAULT 'active', "lastActive" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ec90dd28510d56c9d7d236c6620" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_15af2f08a7e8feebd6b525f2b9" ON "marketplace"."seller_staff" ("seller_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."seller_promotions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_id" uuid NOT NULL, "name" character varying NOT NULL, "code" character varying, "type" character varying NOT NULL DEFAULT 'percentage', "value" numeric(10,2) NOT NULL DEFAULT '0', "maxDiscount" numeric(10,2), "minOrderValue" numeric(10,2) NOT NULL DEFAULT '0', "usageCount" integer NOT NULL DEFAULT '0', "usageLimit" integer, "status" character varying NOT NULL DEFAULT 'active', "startDate" TIMESTAMP, "endDate" TIMESTAMP, "applicableProducts" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_afdfa08265b1abf31bd0abc9367" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dc73394f7cb5f02cf3f15dd49d" ON "marketplace"."seller_promotions" ("seller_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."seller_support_tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying NOT NULL, "seller_id" uuid NOT NULL, "subject" character varying NOT NULL, "category" character varying NOT NULL DEFAULT 'general', "priority" character varying NOT NULL DEFAULT 'medium', "status" character varying NOT NULL DEFAULT 'open', "messages" jsonb NOT NULL DEFAULT '[]'::jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d6dd8b898880b09e0a1fd2fe691" UNIQUE ("reference"), CONSTRAINT "PK_d33d1868214a6a34f500e07fdfb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c534283b2f154811360c9dd47f" ON "marketplace"."seller_support_tickets" ("seller_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."seller_bank_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_id" uuid NOT NULL, "accountHolderName" character varying NOT NULL, "bankName" character varying NOT NULL, "accountNumberLast4" character varying(4) NOT NULL, "accountNumberEnc" text NOT NULL, "bankCode" character varying, "upiId" character varying, "method" character varying NOT NULL DEFAULT 'bank', "isDefault" boolean NOT NULL DEFAULT false, "isVerified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9eb51a534c6a320535d4c6f4ea0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_936e4ff6fcd3bb6ca6ceb40f33" ON "marketplace"."seller_bank_accounts" ("seller_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."flash_deals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "description" text, "status" character varying(20) NOT NULL DEFAULT 'DRAFT', "window_start" TIMESTAMP NOT NULL, "window_end" TIMESTAMP NOT NULL, "min_discount_percent" integer NOT NULL DEFAULT '0', "stock_limit" integer NOT NULL DEFAULT '0', "units_sold" integer NOT NULL DEFAULT '0', "priority" integer NOT NULL DEFAULT '5', "region_code" character varying, "created_by" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8f1c0e8afeb64c6390ab6c119a7" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."flash_deals"."name" IS 'Campaign name shown to admins, e.g. "Smartphone Mega Sale"'; COMMENT ON COLUMN "marketplace"."flash_deals"."window_start" IS 'Deal opens'; COMMENT ON COLUMN "marketplace"."flash_deals"."window_end" IS 'Deal closes'; COMMENT ON COLUMN "marketplace"."flash_deals"."min_discount_percent" IS 'Floor a nomination must meet to be eligible'; COMMENT ON COLUMN "marketplace"."flash_deals"."stock_limit" IS 'Units released across the campaign (0 = uncapped)'; COMMENT ON COLUMN "marketplace"."flash_deals"."priority" IS 'Lower sorts first on the storefront'; COMMENT ON COLUMN "marketplace"."flash_deals"."region_code" IS 'NULL = every region'; COMMENT ON COLUMN "marketplace"."flash_deals"."created_by" IS 'Admin user id'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_46dac27b3a8f29a750b1b32d44" ON "marketplace"."flash_deals" ("region_code", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_241251fee7e56b5504b2094823" ON "marketplace"."flash_deals" ("status", "window_start", "window_end") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."flash_deal_nominations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deal_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "product_id" uuid NOT NULL, "deal_price" numeric(10,2) NOT NULL, "proposed_discount_percent" integer NOT NULL DEFAULT '0', "stock_allocated" integer NOT NULL DEFAULT '0', "stock_sold" integer NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'PENDING', "seller_note" text, "decision_reason" text, "decided_at" TIMESTAMP, "decided_by" character varying, "submitted_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dc1e56727a6175f36bc1c838997" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."flash_deal_nominations"."deal_price" IS 'Price the shopper pays while the campaign runs — the reason a flash deal is not just a popular product'; COMMENT ON COLUMN "marketplace"."flash_deal_nominations"."decision_reason" IS 'Why an admin approved or rejected'; COMMENT ON COLUMN "marketplace"."flash_deal_nominations"."decided_by" IS 'Admin user id'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_5886891dc89a9f744314d7f816" ON "marketplace"."flash_deal_nominations" ("deal_id", "seller_id", "product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fd121a2d9b1cb4724c5bbf09bc" ON "marketplace"."flash_deal_nominations" ("seller_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3cbda3af477554de10924751b8" ON "marketplace"."flash_deal_nominations" ("deal_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."product_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "reporter_id" character varying NOT NULL, "reason" character varying(20) NOT NULL DEFAULT 'OTHER', "details" text, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "resolution_note" text, "reviewed_by" character varying, "reviewed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_57b3bd50de73401641fd93a2fcf" PRIMARY KEY ("id")); COMMENT ON COLUMN "marketplace"."product_reports"."reason" IS 'Why the shopper flagged it'; COMMENT ON COLUMN "marketplace"."product_reports"."details" IS 'What the shopper wrote'; COMMENT ON COLUMN "marketplace"."product_reports"."reviewed_by" IS 'Admin user id'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_084f72d2618df9dd6b7475e77d" ON "marketplace"."product_reports" ("product_id", "reporter_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3316885a40f40ea3c3c1bfdad4" ON "marketplace"."product_reports" ("product_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_39266e1c66048c37139b800e34" ON "marketplace"."product_reports" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."price_alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" character varying NOT NULL, "product_id" uuid NOT NULL, "price_when_set" numeric(12,2) NOT NULL, "target_price" numeric(12,2), "is_active" boolean NOT NULL DEFAULT true, "notified_at" TIMESTAMP, "notified_price" numeric(12,2), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_125caf0cfa6219ed3ea03646608" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_f9b9c3e8c22528aaf9c3f772b6" ON "marketplace"."price_alerts" ("customer_id", "product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9fdebee18136c6adcea11a2a0f" ON "marketplace"."price_alerts" ("customer_id", "is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_074182ac4142c8cef79003c4ee" ON "marketplace"."price_alerts" ("product_id", "is_active") `,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."categories_closure" ("id_ancestor" uuid NOT NULL, "id_descendant" uuid NOT NULL, CONSTRAINT "PK_dc67f6a82852c15ec6e4243398d" PRIMARY KEY ("id_ancestor", "id_descendant"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ea1e9c4eea91160dfdb4318778" ON "marketplace"."categories_closure" ("id_ancestor") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_51fff5114cc41723e8ca36cf22" ON "marketplace"."categories_closure" ("id_descendant") `,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."categories" ADD CONSTRAINT "FK_88cea2dc9c31951d06437879b40" FOREIGN KEY ("parent_id") REFERENCES "marketplace"."categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_listings" ADD CONSTRAINT "FK_418796745219fa7a9b26459e91a" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_listings" ADD CONSTRAINT "FK_ec186b952ec8ea1a92113842e7c" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."products" ADD CONSTRAINT "FK_1530a6f15d3c79d1b70be98f2be" FOREIGN KEY ("brand_id") REFERENCES "marketplace"."brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "marketplace"."categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."products" ADD CONSTRAINT "FK_c9de3a8edea9269ca774c919b9a" FOREIGN KEY ("subcategory_id") REFERENCES "marketplace"."categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."reviews" ADD CONSTRAINT "FK_9482e9567d8dcc2bc615981ef44" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."wishlists" ADD CONSTRAINT "FK_2662acbb3868b1f0077fda61dd2" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."marketplace_orders" ADD CONSTRAINT "FK_5fa13a6f7adaa426227fa14d571" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."return_requests" ADD CONSTRAINT "FK_c7f39dfc32be2b7be25c139ba04" FOREIGN KEY ("order_id") REFERENCES "marketplace"."marketplace_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."return_requests" ADD CONSTRAINT "FK_29a56d08a5d45233841119959d7" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."coupons" ADD CONSTRAINT "FK_dbb1e39de76d57988546f7b6464" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."coupon_usages" ADD CONSTRAINT "FK_56491a0d0010feb079b964e23b4" FOREIGN KEY ("coupon_id") REFERENCES "marketplace"."coupons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."shipment_tracking_events" ADD CONSTRAINT "FK_4479722ff738228ec690cbd5f13" FOREIGN KEY ("order_id") REFERENCES "marketplace"."marketplace_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_variants" ADD CONSTRAINT "FK_6343513e20e2deab45edfce1316" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_questions" ADD CONSTRAINT "FK_e31bd9196b72fdc6838cabbc1c9" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_answers" ADD CONSTRAINT "FK_e8422d14d392664bdeca1df5b34" FOREIGN KEY ("question_id") REFERENCES "marketplace"."product_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."delivery_assignments" ADD CONSTRAINT "FK_3442216f1a3836b6e3a97c3e729" FOREIGN KEY ("order_id") REFERENCES "marketplace"."marketplace_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_attributes" ADD CONSTRAINT "FK_a499789fa04bbad5a99bbe6ccff" FOREIGN KEY ("categoryId") REFERENCES "marketplace"."categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."brand_follows" ADD CONSTRAINT "FK_f27df2123ee1bcce59d259d56e0" FOREIGN KEY ("brand_id") REFERENCES "marketplace"."brands"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."brand_updates" ADD CONSTRAINT "FK_b046386d8f87654312db93f349a" FOREIGN KEY ("brand_id") REFERENCES "marketplace"."brands"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."seller_settings" ADD CONSTRAINT "FK_a8407e930423684194531392e8d" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."seller_kyc" ADD CONSTRAINT "FK_8660cfbc035015d42460f08c9ae" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."seller_staff" ADD CONSTRAINT "FK_dca8b2de6d9ecd31e98d9236871" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."seller_promotions" ADD CONSTRAINT "FK_c594c840040b350e120b1d9764d" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."seller_support_tickets" ADD CONSTRAINT "FK_1ad32744ba6df36e3bc043eb48b" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."seller_bank_accounts" ADD CONSTRAINT "FK_936e4ff6fcd3bb6ca6ceb40f331" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."flash_deal_nominations" ADD CONSTRAINT "FK_d1ea391028c7f4114ffdb9a3b24" FOREIGN KEY ("deal_id") REFERENCES "marketplace"."flash_deals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."flash_deal_nominations" ADD CONSTRAINT "FK_c568f4021259e059c708cba82e5" FOREIGN KEY ("seller_id") REFERENCES "marketplace"."sellers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."flash_deal_nominations" ADD CONSTRAINT "FK_303ca11d02bd58b5af401ff1fca" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_reports" ADD CONSTRAINT "FK_f635027838cd23a20c299cb3633" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."price_alerts" ADD CONSTRAINT "FK_dd7a63b6bd5211ed115841ddb89" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."categories_closure" ADD CONSTRAINT "FK_ea1e9c4eea91160dfdb4318778d" FOREIGN KEY ("id_ancestor") REFERENCES "marketplace"."categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."categories_closure" ADD CONSTRAINT "FK_51fff5114cc41723e8ca36cf227" FOREIGN KEY ("id_descendant") REFERENCES "marketplace"."categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "marketplace"."categories_closure" DROP CONSTRAINT "FK_51fff5114cc41723e8ca36cf227"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."categories_closure" DROP CONSTRAINT "FK_ea1e9c4eea91160dfdb4318778d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."price_alerts" DROP CONSTRAINT "FK_dd7a63b6bd5211ed115841ddb89"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_reports" DROP CONSTRAINT "FK_f635027838cd23a20c299cb3633"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."flash_deal_nominations" DROP CONSTRAINT "FK_303ca11d02bd58b5af401ff1fca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."flash_deal_nominations" DROP CONSTRAINT "FK_c568f4021259e059c708cba82e5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."flash_deal_nominations" DROP CONSTRAINT "FK_d1ea391028c7f4114ffdb9a3b24"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."seller_bank_accounts" DROP CONSTRAINT "FK_936e4ff6fcd3bb6ca6ceb40f331"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."seller_support_tickets" DROP CONSTRAINT "FK_1ad32744ba6df36e3bc043eb48b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."seller_promotions" DROP CONSTRAINT "FK_c594c840040b350e120b1d9764d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."seller_staff" DROP CONSTRAINT "FK_dca8b2de6d9ecd31e98d9236871"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."seller_kyc" DROP CONSTRAINT "FK_8660cfbc035015d42460f08c9ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."seller_settings" DROP CONSTRAINT "FK_a8407e930423684194531392e8d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."brand_updates" DROP CONSTRAINT "FK_b046386d8f87654312db93f349a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."brand_follows" DROP CONSTRAINT "FK_f27df2123ee1bcce59d259d56e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_attributes" DROP CONSTRAINT "FK_a499789fa04bbad5a99bbe6ccff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."delivery_assignments" DROP CONSTRAINT "FK_3442216f1a3836b6e3a97c3e729"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_answers" DROP CONSTRAINT "FK_e8422d14d392664bdeca1df5b34"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_questions" DROP CONSTRAINT "FK_e31bd9196b72fdc6838cabbc1c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_variants" DROP CONSTRAINT "FK_6343513e20e2deab45edfce1316"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."shipment_tracking_events" DROP CONSTRAINT "FK_4479722ff738228ec690cbd5f13"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."coupon_usages" DROP CONSTRAINT "FK_56491a0d0010feb079b964e23b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."coupons" DROP CONSTRAINT "FK_dbb1e39de76d57988546f7b6464"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."return_requests" DROP CONSTRAINT "FK_29a56d08a5d45233841119959d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."return_requests" DROP CONSTRAINT "FK_c7f39dfc32be2b7be25c139ba04"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."marketplace_orders" DROP CONSTRAINT "FK_5fa13a6f7adaa426227fa14d571"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."wishlists" DROP CONSTRAINT "FK_2662acbb3868b1f0077fda61dd2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."reviews" DROP CONSTRAINT "FK_9482e9567d8dcc2bc615981ef44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."products" DROP CONSTRAINT "FK_c9de3a8edea9269ca774c919b9a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."products" DROP CONSTRAINT "FK_1530a6f15d3c79d1b70be98f2be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_listings" DROP CONSTRAINT "FK_ec186b952ec8ea1a92113842e7c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_listings" DROP CONSTRAINT "FK_418796745219fa7a9b26459e91a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_images" DROP CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."categories" DROP CONSTRAINT "FK_88cea2dc9c31951d06437879b40"`,
    );
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_51fff5114cc41723e8ca36cf22"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_ea1e9c4eea91160dfdb4318778"`);
    await queryRunner.query(`DROP TABLE "marketplace"."categories_closure"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_074182ac4142c8cef79003c4ee"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_9fdebee18136c6adcea11a2a0f"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_f9b9c3e8c22528aaf9c3f772b6"`);
    await queryRunner.query(`DROP TABLE "marketplace"."price_alerts"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_39266e1c66048c37139b800e34"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_3316885a40f40ea3c3c1bfdad4"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_084f72d2618df9dd6b7475e77d"`);
    await queryRunner.query(`DROP TABLE "marketplace"."product_reports"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_3cbda3af477554de10924751b8"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_fd121a2d9b1cb4724c5bbf09bc"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_5886891dc89a9f744314d7f816"`);
    await queryRunner.query(`DROP TABLE "marketplace"."flash_deal_nominations"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_241251fee7e56b5504b2094823"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_46dac27b3a8f29a750b1b32d44"`);
    await queryRunner.query(`DROP TABLE "marketplace"."flash_deals"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_936e4ff6fcd3bb6ca6ceb40f33"`);
    await queryRunner.query(`DROP TABLE "marketplace"."seller_bank_accounts"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_c534283b2f154811360c9dd47f"`);
    await queryRunner.query(`DROP TABLE "marketplace"."seller_support_tickets"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_dc73394f7cb5f02cf3f15dd49d"`);
    await queryRunner.query(`DROP TABLE "marketplace"."seller_promotions"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_15af2f08a7e8feebd6b525f2b9"`);
    await queryRunner.query(`DROP TABLE "marketplace"."seller_staff"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_a6e4d50e7108f7f457728c26ee"`);
    await queryRunner.query(`DROP TABLE "marketplace"."seller_kyc"`);
    await queryRunner.query(`DROP TYPE "marketplace"."seller_kyc_status_enum"`);
    await queryRunner.query(`DROP TABLE "marketplace"."seller_settings"`);
    await queryRunner.query(`DROP TYPE "marketplace"."seller_settings_fulfillmentmode_enum"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_7727faac800060800125820a95"`);
    await queryRunner.query(`DROP TABLE "marketplace"."brand_updates"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_cb49fd85eaf85ed7570678fdcb"`);
    await queryRunner.query(`DROP TABLE "marketplace"."brand_follows"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_08ff997110a4e3842076964f0e"`);
    await queryRunner.query(`DROP TABLE "marketplace"."gift_cards"`);
    await queryRunner.query(`DROP TYPE "marketplace"."gift_cards_status_enum"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_1d80820dde759c01f8c49c9872"`);
    await queryRunner.query(`DROP TABLE "marketplace"."marketplace_notifications"`);
    await queryRunner.query(`DROP TYPE "marketplace"."marketplace_notifications_type_enum"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_f1be81f6c26a65e2894b50fdb8"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_a0fba02040d3d329ddf115f171"`);
    await queryRunner.query(`DROP TABLE "marketplace"."product_attributes"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_3442216f1a3836b6e3a97c3e72"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_737805bb31584995fc050637a6"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_f32e253bdbdb10b1e1844249e2"`);
    await queryRunner.query(`DROP TABLE "marketplace"."delivery_assignments"`);
    await queryRunner.query(`DROP TYPE "marketplace"."delivery_assignments_deliverymode_enum"`);
    await queryRunner.query(`DROP TYPE "marketplace"."delivery_assignments_assignmentmethod_enum"`);
    await queryRunner.query(`DROP TYPE "marketplace"."delivery_assignments_status_enum"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_b9e8ab2e4761f5f80216a99301"`);
    await queryRunner.query(`DROP TABLE "marketplace"."product_answers"`);
    await queryRunner.query(`DROP TYPE "marketplace"."product_answers_authorrole_enum"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_e8d076b9299ce978d737deae0a"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_a02521778be3b171bbe0e8a74c"`);
    await queryRunner.query(`DROP TABLE "marketplace"."product_questions"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_6343513e20e2deab45edfce131"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_ceaa413b9fe3dbfd6e889dc5a7"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_c8cbeab08cea4b1d205c620ee9"`);
    await queryRunner.query(`DROP TABLE "marketplace"."product_variants"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_7278e306232cd99f373039be0b"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_2631899c5412968d34c1df8ec2"`);
    await queryRunner.query(`DROP TABLE "marketplace"."shipment_tracking_events"`);
    await queryRunner.query(`DROP TYPE "marketplace"."shipment_tracking_events_source_enum"`);
    await queryRunner.query(`DROP TYPE "marketplace"."shipment_tracking_events_status_enum"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_70b32d5fa1b220bbd60ba86396"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_f017af60a02209a6b045f673ca"`);
    await queryRunner.query(`DROP TABLE "marketplace"."coupon_usages"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_e025109230e82925843f2a14c4"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_c9ddce1f48751651a63ea26acf"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_349c54aae3ee81ede487f2098e"`);
    await queryRunner.query(`DROP TABLE "marketplace"."coupons"`);
    await queryRunner.query(`DROP TYPE "marketplace"."coupons_discounttype_enum"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_5a41292eca94fd031e1256cac8"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_ace6fecb931987852fb657bb5f"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_1047ebf2cb0aa24a18a85e0869"`);
    await queryRunner.query(`DROP TABLE "marketplace"."return_requests"`);
    await queryRunner.query(`DROP TYPE "marketplace"."return_requests_qccondition_enum"`);
    await queryRunner.query(`DROP TYPE "marketplace"."return_requests_resolutiontype_enum"`);
    await queryRunner.query(`DROP TYPE "marketplace"."return_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "marketplace"."return_requests_reason_enum"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_e2d6bc1aa0471ba4322290a970"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_d0e3617db05afdfb359f67b96d"`);
    await queryRunner.query(`DROP TABLE "marketplace"."marketplace_orders"`);
    await queryRunner.query(`DROP TYPE "marketplace"."marketplace_orders_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE "marketplace"."marketplace_orders_paymentmethod_enum"`);
    await queryRunner.query(`DROP TYPE "marketplace"."marketplace_orders_status_enum"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_66291670c9d1443777a62c16c6"`);
    await queryRunner.query(`DROP TABLE "marketplace"."wishlists"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_d9d121b1dbee65897a7d6ed29c"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_aa17633b6f91f0856429b1ed0e"`);
    await queryRunner.query(`DROP TABLE "marketplace"."reviews"`);
    await queryRunner.query(`DROP TABLE "marketplace"."exchange_offers"`);
    await queryRunner.query(`DROP TABLE "marketplace"."bank_offers"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_36ae5a041bdec3149c247bff6c"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_bfb1984231c2358e13f4494290"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_9a5f6868c96e0069e699f33e12"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_c9de3a8edea9269ca774c919b9"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_1530a6f15d3c79d1b70be98f2b"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_425ee27c69d6b8adc5d6475dcf"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_995d8194c43edfc98838cabc5a"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_9933b23d18e7d8221b60da6581"`);
    await queryRunner.query(`DROP TABLE "marketplace"."products"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_a076633eac641807d67cc678ab"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_f7b95b6411f343d3437cd1b0dc"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_b4b7d5a99faff94c738309f849"`);
    await queryRunner.query(`DROP TABLE "marketplace"."product_listings"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_90c322f4cf3a43b2914c38f1cb"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_096f7d73aec4d1954817529b5d"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_0c5222cb42708b327ae2f764a6"`);
    await queryRunner.query(`DROP TABLE "marketplace"."sellers"`);
    await queryRunner.query(`DROP TABLE "marketplace"."product_images"`);
    await queryRunner.query(`DROP TABLE "marketplace"."brands"`);
    await queryRunner.query(`DROP INDEX "marketplace"."IDX_88cea2dc9c31951d06437879b4"`);
    await queryRunner.query(`DROP TABLE "marketplace"."categories"`);
  }
}
