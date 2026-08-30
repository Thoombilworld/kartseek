/**
 * KARTSEEK Report Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt,
  Min, Max, MaxLength, IsDateString, IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportType {
  REVENUE = 'revenue',
  ORDERS = 'orders',
  CUSTOMERS = 'customers',
  SELLERS = 'sellers',
  PRODUCTS = 'products',
  DELIVERY = 'delivery',
  REFUNDS = 'refunds',
  COMMISSIONS = 'commissions',
  PAYOUTS = 'payouts',
  TAX = 'tax',
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'xlsx',
}

export enum ReportGranularity {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export class DateRangeDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  to: string;
}

export class GenerateReportDto {
  @ApiProperty({ enum: ReportType, example: 'revenue' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  to: string;

  @ApiPropertyOptional({ enum: ReportGranularity, example: 'monthly' })
  @IsOptional() @IsEnum(ReportGranularity)
  granularity?: ReportGranularity = ReportGranularity.MONTHLY;

  @ApiPropertyOptional({ enum: ReportFormat, example: 'csv' })
  @IsOptional() @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.JSON;

  @ApiPropertyOptional({ example: 'marketplace', description: 'Filter by module' })
  @IsOptional() @IsString()
  module?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional() @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ example: 'seller-uuid-001' })
  @IsOptional() @IsString()
  sellerId?: string;
}

export class ScheduleReportDto {
  @ApiProperty({ enum: ReportType, example: 'revenue' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ example: 'weekly', description: 'daily | weekly | monthly' })
  @IsString() @IsNotEmpty()
  frequency: string;

  @ApiProperty({ type: [String], example: ['admin@kartseek.com'] })
  @IsArray() @IsString({ each: true })
  recipients: string[];

  @ApiPropertyOptional({ enum: ReportFormat, example: 'pdf' })
  @IsOptional() @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.PDF;

  @ApiPropertyOptional({ example: 'Weekly Revenue Summary' })
  @IsOptional() @IsString() @MaxLength(200)
  name?: string;
}

export class ReportQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ReportType })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'completed' })
  @IsOptional() @IsString()
  status?: string;
}
