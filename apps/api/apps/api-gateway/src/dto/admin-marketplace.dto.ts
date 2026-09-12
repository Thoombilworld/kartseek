import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
} from 'class-validator';
import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';

/**
 * Bodies for the admin marketplace surface (`AdminMarketplaceController`).
 *
 * These are bodies the gateway itself reads — it decides the coupon's market
 * from the caller's token before forwarding — so they are *not* marked
 * `@ForwardedBody()`. `GatewayValidationPipe` therefore applies the strict
 * rules (`whitelist`, `forbidNonWhitelisted`, `transform`) and an undeclared
 * key is a 400 rather than a field smuggled through to marketplace-service.
 *
 * These have to be classes, not interfaces: Nest skips validation entirely
 * when a `@Body()` parameter has no runtime metatype, so an interface would
 * have left the route accepting anything at all.
 *
 * Every field below is a real `coupons` column and every rule is the column's
 * own (`modules/marketplace/backend/src/entities/coupon.entity.ts`). That has
 * to be checked rather than assumed: a DTO that is stricter than the table
 * turns a working console page into a wall of 400s, and one that is looser
 * turns a bad body into a 500 from the Postgres driver.
 * `admin-validation.spec.ts` pins the match against the entity's own metadata.
 */

/**
 * Validate a field only when the caller actually sent it.
 *
 * `@IsOptional()` skips every validator for `null` as well as `undefined`, and
 * marketplace-service's `pick` copies any key whose value is not `undefined` —
 * so `{"discountValue": null}` travelled all the way to `couponRepo.update` and
 * came back as a Postgres not-null violation the caller read as a 500, on a
 * money route (review I-2). With this, the field's own validator runs against
 * the `null` and answers 400 naming the field.
 *
 * `@IsOptional()` stays on `title`, `description` and `maxDiscount`, whose
 * columns are nullable and where clearing the value is a request an
 * administrator may really make.
 *
 * The same helper exists in `admin-taxi.dto.ts` for the same reason; it is
 * duplicated rather than shared because neither file is the natural home for a
 * cross-cutting validation idiom. Worth extracting into a `dto/validation.ts`
 * the next time a third file needs it.
 */
const IfPresent = (): PropertyDecorator => ValidateIf((_object, value) => value !== undefined);

/** The types `discountValue` is a percentage for, and the cap that then applies. */
const PERCENTAGE_CAP = 100;

/**
 * A percentage discount cannot exceed 100.
 *
 * `validateCoupon` computes `orderTotal * (discountValue / 100)` and caps the
 * result only when `maxDiscount` is set, so a `PERCENTAGE / 500` coupon takes
 * five times the basket (review I-3). A plain `@Max(100)` would be wrong — a
 * `FLAT` coupon is denominated in currency and 500 is an ordinary figure — and
 * a bare `@ValidateIf` would be worse, because it suppresses *every* validator
 * on the property when its condition is false, leaving a FLAT amount unchecked
 * altogether. So the bound is a constraint that reads the sibling field.
 *
 * On an edit, an amount sent without its type cannot be bounded here at all —
 * the gateway has no row to read the type from — so it is refused rather than
 * waved through. The console's pause/activate sends neither field.
 */
@ValidatorConstraint({ name: 'discountValueWithinType', async: false })
class DiscountValueWithinType implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    // Not a number at all: `@IsNumber()` reports that, and reporting it twice
    // would answer one mistake with two messages.
    if (typeof value !== 'number' || !Number.isFinite(value)) return true;
    const type = (args.object as { discountType?: unknown }).discountType;
    if (type === undefined) return false;
    return type === 'PERCENTAGE' ? value <= PERCENTAGE_CAP : true;
  }

  defaultMessage(args: ValidationArguments): string {
    const type = (args.object as { discountType?: unknown }).discountType;
    if (type === undefined) {
      return 'discountValue must be sent together with discountType, so the percentage cap can be applied';
    }
    return `discountValue must not be greater than ${PERCENTAGE_CAP} for a PERCENTAGE coupon`;
  }
}

/** The five values `coupons.discount_type` actually holds. There is no `FIXED`. */
const DISCOUNT_TYPES = ['PERCENTAGE', 'FLAT', 'FREE_SHIPPING', 'CASHBACK', 'BUY_X_GET_Y'] as const;

