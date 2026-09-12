import {
  UseFilters,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Logger,
  Req,
} from '@nestjs/common';
import {
  type DtoMessage,
  type EmptyMessage,
  type IdMessage,
  type PaginatedMessage,
  RpcAwareExceptionsFilter,
  type SellerScopedMessage,
  marketPredicate,
  messageId,
  requireId,
} from '@app/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MarketplaceService } from './marketplace.service';
import { FranchiseViewService } from './franchise/franchise-view.service';
import { CatalogService } from './catalog/catalog.service';
import { MarketplaceAnalyticsService } from './analytics/analytics.service';
import { MarketplaceAdminService } from './admin/admin.service';
import { MarketplaceFulfillmentService } from './fulfillment/fulfillment.service';
import { MarketplaceHomeCacheService } from './catalog/home-cache.service';
import { BrandFollowService } from './brands/brand-follow.service';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '@app/guards';
import { Roles } from '@app/decorators';
import { UserRole } from '@app/common';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductApprovalDto,
  PlaceOrderDto,
  CancelOrderDto,
  ShipOrderDto,
  CreateReturnDto,
  UpdateReturnStatusDto,
  CreateReviewDto,
  CreateCouponDto,
  ValidateCouponDto,
  CreateCategoryDto,
  AddToCartDto,
  SellerApprovalDto,
  AddTrackingEventDto,
  CreateVariantDto,
  UpdateVariantStockDto,
  CreateQuestionDto,
  CreateAnswerDto,
} from './dto/marketplace.dto';
import {
  AdminRejectDto,
  AddToWishlistDto,
  CreateBrandUpdateDto,
  CategoryUpsertDto,
  AttributeUpsertDto,
  BrandUpsertDto,
  BannerUpsertDto,
  FlashDealUpsertDto,
  FeaturedProductDto,
  PageLayoutDto,
  BankOfferUpsertDto,
  ExchangeOfferUpsertDto,
  SellerWalletAdjustmentDto,
  AssignReturnPickupDto,
  RedeemCouponDto,
  CourierWebhookDto,
  CouponUpsertDto,
  VariantUpsertDto,
  UpdateDeliveryStatusDto,
  SubmitDeliveryProofDto,
} from './dto/admin-request.dto';
import {
  CampaignUpsertDto,
  PromotionUpsertDto,
  CommissionUpsertDto,
  HsnCodeUpsertDto,
  ComplaintUpdateDto,
  AdminNotificationDto,
  MarketplaceSettingsDto,
  SeoSettingsDto,
  SponsoredProductUpdateDto,
  ComplianceCountryDto,
  QaModerationDto,
  IndiaOpsConfigDto,
  SupportTicketDto,
  ProductUpdateDto,
  ReturnRequestLegacyDto,
  ProductBundleDto,
  DeliveryAssignmentDto,
} from './dto/admin-request.dto';
import { AdminForwardingValidationPipe } from './dto/forwarding-validation.pipe';

/**
 * The caller, lifted off a TCP payload for object-level authorisation.
 *
 * The gateway attaches `_actor` — `{ ownerId, role }` taken from the verified
 * JWT — to payloads on routes where the service has to decide whether *this*
 * seller may touch *that* row. It is deliberately a reserved key rather than a
 * plain `sellerId` field: a seller id in the payload would be indistinguishable
 * from one the client chose, which is exactly the confusion that let
 * `?sellerId=<someone else's>` pass as authorisation elsewhere.
 *
 * Absent `_actor`, the service sees an anonymous actor and fails closed.
 */
function actorOf(data: any): { ownerId?: string; role?: string; regionCode?: string } | undefined {
  const actor = data?._actor;
  if (!actor || typeof actor !== 'object') return undefined;
  return { ownerId: actor.ownerId, role: actor.role, regionCode: actor.regionCode };
}

