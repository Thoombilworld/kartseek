import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { TaxiVendorEntity } from './taxi-vendor.entity';
import { TaxiDriverEntity } from './taxi-driver.entity';

/**
 * TaxiDocumentEntity — Polymorphic document record for vendors and drivers.
 *
 * Tracks uploaded compliance documents through a review lifecycle:
 *   uploaded → pending_review → approved | rejected | expired
 *
 * Documents are required based on per-country configuration
 * (see TaxiCountryConfigEntity.requiredVendorDocuments / requiredDriverDocuments).
 */
@Entity('taxi_documents')
export class TaxiDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['vendor', 'driver'] })
  @Index()
  ownerType: 'vendor' | 'driver';

  @Column()
  @Index()
  ownerId: string;

  // ─── Polymorphic Relations ─────────────────────────────────────────────────

  @ManyToOne(() => TaxiVendorEntity, (vendor) => vendor.documents, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ownerId' })
  vendorOwner: TaxiVendorEntity;

  @ManyToOne(() => TaxiDriverEntity, (driver) => driver.documents, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ownerId' })
  driverOwner: TaxiDriverEntity;

  // ─── Document Info ─────────────────────────────────────────────────────────

  /**
   * Document type identifier.
   *
   * Vendor types: business_license, tax_certificate, insurance_certificate,
   *               fleet_registration, address_proof
   * Driver types: driving_license, vehicle_registration, vehicle_insurance,
   *               background_check, identity_proof, profile_photo,
   *               vehicle_photo, medical_certificate
   */
  @Column({ length: 50 })
  @Index()
  documentType: string;

  @Column({ length: 200 })
  displayName: string;

  @Column()
  fileUrl: string;

  @Column({ length: 200 })
  fileName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  // ─── Review Lifecycle ──────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ['pending', 'under_review', 'approved', 'rejected', 'expired'],
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';

  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  /** Document expiry date (e.g., license expiry, insurance renewal). */
  @Column({ type: 'date', nullable: true })
  expiresAt: Date | null;

  /** Reference or certificate number on the document. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  documentNumber: string | null;

  /** Country of issuance. */
  @Column({ type: 'varchar', length: 5, nullable: true })
  issuingCountry: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ─── Computed ──────────────────────────────────────────────────────────────

  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date(this.expiresAt) < new Date();
  }

  get needsReview(): boolean {
    return this.status === 'pending' || this.status === 'under_review';
  }
}
