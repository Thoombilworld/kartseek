import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Product } from './product.entity';
import { ProductAttribute } from './product-attribute.entity';

/**
 * One product's value for one category attribute: "Screen size = 6.1 inch",
 * "Colour = Titanium Blue", "5G = true".
 *
 * Until this table existed the product page read `metadata.specifications`, a
 * free-form JSON blob that nothing wrote (0 of 178 products carried one), so
 * every product rendered without a specification and the seller form's
 * "specifications" field was silently dropped by the write path. Values are
 * typed columns rather than one JSON column because the catalogue filters,
 * compares and validates them: a numeric range filter over `value_number`
 * uses an index, a range filter over text inside JSON does not.
 *
 * Exactly one of the value columns is set, chosen by the definition's `type`:
 *
 *   TEXT | SELECT | COLOR | DATE   → value_text   (SELECT/COLOR hold the option `value`)
 *   NUMBER                          → value_number (in the definition's `unit`)
 *   BOOLEAN                         → value_bool
 *   MULTI_SELECT                    → value_json   (string[] of option values)
 *   RANGE                           → value_json   ({ min, max } in `unit`)
 *
 * `ON DELETE CASCADE` on both parents: a value means nothing without its
 * product, and nothing without its definition. Deleting a definition from the
 * admin console therefore drops every product's value for it — which is the
 * only coherent outcome, and the console says so before it does it.
 */
@Entity({ name: 'product_attribute_values', schema: 'marketplace' })
@Index('IDX_pav_product_attribute', ['productId', 'attributeId'], { unique: true })
@Index('IDX_pav_attribute_number', ['attributeId', 'valueNumber'])
@Index('IDX_pav_attribute_text', ['attributeId', 'valueText'])
export class ProductAttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id', foreignKeyConstraintName: 'FK_pav_product' })
  product: Relation<Product>;

  @Column({ name: 'attribute_id', type: 'uuid' })
  attributeId: string;

  @ManyToOne(() => ProductAttribute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_id', foreignKeyConstraintName: 'FK_pav_attribute' })
  attribute: Relation<ProductAttribute>;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText: string | null;

  /** Postgres `numeric` comes back as a string; callers parse it. */
  @Column({ name: 'value_number', type: 'numeric', precision: 18, scale: 4, nullable: true })
  valueNumber: string | null;

  @Column({ name: 'value_bool', type: 'boolean', nullable: true })
  valueBool: boolean | null;

  @Column({ name: 'value_json', type: 'jsonb', nullable: true })
  valueJson: unknown | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
