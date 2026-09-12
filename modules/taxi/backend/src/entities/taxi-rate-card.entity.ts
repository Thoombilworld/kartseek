import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * TaxiRateCardEntity — Per-country, per-vehicle-type fare rate card.
 *
 * Replaces the hardcoded DEFAULT_RATES in FareCalculationService.
 * Super Admins configure these through the admin pricing panel.
 *
 * Rate cards are cached in Redis (key: `fare:rate:{countryCode}:{vehicleType}`)
 * and refreshed on update.
 */
@Entity({ name: 'taxi_rate_cards', schema: 'taxi' })
@Unique(['countryCode', 'vehicleType'])
export class TaxiRateCardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 5 })
  @Index()
  countryCode: string;

  @Column({ length: 30 })
  @Index()
  vehicleType: string;

  /** Human-readable label for this vehicle type (e.g. "Economy", "Comfort Plus"). */
  @Column({ length: 50 })
  displayName: string;

  // ─── Base Rates ────────────────────────────────────────────────────────────

  /** Fixed base fare charged at ride start. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  baseFare: number;

  /** Rate per kilometer. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distanceRate: number;

  /** Rate per minute of travel. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  timeRate: number;

  /** Minimum fare enforced regardless of distance/time. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  minimumFare: number;

  /** Rate per minute of waiting (after free waiting period). */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  waitingRate: number;

  // ─── Surcharges ────────────────────────────────────────────────────────────

  /** Additional flat fee for night rides (e.g. 22:00 - 06:00). */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  nightSurcharge: number;

  /** Additional flat fee for airport pickups/dropoffs. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  airportSurcharge: number;

  /** Cancellation fee if ride is cancelled after driver assignment. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cancellationFee: number;

  // ─── Vehicle Metadata ──────────────────────────────────────────────────────

  @Column({ default: 4 })
  maxPassengers: number;

  @Column({ default: 2 })
  maxLuggage: number;

  @Column({ default: false })
  isAccessible: boolean;

  /** Icon identifier for the client apps. */
  @Column({ length: 50, default: 'car' })
  iconName: string;

  /** Sort order for display (lower = first). */
  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
