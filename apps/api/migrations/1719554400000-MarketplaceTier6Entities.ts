import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK Marketplace — Tier 6 Schema Migration
 *
 * Creates tables for:
 *  - return_requests (return lifecycle management)
 *  - coupons (discount coupon management)
 *  - coupon_usages (redemption tracking)
 *  - shipment_tracking_events (immutable tracking log)
 *  - product_variants (SKU-level variants)
 *  - product_questions (customer Q&A)
 *  - product_answers (Q&A responses)
 *  - delivery_assignments (partner assignment & POD)
 */
export class MarketplaceTier6Entities1719554400000 implements MigrationInterface {
  name = 'MarketplaceTier6Entities1719554400000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── Return Request Status Enum ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "return_reason_enum" AS ENUM ('WRONG_ITEM', 'DEFECTIVE', 'DAMAGED_IN_TRANSIT', 'NOT_AS_DESCRIBED', 'SIZE_FIT_ISSUE', 'QUALITY_ISSUE', 'LATE_DELIVERY', 'CHANGED_MIND', 'OTHER');
      CREATE TYPE "return_status_enum" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'RECEIVED', 'QC_PASSED', 'QC_FAILED', 'REFUNDED', 'REPLACEMENT_SHIPPED', 'CLOSED');
      CREATE TYPE "return_resolution_enum" AS ENUM ('REFUND', 'REPLACEMENT', 'STORE_CREDIT');
      CREATE TYPE "qc_condition_enum" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED');
    `);

    // ── Return Requests ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "return_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "returnNumber" varchar UNIQUE NOT NULL,
        "order_id" uuid NOT NULL REFERENCES "marketplace_orders"("id") ON DELETE CASCADE,
        "customer_id" varchar NOT NULL,
        "customerName" varchar,
        "seller_id" varchar NOT NULL REFERENCES "sellers"("id"),
        "items" jsonb NOT NULL,
        "reason" "return_reason_enum" NOT NULL,
        "reasonDetail" text,
        "status" "return_status_enum" DEFAULT 'REQUESTED',
        "resolutionType" "return_resolution_enum" DEFAULT 'REFUND',
        "refundAmount" decimal(12, 2) NOT NULL,
        "photoUrls" text,
        "pickupPhotoUrls" text,
        "pickupAddress" jsonb,
        "pickupPartnerId" varchar,
        "pickupScheduledAt" TIMESTAMP,
        "pickedUpAt" TIMESTAMP,
        "receivedAt" TIMESTAMP,
        "refundedAt" TIMESTAMP,
        "qcCondition" "qc_condition_enum",
        "qcNotes" text,
        "rejectionReason" varchar,
        "franchise_id" varchar,
        "region_code" varchar,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_return_order_status" ON "return_requests"("order_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_return_customer" ON "return_requests"("customer_id", "createdAt");
      CREATE INDEX IF NOT EXISTS "IDX_return_seller" ON "return_requests"("seller_id", "status");
    `);

    // ── Coupon Enums ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "coupon_type_enum" AS ENUM ('PERCENTAGE', 'FLAT', 'FREE_SHIPPING', 'CASHBACK', 'BUY_X_GET_Y');
    `);

    // ── Coupons ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(30) UNIQUE NOT NULL,
        "title" varchar,
        "description" text,
        "discountType" "coupon_type_enum" DEFAULT 'PERCENTAGE',
        "discountValue" decimal(10, 2) NOT NULL,
        "maxDiscount" decimal(10, 2),
        "minOrderValue" decimal(10, 2) DEFAULT 0,
        "usageLimit" int DEFAULT -1,
        "usageLimitPerUser" int DEFAULT 1,
        "usedCount" int DEFAULT 0,
        "validFrom" TIMESTAMP NOT NULL,
        "validUntil" TIMESTAMP NOT NULL,
        "isActive" boolean DEFAULT true,
        "autoApply" boolean DEFAULT false,
        "firstOrderOnly" boolean DEFAULT false,
        "seller_id" varchar REFERENCES "sellers"("id"),
        "applicableProductIds" text,
        "applicableCategoryIds" text,
        "applicablePaymentMethods" text,
        "bankName" varchar,
        "franchise_id" varchar,
        "region_code" varchar,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_coupon_code" ON "coupons"("code");
      CREATE INDEX IF NOT EXISTS "IDX_coupon_seller" ON "coupons"("seller_id", "isActive");
      CREATE INDEX IF NOT EXISTS "IDX_coupon_validity" ON "coupons"("validFrom", "validUntil");
    `);

    // ── Coupon Usages ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coupon_usages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "coupon_id" uuid NOT NULL REFERENCES "coupons"("id") ON DELETE CASCADE,
        "customer_id" varchar NOT NULL,
        "order_id" varchar NOT NULL,
        "discountApplied" decimal(10, 2) NOT NULL,
        "redeemedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_usage_coupon_customer" ON "coupon_usages"("coupon_id", "customer_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_usage_order" ON "coupon_usages"("order_id");
    `);

    // ── Tracking Event Enums ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "tracking_status_enum" AS ENUM ('LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'REACHED_HUB', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERED', 'RETURNED_TO_ORIGIN', 'LOST', 'DAMAGED', 'HELD_AT_CUSTOMS', 'EXCEPTION');
      CREATE TYPE "tracking_source_enum" AS ENUM ('COURIER_API', 'WEBHOOK', 'MANUAL', 'PARTNER_APP', 'SYSTEM');
    `);

    // ── Shipment Tracking Events ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipment_tracking_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "marketplace_orders"("id") ON DELETE CASCADE,
        "trackingId" varchar NOT NULL,
        "courierName" varchar,
        "status" "tracking_status_enum" NOT NULL,
        "description" text,
        "location" varchar,
        "coordinates" jsonb,
        "timestamp" TIMESTAMP NOT NULL,
        "courierEventCode" varchar,
        "deliveryPartnerId" varchar,
        "photoUrls" text,
        "receivedBy" varchar,
        "otpVerified" varchar,
        "source" "tracking_source_enum" DEFAULT 'SYSTEM',
        "createdAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_tracking_order" ON "shipment_tracking_events"("order_id", "timestamp");
      CREATE INDEX IF NOT EXISTS "IDX_tracking_id" ON "shipment_tracking_events"("trackingId");
    `);

    // ── Product Variants ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_variants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "sku" varchar UNIQUE NOT NULL,
        "barcode" varchar,
        "attributes" jsonb NOT NULL,
        "variantName" varchar,
        "mrp" decimal(10, 2) NOT NULL,
        "sellingPrice" decimal(10, 2) NOT NULL,
        "costPrice" decimal(10, 2),
        "stockQuantity" int DEFAULT 0,
        "lowStockThreshold" int DEFAULT 5,
        "weightKg" decimal(6, 3),
        "dimensions" jsonb,
        "imageUrls" text,
        "isActive" boolean DEFAULT true,
        "sortOrder" int DEFAULT 0,
        "seller_id" varchar,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_variant_product" ON "product_variants"("product_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_variant_sku" ON "product_variants"("sku");
      CREATE INDEX IF NOT EXISTS "IDX_variant_active" ON "product_variants"("product_id", "isActive");
    `);

    // ── Product Q&A ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_questions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "customer_id" varchar NOT NULL,
        "customerName" varchar,
        "questionText" text NOT NULL,
        "upvoteCount" int DEFAULT 0,
        "status" varchar DEFAULT 'PUBLISHED',
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_question_product" ON "product_questions"("product_id", "createdAt");
      CREATE INDEX IF NOT EXISTS "IDX_question_customer" ON "product_questions"("customer_id");
    `);

    await queryRunner.query(`
      CREATE TYPE "answer_role_enum" AS ENUM ('SELLER', 'CUSTOMER', 'ADMIN');
      CREATE TABLE IF NOT EXISTS "product_answers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL REFERENCES "product_questions"("id") ON DELETE CASCADE,
        "author_id" varchar NOT NULL,
        "authorName" varchar,
        "authorRole" "answer_role_enum" DEFAULT 'CUSTOMER',
        "answerText" text NOT NULL,
        "helpfulCount" int DEFAULT 0,
        "isAccepted" boolean DEFAULT false,
        "status" varchar DEFAULT 'PUBLISHED',
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_answer_question" ON "product_answers"("question_id", "createdAt");
    `);

    // ── Delivery Assignment Enums ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "delivery_status_enum" AS ENUM ('PENDING', 'OFFERED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED');
      CREATE TYPE "delivery_method_enum" AS ENUM ('AUTO', 'MANUAL', 'BROADCAST');
      CREATE TYPE "delivery_mode_enum" AS ENUM ('HANDED', 'DOORSTEP', 'NEIGHBOR', 'GUARD');
    `);

    // ── Delivery Assignments ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "delivery_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "marketplace_orders"("id") ON DELETE CASCADE,
        "return_request_id" varchar,
        "partner_id" varchar NOT NULL,
        "partnerName" varchar,
        "partnerPhone" varchar,
        "status" "delivery_status_enum" DEFAULT 'PENDING',
        "isReturnPickup" boolean DEFAULT false,
        "assignmentMethod" "delivery_method_enum" DEFAULT 'AUTO',
        "pickupLocation" jsonb NOT NULL,
        "dropLocation" jsonb NOT NULL,
        "distanceKm" decimal(8, 2),
        "estimatedMinutes" int,
        "deliveryFee" decimal(10, 2),
        "partnerEarnings" decimal(10, 2),
        "deliveryOtp" varchar,
        "otpVerified" boolean DEFAULT false,
        "proofPhotos" text,
        "deliveryMode" "delivery_mode_enum",
        "deliveryNotes" text,
        "deliveryCoordinates" jsonb,
        "codAmount" decimal(10, 2),
        "codCollected" boolean DEFAULT false,
        "offeredAt" TIMESTAMP,
        "acceptedAt" TIMESTAMP,
        "pickedUpAt" TIMESTAMP,
        "deliveredAt" TIMESTAMP,
        "failureReason" text,
        "franchise_id" varchar,
        "region_code" varchar,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_delivery_order" ON "delivery_assignments"("order_id");
      CREATE INDEX IF NOT EXISTS "IDX_delivery_partner" ON "delivery_assignments"("partner_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_delivery_status" ON "delivery_assignments"("status", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "delivery_assignments" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "product_answers" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "product_questions" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "product_variants" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "shipment_tracking_events" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "coupon_usages" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "coupons" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "return_requests" CASCADE');
    await queryRunner.query('DROP TYPE IF EXISTS "delivery_mode_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "delivery_method_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "delivery_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "answer_role_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "tracking_source_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "tracking_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "coupon_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "qc_condition_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "return_resolution_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "return_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "return_reason_enum"');
  }
}
