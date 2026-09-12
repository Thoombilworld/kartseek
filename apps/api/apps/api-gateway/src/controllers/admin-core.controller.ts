import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { StorageService, StorageObjectNotFoundError } from '@app/storage';
import { resolveScope, assertRecordInScope } from '../guards/market-scope';
import { KycDecisionDto, ReasonDto } from '../dto/admin-core.dto';

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

  constructor(
    @Inject('ADMIN_SERVICE') private readonly adminClient: ClientProxy,
    // The KYC document read path streams from the private storage seam. Not
    // optional: a missing provider must fail at boot rather than turn an
    // identity-document read into a 500 during a review.
    private readonly storage: StorageService,
  ) {}

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

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }

  // ── Overview ───────────────────────────────────────────────────────────────

  /**
   * `dashboard.view` is enforced here, not merely documented.
   *
   * The console's forbidden panel tells the reader which permission they lack,
   * and the only honest way to say `dashboard.view` is for the route to check
   * it: a 403 that was really a *role* refusal, under a panel naming a
   * permission, sends an administrator to ask for a grant that would change
   * nothing. All five seeded roles hold it (see
   * `migrations/1786501800000-AdminRoles.ts`) and SUPER_ADMIN signs in with
   * `*`, so nothing loses access.
   *
   * The roles are repeated because `@Roles` on a handler *overrides* the
   * class-level list rather than adding to it.
   */
  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:dashboard.view')
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
    @Body() dto: ReasonDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that user');
    return this.send('admin_ban_user', {
      userId,
      reason: dto.reason,
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
    @Body() dto: KycDecisionDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that identity check');
    return this.send('admin_kyc_approve', {
      entityId,
      entityType: dto.entityType,
      adminId: this.actorId(req),
      scope,
    });
  }

  @Post('kyc/:entityId/reject')
  @ApiOperation({ summary: 'Reject an identity check, with a reason' })
  async rejectKyc(
    @Req() req: any,
    @Param('entityId') entityId: string,
    @Body() dto: KycDecisionDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that identity check');
    return this.send('admin_kyc_reject', {
      entityId,
      entityType: dto.entityType,
      adminId: this.actorId(req),
      reason: dto.reason ?? '',
      scope,
    });
  }

  /**
   * Read one KYC document back — the only way to.
   *
   * The documents `POST /upload/kyc-document` stores live on the PRIVATE
   * storage seam: no public ACL, no CDN, no signed URL, and therefore no link
   * anybody can follow. Before this route there was no read path at all, which
   * is half of why the fix wave's storage call was routed through the public
   * seam instead (re-review RF-1) — a document nobody could read looked like a
   * document that was not stored.
   *
   * `:key` is the base64url of the object key the upload returned
   * (`kyc/<userId>/<uuid>.<ext>`). Encoded, because the key contains slashes;
   * opaque, because it is one. It is NOT a credential — this route authorises
   * on the token and on the record:
   *
   *   • `@Roles(ADMIN, SUPER_ADMIN, 'perm:kyc.view')` — the same permission the
   *     console's KYC panel names;
   *   • `this.scopeOf(req, …)` resolves the caller's market, and
   *     `assertRecordInScope` compares it against the market recorded on the
   *     document's own row, so a region-locked reviewer cannot read another
   *     market's identity documents even holding a valid key;
   *   • `Content-Disposition: attachment` and `Cache-Control: no-store`, so the
   *     bytes are not rendered inline into a page and nothing downstream keeps a
   *     copy.
   *
   * The OWNER's own read (a seller or driver fetching back what they submitted)
   * is deliberately NOT here: `GET /users/partner/:partnerId/kyc` lists a
   * different store (`partner:<id>` in Redis, written by the partner submit
   * route) and wiring it to this seam is MODULES M9's, along with the rest of
   * the KYC record schema.
   */
  @Get('kyc/documents/:key')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:kyc.view')
  @ApiOperation({
    summary: 'Stream one submitted KYC document',
    description:
      'Returns the stored bytes as an attachment, uncached. `key` is the base64url of the ' +
      'object key `POST /upload/kyc-document` returned. Requires `kyc.view`; a region-locked ' +
      'administrator may only read documents belonging to their own market.',
  })
  @ApiParam({ name: 'key', description: 'base64url of the stored object key' })
  @ApiOkResponse({ description: 'The document bytes, as an attachment' })
  @ApiForbiddenResponse({ description: 'Another market’s document, or `kyc.view` not held' })
  @ApiNotFoundResponse({ description: 'No such document' })
  async kycDocument(@Req() req: any, @Param('key') encoded: string, @Res() res: any) {
    const { scope } = this.scopeOf(req, undefined, 'that identity document');
    const key = this.decodeDocumentKey(encoded);

    const record = await this.send<{
      key: string;
      owner: string;
      entityType: string;
      market: string | null;
      mime?: string;
      size?: number;
      uploadedAt?: string;
    }>('admin_kyc_document', { key, scope });

    // Asserted here as well as in admin-service: the record's market is the
    // document's owner's market, and the gateway half of that rule is what the
    // market-scope regression reads.
    assertRecordInScope(req, record?.market, 'that identity document');

    let object;
    try {
      object = await this.storage.readPrivate(key);
    } catch (err) {
      if (err instanceof StorageObjectNotFoundError) {
        throw new HttpException(
          'That identity document is no longer in the document store.',
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.error(`kyc document read failed [${key}]: ${(err as Error)?.message}`);
      throw new HttpException('The document store could not be read.', HttpStatus.BAD_GATEWAY);
    }

    const filename = key.split('/').pop() || 'document';
    res.setHeader('Content-Type', object.contentType || record?.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(object.size));
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(HttpStatus.OK).end(object.body);
  }

  /**
   * base64url → object key, refusing anything that is not one of ours.
   *
   * The key comes off a URL, so it is untrusted input on a path that reads
   * files: the shape is pinned to `kyc/<owner>/<uuid>.<ext>` and traversal
   * cannot survive it (`StorageService` refuses `..` again on its own side).
   */
  private decodeDocumentKey(encoded: string): string {
    let key: string;
    try {
      key = Buffer.from(String(encoded ?? ''), 'base64url').toString('utf8');
    } catch {
      key = '';
    }
    if (!/^kyc\/[A-Za-z0-9._@:-]{1,80}\/[0-9a-f-]{36}\.(pdf|png|jpe?g)$/i.test(key)) {
      throw new HttpException('That is not a document key.', HttpStatus.BAD_REQUEST);
    }
    return key;
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
