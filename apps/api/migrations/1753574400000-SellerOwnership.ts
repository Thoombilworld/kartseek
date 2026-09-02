import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK Marketplace — Seller Ownership Migration
 *
 * Adds `sellers.owner_id`, linking a seller account to the auth user that owns it.
 *
 * Why: every seller-scoped route (`/sellers/:id/...`) takes the seller id straight
 * from the URL. There was no column tying a seller to a user, so no ownership check
 * was expressible and the routes shipped with no authorisation at all — any caller
 * who could reach marketplace-service could read another seller's revenue and KYC,
 * change their settings, or request a payout on their behalf.
 *
 * `owner_id` is nullable ONLY so existing rows survive the migration. A NULL owner
 * means "nobody owns this seller" and SellerOwnershipGuard denies every non-admin
 * caller for such a row (fail-closed). Backfill before relying on seller routes:
 *
 *   UPDATE sellers s
 *      SET owner_id = u.id
 *     FROM users u
 *    WHERE s.owner_id IS NULL
 *      AND lower(u.email) = lower(
 *            (SELECT k."ownerEmail" FROM seller_kyc k WHERE k."sellerId" = s.id LIMIT 1)
 *          );
 *
 * Then verify none remain: SELECT count(*) FROM sellers WHERE owner_id IS NULL;
 *
 * No FK constraint is declared: `users` is owned by auth/user-service and the two
 * modules are being split onto separate schemas, so a cross-module FK would become
 * invalid. Referential integrity is enforced in the application layer.
 */
export class SellerOwnership1753574400000 implements MigrationInterface {
  name = 'SellerOwnership1753574400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sellers"
        ADD COLUMN IF NOT EXISTS "owner_id" uuid
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sellers_owner_id"
        ON "sellers" ("owner_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sellers_owner_id"`);
    await queryRunner.query(`ALTER TABLE "sellers" DROP COLUMN IF EXISTS "owner_id"`);
  }
}
