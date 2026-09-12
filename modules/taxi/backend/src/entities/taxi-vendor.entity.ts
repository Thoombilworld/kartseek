import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { TaxiDriverEntity } from './taxi-driver.entity';
import { TaxiDocumentEntity } from './taxi-document.entity';

/**
 * TaxiVendorEntity — A fleet operator / taxi vendor.
 *
 * Vendors register under a specific country, manage a fleet of drivers,
 * and are subject to Super Admin approval for all lifecycle transitions.
 */
@Entity('taxi_vendors')
export class TaxiVendorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  /**
   * MARKET COLUMN — ISO-2, the platform's `region_code` under another name.
   *
   * Taxi predates the convention and calls it `countryCode`; every scope
   * check in this module reads THIS column, and a new entity here uses
   * `regionCode` (2026-09-12 audit I7). The register of exceptions lives in
   * `libs/common/src/market/market-scope.ts`, above `normaliseMarket` — which is
   * what every one of those checks passes through, so one rule serves both
   * spellings and no caller has to remember which.
   *
   * A driver inherits this vendor’s market when their own is null, which is
   * why `driver-onboarding.service.ts` predicates on
   * `COALESCE(drv.countryCode, ven.countryCode)`.
   */
  @Column({ length: 5 })
  @Index()
  countryCode: string;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 200 })
  ownerName: string;

  @Column({ length: 200, unique: true })
  email: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessLicenseNo: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'suspended', 'blocked', 'rejected'],
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'active' | 'suspended' | 'blocked' | 'rejected';

  @Column({ type: 'varchar', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  suspensionReason: string | null;

  @Column({ default: 50 })
  maxDrivers: number;

  /** Vendor-specific commission rate override (percentage). Null = use country default. */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number | null;

  @Column({ type: 'jsonb', nullable: true })
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    routingNumber?: string;
    swiftCode?: string;
    paymentGateway?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => TaxiDriverEntity, (driver) => driver.vendor)
  drivers: Relation<TaxiDriverEntity[]>;
  // Documents are polymorphic (see TaxiDocumentEntity): loaded by
  // { ownerType, ownerId } rather than through a relation, so this is a
  // plain in-memory field the service populates — not a mapped column.
  documents?: TaxiDocumentEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
