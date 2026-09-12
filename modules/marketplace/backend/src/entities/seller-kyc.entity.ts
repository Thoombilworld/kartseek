import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Seller } from './seller.entity';

@Entity({ name: 'seller_kyc', schema: 'marketplace' })
@Index(['sellerId', 'status'])
export class SellerKyc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id', unique: true })
  sellerId: string;

  @OneToOne(() => Seller)
  @JoinColumn({ name: 'seller_id' })
  seller: Relation<Seller>;

  // ── Owner / Business Identity ─────────────────────────────────
  @Column()
  ownerFullName: string;

  @Column({ type: 'varchar', nullable: true })
  ownerEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  ownerPhone: string | null;

  @Column({ type: 'varchar', nullable: true })
  businessType: string | null; // INDIVIDUAL, LLC, PARTNERSHIP, CORPORATION

  @Column({ type: 'varchar', nullable: true })
  businessRegistrationNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  taxRegistrationNumber: string | null;

  @Column({ name: 'country_code' })
  countryCode: string;

  // ── Documents ─────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true, comment: 'URL to uploaded govt ID (front)' })
  govIdFrontUrl: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'URL to uploaded govt ID (back)' })
  govIdBackUrl: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'URL to business license document' })
  businessLicenseUrl: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'URL to address proof document' })
  addressProofUrl: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'URL to bank statement / cancelled cheque' })
  bankVerificationUrl: string | null;

  // ── Verification Status ───────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'],
    default: 'PENDING',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Admin who reviewed' })
  reviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, comment: 'KYC expiry date for re-verification' })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
