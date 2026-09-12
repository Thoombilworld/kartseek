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
import { MarketplaceOrder } from './marketplace-order.entity';
import { Seller } from './seller.entity';

/**
 * Return Request — Tracks customer-initiated returns throughout their lifecycle.
 *
 * States: REQUESTED → APPROVED → PICKUP_ASSIGNED → PICKED_UP → RECEIVED →
 *         QC_PASSED / QC_FAILED → REFUNDED / REPLACEMENT_SHIPPED → CLOSED
 *
 * Industry Reference:
 *   Amazon: Return → Refund in 3-5 days
 *   Flipkart: Return → QC → Refund/Replace
 */
@Entity({ name: 'return_requests', schema: 'marketplace' })
@Index(['orderId', 'status'])
@Index(['customerId', 'createdAt'])
@Index(['sellerId', 'status'])
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, comment: 'Human-readable return ID, e.g. RET-2026-1089' })
  returnNumber: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => MarketplaceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Relation<MarketplaceOrder>;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => Seller)
  @JoinColumn({ name: 'seller_id' })
  seller: Relation<Seller>;

  @Column({ type: 'jsonb', comment: 'Items being returned with quantities' })
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
    sellerSku?: string;
  }>;

  @Column({
    type: 'enum',
    enum: [
      'WRONG_ITEM',
      'DEFECTIVE',
      'DAMAGED_IN_TRANSIT',
      'NOT_AS_DESCRIBED',
      'SIZE_FIT_ISSUE',
      'QUALITY_ISSUE',
      'LATE_DELIVERY',
      'CHANGED_MIND',
      'OTHER',
    ],
    comment: 'Standardized return reason',
  })
  reason: string;

  @Column({ type: 'text', nullable: true, comment: 'Free-text customer explanation' })
  reasonDetail: string | null;

  @Column({
    type: 'enum',
    enum: [
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'PICKUP_ASSIGNED',
      'PICKED_UP',
      'RECEIVED',
      'QC_PASSED',
      'QC_FAILED',
      'REFUNDED',
      'REPLACEMENT_SHIPPED',
      'CLOSED',
      'CANCELLED',
    ],
    default: 'REQUESTED',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['REFUND', 'REPLACEMENT', 'STORE_CREDIT'],
    default: 'REFUND',
    comment: 'Customer-selected resolution method',
  })
  resolutionType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, comment: 'Total refund/credit amount' })
  refundAmount: number;

  @Column('simple-array', { nullable: true, comment: 'Photo evidence URLs uploaded by customer' })
  photoUrls: string[];

  @Column('simple-array', { nullable: true, comment: 'Photo evidence URLs from pickup agent' })
  pickupPhotoUrls: string[];

  @Column({ type: 'jsonb', nullable: true, comment: 'Pickup address snapshot' })
  pickupAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Assigned delivery partner ID for reverse pickup',
  })
  pickupPartnerId: string | null;

  @Column({ type: 'timestamp', nullable: true, comment: 'When the pickup was scheduled' })
  pickupScheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  receivedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @Column({
    type: 'enum',
    enum: ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'],
    nullable: true,
    comment: 'QC assessment of returned item condition',
  })
  qcCondition: string;

  @Column({ type: 'text', nullable: true, comment: 'QC inspector notes' })
  qcNotes: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Admin/seller rejection reason' })
  rejectionReason: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'franchise_id' })
  franchiseId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'region_code' })
  regionCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
