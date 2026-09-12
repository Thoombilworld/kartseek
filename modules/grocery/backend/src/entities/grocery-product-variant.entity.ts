import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { GroceryItem } from './grocery-item.entity';

/**
 * One sellable form of a product — 1 L, 2 L, 1 kg, a 6-pack.
 *
 * These lived in `grocery_items.weightVariants`, a NOT NULL jsonb blob of
 * `{ weight, price, mrp, stock }`. Nothing validated its shape (a variant of
 * `{ label, price: "free" }` was accepted), nothing could index or join it, two
 * variants could not carry their own barcode or image, and stock could not be
 * moved without rewriting the whole array — so concurrent decrements raced.
 *
 * As rows, each pack size is addressable: its own SKU, its own barcode, its own
 * price and stock. The jsonb column is kept in step by the service so anything
 * still reading it keeps working while callers migrate.
 */
@Entity({ name: 'grocery_product_variants', schema: 'grocery' })
@Index(['productId'])
export class GroceryProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => GroceryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Relation<GroceryItem>;

  /**
   * Stock-keeping unit. Unique across the platform, because it is what a
   * warehouse, a purchase order and a barcode scanner all agree on.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  sku: string;

  /** GTIN/EAN. Not unique — the same barcode legitimately appears in more than
   *  one store's catalogue for the same manufactured item. */
  @Index()
  @Column({ type: 'varchar', length: 32, nullable: true })
  barcode: string | null;

  /** What the shopper picks: "1 kg", "2 L", "Pack of 6". */
  @Column({ type: 'varchar', length: 64 })
  label: string;

  /** delivered unit — `kg`, `g`, `l`, `ml`, `piece`, `pack`. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  unitType: string | null;

  /** Numeric size in `unitType`, for sorting and price-per-unit. */
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  unitValue: string | null;

  /** List price before any discount. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  mrp: string;

  /** What the shopper pays. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  /** Below this, the variant is reported by the low-stock endpoint. */
  @Column({ type: 'int', default: 5 })
  lowStockThreshold: number;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  /** The variant shown first on the product page. */
  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isAvailable: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
