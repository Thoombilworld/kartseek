import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, lastValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { resolveScope } from '../guards/market-scope';
import { AuditEntryDto } from '../dto/admin-audit.dto';

/**
 * The platform's audit trail, as one readable surface.
 *
 * Three stores held administrative history and none of them was the trail.
 * The gateway's `AuditInterceptor` published every admin mutation to Kafka and
 * `audit-log-service` wrote each one into an immutable Mongo collection — a
 * real, durable record that nothing could read, because the only routes that
 * said "audit" on the gateway went to admin-service, which kept its own,
 * separate list in a Redis key under a 90-day TTL. Meanwhile the console's
 * audit page rendered a seven-row array of invented entries compiled into the
 * bundle, so the one screen an administrator would check after an incident
 * showed fabricated history with a straight face, and `/admin/marketplace/
 * audit-logs` answered `{ data: [], total: 0 }` from a stub.
 *
 * These routes read the collection the interceptor has been filling all along.
 * Scoping matters more here than anywhere else: an audit row leaked across
 * markets is indistinguishable from one the reader is entitled to, so every
 * route resolves the caller's market and hands it to the service as `scope`,
 * which the service applies whatever the request asked for.
 *
 * `perm:audit.logs` gates all three on top of the role list. SUPPORT_AGENT and
 * PRODUCT_MANAGER are in the role list but hold no such permission, so they get
 * 403 — the roles are named so the failure is a permission decision rather than
 * an unexplained role mismatch, and so granting them the key is all it takes.
 */
/**
 * The remaining staff roles that may open the trail *if* they also hold
 * `audit.logs`. Held in a const purely so the `@Roles(...)` below stays on one
 * line: `route-exposure.regression.spec.ts` reads a controller's class
 * decorators by walking up from `export class` while each line above begins
 * with `@`, and a prettier-wrapped `@Roles(` ends that walk early — the scan
 * then reports a route as unguarded and unrolled when it is neither.
 */
const AUDIT_STAFF = [UserRole.FINANCE_MANAGER, UserRole.SUPPORT_AGENT, UserRole.PRODUCT_MANAGER];

@ApiTags('👑 Admin — Audit')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, ...AUDIT_STAFF, 'perm:audit.logs')
@Controller('admin/audit-logs')
export class AdminAuditController {
  private readonly logger = new Logger(AdminAuditController.name);

  constructor(@Inject('AUDIT_LOG_SERVICE') private readonly audit: ClientProxy) {}

  /**
   * Forward to audit-log-service, preserving the failure.
   *
   * Deliberately no fallback value. An audit page that renders an empty table
   * because the service is unreachable tells the reader "nothing happened",
   * which is the single worst thing this surface can say.
   */
  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.audit
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Audit service unavailable'))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`audit-log-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Audit service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string) {
    return resolveScope(req, requested, 'that audit trail');
  }

  /** The first address in `X-Forwarded-For`, which is the client's. */
  private clientIp(req: any): string | undefined {
    const forwarded = req?.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
    return req?.ip;
  }

  @Get()
  @ApiOperation({
    summary: "Administrative actions, newest first, confined to the caller's market",
  })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'actorEmail', required: false })
  @ApiQuery({ name: 'entityType', required: false, description: "e.g. 'sellers', 'orders'" })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'actionType', required: false, description: 'Prefix match' })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date, inclusive' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date, inclusive' })
  list(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('actorId') actorId?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actionType') actionType?: string,
    @Query('country') country?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country);
    return this.send('audit.query', {
      page,
      // The collection is unbounded and grows with every admin action, so one
      // request cannot ask for all of it.
      limit: Math.min(limit, 200),
      actorId,
      actorEmail,
      entityType,
      entityId,
      actionType,
      country: market,
      from,
      to,
      scope,
    });
  }

  @Get('entity/:type/:id')
  @ApiOperation({ summary: 'Everything that happened to one record' })
  byEntity(@Req() req: any, @Param('type') type: string, @Param('id') id: string) {
    const { scope } = this.scopeOf(req);
    return this.send('audit.query', { entityType: type, entityId: id, limit: 200, scope });
  }

  @Post()
  @ApiOperation({
    summary: 'Record a console-originated action (the actor is the token, never the body)',
  })
  record(@Req() req: any, @Body() dto: AuditEntryDto) {
    const { scope } = this.scopeOf(req);
    return this.send('audit.record', {
      // Namespaced so a row written from a console button is never mistaken for
      // one the interceptor derived from an HTTP request (`http.<verb>.<path>`).
      actionType: `console.${dto.action}`,
      actorId: req.user?.id ?? req.user?.userId ?? req.user?.sub,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      actorIp: this.clientIp(req),
      entityType: dto.entityType,
      entityId: dto.entityId,
      reason: dto.reason,
      metadata: {
        ...(dto.details ?? {}),
        source: 'console',
        requestId: req.headers?.['x-request-id'],
      },
      // A locked admin's market, otherwise the market the caller is working in.
      // `'ALL'` last, so a global admin acting with no market selected files the
      // entry against every market rather than against 'UNKNOWN' — which a
      // locked admin can never read back.
      country: scope ?? req.headers?.['x-region-code'] ?? 'ALL',
      service: 'admin-console',
    });
  }
}
