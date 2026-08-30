/**
 * KARTSEEK Delivery Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional,
  IsEnum, IsInt, IsLatitude, IsLongitude, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DeliveryStatus {
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  ARRIVED = 'arrived',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
}

export class AssignDriverDto {
  @ApiProperty({ example: 'order-uuid-001' })
  @IsString() @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'driver-uuid-001' })
  @IsString() @IsNotEmpty()
  driverId: string;

  @ApiPropertyOptional({ example: '2026-07-15T14:00:00Z' })
  @IsOptional() @IsString()
  scheduledAt?: string;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: DeliveryStatus, example: 'picked_up' })
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;

  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional() @IsNumber() @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional() @IsNumber() @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ example: 'Picked up from store' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ example: 'https://cdn.kartseek.com/proof.jpg' })
  @IsOptional() @IsString()
  proofImageUrl?: string;
}

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: 'CBD Zone' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'IN' })
  @IsString() @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString() @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 5, description: 'Radius in km' })
  @IsNumber() @Min(0.5) @Max(100)
  radiusKm: number;

  @ApiProperty({ example: 150, description: 'Base delivery fee' })
  @IsNumber() @Min(0)
  baseFee: number;

  @ApiPropertyOptional({ example: 15, description: 'Fee per additional km' })
  @IsOptional() @IsNumber() @Min(0)
  perKmFee?: number;

  @ApiPropertyOptional({ example: 45, description: 'Max delivery time in minutes' })
  @IsOptional() @IsInt() @Min(5) @Max(180)
  maxTimeMinutes?: number;
}

export class DeliveryQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'driver-uuid-001' })
  @IsOptional() @IsString()
  driverId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;
}
