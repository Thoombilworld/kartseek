import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — the columns a ban is actually recorded in.
 *
 * `admin.service.ts` has written `UPDATE users SET status = 'BANNED',
 * banned_reason = $1` since it was first written, and `public.users` has never
 * had a `banned_reason` column. Every ban therefore failed with 42703, which
 * `applyUserStatus` correctly refuses to swallow — so the endpoint answered 500
 * and no ban has ever persisted, for any administrator, scoped or global. Found
 * by the live probe of the regional-admin scope work (2026-09-12, R4): the
 * market check passes, and then the write it guards cannot land.
 *
 * `banned_at` comes with it. A reason without a moment is not a moderation
 * record — an appeal, a retention rule and an audit all need to know when.
 *
 * Both nullable, and cleared again on an unban, so "never banned" and "ban
 * lifted" are the same shape: the account's state is `users.status`, and these
 * two say why and when it was last suspended.
 *
 * Main database — `users` lives here, see the classification note in
 * `data-source.main.ts`.
 */
export class UserBanColumns1786502000000 implements MigrationInterface {
  name = 'UserBanColumns1786502000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "banned_reason" text,
        ADD COLUMN IF NOT EXISTS "banned_at" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "banned_at",
        DROP COLUMN IF EXISTS "banned_reason"
    `);
  }
}
