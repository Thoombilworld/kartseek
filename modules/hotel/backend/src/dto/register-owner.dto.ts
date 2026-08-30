import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterOwnerDto {
  @ApiProperty({ example: 'Ahmed Al Maktoum' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ahmed@grandpalace.ae' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+971501234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Grand Palace Hotel Group' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'AE' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: 'TRN-1234567890' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'Hotel Group / Independent' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ example: 'www.grandpalace.ae' })
  @IsOptional()
  @IsString()
  website?: string;
}
