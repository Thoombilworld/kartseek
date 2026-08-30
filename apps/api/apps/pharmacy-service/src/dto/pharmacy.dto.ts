/**
 * KARTSEEK Pharmacy Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional,
  IsEnum, IsInt, IsArray, ValidateNested, IsBoolean,
  MaxLength, IsObject, IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PharmacyOrderStatus {
  PENDING = 'pending',
  PRESCRIPTION_REVIEW = 'prescription_review',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// ── Create Store ───────────────────────────────────────────────────────────────

export class CreatePharmacyStoreDto {
  @ApiProperty({ example: 'HealthFirst Pharmacy' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'seller-uuid-001' })
  @IsString() @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ example: '42 Hospital Road, Mumbai' })
  @IsString() @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '+91712345678' })
  @IsString() @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'LIC-PHARM-12345' })
  @IsOptional() @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional() @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional() @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional() @IsString()
  openingTime?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional() @IsString()
  closingTime?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  is24Hours?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  offersDelivery?: boolean;
}

// ── Create Item ────────────────────────────────────────────────────────────────

export class CreatePharmacyItemDto {
  @ApiProperty({ example: 'Paracetamol 500mg' })
  @IsString() @IsNotEmpty() @MaxLength(300)
  name: string;

  @ApiProperty({ example: 'store-uuid-001' })
  @IsString() @IsNotEmpty()
  storeId: string;

  @ApiProperty({ example: 'category-uuid-001' })
  @IsString() @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 150 })
  @IsNumber() @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 120, description: 'Discounted price' })
  @IsOptional() @IsNumber() @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ example: 'Acetaminophen' })
  @IsOptional() @IsString()
  genericName?: string;

  @ApiPropertyOptional({ example: 'GlaxoSmithKline' })
  @IsOptional() @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: true, description: 'Requires prescription' })
  @IsOptional() @IsBoolean()
  prescriptionRequired?: boolean;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @IsInt() @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 'Tablet' })
  @IsOptional() @IsString()
  dosageForm?: string;

  @ApiPropertyOptional({ example: '500mg' })
  @IsOptional() @IsString()
  strength?: string;

  @ApiPropertyOptional({ example: 'Strip of 10 tablets' })
  @IsOptional() @IsString()
  packSize?: string;
}

// ── Create Order ───────────────────────────────────────────────────────────────

class PharmacyOrderItemDto {
  @ApiProperty({ example: 'item-uuid-001' })
  @IsString() @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 2 })
  @IsInt() @Min(1)
  quantity: number;
}

export class CreatePharmacyOrderDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString() @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'store-uuid-001' })
  @IsString() @IsNotEmpty()
  storeId: string;

  @ApiProperty({ type: [PharmacyOrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => PharmacyOrderItemDto)
  items: PharmacyOrderItemDto[];

  @ApiProperty({ example: 'upi' })
  @IsString() @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'prescription-uuid-001' })
  @IsOptional() @IsString()
  prescriptionId?: string;

  @ApiPropertyOptional({ example: { line1: '42 Palm Ave', city: 'Mumbai', pincode: '400001' } })
  @IsOptional() @IsObject()
  deliveryAddress?: Record<string, string>;
}

// ── Update Order Status ────────────────────────────────────────────────────────

export class UpdatePharmacyOrderStatusDto {
  @ApiProperty({ enum: PharmacyOrderStatus, example: 'confirmed' })
  @IsEnum(PharmacyOrderStatus)
  status: PharmacyOrderStatus;

  @ApiPropertyOptional({ example: 'Prescription verified by pharmacist' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

// ── Upload Prescription ────────────────────────────────────────────────────────

export class UploadPrescriptionDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString() @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'https://cdn.kartseek.com/prescriptions/rx-001.jpg' })
  @IsString() @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional({ example: 'Dr. Smith, Mumbai General Hospital' })
  @IsOptional() @IsString() @MaxLength(500)
  doctorName?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional() @IsString()
  prescriptionDate?: string;

  @ApiPropertyOptional({ example: 'Regular monthly medication' })
  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;
}

// ── Pharmacy Query ─────────────────────────────────────────────────────────────

export class PharmacyQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'paracetamol' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'category-uuid-001' })
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  prescriptionRequired?: boolean;

  @ApiPropertyOptional({ example: true, description: 'In stock only' })
  @IsOptional() @IsBoolean()
  inStock?: boolean;
}

export class StoreQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'HealthFirst' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional() @Type(() => Number) @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional() @Type(() => Number) @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 10, description: 'Radius in km' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(50)
  radiusKm?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  is24Hours?: boolean;
}