export class AdminCouponDto {
  /** `coupons.code` is `varchar(30)` and unique; the service upper-cases it. */
  @ApiProperty({ example: 'QASUMMER25' })
  @IsString()
  @Length(3, 30)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'code must be upper-case letters, digits, _ or -' })
  code!: string;

  @ApiPropertyOptional({ example: 'Summer sale', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  title?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) description?: string;

  /**
   * The admin console's create form emits `FLAT`, `FREE_SHIPPING` and
   * `BUY_X_GET_Y` as well as `PERCENTAGE`.
   */
  @ApiProperty({ enum: DISCOUNT_TYPES })
  @IsIn(DISCOUNT_TYPES)
  discountType!: string;

  @ApiProperty({ example: 15, description: 'At most 100 when discountType is PERCENTAGE' })
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  @Validate(DiscountValueWithinType)
  discountValue!: number;

  @ApiPropertyOptional({ example: 50, description: 'Cap for a percentage coupon' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  maxDiscount?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  minOrderValue?: number;

  /** `-1` and `0` both mean unlimited in this table; the console sends `0`. */
  @ApiPropertyOptional({ example: 500 })
  @IfPresent()
  @IsNumber()
  @Min(-1)
  @Max(1_000_000)
  usageLimit?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  usageLimitPerUser?: number;

  /**
   * Required, because `valid_from` and `valid_until` are NOT NULL with no
   * default. A body without a validity window cannot be stored at all, so it
   * is refused here with a 400 that names the field rather than forwarded to
   * become a not-null violation the caller reads as a 500.
   */
  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  @IsDateString()
  validFrom!: string;

  @ApiProperty({ example: '2026-12-01T00:00:00.000Z' })
  @IsDateString()
  validUntil!: string;

  @ApiPropertyOptional() @IfPresent() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IfPresent() @IsBoolean() autoApply?: boolean;
  @ApiPropertyOptional() @IfPresent() @IsBoolean() firstOrderOnly?: boolean;

  /**
   * The market the coupon is issued for. A locked admin may only name their
   * own, and whatever they send the controller overwrites with the market from
   * their token; omitted by a global admin means every market.
   */
  @ApiPropertyOptional({ example: 'QA', description: 'ISO-2 market; omitted = every market' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2}$/, { message: 'regionCode must be a two-letter ISO country code' })
  regionCode?: string;
}

/**
 * A coupon edit.
 *
 * Every field optional, because the console's pause and activate buttons send
 * exactly `{ isActive: false | true }` — a partial patch, which is also all
 * marketplace-service applies (`COUPON_WRITABLE` is picked from the body).
 * Declared explicitly rather than through `PartialType` so the one rule that
 * differs is visible: `code` cannot be changed, because the redemption rows
 * that reference a coupon reference it by id and the code is what customers
 * have already been given.
 */
export class AdminCouponUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) description?: string;

  @ApiPropertyOptional({ enum: DISCOUNT_TYPES })
  @IfPresent()
  @IsIn(DISCOUNT_TYPES)
  discountType?: string;

  @ApiPropertyOptional({ description: 'At most 100 when discountType is PERCENTAGE' })
  @IfPresent()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  @Validate(DiscountValueWithinType)
  discountValue?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) maxDiscount?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  minOrderValue?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsNumber()
  @Min(-1)
  @Max(1_000_000)
  usageLimit?: number;

  @ApiPropertyOptional()
  @IfPresent()
  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  usageLimitPerUser?: number;

  @ApiPropertyOptional() @IfPresent() @IsDateString() validFrom?: string;
  @ApiPropertyOptional() @IfPresent() @IsDateString() validUntil?: string;

  @ApiPropertyOptional() @IfPresent() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IfPresent() @IsBoolean() autoApply?: boolean;
  @ApiPropertyOptional() @IfPresent() @IsBoolean() firstOrderOnly?: boolean;

  @ApiPropertyOptional({ example: 'QA', description: 'ISO-2 market' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2}$/, { message: 'regionCode must be a two-letter ISO country code' })
  regionCode?: string;
}
