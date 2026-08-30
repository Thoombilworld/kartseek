/**
 * KARTSEEK Auth Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEmail, MinLength, MaxLength,
  IsOptional, IsEnum, Matches, IsBoolean,
} from 'class-validator';

// ── Login ──────────────────────────────────────────────────────────────────────

export class LoginDto {
  @ApiProperty({ example: 'john@kartseek.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: true, description: 'Keep me signed in for 30 days' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

// ── Register ───────────────────────────────────────────────────────────────────

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john@kartseek.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+91982345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Phone must be a valid international number' })
  phone: string;

  @ApiProperty({ example: 'P@ssw0rd123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/, {
    message: 'Password must contain uppercase, lowercase, and a digit',
  })
  password: string;

  @ApiPropertyOptional({ example: 'IN', description: 'ISO country code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  regionCode?: string;
}

// ── Refresh Token ──────────────────────────────────────────────────────────────

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// ── Forgot Password ────────────────────────────────────────────────────────────

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@kartseek.com' })
  @IsEmail()
  email: string;
}

// ── Reset Password ─────────────────────────────────────────────────────────────

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-uuid' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewP@ssw0rd456' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

// ── OTP Verification ───────────────────────────────────────────────────────────

export class VerifyOtpDto {
  @ApiProperty({ example: '+91982345678' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: '483921' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(8)
  otp: string;

  @ApiPropertyOptional({ enum: ['sms', 'email'], example: 'sms' })
  @IsOptional()
  @IsEnum(['sms', 'email'] as const)
  channel?: 'sms' | 'email';
}

// ── Two-Factor Authentication ──────────────────────────────────────────────────

export class VerifyTwoFactorDto {
  @ApiProperty({ example: 'user-uuid-001' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '483921' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(8)
  code: string;

  @ApiProperty({ enum: ['authenticator', 'sms', 'email'], example: 'authenticator' })
  @IsEnum(['authenticator', 'sms', 'email'] as const)
  method: 'authenticator' | 'sms' | 'email';
}
