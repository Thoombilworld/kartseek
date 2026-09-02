import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — storage for shopper-filed product reports.
 *
 * The product page's "Report Counterfeit Product" control had no endpoint and
 * no table behind it. A counterfeit report is the one moderation signal only a
 * buyer can supply, and every one of them was being dropped.
 *
 * The unique index on `(product_id, reporter_id)` is the part that matters
 * operationally: without it, one shopper pressing the button repeatedly becomes
 * several queue entries, and the per-listing report count — which is what makes
 * a repeatedly-flagged product stand out — stops meaning anything.
 */
export class ProductReports1786501100000 implements MigrationInterface {
  name = 'ProductReports1786501100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace"."product_reports" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id"      uuid NOT NULL,
        "reporter_id"     character varying NOT NULL,
        "reason"          character varying(20) NOT NULL DEFAULT 'OTHER',
        "details"         text,
        "status"          character varying(20) NOT NULL DEFAULT 'PENDING',
        "resolution_note" text,
        "reviewed_by"     character varying,
        "reviewed_at"     TIMESTAMP,
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_reports" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_product_reports_reason" CHECK (
          "reason" IN ('COUNTERFEIT', 'PROHIBITED', 'MISLEADING', 'OFFENSIVE', 'PRICING', 'OTHER')
        ),
        CONSTRAINT "CHK_product_reports_status" CHECK (
          "status" IN ('PENDING', 'REVIEWING', 'ACTIONED', 'DISMISSED')
        ),
        CONSTRAINT "FK_product_reports_product" FOREIGN KEY ("product_id")
          REFERENCES "marketplace"."products"("id") ON DELETE CASCADE
      )
    `);

    // Admin queue: pending first, oldest first.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_reports_queue"
        ON "marketplace"."product_reports" ("status", "created_at")
    `);
    // Open-report count per listing.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_reports_product_status"
        ON "marketplace"."product_reports" ("product_id", "status")
    `);
    // One report per shopper per product.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_reports_reporter"
        ON "marketplace"."product_reports" ("product_id", "reporter_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace"."product_reports"`);
  }
}
