import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/**
 * Bodies for `AdminTaxiController`.
 *
 * Every class here is validated by the gateway's global
 * `GatewayValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`
 * with implicit conversion) simply by being the declared type of a `@Body()`
 * parameter. Two consequences shape what follows:
 *
 *  * A field the console sends but this file does not declare is answered with
 *    400 `property <x> should not exist`, so the declared set has to match what
 *    the admin screens actually post.
 *  * A property whose declared type is a class or an array of one must carry
 *    `@Type()`. Implicit conversion rebuilds untyped nested values from the
 *    reflected `design:type` — the failure that turned marketplace order items
 *    into empty arrays (see `pipes/forwarding-validation.pipe.ts`).
 *
 * `adminId` is absent everywhere by design: the controller takes the actor from
 * the verified token.
 *
 * Where a shape is backed by a table, the property names here are the entity's
 * column names, because taxi-service assigns the forwarded payload straight
 * onto the row (`Object.assign(card, dto)` in `TaxiConfigService`). A DTO
 * property that is not a column is silently dropped by TypeORM and looks like a
 * setting that saves and never takes effect; `admin-validation.spec.ts` fails
 * when the two drift.
 */

/** ISO 3166-1 alpha-2. `resolveMarket` upper-cases, so either case is accepted. */
const ISO2 = /^[A-Za-z]{2}$/;

/**
 * Optional, but a `null` is a value rather than an absence.
 *
 * `@IsOptional()` skips every rule for `null` as well as `undefined`, so
 * `PUT /admin/taxi/config/QA {"currency": null}` would sail past the pipe and
 * reach `Object.assign(row, { currency: null })` on a NOT NULL column — a 500
 * where a 400 belongs. This skips only when the key was omitted, so a null is
 * validated by the property's own rule and refused with a message naming it.
 *
 * `timezone` deliberately keeps plain `@IsOptional()`: it is the one nullable
 * column, where clearing it is a request an administrator may really make.
 */
const IfPresent = (): PropertyDecorator => ValidateIf((_object, value) => value !== undefined);

/** A decision that has to carry a reason: vendor/driver suspension, driver block, document rejection. */
export class ReasonDto {
  @ApiProperty({ example: 'Expired insurance certificate', minLength: 3, maxLength: 500 })
  @IsString()
  @Length(3, 500)
  reason: string;
}

/** Closing a rider complaint. Longer than a reason — this text is shown to the complainant. */
export class ResolutionDto {
  @ApiProperty({ example: 'Fare recalculated and the difference refunded', maxLength: 1000 })
  @IsString()
  @Length(3, 1000)
  resolution: string;
}

/**
 * One per-country, per-vehicle-type fare card — the rows the fare calculator
 * reads. Properties are `TaxiRateCardEntity` columns.
 *
 * `id` is not accepted: the upsert keys on (countryCode, vehicleType), and a
 * caller that could send `id` could re-key an existing card onto another row.
 */
export class RateCardUpsertDto {
  @ApiProperty({ example: 'QA' })
  @Matches(ISO2, { message: 'countryCode must be a two-letter ISO country code' })
  countryCode: string;

  @ApiProperty({ example: 'economy' })
  @IsString()
  @Length(2, 30)
  vehicleType: string;

  @ApiPropertyOptional({ example: 'Economy' })
  @IfPresent()
  @IsString()
  @Length(1, 50)
  displayName?: string;

  @ApiProperty({ description: 'Fixed fare charged at ride start' })
  @IsNumber()
  @Min(0)
  baseFare: number;

  @ApiProperty({ description: 'Rate per kilometre' })
  @IsNumber()
  @Min(0)
  distanceRate: number;

  @ApiProperty({ description: 'Rate per minute of travel' })
  @IsNumber()
  @Min(0)
  timeRate: number;

  @ApiProperty({ description: 'Floor applied regardless of distance and time' })
  @IsNumber()
  @Min(0)
  minimumFare: number;

  @ApiPropertyOptional({ description: 'Rate per minute of waiting, after the free period' })
  @IfPresent()
  @IsNumber()
  @Min(0)
  waitingRate?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsNumber()
  @Min(0)
  nightSurcharge?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsNumber()
  @Min(0)
  airportSurcharge?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsNumber()
  @Min(0)
  cancellationFee?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsInt()
  @Min(1)
  @Max(20)
  maxPassengers?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsInt()
  @Min(0)
  @Max(20)
  maxLuggage?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  isAccessible?: boolean;

