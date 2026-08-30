/**
 * KARTSEEK Payment Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional,
  IsEnum, IsInt, IsObject, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentProvider {
    STRIPE = 'stripe',
  RAZORPAY = 'razorpay',
  PAYPAL = 'paypal',
  UPI = 'upi',
  CARD = 'card',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
  COD = 'cod',
}

export enum PaymentStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

// ── Initiate Payment ───────────────────────────────────────────────────────────

export class InitiatePaymentDto {
  @ApiProperty({ example: 'order-uuid-001' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 1500.00 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'INR', description: 'ISO 4217 currency code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currency: string;

  @ApiProperty({ enum: PaymentProvider, example: 'upi' })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiPropertyOptional({ example: '+91712345678', description: 'For mobile money' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://kartseek.com/payment/callback' })
  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @ApiPropertyOptional({ description: 'Provider-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ── Verify Payment ─────────────────────────────────────────────────────────────

export class VerifyPaymentDto {
  @ApiProperty({ example: 'txn-uuid-001' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ enum: PaymentProvider, example: 'upi' })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiPropertyOptional({ example: 'UPI-REF-ABC123' })
  @IsOptional()
  @IsString()
  providerReference?: string;
}

// ── Refund Payment ─────────────────────────────────────────────────────────────

export class RefundPaymentDto {
  @ApiProperty({ example: 'txn-uuid-001' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ example: 500.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Product returned' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ example: true, description: 'Refund to wallet instead of original payment method' })
  @IsOptional()
  refundToWallet?: boolean;
}

// ── Payment Webhook ────────────────────────────────────────────────────────────

export class PaymentWebhookDto {
  @ApiProperty({ example: 'payment.success' })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiProperty({ description: 'Provider-specific webhook payload' })
  @IsObject()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'webhook-signature-hash' })
  @IsOptional()
  @IsString()
  signature?: string;
}

// ── Payment Query ──────────────────────────────────────────────────────────────

export class PaymentQueryDto {
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

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: PaymentProvider })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'customer-uuid-001' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  to?: string;
}
