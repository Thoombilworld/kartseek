import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK Marketplace — Audit Remediation Migration
 *
 * Schema changes from the Marketplace Module End-to-End Audit (Phases 1-3):
 *
 *  1. Seller entity expansion: ~18 new columns (contact, KYC, banking, admin tracking)
 *  2. Product attributes table creation
 *  3. Gift cards table creation
 *  4. Marketplace notifications table creation
 *  5. Delivery assignment OTP columns (Redis-backed OTP verification)
 *  6. Product variant expanded fields (weight, dimensions, barcode)
 *
 * Prerequisites: Migrations 1719468000000 and 1719554400000 must have run first.
 */
export class AuditRemediation1720310400000 implements MigrationInterface {
  name = 'AuditRemediation1720310400000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ═══════════════════════════════════════════════════════════════════════
    // 1. SELLER ENTITY — Add missing columns (Phase 1, Task 1.1)
    // ═══════════════════════════════════════════════════════════════════════

    // Contact Information
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "ownerName" varchar,
        ADD COLUMN IF NOT EXISTS "email" varchar UNIQUE,
        ADD COLUMN IF NOT EXISTS "phone" varchar;
    `);

    // Store Metadata
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "description" text,
        ADD COLUMN IF NOT EXISTS "logoUrl" varchar,
        ADD COLUMN IF NOT EXISTS "bannerUrl" varchar;
    `);

    // Tax & Legal
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "gstNumber" varchar,
        ADD COLUMN IF NOT EXISTS "panNumber" varchar;
    `);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."gstNumber" IS 'GST registration number (India) or equivalent VAT ID'`);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."panNumber" IS 'PAN card number (India) or equivalent tax ID'`);

    // Banking Details
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "bankAccountNumber" varchar,
        ADD COLUMN IF NOT EXISTS "bankIfscCode" varchar,
        ADD COLUMN IF NOT EXISTS "bankAccountName" varchar;
    `);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."bankAccountNumber" IS 'Encrypted bank account number for payout settlement'`);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."bankIfscCode" IS 'IFSC code (India) or SWIFT/sort code'`);

    // Address (JSONB)
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "address" jsonb;
    `);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."address" IS 'Business address: { line1, line2, city, state, postalCode, country }'`);

    // KYC
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "kycDocuments" jsonb,
        ADD COLUMN IF NOT EXISTS "kycStatus" varchar DEFAULT 'PENDING';
    `);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."kycDocuments" IS 'Array of uploaded KYC documents: [{ type, url, uploadedAt, status }]'`);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."kycStatus" IS 'Overall KYC status: PENDING, VERIFIED, REJECTED'`);

    // Performance Metrics
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "sellerRating" float DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "totalReviews" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "totalProducts" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "totalOrders" integer DEFAULT 0;
    `);

    // Commission
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "commissionRate" decimal(5, 2);
    `);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."commissionRate" IS 'Seller-specific commission override. Null = use category/global default.'`);

    // Admin Tracking
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "approvedBy" varchar,
        ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "rejectionReason" text;
    `);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."approvedBy" IS 'Admin user ID who approved/rejected this seller'`);
    await queryRunner.query(`COMMENT ON COLUMN "sellers"."rejectionReason" IS 'Reason for rejection or suspension'`);

    // Regional
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "franchise_id" varchar,
        ADD COLUMN IF NOT EXISTS "region_code" varchar;
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sellers_verification_status" ON "sellers" ("verificationStatus")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sellers_region_code" ON "sellers" ("region_code")`);

    // ═══════════════════════════════════════════════════════════════════════
    // 2. PRODUCT ATTRIBUTES TABLE (Phase 1 entity)
    // ═══════════════════════════════════════════════════════════════════════

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_attributes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "attributeName" varchar NOT NULL,
        "attributeValue" varchar NOT NULL,
        "displayOrder" integer DEFAULT 0,
        "isFilterable" boolean DEFAULT false,
        "isHighlighted" boolean DEFAULT false,
        "group" varchar,
        "unit" varchar,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_product_attributes_product" ON "product_attributes" ("product_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_product_attributes_filterable" ON "product_attributes" ("isFilterable") WHERE "isFilterable" = true`);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. GIFT CARDS TABLE
    // ═══════════════════════════════════════════════════════════════════════

    await queryRunner.query(`
      CREATE TYPE "gift_card_status_enum" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED');
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "gift_cards" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar UNIQUE NOT NULL,
        "initialBalance" decimal(12, 2) NOT NULL,
        "currentBalance" decimal(12, 2) NOT NULL,
        "currency" varchar(3) DEFAULT 'INR',
        "status" "gift_card_status_enum" DEFAULT 'ACTIVE',
        "purchasedBy" varchar,
        "redeemedBy" varchar,
        "expiresAt" TIMESTAMP,
        "lastUsedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_gift_cards_code" ON "gift_cards" ("code")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_gift_cards_status" ON "gift_cards" ("status")`);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. MARKETPLACE NOTIFICATIONS TABLE
    // ═══════════════════════════════════════════════════════════════════════

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace_notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" varchar NOT NULL,
        "title" varchar NOT NULL,
        "message" text NOT NULL,
        "type" varchar DEFAULT 'INFO',
        "isRead" boolean DEFAULT false,
        "metadata" jsonb,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "marketplace_notifications" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_unread" ON "marketplace_notifications" ("userId", "isRead") WHERE "isRead" = false`);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. DELIVERY ASSIGNMENT — OTP Columns (Phase 2, Task 2.3)
    // ═══════════════════════════════════════════════════════════════════════

    await queryRunner.query(`
      ALTER TABLE "delivery_assignments"
        ADD COLUMN IF NOT EXISTS "otpHash" varchar,
        ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "otpVerifiedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "otpAttempts" integer DEFAULT 0;
    `);
    await queryRunner.query(`COMMENT ON COLUMN "delivery_assignments"."otpHash" IS 'bcrypt hash of the 6-digit delivery OTP (stored in Redis for fast lookup)'`);

    // ═══════════════════════════════════════════════════════════════════════
    // 6. PRODUCT VARIANT — Expanded fields (Phase 2, Task 2.4)
    // ═══════════════════════════════════════════════════════════════════════

    await queryRunner.query(`
      ALTER TABLE "product_variants"
        ADD COLUMN IF NOT EXISTS "weight" decimal(10, 3),
        ADD COLUMN IF NOT EXISTS "dimensions" jsonb,
        ADD COLUMN IF NOT EXISTS "barcode" varchar,
        ADD COLUMN IF NOT EXISTS "barcodeType" varchar DEFAULT 'EAN13',
        ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true,
        ADD COLUMN IF NOT EXISTS "lowStockThreshold" integer DEFAULT 5;
    `);
    await queryRunner.query(`COMMENT ON COLUMN "product_variants"."dimensions" IS 'Physical dimensions: { length, width, height, unit }'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_variants_barcode" ON "product_variants" ("barcode") WHERE "barcode" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_variants_low_stock" ON "product_variants" ("stockQuantity") WHERE "stockQuantity" <= 5`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Product variants — drop added columns
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_variants_low_stock"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_variants_barcode"`);
    await queryRunner.query(`
      ALTER TABLE "product_variants"
        DROP COLUMN IF EXISTS "weight",
        DROP COLUMN IF EXISTS "dimensions",
        DROP COLUMN IF EXISTS "barcode",
        DROP COLUMN IF EXISTS "barcodeType",
        DROP COLUMN IF EXISTS "isActive",
        DROP COLUMN IF EXISTS "lowStockThreshold";
    `);

    // Delivery assignment — drop OTP columns
    await queryRunner.query(`
      ALTER TABLE "delivery_assignments"
        DROP COLUMN IF EXISTS "otpHash",
        DROP COLUMN IF EXISTS "otpExpiresAt",
        DROP COLUMN IF EXISTS "otpVerifiedAt",
        DROP COLUMN IF EXISTS "otpAttempts";
    `);

    // Marketplace notifications
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_unread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace_notifications"`);

    // Gift cards
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_gift_cards_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_gift_cards_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gift_cards"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "gift_card_status_enum"`);

    // Product attributes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_attributes_filterable"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_attributes_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_attributes"`);

    // Seller columns — drop added columns (reverse order)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sellers_region_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sellers_verification_status"`);
    await queryRunner.query(`
      ALTER TABLE "sellers"
        DROP COLUMN IF EXISTS "region_code",
        DROP COLUMN IF EXISTS "franchise_id",
        DROP COLUMN IF EXISTS "rejectionReason",
        DROP COLUMN IF EXISTS "approvedAt",
        DROP COLUMN IF EXISTS "approvedBy",
        DROP COLUMN IF EXISTS "commissionRate",
        DROP COLUMN IF EXISTS "totalOrders",
        DROP COLUMN IF EXISTS "totalProducts",
        DROP COLUMN IF EXISTS "totalReviews",
        DROP COLUMN IF EXISTS "sellerRating",
        DROP COLUMN IF EXISTS "kycStatus",
        DROP COLUMN IF EXISTS "kycDocuments",
        DROP COLUMN IF EXISTS "address",
        DROP COLUMN IF EXISTS "bankAccountName",
        DROP COLUMN IF EXISTS "bankIfscCode",
        DROP COLUMN IF EXISTS "bankAccountNumber",
        DROP COLUMN IF EXISTS "panNumber",
        DROP COLUMN IF EXISTS "gstNumber",
        DROP COLUMN IF EXISTS "bannerUrl",
        DROP COLUMN IF EXISTS "logoUrl",
        DROP COLUMN IF EXISTS "description",
        DROP COLUMN IF EXISTS "phone",
        DROP COLUMN IF EXISTS "email",
        DROP COLUMN IF EXISTS "ownerName";
    `);
  }
}
