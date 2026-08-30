import { IsString, IsNumber, Min, Max, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ModifyBookingDto {
  @ApiPropertyOptional({ example: '2026-07-16' })
  @IsOptional()
  @IsDateString()
  checkin?: string;

  @ApiPropertyOptional({ example: '2026-07-20' })
  @IsOptional()
  @IsDateString()
  checkout?: string;

  @ApiPropertyOptional({ example: 'rm-002' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  guests?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  rooms?: number;

  @ApiPropertyOptional({ example: 'Late checkout requested' })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
