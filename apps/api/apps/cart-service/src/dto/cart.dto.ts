/**
 * KARTSEEK Cart Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max,
  IsOptional, IsEnum, IsInt, MaxLength,
} from 'class-validator';

export enum CartItemType {
  MARKETPLACE = 'marketplace',
  GROCERY = 'grocery',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
}

// ── Add to Cart ────────────────────────────────────────────────────────────────

export class AddToCartDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'product-uuid-001' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;

  @ApiProperty({ enum: CartItemType, example: 'marketplace' })
  @IsEnum(CartItemType)
  type: CartItemType;

  @ApiPropertyOptional({ example: 'variant-uuid-001', description: 'Product variant ID (size, color)' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: 'store-uuid-001' })
  @IsOptional()
  @IsString()
  storeId?: string;
}

// ── Update Cart Item ───────────────────────────────────────────────────────────

export class UpdateCartItemDto {
  @ApiProperty({ example: 3, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}

// ── Remove Cart Item ───────────────────────────────────────────────────────────

export class RemoveCartItemDto {
  @ApiProperty({ example: 'cart-item-uuid-001' })
  @IsString()
  @IsNotEmpty()
  cartItemId: string;
}

// ── Apply Coupon ───────────────────────────────────────────────────────────────

export class ApplyCouponDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  couponCode: string;

  @ApiPropertyOptional({ enum: CartItemType, example: 'marketplace' })
  @IsOptional()
  @IsEnum(CartItemType)
  cartType?: CartItemType;
}
