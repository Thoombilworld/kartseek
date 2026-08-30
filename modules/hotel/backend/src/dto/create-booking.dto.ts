import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum HotelPaymentMethod {
  CARD = 'CARD',
  WALLET = 'WALLET',
  CARD_WALLET = 'CARD_WALLET',
  PAY_AT_HOTEL = 'PAY_AT_HOTEL',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export class CreateBookingDto {
  @ApiProperty({ example: 'customer-uuid-001' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'rm-001' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  checkin: string;

  @ApiProperty({ example: '2026-07-18' })
  @IsDateString()
  checkout: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Max(20)
  guests: number;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Max(10)
  rooms: number;

  @ApiProperty({ enum: HotelPaymentMethod, example: 'CARD' })
  @IsEnum(HotelPaymentMethod)
  paymentMethod: HotelPaymentMethod;

  @ApiPropertyOptional({ example: 'Late check-in, extra pillows' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ example: 100, description: 'Wallet balance to apply (AED)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  walletAmount?: number;

  @ApiPropertyOptional({ example: 500, description: 'Loyalty points to redeem' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loyaltyPoints?: number;

  @ApiPropertyOptional({ example: 'COUPON20OFF' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiPropertyOptional({ example: 'john@email.com' })
  @IsOptional()
  @IsString()
  guestEmail?: string;

  @ApiPropertyOptional({ example: '+971501234567' })
  @IsOptional()
  @IsString()
  guestPhone?: string;
}
