import { IsString, IsOptional, IsInt, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchProductsDto {
  @ApiProperty({ example: 'avocado', minLength: 2 })
  @IsString()
  @MinLength(2)
  query: string;

  @ApiPropertyOptional({ example: 'store-uuid-001' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ example: 'fruits-vegetables' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
