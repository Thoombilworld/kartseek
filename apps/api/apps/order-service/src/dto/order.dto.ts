/**
 * KARTSEEK Order Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, IsOptional,
  IsEnum, IsArray, ValidateNested, IsInt, Max, IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum OrderType {
  MARKETPLACE = 'marketplace',
  GROCERY = 'grocery',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
  REFUNDED = 'refunded',
}

// ── Create Order ───────────────────────────────────────────────────────────────

class OrderItemDto {
  @ApiProperty({ example: 'product-uuid-001' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'variant-uuid-001' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

class ShippingAddressDto {
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

  @ApiProperty({ example: '400001' })
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
}

export class CreateOrderDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'seller-uuid-001' })
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ enum: OrderType, example: 'marketplace' })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: ShippingAddressDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ example: 'upi' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'SAVE20' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  walletAmount?: number;
}

// ── Update Status ──────────────────────────────────────────────────────────────

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: 'shipped' })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Dispatched via BlueDart' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'TRACK-ABC-123' })
  @IsOptional()
  @IsString()
  trackingId?: string;
}

// ── Cancel Order ───────────────────────────────────────────────────────────────

export class CancelOrderDto {
  @ApiProperty({ example: 'Changed my mind' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: true, description: 'Request refund to wallet' })
  @IsOptional()
  refundToWallet?: boolean;
}

// ── Order Query ────────────────────────────────────────────────────────────────

export class OrderQueryDto {
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

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: OrderType })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'customer-uuid-001' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'seller-uuid-001' })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  to?: string;
}
