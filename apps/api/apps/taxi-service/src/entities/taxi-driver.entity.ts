import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { TaxiVendorEntity } from './taxi-vendor.entity';
import { TaxiDocumentEntity } from './taxi-document.entity';

/**
 * TaxiDriverEntity — A driver registered on the platform.
 *
 * Drivers can be:
 *  - Independent (vendorId = null) — registered directly with KARTSEEK
 *  - Vendor-managed (vendorId set) — registered through a fleet vendor
 *
 * All drivers are subject to Super Admin approval and document verification
 * regardless of how they were registered.
 */
@Entity('taxi_drivers')
export class TaxiDriverEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ length: 200, unique: true })
  email: string;

  @Column({ length: 5 })
  @Index()
  countryCode: string;

  /** Null = independent driver. Set = vendor-managed driver. */
  @Column({ type: 'varchar', nullable: true })
  @Index()
  vendorId: string | null;

  @ManyToOne(() => TaxiVendorEntity, (vendor) => vendor.drivers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'vendorId' })
  vendor: TaxiVendorEntity;

  @Column({
    type: 'enum',
    enum: ['pending', 'onboarding', 'active', 'suspended', 'blocked', 'rejected'],
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'onboarding' | 'active' | 'suspended' | 'blocked' | 'rejected';

  // ─── Vehicle Info ──────────────────────────────────────────────────────────

  @Column({ length: 30, default: 'economy' })
  vehicleType: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  vehiclePlate: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vehicleModel: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  vehicleColor: string | null;

  @Column({ type: 'int', nullable: true })
  vehicleYear: number | null;

  // ─── Stats ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ default: 0 })
  totalTrips: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100.0 })
  acceptanceRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  cancellationRate: number;

  // ─── License & Compliance ──────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 100, nullable: true })
  licenseNumber: string | null;

  @Column({ type: 'date', nullable: true })
  licenseExpiry: Date | null;

  @Column({ type: 'date', nullable: true })
  insuranceExpiry: Date | null;

  @Column({ type: 'varchar', nullable: true })
  profilePhotoUrl: string | null;

  // ─── Approval ──────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  suspensionReason: string | null;

  /** Percentage of onboarding steps completed (0-100). */
  @Column({ default: 0 })
  onboardingProgress: number;

  // ─── Bank Details ──────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    paymentGateway?: string;
  };

  // ─── Relations ─────────────────────────────────────────────────────────────

  @OneToMany(() => TaxiDocumentEntity, (doc) => doc.driverOwner)
  documents: TaxiDocumentEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ─── Computed ──────────────────────────────────────────────────────────────

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isIndependent(): boolean {
    return !this.vendorId;
  }
}
