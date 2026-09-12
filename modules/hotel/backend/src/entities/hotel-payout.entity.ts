import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ON_HOLD = 'ON_HOLD',
}

@Entity({ name: 'hotel_payouts', schema: 'hotel' })
export class HotelPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ comment: 'Human-readable payout number e.g. PO-001' })
  payoutNumber: string;

  @Index()
  @Column({ comment: 'Hotel owner ID' })
  ownerId: string;

  @Index()
  @Column({ comment: 'Hotel ID' })
  hotelId: string;

  // ── Financial Details ───────────────────────────────────────────────────────

  @Column({ length: 50, comment: 'Payout period e.g. Jun 2026' })
  period: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: 'Gross booking revenue for the period',
  })
  grossAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Platform commission deducted',
  })
  commissionAmount: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 15,
    comment: 'Commission rate applied',
  })
  commissionRate: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Tax deducted (TDS/WHT)',
  })
  taxDeducted: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Refunds deducted from payout',
  })
  refundsDeducted: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: 'Adjustments (penalties, bonuses)',
  })
  adjustments: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, comment: 'Net payout amount' })
  netAmount: number;

  @Column({ length: 3, default: 'AED' })
  currency: string;

  // ── Booking Summary ─────────────────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  totalBookings: number;

  @Column({ type: 'int', default: 0 })
  cancelledBookings: number;

  @Column({ type: 'int', default: 0 })
  completedNights: number;

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column({ type: 'varchar', nullable: true, comment: 'Bank transfer reference number' })
  transferReference: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  // ── Payment Info ────────────────────────────────────────────────────────────

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Bank account used for this payout (snapshot)',
  })
  bankDetails: {
    bankName: string;
    accountHolder: string;
    accountNumberLast4: string;
  };

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
