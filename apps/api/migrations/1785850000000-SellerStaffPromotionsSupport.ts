import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — durable storage for seller staff, promotions and support tickets
 *
 * All three were implemented as pure fabrication:
 *
 *   addStaff()      → `{ success: true, staffId: 'STF-' + Date.now() }`
 *   createPromotion() → `{ success: true, promotionId: 'PROMO-' + … }`
 *   createTicket()  → `{ success: true, ticketId: 'TKT-' + … }`
 *
 * with the matching reads hard-coded to `[]`. The portal reported every one of
 * these as saved and none of them existed, so a seller could invite a colleague,
 * launch a discount, or raise a support ticket about a lost payout and have
 * nothing recorded anywhere.
 *
 * Kept in the `marketplace` schema next to `sellers`, with a foreign key so a
 * row cannot outlive the seller it belongs to.
 */
export class SellerStaffPromotionsSupport1785850000000 implements MigrationInterface {
  name = 'SellerStaffPromotionsSupport1785850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Staff ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace"."seller_staff" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "seller_id"  uuid NOT NULL,
        "name"       character varying NOT NULL,
        "email"      character varying NOT NULL,
        "phone"      character varying,
        "role"       character varying NOT NULL DEFAULT 'support',
        "status"     character varying NOT NULL DEFAULT 'active',
        "lastActive" TIMESTAMP,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seller_staff" PRIMARY KEY ("id"),
        CONSTRAINT "FK_seller_staff_seller" FOREIGN KEY ("seller_id")
          REFERENCES "marketplace"."sellers"("id") ON DELETE CASCADE
      )
    `);
    // One person cannot be added twice to the same store.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_seller_staff_seller_email"
        ON "marketplace"."seller_staff" ("seller_id", lower("email"))
    `);

    // ── Promotions ───────────────────────────────────────────────────────────
    // Distinct from `coupons`: a coupon is a code the customer types, a
    // promotion is a seller-run offer that may apply automatically.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace"."seller_promotions" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "seller_id"      uuid NOT NULL,
        "name"           character varying NOT NULL,
        "code"           character varying,
        "type"           character varying NOT NULL DEFAULT 'percentage',
        "value"          numeric(10,2) NOT NULL DEFAULT 0,
        "maxDiscount"    numeric(10,2),
        "minOrderValue"  numeric(10,2) NOT NULL DEFAULT 0,
        "usageCount"     integer NOT NULL DEFAULT 0,
        "usageLimit"     integer,
        "status"         character varying NOT NULL DEFAULT 'active',
        "startDate"      TIMESTAMP,
        "endDate"        TIMESTAMP,
        "applicableProducts" jsonb,
        "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seller_promotions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_seller_promotions_seller" FOREIGN KEY ("seller_id")
          REFERENCES "marketplace"."sellers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_promotions_seller_status"
        ON "marketplace"."seller_promotions" ("seller_id", "status")
    `);
    // A promo code has to be unique within the store that issued it.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_seller_promotions_seller_code"
        ON "marketplace"."seller_promotions" ("seller_id", upper("code"))
        WHERE "code" IS NOT NULL
    `);

    // ── Support ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace"."seller_support_tickets" (
        "id"        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reference" character varying NOT NULL,
        "seller_id" uuid NOT NULL,
        "subject"   character varying NOT NULL,
        "category"  character varying NOT NULL DEFAULT 'general',
        "priority"  character varying NOT NULL DEFAULT 'medium',
        "status"    character varying NOT NULL DEFAULT 'open',
        -- Append-only thread: [{ sender, body, at }]
        "messages"  jsonb NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seller_support_tickets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_seller_support_reference" UNIQUE ("reference"),
        CONSTRAINT "FK_seller_support_seller" FOREIGN KEY ("seller_id")
          REFERENCES "marketplace"."sellers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_support_seller_status"
        ON "marketplace"."seller_support_tickets" ("seller_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace"."seller_support_tickets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace"."seller_promotions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace"."seller_staff"`);
  }
}
