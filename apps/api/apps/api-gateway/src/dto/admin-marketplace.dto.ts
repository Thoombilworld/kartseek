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
} from 'class-validator';

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
 */
export class AdminCouponDto {
  /** `coupons.code` is `varchar(30)` and unique; the service upper-cases it. */
  @ApiProperty({ example: 'QASUMMER25' })
  @IsString()
  @Length(3, 30)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'code must be upper-case letters, digits, _ or -' })
  code!: string;

  @ApiPropertyOptional({ example: 'Summer sale', maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  title?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 300) description?: string;

  /**
   * The five values the `coupons.discount_type` enum actually holds. `FIXED`
   * is not one of them — the flat-amount member is spelled `FLAT`, and the
   * admin console's create form emits `FLAT`, `FREE_SHIPPING` and
   * `BUY_X_GET_Y` as well as `PERCENTAGE`.
   */
  @ApiProperty({ enum: ['PERCENTAGE', 'FLAT', 'FREE_SHIPPING', 'CASHBACK', 'BUY_X_GET_Y'] })
  @IsIn(['PERCENTAGE', 'FLAT', 'FREE_SHIPPING', 'CASHBACK', 'BUY_X_GET_Y'])
  discountType!: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  discountValue!: number;

  @ApiPropertyOptional({ example: 50, description: 'Cap for a percentage coupon' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  maxDiscount?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) minOrderValue?: number;

  /** `-1` and `0` both mean unlimited in this table; the console sends `0`. */
  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1_000_000)
  usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
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

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoApply?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() firstOrderOnly?: boolean;

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
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 300) description?: string;

  @ApiPropertyOptional({ enum: ['PERCENTAGE', 'FLAT', 'FREE_SHIPPING', 'CASHBACK', 'BUY_X_GET_Y'] })
  @IsOptional()
  @IsIn(['PERCENTAGE', 'FLAT', 'FREE_SHIPPING', 'CASHBACK', 'BUY_X_GET_Y'])
  discountType?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) discountValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) minOrderValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-1) @Max(1_000_000) usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  usageLimitPerUser?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoApply?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() firstOrderOnly?: boolean;

  @ApiPropertyOptional({ example: 'QA', description: 'ISO-2 market' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2}$/, { message: 'regionCode must be a two-letter ISO country code' })
  regionCode?: string;
}
