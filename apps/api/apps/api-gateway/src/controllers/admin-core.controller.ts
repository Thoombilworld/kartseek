import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { marketScopeOf, resolveMarket } from '../guards/market-scope';

/**
 * Admin Core — the platform-wide admin surface.
 *
 * These eleven operations existed in admin-service all along
 * (`getDashboardStats`, `getUsersList`, `banUser`, the KYC queue, the audit log,
 * the revenue report) and were routable on that service's own HTTP port. The
 * gateway talks to admin-service over TCP, and only `get_admin_dashboard` was
 * exposed that way, so none of them were reachable from a browser: every
 * /admin/* call the web client made had no route on the gateway at all and
 * returned 404.
 *
 * The module-specific admin surfaces (/admin/marketplace, /admin/grocery, and
 * so on) each have their own controller; this one covers what is not
 * module-specific.
 */
@ApiTags('👑 Admin — Core')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminCoreController {
  private readonly logger = new Logger(AdminCoreController.name);

  constructor(@Inject('ADMIN_SERVICE') private readonly adminClient: ClientProxy) {}

  /**
   * Forward to admin-service, preserving the failure.
   *
   * Deliberately no fallback value: an unreachable service must not be
   * indistinguishable from an empty result, which is how an outage ends up
   * looking like "no users" or "nothing awaiting KYC".
   */
  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.adminClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Admin service unavailable'))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`admin-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Admin service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /** The acting administrator, from the verified token — recorded on mutations. */
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
  }

  /**
   * The market this request may act in, as `scope` for the backend. A locked
   * admin gets their market (and any other market they name is refused and
   * logged); a global admin gets undefined — every market — or the market they
   * filtered on.
   */
  private scopeOf(
    req: any,
    requested?: string,
    what = 'that market',
  ): { scope?: string; market?: string } {
    const market = resolveMarket(req, requested, what);
    const scope = marketScopeOf(req).locked ? market : undefined;
    return { scope, market };
  }

  // ── Overview ───────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform-wide admin dashboard counters' })
  @ApiQuery({ name: 'country', required: false })
  async dashboard(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that dashboard');
    return this.send('get_admin_dashboard', { country: market, scope });
  }

  @Get('platform/health')
  @ApiOperation({ summary: 'Platform health summary across services' })
  platformHealth() {
    return this.send('admin_platform_health', {});
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List platform users' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'search', required: false })
  async users(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('role') role?: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those users');
    return this.send('admin_users_list', { page, limit, role, country: market, search, scope });
  }

  @Put('users/:userId/ban')
  @ApiOperation({ summary: 'Ban a user' })
  async banUser(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: { reason?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that user');
    return this.send('admin_ban_user', {
      userId,
      reason: dto?.reason ?? '',
      adminId: this.actorId(req),
      scope,
    });
  }

  @Put('users/:userId/unban')
  @ApiOperation({ summary: 'Lift a ban' })
  async unbanUser(@Req() req: any, @Param('userId', ParseUUIDPipe) userId: string) {
    const { scope } = this.scopeOf(req, undefined, 'that user');
    return this.send('admin_unban_user', { userId, adminId: this.actorId(req), scope });
  }

  // ── KYC queue ──────────────────────────────────────────────────────────────

  @Get('kyc/pending')
  @ApiOperation({ summary: 'Identity checks awaiting a decision' })
  async pendingKyc(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that queue');
    return this.send('admin_kyc_pending', { page, limit, scope });
  }

  @Post('kyc/:entityId/approve')
  @ApiOperation({ summary: 'Approve an identity check' })
  async approveKyc(
    @Req() req: any,
    @Param('entityId') entityId: string,
    @Body() dto: { entityType?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that identity check');
    return this.send('admin_kyc_approve', {
      entityId,
      entityType: dto?.entityType ?? 'seller',
      adminId: this.actorId(req),
      scope,
    });
  }

  @Post('kyc/:entityId/reject')
  @ApiOperation({ summary: 'Reject an identity check, with a reason' })
  async rejectKyc(
    @Req() req: any,
    @Param('entityId') entityId: string,
    @Body() dto: { entityType?: string; reason?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that identity check');
    return this.send('admin_kyc_reject', {
      entityId,
      entityType: dto?.entityType ?? 'seller',
      adminId: this.actorId(req),
      reason: dto?.reason ?? '',
      scope,
    });
  }

  // ── Audit trail ────────────────────────────────────────────────────────────
  //
  // `GET`/`POST /admin/audit-logs` used to live here and forward to
  // admin-service, which kept its own list in a Redis key — separate from, and
  // invisible to, the immutable Mongo collection the gateway's AuditInterceptor
  // has been filling with every admin mutation since it started publishing to
  // Kafka. Two trails, neither complete.
  //
  // Both routes now live on `AdminAuditController`, against audit-log-service,
  // which owns that collection. The path is unchanged, so no client moved.

  // ── Reporting ──────────────────────────────────────────────────────────────

  @Get('reports/revenue')
  @ApiOperation({ summary: 'Revenue over a date range' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  @ApiQuery({ name: 'country', required: false })
  async revenueReport(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    const end = endDate ?? new Date().toISOString().slice(0, 10);
    const start = startDate ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    return this.send('admin_revenue_report', {
      startDate: start,
      endDate: end,
      groupBy: groupBy ?? 'day',
      country: market,
      scope,
    });
  }
}
