import { IsString, IsNumber, IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFlashDealDto {
  @ApiProperty({ example: 'store-freshmart' })
  @IsString()
  storeId: string;

  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 49.00 })
  @IsNumber()
  @Min(0)
  flashPrice: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  stockLimit: number;

  @ApiProperty({ example: '2026-07-01T00:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-01T23:59:59Z' })
  @IsDateString()
  endTime: string;
}

export class RejectFlashDealDto {
  @ApiProperty({ example: 'Discount below 30% minimum for Flash Deals' })
  @IsString()
  reason: string;
}

export class CreateReviewDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Great quality, very fresh!' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class AddToWishlistDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  storeId: string;
}

export class ReorderDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsString()
  customerId: string;
}

export class ProductTranslationDto {
  @ApiProperty({ example: 'ar' })
  @IsString()
  locale: string;

  @ApiPropertyOptional({ example: 'موز عضوي' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'موز طازج من المزرعة' })
  @IsOptional()
  @IsString()
  description?: string;
}
