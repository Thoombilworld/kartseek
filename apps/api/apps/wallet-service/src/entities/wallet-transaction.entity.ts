import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * WalletTransaction — persistent record of every wallet credit/debit.
 *
 * Stored in PostgreSQL (kartseek_wallet database) so transaction history
 * survives Redis cache expiry and is available for admin audits.
 */
@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  type: 'CREDIT' | 'DEBIT';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  reason: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  // `| null` because the column is nullable. Typed as plain `string`, the
  // entity claimed a guarantee the schema does not make, and every read of a
  // top-up or manual adjustment — neither of which has a reference — handed
  // back `null` through a `string`-shaped hole.
  referenceId: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  // Nullable in the schema and legitimately absent on movements with no module
  // behind them (top-ups, manual adjustments).
  module: string | null; // 'marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'topup', 'refund', 'admin'

  @CreateDateColumn()
  createdAt: Date;
}
