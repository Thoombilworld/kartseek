import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A seller's withdrawal request and its lifecycle.
 *
 * Previously these lived only in Redis under `payout:<id>` with a 90-day TTL,
 * plus two hand-maintained index keys (`payout:index:seller:<id>` and
 * `payout:queue:pending`). That made the record of money paid out to a seller
 * expire on its own after 90 days, and made `getPayoutStats` walk the keyspace
 * with `KEYS payout:PAYOUT-*` — an O(n) scan that blocks Redis. Payouts are
 * financial records: they belong in a table.
 *
 * Redis is still a cache in front of this, never the system of record.
 */
@Entity('payouts')
@Index(['sellerId', 'requestedAt'])
@Index(['status'])
export class Payout {
  /** `PAYOUT-<ms>-<rand>` — the reference quoted to the seller. */
  @PrimaryColumn()
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  /** bank | upi | paypal */
  @Column({ default: 'bank' })
  method: string;

  @Column({ type: 'varchar', nullable: true })
  bankAccount: string | null;

  @Column({ type: 'varchar', nullable: true })
  ifscCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  upiId: string | null;

  /** PENDING | APPROVED | PROCESSING | PROCESSED | FAILED | CANCELLED */
  @Column({ default: 'PENDING' })
  @Index()
  status: string;

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  processedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  /** Bank/UPI reference for a completed transfer. */
  @Column({ type: 'varchar', nullable: true })
  transactionRef: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
