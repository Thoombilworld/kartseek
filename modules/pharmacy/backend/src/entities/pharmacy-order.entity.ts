import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { PharmacyStore } from './pharmacy-store.entity';

export enum PharmacyOrderStatus {
  PLACED = 'PLACED',
  PRESCRIPTION_PENDING = 'PRESCRIPTION_PENDING',
  PRESCRIPTION_VERIFIED = 'PRESCRIPTION_VERIFIED',
  PRESCRIPTION_REJECTED = 'PRESCRIPTION_REJECTED',
  STORE_ACCEPTED = 'STORE_ACCEPTED',
  STORE_REJECTED = 'STORE_REJECTED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CUSTOMER_PICKED_UP = 'CUSTOMER_PICKED_UP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PharmacyOrderType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
}

export enum PharmacyPaymentMethod {
  ONLINE = 'ONLINE',
  COD = 'COD',
  WALLET = 'WALLET',
  INSURANCE = 'INSURANCE',
}

export enum PharmacyPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

@Entity({ name: 'pharmacy_orders', schema: 'pharmacy' })
export class PharmacyOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ comment: 'Human-readable order number e.g. PHM-10042' })
  orderNumber: string;

  @Index()
  @ManyToOne(() => PharmacyStore, (s) => s.orders, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'store_id' })
  store: Relation<PharmacyStore>;

  @Column({ name: 'store_id' })
  storeId: string;

  @Index()
  @Column()
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  driverId: string | null;

  // ── Order Type ──────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: PharmacyOrderType, default: PharmacyOrderType.DELIVERY })
  orderType: PharmacyOrderType;

  // ── Items Snapshot ──────────────────────────────────────────────────────────

  @Column({ type: 'jsonb' })
  items: Array<{
    itemId: string;
    name: string;
    genericName?: string;
    quantity: number;
    price: number;
    requiresPrescription: boolean;
    dosageForm: string;
  }>;

  // ── Prescription ────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true, comment: 'Links to prescription table' })
  prescriptionId: string | null;

  @Column({ default: false, comment: 'Whether any item requires prescription' })
  requiresPrescription: boolean;

  @Column({ default: false, comment: 'Whether any item is Schedule H' })
  containsScheduleHDrugs: boolean;

  @Column({ default: false, comment: 'Whether any item needs cold-chain' })
  coldChainRequired: boolean;

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
  discount: number;

  @Column({ type: 'varchar', nullable: true })
  couponCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  grandTotal: number;

  // ── Payment ─────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: PharmacyPaymentMethod })
  paymentMethod: PharmacyPaymentMethod;

  @Column({ type: 'enum', enum: PharmacyPaymentStatus, default: PharmacyPaymentStatus.PENDING })
  paymentStatus: PharmacyPaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  paymentTransactionId: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Insurance provider claim ID' })
  insuranceClaimId: string | null;

  // ── Delivery ────────────────────────────────────────────────────────────────

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

  @Column({ type: 'varchar', length: 6, nullable: true, comment: 'OTP for delivery confirmation' })
  deliveryOtp: string | null;

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: PharmacyOrderStatus, default: PharmacyOrderStatus.PLACED })
  status: PharmacyOrderStatus;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  cancelledBy: string | null;

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

  @Column({ type: 'varchar', length: 36, nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
