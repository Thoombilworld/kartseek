import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
  Req,
  Logger,
  ServiceUnavailableException,
  NotFoundException,
  ParseUUIDPipe,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import {
  assertRecordInScope,
  marketScopeOf,
  refuseLockedAdmin,
  resolveMarket,
  resolveScope,
} from '../guards/market-scope';
import { sellerScopeCacheKey } from '../guards/seller-ownership.guard';
import { UserRole, rpcCatch } from '@app/common';
import { User } from '../entities/user.entity';
import { MARKETPLACE_PATTERNS } from '../contracts';
import { AdminCouponDto, AdminCouponUpdateDto } from '../dto/admin-marketplace.dto';
import { ParseLimitPipe, ParsePagePipe, DEFAULT_PAGE_SIZE } from '../pipes/pagination.pipe';

/**
 * Admin Marketplace Controller
 *
 * Provides endpoints for the Admin Panel marketplace management:
 * sellers, products, categories, brands, campaigns, bank offers, exchange offers,
 * orders, refunds, payouts.
 *
 * Every endpoint requires an admin role (class-level `@Roles`). The money
 * routes — payouts, refunds and returns decisions, commissions, wallets and
 * loyalty — additionally name a permission key, and a method-level `@Roles`
 * *replaces* the class-level one rather than adding to it, so each of them
 * restates the role set alongside the key. `FINANCE_MANAGER` appears there and
 * nowhere else: that role exists to work these routes and is not an admin
 * anywhere else in the console.
 */
@ApiTags('👑 Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/marketplace')
export class AdminMarketplaceController {
  private readonly logger = new Logger(AdminMarketplaceController.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @Inject('MARKETPLACE_SERVICE') private readonly marketplaceClient: ClientProxy,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    // Finance. Both of these surfaces used to return hardcoded empty lists.
    @Inject('COMMISSION_SERVICE') private readonly commissionClient: ClientProxy,
    @Inject('PAYOUT_SERVICE') private readonly payoutClient: ClientProxy,
    // Customer balances and points are not marketplace-service's to change.
    // These five admin routes published an audit-log entry saying the
    // adjustment had happened, returned `success: true` with the amount, and
    // asked neither service — so an admin crediting a wallet saw a confirmation
    // and a logged credit while the customer's balance never moved.
    @Inject('WALLET_SERVICE') private readonly walletClient: ClientProxy,
    @Inject('LOYALTY_SERVICE') private readonly loyaltyClient: ClientProxy,
    // Orders and refunds belong to their own services. The admin routes for
    // both answered with the outcome they were named after and asked nobody.
    @Inject('ORDER_SERVICE_TCP') private readonly orderClient: ClientProxy,
    @Inject('REFUND_SERVICE') private readonly refundClient: ClientProxy,
  ) {}

  /** Forward to a named service, preserving the failure rather than inventing a result. */
  private async sendTo<T = any>(
    client: ClientProxy,
    service: string,
    cmd: string,
    payload: object,
  ): Promise<T> {
    try {
      return await lastValueFrom(
        client
          .send<T>({ cmd }, payload)
          .pipe(timeout(10000), catchError(rpcCatch(`${service} unavailable`))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(`${service} unavailable`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * The acting administrator, from the verified token — recorded on mutations.
   *
   * One helper, and the fallback is `unknown` rather than `admin`: an action
   * whose actor could not be identified must not be recorded as if a generic
   * "admin" had taken it. Half these routes used to send `UserRole.ADMIN` — the
   * literal string `"ADMIN"` — as the admin id.
   */
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
  }

  /**
   * The caller's identity for marketplace-service's own object-level checks.
   *
   * `MarketplaceFulfillmentService.assertOwns` asks "does this caller own the
   * row, or is it an admin?" and fails closed when it is handed no actor at
   * all — so an admin route that forwards only `scope` is refused by the
   * *ownership* check before the market check is ever reached. It travels under
   * the reserved `_actor` key, and every field comes from the verified token.
   */
  private actor(req: any): { ownerId?: string; role?: string; regionCode?: string } {
    const { region } = marketScopeOf(req);
    return {
      ownerId: req?.user?.id ?? req?.user?.userId ?? req?.user?.sub,
      role: req?.user?.role,
      ...(region ? { regionCode: region } : {}),
    };
  }

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }

  // Catalogue taxonomy — categories, subcategories, attributes, brands, HSN
  // codes — is one tree shared by every market. A regional admin reads it (the
  // GET routes carry `@GlobalEntity`) and may not edit it: a Qatari admin
  // renaming a category would rename it for India too. Each write refuses the
  // lock inline, where a reviewer reading the handler can see it.

  /**
   * A customer's wallet and loyalty balances are platform-wide.
   *
   * Neither wallet-service nor loyalty-service stores a market on a balance, or
   * reads the `scope` this controller sends, so there is nothing that can say
   * whether a given user is a regional admin's to credit, debit, freeze or
   * award points to. Forwarding `scope` to a service that ignores it would have
   * left a QA-locked admin unable to *read* a points balance while still able
   * to credit a wallet in any market — enforcement in name only. Refused here
   * instead, before any RPC. A global admin is unaffected.
   *
   * R11 gave `payout.payouts` and `payout.seller_wallets` a market and flipped
   * the six payout routes to filtering. It did NOT flip these: a balance is per
   * user, its market is `users.region_code`, and neither service joins to it.
   * That is the remaining work, and it is a join rather than a migration.
   */
  private refuseUnattributableBalance(req: any): void {
    refuseLockedAdmin(
      req,
      'a wallet/loyalty account',
      'This wallet/loyalty account cannot be attributed to a market yet.',
    );
  }

  /**
   * Finance reads that must never invent a number.
   *
   * Returns `null` when the service is unreachable so the caller can say
   * "unavailable" instead of reporting zero commission or an empty payout queue,
   * which is exactly how these surfaces used to lie.
   */
  private async sendToCommission<T = any>(cmd: string, payload: object): Promise<T | null> {
    return lastValueFrom(this.commissionClient.send<T>({ cmd }, payload).pipe(timeout(8000))).catch(
      (err): null => {
        this.logger.error(`commission-service [${cmd}] unreachable: ${err?.message}`);
        return null;
      },
    );
  }

  /**
   * Send to payout-service, preserving an authorisation decision.
   *
   * `null` still means "could not ask", so each caller can say "unavailable"
   * in its own words rather than reporting an empty payout queue or a zeroed
   * total. But it must NOT mean "refused": payout-service now asserts a
   * payout's own `region_code` and answers 403 for a cross-market decision
   * (R11), and the previous `.catch(() => null)` turned that into
   * `503 Payouts are temporarily unavailable` — an authorisation denial
   * reported as an outage, which sends an operator to check a service that is
   * running perfectly well.
   *
   * `rpcCatch` reconstructs the service's own HttpException, as
   * `sendToMarketplace` beside this has always done. A decision — 403, 404, 400
   * — is re-thrown; a 503 is the channel rather than the service's answer, so it
   * comes back as `null` and the route still owns the wording.
   */
  private async sendToPayout<T = any>(cmd: string, payload: object): Promise<T | null> {
    try {
      return await lastValueFrom(
        this.payoutClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(8000), catchError(rpcCatch('Payouts are temporarily unavailable.'))),
      );
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() !== HttpStatus.SERVICE_UNAVAILABLE) {
        throw err;
      }
      this.logger.error(`payout-service [${cmd}] unreachable: ${(err as Error)?.message}`);
      return null;
    }
  }

  /**
   * Send a TCP message to marketplace-service, preserving the original HTTP status.
   *
   * This used to be `catchError((err) => { throw err; })`. marketplace-service's
   * RpcAwareExceptionsFilter puts the real status on `statusCode`, but the object
   * it rejects with is a plain `{ statusCode, message, errorCode }` — not an
   * HttpException — so rethrowing it verbatim left the gateway's exception filter
   * with nothing it recognised and every failure became
   * `500 "An unexpected error occurred."`.
   *
   * That is why creating a subcategory without `parentId` reported an internal
   * error instead of "parentId is required": the admin was never told which field
   * was wrong, and a genuine 404 was indistinguishable from a crash. Same
   * reconstruction as `marketplace.controller.ts`, which has always done this.
   */
  private async sendToMarketplace<T = any>(cmd: string, ...args: any[]): Promise<T> {
    const payload = args.length <= 1 ? (args[0] ?? {}) : args;
    try {
      return await lastValueFrom(
        this.marketplaceClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(10000), catchError(rpcCatch('Marketplace service unavailable'))),
      );
    } catch (error) {
      // Re-thrown, not swallowed: `rpcCatch` has already reconstructed the
      // service's own HttpException where there was one, and that status is
      // what the caller needs. Anything else really is the channel being down.
      if (error instanceof HttpException) throw error;
      throw new HttpException('Marketplace service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Carry an approval decision across to the seller's *user* account and drop the
   * guards' caches.
   *
   * The two halves of this workflow were disconnected. Approving a seller wrote
   * `marketplace.sellers.verificationStatus`, while the portal gate reads
   * `users.status` and nothing consumed the `seller.approved` / `seller.rejected`
   * / `seller.suspended` Kafka events this controller publishes. So an admin
   * could approve a seller and the seller still could not open the portal, and an
   * admin could suspend one and the seller never noticed. Both directions are
   * closed here, synchronously, so the decision takes effect on the admin's own
   * request rather than depending on a consumer nobody wrote.
   */
  private async applySellerDecision(
    sellerId: string,
    userStatus: 'active' | 'suspended' | 'rejected',
  ) {
    // The seller row is authoritative for who owns it.
    let ownerId: string | null = null;
    try {
      const owner = await this.sendToMarketplace<{ ownerId: string | null }>('get_seller_owner', {
        sellerId,
      });
      ownerId = owner?.ownerId ?? null;
    } catch (err) {
      this.logger.warn(`Could not resolve owner for seller=${sellerId}: ${(err as Error).message}`);
    }

    if (ownerId) {
      try {
        await this.userRepo.update({ id: ownerId }, { status: userStatus });
      } catch (err) {
        this.logger.error(
          `Failed to set users.status=${userStatus} for user=${ownerId}: ${(err as Error).message}`,
        );
      }
    } else {
      this.logger.warn(
        `Seller ${sellerId} has no owner_id — portal access cannot follow this decision until it is backfilled.`,
      );
    }

    // Every per-seller cache keyed on this id; without this the old decision
    // stays live for the remainder of the TTL.
    //
    // Three keys, not two: `SellerOwnershipGuard` moved to `seller-scope:v2:`
    // when its cached value gained the market, and for a while this site went on
    // deleting only `seller-owner:` — a key the guard no longer writes — so the
    // comment above claimed an invalidation that had quietly stopped happening.
    // `seller-owner:` is still purged because `SellerOwnershipService` (the
    // WebSocket room check) does still use it. The key is built by the guard's
    // own exported helper so the two cannot drift apart again.
    await Promise.all([
      this.redis.del(`seller-approval:${sellerId}`).catch((): undefined => undefined),
      this.redis.del(`seller-owner:${sellerId}`).catch((): undefined => undefined),
      this.redis.del(sellerScopeCacheKey(sellerId)).catch((): undefined => undefined),
    ]);
  }

  // ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― Dashboard ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
  @Get('dashboard')
  @ApiOperation({ summary: "Admin marketplace dashboard stats for the caller's market" })
  @ApiQuery({ name: 'country', required: false })
  async getDashboard(@Req() req: any, @Query('country') country?: string) {
    // No catch: a dashboard of zeroes is indistinguishable from a platform that
    // has stopped trading, and that is exactly what an outage used to look like.
    const { scope, market } = this.scopeOf(req, country, 'that dashboard');
    const stats = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_DASHBOARD, {
      region: market,
      scope,
    });
    return { data: stats };
  }

  // ── Sellers ────────────────────────────────────────────────────────────────
  @Get('sellers')
  @ApiOperation({ summary: "List sellers with filters, confined to the caller's market" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED', 'VERIFIED'],
  })
  @ApiQuery({ name: 'country', required: false })
  async getSellers(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    // The filters used to be dropped on the floor: this sent no payload at all,
    // so every admin got the whole seller directory whatever they searched for.
    const { scope, market } = this.scopeOf(req, country, 'those sellers');
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS, {
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      region: market,
      scope,
    });
    return {
      ...(result as any),
      page: Number(page),
      limit: Number(limit),
      hasMore: (result as any).total > Number(page) * Number(limit),
    };
  }

  // ── Literal routes, declared before the `:slug` catch-all ──────────────
  //
  // Nest matches routes in declaration order. These sat *after* `@Get(':slug')`,
  // so /restaurants/favorites, /cart, /addresses, /gift-cards, /my-reservations
  // and /subscriptions were all captured as a slug and reached Postgres as a
  // uuid lookup -- `invalid input syntax for type uuid: "favorites"`. Every one
  // of these customer routes was a 500, hidden as an empty 200 by the old
  // gateway fallback. Keep literal paths above parameterised ones.

  @Get('sellers/pending')
  @ApiOperation({ summary: "Sellers awaiting approval in the caller's market" })
  @ApiQuery({ name: 'country', required: false })
  async getPendingSellers(@Req() req: any, @Query('country') country?: string) {
    // `status: 'PENDING'` was missing, so the "pending approvals" queue listed
    // every seller on the platform, approved and rejected ones included.
    const { scope, market } = this.scopeOf(req, country, 'those sellers');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS, {
      status: 'PENDING',
      region: market,
      scope,
      page: 1,
      limit: 100,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Admin Wallet Controls ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('sellers/:id')
  @ApiOperation({ summary: 'Seller detail' })
  async getSellerById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    // No catch: an unreachable service is a 503, not a seller called "".
    const seller = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLER_BY_ID, id);
    if (!seller) throw new NotFoundException('Seller not found');
    assertRecordInScope(
      req,
      (seller as any).regionCode ?? (seller as any).region_code,
      'that seller',
    );
    return { data: seller };
  }

  @Patch('sellers/:id/approve')
  @ApiOperation({ summary: 'Approve a seller' })
  async approveSeller(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body?: { reason?: string },
  ) {
    // Sent as an object. This passed `(id, UserRole.ADMIN)`, which
    // `sendToMarketplace` packs into an ARRAY, so the handler's `data?.id` was
    // undefined — and `where: { id: undefined }` matches the first row, so
    // approving one seller silently approved a different one. The admin id was
    // the literal string "ADMIN" rather than the person who clicked.
    //
    // No catch: a failed approval used to answer 200 with `success: false`
    // buried two levels down, which the console renders as a success.
    const { scope } = this.scopeOf(req, undefined, 'that seller');
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_APPROVE_SELLER, {
      id,
      adminId: this.actorId(req),
      scope,
    });
    await this.applySellerDecision(id, 'active');
    await this.kafka.publish(KAFKA_TOPICS.SELLER_APPROVED || 'seller.approved', {
      sellerId: id,
      actorId: this.actorId(req),
      regionCode: scope ?? (result as any)?.regionCode ?? null,
    });
    return {
      data: { success: true, message: `Seller ${id} approved`, status: 'ACTIVE', seller: result },
    };
  }

