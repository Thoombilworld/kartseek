import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK Marketplace — Initial Schema Migration
 *
 * Creates all marketplace tables:
 *  - categories (closure table tree)
 *  - brands
 *  - sellers
 *  - products
 *  - product_listings
 *  - product_images
 *  - reviews
 *  - wishlists
 *  - marketplace_orders
 *  - seller_settings
 *  - seller_kyc
 *  - users
 */
export class InitialMarketplaceSchema1719468000000 implements MigrationInterface {
  name = 'InitialMarketplaceSchema1719468000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Users ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('CUSTOMER', 'SELLER', 'DRIVER', 'FRANCHISE', 'ADMIN', 'SUPER_ADMIN');
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar UNIQUE NOT NULL,
        "phone" varchar,
        "passwordHash" varchar NOT NULL,
        "role" "user_role_enum" DEFAULT 'CUSTOMER',
        "isActive" boolean DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);

    // ── Categories (tree) ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "slug" varchar UNIQUE NOT NULL,
        "icon" varchar,
        "image_url" varchar,
        "is_active" boolean DEFAULT true,
        "sort_order" int DEFAULT 0,
        "parentId" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_categories_parent" ON "categories"("parentId");
      CREATE INDEX IF NOT EXISTS "IDX_categories_slug" ON "categories"("slug");
    `);

    // TypeORM closure table for tree queries
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories_closure" (
        "id_ancestor" uuid NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
        "id_descendant" uuid NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
        PRIMARY KEY ("id_ancestor", "id_descendant")
      );
      CREATE INDEX IF NOT EXISTS "IDX_cat_closure_anc" ON "categories_closure"("id_ancestor");
      CREATE INDEX IF NOT EXISTS "IDX_cat_closure_desc" ON "categories_closure"("id_descendant");
    `);

    // ── Brands ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "brands" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "slug" varchar UNIQUE NOT NULL,
        "logoUrl" varchar,
        "isVerified" boolean DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_brands_slug" ON "brands"("slug");
    `);

    // ── Sellers ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sellers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "businessName" varchar NOT NULL,
        "storeSlug" varchar UNIQUE NOT NULL,
        "verificationStatus" varchar DEFAULT 'PENDING',
        "sellerRating" float DEFAULT 0,
        "franchise_id" varchar,
        "region_code" varchar,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_sellers_region" ON "sellers"("region_code");
      CREATE INDEX IF NOT EXISTS "IDX_sellers_status" ON "sellers"("verificationStatus");
    `);

    // ── Products ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "slug" varchar UNIQUE NOT NULL,
        "short_description" text,
        "long_description" text,
        "globalTradeItemNumber" varchar,
        "mrp" decimal(12,2) DEFAULT 0,
        "status" varchar DEFAULT 'DRAFT',
        "approval_status" varchar DEFAULT 'PENDING',
        "is_active" boolean DEFAULT false,
        "averageRating" float DEFAULT 0,
        "reviewCount" int DEFAULT 0,
        "seller_id" varchar,
        "brand_id" uuid REFERENCES "brands"("id"),
        "category_id" uuid REFERENCES "categories"("id"),
        "subcategory_id" uuid REFERENCES "categories"("id"),
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_products_slug" ON "products"("slug");
      CREATE INDEX IF NOT EXISTS "IDX_products_seller" ON "products"("seller_id");
      CREATE INDEX IF NOT EXISTS "IDX_products_category" ON "products"("category_id");
      CREATE INDEX IF NOT EXISTS "IDX_products_status" ON "products"("approval_status", "is_active");
    `);

    // ── Product Listings ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_listings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sellerSku" varchar NOT NULL,
        "sellingPrice" decimal(12,2) NOT NULL,
        "stockQuantity" int DEFAULT 0,
        "condition" varchar DEFAULT 'NEW',
        "isBuyBoxWinner" boolean DEFAULT false,
        "isFulfilledByKartseek" boolean DEFAULT false,
        "isActive" boolean DEFAULT true,
        "product_id" uuid REFERENCES "products"("id") ON DELETE CASCADE,
        "seller_id" uuid REFERENCES "sellers"("id"),
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now(),
        UNIQUE ("product_id", "seller_id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_listings_product" ON "product_listings"("product_id");
      CREATE INDEX IF NOT EXISTS "IDX_listings_seller" ON "product_listings"("seller_id");
    `);

    // ── Product Images ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_images" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "url" varchar NOT NULL,
        "altText" varchar,
        "sortOrder" int DEFAULT 0,
        "isPrimary" boolean DEFAULT false,
        "product_id" uuid REFERENCES "products"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_images_product" ON "product_images"("product_id");
    `);

    // ── Reviews ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "productId" uuid NOT NULL,
        "customerId" varchar NOT NULL,
        "customerName" varchar,
        "rating" int NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "title" varchar,
        "comment" text,
        "imageUrls" jsonb DEFAULT '[]',
        "isVerifiedPurchase" boolean DEFAULT false,
        "helpfulCount" int DEFAULT 0,
        "status" varchar DEFAULT 'PENDING',
        "sellerReply" text,
        "sellerRepliedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_reviews_product" ON "reviews"("productId");
      CREATE INDEX IF NOT EXISTS "IDX_reviews_customer" ON "reviews"("customerId");
      CREATE INDEX IF NOT EXISTS "IDX_reviews_status" ON "reviews"("status");
    `);

    // ── Wishlists ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wishlists" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customerId" varchar NOT NULL,
        "productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT now(),
        UNIQUE ("customerId", "productId")
      );
      CREATE INDEX IF NOT EXISTS "IDX_wishlist_customer" ON "wishlists"("customerId");
    `);

    // ── Marketplace Orders ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED');
      CREATE TYPE "payment_method_enum" AS ENUM ('ONLINE', 'COD', 'WALLET', 'UPI', 'UPI');
      CREATE TYPE "payment_status_enum" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

      CREATE TABLE IF NOT EXISTS "marketplace_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderNumber" varchar UNIQUE NOT NULL,
        "customer_id" varchar NOT NULL,
        "customerName" varchar,
        "seller_id" varchar NOT NULL,
        "items" jsonb NOT NULL,
        "itemTotal" decimal(12,2) NOT NULL,
        "deliveryFee" decimal(10,2) DEFAULT 0,
        "taxAmount" decimal(10,2) DEFAULT 0,
        "discountAmount" decimal(10,2) DEFAULT 0,
        "grandTotal" decimal(12,2) NOT NULL,
        "status" "order_status_enum" DEFAULT 'PENDING',
        "paymentMethod" "payment_method_enum" DEFAULT 'ONLINE',
        "paymentStatus" "payment_status_enum" DEFAULT 'PENDING',
        "shippingAddress" jsonb,
        "trackingId" varchar,
        "courierName" varchar,
        "franchise_id" varchar,
        "region_code" varchar,
        "cancellationReason" text,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_orders_seller_status" ON "marketplace_orders"("seller_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_orders_customer_date" ON "marketplace_orders"("customer_id", "createdAt" DESC);
    `);

    // ── Seller Settings ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "fulfillment_mode_enum" AS ENUM ('SELF', 'KARTSEEK_FULFILLMENT', 'HYBRID');

      CREATE TABLE IF NOT EXISTS "seller_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "seller_id" uuid UNIQUE NOT NULL REFERENCES "sellers"("id"),
        "storeName" varchar,
        "storeDescription" text,
        "logoUrl" varchar,
        "bannerUrl" varchar,
        "isOnline" boolean DEFAULT true,
        "autoAcceptOrders" boolean DEFAULT false,
        "deliveryRadius" int DEFAULT 0,
        "minimumOrder" decimal(10,2) DEFAULT 0,
        "freeDeliveryThreshold" decimal(10,2) DEFAULT 0,
        "businessHours" jsonb,
        "fulfillmentMode" "fulfillment_mode_enum" DEFAULT 'SELF',
        "shippingRates" jsonb,
        "dispatchSla" int DEFAULT 2,
        "bankDetails" jsonb,
        "commissionRate" decimal(5,2) DEFAULT 10,
        "taxId" varchar,
        "notifications" jsonb,
        "twoFactorEnabled" boolean DEFAULT false,
        "twoFactorSecret" varchar,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);

    // ── Seller KYC ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "kyc_status_enum" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

      CREATE TABLE IF NOT EXISTS "seller_kyc" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "seller_id" uuid UNIQUE NOT NULL REFERENCES "sellers"("id"),
        "ownerFullName" varchar NOT NULL,
        "ownerEmail" varchar,
        "ownerPhone" varchar,
        "businessType" varchar,
        "businessRegistrationNumber" varchar,
        "taxRegistrationNumber" varchar,
        "country_code" varchar NOT NULL,
        "govIdFrontUrl" varchar,
        "govIdBackUrl" varchar,
        "businessLicenseUrl" varchar,
        "addressProofUrl" varchar,
        "bankVerificationUrl" varchar,
        "status" "kyc_status_enum" DEFAULT 'PENDING',
        "rejectionReason" text,
        "reviewedBy" varchar,
        "reviewedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_kyc_seller_status" ON "seller_kyc"("seller_id", "status");
    `);

    // ── Full-text search index for products ────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_fts" ON "products"
        USING GIN (to_tsvector('english', COALESCE("name", '') || ' ' || COALESCE("short_description", '')));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "seller_kyc" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "seller_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace_orders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wishlists" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_images" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_listings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sellers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brands" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories_closure" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "kyc_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "fulfillment_mode_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
