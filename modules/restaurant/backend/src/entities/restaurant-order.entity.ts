import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Restaurant } from './restaurant.entity';

// ── Status Enum ───────────────────────────────────────────────────────────────

export enum RestaurantOrderStatus {
  PLACED = 'PLACED',
  RESTAURANT_ACCEPTED = 'RESTAURANT_ACCEPTED',
  RESTAURANT_REJECTED = 'RESTAURANT_REJECTED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CUSTOMER_PICKED_UP = 'CUSTOMER_PICKED_UP',     // Takeaway
  SERVED = 'SERVED',                               // Dine-in
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum RestaurantOrderType {
  DELIVERY = 'DELIVERY',
  TAKEAWAY = 'TAKEAWAY',
  DINE_IN = 'DINE_IN',
}

export enum RestaurantPaymentMethod {
  ONLINE = 'ONLINE',
  COD = 'COD',
  WALLET = 'WALLET',
  CARD_ON_DELIVERY = 'CARD_ON_DELIVERY',
}

export enum RestaurantPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

// ── Status Transitions ────────────────────────────────────────────────────────

export const ORDER_STATUS_TRANSITIONS: Record<RestaurantOrderStatus, RestaurantOrderStatus[]> = {
  [RestaurantOrderStatus.PLACED]:              [RestaurantOrderStatus.RESTAURANT_ACCEPTED, RestaurantOrderStatus.RESTAURANT_REJECTED, RestaurantOrderStatus.CANCELLED],
  [RestaurantOrderStatus.RESTAURANT_ACCEPTED]: [RestaurantOrderStatus.PREPARING, RestaurantOrderStatus.CANCELLED],
  [RestaurantOrderStatus.RESTAURANT_REJECTED]: [],
  [RestaurantOrderStatus.PREPARING]:           [RestaurantOrderStatus.READY_FOR_PICKUP, RestaurantOrderStatus.CANCELLED],
  [RestaurantOrderStatus.READY_FOR_PICKUP]:    [RestaurantOrderStatus.DRIVER_ASSIGNED, RestaurantOrderStatus.CUSTOMER_PICKED_UP, RestaurantOrderStatus.SERVED],
  [RestaurantOrderStatus.DRIVER_ASSIGNED]:     [RestaurantOrderStatus.DRIVER_ARRIVED],
  [RestaurantOrderStatus.DRIVER_ARRIVED]:      [RestaurantOrderStatus.OUT_FOR_DELIVERY],
  [RestaurantOrderStatus.OUT_FOR_DELIVERY]:    [RestaurantOrderStatus.DELIVERED],
  [RestaurantOrderStatus.DELIVERED]:           [RestaurantOrderStatus.COMPLETED, RestaurantOrderStatus.REFUNDED],
  [RestaurantOrderStatus.CUSTOMER_PICKED_UP]:  [RestaurantOrderStatus.COMPLETED],
  [RestaurantOrderStatus.SERVED]:              [RestaurantOrderStatus.COMPLETED],
  [RestaurantOrderStatus.COMPLETED]:           [RestaurantOrderStatus.REFUNDED],
  [RestaurantOrderStatus.CANCELLED]:           [RestaurantOrderStatus.REFUNDED],
  [RestaurantOrderStatus.REFUNDED]:            [],
};

// ── Entity ────────────────────────────────────────────────────────────────────

@Entity('restaurant_orders')
export class RestaurantOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ comment: 'Human-readable order number e.g. RST-10042' })
  orderNumber: string;

  @Index()
  @ManyToOne(() => Restaurant, (r) => r.orders, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Index()
  @Column()
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  driverId: string | null;

  // ── Order Type ──────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: RestaurantOrderType, default: RestaurantOrderType.DELIVERY })
  orderType: RestaurantOrderType;

  // ── Items Snapshot ──────────────────────────────────────────────────────────

  @Column({ type: 'jsonb' })
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    price: number;
    customizations?: Array<{ groupName: string; selected: string[]; additionalPrice: number }>;
    specialInstructions?: string;
    isVeg: boolean;
  }>;

  // ── Pricing ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  itemTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  packagingFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tip: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'varchar', nullable: true })
  couponCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  grandTotal: number;

  // ── Payment ─────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: RestaurantPaymentMethod })
  paymentMethod: RestaurantPaymentMethod;

  @Column({ type: 'enum', enum: RestaurantPaymentStatus, default: RestaurantPaymentStatus.PENDING })
  paymentStatus: RestaurantPaymentStatus;

  @Column({ type: 'varchar', nullable: true, comment: 'Payment gateway transaction ID' })
  paymentTransactionId: string | null;

  // ── Delivery Details ────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  deliveryAddress: {
    label?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    pincode: string;
    lat: number;
    lng: number;
  };

  @Column({ type: 'text', nullable: true })
  deliveryInstructions: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: '{ date, startTime, endTime } for scheduled' })
  deliverySlot: {
    date: string;
    startTime: string;
    endTime: string;
  } | null;

  @Column({ type: 'varchar', length: 6, nullable: true, comment: 'OTP for delivery/pickup confirmation' })
  deliveryOtp: string | null;

  // ── Takeaway Details ────────────────────────────────────────────────────────

  @Column({ type: 'timestamptz', nullable: true })
  scheduledPickupAt: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone: string | null;

  // ── Dine-In Details ─────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  tableId: string | null;

  @Column({ type: 'int', nullable: true })
  guestCount: number | null;

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: RestaurantOrderStatus, default: RestaurantOrderStatus.PLACED })
  status: RestaurantOrderStatus;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  cancelledBy: string | null; // 'customer' | 'restaurant' | 'admin'

  @Column({ type: 'text', nullable: true })
  orderNotes: string | null;

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  preparedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  pickedUpAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  estimatedDeliveryAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true, comment: 'Idempotency key to prevent duplicate orders' })
  idempotencyKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
