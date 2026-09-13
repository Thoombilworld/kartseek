import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * One market's hotel configuration — the row behind BOTH admin screens.
 *
 * ── Why one table and not two ───────────────────────────────────────────────
 *
 * The console has a Pricing screen (platform fee, service tax, cleaning fee,
 * free-cancellation window) and a Settings screen (auto-approve, room cap,
 * default commission), and `admin.hotel.pricing`/`admin.hotel.settings` are two
 * commands. They are not two records: both screens configure THE SAME MARKET,
 * and giving each its own table is how a platform ends up with two answers to
 * "what is Qatar's free-cancellation window". One row per market, two commands
 * that each own a disjoint set of its columns, and both reads return the whole
 * row so neither screen can show a figure the other has already changed.
 *
 * `freeCancellationWindowHours` is owned by the PRICING command — it is a
 * refund term, and the Settings screen's copy of the same number is a duplicate
 * control over one column, not a second setting. Recorded here so the next
 * person to add `cancellationWindow` to the settings DTO reads this first.
 *
 * ── WHAT ACTUALLY READS THIS ROW (M5 review, Important 1) ───────────────────
 *
 * Two of the seven keys are enforced; five are recorded and enforced by nothing
 * yet. That is not a detail for a report — every field name here is an EFFECT
 * name, and an administrator who sets a cleaning fee will believe bookings in
 * their market now carry one.
 *
 *   autoApproveHotels            ENFORCED — `HotelService.createHotel` puts a
 *                                newly registered property straight into ACTIVE
 *                                when its market says so, and publishes
 *                                `hotel.approved` like any other approval.
 *   defaultCommissionRate        ENFORCED — `HotelService.createHotel` stamps it
 *                                on a property registering with no negotiated
 *                                rate, in place of the column default.
 *   platformFeePercent           recorded, not enforced by any hotel workflow
 *   serviceTaxPercent            yet. Nothing in booking, pricing or checkout
 *   cleaningFee                  reads them; `HotelService.createBooking`
 *   freeCancellationWindowHours  computes a total from the room and the hotel's
 *   maxRoomsPerHotel             own `taxRate`, and `addRoom` caps nothing.
 *
 * `SETTINGS_ENFORCEMENT` in `admin/admin.service.ts` is that table in code, and
 * it rides on every settings READ and WRITE payload as `enforcement`, so the
 * console can grey out or label what does not act yet. A spec pins the map, so
 * wiring a consumer means deliberately flipping its entry rather than leaving a
 * screen quietly lying about what it does.
 *
 * ── The market ──────────────────────────────────────────────────────────────
 *
 * `countryCode`, ISO-2, NOT NULL and UNIQUE: a settings row belongs to exactly
 * one market and to no hotel. A nullable market here would be a row no scoped
 * administrator could edit and every scoped administrator could see — which is
 * why `updateSettings`/`updatePricing` refuse a global caller who names no
 * market rather than writing a NULL. Spelled `countryCode` to match
 * `hotels.countryCode`, this module's market column (the platform's
 * `region_code` under the name hotel predates it by; the exception is
 * registered in `libs/common/src/market/market-scope.ts`).
 */
@Entity({ name: 'hotel_market_settings', schema: 'hotel' })
export class HotelMarketSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * `length: 3` holding an ISO-2 value, deliberately: that is exactly what
   * `hotels.countryCode` is (`character varying(3)`), and a settings row whose
   * market column is narrower than the column it is compared against is a
   * difference waiting to matter. One width for one fact.
   */
  @Index({ unique: true })
  @Column({ length: 3, comment: 'ISO-2 market this configuration applies to' })
  countryCode: string;

  // ── Pricing — written by `admin_hotel_update_pricing` ───────────────────────

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Platform fee percentage charged on a booking',
  })
  platformFeePercent: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Service tax / VAT percentage',
  })
  serviceTaxPercent: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: "Flat cleaning fee, in the market's own currency",
  })
  cleaningFee: number;

  @Column({
    type: 'int',
    default: 24,
    comment: 'Hours before check-in during which cancellation is free',
  })
  freeCancellationWindowHours: number;

  // ── Operations — written by `admin_hotel_update_settings` ───────────────────

  @Column({
    default: false,
    comment: 'Whether a new hotel in this market goes live without a human decision',
  })
  autoApproveHotels: boolean;

  @Column({ type: 'int', default: 500, comment: 'Upper bound on rooms a single property may list' })
  maxRoomsPerHotel: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 15,
    comment: 'Commission applied to a hotel in this market that has no negotiated rate',
  })
  defaultCommissionRate: number;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'The administrator who last wrote this row, from the verified token',
  })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
