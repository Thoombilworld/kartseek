/**
 * KARTSEEK Location Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional,
  IsLatitude, IsLongitude, IsInt, MaxLength, IsArray, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GeoSearchDto {
  @ApiProperty({ example: -1.2921 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber() @IsLatitude()
  lat: number;

  @ApiProperty({ example: 36.8219 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber() @IsLongitude()
  lng: number;

  @ApiPropertyOptional({ example: 5, description: 'Radius in km' })
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber() @Min(0.1) @Max(100)
  radius?: number = 5;

  @ApiPropertyOptional({ example: 'restaurant' })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 'entity-uuid-001' })
  @IsString() @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: 'driver', description: 'Entity type: driver | store | restaurant | hotel' })
  @IsString() @IsNotEmpty()
  entityType: string;

  @ApiProperty({ example: -1.2921 })
  @IsNumber() @IsLatitude()
  lat: number;

  @ApiProperty({ example: 36.8219 })
  @IsNumber() @IsLongitude()
  lng: number;

  @ApiPropertyOptional({ example: 45.5, description: 'Heading in degrees' })
  @IsOptional() @IsNumber() @Min(0) @Max(360)
  heading?: number;

  @ApiPropertyOptional({ example: 60, description: 'Speed in km/h' })
  @IsOptional() @IsNumber() @Min(0) @Max(300)
  speed?: number;
}

export class NearbyQueryDto {
  @ApiProperty({ example: '-1.2921' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber() @IsLatitude()
  lat: number;

  @ApiProperty({ example: '36.8219' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber() @IsLongitude()
  lng: number;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber() @Min(0.1) @Max(50)
  radiusKm?: number;

  @ApiPropertyOptional({ example: 'store' })
  @IsOptional() @IsString()
  type?: string;
}

class GeoPointDto {
  @ApiProperty({ example: -1.2921 })
  @IsNumber() @IsLatitude()
  lat: number;

  @ApiProperty({ example: 36.8219 })
  @IsNumber() @IsLongitude()
  lng: number;
}

export class GeoFenceDto {
  @ApiProperty({ example: 'CBD No-Go Zone' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiProperty({ type: [GeoPointDto], description: 'Polygon vertices' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoPointDto)
  vertices: GeoPointDto[];

  @ApiPropertyOptional({ example: true, description: 'Whether the fence is active' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'restrict', description: 'Action: restrict | alert | surge' })
  @IsOptional() @IsString()
  action?: string;
}
