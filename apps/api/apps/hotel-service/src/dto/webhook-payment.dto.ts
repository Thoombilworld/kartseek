import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentWebhookStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CHARGEBACK = 'CHARGEBACK',
}

export enum PaymentGateway {
  STRIPE = 'STRIPE',
  RAZORPAY = 'RAZORPAY',
  PAYFORT = 'PAYFORT',
  TAP = 'TAP',
  HYPERPAY = 'HYPERPAY',
}

export class WebhookPaymentDto {
  @ApiProperty({ example: 'txn_1234567890' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ enum: PaymentWebhookStatus, example: 'SUCCESS' })
  @IsEnum(PaymentWebhookStatus)
  status: PaymentWebhookStatus;

  @ApiProperty({ example: 1035 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'AED' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: 'HBK-1234567890' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ enum: PaymentGateway, example: 'STRIPE' })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiPropertyOptional({ example: 'sig_abc123', description: 'Gateway signature for verification' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ description: 'Raw gateway payload for auditing' })
  @IsOptional()
  rawPayload?: Record<string, any>;
}

export class WebhookRefundDto {
  @ApiProperty({ example: 'ref_1234567890' })
  @IsString()
  @IsNotEmpty()
  refundId: string;

  @ApiProperty({ example: 'txn_1234567890' })
  @IsString()
  @IsNotEmpty()
  originalTransactionId: string;

  @ApiProperty({ example: 'HBK-1234567890' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ enum: PaymentWebhookStatus })
  @IsEnum(PaymentWebhookStatus)
  status: PaymentWebhookStatus;

  @ApiProperty({ example: 1035 })
  @IsNumber()
  refundAmount: number;

  @ApiProperty({ example: 'AED' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ enum: PaymentGateway })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;
}
