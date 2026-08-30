import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index
} from 'typeorm';

/**
 * PaymentMethodConfig — Region-to-gateway mapping.
 *
 * Defines which payment methods are available in each country,
 * which gateway processes them, and display metadata for the frontend.
 * The GatewayAdapterFactory reads this table to route payments.
 */
@Entity('payment_method_configs')
export class PaymentMethodConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 2, comment: 'ISO country code (IN, AE, etc.)' })
  @Index()
  countryCode: string;

  @Column({ length: 30, comment: 'Gateway identifier (razorpay, stripe, upi, etc.)' })
  gateway: string;

  @Column({ length: 30, comment: 'Method type shown to user (card, upi, upi, wallet, cod, bank_transfer, apple_pay, etc.)' })
  methodType: string;

  @Column({ comment: 'Display name for frontend (e.g. "Credit / Debit Card", "Google Pay UPI")' })
  displayName: string;

  @Column({ type: 'varchar', nullable: true, comment: 'Icon URL for frontend' })
  iconUrl: string | null;

  @Column({ default: false, comment: 'Is this the default method for the country?' })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0, comment: 'Display order in the checkout list' })
  sortOrder: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, comment: 'Minimum amount for this method (0 = no minimum)' })
  minAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 999999, comment: 'Maximum amount for this method' })
  maxAmount: number;

  /** Modules where this method is available (empty = all modules) */
  @Column({ type: 'jsonb', default: '[]', comment: 'Modules where this method is available (empty = all)' })
  allowedModules: string[];

  /** Gateway config — encrypted at rest. Contains API keys, webhook secrets, etc. */
  @Column({ type: 'jsonb', nullable: true, comment: 'Encrypted gateway config (API keys, merchant IDs)' })
  gatewayConfig: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
