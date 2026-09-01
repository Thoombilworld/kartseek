import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Product } from './product.entity';

/**
 * ProductVariant — SKU-level variants for a parent product.
 *
 * Each variant represents a unique combination of attributes (size, color, storage, etc.)
 * with its own price, stock, images, and identifiers.
 *
 * Industry Reference:
 *   Amazon: Parent ASIN → Child ASINs (size/color matrix)
 *   Flipkart: Product → Variant (color×size grid with independent pricing)
 */
@Entity('product_variants')
@Index(['productId'])
// Scoped to the parent product, not global. A variant SKU is the seller's own
// code for one size/colour of one of their products; making it unique across the
// platform meant the first seller to use `BLUE-M` reserved that string for
// everyone, and every later seller's insert failed on a row they cannot see.
// The parent product already belongs to exactly one seller, so this scope is
// also the seller's scope.
@Index(['productId', 'sku'], { unique: true })
@Index(['productId', 'isActive'])
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ comment: 'Seller SKU for this variant — unique within the parent product' })
  sku: string;

  @Column({ type: 'varchar', nullable: true, comment: 'Barcode (EAN/UPC) for this variant' })
  barcode: string | null;

  @Column({ type: 'jsonb', comment: 'Attribute key-value pairs, e.g. { "color": "Midnight Blue", "size": "256GB" }' })
  attributes: Record<string, string>;

  @Column({ type: 'varchar', nullable: true, comment: 'Human-readable variant name, e.g. "Midnight Blue - 256GB"' })
  variantName: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Maximum Retail Price for this variant' })
  mrp: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Selling price (after seller discount)' })
  sellingPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Cost price for margin calculation' })
  costPrice: number | null;

  @Column({ type: 'int', default: 0, comment: 'Available stock quantity' })
  stockQuantity: number;

  @Column({ type: 'int', default: 5, comment: 'Low stock threshold for alerts' })
  lowStockThreshold: number;

  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true, comment: 'Weight in kg' })
  weightKg: number | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Package dimensions in cm: { length, width, height }' })
  dimensions: {
    length: number;
    width: number;
    height: number;
  };

  @Column('simple-array', { nullable: true, comment: 'Image URLs specific to this variant' })
  imageUrls: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0, comment: 'Display order within the variant group' })
  sortOrder: number;

  @Column({ type: 'varchar', nullable: true, name: 'seller_id' })
  sellerId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