  @ApiPropertyOptional({ example: 'car' })
  @IfPresent()
  @IsString()
  @Length(1, 50)
  iconName?: string;

  @ApiPropertyOptional({ description: 'Display order, lower first' })
  @IfPresent()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * `POST /admin/taxi/pricing`. The aggregate pricing screen writes the same
 * fare card, so the shape is the same one — deliberately by inheritance, so a
 * column added to one cannot be forgotten on the other.
 */
export class PricingUpdateDto extends RateCardUpsertDto {}

export class SurgeUpdateDto {
  @ApiProperty({ example: 'zone-doha-west' })
  @IsString()
  @Length(1, 80)
  zoneId: string;

  @ApiProperty({ description: 'Fare multiplier while the zone is surging', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  multiplier: number;

  @ApiPropertyOptional({ example: 'QA' })
  @IfPresent()
  @Matches(ISO2, { message: 'countryCode must be a two-letter ISO country code' })
  countryCode?: string;

  @ApiPropertyOptional({ description: 'How long the multiplier stands, in seconds' })
  @IfPresent()
  @IsInt()
  @Min(60)
  @Max(86_400)
  ttlSeconds?: number;
}

export class RouteCreateDto {
  @ApiProperty({ example: 'Doha — Al Khor' })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty({ example: 'QA' })
  @Matches(ISO2, { message: 'countryCode must be a two-letter ISO country code' })
  countryCode: string;

  @ApiProperty({ example: 'Hamad International Airport' })
  @IsString()
  @Length(2, 120)
  origin: string;

  @ApiProperty({ example: 'Al Khor City Centre' })
  @IsString()
  @Length(2, 120)
  destination: string;

  @ApiProperty({ description: 'Flat fare for the route' })
  @IsNumber()
  @Min(0)
  fixedFare: number;

  @ApiPropertyOptional({ example: 'economy' })
  @IfPresent()
  @IsString()
  @Length(2, 40)
  vehicleType?: string;
}

export class SettingsUpdateDto {
  @ApiPropertyOptional({ example: 'QA' })
  @IfPresent()
  @Matches(ISO2, { message: 'countryCode must be a two-letter ISO country code' })
  countryCode?: string;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  allowCashPayments?: boolean;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  allowScheduledRides?: boolean;

  @ApiPropertyOptional({ description: 'Free cancellation window, in minutes' })
  @IfPresent()
  @IsNumber()
  @Min(0)
  @Max(100)
  cancellationWindowMinutes?: number;

  @ApiPropertyOptional({ enum: ['auto', 'manual'] })
  @IfPresent()
  @IsIn(['auto', 'manual'])
  dispatchMode?: 'auto' | 'manual';
}

/** The `surgeLimits` jsonb column — written whole, so every bound is required. */
export class SurgeLimitsDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(10)
  minMultiplier: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxMultiplier: number;

  @ApiProperty()
  @IsBoolean()
  autoEnabled: boolean;
}

/** One entry of the `peakHourConfig` jsonb column. */
export class PeakHourDto {
  @ApiProperty({ description: 'Hour of day the band opens', minimum: 0, maximum: 23 })
  @IsInt()
  @Min(0)
  @Max(23)
  start: number;

  @ApiProperty({ description: 'Hour of day the band closes', minimum: 0, maximum: 23 })
  @IsInt()
  @Min(0)
  @Max(23)
  end: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  multiplier: number;

  @ApiProperty({ example: 'Morning Rush' })
  @IsString()
  @Length(1, 60)
  label: string;
}

/**
 * Per-country taxi configuration. Every property is optional — this is an
 * upsert that merges onto the existing row — and every property is a
 * `TaxiCountryConfigEntity` column.
 *
 * `countryCode` is declared because the settings screen posts the whole
 * configuration object including its own copy of it. It is accepted and then
 * overwritten by the controller with the market resolved from the path
 * parameter and the caller's token, so a body cannot move a configuration into
 * another market.
 */
export class TaxiConfigUpsertDto {
  @ApiPropertyOptional({ example: 'QA', description: 'Ignored; the path parameter wins' })
  @IfPresent()
  @Matches(ISO2, { message: 'countryCode must be a two-letter ISO country code' })
  countryCode?: string;

  @ApiPropertyOptional({ example: 'QAR', description: 'ISO 4217 code, not a symbol' })
  @IfPresent()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a three-letter ISO 4217 code' })
  currency?: string;

