import { Controller, Get } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { AuditLogService } from './audit-log.service';

/**
 * The audit trail's own service. It speaks **TCP and Kafka**; its HTTP port
 * answers one question only, and that question is "are you alive".
 *
 * It used to serve four more routes over HTTP — `GET /audit-logs`,
 * `GET /audit-logs/user/:userId`, `GET /audit-logs/resource/:r/:id` and
 * `POST /audit-logs` — on `AUDIT_LOG_SERVICE_PORT` (3028), with
 * `app.enableCors()` in `main.ts` and **no guard, no token and no `scope`
 * parameter**. Anyone who could reach the port read every market's
 * administrative history — the exact cross-market activity a market lock
 * exists to hide — and could `POST` forged entries into the collection an
 * auditor treats as the system of record. Nothing in the repo called them: the
 * gateway reads and writes over TCP 4028 (`audit.query` / `audit.record`) and
 * the only HTTP consumer is the gateway's health probe
 * (`api-gateway/src/controllers/health.controller.ts`), which wants
 * `/audit-logs/health`. So they are gone rather than guarded — an
 * authenticated second door onto the same rows would still have to re-derive
 * the market scope the gateway already resolves from the signed token.
 *
 * `AuditLogService.getRecentLogs` / `getLogsByUser` / `getLogsByResource` are
 * left in place: they are covered by `audit-log.service.spec.ts` and the
 * service file is outside this change's remit. They are no longer reachable
 * from outside the process.
 *
 * `audit-log.controller.spec.ts` asserts, from the route metadata, that
 * `health` is the only HTTP handler on this class — so a new `@Get`/`@Post`
 * here fails the suite rather than quietly re-opening the trail.
 */
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly svc: AuditLogService) {}

  /** The gateway's service catalogue probes this, and nothing else here. */
  @Get('health') health() {
    return this.svc.healthCheck();
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
