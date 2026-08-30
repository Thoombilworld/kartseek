import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsEnum, IsNumber, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroceryPaymentMethod } from '../entities/grocery-order.entity';

class OrderItemDto {
  @ApiProperty({ example: 'product-uuid-001' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  /**
   * Display-only. The stored line name comes from the catalogue row so an order
   * cannot be recorded against a product description the seller never wrote.
   */
  @ApiPropertyOptional({ example: 'Fresh Avocados', description: 'Ignored — the catalogue name is used' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '500g', description: 'Must match one of the product\'s weightVariants' })
  @IsString()
  @IsNotEmpty()
  weight: string;

  /**
   * Ignored. Kept so existing clients still validate, but the charged price is
   * resolved server-side from the matching weight variant (or an active flash
   * deal). Trusting this field let a caller name their own price.
   */
  @ApiPropertyOptional({ example: 280, description: 'Ignored — priced from the catalogue' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Curry Cut' })
  @IsOptional()
  @IsString()
  preparationNote?: string;
}

class DeliveryAddressDto {
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

  /**
   * Optional. A saved address is entered by hand and is not geocoded, so requiring
   * coordinates meant every order from the address book was rejected by validation
   * before it reached the service. They are used for delivery routing when present;
   * the pickup end always has the store's own coordinates.
   */
  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class CreateGroceryOrderDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'store-uuid-001' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: DeliveryAddressDto })
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress: DeliveryAddressDto;

  @ApiProperty({ enum: GroceryPaymentMethod, example: 'ONLINE' })
  @IsEnum(GroceryPaymentMethod)
  paymentMethod: GroceryPaymentMethod;

  @ApiPropertyOptional({ example: '2026-06-30T14:00:00Z', description: 'ISO 8601 for scheduled delivery' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
