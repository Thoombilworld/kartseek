/**
 * KARTSEEK Taxi Service — DTOs with class-validator
 *
 * Typed request validation for all taxi endpoints.
 * Replaces raw `any` types on controller parameters.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsOptional, IsNotEmpty, IsInt,
  IsIn, IsUUID, IsLatitude, IsLongitude, Min, Max,
  MinLength, MaxLength, IsArray, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════════════════════════

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER — FARE ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════════

export class EstimateFareDto {
  @ApiProperty({ example: -1.2921, description: 'Pickup latitude' })
  @IsNumber() @IsLatitude()
  pickupLat: number;

  @ApiProperty({ example: 36.8219, description: 'Pickup longitude' })
  @IsNumber() @IsLongitude()
  pickupLng: number;

  @ApiProperty({ example: -1.3028, description: 'Drop-off latitude' })
  @IsNumber() @IsLatitude()
  dropLat: number;

  @ApiProperty({ example: 36.8073, description: 'Drop-off longitude' })
  @IsNumber() @IsLongitude()
  dropLng: number;

  @ApiProperty({ example: 'economy', enum: ['economy', 'comfort', 'premium', 'suv', 'bike', 'delivery'] })
  @IsString() @IsNotEmpty()
  @IsIn(['economy', 'comfort', 'premium', 'suv', 'bike', 'delivery'])
  vehicleType: string;

  @ApiPropertyOptional({ example: 'DEFAULT_ZONE' })
  @IsOptional() @IsString()
  zoneId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER — RIDE REQUEST
// ═══════════════════════════════════════════════════════════════════════════════

export class RequestRideDto {
  @ApiProperty({ example: -1.2921 })
  @IsNumber() @IsLatitude()
  pickupLat: number;

  @ApiProperty({ example: 36.8219 })
  @IsNumber() @IsLongitude()
  pickupLng: number;

  @ApiProperty({ example: -1.3028 })
  @IsNumber() @IsLatitude()
  dropLat: number;

  @ApiProperty({ example: 36.8073 })
  @IsNumber() @IsLongitude()
  dropLng: number;

  @ApiProperty({ example: 'Mumbai Central' })
  @IsString() @IsNotEmpty() @MaxLength(500)
  pickupAddress: string;

  @ApiProperty({ example: 'Andheri West, Mumbai' })
  @IsString() @IsNotEmpty() @MaxLength(500)
  dropAddress: string;

  @ApiProperty({ example: 'economy' })
  @IsString() @IsNotEmpty()
  @IsIn(['economy', 'comfort', 'premium', 'suv', 'bike', 'delivery'])
  vehicleType: string;

  @ApiProperty({ example: 'upi' })
  @IsString() @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'PROMO2026' })
  @IsOptional() @IsString() @MaxLength(50)
  promoCode?: string;

  @ApiPropertyOptional({ example: 'Please meet at the lobby entrance' })
  @IsOptional() @IsString() @MaxLength(1000)
  note?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER — CANCEL RIDE
// ═══════════════════════════════════════════════════════════════════════════════

export class CancelRideDto {
  @ApiPropertyOptional({ example: 'Driver took too long' })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER — RIDE RATING
// ═══════════════════════════════════════════════════════════════════════════════

export class RateRideDto {
  @ApiProperty({ example: 5 })
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Great driver, very polite!' })
  @IsOptional() @IsString() @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({ example: 5.00 })
  @IsOptional() @IsNumber() @Min(0) @Max(1000)
  tipAmount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER — ONLINE / LOCATION
// ═══════════════════════════════════════════════════════════════════════════════

export class DriverOnlineDto {
  @ApiProperty({ example: 'driver_abc123' })
  @IsString() @IsNotEmpty()
  driverId: string;

  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional() @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional() @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 'economy' })
  @IsOptional() @IsString()
  vehicleType?: string;
}

export class DriverLocationDto {
  @ApiProperty({ example: 'driver_abc123' })
  @IsString() @IsNotEmpty()
  driverId: string;

  @ApiProperty({ example: -1.2921 })
  @IsNumber() @IsLatitude()
  lat: number;

  @ApiProperty({ example: 36.8219 })
  @IsNumber() @IsLongitude()
  lng: number;

  @ApiPropertyOptional({ example: 45.5 })
  @IsOptional() @IsNumber() @Min(0) @Max(360)
  heading?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional() @IsNumber() @Min(0) @Max(300)
  speed?: number;
}

export class DriverIdDto {
  @ApiProperty({ example: 'driver_abc123' })
  @IsString() @IsNotEmpty()
  driverId: string;
}

export class DriverStartRideDto {
  @ApiProperty({ example: 'driver_abc123' })
  @IsString() @IsNotEmpty()
  driverId: string;

  @ApiProperty({ example: '1234', description: '4-digit OTP' })
  @IsString() @IsNotEmpty() @MinLength(4) @MaxLength(6)
  otp: string;
}

export class DriverCompleteRideDto {
  @ApiProperty({ example: 'driver_abc123' })
  @IsString() @IsNotEmpty()
  driverId: string;

  @ApiPropertyOptional({ example: 12.5, description: 'Actual distance in km' })
  @IsOptional() @IsNumber() @Min(0)
  actualDistanceKm?: number;

  @ApiPropertyOptional({ example: 25, description: 'Actual duration in minutes' })
  @IsOptional() @IsNumber() @Min(0)
  actualDurationMin?: number;

  @ApiPropertyOptional({ example: -1.3028 })
  @IsOptional() @IsNumber()
  endLat?: number;

  @ApiPropertyOptional({ example: 36.8073 })
  @IsOptional() @IsNumber()
  endLng?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

export class NearbyDriversQueryDto {
  @ApiProperty({ example: '-1.2921' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber() @IsLatitude()
  lat: number;

  @ApiProperty({ example: '36.8219' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber() @IsLongitude()
  lng: number;

  @ApiPropertyOptional({ example: '5' })
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber() @Min(0.1) @Max(50)
  radius?: number;

  @ApiPropertyOptional({ example: 'economy' })
  @IsOptional() @IsString()
  vehicleType?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — VENDOR
// ═══════════════════════════════════════════════════════════════════════════════

export class AdminVendorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional() @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Safari Cabs' })
  @IsOptional() @IsString()
  search?: string;
}

export class AdminActionDto {
  @ApiProperty({ example: 'admin_123' })
  @IsString() @IsNotEmpty()
  adminId: string;
}

export class AdminRejectDto extends AdminActionDto {
  @ApiProperty({ example: 'Incomplete documentation' })
  @IsString() @IsNotEmpty() @MaxLength(2000)
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — DRIVER
// ═══════════════════════════════════════════════════════════════════════════════

export class AdminDriverQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional() @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'vendor_abc' })
  @IsOptional() @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional() @IsString()
  search?: string;
}

export class DriverSuspendDto {
  @ApiProperty({ example: 'Multiple customer complaints' })
  @IsString() @IsNotEmpty() @MaxLength(2000)
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export class DocumentReviewDto {
  @ApiProperty({ example: 'admin_123' })
  @IsString() @IsNotEmpty()
  adminId: string;

  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsString() @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Document is blurry' })
  @IsOptional() @IsString() @MaxLength(2000)
  rejectionReason?: string;
}

export class PendingDocumentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['vendor', 'driver'] })
  @IsOptional() @IsString() @IsIn(['vendor', 'driver'])
  ownerType?: 'vendor' | 'driver';

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional() @IsString()
  countryCode?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — RATE CARDS
// ═══════════════════════════════════════════════════════════════════════════════

export class UpsertRateCardDto {
  @ApiProperty({ example: 50 })
  @IsNumber() @Min(0)
  baseFare: number;

  @ApiProperty({ example: 35 })
  @IsNumber() @Min(0)
  distanceRate: number;

  @ApiProperty({ example: 5 })
  @IsNumber() @Min(0)
  timeRate: number;

  @ApiProperty({ example: 100 })
  @IsNumber() @Min(0)
  minimumFare: number;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional() @IsNumber() @Min(1) @Max(10)
  surgeCap?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — PAYOUTS
// ═══════════════════════════════════════════════════════════════════════════════

export class AdminPayoutQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional() @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ enum: ['vendor', 'driver'] })
  @IsOptional() @IsString()
  recipientType?: 'vendor' | 'driver';

  @ApiPropertyOptional({ example: 'pending' })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;
}

export class PayoutBatchDto {
  @ApiProperty({ type: [String], example: ['payout_1', 'payout_2'] })
  @IsArray() @IsString({ each: true })
  payoutIds: string[];

  @ApiPropertyOptional({ example: 'admin_123' })
  @IsOptional() @IsString()
  adminId?: string;
}
