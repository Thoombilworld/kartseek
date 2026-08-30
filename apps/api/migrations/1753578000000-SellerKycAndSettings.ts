import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK Marketplace — Seller KYC & Settings Tables
 *
 * Creates `seller_kyc` and `seller_settings`. Both entities have existed in code
 * since seller-service, but the tables were never created in the database: the old
 * service relied on TypeORM `synchronize` and evidently never ran against this
 * database with it enabled. Every seller route that touches KYC or settings — the
 * seller profile, dashboard, GST view, shipping, payouts — therefore threw
 * `relation "seller_kyc" does not exist` and returned a 500.
 *
 * With auto-sync now off by default (DB_SYNCHRONIZE), a migration is the only way
 * these tables get created, so they are defined explicitly here.
 *
 * Column definitions mirror seller-kyc.entity.ts and seller-settings.entity.ts.
 */
export class SellerKycAndSettings1753578000000 implements MigrationInterface {
  name = 'SellerKycAndSettings1753578000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── seller_kyc ────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "seller_kyc_status_enum" AS ENUM
          ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seller_kyc" (
        "id"                          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "seller_id"                   character varying NOT NULL,
        "ownerFullName"               character varying NOT NULL,
        "ownerEmail"                  character varying,
        "ownerPhone"                  character varying,
        "businessType"                character varying,
        "businessRegistrationNumber"  character varying,
        "taxRegistrationNumber"       character varying,
        "country_code"                character varying NOT NULL,
        "govIdFrontUrl"               character varying,
        "govIdBackUrl"                character varying,
        "businessLicenseUrl"          character varying,
        "addressProofUrl"             character varying,
        "bankVerificationUrl"         character varying,
        "status"                      "seller_kyc_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejectionReason"             text,
        "reviewedBy"                  character varying,
        "reviewedAt"                  TIMESTAMP,
        "expiresAt"                   TIMESTAMP,
        "createdAt"                   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"                   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seller_kyc" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_seller_kyc_seller_id" UNIQUE ("seller_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_kyc_seller_status"
        ON "seller_kyc" ("seller_id", "status")
    `);

    // ── seller_settings ───────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "seller_settings_fulfillmentmode_enum" AS ENUM
          ('SELF', 'KARTSEEK_FULFILLMENT', 'HYBRID');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seller_settings" (
        "id"                    uuid NOT NULL DEFAULT uuid_generate_v4(),
        "seller_id"             character varying NOT NULL,
        "storeName"             character varying,
        "storeDescription"      text,
        "logoUrl"               character varying,
        "bannerUrl"             character varying,
        "isOnline"              boolean NOT NULL DEFAULT true,
        "autoAcceptOrders"      boolean NOT NULL DEFAULT false,
        "deliveryRadius"        integer NOT NULL DEFAULT 0,
        "minimumOrder"          numeric(10,2) NOT NULL DEFAULT 0,
        "freeDeliveryThreshold" numeric(10,2) NOT NULL DEFAULT 0,
        "businessHours"         jsonb,
        "fulfillmentMode"       "seller_settings_fulfillmentmode_enum" NOT NULL DEFAULT 'SELF',
        "shippingRates"         jsonb,
        "dispatchSla"           integer NOT NULL DEFAULT 2,
        "bankDetails"           jsonb,
        "commissionRate"        numeric(5,2) NOT NULL DEFAULT 10,
        "taxId"                 character varying,
        "notifications"         jsonb,
        "twoFactorEnabled"      boolean NOT NULL DEFAULT false,
        "twoFactorSecret"       character varying,
        "createdAt"             TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"             TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seller_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_seller_settings_seller_id" UNIQUE ("seller_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "seller_settings"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "seller_settings_fulfillmentmode_enum"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_seller_kyc_seller_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "seller_kyc"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "seller_kyc_status_enum"`);
  }
}
