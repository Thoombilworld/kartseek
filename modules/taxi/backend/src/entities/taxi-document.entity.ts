import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * TaxiDocumentEntity — Polymorphic document record for vendors and drivers.
 *
 * Tracks uploaded compliance documents through a review lifecycle:
 *   uploaded → pending_review → approved | rejected | expired
 *
 * Documents are required based on per-country configuration
 * (see TaxiCountryConfigEntity.requiredVendorDocuments / requiredDriverDocuments).
 */
@Entity({ name: 'taxi_documents', schema: 'taxi' })
export class TaxiDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['vendor', 'driver'] })
  @Index()
  ownerType: 'vendor' | 'driver';

  @Column()
  @Index()
  ownerId: string;

  // ─── Polymorphic ownership ─────────────────────────────────────────────────
  //
  // `ownerType` + `ownerId` above are the whole association: a document belongs
  // to either a vendor or a driver, and which one is decided by the
  // discriminator, not by the schema.
  //
  // This used to be modelled as two @ManyToOne relations, both with
  // @JoinColumn({ name: 'ownerId' }). That cannot work. A foreign key points at
  // exactly one table, so two of them on one column means every row has to be a
  // vendor *and* a driver simultaneously — and TypeORM derives the constraint
  // name from the table and column, so both got the same name and synchronize
  // aborted with `constraint "FK_e8e9..." already exists`.
  //
  // Because synchronize runs in one transaction, that abort rolled back the
  // whole thing: none of taxi's nine tables were ever created. The service
  // still booted and still answered /health with 200, so what it looked like
  // from outside was every database-backed taxi route failing with
  // "relation ... does not exist".
  //
  // Resolve the owner in the service, branching on `ownerType`. Nothing read
  // `vendorOwner` or `driverOwner`; only the inverse @OneToMany sides on
  // TaxiVendorEntity and TaxiDriverEntity referenced them, and those are gone
  // too.

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
