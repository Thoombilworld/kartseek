import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Product } from './product.entity';
import { Seller } from './seller.entity';

@Entity('marketplace_orders')
@Index(['sellerId', 'status'])
@Index(['customerId', 'createdAt'])
export class MarketplaceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => Seller)
  @JoinColumn({ name: 'seller_id' })
  seller: Seller;

  @Column({ type: 'jsonb', comment: 'Snapshot of ordered items with prices at time of purchase' })
  items: Array<{
    productId: string;
    listingId: string;
    name: string;
    sellerSku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    imageUrl?: string;
  }>;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  itemTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  grandTotal: number;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'],
    default: 'PENDING',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['ONLINE', 'COD', 'WALLET', 'UPI'],
    default: 'ONLINE',
  })
  paymentMethod: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING',
  })
  paymentStatus: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Delivery address snapshot' })
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };

  @Column({ type: 'varchar', nullable: true })
  trackingId: string | null;

  @Column({ type: 'varchar', nullable: true })
  courierName: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'franchise_id' })
  franchiseId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'region_code' })
  regionCode: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Cancellation/return reason' })
  cancellationReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
