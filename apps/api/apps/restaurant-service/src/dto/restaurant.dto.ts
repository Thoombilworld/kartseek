/**
 * KARTSEEK Restaurant Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional,
  IsEnum, IsInt, IsArray, ValidateNested, IsBoolean,
  MaxLength, IsObject, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RestaurantOrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum OrderMode {
  DELIVERY = 'delivery',
  TAKEAWAY = 'takeaway',
  DINE_IN = 'dine_in',
}

// ── Create Restaurant ──────────────────────────────────────────────────────────

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Savanna Grill' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'seller-uuid-001' })
  @IsString() @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ example: '42 MG Road, Mumbai' })
  @IsString() @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '+91712345678' })
  @IsString() @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: ['Italian', 'Indian', 'BBQ'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  cuisines?: string[];

  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional() @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional() @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional() @IsString()
  openingTime?: string;

  @ApiPropertyOptional({ example: '23:00' })
  @IsOptional() @IsString()
  closingTime?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  offersDelivery?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  offersTakeaway?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  offersDineIn?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Avg preparation time in minutes' })
  @IsOptional() @IsInt() @Min(5) @Max(120)
  avgPrepTimeMinutes?: number;

  @ApiPropertyOptional({ example: 200, description: 'Minimum order amount' })
  @IsOptional() @IsNumber() @Min(0)
  minimumOrder?: number;
}

// ── Create Menu Item ───────────────────────────────────────────────────────────

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Chicken Tikka Masala' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'restaurant-uuid-001' })
  @IsString() @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({ example: 'menu-cat-uuid-001' })
  @IsString() @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 850 })
  @IsNumber() @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'Tender chicken in a rich, creamy tomato sauce' })
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.kartseek.com/food/tikka.jpg' })
  @IsOptional() @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  isVeg?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean()
  isVegan?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 15, description: 'Prep time in minutes' })
  @IsOptional() @IsInt() @Min(1) @Max(120)
  prepTimeMinutes?: number;

  @ApiPropertyOptional({ example: 350, description: 'Calories' })
  @IsOptional() @IsInt() @Min(0)
  calories?: number;

  @ApiPropertyOptional({ example: ['Mild', 'Medium', 'Hot'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  spiceLevels?: string[];
}

// ── Create Order ───────────────────────────────────────────────────────────────

class RestaurantOrderItemDto {
  @ApiProperty({ example: 'menu-item-uuid-001' })
  @IsString() @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ example: 2 })
  @IsInt() @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Extra spicy, no onions' })
  @IsOptional() @IsString() @MaxLength(500)
  specialInstructions?: string;

  @ApiPropertyOptional({ example: ['Extra cheese', 'Large'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  addons?: string[];
}

export class CreateRestaurantOrderDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString() @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'restaurant-uuid-001' })
  @IsString() @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({ enum: OrderMode, example: 'delivery' })
  @IsEnum(OrderMode)
  mode: OrderMode;

  @ApiProperty({ type: [RestaurantOrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => RestaurantOrderItemDto)
  items: RestaurantOrderItemDto[];

  @ApiProperty({ example: 'upi' })
  @IsString() @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: { line1: '42 Palm Ave', city: 'Mumbai' } })
  @IsOptional() @IsObject()
  deliveryAddress?: Record<string, string>;

  @ApiPropertyOptional({ example: 'SAVE20' })
  @IsOptional() @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 'Table 5' })
  @IsOptional() @IsString()
  tableNumber?: string;
}

// ── Update Order Status ────────────────────────────────────────────────────────

export class UpdateRestaurantOrderStatusDto {
  @ApiProperty({ enum: RestaurantOrderStatus, example: 'preparing' })
  @IsEnum(RestaurantOrderStatus)
  status: RestaurantOrderStatus;

  @ApiPropertyOptional({ example: 20, description: 'Estimated time in minutes' })
  @IsOptional() @IsInt() @Min(1) @Max(180)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ example: 'Preparing your order' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

// ── Table Booking ──────────────────────────────────────────────────────────────

export class TableBookingDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString() @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'restaurant-uuid-001' })
  @IsString() @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '19:30' })
  @IsString() @IsNotEmpty()
  time: string;

  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt() @Min(1) @Max(50)
  guests: number;

  @ApiPropertyOptional({ example: 'Window seat preferred' })
  @IsOptional() @IsString() @MaxLength(500)
  specialRequests?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional() @IsString()
  guestName?: string;

  @ApiPropertyOptional({ example: '+91712345678' })
  @IsOptional() @IsString()
  guestPhone?: string;
}

// ── Restaurant Query ───────────────────────────────────────────────────────────

export class RestaurantQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'Savanna' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Italian' })
  @IsOptional() @IsString()
  cuisine?: string;

  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional() @Type(() => Number) @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional() @Type(() => Number) @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 10, description: 'Radius in km' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(50)
  radiusKm?: number;

  @ApiPropertyOptional({ example: 4.0, description: 'Min rating' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  offersDelivery?: boolean;
}

// ── Review ─────────────────────────────────────────────────────────────────────

export class ReviewDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString() @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'order-uuid-001' })
  @IsString() @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 5 })
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Amazing food and quick delivery!' })
  @IsOptional() @IsString() @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({ example: ['https://cdn.kartseek.com/reviews/img1.jpg'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  imageUrls?: string[];
}
