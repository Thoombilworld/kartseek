import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

/**
 * TaxiPayoutRecordEntity — Financial payout record for drivers and vendors.
 *
 * Created automatically when a ride completes. Tracks the full commission
 * split and settlement lifecycle:
 *   generated → pending → approved → processing → settled | failed
 *
 * All payouts are processed through the Super Admin panel.
 * Vendors and drivers can view their payout history but cannot
 * initiate or modify payouts directly.
 */
@Entity('taxi_payout_records')
export class TaxiPayoutRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['vendor', 'driver'] })
  @Index()
  recipientType: 'vendor' | 'driver';

  @Column()
  @Index()
  recipientId: string;

  /** Name of the recipient for display purposes. */
  @Column({ length: 200 })
  recipientName: string;

  @Column()
  @Index()
  rideId: string;

  @Column({ length: 5 })
  @Index()
  countryCode: string;

  // ─── Financial Breakdown ──────────────────────────────────────────────────

  /** Total ride fare charged to customer. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  grossAmount: number;

  /** Platform's commission deducted. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  platformCommission: number;

  /** Vendor's commission deducted (0 for independent drivers). */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  vendorCommission: number;

  /** Tax amount deducted. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  /** Final amount to be paid to the recipient. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  netPayout: number;

  @Column({ length: 10 })
  currency: string;

  // ─── Settlement Lifecycle ─────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'processing', 'settled', 'failed'],
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'approved' | 'processing' | 'settled' | 'failed';

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentGateway: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  transactionRef: string | null;

  @Column({ type: 'varchar', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  /** Number of retry attempts for failed payouts. */
  @Column({ default: 0 })
  retryCount: number;

  /** Payout batch ID for batch processing. */
  @Column({ type: 'varchar', nullable: true })
  @Index()
  batchId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
