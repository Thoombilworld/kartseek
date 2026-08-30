import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Platform-level grocery configuration, one row per key.
 *
 * `admin.grocery.settings` / `updateSettings` had no handler and no storage, so the
 * admin Settings screen rendered defaults and its Save button reported success
 * without writing anything. A key/value table rather than a wide row because these
 * settings are added one at a time by operations and a new one should not need a
 * migration.
 */
@Entity('grocery_settings')
export class GrocerySetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  @Column({ type: 'varchar', length: 128, nullable: true, comment: 'Admin user id of the last writer' })
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
