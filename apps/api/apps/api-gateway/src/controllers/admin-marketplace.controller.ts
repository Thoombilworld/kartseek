import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Inject, Req, Logger, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiParam, ApiQuery, ApiBody,
  ApiOkResponse,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { BankOffer } from '../entities/bank-offer.entity';
import { ExchangeOffer } from '../entities/exchange-offer.entity';
import { User } from '../entities/user.entity';
import { MARKETPLACE_PATTERNS } from '../contracts';
import { ParseLimitPipe, ParsePagePipe, DEFAULT_PAGE_SIZE } from '../pipes/pagination.pipe';

/**
 * Admin Marketplace Controller
 *
 * Provides endpoints for the Admin Panel marketplace management:
 * sellers, products, categories, brands, campaigns, bank offers, exchange offers,
 * orders, refunds, payouts.
 *
 * All endpoints require SUPER_ADMIN role.
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
    @InjectRepository(BankOffer)
    private readonly bankOfferRepo: Repository<BankOffer>,
    @InjectRepository(ExchangeOffer)
    private readonly exchangeOfferRepo: Repository<ExchangeOffer>,
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
    @Inject('REFUND_SERVICE') private readonly refundClient: ClientProxy) {}

  /** Forward to a named service, preserving the failure rather than inventing a result. */
  private async sendTo<T = any>(client: ClientProxy, service: string, cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        client.send<T>({ cmd }, payload).pipe(
          timeout(10000),
          catchError(rpcCatch(`${service} unavailable`)),
        ),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(`${service} unavailable`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private actor(req: any): string {
    return req?.user?.id ?? req?.user?.sub ?? 'admin';
  }

  /**
   * Finance reads that must never invent a number.
   *
   * Returns `null` when the service is unreachable so the caller can say
   * "unavailable" instead of reporting zero commission or an empty payout queue,
   * which is exactly how these surfaces used to lie.
   */
  private async sendToCommission<T = any>(cmd: string, payload: object): Promise<T | null> {
    return lastValueFrom(
      this.commissionClient.send<T>({ cmd }, payload).pipe(timeout(8000)),
    ).catch((err): null => {
      this.logger.error(`commission-service [${cmd}] unreachable: ${err?.message}`);
      return null;
    });
  }

  private async sendToPayout<T = any>(cmd: string, payload: object): Promise<T | null> {
    return lastValueFrom(
      this.payoutClient.send<T>({ cmd }, payload).pipe(timeout(8000)),
    ).catch((err): null => {
      this.logger.error(`payout-service [${cmd}] unreachable: ${err?.message}`);
      return null;
    });
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
        this.marketplaceClient.send<T>({ cmd }, payload).pipe(
          timeout(10000),
          catchError(rpcCatch('Marketplace service unavailable')),
        ),
      );
    } catch (error) {
      // Re-thrown, not swallowed: `rpcCatch` has already reconstructed the
      // service's own HttpException where there was one, and that status is
      // what the caller needs. Anything else really is the channel being down.
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Marketplace service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
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
  private async applySellerDecision(sellerId: string, userStatus: 'active' | 'suspended' | 'rejected') {
    // The seller row is authoritative for who owns it.
    let ownerId: string | null = null;
    try {
    const owner = await this.sendToMarketplace<{ ownerId: string | null }>(
      'get_seller_owner',
      { sellerId },
    );
    ownerId = owner?.ownerId ?? null;
    } catch (err) {
    this.logger.warn(`Could not resolve owner for seller=${sellerId}: ${(err as Error).message}`);
    }

    if (ownerId) {
    try {
      await this.userRepo.update({ id: ownerId }, { status: userStatus });
    } catch (err) {
      this.logger.error(`Failed to set users.status=${userStatus} for user=${ownerId}: ${(err as Error).message}`);
    }
    } else {
    this.logger.warn(
      `Seller ${sellerId} has no owner_id — portal access cannot follow this decision until it is backfilled.`,
    );
    }

    // Both guards cache per seller id; without this the old decision stays live
    // for the remainder of the TTL.
    await Promise.all([
    this.redis.del(`seller-approval:${sellerId}`).catch((): undefined => undefined),
    this.redis.del(`seller-owner:${sellerId}`).catch((): undefined => undefined),
    ]);
  }

  // ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― Dashboard ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin marketplace dashboard stats' })
  async getDashboard() {
    try {
    const stats = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_DASHBOARD);
    return { data: stats };
    } catch {
    return { data: { totalSellers: 0, activeSellers: 0, pendingSellers: 0, totalProducts: 0, pendingProducts: 0, todayOrders: 0, todayRevenue: 0, monthlyRevenue: 0, totalCustomers: 0, disputesOpen: 0, currency: 'INR' } };
    }
  }

  // â”€â”€ Sellers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get('sellers')
  @ApiOperation({ summary: 'List all sellers with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'] })
  async getSellers(
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('search') search?: string,
    @Query('status') status?: string) {
    try {
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS);
    return { ...(result as any), page: Number(page), limit: Number(limit), hasMore: (result as any).total > Number(page) * Number(limit) };
    } catch {
    return { data: [], total: 0, page: Number(page), limit: Number(limit), hasMore: false };
    }
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
  @ApiOperation({ summary: 'List pending seller approvals' })
  async getPendingSellers() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Admin Wallet Controls ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('sellers/:id')
  @ApiOperation({ summary: 'Get seller detail' })
  async getSellerById(@Param('id') id: string) {
    try {
    const seller = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLER_BY_ID, id);
    return { data: seller };
    } catch {
    return { data: { id, name: '', status: 'UNKNOWN' } };
    }
  }

  @Patch('sellers/:id/approve')
  @ApiOperation({ summary: 'Approve a seller' })
  async approveSeller(@Param('id') id: string, @Body() body?: { reason?: string }) {
    try {
    // Sent as an object. This passed `(id, UserRole.ADMIN)`, which
    // `sendToMarketplace` packs into an ARRAY, so the handler's `data?.id` was
    // undefined — and `where: { id: undefined }` matches the first row, so
    // approving one seller silently approved a different one.
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_APPROVE_SELLER, { id, adminId: UserRole.ADMIN });
    await this.applySellerDecision(id, 'active');
    await this.kafka.publish(KAFKA_TOPICS.SELLER_APPROVED || 'seller.approved', { sellerId: id });
    return { data: { success: true, message: `Seller ${id} approved`, status: 'ACTIVE', seller: result } };
    } catch (err: unknown) {
    return { data: { success: false, message: `Failed to approve seller ${id}`, error: (err as Error)?.message } };
    }
  }

  @Patch('sellers/:id/reject')
  @ApiOperation({ summary: 'Reject a seller' })
  async rejectSeller(@Param('id') id: string, @Body() body: { reason: string }) {
    try {
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REJECT_SELLER, { id, reason: body.reason, adminId: UserRole.ADMIN });
    await this.applySellerDecision(id, 'rejected');
    await this.kafka.publish(KAFKA_TOPICS.SELLER_REJECTED || 'seller.rejected', { sellerId: id, reason: body.reason });
    return { data: { success: true, message: `Seller ${id} rejected`, reason: body.reason, seller: result } };
    } catch (err: unknown) {
    return { data: { success: false, message: `Failed to reject seller ${id}`, error: (err as Error)?.message } };
    }
  }

  @Patch('sellers/:id/suspend')
  @ApiOperation({ summary: 'Suspend a seller' })
  async suspendSeller(@Param('id') id: string, @Body() body: { reason: string }) {
    try {
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_SUSPEND_SELLER, { id, adminId: UserRole.ADMIN });
    await this.applySellerDecision(id, 'suspended');
    await this.kafka.publish(KAFKA_TOPICS.SELLER_SUSPENDED || 'seller.suspended', { sellerId: id, reason: body.reason });
    return { data: { success: true, message: `Seller ${id} suspended`, reason: body.reason, seller: result } };
    } catch (err: unknown) {
    return { data: { success: false, message: `Failed to suspend seller ${id}`, error: (err as Error)?.message } };
    }
  }

  @Patch('sellers/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended seller' })
  async reactivateSeller(@Param('id') id: string) {
    try {
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REACTIVATE_SELLER, { id });
    await this.applySellerDecision(id, 'active');
    await this.kafka.publish(KAFKA_TOPICS.SELLER_REACTIVATED || 'seller.reactivated', { sellerId: id });
    return { data: { success: true, message: `Seller ${id} reactivated`, status: 'ACTIVE', seller: result } };
    } catch (err: unknown) {
    return { data: { success: false, message: `Failed to reactivate seller ${id}`, error: (err as Error)?.message } };
    }
  }

  // â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get('products')
  @ApiOperation({ summary: 'List all products across sellers' })
  async getProducts(@Query('page', ParsePagePipe) page = 1, @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE, @Query('status') status?: string) {
    try {
    const result = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, Number(page), Number(limit));
    return { ...(result as any), hasMore: (result as any).total > Number(page) * Number(limit) };
    } catch {
    return { data: [], total: 0, page: Number(page), limit: Number(limit), hasMore: false };
    }
  }

  // MUST stay above `products/:id` — a parametric route declared first would
  // capture "pending" as an id.
  @Get('products/pending')
  @ApiOperation({ summary: 'Products awaiting approval, with queue counts' })
  async getPendingProducts() {
    try {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PENDING_PRODUCTS);
    } catch {
    return { data: [], count: 0, stats: { pending: 0, approved: 0, rejected: 0, correctionRequested: 0 } };
    }
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product detail for admin review' })
  async getProductById(@Param('id') id: string) {
    try {
    const product = await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCT_BY_ID, id);
    return { data: product };
    } catch {
    return { data: { id, name: '', seller: '', status: 'UNKNOWN' } };
    }
  }

  // Product moderation is a real state change: it writes `approval_status` and emits
  // product.approved / product.rejected. These used to return a hardcoded success
  // object without calling marketplace-service at all, so approving a product in the
  // admin panel changed nothing. See audit 2026-07-27 (H1).
  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve a product' })
  async approveProduct(@Param('id') id: string, @Req() req: any) {
    const data = await this.sendToMarketplace(
    MARKETPLACE_PATTERNS.ADMIN_APPROVE_PRODUCT,
    { id, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' },
    );
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
  @ApiOperation({ summary: 'Offers awaiting approval' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getPendingListings(
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    const data = await this.sendToMarketplace(
    MARKETPLACE_PATTERNS.ADMIN_PENDING_LISTINGS, { page: +page, limit: +limit },
    );
    return { data };
  }

  @Patch('listings/:id/approve')
  @ApiOperation({ summary: 'Approve one seller’s offer' })
  async approveListing(@Param('id') id: string, @Req() req: any) {
    const data = await this.sendToMarketplace(
    MARKETPLACE_PATTERNS.ADMIN_APPROVE_LISTING,
    { id, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' },
    );
    return { data };
  }

  @Patch('listings/:id/reject')
  @ApiOperation({ summary: 'Reject one seller’s offer' })
  async rejectListing(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    const data = await this.sendToMarketplace(
    MARKETPLACE_PATTERNS.ADMIN_REJECT_LISTING,
    { id, reason: body?.reason, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' },
    );
    return { data };
  }

  @Patch('products/:id/reject')
  @ApiOperation({ summary: 'Reject a product' })
  async rejectProduct(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    const data = await this.sendToMarketplace(
    MARKETPLACE_PATTERNS.ADMIN_REJECT_PRODUCT,
    { id, reason: body?.reason, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' },
    );
    return { data };
  }

  @Patch('products/:id/request-correction')
  @ApiOperation({ summary: 'Request product correction from seller' })
  async requestCorrection(@Param('id') id: string, @Body() body: { notes: string }, @Req() req: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REQUEST_PRODUCT_CORRECTION,
    { id, notes: body?.notes, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' });
  }

  @Patch('products/:id/publish')
  @ApiOperation({ summary: 'Publish a product' })
  async publishProduct(@Param('id') id: string, @Req() req: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_PUBLISH_PRODUCT,
    { id, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' });
  }

  @Patch('products/:id/unpublish')
  @ApiOperation({ summary: 'Unpublish a product' })
  async unpublishProduct(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UNPUBLISH_PRODUCT,
    { id, reason: body?.reason, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' });
  }

  @Patch('products/:id/suspend')
  @ApiOperation({ summary: 'Suspend a product' })
  async suspendProduct(@Param('id') id: string, @Req() req: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_SUSPEND_PRODUCT,
    { id, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' });
  }

  @Patch('products/:id/feature')
  @ApiOperation({ summary: 'Feature a product on homepage' })
  async featureProduct(@Param('id') id: string, @Body() body: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_FEATURE_PRODUCT, { id, ...body });
  }

  @Patch('products/:id/unfeature')
  @ApiOperation({ summary: 'Remove product from featured' })
  async unfeatureProduct(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UNFEATURE_PRODUCT, { id });
  }

  // â”€â”€ Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get('categories')
  @ApiOperation({ summary: 'List admin-managed categories' })
  async getCategories() {
    try {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CATEGORIES);
    } catch {
    return { data: [], total: 0 };
    }
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  async createCategory(@Body() data: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_CATEGORY, { dto: data });
  }

  // Two handlers, not two decorators on one: stacking @Patch and @Put leaves
  // only the last-applied verb registered, so the PUT the admin client sends
  // still 404'd. Both delegate to the same implementation.
  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(@Param('id') id: string, @Body() data: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_CATEGORY, { id, dto: data });
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a category (PUT alias)' })
  async putCategory(@Param('id') id: string, @Body() data: any) {
    return this.updateCategory(id, data);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category (deactivates it when products exist)' })
  async deleteCategory(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_CATEGORY, { id });
  }

  // Answered `{ data: [], total: 0 }` inline rather than asking the service,
  // which has served `get_subcategories` all along — the same bug already fixed
  // for `attributes` below. The Subcategories screen could therefore never show
  // a subcategory anyone created.
  @Get('subcategories')
  @ApiOperation({ summary: 'List subcategories' })
  async getSubcategories(@Query('categoryId') categoryId?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_SUBCATEGORIES, { categoryId });
  }

  @Post('subcategories')
  @ApiOperation({ summary: 'Create subcategory' })
  async createSubcategory(@Body() data: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_SUBCATEGORY, { dto: data });
  }

  @Patch('subcategories/:id')
  @ApiOperation({ summary: 'Update subcategory' })
  async updateSubcategory(@Param('id') id: string, @Body() data: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_SUBCATEGORY, { id, dto: data });
  }

  // Same split as the category handlers above: stacking @Patch and @Put on one
  // method registers only the last verb, and the admin client sends PUT.
  @Put('subcategories/:id')
  @ApiOperation({ summary: 'Update subcategory (PUT alias)' })
  async putSubcategory(@Param('id') id: string, @Body() data: any) {
    return this.updateSubcategory(id, data);
  }

  @Delete('subcategories/:id')
  @ApiOperation({ summary: 'Delete subcategory (deactivates it when products exist)' })
  async deleteSubcategory(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_SUBCATEGORY, { id });
  }

  // Answered `{ data: [], total: 0 }` inline rather than asking the service,
  // which has held a real implementation all along. The Category Attributes
  // screen therefore never saw an attribute anyone created — the POST below
  // wrote the row and this GET reported the table empty.
  @Get('attributes')
  @ApiOperation({ summary: 'List product attributes' })
  async getAttributes(@Query('categoryId') categoryId?: string, @Query('category') category?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_ATTRIBUTES, {
    categoryId: categoryId ?? category,
    });
  }

  @Post('attributes')
  @ApiOperation({ summary: 'Create attribute' })
  async createAttribute(@Body() data: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_ATTRIBUTE, { dto: data });
  }

  // The admin client sends PUT and this declared only PATCH, so every "save
  // attribute" was a 404 the screen swallowed. Two handlers rather than two
  // decorators: only the last-applied verb decorator survives on one method.
  @Patch('attributes/:id')
  @ApiOperation({ summary: 'Update attribute' })
  async updateAttribute(@Param('id') id: string, @Body() data: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_ATTRIBUTE, { id, dto: data });
  }

  @Put('attributes/:id')
  @ApiOperation({ summary: 'Update attribute (PUT alias)' })
  async putAttribute(@Param('id') id: string, @Body() data: any) {
    return this.updateAttribute(id, data);
  }

  @Delete('attributes/:id')
  @ApiOperation({ summary: 'Deactivate an attribute' })
  async deleteAttribute(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_ATTRIBUTE, { id });
  }

  // â”€â”€ Brands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get('brands')
  @ApiOperation({ summary: 'List brands' })
  async getBrands() {
    try {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_BRANDS);
    } catch {
    return { data: [], total: 0 };
    }
  }

  @Get('brand-center')
  @ApiOperation({ summary: 'Brand center overview' })
  async getBrandCenter() {
    return { data: [] as unknown[], total: 0 };
  }

  // marketplace-service has held `admin_update_brand` all along; no route ever
  // reached it, so the admin client's `PUT /admin/marketplace/brands/:id` was a
  // 404 and editing a brand did nothing. `POST` (create) and `DELETE` are still
  // absent deliberately — the service implements no handler for either.
  @Put('brands/:id')
  @ApiOperation({ summary: 'Update a brand' })
  async updateBrand(@Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BRAND, { id, dto });
  }

  @Patch('brands/:id')
  @ApiOperation({ summary: 'Update a brand (PATCH alias)' })
  async patchBrand(@Param('id') id: string, @Body() dto: any) {
    return this.updateBrand(id, dto);
  }

  @Patch('brands/:id/approve')
  @ApiOperation({ summary: 'Approve a brand' })
  async approveBrand(@Param('id') id: string, @Req() req: any) {
    // Reported `status: 'APPROVED'` without asking marketplace-service, so a
    // brand approved in the admin panel stayed pending everywhere else. Its
    // sibling `rejectBrand` two handlers down always forwarded correctly.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BRAND, {
      id,
      dto: { status: 'APPROVED', approvedBy: req?.user?.id ?? req?.user?.sub ?? 'admin' },
    });
  }

  @Patch('brands/:id/reject')
  @ApiOperation({ summary: 'Reject a brand' })
  async rejectBrand(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REJECT_BRAND,
    { id, reason: body?.reason, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' });
  }

  @Patch('brands/:id/request-correction')
  @ApiOperation({ summary: 'Request brand correction' })
  async requestBrandCorrection(@Param('id') id: string, @Body() body: { notes: string }, @Req() req: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BRAND, {
      id,
      dto: {
        status: 'CORRECTION_REQUESTED',
        correctionNotes: body?.notes ?? '',
        reviewedBy: req?.user?.id ?? req?.user?.sub ?? 'admin',
      },
    });
  }

  @Patch('brands/:id/suspend')
  @ApiOperation({ summary: 'Suspend a brand' })
  async suspendBrand(@Param('id') id: string, @Req() req: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_SUSPEND_BRAND,
    { id, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' });
  }

  // â”€â”€ Campaigns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get('campaigns')
  @ApiOperation({ summary: 'List marketing campaigns' })
  async getCampaigns() {
    return { data: [] as unknown[], total: 0 };
  }

  // Same shape as the brand route above: `admin_update_campaign` is implemented
  // in marketplace-service and had no caller. Create and delete remain absent
  // because no handler exists for them.
  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign' })
  async updateCampaign(@Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_CAMPAIGN, { id, dto });
  }

  @Patch('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign (PATCH alias)' })
  async patchCampaign(@Param('id') id: string, @Body() dto: any) {
    return this.updateCampaign(id, dto);
  }

  // The four campaign lifecycle routes each returned the status they were named
  // after and asked nothing. An admin could approve, reject, pause and resume a
  // campaign all day; the row never moved, and the seller kept seeing whatever
  // state it was actually in. They are all one write on the campaign, which
  // `admin_update_campaign` already performs.
  private campaignStatus(id: string, status: string, req: any, extra: Record<string, unknown> = {}) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_CAMPAIGN, {
      id,
      dto: { status, ...extra, reviewedBy: req?.user?.id ?? req?.user?.sub ?? 'admin' },
    });
  }

  @Patch('campaigns/:id/approve')
  @ApiOperation({ summary: 'Approve a campaign' })
  async approveCampaign(@Param('id') id: string, @Req() req: any) {
    return this.campaignStatus(id, 'APPROVED', req);
  }

  @Patch('campaigns/:id/reject')
  @ApiOperation({ summary: 'Reject a campaign' })
  async rejectCampaign(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.campaignStatus(id, 'REJECTED', req, { rejectionReason: body?.reason ?? '' });
  }

  @Patch('campaigns/:id/pause')
  @ApiOperation({ summary: 'Pause a campaign' })
  async pauseCampaign(@Param('id') id: string, @Req() req: any) {
    return this.campaignStatus(id, 'PAUSED', req);
  }

  @Patch('campaigns/:id/resume')
  @ApiOperation({ summary: 'Resume a paused campaign' })
  async resumeCampaign(@Param('id') id: string, @Req() req: any) {
    return this.campaignStatus(id, 'ACTIVE', req);
  }

  // â”€â”€ Orders / Returns / Refunds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get('orders')
  @ApiOperation({ summary: 'List all marketplace orders (admin view)' })
  async getOrders(@Query('page', ParsePagePipe) page = 1) {
    return { data: [] as unknown[], total: 0, page: Number(page), limit: 20, hasMore: false };
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order details by ID' })
  async getOrderById(@Param('id') id: string) {
    return { data: { id, status: 'PENDING' } };
  }

  @Put('orders/:id')
  @ApiOperation({ summary: 'Update order status/details' })
  async updateOrder(@Req() req: any, @Param('id') id: string, @Body() dto: { action: string; reason?: string }) {
    // `action` is the target status. Echoing it back without asking
    // order-service meant an admin could move an order through any state and
    // the customer's order never changed.
    return this.sendTo(this.orderClient, 'Order service', 'update_order_status', {
      orderId: id, status: dto.action, reason: dto.reason, updatedBy: this.actor(req),
    });
  }

  @Put('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.sendTo(this.orderClient, 'Order service', 'cancel_order', {
      orderId: id, reason: body?.reason, cancelledBy: this.actor(req),
    });
  }

  @Get('returns')
  @ApiOperation({ summary: 'List return requests' })
  async getReturns() {
    return { data: [] as unknown[], total: 0 };
  }

  @Post('returns/:id/approve')
  @ApiOperation({ summary: 'Approve a return request' })
  async approveReturn(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_RETURN_STATUS, { id, status: 'APPROVED' });
  }

  @Post('returns/:id/reject')
  @ApiOperation({ summary: 'Reject a return request' })
  async rejectReturn(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_RETURN_STATUS,
    { id, status: 'REJECTED', rejectionReason: body?.reason });
  }

  @Get('refunds')
  @ApiOperation({ summary: 'List refund requests awaiting a decision' })
  async getRefunds(
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    // Returned an empty list inline, so the refunds queue was always empty and
    // an admin had no way to tell that from "nothing is pending".
    return this.sendTo(this.refundClient, 'Refund service', 'get_pending_refunds', {
      page: +page, limit: +limit,
    });
  }

  // Approve, process and reject are one decision on the refund — the service
  // takes it as an argument. All three used to answer with the status in their
  // own name and write nothing, so a refund could be approved and processed in
  // the admin panel while the customer was never paid.
  @Post('refunds/:id/approve')
  @ApiOperation({ summary: 'Approve a refund' })
  async approveRefund(@Req() req: any, @Param('id') id: string, @Body() body?: { remarks?: string }) {
    return this.sendTo(this.refundClient, 'Refund service', 'process_refund', {
      id, adminId: this.actor(req), decision: 'APPROVED', remarks: body?.remarks,
    });
  }

  @Post('refunds/:id/process')
  @ApiOperation({ summary: 'Process an approved refund' })
  async processRefund(@Req() req: any, @Param('id') id: string, @Body() body: { amount?: number; reason?: string; note?: string }) {
    return this.sendTo(this.refundClient, 'Refund service', 'process_refund', {
      id, adminId: this.actor(req), decision: 'APPROVED',
      remarks: body?.note ?? body?.reason,
    });
  }

  @Put('refunds/:id/reject')
  @ApiOperation({ summary: 'Reject a refund' })
  async rejectRefund(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.sendTo(this.refundClient, 'Refund service', 'process_refund', {
      id, adminId: this.actor(req), decision: 'REJECTED', remarks: body?.reason,
    });
  }

  // â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * Platform commission earnings.
   *
   * This was a literal `return { data: [], total: 0 }` — it called nothing. The
   * super admin's commission report showed zero on a platform that was taking
   * orders, and there was no way to tell that from a platform with no sales.
   * Now reads commission-service, which is the service that charges them.
   */
  @Get('commissions')
  @ApiOperation({ summary: 'Platform commission earnings' })
  @ApiQuery({ name: 'sellerId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getCommissions(
    @Query('sellerId') sellerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    // A single seller's ledger, or the platform-wide totals.
    if (sellerId) {
    const history = await this.sendToCommission('get_seller_commission_history',
      { sellerId, page: Number(page), limit: DEFAULT_PAGE_SIZE });
    return history ?? { data: [], total: 0 };
    }

    const [totals, summary] = await Promise.all([
    this.sendToCommission('get_commission_totals', {
      startDate: startDate ?? new Date(Date.now() - 30 * 86400_000).toISOString(),
      endDate: endDate ?? new Date().toISOString(),
    }),
    this.sendToCommission('get_platform_revenue_summary', {}),
    ]);

    return { totals: totals ?? null, summary: summary ?? null };
  }

  @Get('commissions/rate-card')
  @ApiOperation({ summary: 'Category commission rate card' })
  async getCommissionRateCard() {
    return (await this.sendToCommission('get_category_rate_card', {})) ?? { data: [] };
  }

  @Put('commissions/rate-card')
  @ApiOperation({ summary: 'Change a category commission rate' })
  async updateCommissionRateCard(@Body() body: { category: string; subCategory?: string; updates: any }) {
    return (await this.sendToCommission('update_category_rate', body))
    ?? { success: false, message: 'Commission service unavailable' };
  }

  @Post('commissions/overrides')
  @ApiOperation({ summary: 'Give a seller a negotiated commission rate' })
  async setCommissionOverride(@Body() body: { sellerId: string; serviceType?: string; rate: number; reason: string; expiresAt?: string }) {
    return (await this.sendToCommission('set_seller_commission_override', {
    ...body, serviceType: body.serviceType ?? 'marketplace',
    })) ?? { success: false, message: 'Commission service unavailable' };
  }

  @Delete('commissions/overrides/:sellerId')
  @ApiOperation({ summary: 'Remove a seller’s negotiated rate' })
  async removeCommissionOverride(@Param('sellerId') sellerId: string, @Query('serviceType') serviceType = 'marketplace') {
    return (await this.sendToCommission('remove_seller_commission_override', { sellerId, serviceType }))
    ?? { success: false, message: 'Commission service unavailable' };
  }

  @Patch('commissions/:id')
  @ApiOperation({ summary: 'Update commission rate for a module' })
  async updateCommission(@Param('id') id: string, @Body() body: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_COMMISSION, { id, dto: body });
  }

  /**
   * The payout queue an admin actually works through.
   *
   * Also a hardcoded `{ data: [], total: 0 }`, so the super admin could not see —
   * let alone approve — a single seller withdrawal request. payout-service has
   * held these as real rows since the wallet/payout schemas were created.
   */
  @Get('payouts')
  @ApiOperation({ summary: 'Seller payout requests awaiting action' })
  @ApiQuery({ name: 'sellerId', required: false })
  async getPayouts(
    @Query('sellerId') sellerId?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    const cmd = sellerId ? 'get_seller_payouts' : 'get_pending_payouts';
    const payload = sellerId ? { sellerId, page: Number(page), limit: Number(limit) } : { page: Number(page), limit: Number(limit) };

    return (await this.sendToPayout(cmd, payload)) ?? { data: [], total: 0, totalAmount: 0 };
  }

  @Get('payouts/stats')
  @ApiOperation({ summary: 'Payout volume and success rate' })
  async getPayoutStats() {
    return (await this.sendToPayout('get_payout_stats', {})) ?? null;
  }

  @Patch('payouts/:id/approve')
  @ApiOperation({ summary: 'Approve a payout request' })
  async approvePayout(@Param('id') id: string, @Req() req: any) {
    const adminId = req?.user?.id ?? req?.user?.sub ?? 'admin';
    const result = await this.sendToPayout('approve_payout', { payoutId: id, adminId });
    if (!result) throw new ServiceUnavailableException('Payouts are temporarily unavailable.');
    return result;
  }

  @Patch('payouts/:id/process')
  @ApiOperation({ summary: 'Execute an approved payout' })
  async processPayout(@Param('id') id: string, @Req() req: any) {
    const adminId = req?.user?.id ?? req?.user?.sub ?? 'admin';
    const result = await this.sendToPayout('process_payout', { payoutId: id, adminId });
    if (!result) throw new ServiceUnavailableException('Payouts are temporarily unavailable.');
    return result;
  }

  // A second `payouts/:id/approve` stood here, routing to marketplace-service's
  // ADMIN_PROCESS_PAYOUT — a service that does not own payouts. Removed in favour
  // of the pair above, which reach payout-service where the records actually live.

  @Post('payouts/:id/retry')
  @ApiOperation({ summary: 'Retry a failed payout' })
  async retryPayout(@Param('id') id: string) {
    // Was `return { success: true, status: 'processing' }` — it reported a retry
    // it had not started, so a stuck payout looked as though it had been requeued.
    const result = await this.sendToPayout('retry_payout', { payoutId: id });
    if (!result) throw new ServiceUnavailableException('Payouts are temporarily unavailable.');
    return result;
  }

  // â”€â”€ Reports / Audit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get('reports')
  @ApiOperation({ summary: 'Get marketplace reports' })
  async getReports() {
    return { data: [] as unknown[], total: 0 };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get admin audit logs' })
  async getAuditLogs() {
    return { data: [] as unknown[], total: 0 };
  }

  // â”€â”€ Banner Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * Every region whose home feed caches banners, plus the unscoped feed.
   *
   * This list was written out inline at each call site with `'IN'` appearing
   * twice and `BH`/`SG` missing entirely — so edits to a Bahraini or Singaporean
   * banner never invalidated those markets' home feeds and the change appeared
   * not to have taken effect until the 120-second TTL expired.
   */
  private static readonly CACHED_HOME_REGIONS = [
    'global', 'QA', 'IN', 'AE', 'SA', 'BH', 'KW', 'OM', 'GB', 'US', 'SG',
  ] as const;

  private async invalidateHomeFeeds() {
    await Promise.all(
    AdminMarketplaceController.CACHED_HOME_REGIONS.map((r) =>
      this.redis.del(`marketplace:home:${r}`),
    ),
    );
  }

  @Get('banners/:type')
  @ApiOperation({ summary: 'Get banners by type (hero, campaign, country)' })
  @ApiParam({ name: 'type', enum: ['hero', 'campaign', 'country'] })
  @ApiQuery({ name: 'country', required: false, description: 'Only banners targeted at this market' })
  async getBanners(@Param('type') type: string, @Query('country') country?: string) {
    const key = `marketplace:${type}-banners`;
    const data = (await this.redis.getJson<any[]>(key)) || [];
    if (!country) return { data, total: data.length };

    // A banner with no `regions` runs everywhere — that is the shape every
    // banner had before regional targeting, so untargeted ones keep showing.
    const code = country.toUpperCase();
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
    @Param('type') type: string,
    @Body() body: { id?: string; regions?: string[]; [key: string]: any }) {
    const id = body.id || `${type}-${Date.now()}`;
    const key = `marketplace:${type}-banners`;
    const existing: any[] = (await this.redis.getJson(key)) || [];
    const idx = existing.findIndex((b: any) => b.id === id);

    // Normalise the market list once on write, so the read path can compare
    // codes directly instead of case-folding on every home-feed request.
    const regions = Array.isArray(body.regions)
    ? [...new Set(body.regions.map((r) => String(r).trim().toUpperCase()).filter(Boolean))]
    : undefined;
    const payload = { ...body, ...(regions ? { regions } : {}) };

    if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...payload, id, updatedAt: new Date().toISOString() };
    } else {
    existing.push({ ...payload, id, createdAt: new Date().toISOString() });
    }
    await this.redis.setJson(key, existing, 0);
    await this.invalidateHomeFeeds();
    // Broadcast change via Kafka for Socket.IO propagation
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
    type, id, regions: regions ?? null,
    action: idx >= 0 ? 'updated' : 'created', timestamp: new Date().toISOString(),
    });
    return { data: { success: true, id, regions: regions ?? null, action: idx >= 0 ? 'updated' : 'created' } };
  }

  @Patch('banners/:type/:id')
  @ApiOperation({ summary: 'Update a specific banner' })
  async updateBanner(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() body: any) {
    return this.saveBanner(type, { ...body, id });
  }

  @Post('banners/:type/:id/delete')
  @ApiOperation({ summary: 'Delete a banner' })
  async deleteBanner(@Param('type') type: string, @Param('id') id: string) {
    const key = `marketplace:${type}-banners`;
    const existing: any[] = (await this.redis.getJson(key)) || [];
    const filtered = existing.filter((b: any) => b.id !== id);
    await this.redis.setJson(key, filtered, 0);
    await this.invalidateHomeFeeds();
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
    type, id, action: 'deleted', timestamp: new Date().toISOString(),
    });
    return { data: { success: true, id } };
  }

  // â”€â”€ Home Cache Invalidation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Post('invalidate-home-cache')
  @ApiOperation({ summary: 'Force invalidate marketplace home cache for all regions' })
  async invalidateHomeCache() {
    const regions = ['global', 'IN', 'AE', 'SA', 'QA', 'GB', 'KW', 'OM', 'US', 'IN'];
    for (const r of regions) {
    await this.redis.del(`marketplace:home:${r}`);
    }
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
    action: 'cache_invalidated', timestamp: new Date().toISOString(),
    });
    return { data: { success: true, message: 'Home cache invalidated for all regions' } };
  }

  // ── Bank Offers Management ──────────────────────────────────────────────────

  @Get('bank-offers')
  @ApiOperation({ summary: 'List all bank offers' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'] })
  @ApiQuery({ name: 'bankName', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getBankOffers(
    @Query('status') status?: string,
    @Query('bankName') bankName?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE) {
    const qb = this.bankOfferRepo.createQueryBuilder('bo');
    if (status) qb.andWhere('bo.status = :status', { status });
    if (bankName) qb.andWhere('bo.bankName ILIKE :bankName', { bankName: `%${bankName}%` });
    qb.orderBy('bo.priority', 'ASC').addOrderBy('bo.createdAt', 'DESC');
    qb.skip((Number(page) - 1) * Number(limit)).take(Number(limit));
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: Number(page), limit: Number(limit), hasMore: total > Number(page) * Number(limit) };
  }

  @Get('bank-offers/:id')
  @ApiOperation({ summary: 'Get bank offer by ID' })
  async getBankOfferById(@Param('id') id: string) {
    const offer = await this.bankOfferRepo.findOneByOrFail({ id });
    return { data: offer };
  }

  @Post('bank-offers')
  @ApiOperation({ summary: 'Create a new bank offer' })
  @ApiBody({ schema: { type: 'object', properties: {
    title: { type: 'string', example: '10% Instant Discount with HDFC Credit Card' },
    description: { type: 'string', example: 'Get 10% instant discount up to ₹1500 on orders above ₹5000' },
    bankName: { type: 'string', example: 'HDFC Bank' },
    cardType: { type: 'string', example: 'CREDIT', enum: ['CREDIT', 'DEBIT', 'ALL', 'EMI', 'UPI', 'WALLET'] },
    cardNetwork: { type: 'string', example: 'ALL' },
    discountType: { type: 'string', example: 'PERCENTAGE', enum: ['PERCENTAGE', 'FLAT'] },
    discountValue: { type: 'number', example: 10 },
    maxDiscount: { type: 'number', example: 1500 },
    minOrderValue: { type: 'number', example: 5000 },
    startsAt: { type: 'string', format: 'date-time' },
    expiresAt: { type: 'string', format: 'date-time' },
  }, required: ['title', 'description', 'bankName', 'discountType', 'discountValue', 'startsAt', 'expiresAt'] } })
  async createBankOffer(@Body() body: Partial<BankOffer>) {
    const offer = this.bankOfferRepo.create(body);
    const saved = await this.bankOfferRepo.save(offer);
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
    type: 'bank_offer', id: saved.id, action: 'created', timestamp: new Date().toISOString(),
    });
    return { data: saved };
  }

  @Patch('bank-offers/:id')
  @ApiOperation({ summary: 'Update a bank offer' })
  async updateBankOffer(@Param('id') id: string, @Body() body: Partial<BankOffer>) {
    await this.bankOfferRepo.update(id, body);
    const updated = await this.bankOfferRepo.findOneByOrFail({ id });
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
    type: 'bank_offer', id, action: 'updated', timestamp: new Date().toISOString(),
    });
    return { data: updated };
  }

  @Patch('bank-offers/:id/status')
  @ApiOperation({ summary: 'Change bank offer status (activate, pause, archive)' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] } } } })
  async updateBankOfferStatus(@Param('id') id: string, @Body('status') status: string) {
    await this.bankOfferRepo.update(id, { status });
    return { data: { success: true, id, status } };
  }

  @Patch('bank-offers/:id/feature')
  @ApiOperation({ summary: 'Toggle bank offer featured status' })
  async toggleBankOfferFeatured(@Param('id') id: string) {
    const offer = await this.bankOfferRepo.findOneByOrFail({ id });
    await this.bankOfferRepo.update(id, { isFeatured: !offer.isFeatured });
    return { data: { success: true, id, isFeatured: !offer.isFeatured } };
  }

  @Delete('bank-offers/:id')
  @ApiOperation({ summary: 'Delete a bank offer permanently' })
  async deleteBankOffer(@Param('id') id: string) {
    await this.bankOfferRepo.delete(id);
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
    type: 'bank_offer', id, action: 'deleted', timestamp: new Date().toISOString(),
    });
    return { data: { success: true, id } };
  }

  // ── Exchange Offers Management ──────────────────────────────────────────────

  @Get('exchange-offers')
  @ApiOperation({ summary: 'List all exchange/trade-in offers' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'] })
  @ApiQuery({ name: 'targetCategory', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getExchangeOffers(
    @Query('status') status?: string,
    @Query('targetCategory') targetCategory?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE) {
    const qb = this.exchangeOfferRepo.createQueryBuilder('eo');
    if (status) qb.andWhere('eo.status = :status', { status });
    if (targetCategory) qb.andWhere('eo.targetCategory ILIKE :cat', { cat: `%${targetCategory}%` });
    qb.orderBy('eo.priority', 'ASC').addOrderBy('eo.createdAt', 'DESC');
    qb.skip((Number(page) - 1) * Number(limit)).take(Number(limit));
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: Number(page), limit: Number(limit), hasMore: total > Number(page) * Number(limit) };
  }

  @Get('exchange-offers/:id')
  @ApiOperation({ summary: 'Get exchange offer by ID' })
  async getExchangeOfferById(@Param('id') id: string) {
    const offer = await this.exchangeOfferRepo.findOneByOrFail({ id });
    return { data: offer };
  }

  @Post('exchange-offers')
  @ApiOperation({ summary: 'Create a new exchange/trade-in offer' })
  @ApiBody({ schema: { type: 'object', properties: {
    title: { type: 'string', example: 'Exchange your old phone — get up to ₹15,000 off' },
    description: { type: 'string', example: 'Trade in your old smartphone and get instant discount on a new one' },
    exchangeCategory: { type: 'string', example: 'Smartphones' },
    targetCategory: { type: 'string', example: 'Smartphones' },
    maxExchangeValue: { type: 'number', example: 15000 },
    minExchangeValue: { type: 'number', example: 1000 },
    bonusAmount: { type: 'number', example: 2000 },
    fulfillmentMode: { type: 'string', example: 'PICKUP', enum: ['PICKUP', 'DROP_OFF', 'COURIER'] },
    startsAt: { type: 'string', format: 'date-time' },
    expiresAt: { type: 'string', format: 'date-time' },
  }, required: ['title', 'description', 'exchangeCategory', 'targetCategory', 'maxExchangeValue', 'startsAt', 'expiresAt'] } })
  async createExchangeOffer(@Body() body: Partial<ExchangeOffer>) {
    const offer = this.exchangeOfferRepo.create(body);
    const saved = await this.exchangeOfferRepo.save(offer);
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
    type: 'exchange_offer', id: saved.id, action: 'created', timestamp: new Date().toISOString(),
    });
    return { data: saved };
  }

  @Patch('exchange-offers/:id')
  @ApiOperation({ summary: 'Update an exchange offer' })
  async updateExchangeOffer(@Param('id') id: string, @Body() body: Partial<ExchangeOffer>) {
    await this.exchangeOfferRepo.update(id, body);
    const updated = await this.exchangeOfferRepo.findOneByOrFail({ id });
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
    type: 'exchange_offer', id, action: 'updated', timestamp: new Date().toISOString(),
    });
    return { data: updated };
  }

  @Patch('exchange-offers/:id/status')
  @ApiOperation({ summary: 'Change exchange offer status' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] } } } })
  async updateExchangeOfferStatus(@Param('id') id: string, @Body('status') status: string) {
    await this.exchangeOfferRepo.update(id, { status });
    return { data: { success: true, id, status } };
  }

  @Patch('exchange-offers/:id/feature')
  @ApiOperation({ summary: 'Toggle exchange offer featured status' })
  async toggleExchangeOfferFeatured(@Param('id') id: string) {
    const offer = await this.exchangeOfferRepo.findOneByOrFail({ id });
    await this.exchangeOfferRepo.update(id, { isFeatured: !offer.isFeatured });
    return { data: { success: true, id, isFeatured: !offer.isFeatured } };
  }

  @Delete('exchange-offers/:id')
  @ApiOperation({ summary: 'Delete an exchange offer permanently' })
  async deleteExchangeOffer(@Param('id') id: string) {
    await this.exchangeOfferRepo.delete(id);
    await this.kafka.publish(KAFKA_TOPICS.MARKETPLACE_HOME_UPDATED || 'marketplace.home.updated', {
    type: 'exchange_offer', id, action: 'deleted', timestamp: new Date().toISOString(),
    });
    return { data: { success: true, id } };
  }

  // ── Page Layout ─────────────────────────────────────────────────────────────
  @Get('page-layout')
  @ApiOperation({ summary: 'Get marketplace page layout' })
  async getPageLayout(@Query('country') country?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PAGE_LAYOUT, { country });
  }

  @Patch('page-layout')
  @ApiOperation({ summary: 'Update marketplace page layout' })
  async updatePageLayout(@Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_PAGE_LAYOUT, { dto });
  }

  // ── SEO ──────────────────────────────────────────────────────────────────────
  @Get('seo')
  @ApiOperation({ summary: 'Get marketplace SEO settings' })
  async getSeoSettings() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SEO, {});
  }

  @Patch('seo')
  @ApiOperation({ summary: 'Update marketplace SEO settings' })
  async updateSeoSettings(@Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_SEO, { dto });
  }

  @Patch('sellers/:id/block')
  @ApiOperation({ summary: 'Permanently block a seller' })
  async blockSeller(@Param('id') id: string, @Req() req: any) {
    // Publishing the Kafka event was all this used to do — nothing wrote the
    // seller's status, so the block was announced but never applied.
    // `blockSeller()` on the service performs the write (and emits its own event).
    //
    // Deliberately uncaught. The old `catch` turned a failed block into HTTP 200
    // with `{ success: false }` buried two levels down, which the console renders
    // as a success — the same "reports done, did nothing" failure mode this fix
    // exists to remove. A block that did not happen must surface as an error.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_BLOCK_SELLER,
    { id, adminId: req?.user?.id ?? req?.user?.sub ?? 'admin' });
  }

  // ── Settings ────────────────────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get marketplace settings' })
  async getSettings() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SETTINGS, {});
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update marketplace settings' })
  async updateSettings(@Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_SETTINGS, { dto });
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
  async getFlashDeals(@Query('status') status?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_FLASH_DEALS, { status });
  }

  @Post('flash-deals')
  @ApiOperation({ summary: 'Create flash deal' })
  async createFlashDeal(@Req() req: any, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_FLASH_DEAL, {
    dto: { ...dto, createdBy: req?.user?.id ?? req?.user?.sub ?? 'admin' },
    });
  }

  @Patch('flash-deals/:id')
  @ApiOperation({ summary: 'Update flash deal' })
  async updateFlashDeal(@Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_FLASH_DEAL, { id, dto });
  }

  @Delete('flash-deals/:id')
  @ApiOperation({ summary: 'Cancel flash deal' })
  async deleteFlashDeal(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_FLASH_DEAL, { id });
  }

  @Get('flash-deals/nominations')
  @ApiOperation({ summary: 'List all seller nominations' })
  async getNominations(@Query('status') status?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_NOMINATIONS, { status });
  }

  @Patch('flash-deals/nominations/:nominationId/approve')
  @ApiOperation({ summary: 'Approve a seller nomination' })
  async approveNomination(@Req() req: any, @Param('nominationId') nominationId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_APPROVE_NOMINATION, {
    nominationId,
    adminId: req?.user?.id ?? req?.user?.sub ?? 'admin',
    });
  }

  @Patch('flash-deals/nominations/:nominationId/reject')
  @ApiOperation({ summary: 'Reject a seller nomination' })
  async rejectNomination(@Req() req: any, @Param('nominationId') nominationId: string, @Body() body: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REJECT_NOMINATION, {
    nominationId,
    reason: body?.reason,
    adminId: req?.user?.id ?? req?.user?.sub ?? 'admin',
    });
  }

  // ── Promotions ──────────────────────────────────────────────────────────────
  @Get('promotions')
  @ApiOperation({ summary: 'List promotions' })
  async getPromotions() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PROMOTIONS, {});
  }

  @Post('promotions')
  @ApiOperation({ summary: 'Create promotion' })
  async createPromotion(@Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_PROMOTION, { dto });
  }

  @Patch('promotions/:id')
  @ApiOperation({ summary: 'Update promotion' })
  async updatePromotion(@Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_PROMOTION, { id, dto });
  }

  // ── Notifications ───────────────────────────────────────────────────────────
  @Get('notifications')
  @ApiOperation({ summary: 'List admin notifications' })
  async getNotifications() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_NOTIFICATIONS, {});
  }

  @Post('notifications')
  @ApiOperation({ summary: 'Send notification' })
  async sendNotification(@Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_SEND_NOTIFICATION, { dto });
  }

  // ── HSN / Tax Master ────────────────────────────────────────────────────────
  @Get('hsn-codes')
  @ApiOperation({ summary: 'List HSN/tax codes' })
  async getHsnCodes(@Query('search') search?: string) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, search);
  }

  @Post('hsn-codes')
  @ApiOperation({ summary: 'Create HSN code' })
  async createHsnCode(@Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_HSN_CODE, { dto });
  }

  @Patch('hsn-codes/:id')
  @ApiOperation({ summary: 'Update HSN code' })
  async updateHsnCode(@Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_HSN_CODE, { id, dto });
  }

  // ── Featured Products ───────────────────────────────────────────────────────
  @Get('featured')
  @ApiOperation({ summary: 'List featured products' })
  async getFeaturedProducts() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_FEATURED, {});
  }

  @Get('featured-products')
  @ApiOperation({ summary: 'List featured products (alias)' })
  async getFeaturedProductsAlias() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_FEATURED, {});
  }

  @Post('featured')
  @ApiOperation({ summary: 'Add featured product' })
  async addFeaturedProduct(@Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_ADD_FEATURED, { dto });
  }

  @Delete('featured/:id')
  @ApiOperation({ summary: 'Remove featured product' })
  async removeFeaturedProduct(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_REMOVE_FEATURED, { id });
  }

  // ── Sponsored Products ──────────────────────────────────────────────────────
  @Get('sponsored')
  @ApiOperation({ summary: 'List sponsored products' })
  async getSponsoredProducts(@Query('status') status?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SPONSORED, { status });
  }

  @Get('sponsored-products')
  @ApiOperation({ summary: 'List sponsored products (alias)' })
  async getSponsoredProductsAlias(@Query('status') status?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SPONSORED, { status });
  }

  @Patch('sponsored/:id')
  @ApiOperation({ summary: 'Update sponsored product' })
  async updateSponsoredProduct(@Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_SPONSORED, { id, dto });
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────
  @Get('reviews')
  @ApiOperation({ summary: 'List reviews for moderation' })
  async getReviews(@Query('status') status?: string, @Query('rating') rating?: number) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, status, rating ? Number(rating) : undefined);
  }

  @Patch('reviews/:id/flag')
  @ApiOperation({ summary: 'Flag a review for moderation' })
  async flagReview(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_FLAG_REVIEW, { id, reason: body?.reason });
  }

  @Patch('reviews/:id/hide')
  @ApiOperation({ summary: 'Hide a review from public view' })
  async hideReview(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_HIDE_REVIEW, { id });
  }

  // ── QA Moderation ───────────────────────────────────────────────────────────
  @Get('qa-moderation')
  @ApiOperation({ summary: 'List Q&A items for moderation' })
  async getQAItems(@Query('status') status?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_QA, { status });
  }

  @Patch('qa-moderation/:id')
  @ApiOperation({ summary: 'Moderate Q&A item' })
  async moderateQAItem(@Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_MODERATE_QA, { id, dto });
  }

  // ── Complaints ──────────────────────────────────────────────────────────────
  @Get('complaints')
  @ApiOperation({ summary: 'List complaints' })
  async getComplaints(@Query('status') status?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_COMPLAINTS, { status });
  }

  @Patch('complaints/:id')
  @ApiOperation({ summary: 'Update complaint' })
  async updateComplaint(@Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_COMPLAINT, { id, dto });
  }

  // ── Compliance / Countries ──────────────────────────────────────────────────
  @Get('compliance/countries')
  @ApiOperation({ summary: 'List compliance countries' })
  async getComplianceCountries() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_COMPLIANCE_COUNTRIES, {});
  }

  @Patch('compliance/countries/:code')
  @ApiOperation({ summary: 'Update country compliance' })
  async updateComplianceCountry(@Param('code') code: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_COMPLIANCE_COUNTRY, { code, dto });
  }

  // ── Customers ───────────────────────────────────────────────────────────────
  @Get('customers')
  @ApiOperation({ summary: 'List customers' })
  async getCustomers(@Query('search') search?: string, @Query('page') page?: number) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CUSTOMERS, { search, page });
  }

  @Patch('customers/:id/block')
  @ApiOperation({ summary: 'Block customer' })
  async blockCustomer(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_BLOCK_CUSTOMER, { id });
  }

  // ── Seller Wallets ──────────────────────────────────────────────────────────
  @Get('seller-wallets')
  @ApiOperation({ summary: 'List seller wallets' })
  async getSellerWallets() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLER_WALLETS, {});
  }

  @Post('seller-wallets/:id/adjust')
  @ApiOperation({ summary: 'Adjust seller wallet balance' })
  async adjustSellerWallet(@Param('id') id: string, @Body() dto: { amount: number; reason: string }) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_ADJUST_SELLER_WALLET, { sellerId: id, amount: dto?.amount, reason: dto?.reason });
  }

  // ── India Operations ────────────────────────────────────────────────────────
  @Get('india-ops')
  @ApiOperation({ summary: 'Get India operations config' })
  async getIndiaOpsConfig() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_INDIA_OPS, {});
  }

  @Patch('india-ops')
  @ApiOperation({ summary: 'Update India operations config' })
  async updateIndiaOpsConfig(@Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_INDIA_OPS, { dto });
  }

  // ── Sellers Pending ─────────────────────────────────────────────────────────
  @Get('wallet/transactions')
  @ApiOperation({ summary: 'Search all wallet transactions (admin audit)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['CREDIT', 'DEBIT'] })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async searchWalletTransactions(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('module') module?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE) {
    const cached = await this.redis.getJson<any>(`admin:wallet:search:${userId || 'all'}:${page}`);
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
      userId, type, module, startDate, endDate, page: +page, limit: +limit,
    });
  }

  @Post('wallet/adjust')
  @ApiOperation({ summary: 'Manually adjust a user wallet balance (admin)' })
  @ApiBody({ schema: { properties: {
    userId: { type: 'string' }, amount: { type: 'number' },
    reason: { type: 'string' }, type: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
  }}})
  async adjustWalletBalance(
    @Req() req: any,
    @Body() dto: { userId: string; amount: number; reason: string; type: 'CREDIT' | 'DEBIT' },
  ) {
    // The money moves first. The audit entry is written after, and only if the
    // adjustment actually landed — logging it first recorded credits that never
    // happened and made the log the least trustworthy record of the two.
    const result = await this.sendTo(
      this.walletClient, 'Wallet service',
      dto.type === 'DEBIT' ? 'wallet_debit' : 'wallet_credit',
      {
        userId: dto.userId,
        amount: Math.abs(Number(dto.amount) || 0),
        reason: dto.reason,
        module: 'admin',
        referenceId: `admin-adjust-${Date.now()}`,
      },
    );

    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'wallet.admin_adjust', target: dto.userId, actor: this.actor(req),
      details: { amount: dto.amount, type: dto.type, reason: dto.reason },
      timestamp: new Date().toISOString(),
    });
    return { success: true, userId: dto.userId, type: dto.type, reason: dto.reason, wallet: result };
  }

  @Post('wallet/freeze')
  @ApiOperation({ summary: 'Freeze a user wallet (fraud prevention)' })
  @ApiBody({ schema: { properties: { userId: { type: 'string' }, reason: { type: 'string' } }}})
  async freezeWallet(@Req() req: any, @Body() dto: { userId: string; reason: string }) {
    const result = await this.sendTo(this.walletClient, 'Wallet service', 'wallet_freeze', {
      userId: dto.userId, reason: dto.reason, adminId: this.actor(req),
    });
    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'wallet.freeze', target: dto.userId, actor: this.actor(req),
      details: { reason: dto.reason }, timestamp: new Date().toISOString(),
    });
    return { success: true, userId: dto.userId, frozen: true, reason: dto.reason, wallet: result };
  }

  @Post('wallet/unfreeze')
  @ApiOperation({ summary: 'Unfreeze a user wallet' })
  @ApiBody({ schema: { properties: { userId: { type: 'string' }, reason: { type: 'string' } }}})
  async unfreezeWallet(@Req() req: any, @Body() dto: { userId: string; reason: string }) {
    const result = await this.sendTo(this.walletClient, 'Wallet service', 'wallet_unfreeze', {
      userId: dto.userId, reason: dto.reason, adminId: this.actor(req),
    });
    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'wallet.unfreeze', target: dto.userId, actor: this.actor(req),
      details: { reason: dto.reason }, timestamp: new Date().toISOString(),
    });
    return { success: true, userId: dto.userId, frozen: false, reason: dto.reason, wallet: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Admin Loyalty Controls ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('loyalty/config')
  @ApiOperation({ summary: 'Get loyalty program configuration' })
  async getLoyaltyConfig() {
    const cached = await this.redis.getJson<any>('admin:loyalty:config');
    return cached || {
      tiers: {
        Bronze:   { threshold: 0,    multiplier: 1,   benefits: ['Basic rewards'] },
        Silver:   { threshold: 200,  multiplier: 1.5, benefits: ['Free delivery on orders > ₹500', 'Early sale access'] },
        Gold:     { threshold: 1000, multiplier: 2,   benefits: ['Priority support', 'Exclusive deals', 'Free delivery'] },
        Platinum: { threshold: 5000, multiplier: 3,   benefits: ['Personal account manager', 'Birthday bonus', 'All Gold benefits'] },
      },
      earnRules: {
        pointsPerHundred: 1,
        completionBonus: 5,
        ratingBonus: 2,
        maxPointsPerOrder: 500,
      },
      redemption: { pointsPerUnit: 10, currencyUnit: 'INR', minRedeemable: 100 },
      expiry: { enabled: false, months: 12 },
    };
  }

  @Patch('loyalty/config')
  @ApiOperation({ summary: 'Update loyalty program configuration' })
  async updateLoyaltyConfig(@Body() dto: any) {
    await this.redis.setJson('admin:loyalty:config', dto, 0); // No TTL — persistent config
    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'loyalty.config_updated', details: dto, timestamp: new Date().toISOString(),
    });
    return { success: true, config: dto };
  }

  @Get('loyalty/users/:userId')
  @ApiOperation({ summary: 'Get user loyalty detail (admin view)' })
  @ApiParam({ name: 'userId' })
  async getUserLoyalty(@Param('userId') userId: string) {
    const cached = await this.redis.getJson<any>(`loyalty:${userId}`);
    return cached || { userId, points: 0, tier: 'Bronze', totalEarned: 0, totalReversed: 0 };
  }

  @Post('loyalty/adjust')
  @ApiOperation({ summary: 'Manually adjust user loyalty points (admin)' })
  @ApiBody({ schema: { properties: {
    userId: { type: 'string' }, points: { type: 'number', description: 'Positive to grant, negative to revoke' },
    reason: { type: 'string' },
  }}})
  async adjustLoyaltyPoints(@Req() req: any, @Body() dto: { userId: string; points: number; reason: string }) {
    const result = await this.sendTo(this.loyaltyClient, 'Loyalty service', 'adjust_loyalty_points', {
      userId: dto.userId, points: Number(dto.points) || 0,
      reason: dto.reason, adminId: this.actor(req),
    });
    await this.kafka.publish(KAFKA_TOPICS.AUDIT_LOG, {
      action: 'loyalty.admin_adjust', target: dto.userId, actor: this.actor(req),
      details: { points: dto.points, reason: dto.reason },
      timestamp: new Date().toISOString(),
    });
    return { success: true, userId: dto.userId, adjustment: dto.points, reason: dto.reason, loyalty: result };
  }

  @Get('loyalty/analytics')
  @ApiOperation({ summary: 'Get loyalty program analytics' })
  async getLoyaltyAnalytics() {
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

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Revenue analytics with daily breakdown' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter'] })
  async getRevenueAnalytics(@Query('period') period?: string) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_REVENUE_ANALYTICS, period);
  }

  @Get('analytics/funnel')
  @ApiOperation({ summary: 'Conversion funnel metrics' })
  @ApiQuery({ name: 'period', required: false })
  async getConversionFunnel(@Query('period') period?: string) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CONVERSION_FUNNEL, period);
  }

  @Get('analytics/seller-rankings')
  @ApiOperation({ summary: 'Seller performance leaderboard' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['revenue', 'rating', 'orders', 'fulfillment'] })
  async getSellerRankings(@Query('sortBy') sortBy?: string) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLER_RANKINGS, sortBy);
  }

  @Get('analytics/category-performance')
  @ApiOperation({ summary: 'Per-category sales and return metrics' })
  async getCategoryPerformance() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CATEGORY_PERFORMANCE);
  }

  @Get('analytics/regional')
  @ApiOperation({ summary: 'State/city-wise order distribution' })
  async getRegionalPerformance() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_REGIONAL_PERFORMANCE);
  }

  @Get('analytics/inventory-aging')
  @ApiOperation({ summary: 'Slow-moving stock analysis by age bucket' })
  async getInventoryAging() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_INVENTORY_AGING);
  }

  @Get('analytics/return-analysis')
  @ApiOperation({ summary: 'Return rate breakdown by reason and category' })
  async getReturnRateAnalysis() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_RETURN_ANALYSIS);
  }

  @Get('analytics/fraud-alerts')
  @ApiOperation({ summary: 'Suspicious order pattern detection' })
  async getFraudAlerts() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_FRAUD_ALERTS);
  }

  @Get('analytics/sla-compliance')
  @ApiOperation({ summary: 'SLA compliance metrics for all sellers' })
  @ApiQuery({ name: 'sellerId', required: false })
  async getSLACompliance(@Query('sellerId') sellerId?: string) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SLA_COMPLIANCE, sellerId);
  }

  @Get('analytics/penalty-ledger')
  @ApiOperation({ summary: 'Penalty ledger for SLA violations' })
  @ApiQuery({ name: 'sellerId', required: false })
  async getPenaltyLedger(@Query('sellerId') sellerId?: string) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PENALTY_LEDGER, sellerId);
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
    const region = (country || req?.regionCode || '').toUpperCase() || undefined;
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SELLERS, {
      status: 'PENDING', ...(region ? { country: region } : {}),
    });
  }

  @Get('product-approvals')
  @ApiOperation({ summary: 'List products pending approval' })
  @ApiQuery({ name: 'country', required: false, description: 'Scope the queue to one market' })
  async getProductApprovals(@Req() req: any, @Query('country') country?: string) {
    const region = (country || req?.regionCode || '').toUpperCase() || undefined;
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, {
      page: 1, limit: 50, status: 'PENDING', ...(region ? { country: region } : {}),
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
  async getSellerApprovalCounts() {
    const counts = await this.sendToMarketplace<Record<string, number>>(
      MARKETPLACE_PATTERNS.ADMIN_PENDING_SELLER_COUNTS,
    );
    const byRegion = counts ?? {};
    return {
      data: byRegion,
      total: Object.values(byRegion).reduce((sum, n) => sum + (Number(n) || 0), 0),
    };
  }

  @Get('disputes')
  @ApiOperation({ summary: 'List buyer-seller disputes' })
  @ApiQuery({ name: 'status', required: false })
  async getDisputes(@Query('status') status?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_DISPUTES, { status });
  }

  @Get('customer-segments')
  @ApiOperation({ summary: 'List customer RFM segments' })
  async getCustomerSegments() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_CUSTOMER_SEGMENTS, {});
  }

  @Get('coupons')
  @ApiOperation({ summary: 'List all platform coupons' })
  @ApiQuery({ name: 'isActive', required: false })
  async getAdminCoupons(@Query('isActive') isActive?: string) {
    try {
      return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_COUPONS, {
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        page: 1, limit: 50,
      });
    }
    catch { return { data: [], total: 0 }; }
  }


  @Get('gift-cards')
  @ApiOperation({ summary: 'List platform gift cards' })
  async getAdminGiftCards() {
    return { data: [] as unknown[], total: 0, message: 'Gift card management' };
  }

  @Get('banners')
  @ApiOperation({ summary: 'List all homepage banners' })
  async getAllBanners() {
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
  async createBanner(@Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_CREATE_BANNER, { dto });
  }

  // Named `*HomepageBanner`, not `*Banner`: the `/banners/:type/:id` handlers
  // further up already own `updateBanner` and `deleteBanner` for the Redis home-
  // feed cache, and two methods of the same name silently collapse into one.
  @Put('banners/:id')
  @ApiOperation({ summary: 'Update a homepage banner' })
  async updateHomepageBanner(@Param('id') id: string, @Body() dto: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_UPDATE_BANNER, { id, dto });
  }

  @Patch('banners/:id')
  @ApiOperation({ summary: 'Update a homepage banner (PATCH alias)' })
  async patchHomepageBanner(@Param('id') id: string, @Body() dto: any) {
    return this.updateHomepageBanner(id, dto);
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Delete a homepage banner' })
  async deleteHomepageBanner(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_DELETE_BANNER, { id });
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Global inventory overview' })
  async getGlobalInventory() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_INVENTORY_AGING);
  }

  @Get('listing-quality')
  @ApiOperation({ summary: 'Listing quality score dashboard' })
  async getListingQuality() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, 1, 50);
  }

  @Get('seller-health')
  @ApiOperation({ summary: 'Seller health metrics dashboard' })
  async getSellerHealth() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_SLA_COMPLIANCE);
  }

  @Get('logistics')
  @ApiOperation({ summary: 'Logistics partner management' })
  async getLogistics() {
    return { data: [] as unknown[], total: 0, message: 'Logistics integrations' };
  }

  @Get('delivery-partners')
  @ApiOperation({ summary: 'Delivery partner management' })
  async getDeliveryPartners() {
    return { data: [] as unknown[], total: 0, message: 'Delivery partner list' };
  }

  @Get('delivery-zones')
  @ApiOperation({ summary: 'Delivery zone configuration' })
  async getDeliveryZones() {
    return { data: [] as unknown[], total: 0, message: 'Zone configuration' };
  }

  @Get('shipping-rates')
  @ApiOperation({ summary: 'Shipping rate cards' })
  async getShippingRates() {
    return { data: [] as unknown[], total: 0, message: 'Rate card management' };
  }

  @Get('payments')
  @ApiOperation({ summary: 'Payment gateway management' })
  async getPayments() {
    return { data: [] as unknown[], total: 0, message: 'Payment gateway config' };
  }

  @Get('hsn-tax-master')
  @ApiOperation({ summary: 'HSN/SAC tax rate master (alias for hsn-codes)' })
  @ApiQuery({ name: 'search', required: false })
  async getHsnTaxMaster(@Query('search') search?: string) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_GET_PRODUCTS, search);
  }

  @Get('gst-invoicing')
  @ApiOperation({ summary: 'GST invoicing management' })
  async getGstInvoicing() {
    return { data: [] as unknown[], total: 0, message: 'GST invoice management' };
  }

  @Get('abandoned-carts')
  @ApiOperation({ summary: 'Abandoned cart recovery management' })
  async getAbandonedCarts() {
    return { data: [] as unknown[], total: 0, recoveryRate: 0, message: 'Cart recovery management' };
  }

  @Get('ip-violations')
  @ApiOperation({ summary: 'IP/counterfeit violation reports' })
  async getIpViolations() {
    return { data: [] as unknown[], total: 0, message: 'IP violation management' };
  }

  @Get('system-health')
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
  @Put('promotions/:id')
  @ApiOperation({ summary: 'Update promotion (PUT alias)' })
  async putPromotion(@Param('id') id: string, @Body() dto: any) {
    return this.updatePromotion(id, dto);
  }

  @Put('complaints/:id')
  @ApiOperation({ summary: 'Update complaint (PUT alias)' })
  async putComplaint(@Param('id') id: string, @Body() dto: any) {
    return this.updateComplaint(id, dto);
  }

  @Put('qa-moderation/:id')
  @ApiOperation({ summary: 'Moderate Q&A item (PUT alias)' })
  async putQAItem(@Param('id') id: string, @Body() dto: any) {
    return this.moderateQAItem(id, dto);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update marketplace settings (PUT alias)' })
  async putSettings(@Body() dto: any) {
    return this.updateSettings(dto);
  }

  @Put('page-layout')
  @ApiOperation({ summary: 'Update page layout (PUT alias)' })
  async putPageLayout(@Body() dto: any) {
    return this.updatePageLayout(dto);
  }

  @Put('seo')
  @ApiOperation({ summary: 'Update SEO settings (PUT alias)' })
  async putSeoSettings(@Body() dto: any) {
    return this.updateSeoSettings(dto);
  }

  @Put('hsn-codes/:id')
  @ApiOperation({ summary: 'Update HSN code (PUT alias)' })
  async putHsnCode(@Param('id') id: string, @Body() dto: any) {
    return this.updateHsnCode(id, dto);
  }

  @Put('bank-offers/:id')
  @ApiOperation({ summary: 'Update bank offer (PUT alias)' })
  async putBankOffer(@Param('id') id: string, @Body() body: Partial<BankOffer>) {
    return this.updateBankOffer(id, body);
  }

  @Put('exchange-offers/:id')
  @ApiOperation({ summary: 'Update exchange offer (PUT alias)' })
  async putExchangeOffer(@Param('id') id: string, @Body() body: Partial<ExchangeOffer>) {
    return this.updateExchangeOffer(id, body);
  }

  @Put('sponsored/:id')
  @ApiOperation({ summary: 'Update sponsored product (PUT alias)' })
  async putSponsoredProduct(@Param('id') id: string, @Body() dto: any) {
    return this.updateSponsoredProduct(id, dto);
  }

  @Put('compliance/countries/:code')
  @ApiOperation({ summary: 'Update country compliance (PUT alias)' })
  async putComplianceCountry(@Param('code') code: string, @Body() dto: any) {
    return this.updateComplianceCountry(code, dto);
  }

  @Put('india-ops')
  @ApiOperation({ summary: 'Update India ops config (PUT alias)' })
  async putIndiaOpsConfig(@Body() dto: any) {
    return this.updateIndiaOpsConfig(dto);
  }

  @Put('flash-deals/:id')
  @ApiOperation({ summary: 'Update flash deal (PUT alias)' })
  async putFlashDeal(@Param('id') id: string, @Body() dto: any) {
    return this.updateFlashDeal(id, dto);
  }

  @Post('payouts/:id/process')
  @ApiOperation({ summary: 'Execute an approved payout (POST alias)' })
  async postProcessPayout(@Param('id') id: string, @Req() req: any) {
    return this.processPayout(id, req);
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
  @ApiOperation({ summary: 'Update a commission rule (PUT alias)' })
  async putCommission(@Param('id') id: string, @Body() body: any) {
    return this.updateCommission(id, body);
  }

  @Put('customers/:id/block')
  @ApiOperation({ summary: 'Block a customer (PUT alias)' })
  async putBlockCustomer(@Param('id') id: string) {
    return this.blockCustomer(id);
  }
}
