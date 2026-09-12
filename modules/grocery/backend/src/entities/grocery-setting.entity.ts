import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * The `region_code` of the row every market inherits from.
 *
 * Not `NULL`, because this column is half of the primary key and Postgres will
 * not take NULL there; not `'ALL'`, because the column is `varchar(2)` to match
 * the platform's ISO-2 market codes and widening it would be a second
 * migration for a sentinel. `'*'` is the spelling already used for "everything"
 * in the admin permission vocabulary, and it is not a country code, so
 * `normaliseMarket` reads it as no market at all — which is exactly what a
 * platform-default row is.
 */
export const PLATFORM_MARKET = '*';

/**
 * Grocery configuration, one row per key **per market**.
 *
 * `admin.grocery.settings` / `updateSettings` had no handler and no storage, so the
 * admin Settings screen rendered defaults and its Save button reported success
 * without writing anything. A key/value table rather than a wide row because these
 * settings are added one at a time by operations and a new one should not need a
 * migration.
 *
 * A delivery fee, a minimum basket and a service radius are market facts (audit
 * I9) — grocery's settings read used to answer with one row for every market at
 * once, the way marketplace's read never did.
 *
 * ── Why `region_code` is part of the PRIMARY KEY ────────────────────────────
 *
 * The first attempt added it as an ordinary nullable column while `key` stayed
 * the sole primary key, and called that "additive". It was — and it made the
 * feature impossible: `('defaultDeliveryFee', NULL)` and
 * `('defaultDeliveryFee', 'QA')` cannot coexist under a primary key on `key`
 * alone, so the market row the read looks for could never be written and
 * `source` could only ever answer `'platform'` (review I6). The key is
 * therefore composite, and `region_code` is NOT NULL — Postgres does not accept
 * NULL in a primary key — with `PLATFORM_MARKET` as the sentinel for the
 * fallback row.
 *
 * `'*'` is that sentinel: one character, so it fits the existing `varchar(2)`
 * ISO-2 column without widening it; it is the spelling this platform already
 * uses for "every market" in `ALL_PERMISSIONS`; and `normaliseMarket('*')`
 * returns `undefined`, so a platform row can never be mistaken for a market's
 * own by any scope check. Rows written before the column existed are backfilled
 * to it by `migrations/1786502400000-GrocerySettingsMarket.ts`, which is what
 * keeps them valid and readable as exactly what they were: the platform
 * defaults.
 */
@Entity('grocery_settings')
export class GrocerySetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  /**
   * The market this row configures, or `PLATFORM_MARKET` for the fallback row
   * every market inherits from. Part of the primary key — see the class
   * docstring — so a write must always name it: `save()` upserts on the full
   * key, and an entity created without this field would INSERT and collide.
   *
   * `name: 'region_code'` is not decoration: without it TypeORM calls the
   * column `regionCode`, which is what R12's annotation-only change created in
   * every database where `synchronize` ran. `region_code` is the platform's one
   * spelling for this fact (see the register in `@app/common`'s market-scope),
   * `grocery_stores` and `grocery_delivery_zones` already use it, and a fifth
   * spelling of the market column is the defect AUD2-082 exists to stop.
   */
  @PrimaryColumn({ type: 'varchar', name: 'region_code', length: 2, default: PLATFORM_MARKET })
  regionCode: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: 'Admin user id of the last writer',
  })
  updatedBy: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Defaults served when a key has never been written, so the console shows the
 * values actually in force rather than blanks.
 */
export const GROCERY_SETTING_DEFAULTS: Record<string, unknown> = {
  commissionPercent: 12,
  minOrderAmount: 199,
  defaultDeliveryFee: 25,
  freeDeliveryThreshold: 499,
  maxDeliveryRadiusKm: 10,
  flashDealMinDiscountPercent: 30,
  lowStockThreshold: 10,
  autoApproveStores: false,
  autoApproveProducts: false,
  acceptingNewSellers: true,
};
