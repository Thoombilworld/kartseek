import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Platform-level grocery configuration, one row per key.
 *
 * `admin.grocery.settings` / `updateSettings` had no handler and no storage, so the
 * admin Settings screen rendered defaults and its Save button reported success
 * without writing anything. A key/value table rather than a wide row because these
 * settings are added one at a time by operations and a new one should not need a
 * migration.
 *
 * `regionCode` is additive: `key` stays the sole primary key, so the existing
 * upsert-by-key write in `updateSettings` is untouched and every row written
 * before this column existed reads back as the platform default (`NULL`). A
 * delivery fee, a minimum basket and a service radius are market facts (audit
 * I9) — grocery's settings read used to answer with one row for every market
 * at once, the way marketplace's read never did. `getSettings(market)` reads a
 * market's own row when one exists and falls back to this platform row
 * otherwise; nothing here adds a way to WRITE a market's row yet — that is the
 * MODULES plan's per-market editor, and a read that distinguishes markets
 * while the write cannot is honest about which half exists.
 */
@Entity('grocery_settings')
export class GrocerySetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  /** `NULL` = the platform default row. Not part of the primary key: see above. */
  @Column({ type: 'varchar', length: 2, nullable: true })
  regionCode: string | null;

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
