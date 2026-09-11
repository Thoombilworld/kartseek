import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUNDED = 'REFUNDED',
}

export enum EscrowStatus {
  PENDING = 'PENDING',
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The human-readable reference (`ORD-1785745596565-7589`).
   *
   * Separate from `id` because the two serve different jobs: `id` is the
   * database key, this is what a customer quotes to support and what the
   * checkout page displays. It is what every caller looks an order up by, so it
   * is indexed and unique.
   */
  @Index({ unique: true })
  @Column()
  orderNumber: string;

  @Index()
  @Column()
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  sellerId: string | null;

  @Column({ type: 'jsonb' })
  items: Array<{ productId: string; quantity: number; price: number; variantId?: string }>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletDeduction: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column()
  deliveryAddress: string;

  @Column()
  serviceType: string;

  @Column()
  paymentMethod: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: EscrowStatus, default: EscrowStatus.PENDING })
  escrowStatus: EscrowStatus;

  /**
   * The coupon as resolved at checkout, kept for reconciliation.
   *
   * `discount` above records what was taken off; these record why. Without them
   * a discounted order cannot be tied back to the coupon that granted it.
   */
  @Column({ type: 'varchar', nullable: true })
  couponCode: string | null;

  @Column({ type: 'uuid', nullable: true })
  couponId: string | null;

  /**
   * The market the order was placed in and the currency every amount on this
   * row is in. Recorded at placement so an invoice, a refund or an audit reads
   * the order in its own market rather than in whichever market the reader is
   * browsing; before these columns an order carried no market at all.
   */
  @Column({ name: 'region_code', type: 'varchar', nullable: true })
  regionCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  currency: string | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryAt: Date | null;

  @CreateDateColumn()
  placedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
