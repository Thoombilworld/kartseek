import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'sellers', schema: 'marketplace' })
@Index(['verificationStatus'])
@Index(['regionCode'])
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessName: string;

  @Column({ unique: true })
  storeSlug: string;

  // ── Contact Information ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  ownerName: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  // ── Store Metadata ──────────────────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  bannerUrl: string | null;

  // ── Tax & Legal ─────────────────────────────────────────────────────────────
  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'GST registration number (India) or equivalent VAT ID',
  })
  gstNumber: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'PAN card number (India) or equivalent tax ID',
  })
  panNumber: string | null;

  // ── Banking Details (for payouts) ───────────────────────────────────────────
  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Encrypted bank account number for payout settlement',
  })
  bankAccountNumber: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'IFSC code (India) or SWIFT/sort code' })
  bankIfscCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  bankAccountName: string | null;

  // ── Address ─────────────────────────────────────────────────────────────────
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Business address: { line1, line2, city, state, postalCode, country }',
  })
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  // ── KYC Verification ────────────────────────────────────────────────────────
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Array of uploaded KYC documents: [{ type, url, uploadedAt, status }]',
  })
  kycDocuments: Array<{
    type: string; // e.g. 'TRADE_LICENSE', 'ID_PROOF', 'ADDRESS_PROOF'
    url: string;
    uploadedAt: string;
    status: string; // 'PENDING', 'APPROVED', 'REJECTED'
  }>;

  @Column({ default: 'PENDING', comment: 'Overall KYC status: PENDING, VERIFIED, REJECTED' })
  kycStatus: string;

  // ── Verification & Status ───────────────────────────────────────────────────
  @Column({ default: 'PENDING' })
  verificationStatus: string; // PENDING, VERIFIED, REJECTED, SUSPENDED

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'float', default: 0 })
  sellerRating: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  @Column({ type: 'int', default: 0 })
  totalProducts: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  // ── Commission & Financials ─────────────────────────────────────────────────
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Seller-specific commission override. Null = use category/global default.',
  })
  commissionRate: number | null;

  // ── Admin Tracking ──────────────────────────────────────────────────────────
  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Admin user ID who approved/rejected this seller',
  })
  approvedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true, comment: 'Reason for rejection or suspension' })
  rejectionReason: string | null;

  // ── Ownership ───────────────────────────────────────────────────────────────
  /**
   * Auth user (`users.id`) who owns this seller account.
   *
   * Every seller-scoped route authorises against this column: a caller may only
   * act on a seller whose `ownerId` matches their JWT subject. Before this column
   * existed there was no link from a seller to a user at all, so no ownership
   * check was expressible — which is why the seller routes shipped unguarded.
   *
   * Nullable only so pre-existing rows can be backfilled. A NULL owner is treated
   * as "nobody owns this" and is denied to every non-admin caller — see
   * SellerOwnershipGuard. Backfill legacy rows before relying on those routes.
   */
  @Index()
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  // ── Regional ────────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', name: 'franchise_id', nullable: true })
  franchiseId: string | null;

  @Column({ type: 'varchar', name: 'region_code', nullable: true })
  regionCode: string | null;

  // ── Timestamps ──────────────────────────────────────────────────────────────
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
