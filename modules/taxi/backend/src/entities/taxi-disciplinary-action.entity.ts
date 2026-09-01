import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { TaxiComplaintEntity } from './taxi-complaint.entity';
import { TaxiDriverEntity } from './taxi-driver.entity';
import { TaxiVendorEntity } from './taxi-vendor.entity';

/**
 * TaxiDisciplinaryActionEntity — A formal disciplinary action taken against a
 * driver or vendor following a complaint investigation.
 *
 * Links back to the originating complaint and records the type of action,
 * duration (for suspensions), and compliance with local legal standards.
 * Used by the Super Admin panel for enforcement tracking across jurisdictions.
 */
@Entity('taxi_disciplinary_actions')
export class TaxiDisciplinaryActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The complaint that triggered this action */
  @ManyToOne(() => TaxiComplaintEntity, { nullable: true })
  @JoinColumn({ name: 'complaintId' })
  complaint: Relation<TaxiComplaintEntity>;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  complaintId: string | null;

  /** Country where the action applies — for jurisdictional compliance */
  @Column({ length: 5 })
  @Index()
  countryCode: string;

  // ─── Target ─────────────────────────────────────────────────────────────────

  /** Who is being disciplined */
  @Column({
    type: 'enum',
    enum: ['driver', 'vendor'],
  })
  targetType: 'driver' | 'vendor';

  @ManyToOne(() => TaxiDriverEntity, { nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: Relation<TaxiDriverEntity>;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  driverId: string | null;

  @ManyToOne(() => TaxiVendorEntity, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Relation<TaxiVendorEntity>;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  vendorId: string | null;

  /** Name of the target at time of action (denormalized) */
  @Column({ length: 200 })
  targetName: string;

  // ─── Action Details ─────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: [
      'verbal_warning', 'written_warning', 'fine',
      'temporary_suspension', 'permanent_suspension',
      'license_revocation', 'platform_ban',
      'retraining_required', 'probation',
    ],
  })
  actionType: string;

  @Column({ type: 'text' })
  reason: string;

  /** Legal basis / regulation reference for this action */
  @Column({ type: 'text', nullable: true })
  legalReference: string | null;

  /** Fine amount (if applicable) */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  fineAmount: number | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  fineCurrency: string | null;

  /** Duration of suspension in days (for temporary_suspension) */
  @Column({ type: 'int', nullable: true })
  suspensionDays: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  effectiveFrom: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  effectiveUntil: Date | null;

  // ─── Workflow ───────────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'appealed', 'overturned', 'completed', 'expired'],
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'active' | 'appealed' | 'overturned' | 'completed' | 'expired';

  /** Admin who issued this action */
  @Column()
  issuedBy: string;

  @Column({ length: 200 })
  issuedByName: string;

  /** Appeal details */
  @Column({ type: 'text', nullable: true })
  appealReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  appealedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  appealResolution: string | null;

  /** Whether this was auto-triggered by policy rules (e.g., 3 complaints → auto-suspend) */
  @Column({ default: false })
  autoTriggered: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
