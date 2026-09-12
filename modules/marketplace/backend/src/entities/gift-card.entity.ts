import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GiftCardStatus {
  ACTIVE = 'ACTIVE',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  DISABLED = 'DISABLED',
}

@Entity({ name: 'gift_cards', schema: 'marketplace' })
export class GiftCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 20, comment: 'Unique alphanumeric code, e.g. GIFT-XXXX-XXXX' })
  code: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  currentBalance: number;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'enum', enum: GiftCardStatus, default: GiftCardStatus.ACTIVE })
  status: GiftCardStatus;

  @Column({ type: 'varchar', nullable: true, comment: 'User who purchased this gift card' })
  purchasedByUserId: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'User who redeemed/owns this gift card' })
  redeemedByUserId: string | null;

  @Column({ type: 'varchar', nullable: true })
  recipientEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  recipientName: string | null;

  @Column({ nullable: true, type: 'text' })
  personalMessage: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Redemption history: [{orderId, amount, date}]',
  })
  redemptionHistory: Array<{ orderId: string; amount: number; date: string }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
