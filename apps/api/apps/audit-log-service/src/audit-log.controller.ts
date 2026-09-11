import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly svc: AuditLogService) {}
  @Get('health') health() {
    return this.svc.healthCheck();
  }
  @Post() log(@Body() dto: any) {
    return this.svc.logEvent(dto);
  }
  @Get() getRecent(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.svc.getRecentLogs(+page, +limit);
  }
  @Get('user/:userId') getByUser(
    @Param('userId') uid: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.getLogsByUser(uid, +page, +limit);
  }
  @Get('resource/:resource/:resourceId') getByResource(
    @Param('resource') r: string,
    @Param('resourceId') rid: string,
  ) {
    return this.svc.getLogsByResource(r, rid);
  }
  // Kafka consumer — auto-log auditable events.
  //
  // `Transport.KAFKA` explicitly, for the same reason the two TCP handlers
  // below name theirs: this service connects two microservices, and Nest binds
  // every handler to every connected transport unless told which one it meant.
  @EventPattern('audit.log', Transport.KAFKA) async handleAuditEvent(@Payload() data: any) {
    await this.svc.logEvent(data);
  }

  // ── TCP request/reply — what the gateway's /admin/audit-logs routes call ────
  //
  // `Transport.TCP` is not optional here. Nest registers every handler against
  // every transport the app connects, and this one also runs a Kafka consumer:
  // without it the Kafka server tries to subscribe to a topic literally named
  // `{"cmd":"audit.query"}`, which Kafka rejects as an invalid topic name — and
  // it does so at startup, so the whole service exits and the audit trail stops
  // being written at all. `search-service` hit exactly this and carries the
  // same note. Builds and unit tests both pass; only booting it shows the
  // fault.
  //
  // A missing payload means "the first page, every market": `query({})` is a
  // valid question, so the `?? {}` is a default rather than a swallowed error.
  // Nothing here widens the caller's view — `scope` arrives already resolved
  // from the signed token and the service applies it unconditionally.
  @MessagePattern({ cmd: 'audit.query' }, Transport.TCP)
  query(@Payload() filters: Record<string, any>) {
    return this.svc.query(filters ?? {});
  }

  // Console-originated entries take the same path as the Kafka ones, so a row
  // written from a button in the admin console is indistinguishable in storage
  // from one the interceptor recorded — one trail, one shape, one query.
  @MessagePattern({ cmd: 'audit.record' }, Transport.TCP)
  record(@Payload() dto: Record<string, any>) {
    return this.svc.logEvent(dto ?? {});
  }
}
