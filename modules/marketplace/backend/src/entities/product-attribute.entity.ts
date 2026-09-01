import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Category } from './category.entity';

/** One selectable value of a SELECT / MULTI_SELECT / COLOR attribute. */
export interface AttributeOption {
  /** Shown to shoppers and sellers, e.g. "Midnight Black". */
  label: string;
  /** Stable machine value stored on the variant, e.g. "midnight-black". */
  value: string;
  /** CSS colour for COLOR attributes, e.g. "#0f172a". */
  hex?: string;
}

@Entity('product_attributes')
// Every read is "the attributes of this category", and the seller portal and the
// storefront both issue it on each product form and each detail page.
@Index(['categoryId', 'isActive'])
@Index(['categoryId', 'slug'], { unique: true })
export class ProductAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Unique per category, not platform-wide: "Size" is a Fashion attribute and a
  // Footwear attribute with different values, and a global unique slug made the
  // second one impossible to create.
  @Column()
  slug: string;

  @Column({ type: 'varchar', default: 'TEXT', comment: 'TEXT | NUMBER | SELECT | MULTI_SELECT | BOOLEAN | COLOR' })
  type: string;

  /**
   * Predefined values for SELECT / MULTI_SELECT / COLOR.
   *
   * Stored as objects rather than bare strings so a COLOR option can carry the
   * swatch fill the storefront paints. Without it every colour rendered as the
   * same neutral chip unless its name happened to be in a hard-coded lookup in
   * the web bundle — which meant "Titanium Natural" or a seller's own shade name
   * could never show its actual colour. Plain strings are still accepted on
   * write and normalised here, so attributes authored before this keep working.
   */
  @Column({ type: 'jsonb', nullable: true, comment: 'Predefined values: [{ label, value, hex? }]' })
  options: AttributeOption[];

  /**
   * Whether this attribute defines a purchasable variant of a product.
   *
   * Colour and size split one product into SKUs a buyer picks between; "Battery
   * Capacity" or "Warranty" describe the product and must not become buttons on
   * the detail page. Nothing distinguished the two before, so the seller portal
   * had to be told the axis names by hand and the storefront guessed from the
   * attribute's name.
   */
  @Column({ default: false, comment: 'True when this attribute splits a product into SKUs' })
  isVariantAxis: boolean;

  @Column({ type: 'varchar', nullable: true, comment: 'Unit label, e.g. kg, cm, mAh' })
  unit: string | null;

  @Column({ default: true })
  isRequired: boolean;

  @Column({ default: true })
  isFilterable: boolean;

  @Column({ default: false })
  isSearchable: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', nullable: true, comment: 'Category this attribute belongs to (null = global)' })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Relation<Category>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
