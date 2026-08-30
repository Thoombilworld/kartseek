import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroceryOrderStatus } from '../entities/grocery-order.entity';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: GroceryOrderStatus, example: 'PACKING' })
  @IsEnum(GroceryOrderStatus)
  status: GroceryOrderStatus;

  @ApiPropertyOptional({ example: 'Customer requested cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;
}
