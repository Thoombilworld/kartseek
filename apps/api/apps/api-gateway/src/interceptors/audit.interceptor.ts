import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { marketScopeOf } from '../guards/market-scope';

/** Anything that can carry an event to the audit topic. */
export interface AuditSink {
  publish(topic: string, payload: Record<string, unknown>): Promise<void>;
}

/** The topic `audit-log-service` consumes (`@EventPattern('audit.log')`). */
export const AUDIT_TOPIC = 'audit.log';

/**
 * AuditInterceptor — structured audit logging with request correlation.
 *
 * Captures request id, authenticated identity, method/URL, client IP (honouring
 * X-Forwarded-For), user agent and outcome.
 *
 * State-changing requests are additionally published to the `audit.log` Kafka
 * topic, where `audit-log-service` writes them to the immutable `audit_logs`
 * collection. That publish used to be a commented-out line reading
 * `// Future: Publish this event to Kafka for permanent storage`, so the audit
 * trail existed only as console output on one process: nothing was queryable,
 * and `audit-log-service` — which has always subscribed to this topic — never
 * received a single event.
 *
 * Reads are deliberately not published. Every GET on a busy gateway would swamp
 * the topic and bury the administrative actions the trail exists to record; the
 * console line below still covers reads for request tracing.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditInterceptor');
  private static readonly MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  /**
   * `sink` is optional so the interceptor keeps working when it is constructed
   * directly (`new AuditInterceptor()`) before the DI container exists. Without
   * one it degrades to console-only logging rather than throwing on every
   * request.
   */
  constructor(private readonly sink?: AuditSink) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const requestId = (req as any).requestId || 'no-id';
    const user = req.user ? req.user.id || req.user.sub : 'Anonymous';
    const method = req.method;
    const url = req.url;
    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent']?.substring(0, 100) || 'unknown';

    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        const statusCode = res.statusCode;

        this.logger.log(
          JSON.stringify({
            event: 'AUDIT',
            requestId,
            user,
            method,
            url,
            ip,
            statusCode,
            responseTime: `${responseTime}ms`,
            userAgent,
            timestamp: new Date().toISOString(),
          }),
        );

        this.record(req, {
          requestId,
          user,
          method,
          url,
          ip,
          userAgent,
          statusCode,
          outcome: 'success',
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - now;
        this.logger.warn(
          JSON.stringify({
            event: 'AUDIT_ERROR',
            requestId,
            user,
            method,
            url,
            ip,
            statusCode: error.status || 500,
            error: error.message?.substring(0, 200),
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
          }),
        );

        this.record(req, {
          requestId,
          user,
          method,
          url,
          ip,
          userAgent,
          statusCode: error.status || 500,
          outcome: 'error',
          error: error.message?.substring(0, 200),
        });
        throw error;
      }),
    );
  }

  /**
   * Publish one state-changing request to the audit topic.
   *
   * Never throws and never awaits: an audit-pipeline problem must not turn a
   * request that already succeeded into a 500, and must not add broker latency
   * to the response. A failed publish is logged so the gap is visible.
   */
  private record(req: any, entry: Record<string, unknown>): void {
    if (!this.sink) return;
    if (!AuditInterceptor.MUTATIONS.has(String(entry.method))) return;

    const url = String(entry.url ?? '');
    const { entityType, entityId } = this.entityFromUrl(url);

    void this.sink
      .publish(AUDIT_TOPIC, {
        actionType: `http.${String(entry.method).toLowerCase()}.${url.split('?')[0]}`,
        actorId: String(entry.user ?? 'Anonymous'),
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        actorIp: entry.ip,
        entityType,
        entityId,
        // The gateway sees the request, not the row: before/after values are
        // known only to the service that owns the entity, which is why they are
        // absent here and supplied by services that emit their own audit events.
        metadata: {
          requestId: entry.requestId,
          userAgent: entry.userAgent,
          statusCode: entry.statusCode,
          outcome: entry.outcome,
          error: entry.error,
        },
        // THE CLAIM FIRST, and for a locked caller the claim ONLY.
        //
        // This was `req.headers?.['x-region-code'] ?? req.user?.regionCode ??
        // 'UNKNOWN'`: the client-controlled header ahead of the signed token,
        // the one place on the branch where a market came from a header before
        // a claim (whole-branch review, finding A-4). A QA-locked admin could
        // send `x-region-code: IN` and file their own mutation under IN — out
        // of the trail their own market reads back, since
        // `audit-log.service.ts` narrows a locked reader to
        // `country ∈ [scope, 'ALL']`. An audit row is the record of who did
        // what, where; its market is not the actor's to choose.
        //
        // An UNLOCKED caller may still narrow with the header. That is the
        // console saying which market the operator was working in, and an
        // unlocked account is entitled to every market anyway, so the header
        // can only narrow — never widen. `marketScopeOf` is the same reader
        // every guard uses, so SUPER_ADMIN counts as unlocked here too.
        country: this.marketOf(req),
        service: 'api-gateway',
      })
      .catch((err: Error) => this.logger.warn(`audit publish failed for ${url}: ${err?.message}`));
  }

  /**
   * The market an audit row is filed under.
   *
   * Locked caller → their own market, from the token, and nothing else.
   * Unlocked caller → the `x-region-code` header if they sent one, else their
   * own `regionCode` claim if they have one, else `'UNKNOWN'`.
   *
   * `'UNKNOWN'` and not `'ALL'`: `'ALL'` means "this action belongs to every
   * market" and every locked administrator reads those rows back
   * (`audit-log.service.ts` `country ∈ [scope, 'ALL']`), so it is written only
   * by the console's own `audit.record` route and only for an unlocked caller.
   * An HTTP request the interceptor cannot attribute is unattributable, which
   * is what `'UNKNOWN'` says, and no locked reader sees it.
   */
  private marketOf(req: any): string {
    const scope = marketScopeOf(req);
    if (scope.locked && scope.region) return scope.region;
    const header = req?.headers?.['x-region-code'];
    const named = typeof header === 'string' && header.trim() ? header : undefined;
    return String(named ?? req?.user?.regionCode ?? 'UNKNOWN')
      .trim()
      .toUpperCase();
  }

  /**
   * Best-effort entity identification from the path, so the trail is queryable
   * by what was acted on: `/admin/grocery/stores/<uuid>/approve` yields
   * `stores` / `<uuid>`.
   */
  private entityFromUrl(url: string): { entityType?: string; entityId?: string } {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    const idAt = parts.findIndex(
      (p) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p) ||
        /^\d+$/.test(p),
    );
    if (idAt > 0) return { entityType: parts[idAt - 1], entityId: parts[idAt] };
    return { entityType: parts[parts.length - 1] };
  }

  /**
   * Extract the true client IP, accounting for reverse proxies.
   * Priority: X-Forwarded-For → X-Real-IP → req.ip → socket address
   */
  private extractClientIp(req: any): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
      // The first entry is the original client IP
      return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
