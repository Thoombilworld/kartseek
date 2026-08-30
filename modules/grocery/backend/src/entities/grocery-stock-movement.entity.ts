import {
  Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn,
} from 'typeorm';

/**
 * Every change to a variant's stock, and why.
 *
 * Stock was a number inside a jsonb blob that callers overwrote wholesale.
 * Nothing recorded what moved, when, or on whose instruction — so a shortfall
 * could not be traced, expired goods could not be written off distinguishably
 * from a miscount, and two concurrent updates simply lost one of the writes.
 *
 * A ledger rather than a mutable counter: `grocery_product_variants.stock` is
 * the running balance, and this is the history that explains it. `stockAfter`
 * is stored on each row so the balance at any past point is readable without
 * replaying the whole table.
 */
export type StockMovementType =
  /** Delivery from a supplier. */
  | 'RECEIVED'
  /** Sold to a customer. */
  | 'SOLD'
  /** A customer returned it and it went back on the shelf. */
  | 'RETURNED'
  /** A manual correction after a count. */
  | 'ADJUSTED'
  /** Written off — broken, spoiled, unsellable. */
  | 'DAMAGED'
  /** Written off — past its expiry date. */
  | 'EXPIRED'
  /** Moved between a seller's own locations. */
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

@Entity('grocery_stock_movements')
@Index(['variantId', 'createdAt'])
@Index(['storeId', 'createdAt'])
@Index(['batchNumber'])
export class GroceryStockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  variantId: string;

  /** Denormalised so store-wide reports do not need two joins. */
  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' })
  storeId: string;

  /** Which location the stock moved at. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  warehouseId: string | null;

  @Column({ type: 'varchar', length: 16 })
  type: StockMovementType;

  /** Signed: positive adds, negative removes. The sign is the movement. */
  @Column({ type: 'int' })
  quantity: number;

  /** The variant's balance immediately after this movement. */
  @Column({ type: 'int' })
  stockAfter: number;

  /** Which delivery this stock came from — the basis of batch history. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  batchNumber: string | null;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date | null;

  /** Free text for a correction or a write-off. */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** Who did it. Null for movements the system made, e.g. a sale. */
  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  /** The order a SOLD or RETURNED movement belongs to. */
  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
