import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Queries and bodies for `AdminDoctorController`.
 *
 * Every class here is validated by the gateway's global `GatewayValidationPipe`
 * (`whitelist`, `forbidNonWhitelisted`, `transform` with implicit conversion)
 * simply by being the declared type of a `@Query()` or `@Body()` parameter.
 * Two consequences shape what follows:
 *
 *  * A field the console sends but this file does not declare is answered with
 *    400 `property <x> should not exist`. That is the intended behaviour — a
 *    property silently dropped looks like a setting that saves and never takes
 *    effect — so the declared set has to match what the screens really post.
 *  * Where a shape is backed by a table, the property names here are the
 *    ENTITY's column names, so nothing passes validation and is then discarded
 *    by TypeORM.
 *
 * `adminId`/`actorId` is absent everywhere by design: the controller takes the
 * acting administrator from the verified token, never from a body. `id` is
 * absent from every body for the same reason — it is the path parameter, and a
 * body carrying one used to retarget a decision at a record in another market.
 *
 * `countryCode` is a REQUESTED market. It is bounded here and resolved by
 * `scopeOf` in the handler — a locked admin naming another market is refused
 * there, before any RPC, and never widened into a query. The doctor module's
 * market COLUMN is `region_code` (on `clinics`, and as of M6 on `doctors`); the
 * query parameter keeps the platform-wide `countryCode` spelling so the console
 * asks all six module consoles the same question the same way.
 */

/** ISO 3166-1 alpha-2, or a sub-region such as `IN-MH`. `resolveMarket` upper-cases. */
const MARKET = /^[A-Za-z]{2}(?:[-_][A-Za-z0-9]{1,5})?$/;

/**
 * A boolean that means what the client actually sent.
 *
 * `GatewayValidationPipe` runs `transformOptions: { enableImplicitConversion:
 * true }`, under which class-transformer coerces a value to the property's
 * reflected `design:type` with `Boolean(value)` — and `Boolean('false')` is
 * `true`. `@IsBoolean()` then passes, because by the time it looks the value
 * really is a boolean, so `{"verified":"false"}` would VERIFY a practitioner
 * whose credentials an administrator had just refused.
 *
 * `obj` rather than `value` because implicit conversion has already run by the
 * time a `@Transform` is called: `value` is the coerced `true` and the original
 * is gone. Anything that is not a recognised spelling passes through unchanged
 * so `@IsBoolean()` below refuses it with a 400 naming the property — never
 * silently resolved to either answer. (Introduced by M3 and measured in
 * `admin-pharmacy.dto.spec.ts`; the same pipe, the same trap. Never
 * `@Type(() => Boolean)`, which is the coercion itself.)
 */
const BooleanParam = (): PropertyDecorator =>
  Transform(({ obj, key }) => {
    const raw = (obj as Record<string, unknown> | undefined)?.[key];
    if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
    return raw;
  });

/**
 * A status filter folded to the case the column actually holds.
 *
 * This module has BOTH conventions and they are not a mistake to fix here:
 * `clinics.status` and `doctors.status` are lower-case enums (`pending`,
 * `active`, `suspended`), while `appointments.status` and
 * `doctor_prescriptions.status` are upper snake (`IN_PROGRESS`, `NO_SHOW`,
 * `DISPENSED`). Renaming either would be a data migration on live enum types for
 * a cosmetic gain, so the gateway folds instead — and an unmatched word is then a
 * 400 that names the set, rather than a silent no-match that reads on screen as
 * "this market has none of those", the exact lie this plan exists to remove.
 */
const fold = (to: 'upper' | 'lower') =>
  Transform(({ value }) =>
    typeof value === 'string'
      ? (() => {
          const t = value.trim().replace(/[\s-]+/g, '_');
          return to === 'upper' ? t.toUpperCase() : t.toLowerCase();
        })()
      : value,
  );

const UpperSnake = () => fold('upper');
const LowerSnake = () => fold('lower');

/** `Clinic.status` — the clinic's own lifecycle state. */
export const DOCTOR_CLINIC_STATUSES = [
  'pending',
  'active',
  'suspended',
  'blocked',
  'rejected',
] as const;

/** `Doctor.status` — the practitioner's own lifecycle state. */
export const DOCTOR_STATUSES = ['pending', 'active', 'suspended', 'blocked'] as const;

/** `Appointment.status`. */
export const DOCTOR_APPOINTMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

/** `Prescription.status`. */
export const DOCTOR_PRESCRIPTION_STATUSES = ['DRAFT', 'ISSUED', 'DISPENSED'] as const;

/** The report windows doctor-service recognises. Anything else is a 400. */
export const DOCTOR_REPORT_PERIODS = ['7d', '30d', '90d', '365d'] as const;

/** Just the market — for the reads that take no page and no filter. */
export class AdminDoctorMarketQueryDto {
  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;
}

