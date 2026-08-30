import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * TaxiCountryConfigEntity — Per-country taxi module configuration.
 *
 * Stores all region-specific settings that Super Admins can adjust:
 *  - Feature toggles (OTP, scheduled rides, cash, tips)
 *  - Payment gateways and vehicle types enabled
 *  - Documentation requirements for vendors and drivers
 *  - Commission and tax rates
 *  - Surge pricing limits
 *  - Peak hour definitions
 *  - Emergency contacts
 *
 * The countryCode (ISO 3166-1 alpha-2) is the primary key.
 * Each country gets exactly one configuration row.
 */
@Entity('taxi_country_configs')
export class TaxiCountryConfigEntity {
  @PrimaryColumn({ length: 5 })
  countryCode: string;

  @Column({ length: 10, default: 'INR' })
  currency: string;

  @Column({ length: 3, default: 'km' })
  distanceUnit: string;

  // ─── Feature Toggles ──────────────────────────────────────────────────────

  @Column({ default: true })
  otpRequired: boolean;

  @Column({ default: true })
  scheduledRidesEnabled: boolean;

  @Column({ default: true })
  cashEnabled: boolean;

  @Column({ default: true })
  tipsEnabled: boolean;

  @Column({ default: 3 })
  maxStops: number;

  @Column({ default: true })
  rideShareEnabled: boolean;

  @Column({ default: true })
  vendorsEnabled: boolean;

  // ─── Payment & Vehicle Types ──────────────────────────────────────────────

  /** e.g. ['card', 'cash', 'wallet'] */
  @Column({ type: 'jsonb', default: '["cash", "card", "wallet"]' })
  enabledPaymentGateways: string[];

  /** e.g. ['economy', 'comfort', 'premium', 'bike', 'suv'] */
  @Column({ type: 'jsonb', default: '["economy", "comfort", "premium", "bike"]' })
  enabledVehicleTypes: string[];

  // ─── Documentation Requirements ───────────────────────────────────────────

  /**
   * Required document types for vendor registration.
   * e.g. ['business_license', 'tax_certificate', 'insurance_certificate']
   */
  @Column({ type: 'jsonb', default: '["business_license", "tax_certificate", "insurance_certificate"]' })
  requiredVendorDocuments: string[];

  /**
   * Required document types for driver onboarding.
   * e.g. ['driving_license', 'vehicle_registration', 'vehicle_insurance', 'identity_proof']
   */
  @Column({ type: 'jsonb', default: '["driving_license", "vehicle_registration", "vehicle_insurance", "identity_proof"]' })
  requiredDriverDocuments: string[];

  // ─── Financial Configuration ──────────────────────────────────────────────

  /** Platform commission rate as a decimal (e.g. 0.15 = 15%). */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.15 })
  platformCommissionRate: number;

  /** Default vendor commission rate as a decimal (e.g. 0.05 = 5%). */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.05 })
  defaultVendorCommissionRate: number;

  /** Tax rate applied to fares (e.g. 0.16 = 16% VAT). */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.0 })
  taxRate: number;

  // ─── Surge Pricing ────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', default: '{"minMultiplier": 1.0, "maxMultiplier": 3.0, "autoEnabled": true}' })
  surgeLimits: {
    minMultiplier: number;
    maxMultiplier: number;
    autoEnabled: boolean;
  };

  /**
   * Peak hour definitions with time-of-day multipliers.
   * e.g. [{ start: 7, end: 9, multiplier: 1.15, label: "Morning Rush" }]
   */
  @Column({ type: 'jsonb', default: '[]' })
  peakHourConfig: Array<{
    start: number;
    end: number;
    multiplier: number;
    label: string;
  }>;

  // ─── Regional Settings ────────────────────────────────────────────────────

  @Column({ length: 20, default: '911' })
  emergencyNumber: string;

  @Column({ length: 10, default: 'en' })
  defaultLocale: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone: string | null;

  /** Minimum driver rating to stay active. */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 3.0 })
  minimumDriverRating: number;

  /** Maximum free waiting time in minutes before charges apply. */
  @Column({ default: 5 })
  freeWaitingMinutes: number;

  /** Auto-cancel timeout in seconds if no driver accepts. */
  @Column({ default: 120 })
  autoCancelTimeoutSeconds: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