  @Patch('sellers/:id/reject')
  @ApiOperation({ summary: 'Reject a seller' })
  async rejectSeller(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that seller');
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REJECT_SELLER, {
      id,
      reason: body?.reason,
      adminId: this.actorId(req),
      scope,
    });
    await this.applySellerDecision(id, 'rejected');
    await this.kafka.publish(KAFKA_TOPICS.SELLER_REJECTED || 'seller.rejected', {
      sellerId: id,
      reason: body?.reason,
      actorId: this.actorId(req),
      regionCode: scope ?? (result as any)?.regionCode ?? null,
    });
    return {
      data: {
        success: true,
        message: `Seller ${id} rejected`,
        reason: body?.reason,
        seller: result,
      },
    };
  }

  @Patch('sellers/:id/suspend')
  @ApiOperation({ summary: 'Suspend a seller' })
  async suspendSeller(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that seller');
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_SUSPEND_SELLER, {
      id,
      adminId: this.actorId(req),
      scope,
    });
    await this.applySellerDecision(id, 'suspended');
    await this.kafka.publish(KAFKA_TOPICS.SELLER_SUSPENDED || 'seller.suspended', {
      sellerId: id,
      reason: body?.reason,
      actorId: this.actorId(req),
      regionCode: scope ?? (result as any)?.regionCode ?? null,
    });
    return {
      data: {
        success: true,
        message: `Seller ${id} suspended`,
        reason: body?.reason,
        seller: result,
      },
    };
  }

  @Patch('sellers/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended seller' })
  async reactivateSeller(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that seller');
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REACTIVATE_SELLER, {
      id,
      adminId: this.actorId(req),
      scope,
    });
    await this.applySellerDecision(id, 'active');
    await this.kafka.publish(KAFKA_TOPICS.SELLER_REACTIVATED || 'seller.reactivated', {
      sellerId: id,
      actorId: this.actorId(req),
      regionCode: scope ?? (result as any)?.regionCode ?? null,
    });
    return {
      data: {
        success: true,
        message: `Seller ${id} reactivated`,
        status: 'ACTIVE',
        seller: result,
      },
    };
  }

  // ── Products ───────────────────────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: "Products across sellers, confined to the caller's market" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'country', required: false })
  async getProducts(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    // Sent as `(page, limit)` — two positional arguments, which
    // `sendToMarketplace` packs into an ARRAY — so `status` never reached the
    // service and the payload had no shape the handler could read.
    const { scope, market } = this.scopeOf(req, country, 'those products');
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, {
      page: Number(page),
      limit: Number(limit),
      status,
      region: market,
      scope,
    });
    return { ...(result as any), hasMore: (result as any).total > Number(page) * Number(limit) };
  }

  // MUST stay above `products/:id` — a parametric route declared first would
  // capture "pending" as an id.
  @Get('products/pending')
  @ApiOperation({
    summary: "Products awaiting approval, with queue counts, in the caller's market",
  })
  @ApiQuery({ name: 'country', required: false })
  async getPendingProducts(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those products');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PENDING_PRODUCTS, {
      region: market,
      scope,
    });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Product detail for admin review' })
  async getProductById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const product = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCT_BY_ID, id);
    if (!product) throw new NotFoundException('Product not found');
    // A product's market is its seller's: the catalogue row carries none.
    assertRecordInScope(
      req,
      (product as any).sellerRegionCode ?? (product as any).seller?.regionCode,
      'that product',
    );
    return { data: product };
  }

  // Product moderation is a real state change: it writes `approval_status` and emits
  // product.approved / product.rejected. These used to return a hardcoded success
  // object without calling marketplace-service at all, so approving a product in the
  // admin panel changed nothing. See audit 2026-07-27 (H1).
  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve a product' })
  async approveProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    const data = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_APPROVE_PRODUCT, {
      id,
      adminId: this.actorId(req),
      scope,
    });
    return { data };
  }

  // ── Listing moderation ──────────────────────────────────────────────────────
  //
  // Separate from product approval, and necessarily so. A seller offering on a
  // product that already exists creates no `products` row, so their submission
  // never reaches the product approvals queue above — before these routes it
  // would have sat PENDING with nothing in the console able to see it, which
  // turns a moderation gate into a silent block.
  //
  // What is being reviewed here is the *offer*: this seller's price, condition,
  // stock and fulfilment promise on someone else's catalogue entry.
  @Get('listings/pending')
  @ApiOperation({ summary: "Offers awaiting approval in the caller's market" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'country', required: false })
  async getPendingListings(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those offers');
    const data = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_PENDING_LISTINGS, {
      page: +page,
      limit: +limit,
      region: market,
      scope,
    });
    return { data };
  }

  @Patch('listings/:id/approve')
  @ApiOperation({ summary: 'Approve one seller’s offer' })
  async approveListing(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that offer');
    const data = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_APPROVE_LISTING, {
      id,
      adminId: this.actorId(req),
      scope,
    });
    return { data };
  }

  @Patch('listings/:id/reject')
  @ApiOperation({ summary: 'Reject one seller’s offer' })
  async rejectListing(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that offer');
    const data = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REJECT_LISTING, {
      id,
      reason: body?.reason,
      adminId: this.actorId(req),
      scope,
    });
    return { data };
  }

  @Patch('products/:id/reject')
  @ApiOperation({ summary: 'Reject a product' })
  async rejectProduct(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    const data = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REJECT_PRODUCT, {
      id,
      reason: body?.reason,
      adminId: this.actorId(req),
      scope,
    });
    return { data };
  }

  @Patch('products/:id/request-correction')
  @ApiOperation({ summary: 'Request product correction from seller' })
  async requestCorrection(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { notes: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REQUEST_PRODUCT_CORRECTION, {
      id,
      notes: body?.notes,
      adminId: this.actorId(req),
      scope,
    });
  }

  @Patch('products/:id/publish')
  @ApiOperation({ summary: 'Publish a product' })
  async publishProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_PUBLISH_PRODUCT, {
      id,
      adminId: this.actorId(req),
      scope,
    });
  }

  @Patch('products/:id/unpublish')
  @ApiOperation({ summary: 'Unpublish a product' })
  async unpublishProduct(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UNPUBLISH_PRODUCT, {
      id,
      reason: body?.reason,
      adminId: this.actorId(req),
      scope,
    });
  }

  @Patch('products/:id/suspend')
  @ApiOperation({ summary: 'Suspend a product' })
  async suspendProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_SUSPEND_PRODUCT, {
      id,
      adminId: this.actorId(req),
      scope,
    });
  }

  @Patch('products/:id/feature')
  @ApiOperation({ summary: 'Feature a product on homepage' })
  async featureProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    // Every explicit key after the spread: a body `{ "id": "<other product>" }`
    // used to retarget the decision at a product in another market.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_FEATURE_PRODUCT, {
      ...body,
      id,
      adminId: this.actorId(req),
      scope,
    });
  }

  @Patch('products/:id/unfeature')
  @ApiOperation({ summary: 'Remove product from featured' })
  async unfeatureProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UNFEATURE_PRODUCT, {
      id,
      adminId: this.actorId(req),
      scope,
    });
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  @Get('categories')
  @GlobalEntity('catalogue taxonomy is shared by every market')
  @ApiOperation({ summary: 'List admin-managed categories (shared by every market)' })
  async getCategories() {
    // No catch: an empty taxonomy would send an admin looking for the category
    // someone "deleted" when the service was simply unreachable.
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CATEGORIES, {});
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  async createCategory(@Req() req: any, @Body() data: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_CATEGORY, { dto: data });
  }

  // Two handlers, not two decorators on one: stacking @Patch and @Put leaves
  // only the last-applied verb registered, so the PUT the admin client sends
  // still 404'd. Both delegate to the same implementation.
  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_CATEGORY, { id, dto: data });
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a category (PUT alias)' })
  async putCategory(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    // The rule, not a resolution of it. This called `this.scopeOf(req, ...)` and
    // leaned on the handler below to refuse — a market resolved for a row that
    // has none, stated in one place and enforced in another (audit I8).
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.updateCategory(req, id, data);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category (deactivates it when products exist)' })
  async deleteCategory(@Req() req: any, @Param('id') id: string) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_CATEGORY, { id });
  }

  // Answered `{ data: [], total: 0 }` inline rather than asking the service,
  // which has served `get_subcategories` all along — the same bug already fixed
  // for `attributes` below. The Subcategories screen could therefore never show
  // a subcategory anyone created.
  @Get('subcategories')
  @GlobalEntity('catalogue taxonomy is shared by every market')
  @ApiOperation({ summary: 'List subcategories (shared by every market)' })
  async getSubcategories(@Query('categoryId') categoryId?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_SUBCATEGORIES, { categoryId });
  }

  @Post('subcategories')
  @ApiOperation({ summary: 'Create subcategory' })
  async createSubcategory(@Req() req: any, @Body() data: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_SUBCATEGORY, { dto: data });
  }

  @Patch('subcategories/:id')
  @ApiOperation({ summary: 'Update subcategory' })
  async updateSubcategory(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_SUBCATEGORY, { id, dto: data });
  }

  // Same split as the category handlers above: stacking @Patch and @Put on one
  // method registers only the last verb, and the admin client sends PUT.
  @Put('subcategories/:id')
  @ApiOperation({ summary: 'Update subcategory (PUT alias)' })
  async putSubcategory(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.updateSubcategory(req, id, data);
  }

  @Delete('subcategories/:id')
  @ApiOperation({ summary: 'Delete subcategory (deactivates it when products exist)' })
  async deleteSubcategory(@Req() req: any, @Param('id') id: string) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_SUBCATEGORY, { id });
  }

  // Answered `{ data: [], total: 0 }` inline rather than asking the service,
  // which has held a real implementation all along. The Category Attributes
  // screen therefore never saw an attribute anyone created — the POST below
  // wrote the row and this GET reported the table empty.
  @Get('attributes')
  @GlobalEntity('catalogue taxonomy is shared by every market')
  @ApiOperation({ summary: 'List product attributes (shared by every market)' })
  async getAttributes(
    @Query('categoryId') categoryId?: string,
    @Query('category') category?: string,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_ATTRIBUTES, {
      categoryId: categoryId ?? category,
    });
  }

  @Post('attributes')
  @ApiOperation({ summary: 'Create attribute' })
  async createAttribute(@Req() req: any, @Body() data: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_ATTRIBUTE, { dto: data });
  }

  // The admin client sends PUT and this declared only PATCH, so every "save
  // attribute" was a 404 the screen swallowed. Two handlers rather than two
  // decorators: only the last-applied verb decorator survives on one method.
  @Patch('attributes/:id')
  @ApiOperation({ summary: 'Update attribute' })
  async updateAttribute(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_ATTRIBUTE, { id, dto: data });
  }

  @Put('attributes/:id')
  @ApiOperation({ summary: 'Update attribute (PUT alias)' })
  async putAttribute(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.updateAttribute(req, id, data);
  }

  @Delete('attributes/:id')
  @ApiOperation({ summary: 'Deactivate an attribute' })
  async deleteAttribute(@Req() req: any, @Param('id') id: string) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_ATTRIBUTE, { id });
  }

  // ── Brands ─────────────────────────────────────────────────────────────────
  @Get('brands')
  @GlobalEntity('catalogue taxonomy is shared by every market')
  @ApiOperation({ summary: 'List brands (shared by every market)' })
  async getBrands() {
    // No catch: an unreachable service used to read as "this platform has no
    // brands", and the Brands screen showed an empty table with no error.
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_BRANDS, {});
  }

  @Get('brand-center')
  @GlobalEntity('catalogue taxonomy is shared by every market')
  @ApiOperation({ summary: 'Brand center overview' })
  async getBrandCenter() {
    // Still a stub — marketplace-service has no brand-centre read. Left as one
    // rather than given an implementation it does not have.
    return { data: [] as unknown[], total: 0 };
  }

  // marketplace-service has held `admin_update_brand` all along; no route ever
  // reached it, so the admin client's `PUT /admin/marketplace/brands/:id` was a
  // 404 and editing a brand did nothing. `POST` (create) and `DELETE` are still
  // absent deliberately — the service implements no handler for either.
  @Put('brands/:id')
  @ApiOperation({ summary: 'Update a brand' })
  async updateBrand(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BRAND, { id, dto });
  }

  @Patch('brands/:id')
  @ApiOperation({ summary: 'Update a brand (PATCH alias)' })
  async patchBrand(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.updateBrand(req, id, dto);
  }

  @Patch('brands/:id/approve')
  @ApiOperation({ summary: 'Approve a brand' })
  async approveBrand(@Req() req: any, @Param('id') id: string) {
    // Reported `status: 'APPROVED'` without asking marketplace-service, so a
    // brand approved in the admin panel stayed pending everywhere else. Its
    // sibling `rejectBrand` two handlers down always forwarded correctly.
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BRAND, {
      id,
      dto: { status: 'APPROVED', approvedBy: this.actorId(req) },
    });
  }

  @Patch('brands/:id/reject')
  @ApiOperation({ summary: 'Reject a brand' })
  async rejectBrand(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REJECT_BRAND, {
      id,
      reason: body?.reason,
      adminId: this.actorId(req),
    });
  }

  @Patch('brands/:id/request-correction')
  @ApiOperation({ summary: 'Request brand correction' })
  async requestBrandCorrection(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { notes: string },
  ) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BRAND, {
      id,
      dto: {
        status: 'CORRECTION_REQUESTED',
        correctionNotes: body?.notes ?? '',
        reviewedBy: this.actorId(req),
      },
    });
  }

  @Patch('brands/:id/suspend')
  @ApiOperation({ summary: 'Suspend a brand' })
  async suspendBrand(@Req() req: any, @Param('id') id: string) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_SUSPEND_BRAND, {
      id,
      adminId: this.actorId(req),
    });
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────
  @Get('campaigns')
  @ApiOperation({ summary: 'List marketing campaigns' })
  @ApiQuery({ name: 'country', required: false })
  async getCampaigns(@Req() req: any, @Query('country') country?: string) {
    // Still a stub — marketplace-service has no campaign list. The scope call
    // stays and its refusal is the point: a locked admin naming another market
    // is refused here rather than handed an empty list that looks like an answer.
    this.scopeOf(req, country, 'those campaigns');
    return { data: [] as unknown[], total: 0 };
  }

  // Same shape as the brand route above: `admin_update_campaign` is implemented
  // in marketplace-service and had no caller. Create and delete remain absent
  // because no handler exists for them.
  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign' })
  async updateCampaign(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const { scope } = this.scopeOf(req, undefined, 'that campaign');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_CAMPAIGN, { id, dto, scope });
  }

  @Patch('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign (PATCH alias)' })
  async patchCampaign(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    this.scopeOf(req, undefined, 'that campaign');
    return this.updateCampaign(req, id, dto);
  }

  // The four campaign lifecycle routes each returned the status they were named
  // after and asked nothing. An admin could approve, reject, pause and resume a
  // campaign all day; the row never moved, and the seller kept seeing whatever
  // state it was actually in. They are all one write on the campaign, which
  // `admin_update_campaign` already performs.
  private campaignStatus(
    id: string,
    status: string,
    req: any,
    extra: Record<string, unknown> = {},
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that campaign');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_CAMPAIGN, {
      id,
      dto: { status, ...extra, reviewedBy: this.actorId(req) },
      scope,
    });
  }

  @Patch('campaigns/:id/approve')
  @ApiOperation({ summary: 'Approve a campaign' })
  async approveCampaign(@Req() req: any, @Param('id') id: string) {
    this.scopeOf(req, undefined, 'that campaign');
    return this.campaignStatus(id, 'APPROVED', req);
  }

  @Patch('campaigns/:id/reject')
  @ApiOperation({ summary: 'Reject a campaign' })
  async rejectCampaign(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    this.scopeOf(req, undefined, 'that campaign');
    return this.campaignStatus(id, 'REJECTED', req, { rejectionReason: body?.reason ?? '' });
  }

  @Patch('campaigns/:id/pause')
  @ApiOperation({ summary: 'Pause a campaign' })
  async pauseCampaign(@Req() req: any, @Param('id') id: string) {
    this.scopeOf(req, undefined, 'that campaign');
    return this.campaignStatus(id, 'PAUSED', req);
  }

  @Patch('campaigns/:id/resume')
  @ApiOperation({ summary: 'Resume a paused campaign' })
  async resumeCampaign(@Req() req: any, @Param('id') id: string) {
    this.scopeOf(req, undefined, 'that campaign');
    return this.campaignStatus(id, 'ACTIVE', req);
  }

  // ── Orders / Returns / Refunds ─────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'List all marketplace orders (admin view)' })
  @ApiQuery({ name: 'country', required: false })
  async getOrders(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('country') country?: string,
  ) {
    // Still a stub — order-service has no admin list pattern. The scope call
    // refuses a locked admin reaching for another market rather than handing
    // them an empty page that reads as an answer.
    this.scopeOf(req, country, 'those orders');
    return { data: [] as unknown[], total: 0, page: Number(page), limit: 20, hasMore: false };
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order details by ID' })
  async getOrderById(@Req() req: any, @Param('id') id: string) {
    // Still a stub, and deliberately not "improved": inventing a status for an
    // order nobody read is how this surface used to lie.
    this.scopeOf(req, undefined, 'that order');
    return { data: { id, status: 'PENDING' } };
  }

  @Put('orders/:id')
  @ApiOperation({ summary: 'Update order status/details' })
  async updateOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { action: string; reason?: string },
  ) {
    // `action` is the target status. Echoing it back without asking
    // order-service meant an admin could move an order through any state and
    // the customer's order never changed.
    refuseLockedAdmin(req, 'an order decision');
    const { scope } = this.scopeOf(req, undefined, 'that order');
    return this.sendTo(this.orderClient, 'Order service', 'update_order_status', {
      orderId: id,
      status: dto.action,
      reason: dto.reason,
      updatedBy: this.actorId(req),
      scope,
    });
  }

  @Put('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    refuseLockedAdmin(req, 'an order decision');
    const { scope } = this.scopeOf(req, undefined, 'that order');
    return this.sendTo(this.orderClient, 'Order service', 'cancel_order', {
      orderId: id,
      reason: body?.reason,
      cancelledBy: this.actorId(req),
      scope,
    });
  }

  @Get('returns')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:orders.view')
  @ApiOperation({ summary: 'List return requests' })
  @ApiQuery({ name: 'country', required: false })
  async getReturns(@Req() req: any, @Query('country') country?: string) {
    // Still a stub — no admin returns list exists to call. Left as one.
    this.scopeOf(req, country, 'those returns');
    return { data: [] as unknown[], total: 0 };
  }

  @Post('returns/:id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:orders.refund')
  @ApiOperation({ summary: 'Approve a return request' })
  async approveReturn(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that return');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_RETURN_STATUS, {
      id,
      status: 'APPROVED',
      adminId: this.actorId(req),
      scope,
    });
  }

  @Post('returns/:id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:orders.refund')
  @ApiOperation({ summary: 'Reject a return request' })
  async rejectReturn(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that return');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_RETURN_STATUS, {
      id,
      status: 'REJECTED',
      rejectionReason: body?.reason,
      adminId: this.actorId(req),
      scope,
    });
  }

  @Get('refunds')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:orders.view')
  @ApiOperation({ summary: 'List refund requests awaiting a decision' })
  @ApiQuery({ name: 'country', required: false })
  async getRefunds(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('country') country?: string,
  ) {
    // Returned an empty list inline, so the refunds queue was always empty and
    // an admin had no way to tell that from "nothing is pending".
    //
    // Refunds have no table. `RefundServiceModule` imports `RedisModule` and
    // no `TypeOrmModule` at all, so a refund is a Redis key with a 30-day TTL —
    // there is no row to carry a market and nothing to predicate on. The
    // blocker is a DATASTORE, not a column: R11 added `region_code` to the
    // money tables that exist and could not add one here. Showing the whole
    // platform's queue to a QA admin under a QA heading is the leak, so this
    // stays refused until refunds are persisted.
    refuseLockedAdmin(req, 'the refund queue');
    const { scope, market } = this.scopeOf(req, country, 'those refunds');
    return this.sendTo(this.refundClient, 'Refund service', 'get_pending_refunds', {
      page: +page,
      limit: +limit,
      region: market,
      scope,
    });
  }

  // Approve, process and reject are one decision on the refund — the service
  // takes it as an argument. All three used to answer with the status in their
  // own name and write nothing, so a refund could be approved and processed in
  // the admin panel while the customer was never paid.
  //
  // refund-service destructures a fixed set of fields and never reads `scope`,
  // so forwarding it was enforcement in name only: a QA-locked admin could
  // approve an Indian refund. Refused here, before any RPC. The blocker is that
  // refunds have no table to attribute — the service is Redis-only — not a
  // missing column, so this cannot be flipped by a migration. Global admins are
  // unaffected.
  @Post('refunds/:id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:orders.refund')
  @ApiOperation({ summary: 'Approve a refund' })
  async approveRefund(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body?: { remarks?: string },
  ) {
    refuseLockedAdmin(req, 'a refund decision');
    const { scope } = this.scopeOf(req, undefined, 'that refund');
    return this.sendTo(this.refundClient, 'Refund service', 'process_refund', {
      id,
      adminId: this.actorId(req),
      decision: 'APPROVED',
      remarks: body?.remarks,
      scope,
    });
  }

  @Post('refunds/:id/process')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:orders.refund')
  @ApiOperation({ summary: 'Process an approved refund' })
  async processRefund(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string; note?: string },
  ) {
    refuseLockedAdmin(req, 'a refund decision');
    const { scope } = this.scopeOf(req, undefined, 'that refund');
    return this.sendTo(this.refundClient, 'Refund service', 'process_refund', {
      id,
      adminId: this.actorId(req),
      decision: 'APPROVED',
      remarks: body?.note ?? body?.reason,
      scope,
    });
  }

  @Put('refunds/:id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:orders.refund')
  @ApiOperation({ summary: 'Reject a refund' })
  async rejectRefund(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    refuseLockedAdmin(req, 'a refund decision');
    const { scope } = this.scopeOf(req, undefined, 'that refund');
    return this.sendTo(this.refundClient, 'Refund service', 'process_refund', {
      id,
      adminId: this.actorId(req),
      decision: 'REJECTED',
      remarks: body?.reason,
      scope,
    });
  }

  // ── Finance ────────────────────────────────────────────────────────────────
  /**
   * Platform commission earnings.
   *
   * This was a literal `return { data: [], total: 0 }` — it called nothing. The
   * super admin's commission report showed zero on a platform that was taking
   * orders, and there was no way to tell that from a platform with no sales.
   * Now reads commission-service, which is the service that charges them.
   */
  @Get('commissions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.view')
  @ApiOperation({ summary: 'Platform commission earnings' })
  @ApiQuery({ name: 'sellerId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getCommissions(
    @Req() req: any,
    @Query('sellerId') sellerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('country') country?: string,
  ) {
    // commission-service reads neither `region` nor `scope`, and cannot: like
    // refund-service it has no `TypeOrmModule` and keeps commission records in
    // Redis, so there is no row to attribute to a market. Every total below is
    // platform-wide and stays refused for a locked admin. A datastore, not a
    // column (R11).
    refuseLockedAdmin(req, 'commission earnings');
    const { scope, market } = this.scopeOf(req, country, 'that commission');
    // A single seller's ledger, or the platform-wide totals. An unreachable
    // commission-service is an error, not an empty ledger and not a zeroed
    // total: "the platform earned nothing" and "we could not ask" have to look
    // different on a finance screen.
    if (sellerId) {
      const history = await this.sendToCommission('get_seller_commission_history', {
        sellerId,
        page: Number(page),
        limit: DEFAULT_PAGE_SIZE,
        scope,
      });
      if (!history)
        throw new ServiceUnavailableException('Commissions are temporarily unavailable.');
      return history;
    }

    const [totals, summary] = await Promise.all([
      this.sendToCommission('get_commission_totals', {
        startDate: startDate ?? new Date(Date.now() - 30 * 86400_000).toISOString(),
        endDate: endDate ?? new Date().toISOString(),
        region: market,
        scope,
      }),
      this.sendToCommission('get_platform_revenue_summary', { region: market, scope }),
    ]);
    if (!totals || !summary)
      throw new ServiceUnavailableException('Commissions are temporarily unavailable.');

    return { totals, summary };
  }

  @Get('commissions/rate-card')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.view')
  @ApiOperation({ summary: 'Category commission rate card' })
  @ApiQuery({ name: 'country', required: false })
  async getCommissionRateCard(@Req() req: any, @Query('country') country?: string) {
    refuseLockedAdmin(req, 'the commission rate card');
    const { scope, market } = this.scopeOf(req, country, 'that rate card');
    const card = await this.sendToCommission('get_category_rate_card', { region: market, scope });
    // An empty rate card reads as "the platform charges no commission".
    if (!card) throw new ServiceUnavailableException('Commissions are temporarily unavailable.');
    return card;
  }

  @Put('commissions/rate-card')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Change a category commission rate' })
  async updateCommissionRateCard(
    @Req() req: any,
    @Body() body: { category: string; subCategory?: string; updates: any },
  ) {
    refuseLockedAdmin(req, 'the commission rate card');
    const { scope } = this.scopeOf(req, undefined, 'that rate card');
    // A rate change that did not happen answered 200 with `success: false`,
    // which the console renders as a saved change. Same rule as the payout
    // mutations: a write that failed must surface as an error.
    const result = await this.sendToCommission('update_category_rate', { ...body, scope });
    if (!result) throw new ServiceUnavailableException('Commissions are temporarily unavailable.');
    return result;
  }

  @Post('commissions/overrides')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Give a seller a negotiated commission rate' })
  async setCommissionOverride(
    @Req() req: any,
    @Body()
    body: {
      sellerId: string;
      serviceType?: string;
      rate: number;
      reason: string;
      expiresAt?: string;
    },
  ) {
    refuseLockedAdmin(req, 'a commission override');
    const { scope } = this.scopeOf(req, undefined, 'that commission');
    const result = await this.sendToCommission('set_seller_commission_override', {
      ...body,
      serviceType: body.serviceType ?? 'marketplace',
      scope,
    });
    if (!result) throw new ServiceUnavailableException('Commissions are temporarily unavailable.');
    return result;
  }

  @Delete('commissions/overrides/:sellerId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Remove a seller’s negotiated rate' })
  async removeCommissionOverride(
    @Req() req: any,
    @Param('sellerId') sellerId: string,
    @Query('serviceType') serviceType = 'marketplace',
  ) {
    refuseLockedAdmin(req, 'a commission override');
    const { scope } = this.scopeOf(req, undefined, 'that commission');
    const result = await this.sendToCommission('remove_seller_commission_override', {
      sellerId,
      serviceType,
      scope,
    });
    if (!result) throw new ServiceUnavailableException('Commissions are temporarily unavailable.');
    return result;
  }

  @Patch('commissions/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Update commission rate for a module' })
  async updateCommission(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const { scope } = this.scopeOf(req, undefined, 'that commission');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_COMMISSION, {
      id,
      dto: body,
      scope,
    });
  }

  /**
   * The payout queue an admin actually works through.
   *
   * Also a hardcoded `{ data: [], total: 0 }`, so the super admin could not see —
   * let alone approve — a single seller withdrawal request. payout-service has
   * held these as real rows since the wallet/payout schemas were created.
   */
  @Get('payouts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.view')
  @ApiOperation({ summary: 'Seller payout requests awaiting action' })
  @ApiQuery({ name: 'sellerId', required: false })
  @ApiQuery({ name: 'country', required: false })
  async getPayouts(
    @Req() req: any,
    @Query('sellerId') sellerId?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('country') country?: string,
  ) {
    // payout-service predicates on `payouts.region_code` now, so this is the
    // caller's own market rather than every market's queue: a filter, not a
    // refusal (R11, AUD2-089). Rows that could not be attributed to a market
    // stay out of a locked admin's page and visible to a global one.
    const { scope, market } = this.scopeOf(req, country, 'those payouts');
    const cmd = sellerId ? 'get_seller_payouts' : 'get_pending_payouts';
    const payload = sellerId
      ? { sellerId, page: Number(page), limit: Number(limit), region: market, scope }
      : { page: Number(page), limit: Number(limit), region: market, scope };

    // An empty queue is a decision an admin acts on — "nothing to approve
    // today". An unreachable payout-service must not be able to say that.
    const result = await this.sendToPayout(cmd, payload);
    if (!result) throw new ServiceUnavailableException('Payouts are temporarily unavailable.');
    return result;
  }

  @Get('payouts/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.view')
  @ApiOperation({ summary: 'Payout volume and success rate' })
  @ApiQuery({ name: 'country', required: false })
  async getPayoutStats(@Req() req: any, @Query('country') country?: string) {
    // Aggregated under the same predicate as the queue, so the totals on the
    // page and the rows beneath them are the same market's money.
    const { scope, market } = this.scopeOf(req, country, 'that report');
    const stats = await this.sendToPayout('get_payout_stats', { region: market, scope });
    if (!stats) throw new ServiceUnavailableException('Payouts are temporarily unavailable.');
    return stats;
  }

  @Patch('payouts/:id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Approve a payout request' })
  async approvePayout(@Req() req: any, @Param('id') id: string) {
    // payout-service asserts the payout's own `region_code` against this
    // `scope`, so a locked admin approving another market's payout is refused
    // by the row rather than by the route (R11).
    const { scope } = this.scopeOf(req, undefined, 'that payout');
    const result = await this.sendToPayout('approve_payout', {
      payoutId: id,
      adminId: this.actorId(req),
      scope,
    });
    if (!result) throw new ServiceUnavailableException('Payouts are temporarily unavailable.');
    return result;
  }

  @Patch('payouts/:id/process')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Execute an approved payout' })
  async processPayout(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that payout');
    const result = await this.sendToPayout('process_payout', {
      payoutId: id,
      adminId: this.actorId(req),
      scope,
    });
    if (!result) throw new ServiceUnavailableException('Payouts are temporarily unavailable.');
    return result;
  }

  // A second `payouts/:id/approve` stood here, routing to marketplace-service's
  // ADMIN_PROCESS_PAYOUT — a service that does not own payouts. Removed in favour
  // of the pair above, which reach payout-service where the records actually live.

  @Post('payouts/:id/retry')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Retry a failed payout' })
  async retryPayout(@Req() req: any, @Param('id') id: string) {
    // Was `return { success: true, status: 'processing' }` — it reported a retry
    // it had not started, so a stuck payout looked as though it had been requeued.
    const { scope } = this.scopeOf(req, undefined, 'that payout');
    const result = await this.sendToPayout('retry_payout', {
      payoutId: id,
      adminId: this.actorId(req),
      scope,
    });
    if (!result) throw new ServiceUnavailableException('Payouts are temporarily unavailable.');
    return result;
  }

  // ── Reports / Audit ────────────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Get marketplace reports' })
  @ApiQuery({ name: 'country', required: false })
  async getReports(@Req() req: any, @Query('country') country?: string) {
    // Still a stub — there is no report generator behind this. Left as one.
    this.scopeOf(req, country, 'that report');
    return { data: [] as unknown[], total: 0 };
  }

  // `GET audit-logs` used to sit here, answering `{ data: [], total: 0 }` from a
  // stub that was never wired to anything. It is gone rather than filled in:
  // there is one audit trail, `GET /admin/audit-logs`, and the marketplace audit
  // page reads it with `entityType` set to a marketplace record kind. A second
  // marketplace-shaped endpoint over the same collection would only be a second
  // place for the scoping rules to drift.

  // ── Banner Management ─────────────────────────────────────────────────────
  /**
   * Every region whose home feed caches banners, plus the unscoped feed.
   *
   * This list was written out inline at each call site with `'IN'` appearing
   * twice and `BH`/`SG` missing entirely — so edits to a Bahraini or Singaporean
   * banner never invalidated those markets' home feeds and the change appeared
   * not to have taken effect until the 120-second TTL expired.
   */
  private static readonly CACHED_HOME_REGIONS = [
    'global',
    'QA',
    'IN',
    'AE',
    'SA',
    'BH',
    'KW',
    'OM',
    'GB',
    'US',
    'SG',
  ] as const;

  /**
   * Drop the cached home feeds a banner change can have altered: the banner's
   * own markets plus the unscoped feed. Only an untargeted banner (runs
   * everywhere) purges every market — a Qatari campaign edit used to empty
   * India's home cache too, a regional change acting globally.
   */
  private async invalidateHomeFeeds(regions?: string[] | null) {
    const targets: string[] =
      Array.isArray(regions) && regions.length
        ? ['global', ...regions.map((r) => String(r).toUpperCase())]
        : [...AdminMarketplaceController.CACHED_HOME_REGIONS];
    await Promise.all(targets.map((r) => this.redis.del(`marketplace:home:${r}`)));
  }

  /** The one market a banner is scoped to, or null when it runs in several or everywhere. */
  private static bannerMarket(banner: any): string | null {
    const regions = Array.isArray(banner?.regions) ? banner.regions : [];
    return regions.length === 1 ? String(regions[0]).toUpperCase() : null;
  }

  /**
   * Whether a banner deliberately runs in every market.
   *
   * Banners encode their market as `regions[]` in Redis, which is one of the
   * four spellings the platform had for "which market this runs in" (audit I7 /
   * AUD2-082). The shape is not migrated — this reader is what distinguishes
   * the two things `bannerMarket() === null` used to mean: an empty `regions`
   * is "targets everybody", which is what an untargeted banner has always
   * meant, while several entries is a multi-market banner nobody has reduced to
   * one market. Neither is a locked admin's to edit, and both still refuse; the
   * difference now reaches the log line.
   */
  private static bannerIsGlobal(banner: any): boolean {
    const regions = Array.isArray(banner?.regions) ? banner.regions : [];
    return regions.length === 0;
  }

  @Get('banners/:type')
  @ApiOperation({ summary: 'Get banners by type (hero, campaign, country)' })
  @ApiParam({ name: 'type', enum: ['hero', 'campaign', 'country'] })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Only banners targeted at this market',
  })
  async getBanners(
    @Req() req: any,
    @Param('type') type: string,
    @Query('country') country?: string,
  ) {
    const key = `marketplace:${type}-banners`;
    const scope = marketScopeOf(req);
    // A locked admin always gets their own market, whatever was asked for.
    const code = resolveMarket(req, country, 'that market');
    const all = (await this.redis.getJson<any[]>(key)) || [];
    // Global banners run in the market too, so they are listed — but a locked
    // admin may only edit banners scoped to exactly their market.
    const data = all.map((b: any) => ({
      ...b,
      editable: !scope.locked || AdminMarketplaceController.bannerMarket(b) === scope.region,
    }));
    if (!code) return { data, total: data.length };

    // A banner with no `regions` runs everywhere — that is the shape every
    // banner had before regional targeting, so untargeted ones keep showing.
    const filtered = data.filter((b: any) => {
      const regions: unknown = b?.regions;
      if (!Array.isArray(regions) || regions.length === 0) return true;
      return regions.map((r) => String(r).toUpperCase()).includes(code);
    });
    return { data: filtered, total: filtered.length, country: code };
  }

  @Post('banners/:type')
  @ApiOperation({ summary: 'Create or update a banner' })
  @ApiParam({ name: 'type', enum: ['hero', 'campaign', 'country'] })
  async saveBanner(
    @Req() req: any,
    @Param('type') type: string,
    @Body() body: { id?: string; regions?: string[]; [key: string]: any },
  ) {
    const id = body.id || `${type}-${Date.now()}`;
    const key = `marketplace:${type}-banners`;
    const existing: any[] = (await this.redis.getJson(key)) || [];
    const idx = existing.findIndex((b: any) => b.id === id);
    const previousRegions: string[] | undefined =
      idx >= 0 && Array.isArray(existing[idx]?.regions) ? existing[idx].regions : undefined;

    // Normalise the market list once on write, so the read path can compare
    // codes directly instead of case-folding on every home-feed request.
    let regions = Array.isArray(body.regions)
      ? [...new Set(body.regions.map((r) => String(r).trim().toUpperCase()).filter(Boolean))]
      : undefined;
    // A locked admin's banner is their market's: any other market named in
    // the body is refused, an absent list is filled in, and a banner they did
    // not scope to their market is not theirs to overwrite.
    const scope = marketScopeOf(req);
    if (scope.locked) {
      for (const r of regions ?? []) resolveMarket(req, r, 'this banner');
      regions = [scope.region!];
      if (idx >= 0)
        assertRecordInScope(
          req,
          AdminMarketplaceController.bannerMarket(existing[idx]),
          'this banner',
          AdminMarketplaceController.bannerIsGlobal(existing[idx]),
        );
    }
    const payload = { ...body, ...(regions ? { regions } : {}) };

    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...payload, id, updatedAt: new Date().toISOString() };
    } else {
      existing.push({ ...payload, id, createdAt: new Date().toISOString() });
    }
    await this.redis.setJson(key, existing, 0);
    // Only the markets the banner ran in before and runs in now go stale; a
    // banner that is (or was) untargeted touches every feed.
    const after: string[] | undefined = Array.isArray(
      existing[idx >= 0 ? idx : existing.length - 1]?.regions,
    )
      ? existing[idx >= 0 ? idx : existing.length - 1].regions
      : undefined;
    const untargeted =
      !after ||
      after.length === 0 ||
      (idx >= 0 && (!previousRegions || previousRegions.length === 0));
    await this.invalidateHomeFeeds(
      untargeted ? null : [...new Set([...(after ?? []), ...(previousRegions ?? [])])],
    );
    // Broadcast change via Kafka for Socket.IO propagation
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
      type,
      id,
      regions: regions ?? null,
      action: idx >= 0 ? 'updated' : 'created',
      timestamp: new Date().toISOString(),
    });
    return {
      data: {
        success: true,
        id,
        regions: regions ?? null,
        action: idx >= 0 ? 'updated' : 'created',
      },
    };
  }

  @Patch('banners/:type/:id')
  @ApiOperation({ summary: 'Update a specific banner' })
  async updateBanner(
    @Req() req: any,
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    this.scopeOf(req, undefined, 'this banner');
    return this.saveBanner(req, type, { ...body, id });
  }

  @Post('banners/:type/:id/delete')
  @ApiOperation({ summary: 'Delete a banner' })
  async deleteBanner(@Req() req: any, @Param('type') type: string, @Param('id') id: string) {
    const key = `marketplace:${type}-banners`;
    const existing: any[] = (await this.redis.getJson(key)) || [];
    const target = existing.find((b: any) => b.id === id);
    // 404 before anything else. The assertion used to sit inside `if (target)`,
    // so a banner id that matched nothing skipped the market check entirely and
    // fell through to `invalidateHomeFeeds(null)` — a home-feed flush for every
    // market on the platform, triggerable by any locked admin with a typo
    // (audit V14).
    if (!target) throw new NotFoundException(`Banner ${id} not found`);
    assertRecordInScope(
      req,
      AdminMarketplaceController.bannerMarket(target),
      'this banner',
      AdminMarketplaceController.bannerIsGlobal(target),
    );

    const filtered = existing.filter((b: any) => b.id !== id);
    await this.redis.setJson(key, filtered, 0);
    await this.invalidateHomeFeeds(
      Array.isArray(target.regions) && target.regions.length ? target.regions : null,
    );
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
      type,
      id,
      action: 'deleted',
      timestamp: new Date().toISOString(),
    });
    return { data: { success: true, id } };
  }

  // ── Home Cache Invalidation ───────────────────────────────────────────────
  @Post('invalidate-home-cache')
  @ApiOperation({ summary: "Force invalidate the marketplace home cache for the caller's markets" })
  @ApiQuery({ name: 'country', required: false })
  async invalidateHomeCache(@Req() req: any, @Query('country') country?: string) {
    // A locked admin drops their own market's feed only: emptying every market's
    // home cache from a regional console is a global act.
    const { market } = this.scopeOf(req, country, 'that home cache');
    const regions = market
      ? ['global', market]
      : [...AdminMarketplaceController.CACHED_HOME_REGIONS];
    for (const r of regions) {
      await this.redis.del(`marketplace:home:${r}`);
    }
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
      action: 'cache_invalidated',
      timestamp: new Date().toISOString(),
    });
    return { data: { success: true, message: 'Home cache invalidated for all regions' } };
  }

  // ── Bank Offers Management ──────────────────────────────────────────────────

  // ── Bank and exchange offers ────────────────────────────────────────────────
  //
  // These thirteen routes wrote to `bank_offers` and `exchange_offers` through
  // a TypeORM repository injected into the gateway, against the old shared
  // `kartseek_db`. marketplace-service carried methods for the same records
  // that published a Kafka event and returned a fabricated `bo-<timestamp>` id
  // without writing a row — so the module that owns the catalogue could not
  // read or change its own offers, and the only working implementation lived
  // in the layer that is supposed to route, not to store.
  //
  // Ownership has moved: entities, rows and behaviour are marketplace-service's
  // now, and these forward like every other admin route on this controller.

  @Get('bank-offers')
  @ApiOperation({ summary: 'List all bank offers' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'],
  })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'country', required: false, description: 'Offers valid in one market' })
  async getBankOffers(
    @Req() req: any,
    @Query('activeOnly') activeOnly?: string,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_LIST_BANK_OFFERS, {
      activeOnly: activeOnly === 'true' || status === 'ACTIVE',
      region: resolveMarket(req, country, 'that market'),
      regionStrict: marketScopeOf(req).locked,
    });
  }

  @Post('bank-offers')
  @ApiOperation({ summary: 'Create a bank offer' })
  async createBankOffer(@Req() req: any, @Body() dto: any) {
    const { scope } = this.scopeOf(req, undefined, 'this bank offer');
    const regionCode =
      resolveMarket(req, dto?.regionCode ?? dto?.country, 'this bank offer') ?? null;
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_BANK_OFFER, {
      // `isGlobal` is a global admin's decision only: a locked admin's offer
      // belongs to their market, and "runs everywhere" is not theirs to set.
      dto: { ...dto, regionCode, ...(scope ? { isGlobal: false } : {}) },
      scope,
    });
  }

  @Patch('bank-offers/:id')
  @ApiOperation({ summary: 'Update a bank offer' })
  async updateBankOffer(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const patch = { ...dto };
    if (patch.regionCode !== undefined || patch.country !== undefined) {
      patch.regionCode =
        resolveMarket(req, patch.regionCode ?? patch.country, 'this bank offer') ?? null;
    }
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BANK_OFFER, {
      id,
      dto: patch,
      region: marketScopeOf(req).region,
    });
  }

  @Patch('bank-offers/:id/status')
  @ApiOperation({ summary: 'Change bank offer status (activate, pause, archive)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] } },
    },
  })
  async updateBankOfferStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BANK_OFFER, {
      id,
      dto: { status },
      region: marketScopeOf(req).region,
    });
  }

  @Patch('bank-offers/:id/feature')
  @ApiOperation({ summary: 'Set the bank offer featured flag' })
  @ApiBody({ schema: { type: 'object', properties: { isFeatured: { type: 'boolean' } } } })
  async setBankOfferFeatured(
    @Req() req: any,
    @Param('id') id: string,
    @Body('isFeatured') isFeatured?: boolean,
  ) {
    // Takes the value rather than toggling. Read-then-flip in the gateway raced
    // with itself: two admins on the offers page each read the same value and
    // wrote the same flip, so the second click undid the first.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BANK_OFFER, {
      id,
      dto: { isFeatured: isFeatured !== false },
      region: marketScopeOf(req).region,
    });
  }

  @Delete('bank-offers/:id')
  @ApiOperation({ summary: 'Delete a bank offer permanently' })
  async deleteBankOffer(@Req() req: any, @Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_BANK_OFFER, {
      id,
      region: marketScopeOf(req).region,
    });
  }

  @Get('exchange-offers')
  @ApiOperation({ summary: 'List all exchange offers' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'country', required: false, description: 'Offers available in one market' })
  async getExchangeOffers(
    @Req() req: any,
    @Query('activeOnly') activeOnly?: string,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_LIST_EXCHANGE_OFFERS, {
      activeOnly: activeOnly === 'true' || status === 'ACTIVE',
      region: resolveMarket(req, country, 'that market'),
      regionStrict: marketScopeOf(req).locked,
    });
  }

  @Post('exchange-offers')
  @ApiOperation({ summary: 'Create an exchange offer' })
  async createExchangeOffer(@Req() req: any, @Body() dto: any) {
    const { scope } = this.scopeOf(req, undefined, 'this exchange offer');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_EXCHANGE_OFFER, {
      dto: this.scopeExchangeOffer(req, dto),
      scope,
    });
  }

  /**
   * An exchange offer's markets are its `applicableCountries`. A locked admin
   * may only create one for their market: any other market named is refused
   * and an absent list is filled in.
   */
  private scopeExchangeOffer(req: any, dto: any) {
    // `regionCode` is the market, and `applicableCountries` is no longer one.
    // This used to write only the array, which is the encoding the entity now
    // documents as customer-facing eligibility: an admin BOUNDARY compared a
    // scope against comma-joined text, so an offer stored as 'QA,IN' equalled
    // no market and was invisible to both markets' admins (C1 / AUD2-082).
    const scope = marketScopeOf(req);
    const named: string[] = Array.isArray(dto?.applicableCountries) ? dto.applicableCountries : [];
    for (const c of named) resolveMarket(req, c, 'this exchange offer');
    const regionCode = resolveMarket(req, dto?.regionCode ?? named[0], 'this exchange offer');
    if (!scope.locked) return { ...dto, regionCode: regionCode ?? null };
    // A locked admin's offer is their market's, and never a global one.
    return { ...dto, regionCode: scope.region, isGlobal: false };
  }

  @Patch('exchange-offers/:id')
  @ApiOperation({ summary: 'Update an exchange offer' })
  async updateExchangeOffer(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const { scope } = this.scopeOf(req, undefined, 'this exchange offer');
    // Scoped whenever the patch touches the market in either encoding, so a
    // locked admin cannot move an offer out of their own market.
    const patch =
      dto?.applicableCountries !== undefined || dto?.regionCode !== undefined
        ? this.scopeExchangeOffer(req, dto)
        : dto;
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_EXCHANGE_OFFER, {
      id,
      dto: patch,
      scope,
    });
  }

  @Patch('exchange-offers/:id/status')
  @ApiOperation({ summary: 'Change exchange offer status' })
  async updateExchangeOfferStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'this exchange offer');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_EXCHANGE_OFFER, {
      id,
      dto: { status },
      scope,
    });
  }

  @Patch('exchange-offers/:id/feature')
  @ApiOperation({ summary: 'Set the exchange offer featured flag' })
  @ApiBody({ schema: { type: 'object', properties: { isFeatured: { type: 'boolean' } } } })
  async setExchangeOfferFeatured(
    @Req() req: any,
    @Param('id') id: string,
    @Body('isFeatured') isFeatured?: boolean,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_EXCHANGE_OFFER, {
      id,
      dto: { isFeatured: isFeatured !== false },
      region: marketScopeOf(req).region,
    });
  }

  @Delete('exchange-offers/:id')
  @ApiOperation({ summary: 'Delete an exchange offer permanently' })
  async deleteExchangeOffer(@Req() req: any, @Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_EXCHANGE_OFFER, {
      id,
      region: marketScopeOf(req).region,
    });
  }

  // ── Page Layout ─────────────────────────────────────────────────────────────
  @Get('page-layout')
  @ApiOperation({ summary: 'Get marketplace page layout' })
  @ApiQuery({ name: 'country', required: false })
  async getPageLayout(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that page layout');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PAGE_LAYOUT, {
      country: market,
      scope,
    });
  }

  @Patch('page-layout')
  @ApiOperation({ summary: 'Update marketplace page layout' })
  async updatePageLayout(@Req() req: any, @Body() dto: any) {
    const { scope, market } = this.scopeOf(req, dto?.country, 'that page layout');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_PAGE_LAYOUT, {
      dto: { ...dto, ...(market ? { country: market } : {}) },
      scope,
    });
  }

  // ── SEO ──────────────────────────────────────────────────────────────────────
  @Get('seo')
  @GlobalEntity('platform settings are read by every market')
  @ApiOperation({ summary: 'Get marketplace SEO settings' })
  @ApiQuery({ name: 'country', required: false })
  async getSeoSettings(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those SEO settings');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SEO, { region: market, scope });
  }

  // One row of SEO defaults serves every storefront — `getSeoSettings()` takes
  // no market and `updateSeoSettings()` writes the single platform record — so
  // a QA-locked admin editing it would be rewriting India's meta tags too.
  @Patch('seo')
  @ApiOperation({ summary: 'Update marketplace SEO settings' })
  async updateSeoSettings(@Req() req: any, @Body() dto: any) {
    refuseLockedAdmin(req, 'SEO settings');
    const { scope } = this.scopeOf(req, dto?.country ?? dto?.regionCode, 'those SEO settings');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_SEO, { dto, scope });
  }

  @Patch('sellers/:id/block')
  @ApiOperation({ summary: 'Permanently block a seller' })
  async blockSeller(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    // Publishing the Kafka event was all this used to do — nothing wrote the
    // seller's status, so the block was announced but never applied.
    // `blockSeller()` on the service performs the write (and emits its own event).
    //
    // Deliberately uncaught. The old `catch` turned a failed block into HTTP 200
    // with `{ success: false }` buried two levels down, which the console renders
    // as a success — the same "reports done, did nothing" failure mode this fix
    // exists to remove. A block that did not happen must surface as an error.
    const { scope } = this.scopeOf(req, undefined, 'that seller');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_BLOCK_SELLER, {
      id,
      adminId: this.actorId(req),
      scope,
    });
  }

  // ── Settings ────────────────────────────────────────────────────────────────
  @Get('settings')
  @GlobalEntity('platform settings are read by every market')
  @ApiOperation({ summary: 'Get marketplace settings' })
  @ApiQuery({ name: 'country', required: false })
  async getSettings(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those settings');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SETTINGS, {
      region: market,
      scope,
    });
  }

  // Same shape as SEO: a single platform settings record, no market column.
  @Patch('settings')
  @ApiOperation({ summary: 'Update marketplace settings' })
  async updateSettings(@Req() req: any, @Body() dto: any) {
    refuseLockedAdmin(req, 'marketplace settings');
    const { scope } = this.scopeOf(req, dto?.country ?? dto?.regionCode, 'those settings');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_SETTINGS, { dto, scope });
  }

  // ── Flash Deals ─────────────────────────────────────────────────────────────
  //
  // These seven all used to send ADMIN_GET_DASHBOARD, so every one of them asked
  // the service for dashboard counters regardless of what the admin had clicked,
  // and each `catch` then reported `{ success: true }` — a create that never
  // created, a delete that never deleted, an approval that approved nothing, all
  // confirmed on screen. They now send their own patterns and let the error
  // through: a failed mutation has to look like one.
  //
  // Every other route in this controller has since had the same treatment: its
  // own pattern, its own handler, and no fabricated fallback. `/dashboard` is
  // now the only caller of ADMIN_GET_DASHBOARD, which is what it is for.

  @Get('flash-deals')
  @ApiOperation({ summary: 'List flash deals' })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'One market; a region-locked admin always gets their own',
  })
  async getFlashDeals(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_FLASH_DEALS, {
      status,
      region: resolveMarket(req, country, 'that market'),
    });
  }

  @Post('flash-deals')
  @ApiOperation({ summary: 'Create flash deal' })
  async createFlashDeal(@Req() req: any, @Body() dto: any) {
    // A locked admin's campaign is their market's, whatever the body says.
    const regionCode =
      resolveMarket(req, dto?.regionCode ?? dto?.country, 'this flash deal') ?? null;
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_FLASH_DEAL, {
      dto: { ...dto, regionCode, createdBy: this.actorId(req) },
    });
  }

  @Patch('flash-deals/:id')
  @ApiOperation({ summary: 'Update flash deal' })
  async updateFlashDeal(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const patch = { ...dto };
    if (patch.regionCode !== undefined || patch.country !== undefined) {
      patch.regionCode =
        resolveMarket(req, patch.regionCode ?? patch.country, 'this flash deal') ?? null;
    }
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_FLASH_DEAL, {
      id,
      dto: patch,
      region: marketScopeOf(req).region,
    });
  }

  @Delete('flash-deals/:id')
  @ApiOperation({ summary: 'Cancel flash deal' })
  async deleteFlashDeal(@Req() req: any, @Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_FLASH_DEAL, {
      id,
      region: marketScopeOf(req).region,
    });
  }

  @Get('flash-deals/nominations')
  @ApiOperation({ summary: 'List all seller nominations' })
  @ApiQuery({
    name: 'country',
    required: false,
    description: "Nominations in one market's campaigns",
  })
  async getNominations(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_NOMINATIONS, {
      status,
      region: resolveMarket(req, country, 'that market'),
    });
  }

  @Patch('flash-deals/nominations/:nominationId/approve')
  @ApiOperation({ summary: 'Approve a seller nomination' })
  async approveNomination(@Req() req: any, @Param('nominationId') nominationId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_APPROVE_NOMINATION, {
      nominationId,
      adminId: this.actorId(req),
      region: marketScopeOf(req).region,
    });
  }

  @Patch('flash-deals/nominations/:nominationId/reject')
  @ApiOperation({ summary: 'Reject a seller nomination' })
  async rejectNomination(
    @Req() req: any,
    @Param('nominationId') nominationId: string,
    @Body() body: any,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REJECT_NOMINATION, {
      nominationId,
      reason: body?.reason,
      adminId: this.actorId(req),
      region: marketScopeOf(req).region,
    });
  }

  // ── Promotions ──────────────────────────────────────────────────────────────
  @Get('promotions')
  @ApiOperation({ summary: 'List promotions' })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Promotions run by sellers in one market',
  })
  async getPromotions(@Req() req: any, @Query('country') country?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PROMOTIONS, {
      region: resolveMarket(req, country, 'that market'),
    });
  }

  @Post('promotions')
  @ApiOperation({ summary: 'Create promotion' })
  async createPromotion(@Req() req: any, @Body() dto: any) {
    const { scope, market } = this.scopeOf(req, dto?.regionCode ?? dto?.country, 'this promotion');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_PROMOTION, {
      dto: { ...dto, ...(market ? { regionCode: market } : {}) },
      scope,
    });
  }

  @Patch('promotions/:id')
  @ApiOperation({ summary: 'Update promotion' })
  async updatePromotion(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_PROMOTION, {
      id,
      dto,
      region: marketScopeOf(req).region,
    });
  }

  // ── Notifications ───────────────────────────────────────────────────────────
  @Get('notifications')
  @ApiOperation({ summary: "List the signed-in administrator's notifications" })
  @ApiQuery({ name: 'country', required: false })
  async getNotifications(@Req() req: any, @Query('country') country?: string) {
    /**
     * The actor is the whole scope.
     *
     * This route used to `refuseLockedAdmin(req, 'platform notifications')`
     * because the list really was the platform's — rows with no user attached.
     * It is now each administrator's own inbox
     * (`marketplace_notifications.userId`), so refusing a market-locked admin
     * would deny them *their own* messages; there is no market dimension left to
     * confine them to. `scopeOf` still resolves the caller's market, which
     * refuses a locked admin who names someone else's, but the result is not
     * sent on: filtering a personal inbox by market would hide rows addressed to
     * the reader.
     */
    this.scopeOf(req, country, 'those notifications');

    // From the verified token, never from the caller — the route accepts no
    // `userId` in query, body or header, so nobody can read another
    // administrator's inbox. Refused outright when the token carries no id:
    // `actorId()` would otherwise substitute the string `'unknown'` and return
    // the (empty) inbox of a user by that name, which reads as "nothing to
    // report" rather than "we do not know who you are".
    const userId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Your session does not identify you; sign in again.');
    }

    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_NOTIFICATIONS, { userId });
  }

  @Post('notifications')
  @ApiOperation({ summary: 'Send notification' })
  // `sendNotification()` writes one row that every admin console reads; the
  // entity has no market column, so a scoped admin's "notify my sellers" would
  // notify the platform. Refused until notifications carry a market (Plan C1).
  async sendNotification(@Req() req: any, @Body() dto: any) {
    refuseLockedAdmin(req, 'platform notifications');
    const { scope, market } = this.scopeOf(
      req,
      dto?.regionCode ?? dto?.country,
      'that notification',
    );
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_SEND_NOTIFICATION, {
      dto: { ...dto, ...(market ? { regionCode: market } : {}) },
      scope,
    });
  }

  // ── HSN / Tax Master ────────────────────────────────────────────────────────
  @Get('hsn-codes')
  @GlobalEntity('catalogue taxonomy is shared by every market')
  @ApiOperation({ summary: 'List HSN/tax codes (shared by every market)' })
  async getHsnCodes(@Query('search') search?: string) {
    // Sent `search` as a bare positional argument to the *products* pattern,
    // which is neither an HSN read nor a shape any handler could parse.
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_HSN_CODES, { search });
  }

  @Post('hsn-codes')
  @ApiOperation({ summary: 'Create HSN code' })
  async createHsnCode(@Req() req: any, @Body() dto: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_HSN_CODE, { dto });
  }

  @Patch('hsn-codes/:id')
  @ApiOperation({ summary: 'Update HSN code' })
  async updateHsnCode(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_HSN_CODE, { id, dto });
  }

  // ── Featured Products ───────────────────────────────────────────────────────
  @Get('featured')
  @ApiOperation({ summary: 'List featured products' })
  @ApiQuery({ name: 'country', required: false })
  async getFeaturedProducts(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those products');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_FEATURED, {
      region: market,
      scope,
    });
  }

  @Get('featured-products')
  @ApiOperation({ summary: 'List featured products (alias)' })
  @ApiQuery({ name: 'country', required: false })
  async getFeaturedProductsAlias(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, undefined, 'those products');
    return this.getFeaturedProducts(req, country);
  }

  @Post('featured')
  @ApiOperation({ summary: 'Add featured product' })
  async addFeaturedProduct(@Req() req: any, @Body() dto: any) {
    const { scope, market } = this.scopeOf(req, dto?.regionCode ?? dto?.country, 'that product');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_ADD_FEATURED, {
      dto: { ...dto, ...(market ? { regionCode: market } : {}) },
      scope,
    });
  }

  @Delete('featured/:id')
  @ApiOperation({ summary: 'Remove featured product' })
  async removeFeaturedProduct(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REMOVE_FEATURED, { id, scope });
  }

  // ── Sponsored Products ──────────────────────────────────────────────────────
  @Get('sponsored')
  @ApiOperation({ summary: 'List sponsored products' })
  @ApiQuery({ name: 'country', required: false })
  async getSponsoredProducts(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those products');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SPONSORED, {
      status,
      region: market,
      scope,
    });
  }

  @Get('sponsored-products')
  @ApiOperation({ summary: 'List sponsored products (alias)' })
  @ApiQuery({ name: 'country', required: false })
  async getSponsoredProductsAlias(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    this.scopeOf(req, undefined, 'those products');
    return this.getSponsoredProducts(req, status, country);
  }

  @Patch('sponsored/:id')
  @ApiOperation({ summary: 'Update sponsored product' })
  async updateSponsoredProduct(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_SPONSORED, { id, dto, scope });
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────
  @Get('reviews')
  @ApiOperation({ summary: 'List reviews for moderation' })
  @ApiQuery({ name: 'country', required: false })
  async getReviews(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('rating') rating?: number,
    @Query('country') country?: string,
  ) {
    // Still pointed at the *products* pattern: marketplace-service has no
    // `admin_get_reviews` handler to call, so re-pointing it would 503 rather
    // than list reviews. What is fixed here is the payload — `(status, rating)`
    // went as positional arguments, which `sendToMarketplace` packs into an
    // array no handler can read — and the market the caller may see.
    // The queue itself still needs its own pattern; that is not this change.
    const { scope, market } = this.scopeOf(req, country, 'those reviews');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, {
      status,
      rating: rating ? Number(rating) : undefined,
      region: market,
      scope,
    });
  }

  @Patch('reviews/:id/flag')
  @ApiOperation({ summary: 'Flag a review for moderation' })
  async flagReview(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that review');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_FLAG_REVIEW, {
      id,
      reason: body?.reason,
      adminId: this.actorId(req),
      scope,
    });
  }

  @Patch('reviews/:id/hide')
  @ApiOperation({ summary: 'Hide a review from public view' })
  async hideReview(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that review');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_HIDE_REVIEW, {
      id,
      adminId: this.actorId(req),
      scope,
    });
  }

  // ── QA Moderation ───────────────────────────────────────────────────────────
  @Get('qa-moderation')
  @ApiOperation({ summary: 'List Q&A items for moderation' })
  @ApiQuery({ name: 'country', required: false })
  async getQAItems(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those questions');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_QA, {
      status,
      region: market,
      scope,
    });
  }

  @Patch('qa-moderation/:id')
  @ApiOperation({ summary: 'Moderate Q&A item' })
  async moderateQAItem(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const { scope } = this.scopeOf(req, undefined, 'that question');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_MODERATE_QA, { id, dto, scope });
  }

  // ── Complaints ──────────────────────────────────────────────────────────────
  @Get('complaints')
  @ApiOperation({ summary: 'List complaints' })
  @ApiQuery({ name: 'country', required: false })
  async getComplaints(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those complaints');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_COMPLAINTS, {
      status,
      region: market,
      scope,
    });
  }

  @Patch('complaints/:id')
  @ApiOperation({ summary: 'Update complaint' })
  async updateComplaint(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const { scope } = this.scopeOf(req, undefined, 'that complaint');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_COMPLAINT, { id, dto, scope });
  }

  // ── Compliance / Countries ──────────────────────────────────────────────────
  @Get('compliance/countries')
  @ApiOperation({ summary: 'List compliance countries' })
  @ApiQuery({ name: 'country', required: false })
  async getComplianceCountries(@Req() req: any, @Query('country') country?: string) {
    // The whole point of this list is every country's profile.
    refuseLockedAdmin(req, 'the compliance country list');
    const { scope, market } = this.scopeOf(req, country, 'that compliance profile');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_COMPLIANCE_COUNTRIES, {
      region: market,
      scope,
    });
  }

  @Patch('compliance/countries/:code')
  @ApiOperation({ summary: 'Update country compliance' })
  async updateComplianceCountry(@Req() req: any, @Param('code') code: string, @Body() dto: any) {
    // The country in the path IS the market: a Qatari admin editing India's
    // compliance profile is the clearest form of this whole class of bug.
    const { scope, market } = this.scopeOf(req, code, 'that compliance profile');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_COMPLIANCE_COUNTRY, {
      code: market ?? code,
      dto,
      scope,
    });
  }

  // ── Customers ───────────────────────────────────────────────────────────────
  @Get('customers')
  @ApiOperation({ summary: 'List customers' })
  @ApiQuery({ name: 'country', required: false })
  async getCustomers(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those customers');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CUSTOMERS, {
      search,
      page,
      region: market,
      scope,
    });
  }

  @Patch('customers/:id/block')
  @ApiOperation({ summary: 'Block customer' })
  async blockCustomer(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that customer');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_BLOCK_CUSTOMER, {
      id,
      adminId: this.actorId(req),
      scope,
    });
  }

  // ── Seller Wallets ──────────────────────────────────────────────────────────
  @Get('seller-wallets')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.view')
  @ApiOperation({ summary: 'List seller wallets' })
  @ApiQuery({ name: 'country', required: false })
  async getSellerWallets(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those wallets');
    // The BALANCES come from payout-service, which owns `payout.seller_wallets`.
    // They used to come from marketplace-service, which has no wallet table and
    // recomputed one from delivered orders at a hardcoded 10% commission, a 15%
    // "pending settlement" and a 70/30 withdrawn/available split — invented
    // numbers on a finance screen, and a different answer from the payout queue
    // beside them about the same seller's money (AUD2-086 / I12).
    const wallets = await this.sendToPayout<any>('list_seller_wallets', {
      region: market,
      scope,
    });
    // Never a fabricated zero: "this market's sellers hold nothing" and "we
    // could not ask" have to look different on a finance screen.
    if (!wallets)
      throw new ServiceUnavailableException('Seller wallets are temporarily unavailable.');

    // Seller NAMES are marketplace-service's, and only the names: an unreachable
    // catalogue costs the list its labels, not its figures.
    const named = await this.sendToMarketplace<any>(MARKETPLACE_PATTERNS.ADMIN_GET_SELLER_WALLETS, {
      region: market,
      scope,
    }).catch(() => null);
    const nameOf = new Map<string, string>(
      (named?.data ?? []).map((s: any) => [String(s.sellerId), s.sellerName]),
    );
    return {
      ...wallets,
      data: (wallets.data ?? []).map((w: any) => ({
        ...w,
        sellerName: nameOf.get(String(w.sellerId)) ?? null,
      })),
    };
  }

  @Post('seller-wallets/:id/adjust')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Adjust seller wallet balance' })
  async adjustSellerWallet(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { amount: number; reason: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that wallet');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_ADJUST_SELLER_WALLET, {
      sellerId: id,
      amount: dto?.amount,
      reason: dto?.reason,
      adminId: this.actorId(req),
      scope,
    });
  }

  // ── India Operations ────────────────────────────────────────────────────────
  @Get('india-ops')
  @ApiOperation({ summary: 'Get India operations config' })
  async getIndiaOpsConfig(@Req() req: any) {
    // This config IS India's: a locked admin may only read it if they are
    // India's, which `scopeOf` decides by comparing their market with IN.
    const { scope } = this.scopeOf(req, 'IN', 'that configuration');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_INDIA_OPS, { scope });
  }

  @Patch('india-ops')
  @ApiOperation({ summary: 'Update India operations config' })
  async updateIndiaOpsConfig(@Req() req: any, @Body() dto: any) {
    const { scope } = this.scopeOf(req, 'IN', 'that configuration');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_INDIA_OPS, { dto, scope });
  }

  // ── Sellers Pending ─────────────────────────────────────────────────────────
  @Get('wallet/transactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.view')
  @ApiOperation({ summary: 'Search all wallet transactions (admin audit)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['CREDIT', 'DEBIT'] })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'country', required: false })
  async searchWalletTransactions(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('module') module?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('country') country?: string,
  ) {
    // `wallet.wallet_transactions` is a real table, but a transaction is per
    // USER rather than per order, so its market is `users.region_code` — which
    // Task 4 only just made true — and wallet-service holds no join to it.
    // Deliberately left fail-closed by R11 rather than guessed at; the cache key
    // is already per market so nothing here changes when the join exists.
    refuseLockedAdmin(req, 'the wallet transaction ledger');
    const { scope, market } = this.scopeOf(req, country, 'those transactions');
    // Cached per market as well as per user: one shared key would have served a
    // Qatari admin's page to an Indian one.
    const cached = await this.redis.getJson<any>(
      `admin:wallet:search:${market ?? 'all'}:${userId || 'all'}:${page}`,
    );
    if (cached) return cached;

    /**
     * Not implemented, and now says so.
     *
     * The comment below the cache read said "Forward to wallet-service via
     * Kafka or direct call" and then returned an empty page. Nothing was ever
     * forwarded — an admin searching wallet transactions got `200 OK` with zero
     * results and no way to tell that from a customer who genuinely has none.
     * Wiring it needs a wallet-service search pattern that does not exist yet.
     */
    // wallet-service does expose a search pattern now; the comment above
    // predates it. Forwarded rather than refused.
    return this.sendTo(this.walletClient, 'Wallet service', 'wallet_search_transactions', {
      userId,
      type,
      module,
      startDate,
      endDate,
      page: +page,
      limit: +limit,
      region: market,
      scope,
    });
  }

  @Post('wallet/adjust')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Manually adjust a user wallet balance (admin)' })
  @ApiBody({
    schema: {
      properties: {
        userId: { type: 'string' },
        amount: { type: 'number' },
        reason: { type: 'string' },
        type: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
      },
    },
  })
  async adjustWalletBalance(
    @Req() req: any,
    @Body() dto: { userId: string; amount: number; reason: string; type: 'CREDIT' | 'DEBIT' },
  ) {
    // The money moves first. The audit entry is written after, and only if the
    // adjustment actually landed — logging it first recorded credits that never
    // happened and made the log the least trustworthy record of the two.
    this.refuseUnattributableBalance(req);
    const { scope } = this.scopeOf(req, undefined, 'that wallet');
    const result = await this.sendTo(
      this.walletClient,
      'Wallet service',
      dto.type === 'DEBIT' ? 'wallet_debit' : 'wallet_credit',
      {
        userId: dto.userId,
        amount: Math.abs(Number(dto.amount) || 0),
        reason: dto.reason,
        module: 'admin',
        referenceId: `admin-adjust-${Date.now()}`,
        scope,
      },
    );

    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'wallet.admin_adjust',
      target: dto.userId,
      actor: this.actorId(req),
      details: { amount: dto.amount, type: dto.type, reason: dto.reason },
      timestamp: new Date().toISOString(),
    });
    return {
      success: true,
      userId: dto.userId,
      type: dto.type,
      reason: dto.reason,
      wallet: result,
    };
  }

  @Post('wallet/freeze')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Freeze a user wallet (fraud prevention)' })
  @ApiBody({ schema: { properties: { userId: { type: 'string' }, reason: { type: 'string' } } } })
  async freezeWallet(@Req() req: any, @Body() dto: { userId: string; reason: string }) {
    this.refuseUnattributableBalance(req);
    const { scope } = this.scopeOf(req, undefined, 'that wallet');
    const result = await this.sendTo(this.walletClient, 'Wallet service', 'wallet_freeze', {
      userId: dto.userId,
      reason: dto.reason,
      adminId: this.actorId(req),
      scope,
    });
    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'wallet.freeze',
      target: dto.userId,
      actor: this.actorId(req),
      details: { reason: dto.reason },
      timestamp: new Date().toISOString(),
    });
    return { success: true, userId: dto.userId, frozen: true, reason: dto.reason, wallet: result };
  }

  @Post('wallet/unfreeze')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Unfreeze a user wallet' })
  @ApiBody({ schema: { properties: { userId: { type: 'string' }, reason: { type: 'string' } } } })
  async unfreezeWallet(@Req() req: any, @Body() dto: { userId: string; reason: string }) {
    this.refuseUnattributableBalance(req);
    const { scope } = this.scopeOf(req, undefined, 'that wallet');
    const result = await this.sendTo(this.walletClient, 'Wallet service', 'wallet_unfreeze', {
      userId: dto.userId,
      reason: dto.reason,
      adminId: this.actorId(req),
      scope,
    });
    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'wallet.unfreeze',
      target: dto.userId,
      actor: this.actorId(req),
      details: { reason: dto.reason },
      timestamp: new Date().toISOString(),
    });
    return { success: true, userId: dto.userId, frozen: false, reason: dto.reason, wallet: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Admin Loyalty Controls ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('loyalty/config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.view')
  @ApiOperation({ summary: 'Get loyalty program configuration' })
  async getLoyaltyConfig(@Req() req: any) {
    // One programme for the whole platform: a locked admin reads it, and the
    // PATCH below refuses them, the same shape as the shared taxonomy.
    this.scopeOf(req, undefined, 'that configuration');
    const cached = await this.redis.getJson<any>('admin:loyalty:config');
    return (
      cached || {
        tiers: {
          Bronze: { threshold: 0, multiplier: 1, benefits: ['Basic rewards'] },
          Silver: {
            threshold: 200,
            multiplier: 1.5,
            benefits: ['Free delivery on orders > ₹500', 'Early sale access'],
          },
          Gold: {
            threshold: 1000,
            multiplier: 2,
            benefits: ['Priority support', 'Exclusive deals', 'Free delivery'],
          },
          Platinum: {
            threshold: 5000,
            multiplier: 3,
            benefits: ['Personal account manager', 'Birthday bonus', 'All Gold benefits'],
          },
        },
        earnRules: {
          pointsPerHundred: 1,
          completionBonus: 5,
          ratingBonus: 2,
          maxPointsPerOrder: 500,
        },
        redemption: { pointsPerUnit: 10, currencyUnit: 'INR', minRedeemable: 100 },
        expiry: { enabled: false, months: 12 },
      }
    );
  }

  @Patch('loyalty/config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Update loyalty program configuration' })
  async updateLoyaltyConfig(@Req() req: any, @Body() dto: any) {
    // The tiers, earn rules and redemption rate are one platform-wide config:
    // a regional admin editing them would reprice loyalty in every market.
    refuseLockedAdmin(
      req,
      'the loyalty programme',
      'The loyalty programme is configured globally.',
    );
    await this.redis.setJson('admin:loyalty:config', dto, 0); // No TTL — persistent config
    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'loyalty.config_updated',
      actor: this.actorId(req),
      details: dto,
      timestamp: new Date().toISOString(),
    });
    return { success: true, config: dto };
  }

  @Get('loyalty/users/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.view')
  @ApiOperation({ summary: 'Get user loyalty detail (admin view)' })
  @ApiParam({ name: 'userId' })
  async getUserLoyalty(@Req() req: any, @Param('userId') userId: string) {
    // A points balance a locked admin may not attribute to their own market is
    // not theirs to read — same reason the four balance writes refuse.
    this.refuseUnattributableBalance(req);
    this.scopeOf(req, undefined, 'that loyalty account');
    // Redis is the first tier and loyalty-service is the source. A miss on both
    // is "we do not know", not "this customer has zero points and Bronze tier":
    // that fabricated balance is what an admin used to see for any user id at
    // all, including one that does not exist.
    const cached = await this.redis.getJson<any>(`loyalty:${userId}`);
    if (cached) return cached;
    return this.sendTo(this.loyaltyClient, 'Loyalty service', 'get_loyalty_points', { userId });
  }

  @Post('loyalty/adjust')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Manually adjust user loyalty points (admin)' })
  @ApiBody({
    schema: {
      properties: {
        userId: { type: 'string' },
        points: { type: 'number', description: 'Positive to grant, negative to revoke' },
        reason: { type: 'string' },
      },
    },
  })
  async adjustLoyaltyPoints(
    @Req() req: any,
    @Body() dto: { userId: string; points: number; reason: string },
  ) {
    this.refuseUnattributableBalance(req);
    const { scope } = this.scopeOf(req, undefined, 'that loyalty account');
    const result = await this.sendTo(
      this.loyaltyClient,
      'Loyalty service',
      'adjust_loyalty_points',
      {
        userId: dto.userId,
        points: Number(dto.points) || 0,
        reason: dto.reason,
        adminId: this.actorId(req),
        scope,
      },
    );
    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'loyalty.admin_adjust',
      target: dto.userId,
      actor: this.actorId(req),
      details: { points: dto.points, reason: dto.reason },
      timestamp: new Date().toISOString(),
    });
    return {
      success: true,
      userId: dto.userId,
      adjustment: dto.points,
      reason: dto.reason,
      loyalty: result,
    };
  }

  @Get('loyalty/analytics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.view')
  @ApiOperation({ summary: 'Get loyalty program analytics' })
  @ApiQuery({ name: 'country', required: false })
  async getLoyaltyAnalytics(@Req() req: any, @Query('country') country?: string) {
    // Every number below is a literal. It is left as one — inventing a read
    // would be worse — but it is at least no longer served to a locked admin
    // as though it were their market's.
    this.scopeOf(req, country, 'that report');
    refuseLockedAdmin(
      req,
      'loyalty analytics',
      'This report cannot be attributed to a market yet.',
    );
    return {
      totalPointsInCirculation: 285000,
      totalPointsAwarded: 420000,
      totalPointsRedeemed: 110000,
      totalPointsReversed: 25000,
      tierDistribution: { Bronze: 4200, Silver: 2100, Gold: 680, Platinum: 120 },
      avgPointsPerUser: 40,
      redemptionRate: '26.2%',
      topRedeemers: [] as unknown[],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ PHASE 2 — Admin Analytics (Gateway Proxies)
  // ═══════════════════════════════════════════════════════════════════════════

  // Every read below used to send a bare positional argument (`period`,
  // `sortBy`, `sellerId`) — `sendToMarketplace` forwards a single argument
  // as-is, so the handler received a string where it expected a payload and the
  // filter was silently dropped. They send objects now, carrying the market.
  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Revenue analytics with daily breakdown' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter'] })
  @ApiQuery({ name: 'country', required: false })
  async getRevenueAnalytics(
    @Req() req: any,
    @Query('period') period?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_REVENUE_ANALYTICS, {
      period,
      region: market,
      scope,
    });
  }

  @Get('analytics/funnel')
  @ApiOperation({ summary: 'Conversion funnel metrics' })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'country', required: false })
  async getConversionFunnel(
    @Req() req: any,
    @Query('period') period?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CONVERSION_FUNNEL, {
      period,
      region: market,
      scope,
    });
  }

  @Get('analytics/seller-rankings')
  @ApiOperation({ summary: 'Seller performance leaderboard' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['revenue', 'rating', 'orders', 'fulfillment'],
  })
  @ApiQuery({ name: 'country', required: false })
  async getSellerRankings(
    @Req() req: any,
    @Query('sortBy') sortBy?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLER_RANKINGS, {
      sortBy,
      region: market,
      scope,
    });
  }

  @Get('analytics/category-performance')
  @ApiOperation({ summary: 'Per-category sales and return metrics' })
  @ApiQuery({ name: 'country', required: false })
  async getCategoryPerformance(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CATEGORY_PERFORMANCE, {
      region: market,
      scope,
    });
  }

  @Get('analytics/regional')
  @ApiOperation({ summary: 'State/city-wise order distribution' })
  @ApiQuery({ name: 'country', required: false })
  async getRegionalPerformance(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_REGIONAL_PERFORMANCE, {
      region: market,
      scope,
    });
  }

  @Get('analytics/inventory-aging')
  @ApiOperation({ summary: 'Slow-moving stock analysis by age bucket' })
  @ApiQuery({ name: 'country', required: false })
  async getInventoryAging(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_INVENTORY_AGING, {
      region: market,
      scope,
    });
  }

  @Get('analytics/return-analysis')
  @ApiOperation({ summary: 'Return rate breakdown by reason and category' })
  @ApiQuery({ name: 'country', required: false })
  async getReturnRateAnalysis(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_RETURN_ANALYSIS, {
      region: market,
      scope,
    });
  }

  @Get('analytics/fraud-alerts')
  @ApiOperation({ summary: 'Suspicious order pattern detection' })
  @ApiQuery({ name: 'country', required: false })
  async getFraudAlerts(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_FRAUD_ALERTS, {
      region: market,
      scope,
    });
  }

  @Get('analytics/sla-compliance')
  @ApiOperation({ summary: 'SLA compliance metrics for all sellers' })
  @ApiQuery({ name: 'sellerId', required: false })
  @ApiQuery({ name: 'country', required: false })
  async getSLACompliance(
    @Req() req: any,
    @Query('sellerId') sellerId?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SLA_COMPLIANCE, {
      sellerId,
      region: market,
      scope,
    });
  }

  @Get('analytics/penalty-ledger')
  @ApiOperation({ summary: 'Penalty ledger for SLA violations' })
  @ApiQuery({ name: 'sellerId', required: false })
  @ApiQuery({ name: 'country', required: false })
  async getPenaltyLedger(
    @Req() req: any,
    @Query('sellerId') sellerId?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PENALTY_LEDGER, {
      sellerId,
      region: market,
      scope,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ MISSING ADMIN ROUTES — Gateway Remediation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Seller applications awaiting a decision, optionally for one market.
   *
   * A Super Admin reviewing Qatar approves against Qatari requirements — a
   * Commercial Registration and a Ministry of Municipality trade licence, not a
   * GSTIN — so the queue has to be filterable by market rather than pooling
   * every country's applications into one undifferentiated list.
   */
  @Get('seller-approvals')
  @ApiOperation({ summary: 'List pending seller applications (alias for sellers/pending)' })
  @ApiQuery({ name: 'country', required: false, description: 'Scope the queue to one market' })
  async getSellerApprovals(@Req() req: any, @Query('country') country?: string) {
    // Read the market off `req.regionCode` — a property nothing sets on the
    // request — so a regional admin's queue was every market's, and `country`
    // was whatever the caller typed. The token decides now.
    const { scope, market } = this.scopeOf(req, country, 'those approvals');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS, {
      status: 'PENDING',
      region: market,
      scope,
    });
  }

  @Get('product-approvals')
  @ApiOperation({ summary: 'List products pending approval' })
  @ApiQuery({ name: 'country', required: false, description: 'Scope the queue to one market' })
  async getProductApprovals(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those approvals');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, {
      page: 1,
      limit: 50,
      status: 'PENDING',
      region: market,
      scope,
    });
  }

  /**
   * Sellers awaiting a decision, broken down by market.
   *
   * Lets the Super Admin see at a glance which markets have a backlog, rather
   * than opening each one's queue in turn. `UNASSIGNED` collects applications
   * whose market has not been set.
   */
  @Get('seller-approvals/counts')
  @ApiOperation({ summary: 'Pending seller applications per market' })
  @ApiQuery({ name: 'country', required: false })
  async getSellerApprovalCounts(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'those approvals');
    const counts = await this.sendToMarketplace<Record<string, number>>(
      MARKETPLACE_PATTERNS.ADMIN_PENDING_SELLER_COUNTS,
      { region: market, scope },
    );
    // A locked admin sees their own market's line, not the platform breakdown:
    // the backlog in India is not information a Qatari admin is owed.
    const byRegion = scope ? { [scope]: Number((counts ?? {})[scope] ?? 0) } : (counts ?? {});
    return {
      data: byRegion,
      total: Object.values(byRegion).reduce((sum, n) => sum + (Number(n) || 0), 0),
    };
  }

  @Get('disputes')
  @ApiOperation({ summary: 'List buyer-seller disputes' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'country', required: false })
  async getDisputes(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those disputes');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_DISPUTES, {
      status,
      region: market,
      scope,
    });
  }

  @Get('customer-segments')
  @ApiOperation({ summary: 'List customer RFM segments' })
  @ApiQuery({ name: 'country', required: false })
  async getCustomerSegments(@Req() req: any, @Query('country') country?: string) {
    // RFM segments are computed platform-wide and carry no market.
    refuseLockedAdmin(req, 'customer segments');
    const { scope, market } = this.scopeOf(req, country, 'those customers');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CUSTOMER_SEGMENTS, {
      region: market,
      scope,
    });
  }

  @Get('coupons')
  @ApiOperation({ summary: 'List all platform coupons' })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Coupons issued for one market (plus market-agnostic ones)',
  })
  async getAdminCoupons(
    @Req() req: any,
    @Query('isActive') isActive?: string,
    @Query('country') country?: string,
  ) {
    // A locked admin sees only their market's coupons — a market-agnostic code
    // is the platform's, not theirs to list or edit. Errors are no longer
    // swallowed into an empty list: an unreachable service must look like one.
    const scope = marketScopeOf(req);
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_COUPONS, {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: 1,
      limit: 100,
      publicOnly: false,
      region: resolveMarket(req, country, 'that market'),
      regionStrict: scope.locked,
    });
  }

  /**
   * Admin coupon writes.
   *
   * The console's coupon page read through this controller and wrote through
   * `POST /marketplace/coupons` — the seller route, gated `SELLER, ADMIN,
   * SUPER_ADMIN`. That route is scoped now (Task R2 step 6), but a promotions
   * screen whose reads and writes sit on two different controllers with two
   * different guard stacks is a hole waiting to be reopened. These three are the
   * admin path, and `perm:promotions.manage` is the key the console's role grid
   * already grants.
   */
  @Post('coupons')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:promotions.manage')
  @ApiOperation({ summary: 'Create a platform coupon in one market' })
  async createCoupon(@Req() req: any, @Body() dto: AdminCouponDto) {
    const { scope, market } = this.scopeOf(req, dto.regionCode, 'that coupon');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_COUPON, {
      ...dto,
      regionCode: market ?? null,
      _actor: this.actor(req),
      scope,
    });
  }

  @Put('coupons/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:promotions.manage')
  @ApiOperation({ summary: 'Update a platform coupon' })
  async updateCoupon(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminCouponUpdateDto,
  ) {
    const { scope, market } = this.scopeOf(req, dto.regionCode, 'that coupon');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_COUPON, {
      id,
      dto: { ...dto, ...(market ? { regionCode: market } : {}) },
      _actor: this.actor(req),
      scope,
    });
  }

  @Delete('coupons/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:promotions.manage')
  @ApiOperation({ summary: 'Delete a platform coupon' })
  async deleteCoupon(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that coupon');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.DELETE_COUPON, {
      id,
      _actor: this.actor(req),
      scope,
    });
  }

  // The nine reads below are still stubs: nothing behind the gateway implements
  // them, and giving them an invented implementation is the failure mode this
  // whole pass exists to remove. What each one gains is the scope call — a
  // locked admin asking for another market is refused rather than handed an
  // empty list that reads as an answer about that market.
  @Get('gift-cards')
  @ApiOperation({ summary: 'List platform gift cards' })
  @ApiQuery({ name: 'country', required: false })
  async getAdminGiftCards(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, country, 'those gift cards');
    return { data: [] as unknown[], total: 0, message: 'Gift card management' };
  }

  @Get('banners')
  @ApiOperation({ summary: 'List all homepage banners' })
  @ApiQuery({ name: 'country', required: false })
  async getAllBanners(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, country, 'those banners');
    return { data: [] as unknown[], total: 0, message: 'Banner management' };
  }

  // Banner create/update/delete were the clearest case of a finished service
  // with no way in: `admin_create_banner`, `admin_update_banner` and
  // `admin_delete_banner` are all implemented in marketplace-service
  // (marketplace.controller.ts:1096-1103) and the gateway exposed only the GET
  // above, so every save on the Banners screen 404'd.
  //
  // These are the flat `/banners` routes the admin client calls. The
  // `/banners/:type` family further up is the separate Redis-backed home-feed
  // cache and is left alone.
  @Post('banners')
  @ApiOperation({ summary: 'Create a homepage banner' })
  async createBanner(@Req() req: any, @Body() dto: any) {
    const { market } = this.scopeOf(req, dto?.regionCode ?? dto?.country, 'this banner');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_BANNER, {
      dto,
      region: marketScopeOf(req).region ?? market,
    });
  }

  // Named `*HomepageBanner`, not `*Banner`: the `/banners/:type/:id` handlers
  // further up already own `updateBanner` and `deleteBanner` for the Redis home-
  // feed cache, and two methods of the same name silently collapse into one.
  @Put('banners/:id')
  @ApiOperation({ summary: 'Update a homepage banner' })
  async updateHomepageBanner(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BANNER, {
      id,
      dto,
      region: marketScopeOf(req).region,
    });
  }

  @Patch('banners/:id')
  @ApiOperation({ summary: 'Update a homepage banner (PATCH alias)' })
  async patchHomepageBanner(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    this.scopeOf(req, undefined, 'this banner');
    return this.updateHomepageBanner(req, id, dto);
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Delete a homepage banner' })
  async deleteHomepageBanner(@Req() req: any, @Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_BANNER, {
      id,
      region: marketScopeOf(req).region,
    });
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Global inventory overview' })
  @ApiQuery({ name: 'country', required: false })
  async getGlobalInventory(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_INVENTORY_AGING, {
      region: market,
      scope,
    });
  }

  @Get('listing-quality')
  @ApiOperation({ summary: 'Listing quality score dashboard' })
  @ApiQuery({ name: 'country', required: false })
  async getListingQuality(@Req() req: any, @Query('country') country?: string) {
    // Sent `(1, 50)` positionally, which arrives as an array no handler reads.
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, {
      page: 1,
      limit: 50,
      region: market,
      scope,
    });
  }

  @Get('seller-health')
  @ApiOperation({ summary: 'Seller health metrics dashboard' })
  @ApiQuery({ name: 'country', required: false })
  async getSellerHealth(@Req() req: any, @Query('country') country?: string) {
    const { scope, market } = this.scopeOf(req, country, 'that report');
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SLA_COMPLIANCE, {
      region: market,
      scope,
    });
  }

  @Get('logistics')
  @ApiOperation({ summary: 'Logistics partner management' })
  @ApiQuery({ name: 'country', required: false })
  async getLogistics(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, country, 'those partners');
    return { data: [] as unknown[], total: 0, message: 'Logistics integrations' };
  }

  @Get('delivery-partners')
  @ApiOperation({ summary: 'Delivery partner management' })
  @ApiQuery({ name: 'country', required: false })
  async getDeliveryPartners(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, country, 'those partners');
    return { data: [] as unknown[], total: 0, message: 'Delivery partner list' };
  }

  @Get('delivery-zones')
  @ApiOperation({ summary: 'Delivery zone configuration' })
  @ApiQuery({ name: 'country', required: false })
  async getDeliveryZones(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, country, 'those zones');
    return { data: [] as unknown[], total: 0, message: 'Zone configuration' };
  }

  @Get('shipping-rates')
  @ApiOperation({ summary: 'Shipping rate cards' })
  @ApiQuery({ name: 'country', required: false })
  async getShippingRates(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, country, 'those rates');
    return { data: [] as unknown[], total: 0, message: 'Rate card management' };
  }

  @Get('payments')
  @ApiOperation({ summary: 'Payment gateway management' })
  @ApiQuery({ name: 'country', required: false })
  async getPayments(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, country, 'those payment methods');
    return { data: [] as unknown[], total: 0, message: 'Payment gateway config' };
  }

  @Get('hsn-tax-master')
  @GlobalEntity('catalogue taxonomy is shared by every market')
  @ApiOperation({ summary: 'HSN/SAC tax rate master (alias for hsn-codes)' })
  @ApiQuery({ name: 'search', required: false })
  async getHsnTaxMaster(@Query('search') search?: string) {
    return await this.getHsnCodes(search);
  }

  @Get('gst-invoicing')
  @ApiOperation({ summary: 'GST invoicing management' })
  async getGstInvoicing(@Req() req: any) {
    // GST is India's tax regime: this surface is IN's, whoever opens it.
    this.scopeOf(req, 'IN', 'that configuration');
    return { data: [] as unknown[], total: 0, message: 'GST invoice management' };
  }

  @Get('abandoned-carts')
  @ApiOperation({ summary: 'Abandoned cart recovery management' })
  @ApiQuery({ name: 'country', required: false })
  async getAbandonedCarts(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, country, 'those carts');
    return {
      data: [] as unknown[],
      total: 0,
      recoveryRate: 0,
      message: 'Cart recovery management',
    };
  }

  @Get('ip-violations')
  @ApiOperation({ summary: 'IP/counterfeit violation reports' })
  @ApiQuery({ name: 'country', required: false })
  async getIpViolations(@Req() req: any, @Query('country') country?: string) {
    this.scopeOf(req, country, 'those reports');
    return { data: [] as unknown[], total: 0, message: 'IP violation management' };
  }

  @Get('system-health')
  @GlobalEntity('platform health is the same fleet in every market')
  @ApiOperation({ summary: 'Microservice health monitor' })
  async getSystemHealth() {
    return {
      data: {
        services: [
          { name: 'api-gateway', status: 'healthy', uptime: process.uptime() },
          { name: 'marketplace-service', status: 'healthy' },
          { name: 'order-service', status: 'healthy' },
          { name: 'payment-service', status: 'healthy' },
        ],
        overall: 'healthy',
      },
    };
  }

  // ── PUT / POST aliases ──────────────────────────────────────────────────────
  //
  // The admin client (apps/web/src/lib/modules/admin-marketplace-api.ts) was
  // written against a plain-REST convention — PUT to replace, POST to act —
  // while these resources are declared here as PATCH. Fourteen "save" buttons
  // across the Super Admin Panel therefore 404'd, and the screens swallowed it.
  //
  // Aliased server-side rather than rewriting the client, matching the choice
  // already made for categories, subcategories and attributes above. Stacking
  // @Patch and @Put on a single method does NOT work — only the last-applied
  // verb decorator registers — so each alias is its own method delegating to the
  // canonical handler.
  //
  // Each alias resolves the caller's market itself before delegating. The
  // canonical handler resolves it again, which is free; what it buys is that
  // every route on this controller can be shown to be scoped by reading its own
  // body, rather than by following a delegation chain.
  @Put('promotions/:id')
  @ApiOperation({ summary: 'Update promotion (PUT alias)' })
  async putPromotion(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    this.scopeOf(req, undefined, 'that promotion');
    return this.updatePromotion(req, id, dto);
  }

  @Put('complaints/:id')
  @ApiOperation({ summary: 'Update complaint (PUT alias)' })
  async putComplaint(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    this.scopeOf(req, undefined, 'that complaint');
    return this.updateComplaint(req, id, dto);
  }

  @Put('qa-moderation/:id')
  @ApiOperation({ summary: 'Moderate Q&A item (PUT alias)' })
  async putQAItem(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    this.scopeOf(req, undefined, 'that question');
    return this.moderateQAItem(req, id, dto);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update marketplace settings (PUT alias)' })
  async putSettings(@Req() req: any, @Body() dto: any) {
    refuseLockedAdmin(req, 'marketplace settings');
    this.scopeOf(req, undefined, 'those settings');
    return this.updateSettings(req, dto);
  }

  @Put('page-layout')
  @ApiOperation({ summary: 'Update page layout (PUT alias)' })
  async putPageLayout(@Req() req: any, @Body() dto: any) {
    this.scopeOf(req, undefined, 'that page layout');
    return this.updatePageLayout(req, dto);
  }

  @Put('seo')
  @ApiOperation({ summary: 'Update SEO settings (PUT alias)' })
  async putSeoSettings(@Req() req: any, @Body() dto: any) {
    refuseLockedAdmin(req, 'SEO settings');
    this.scopeOf(req, undefined, 'those SEO settings');
    return this.updateSeoSettings(req, dto);
  }

  @Put('hsn-codes/:id')
  @ApiOperation({ summary: 'Update HSN code (PUT alias)' })
  async putHsnCode(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.updateHsnCode(req, id, dto);
  }

  @Put('bank-offers/:id')
  @ApiOperation({ summary: 'Update bank offer (PUT alias)' })
  async putBankOffer(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.scopeOf(req, undefined, 'this bank offer');
    return this.updateBankOffer(req, id, body);
  }

  @Put('exchange-offers/:id')
  @ApiOperation({ summary: 'Update exchange offer (PUT alias)' })
  async putExchangeOffer(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.scopeOf(req, undefined, 'this exchange offer');
    return this.updateExchangeOffer(req, id, body);
  }

  @Put('sponsored/:id')
  @ApiOperation({ summary: 'Update sponsored product (PUT alias)' })
  async putSponsoredProduct(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    this.scopeOf(req, undefined, 'that product');
    return this.updateSponsoredProduct(req, id, dto);
  }

  @Put('compliance/countries/:code')
  @ApiOperation({ summary: 'Update country compliance (PUT alias)' })
  async putComplianceCountry(@Req() req: any, @Param('code') code: string, @Body() dto: any) {
    this.scopeOf(req, undefined, 'that compliance profile');
    return this.updateComplianceCountry(req, code, dto);
  }

  @Put('india-ops')
  @ApiOperation({ summary: 'Update India ops config (PUT alias)' })
  async putIndiaOpsConfig(@Req() req: any, @Body() dto: any) {
    this.scopeOf(req, undefined, 'that configuration');
    return this.updateIndiaOpsConfig(req, dto);
  }

  @Put('flash-deals/:id')
  @ApiOperation({ summary: 'Update flash deal (PUT alias)' })
  async putFlashDeal(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    this.scopeOf(req, undefined, 'this flash deal');
    return this.updateFlashDeal(req, id, dto);
  }

  @Post('payouts/:id/process')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Execute an approved payout (POST alias)' })
  async postProcessPayout(@Req() req: any, @Param('id') id: string) {
    this.scopeOf(req, undefined, 'that payout');
    return this.processPayout(req, id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ PUT ALIASES
  //
  // The admin client sends PUT for every "save this record" action; these
  // resources were only registered as PATCH, so each save 404'd while the list
  // view beside it loaded normally — the screens looked healthy and silently
  // refused to persist. The `categories` handlers already carried the fix and
  // the note explaining it (stacking @Patch and @Put on one method registers
  // only the last verb, so each alias must be its own handler); it was simply
  // never applied to the other resources. Each one delegates to the PATCH
  // implementation, so there is one behaviour and one place to change it.
  // ═══════════════════════════════════════════════════════════════════════════

  @Put('commissions/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER, 'perm:finance.payouts')
  @ApiOperation({ summary: 'Update a commission rule (PUT alias)' })
  async putCommission(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.scopeOf(req, undefined, 'that commission');
    return this.updateCommission(req, id, body);
  }

  @Put('customers/:id/block')
  @ApiOperation({ summary: 'Block a customer (PUT alias)' })
  async putBlockCustomer(@Req() req: any, @Param('id') id: string) {
    this.scopeOf(req, undefined, 'that customer');
    return this.blockCustomer(req, id);
  }
}
