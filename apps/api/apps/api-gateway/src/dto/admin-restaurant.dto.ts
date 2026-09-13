import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
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
 * Queries and bodies for `AdminRestaurantController`.
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
 * Optional, but a `null` is a value rather than an absence.
 *
 * `@IsOptional()` skips every rule for `null` as well as `undefined`, so a body
 * carrying `{"reason": null}` would sail past the pipe. This skips only when the
 * key was omitted, so a null is validated by the property's own rule and refused
 * with a message naming it.
 */
const IfPresent = (): PropertyDecorator => ValidateIf((_object, value) => value !== undefined);

/**
 * A boolean that means what the client actually sent.
 *
 * `GatewayValidationPipe` runs `transformOptions: { enableImplicitConversion:
 * true }`, under which class-transformer coerces a value to the property's
 * reflected `design:type` with `Boolean(value)` — and `Boolean('false')` is
 * `true`. `@IsBoolean()` then passes, because by the time it looks the value
 * really is a boolean, so `?isActive=false` would deactivate nothing and
 * `{"isActive":"false"}` would create an ACTIVE delivery zone.
 *
 * `obj` rather than `value` because implicit conversion has already run by the
 * time a `@Transform` is called: `value` is the coerced `true` and the original
 * is gone. Anything that is not a recognised spelling passes through unchanged
 * so `@IsBoolean()` below refuses it with a 400 naming the property — never
 * silently resolved to either answer. (Measured for pharmacy in
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
 * The consoles send what the human clicked (`approved`, `Pending KYC`) while the
 * columns hold `APPROVED` and `PENDING_KYC`. Folding here means an unmatched
 * word is a 400 that names the set, rather than a silent no-match that reads on
 * screen as "this market has none of those" — which is the exact lie this plan
 * exists to remove.
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
export class AdminRestaurantMarketQueryDto {
  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;
}

/** Page controls plus the requested market — the base every restaurant list read shares. */
export class AdminRestaurantQueryDto extends AdminRestaurantMarketQueryDto {
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

/** `RestaurantStatus` — the restaurant's own lifecycle state. */
export const RESTAURANT_STATUSES = [
  'PENDING_KYC',
  'PENDING_APPROVAL',
  'APPROVED',
  'SUSPENDED',
  'BLOCKED',
  'CLOSED',
] as const;

/** `RestaurantOrderStatus` — the order's own state. */
export const RESTAURANT_ORDER_STATUSES = [
  'PLACED',
  'RESTAURANT_ACCEPTED',
  'RESTAURANT_REJECTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CUSTOMER_PICKED_UP',
  'SERVED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const;

/** `RestaurantOrderType` — the service mode. */
export const RESTAURANT_ORDER_TYPES = ['DELIVERY', 'TAKEAWAY', 'DINE_IN'] as const;

/** `ComplaintStatus` — where a complaint has got to. */
export const COMPLAINT_STATUSES = ['OPEN', 'INVESTIGATING', 'ESCALATED', 'RESOLVED'] as const;

/** The analytics periods restaurant-service recognises. Anything else is a 400. */
export const RESTAURANT_ANALYTICS_PERIODS = ['7d', '30d', '90d', '365d'] as const;

export class AdminRestaurantListQueryDto extends AdminRestaurantQueryDto {
  @ApiPropertyOptional({ enum: RESTAURANT_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(RESTAURANT_STATUSES as unknown as string[])
  status?: string;
}

export class AdminRestaurantOrdersQueryDto extends AdminRestaurantQueryDto {
  @ApiPropertyOptional({ enum: RESTAURANT_ORDER_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(RESTAURANT_ORDER_STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ enum: RESTAURANT_ORDER_TYPES })
  @IsOptional()
  @UpperSnake()
  @IsIn(RESTAURANT_ORDER_TYPES as unknown as string[])
  type?: string;
}

export class AdminRestaurantComplaintsQueryDto extends AdminRestaurantQueryDto {
  @ApiPropertyOptional({ enum: COMPLAINT_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(COMPLAINT_STATUSES as unknown as string[])
  status?: string;
}

export class AdminRestaurantAnalyticsQueryDto extends AdminRestaurantMarketQueryDto {
  @ApiPropertyOptional({ enum: RESTAURANT_ANALYTICS_PERIODS, default: '30d' })
  @IsOptional()
  @IsIn(RESTAURANT_ANALYTICS_PERIODS as unknown as string[])
  period?: string = '30d';
}

/** Suspending a restaurant. The reason reaches the restaurant owner, so it is required. */
export class SuspendRestaurantDto {
  @ApiProperty({ example: 'Repeated hygiene complaints', minLength: 3, maxLength: 500 })
  @IsString()
  @Length(3, 500)
  reason: string;
}

/**
 * Closing a complaint.
 *
 * `resolution` is required and bounded: "resolved" with no record of what was
 * done is exactly the state the console faked before this table existed, and
 * restaurant-service refuses an empty one again on its own side.
 */
export class ResolveComplaintDto {
  @ApiProperty({ example: 'Refunded in full and the restaurant warned', minLength: 3 })
  @IsString()
  @Length(3, 2000)
  resolution: string;
}

/**
 * A commission change: one restaurant, named explicitly.
 *
 * NOT "every restaurant in this market" — that would be a different feature with
 * different storage, and a bulk update would silently overwrite a restaurant
 * that has negotiated its own rate. `countryCode` is still accepted because a
 * global administrator may be working inside one market's screen; it narrows the
 * scope check and is never the thing written.
 */
export class UpdateRestaurantCommissionDto {
  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;

  @ApiProperty({ description: 'The restaurant whose rate changes' })
  @IsUUID()
  restaurantId: string;

  @ApiProperty({ minimum: 0, maximum: 100, description: 'Platform commission, percent' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate: number;
}

/**
 * A new catalogue cuisine.
 *
 * Property names are `RestaurantCuisine`'s own columns. The catalogue is global,
 * so there is no `countryCode` here: a region-locked administrator is refused
 * the route outright (`refuseLockedAdmin`), and offering them a market field
 * they could not use would suggest otherwise.
 */
export class CreateRestaurantCuisineDto {
  @ApiProperty({ example: 'Levantine', minLength: 2, maxLength: 128 })
  @IsString()
  @Length(2, 128)
  name: string;

  @ApiPropertyOptional({ description: 'Derived from the name when omitted' })
  @IfPresent()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be lower-case and hyphenated' })
  @Length(2, 128)
  slug?: string;

  @ApiPropertyOptional({ example: '🥙', description: 'The column is `icon`' })
  @IfPresent()
  @IsString()
  @Length(1, 16)
  icon?: string;

  @ApiPropertyOptional()
  @IfPresent()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

/**
 * A new delivery zone.
 *
 * `countryCode` names the MARKET the zone belongs to. A region-locked
 * administrator's own market wins over it, resolved in `scopeOf` before the RPC;
 * a global administrator has to name one, because restaurant-service refuses to
 * store a zone that belongs to no market at all.
 */
export class CreateRestaurantZoneDto {
  @ApiPropertyOptional({ description: 'ISO-2 market. Required for a global admin.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;

  @ApiProperty({ example: 'West Bay', minLength: 2, maxLength: 128 })
  @IsString()
  @Length(2, 128)
  name: string;

  @ApiPropertyOptional({ maxLength: 128 })
  @IfPresent()
  @IsString()
  @Length(1, 128)
  city?: string;

  @ApiPropertyOptional({ type: [String], description: 'Exact-match pincodes served' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 16, { each: true })
  pincodes?: string[];

  @ApiPropertyOptional({ description: 'Zone centre, for the radius match' })
  @IfPresent()
  @Type(() => Number)
  @IsLatitude()
  centerLat?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @Type(() => Number)
  @IsLongitude()
  centerLng?: number;

  @ApiPropertyOptional({ minimum: 0.1, maximum: 200, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(200)
  radiusKm?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 600, default: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  etaMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @BooleanParam()
  @IsBoolean()
  isActive?: boolean;
}
