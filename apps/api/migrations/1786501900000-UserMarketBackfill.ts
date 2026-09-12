import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — make `users.region_code` true for customers, not only for staff.
 *
 * `1786501600000-UserRegionScope` added the column for the regional-admin lock,
 * so only staff accounts ever received a value. Every admin query that needed
 * "which market is this user in?" therefore reached for `users.country`, which
 * carries a `'IN'` DEFAULT and is `'IN'` on every row in dev — so an IN-locked
 * admin listed and banned Qatari customers and a QA-locked admin saw nobody
 * (2026-09-12 audit, V6 / AUD2-009).
 *
 * The backfill derives the market from the customer's most recent order, which
 * is the one signal on the platform that is actually a market rather than a
 * default: `"order".orders.region_code` is written from the resolved market at
 * checkout. A customer with no order keeps NULL and is excluded from a locked
 * admin's list — fail closed, the same rule `assertInMarket(null, scope)`
 * applies to every other unattributable row.
 *
 * `users.country` is NOT dropped, and nothing here reads it. It stays the
 * customer's own declared country, for addresses, tax and localisation; it is
 * simply not the column staff scope is decided on. `users.region_code` is, and
 * it is the column the market claim in the JWT is minted from.
 *
 * ── Reversibility ──────────────────────────────────────────────────────────
 *
 * A blanket `SET region_code = NULL` in `down()` would erase the staff locks
 * this migration never touched, so the rows it does write are recorded in
 * `public.user_region_backfill_1786501900000` together with the value written.
 * `down()` reverts exactly those rows, and only where the value is still the
 * one this migration put there — an operator's later assignment survives a
 * revert. The ledger table is dropped with it.
 *
 * Main database (`users` + the `order` schema both live there) — see the
 * classification note in `data-source.main.ts`.
 */
export class UserMarketBackfill1786501900000 implements MigrationInterface {
  name = 'UserMarketBackfill1786501900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "public"."user_region_backfill_1786501900000" (
        "user_id" uuid PRIMARY KEY,
        "region_code" character varying NOT NULL,
        "backfilled_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // `DISTINCT ON` keeps one row per customer — the most recent order that
    // carries a usable market. The ISO-2 filter is what lets the CHECK below be
    // added in the same migration: a malformed `region_code` on an order falls
    // through to that customer's previous order rather than failing the whole
    // run, and a customer with nothing usable simply stays NULL.
    await queryRunner.query(`
      WITH latest AS (
        SELECT DISTINCT ON ("customerId") "customerId", UPPER("region_code") AS "region_code"
          FROM "order"."orders"
         WHERE "region_code" ~* '^[a-z]{2}$'
         ORDER BY "customerId", "placedAt" DESC
      ), backfilled AS (
        UPDATE "users" u
           SET "region_code" = l."region_code"
          FROM latest l
         WHERE u."id"::text = l."customerId"
           AND (u."region_code" IS NULL OR u."region_code" = '')
        RETURNING u."id", u."region_code"
      )
      INSERT INTO "public"."user_region_backfill_1786501900000" ("user_id", "region_code")
      SELECT "id", "region_code" FROM backfilled
      ON CONFLICT ("user_id") DO NOTHING
    `);

    // Staff accounts are the authority on their own market; never overwritten
    // above (the guard clause excludes a populated column), asserted here.
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_region_code_iso2"`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "CHK_users_region_code_iso2"
        CHECK ("region_code" IS NULL OR "region_code" ~ '^[A-Z]{2}$')
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_region_code" ON "users" ("region_code")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only the rows `up()` wrote, and only while they still hold the value it
    // wrote: a staff lock is untouched because it was never in the ledger, and
    // a market an operator assigned afterwards is left alone because it no
    // longer matches.
    await queryRunner.query(`
      UPDATE "users" u
         SET "region_code" = NULL
        FROM "public"."user_region_backfill_1786501900000" b
       WHERE u."id" = b."user_id"
         AND u."region_code" = b."region_code"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "public"."user_region_backfill_1786501900000"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_region_code"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_region_code_iso2"`,
    );
  }
}