/** Page controls plus the requested market — the base every doctor list read shares. */
export class AdminDoctorQueryDto extends AdminDoctorMarketQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Capped rather than clamped, the same ruling as the admin money reads: an
   * export script asking for 5000 rows should be told it cannot have them, not
   * handed 100 with no indication that the rest exist.
   */
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AdminDoctorClinicsQueryDto extends AdminDoctorQueryDto {
  @ApiPropertyOptional({ enum: DOCTOR_CLINIC_STATUSES })
  @IsOptional()
  @LowerSnake()
  @IsIn(DOCTOR_CLINIC_STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'Partial city match' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  specialty?: string;
}

export class AdminDoctorListQueryDto extends AdminDoctorQueryDto {
  @ApiPropertyOptional({ enum: DOCTOR_STATUSES })
  @IsOptional()
  @LowerSnake()
  @IsIn(DOCTOR_STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  specialty?: string;
}

export class AdminDoctorAppointmentsQueryDto extends AdminDoctorQueryDto {
  @ApiPropertyOptional({ enum: DOCTOR_APPOINTMENT_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(DOCTOR_APPOINTMENT_STATUSES as unknown as string[])
  status?: string;

  /**
   * One day's queue. `appointments.date` is a DATE column, so a full timestamp
   * would match nothing and read as "no appointments that day".
   */
  @ApiPropertyOptional({ example: '2026-09-13', description: 'ISO date, YYYY-MM-DD' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be an ISO date, YYYY-MM-DD' })
  date?: string;
}

export class AdminDoctorPrescriptionsQueryDto extends AdminDoctorQueryDto {
  @ApiPropertyOptional({ enum: DOCTOR_PRESCRIPTION_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(DOCTOR_PRESCRIPTION_STATUSES as unknown as string[])
  status?: string;
}

export class AdminDoctorReportsQueryDto extends AdminDoctorMarketQueryDto {
  @ApiPropertyOptional({ enum: DOCTOR_REPORT_PERIODS, default: '30d' })
  @IsOptional()
  @IsIn(DOCTOR_REPORT_PERIODS as unknown as string[])
  period?: string = '30d';
}

/**
 * The verification decision on one practitioner.
 *
 * `verified` is REQUIRED and is a real boolean, not a truthy string — see
 * `BooleanParam`. A missing `verified` used to reach doctor-service as
 * `undefined` and be read as "not verified", so a request that meant nothing
 * recorded a refusal.
 */
export class VerifyDoctorDto {
  @ApiProperty({ description: 'true verifies the practitioner; false records a refusal' })
  @BooleanParam()
  @IsBoolean()
  verified: boolean;

  /**
   * Required when REFUSING, optional when verifying, and validated whenever it
   * is present.
   *
   * A refusal with no note is a decision nobody can review later; a verification
   * needs no justification because it is the outcome the applicant asked for.
   * `@IsOptional()` alone would have skipped the length rule for
   * `{"notes": null}` as well as for an absent key, so the condition names both
   * cases explicitly.
   */
  @ApiPropertyOptional({ minLength: 3, maxLength: 1000 })
  @ValidateIf((o) => o.verified === false || o.notes !== undefined)
  @IsString()
  @Length(3, 1000)
  notes?: string;
}

/**
 * Suspending a practitioner. The reason reaches them, so it is required.
 *
 * **This is a contract TIGHTENING, stated plainly.** The route previously took
 * an inline `{ reason: string }` that nothing validated and doctor-service had
 * nowhere to store, so a practitioner went offline with nothing on the row to
 * say why. M6 stores it (`doctors.suspensionReason`, with `suspendedBy` and
 * `suspendedAt`), which is precisely why an empty body is now a 400 where it
 * used to be a 200 that recorded nothing.
 */
export class SuspendDoctorDto {
  @ApiProperty({ example: 'Medical registration lapsed', minLength: 3, maxLength: 500 })
  @IsString()
  @Length(3, 500)
  reason: string;
}

/** One entry in the global specialty catalogue. No market: the catalogue is shared. */
export class CreateDoctorSpecialtyDto {
  @ApiProperty({ example: 'Hepatology', minLength: 2, maxLength: 100 })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;
}

/**
 * One market's doctor configuration.
 *
 * Every figure is BOUNDED. A percentage above 100 or a negative fee is not a
 * setting anyone meant to save, and an unbounded numeric on an admin write is
 * how the wallet routes came to accept a negative amount.
 */
export class UpdateDoctorSettingsDto {
  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  platformFeePercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 12.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @BooleanParam()
  @IsBoolean()
  autoApproveClinics?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 500, example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxAppointmentsPerDoctorPerDay?: number;

  /** Thirty days. Beyond that a "free cancellation window" is just free cancellation. */
  @ApiPropertyOptional({ minimum: 0, maximum: 720, example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  cancellationWindowHours?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 365, example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  prescriptionValidityDays?: number;
}
