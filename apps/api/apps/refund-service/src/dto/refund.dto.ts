/**
 * KARTSEEK Refund Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, IsOptional,
  IsEnum, IsInt, Max, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RefundStatus {
  REQUESTED = 'requested',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
}

export enum RefundReason {
  DAMAGED = 'damaged',
  WRONG_ITEM = 'wrong_item',
  NOT_AS_DESCRIBED = 'not_as_described',
  LATE_DELIVERY = 'late_delivery',
  CANCELLED_BY_SELLER = 'cancelled_by_seller',
  QUALITY_ISSUE = 'quality_issue',
  OTHER = 'other',
}

export class CreateRefundDto {
  @ApiProperty({ example: 'order-uuid-001' })
  @IsString() @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString() @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 1500.00 })
  @IsNumber() @Min(0.01)
  amount: number;

  @ApiProperty({ enum: RefundReason, example: 'damaged' })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiPropertyOptional({ example: 'The product arrived with a cracked screen' })
  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Refund to wallet instead of original payment' })
  @IsOptional()
  refundToWallet?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.kartseek.com/proof.jpg' })
  @IsOptional() @IsString()
  evidenceUrl?: string;
}

export class ApproveRefundDto {
  @ApiProperty({ example: 'admin-uuid-001' })
  @IsString() @IsNotEmpty()
  adminId: string;

  @ApiProperty({ example: 'approved', enum: ['approved', 'rejected'] })
  @IsString() @IsNotEmpty()
  decision: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 1200, description: 'Approved amount (may differ from requested)' })
  @IsOptional() @IsNumber() @Min(0)
  approvedAmount?: number;

  @ApiPropertyOptional({ example: 'Partial refund approved — packaging was intact' })
  @IsOptional() @IsString() @MaxLength(2000)
  note?: string;
}

export class RefundQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: RefundStatus })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'customer-uuid-001' })
  @IsOptional() @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'seller-uuid-001' })
  @IsOptional() @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;
}
