/**
 * KARTSEEK Payout Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional,
  IsEnum, IsInt, IsArray, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PayoutStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ON_HOLD = 'on_hold',
}

export enum PayoutMethod {
  BANK_TRANSFER = 'bank_transfer',
    PAYPAL = 'paypal',
  CHEQUE = 'cheque',
}

export class CreatePayoutDto {
  @ApiProperty({ example: 'seller-uuid-001' })
  @IsString() @IsNotEmpty()
  recipientId: string;

  @ApiProperty({ example: 'seller', description: 'seller | driver | hotel_owner' })
  @IsString() @IsNotEmpty()
  recipientType: string;

  @ApiProperty({ example: 25000.00 })
  @IsNumber() @Min(1)
  amount: number;

  @ApiProperty({ example: 'INR' })
  @IsString() @IsNotEmpty() @MaxLength(3)
  currency: string;

  @ApiProperty({ enum: PayoutMethod, example: 'bank_transfer' })
  @IsEnum(PayoutMethod)
  method: PayoutMethod;

  @ApiPropertyOptional({ example: 'Weekly settlement W27' })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '2026-07-01 to 2026-07-07' })
  @IsOptional() @IsString()
  period?: string;
}

export class ApproveBatchDto {
  @ApiProperty({ type: [String], example: ['payout-1', 'payout-2'] })
  @IsArray() @IsString({ each: true })
  payoutIds: string[];

  @ApiProperty({ example: 'admin-uuid-001' })
  @IsString() @IsNotEmpty()
  approvedBy: string;
}

export class PayoutQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: PayoutStatus })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: PayoutMethod })
  @IsOptional() @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 'seller-uuid-001' })
  @IsOptional() @IsString()
  recipientId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;
}

export class PayoutScheduleDto {
  @ApiProperty({ example: 'weekly', description: 'weekly | biweekly | monthly' })
  @IsString() @IsNotEmpty()
  frequency: string;

  @ApiProperty({ example: 'friday', description: 'Day of payout for weekly' })
  @IsString() @IsNotEmpty()
  dayOfPayout: string;

  @ApiProperty({ example: 1000, description: 'Minimum balance for auto-payout' })
  @IsNumber() @Min(0)
  minimumThreshold: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  autoApprove?: boolean;
}
