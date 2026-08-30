import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

// ── Status Enum ───────────────────────────────────────────────────────────────

export enum HotelOwnerStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
}

// ── Entity ────────────────────────────────────────────────────────────────────

@Entity('hotel_owners')
export class HotelOwner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ comment: 'Links to Auth Service user' })
  userId: string;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255, comment: 'Hotel management company or business name' })
  businessName: string;

  @Column({ length: 3, comment: 'Primary country of operations' })
  countryCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'text', nullable: true })
  businessAddress: string | null;

  // ── KYC ─────────────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true, comment: 'Business registration / trade license number' })
  registrationNumber: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Tax registration number (GST/VAT)' })
  taxNumber: string | null;

  @Column({ type: 'jsonb', nullable: true })
  kycDocuments: Array<{
    type: string;
    documentNumber?: string;
    url: string;
    status: 'pending' | 'approved' | 'rejected';
    uploadedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
  }>;

  // ── Banking ─────────────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  bankDetails: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    ifsc?: string;
    swift?: string;
    iban?: string;
    routingNumber?: string;
  };

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: HotelOwnerStatus, default: HotelOwnerStatus.PENDING_VERIFICATION })
  status: HotelOwnerStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  // ── Profile ─────────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'int', default: 0, comment: 'Number of properties managed' })
  propertyCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0, comment: 'Average rating across all properties' })
  avgRating: number;

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
