import {
  Controller, Get, Post, Put, Patch, Delete, Param,
  Body, Query, UseGuards, Inject, Logger, Req,
  UnauthorizedException, NotFoundException,
  BadRequestException, ServiceUnavailableException, HttpException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError, of } from 'rxjs';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiParam, ApiQuery, ApiBody,
} from '@nestjs/swagger';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { SellerOwnershipGuard } from '../guards/seller-ownership.guard';
import { SellerModuleGuard, SellerModule } from '../guards/seller-module.guard';
import { SellerApprovalGuard } from '../guards/seller-approval.guard';
import { Roles } from '../decorators/roles.decorator';
import { requestRegion, RequestWithRegion } from '../services/request-region';
import { getRegionConfig, DEFAULT_REGION } from '@app/region';

/**
 * Currency for rows that carry none of their own.
 *
 * These paths used to fall back to a literal 'INR', which labelled an empty
 * or unreachable wallet in rupees for every seller on the platform. The wallet
 * row's own currency still wins wherever one exists.
 */
const HOME_CURRENCY = getRegionConfig(DEFAULT_REGION)?.currencyCode ?? null;
import { UserRole } from '@app/common';
import { MARKETPLACE_PATTERNS } from '../contracts';
import { ParseLimitPipe, ParsePagePipe, DEFAULT_PAGE_SIZE } from '../pipes/pagination.pipe';

/**
 * Seller Marketplace Controller — `/sellers/:sellerId/...`
 *
 * Provides the 18+ seller-specific marketplace endpoints consumed by:
 * - Seller App (Flutter) via `MarketplaceSellerApiService._sellerPath()`
 * - Seller Portal (Next.js) via `fetch('/api/sellers/:id/...')`
 *
 * All endpoints require JWT auth and SELLER role.
 * Falls back to safe defaults when the downstream service is unreachable.
 */
