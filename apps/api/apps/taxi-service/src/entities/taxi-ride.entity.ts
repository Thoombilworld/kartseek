import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { TaxiDriverEntity } from './taxi-driver.entity';

/**
 * TaxiRideEntity — Persistent ride record in PostgreSQL.
 *
 * Rides are ALSO stored in Redis for real-time access during active trips.
 * This entity provides durable storage for:
 *  - Ride history (customer & driver)
 *  - Financial reconciliation
 *  - Analytics & reporting
 *  - Dispute resolution
 *
 * Status lifecycle:
 *   SEARCHING_DRIVER → DRIVER_ASSIGNED → DRIVER_ARRIVING → DRIVER_ARRIVED
 *   → RIDE_STARTED → RIDE_COMPLETED / CANCELLED
 */
@Entity('taxi_rides')
export class TaxiRideEntity {
  @PrimaryColumn({ length: 50 })
  id: string;

  // ── Participants ──────────────────────────────────────────────────────────

  @Column({ length: 100 })
  @Index()
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  driverId: string | null;

  @ManyToOne(() => TaxiDriverEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driverId', referencedColumnName: 'id' })
  driver: TaxiDriverEntity;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vendorId: string | null;

  // ── Locations ─────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  pickupLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  pickupLng: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  dropLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  dropLng: number;

  @Column({ length: 500, default: 'Current Location' })
  pickupAddress: string;

  @Column({ length: 500, default: 'Destination' })
  dropAddress: string;

  // ── Trip Details ──────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: [
      'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING',
      'DRIVER_ARRIVED', 'RIDE_STARTED', 'RIDE_COMPLETED',
      'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_ADMIN',
      'NO_DRIVER_FOUND', 'EXPIRED', 'PAYMENT_FAILED',
    ],
    default: 'SEARCHING_DRIVER',
  })
  @Index()
  status: string;

  @Column({ length: 30, default: 'economy' })
  vehicleType: string;

  @Column({ length: 30, default: 'cash' })
  paymentMethod: string;

  @Column({ length: 5, default: 'NG' })
  @Index()
  countryCode: string;

  // ── Pricing ───────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fareEstimate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  finalFare: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  surgeMultiplier: number;

  @Column({ length: 10, default: 'NGN' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  tipAmount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  discount: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  promoCode: string | null;

  // ── Distance & Duration ───────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedDistanceKm: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedDurationMin: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  finalDistanceKm: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  finalDurationMin: number | null;

  // ── OTP & Verification ────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 6, nullable: true })
  otp: string | null;

  @Column({ default: false })
  otpVerified: boolean;

  // ── Rating ────────────────────────────────────────────────────────────────

  @Column({ type: 'smallint', nullable: true })
  customerRating: number | null;

  @Column({ type: 'varchar', nullable: true })
  customerFeedback: string | null;

  @Column({ type: 'smallint', nullable: true })
  driverRating: number | null;

  // ── Cancellation ──────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  cancelReason: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cancelledBy: string | null;

  // ── Timestamps ────────────────────────────────────────────────────────────

  @Column({ type: 'timestamptz', nullable: true })
  driverAssignedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  driverArrivedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  rideStartedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  rideCompletedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ── Computed ──────────────────────────────────────────────────────────────

  get isActive(): boolean {
    return !['RIDE_COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_DRIVER',
      'CANCELLED_BY_ADMIN', 'NO_DRIVER_FOUND', 'EXPIRED', 'PAYMENT_FAILED',
    ].includes(this.status);
  }

  get durationMinutes(): number | null {
    if (!this.rideStartedAt || !this.rideCompletedAt) return null;
    return (this.rideCompletedAt.getTime() - this.rideStartedAt.getTime()) / 60000;
  }
}
