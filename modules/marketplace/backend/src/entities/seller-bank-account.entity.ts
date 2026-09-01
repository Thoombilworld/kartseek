import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Seller } from './seller.entity';

/**
 * Where a seller's payouts are sent.
 *
 * Payouts had no destination at all before this: `POST /sellers/:id/payouts`
 * accepted a `bankAccountId` that referred to nothing, and the Bank Accounts
 * page had no backend, so a seller could request money with nowhere for it to
 * go.
 *
 * The full account number is stored encrypted and never returned; the UI shows
 * `accountNumberLast4` and the bank name, which is all a seller needs to tell
 * two of their own accounts apart. `UQ_seller_bank_accounts_default` is a
 * partial unique index, so a seller can only ever have one default.
 */
@Entity('seller_bank_accounts')
@Index(['sellerId'])
export class SellerBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => Seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: Relation<Seller>;

  @Column()
  accountHolderName: string;

  @Column()
  bankName: string;

  /** Shown in the UI. The only part of the number that leaves the service. */
  @Column({ length: 4 })
  accountNumberLast4: string;

  /** Encrypted at rest; never serialised to a client. */
  @Column({ type: 'text' })
  accountNumberEnc: string;

  /** IFSC / SWIFT / routing number, depending on the market. */
  @Column({ type: 'varchar', nullable: true })
  bankCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  upiId: string | null;

  /** bank | upi */
  @Column({ default: 'bank' })
  method: string;

  @Column({ default: false })
  isDefault: boolean;

  /** Set once a penny-drop or equivalent check has passed. */
  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