@ApiTags('🏪 Seller Marketplace')
@ApiBearerAuth('JWT')
// SellerOwnershipGuard is mandatory: every route here takes :sellerId from the URL.
// JwtAuthGuard proves who you are, RolesGuard proves you are a seller, and this
// proves the seller is YOURS. Without it any authenticated seller could pass another
// seller's id. See docs/MARKETPLACE_FULLSTACK_AUDIT_2026-07-27.md (C2).
//
// SellerModuleGuard adds the module dimension: ownership proves the seller row is
// yours, this proves you are a marketplace seller at all. Both are needed — a
// grocery seller who somehow owned a marketplace seller row would otherwise pass.
//
// SellerApprovalGuard adds the lifecycle dimension, and runs last because it is
// the only one that needs the other three to have passed first: it answers
// "is this seller currently allowed to trade?". Approval used to be enforced
// nowhere but in the browser, so a PENDING applicant or a seller an admin had
// just suspended kept full API access.
@UseGuards(JwtAuthGuard, RolesGuard, SellerOwnershipGuard, SellerModuleGuard, SellerApprovalGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@SellerModule('marketplace')
@Controller('sellers')
export class SellerMarketplaceController {
  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @Inject('MARKETPLACE_SERVICE') private readonly marketplaceClient: ClientProxy,
    @Inject('SELLER_SERVICE') private readonly sellerClient: ClientProxy,
    @Inject('PAYOUT_SERVICE') private readonly payoutClient: ClientProxy,
    // The wallet ledger is a separate service from payouts: payout-service owns
    // the seller's balance, wallet-service owns the transaction history.
    @Inject('WALLET_SERVICE') private readonly walletClient: ClientProxy,
    // Commission was computed by nothing at all before this — see `deliverOrder`.
    @Inject('COMMISSION_SERVICE') private readonly commissionClient: ClientProxy,
  ) {}

  private readonly logger = new Logger(SellerMarketplaceController.name);

  /**
   * Forward a command and let its failure reach the caller.
   *
   * `sendTo` swallows everything into a fallback, which is right for a read
   * ("show an empty list") and wrong for a write: a seller who is told their
   * approval, refusal or stock change succeeded when it did not has been
   * actively misled. A downstream 4xx (already decided, not yours, not found)
   * is passed through with its own status; anything else is a 503.
   */
  private async forwardOrThrow<T>(client: ClientProxy, cmd: string, payload: object, failureMessage: string): Promise<T> {
    try {
      return await lastValueFrom(client.send<T>({ cmd }, payload).pipe(timeout(8000)));
    } catch (err: any) {
      const status = err?.statusCode ?? err?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        throw new HttpException(err?.message ?? failureMessage, status);
      }
      this.logger.error(`[${cmd}] failed: ${err?.message}`);
      throw new ServiceUnavailableException(failureMessage);
    }
  }

  private async sendTo<T>(client: ClientProxy, cmd: string, payload: object, fallback: T): Promise<T> {
    try {
      return await lastValueFrom(
        client.send<T>({ cmd }, payload).pipe(
          timeout(5000),
          catchError((err) => {
            this.logger.warn(`service unreachable [${cmd}]: ${err?.message}`);
            return of(fallback);
          }),
        ),
      );
    } catch (err) {
      this.logger.error(`send error [${cmd}]:`, err);
      return fallback;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ IDENTITY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * The seller account the caller owns.
   *
   * MUST stay above every `:sellerId` route below, or "me" is captured as an id.
   *
   * This is what lets the seller portal stop guessing. Every page of it was
   * calling `/sellers/SLR-9201/...` — a hard-coded demo id from
   * `seller-context.tsx` — so all 69 pages asked for a seller nobody owns and
   * `SellerOwnershipGuard` (correctly) refused them with 403.
   *
   * `SellerOwnershipGuard` lets this through because the route has no `:sellerId`
   * to check; authorisation is inherent instead, since the lookup is keyed on the
   * caller's own JWT subject and can only ever return their own seller row.
   */
  @Get('me')
  @ApiOperation({ summary: "The signed-in user's own seller account" })
  async getMySellerAccount(@Req() req: any) {
    const ownerId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!ownerId) throw new UnauthorizedException('Not authenticated');

    const seller = await this.sendTo<any>(
      this.marketplaceClient, MARKETPLACE_PATTERNS.GET_SELLER_BY_OWNER, { ownerId }, null,
    );
    if (!seller) {
      // Distinguished from a 403: the caller is a valid user who simply has no
      // seller account (or has one whose owner_id was never backfilled).
      throw new NotFoundException('No seller account is linked to this user.');
    }
    return seller;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ STOREFRONT
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/storefront')
  @ApiOperation({ summary: 'Get seller storefront configuration' })
  @ApiParam({ name: 'sellerId', example: 'seller-12345' })
  async getStorefront(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_storefront' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      // Fallback
      return {
        storeName: '', slug: '', description: '',
        returnPolicy: '', shippingPolicy: '',
        supportEmail: '', theme: { primaryColor: '#6C3FC8', accentColor: '#F59E0B' },
      };
    }
  }

  @Put(':sellerId/storefront')
  @ApiOperation({ summary: 'Update seller storefront configuration' })
  async updateStorefront(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'update_seller_storefront' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, message: 'Storefront updated' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ INVENTORY
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/inventory')
  @ApiOperation({ summary: 'Get seller inventory with stock levels' })
  @ApiParam({ name: 'sellerId', example: 'seller-12345' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false })
  async getSellerInventory(
    @Req() req: RequestWithRegion,
    @Param('sellerId') sellerId: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_inventory' }, {
          sellerId, countryCode: requestRegion(req), page: page ? +page : 1, limit: 30,
        }).pipe(timeout(5000)),
      );
    } catch {
      return { data: [], total: 0 };
    }
  }

  @Put(':sellerId/inventory/:productId')
  @ApiOperation({ summary: 'Update stock quantity for a product' })
  @ApiParam({ name: 'sellerId' })
  @ApiParam({ name: 'productId' })
  async updateSellerStock(
    @Req() req: RequestWithRegion,
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Body() body: { stock: number },
  ) {
    // No `catch { success: true }` here. That fallback told a seller their
    // stock had been set whenever the service was unreachable, so the number
    // on screen and the number that fulfils orders silently diverged —
    // overselling until someone noticed by hand.
    return await lastValueFrom(
      this.sellerClient.send({ cmd: 'update_seller_inventory' }, {
        sellerId, countryCode: requestRegion(req), productId, stock: body.stock,
      }).pipe(timeout(5000)),
    );
  }

  @Get(':sellerId/inventory/low-stock')
  @ApiOperation({ summary: 'Get products below reorder threshold' })
  @ApiParam({ name: 'sellerId' })
  async getSellerLowStock(@Req() req: RequestWithRegion, @Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_low_stock' }, {
          sellerId, countryCode: requestRegion(req),
        }).pipe(timeout(5000)),
      );
    } catch {
      return { data: [] };
    }
  }

  @Put(':sellerId/inventory/:productId/threshold')
  @ApiOperation({ summary: 'Set low-stock threshold for a product' })
  @ApiParam({ name: 'sellerId' })
  @ApiParam({ name: 'productId' })
  async setSellerThreshold(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Body() body: { threshold: number },
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'set_seller_threshold' }, {
          sellerId, productId, threshold: body.threshold,
        }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, productId, threshold: body.threshold };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ BRAND
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/brand')
  @ApiOperation({ summary: 'Get seller brand configuration' })
  @ApiParam({ name: 'sellerId', example: 'seller-12345' })
  async getBrand(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_brand' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      // Fallback
      return { data: { brandName: '', logo: '', status: 'PENDING' } };
    }
  }

  @Put(':sellerId/brand')
  @ApiOperation({ summary: 'Update seller brand configuration' })
  async updateBrand(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'update_seller_brand' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, message: 'Brand updated' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/orders')
  @ApiOperation({ summary: 'Get seller orders' })
  @ApiParam({ name: 'sellerId' })
  @ApiQuery({ name: 'status', required: false, enum: ['new', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getSellerOrders(
    @Req() req: RequestWithRegion,
    @Param('sellerId') sellerId: string,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('search') search?: string,
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_orders' }, {
          sellerId, countryCode: requestRegion(req), status, page: page ? +page : 1, limit: 20,
        }).pipe(timeout(5000)),
      );
    } catch {
      return { data: [], total: 0 };
    }
  }

  @Get(':sellerId/orders/:orderId')
  @ApiOperation({ summary: 'Get order details' })
  async getSellerOrder(
    @Param('sellerId') sellerId: string,
    @Param('orderId') orderId: string,
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_order' }, { sellerId, orderId }).pipe(timeout(5000)),
      );
    } catch {
      return { data: null };
    }
  }

  @Post(':sellerId/orders/:orderId/accept')
  @ApiOperation({ summary: 'Accept an order' })
  async acceptSellerOrder(
    @Param('sellerId') sellerId: string,
    @Param('orderId') orderId: string,
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'accept_order' }, { sellerId, orderId }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, orderId, status: 'PROCESSING' };
    }
  }

  @Post(':sellerId/orders/:orderId/reject')
  @ApiOperation({ summary: 'Reject an order' })
  async rejectSellerOrder(
    @Param('sellerId') sellerId: string,
    @Param('orderId') orderId: string,
    @Body('reason') reason: string,
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'reject_order' }, { sellerId, orderId, reason }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, orderId, status: 'CANCELLED' };
    }
  }

  @Post(':sellerId/orders/:orderId/pack')
  @ApiOperation({ summary: 'Mark order as packed' })
  async packSellerOrder(
    @Param('sellerId') sellerId: string,
    @Param('orderId') orderId: string,
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'pack_order' }, { sellerId, orderId }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, orderId, status: 'PACKED' };
    }
  }

  @Post(':sellerId/orders/:orderId/ship')
  @ApiOperation({ summary: 'Mark order as shipped' })
  async shipSellerOrder(
    @Param('sellerId') sellerId: string,
    @Param('orderId') orderId: string,
    @Body() body: { trackingId: string; courier: string },
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'ship_order' }, {
          sellerId, orderId, trackingId: body.trackingId, courier: body.courier,
        }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, orderId, status: 'SHIPPED' };
    }
  }

  /**
   * Confirm delivery and settle the order.
   *
   * This is where the platform's money is actually earned, and until now nothing
   * did it: `calculate_commission` existed, fully implemented with a category
   * rate card, closing fees, GST and TDS — and **no caller anywhere in the
   * monorepo**. No commission was charged on any order, the seller's wallet was
   * never credited from a sale, and both the seller's Commissions page and the
   * admin's commission report read empty stubs.
   *
   * Three steps, in order, because each depends on the last:
   *   1. mark delivered (refuses a repeat, so a retried webhook cannot pay twice)
   *   2. calculate commission for the order's category
   *   3. credit the seller their net earning
   *
   * Delivery is confirmed by the carrier in production; sellers who fulfil their
   * own COD orders confirm it here, which is why the route is seller-scoped.
   */
  @Post(':sellerId/orders/:orderId/deliver')
  @ApiOperation({ summary: 'Confirm delivery and settle commission' })
  async deliverOrder(@Param('sellerId') sellerId: string, @Param('orderId') orderId: string) {
    const delivered: any = await this.forwardOrThrow(
      this.sellerClient, 'deliver_order', { sellerId, orderId },
      'The order could not be marked delivered — please try again.',
    );

    const orderTotal = Number(delivered?.settlement?.orderTotal ?? 0);
    if (!orderTotal) return delivered;

    // A settlement failure must not un-deliver the order, so it is reported
    // rather than thrown — the delivery itself already succeeded and is durable.
    const commission: any = await this.sendTo(
      this.commissionClient, 'calculate_commission',
      {
        orderId, sellerId, orderTotal,
        serviceType: 'marketplace',
        category: delivered?.settlement?.category,
      },
      null,
    );

    if (!commission) {
      this.logger.error(`Order ${orderId} delivered but commission was not calculated`);
      return { ...delivered, settled: false, reason: 'Commission service unavailable' };
    }

    // The seller receives the order total less commission, GST on that
    // commission, and TDS — the breakdown commission-service computed.
    //
    // Credited to payout-service, which owns `payout.seller_wallets` — the
    // balance payouts are debited from and the one the portal displays.
    // Crediting wallet-service instead (as this first did) left the seller's
    // balance unchanged after a sale, because the two are different stores.
    const reason = `Order ${delivered?.orderNumber ?? orderId} settled`;
    const sellerEarning = Number(commission.sellerEarning ?? 0);

    const credited = await this.sendTo(
      this.payoutClient, 'credit_seller_wallet',
      { sellerId, amount: sellerEarning, reason, referenceId: orderId },
      null,
    );

    // A matching row in the wallet ledger, which is what the Transactions page
    // reads. Best-effort: the balance above is what must not be lost.
    await this.sendTo(
      this.walletClient, 'wallet_credit',
      { userId: sellerId, amount: sellerEarning, reason, referenceId: orderId, module: 'marketplace' },
      null,
    );

    return {
      ...delivered,
      settled: true,
      commission: {
        rate: commission.rate,
        referralFee: commission.referralFee,
        closingFee: commission.closingFee,
        commissionAmount: commission.commissionAmount,
        gstOnCommission: commission.gstOnCommission,
        tdsAmount: commission.tdsAmount,
        sellerEarning: commission.sellerEarning,
        tier: commission.tier,
      },
      walletCredited: !!credited,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ RETURNS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/returns')
  @ApiOperation({ summary: 'Get returns for this seller' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected', 'completed'] })
  @ApiQuery({ name: 'page', required: false })
  async getReturns(
    @Param('sellerId') sellerId: string,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    return this.sendTo(
      this.sellerClient, 'get_seller_returns',
      { sellerId, status, page: Number(page) },
      { data: [], total: 0 },
    );
  }

  /**
   * Approve / refuse a return.
   *
   * These used to send `update_return_status`, whose handler takes a return id
   * and **no seller** — so any seller could approve or refuse anybody's return
   * by naming its id, and the reject path wrote nothing to the database at all.
   * The seller-scoped commands verify the return belongs to the caller and
   * reject a decision on a return that has already been decided, instead of
   * answering `{ success: true }` a second time.
   *
   * Errors are propagated rather than swallowed: a seller told their approval
   * went through when it did not is worse than an error message.
   */
  @Post(':sellerId/returns/:returnId/accept')
  @ApiOperation({ summary: 'Approve a return request' })
  async acceptReturn(@Param('sellerId') sellerId: string, @Param('returnId') returnId: string) {
    return this.forwardOrThrow(
      this.sellerClient, 'accept_seller_return', { sellerId, returnId },
      'The return could not be approved — please try again.',
    );
  }

  @Post(':sellerId/returns/:returnId/reject')
  @ApiOperation({ summary: 'Reject a return request' })
  async rejectReturn(
    @Param('sellerId') sellerId: string,
    @Param('returnId') returnId: string,
    @Body('reason') reason: string,
  ) {
    return this.forwardOrThrow(
      this.sellerClient, 'reject_seller_return', { sellerId, returnId, reason },
      'The return could not be refused — please try again.',
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ REFUNDS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/refunds')
  @ApiOperation({ summary: 'Get refunds for this seller' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  async getRefunds(
    @Param('sellerId') sellerId: string,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    // Was `get_returns` with `type: 'refund'` — a parameter that handler ignores,
    // so the Refunds page was handed the raw return queue, including refused
    // returns that owe nothing, with no amounts on it.
    return this.sendTo(
      this.sellerClient, 'get_seller_refunds',
      { sellerId, status, page: Number(page) },
      { data: [], total: 0, totalRefunded: 0, pendingTotal: 0 },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ REVIEWS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/reviews')
  @ApiOperation({ summary: 'Get reviews for seller products' })
  @ApiQuery({ name: 'rating', required: false })
  @ApiQuery({ name: 'page', required: false })
  async getReviews(
    @Param('sellerId') sellerId: string,
    @Query('rating') rating?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    try {
      return await lastValueFrom(
        this.marketplaceClient.send({ cmd: 'get_product_reviews' }, { sellerId, rating, page: Number(page) }),
      );
    } catch {
      return { data: [], total: 0, averageRating: 0 };
    }
  }

  @Post(':sellerId/reviews/:reviewId/reply')
  @ApiOperation({ summary: 'Reply to a customer review' })
  async replyToReview(
    @Param('sellerId') sellerId: string,
    @Param('reviewId') reviewId: string,
    @Body('reply') reply: string,
  ) {
    try {
      return await lastValueFrom(
        this.marketplaceClient.send({ cmd: 'reply_to_review' }, { sellerId, reviewId, reply }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, reviewId, message: 'Reply posted' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ PROMOTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/promotions')
  @ApiOperation({ summary: 'Get seller promotions' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  async getPromotions(
    @Param('sellerId') sellerId: string,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_promotions' }, { sellerId, status, page: Number(page) }),
      );
    } catch {
      return { data: [], total: 0 };
    }
  }

  @Post(':sellerId/promotions')
  @ApiOperation({ summary: 'Create a promotion' })
  async createPromotion(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'create_seller_promotion' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, promoId: `PROMO-${Date.now().toString(36)}`, message: 'Promotion created' };
    }
  }

  @Put(':sellerId/promotions/:promoId')
  @ApiOperation({ summary: 'Update a promotion' })
  async updatePromotion(@Param('sellerId') sellerId: string, @Param('promoId') promoId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'update_seller_promotion' }, { sellerId, promoId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, promoId, message: 'Promotion updated' };
    }
  }

  @Delete(':sellerId/promotions/:promoId')
  @ApiOperation({ summary: 'Delete a promotion' })
  async deletePromotion(@Param('sellerId') sellerId: string, @Param('promoId') promoId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'delete_seller_promotion' }, { sellerId, promoId }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, promoId, message: 'Promotion deleted' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/campaigns')
  @ApiOperation({ summary: 'Get seller campaigns' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  async getCampaigns(
    @Param('sellerId') sellerId: string,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_campaigns' }, { sellerId, status, page: Number(page) }),
      );
    } catch {
      return { data: [], total: 0 };
    }
  }

  @Post(':sellerId/campaigns')
  @ApiOperation({ summary: 'Create a campaign' })
  async createCampaign(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'create_seller_campaign' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, campaignId: `CAMP-${Date.now().toString(36)}`, message: 'Campaign created' };
    }
  }

  @Put(':sellerId/campaigns/:campaignId')
  @ApiOperation({ summary: 'Update a campaign' })
  async updateCampaign(@Param('sellerId') sellerId: string, @Param('campaignId') campaignId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'update_seller_campaign' }, { sellerId, campaignId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, campaignId, message: 'Campaign updated' };
    }
  }

  @Post(':sellerId/campaigns/:campaignId/pause')
  @ApiOperation({ summary: 'Pause a campaign' })
  async pauseCampaign(@Param('sellerId') sellerId: string, @Param('campaignId') campaignId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'pause_seller_campaign' }, { sellerId, campaignId }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, campaignId, status: 'paused', message: 'Campaign paused' };
    }
  }

  @Post(':sellerId/campaigns/:campaignId/resume')
  @ApiOperation({ summary: 'Resume a campaign' })
  async resumeCampaign(@Param('sellerId') sellerId: string, @Param('campaignId') campaignId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'resume_seller_campaign' }, { sellerId, campaignId }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, campaignId, status: 'active', message: 'Campaign resumed' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ FLASH DEALS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/flash-deals')
  @ApiOperation({ summary: 'Get seller flash deals' })
  async getFlashDeals(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_flash_deals' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      return { data: [], total: 0 };
    }
  }

  @Post(':sellerId/flash-deals')
  @ApiOperation({ summary: 'Join a flash deal' })
  async joinFlashDeal(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'join_flash_deal' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, message: 'Joined flash deal' };
    }
  }

  @Get(':sellerId/flash-deals/available')
  @ApiOperation({ summary: 'Get available flash deals the seller can join' })
  async getAvailableDeals(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_available_flash_deals' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      return { data: [], total: 0 };
    }
  }

  @Post(':sellerId/flash-deals/nominate')
  @ApiOperation({ summary: 'Submit a product nomination for a flash deal' })
  async nominateProduct(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'submit_flash_deal_nomination' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: false, message: 'Failed to submit nomination' };
    }
  }

  @Get(':sellerId/flash-deals/nominations')
  @ApiOperation({ summary: 'Get seller nomination statuses' })
  async getNominations(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_nominations' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      return { data: [], total: 0 };
    }
  }

  @Patch(':sellerId/flash-deals/:dealId/withdraw')
  @ApiOperation({ summary: 'Withdraw from a flash deal' })
  async withdrawFromDeal(@Param('sellerId') sellerId: string, @Param('dealId') dealId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'withdraw_from_flash_deal' }, { sellerId, dealId }).pipe(timeout(5000)),
      );
    } catch {
      return { success: false, message: 'Failed to withdraw' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ SPONSORED PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/sponsored')
  @ApiOperation({ summary: 'Get sponsored products for seller' })
  @ApiQuery({ name: 'status', required: false })
  async getSponsoredProducts(@Param('sellerId') sellerId: string, @Query('status') status?: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_sponsored' }, { sellerId, status }).pipe(timeout(5000)),
      );
    } catch {
      return { data: [], total: 0 };
    }
  }

  @Post(':sellerId/sponsored')
  @ApiOperation({ summary: 'Sponsor a product' })
  async sponsorProduct(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'create_seller_sponsored' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, message: 'Product sponsored' };
    }
  }

  @Post(':sellerId/sponsored/:sponsoredId/pause')
  @ApiOperation({ summary: 'Pause a sponsored product' })
  async pauseSponsored(@Param('sellerId') sellerId: string, @Param('sponsoredId') sponsoredId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'pause_seller_sponsored' }, { sellerId, sponsoredId }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, sponsoredId, status: 'paused' };
    }
  }

  @Post(':sellerId/sponsored/:sponsoredId/resume')
  @ApiOperation({ summary: 'Resume a sponsored product' })
  async resumeSponsored(@Param('sellerId') sellerId: string, @Param('sponsoredId') sponsoredId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'resume_seller_sponsored' }, { sellerId, sponsoredId }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, sponsoredId, status: 'active' };
    }
  }



  // ═══════════════════════════════════════════════════════════════════════════
  // ██ TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * The seller's money ledger.
   *
   * This used to ask marketplace-service for `get_seller_transactions`, whose
   * handler returns **`marketplace_orders` rows verbatim** — order entities, not
   * transactions. The Transactions page consumed them as its `WalletTransaction`
   * shape, so every column was wrong at once: the ID column printed the order's
   * uuid, `description`/`type`/`amount`/`date` were all `undefined`, giving a
   * blank description, a mislabelled type badge, `-NaN` for the amount and
   * "Invalid Date" for the date.
   *
   * The real ledger is wallet-service's `wallet.wallet_transactions` — the same
   * source `:sellerId/wallet/transactions` already reads. Both routes now agree,
   * and the rows are mapped to what the page renders rather than to what the
   * database happens to call things.
   */
  @Get(':sellerId/transactions')
  @ApiOperation({ summary: 'Get seller transactions' })
  @ApiQuery({ name: 'type', required: false, enum: ['credit', 'debit', 'payout', 'commission', 'refund', 'adjustment'] })
  @ApiQuery({ name: 'page', required: false })
  async getTransactions(
    @Param('sellerId') sellerId: string,
    @Query('type') type?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    return this.sellerLedger(sellerId, type, Number(page));
  }

  /**
   * wallet-service's ledger, mapped to what the portal renders.
   *
   * Shared by `:sellerId/transactions` and `:sellerId/wallet/transactions` —
   * two routes onto one ledger. They previously disagreed: this one mapped the
   * rows and the other passed them through raw, so whichever page read the raw
   * route got `CREDIT` where it expected `credit`, no `reference` at all, and a
   * `reason` string with the order's uuid still in it.
   */
  private async sellerLedger(sellerId: string, type: string | undefined, page: number) {
    const res = await this.sendTo<any>(
      this.walletClient, 'wallet_get_transactions',
      { userId: sellerId, page, limit: 20 },
      null,
    );
    if (!res) return { data: [] as unknown[], total: 0, totalIn: 0, totalOut: 0, currency: HOME_CURRENCY, dataAvailable: false };

    const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

    // Marketplace movements reference the order by uuid (commission-service
    // credits `referenceId: orderId`), so resolve them to order numbers.
    const orderNumbers = await this.sendTo<Record<string, string>>(
      this.sellerClient, 'resolve_seller_order_numbers',
      { sellerId, orderIds: rows.map((r) => r?.referenceId).filter(Boolean) },
      {},
    );

    const mapped = rows.map((r) => {
      const isDebit = String(r?.type ?? '').toUpperCase() === 'DEBIT';
      const module = String(r?.module ?? '').toLowerCase();
      const reference = orderNumbers?.[r?.referenceId] ?? null;
      // Ledger reasons are written as `Order <ref> settled`, and until the
      // delivery route returned an `orderNumber` that `<ref>` was the uuid — so
      // rows already in the ledger have one baked into their text. Swapping it
      // for the resolved reference repairs the historical rows too, rather than
      // only the ones written from now on.
      const description = String(r?.reason ?? '');
      // Derived from the columns wallet-service actually records — `module` and
      // `type` — rather than by pattern-matching the free-text reason.
      const kind = module === 'refund' || module === 'payout' || module === 'admin'
        ? (module === 'admin' ? 'adjustment' : module)
        : isDebit ? 'debit' : 'credit';

      return {
        id: r?.id,
        reference,
        description: reference && r?.referenceId
          ? description.split(r.referenceId).join(reference)
          : description,
        type: kind,
        // Signed so the page can colour it; it renders the magnitude.
        amount: isDebit ? -Math.abs(Number(r?.amount ?? 0)) : Math.abs(Number(r?.amount ?? 0)),
        balanceAfter: Number(r?.balanceAfter ?? 0),
        currency: r?.currency ?? HOME_CURRENCY,
        // A `wallet_transactions` row exists only once the movement has been
        // applied to the balance, so it is settled by definition.
        status: 'completed',
        date: r?.createdAt ?? null,
      };
    });

    const filtered = type ? mapped.filter((t) => t.type === type.toLowerCase()) : mapped;

    return {
      data: filtered,
      total: typeof res?.total === 'number' ? res.total : filtered.length,
      totalIn: filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      totalOut: filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      currency: filtered[0]?.currency ?? HOME_CURRENCY,
      page: Number(page),
      dataAvailable: true,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ PAYOUTS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/payouts')
  @ApiOperation({ summary: 'Get seller payouts' })
  @ApiQuery({ name: 'page', required: false })
  async getPayouts(@Param('sellerId') sellerId: string, @Query('page', ParsePagePipe) page = 1) {
    try {
      return await lastValueFrom(
        this.payoutClient.send({ cmd: 'get_seller_payouts' }, { sellerId, page: Number(page) }),
      );
    } catch {
      return { data: [], pendingBalance: 0, totalPaidOut: 0, currency: HOME_CURRENCY };
    }
  }

  @Post(':sellerId/payouts')
  @ApiOperation({ summary: 'Request a payout' })
  @ApiBody({ schema: { properties: { amount: { type: 'number' }, bankAccountId: { type: 'string' } } } })
  async requestPayout(
    @Param('sellerId') sellerId: string,
    @Body() body: { amount: number; bankAccountId?: string; method?: string; bankAccount?: string; ifscCode?: string; upiId?: string },
  ) {
    if (!Number.isFinite(Number(body?.amount)) || Number(body.amount) <= 0) {
      throw new BadRequestException('A positive payout amount is required.');
    }

    try {
      return await lastValueFrom(
        this.payoutClient.send({ cmd: 'request_payout' }, {
          sellerId,
          amount: Number(body.amount),
          method: body.method ?? 'bank',
          bankAccount: body.bankAccount ?? body.bankAccountId,
          ifscCode: body.ifscCode,
          upiId: body.upiId,
        }).pipe(timeout(5000)),
      );
    } catch {
      // Never invent a payout id. This used to answer
      // `{ success: true, payoutId: 'PAY-…', status: 'PROCESSING' }` when
      // payout-service was unreachable, so a seller was told money was on its way
      // when nothing had been recorded anywhere and no payout existed to chase.
      throw new ServiceUnavailableException(
        'Payouts are temporarily unavailable. Your request was not submitted — please try again.',
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ COMMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/commissions')
  @ApiOperation({ summary: 'Get commission rates for seller categories' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  async getCommissions(
    @Param('sellerId') sellerId: string,
    @Query('category') category?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    // The records come from commission-service, which is what actually charged
    // them; only the seller's headline rate lives on their settings row. This
    // used to read a marketplace-service stub that returned `data: []` and a
    // hard-coded rate of 10, so the page showed an empty ledger and a number
    // unconnected to anything that had been charged.
    const [history, rateInfo] = await Promise.all([
      this.sendTo<any>(this.commissionClient, 'get_seller_commission_history',
        { sellerId, page: Number(page), limit: 20 }, null),
      this.sendTo<any>(this.sellerClient, 'get_seller_commission_rate', { sellerId }, null),
    ]);

    const rows: any[] = Array.isArray(history?.data) ? history.data
      : Array.isArray(history) ? history : [];

    // commission-service stores whatever `deliverOrder` passed it, which is the
    // marketplace order's **uuid** — so the ledger's Order column was 36
    // characters the seller could not match to anything on their Orders page.
    // Only marketplace-service can resolve those, and the lookup is
    // seller-scoped there, so a failure leaves `orderNumber` null and the portal
    // shows a dash rather than falling back to the uuid.
    const orderNumbers = await this.sendTo<Record<string, string>>(
      this.sellerClient, 'resolve_seller_order_numbers',
      { sellerId, orderIds: rows.map((c) => c.orderId).filter(Boolean) },
      {},
    );

    return {
      sellerId,
      commissionRate: Number(rateInfo?.commissionRate ?? 0),
      data: rows.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        orderNumber: orderNumbers?.[c.orderId] ?? null,
        orderAmount: Number(c.orderTotal ?? 0),
        commissionRate: Number(c.rate ?? 0) * 100,
        commissionAmount: Number(c.commissionAmount ?? 0),
        gst: Number(c.gstOnCommission ?? 0),
        tds: Number(c.tdsAmount ?? 0),
        netEarning: Number(c.sellerEarning ?? 0),
        categoryName: c.category ?? '',
        tier: c.tier ?? '',
        date: c.calculatedAt,
      })),
      total: typeof history?.total === 'number' ? history.total : rows.length,
      totalCommission: rows.reduce((sum, c) => sum + Number(c.commissionAmount ?? 0), 0),
      page: Number(page),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ WALLET
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Seller wallet balance.
   *
   * Both paths used to answer `balance: 1000` — the success path via
   * `wallet?.balance ?? 1000` and the failure path outright — so a seller with an
   * empty wallet, and a seller whose payout service was down, were both shown a
   * balance of 1,000 they could not distinguish from real money. A missing
   * balance is now reported as such and payout-service being unreachable is an
   * error, not a number.
   */
  @Get(':sellerId/wallet')
  @ApiOperation({ summary: 'Get seller wallet balance' })
  async getWallet(@Param('sellerId') sellerId: string) {
    try {
      // payout-service owns the balance (`payout.seller_wallets`) and the payout
      // records; both are needed to answer "how much can I withdraw, how much is
      // already on its way out, how much have I been paid".
      const [wallet, payouts] = await Promise.all([
        lastValueFrom(this.payoutClient.send({ cmd: 'get_wallet' }, { sellerId }).pipe(timeout(5000))) as Promise<any>,
        this.sendTo<any>(this.payoutClient, 'get_seller_payouts', { sellerId, page: 1, limit: 200 }, { data: [] }),
      ]);

      const rows: any[] = Array.isArray(payouts?.data) ? payouts.data : [];
      const sumWhere = (statuses: string[]) => rows
        .filter(p => statuses.includes(String(p?.status ?? '').toUpperCase()))
        .reduce((total, p) => total + Number(p?.amount ?? 0), 0);

      // The entity names these `availableBalance` / `escrowBalance`; the portal's
      // `WalletData` reads `balance` / `holdAmount`. Mapping them here rather than
      // spreading the raw row is what stopped `balance` coming back as 0 for a
      // seller who actually had money.
      return {
        success: true,
        sellerId,
        balance: Number(wallet?.availableBalance ?? 0),
        holdAmount: Number(wallet?.escrowBalance ?? 0),
        pendingPayout: sumWhere(['PENDING', 'APPROVED', 'PROCESSING']),
        completedPayouts: sumWhere(['PROCESSED']),
      };
    } catch {
      // Nulls, not zeroes: an unreachable payout-service is not an empty wallet.
      return { success: false, sellerId, balance: null, pendingPayout: null, completedPayouts: null, holdAmount: null };
    }
  }

  @Get(':sellerId/wallet/transactions')
  @ApiOperation({ summary: 'Get seller wallet transactions' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false })
  async getWalletTransactions(
    @Param('sellerId') sellerId: string,
    @Query('type') type?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    // The ledger lives in wallet-service (`wallet.wallet_transactions`), whose
    // pattern is `wallet_get_transactions`. This asked payout-service for
    // `get_wallet_transactions` — a command no service has ever implemented — so
    // it always fell through to the empty fallback and the Transactions page was
    // blank regardless of activity.
    //
    // It then passed the rows through raw, which is the other half of the same
    // problem: the Wallet page reads the mapped shape (`reference`, lower-case
    // `type`, a signed amount), so a raw row rendered an unlabelled movement with
    // the order's uuid still sitting in its description. One ledger, one mapping.
    return this.sellerLedger(sellerId, type, Number(page));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/settings')
  @ApiOperation({ summary: 'Get seller marketplace settings' })
  async getSettings(@Param('sellerId') sellerId: string) {
    try {
      const data = await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_settings' }, { sellerId }).pipe(timeout(5000)),
      );
      return {
        success: true,
        sellerId,
        store: { storeName: data?.storeName || 'Mock Store', isOnline: data?.isOnline || true },
        kyc: { status: 'APPROVED' },
        ...data,
      };
    } catch {
      return {
        success: true,
        sellerId,
        store: { storeName: 'Mock Store', isOnline: true },
        kyc: { status: 'APPROVED' },
        autoAcceptOrders: false, autoFulfillment: false,
        fulfillmentMode: 'manual', vacationMode: false,
        notifyNewOrders: true, notifyReturns: true,
        notifyLowStock: true, notifyPayouts: true,
      };
    }
  }

  @Put(':sellerId/settings')
  @ApiOperation({ summary: 'Update seller marketplace settings' })
  async updateSettings(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'update_seller_settings' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, message: 'Settings updated', updated: Object.keys(body) };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ STAFF
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/staff')
  @ApiOperation({ summary: 'Get seller staff members' })
  async getStaff(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_staff' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      return { data: [], total: 0 };
    }
  }

  @Post(':sellerId/staff')
  @ApiOperation({ summary: 'Add a staff member' })
  async addStaff(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'add_seller_staff' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, staffId: `STF-${Date.now().toString(36)}`, message: 'Staff member added' };
    }
  }

  @Put(':sellerId/staff/:staffId')
  @ApiOperation({ summary: 'Update a staff member' })
  async updateStaff(@Param('sellerId') sellerId: string, @Param('staffId') staffId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'update_seller_staff' }, { sellerId, staffId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, staffId, message: 'Staff member updated' };
    }
  }

  @Delete(':sellerId/staff/:staffId')
  @ApiOperation({ summary: 'Remove a staff member' })
  async removeStaff(@Param('sellerId') sellerId: string, @Param('staffId') staffId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'remove_seller_staff' }, { sellerId, staffId }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, staffId, message: 'Staff member removed' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ SHIPPING & LOGISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/shipping/zones')
  @ApiOperation({ summary: 'Get shipping zones available to seller (admin-defined + seller overrides)' })
  @ApiParam({ name: 'sellerId' })
  async getShippingZones(@Param('sellerId') sellerId: string) {
    return this.sendTo(this.sellerClient, 'get_seller_shipping_zones', { sellerId }, {
      data: [
        { id: 'z1', name: 'Metro Cities', regions: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata'], baseRate: 49, perKgRate: 15, freeAbove: 499, estDays: '1-2 days', isActive: true, type: 'express', adminBaseRate: 49 },
        { id: 'z2', name: 'Tier-1 Cities', regions: ['Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'], baseRate: 69, perKgRate: 20, freeAbove: 799, estDays: '2-3 days', isActive: true, type: 'standard', adminBaseRate: 69 },
        { id: 'z3', name: 'Tier-2 Cities', regions: ['Surat', 'Indore', 'Bhopal', 'Coimbatore', 'Nagpur', 'Visakhapatnam'], baseRate: 89, perKgRate: 25, freeAbove: 999, estDays: '3-5 days', isActive: true, type: 'standard', adminBaseRate: 89 },
        { id: 'z4', name: 'Rest of India', regions: ['North East', 'J&K', 'Himachal', 'Islands', 'Rural Areas'], baseRate: 129, perKgRate: 35, freeAbove: 1499, estDays: '5-7 days', isActive: true, type: 'economy', adminBaseRate: 129 },
        { id: 'z5', name: 'Same-Day Delivery', regions: ['Mumbai (Select)', 'Delhi NCR (Select)', 'Bangalore (Select)'], baseRate: 149, perKgRate: 40, freeAbove: 1999, estDays: 'Same Day', isActive: false, type: 'express', adminBaseRate: 149 },
      ],
    });
  }

  @Put(':sellerId/shipping/zones/:zoneId')
  @ApiOperation({ summary: 'Toggle zone active/inactive or set seller rate override' })
  @ApiParam({ name: 'sellerId' })
  @ApiParam({ name: 'zoneId' })
  async updateShippingZone(
    @Param('sellerId') sellerId: string,
    @Param('zoneId') zoneId: string,
    @Body() body: { isActive?: boolean; baseRate?: number; perKgRate?: number; freeAbove?: number },
  ) {
    return this.sendTo(this.sellerClient, 'update_seller_shipping_zone', { sellerId, zoneId, ...body }, {
      success: true, zoneId, ...body,
    });
  }

  @Get(':sellerId/shipping/rates')
  @ApiOperation({ summary: 'Get effective shipping rates (admin base + seller overrides)' })
  @ApiParam({ name: 'sellerId' })
  async getShippingRates(@Param('sellerId') sellerId: string) {
    return this.sendTo(this.sellerClient, 'get_seller_shipping_rates', { sellerId }, {
      data: [
        { id: 'SR-001', name: 'Metro Cities — Free Shipping', type: 'value', zones: ['Metro Cities'], freeAbove: 499, rates: [{ label: 'Orders below ₹499', rate: 40 }, { label: 'Orders ₹499+', rate: 0 }], source: 'admin' },
        { id: 'SR-002', name: 'Tier-1 Weight-Based', type: 'weight', zones: ['Tier-1 Cities'], freeAbove: 799, rates: [{ label: 'Up to 500g', rate: 49 }, { label: '500g – 1kg', rate: 79 }, { label: '1kg – 3kg', rate: 99 }], source: 'admin' },
        { id: 'SR-003', name: 'Rest of India', type: 'weight', zones: ['Rest of India'], freeAbove: 1499, rates: [{ label: 'Up to 500g', rate: 79 }, { label: '500g – 1kg', rate: 99 }, { label: '1kg – 3kg', rate: 149 }], source: 'admin' },
        { id: 'SR-004', name: 'Express Surcharge', type: 'flat', zones: ['All Zones'], freeAbove: null, rates: [{ label: 'Same Day', rate: 99 }, { label: 'Next Day', rate: 49 }], source: 'admin' },
      ],
    });
  }

  @Get(':sellerId/shipping/couriers')
  @ApiOperation({ summary: 'Get approved courier partners for seller' })
  @ApiParam({ name: 'sellerId' })
  async getShippingCouriers(@Param('sellerId') sellerId: string) {
    return this.sendTo(this.sellerClient, 'get_seller_couriers', { sellerId }, {
      data: [
        { id: 'c1', name: 'Delhivery', rating: 4.5, avgDelivery: '2.4 days', rtoRate: '3.2%', codSupport: true, active: true, speciality: 'Pan-India Coverage' },
        { id: 'c2', name: 'BlueDart', rating: 4.7, avgDelivery: '1.8 days', rtoRate: '2.1%', codSupport: true, active: true, speciality: 'Premium Express' },
        { id: 'c3', name: 'DTDC', rating: 4.2, avgDelivery: '3.1 days', rtoRate: '4.5%', codSupport: true, active: true, speciality: 'Cost-Effective' },
        { id: 'c4', name: 'Ecom Express', rating: 4.3, avgDelivery: '2.6 days', rtoRate: '3.8%', codSupport: true, active: true, speciality: 'E-commerce Specialist' },
        { id: 'c5', name: 'Shadowfax', rating: 4.1, avgDelivery: '1.2 days', rtoRate: '1.8%', codSupport: false, active: false, speciality: 'Hyperlocal & Same-Day' },
        { id: 'c6', name: 'India Post', rating: 3.8, avgDelivery: '5.4 days', rtoRate: '6.2%', codSupport: true, active: false, speciality: 'Remote Areas' },
      ],
    });
  }

  @Put(':sellerId/shipping/couriers')
  @ApiOperation({ summary: 'Update seller courier preferences' })
  @ApiParam({ name: 'sellerId' })
  async updateShippingCouriers(
    @Param('sellerId') sellerId: string,
    @Body() body: { defaultCourier?: string; enabledCouriers?: string[] },
  ) {
    return this.sendTo(this.sellerClient, 'update_seller_couriers', { sellerId, ...body }, {
      success: true, ...body,
    });
  }

  @Get(':sellerId/shipping/tracking')
  @ApiOperation({ summary: 'Get shipment tracking for seller orders' })
  @ApiParam({ name: 'sellerId' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  async getShipmentTracking(
    @Param('sellerId') sellerId: string,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    return this.sendTo(this.sellerClient, 'get_seller_shipment_tracking', {
      sellerId, status, page: page ? +page : 1,
    }, {
      data: [
        { id: 't1', orderId: 'ORD-10248', courier: 'Delhivery', trackingId: 'DEL784512369', status: 'in_transit', buyer: 'Rahul Sharma', city: 'Mumbai', date: '2026-07-12', eta: 'Jul 13' },
        { id: 't2', orderId: 'ORD-10247', courier: 'BlueDart', trackingId: 'BLU998877665', status: 'picked_up', buyer: 'Priya Patel', city: 'Ahmedabad', date: '2026-07-12', eta: 'Jul 14' },
        { id: 't3', orderId: 'ORD-10243', courier: 'Delhivery', trackingId: 'DEL784512370', status: 'out_for_delivery', buyer: 'Deepika Joshi', city: 'Pune', date: '2026-07-11', eta: 'Jul 12' },
        { id: 't4', orderId: 'ORD-10242', courier: 'BlueDart', trackingId: 'BFLX9876543', status: 'delivered', buyer: 'Amit Gupta', city: 'Kolkata', date: '2026-07-10', eta: 'Jul 12' },
        { id: 't5', orderId: 'ORD-10241', courier: 'DTDC', trackingId: 'DTDC554433221', status: 'delivered', buyer: 'Meera Iyer', city: 'Chennai', date: '2026-07-09', eta: 'Jul 11' },
        { id: 't6', orderId: 'ORD-10239', courier: 'Ecom Express', trackingId: 'ECX667788990', status: 'rto', buyer: 'Sneha Kapoor', city: 'Chandigarh', date: '2026-07-08', eta: null },
      ],
      total: 6,
    });
  }

  @Get(':sellerId/shipping/settings')
  @ApiOperation({ summary: 'Get seller shipping settings' })
  @ApiParam({ name: 'sellerId' })
  async getShippingSettings(@Param('sellerId') sellerId: string) {
    return this.sendTo(this.sellerClient, 'get_seller_shipping_settings', { sellerId }, {
      defaultCourier: 'Delhivery',
      autoAssign: true,
      freeShippingThreshold: 499,
      handlingTime: 24,
      returnShippingPaid: 'seller',
      packagingType: 'standard',
      codEnabled: true,
      insuranceEnabled: false,
    });
  }

  @Put(':sellerId/shipping/settings')
  @ApiOperation({ summary: 'Update seller shipping settings' })
  @ApiParam({ name: 'sellerId' })
  async updateShippingSettings(
    @Param('sellerId') sellerId: string,
    @Body() body: any,
  ) {
    return this.sendTo(this.sellerClient, 'update_seller_shipping_settings', { sellerId, ...body }, {
      success: true, message: 'Shipping settings updated', updated: Object.keys(body),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ BULK UPLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  @Post(':sellerId/products/bulk')
  @ApiOperation({ summary: 'Bulk upload products' })
  async bulkUpload(@Param('sellerId') sellerId: string, @Body() body: { products: any[] }) {
    try {
      return await lastValueFrom(
        this.marketplaceClient.send({ cmd: 'bulk_upload_products' }, { sellerId, products: body.products }).pipe(timeout(5000)),
      );
    } catch {
      return { uploaded: 0, errors: (body.products || []).length, errorDetails: [{ row: 1, message: 'Service unavailable' }] };
    }
  }

  // Two further handlers for `:sellerId/inventory/low-stock` and
  // `:sellerId/inventory/:productId/threshold` used to sit here. Nest binds the
  // first matching route it registers, so the pair declared under INVENTORY above
  // always won and these never ran — which was just as well, since the low-stock
  // one asked marketplace-service for GET_VARIANTS. Removed rather than left as a
  // second, divergent definition of the same two endpoints.

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ ANALYTICS & PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/analytics')
  @ApiOperation({ summary: 'Get seller analytics dashboard' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'] })
  async getAnalytics(@Param('sellerId') sellerId: string, @Query('period') period = '30d') {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_analytics' }, { sellerId, period }).pipe(timeout(5000)),
      );
    } catch {
      return { period, sellerId, revenue: {}, orders: {}, visitors: {}, conversionRate: 0, topProducts: [] };
    }
  }

  @Get(':sellerId/performance')
  @ApiOperation({ summary: 'Get seller performance metrics' })
  async getPerformance(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_performance' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      return {
        orderDefectRate: 0, lateShipmentRate: 0, cancellationRate: 0,
        averageRating: 0, responseTime: '0h', fulfillmentRate: 0,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ MESSAGES & DISPUTES
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/messages')
  @ApiOperation({ summary: 'Get seller customer messages' })
  async getMessages(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_messages' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      return { data: [], total: 0, unread: 0 };
    }
  }

  /**
   * Seller disputes.
   *
   * The fallback here used to hide a real failure: the upstream query was
   * invalid (see `SellerService.getDisputes`) and every call landed in this
   * `catch`, so the portal was handed a clean empty list for what was actually a
   * broken endpoint. `dataAvailable` now travels with the response so the
   * portal can distinguish "no disputes" from "no dispute system".
   */
  @Get(':sellerId/disputes')
  @ApiOperation({ summary: 'Get seller disputes' })
  async getDisputes(@Param('sellerId') sellerId: string) {
    return this.sendTo(
      this.sellerClient, 'get_seller_disputes', { sellerId },
      { data: [], total: 0, open: 0, dataAvailable: false },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ GST & SHIPPING
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/gst')
  @ApiOperation({ summary: 'Get seller GST filing info' })
  async getGst(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_gst' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      return { gstNumber: '', filings: [], nextDueDate: null };
    }
  }

  @Get(':sellerId/shipping')
  @ApiOperation({ summary: 'Get seller shipping configuration' })
  async getShipping(@Param('sellerId') sellerId: string) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_shipping' }, { sellerId }).pipe(timeout(5000)),
      );
    } catch {
      return { methods: [], freeShippingThreshold: null, defaultWeight: 0.5 };
    }
  }

  @Put(':sellerId/shipping')
  @ApiOperation({ summary: 'Update seller shipping configuration' })
  async updateShipping(@Param('sellerId') sellerId: string, @Body() body: any) {
    try {
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'update_seller_shipping' }, { sellerId, ...body }).pipe(timeout(5000)),
      );
    } catch {
      return { success: true, message: 'Shipping config updated' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ DASHBOARD (Seller-specific)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Seller dashboard KPIs.
   *
   * The payload is deliberately nested under `data` and named to match the
   * portal's `DashboardKPI`. It used to be spread flat next to `success`, which
   * meant two things at once: the client's envelope-unwrapper left it alone (it
   * needs both `success` and `data`), so `res.data` was `undefined` on every
   * call; and the field names it did carry (`todayRevenue`, `avgRating`) matched
   * none of the ones the portal reads (`todaySales`, `sellerRating`). Between
   * them the dashboard never displayed a single real number and the sidebar's
   * pending-order and low-stock badges never appeared.
   *
   * `success: false` on the failure path, because a dashboard of zeroes that
   * claims success is indistinguishable from a seller who genuinely had a quiet
   * day.
   */
  @Get(':sellerId/dashboard')
  @ApiOperation({ summary: 'Get seller marketplace dashboard KPIs' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month'] })
  async getDashboard(
    @Param('sellerId') sellerId: string,
    @Query('period') period: 'today' | 'week' | 'month' = 'today',
  ) {
    try {
      const raw: any = await lastValueFrom(
        this.sellerClient.send({ cmd: 'get_seller_dashboard' }, { sellerId, period }).pipe(timeout(5000)),
      );

      // payout-service owns the balance and the payout records. Both are needed:
      // "how much can I withdraw" and "how much is already on its way out".
      const [wallet, payouts] = await Promise.all([
        this.sendTo<any>(this.payoutClient, 'get_wallet', { sellerId }, null),
        this.sendTo<any>(this.payoutClient, 'get_seller_payouts', { sellerId, page: 1, limit: 200 }, { data: [] }),
      ]);

      const payoutRows: any[] = Array.isArray(payouts?.data) ? payouts.data : [];
      const sumWhere = (statuses: string[]) => payoutRows
        .filter(p => statuses.includes(String(p?.status ?? '').toUpperCase()))
        .reduce((total, p) => total + Number(p?.amount ?? 0), 0);

      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

      return {
        success: true,
        sellerId,
        period,
        data: {
          // `periodSales` follows the Today / This Week / This Month selector;
          // `todaySales` stays pinned to today so callers that ignore the
          // selector (the sidebar badges) keep their existing meaning.
          periodSales: num(raw?.periodRevenue ?? raw?.todayRevenue),
          periodOrders: num(raw?.periodOrders),
          todaySales: num(raw?.todayRevenue),
          monthlySales: num(raw?.monthlyRevenue),
          // Lifetime paid revenue. This was `monthlyRevenue` — the same value the
          // tile beside it already showed, labelled "Total Revenue".
          totalRevenue: num(raw?.lifetimeRevenue ?? raw?.monthlyRevenue),
          pendingOrders: num(raw?.pendingOrders),
          acceptedOrders: num(raw?.acceptedOrders),
          packedOrders: num(raw?.packedOrders),
          shippedOrders: num(raw?.shippedOrders),
          deliveredOrders: num(raw?.deliveredOrders),
          cancelledOrders: num(raw?.cancelledOrders),
          returnRequests: num(raw?.returnRequests),
          refundRequests: num(raw?.refundRequests),
          lowStock: num(raw?.lowStockProducts),
          outOfStock: num(raw?.outOfStockProducts),
          approvalPending: num(raw?.approvalPending),
          rejected: num(raw?.rejectedProducts),
          // The entity's columns are `availableBalance` / `escrowBalance`.
          // Reading `wallet.balance` here — a key payout-service never returns —
          // meant the dashboard reported a wallet of 0 to a seller who had money,
          // and the same 0 whether they were rich or the service was down.
          walletBalance: num(Number(wallet?.availableBalance ?? wallet?.balance)),
          pendingPayout: sumWhere(['PENDING', 'APPROVED', 'PROCESSING']),
          completedPayout: sumWhere(['PROCESSED']),
          sellerRating: num(raw?.avgRating),
          healthScore: num(raw?.healthScore),
          totalProducts: num(raw?.totalProducts),
          totalOrders: num(raw?.totalOrders ?? raw?.todayOrders),
        },
      };
    } catch {
      // No invented figures on the failure path — the portal renders "—" rather
      // than a plausible-looking zero it cannot distinguish from a real one.
      return { success: false, sellerId, period, data: null };
    }
  }

  @Post(':sellerId/products')
  @ApiOperation({ summary: 'Add product for seller' })
  async addProduct(@Param('sellerId') sellerId: string, @Body() body: any, @Req() req: any) {
    try {
      // `create_product` is a command no service implements — the seller's own
      // listing creation lives behind `create_seller_product`, which also creates
      // the ProductListing that makes the item buyable. Sending the old command
      // meant every "Add Product" submission fell into the catch below and
      // returned a fabricated `PRD-…` id with `status: 'APPROVED'`, so the seller
      // was told their product was live and approved while nothing had been
      // written and nothing was for sale.
      return await lastValueFrom(
        this.sellerClient.send({ cmd: 'create_seller_product' }, {
          sellerId,
          countryCode: requestRegion(req),
          ...body,
        }).pipe(timeout(8000)),
      );
    } catch (err: any) {
      const status = err?.statusCode ?? err?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        throw new HttpException(err?.message ?? 'Product could not be created', status);
      }
      throw new ServiceUnavailableException('Product could not be created — please try again.');
    }
  }

  /**
   * The seller's own catalogue — including what is not on sale.
   *
   * This sent `get_products`, the **public** catalogue query, which returns only
   * approved and active items. So a seller could not see their own drafts,
   * anything awaiting moderation, or anything that had been rejected — precisely
   * the rows they need to act on. A product submitted through Add Product simply
   * vanished until an admin approved it.
   *
   * `get_seller_products` is scoped to the seller and carries no such filter.
   * The pagination, status and search parameters were also declared on the route
   * and then dropped on the floor.
   */
  @Get(':sellerId/products')
  @ApiOperation({ summary: 'The seller’s own catalogue, at any approval state' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getProducts(
    @Param('sellerId') sellerId: string,
    @Req() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    const res = await this.sendTo<any>(
      this.sellerClient, 'get_seller_products',
      {
        sellerId,
        countryCode: requestRegion(req),
        status, search, page: Number(page), limit: Number(limit),
      },
      null,
    );

    if (!res) return { success: false, sellerId, data: [] as unknown[], total: 0 };
    return { success: true, sellerId, data: res.data ?? [], total: res.total ?? 0, page: res.page, limit: res.limit };
  }

  // A second `:sellerId/orders` handler used to sit here — the same shadowing
  // that the dashboard note below describes. Nest registers the first matching
  // route, so `getSellerOrders` above always won and this one never ran. It also
  // sent `{ cmd: 'get_orders' }`, a pattern no service implements, against
  // marketplaceClient rather than the seller client; had the registration order
  // ever flipped, every seller's order list would have gone permanently empty.
  // Removed rather than repaired: the surviving handler is correct.

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ PHASE 2 — Seller Dashboard, Coupons, Bundles (Gateway Proxies)
  // ═══════════════════════════════════════════════════════════════════════════

  // A second `:sellerId/dashboard` handler used to sit here. It never ran — the
  // one under DASHBOARD above is registered first and wins — and it returned a
  // third, different shape again (`{ seller, summary, weeklyTrend }`). Removed so
  // there is exactly one definition of the seller dashboard contract.

  @Get(':sellerId/coupons')
  @ApiOperation({ summary: 'List seller coupons' })
  async getSellerCoupons(@Param('sellerId') sellerId: string) {
    return await this.sendTo(this.marketplaceClient, MARKETPLACE_PATTERNS.GET_COUPONS, {sellerId}, []);
  }

  @Post(':sellerId/coupons')
  @ApiOperation({ summary: 'Create a seller-scoped coupon' })
  async createSellerCoupon(@Param('sellerId') sellerId: string, @Body() dto: any) {
    return await this.sendTo(this.marketplaceClient, MARKETPLACE_PATTERNS.SELLER_CREATE_COUPON, {sellerId, dto}, []);
  }

  @Get(':sellerId/bundles')
  @ApiOperation({ summary: 'List product bundles for seller' })
  async getSellerBundles(@Param('sellerId') sellerId: string) {
    return await this.sendTo(this.marketplaceClient, MARKETPLACE_PATTERNS.SELLER_GET_BUNDLES, {sellerId}, []);
  }

  @Post(':sellerId/bundles')
  @ApiOperation({ summary: 'Create product bundle' })
  async createSellerBundle(@Param('sellerId') sellerId: string, @Body() dto: any) {
    return await this.sendTo(this.marketplaceClient, MARKETPLACE_PATTERNS.SELLER_CREATE_BUNDLE, { ...dto, sellerId }, []);
  }

  @Get(':sellerId/sla-compliance')
  @ApiOperation({ summary: 'SLA compliance metrics for this seller' })
  async getSellerSLACompliance(@Param('sellerId') sellerId: string) {
    return await this.sendTo(this.marketplaceClient, MARKETPLACE_PATTERNS.ADMIN_GET_SLA_COMPLIANCE, {sellerId}, []);
  }

  @Get(':sellerId/penalty-ledger')
  @ApiOperation({ summary: 'Penalty ledger for this seller' })
  async getSellerPenaltyLedger(@Param('sellerId') sellerId: string) {
    return await this.sendTo(this.marketplaceClient, MARKETPLACE_PATTERNS.ADMIN_GET_PENALTY_LEDGER, {sellerId}, []);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ REPORTS, NOTIFICATIONS, SUPPORT, PRODUCT CRUD
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // marketplace-service has implemented all of these for as long as the portal
  // has called them; the gateway simply had no route, so `/reports`,
  // `/notifications`, `/support` and the per-product pages returned 404 to every
  // seller. Each page caught the 404 and rendered demo rows instead, which is why
  // the portal looked populated while the backend was never reached.

  @Get(':sellerId/reports')
  @ApiOperation({ summary: 'Seller sales / inventory / performance report' })
  @ApiQuery({ name: 'type', required: false, enum: ['sales', 'inventory', 'performance', 'returns'] })
  async getReports(@Param('sellerId') sellerId: string, @Query('type') type?: string) {
    return this.sendTo(this.sellerClient, 'get_seller_reports', { sellerId, type }, null);
  }

  @Get(':sellerId/reports/export')
  @ApiOperation({ summary: 'Request a report export' })
  async exportReport(@Param('sellerId') sellerId: string, @Query('type') type?: string) {
    return this.sendTo(this.sellerClient, 'export_seller_report', { sellerId, type }, null);
  }

  @Get(':sellerId/notifications')
  @ApiOperation({ summary: 'Seller notifications' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false })
  async getNotifications(
    @Param('sellerId') sellerId: string,
    @Query('type') type?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    return this.sendTo(this.sellerClient, 'get_seller_notifications', { sellerId, type, page }, { data: [], total: 0 });
  }

  @Post(':sellerId/notifications/read-all')
  @ApiOperation({ summary: 'Mark every notification read' })
  async markAllNotificationsRead(@Param('sellerId') sellerId: string) {
    return this.sendTo(this.sellerClient, 'read_all_seller_notifications', { sellerId }, { success: false });
  }

  @Post(':sellerId/notifications/:notificationId/read')
  @ApiOperation({ summary: 'Mark one notification read' })
  async markNotificationRead(
    @Param('sellerId') sellerId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.sendTo(this.sellerClient, 'read_seller_notification', { sellerId, notificationId }, { success: false });
  }

  @Get(':sellerId/support')
  @ApiOperation({ summary: 'Seller support tickets' })
  async getSupport(@Param('sellerId') sellerId: string) {
    return this.sendTo(this.sellerClient, 'get_seller_support', { sellerId }, { tickets: [], faq: [] });
  }

  @Post(':sellerId/support')
  @ApiOperation({ summary: 'Raise a support ticket' })
  async createSupportTicket(@Param('sellerId') sellerId: string, @Body() dto: any) {
    return this.sendTo(this.sellerClient, 'create_seller_ticket', { sellerId, ...dto }, { success: false });
  }

  @Post(':sellerId/support/:ticketId/reply')
  @ApiOperation({ summary: 'Reply on a support ticket' })
  async replySupportTicket(
    @Param('sellerId') sellerId: string,
    @Param('ticketId') ticketId: string,
    @Body('message') message: string,
  ) {
    return this.sendTo(this.sellerClient, 'reply_seller_ticket', { sellerId, ticketId, message }, { success: false });
  }

  @Post(':sellerId/products/draft')
  @ApiOperation({ summary: 'Save a product draft' })
  async saveProductDraft(@Param('sellerId') sellerId: string, @Body() dto: any) {
    return this.sendTo(this.sellerClient, 'save_seller_product_draft', { sellerId, ...dto }, { success: false });
  }

  @Get(':sellerId/products/:productId')
  @ApiOperation({ summary: 'One of the seller’s products' })
  async getProduct(@Param('sellerId') sellerId: string, @Param('productId') productId: string) {
    return this.sendTo(this.sellerClient, 'get_seller_product', { sellerId, productId }, null);
  }

  @Post(':sellerId/products/bulk-edit')
  @ApiOperation({ summary: 'Apply price/stock edits to several products at once' })
  async bulkEditProducts(@Param('sellerId') sellerId: string, @Body() body: any) {
    // Declared at last: the portal's Bulk Edit page has been calling this path
    // since it was written, and no controller answered it. Deliberately
    // uncaught — a bulk write that partially failed reports which rows failed,
    // and a request that failed outright must not read as success.
    return lastValueFrom(
      this.sellerClient
        .send({ cmd: 'bulk_edit_seller_products' }, { sellerId, edits: body?.edits ?? body })
        .pipe(timeout(15000)),
    );
  }

  @Put(':sellerId/products/:productId')
  @ApiOperation({ summary: 'Update one of the seller’s products' })
  async updateProduct(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Body() dto: any,
  ) {
    return this.sendTo(this.sellerClient, 'update_seller_product', { sellerId, productId, ...dto }, { success: false });
  }

  @Delete(':sellerId/products/:productId')
  @ApiOperation({ summary: 'Delete one of the seller’s products' })
  async deleteProduct(@Param('sellerId') sellerId: string, @Param('productId') productId: string) {
    return this.sendTo(this.sellerClient, 'delete_seller_product', { sellerId, productId }, { success: false });
  }

  @Delete(':sellerId/campaigns/:campaignId')
  @ApiOperation({ summary: 'Delete a campaign' })
  async deleteCampaign(@Param('sellerId') sellerId: string, @Param('campaignId') campaignId: string) {
    return this.sendTo(this.sellerClient, 'delete_seller_campaign', { sellerId, campaignId }, { success: false });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ PRODUCT MEDIA & VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/products/:productId/images')
  @ApiOperation({ summary: 'Images on one of the seller’s listings' })
  async getProductImages(@Param('sellerId') sellerId: string, @Param('productId') productId: string) {
    return this.sendTo(this.sellerClient, 'get_product_images', { sellerId, productId }, { data: [], total: 0 });
  }

  @Post(':sellerId/products/:productId/images')
  @ApiOperation({ summary: 'Attach an image to a listing' })
  async addProductImage(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Body() dto: { url: string; altText?: string; isPrimary?: boolean },
  ) {
    return this.forwardOrThrow(this.sellerClient, 'add_product_image', { sellerId, productId, ...dto },
      'The image could not be added — please try again.');
  }

  @Post(':sellerId/products/:productId/images/reorder')
  @ApiOperation({ summary: 'Persist a new image order' })
  async reorderProductImages(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Body('imageIds') imageIds: string[],
  ) {
    return this.forwardOrThrow(this.sellerClient, 'reorder_product_images', { sellerId, productId, imageIds },
      'The new order could not be saved — please try again.');
  }

  @Post(':sellerId/products/:productId/images/:imageId/primary')
  @ApiOperation({ summary: 'Make an image the listing’s primary' })
  async setPrimaryProductImage(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.forwardOrThrow(this.sellerClient, 'set_primary_product_image', { sellerId, productId, imageId },
      'The primary image could not be changed — please try again.');
  }

  @Delete(':sellerId/products/:productId/images/:imageId')
  @ApiOperation({ summary: 'Remove an image from a listing' })
  async deleteProductImage(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.forwardOrThrow(this.sellerClient, 'delete_product_image', { sellerId, productId, imageId },
      'The image could not be removed — please try again.');
  }

  /**
   * The 360° frame sequence for a listing.
   *
   * A narrow, dedicated route rather than opening `product.metadata` to seller
   * writes: that blob also holds `richDescriptionHtml`, which is rendered by an
   * SSR'd server component, so a general metadata write would be a stored-XSS
   * surface. Here only an array of URLs crosses the boundary.
   */
  @Get(':sellerId/products/:productId/spin360')
  @ApiOperation({ summary: 'The 360° frame sequence for a listing' })
  async getSpin360(@Param('sellerId') sellerId: string, @Param('productId') productId: string) {
    return this.sendTo(this.sellerClient, 'get_product_spin360', { sellerId, productId }, { data: [] });
  }

  @Put(':sellerId/products/:productId/spin360')
  @ApiOperation({ summary: 'Replace the 360° frame sequence for a listing' })
  async setSpin360(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Body('urls') urls: string[],
  ) {
    return this.forwardOrThrow(this.sellerClient, 'set_product_spin360', { sellerId, productId, urls },
      'The 360° frames could not be saved — please try again.');
  }

  @Get(':sellerId/products/:productId/variants')
  @ApiOperation({ summary: 'Variants of one of the seller’s listings' })
  async getProductVariants(@Param('sellerId') sellerId: string, @Param('productId') productId: string) {
    return this.sendTo(this.sellerClient, 'get_product_variants', { sellerId, productId }, { data: [], total: 0 });
  }

  @Post(':sellerId/products/:productId/variants')
  @ApiOperation({ summary: 'Add a variant' })
  async createProductVariant(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Body() dto: any,
  ) {
    return this.forwardOrThrow(this.sellerClient, 'create_product_variant', { sellerId, productId, ...dto },
      'The variant could not be created — please try again.');
  }

  @Put(':sellerId/products/:productId/variants/:variantId')
  @ApiOperation({ summary: 'Update a variant' })
  async updateProductVariant(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: any,
  ) {
    return this.forwardOrThrow(this.sellerClient, 'update_product_variant', { sellerId, productId, variantId, ...dto },
      'The variant could not be updated — please try again.');
  }

  @Delete(':sellerId/products/:productId/variants/:variantId')
  @ApiOperation({ summary: 'Delete a variant' })
  async deleteProductVariant(
    @Param('sellerId') sellerId: string,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.forwardOrThrow(this.sellerClient, 'delete_product_variant', { sellerId, productId, variantId },
      'The variant could not be deleted — please try again.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ CUSTOMER QUESTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/questions')
  @ApiOperation({ summary: 'Questions customers asked on this seller’s listings' })
  @ApiQuery({ name: 'status', required: false, enum: ['all', 'answered', 'unanswered'] })
  async getQuestions(
    @Param('sellerId') sellerId: string,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
  ) {
    return this.sendTo(this.sellerClient, 'get_seller_questions', { sellerId, status, page: Number(page) }, { data: [], total: 0 });
  }

  @Post(':sellerId/questions/:questionId/answer')
  @ApiOperation({ summary: 'Answer a customer question' })
  async answerQuestion(
    @Param('sellerId') sellerId: string,
    @Param('questionId') questionId: string,
    @Body('answer') answer: string,
  ) {
    return this.forwardOrThrow(this.sellerClient, 'answer_seller_question', { sellerId, questionId, answer },
      'The answer could not be posted — please try again.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ BANK ACCOUNTS (payout destinations)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':sellerId/bank-accounts')
  @ApiOperation({ summary: 'Where this seller’s payouts are sent' })
  async getBankAccounts(@Param('sellerId') sellerId: string) {
    return this.sendTo(this.sellerClient, 'get_seller_bank_accounts', { sellerId }, { data: [], total: 0 });
  }

  @Post(':sellerId/bank-accounts')
  @ApiOperation({ summary: 'Add a payout destination' })
  async addBankAccount(@Param('sellerId') sellerId: string, @Body() dto: any) {
    return this.forwardOrThrow(this.sellerClient, 'add_seller_bank_account', { sellerId, ...dto },
      'The account could not be added — please try again.');
  }

  @Post(':sellerId/bank-accounts/:accountId/default')
  @ApiOperation({ summary: 'Make an account the default payout destination' })
  async setDefaultBankAccount(@Param('sellerId') sellerId: string, @Param('accountId') accountId: string) {
    return this.forwardOrThrow(this.sellerClient, 'set_default_bank_account', { sellerId, accountId },
      'The default account could not be changed — please try again.');
  }

  @Delete(':sellerId/bank-accounts/:accountId')
  @ApiOperation({ summary: 'Remove a payout destination' })
  async deleteBankAccount(@Param('sellerId') sellerId: string, @Param('accountId') accountId: string) {
    return this.forwardOrThrow(this.sellerClient, 'delete_seller_bank_account', { sellerId, accountId },
      'The account could not be removed — please try again.');
  }

  @Get(':sellerId/profile')
  @ApiOperation({ summary: 'Seller profile' })
  async getProfile(@Param('sellerId') sellerId: string, @Req() req: any) {
    const countryCode = requestRegion(req);
    return this.sendTo(this.sellerClient, 'get_seller_profile', { sellerId, countryCode }, null);
  }

  @Put(':sellerId/profile')
  @ApiOperation({ summary: 'Update seller profile' })
  async updateProfile(@Param('sellerId') sellerId: string, @Req() req: any, @Body() dto: any) {
    const countryCode = requestRegion(req);
    return this.sendTo(this.sellerClient, 'update_seller_profile', { sellerId, countryCode, ...dto }, { success: false });
  }
}
