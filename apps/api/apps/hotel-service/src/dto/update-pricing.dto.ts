import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsArray, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BulkDatePriceDto {
  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  price: number;
}

class SeasonalRuleDto {
  @ApiProperty({ example: 'Summer Peak' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 1.25, description: 'Price multiplier (1.25 = 25% increase)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  multiplier?: number;

  @ApiPropertyOptional({ example: 600, description: 'Fixed price override (takes priority over multiplier)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number;
}

export class UpdatePricingDto {
  @ApiPropertyOptional({ example: 450, description: 'Base price per night' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ example: 600, description: 'Rack rate (published max price)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rackPrice?: number;

  @ApiPropertyOptional({ description: 'Seasonal pricing rules' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeasonalRuleDto)
  seasonalRules?: SeasonalRuleDto[];

  @ApiPropertyOptional({ description: 'Specific date overrides for bulk pricing' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkDatePriceDto)
  bulkDates?: BulkDatePriceDto[];
}
