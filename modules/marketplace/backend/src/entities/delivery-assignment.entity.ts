import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { MarketplaceOrder } from './marketplace-order.entity';

/**
 * DeliveryAssignment — Links a marketplace order to a delivery partner.
 *
 * Tracks the assignment lifecycle:
 *   PENDING → OFFERED → ACCEPTED / REJECTED → PICKED_UP →
 *   IN_TRANSIT → DELIVERED / FAILED / RETURNED
 *
 * Also supports return-pickup assignments (isReturnPickup = true).
 *
 * Industry Reference:
 *   Flipkart: Ekart assignment with real-time tracking
 *   Amazon: Flex/DSP driver assignment with geofencing
 */
@Entity('delivery_assignments')
@Index(['orderId'])
@Index(['partnerId', 'status'])
@Index(['status', 'createdAt'])
export class DeliveryAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => MarketplaceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: MarketplaceOrder;

  @Column({ type: 'varchar', nullable: true, name: 'return_request_id', comment: 'Linked return request for reverse pickups' })
  returnRequestId: string | null;

  @Column({ name: 'partner_id', comment: 'Delivery partner/driver user ID' })
  partnerId: string;

  @Column({ type: 'varchar', nullable: true })
  partnerName: string | null;

  @Column({ type: 'varchar', nullable: true })
  partnerPhone: string | null;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'],
    default: 'PENDING',
  })
  status: string;

  @Column({ default: false, comment: 'True if this is a return/reverse pickup assignment' })
  isReturnPickup: boolean;

  @Column({
    type: 'enum',
    enum: ['AUTO', 'MANUAL', 'BROADCAST'],
    default: 'AUTO',
    comment: 'How the partner was selected',
  })
  assignmentMethod: string;

  @Column({ type: 'jsonb', comment: 'Pickup location' })
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
    contactName: string;
    contactPhone: string;
  };

  @Column({ type: 'jsonb', comment: 'Drop-off location' })
  dropLocation: {
    address: string;
    lat: number;
    lng: number;
    contactName: string;
    contactPhone: string;
  };

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, comment: 'Estimated distance in km' })
  distanceKm: number | null;

  @Column({ type: 'int', nullable: true, comment: 'Estimated delivery time in minutes' })
  estimatedMinutes: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Delivery fee charged to customer' })
  deliveryFee: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Commission/earnings for delivery partner' })
  partnerEarnings: number | null;

  /**
   * The code the customer reads out to prove the parcel reached them.
   *
   * `select: false` — it must never travel in an ordinary read. It used to be an
   * ordinary column, so `GET /marketplace/delivery-assignments/:id` (guarded by
   * nothing but "are you signed in?") returned it in the response body, and the
   * bulk list returned everybody's. The verification flow around it is sound —
   * attempt counter, five-attempt cap, cleanup on success — and all of that is
   * decorative if the answer is in the payload.
   *
   * Read it deliberately, with `addSelect`, only where it is being checked.
   */
  @Column({ type: 'varchar', nullable: true, select: false, comment: 'OTP for delivery verification' })
  deliveryOtp: string | null;

  @Column({ default: false, comment: 'Whether OTP was verified at delivery' })
  otpVerified: boolean;

  @Column('simple-array', { nullable: true, comment: 'Photo proof of delivery URLs' })
  proofPhotos: string[];

  @Column({
    type: 'enum',
    enum: ['HANDED', 'DOORSTEP', 'NEIGHBOR', 'GUARD'],
    nullable: true,
    comment: 'How the package was delivered',
  })
  deliveryMode: string;

  @Column({ type: 'text', nullable: true, comment: 'Delivery notes from partner' })
  deliveryNotes: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'GPS coordinates at delivery confirmation' })
  deliveryCoordinates: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'COD amount to be collected' })
  codAmount: number | null;

  @Column({ default: false, comment: 'Whether COD was collected' })
  codCollected: boolean;

  @Column({ type: 'timestamp', nullable: true })
  offeredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'text', nullable: true, comment: 'Reason for rejection/failure' })
  failureReason: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'franchise_id' })
  franchiseId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'region_code' })
  regionCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
