import { Controller, Get, Post, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { RpcAwareExceptionsFilter } from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get('health') health() { return this.svc.healthCheck(); }
  @Get('user/:userId') getNotifs(@Param('userId') userId: string, @Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.getNotifications(userId, +page, +limit); }
  @Post('push') sendPush(@Body() dto: any) { return this.svc.sendPush(dto); }
  @Post('sms') sendSms(@Body() dto: any) { return this.svc.sendSms(dto); }
  @Post('email') sendEmail(@Body() dto: any) { return this.svc.sendEmail(dto); }
  @Post('mark-read') markRead(@Body() dto: { userId: string; notificationIds: string[] }) { return this.svc.markAsRead(dto.userId, dto.notificationIds); }
  @Post('broadcast') broadcast(@Body() dto: any) { return this.svc.broadcastPromo(dto); }

  @MessagePattern({ cmd: 'send_push' })
  msgPush(@Payload() data: any) { return this.svc.sendPush(data); }
}
