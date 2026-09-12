import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { TaxiDriverEntity } from './taxi-driver.entity';
import { TaxiVendorEntity } from './taxi-vendor.entity';

/**
 * TaxiComplaintEntity — A complaint or incident report linked to a trip.
 *
 * Tracks the full lifecycle of a complaint: filing → investigation → resolution.
 * Links to the trip, driver, and optionally the vendor for accountability tracing.
 * Super Admins use this to enforce disciplinary actions per local regulations.
 */
@Entity({ name: 'taxi_complaints', schema: 'taxi' })
export class TaxiComplaintEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Trip / ride this complaint relates to */
  @Column({ length: 100 })
  @Index()
  tripId: string;

  /** Country where the trip occurred — for jurisdictional compliance */
  @Column({ length: 5 })
  @Index()
  countryCode: string;

  /** Who filed the complaint */
  @Column({
    type: 'enum',
    enum: ['customer', 'driver', 'vendor', 'internal'],
    default: 'customer',
  })
  filedBy: 'customer' | 'driver' | 'vendor' | 'internal';

  /** ID of the person who filed (customer ID, driver ID, or admin ID) */
  @Column({ length: 100 })
  filerId: string;

  /** Display name of the filer for quick reference */
  @Column({ length: 200 })
  filerName: string;

  // ─── Complaint Subject ──────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: [
      'safety_incident',
      'fare_dispute',
      'driver_behavior',
      'vehicle_condition',
      'route_deviation',
      'overcharging',
      'payment_issue',
      'harassment',
      'discrimination',
      'damage_to_property',
      'lost_item',
      'cancellation_abuse',
      'no_show',
      'other',
    ],
  })
  @Index()
  category: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'text' })
  description: string;

  /** Optional evidence URLs (photos, audio, dashcam) */
  @Column({ type: 'jsonb', nullable: true })
  evidence: { type: string; url: string; uploadedAt: string }[];

  // ─── Accountability Chain ───────────────────────────────────────────────────

  /** The driver involved in this complaint */
  @ManyToOne(() => TaxiDriverEntity, { nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: Relation<TaxiDriverEntity>;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  driverId: string | null;

  /** Driver's name at time of complaint (denormalized for audit trail) */
  @Column({ type: 'varchar', length: 200, nullable: true })
  driverName: string | null;

  /**
   * Vendor accountable for this driver (null = independently registered driver,
   * meaning the platform is accountable).
   */
  @ManyToOne(() => TaxiVendorEntity, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Relation<TaxiVendorEntity>;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  vendorId: string | null;

  /** Vendor name at time of complaint (denormalized for audit trail) */
  @Column({ type: 'varchar', length: 200, nullable: true })
  vendorName: string | null;

  /**
   * Accountability designation:
   * - 'vendor': Vendor-managed driver — vendor bears accountability
   * - 'platform': Independently registered driver — platform bears accountability
   */
  @Column({
    type: 'enum',
    enum: ['vendor', 'platform'],
    default: 'platform',
  })
  accountability: 'vendor' | 'platform';

  // ─── Trip Context (denormalized for fast queries) ───────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  tripContext: {
    pickupAddress: string;
    dropAddress: string;
    fareAmount: number;
    currency: string;
    vehicleType: string;
    paymentMethod: string;
    tripDate: string;
    tripDuration: number; // minutes
    tripDistance: number; // km
  };

  // ─── Resolution Workflow ────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: [
      'open',
      'investigating',
      'pending_response',
      'escalated',
      'resolved',
      'dismissed',
      'closed',
    ],
    default: 'open',
  })
  @Index()
  status:
    | 'open'
    | 'investigating'
    | 'pending_response'
    | 'escalated'
    | 'resolved'
    | 'dismissed'
    | 'closed';

  @Column({ type: 'varchar', nullable: true })
  assignedTo: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  assignedToName: string | null;

  @Column({ type: 'text', nullable: true })
  internalNotes: string | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({
    type: 'enum',
    enum: ['none', 'warning', 'fine', 'suspension', 'termination', 'ban', 'refund', 'compensation'],
    default: 'none',
  })
  actionTaken: string;

  /** Refund/compensation amount if applicable */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  compensationAmount: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  resolvedBy: string | null;

  /** Escalation level (0 = no escalation) */
  @Column({ default: 0 })
  escalationLevel: number;

  @Column({ type: 'timestamptz', nullable: true })
  escalatedAt: Date | null;

  /** Response deadline based on country-specific SLA */
  @Column({ type: 'timestamptz', nullable: true })
  slaDeadline: Date | null;

  @Column({ default: false })
  slaBreached: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
