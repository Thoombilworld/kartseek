/**
 * KARTSEEK Notification Service — DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsArray,
  IsInt, Min, Max, MaxLength, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NotificationChannel {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  CHAT = 'chat',
  REMINDER = 'reminder',
}

export class SendNotificationDto {
  @ApiProperty({ example: 'user-uuid-001' })
  @IsString() @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Your order has been shipped!' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Order #ORD-1234 is on its way.' })
  @IsString() @IsNotEmpty() @MaxLength(1000)
  body: string;

  @ApiProperty({ enum: NotificationType, example: 'order_update' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true, example: ['push', 'in_app'] })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ example: { orderId: 'ORD-1234' } })
  @IsOptional()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'https://cdn.kartseek.com/img.jpg' })
  @IsOptional() @IsString()
  imageUrl?: string;
}

export class SendBulkNotificationDto {
  @ApiProperty({ type: [String], example: ['user-1', 'user-2'] })
  @IsArray() @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ example: 'Flash Sale Starting Now!' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Up to 50% off on all electronics. Shop now!' })
  @IsString() @IsNotEmpty() @MaxLength(1000)
  body: string;

  @ApiProperty({ enum: NotificationType, example: 'promotion' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];
}

export class MarkReadDto {
  @ApiProperty({ type: [String], example: ['notif-1', 'notif-2'] })
  @IsArray() @IsString({ each: true })
  notificationIds: string[];
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean()
  unreadOnly?: boolean;
}
