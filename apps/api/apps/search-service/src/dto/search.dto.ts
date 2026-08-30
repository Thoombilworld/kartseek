/**
 * KARTSEEK Search Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt,
  Min, Max, MaxLength, IsNumber, IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SearchIndex {
  PRODUCTS = 'products',
  RESTAURANTS = 'restaurants',
  GROCERY = 'grocery',
  PHARMACY = 'pharmacy',
  HOTELS = 'hotels',
  DOCTORS = 'doctors',
  ALL = 'all',
}

export enum SortOrder {
  RELEVANCE = 'relevance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING = 'rating',
  NEWEST = 'newest',
  POPULARITY = 'popularity',
  DISTANCE = 'distance',
}

export class SearchQueryDto {
  @ApiProperty({ example: 'wireless earbuds' })
  @IsString() @IsNotEmpty() @MaxLength(500)
  q: string;

  @ApiPropertyOptional({ enum: SearchIndex, example: 'products' })
  @IsOptional() @IsEnum(SearchIndex)
  index?: SearchIndex = SearchIndex.ALL;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: SortOrder, example: 'relevance' })
  @IsOptional() @IsEnum(SortOrder)
  sort?: SortOrder = SortOrder.RELEVANCE;

  @ApiPropertyOptional({ example: 'category-uuid-001' })
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 100, description: 'Min price filter' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Max price filter' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 4.0, description: 'Min rating filter' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: -1.2921 })
  @IsOptional() @Type(() => Number) @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 36.8219 })
  @IsOptional() @Type(() => Number) @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional() @IsString()
  regionCode?: string;
}

export class AutocompleteDto {
  @ApiProperty({ example: 'wire' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  q: string;

  @ApiPropertyOptional({ enum: SearchIndex, example: 'products' })
  @IsOptional() @IsEnum(SearchIndex)
  index?: SearchIndex = SearchIndex.ALL;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20)
  limit?: number = 8;
}

export class FilterDto {
  @ApiProperty({ example: 'brand' })
  @IsString() @IsNotEmpty()
  field: string;

  @ApiProperty({ type: [String], example: ['Samsung', 'Apple'] })
  @IsArray() @IsString({ each: true })
  values: string[];
}

export class SortDto {
  @ApiProperty({ example: 'price' })
  @IsString() @IsNotEmpty()
  field: string;

  @ApiProperty({ example: 'asc', enum: ['asc', 'desc'] })
  @IsString() @IsNotEmpty()
  order: 'asc' | 'desc';
}
