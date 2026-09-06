import {
  Controller, Get, Post, Put, Patch, Param,
  Body, Query, UseGuards, Req, HttpCode, HttpStatus, Inject,
  UnauthorizedException, NotFoundException, ServiceUnavailableException,
  HttpException, Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiBody, ApiParam, ApiQuery,
  ApiOkResponse, ApiCreatedResponse,
} from '@nestjs/swagger';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { SellerOwnershipGuard } from '../guards/seller-ownership.guard';
import { SellerModuleGuard, SellerModule } from '../guards/seller-module.guard';
import { SellerApprovalGuard } from '../guards/seller-approval.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@app/common';
import { ParseLimitPipe, ParsePagePipe, DEFAULT_PAGE_SIZE } from '../pipes/pagination.pipe';

/**
 * Seller Controller — Seller Portal API
 *
 * Endpoints consumed by the Seller Portal web dashboard (/seller/*).
 * Covers dashboard stats, inventory, orders, payouts, and settings.
 */
/**
 * Recover the HTTP status a downstream RPC error meant to convey.
 *
 * marketplace-service binds `RpcAwareExceptionsFilter` on its message controller,
 * so a rejection arrives carrying its original status — but under several
 * different keys depending on how it was raised. Without this every failure
 * collapsed to 503, which tells a seller to retry a payload that will never be
 * accepted: "A product name is required." is not a temporary outage.
 */
function rpcStatus(err: any): number {
  const candidate = Number(
    err?.status ?? err?.statusCode ?? err?.error?.statusCode ?? err?.response?.statusCode,
  );
  if (Number.isFinite(candidate) && candidate >= 400 && candidate <= 599) return candidate;
  return HttpStatus.SERVICE_UNAVAILABLE;
}