  @ApiPropertyOptional({ enum: ['km', 'mi'] })
  @IfPresent()
  @IsIn(['km', 'mi'])
  distanceUnit?: string;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  otpRequired?: boolean;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  scheduledRidesEnabled?: boolean;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  cashEnabled?: boolean;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  tipsEnabled?: boolean;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  rideShareEnabled?: boolean;

  @ApiPropertyOptional()
  @IfPresent()
  @IsBoolean()
  vendorsEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IfPresent()
  @IsInt()
  @Min(0)
  @Max(10)
  maxStops?: number;

  @ApiPropertyOptional({ type: [String], example: ['cash', 'card', 'wallet'] })
  @IfPresent()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  enabledPaymentGateways?: string[];

  @ApiPropertyOptional({ type: [String], example: ['economy', 'comfort'] })
  @IfPresent()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  enabledVehicleTypes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IfPresent()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  requiredVendorDocuments?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IfPresent()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  requiredDriverDocuments?: string[];

  /**
   * A decimal fraction, not a percentage: the column is `decimal(5,4)` and the
   * console divides its percentage input by 100 before sending. `Max(1)` is
   * what stops a screen that forgot the division from booking 15× commission.
   */
  @ApiPropertyOptional({ example: 0.15, minimum: 0, maximum: 1 })
  @IfPresent()
  @IsNumber()
  @Min(0)
  @Max(1)
  platformCommissionRate?: number;

  @ApiPropertyOptional({ example: 0.05, minimum: 0, maximum: 1 })
  @IfPresent()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultVendorCommissionRate?: number;

  @ApiPropertyOptional({ example: 0.16, minimum: 0, maximum: 1 })
  @IfPresent()
  @IsNumber()
  @Min(0)
  @Max(1)
  taxRate?: number;

  @ApiPropertyOptional({ type: SurgeLimitsDto })
  @IfPresent()
  @IsObject()
  @ValidateNested()
  @Type(() => SurgeLimitsDto)
  surgeLimits?: SurgeLimitsDto;

  @ApiPropertyOptional({ type: [PeakHourDto] })
  @IfPresent()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PeakHourDto)
  peakHourConfig?: PeakHourDto[];

  @ApiPropertyOptional({ example: '999' })
  @IfPresent()
  @IsString()
  @Length(1, 20)
  emergencyNumber?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IfPresent()
  @IsString()
  @Length(2, 10)
  defaultLocale?: string;

  @ApiPropertyOptional({ example: 'Asia/Qatar', nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  timezone?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IfPresent()
  @IsNumber()
  @Min(0)
  @Max(5)
  minimumDriverRating?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 120 })
  @IfPresent()
  @IsInt()
  @Min(0)
  @Max(120)
  freeWaitingMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 3600 })
  @IfPresent()
  @IsInt()
  @Min(0)
  @Max(3600)
  autoCancelTimeoutSeconds?: number;
}

/**
 * `GET /admin/taxi/pending-approvals` — the onboarding queue's query.
 *
 * The route used to take a bare `@Query('countryCode') countryCode?: string`,
 * which no pipe validates: `?countryCode=NOT-A-COUNTRY` travelled to the RPC
 * unexamined, and an unrecognised value there is a market predicate that does
 * not get added. `resolveScope` and `requireMarket` both refuse such a value
 * now, but the 400 belongs HERE, at the surface a client can actually reach,
 * naming the parameter it refused.
 *
 * `limit` is new and deliberately capped rather than clamped, the same ruling as
 * the other admin reads on this branch: an export script asking for 5000 rows
 * should be told it cannot have them, not handed 100 with no indication that the
 * rest exist. Without it the queue was an unbounded read of two tables.
 *
 * There is no `page`: this is a queue, ordered oldest-first, and the work is to
 * empty it. A second page of an approvals backlog is a filter nobody asked for.
 */
export class TaxiPendingApprovalsQueryDto {
  @ApiPropertyOptional({
    example: 'QA',
    description: 'ISO-2 market. A locked admin may only name their own.',
  })
  @IsOptional()
  @Matches(ISO2, { message: 'countryCode must be a two-letter ISO country code' })
  countryCode?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/** A batch settlement. The ids are `taxi_payout_records.id`, generated UUIDs. */
export class PayoutBatchDto {
  @ApiProperty({ type: [String], description: 'taxi_payout_records.id values' })
  @IsArray()
  @IsUUID('4', { each: true })
  payoutIds: string[];
}
