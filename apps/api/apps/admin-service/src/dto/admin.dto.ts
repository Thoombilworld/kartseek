/**
 * KARTSEEK Admin Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt,
  Min, Max, MaxLength, IsArray, IsObject, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminDashboardQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional() @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ example: 'marketplace' })
  @IsOptional() @IsString()
  module?: string;
}

export class AdminActionDto {
  @ApiProperty({ example: 'admin-uuid-001' })
  @IsString() @IsNotEmpty()
  adminId: string;

  @ApiProperty({ example: 'approve' })
  @IsString() @IsNotEmpty()
  action: string;

  @ApiProperty({ example: 'entity-uuid-001' })
  @IsString() @IsNotEmpty()
  targetId: string;

  @ApiPropertyOptional({ example: 'seller', description: 'Target type: seller | driver | product | store' })
  @IsOptional() @IsString()
  targetType?: string;

  @ApiPropertyOptional({ example: 'Approved after document review' })
  @IsOptional() @IsString() @MaxLength(2000)
  reason?: string;
}

export class BulkActionDto {
  @ApiProperty({ example: 'admin-uuid-001' })
  @IsString() @IsNotEmpty()
  adminId: string;

  @ApiProperty({ example: 'approve' })
  @IsString() @IsNotEmpty()
  action: string;

  @ApiProperty({ type: [String], example: ['id-1', 'id-2', 'id-3'] })
  @IsArray() @IsString({ each: true })
  targetIds: string[];

  @ApiPropertyOptional({ example: 'Batch approved' })
  @IsOptional() @IsString() @MaxLength(2000)
  reason?: string;
}

export class SystemConfigDto {
  @ApiProperty({ example: 'maintenance_mode' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  key: string;

  @ApiProperty({ description: 'Config value (string, number, boolean, or object)' })
  value: unknown;

  @ApiPropertyOptional({ example: 'marketplace' })
  @IsOptional() @IsString()
  module?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional() @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ example: 'Enable maintenance mode for marketplace' })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}
