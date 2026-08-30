import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — Seller module identity on the auth user
 *
 * Adds `users.seller_type`: which seller portal an account belongs to
 * (marketplace | grocery | restaurant | pharmacy | doctor | hotel | taxi | delivery).
 *
 * Why: the web client and the seller app both gate portal access on a `sellerType`
 * claim, but nothing ever issued one — it appeared in a single WebSocket gateway
 * file and nowhere in the auth path. Both isolation layers therefore failed open:
 * `SellerRoleGuard` treats a session without `sellerType` as allowed, and the
 * middleware's cross-module check is skipped when the cookie is absent. An ordinary
 * customer account could open all eight seller portals. The only reason a seller
 * type existed at all was that the mocked login pages let the user pick it.
 *
 * Why here and not on `sellers`: that table is marketplace-specific (storeSlug,
 * commissionRate, totalProducts) and holds no module column, while `users.role`
 * cannot distinguish marketplace from hotel or taxi — all three are plain `seller`.
 * The claim has to be readable at login without a cross-service join, so it belongs
 * on the row login already reads.
 *
 * Nullable on purpose: a NULL means "not a seller portal account". Once
 * SellerRoleGuard is tightened (Phase 2) that is fail-closed — NULL opens nothing.
 *
 * The backfill only sets values it can derive with certainty. A plain `seller` is
 * mapped to `marketplace` ONLY when the account actually owns a row in `sellers`,
 * which is the marketplace seller table; anything else is left NULL for a human to
 * classify rather than guessed at.
 */
export class UserSellerType1785600000000 implements MigrationInterface {
  name = 'UserSellerType1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "seller_type" character varying
    `);

    // Roles that name their module unambiguously.
    await queryRunner.query(`
      UPDATE "users" SET "seller_type" = CASE lower("role")
        WHEN 'grocery_seller'    THEN 'grocery'
        WHEN 'restaurant_seller' THEN 'restaurant'
        WHEN 'pharmacy_seller'   THEN 'pharmacy'
        WHEN 'pharmacist'        THEN 'pharmacy'
        WHEN 'doctor'            THEN 'doctor'
        ELSE "seller_type"
      END
      WHERE "seller_type" IS NULL
        AND lower("role") IN ('grocery_seller','restaurant_seller','pharmacy_seller','pharmacist','doctor')
    `);

    // A bare `seller` is only known to be a marketplace seller if it owns one.
    //
    // The schema qualifier is load-bearing. A `public.sellers` table shadows the
    // real `marketplace.sellers`, and the unqualified `FROM "sellers"` this used
    // to carry resolved to the decoy — whose single row has a NULL `owner_id`.
    // The EXISTS therefore never matched, every bare seller was left NULL, and
    // the seeded `seller@kartseek.com` (which does own a real marketplace
    // seller row) got no `seller_type` — so the portal answered "This seller
    // account is not assigned to a portal yet."
    await queryRunner.query(`
      UPDATE "users" u
         SET "seller_type" = 'marketplace'
       WHERE u."seller_type" IS NULL
         AND lower(u."role") = 'seller'
         AND EXISTS (SELECT 1 FROM "marketplace"."sellers" s WHERE s."owner_id" = u."id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_seller_type"
        ON "users" ("seller_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_seller_type"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "seller_type"`);
  }
}
