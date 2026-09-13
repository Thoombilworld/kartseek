import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Queries and bodies for `AdminHotelController`.
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
 * there, before any RPC, and never widened into a query.
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
 * really is a boolean, so `{"autoApproveHotels":"false"}` would turn
 * auto-approval ON for a whole market.
 *
 * `obj` rather than `value` because implicit conversion has already run by the
 * time a `@Transform` is called: `value` is the coerced `true` and the original
 * is gone. Anything that is not a recognised spelling passes through unchanged
 * so `@IsBoolean()` below refuses it with a 400 naming the property — never
 * silently resolved to either answer. (Introduced by M3 and measured in
 * `admin-pharmacy.dto.spec.ts`; the same pipe, the same trap.)
 */
const BooleanParam = (): PropertyDecorator =>
  Transform(({ obj, key }) => {
    const raw = (obj as Record<string, unknown> | undefined)?.[key];
    if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
    return raw;
  });

/**
 * A status filter is upper-cased before it is checked.
 *
 * The consoles send what the human clicked (`cancelled`, `Checked in`) while the
 * columns hold `CANCELLED` and `CHECKED_IN`. Folding here means an unmatched
 * word is a 400 that names the set, rather than a silent no-match that reads on
 * screen as "this market has none of those" — the exact lie this plan exists to
 * remove.
 */
const UpperSnake = () =>
  Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, '_')
      : value,
  );

/** Just the market — for the reads that take no page and no filter. */
export class AdminHotelMarketQueryDto {
  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;
}

/** Page controls plus the requested market — the base every hotel list read shares. */
export class AdminHotelQueryDto extends AdminHotelMarketQueryDto {
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

/** `HotelStatus` — the property's own lifecycle state. */
export const HOTEL_STATUSES = [
  'PENDING_KYC',
  'PENDING_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'BLOCKED',
  'CLOSED',
] as const;

/** `RoomStatus` — whether a room type is sellable. */
export const HOTEL_ROOM_STATUSES = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'] as const;

/** `HotelBookingStatus` — the booking's own state. */
export const HOTEL_BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'MODIFICATION_REQUESTED',
  'MODIFIED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'REFUNDED',
] as const;

/** The moderation queue's filters — a review has no status column of its own. */
export const HOTEL_REVIEW_FILTERS = ['ALL', 'FLAGGED', 'VISIBLE', 'HIDDEN'] as const;

/** The report windows hotel-service recognises. Anything else is a 400. */
export const HOTEL_REPORT_PERIODS = ['7d', '30d', '90d', '365d'] as const;

/** What an administrator may do to a review. Lower case: it is a verb, not a state. */
export const HOTEL_REVIEW_ACTIONS = ['approve', 'remove'] as const;

export class AdminHotelListQueryDto extends AdminHotelQueryDto {
  @ApiPropertyOptional({ enum: HOTEL_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(HOTEL_STATUSES as unknown as string[])
  status?: string;
}

export class AdminHotelRoomsQueryDto extends AdminHotelQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Narrow to one property' })
  @IsOptional()
  @IsUUID()
  hotelId?: string;

  @ApiPropertyOptional({ enum: HOTEL_ROOM_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(HOTEL_ROOM_STATUSES as unknown as string[])
  status?: string;
}

export class AdminHotelBookingsQueryDto extends AdminHotelQueryDto {
  @ApiPropertyOptional({ enum: HOTEL_BOOKING_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(HOTEL_BOOKING_STATUSES as unknown as string[])
  status?: string;
}

export class AdminHotelReviewsQueryDto extends AdminHotelQueryDto {
  @ApiPropertyOptional({ enum: HOTEL_REVIEW_FILTERS, default: 'ALL' })
  @IsOptional()
  @UpperSnake()
  @IsIn(HOTEL_REVIEW_FILTERS as unknown as string[])
  status?: string;
}

export class AdminHotelReportsQueryDto extends AdminHotelMarketQueryDto {
  @ApiPropertyOptional({ enum: HOTEL_REPORT_PERIODS, default: '30d' })
  @IsOptional()
  @IsIn(HOTEL_REPORT_PERIODS as unknown as string[])
  period?: string = '30d';
}

/**
 * Suspending a hotel. The reason reaches the property owner, so it is required.
 *
 * **This is a contract TIGHTENING, stated plainly.** The route previously took
 * an inline `{ reason?: string }`, and hotel-service RETURNED the reason to its
 * caller without storing it — so a property went offline with nothing on the row
 * to say why. M5 stores it (`hotels.suspensionReason`, with `suspendedBy` and
 * `suspendedAt`), which is precisely why an empty body is now a 400 where it
 * used to be a 200. The console client for this module does not exist yet
 * (`apps/web/src/lib/api/admin-hotel` is imported by the pages and is not in the
 * repository), so the cost today is zero; it is recorded here rather than only
 * in a report because the next person to read this route needs to know the 400
 * is intended.
 */
export class SuspendHotelDto {
  @ApiProperty({ example: 'Licence expired and not renewed', minLength: 3, maxLength: 500 })
  @IsString()
  @Length(3, 500)
  reason: string;
}

/** Moderating one review. `id` is the path parameter and never a body field. */
export class ModerateHotelReviewDto {
  @ApiProperty({ enum: HOTEL_REVIEW_ACTIONS })
  @IsIn(HOTEL_REVIEW_ACTIONS as unknown as string[])
  action: string;

  /**
   * Required when REMOVING, optional when approving, and validated whenever it
   * is present.
   *
   * A takedown with no reason is a decision nobody can review later; an approval
   * needs no justification because it restores the default. `@IsOptional()`
   * alone would have skipped the length rule for `{"reason": null}` as well as
   * for an absent key, so the condition names both cases explicitly.
   */
  @ApiPropertyOptional({ minLength: 3, maxLength: 500 })
  @ValidateIf((o) => o.action === 'remove' || o.reason !== undefined)
  @IsString()
  @Length(3, 500)
  reason?: string;
}

/** One entry in the global amenity catalogue. No market: the catalogue is shared. */
export class CreateHotelAmenityDto {
  @ApiProperty({ example: 'Airport shuttle', minLength: 2, maxLength: 128 })
  @IsString()
  @Length(2, 128)
  name: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  icon?: string;

  @ApiPropertyOptional({ maxLength: 64, example: 'Transport' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  category?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @BooleanParam()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * The pricing half of a market's configuration row.
 *
 * Every figure is BOUNDED. A percentage above 100 or a negative fee is not a
 * setting anyone meant to save, and an unbounded numeric on an admin write is
 * how the wallet routes came to accept a negative amount.
 */
export class UpdateHotelPricingDto {
  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 8.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  platformFeePercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  serviceTaxPercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1000000, example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  cleaningFee?: number;

  /** Thirty days. Beyond that a "free cancellation window" is just free cancellation. */
  @ApiPropertyOptional({ minimum: 0, maximum: 720, example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  freeCancellationWindowHours?: number;
}

/** The operational half of the SAME row — one market, one configuration. */
export class UpdateHotelSettingsDto {
  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @BooleanParam()
  @IsBoolean()
  autoApproveHotels?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 10000, example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  maxRoomsPerHotel?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  defaultCommissionRate?: number;
}
