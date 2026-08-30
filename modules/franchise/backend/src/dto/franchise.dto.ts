/**
 * KARTSEEK Franchise Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt,
  Min, Max, MaxLength, IsNumber, IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FranchiseModule {
  MARKETPLACE = 'marketplace',
  GROCERY = 'grocery',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
  HOTEL = 'hotel',
  DOCTOR = 'doctor',
  TAXI = 'taxi',
}

export class FranchiseDashboardQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: FranchiseModule })
  @IsOptional() @IsString()
  module?: string;
}

export class FranchiseKpiQueryDto {
  @ApiProperty({ example: 'FR-001' })
  @IsString() @IsNotEmpty()
  franchiseId: string;

  @ApiProperty({ enum: FranchiseModule, example: 'grocery' })
  @IsEnum(FranchiseModule)
  module: FranchiseModule;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 'monthly', description: 'daily | weekly | monthly' })
  @IsOptional() @IsString()
  granularity?: string;
}

export class FranchiseZoneDto {
  @ApiProperty({ example: 'Mumbai Central' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'IN' })
  @IsString() @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString() @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 10, description: 'Zone radius in km' })
  @IsOptional() @IsNumber() @Min(0.5) @Max(100)
  radiusKm?: number;

  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional() @IsNumber()
  centerLat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional() @IsNumber()
  centerLng?: number;

  @ApiPropertyOptional({ example: ['marketplace', 'grocery', 'restaurant'] })
  @IsOptional() @IsArray() @IsEnum(FranchiseModule, { each: true })
  enabledModules?: FranchiseModule[];

  @ApiPropertyOptional({ example: 12.5, description: 'Commission override %' })
  @IsOptional() @IsNumber() @Min(0) @Max(100)
  commissionRate?: number;
}

export class FranchiseSellerActionDto {
  @ApiProperty({ example: 'FR-001' })
  @IsString() @IsNotEmpty()
  franchiseId: string;

  @ApiProperty({ example: 'seller-uuid-001' })
  @IsString() @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ example: 'approve', description: 'approve | reject | suspend | reinstate' })
  @IsString() @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({ example: 'Approved after document review' })
  @IsOptional() @IsString() @MaxLength(2000)
  reason?: string;
}
