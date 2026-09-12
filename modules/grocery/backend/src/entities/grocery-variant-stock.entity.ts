import { Entity, Column, PrimaryGeneratedColumn, Index, Unique, UpdateDateColumn } from 'typeorm';

/**
 * How much of one variant sits in one location.
 *
 * `grocery_product_variants.stock` stays as the seller's total across every
 * location — it is what the storefront asks ("can I buy this at all") and what
 * the low-stock report reads. This is the breakdown behind it, and the pair is
 * kept consistent inside the same transaction that writes a movement.
 *
 * Denormalising the total rather than summing on read is deliberate: the
 * storefront reads it on every product query, and a sum across locations for
 * every variant on every page load is the wrong trade.
 */
@Entity({ name: 'grocery_variant_stock', schema: 'grocery' })
@Unique(['variantId', 'warehouseId'])
@Index(['warehouseId'])
export class GroceryVariantStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  variantId: string;

  @Column({ type: 'uuid' })
  warehouseId: string;

  /** Denormalised so per-store queries do not need to join through the variant. */
  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  /**
   * Held for orders that are picked but not yet dispatched.
   *
   * Sellable stock is `stock - reserved`. Keeping them apart means a picker
   * cannot promise the same unit twice, and an abandoned order releases its
   * hold without a correction that looks like a miscount.
   */
  @Column({ type: 'int', default: 0 })
  reserved: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
