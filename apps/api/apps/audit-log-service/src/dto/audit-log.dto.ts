/**
 * KARTSEEK Audit Log Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt,
  Min, Max, MaxLength, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
  IMPORT = 'import',
  CONFIG_CHANGE = 'config_change',
}

export class CreateAuditLogDto {
  @ApiProperty({ example: 'admin-uuid-001' })
  @IsString() @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'SUPER_ADMIN' })
  @IsString() @IsNotEmpty()
  userRole: string;

  @ApiProperty({ enum: AuditAction, example: 'update' })
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({ example: 'seller' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  resource: string;

  @ApiPropertyOptional({ example: 'seller-uuid-001' })
  @IsOptional() @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ example: 'Updated seller KYC status to approved' })
  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Previous state for change tracking' })
  @IsOptional() @IsObject()
  previousData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'New state after the change' })
  @IsOptional() @IsObject()
  newData?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '192.168.1.100' })
  @IsOptional() @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  @IsOptional() @IsString()
  userAgent?: string;
}

export class AuditLogQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ example: 'admin-uuid-001' })
  @IsOptional() @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional() @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'seller' })
  @IsOptional() @IsString()
  resource?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional() @IsString()
  search?: string;
}
