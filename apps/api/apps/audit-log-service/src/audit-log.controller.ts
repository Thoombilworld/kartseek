import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly svc: AuditLogService) {}
  @Get('health') health() { return this.svc.healthCheck(); }
  @Post() log(@Body() dto: any) { return this.svc.logEvent(dto); }
  @Get() getRecent(@Query('page') page = 1, @Query('limit') limit = 50) { return this.svc.getRecentLogs(+page, +limit); }
  @Get('user/:userId') getByUser(@Param('userId') uid: string, @Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.getLogsByUser(uid, +page, +limit); }
  @Get('resource/:resource/:resourceId') getByResource(@Param('resource') r: string, @Param('resourceId') rid: string) { return this.svc.getLogsByResource(r, rid); }
  // Kafka consumer — auto-log auditable events
  @EventPattern('audit.log') async handleAuditEvent(@Payload() data: any) { await this.svc.logEvent(data); }
}
