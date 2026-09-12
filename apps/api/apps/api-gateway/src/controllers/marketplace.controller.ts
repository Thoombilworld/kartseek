import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  HttpException,
  HttpStatus,
  Optional,
  UseGuards,
  Req,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import {
  AddToCartDto,
  ProductFilterDto,
  SuccessResponseDto,
  ErrorResponseDto,
  GiftCardBalanceDto,
  RedeemGiftCardDto,
  CreateCheckoutDto,
  CreatePriceAlertDto,
  ReportProductDto,
  ResolveProductReportDto,
  ValidateCouponDto,
  RedeemCouponRequestDto,
  CreateQuestionDto,
  CreateAnswerDto,
  VerifyDeliveryOtpDto,
  WishlistProductDto,
  RemoveCartItemDto,
  ForwardedReturnRequestDto,
  ForwardedReturnStatusDto,
  ForwardedPickupDto,
  ForwardedCouponDto,
  ForwardedTrackingEventDto,
  ForwardedVariantDto,
  ForwardedVariantStockDto,
  ForwardedDeliveryAssignmentDto,
  ForwardedDeliveryStatusDto,
  ForwardedDeliveryProofDto,
  ForwardedCartItemDto,
  ForwardedOrderDto,
  ForwardedBrandUpdateDto,
} from '../dto/gateway.dto';
import { MARKETPLACE_PATTERNS } from '../contracts';
import { marketScopeOf, refuseLockedAdmin, resolveScope } from '../guards/market-scope';
import { JwtAuthGuard, ResourceOwnershipGuard, ResourceOwner } from '@app/security';
import { MarketplaceCatalogService } from '../services/marketplace-catalog.service';
import { MarketplaceOrderService } from '../services/marketplace-order.service';
// The gateway's own pair, not `@app/guards`/`@app/decorators`. The two
// `RolesGuard` implementations gave the identical decorator opposite meanings:
// this one is role **AND** every `perm:` key, while `@app/guards`'s is a single
// flat `some()` over the whole argument list, so `@Roles(ADMIN, 'perm:x')` read
// as "an ADMIN who holds x" under one and "any ADMIN, or anyone whose role is
// literally 'perm:x'" under the other (review I2/I3). No route in this file
// carried a `perm:` key — they are all role-only lists, where role-∧-perm
// reduces to the same test — so this changes no route's behaviour today and
// closes the trap the next `perm:` key would have fallen into.
// `guards/one-roles-guard.spec.ts` fails if the other pair comes back.
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { ParseLimitPipe, ParsePagePipe, DEFAULT_PAGE_SIZE } from '../pipes/pagination.pipe';
import { ForwardingValidationPipe } from '../pipes/forwarding-validation.pipe';
import { SellerModuleGuard, SellerModule } from '../guards/seller-module.guard';
import { SellerGateway } from '../gateways/seller.gateway';
import { getRegionConfig } from '@app/region';
import { PublicCache } from '../decorators/public-cache.decorator';

@ApiTags('🛍️ Marketplace')
@ApiBearerAuth('JWT')
@Controller('marketplace')
export class MarketplaceGatewayController {
  private readonly logger = new Logger(MarketplaceGatewayController.name);

  constructor(
    @Inject('MARKETPLACE_SERVICE') private readonly marketplaceClient: ClientProxy,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    // TCP, not the Kafka 'ORDER_SERVICE': these are request/response commands
    // that need a reply, and the order service listens for them over TCP.
    @Inject('ORDER_SERVICE_TCP') private readonly orderClient: ClientProxy,
    private readonly catalogGrpc: MarketplaceCatalogService,
    // Optional so a checkout can never fail because the socket layer is absent
    // (tests construct this controller without it).
    @Optional() private readonly sellerGateway?: SellerGateway,
    // The shared order logic. Optional for the same reason: a hand-constructed
    // controller gets one built over the same clients it was given.
    @Optional() orders?: MarketplaceOrderService,
  ) {
    this.orders =
      orders ?? new MarketplaceOrderService(marketplaceClient, orderClient, sellerGateway);
  }

  private readonly orders: MarketplaceOrderService;

  /** Extract the authenticated user id from the request (populated by JwtAuthGuard). */
  private userId(req: any): string | undefined {
    return req?.user?.id || req?.user?.userId || req?.user?.sub;
  }

