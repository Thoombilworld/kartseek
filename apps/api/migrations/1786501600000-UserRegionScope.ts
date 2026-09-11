import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — market scope on staff accounts.
 *
 * `users.region_code` is the market a staff account administers and
 * `users.region_locked` says whether it may act anywhere else. Together they
 * define the regional admin: a locked ADMIN whose promotions, banners,
 * coupons and flash deals are forced into one market by the gateway, from a
 * claim signed into the JWT at login. SUPER_ADMIN is global regardless.
 *
 * Why here: the lock existed only in the admin console's login page, as a
 * demo table of accounts, while the API accepted any market from any admin
 * role. Enforcement has to start from a column the token is minted from.
 *
 * Both nullable/defaulted, so every existing account keeps working as a
 * global one until an operator assigns a market.
 */
export class UserRegionScope1786501600000 implements MigrationInterface {
  name = 'UserRegionScope1786501600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "region_code" character varying,
        ADD COLUMN IF NOT EXISTS "region_locked" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "region_locked",
        DROP COLUMN IF EXISTS "region_code"
    `);
  }
}
