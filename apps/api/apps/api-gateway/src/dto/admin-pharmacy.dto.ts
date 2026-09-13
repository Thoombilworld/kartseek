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

/**
 * A boolean that means what the client actually sent.
 *
 * ── The trap, measured ──────────────────────────────────────────────────────
 *
 * `GatewayValidationPipe` runs `transformOptions: { enableImplicitConversion:
 * true }`, under which class-transformer coerces a value to the property's
 * reflected `design:type` with `Boolean(value)` — and `Boolean('false')` is
 * `true`. Every non-empty string becomes `true`. `@IsBoolean()` then passes,
 * because by the time it looks the value really is a boolean.
 *
 * This applies to ANY decorated property whose declared type is `boolean`, in a
 * query string or a JSON body alike — a decorator is all it takes for
 * `design:type` to be emitted. It bit two properties here:
 *
 *   `?available=false`               listed the products that ARE available —
 *                                    the moderation queue, inverted, silently.
 *   `{"verified":"false"}`           PASSED a drug licence. A decision route.
 *
 * ── Why `obj` and not `value` ───────────────────────────────────────────────
 *
 * `@Transform(({ value }) => …)` does NOT fix it, and neither does
 * `@Type(() => Boolean)`: implicit conversion has already run by the time the
 * transform is called, so `value` is the coerced `true` and the original is
 * gone. `obj` is the untouched source object, so `obj[key]` is what the client
 * really sent. Measured, all four shapes, in `admin-pharmacy.dto.spec.ts`.
 *
 * Anything that is not a recognised spelling is passed through unchanged so the
 * `@IsBoolean()` below refuses it with a 400 naming the property — never
 * silently resolved to either answer.
 */
const BooleanParam = (): PropertyDecorator =>
  Transform(({ obj, key }) => {
    const raw = (obj as Record<string, unknown> | undefined)?.[key];
    if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
    return raw;
  });

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
  @BooleanParam()
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

/**
 * Just the market — for the reads that take no page and no filter.
 *
 * It deliberately does NOT extend `AdminPharmacyQueryDto`, so
 * `GET /admin/pharmacy/dashboard?page=1` is a 400 `property page should not
 * exist` rather than a 200 that quietly ignores it. The dashboard, the
 * commission rates and the settings are single objects; there is no second page
 * of them. Reviewed as a papercut for the console (M3 review, minor 8) and kept:
 * a parameter that is accepted and does nothing is the same shape of lie as a
 * filter that is accepted and inverted, which is what the boolean above turned
 * out to be. If a console legitimately needs to send them, the fix is for it to
 * stop, not for this to start ignoring them.
 */
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
  @BooleanParam()
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
  @BooleanParam()
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
  @BooleanParam()
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
  @BooleanParam()
  @IsBoolean()
  allowColdChainDelivery?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @BooleanParam()
  @IsBoolean()
  autoApproveStores?: boolean;
}
