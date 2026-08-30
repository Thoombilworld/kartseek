/**
 * KARTSEEK User Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEmail, IsOptional, MinLength, MaxLength,
  IsNumber, IsEnum, IsInt, Min, Max, Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ── Update Profile ─────────────────────────────────────────────────────────────

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'john@kartseek.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+91712345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.kartseek.com/avatars/john.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  regionCode?: string;
}

// ── Change Password ────────────────────────────────────────────────────────────

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ssw0rd123' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewP@ssw0rd456' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

// ── Address ────────────────────────────────────────────────────────────────────

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'addr-uuid-001' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Home' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: '42 Palm Avenue' })
  @IsString()
  @IsNotEmpty()
  line1: string;

  @ApiPropertyOptional({ example: 'Apt 5B' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'Mumbai County' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '00100' })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isDefault?: boolean;
}

// ── User Query ─────────────────────────────────────────────────────────────────

export class UserQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['CUSTOMER', 'SELLER', 'DRIVER', 'SUPER_ADMIN', 'FRANCHISE'] })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  regionCode?: string;
}
