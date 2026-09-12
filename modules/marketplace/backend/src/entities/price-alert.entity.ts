import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Product } from './product.entity';

/**
 * PriceAlert — a shopper asking to be told when a product gets cheaper.
 *
 * The wishlist carried a "Notify for all price drops" control with no handler,
 * no endpoint and no table; it was removed rather than left lying. This is the
 * storage that makes it real.
 *
 * `priceWhenSet` is the point of the row. An alert has to remember what the
 * shopper considered expensive at the moment they asked, because "cheaper" is
 * only meaningful relative to that. Storing just `(customer, product)` and
 * comparing against the current price would fire on the first check for every
 * alert ever created, or never fire at all, depending on which way the
 * comparison was written.
 *
 * `notifiedAt` and `notifiedPrice` make the alert one-shot per drop rather than
 * a repeating notification every time the price sweep runs — the difference
 * between a useful alert and a shopper turning off notifications.
 */
@Entity({ name: 'price_alerts', schema: 'marketplace' })
// The sweep reads "every active alert for this product" when a price changes.
@Index(['productId', 'isActive'])
// The wishlist page reads a customer's own alerts.
@Index(['customerId', 'isActive'])
// One alert per shopper per product. A second would mean two notifications for
// one price drop.
@Index(['customerId', 'productId'], { unique: true })
export class PriceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  /**
   * The payable price when the alert was created.
   *
   * Read from the buy-box listing, not `products.mrp` — `mrp` is the list price
   * and never moves, so an alert compared against it would never fire.
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'price_when_set' })
  priceWhenSet: number;

  /**
   * Optional target. When set, the alert fires only at or below this figure
   * rather than on any decrease — for a shopper waiting for a specific budget.
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'target_price' })
  targetPrice: number | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'notified_at' })
  notifiedAt: Date | null;

  /** The price that triggered the notification, for the message and for audit. */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'notified_price' })
  notifiedPrice: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
