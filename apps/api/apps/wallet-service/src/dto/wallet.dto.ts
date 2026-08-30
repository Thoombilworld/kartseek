/**
 * KARTSEEK Wallet Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional,
  IsEnum, IsInt, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WalletTransactionType {
  TOP_UP = 'top_up',
  DEBIT = 'debit',
  REFUND = 'refund',
  CASHBACK = 'cashback',
  TRANSFER = 'transfer',
  PAYOUT = 'payout',
}

export class TopUpWalletDto {
  @ApiProperty({ example: 'user-uuid-001' })
  @IsString() @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 500.00 })
  @IsNumber() @Min(1) @Max(500000)
  amount: number;

  @ApiProperty({ example: 'INR' })
  @IsString() @IsNotEmpty() @MaxLength(3)
  currency: string;

  @ApiProperty({ example: 'upi' })
  @IsString() @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'txn-ref-001' })
  @IsOptional() @IsString()
  transactionRef?: string;
}

export class DebitWalletDto {
  @ApiProperty({ example: 'user-uuid-001' })
  @IsString() @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 200.00 })
  @IsNumber() @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Order payment' })
  @IsString() @IsNotEmpty() @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ example: 'order-uuid-001' })
  @IsOptional() @IsString()
  orderId?: string;
}

export class TransferDto {
  @ApiProperty({ example: 'user-uuid-001' })
  @IsString() @IsNotEmpty()
  fromUserId: string;

  @ApiProperty({ example: 'user-uuid-002' })
  @IsString() @IsNotEmpty()
  toUserId: string;

  @ApiProperty({ example: 100.00 })
  @IsNumber() @Min(1) @Max(100000)
  amount: number;

  @ApiPropertyOptional({ example: 'Split bill payment' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

export class WalletQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: WalletTransactionType })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;
}
