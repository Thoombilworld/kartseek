import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * The `region_code` of the row every market inherits from.
 *
 * Not `NULL`, because this column is half of the primary key and Postgres will
 * not take NULL there. `'*'` is the spelling this platform already uses for
 * "every market" in the admin permission vocabulary, and `normaliseMarket('*')`
 * returns `undefined` — so a platform-default row can never be mistaken for a
 * market's own by any scope check. Same sentinel, same reasoning, as
 * `grocery_settings` (`GrocerySetting.PLATFORM_MARKET`).
 */
export const PLATFORM_MARKET = '*';

/**
 * Pharmacy configuration, one row per key **per market**.
 *
 * `admin.pharmacy.settings` and `admin.pharmacy.updateSettings` had no handler
 * and this module had no storage at all, so the admin Settings screen had
 * nothing to read and nothing to write to. The two commands could have been
 * answered with a constant and a `success: true`, which is exactly the
 * "placeholder API" this plan exists to remove: a Save button that reports
 * success and changes nothing is worse than one that is missing.
 *
 * Key/value rather than a wide row because operations add these one at a time
 * and a new setting should not need a migration. `PHARMACY_SETTING_DEFAULTS`
 * in `admin/admin.service.ts` is the shipped fallback and the whitelist: a key
 * that is not in it is refused rather than stored, so a typo cannot look saved
 * and then be ignored by every reader.
 *
 * ── Why `region_code` is part of the PRIMARY KEY ────────────────────────────
 *
 * A dispensing fee, a delivery radius and a prescription validity window are
 * market facts — a prescription is valid for a different number of days in
 * Qatar than in India — so a market has to be able to hold its own value
 * alongside the platform default. With `key` as the sole primary key those two
 * rows cannot coexist, the market row can never be written, and the read
 * distinguishes markets in its shape while never doing so in its answer. That
 * is the mistake `GrocerySettingsMarket` had to correct after the fact
 * (grocery review I6); this table is created with the composite key already.
 */
@Entity({ name: 'pharmacy_settings', schema: 'pharmacy' })
export class PharmacySetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  /**
   * The market this row configures, or `PLATFORM_MARKET` for the fallback row
   * every market inherits from. Part of the primary key, so a write must always
   * name it: `save()` upserts on the full key, and an entity created without
   * this field would INSERT and collide with the row it meant to replace.
   */
  @PrimaryColumn({ type: 'varchar', name: 'region_code', length: 8, default: PLATFORM_MARKET })
  regionCode: string;

  /**
   * `jsonb`, because these values are numbers, booleans and strings and a
   * `varchar` column would hand every reader back the string `'false'` — which
   * is truthy.
   */
  @Column({ type: 'jsonb' })
  value: unknown;

  /** The administrator who last wrote this row, from the verified token. */
  @Column({ type: 'varchar', name: 'updated_by', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
