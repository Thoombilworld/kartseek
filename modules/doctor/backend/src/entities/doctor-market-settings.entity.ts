import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * One market's doctor configuration — the row behind the Settings screen.
 *
 * ── Why this table exists ───────────────────────────────────────────────────
 *
 * `admin.doctor.settings` and `admin.doctor.updateSettings` configure a MARKET,
 * and this module had no market-level row of any kind. Answering the read from a
 * constant and the write with `{ success: true }` would have been the
 * placeholder API the MODULES plan exists to remove: the console would have
 * shown numbers nobody could change and saved changes that went nowhere.
 *
 * ── The market ──────────────────────────────────────────────────────────────
 *
 * `region_code`, NOT NULL and UNIQUE: a settings row belongs to exactly one
 * market and to no clinic. A nullable market here would be a row every scoped
 * administrator can see and none can edit — which is why `updateSettings`
 * refuses a global caller who names no market rather than writing a NULL.
 *
 * Spelled `region_code` and not `countryCode` on purpose: this module's market
 * column is `clinics.region_code`, and now `doctors.region_code`, which is the
 * platform's own name for it. Hotel spells it `countryCode` because that module
 * predates the platform name and the exception is registered in
 * `libs/common/src/market/market-scope.ts`; doctor has no such history, so it
 * uses the one name.
 *
 * ── Plain `varchar`, no length ──────────────────────────────────────────────
 *
 * Matching `clinics.region_code` and `doctors.region_code` exactly. A settings
 * row whose market column is narrower than the columns it is compared against is
 * a difference waiting to matter; one width for one fact, and here that width is
 * "whatever the other two are".
 */
@Entity({ name: 'doctor_market_settings', schema: 'doctor' })
export class DoctorMarketSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    name: 'region_code',
    comment: 'The market this configuration applies to',
  })
  regionCode: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Platform fee percentage added to a consultation',
  })
  platformFeePercent: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: "The platform's cut of a practitioner's consultation fee",
  })
  commissionPercent: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether a new clinic in this market goes live without a human decision',
  })
  autoApproveClinics: boolean;

  @Column({
    type: 'int',
    default: 50,
    comment: 'Upper bound on appointments one practitioner may take',
  })
  maxAppointmentsPerDoctorPerDay: number;

  @Column({
    type: 'int',
    default: 4,
    comment: 'Hours before an appointment during which cancellation is free',
  })
  cancellationWindowHours: number;

  @Column({
    type: 'int',
    default: 30,
    comment: 'How long a prescription issued in this market stays valid',
  })
  prescriptionValidityDays: number;

  /**
   * The administrator who last wrote this row, from the verified token.
   *
   * `T | null` needs the explicit `type:` — TypeScript reflects a union as
   * `Object` and TypeORM then cannot infer a column type, which is a boot
   * failure rather than a silent default (`project_typeorm_nullable_reflection`).
   */
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
