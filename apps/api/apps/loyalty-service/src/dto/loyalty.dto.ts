/**
 * KARTSEEK Loyalty Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional,
  IsInt, IsEnum, MaxLength, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LoyaltyAction {
  PURCHASE = 'purchase',
  REVIEW = 'review',
  REFERRAL = 'referral',
  BONUS = 'bonus',
  SIGN_UP = 'sign_up',
  BIRTHDAY = 'birthday',
}

export class EarnPointsDto {
  @ApiProperty({ example: 'user-uuid-001' })
  @IsString() @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 150 })
  @IsInt() @Min(1)
  points: number;

  @ApiProperty({ enum: LoyaltyAction, example: 'purchase' })
  @IsEnum(LoyaltyAction)
  action: LoyaltyAction;

  @ApiPropertyOptional({ example: 'order-uuid-001' })
  @IsOptional() @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'Earned 150 points for order #ORD-1234' })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}

export class RedeemPointsDto {
  @ApiProperty({ example: 'user-uuid-001' })
  @IsString() @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 500 })
  @IsInt() @Min(1)
  points: number;

  @ApiPropertyOptional({ example: 'order-uuid-001', description: 'Order to apply discount to' })
  @IsOptional() @IsString()
  orderId?: string;
}

export class LoyaltyQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: LoyaltyAction })
  @IsOptional() @IsString()
  action?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Double Points Weekend' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @ApiProperty({ example: 2.0, description: 'Points multiplier' })
  @IsNumber() @Min(1) @Max(10)
  multiplier: number;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'Earn double points on all purchases this weekend!' })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}
