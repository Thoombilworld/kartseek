import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';
import { PaymentModule } from './payment.entity';

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
  ON_HOLD = 'ON_HOLD',
  REVERSED = 'REVERSED',
}

export enum SettlementRecipientType {
  SELLER = 'seller',
  DRIVER = 'driver',
  DOCTOR = 'doctor',
  HOTEL_OWNER = 'hotel_owner',
  FRANCHISE = 'franchise',
  PLATFORM = 'platform',
}

/**
 * SettlementRecord — Tracks the split of every payment into commission,
 * seller payout, franchise share, tax, and platform revenue.
 *
 * Consumed by the Super Admin dashboard for real-time financial visibility
 * across all modules. One payment can produce multiple settlement records
 * (e.g., seller + franchise + platform).
 */
@Entity('settlement_records')
export class SettlementRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  settlementNumber: string;

  // ── Source Payment ────────────────────────────────────────────────────────

  @Column()
  @Index()
  paymentId: string;

  @Column()
  @Index()
  paymentNumber: string;

  @Column({ type: 'enum', enum: PaymentModule })
  @Index()
  module: PaymentModule;

  @Column()
  orderId: string;

  // ── Recipient ─────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: SettlementRecipientType })
  @Index()
  recipientType: SettlementRecipientType;

  @Column()
  @Index()
  recipientId: string;

  @Column({ type: 'varchar', nullable: true })
  recipientName: string | null;

  // ── Financial ─────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 12, scale: 2, comment: 'Gross payment amount' })
  grossAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, comment: 'Commission rate applied (e.g. 0.1500 = 15%)' })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxDeducted: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  adjustments: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, comment: 'Net amount payable to recipient' })
  netAmount: number;

  @Column({ length: 3 })
  currency: string;

  // ── Franchise Split (if applicable) ───────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  franchiseId: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  franchiseCommissionRate: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  franchiseShareAmount: number;

  // ── Region ────────────────────────────────────────────────────────────────

  @Column({ length: 2 })
  @Index()
  countryCode: string;

  // ── Status ────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.PENDING })
  @Index()
  status: SettlementStatus;

  @Column({ type: 'varchar', nullable: true })
  payoutReference: string | null;

  @Column({ type: 'varchar', nullable: true })
  failureReason: string | null;

  // ── Settlement Period ─────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'Settlement cycle identifier (e.g. 2026-W27, 2026-07-07)' })
  @Index()
  settlementPeriod: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
