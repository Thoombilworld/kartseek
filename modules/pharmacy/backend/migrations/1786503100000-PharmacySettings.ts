import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — `pharmacy.pharmacy_settings`, the module's own configuration rows.
 *
 * `admin.pharmacy.settings` and `admin.pharmacy.updateSettings` had no handler
 * and this module had no settings storage of any kind, so the admin Settings
 * screen had nothing to read and its Save button nothing to write to. Answering
 * those two commands with a constant and a `success: true` would have been the
 * placeholder API the MODULES plan exists to remove, so the table comes first.
 *
 * ── The primary key is composite, from the start ────────────────────────────
 *
 * `(key, region_code)`. A prescription validity window and a delivery radius
 * are market facts, so a market must be able to hold its own value beside the
 * platform default — and under a primary key on `key` alone those two rows
 * cannot coexist, which makes the market row unwritable and the read incapable
 * of ever answering with anything but the default. Grocery shipped the single
 * key first and needed `GrocerySettingsMarket` to correct it (grocery review
 * I6); there is no reason to repeat that here.
 *
 * `region_code` defaults to `'*'` — `PLATFORM_MARKET` in
 * `entities/pharmacy-setting.entity.ts`. One character, so it fits the ISO-2
 * column without widening it, and `normaliseMarket('*')` returns `undefined`,
 * so the fallback row can never be read as some market's own.
 *
 * No seed rows. The shipped defaults live in `PHARMACY_SETTING_DEFAULTS`
 * (`admin/admin.service.ts`) and the read falls back to them, so an empty table
 * is the correct starting state: a row exists only where an administrator has
 * actually overridden something, which is also what `overridden` reports to the
 * console.
 */
export class PharmacySettings1786503100000 implements MigrationInterface {
  name = 'PharmacySettings1786503100000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SCHEMA IF NOT EXISTS "pharmacy"`);
    await q.query(
      `CREATE TABLE IF NOT EXISTS "pharmacy"."pharmacy_settings" (
         "key" character varying(64) NOT NULL,
         "region_code" character varying(8) NOT NULL DEFAULT '*',
         "value" jsonb NOT NULL,
         "updated_by" character varying,
         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
         CONSTRAINT "PK_pharmacy_settings" PRIMARY KEY ("key", "region_code")
       )`,
    );
    // The read asks for one market's rows and the platform row together, so the
    // market half of the key is the one that gets scanned on its own.
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pharmacy_settings_region"
         ON "pharmacy"."pharmacy_settings" ("region_code")`,
    );
    await q.query(
      `COMMENT ON COLUMN "pharmacy"."pharmacy_settings"."region_code" IS
         'ISO-2 market, or ''*'' for the platform defaults every market inherits'`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    // The rows are administrator-entered overrides, so dropping the table does
    // lose data. That is what a revert of "create the table" means; the values
    // it holds are all re-expressible from the console.
    await q.query(`DROP INDEX IF EXISTS "pharmacy"."IDX_pharmacy_settings_region"`);
    await q.query(`DROP TABLE IF EXISTS "pharmacy"."pharmacy_settings"`);
  }
}
