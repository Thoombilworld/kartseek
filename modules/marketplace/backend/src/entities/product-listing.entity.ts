import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Product } from './product.entity';
import { Seller } from './seller.entity';

/**
 * One seller's offer on one catalogue product.
 *
 * `@Index(['seller', 'sellerSku'])` — a SKU is unique **to its seller**, not to
 * the platform. `sellerSku` was declared `@Column({ unique: true })`, which made
 * every SKU global: the first seller to list `TSHIRT-001` claimed that string
 * for the whole marketplace, and the next seller to use their own internal code
 * for their own product hit a constraint violation on a listing that has nothing
 * to do with the first. Sellers do not coordinate their SKU namespaces and
 * cannot be asked to — the id is theirs, and it is only meaningful alongside the
 * seller who issued it. Same collision class as the product slug that
 * `addProduct` already de-conflicts; it had simply not been carried through.
 */
@Entity('product_listings')
@Index(['product', 'seller'], { unique: true })
@Index(['seller', 'sellerSku'], { unique: true })
// The moderation queue reads this.
@Index(['approvalStatus'])
export class ProductListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.listings)
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @ManyToOne(() => Seller)
  @JoinColumn({ name: 'seller_id' })
  seller: Relation<Seller>;

  /** Unique within this seller — see the composite index on the class. */
  @Column()
  sellerSku: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  sellingPrice: number;

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ default: 'NEW' })
  condition: string; // NEW, REFURBISHED, USED

  /**
   * Whether this offer currently wins the buy box for its product.
   *
   * Maintained by `CatalogService.recomputeBuyBox`, never set by hand. It was
   * written once — `isBuyBoxWinner: true` at creation — and then never
   * recalculated: not when the seller changed their price, not when they sold
   * out, not when a cheaper offer arrived. That was invisible only because no
   * product ever had a second listing, so the first was trivially the winner.
   */
  @Column({ default: false })
  isBuyBoxWinner: boolean;

  @Column({ default: false })
  isFulfilledByKartseek: boolean;

  /**
   * Moderation state for this **offer**, distinct from the product's.
   *
   * Product approval and listing approval are not the same decision. Once a
   * catalogue product is approved, a second seller offering on it is submitting
   * their own price, stock, condition and fulfilment promise — none of which has
   * been reviewed. `approveProduct` activated *every* listing on the product
   * (`UPDATE ... WHERE product_id = :id`), which was harmless only while one
   * listing existed per product; the moment a product carries competing offers,
   * approving one seller's submission would put every other seller's
   * unmoderated offer on sale with it.
   *
   * PENDING | APPROVED | REJECTED.
   */
  @Column({ default: 'PENDING' })
  approvalStatus: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  /**
   * Whether the seller is currently offering it.
   *
   * Distinct from {@link approvalStatus}: approval is the platform's decision and
   * only an admin changes it; `isActive` is the seller's own on/off switch. Both
   * must be true to be buyable, and every catalogue read already filters on this
   * one — which is why a listing starts inactive and stays inactive until it is
   * approved.
   */
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