// RPC error shaping. Without this, Nest replaces any exception a @MessagePattern
// handler throws with a flat `{ status: 'error', message: 'Internal server error' }`,
// so the gateway has no numeric status to forward and answers 503 for everything —
// a missing product became "catalogue unavailable". The filter cannot be bound in
// main.ts: connectMicroservice() does not inherit the app's global filters.
@UseFilters(RpcAwareExceptionsFilter)
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly svc: MarketplaceService,
    private readonly catalog: CatalogService,
    private readonly analytics: MarketplaceAnalyticsService,
    private readonly admin: MarketplaceAdminService,
    private readonly fulfillment: MarketplaceFulfillmentService,
    private readonly home: MarketplaceHomeCacheService,
    private readonly brandFollowSvc: BrandFollowService,
    private readonly franchiseView: FranchiseViewService,
  ) {}

  @Get('health')
  health() {
    return this.svc.healthCheck();
  }

  // ── Public Browsing Endpoints ─────────────────────────────────────────────
  // These do NOT require authentication — anyone can browse products.

  // ── Categories ────────────────────────────────────────────────────────────
  @Get('categories')
  getCategories() {
    return this.catalog.getCategories();
  }

  @Get('categories/:id')
  getCategoryById(@Param('id') id: string) {
    return this.catalog.getCategoryById(id);
  }

  // ── Subcategories ─────────────────────────────────────────────────────────
  @Get('subcategories')
  getSubcategories(@Query('categoryId') categoryId?: string) {
    return this.catalog.getSubcategories(categoryId);
  }

  @Get('subcategories/:id')
  getSubcategoryById(@Param('id') id: string) {
    return this.catalog.getSubcategoryById(id);
  }

  // ── Products (public read) ────────────────────────────────────────────────
  @Get('products')
  getProducts(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('brand') brand?: string,
    @Query('seller') seller?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sort') sort?: string,
  ) {
    return this.catalog.getProducts(+page, +limit, {
      country,
      category,
      subcategory,
      brand,
      seller,
      minPrice,
      maxPrice,
      sort,
    });
  }

  @Get('products/:id')
  getProductById(@Param('id') id: string) {
    return this.catalog.getProductById(id);
  }

  @Get('featured')
  getFeaturedProducts() {
    return this.catalog.getFeaturedProducts();
  }

  @Get('deals')
  getDeals() {
    return this.catalog.getDeals();
  }

  @Get('flash-deals')
  getFlashDeals() {
    return this.catalog.getFlashDeals();
  }

  // ── Search (public) ───────────────────────────────────────────────────────
  @Get('search')
  search(@Query('q') query: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.catalog.searchProducts(query, +page, +limit);
  }

  // ── Brands (public read) ──────────────────────────────────────────────────
  @Get('brands')
  getBrands() {
    return this.catalog.getBrands();
  }

  @Get('brands/top')
  getTopBrands() {
    return this.catalog.getTopBrands();
  }

  // ── Brand Follow — static routes MUST come before brands/:id ──────────────
  @Get('brands/followed')
  getFollowedBrands(
    @Query('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.brandFollowSvc.getFollowedBrands(userId, +page, +limit);
  }

  @Get('brands/feed')
  getBrandFeed(
    @Query('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
  ) {
    return this.brandFollowSvc.getBrandFeed(userId, +page, +limit, type);
  }

  // ── Parametric brand routes — AFTER static routes ─────────────────────────
  @Get('brands/:id')
  getBrandById(@Param('id') id: string) {
    return this.catalog.getBrandById(id);
  }

  @Post('brands/:id/follow')
  followBrand(@Param('id') id: string, @Body('userId') userId: string) {
    return this.brandFollowSvc.followBrand(userId, id);
  }

  @Delete('brands/:id/follow')
  unfollowBrand(@Param('id') id: string, @Body('userId') userId: string) {
    return this.brandFollowSvc.unfollowBrand(userId, id);
  }

  @Get('brands/:id/is-following')
  isFollowingBrand(@Param('id') id: string, @Query('userId') userId: string) {
    return this.brandFollowSvc.isFollowing(userId, id);
  }

  @Get('brands/:id/followers/count')
  getFollowerCount(@Param('id') id: string) {
    return this.brandFollowSvc.getFollowerCount(id);
  }

  @Post('brands/:id/updates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.SUPER_ADMIN)
  createBrandUpdate(@Param('id') id: string, @Body() data: CreateBrandUpdateDto) {
    return this.brandFollowSvc.createBrandUpdate(id, data);
  }

  @Get('brands/:id/updates')
  getBrandUpdates(@Param('id') id: string, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.brandFollowSvc.getBrandUpdates(id, +page, +limit);
  }

  // ── Sellers (public read) ─────────────────────────────────────────────────
  @Get('sellers')
  getSellers() {
    return this.catalog.getSellers();
  }

  @Get('sellers/verified')
  getVerifiedSellers() {
    return this.catalog.getVerifiedSellers();
  }

  @Get('sellers/:id')
  getSellerById(@Param('id') id: string) {
    return this.catalog.getSellerById(id);
  }

  // ── Reviews (public read) ─────────────────────────────────────────────────
  @Get('products/:id/reviews')
  getProductReviews(@Param('id') id: string) {
    return this.svc.getProductReviews(id);
  }

  @MessagePattern({ cmd: 'get_customer_reviews' })
  tcpGetCustomerReviews(@Payload() data: any) {
    return this.svc.getReviewsByCustomer(data?.customerId ?? data?.userId, data?.page, data?.limit);
  }

  // ── Marketplace Home (public) ─────────────────────────────────────────────
  @Get('home')
  getMarketplaceHome(@Query('country') country?: string) {
    return this.svc.getMarketplaceHome(country);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Authenticated Endpoints — Require valid JWT token
  // ═════════════════════════════════════════════════════════════════════════

  // ── Cart (authenticated) ──────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('cart')
  getCart(@Query('userId') userId: string) {
    return this.svc.getCart(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  addToCart(@Body() dto: AddToCartDto) {
    return this.svc.addToCart(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('cart/:itemId')
  updateCartItem(
    @Param('itemId') itemId: string,
    @Body('userId') userId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.svc.updateCartItem(userId, itemId, quantity);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cart/:itemId')
  removeFromCart(@Param('itemId') itemId: string, @Query('userId') userId: string) {
    return this.svc.removeFromCart(userId, itemId);
  }

  // ── Wishlist (authenticated) ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('wishlist')
  getWishlist(@Query('userId') userId: string) {
    return this.svc.getWishlist(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('wishlist')
  addToWishlist(@Body() dto: AddToWishlistDto) {
    return this.svc.addToWishlist(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('wishlist/:productId')
  removeFromWishlist(@Param('productId') productId: string, @Query('userId') userId: string) {
    return this.svc.removeFromWishlist(userId, productId);
  }

  // ── Orders (authenticated) ────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('orders')
  getOrders(
    @Query('userId') userId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.getOrders({ userId, sellerId, status });
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id')
  getOrderById(@Param('id') id: string) {
    return this.svc.getOrderById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('orders')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  placeOrder(@Body() dto: PlaceOrderDto) {
    return this.svc.placeOrder(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('orders/:id/cancel')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  cancelOrder(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.svc.cancelOrder(id, dto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post('orders/:id/accept')
  acceptOrder(@Param('id') id: string) {
    return this.svc.acceptOrder(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('orders/:id/ship')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  shipOrder(@Param('id') id: string, @Body() dto: ShipOrderDto) {
    return this.svc.shipOrder(id, dto.trackingId, dto.courier);
  }

  // ── Returns & Refunds (authenticated) ─────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('orders/:id/returns')
  @UsePipes(AdminForwardingValidationPipe)
  createReturnRequestLegacy(@Param('id') id: string, @Body() dto: ReturnRequestLegacyDto) {
    return this.svc.createReturnRequestLegacy(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('refunds')
  getRefunds(@Query('sellerId') sellerId?: string) {
    return this.svc.getRefunds(sellerId);
  }

  // ── Reviews (authenticated write) ─────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('products/:id/reviews')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  addProductReview(@Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.svc.addProductReview(id, dto);
  }

  // ── Recently Viewed (authenticated) ───────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('recently-viewed')
  getRecentlyViewed(@Query('userId') userId: string) {
    return this.svc.getRecentlyViewed(userId);
  }

  // ── Support (authenticated) ───────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('support')
  @UsePipes(AdminForwardingValidationPipe)
  createSupportTicket(@Body() dto: SupportTicketDto) {
    return this.svc.createSupportTicket(dto);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Admin-Only Endpoints — Require JWT + admin/super_admin role
  // ═════════════════════════════════════════════════════════════════════════

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('categories')
  createCategory(@Body() dto: CategoryUpsertDto) {
    return this.admin.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: CategoryUpsertDto) {
    return this.admin.updateCategory(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('products')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createProduct(@Body() dto: CreateProductDto) {
    return this.svc.createProduct(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('products/:id')
  @UsePipes(AdminForwardingValidationPipe)
  updateProduct(@Param('id') id: string, @Body() dto: ProductUpdateDto) {
    return this.svc.updateProduct(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('products/:id/approve')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  approveProduct(@Param('id') id: string, @Body() dto: ProductApprovalDto) {
    return this.svc.approveProduct(id, dto.adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('products/:id/reject')
  rejectProduct(@Param('id') id: string, @Body() dto: AdminRejectDto) {
    return this.svc.rejectProduct(id, dto.adminId, dto.reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('products/:id/suspend')
  suspendProduct(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.svc.suspendProduct(id, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('brands/:id/approve')
  approveBrand(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.svc.approveBrand(id, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('sellers/:id/approve')
  approveSeller(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.svc.approveSeller(id, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('sellers/:id/suspend')
  suspendSeller(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.svc.suspendSeller(id, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('returns/:id/approve')
  approveReturn(@Param('id') id: string) {
    return this.svc.approveReturn(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('returns/:id/reject')
  rejectReturn(@Param('id') id: string, @Body('reason') reason: string) {
    return this.svc.rejectReturn(id, reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('refunds/:id/approve')
  approveRefund(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.svc.approveRefund(id, adminId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Extended Admin Endpoints — Full marketplace governance
  // ═════════════════════════════════════════════════════════════════════════

  // ── Dashboard / Stats ─────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/dashboard')
  getAdminDashboard(@Query('country') country?: string) {
    return this.admin.getAdminDashboard(country);
  }

  // ── Subcategories (admin CRUD) ────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('subcategories')
  createSubcategory(@Body() dto: CategoryUpsertDto) {
    return this.admin.createSubcategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('subcategories/:id')
  updateSubcategory(@Param('id') id: string, @Body() dto: CategoryUpsertDto) {
    return this.admin.updateSubcategory(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('subcategories/:id')
  deleteSubcategory(@Param('id') id: string) {
    return this.admin.deleteSubcategory(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }

  // ── Attributes (admin CRUD) ───────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/attributes')
  getAttributes(@Query('category') category?: string) {
    return this.admin.getAttributes(category);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/attributes')
  createAttribute(@Body() dto: AttributeUpsertDto) {
    return this.admin.createAttribute(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/attributes/:id')
  updateAttribute(@Param('id') id: string, @Body() dto: AttributeUpsertDto) {
    return this.admin.updateAttribute(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('admin/attributes/:id')
  deleteAttribute(@Param('id') id: string) {
    return this.admin.deleteAttribute(id);
  }

  // ── Brands (expand CRUD) ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('brands')
  createBrand(@Body() dto: BrandUpsertDto) {
    return this.admin.createBrand(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('brands/:id')
  updateBrand(@Param('id') id: string, @Body() dto: BrandUpsertDto) {
    return this.admin.updateBrand(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('brands/:id')
  deleteBrand(@Param('id') id: string) {
    return this.admin.deleteBrand(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('brands/:id/reject')
  rejectBrand(@Param('id') id: string, @Body() dto: AdminRejectDto) {
    return this.admin.rejectBrand(id, dto.adminId, dto.reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('brands/:id/suspend')
  suspendBrand(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.admin.suspendBrand(id, adminId);
  }

  // ── Sellers (expand management) ───────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('sellers/:id/block')
  blockSeller(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.admin.blockSeller(id, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/sellers/pending')
  getPendingSellers() {
    return this.admin.getPendingSellers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/products/pending')
  getPendingProducts() {
    return this.admin.getPendingProducts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/sellers/:id/health')
  getSellerHealth(@Param('id') id: string) {
    return this.admin.getSellerHealth(id);
  }

  // ── Banners (admin CRUD) ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/banners')
  getBanners(@Query('type') type?: string, @Query('country') country?: string) {
    return this.admin.getAdminBanners(type, country);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/banners')
  createBanner(@Body() dto: BannerUpsertDto) {
    return this.admin.createAdminBanner(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/banners/:id')
  updateBanner(@Param('id') id: string, @Body() dto: BannerUpsertDto) {
    return this.admin.updateAdminBanner(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('admin/banners/:id')
  deleteAdminBanner(@Param('id') id: string) {
    return this.admin.deleteAdminBanner(id);
  }

  // ── Flash Deals (admin CRUD) ──────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/flash-deals')
  getAdminFlashDeals(@Query('status') status?: string) {
    return this.admin.getAdminFlashDeals(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/flash-deals')
  createFlashDeal(@Body() dto: FlashDealUpsertDto) {
    return this.admin.createFlashDeal(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/flash-deals/:id')
  updateFlashDeal(@Param('id') id: string, @Body() dto: FlashDealUpsertDto) {
    return this.admin.updateFlashDeal(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('admin/flash-deals/:id')
  deleteFlashDeal(@Param('id') id: string) {
    return this.admin.deleteFlashDeal(id);
  }

  // ── Campaigns (admin CRUD) ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/campaigns')
  getAdminCampaigns(@Query('status') status?: string) {
    return this.admin.getAdminCampaigns(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/campaigns')
  @UsePipes(AdminForwardingValidationPipe)
  createCampaign(@Body() dto: CampaignUpsertDto) {
    return this.admin.createCampaign(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/campaigns/:id')
  @UsePipes(AdminForwardingValidationPipe)
  updateCampaign(@Param('id') id: string, @Body() dto: CampaignUpsertDto) {
    return this.admin.updateCampaign(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('admin/campaigns/:id')
  deleteCampaign(@Param('id') id: string) {
    return this.admin.deleteCampaign(id);
  }

  // ── Promotions (admin CRUD) ───────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/promotions')
  getAdminPromotions() {
    return this.admin.getAdminPromotions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/promotions')
  @UsePipes(AdminForwardingValidationPipe)
  createPromotion(@Body() dto: PromotionUpsertDto) {
    return this.admin.createPromotion(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/promotions/:id')
  @UsePipes(AdminForwardingValidationPipe)
  updatePromotion(@Param('id') id: string, @Body() dto: PromotionUpsertDto) {
    return this.admin.updatePromotion(id, dto);
  }

  // ── Commissions (admin CRUD) ──────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/commissions')
  getCommissions() {
    return this.admin.getCommissions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/commissions')
  @UsePipes(AdminForwardingValidationPipe)
  createCommission(@Body() dto: CommissionUpsertDto) {
    return this.admin.createCommission(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/commissions/:id')
  @UsePipes(AdminForwardingValidationPipe)
  updateCommission(@Param('id') id: string, @Body() dto: CommissionUpsertDto) {
    return this.admin.updateCommission(id, dto);
  }

  // ── Payouts (admin) ───────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/payouts')
  getAdminPayouts(@Query('status') status?: string) {
    return this.admin.getAdminPayouts(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/payouts/:id/process')
  processPayout(@Param('id') id: string) {
    return this.admin.processPayout(id);
  }

  // ── Reviews Moderation ────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/reviews')
  getAdminReviews(@Query('status') status?: string, @Query('rating') rating?: number) {
    return this.admin.getAdminReviews(status, rating);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('reviews/:id/flag')
  flagReview(@Param('id') id: string, @Body('reason') reason: string) {
    return this.admin.flagReview(id, reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('reviews/:id/hide')
  hideReview(@Param('id') id: string) {
    return this.admin.hideReview(id);
  }

  // ── Complaints ────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/complaints')
  getComplaints(@Query('status') status?: string) {
    return this.admin.getComplaints(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/complaints/:id')
  @UsePipes(AdminForwardingValidationPipe)
  updateComplaint(@Param('id') id: string, @Body() dto: ComplaintUpdateDto) {
    return this.admin.updateComplaint(id, dto);
  }

  // ── Notifications ─────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/notifications')
  getAdminNotifications(@Req() req: any) {
    // Same contract as the TCP handler: the actor comes from the verified
    // token, never from the caller.
    return this.admin.getAdminNotifications(req?.user?.id ?? req?.user?.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/notifications')
  @UsePipes(AdminForwardingValidationPipe)
  sendNotification(@Body() dto: AdminNotificationDto) {
    return this.admin.sendNotification(dto);
  }

  // ── Settings ──────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/settings')
  getSettings() {
    return this.admin.getMarketplaceSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/settings')
  @UsePipes(AdminForwardingValidationPipe)
  updateSettings(@Body() dto: MarketplaceSettingsDto) {
    return this.admin.updateMarketplaceSettings(dto);
  }

  // ── Audit Logs ────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/audit-logs')
  getAuditLogs(
    @Query('action') action?: string,
    @Query('actor') actor?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.admin.getAuditLogs({ action, actor, page: +page, limit: +limit });
  }

  // ── Reports ───────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/reports')
  getReports(
    @Query('type') type?: string,
    @Query('period') period?: string,
    @Query('country') country?: string,
  ) {
    return this.admin.getReports({ type, period, country });
  }

  // ── Page Builder ──────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/page-layout')
  getPageLayout(@Query('country') country?: string) {
    return this.admin.getPageLayout(country);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/page-layout')
  updatePageLayout(@Body() dto: PageLayoutDto) {
    return this.admin.updatePageLayout(dto);
  }

  // ── SEO Settings ──────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/seo')
  getSeoSettings() {
    return this.admin.getSeoSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/seo')
  @UsePipes(AdminForwardingValidationPipe)
  updateSeoSettings(@Body() dto: SeoSettingsDto) {
    return this.admin.updateSeoSettings(dto);
  }

  // ── HSN / Tax Master ──────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/hsn-codes')
  getHsnCodes(@Query('search') search?: string) {
    return this.admin.getHsnCodes(search);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/hsn-codes')
  @UsePipes(AdminForwardingValidationPipe)
  createHsnCode(@Body() dto: HsnCodeUpsertDto) {
    return this.admin.createHsnCode(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/hsn-codes/:id')
  @UsePipes(AdminForwardingValidationPipe)
  updateHsnCode(@Param('id') id: string, @Body() dto: HsnCodeUpsertDto) {
    return this.admin.updateHsnCode(id, dto);
  }

  // ── Featured Products ─────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/featured')
  addFeaturedProduct(@Body() dto: FeaturedProductDto) {
    return this.admin.addFeaturedProduct(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('admin/featured/:id')
  removeFeaturedProduct(@Param('id') id: string) {
    return this.admin.removeFeaturedProduct(id);
  }

  // ── Bank Offers ───────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/bank-offers')
  getBankOffers() {
    return this.admin.getBankOffers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/bank-offers')
  createBankOffer(@Body() dto: BankOfferUpsertDto) {
    return this.admin.createBankOffer(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/bank-offers/:id')
  updateBankOffer(@Param('id') id: string, @Body() dto: BankOfferUpsertDto) {
    return this.admin.updateBankOffer(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('admin/bank-offers/:id')
  deleteBankOffer(@Param('id') id: string) {
    return this.admin.deleteBankOffer(id);
  }

  // ── Exchange Offers ───────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/exchange-offers')
  getAdminExchangeOffers(@Query('productId') productId?: string) {
    return productId ? this.svc.getExchangeOffers(productId) : { data: [] as unknown[], total: 0 };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/exchange-offers')
  createExchangeOffer(@Body() dto: ExchangeOfferUpsertDto) {
    return this.admin.createExchangeOffer(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/exchange-offers/:id')
  updateExchangeOffer(@Param('id') id: string, @Body() dto: ExchangeOfferUpsertDto) {
    return this.admin.updateExchangeOffer(id, dto);
  }

  // ── Sponsored Products ────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/sponsored')
  getSponsoredProducts(@Query('status') status?: string) {
    return this.admin.getSponsoredProducts(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/sponsored/:id')
  @UsePipes(AdminForwardingValidationPipe)
  updateSponsoredProduct(@Param('id') id: string, @Body() dto: SponsoredProductUpdateDto) {
    return this.admin.updateSponsoredProduct(id, dto);
  }

  // ── Compliance / Countries ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/compliance/countries')
  getComplianceCountries() {
    return this.admin.getComplianceCountries();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/compliance/countries/:code')
  @UsePipes(AdminForwardingValidationPipe)
  updateComplianceCountry(@Param('code') code: string, @Body() dto: ComplianceCountryDto) {
    return this.admin.updateComplianceCountry(code, dto);
  }

  // ── Customers ─────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/customers')
  getAdminCustomers(@Query('search') search?: string, @Query('page') page = 1) {
    return this.admin.getAdminCustomers(search, +page);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/customers/:id/block')
  blockCustomer(@Param('id') id: string) {
    return this.admin.blockCustomer(id);
  }

  // ── Seller Wallets ────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/seller-wallets')
  getSellerWallets() {
    return this.admin.getSellerWallets();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin/seller-wallets/:id/adjust')
  adjustSellerWallet(@Param('id') id: string, @Body() dto: SellerWalletAdjustmentDto) {
    return this.admin.adjustSellerWallet(id, dto.amount, dto.reason);
  }

  // ── QA Moderation ─────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/qa-moderation')
  getQAItems(@Query('status') status?: string) {
    return this.admin.getQAItems(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/qa-moderation/:id')
  @UsePipes(AdminForwardingValidationPipe)
  moderateQAItem(@Param('id') id: string, @Body() dto: QaModerationDto) {
    return this.admin.moderateQAItem(id, dto);
  }

  // ── India Operations ──────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/india-ops')
  getIndiaOpsConfig() {
    return this.admin.getIndiaOpsConfig();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('admin/india-ops')
  @UsePipes(AdminForwardingValidationPipe)
  updateIndiaOpsConfig(@Body() dto: IndiaOpsConfigDto) {
    return this.admin.updateIndiaOpsConfig(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ PHASE 2 — Admin Analytics & Seller APIs
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Admin Analytics ────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/revenue')
  getRevenueAnalytics(@Query('period') period?: string) {
    return this.analytics.getRevenueAnalytics(period);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/funnel')
  getConversionFunnel(@Query('period') period?: string) {
    return this.analytics.getConversionFunnel(period);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/seller-rankings')
  getSellerRankings(@Query('sortBy') sortBy?: string) {
    return this.analytics.getSellerRankings(sortBy);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/category-performance')
  getCategoryPerformance() {
    return this.analytics.getCategoryPerformance();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/regional')
  getRegionalPerformance() {
    return this.analytics.getRegionalPerformance();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/inventory-aging')
  getInventoryAging() {
    return this.analytics.getInventoryAging();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/return-analysis')
  getReturnRateAnalysis() {
    return this.analytics.getReturnRateAnalysis();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/fraud-alerts')
  getFraudAlerts() {
    return this.analytics.getFraudAlerts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/sla-compliance')
  getSLACompliance(@Query('sellerId') sellerId?: string) {
    return this.analytics.getSLACompliance(sellerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/analytics/penalty-ledger')
  getPenaltyLedger(@Query('sellerId') sellerId?: string) {
    return this.analytics.getPenaltyLedger(sellerId);
  }

  // ── Seller-Specific Routes ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('sellers/:sellerId/dashboard')
  getSellerDashboard(@Param('sellerId') sellerId: string) {
    return this.svc.getSellerDashboard(sellerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sellers/:sellerId/coupons')
  getSellerCoupons(@Param('sellerId') sellerId: string) {
    return this.svc.getSellerCoupons(sellerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sellers/:sellerId/coupons')
  createSellerCoupon(@Param('sellerId') sellerId: string, @Body() dto: CouponUpsertDto) {
    return this.svc.createSellerCoupon(sellerId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sellers/:sellerId/bundles')
  getSellerBundles(@Param('sellerId') sellerId: string) {
    return this.svc.getProductBundles(sellerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sellers/:sellerId/bundles')
  @UsePipes(AdminForwardingValidationPipe)
  createSellerBundle(@Param('sellerId') sellerId: string, @Body() dto: ProductBundleDto) {
    return this.svc.createProductBundle({ ...dto, sellerId });
  }

  @Get('bundles')
  getProductBundles() {
    return this.svc.getProductBundles();
  }

  // gRPC lives in marketplace.grpc.controller.ts — all 11 proto RPCs, mapped to
  // the wire contract there rather than returning raw entities.

  // ── TCP MessagePattern handlers (called by API Gateway via ClientProxy.send()) ──

  /**
   * Region carried on the TCP payload.
   *
   * The gateway resolves the caller's market from `X-Region-Code` (or GPS/IP)
   * and forwards it as `country`. Absent, these reads stay unscoped, which is
   * what the admin catalogue views want.
   */
  private payloadRegion(data: any): string | undefined {
    const raw = data?.country ?? data?.region ?? data?.regionCode;
    return typeof raw === 'string' && raw.trim() ? raw.trim().toUpperCase() : undefined;
  }

  @MessagePattern({ cmd: 'get_home' })
  tcpGetHome(@Payload() data?: any) {
    return this.svc.getMarketplaceHome(this.payloadRegion(data));
  }

  @MessagePattern({ cmd: 'get_categories' })
  tcpGetCategories() {
    return this.catalog.getCategories();
  }

  @MessagePattern({ cmd: 'get_category_by_id' })
  tcpGetCategoryById(@Payload() id: string) {
    return this.catalog.getCategoryById(id);
  }

  @MessagePattern({ cmd: 'get_subcategories' })
  tcpGetSubcategories(@Payload() data?: any) {
    return this.catalog.getSubcategories(typeof data === 'string' ? data : data?.categoryId);
  }

  @MessagePattern({ cmd: 'get_subcategory_by_id' })
  tcpGetSubcategoryById(@Payload() id: string) {
    return this.catalog.getSubcategoryById(id);
  }

  @MessagePattern({ cmd: 'get_products' })
  tcpGetProducts(@Payload() data: any) {
    return this.catalog.getProducts(data?.page || 1, data?.limit || 20, data || {});
  }

  @MessagePattern({ cmd: 'get_product_by_id' })
  tcpGetProductById(@Payload() data: any) {
    // Callers send either the bare id or `{ id, country }`; the market decides
    // which offers and SKUs the detail carries.
    const id = typeof data === 'string' ? data : data?.id;
    const country = typeof data === 'object' && data ? data.country : undefined;
    return this.catalog.getProductById(id, country);
  }

  @MessagePattern({ cmd: 'search' })
  tcpSearch(@Payload() data: any) {
    return this.catalog.searchProducts(
      data?.query || '',
      data?.page || 1,
      data?.limit || 20,
      this.payloadRegion(data),
    );
  }

  @MessagePattern({ cmd: 'get_featured_products' })
  tcpGetFeatured(@Payload() data?: any) {
    return this.catalog.getFeaturedProducts(this.payloadRegion(data));
  }

  // CatalogService.getDeals() had no TCP pattern, so nothing but the gRPC
  // GetDeals RPC could reach it and the storefront's deals routes fell back to
  // featured products — top-rated items, not discounted ones.
  @MessagePattern({ cmd: 'get_deals' })
  tcpGetDeals(@Payload() data?: any) {
    return this.catalog.getDeals(this.payloadRegion(data));
  }

  @MessagePattern({ cmd: 'get_flash_deals' })
  tcpGetFlashDeals(@Payload() data?: any) {
    return this.catalog.getFlashDeals(this.payloadRegion(data));
  }

  // ── Seller flash-deal participation ───────────────────────────────────────
  // The four patterns below had no handler, so the seller portal's flash-deals
  // screen could only ever show an empty list and its nominate/withdraw buttons
  // did nothing — the gateway's fallback turned "no matching message handler"
  // into a 200. The implementations already existed on the admin service; only
  // the patterns were missing. `sellerClient` is aliased to this service (there
  // is no seller-service), which is why they belong here.

  @MessagePattern({ cmd: 'get_available_flash_deals' })
  tcpGetAvailableFlashDeals(@Payload() data?: any) {
    return this.svc.getFlashDealsActive(this.payloadRegion(data));
  }

  @MessagePattern({ cmd: 'submit_flash_deal_nomination' })
  tcpSubmitFlashDealNomination(@Payload() d: any) {
    // The gateway spreads the request body flat alongside sellerId.
    return this.admin.submitNomination(d?.sellerId, d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'get_seller_nominations' })
  tcpGetSellerNominations(@Payload() d: SellerScopedMessage) {
    return this.admin.getSellerNominations(requireId(d?.sellerId, 'seller'));
  }

  @MessagePattern({ cmd: 'withdraw_from_flash_deal' })
  tcpWithdrawFromFlashDeal(@Payload() d: SellerScopedMessage & DtoMessage) {
    return this.admin.withdrawFromDeal(requireId(d?.sellerId, 'seller'), d?.dealId);
  }

  // ── Admin flash-deal pipeline ─────────────────────────────────────────────
  // The admin console's seven flash-deal routes all sent `admin_get_dashboard`,
  // so creating a campaign returned dashboard counters and the gateway's catch
  // reported success anyway. These are the handlers those routes should have
  // been reaching all along.

  @MessagePattern({ cmd: 'admin_get_flash_deals' })
  tcpAdminGetFlashDeals(@Payload() d: any) {
    return this.admin.getAdminFlashDeals(d?.status, d?.region);
  }

  @MessagePattern({ cmd: 'admin_create_flash_deal' })
  tcpAdminCreateFlashDeal(@Payload() d: any) {
    return this.admin.createFlashDeal(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_update_flash_deal' })
  tcpAdminUpdateFlashDeal(@Payload() d: any) {
    return this.admin.updateFlashDeal(d?.id, d?.dto ?? d, d?.region);
  }

  @MessagePattern({ cmd: 'admin_delete_flash_deal' })
  tcpAdminDeleteFlashDeal(@Payload() d: any) {
    return this.admin.deleteFlashDeal(d?.id, d?.region);
  }

  @MessagePattern({ cmd: 'admin_get_nominations' })
  tcpAdminGetNominations(@Payload() d: any) {
    return this.admin.getAllNominations(d?.status, d?.region);
  }

  @MessagePattern({ cmd: 'admin_approve_nomination' })
  tcpAdminApproveNomination(@Payload() d: any) {
    return this.admin.approveNomination(d?.nominationId, d?.adminId, d?.region);
  }

  @MessagePattern({ cmd: 'admin_reject_nomination' })
  tcpAdminRejectNomination(@Payload() d: any) {
    return this.admin.rejectNomination(d?.nominationId, d?.reason, d?.adminId, d?.region);
  }

  @MessagePattern({ cmd: 'get_brands' })
  tcpGetBrands() {
    return this.catalog.getBrands();
  }

  @MessagePattern({ cmd: 'get_top_brands' })
  tcpGetTopBrands() {
    return this.catalog.getTopBrands();
  }

  @MessagePattern({ cmd: 'get_sellers' })
  tcpGetSellers(@Payload() data?: any) {
    return this.catalog.getSellers(this.payloadRegion(data));
  }

  @MessagePattern({ cmd: 'get_verified_sellers' })
  tcpGetVerifiedSellers(@Payload() data?: any) {
    return this.catalog.getVerifiedSellers(this.payloadRegion(data));
  }

  // Public seller profile. `getSellerById` selects PUBLIC_SELLER_FIELDS only —
  // no email, phone, bank or tax columns reach the storefront.
  @MessagePattern({ cmd: 'get_seller_by_id' })
  tcpGetSellerById(@Payload() data: any) {
    return this.catalog.getSellerById(data?.sellerId ?? data?.id ?? data);
  }

  // ── Admin TCP handlers ──────────────────────────────────────────────────────

  // ── Admin console ─────────────────────────────────────────────────────────
  // The handlers the admin routes should have been reaching. Their service
  // methods already existed; only the wiring between them was missing, which is
  // why the console looked complete and changed nothing.

  @MessagePattern({ cmd: 'admin_get_page_layout' })
  tcpAdminGetPageLayout(@Payload() d: any) {
    return this.admin.getPageLayout(d?.country);
  }

  @MessagePattern({ cmd: 'admin_update_page_layout' })
  tcpAdminUpdatePageLayout(@Payload() d: any) {
    return this.admin.updatePageLayout(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_get_seo' })
  tcpAdminGetSeo(@Payload() d: any) {
    return this.admin.getSeoSettings();
  }

  @MessagePattern({ cmd: 'admin_update_seo' })
  tcpAdminUpdateSeo(@Payload() d: any) {
    return this.admin.updateSeoSettings(d?.dto ?? d, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_get_settings' })
  tcpAdminGetSettings(@Payload() d: any) {
    return this.admin.getMarketplaceSettings();
  }

  @MessagePattern({ cmd: 'admin_update_settings' })
  tcpAdminUpdateSettings(@Payload() d: any) {
    return this.admin.updateMarketplaceSettings(d?.dto ?? d, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_get_promotions' })
  tcpAdminGetPromotions(@Payload() d: any) {
    return this.admin.getAdminPromotions(d?.region);
  }

  @MessagePattern({ cmd: 'admin_create_promotion' })
  tcpAdminCreatePromotion(@Payload() d: any) {
    return this.admin.createPromotion(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_update_promotion' })
  tcpAdminUpdatePromotion(@Payload() d: any) {
    return this.admin.updatePromotion(d?.id, d?.dto ?? d, d?.region);
  }

  @MessagePattern({ cmd: 'admin_get_notifications' })
  tcpAdminGetNotifications(@Payload() d: any) {
    // `userId` carries the acting administrator, taken from the verified token
    // by the gateway. Notifications are addressed to a user — the list used to
    // ask for rows with no user at all, which the NOT NULL column made
    // impossible, so it always fell through to four invented rows.
    return this.admin.getAdminNotifications(d?.userId);
  }

  @MessagePattern({ cmd: 'admin_send_notification' })
  tcpAdminSendNotification(@Payload() d: any) {
    return this.admin.sendNotification(d?.dto ?? d, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_get_hsn_codes' })
  tcpAdminGetHsnCodes(@Payload() d: any) {
    return this.admin.getHsnCodes(d?.search);
  }

  @MessagePattern({ cmd: 'admin_create_hsn_code' })
  tcpAdminCreateHsnCode(@Payload() d: any) {
    return this.admin.createHsnCode(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_update_hsn_code' })
  tcpAdminUpdateHsnCode(@Payload() d: any) {
    return this.admin.updateHsnCode(d?.id, d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_get_featured' })
  tcpAdminGetFeatured(@Payload() d: any) {
    return this.admin.getAdminFeaturedProducts(d?.scope ?? this.payloadRegion(d));
  }

  @MessagePattern({ cmd: 'admin_add_featured' })
  tcpAdminAddFeatured(@Payload() d: any) {
    return this.admin.addFeaturedProduct(d?.dto ?? d, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_remove_featured' })
  tcpAdminRemoveFeatured(@Payload() d: any) {
    return this.admin.removeFeaturedProduct(d?.id, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_get_sponsored' })
  tcpAdminGetSponsored(@Payload() d: any) {
    return this.admin.getSponsoredProducts(d?.status, d?.scope ?? this.payloadRegion(d));
  }

  @MessagePattern({ cmd: 'admin_update_sponsored' })
  tcpAdminUpdateSponsored(@Payload() d: any) {
    return this.admin.updateSponsoredProduct(d?.id, d?.dto ?? d, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_get_qa' })
  tcpAdminGetQa(@Payload() d: any) {
    return this.admin.getQAItems(d?.status, d?.scope ?? this.payloadRegion(d));
  }

  @MessagePattern({ cmd: 'admin_moderate_qa' })
  tcpAdminModerateQa(@Payload() d: any) {
    return this.admin.moderateQAItem(d?.id, d?.dto ?? d, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_get_complaints' })
  tcpAdminGetComplaints(@Payload() d: any) {
    return this.admin.getComplaints(d?.status, d?.scope ?? this.payloadRegion(d));
  }

  @MessagePattern({ cmd: 'admin_update_complaint' })
  tcpAdminUpdateComplaint(@Payload() d: any) {
    return this.admin.updateComplaint(d?.id, d?.dto ?? d, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_get_compliance_countries' })
  tcpAdminGetComplianceCountries(@Payload() d: any) {
    return this.admin.getComplianceCountries(d?.scope);
  }

  @MessagePattern({ cmd: 'admin_update_compliance_country' })
  tcpAdminUpdateComplianceCountry(@Payload() d: any) {
    return this.admin.updateComplianceCountry(d?.code, d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_get_customers' })
  tcpAdminGetCustomers(@Payload() d: any) {
    return this.admin.getAdminCustomers(d?.search, d?.page ?? 1, d?.scope ?? this.payloadRegion(d));
  }

  @MessagePattern({ cmd: 'admin_block_customer' })
  tcpAdminBlockCustomer(@Payload() d: any) {
    return this.admin.blockCustomer(d?.id, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_get_seller_wallets' })
  tcpAdminGetSellerWallets(@Payload() d: any) {
    return this.admin.getSellerWallets(d?.scope ?? this.payloadRegion(d));
  }

  @MessagePattern({ cmd: 'admin_get_india_ops' })
  tcpAdminGetIndiaOps(@Payload() d: any) {
    return this.admin.getIndiaOpsConfig();
  }

  @MessagePattern({ cmd: 'admin_update_india_ops' })
  tcpAdminUpdateIndiaOps(@Payload() d: any) {
    return this.admin.updateIndiaOpsConfig(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_get_disputes' })
  tcpAdminGetDisputes(@Payload() d: any) {
    return this.admin.getDisputes(d?.status, d?.scope ?? this.payloadRegion(d));
  }

  @MessagePattern({ cmd: 'admin_get_customer_segments' })
  tcpAdminGetCustomerSegments(@Payload() d: any) {
    return this.admin.getCustomerSegments(d?.scope);
  }
  // Took no payload at all, so the market the gateway resolved was thrown away
  // and a region-locked admin's dashboard showed platform-wide counts.
  @MessagePattern({ cmd: 'admin_get_dashboard' })
  tcpAdminDashboard(@Payload() d?: { country?: string; region?: string; scope?: string }) {
    return this.admin.getAdminDashboard(d?.scope ?? this.payloadRegion(d));
  }

  // The payload was ignored here, so `?status=PENDING&country=QA` returned the
  // entire seller directory — the approvals queue listed every seller in every
  // market, approved ones included.
  @MessagePattern({ cmd: 'admin_get_sellers' })
  tcpAdminGetSellers(@Payload() data: any) {
    // `scope` wins over anything the payload asked for: it is the market the
    // gateway proved the caller is locked to, not a filter they chose.
    // `search` is carried on the payload but `getSellersForAdmin` has no search
    // predicate yet, so it is deliberately not passed: silently accepting it
    // would make an unfiltered list look like a search result.
    return this.catalog.getSellersForAdmin({
      region: data?.scope ?? this.payloadRegion(data),
      status: data?.status,
      page: data?.page,
      limit: data?.limit,
    });
  }

  @MessagePattern({ cmd: 'admin_pending_seller_counts' })
  tcpAdminPendingSellerCounts() {
    return this.catalog.getPendingSellerCounts();
  }

  // Per-seller health had only an HTTP route, and that surface is closed now
  // (HttpSurfaceGuard), so the method was unreachable. It also threw on every
  // call until the `Review.sellerId` query was fixed. The gateway's
  // `/admin/marketplace/seller-health` currently reads SLA compliance, which
  // reports nulls — this is the one with real numbers behind it.
  @MessagePattern({ cmd: 'admin_get_seller_health' })
  tcpAdminGetSellerHealth(@Payload() d: any) {
    return this.admin.getSellerHealth(typeof d === 'string' ? d : (d?.id ?? d?.sellerId));
  }

  @MessagePattern({ cmd: 'admin_get_seller_by_id' })
  tcpAdminGetSellerById(@Payload() id: string) {
    return this.catalog.getSellerById(id);
  }

  /**
   * A seller id from any payload shape the callers use.
   *
   * These handlers read `data?.id`, but the gateway sent the id as a bare
   * string (and, for two of them, inside a positional array). `data?.id` was
   * therefore undefined and the service queried `where: { id: undefined }`,
   * which TypeORM treats as "no condition" — it returned the first seller in
   * the table and the admin's decision landed on a stranger.
   */
  private static sellerIdOf(data: any): string {
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return typeof data[0] === 'string' ? data[0] : '';
    return data?.id ?? data?.sellerId ?? '';
  }

  @MessagePattern({ cmd: 'admin_approve_seller' })
  tcpAdminApproveSeller(@Payload() data: any) {
    return this.svc.approveSeller(
      MarketplaceController.sellerIdOf(data),
      data?.adminId || 'admin',
      data?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_reject_seller' })
  tcpAdminRejectSeller(@Payload() data: any) {
    return this.svc.rejectSeller(MarketplaceController.sellerIdOf(data), data, data?.scope);
  }

  @MessagePattern({ cmd: 'admin_suspend_seller' })
  tcpAdminSuspendSeller(@Payload() data: any) {
    return this.svc.suspendSeller(
      MarketplaceController.sellerIdOf(data),
      data?.adminId || 'admin',
      data?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_reactivate_seller' })
  tcpAdminReactivateSeller(@Payload() data: any) {
    return this.svc.reactivateSeller(
      MarketplaceController.sellerIdOf(data),
      data?.adminId || 'admin',
      data?.scope,
    );
  }

  // ── Admin governance over TCP ───────────────────────────────────────────────
  // These service methods all existed but had no message pattern, so the gateway
  // could not reach them and its handlers returned fabricated `success: true`
  // responses instead — an admin approving a payout or blocking a seller got a
  // green result and nothing was written. See the audit note on stub handlers.

  // The gateway sends `scope` on every one of these; each handler forwards it so
  // the service can resolve the product's market through its seller and refuse
  // before the write. Dropping it made the gateway check the only one there was.
  @MessagePattern({ cmd: 'admin_publish_product' })
  tcpAdminPublishProduct(@Payload() d: IdMessage & DtoMessage) {
    return this.svc.setProductPublished(
      requireId(d?.id, 'record'),
      d?.adminId || 'admin',
      true,
      undefined,
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_unpublish_product' })
  tcpAdminUnpublishProduct(@Payload() d: IdMessage & DtoMessage) {
    return this.svc.setProductPublished(
      requireId(d?.id, 'record'),
      d?.adminId || 'admin',
      false,
      d?.reason,
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_suspend_product' })
  tcpAdminSuspendProduct(@Payload() d: IdMessage & DtoMessage) {
    return this.svc.suspendProduct(
      requireId(d?.id, 'record'),
      d?.adminId || 'admin',
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_request_product_correction' })
  tcpAdminRequestProductCorrection(@Payload() d: IdMessage & DtoMessage) {
    return this.svc.requestProductCorrection(
      requireId(d?.id, 'record'),
      d?.adminId || 'admin',
      d?.notes || '',
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_feature_product' })
  tcpAdminFeatureProduct(@Payload() d: IdMessage) {
    return this.admin.addFeaturedProduct(
      { productId: d?.id, ...d },
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_unfeature_product' })
  tcpAdminUnfeatureProduct(@Payload() d: IdMessage) {
    return this.admin.removeFeaturedProduct(
      requireId(d?.id, 'record'),
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_update_brand' })
  tcpAdminUpdateBrand(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.updateBrand(requireId(d?.id, 'record'), d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_reject_brand' })
  tcpAdminRejectBrand(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.rejectBrand(
      requireId(d?.id, 'record'),
      d?.adminId || 'admin',
      d?.reason || '',
    );
  }

  @MessagePattern({ cmd: 'admin_suspend_brand' })
  tcpAdminSuspendBrand(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.suspendBrand(requireId(d?.id, 'record'), d?.adminId || 'admin');
  }

  @MessagePattern({ cmd: 'admin_update_campaign' })
  tcpAdminUpdateCampaign(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.updateCampaign(
      requireId(d?.id, 'record'),
      d?.dto ?? d,
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_block_seller' })
  tcpAdminBlockSeller(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.blockSeller(
      requireId(d?.id, 'record'),
      d?.adminId || 'admin',
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_flag_review' })
  tcpAdminFlagReview(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.flagReview(
      requireId(d?.id, 'record'),
      d?.reason || '',
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_hide_review' })
  tcpAdminHideReview(@Payload() d: IdMessage) {
    return this.admin.hideReview(requireId(d?.id, 'record'), (d as { scope?: string })?.scope);
  }

  @MessagePattern({ cmd: 'admin_update_commission' })
  tcpAdminUpdateCommission(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.updateCommission(
      requireId(d?.id, 'record'),
      d?.dto ?? d,
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_process_payout' })
  tcpAdminProcessPayout(@Payload() d: IdMessage) {
    return this.admin.processPayout(requireId(d?.id, 'record'));
  }

  @MessagePattern({ cmd: 'admin_create_subcategory' })
  tcpAdminCreateSubcategory(@Payload() d: DtoMessage) {
    return this.admin.createSubcategory(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_update_subcategory' })
  tcpAdminUpdateSubcategory(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.updateSubcategory(requireId(d?.id, 'record'), d?.dto ?? d);
  }

  // `deleteSubcategory` has existed on the admin service all along with no
  // pattern to reach it, so the gateway had nothing to forward a delete to and
  // never registered the route. An admin could create a subcategory and then
  // had no way to remove it.
  @MessagePattern({ cmd: 'admin_delete_subcategory' })
  tcpAdminDeleteSubcategory(@Payload() d: IdMessage) {
    return this.admin.deleteSubcategory(requireId(d?.id, 'record'));
  }

  // The gateway answered `GET /admin/marketplace/attributes` with a hard-coded
  // `{ data: [], total: 0 }` because there was no pattern to forward it to, so
  // the Category Attributes screen could only ever show its bundled demo set —
  // an attribute an admin created was written to the database and then never
  // read back. Same for delete.
  @MessagePattern({ cmd: 'admin_get_attributes' })
  tcpAdminGetAttributes(@Payload() d: DtoMessage) {
    return this.admin.getAttributes(d?.categoryId ?? d?.category);
  }

  @MessagePattern({ cmd: 'admin_create_attribute' })
  tcpAdminCreateAttribute(@Payload() d: DtoMessage) {
    return this.admin.createAttribute(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_update_attribute' })
  tcpAdminUpdateAttribute(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.updateAttribute(requireId(d?.id, 'record'), d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_delete_attribute' })
  tcpAdminDeleteAttribute(@Payload() d: IdMessage) {
    return this.admin.deleteAttribute(requireId(d?.id, 'record'));
  }

  /**
   * The attribute schema for one category — the shared contract the seller
   * portal's variant editor and the storefront's pickers both render from.
   * Public because the storefront is: it needs the colour swatches and the
   * filterable facets before a shopper has signed in.
   */
  @MessagePattern({ cmd: 'get_category_attributes' })
  tcpGetCategoryAttributes(@Payload() d: any) {
    return this.catalog.getCategoryAttributes(d?.idOrSlug ?? d?.categoryId ?? d?.category);
  }

  @MessagePattern({ cmd: 'admin_create_banner' })
  tcpAdminCreateBanner(@Payload() d: DtoMessage) {
    return this.admin.createAdminBanner(d?.dto ?? d, (d as any)?.region);
  }

  @MessagePattern({ cmd: 'admin_update_banner' })
  tcpAdminUpdateBanner(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.updateAdminBanner(
      requireId(d?.id, 'record'),
      d?.dto ?? d,
      (d as any)?.region,
    );
  }

  @MessagePattern({ cmd: 'admin_delete_banner' })
  tcpAdminDeleteBanner(@Payload() d: IdMessage) {
    return this.admin.deleteAdminBanner(requireId(d?.id, 'record'), (d as any)?.region);
  }

  @MessagePattern({ cmd: 'admin_update_bank_offer' })
  tcpAdminUpdateBankOffer(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.updateBankOffer(requireId(d?.id, 'record'), d?.dto ?? d, (d as any)?.region);
  }

  // Listing and deleting exchange offers had no pattern at all, so the gateway
  // could not have forwarded them even had it wanted to.
  @MessagePattern({ cmd: 'get_offers_for_product' })
  tcpOffersForProduct(@Payload() d: EmptyMessage) {
    return this.admin.listOffersForProduct(d?.category);
  }

  @MessagePattern({ cmd: 'admin_create_bank_offer' })
  tcpAdminCreateBankOffer(@Payload() d: DtoMessage) {
    return this.admin.createBankOffer(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_create_exchange_offer' })
  tcpAdminCreateExchangeOffer(@Payload() d: DtoMessage) {
    return this.admin.createExchangeOffer(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_list_bank_offers' })
  tcpAdminListBankOffers(@Payload() d: EmptyMessage) {
    return this.admin.listBankOffers(
      !!d?.activeOnly,
      d?.category,
      (d as any)?.region,
      !!(d as any)?.regionStrict,
    );
  }

  @MessagePattern({ cmd: 'admin_list_exchange_offers' })
  tcpAdminListExchangeOffers(@Payload() d: EmptyMessage) {
    return this.admin.listExchangeOffers(
      !!d?.activeOnly,
      d?.targetCategory,
      (d as any)?.region,
      !!(d as any)?.regionStrict,
    );
  }

  @MessagePattern({ cmd: 'admin_delete_exchange_offer' })
  tcpAdminDeleteExchangeOffer(@Payload() d: IdMessage) {
    return this.admin.deleteExchangeOffer(requireId(d?.id, 'record'), (d as any)?.region);
  }

  @MessagePattern({ cmd: 'admin_delete_bank_offer' })
  tcpAdminDeleteBankOffer(@Payload() d: IdMessage) {
    return this.admin.deleteBankOffer(requireId(d?.id, 'record'), (d as any)?.region);
  }

  @MessagePattern({ cmd: 'admin_update_exchange_offer' })
  tcpAdminUpdateExchangeOffer(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.updateExchangeOffer(
      requireId(d?.id, 'record'),
      d?.dto ?? d,
      (d as any)?.region,
    );
  }

  @MessagePattern({ cmd: 'admin_adjust_seller_wallet' })
  tcpAdminAdjustSellerWallet(@Payload() d: SellerScopedMessage & DtoMessage) {
    return this.admin.adjustSellerWallet(
      requireId(d?.sellerId, 'seller'),
      Number(d?.amount) || 0,
      d?.reason || '',
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'get_seller_by_owner' })
  tcpGetSellerByOwner(@Payload() data: any) {
    return this.catalog.getSellerByOwner(data?.ownerId ?? data?.userId);
  }

  @MessagePattern({ cmd: 'price_order_items' })
  tcpPriceOrderItems(@Payload() data: any) {
    return this.catalog.priceOrderItems(data?.items ?? [], data?.country);
  }

  // Stock is taken between pricing and order placement, never after: see
  // `CatalogService.reserveListingStock`. The gateway calls `reserve` before
  // `place_order` and `release` on any path that unwinds the order.
  @MessagePattern({ cmd: 'reserve_listing_stock' })
  tcpReserveListingStock(@Payload() data: any) {
    return this.catalog.reserveListingStock(data?.items ?? data?.lines ?? []);
  }

  // Listing-level moderation. An offer on an existing product creates no new
  // `products` row, so it never reaches the product approvals queue — these are
  // the routes that let it be seen and decided.
  @MessagePattern({ cmd: 'admin_pending_listings' })
  tcpAdminPendingListings(@Payload() d: PaginatedMessage) {
    return this.svc.getPendingListings(
      d?.page || 1,
      d?.limit || 20,
      (d as { scope?: string })?.scope ?? this.payloadRegion(d),
    );
  }

  @MessagePattern({ cmd: 'admin_approve_listing' })
  tcpAdminApproveListing(@Payload() d: IdMessage & DtoMessage) {
    return this.svc.approveListing(
      d?.id ?? d?.listingId,
      d?.adminId || 'admin',
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_reject_listing' })
  tcpAdminRejectListing(@Payload() d: IdMessage & DtoMessage) {
    return this.svc.rejectListing(
      d?.id ?? d?.listingId,
      d?.adminId || 'admin',
      d?.reason || '',
      (d as { scope?: string })?.scope,
    );
  }

  @MessagePattern({ cmd: 'release_listing_stock' })
  tcpReleaseListingStock(@Payload() data: any) {
    return this.catalog.releaseListingStock(data?.items ?? data?.lines ?? []);
  }

  // Served the storefront catalogue read, which filters to APPROVED and active
  // products — so the admin product list could not show the pending or rejected
  // ones it exists to moderate, and had no market predicate at all.
  @MessagePattern({ cmd: 'admin_get_products' })
  tcpAdminGetProducts(@Payload() data: any) {
    return this.admin.getProductsForAdmin({
      region: data?.scope ?? this.payloadRegion(data),
      status: data?.status,
      page: data?.page,
      limit: data?.limit,
    });
  }

  // The approvals queue. `getPendingProducts` already existed but was reachable
  // only over this service's own HTTP route, so the gateway could not call it
  // and the queue was wired to the APPROVED-only catalogue read instead.
  @MessagePattern({ cmd: 'admin_get_pending_products' })
  tcpAdminGetPendingProducts(@Payload() data?: any) {
    return this.admin.getPendingProducts(data?.scope ?? this.payloadRegion(data));
  }

  /**
   * Product detail for admin review, with the one field the gateway needs to
   * scope it: the seller's market.
   *
   * `products` has no market column, so a product detail carried nothing the
   * gateway could check `assertRecordInScope` against — a regional admin could
   * open any product in the platform by id. The owner lookup is a second read
   * rather than a join because `getProductById` is the storefront's own cached
   * read and is not this surface's to reshape.
   */
  @MessagePattern({ cmd: 'admin_get_product_by_id' })
  async tcpAdminGetProductById(@Payload() id: string) {
    const product = (await this.catalog.getProductById(id)) as {
      seller_id?: string | null;
    } | null;
    if (!product) return product;
    const owner = product.seller_id ? await this.admin.sellerMarket(product.seller_id) : null;
    return { ...product, sellerRegionCode: owner };
  }

  @MessagePattern({ cmd: 'admin_approve_product' })
  tcpAdminApproveProduct(@Payload() data: any) {
    return this.svc.approveProduct(data?.id, data?.adminId || 'admin', data?.scope);
  }

  @MessagePattern({ cmd: 'admin_reject_product' })
  tcpAdminRejectProduct(@Payload() data: any) {
    return this.svc.rejectProduct(
      data?.id,
      data?.adminId || 'admin',
      data?.reason || 'Violates policy',
      data?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin_get_categories' })
  tcpAdminGetCategories() {
    return this.catalog.getCategories();
  }

  // `d?.dto ?? d` — the gateway wraps the body as `{ dto }` (as every other
  // admin pattern here expects), and these two handed the *wrapper* to the
  // service. `dto.name` was therefore always undefined: a category created
  // from the admin panel got a null name and an empty slug.
  @MessagePattern({ cmd: 'admin_create_category' })
  tcpAdminCreateCategory(@Payload() d: DtoMessage) {
    return this.admin.createCategory(d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_update_category' })
  tcpAdminUpdateCategory(@Payload() d: IdMessage & DtoMessage) {
    return this.admin.updateCategory(requireId(d?.id, 'record'), d?.dto ?? d);
  }

  @MessagePattern({ cmd: 'admin_delete_category' })
  tcpAdminDeleteCategory(@Payload() d: IdMessage | string) {
    return this.admin.deleteCategory(requireId(messageId(d), 'record'));
  }

  @MessagePattern({ cmd: 'admin_get_brands' })
  tcpAdminGetBrands() {
    return this.catalog.getBrands();
  }

  @MessagePattern({ cmd: 'admin_get_orders' })
  tcpAdminGetOrders(@Payload() data: any) {
    return this.svc.getOrders(data);
  }

  @MessagePattern({ cmd: 'admin_get_payouts' })
  tcpAdminGetPayouts(@Payload() data: any) {
    return this.admin.getAdminPayouts(data);
  }

  @MessagePattern({ cmd: 'admin_get_campaigns' })
  tcpAdminGetCampaigns(@Payload() data: any) {
    return this.admin.getAdminCampaigns(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ TIER 6 — New Entity Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Return Requests ──────────────────────────────────────────────────────

  @Post('returns')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createReturn(@Body() dto: CreateReturnDto) {
    return this.fulfillment.createReturnRequest(dto);
  }

  @Get('returns')
  @UseGuards(JwtAuthGuard)
  getReturns(
    @Query('customerId') customerId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.fulfillment.getReturnRequests({
      customerId,
      sellerId,
      status,
      page: +page,
      limit: +limit,
    });
  }

  @Get('returns/:id')
  @UseGuards(JwtAuthGuard)
  getReturnById(@Param('id') id: string) {
    return this.fulfillment.getReturnRequestById(id);
  }

  @Put('returns/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateReturnStatus(@Param('id') id: string, @Body() dto: UpdateReturnStatusDto) {
    return this.fulfillment.updateReturnStatus(id, dto);
  }

  @Put('returns/:id/assign-pickup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  assignReturnPickup(@Param('id') id: string, @Body() dto: AssignReturnPickupDto) {
    return this.fulfillment.assignReturnPickup(id, dto);
  }

  @MessagePattern({ cmd: 'create_return' })
  tcpCreateReturn(@Payload() data: any) {
    return this.fulfillment.createReturnRequest(data);
  }

  @MessagePattern({ cmd: 'get_returns' })
  tcpGetReturns(@Payload() data: any) {
    return this.fulfillment.getReturnRequests(data);
  }

  @MessagePattern({ cmd: 'get_return_by_id' })
  tcpGetReturnById(@Payload() data: any) {
    return this.fulfillment.getReturnRequestById(typeof data === 'string' ? data : data?.id);
  }

  @MessagePattern({ cmd: 'update_return_status' })
  tcpUpdateReturnStatus(@Payload() data: any) {
    return this.fulfillment.updateReturnStatus(data?.id, data, actorOf(data), data?.scope);
  }

  @MessagePattern({ cmd: 'get_seller_for_invoice' })
  tcpGetSellerForInvoice(@Payload() data: any) {
    return this.catalog.getSellerForInvoice(data?.sellerId);
  }

  @MessagePattern({ cmd: 'create_price_alert' })
  tcpCreatePriceAlert(@Payload() data: any) {
    return this.fulfillment.createPriceAlert(data);
  }

  @MessagePattern({ cmd: 'list_price_alerts' })
  tcpListPriceAlerts(@Payload() data: any) {
    return this.fulfillment.listPriceAlerts(data?.customerId);
  }

  @MessagePattern({ cmd: 'delete_price_alert' })
  tcpDeletePriceAlert(@Payload() data: any) {
    return this.fulfillment.deletePriceAlert(data?.id, data?.customerId);
  }

  @MessagePattern({ cmd: 'sweep_price_alerts' })
  tcpSweepPriceAlerts(@Payload() data: any) {
    return this.fulfillment.sweepPriceAlerts(data?.productId);
  }

  @MessagePattern({ cmd: 'report_product' })
  tcpReportProduct(@Payload() data: any) {
    return this.fulfillment.reportProduct(data);
  }

  @MessagePattern({ cmd: 'list_product_reports' })
  tcpListProductReports(@Payload() data: any) {
    return this.fulfillment.listProductReports(data ?? {});
  }

  @MessagePattern({ cmd: 'resolve_product_report' })
  tcpResolveProductReport(@Payload() data: any) {
    return this.fulfillment.resolveProductReport(data?.id, data, data?.adminId);
  }

  @MessagePattern({ cmd: 'cancel_return' })
  tcpCancelReturn(@Payload() data: any) {
    return this.fulfillment.cancelReturn(data?.id, data?.customerId);
  }

  @MessagePattern({ cmd: 'assign_return_pickup' })
  tcpAssignReturnPickup(@Payload() data: any) {
    return this.fulfillment.assignReturnPickup(data?.id, data);
  }

  // ── Coupons ──────────────────────────────────────────────────────────────

  @Post('coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.fulfillment.createCoupon(dto);
  }

  @Get('coupons')
  getCoupons(
    @Query('sellerId') sellerId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.fulfillment.getCoupons({
      sellerId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: +page,
      limit: +limit,
    });
  }

  @Get('coupons/:id')
  getCouponById(@Param('id') id: string) {
    return this.fulfillment.getCouponById(id);
  }

  @Post('coupons/validate')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.fulfillment.validateCoupon(dto);
  }

  @Post('coupons/redeem')
  @UseGuards(JwtAuthGuard)
  redeemCoupon(@Body() dto: RedeemCouponDto) {
    return this.fulfillment.redeemCoupon(dto);
  }

  @Put('coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateCoupon(@Param('id') id: string, @Body() dto: CouponUpsertDto) {
    return this.fulfillment.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteCoupon(@Param('id') id: string) {
    return this.fulfillment.deleteCoupon(id);
  }

  @Get('coupons/:id/usage')
  @UseGuards(JwtAuthGuard)
  getCouponUsage(@Param('id') id: string) {
    return this.fulfillment.getCouponUsageStats(id);
  }

  @MessagePattern({ cmd: 'validate_coupon' })
  tcpValidateCoupon(@Payload() data: any) {
    return this.fulfillment.validateCoupon(data);
  }

  @MessagePattern({ cmd: 'redeem_coupon' })
  tcpRedeemCoupon(@Payload() data: any) {
    return this.fulfillment.redeemCoupon(data);
  }

  @MessagePattern({ cmd: 'get_coupons' })
  tcpGetCoupons(@Payload() data: any) {
    return this.fulfillment.getCoupons(data);
  }

  // ── Shipment Tracking ────────────────────────────────────────────────────

  @Post('tracking/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  addTrackingEvent(@Body() dto: AddTrackingEventDto) {
    return this.fulfillment.addTrackingEvent(dto);
  }

  @Get('tracking/order/:orderId')
  getTrackingByOrder(@Param('orderId') orderId: string) {
    return this.fulfillment.getTrackingEvents(orderId);
  }

  @Get('tracking/:trackingId')
  getTrackingById(@Param('trackingId') trackingId: string) {
    return this.fulfillment.getTrackingByTrackingId(trackingId);
  }

  @Post('tracking/webhook')
  ingestWebhook(@Body() dto: CourierWebhookDto) {
    return this.fulfillment.ingestCourierWebhook(dto);
  }

  @MessagePattern({ cmd: 'add_tracking_event' })
  tcpAddTracking(@Payload() data: any) {
    return this.fulfillment.addTrackingEvent(data, actorOf(data));
  }

  @MessagePattern({ cmd: 'get_tracking' })
  tcpGetTracking(@Payload() data: any) {
    return this.fulfillment.getTrackingEvents(data?.orderId);
  }

  // ── Product Variants ─────────────────────────────────────────────────────

  @Post('products/:productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createVariant(@Param('productId') productId: string, @Body() dto: CreateVariantDto) {
    return this.fulfillment.createVariant(productId, dto);
  }

  @Get('products/:productId/variants')
  getVariants(@Param('productId') productId: string) {
    return this.fulfillment.getVariants(productId);
  }

  @Get('variants/:id')
  getVariantById(@Param('id') id: string) {
    return this.fulfillment.getVariantById(id);
  }

  @Put('variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateVariant(@Param('id') id: string, @Body() dto: VariantUpsertDto) {
    return this.fulfillment.updateVariant(id, dto);
  }

  @Delete('variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteVariant(@Param('id') id: string) {
    return this.fulfillment.deleteVariant(id);
  }

  @Put('variants/:id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateVariantStock(@Param('id') id: string, @Body() dto: UpdateVariantStockDto) {
    return this.fulfillment.updateVariantStock(id, dto);
  }

  @Get('sellers/:sellerId/low-stock-variants')
  @UseGuards(JwtAuthGuard)
  getLowStockVariants(@Param('sellerId') sellerId: string) {
    return this.fulfillment.getLowStockVariants(sellerId);
  }

  @MessagePattern({ cmd: 'get_variants' })
  tcpGetVariants(@Payload() data: any) {
    return this.fulfillment.getVariants(data?.productId);
  }

  @MessagePattern({ cmd: 'update_variant_stock' })
  tcpUpdateStock(@Payload() data: any) {
    return this.fulfillment.updateVariantStock(data?.id, data, actorOf(data), data?.scope);
  }

  // ── Product Q&A ──────────────────────────────────────────────────────────

  @Post('products/:productId/questions')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createQuestion(@Param('productId') productId: string, @Body() dto: CreateQuestionDto) {
    return this.fulfillment.createQuestion({ ...dto, productId });
  }

  @Get('products/:productId/questions')
  getQuestions(
    @Param('productId') productId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.fulfillment.getQuestions(productId, +page, +limit);
  }

  @Post('questions/:questionId/answers')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createAnswer(@Param('questionId') questionId: string, @Body() dto: CreateAnswerDto) {
    return this.fulfillment.createAnswer(questionId, dto);
  }

  @Get('questions/:questionId/answers')
  getAnswers(@Param('questionId') questionId: string) {
    return this.fulfillment.getAnswers(questionId);
  }

  @Post('questions/:id/upvote')
  @UseGuards(JwtAuthGuard)
  upvoteQuestion(@Param('id') id: string) {
    return this.fulfillment.upvoteQuestion(id);
  }

  @Post('answers/:id/helpful')
  @UseGuards(JwtAuthGuard)
  voteHelpful(@Param('id') id: string) {
    return this.fulfillment.voteAnswerHelpful(id);
  }

  @Put('answers/:id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  acceptAnswer(@Param('id') id: string) {
    return this.fulfillment.acceptAnswer(id);
  }

  @MessagePattern({ cmd: 'get_questions' })
  tcpGetQuestions(@Payload() data: any) {
    return this.fulfillment.getQuestions(data?.productId, data?.page, data?.limit);
  }

  @MessagePattern({ cmd: 'create_question' })
  tcpCreateQuestion(@Payload() data: any) {
    return this.fulfillment.createQuestion(data);
  }

  @MessagePattern({ cmd: 'create_answer' })
  tcpCreateAnswer(@Payload() data: any) {
    return this.fulfillment.createAnswer(data?.questionId, data);
  }

  // ── Delivery Assignments ─────────────────────────────────────────────────

  @Post('delivery-assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(AdminForwardingValidationPipe)
  createDeliveryAssignment(@Body() dto: DeliveryAssignmentDto) {
    return this.fulfillment.createDeliveryAssignment(dto);
  }

  @Get('delivery-assignments')
  @UseGuards(JwtAuthGuard)
  getDeliveryAssignments(
    @Query('partnerId') partnerId?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.fulfillment.getDeliveryAssignments({
      partnerId,
      orderId,
      status,
      page: +page,
      limit: +limit,
    });
  }

  @Get('delivery-assignments/:id')
  @UseGuards(JwtAuthGuard)
  getDeliveryAssignmentById(@Param('id') id: string) {
    return this.fulfillment.getDeliveryAssignmentById(id);
  }

  @Put('delivery-assignments/:id/status')
  @UseGuards(JwtAuthGuard)
  updateDeliveryStatus(@Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto) {
    return this.fulfillment.updateDeliveryStatus(id, dto);
  }

  @Post('delivery-assignments/:id/verify-otp')
  @UseGuards(JwtAuthGuard)
  verifyDeliveryOtp(@Param('id') id: string, @Body('otp') otp: string) {
    return this.fulfillment.verifyDeliveryOtp(id, otp);
  }

  @Post('delivery-assignments/:id/proof')
  @UseGuards(JwtAuthGuard)
  submitDeliveryProof(@Param('id') id: string, @Body() dto: SubmitDeliveryProofDto) {
    return this.fulfillment.submitDeliveryProof(id, dto);
  }

  @Get('delivery-assignments/partner/:partnerId/active')
  @UseGuards(JwtAuthGuard)
  getPartnerActive(@Param('partnerId') partnerId: string) {
    return this.fulfillment.getPartnerActiveDelivery(partnerId);
  }

  @MessagePattern({ cmd: 'create_delivery_assignment' })
  tcpCreateAssignment(@Payload() data: any) {
    return this.fulfillment.createDeliveryAssignment(data);
  }

  @MessagePattern({ cmd: 'update_delivery_status' })
  tcpUpdateDeliveryStatus(@Payload() data: any) {
    return this.fulfillment.updateDeliveryStatus(data?.id, data);
  }

  @MessagePattern({ cmd: 'verify_delivery_otp' })
  tcpVerifyOtp(@Payload() data: any) {
    return this.fulfillment.verifyDeliveryOtp(data?.id, data?.otp, data?.scope);
  }

  @MessagePattern({ cmd: 'get_partner_active_delivery' })
  tcpPartnerActive(@Payload() data: any) {
    return this.fulfillment.getPartnerActiveDelivery(data?.partnerId);
  }

  // ── Phase 2 TCP Handlers ────────────────────────────────────────────────

  /**
   * The ten analytics reads take the market the gateway resolved.
   *
   * They used to refuse any scoped caller through a `refuseScopedReport`
   * wrapper, because `MarketplaceAnalyticsService` had no region parameter and
   * answering would have handed a regional admin the platform's numbers under
   * their own market's name. It has one on every method now (R9), so they
   * answer — `marketPredicate` puts the lock ahead of whatever `?country=`
   * asked for, and `undefined` (a global admin) still means every market.
   *
   * There is no per-controller refusal wrapper left to drift: a read that
   * genuinely cannot be attributed calls `refuseUnattributable` at the handler
   * that has the problem, where a reviewer can see it.
   */
  @MessagePattern({ cmd: 'admin_get_revenue_analytics' })
  tcpRevenueAnalytics(@Payload() data: any) {
    return this.analytics.getRevenueAnalytics(
      data?.period,
      marketPredicate(data?.scope, data?.region),
    );
  }

  @MessagePattern({ cmd: 'admin_get_conversion_funnel' })
  tcpConversionFunnel(@Payload() data: any) {
    return this.analytics.getConversionFunnel(
      data?.period,
      marketPredicate(data?.scope, data?.region),
    );
  }

  @MessagePattern({ cmd: 'admin_get_seller_rankings' })
  tcpSellerRankings(@Payload() data: any) {
    return this.analytics.getSellerRankings(
      data?.sortBy,
      marketPredicate(data?.scope, data?.region),
    );
  }

  @MessagePattern({ cmd: 'admin_get_category_performance' })
  tcpCategoryPerformance(@Payload() data?: any) {
    return this.analytics.getCategoryPerformance(marketPredicate(data?.scope, data?.region));
  }

  @MessagePattern({ cmd: 'admin_get_regional_performance' })
  tcpRegionalPerformance(@Payload() data?: any) {
    return this.analytics.getRegionalPerformance(marketPredicate(data?.scope, data?.region));
  }

  @MessagePattern({ cmd: 'admin_get_inventory_aging' })
  tcpInventoryAging(@Payload() data?: any) {
    return this.analytics.getInventoryAging(marketPredicate(data?.scope, data?.region));
  }

  @MessagePattern({ cmd: 'admin_get_return_analysis' })
  tcpReturnAnalysis(@Payload() data?: any) {
    return this.analytics.getReturnRateAnalysis(marketPredicate(data?.scope, data?.region));
  }

  @MessagePattern({ cmd: 'admin_get_fraud_alerts' })
  tcpFraudAlerts(@Payload() data?: any) {
    return this.analytics.getFraudAlerts(marketPredicate(data?.scope, data?.region));
  }

  @MessagePattern({ cmd: 'admin_get_sla_compliance' })
  tcpSLACompliance(@Payload() data: any) {
    return this.analytics.getSLACompliance(
      data?.sellerId,
      marketPredicate(data?.scope, data?.region),
    );
  }

  @MessagePattern({ cmd: 'admin_get_penalty_ledger' })
  tcpPenaltyLedger(@Payload() data: any) {
    return this.analytics.getPenaltyLedger(
      data?.sellerId,
      marketPredicate(data?.scope, data?.region),
    );
  }

  @MessagePattern({ cmd: 'seller_get_dashboard' })
  tcpSellerDashboard(@Payload() data: any) {
    return this.svc.getSellerDashboard(data?.sellerId);
  }

  @MessagePattern({ cmd: 'seller_get_coupons' })
  tcpSellerCoupons(@Payload() data: any) {
    return this.svc.getSellerCoupons(data?.sellerId);
  }

  @MessagePattern({ cmd: 'seller_create_coupon' })
  tcpSellerCreateCoupon(@Payload() data: any) {
    return this.svc.createSellerCoupon(data?.sellerId, data);
  }

  @MessagePattern({ cmd: 'seller_get_bundles' })
  tcpSellerBundles(@Payload() data: any) {
    return this.svc.getProductBundles(data?.sellerId);
  }

  @MessagePattern({ cmd: 'seller_create_bundle' })
  tcpSellerCreateBundle(@Payload() data: any) {
    return this.svc.createProductBundle(data);
  }

  @MessagePattern({ cmd: 'reject_seller' })
  tcpRejectSeller(@Payload() data: any) {
    return this.svc.rejectSeller(data?.id || data?.sellerId, data);
  }

  @MessagePattern({ cmd: 'reactivate_seller' })
  tcpReactivateSeller(@Payload() data: any) {
    return this.svc.reactivateSeller(data?.id || data?.sellerId);
  }

  // ── Brand Follow TCP Handlers ────────────────────────────────────────────

  @MessagePattern({ cmd: 'brand_follow' })
  tcpBrandFollow(@Payload() data: any) {
    return this.brandFollowSvc.followBrand(data?.userId, data?.brandId);
  }

  @MessagePattern({ cmd: 'brand_unfollow' })
  tcpBrandUnfollow(@Payload() data: any) {
    return this.brandFollowSvc.unfollowBrand(data?.userId, data?.brandId);
  }

  @MessagePattern({ cmd: 'brand_is_following' })
  tcpIsFollowing(@Payload() data: any) {
    return this.brandFollowSvc.isFollowing(data?.userId, data?.brandId);
  }

  @MessagePattern({ cmd: 'brand_follower_count' })
  tcpFollowerCount(@Payload() data: any) {
    return this.brandFollowSvc.getFollowerCount(data?.brandId);
  }

  @MessagePattern({ cmd: 'brand_followed_list' })
  tcpFollowedBrands(@Payload() data: any) {
    return this.brandFollowSvc.getFollowedBrands(data?.userId, data?.page, data?.limit);
  }

  @MessagePattern({ cmd: 'brand_feed' })
  tcpBrandFeed(@Payload() data: any) {
    return this.brandFollowSvc.getBrandFeed(data?.userId, data?.page, data?.limit, data?.type);
  }

  @MessagePattern({ cmd: 'brand_updates' })
  tcpBrandUpdates(@Payload() data: any) {
    return this.brandFollowSvc.getBrandUpdates(data?.brandId, data?.page, data?.limit);
  }

  @MessagePattern({ cmd: 'brand_create_update' })
  tcpCreateBrandUpdate(@Payload() data: any) {
    return this.brandFollowSvc.createBrandUpdate(data?.brandId, data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ Gateway-remediation TCP handlers (wire real domain services)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Wishlist ───────────────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_wishlist' })
  tcpGetWishlist(@Payload() data: any) {
    return this.svc.getWishlist(data?.userId);
  }

  @MessagePattern({ cmd: 'add_to_wishlist' })
  tcpAddToWishlist(@Payload() data: any) {
    return this.svc.addToWishlist({ userId: data?.userId, productId: data?.productId });
  }

  @MessagePattern({ cmd: 'remove_from_wishlist' })
  tcpRemoveFromWishlist(@Payload() data: any) {
    return this.svc.removeFromWishlist(data?.userId, data?.productId);
  }

  // ── Reviews ────────────────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'vote_review_helpful' })
  tcpVoteReviewHelpful(@Payload() d: any) {
    return this.svc.voteReviewHelpful(d?.reviewId, d?.customerId);
  }

  @MessagePattern({ cmd: 'get_product_reviews' })
  tcpGetProductReviews(@Payload() data: any) {
    return this.svc.getProductReviews(data?.productId, data?.page, data?.limit);
  }

  @MessagePattern({ cmd: 'create_review' })
  tcpCreateReview(@Payload() data: any) {
    return this.svc.addProductReview(data?.productId, data);
  }

  // ── Coupon CRUD ────────────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_coupon_by_id' })
  tcpGetCouponById(@Payload() data: any) {
    return this.fulfillment.getCouponById(typeof data === 'string' ? data : data?.id);
  }

  @MessagePattern({ cmd: 'create_coupon' })
  tcpCreateCoupon(@Payload() data: any) {
    return this.fulfillment.createCoupon(data, actorOf(data), data?.scope);
  }

  @MessagePattern({ cmd: 'update_coupon' })
  tcpUpdateCoupon(@Payload() data: any) {
    return this.fulfillment.updateCoupon(data?.id, data?.dto ?? data, actorOf(data), data?.scope);
  }

  @MessagePattern({ cmd: 'delete_coupon' })
  tcpDeleteCoupon(@Payload() data: any) {
    return this.fulfillment.deleteCoupon(
      typeof data === 'string' ? data : data?.id,
      actorOf(data),
      typeof data === 'string' ? undefined : data?.scope,
    );
  }

  @MessagePattern({ cmd: 'get_coupon_usage' })
  tcpGetCouponUsage(@Payload() data: any) {
    return this.fulfillment.getCouponUsageStats(
      typeof data === 'string' ? data : data?.id,
      actorOf(data),
      typeof data === 'string' ? undefined : data?.scope,
    );
  }

  // ── Variant CRUD ───────────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'create_variant' })
  tcpCreateVariant(@Payload() data: any) {
    return this.fulfillment.createVariant(
      data?.productId,
      data?.dto ?? data,
      actorOf(data),
      data?.scope,
    );
  }

  @MessagePattern({ cmd: 'get_variant_by_id' })
  tcpGetVariantById(@Payload() data: any) {
    return this.fulfillment.getVariantById(typeof data === 'string' ? data : data?.id);
  }

  @MessagePattern({ cmd: 'update_variant' })
  tcpUpdateVariant(@Payload() data: any) {
    return this.fulfillment.updateVariant(data?.id, data?.dto ?? data, actorOf(data), data?.scope);
  }

  @MessagePattern({ cmd: 'delete_variant' })
  tcpDeleteVariant(@Payload() data: any) {
    return this.fulfillment.deleteVariant(
      typeof data === 'string' ? data : data?.id,
      actorOf(data),
      typeof data === 'string' ? undefined : data?.scope,
    );
  }

  @MessagePattern({ cmd: 'get_low_stock_variants' })
  tcpGetLowStockVariants(@Payload() data: any) {
    return this.fulfillment.getLowStockVariants(
      typeof data === 'string' ? data : data?.sellerId,
      actorOf(data),
      typeof data === 'string' ? undefined : data?.scope,
    );
  }

  // ── Gift Cards ─────────────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'gift_card_balance' })
  tcpGiftCardBalance(@Payload() data: any) {
    return this.svc.getGiftCardBalance(typeof data === 'string' ? data : data?.code);
  }

  @MessagePattern({ cmd: 'gift_card_redeem' })
  tcpGiftCardRedeem(@Payload() data: any) {
    return this.svc.redeemGiftCard(data?.code, data?.orderId, data?.amount, data?.userId);
  }

  // ── Q&A (extra) ────────────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_answers' })
  tcpGetAnswers(@Payload() data: any) {
    return this.fulfillment.getAnswers(typeof data === 'string' ? data : data?.questionId);
  }

  @MessagePattern({ cmd: 'upvote_question' })
  tcpUpvoteQuestion(@Payload() data: any) {
    return this.fulfillment.upvoteQuestion(typeof data === 'string' ? data : data?.questionId);
  }

  @MessagePattern({ cmd: 'vote_answer_helpful' })
  tcpVoteAnswerHelpful(@Payload() data: any) {
    return this.fulfillment.voteAnswerHelpful(typeof data === 'string' ? data : data?.answerId);
  }

  @MessagePattern({ cmd: 'accept_answer' })
  tcpAcceptAnswer(@Payload() data: any) {
    return this.fulfillment.acceptAnswer(typeof data === 'string' ? data : data?.answerId);
  }

  // ── Delivery reads ─────────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_delivery_assignments' })
  tcpGetDeliveryAssignments(@Payload() data: any) {
    return this.fulfillment.getDeliveryAssignments(data ?? {});
  }

  @MessagePattern({ cmd: 'get_delivery_assignment_by_id' })
  tcpGetDeliveryAssignmentById(@Payload() data: any) {
    return typeof data === 'string'
      ? this.fulfillment.getDeliveryAssignmentById(data)
      : this.fulfillment.getDeliveryAssignmentById(data?.id, data?.scope);
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_notifications' })
  tcpGetNotifications(@Payload() data: any) {
    return this.svc.getUserNotifications(data?.userId, data?.page, data?.limit);
  }

  @MessagePattern({ cmd: 'mark_notification_read' })
  tcpMarkNotificationRead(@Payload() data: any) {
    return this.svc.markNotificationRead(data?.id, data?.userId);
  }

  @MessagePattern({ cmd: 'mark_all_notifications_read' })
  tcpMarkAllNotificationsRead(@Payload() data: any) {
    return this.svc.markAllNotificationsRead(data?.userId);
  }

  // ── Account / Discovery ────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_recently_viewed' })
  tcpGetRecentlyViewed(@Payload() data: any) {
    return this.svc.getRecentlyViewed(typeof data === 'string' ? data : data?.userId);
  }

  @MessagePattern({ cmd: 'clear_recently_viewed' })
  tcpClearRecentlyViewed(@Payload() data: any) {
    return this.svc.clearRecentlyViewed(typeof data === 'string' ? data : data?.userId);
  }

  @MessagePattern({ cmd: 'get_buy_again' })
  tcpGetBuyAgain(@Payload() data: any) {
    return this.svc.getBuyAgain(data?.userId, data?.limit);
  }

  @MessagePattern({ cmd: 'get_customer_orders' })
  tcpGetCustomerOrders(@Payload() data: any) {
    return this.svc.getCustomerOrders(data ?? {});
  }

  @MessagePattern({ cmd: 'get_product_bundles' })
  tcpGetProductBundles(@Payload() data: any) {
    return this.svc.getProductBundles(data?.sellerId);
  }

  @MessagePattern({ cmd: 'get_emi_options' })
  tcpGetEmiOptions(@Payload() data: any) {
    return this.svc.getEmiOptions(typeof data === 'string' ? data : data?.productId);
  }

  @MessagePattern({ cmd: 'get_order_invoice' })
  tcpGetOrderInvoice(@Payload() data: any) {
    return typeof data === 'string'
      ? this.svc.getOrderInvoice(data)
      : this.svc.getOrderInvoice(data?.orderId, data?.userId);
  }

  // ── Franchise module boundary ───────────────────────────────────────────
  // Consumed by franchise-service. These replace the FranchiseSeller shadow entity
  // that franchise-service used to map onto the marketplace-owned `sellers` table.

  @MessagePattern({ cmd: 'franchise_marketplace_kpis' })
  msgFranchiseKpis(@Payload() d: EmptyMessage) {
    return this.franchiseView.getKpis(d.franchiseId);
  }

  @MessagePattern({ cmd: 'franchise_marketplace_sellers' })
  msgFranchiseSellers(@Payload() d: any) {
    return this.franchiseView.getSellers(d.franchiseId, d.search, d.category, d.status);
  }

  @MessagePattern({ cmd: 'franchise_marketplace_seller_counts' })
  msgFranchiseSellerCounts(@Payload() d: EmptyMessage) {
    return this.franchiseView.getSellerCounts(d.franchiseId);
  }

  @MessagePattern({ cmd: 'franchise_marketplace_update_seller_status' })
  msgFranchiseUpdateSellerStatus(@Payload() d: any) {
    return this.franchiseView.updateSellerStatus(d.franchiseId, d.sellerId, d.status);
  }
}
