import { IsString, IsOptional, IsNumber, IsUUID, IsEnum, IsArray, ValidateNested, Min, Max, IsBoolean, MinLength, MaxLength, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════════════════════════
// Product DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateProductDto {
  @ApiProperty({ example: 'Samsung Galaxy S25 Ultra' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  name: string;

  @ApiPropertyOptional({ example: 'samsung-galaxy-s25-ultra' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Flagship smartphone with AI camera' })
  @IsOptional()
  @IsString()
  short_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  long_description?: string;

  @ApiProperty({ example: 'CAT-001' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ example: 'SUBCAT-001' })
  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @ApiPropertyOptional({ example: 'BRD-001' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ example: 'SELLER-001' })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ example: '8901234567890', description: 'ASIN, GTIN, UPC, or EAN' })
  @IsOptional()
  @IsString()
  globalTradeItemNumber?: string;

  @ApiPropertyOptional({ example: 119999.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @ApiPropertyOptional({ description: 'Localized translations as JSON object' })
  @IsOptional()
  translations?: Record<string, any>;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsOptional()
  @IsString()
  long_description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsEnum(['ACTIVE', 'DRAFT', 'DISCONTINUED'])
  status?: string;

  @IsOptional()
  translations?: Record<string, any>;
}

export class ProductApprovalDto {
  @ApiProperty({ example: 'admin-123' })
  @IsString()
  adminId: string;

  @ApiPropertyOptional({ example: 'Product violates image quality guidelines' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ShippingAddressDto {
  @IsString()
  @MinLength(3)
  line1: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;

  @IsString()
  phone: string;
}

export class PlaceOrderDto {
  @ApiProperty({ description: 'Customer user ID' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ enum: ['ONLINE', 'COD', 'WALLET', 'UPI'] })
  @IsEnum(['ONLINE', 'COD', 'WALLET', 'UPI'])
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'COUPON2026' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  franchiseId?: string;
}

export class CancelOrderDto {
  @ApiProperty({ example: 'Changed my mind' })
  @IsString()
  @MinLength(5)
  reason: string;
}

export class ShipOrderDto {
  @ApiProperty({ example: 'TRK-123456789' })
  @IsString()
  trackingId: string;

  @ApiProperty({ example: 'BlueDart' })
  @IsString()
  courier: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Return & Refund DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateReturnDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty({ enum: ['DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'SIZE_FIT', 'DAMAGED', 'OTHER'] })
  @IsEnum(['DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'SIZE_FIT', 'DAMAGED', 'OTHER'])
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiProperty()
  @IsString()
  customerId: string;
}

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED', 'REFUND_INITIATED', 'COMPLETED'] })
  @IsEnum(['APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED', 'REFUND_INITIATED', 'COMPLETED'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Review DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Coupon DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  code: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FLAT'] })
  @IsEnum(['PERCENTAGE', 'FLAT'])
  discountType: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 999 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiProperty({ example: '2026-07-01T00:00:00Z' })
  @IsString()
  validFrom: string;

  @ApiProperty({ example: '2026-07-31T23:59:59Z' })
  @IsString()
  validUntil: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'SUMMER2026' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'cust-123' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 2499.00 })
  @IsNumber()
  @Min(0)
  orderTotal: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Category DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'electronics' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: '📱' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Parent category ID for subcategories' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cart DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class AddToCartDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Seller DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdateSellerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  businessName?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankIfscCode?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @IsOptional()
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export class SellerApprovalDto {
  @ApiProperty()
  @IsString()
  adminId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tracking DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class AddTrackingEventDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingId?: string;

  @ApiProperty({ enum: ['ORDER_PLACED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'] })
  @IsEnum(['ORDER_PLACED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'])
  eventType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Product Variant DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateVariantDto {
  @ApiProperty({ example: 'Midnight Blue / 128GB' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'MB-128' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 89999 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 119999 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Variant attributes as key-value pairs: { color: "Blue", storage: "128GB" }' })
  @IsOptional()
  attributes?: Record<string, string>;
}

export class UpdateVariantStockDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ enum: ['SET', 'INCREMENT', 'DECREMENT'], default: 'SET' })
  @IsEnum(['SET', 'INCREMENT', 'DECREMENT'])
  operation: 'SET' | 'INCREMENT' | 'DECREMENT';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q&A DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateQuestionDto {
  @ApiProperty({ example: 'Does this phone support 5G?' })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  questionText: string;

  @ApiProperty({ example: 'cust-123' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}

export class CreateAnswerDto {
  @ApiProperty({ example: 'Yes, it supports all 5G bands.' })
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  answerText: string;

  @ApiProperty({ example: 'seller-456' })
  @IsString()
  authorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional({ enum: ['CUSTOMER', 'SELLER', 'ADMIN'] })
  @IsOptional()
  @IsEnum(['CUSTOMER', 'SELLER', 'ADMIN'])
  authorRole?: string;
}
