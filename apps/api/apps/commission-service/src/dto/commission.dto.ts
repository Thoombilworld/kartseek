/**
 * KARTSEEK Commission Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional,
  IsEnum, IsInt, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CommissionModule {
  MARKETPLACE = 'marketplace',
  GROCERY = 'grocery',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
  HOTEL = 'hotel',
  DOCTOR = 'doctor',
  TAXI = 'taxi',
}

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FLAT = 'flat',
  TIERED = 'tiered',
}

export class SetCommissionDto {
  @ApiProperty({ enum: CommissionModule, example: 'marketplace' })
  @IsEnum(CommissionModule)
  module: CommissionModule;

  @ApiProperty({ enum: CommissionType, example: 'percentage' })
  @IsEnum(CommissionType)
  type: CommissionType;

  @ApiProperty({ example: 12.5, description: 'Rate in % or flat amount' })
  @IsNumber() @Min(0) @Max(100)
  rate: number;

  @ApiPropertyOptional({ example: 'seller-uuid-001', description: 'Seller-specific override' })
  @IsOptional() @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ example: 'category-uuid-001' })
  @IsOptional() @IsString()
  categoryId?: string;
}

export class CommissionQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: CommissionModule })
  @IsOptional() @IsString()
  module?: string;

  @ApiPropertyOptional({ example: 'seller-uuid-001' })
  @IsOptional() @IsString()
  sellerId?: string;
}

export class TierDto {
  @ApiProperty({ example: 'Silver' })
  @IsString() @IsNotEmpty() @MaxLength(50)
  name: string;

  @ApiProperty({ example: 0, description: 'Min revenue threshold' })
  @IsNumber() @Min(0)
  minRevenue: number;

  @ApiProperty({ example: 50000, description: 'Max revenue threshold' })
  @IsNumber() @Min(0)
  maxRevenue: number;

  @ApiProperty({ example: 10, description: 'Commission rate for this tier' })
  @IsNumber() @Min(0) @Max(100)
  rate: number;
}

export class OverrideDto {
  @ApiProperty({ example: 'seller-uuid-001' })
  @IsString() @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ enum: CommissionModule, example: 'marketplace' })
  @IsEnum(CommissionModule)
  module: CommissionModule;

  @ApiProperty({ example: 8.5, description: 'Override rate' })
  @IsNumber() @Min(0) @Max(100)
  rate: number;

  @ApiPropertyOptional({ example: 'Premium seller discount' })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Override expiry' })
  @IsOptional() @IsString()
  expiresAt?: string;
}
