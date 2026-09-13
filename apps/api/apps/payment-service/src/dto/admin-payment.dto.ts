import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentModule, PaymentStatus } from '../entities/payment.entity';

/**
 * The admin payments list payload.
 *
 * Mirrors order-service's `AdminListOrdersDto` deliberately: `scope` is the
 * caller's lock, written by the gateway from the signed token, and `region` is
 * what a global admin asked to filter on. Payment predates the platform's
 * `region_code` convention and stores the market as `countryCode`; the
 * normalisation happens in `marketPredicate`, so the wire field keeps the
 * platform's name and only the column differs.
 */
export class AdminListPaymentsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @IsOptional() @IsEnum(PaymentModule) module?: PaymentModule;
  @IsOptional() @IsString() @Length(2, 8) region?: string;
  @IsOptional() @IsString() @Length(2, 8) scope?: string;
}
