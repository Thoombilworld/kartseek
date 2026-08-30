import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK Marketplace — Brand Follow & Brand Updates Migration
 *
 * Creates the following tables and schema changes:
 *  1. `brand_follows` — Many-to-many user↔brand follows with composite unique index
 *  2. `brand_updates` — Brand announcements/launches/offers feed
 *  3. `brands` table — Add `description`, `bannerUrl`, and `followerCount` columns
 *
 * Prerequisites: Migrations 1720310400000 (AuditRemediation) must have run first.
 */
export class BrandFollowAndUpdates1720396800000 implements MigrationInterface {
  name = 'BrandFollowAndUpdates1720396800000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ═══════════════════════════════════════════════════════════════════════
    // 1. BRANDS TABLE — Add new columns
    // ═══════════════════════════════════════════════════════════════════════

    await queryRunner.query(`
      ALTER TABLE "brands"
        ADD COLUMN IF NOT EXISTS "description" text,
        ADD COLUMN IF NOT EXISTS "bannerUrl" varchar,
        ADD COLUMN IF NOT EXISTS "followerCount" integer NOT NULL DEFAULT 0;
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 2. BRAND FOLLOWS TABLE
    // ═══════════════════════════════════════════════════════════════════════

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "brand_follows" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"    varchar NOT NULL,
        "brand_id"   uuid NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Composite unique index — a user can follow a brand only once
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_follows_user_brand"
        ON "brand_follows" ("user_id", "brand_id");
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. BRAND UPDATES TABLE
    // ═══════════════════════════════════════════════════════════════════════

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "brand_updates" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "brand_id"   uuid NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
        "type"       varchar NOT NULL DEFAULT 'ANNOUNCEMENT',
        "title"      varchar NOT NULL,
        "message"    text NOT NULL,
        "imageUrl"   varchar,
        "actionUrl"  varchar,
        "product_id" uuid,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Index for feed queries — sorted by brand + date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_brand_updates_brand_date"
        ON "brand_updates" ("brand_id", "createdAt" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brand_updates_brand_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_updates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brand_follows_user_brand"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_follows"`);

    await queryRunner.query(`
      ALTER TABLE "brands"
        DROP COLUMN IF EXISTS "followerCount",
        DROP COLUMN IF EXISTS "bannerUrl",
        DROP COLUMN IF EXISTS "description";
    `);
  }
}
