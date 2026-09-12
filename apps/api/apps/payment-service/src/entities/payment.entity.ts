import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PROCESSING = 'PROCESSING',
  PREAUTHORIZED = 'PREAUTHORIZED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ESCROW_HOLD = 'ESCROW_HOLD',
  ESCROW_RELEASED = 'ESCROW_RELEASED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentModule {
  MARKETPLACE = 'marketplace',
  GROCERY = 'grocery',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
  HOTEL = 'hotel',
  TAXI = 'taxi',
  DOCTOR = 'doctor',
  WALLET_TOPUP = 'wallet_topup',
}

export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
  MADA = 'mada',
  UPI = 'upi',
  WALLET = 'wallet',
  COD = 'cod',
  PAY_AT_VENUE = 'pay_at_venue',
}

// ── Entity ────────────────────────────────────────────────────────────────────

/**
 * Payment — Central payment record for every financial transaction
 * across all KARTSEEK modules.
 *
 * Every customer-facing payment (order, booking, ride, appointment,
 * wallet top-up) creates exactly ONE record in this table, regardless
 * of which module originated it.
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable, non-sequential ID (e.g. PAY-a1b2c3d4-...) */
  @Column({ unique: true })
  @Index()
  paymentNumber: string;

  // ── Source Module ──────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: PaymentModule })
  @Index()
  module: PaymentModule;

  @Column({ comment: 'Module-specific reference (orderId, bookingId, rideId, appointmentId)' })
  @Index()
  orderId: string;

  // ── Participants ──────────────────────────────────────────────────────────

  @Column()
  @Index()
  customerId: string;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Seller / vendor / doctor / hotel owner receiving payment',
  })
  @Index()
  sellerId: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Franchise owner if applicable' })
  franchiseId: string | null;

  // ── Financial ─────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Platform commission deducted',
  })
  platformCommission: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: 'Commission rate applied (e.g. 0.1200 = 12%)',
  })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Amount payable to seller after commission + tax',
  })
  netSellerAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Franchise share (if franchise model)',
  })
  franchiseShare: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Wallet amount used in split payment',
  })
  walletAmountUsed: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Amount refunded so far',
  })
  refundedAmount: number;

  // ── Gateway ───────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: PaymentGateway })
  gateway: PaymentGateway;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.INITIATED,
  })
  @Index()
  status: PaymentStatus;

  @Column({ type: 'varchar', nullable: true, comment: 'Gateway-generated order/session ID' })
  gatewayOrderId: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Gateway-generated payment/charge ID' })
  gatewayPaymentId: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Gateway verification signature' })
  gatewaySignature: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Full gateway response for audit trail' })
  gatewayResponse: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Checkout URL for redirect-based flows' })
  checkoutUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  callbackUrl: string | null;

  // ── Region ────────────────────────────────────────────────────────────────

  /**
   * MARKET COLUMN — ISO-2, the platform's `region_code` under another name.
   *
   * Payment predates the convention and calls it `countryCode`; every scope
   * check in this module reads THIS column, and a new entity here uses
   * `regionCode` (2026-09-12 audit I7). The register of exceptions lives in
   * `libs/common/src/market/market-scope.ts`, above `normaliseMarket` — which is
   * what every one of those checks passes through, so one rule serves both
   * spellings and no caller has to remember which.
   */
  @Column({ length: 2, comment: 'ISO country code from RegionService' })
  @Index()
  countryCode: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    comment: 'Payment method type (card, upi, upi, wallet, cod)',
  })
  methodType: string | null;

  // ── Invoice ───────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true, comment: 'Linked invoice ID' })
  invoiceId: string | null;

  // ── Metadata ──────────────────────────────────────────────────────────────

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Module-specific metadata (items, tip, promo, etc.)',
  })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  failureReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  failureCode: string | null;

  // ── Timestamps ────────────────────────────────────────────────────────────

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
