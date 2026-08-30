import {
  Entity, Column, PrimaryGeneratedColumn, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * A place a seller holds stock.
 *
 * Stock was a single number per variant, so a seller with a back room and a
 * dark store had one pooled figure and no way to say where anything was — a
 * transfer was indistinguishable from an adjustment, and a picker sent to the
 * wrong location found an empty shelf against a system that said otherwise.
 *
 * The storefront itself is a location too: `STORE_FRONT` is created for every
 * store by the backfill so existing balances have somewhere to live, rather
 * than making "no warehouse" a special case every query has to remember.
 */
export type WarehouseType = 'STORE_FRONT' | 'WAREHOUSE' | 'DARK_STORE';

@Entity('grocery_warehouses')
@Index(['storeId'])
export class GroceryWarehouse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  /** Short human code used on picking lists — unique within a store. */
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 16, default: 'WAREHOUSE' })
  type: WarehouseType;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  /** Where stock lands when a movement does not name a location. */
  @Column({ default: false })
  isDefault: boolean;

  /**
   * A closed location keeps its balances and its history — it is removed from
   * the pickers' options, not from the record.
   */
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