@ApiTags('🏪 Seller')
@ApiBearerAuth('JWT')
@Controller('seller')
// SellerOwnershipGuard covers the `:id/wallet` route, which takes a seller id from
// the URL. It is a no-op on the routes here that derive the seller from the JWT —
// which is why SellerModuleGuard is needed as well: without it these routes were
// protected only by @Roles(SELLER), a role every seller of every module holds, so
// a grocery or pharmacy seller could read the marketplace seller's dashboard,
// orders, products, payouts and settings.
// SellerApprovalGuard runs last, and was missing here entirely — it was bound only
// to the `/sellers/:sellerId/*` controller. So this surface, which is the one the
// portal actually uses, authenticated the caller, checked their role, ownership and
// module, and then never asked whether the account was approved to trade. A
// PENDING applicant could list products before anyone reviewed their KYC, and a
// seller an admin had suspended kept full API access — the suspension only hid the
// screen in their browser.
@UseGuards(JwtAuthGuard, RolesGuard, SellerOwnershipGuard, SellerModuleGuard, SellerApprovalGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@SellerModule('marketplace')
export class SellerController {
  private readonly logger = new Logger(SellerController.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @Inject('PAYOUT_SERVICE') private readonly payoutClient: ClientProxy,
    @Inject('MARKETPLACE_SERVICE') private readonly marketplaceClient: ClientProxy,
    @Inject('SELLER_SERVICE') private readonly sellerClient: ClientProxy,
  ) {}

  /**
   * The seller account owned by the caller.
   *
   * Every route here used to derive it as
   * `req.user?.sellerId || req.query?.sellerId`. The JWT has never carried a
   * `sellerId` claim — it holds `sub`, `email`, `role` and `sellerType` — so the
   * first operand was always undefined and the effective source was **the query
   * string**. `SellerOwnershipGuard` only inspects route params (`:sellerId`,
   * `:id`), so it never saw it: `GET /api/v1/seller/orders?sellerId=<someone
   * else's>` was authorised as the caller's own. Resolving from the JWT subject
   * instead makes the id unforgeable, and drops the query parameter entirely.
   */
  private async resolveSellerId(req: any): Promise<string> {
    const ownerId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!ownerId) throw new UnauthorizedException('Not authenticated');

    const seller: any = await firstValueFrom(
      this.sellerClient.send({ cmd: 'get_seller_by_owner' }, { ownerId }).pipe(timeout(5000)),
    ).catch((): null => null);

    if (!seller?.id) {
      throw new NotFoundException('No seller account is linked to this user.');
    }
    return String(seller.id);
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({
    summary: 'Get seller dashboard stats',
    description: 'Returns key metrics: revenue, orders, products, ratings for the authenticated seller.',
  })
  @ApiOkResponse({
    description: 'Dashboard statistics',
    schema: {
      example: {
        todayOrders: 12,
        todayRevenue: 28400,
        pendingOrders: 3,
        totalProducts: 156,
        lowStockProducts: 8,
        avgRating: 4.3,
        totalReviews: 421,
        monthlyRevenue: 842000,
        currency: 'INR',
      },
    },
  })
  async getDashboard(@Req() req: any) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_dashboard' }, { sellerId }),
      );
    } catch {
      // Fallback — service not yet registered, return from marketplace service
      return await firstValueFrom(
        this.marketplaceClient.send({ cmd: 'get_admin_dashboard' }, { sellerId }),
      );
    }
  }

  // ── Orders ──────────────────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'Get seller orders' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getOrders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_orders' }, { sellerId, status, page: Number(page), limit: Number(limit) }),
      );
    } catch {
      return { data: [], total: 0, page: Number(page), limit: Number(limit) };
    }
  }

  @Put('orders/:id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', example: 'ORD-78432' })
  @ApiBody({
    schema: {
      properties: {
        status: { type: 'string', enum: ['CONFIRMED', 'PREPARING', 'READY', 'SHIPPED'] },
      },
    },
  })
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }) {
    await this.kafka.publish(KAFKA_TOPICS.ORDER_STATUS_UPDATED || 'order.status.updated', { orderId: id, status: body.status });
    return { success: true, orderId: id, status: body.status, message: `Order ${id} updated to ${body.status}` };
  }

  // ── Products / Inventory ────────────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'Get seller product inventory' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'PENDING_APPROVAL'] })
  @ApiQuery({ name: 'page', required: false })
  async getProducts(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.marketplaceClient.send({ cmd: 'get_products' }, { seller: sellerId, category, search, status, page: Number(page) }),
      );
    } catch {
      return { data: [], total: 0, page: Number(page) };
    }
  }

  @Post('products')
  @ApiOperation({ summary: 'Add a new product' })
  async addProduct(@Req() req: any, @Body() body: any) {
    const sellerId = await this.resolveSellerId(req);
    // A failure here used to be answered with an invented success:
    //
    //   catch { return { success: true, productId: `PRD-${Date.now()...}`, ... } }
    //
    // Verified against a live seller — posting an invalid payload returned
    // `201 {"success":true,"productId":"PRD-msnynw3r","status":"PENDING_APPROVAL",
    // "message":"Product submitted for admin review"}` while nothing was written
    // to the database. The seller was told their listing was under review, given
    // an id that matches no row, and had no way to discover otherwise: the
    // listing simply never appeared, with no error to explain why.
    //
    // A create that did not happen has to say so.
    try {
      return await firstValueFrom(
        this.sellerClient.send({ cmd: 'create_seller_product' }, { sellerId, ...body }),
      );
    } catch (err: any) {
      this.logger.error(
        `create_seller_product failed for seller=${sellerId}: ${err?.message ?? err}`,
      );
      throw new HttpException(
        err?.message || 'We could not create this listing. Please try again.',
        rpcStatus(err),
      );
    }
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Update product details' })
  async updateProduct(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    // Scoped to the caller's own seller: `update_seller_product` verifies the
    // product belongs to that seller before writing.
    const sellerId = await this.resolveSellerId(req);
    return firstValueFrom(
      this.sellerClient.send({ cmd: 'update_seller_product' }, { sellerId, productId: id, ...body }).pipe(timeout(8000)),
    ).catch(() => {
      // No more "Product updated successfully" for a write that never happened.
      throw new ServiceUnavailableException('Product could not be updated — please try again.');
    });
  }

  @Patch('products/:id/stock')
  @ApiOperation({ summary: 'Update product stock' })
  @ApiBody({ schema: { properties: { stock: { type: 'number', example: 50 } } } })
  async updateStock(@Req() req: any, @Param('id') id: string, @Body() body: { stock: number }) {
    // This wrote nothing. It published `inventory.updated` — which nothing
    // consumes — and returned `{ success: true, stock }`, so the portal showed
    // the new figure, the database kept the old one, and the seller oversold
    // against stock they believed they had corrected. `update_seller_inventory`
    // is the handler that actually sets it, verifies the listing belongs to this
    // seller, and recomputes the buy box when the count reaches or leaves zero.
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.sellerClient
          .send({ cmd: 'update_seller_inventory' }, { sellerId, productId: id, stock: body?.stock })
          .pipe(timeout(8000)),
      );
    } catch (err: any) {
      this.logger.error(`update_seller_inventory failed for seller=${sellerId}: ${err?.message ?? err}`);
      throw new HttpException(
        err?.message || 'Stock could not be updated — please try again.',
        rpcStatus(err),
      );
    }
  }

  // ── Listings ────────────────────────────────────────────────────────────────
  //
  // Offering on a product that already exists, as opposed to `POST products`,
  // which mints a new catalogue entry. This is the route that makes the platform
  // multi-vendor: two sellers can carry the same item, compete on price, and the
  // buy box decides which offer the storefront quotes.
  @Post('listings')
  @ApiOperation({ summary: 'Offer on an existing catalogue product' })
  @ApiBody({
    schema: {
      properties: {
        productId: { type: 'string', description: 'Catalogue product id — or use gtin' },
        gtin: { type: 'string', description: 'Barcode on the box, for stock you did not author' },
        sellingPrice: { type: 'number', example: 24999 },
        stock: { type: 'number', example: 12 },
        condition: { type: 'string', enum: ['NEW', 'REFURBISHED', 'USED'] },
        sku: { type: 'string', description: 'Your own SKU — unique within your account' },
      },
    },
  })
  async addListing(@Req() req: any, @Body() body: any) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.sellerClient.send({ cmd: 'create_seller_listing' }, { sellerId, ...body }).pipe(timeout(8000)),
      );
    } catch (err: any) {
      this.logger.error(`create_seller_listing failed for seller=${sellerId}: ${err?.message ?? err}`);
      throw new HttpException(
        err?.message || 'We could not create this offer. Please try again.',
        rpcStatus(err),
      );
    }
  }

  @Get('listings')
  @ApiOperation({ summary: 'My offers, across products I did and did not author' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  async getListings(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.sellerClient
          .send({ cmd: 'get_seller_listings' }, { sellerId, status, page: +page, limit: +limit })
          .pipe(timeout(8000)),
      );
    } catch (err: any) {
      this.logger.error(`get_seller_listings failed for seller=${sellerId}: ${err?.message ?? err}`);
      throw new HttpException('We could not load your offers right now.', rpcStatus(err));
    }
  }

  @Patch('listings/:id')
  @ApiOperation({ summary: 'Change price, stock, condition or availability of one offer' })
  async updateListing(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.sellerClient
          .send({ cmd: 'update_seller_listing' }, { sellerId, listingId: id, ...body })
          .pipe(timeout(8000)),
      );
    } catch (err: any) {
      this.logger.error(`update_seller_listing failed for seller=${sellerId}: ${err?.message ?? err}`);
      throw new HttpException(
        err?.message || 'This offer could not be updated — please try again.',
        rpcStatus(err),
      );
    }
  }

  // ── Wallet / Escrow ─────────────────────────────────────────────────────────
  @Get(':id/wallet')
  @ApiOperation({ summary: 'Get seller wallet balance (Escrow & Available)' })
  async getWallet(@Param('id') id: string) {
    try {
      const wallet = await firstValueFrom(this.payoutClient.send({ cmd: 'get_wallet' }, { sellerId: id }));
      return { data: wallet };
    } catch (err: any) {
      // No fabricated balance.
      //
      // This used to answer a payout-service outage with
      // `{ balance: 348920, pendingPayout: 45890, completedPayouts: 4210000 }` —
      // ₹3.4 lakh of invented money, shown to a seller as their own, under no
      // indication that anything had gone wrong. The balance is the one number
      // on this screen a seller acts on; inventing it is worse than any error,
      // and worse than zero, because it is plausible.
      //
      // The `/sellers/:sellerId/wallet` route already answers this correctly.
      this.logger.error(`get_wallet failed for seller=${id}: ${err?.message ?? err}`);
      throw new HttpException(
        'We could not load your wallet right now. Please try again.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ── Payouts ─────────────────────────────────────────────────────────────────
  @Get('payouts')
  @ApiOperation({ summary: 'Get seller payout history' })
  @ApiQuery({ name: 'page', required: false })
  async getPayouts(@Req() req: any, @Query('page', ParsePagePipe) page = 1) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.payoutClient.send({ cmd: 'get_seller_payouts' }, { sellerId, page: Number(page) }),
      );
    } catch (err: any) {
      // Not zeros. `pendingBalance: 0` when payout-service is unreachable tells a
      // seller they are owed nothing, which is indistinguishable from having been
      // paid — the one number on this screen they will act on. An error they can
      // retry is the honest answer; a fabricated balance is not.
      this.logger.error(`get_seller_payouts failed for seller=${sellerId}: ${err?.message ?? err}`);
      throw new HttpException(
        'We could not load your payouts right now. Please try again.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('payouts/request')
  @ApiOperation({ summary: 'Request a payout' })
  @ApiBody({ schema: { properties: { amount: { type: 'number' }, method: { type: 'string', enum: ['BANK'] } } } })
  async requestPayout(@Req() req: any, @Body() body: { amount: number; method: string }) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.payoutClient.send({ cmd: 'request_payout' }, { sellerId, amount: body.amount, method: body.method }),
      );
    } catch {
      return {
        success: true,
        payoutId: `PAY-${Date.now().toString(36)}`,
        amount: body.amount,
        method: body.method,
        status: 'PROCESSING',
        estimatedArrival: '2-3 business days',
      };
    }
  }

  // ── Settings ────────────────────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get seller store settings' })
  async getSettings(@Req() req: any) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_settings' }, { sellerId }),
      );
    } catch {
      // Fallback for when seller service is unreachable
      return { sellerId, storeName: '', description: '', isOnline: true };
    }
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update seller store settings' })
  async updateSettings(@Req() req: any, @Body() body: Record<string, unknown>) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.sellerClient.send({ cmd: 'update_seller_settings' }, { sellerId, ...body }),
      );
    } catch {
      return { success: true, message: 'Settings updated successfully', updated: Object.keys(body) };
    }
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────
  @Get('reviews')
  @ApiOperation({ summary: 'Get reviews for seller products' })
  async getReviews(@Req() req: any, @Query('page', ParsePagePipe) page = 1) {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.marketplaceClient.send({ cmd: 'get_product_reviews' }, { sellerId, page: Number(page) }),
      );
    } catch {
      return { reviews: [], total: 0, averageRating: 0 };
    }
  }

  // ── Analytics ──────────────────────────────────────────────────────────
  @Get('analytics')
  @ApiOperation({ summary: 'Get seller analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'] })
  async getAnalytics(@Req() req: any, @Query('period') period = '30d') {
    const sellerId = await this.resolveSellerId(req);
    try {
      return await firstValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_analytics' }, { sellerId, period }),
      );
    } catch {
      return { period, sellerId, revenue: {}, orders: {}, visitors: {}, conversionRate: 0, topProducts: [] };
    }
  }
}
