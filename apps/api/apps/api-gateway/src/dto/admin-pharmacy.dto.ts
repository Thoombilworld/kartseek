import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Queries and bodies for `AdminPharmacyController`.
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
 *    ENTITY's column names. `PharmacyCategory` has `emoji`, not `icon`; the
 *    old inline body type on `createCategory` declared `icon`, which is not a
 *    column and would have been dropped by TypeORM after passing validation.
 *
 * `adminId`/`actorId` is absent everywhere by design: the controller takes the
 * acting administrator from the verified token, never from a body.
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

/** Page controls plus the requested market — the base every pharmacy list read shares. */
export class AdminPharmacyQueryDto {
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

  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;
}

/** The store list, filtered by the pharmacy's own lifecycle state. */
export const PHARMACY_STORE_STATUSES = [
  'PENDING_KYC',
  'PENDING_APPROVAL',
  'APPROVED',
  'SUSPENDED',
  'BLOCKED',
  'CLOSED',
] as const;

/** The order list, filtered by the order's own state. */
export const PHARMACY_ORDER_STATUSES = [
  'PLACED',
  'PRESCRIPTION_PENDING',
  'PRESCRIPTION_VERIFIED',
  'PRESCRIPTION_REJECTED',
  'STORE_ACCEPTED',
  'STORE_REJECTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CUSTOMER_PICKED_UP',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const;

export const PRESCRIPTION_STATUSES = [
  'PENDING_VERIFICATION',
  'VERIFIED_APPROVED',
  'REJECTED_INVALID',
  'REJECTED_EXPIRED',
  'REJECTED_UNREADABLE',
] as const;

/**
 * A status filter is upper-cased before it is checked.
 *
 * The consoles send what the human clicked (`approved`, `Pending KYC`) while
 * the columns hold `APPROVED` and `PENDING_KYC`. Folding here means an
 * unmatched word is a 400 that names the set, rather than a silent no-match
 * that reads on screen as "this market has none of those" — which is the exact
 * lie this plan exists to remove.
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

export class AdminPharmacyStoresQueryDto extends AdminPharmacyQueryDto {
  @ApiPropertyOptional({ enum: PHARMACY_STORE_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(PHARMACY_STORE_STATUSES as unknown as string[])
  status?: string;
}

export class AdminPharmacyProductsQueryDto extends AdminPharmacyQueryDto {
  @ApiPropertyOptional({ description: 'Catalogue category id' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  category?: string;

  @ApiPropertyOptional({ description: 'Only products currently available, or only those not' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  available?: boolean;
}

export class AdminPharmacyOrdersQueryDto extends AdminPharmacyQueryDto {
  @ApiPropertyOptional({ enum: PHARMACY_ORDER_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(PHARMACY_ORDER_STATUSES as unknown as string[])
  status?: string;
}

export class AdminPharmacyPrescriptionsQueryDto extends AdminPharmacyQueryDto {
  @ApiPropertyOptional({
    enum: PRESCRIPTION_STATUSES,
    description: 'Defaults to the verification queue',
  })
  @IsOptional()
  @UpperSnake()
  @IsIn(PRESCRIPTION_STATUSES as unknown as string[])
  status?: string;
}

/**
 * The licence queue.
 *
 * `status` takes a STORE status, because a licence belongs to a pharmacy: this
 * module has no `pharmacy_verifications` table and the `:id` on the verify
 * route is a store id.
 */
export class AdminPharmacyVerificationsQueryDto extends AdminPharmacyQueryDto {
  @ApiPropertyOptional({ enum: PHARMACY_STORE_STATUSES })
  @IsOptional()
  @UpperSnake()
  @IsIn(PHARMACY_STORE_STATUSES as unknown as string[])
  status?: string;
}

export const PHARMACY_REPORT_PERIODS = ['7d', '30d', '90d', '365d'] as const;

export class AdminPharmacyReportsQueryDto extends AdminPharmacyQueryDto {
  @ApiPropertyOptional({ enum: PHARMACY_REPORT_PERIODS, default: '30d' })
  @IsOptional()
  @IsIn(PHARMACY_REPORT_PERIODS as unknown as string[])
  period?: string = '30d';
}

/** Just the market — for the reads that take no page and no filter. */
export class AdminPharmacyMarketQueryDto {
  @ApiPropertyOptional({ description: 'ISO-2 market. A locked admin may only name their own.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;
}

/** Suspending a pharmacy. The reason reaches the store owner, so it is required. */
export class SuspendPharmacyDto {
  @ApiProperty({ example: 'Drug licence expired on 2026-08-01', minLength: 3, maxLength: 500 })
  @IsString()
  @Length(3, 500)
  reason: string;
}

/** A drug-licence decision. `notes` becomes the rejection reason on a refusal. */
export class VerifyLicenceDto {
  @ApiProperty({ description: 'Whether the licence passed review' })
  @IsBoolean()
  verified: boolean;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IfPresent()
  @IsString()
  @Length(3, 1000)
  notes?: string;
}

/**
 * A new catalogue category.
 *
 * Property names are `PharmacyCategory`'s own columns. `icon` is deliberately
 * NOT here: the column is `emoji`, and the body type this DTO replaced declared
 * `icon`, which TypeORM would have discarded after the request succeeded.
 */
export class CreatePharmacyCategoryDto {
  @ApiProperty({ example: 'Analgesics', minLength: 2, maxLength: 128 })
  @IsString()
  @Length(2, 128)
  name: string;

  @ApiPropertyOptional({ description: 'Derived from the name when omitted' })
  @IfPresent()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be lower-case and hyphenated' })
  @Length(2, 128)
  slug?: string;

  @ApiPropertyOptional()
  @IfPresent()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiPropertyOptional({ example: '💊', description: 'The column is `emoji`, not `icon`' })
  @IfPresent()
  @IsString()
  @Length(1, 10)
  emoji?: string;

  @ApiPropertyOptional({ description: 'Parent category id, for a nested category' })
  @IfPresent()
  @IsString()
  @Length(1, 64)
  parentId?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether items in this category need a prescription' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requiresPrescription?: boolean;
}

/**
 * A settings write.
 *
 * Every property is one of the keys `PHARMACY_SETTING_DEFAULTS` declares in
 * pharmacy-service, and each is optional because a screen saves the fields it
 * changed. `forbidNonWhitelisted` refuses an unknown key here; the service
 * refuses it again against its own whitelist, so nothing is accepted at the
 * edge and rejected a hop later — and a direct TCP caller meets the same rule.
 *
 * `countryCode` names the market ROW to write, not a setting: a global admin
 * may target one market, and that is the only way a market row comes to exist.
 */
export class UpdatePharmacySettingsDto {
  @ApiPropertyOptional({ description: 'ISO-2 market to write. Global admins only.' })
  @IsOptional()
  @IsString()
  @Matches(MARKET, { message: 'countryCode must be an ISO-2 market code' })
  countryCode?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  prescriptionValidityDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requirePrescriptionForScheduleH?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  defaultCommissionRate?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  licenceExpiryWarningDays?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultDeliveryFee?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  deliveryRadiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowColdChainDelivery?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoApproveStores?: boolean;
}
