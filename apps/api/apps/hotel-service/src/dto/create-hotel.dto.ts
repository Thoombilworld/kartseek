import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsArray, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class HotelLocationDto {
  @ApiProperty({ example: 25.2048 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 55.2708 })
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ example: 'Near Burj Khalifa' })
  @IsOptional()
  @IsString()
  landmark?: string;
}

class HotelPoliciesDto {
  @ApiProperty({ example: '14:00' })
  @IsString()
  checkIn: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  checkOut: string;

  @ApiPropertyOptional({ example: 'Free cancellation up to 24h before check-in' })
  @IsOptional()
  @IsString()
  cancellation?: string;

  @ApiPropertyOptional({ example: 'Children of all ages welcome' })
  @IsOptional()
  @IsString()
  children?: string;

  @ApiPropertyOptional({ example: 'Pets not allowed' })
  @IsOptional()
  @IsString()
  pets?: string;

  @ApiPropertyOptional({ example: 'Non-smoking property' })
  @IsOptional()
  @IsString()
  smoking?: string;
}

export class CreateHotelDto {
  @ApiProperty({ example: 'The Grand Palace Hotel' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Experience unparalleled luxury...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Sheikh Zayed Road, Downtown' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Dubai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'AE' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  starRating: number;

  @ApiPropertyOptional({ example: 'Luxury' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: ['Pool', 'Spa', 'Gym', 'WiFi'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ type: HotelPoliciesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HotelPoliciesDto)
  policies?: HotelPoliciesDto;

  @ApiPropertyOptional({ type: HotelLocationDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HotelLocationDto)
  location?: HotelLocationDto;

  @ApiPropertyOptional({ example: '+971 4 123 4567' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'reservations@hotel.com' })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({ example: 'AED' })
  @IsOptional()
  @IsString()
  currency?: string;
}