  /**
   * The caller's identity, for routes where marketplace-service has to decide
   * whether *this* seller may act on *that* row.
   *
   * `@Roles(SELLER)` answers "is this a seller?", never "is this their listing?"
   * — and SELLER is a role every seller on the platform holds. The routes that
   * forward this were writable across sellers: another seller's variant prices
   * and stock, their coupons, their returns, and tracking events against their
   * orders (which settle commission).
   *
   * Both fields come from the verified JWT. Nothing here is client-supplied, and
   * it travels under the reserved `_actor` key so it cannot be confused with an
   * ordinary payload field the requester chose.
   */
  private actor(req: any): { ownerId?: string; role?: string; regionCode?: string } {
    // `regionCode` is present only for a region-locked admin: the backend then
    // forces every coupon they write into that market and refuses the rest.
    const { region } = marketScopeOf(req);
    return {
      ownerId: this.userId(req),
      role: req?.user?.role,
      ...(region ? { regionCode: region } : {}),
    };
  }

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }

  /**
   * The market this request is browsing.
   *
   * `RegionMiddleware` resolves it once per request from `X-Region-Code`, GPS
   * headers, or IP geolocation, so every catalogue read below can be scoped
   * without each route re-deriving it. An explicit `?country=` query wins, since
   * that is a deliberate request for another market's catalogue.
   */
  private region(req: any, explicit?: string): string | undefined {
    const raw = explicit || req?.regionCode;
    return typeof raw === 'string' && raw.trim() ? raw.trim().toUpperCase() : undefined;
  }

  /** One of the caller's own orders, by number or uuid — see MarketplaceOrderService.fetchOwned. */
  private async fetchOwnedOrder(req: any, orderId: string): Promise<any> {
    return this.orders.fetchOwned(req, orderId);
  }

  /**
   * Read an order's stored delivery address as an object.
   *
   * Checkout serialises the address with `JSON.stringify` before writing it to
   * `orders.deliveryAddress`, so every consumer that treated the column as a
   * nested object silently saw `undefined` for each field. Both shapes are
   * accepted here because older rows were written as objects.
   */
  private parseStoredAddress(raw: unknown): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'object') return raw as Record<string, any>;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : { line: raw };
      } catch {
        // A plain, un-serialised string is still the customer's address line.
        // This catch is doing real work — it is not a swallowed RPC failure.
        return { line: raw };
      }
    }
    return {};
  }

  /** Helper: send a TCP message to marketplace-service with timeout + error handling */
  private async sendToMarketplace<T = any>(cmd: string, payload: any = {}): Promise<T> {
    // Attach the internal service credential to object payloads when configured.
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    const body =
      secret && payload && typeof payload === 'object' && !Array.isArray(payload)
        ? { ...payload, _internalSecret: secret }
        : (payload ?? {});
    try {
      return await lastValueFrom(
        this.marketplaceClient.send<T>({ cmd }, body).pipe(
          timeout(10000),
          // Through the shared helper, not a local copy.
          //
          // This controller carried its own inline version of the rule, and it
          // treated any status from 100 to 599 as a domain error whose message
          // could be forwarded. marketplace-service reports unhandled failures as
          // `{ statusCode: 500, message: <driver text> }`, so a non-uuid sent to
          // the wishlist route answered
          //   500 invalid input syntax for type uuid: "12345"
          // naming the datastore and column type to the caller. `rpcCatch` keeps
          // the original reason for the local copy — read `statusCode` so a
          // missing product is 404 rather than 503 — while forwarding a message
          // only for 4xx, which is the half that was written for the caller.
          catchError(rpcCatch('Marketplace service unavailable')),
        ),
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Marketplace service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ── Home & Discovery ─────────────────────────────────────────────────────

  @Get('home')
  // the storefront feed; an admin banner or a new campaign should surface within a minute
  @PublicCache(60)
  @ApiOperation({
    summary: 'Get marketplace home feed',
    description:
      'Returns featured banners, flash deals, top categories, trending products, ' +
      'top-rated sellers, and curated brand collections. Response is Redis-cached (120s).',
  })
  @ApiOkResponse({ description: 'Full home feed payload' })
  @ApiNotFoundResponse({ description: 'Home data unavailable' })
  @ApiQuery({
    name: 'country',
    required: false,
    example: 'QA',
    description: 'Override the detected market',
  })
  async getMarketplaceHome(@Req() req: any, @Query('country') country?: string) {
    // Deliberately TCP-only, unlike the other catalogue reads below.
    //
    // proto/marketplace.proto's HomeResponse carries only banners / flashDeals /
    // categories / topBrands / featured / topSellers, but the storefront home feed
    // is `trending`, `newArrivals`, `bestSellers`, `dealsOfDay`, `recommended`,
    // `sponsored`, `heroBanners`, `brandPromos`, … as well. Preferring gRPC here
    // returned a truthy-but-truncated object, so six product sections arrived
    // undefined and the web client silently substituted its bundled demo products
    // — whose ids are not in the database, so every one of those cards 404'd on
    // the product detail page. Route home over TCP, which returns the full payload.
    //
    // GetProductById / GetCategories / SearchProducts below still prefer gRPC:
    // their proto messages do describe the whole response.
    //
    // The market is forwarded so the feed is composed for it: banners targeted
    // at this country, and product sections that rank its sellers first. The
    // downstream cache is keyed on it, so this is also what keeps one market's
    // home page from being served to another.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_HOME, {
      country: this.region(req, country),
    });
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all product categories' })
  async getCategories() {
    const viaGrpc = await this.catalogGrpc.getCategories();
    if (viaGrpc) return viaGrpc;
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_CATEGORIES);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', example: 'CAT-001', description: 'Category ID' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async getCategoryById(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_CATEGORY_BY_ID, id);
  }

  // Aliases: frontend uses /category-list and /category-list/:slug
  @Get('category-list')
  // categories change rarely
  @PublicCache(600)
  @ApiOperation({ summary: 'List categories (alias)' })
  async getCategoryList() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_CATEGORIES);
  }

  @Get('category-list/:slug')
  @ApiOperation({ summary: 'Get category by slug (alias)' })
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_CATEGORY_BY_ID, slug);
  }

  /**
   * The attribute schema for a category — its filterable facets and, crucially,
   * which of them are variant axes.
   *
   * Declared before `category-list/:slug` would be reached for this path and
   * kept public deliberately: the seller portal's variant editor and the
   * storefront's colour/size pickers must render the *same* definitions the
   * admin panel authored, and the storefront asks for them before sign-in.
   */
  @Get('categories/:idOrSlug/attributes')
  @ApiOperation({ summary: 'Attribute schema (incl. variant axes) for a category' })
  @ApiParam({ name: 'idOrSlug', example: 'mobiles-tablets' })
  async getCategoryAttributes(@Param('idOrSlug') idOrSlug: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_CATEGORY_ATTRIBUTES, { idOrSlug });
  }

  @Get('category-attributes')
  @ApiOperation({ summary: 'Attribute schema across every category' })
  async getAllCategoryAttributes() {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_CATEGORY_ATTRIBUTES, {});
  }

  // ── Subcategories ───────────────────────────────────────────────────────────
  // The storefront's subcategory landing page has always called these two; there
  // was no public route behind either, so every request 404'd and the page
  // rendered a title de-slugged from the URL with no parent breadcrumb.

  @Get('subcategories')
  @ApiOperation({ summary: 'List subcategories, optionally within one parent category' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Parent category id or slug' })
  async getSubcategories(@Query('categoryId') categoryId?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_SUBCATEGORIES, { categoryId });
  }

  @Get('subcategories/:idOrSlug')
  @ApiOperation({ summary: 'Get a subcategory by id or slug' })
  @ApiParam({ name: 'idOrSlug', example: 'laptops', description: 'Subcategory id or slug' })
  @ApiNotFoundResponse({ description: 'Subcategory not found' })
  async getSubcategoryById(@Param('idOrSlug') idOrSlug: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_SUBCATEGORY_BY_ID, idOrSlug);
  }

  // ── Products ────────────────────────────────────────────────────────────────

  @Get('products/:id')
  // product detail; price changes flow through the buy box
  @PublicCache(120)
  @ApiOperation({ summary: 'Get product detail' })
  @ApiParam({ name: 'id', example: 'PRD-001', description: 'Product ID' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async getProductById(
    @Req() req: any,
    @Param('id') id: string,
    @Query('country') country?: string,
  ) {
    // The market decides which offers and SKUs the detail carries. Server
    // components cannot send the region header, so they pass ?country=.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PRODUCT_BY_ID, {
      id,
      country: this.region(req, country),
    });
  }

  @Get('products')
  // catalogue listing
  @PublicCache(60)
  @ApiOperation({ summary: 'List all products' })
  @ApiQuery({
    name: 'category',
    example: 'electronics',
    required: false,
    description: 'Category slug',
  })
  @ApiQuery({
    name: 'subcategory',
    example: 'electronics-laptops',
    required: false,
    description: 'Subcategory slug',
  })
  @ApiQuery({ name: 'brand', example: 'apple', required: false, description: 'Brand slug' })
  @ApiQuery({ name: 'sort', example: 'price_asc', required: false })
  async getProducts(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('brand') brand?: string,
    @Query('seller') seller?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sort') sort?: string,
  ) {
    // Every filter used to be dropped here — only page/limit were forwarded, so
    // `?category=electronics` silently returned the unfiltered catalog. The
    // downstream handler passes this payload straight through as its filter, and
    // these names match the marketplace service's own /products route.
    //
    // `country` falls back to the region the middleware resolved, so a listing
    // request that does not name a market is still scoped to the caller's.
    const resolvedCountry = this.region(req, country);
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PRODUCTS, {
      page: +page,
      limit: +limit,
      ...(resolvedCountry ? { country: resolvedCountry } : {}),
      ...(category ? { category } : {}),
      ...(subcategory ? { subcategory } : {}),
      ...(brand ? { brand } : {}),
      ...(seller ? { seller } : {}),
      ...(minPrice ? { minPrice: +minPrice } : {}),
      ...(maxPrice ? { maxPrice: +maxPrice } : {}),
      ...(sort ? { sort } : {}),
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search marketplace' })
  @ApiQuery({ name: 'q', example: 'running shoes', description: 'Search query', required: true })
  @ApiQuery({ name: 'page', example: 1, required: false })
  @ApiQuery({ name: 'limit', example: 20, required: false })
  @ApiServiceUnavailableResponse({ description: 'Search service unavailable' })
  async searchMarketplace(
    @Req() req: any,
    @Query('q') query: string,
    @Query() filters: ProductFilterDto,
  ) {
    const page = Number((filters as any)?.page) || 1;
    const limit = Math.min(Number((filters as any)?.limit) || 20, 100);
    const country = this.region(req, (filters as any)?.country);

    // gRPC's SearchProducts carries no market parameter, so it can only answer
    // an unscoped search. Once a region is known the TCP path is the only one
    // that can honour it — falling through to gRPC would return sellers the
    // customer cannot buy from.
    if (!country) {
      const viaGrpc = await this.catalogGrpc.searchProducts(query, page, limit);
      if (viaGrpc) return viaGrpc;
    }
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.SEARCH, { query, page, limit, country });
  }

  // ── Cart (authenticated; identity comes from the JWT, never the client) ─────

  /**
   * Add a marketplace product to the cart.
   *
   * cart-service is a deliberately dumb store: `addItem` takes the display name,
   * unit price and image alongside the id, and its `safeSubtotal` throws on a
   * non-finite total. Both add routes used to forward the request body verbatim —
   * `{ productId, quantity, variantId }` and nothing else — so `price` arrived
   * undefined, `undefined * quantity` was NaN, and EVERY add-to-cart failed. With
   * no RPC filter on cart-service the rejection surfaced as a 503, which made a
   * broken payload look like an outage. Resolve the product here, where the
   * marketplace client already lives, and hand cart-service a complete line.
   *
   * Prices are decimal columns, so TypeORM hands them back as strings — they must
   * be Number()'d or the subtotal becomes string concatenation.
   */
  private async addResolvedItem(
    userId: string | undefined,
    payload: AddToCartDto,
    region?: string,
  ) {
    const productId = (payload as any)?.productId;
    if (!productId) throw new HttpException('productId is required', HttpStatus.BAD_REQUEST);

    // Throws 404 through sendToMarketplace when the product does not exist, which
    // is right: a cart line for a product that cannot be priced is not orderable.
    const product: any = await this.sendToMarketplace(
      MARKETPLACE_PATTERNS.GET_PRODUCT_BY_ID,
      productId,
    );

    // Price the line through the same authority checkout uses, so the cart
    // quotes exactly what the order will charge — including the selected SKU.
    // Reading the buy-box listing here priced every variant at the parent.
    const quantity = Number((payload as any)?.quantity ?? 1) || 1;
    const variantId = (payload as any)?.variantId || undefined;
    const pricing: any = await this.sendToMarketplace(MARKETPLACE_PATTERNS.PRICE_ORDER_ITEMS, {
      items: [{ productId, quantity, variantId }],
      country: region,
    });
    const priced = pricing?.items?.[0];
    if (!pricing?.ok || !priced?.ok) {
      throw new HttpException(
        priced?.reason || pricing?.reason || 'Product is not purchasable',
        HttpStatus.CONFLICT,
      );
    }
    const price = Number(priced.unitPrice);
    if (!Number.isFinite(price) || price <= 0) {
      throw new HttpException('Product is not purchasable', HttpStatus.CONFLICT);
    }

    const images: any[] = Array.isArray(product?.images) ? product.images : [];
    const line = {
      userId,
      productId,
      name: priced.name ?? product?.name ?? 'Product',
      price,
      quantity,
      imageUrl: (images.find((i: any) => i?.isPrimary) ?? images[0])?.url,
      variantId,
      serviceType: 'marketplace',
      // The market this line was priced for; GET /cart shows only the current
      // market's lines so a riyal price never sits under a rupee sign.
      regionCode: region,
    };

    return lastValueFrom(this.cartClient.send({ cmd: 'add_to_cart' }, line)).catch(() => {
      throw new HttpException('Cart service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({ type: AddToCartDto })
  @ApiCreatedResponse({ description: 'Item added to cart' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid product or quantity' })
  async addToCart(@Req() req: any, @Body() payload: AddToCartDto) {
    return this.addResolvedItem(this.userId(req), payload, this.region(req));
  }

  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @Post('cart/:userId')
  @ApiOperation({ summary: 'Add item to cart with user ID' })
  async addToCartWithUserId(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() payload: AddToCartDto,
  ) {
    return this.addResolvedItem(userId, payload, this.region(req));
  }

  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @Get('wishlist/:userId')
  @ApiOperation({ summary: 'Get user wishlist' })
  async getWishlist(@Param('userId') userId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_WISHLIST, { userId });
  }

  @UseGuards(JwtAuthGuard)
  @Get('cart')
  @ApiOperation({ summary: 'Get current cart' })
  @ApiOkResponse({ description: 'Cart contents' })
  async getCart(@Req() req: any) {
    const cart = await lastValueFrom(
      this.cartClient.send({ cmd: 'get_cart' }, { userId: this.userId(req) }),
    ).catch(() => {
      throw new HttpException('Cart service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    });
    return this.scopeCartToRegion(cart, this.region(req));
  }

  /**
   * Only the lines priced for the market being browsed.
   *
   * Lines are priced in the currency of the market they were added in, and the
   * client formats every number in the current market's currency — so a basket
   * started in Doha showed riyal figures under a rupee sign after switching to
   * India. Lines that predate the tag carry no region and stay visible.
   */
  private scopeCartToRegion(payload: any, region?: string) {
    const cart = payload?.cart ?? payload;
    if (!region || !Array.isArray(cart?.items)) return payload;
    const items = cart.items.filter(
      (i: any) => !i?.regionCode || String(i.regionCode).toUpperCase() === region,
    );
    const subtotal =
      Math.round(
        items.reduce(
          (sum: number, i: any) => sum + (Number(i?.price) || 0) * (Number(i?.quantity) || 0),
          0,
        ) * 100,
      ) / 100;
    const scoped = { ...cart, items, subtotal };
    return payload?.cart ? { ...payload, cart: scoped } : scoped;
  }

  // ── Checkout ────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('orders/checkout')
  @ApiOperation({ summary: 'Place a marketplace order' })
  @ApiCreatedResponse({ description: 'Order placed' })
  async createCheckout(@Req() req: any, @Body() payload: CreateCheckoutDto) {
    return this.placeMarketplaceOrder(req, payload);
  }

  /**
   * Place an order, pricing it server-side. The implementation lives in
   * MarketplaceOrderService so the generic `POST /orders/checkout` shares it;
   * see that class for the design notes.
   */
  private async placeMarketplaceOrder(req: any, payload: any) {
    return this.orders.place(req, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', example: 'ORD-1685451234-4291', description: 'Order ID' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async getOrderById(@Req() req: any, @Param('id') id: string) {
    return this.orders.getById(req, id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ TIER 6 — Entity Routes
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Returns ────────────────────────────────────────────────────────────────

  @Post('returns')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a return request' })
  @UsePipes(ForwardingValidationPipe)
  async createReturnRequest(@Req() req: any, @Body() payload: ForwardedReturnRequestDto) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_RETURN, {
      ...payload,
      customerId: this.userId(req),
    });
  }

  @Get('returns')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List my return requests' })
  async getReturnRequests(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    // Customer-facing: always scope to the authenticated customer.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_RETURNS, {
      customerId: this.userId(req),
      status,
      page: +page,
      limit: +limit,
    });
  }

  @Get('returns/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get return request by ID' })
  async getReturnById(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_RETURN_BY_ID, { id });
  }

  @Put('returns/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Update return request status (seller/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async updateReturnStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: ForwardedReturnStatusDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_RETURN_STATUS, {
      id,
      ...payload,
      _actor: this.actor(req),
      scope: this.scopeOf(req, undefined, 'that return request').scope,
    });
  }

  @Post('products/:id/price-alert')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Watch a product for a price drop (customer)',
    description:
      'Records the current buy-box price as the reference. Optionally pass ' +
      '`targetPrice` to be told only at or below a specific figure.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  async createPriceAlert(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: CreatePriceAlertDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_PRICE_ALERT, {
      productId: id,
      customerId: req.user?.userId ?? req.user?.sub,
      targetPrice: body?.targetPrice,
    });
  }

  @Get('price-alerts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Your price-drop alerts (customer)' })
  async listPriceAlerts(@Req() req: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.LIST_PRICE_ALERTS, {
      customerId: req.user?.userId ?? req.user?.sub,
    });
  }

  @Delete('price-alerts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Stop watching a product (customer)' })
  async deletePriceAlert(@Req() req: any, @Param('id') id: string) {
    // Owner comes from the token: without it any caller could delete any alert
    // by guessing an id.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.DELETE_PRICE_ALERT, {
      id,
      customerId: req.user?.userId ?? req.user?.sub,
    });
  }

  @Post('products/:id/report')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Report a listing (customer)',
    description:
      'Flags a product for moderation review. One open report per shopper per product; ' +
      'reporting again updates the existing report rather than creating a second.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  async reportProduct(@Req() req: any, @Param('id') id: string, @Body() body: ReportProductDto) {
    // The reporter is the token subject. Taking it from the body would let a
    // caller file on another shopper's behalf and sidestep the one-per-shopper
    // constraint by inventing reporter ids.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.REPORT_PRODUCT, {
      productId: id,
      reporterId: req.user?.userId ?? req.user?.sub,
      reason: body?.reason,
      details: body?.details,
    });
  }

  // A product report has no market of its own: it is attributed through the
  // reported listing to the seller who owns it, which is the same join every
  // admin product list uses (`admin/admin.service.ts` adminProductQuery). Both
  // routes were unscoped, so the moderation queue showed every market's reports
  // to every regional admin and any of them could resolve any report (audit
  // V10).
  @Get('admin/product-reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // Role-only, deliberately. The reason this comment used to give — that a
  // `perm:` key here would be inert, "a padlock drawn on the route rather than
  // a check", because this controller bound `@app/guards`'s role-only guard —
  // no longer holds: the class now binds the gateway's permission-aware pair
  // (see the import). Adding a key would therefore really narrow these two
  // moderation routes, which is a change to who can work the queue and belongs
  // with the console page that calls them, not to a guard swap. Recorded for
  // the ledger so the next reader knows which of the two it is.
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Product report queue (admin)' })
  @ApiQuery({ name: 'country', required: false })
  async listProductReports(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('productId') productId?: string,
    @Query('country') country?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those reports');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.LIST_PRODUCT_REPORTS, {
      status,
      productId,
      region: market,
      scope,
      page: +page,
      limit: +limit,
    });
  }

  @Put('admin/product-reports/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Resolve a product report (admin)' })
  async resolveProductReport(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: ResolveProductReportDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.RESOLVE_PRODUCT_REPORT, {
      id,
      status: body?.status,
      resolutionNote: body?.resolutionNote,
      adminId: req.user?.userId ?? req.user?.sub,
      scope: this.scopeOf(req, undefined, 'that report').scope,
    });
  }

  @Put('returns/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Withdraw your own return request (customer)' })
  async cancelReturn(@Req() req: any, @Param('id') id: string) {
    // The customer id comes from the token, never the body: accepting it from
    // the caller would let anyone cancel anyone's return by guessing an id.
    const customerId = req.user?.userId ?? req.user?.sub;
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CANCEL_RETURN, { id, customerId });
  }

  @Put('returns/:id/assign-pickup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign pickup for a return (admin)' })
  @UsePipes(ForwardingValidationPipe)
  async assignReturnPickup(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: ForwardedPickupDto,
  ) {
    // `scope` last, after the spread: the pickup body is forwarded and a
    // `scope` key in it would otherwise arrive looking like the gateway's.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ASSIGN_RETURN_PICKUP, {
      id,
      ...payload,
      scope: this.scopeOf(req, undefined, 'that return').scope,
    });
  }

  // ── Coupons ────────────────────────────────────────────────────────────────

  @Get('coupons')
  @ApiOperation({ summary: 'List coupons' })
  async getCoupons(
    @Req() req: any,
    @Query('sellerId') sellerId?: string,
    @Query('isActive') isActive?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    // Unauthenticated route, and every row carries a usable `code` — so it must
    // only ever list offers that are live right now. Without `publicOnly` it
    // returned deactivated, expired and not-yet-started campaigns too, which
    // handed visitors the codes for launches that had not happened.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_COUPONS, {
      region: this.region(req),
      sellerId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: +page,
      limit: +limit,
      publicOnly: true,
    });
  }

  @Get('coupons/:id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  async getCouponById(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_COUPON_BY_ID, { id });
  }

  @Post('coupons')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Create a coupon (seller/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async createCoupon(@Req() req: any, @Body() payload: ForwardedCouponDto) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_COUPON, {
      ...(payload as any),
      _actor: this.actor(req),
      scope: this.scopeOf(req, (payload as any)?.regionCode, 'that coupon').scope,
    });
  }

  @Put('coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Update a coupon (seller/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async updateCoupon(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: ForwardedCouponDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_COUPON, {
      id,
      dto: payload,
      _actor: this.actor(req),
      scope: this.scopeOf(req, (payload as any)?.regionCode, 'that coupon').scope,
    });
  }

  @Delete('coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Deactivate a coupon (seller/admin)' })
  async deleteCoupon(@Req() req: any, @Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.DELETE_COUPON, {
      id,
      _actor: this.actor(req),
      scope: this.scopeOf(req, undefined, 'that coupon').scope,
    });
  }

  @Post('coupons/validate')
  @ApiOperation({ summary: 'Validate a coupon code' })
  async validateCoupon(@Req() req: any, @Body() payload: ValidateCouponDto) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.VALIDATE_COUPON, {
      code: payload.code,
      customerId: this.userId(req) || payload.userId || payload.customerId || 'guest',
      orderTotal: payload.cartTotal || payload.orderTotal || 0,
      paymentMethod: payload.paymentMethod,
      productIds: payload.productIds,
      region: this.region(req),
    });
  }

  @Post('coupons/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Redeem a coupon' })
  async redeemCoupon(@Req() req: any, @Body() payload: RedeemCouponRequestDto) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.REDEEM_COUPON, {
      couponId: payload.couponId,
      customerId: this.userId(req),
      orderId: payload.orderId,
      discountApplied: payload.discountApplied || payload.cartTotal || 0,
    });
  }

  @Get('coupons/:id/usage')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Get coupon usage stats (seller/admin)' })
  async getCouponUsage(@Req() req: any, @Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_COUPON_USAGE, {
      id,
      _actor: this.actor(req),
      scope: this.scopeOf(req, undefined, 'that coupon').scope,
    });
  }

  // ── Shipment Tracking ──────────────────────────────────────────────────────

  @Get('tracking/order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get tracking events for an order' })
  // Same resolution and ownership check as `GET /orders/:id/track` — see there.
  async getTrackingEvents(@Req() req: any, @Param('orderId') orderId: string) {
    const order = await this.fetchOwnedOrder(req, orderId);
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_TRACKING, {
      orderId: order?.orderId ?? order?.id,
    });
  }

  @Get('tracking/:trackingId')
  @ApiOperation({ summary: 'Get tracking by tracking ID' })
  async getTrackingByTrackingId(@Param('trackingId') trackingId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_TRACKING, { orderId: trackingId });
  }

  @Post('tracking/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a tracking event (seller/driver/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async addTrackingEvent(@Req() req: any, @Body() payload: ForwardedTrackingEventDto) {
    // A tracking event that reads DELIVERED settles the order, so it carries the
    // caller's market like every other write: the order's own `region_code` is
    // what the backend checks it against.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADD_TRACKING_EVENT, {
      ...payload,
      _actor: this.actor(req),
      scope: this.scopeOf(req, undefined, 'that order').scope,
    });
  }

  // ── Product Variants ───────────────────────────────────────────────────────

  @Get('products/:productId/variants')
  @ApiOperation({ summary: 'List variants for a product' })
  async getVariants(@Param('productId') productId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_VARIANTS, { productId });
  }

  @Post('products/:productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Create a variant for a product (seller/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async createVariant(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() payload: ForwardedVariantDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_VARIANT, {
      productId,
      dto: payload,
      _actor: this.actor(req),
      scope: this.scopeOf(req, undefined, 'that variant').scope,
    });
  }

  @Get('variants/:id')
  @ApiOperation({ summary: 'Get variant by ID' })
  async getVariantById(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_VARIANT_BY_ID, { id });
  }

  @Put('variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Update a variant (seller/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async updateVariant(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: ForwardedVariantDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_VARIANT, {
      id,
      dto: payload,
      _actor: this.actor(req),
      scope: this.scopeOf(req, undefined, 'that variant').scope,
    });
  }

  @Delete('variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Soft-delete a variant (seller/admin)' })
  async deleteVariant(@Req() req: any, @Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.DELETE_VARIANT, {
      id,
      _actor: this.actor(req),
      scope: this.scopeOf(req, undefined, 'that variant').scope,
    });
  }

  @Put('variants/:id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Update variant stock (seller/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async updateVariantStock(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: ForwardedVariantStockDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_VARIANT_STOCK, {
      id,
      ...payload,
      _actor: this.actor(req),
      scope: this.scopeOf(req, undefined, 'that variant').scope,
    });
  }

  @Get('sellers/:sellerId/low-stock-variants')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Get low-stock variants for a seller (seller/admin)' })
  async getLowStockVariants(@Req() req: any, @Param('sellerId') sellerId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_LOW_STOCK_VARIANTS, {
      sellerId,
      _actor: this.actor(req),
      scope: this.scopeOf(req, undefined, "that seller's stock").scope,
    });
  }

  // ── Product Q&A ────────────────────────────────────────────────────────────

  @Get('products/:productId/questions')
  @ApiOperation({ summary: 'List questions for a product' })
  async getQuestions(
    @Param('productId') productId: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_QUESTIONS, {
      productId,
      page: +page,
      limit: +limit,
    });
  }

  @Post('products/:productId/questions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ask a question about a product' })
  async createQuestion(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() payload: CreateQuestionDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_QUESTION, {
      productId,
      customerId: this.userId(req),
      customerName: req?.user?.name,
      questionText: payload.questionText || payload.text,
    });
  }

  @Get('questions/:questionId/answers')
  @ApiOperation({ summary: 'Get answers for a question' })
  async getAnswers(@Param('questionId') questionId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_ANSWERS, { questionId });
  }

  @Post('questions/:questionId/answers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Answer a product question' })
  async createAnswer(
    @Req() req: any,
    @Param('questionId') questionId: string,
    @Body() payload: CreateAnswerDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_ANSWER, {
      questionId,
      authorId: this.userId(req),
      authorName: req?.user?.name,
      authorRole: req?.user?.role,
      answerText: payload.answerText || payload.text,
    });
  }

  @Post('questions/:questionId/upvote')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upvote a question' })
  async upvoteQuestion(@Param('questionId') questionId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPVOTE_QUESTION, { questionId });
  }

  @Post('reviews/:reviewId/helpful')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark a product review as helpful' })
  async voteReviewHelpful(@Req() req: any, @Param('reviewId') reviewId: string) {
    // Signed-in only: the one-vote-per-person guard needs someone to attribute
    // the vote to, and an anonymous counter is a counter anyone can run up.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.VOTE_REVIEW_HELPFUL, {
      reviewId,
      customerId: this.userId(req),
    });
  }

  @Post('answers/:answerId/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Vote an answer as helpful' })
  async voteAnswerHelpful(@Param('answerId') answerId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.VOTE_ANSWER_HELPFUL, { answerId });
  }

  @Put('answers/:answerId/accept')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Accept an answer (seller/admin)' })
  async acceptAnswer(@Req() req: any, @Param('answerId') answerId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ACCEPT_ANSWER, {
      answerId,
      scope: this.scopeOf(req, undefined, 'that answer').scope,
    });
  }

  // ── Delivery Assignments ───────────────────────────────────────────────────
  //
  // `delivery_assignments.region_code` has existed since the table did and
  // nothing ever read it (audit V12): every route below was market-blind, so a
  // regional admin listed, read, created and progressed shipments in every
  // market — including the OTP verification that closes a delivery, and
  // commission is charged at delivery.
  @Get('delivery-assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List delivery assignments' })
  @ApiQuery({ name: 'country', required: false })
  async getDeliveryAssignments(
    @Req() req: any,
    @Query('partnerId') partnerId?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: string,
    @Query('country') country?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    const { scope, market } = this.scopeOf(req, country, 'those assignments');
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_DELIVERY_ASSIGNMENTS, {
      partnerId,
      orderId,
      status,
      region: market,
      scope,
      page: +page,
      limit: +limit,
    });
  }

  @Get('delivery-assignments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get delivery assignment by ID (driver/seller/admin)' })
  /**
   * Restricted to the roles that have a reason to look at a shipment.
   *
   * This carried JwtAuthGuard alone, so any signed-in customer could read any
   * assignment by id — and the row included `deliveryOtp`, the code that proves
   * the parcel was handed over. The column is `select: false` now, so it no
   * longer travels regardless; narrowing the roles closes the rest of the read
   * (partner name and phone, the customer's address through the order relation).
   */
  async getDeliveryAssignmentById(@Req() req: any, @Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_DELIVERY_ASSIGNMENT_BY_ID, {
      id,
      scope: this.scopeOf(req, undefined, 'that assignment').scope,
    });
  }

  @Post('delivery-assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a delivery assignment (admin)' })
  @UsePipes(ForwardingValidationPipe)
  async createDeliveryAssignment(@Req() req: any, @Body() payload: ForwardedDeliveryAssignmentDto) {
    // No `regionCode` from the body: the backend stamps it from the order being
    // assigned. A market the caller chose is not a market.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_DELIVERY_ASSIGNMENT, {
      ...payload,
      scope: this.scopeOf(req, undefined, 'that assignment').scope,
    });
  }

  @Put('delivery-assignments/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update delivery status (driver/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async updateDeliveryStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: ForwardedDeliveryStatusDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_DELIVERY_STATUS, {
      id,
      ...payload,
      scope: this.scopeOf(req, undefined, 'that assignment').scope,
    });
  }

  @Post('delivery-assignments/:id/verify-otp')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify delivery OTP (driver/admin)' })
  async verifyDeliveryOtp(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: VerifyDeliveryOtpDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.VERIFY_DELIVERY_OTP, {
      id,
      otp: payload.otp,
      scope: this.scopeOf(req, undefined, 'that assignment').scope,
    });
  }

  @Post('delivery-assignments/:id/proof')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Submit delivery proof (driver/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async submitDeliveryProof(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: ForwardedDeliveryProofDto,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.UPDATE_DELIVERY_STATUS, {
      id,
      ...payload,
      scope: this.scopeOf(req, undefined, 'that assignment').scope,
    });
  }

  @Get('delivery-assignments/partner/:partnerId/active')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get active delivery for a partner' })
  async getPartnerActiveDelivery(@Param('partnerId') partnerId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PARTNER_ACTIVE_DELIVERY, { partnerId });
  }

  // ── Bank & Exchange Offers (Customer-facing, served from gateway DB) ────────

  @Get('offers/bank')
  @ApiOperation({ summary: 'Get active bank offers' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by applicable product category',
  })
  @ApiOkResponse({ description: 'Active bank offers' })
  async getActiveBankOffers(@Req() req: any, @Query('category') category?: string) {
    // The live-window and category filtering moved with the data; the gateway
    // held its own query builder against a table it no longer owns. Scoped to
    // the market being browsed: a bank offer is a deal with one country's banks.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_LIST_BANK_OFFERS, {
      activeOnly: true,
      category,
      region: this.region(req),
    });
  }

  @Get('offers/exchange')
  // trade-in programmes run for weeks
  @PublicCache(300)
  @ApiOperation({ summary: 'Get active exchange/trade-in offers' })
  @ApiQuery({
    name: 'targetCategory',
    required: false,
    description: 'Filter by target product category',
  })
  @ApiOkResponse({ description: 'Active exchange offers' })
  async getActiveExchangeOffers(@Req() req: any, @Query('targetCategory') targetCategory?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_LIST_EXCHANGE_OFFERS, {
      activeOnly: true,
      targetCategory,
      // Only trade-in programmes that run in the market being browsed.
      region: this.region(req),
    });
  }

  @Get('products/:id/offers')
  @ApiOperation({ summary: 'Get all offers applicable to a specific product' })
  @ApiParam({ name: 'id', example: 'PRD-001', description: 'Product ID' })
  @ApiOkResponse({ description: 'Bank and exchange offers for a product' })
  async getOffersForProduct(@Param('id') id: string, @Query('category') category?: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_OFFERS_FOR_PRODUCT, {
      productId: id,
      category,
    });
  }

  // ── Phase 1: Customer-Facing Discovery Routes ───────────────────────────

  @Get('flash-deals/active')
  @ApiOperation({ summary: 'Get active flash deals with countdown timers' })
  async getFlashDealsActive(@Req() req: any) {
    // Was GET_FEATURED_PRODUCTS, which answers with the featured list: no
    // `dealStartedAt`, no `dealEndsAt`, so every client rendering this route
    // had nothing to run a countdown from and showed a plain product grid
    // under a "Flash Deals" heading.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_AVAILABLE_FLASH_DEALS, {
      country: this.region(req),
    });
  }

  @Get('deals-of-the-day')
  // refreshed daily, but a sell-out should show quickly
  @PublicCache(60)
  @ApiOperation({ summary: 'Get daily rotating deals' })
  async getDealsOfTheDay() {
    // Was GET_FEATURED_PRODUCTS — top-rated products, with no guarantee any of
    // them were discounted, so the storefront's deals sections were not deals.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_DEALS);
  }

  // The four discovery feeds below asked for the *same* unsorted product page,
  // so /new-arrivals, /best-sellers, /trending and /recommended returned an
  // identical list in an identical order — four merchandising surfaces the
  // storefront presents as curated, all showing the same twenty products.
  // Each now carries the sort that matches what it claims to be, and is scoped
  // to the market being browsed like every other catalogue read.

  @Get('new-arrivals')
  @ApiOperation({ summary: 'Recently listed products, newest first' })
  async getNewArrivals(
    @Req() req: any,
    @Query('page', ParsePagePipe) page: number,
    @Query('limit', ParseLimitPipe) limit: number,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PRODUCTS, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      sort: 'newest',
      country: this.region(req),
    });
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'Best-selling products, by purchase volume proxy' })
  async getBestSellers(
    @Req() req: any,
    @Query('page', ParsePagePipe) page: number,
    @Query('limit', ParseLimitPipe) limit: number,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PRODUCTS, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      sort: 'popular',
      country: this.region(req),
    });
  }

  @Get('products/:id/qa')
  @ApiOperation({ summary: 'Get Q&A thread for a product' })
  async getProductQA(
    @Param('id') productId: string,
    @Query('page', ParsePagePipe) page: number,
    @Query('limit', ParseLimitPipe) limit: number,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_QUESTIONS, {
      productId,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });
  }

  @Post('products/:id/qa')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ask a question about a product' })
  async askProductQuestion(
    @Req() req: any,
    @Param('id') productId: string,
    @Body() body: { text: string },
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_QUESTION, {
      productId,
      customerId: this.userId(req),
      customerName: req?.user?.name,
      questionText: body.text,
    });
  }

  @Post('qa/:questionId/answer')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Answer a product question' })
  async answerProductQuestion(
    @Req() req: any,
    @Param('questionId') questionId: string,
    @Body() body: { text: string },
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_ANSWER, {
      questionId,
      authorId: this.userId(req),
      authorName: req?.user?.name,
      authorRole: req?.user?.role,
      answerText: body.text,
    });
  }

  @Get('products/:id/reviews')
  @ApiOperation({ summary: 'Published reviews and rating breakdown for a product' })
  /**
   * Public — anyone browsing a product page can read its reviews.
   *
   * marketplace-service has answered `get_product_reviews` all along, but the
   * gateway only ever exposed the POST counterpart, so this GET 404'd. The
   * product page filled the gap with three hard-coded reviews signed with
   * invented customer names, shown identically on every product in the
   * catalogue.
   */
  async getProductReviews(
    @Param('id') productId: string,
    @Query('page', ParsePagePipe) page: number,
    @Query('limit', ParseLimitPipe) limit: number,
  ) {
    try {
      return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PRODUCT_REVIEWS, {
        productId,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
    } catch {
      // An unreachable service must not read as "this product has no reviews" in
      // a way that fabricates a rating, so the aggregate comes back null.
      return { productId, reviews: [], total: 0, averageRating: null };
    }
  }

  @Post('products/:id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Write a product review' })
  async createProductReview(
    @Req() req: any,
    @Param('id') productId: string,
    @Body() body: { rating: number; title?: string; comment?: string; photos?: string[] },
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CREATE_REVIEW, {
      productId,
      customerId: this.userId(req),
      customerName: req?.user?.name,
      rating: body.rating,
      title: body.title,
      comment: body.comment,
      imageUrls: body.photos,
    });
  }

  @Get('products/:id/exchange-offers')
  @ApiOperation({ summary: 'Get exchange/trade-in offers for a product' })
  async getExchangeOffers(@Param('id') productId: string) {
    const offers: any = await this.sendToMarketplace(
      MARKETPLACE_PATTERNS.ADMIN_LIST_EXCHANGE_OFFERS,
      {
        activeOnly: true,
      },
    );
    return { data: { productId, exchangeOffers: offers?.data ?? offers ?? [] } };
  }

  @Get('products/:id/emi-options')
  @ApiOperation({ summary: 'Get EMI/finance options for a product' })
  async getEmiOptions(@Param('id') productId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_EMI_OPTIONS, { productId });
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my notification inbox' })
  async getUserNotifications(
    @Req() req: any,
    @Query('page', ParsePagePipe) page: number,
    @Query('limit', ParseLimitPipe) limit: number,
  ) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_NOTIFICATIONS, {
      userId: this.userId(req),
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Put('notifications/read-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsRead(@Req() req: any) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.MARK_ALL_NOTIFICATIONS_READ, {
      userId: this.userId(req),
    });
  }

  @Put('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markNotificationRead(@Req() req: any, @Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.MARK_NOTIFICATION_READ, {
      id,
      userId: this.userId(req),
    });
  }

  @Post('gift-cards/balance')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check gift card balance' })
  @ApiBody({ type: GiftCardBalanceDto })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getGiftCardBalance(@Body() body: GiftCardBalanceDto) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GIFT_CARD_BALANCE, { code: body.code });
  }

  @Post('gift-cards/redeem')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Redeem a gift card against an order' })
  @ApiBody({ type: RedeemGiftCardDto })
  // Bound to the DTO class, not an inline shape: the ValidationPipe only checks
  // classes, so the previous `{ code: string; amount: number }` annotation
  // validated nothing and a negative amount reached the service, where it
  // increased the card's balance. These DTOs already existed — they were simply
  // never wired to the route.
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async redeemGiftCard(@Req() req: any, @Body() body: RedeemGiftCardDto) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GIFT_CARD_REDEEM, {
      code: body.code,
      orderId: body.orderId,
      amount: body.amount,
      userId: this.userId(req),
    });
  }

  @Get('orders/:id/invoice')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the tax invoice for an order' })
  @ApiParam({
    name: 'id',
    description: 'Order number or order UUID, as listed by GET /marketplace/orders',
  })
  /**
   * The invoice for one of the caller's own orders.
   *
   * Built from **order-service**, which is where checkout writes the customer's
   * order — the same source as `GET /marketplace/orders` and `/orders/:id`, so
   * the id the list hands out is the id this route accepts.
   *
   * It used to ask marketplace-service, which looks the order up in
   * `marketplace.marketplace_orders` by primary key. That table holds the
   * *seller-side projection*, whose uuid the customer is never shown, so the
   * route was unreachable by any identifier a customer had: the order number
   * came back 500 ("invalid input syntax for type uuid") and the order-service
   * uuid came back 404. Every "Download Invoice" link was broken.
   *
   * Ownership is enforced by order-service, which rejects an order belonging to
   * another customer — the guard proves the caller is *someone*, not that the
   * order is theirs.
   *
   * Money is copied from the order, never recomputed. The previous
   * implementation derived line tax at a flat 18% and split it into CGST/SGST,
   * which invented an Indian tax breakdown for orders placed in Qatar, the UAE
   * and everywhere else, and produced a `grandTotal` that disagreed with what
   * the customer was actually charged.
   */
  async getOrderInvoice(@Req() req: any, @Param('id') orderId: string) {
    const order: any = await this.fetchOwnedOrder(req, orderId);

    const lines = Array.isArray(order.items) ? order.items : [];
    const items = lines.map((item: any, idx: number) => {
      const unitPrice = Number(item?.price ?? 0) || 0;
      const quantity = Number(item?.quantity ?? 1) || 1;
      return {
        sno: idx + 1,
        name: item?.productName || item?.name || `Item ${idx + 1}`,
        quantity,
        unitPrice,
        total: unitPrice * quantity,
      };
    });

    const subtotal =
      Number(order.subtotal ?? 0) || items.reduce((s: number, i: any) => s + i.total, 0);
    const grandTotal = Number(order.totalAmount ?? order.grandTotal ?? subtotal) || subtotal;
    const discount = Number(order.discount ?? 0) || 0;
    const deliveryFee = Number(order.deliveryFee ?? 0) || 0;
    // Whatever the order total does not account for is the tax that was charged.
    // Reported as a single figure with no jurisdiction attached: the gateway does
    // not know the seller's tax registration, and naming a component CGST/SGST
    // without one is a false legal statement on a document customers keep.
    const taxAmount = Math.max(
      0,
      Math.round((grandTotal - (subtotal + deliveryFee - discount)) * 100) / 100,
    );

    const reference = String(order.orderNumber ?? order.id ?? orderId);

    // `deliveryAddress` is persisted as a JSON *string*, so reading `.fullName`
    // off it yields undefined and handing it to the client leaves the "Bill To"
    // block with nothing but a name. Parsed here so every consumer of the
    // invoice gets an object.
    const buyerAddress = this.parseStoredAddress(order.deliveryAddress ?? order.shippingAddress);

    /**
     * Who sold the goods, in full.
     *
     * A tax invoice has to identify the supplying party — name, registered
     * address and tax registration — not just print a trading name. This used
     * to resolve `sellerName` alone, so the "Sold By" block was one line and
     * the document could not function as an invoice in any jurisdiction.
     *
     * `GET_SELLER_FOR_INVOICE` rather than `GET_SELLER_BY_ID`: the latter's
     * projection deliberately omits the address and tax registration, because a
     * catalogue read has no business carrying them.
     */
    let seller: any = null;
    if (order.sellerId) {
      try {
        const res: any = await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_SELLER_FOR_INVOICE, {
          sellerId: order.sellerId,
        });
        seller = res?.data ?? res ?? null;
      } catch {
        // A seller-service hiccup must not make the invoice unavailable — the
        // rest of the document is still correct and the customer still needs it.
      }
    }
    const sellerName = order.sellerName ?? seller?.businessName ?? null;

    // The market the order was placed in decides the currency and the tax
    // heading. The order's own region wins; the seller's is the fallback for
    // rows written before orders carried one.
    const invoiceRegionCode = order.regionCode ?? seller?.regionCode ?? this.region(req);
    const invoiceRegion = getRegionConfig(invoiceRegionCode);

    return {
      invoiceNumber: `INV-${reference.replace(/^ORD-/, '').slice(0, 20).toUpperCase()}`,
      orderId: reference,
      orderDate: order.placedAt ?? order.createdAt ?? null,
      invoiceDate: new Date().toISOString(),
      buyerName: order.customerName || buyerAddress.fullName || buyerAddress.name || 'Customer',
      buyerAddress,
      /**
       * `sellerName` is kept for older clients that read it; `seller` is the
       * block a document should render.
       *
       * No fallback to "KartSeek Marketplace". The platform is not the supplier
       * of the goods, and naming it as the seller on a tax invoice is a false
       * statement about who the customer contracted with. When the seller
       * cannot be resolved the fields are null and the document says so.
       */
      sellerName,
      seller: seller && {
        id: seller.id ?? null,
        name: seller.businessName ?? null,
        storeSlug: seller.storeSlug ?? null,
        address: seller.address ?? null,
        // Labelled by the region, not hardcoded as GSTIN — Qatar issues a
        // Commercial Registration number, the UAE a TRN.
        taxId: seller.gstNumber ?? null,
        email: seller.email ?? null,
        phone: seller.phone ?? null,
        regionCode: seller.regionCode ?? null,
      },
      items,
      subtotal,
      deliveryFee,
      discount,
      taxAmount,
      grandTotal,
      // Set by the market the order was placed in, so the document is not
      // silently denominated in rupees for every other storefront.
      //
      // The fallback used to be `order.regionCode`, which put the country code
      // itself in the currency field — an invoice reading "QA 249.00".
      currency: order.currency || invoiceRegion?.currencyCode || null,
      // Names whatever tax was actually charged, or null where the market
      // levies none. Qatar has no VAT, so the invoice omits the row entirely
      // rather than printing a misleading zero under an invented heading.
      taxLabel: invoiceRegion && invoiceRegion.tax.rate > 0 ? invoiceRegion.tax.name : null,
      regionCode: invoiceRegionCode,
      status: order.status,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ Customer discovery routes (graceful empty fallback on service outage)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('brands')
  // the brand directory changes rarely
  @PublicCache(600)
  @ApiOperation({ summary: 'List all brands' })
  async getBrands() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_BRANDS);
  }

  // Every discovery feed below is region-scoped: an unscoped feed on a
  // localised storefront surfaces products no local seller can fulfil.

  @Get('flash-deals')
  // a campaign window can close at any moment
  @PublicCache(15)
  @ApiOperation({ summary: 'Get time-limited flash deals' })
  async getFlashDeals(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_FLASH_DEALS, {
      country: this.region(req),
    });
  }

  @Get('deals-of-day')
  @ApiOperation({ summary: 'Get deals of the day (alias)' })
  async getDealsOfDay(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_FEATURED_PRODUCTS, {
      country: this.region(req),
    });
  }

  @Get('trending')
  @ApiOperation({ summary: 'Recently listed products picking up traction' })
  async getTrendingProducts(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PRODUCTS, {
      page: 1,
      limit: 20,
      sort: 'trending',
      country: this.region(req),
    });
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Highest-rated products' })
  async getRecommendedProducts(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PRODUCTS, {
      page: 1,
      limit: 20,
      sort: 'rating',
      country: this.region(req),
    });
  }

  @Get('verified-sellers')
  @ApiOperation({ summary: 'Get verified sellers list' })
  async getVerifiedSellers() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_VERIFIED_SELLERS);
  }

  @Get('sponsored')
  @ApiOperation({ summary: 'Get sponsored/promoted products' })
  async getSponsoredProducts() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_FEATURED_PRODUCTS);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Get all active offers' })
  async getAllOffers() {
    const [bank, exchange]: any[] = await Promise.all([
      this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_LIST_BANK_OFFERS, { activeOnly: true }),
      this.sendToMarketplace(MARKETPLACE_PATTERNS.ADMIN_LIST_EXCHANGE_OFFERS, { activeOnly: true }),
    ]);
    const bankOffers = bank?.data ?? bank ?? [];
    const exchangeOffers = exchange?.data ?? exchange ?? [];
    return {
      data: { bankOffers, exchangeOffers },
      total: bankOffers.length + exchangeOffers.length,
    };
  }

  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my wishlist' })
  async getWishlistCurrent(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_WISHLIST, {
      userId: this.userId(req),
    });
  }

  // Identity from the JWT, matching @Get('wishlist') above and the cart routes.
  // The web client calls POST /wishlist and DELETE /wishlist/:productId — it has
  // no userId to put in the path — but only the two-segment variants existed, so
  // both 404'd. The heart button on every product card optimistically fills in
  // and reverts its own state on failure, so the add looked like it worked and
  // was gone on the next load.
  @UseGuards(JwtAuthGuard)
  @Post('wishlist')
  @ApiOperation({ summary: 'Add product to my wishlist' })
  async addToOwnWishlist(@Req() req: any, @Body() payload: WishlistProductDto) {
    if (!payload?.productId)
      throw new HttpException('productId is required', HttpStatus.BAD_REQUEST);
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADD_TO_WISHLIST, {
      userId: this.userId(req),
      productId: payload.productId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('wishlist/:productId')
  @ApiOperation({ summary: 'Remove product from my wishlist' })
  @ApiParam({ name: 'productId', description: 'Product ID to remove' })
  async removeFromOwnWishlist(@Req() req: any, @Param('productId') productId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.REMOVE_FROM_WISHLIST, {
      userId: this.userId(req),
      productId,
    });
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List my orders' })
  /**
   * The customer's own order history.
   *
   * Read from **order-service**, which is where checkout writes them
   * (`order.orders`). This used to ask marketplace-service, whose
   * `marketplace.marketplace_orders` table checkout never populates — so the
   * list was empty for every customer no matter how much they had bought.
   *
   * NOTE: those two stores are still not reconciled. Seller dashboards, returns
   * and commission all key on `marketplace_orders`, so an order placed through
   * checkout is not yet visible to the seller who has to fulfil it. Deciding
   * which store owns a marketplace order is an architectural call, not a
   * gateway one — see the audit note.
   */
  async getCustomerOrders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    return this.orders.listForCustomer(req, { status, page, limit });
  }

  @Get('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my reviews' })
  async getCustomerReviews(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_CUSTOMER_REVIEWS, {
      customerId: this.userId(req),
    });
  }

  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get customer addresses' })
  async getCustomerAddresses() {
    return { data: [] as unknown[], total: 0, message: 'Addresses managed via user service' };
  }

  @Get('recently-viewed')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get recently viewed products' })
  async getRecentlyViewed(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_RECENTLY_VIEWED, {
      userId: this.userId(req),
    });
  }

  @Delete('recently-viewed')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clear recently viewed history' })
  async clearRecentlyViewed(@Req() req: any) {
    // No try/catch fallback: "clear" is a mutation, and reporting success for a
    // delete that did not happen is the fault this whole pass is about.
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.CLEAR_RECENTLY_VIEWED, {
      userId: this.userId(req),
    });
  }

  @Get('buy-again')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get buy-again product suggestions' })
  async getBuyAgain(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_BUY_AGAIN, {
      userId: this.userId(req),
      limit: 10,
    });
  }

  @Get('gift-cards')
  @ApiOperation({ summary: 'List available gift cards' })
  async getGiftCards() {
    return { data: [] as unknown[], total: 0, message: 'Gift cards' };
  }

  @Get('bundles')
  @ApiOperation({ summary: 'List product bundles' })
  async getProductBundles() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_PRODUCT_BUNDLES);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ Web ↔ Backend alignment routes
  // ═══════════════════════════════════════════════════════════════════════════

  // Cart item update (web sends PATCH/PUT /cart/:userId/:itemId)
  // Identity comes from the JWT, matching @Post('cart') and @Get('cart') above.
  // The web cart calls PUT/DELETE /marketplace/cart/:itemId — it has no userId to
  // put in the path — and only the two-segment routes below existed, so both
  // requests 404'd. The page swallows the error, so quantity edits and removals
  // looked like they worked and were gone on the next load.
  @UseGuards(JwtAuthGuard)
  @Put('cart/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity (current user)' })
  @ApiParam({ name: 'itemId', description: 'Product ID of the cart line' })
  @UsePipes(ForwardingValidationPipe)
  async updateOwnCartItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() payload: ForwardedCartItemDto,
  ) {
    // The line lives in the market being browsed; the same product may sit in
    // the cart once per market.
    return lastValueFrom(
      this.cartClient.send(
        { cmd: 'update_cart_item' },
        { userId: this.userId(req), itemId, ...payload, regionCode: this.region(req) },
      ),
    ).catch(() => {
      throw new HttpException('Cart service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cart/:itemId')
  @ApiOperation({ summary: 'Remove item from cart (current user)' })
  @ApiParam({ name: 'itemId', description: 'Product ID of the cart line' })
  async removeOwnCartItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() body?: RemoveCartItemDto,
  ) {
    // variantId is part of the line's identity, so it has to be forwarded —
    // without it a request to drop one variant matches the plain line instead.
    return lastValueFrom(
      this.cartClient.send(
        { cmd: 'remove_cart_item' },
        {
          userId: this.userId(req),
          itemId,
          variantId: body?.variantId,
          regionCode: this.region(req),
        },
      ),
    ).catch(() => {
      throw new HttpException('Cart service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    });
  }

  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @Put('cart/:userId/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @UsePipes(ForwardingValidationPipe)
  async updateCartItem(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() payload: ForwardedCartItemDto,
  ) {
    return lastValueFrom(
      this.cartClient.send({ cmd: 'update_cart_item' }, { userId, itemId, ...payload }),
    ).catch(() => {
      throw new HttpException('Cart service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    });
  }

  // Cart item removal (web sends DELETE /cart/:userId/:itemId)
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @Delete('cart/:userId/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID or product ID' })
  async removeCartItem(@Param('userId') userId: string, @Param('itemId') itemId: string) {
    return lastValueFrom(
      this.cartClient.send({ cmd: 'remove_cart_item' }, { userId, itemId }),
    ).catch(() => {
      throw new HttpException('Cart service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    });
  }

  // Cart GET with userId in path (web sends GET /cart/:userId)
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @Get('cart/:userId')
  @ApiOperation({ summary: 'Get cart by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getCartByUserId(@Param('userId') userId: string) {
    return lastValueFrom(this.cartClient.send({ cmd: 'get_cart' }, { userId })).catch(() => {
      throw new HttpException('Cart service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    });
  }

  // Wishlist add (web sends POST /wishlist/:userId)
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @Post('wishlist/:userId')
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async addToWishlist(@Param('userId') userId: string, @Body() payload: WishlistProductDto) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.ADD_TO_WISHLIST, {
      userId,
      productId: payload.productId,
    });
  }

  // Wishlist remove (web sends DELETE /wishlist/:userId/:productId)
  @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
  @ResourceOwner({ paramKey: 'userId' })
  @Delete('wishlist/:userId/:productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'productId', description: 'Product ID to remove' })
  async removeFromWishlist(@Param('userId') userId: string, @Param('productId') productId: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.REMOVE_FROM_WISHLIST, { userId, productId });
  }

  // Order placement alias (the web checkout posts here)
  @UseGuards(JwtAuthGuard)
  @Post('orders')
  @ApiOperation({ summary: 'Place order (alias for orders/checkout)' })
  @UsePipes(ForwardingValidationPipe)
  async placeOrder(@Req() req: any, @Body() payload: ForwardedOrderDto) {
    return this.placeMarketplaceOrder(req, payload);
  }

  // Cancel order (web sends PATCH/PUT /orders/:id/cancel)
  @UseGuards(JwtAuthGuard)
  @Put('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @UsePipes(ForwardingValidationPipe)
  async cancelOrder(
    @Req() req: any,
    @Param('id') orderId: string,
    @Body() payload: ForwardedOrderDto,
  ) {
    return this.orders.cancel(req, orderId, payload);
  }

  // Order tracking sub-route (web sends GET /orders/:id/track)
  @UseGuards(JwtAuthGuard)
  @Get('orders/:id/track')
  @ApiOperation({ summary: 'Get order tracking info' })
  @ApiParam({
    name: 'id',
    description: 'Order number or order UUID, as listed by GET /marketplace/orders',
  })
  /**
   * Tracking events for one of the caller's own orders.
   *
   * The id is resolved through order-service first, for two reasons. The
   * tracking store keys on the order **uuid**, while the order list hands the
   * customer an order *number*, so passing the parameter straight through made
   * Postgres reject it — "invalid input syntax for type uuid" surfaced as a 500
   * on every tracking request the UI could make. And the raw passthrough had no
   * ownership check at all: any signed-in account could read the shipment
   * history of any order whose id it could name.
   */
  async trackOrder(@Req() req: any, @Param('id') orderId: string) {
    return this.orders.track(req, orderId);
  }

  // Top brands passthrough (web sends GET /brands/top)
  @Get('brands/top')
  @ApiOperation({ summary: 'Get top/featured brands' })
  async getTopBrands() {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_TOP_BRANDS);
  }

  // Sellers/verified alias (web sends GET /sellers/verified)
  @Get('sellers/verified')
  @ApiOperation({ summary: 'Get verified sellers (alias for /verified-sellers)' })
  async getVerifiedSellersAlias(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_VERIFIED_SELLERS, {
      country: this.region(req),
    });
  }

  // Sellers list (web sends GET /sellers)
  @Get('sellers')
  @ApiOperation({ summary: 'List all marketplace sellers' })
  async getAllSellers(@Req() req: any) {
    return await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_SELLERS, {
      country: this.region(req),
    });
  }

  // ── Brand Follow Endpoints ─────────────────────────────────────────────────
  // Static routes MUST be declared before parametric :id routes

  // Declared after `sellers/verified` and `sellers/:sellerId/low-stock-variants`
  // so those literal paths still match first.
  @Get('sellers/:id')
  @ApiOperation({ summary: 'Public seller profile' })
  @ApiParam({ name: 'id', description: 'Seller uuid or store slug' })
  /**
   * The storefront's seller page had no endpoint at all. It invented one
   * instead: it title-cased the URL slug into a business name and paired it with
   * a fixed 4.3 rating, "2,500 reviews", a "Est. 2020" founding year and a 98%
   * response rate — so `/marketplace/seller/anything` rendered a plausible,
   * entirely fictional merchant.
   */
  async getSellerProfile(@Param('id') id: string) {
    return this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_SELLER_BY_ID, { sellerId: id });
  }

  @Get('brands/followed')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List brands followed by me' })
  async getFollowedBrands(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    return this.sendToMarketplace('brand_followed_list', {
      userId: this.userId(req),
      page: +page,
      limit: +limit,
    });
  }

  @Get('brands/feed')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get brand updates feed for me' })
  async getBrandFeed(
    @Req() req: any,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
    @Query('type') type?: string,
  ) {
    return this.sendToMarketplace('brand_feed', {
      userId: this.userId(req),
      page: +page,
      limit: +limit,
      type,
    });
  }

  // Parametric :id routes — AFTER static routes
  @Post('brands/:id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Follow a brand' })
  async followBrand(@Req() req: any, @Param('id', ParseUUIDPipe) brandId: string) {
    return this.sendToMarketplace('brand_follow', { userId: this.userId(req), brandId });
  }

  @Delete('brands/:id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unfollow a brand' })
  async unfollowBrand(@Req() req: any, @Param('id', ParseUUIDPipe) brandId: string) {
    return this.sendToMarketplace('brand_unfollow', { userId: this.userId(req), brandId });
  }

  @Get('brands/:id/is-following')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if I follow a brand' })
  async isFollowingBrand(@Req() req: any, @Param('id', ParseUUIDPipe) brandId: string) {
    return this.sendToMarketplace('brand_is_following', { userId: this.userId(req), brandId });
  }

  @Get('brands/:id/followers/count')
  @ApiOperation({ summary: 'Get brand follower count' })
  async getBrandFollowerCount(@Param('id', ParseUUIDPipe) brandId: string) {
    return this.sendToMarketplace('brand_follower_count', { brandId });
  }

  @Get('brands/:id/updates')
  @ApiOperation({ summary: 'Get updates from a specific brand' })
  async getBrandUpdates(
    @Param('id') brandId: string,
    @Query('page', ParsePagePipe) page = 1,
    @Query('limit', ParseLimitPipe) limit = DEFAULT_PAGE_SIZE,
  ) {
    return this.sendToMarketplace('brand_updates', { brandId, page: +page, limit: +limit });
  }

  @Post('brands/:id/updates')
  @UseGuards(JwtAuthGuard, RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @SellerModule('marketplace')
  @ApiOperation({ summary: 'Create a brand update (seller/admin)' })
  @UsePipes(ForwardingValidationPipe)
  async createBrandUpdate(
    @Req() req: any,
    @Param('id') brandId: string,
    @Body() body: ForwardedBrandUpdateDto,
  ) {
    // A brand is platform content, shared by every market: there is no market
    // to resolve for one, so a region-locked admin is refused outright rather
    // than handed a market this row cannot have. Sellers are unaffected — only
    // a locked staff account is refused.
    refuseLockedAdmin(req, 'catalogue taxonomy', 'Catalogue taxonomy is managed globally.');
    return this.sendToMarketplace('brand_create_update', { brandId, ...body });
  }
}
