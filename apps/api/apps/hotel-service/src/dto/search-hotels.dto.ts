import { IsString, IsNumber, Min, Max, IsOptional, IsDateString, IsEnum, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum HotelSortBy {
  RECOMMENDED = 'recommended',
  PRICE_ASC = 'price-asc',
  PRICE_DESC = 'price-desc',
  RATING_DESC = 'rating-desc',
  STARS_DESC = 'stars-desc',
  DISTANCE_ASC = 'distance-asc',
  REVIEWS_DESC = 'reviews-desc',
}

export class SearchHotelsDto {
  @ApiPropertyOptional({ example: 'Grand Palace' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'Dubai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  checkin?: string;

  @ApiPropertyOptional({ example: '2026-07-18' })
  @IsOptional()
  @IsDateString()
  checkout?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(20)
  guests?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(10)
  rooms?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: '4,5', description: 'Comma-separated star ratings' })
  @IsOptional()
  @IsString()
  starRating?: string;

  @ApiPropertyOptional({ example: 'Pool,WiFi,Gym', description: 'Comma-separated amenities' })
  @IsOptional()
  @IsString()
  amenities?: string;

  @ApiPropertyOptional({ example: 4.0 })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(5)
  minGuestRating?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  freeCancellation?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  breakfastIncluded?: boolean;

  @ApiPropertyOptional({ enum: HotelSortBy, example: 'price-asc' })
  @IsOptional()
  @IsEnum(HotelSortBy)
  sort?: HotelSortBy;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  // Geo-based search
  @ApiPropertyOptional({ example: 25.2048, description: 'Latitude for map-based search' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 55.2708, description: 'Longitude for map-based search' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 10, description: 'Radius in km for map-based search' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  radius?: number;
}
