import {
  Controller, Get, Post, Put, Delete, Inject, Req,
  Param, Query, Body, UseGuards, DefaultValuePipe, ParseIntPipe, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiBody, ApiParam, ApiQuery,
  ApiOkResponse, ApiCreatedResponse,
  ApiForbiddenResponse, ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { RolesGuard } from '../guards/roles.guard';
import { SellerModuleGuard, SellerModule } from '../guards/seller-module.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import {
  AddMenuItemDto, BookTableDto, RestaurantStatusDto, SuccessResponseDto,
  SubmitReviewDto, UpdateMenuItemDto, UpdateRestaurantProfileDto, ReservationStatusDto,
} from '../dto/gateway.dto';

import { JwtAuthGuard } from '@app/security';
import { Public } from '../decorators/public.decorator';
import { requestRegion } from '../services/request-region';

/**
 * Restaurant Controller — API Gateway Proxy
 *
 * Forwards all restaurant requests to the restaurant-service microservice via TCP ClientProxy.
 * All mock data has been removed — every handler now delegates to the DB-backed service.
 */
@ApiTags('🍽️ Restaurants')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants')
export class RestaurantController {
  constructor(
    @Inject('RESTAURANT_SERVICE') private readonly restaurantClient: ClientProxy,
    // Not everything under /restaurants belongs to restaurant-service. The cart
    // is cart-service's, orders are order-service's, and payouts are
    // payout-service's — the same handlers the marketplace routes already use.
    // These eight commands were being sent to restaurant-service, which has no
    // handler for any of them, so every one answered 503.
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    @Inject('ORDER_SERVICE_TCP') private readonly orderClient: ClientProxy,
    @Inject('PAYOUT_SERVICE') private readonly payoutClient: ClientProxy,
  ) {}
  private readonly logger = new Logger(RestaurantController.name);

  /** Forward to a named service, preserving the failure rather than inventing a result. */
  private async sendTo<T>(
    client: ClientProxy,
    service: string,
    cmd: string,
    payload: object,
  ): Promise<T> {
    try {
      return await lastValueFrom(
        client
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch(`${service} unavailable`))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`${service} error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException(`${service} unavailable`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * The signed-in customer, from the verified token.
   *
   * The cart routes used to take `userId` from a query parameter or the request
   * body, so any authenticated caller could read or empty another customer's
   * cart by naming them.
   */
  private userId(req: any): string | undefined {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
  }

  /** Helper � sends TCP message with 5s timeout and graceful fallback. */
    /**
   * Forward to restaurant-service, preserving the failure.
   *
   * This helper used to take a `fallback` and return it as a 200 whenever the
   * service was unreachable, so an outage was indistinguishable from an empty
   * result: the listing pages showed "no results in your area" rather than
   * "we could not reach the service", and the admin screens showed empty queues
   * rather than an error. The fallback parameter is gone; failures propagate and
   * the client can tell the two apart.
   */
  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.restaurantClient
          .send<T>({ cmd }, payload)
          .pipe(
            timeout(5000),
            catchError(rpcCatch('Restaurant service unavailable')),
          ),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`restaurant-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Restaurant service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Restaurant Discovery
  // ═══════════════════════════════════════════════════════════════════════════

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List all restaurants',
    description:
      'Returns a paginated, filterable list of all approved restaurants. ' +
      'Supports filtering by cuisine, rating, open status, and sorting by distance, rating, or popularity.',
  })
  @ApiQuery({ name: 'cuisine', example: 'biryani', required: false })
  @ApiQuery({ name: 'minRating', example: 4.0, required: false })
  @ApiQuery({ name: 'isOpen', example: true, required: false })
  @ApiQuery({ name: 'sortBy', example: 'rating', enum: ['rating', 'distance', 'popularity', 'deliveryTime'], required: false })
  @ApiQuery({ name: 'page', example: 1, required: false })
  @ApiQuery({ name: 'limit', example: 20, required: false })
  @ApiOkResponse({ description: 'Paginated list of restaurants' })
  listRestaurants(
    @Query('cuisine') cuisine?: string,
    @Query('minRating') minRating?: number,
    @Query('sortBy') sortBy?: string,
    @Query('isOpen') isOpen?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('list_restaurants', { cuisine, minRating, sortBy, isOpen, page, limit });
  }

  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Search restaurants & dishes',
    description: 'Full-text search across restaurant names, cuisine types, and menu item names.',
  })
  @ApiQuery({ name: 'q', example: 'biryani', required: true })
  @ApiQuery({ name: 'page', example: 1, required: false })
  @ApiQuery({ name: 'limit', example: 20, required: false })
  @ApiOkResponse({ description: 'Search results with restaurants and dishes' })
  searchRestaurants(
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('search_restaurants', { q, page, limit });
  }

  @Get('cuisines')
  @ApiOperation({
    summary: 'List cuisine categories',
    description: 'Returns all cuisine categories with restaurant counts. Used for browse-by-cuisine UI.',
  })
  @ApiOkResponse({ description: 'List of cuisine categories' })
  listCuisines() {
    return this.send('get_cuisines', {});
  }

  @Get('trending')
  @ApiOperation({
    summary: 'Get trending restaurants',
    description: 'Returns restaurants sorted by recent order volume and positive reviews.',
  })
  @ApiQuery({ name: 'limit', example: 10, required: false })
  @ApiOkResponse({ description: 'Trending restaurant list' })
  getTrendingRestaurants(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number) {
    return this.send('list_restaurants', { sortBy: 'popularity', limit });
  }

  @Public()
  @Get('nearby')
  @ApiOperation({
    summary: 'Get nearby restaurants',
    description:
      'Uses the caller\'s coordinates to return restaurants within the given radius, ordered by distance.',
  })
  @ApiQuery({ name: 'lat', example: -1.286389, required: true })
  @ApiQuery({ name: 'lng', example: 72.877723, required: true })
  @ApiQuery({ name: 'radius', example: 5, required: false })
  @ApiQuery({ name: 'cuisine', example: 'biryani', required: false })
  @ApiOkResponse({ description: 'Paginated list of nearby restaurants' })
  getNearbyRestaurants(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius', new DefaultValuePipe(5), ParseIntPipe) radius?: number,
    @Query('cuisine') cuisine?: string) {
    return this.send('get_nearby_restaurants', { lat: parseFloat(lat), lng: parseFloat(lng), radiusKm: radius, cuisine });
  }

  @Get('home-feed')
  @ApiOperation({ summary: 'Restaurant home feed', description: 'Aggregated sections for the restaurant homepage.' })
  @ApiOkResponse({ description: 'Home feed sections' })
  getHomeFeed(@Req() req: any) {
    // Region-scoped: a customer in Qatar should not be offered restaurants that
    // cannot deliver to them. requestRegion reads X-Region-Code and falls back
    // the same way every other module's routes do.
    return this.send('get_home_feed', { regionCode: requestRegion(req) });
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Search suggestions' })
  getSuggestions(@Req() req: any, @Query('q') q?: string) {
    return this.send('get_suggestions', { q, regionCode: requestRegion(req) });
  }

  @Get('popular-dishes')
  @ApiOperation({ summary: 'Popular dishes across restaurants' })
  getPopularDishes(@Req() req: any, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('get_popular_dishes', { limit, regionCode: requestRegion(req) });
  }

  @Get('collections')
  @ApiOperation({ summary: 'Restaurant collections / curated lists' })
  getCollections(@Req() req: any) {
    return this.send('get_collections', { regionCode: requestRegion(req) });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Restaurant Detail, Menu, Reviews, Offers
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Literal routes, declared before the `:slug` catch-all ──────────────
  //
  // Nest matches routes in declaration order. These sat *after* `@Get(':slug')`,
  // so /restaurants/favorites, /cart, /addresses, /gift-cards, /my-reservations
  // and /subscriptions were all captured as a slug and reached Postgres as a
  // uuid lookup -- `invalid input syntax for type uuid: "favorites"`. Every one
  // of these customer routes was a 500, hidden as an empty 200 by the old
  // gateway fallback. Keep literal paths above parameterised ones.

  @Get('favorites')
  @ApiOperation({ summary: 'List favorite restaurants' })
  listFavorites(@Query('userId') userId?: string) {
    return this.send('list_favorites', { userId });
  }

  @Get('cart')
  @ApiOperation({ summary: 'Get current cart' })
  getCart(@Req() req: any) {
    return this.sendTo(this.cartClient, 'Cart service', 'get_cart', { userId: this.userId(req) });
  }

  @Get('my-reservations')
  @ApiOperation({ summary: 'List customer reservations' })
  getMyReservations(@Query('userId') userId?: string) {
    return this.send('get_customer_reservations', { userId });
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List delivery addresses' })
  listAddresses(@Query('userId') userId?: string) {
    return this.send('list_addresses', { userId });
  }

  @Get('gift-cards')
  @ApiOperation({ summary: 'List gift cards' })
  listGiftCards(@Query('userId') userId?: string) {
    return this.send('list_gift_cards', { userId });
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscription plans' })
  listSubscriptions() {
    return this.send('list_subscriptions', {});
  }

  @Get('menu-categories')
  @ApiOperation({ summary: 'List menu categories for a restaurant' })
  @ApiQuery({ name: 'restaurantId', required: true })
  getMenuCategories(@Query('restaurantId') restaurantId: string) {
    return this.send('get_menu_categories', { restaurantId });
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get restaurant details',
    description: 'Returns full restaurant profile: info, opening hours, photos, delivery settings, active offers, and aggregate ratings.',
  })
  @ApiParam({ name: 'slug', example: 'the-grand-biryani-house' })
  @ApiOkResponse({ description: 'Restaurant detail page data' })
  @ApiNotFoundResponse({ description: 'Restaurant not found' })
  getRestaurantDetails(@Param('slug') slug: string) {
    return this.send('get_restaurant_by_slug', { slug });
  }

  @Public()
  @Get(':id/menu')
  @ApiOperation({
    summary: 'Get restaurant menu',
    description: 'Returns the full menu organised by category, including items, prices, customisation options, allergens, and bestseller badges.',
  })
  @ApiParam({ name: 'id', example: 'RST-001' })
  @ApiOkResponse({ description: 'Structured menu by category' })
  @ApiNotFoundResponse({ description: 'Restaurant or menu not found' })
  getRestaurantMenu(@Param('id') id: string) {
    return this.send('get_restaurant_menu', { id });
  }

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get restaurant reviews', description: 'Returns paginated customer reviews and ratings.' })
  @ApiParam({ name: 'id', example: 'RST-001' })
  @ApiQuery({ name: 'page', example: 1, required: false })
  @ApiQuery({ name: 'limit', example: 10, required: false })
  @ApiOkResponse({ description: 'Paginated reviews with aggregate stats' })
  getRestaurantReviews(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number) {
    return this.send('get_reviews', { restaurantId: id, page, limit });
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Submit a review', description: 'Creates a review for a restaurant.' })
  @ApiParam({ name: 'id', example: 'RST-001' })
  @ApiBody({ type: SubmitReviewDto })
  @ApiCreatedResponse({ description: 'Review submitted successfully' })
  submitReview(@Param('id') id: string, @Body() dto: SubmitReviewDto) {
    return this.send('submit_review', { ...dto, restaurantId: id });
  }

  @Public()
  @Get(':id/offers')
  @ApiOperation({ summary: 'Get active restaurant offers' })
  @ApiParam({ name: 'id', example: 'RST-001' })
  getRestaurantOffers(@Param('id') id: string) {
    return this.send('get_offers', { id });
  }

  @Public()
  @Get(':id/profile')
  @ApiOperation({ summary: 'Get restaurant public profile' })
  @ApiParam({ name: 'id', example: 'RST-001' })
  getRestaurantProfile(@Param('id') id: string) {
    return this.send('get_restaurant_by_id', { id });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Booking, Orders, Cart, Favorites
  // ═══════════════════════════════════════════════════════════════════════════

  @Post(':restaurantId/book-table')
  @ApiOperation({ summary: 'Book a dine-in table', description: 'Creates a dine-in reservation for the restaurant.' })
  @ApiParam({ name: 'restaurantId', example: 'RST-001' })
  @ApiBody({ type: BookTableDto })
  @ApiCreatedResponse({ description: 'Table reservation confirmed' })
  bookTable(@Param('restaurantId') restaurantId: string, @Body() dto: BookTableDto) {
    // Spread first, path parameter last. `BookTableDto` also declares
    // `restaurantId`, and spreading it after the path value let a request to
    // `/restaurants/RST-001/book-table` carrying `{"restaurantId":"RST-999"}`
    // reserve a table at a different restaurant than the URL named.
    return this.send('book_table', { ...dto, restaurantId });
  }

  @Post(':restaurantId/order')
  @ApiOperation({ summary: 'Place an order', description: 'Places a delivery, takeaway, or dine-in order.' })
  @ApiParam({ name: 'restaurantId', example: 'RST-001' })
  @ApiCreatedResponse({ description: 'Order placed successfully' })
  placeOrder(@Param('restaurantId') restaurantId: string, @Body() payload: any) {
    return this.send('place_restaurant_order', { ...payload, restaurantId });
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Add restaurant to favorites' })
  addFavorite(@Param('id') id: string, @Body() body: any) {
    return this.send('add_favorite', { restaurantId: id, ...body });
  }

  @Delete(':id/favorite')
  @ApiOperation({ summary: 'Remove restaurant from favorites' })
  removeFavorite(@Param('id') id: string, @Body() body: any) {
    return this.send('remove_favorite', { restaurantId: id, ...body });
  }

  @Post(':restaurantId/favorites/:restaurantId2')
  @ApiOperation({ summary: 'Add favorite (alt route)' })
  addFavoriteAlt(@Param('restaurantId2') id: string, @Body() body: any) {
    return this.send('add_favorite', { restaurantId: id, ...body });
  }

  @Delete('favorites/:restaurantId')
  @ApiOperation({ summary: 'Remove favorite (alt route)' })
  removeFavoriteAlt(@Param('restaurantId') id: string, @Body() body: any) {
    return this.send('remove_favorite', { restaurantId: id, ...body });
  }

  @Post(':id/apply-coupon')
  @ApiOperation({ summary: 'Apply coupon to cart' })
  applyCoupon(@Param('id') id: string, @Body() body: any) {
    return this.send('apply_coupon', { restaurantId: id, ...body });
  }

  @Post(':id/remove-coupon')
  @ApiOperation({ summary: 'Remove coupon from cart' })
  removeCoupon(@Param('id') id: string, @Body() body: any) {
    return this.send('remove_coupon', { restaurantId: id, ...body });
  }

  @Post(':id/call-waiter')
  @ApiOperation({ summary: 'Call waiter (dine-in)' })
  callWaiter(@Param('id') id: string, @Body() body: any) {
    return this.send('call_waiter', { restaurantId: id, ...body });
  }

  // ── Cart ─────────────────────────────────────────────────────────────────

  @Post('cart/add')
  @ApiOperation({ summary: 'Add item to cart' })
  addToCart(@Req() req: any, @Body() body: any) {
    return this.sendTo(this.cartClient, 'Cart service', 'add_to_cart', {
      ...body,
      userId: this.userId(req),
    });
  }

  @Put('cart/item/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateCartItem(@Req() req: any, @Param('itemId') itemId: string, @Body() body: any) {
    return this.sendTo(this.cartClient, 'Cart service', 'update_cart_item', {
      ...body,
      itemId,
      userId: this.userId(req),
    });
  }

  @Delete('cart/item/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeCartItem(@Req() req: any, @Param('itemId') itemId: string, @Query('variantId') variantId?: string) {
    return this.sendTo(this.cartClient, 'Cart service', 'remove_cart_item', {
      itemId,
      variantId,
      userId: this.userId(req),
    });
  }

  @Delete('cart/clear')
  @ApiOperation({ summary: 'Clear entire cart' })
  clearCart(@Req() req: any) {
    return this.sendTo(this.cartClient, 'Cart service', 'clear_cart', { userId: this.userId(req) });
  }

  // ── Customer Reservations ───────────────────────────────────────────────

  @Post('reservations/:reservationId/cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  cancelReservation(@Param('reservationId') reservationId: string, @Body() body: any) {
    return this.send('cancel_reservation', { reservationId, ...body });
  }

  // ── Addresses ───────────────────────────────────────────────────────────

  @Post('addresses')
  @ApiOperation({ summary: 'Add delivery address' })
  addAddress(@Body() body: any) {
    return this.send('add_address', body);
  }

  @Put('addresses/:addressId')
  @ApiOperation({ summary: 'Update delivery address' })
  updateAddress(@Param('addressId') addressId: string, @Body() body: any) {
    return this.send('update_address', { addressId, ...body });
  }

  @Delete('addresses/:addressId')
  @ApiOperation({ summary: 'Delete delivery address' })
  deleteAddress(@Param('addressId') addressId: string) {
    return this.send('delete_address', { addressId });
  }

  // ── Gift Cards ──────────────────────────────────────────────────────────

  @Post('gift-cards/purchase')
  @ApiOperation({ summary: 'Purchase a gift card' })
  purchaseGiftCard(@Body() body: any) {
    return this.send('purchase_gift_card', body);
  }

  // ── Subscriptions ───────────────────────────────────────────────────────

  @Post('subscriptions/:planId/subscribe')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  subscribe(@Param('planId') planId: string, @Body() body: any) {
    return this.send('subscribe', { planId, ...body });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Partner / Seller
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('menu-item')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('restaurant')
  @ApiOperation({ summary: 'Add menu item (Seller)', description: 'Creates a new menu item under the seller\'s restaurant.' })
  @ApiBody({ type: AddMenuItemDto })
  @ApiCreatedResponse({ description: 'Menu item created (pending approval)' })
  @ApiForbiddenResponse({ description: 'Role SELLER required' })
  addMenuItem(@Body() payload: AddMenuItemDto) {
    return this.send('add_menu_item', payload as any);
  }

  @Put('menu-item/:itemId')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update menu item (Seller)' })
  @ApiParam({ name: 'itemId', example: 'ITM-001' })
  @ApiBody({ type: UpdateMenuItemDto })
  @ApiOkResponse({ description: 'Menu item updated' })
  updateMenuItem(@Param('itemId') itemId: string, @Body() dto: UpdateMenuItemDto) {
    return this.send('update_menu_item', { ...dto, itemId });
  }

  @Delete('menu-item/:itemId')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('restaurant')
  @ApiOperation({ summary: 'Delete menu item (Seller)' })
  @ApiParam({ name: 'itemId', example: 'ITM-001' })
  @ApiOkResponse({ type: SuccessResponseDto })
  deleteMenuItem(@Param('itemId') itemId: string) {
    return this.send('delete_menu_item', { itemId });
  }

  @Put('status')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('restaurant')
  @ApiOperation({ summary: 'Toggle restaurant online/offline (Seller)' })
  @ApiBody({ type: RestaurantStatusDto })
  @ApiOkResponse({ type: SuccessResponseDto })
  toggleRestaurantStatus(@Body() dto: RestaurantStatusDto) {
    return this.send('toggle_restaurant_status', dto);
  }

  @Get(':id/reservations')
  @ApiOperation({ summary: 'List reservations', description: 'Returns table reservations for a restaurant.' })
  @ApiParam({ name: 'id', example: 'RST-001' })
  @ApiQuery({ name: 'status', example: 'PENDING', required: false })
  @ApiQuery({ name: 'date', example: '2026-07-05', required: false })
  getReservations(@Param('id') id: string, @Query('status') status?: string, @Query('date') date?: string) {
    return this.send('get_reservations', { restaurantId: id, status, date });
  }

  @Put('reservations/:reservationId/status')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('restaurant')
  @ApiOperation({ summary: 'Accept/reject reservation (Seller)' })
  @ApiParam({ name: 'reservationId', example: 'RES-001' })
  @ApiBody({ type: ReservationStatusDto })
  updateReservationStatus(@Param('reservationId') reservationId: string, @Body() dto: ReservationStatusDto) {
    return this.send('update_reservation_status', { ...dto, reservationId });
  }

  @Put(':id/profile')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update restaurant profile (Seller)' })
  @ApiParam({ name: 'id', example: 'RST-001' })
  @ApiBody({ type: UpdateRestaurantProfileDto })
  updateRestaurantProfile(@Param('id') id: string, @Body() dto: UpdateRestaurantProfileDto) {
    return this.send('update_restaurant_profile', { restaurantId: id, ...dto });
  }

  @Get(':id/analytics')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @SellerModule('restaurant')
  @ApiOperation({ summary: 'Restaurant analytics (Seller/Admin)' })
  @ApiParam({ name: 'id', example: 'RST-001' })
  @ApiQuery({ name: 'period', example: '7d', required: false })
  getRestaurantAnalytics(@Param('id') id: string, @Query('period') period = '7d') {
    return this.send('get_restaurant_analytics', { id });
  }

  // ── Seller — Orders ─────────────────────────────────────────────────────

  @Get(':id/orders')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @SellerModule('restaurant')
  @ApiOperation({ summary: 'List orders for restaurant (Seller)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false })
  sellerListOrders(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number) {
    return this.send('get_orders_by_restaurant', { restaurantId: id, status, type, page, limit });
  }

  @Get(':restaurantId/orders/:orderId')
  @ApiOperation({ summary: 'Get order detail' })
  getOrderDetail(@Req() req: any, @Param('restaurantId') restaurantId: string, @Param('orderId') orderId: string) {
    // order-service owns the order record; it scopes the read by the requester.
    return this.sendTo(this.orderClient, 'Order service', 'get_order_by_id', {
      orderId,
      restaurantId,
      userId: this.userId(req),
      role: req?.user?.role,
    });
  }

  @Post(':restaurantId/orders/:orderId/accept')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Accept order (Seller)' })
  acceptOrder(@Req() req: any, @Param('restaurantId') rid: string, @Param('orderId') oid: string) {
    return this.sendTo(this.orderClient, 'Order service', 'update_order_status', {
      orderId: oid, restaurantId: rid, status: 'RESTAURANT_ACCEPTED', updatedBy: this.userId(req),
    });
  }

  @Post(':restaurantId/orders/:orderId/reject')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Reject order (Seller)' })
  rejectOrder(@Req() req: any, @Param('restaurantId') rid: string, @Param('orderId') oid: string, @Body('reason') reason: string) {
    return this.sendTo(this.orderClient, 'Order service', 'update_order_status', {
      orderId: oid, restaurantId: rid, status: 'RESTAURANT_REJECTED', reason,
      cancelledBy: 'restaurant', updatedBy: this.userId(req),
    });
  }

  @Put(':restaurantId/orders/:orderId/status')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update order status (Seller)' })
  updateOrderStatus(@Req() req: any, @Param('restaurantId') rid: string, @Param('orderId') oid: string, @Body() body: any) {
    return this.sendTo(this.orderClient, 'Order service', 'update_order_status', {
      ...body, orderId: oid, restaurantId: rid, updatedBy: this.userId(req),
    });
  }

  @Post(':restaurantId/orders/:orderId/request-rider')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Request delivery rider for order' })
  requestRider(@Param('restaurantId') rid: string, @Param('orderId') oid: string) {
    return this.send('request_rider', { restaurantId: rid, orderId: oid });
  }

  @Get(':restaurantId/orders/:orderId/receipt')
  @ApiOperation({ summary: 'Get order receipt' })
  getOrderReceipt(@Param('restaurantId') rid: string, @Param('orderId') oid: string) {
    return this.send('get_order_receipt', { restaurantId: rid, orderId: oid });
  }

  // ── Seller — Tables ─────────────────────────────────────────────────────

  @Get(':id/tables')
  @ApiOperation({ summary: 'List restaurant tables' })
  getTables(@Param('id') id: string) {
    return this.send('get_tables', { id });
  }

  @Put(':id/tables/:tableId')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update table status/details' })
  updateTable(@Param('id') id: string, @Param('tableId') tableId: string, @Body() body: any) {
    return this.send('update_table', { restaurantId: id, tableId, ...body });
  }

  // ── Seller — Payouts & Earnings ─────────────────────────────────────────

  @Get(':id/payouts')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER, UserRole.ADMIN) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Payout history' })
  getPayouts(@Param('id') id: string) {
    return this.send('get_payouts', { id });
  }

  @Get(':id/payouts/current')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Current payout cycle' })
  getCurrentPayout(@Param('id') id: string) {
    return this.send('get_current_payout', { id });
  }

  @Post(':id/payouts/request')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Request payout' })
  requestPayout(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    // payout-service owns payouts for every vertical, restaurants included.
    return this.sendTo(this.payoutClient, 'Payout service', 'request_payout', {
      ...body, restaurantId: id, requestedBy: this.userId(req),
    });
  }

  // ── Literal routes, declared before the `:slug` catch-all ──────────────
  //
  // Nest matches routes in declaration order. These sat *after* `@Get(':slug')`,
  // so /restaurants/favorites, /cart, /addresses, /gift-cards, /my-reservations
  // and /subscriptions were all captured as a slug and reached Postgres as a
  // uuid lookup -- `invalid input syntax for type uuid: "favorites"`. Every one
  // of these customer routes was a 500, hidden as an empty 200 by the old
  // gateway fallback. Keep literal paths above parameterised ones.

  @Get('delivery/earnings')
  @ApiOperation({ summary: 'Delivery partner restaurant earnings' })
  deliveryEarnings(@Query('period') period?: string, @Query('driverId') driverId?: string) {
    return this.send('delivery_earnings', { period, driverId });
}

  @Get(':id/earnings')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Earnings summary' })
  getEarnings(@Param('id') id: string) {
    return this.send('get_earnings', { id });
  }

  // ── Seller — Promotions ─────────────────────────────────────────────────

  @Get(':id/promotions')
  @ApiOperation({ summary: 'List restaurant promotions' })
  getPromotions(@Param('id') id: string) {
    return this.send('get_promotions', { id });
  }

  @Post(':id/promotions')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Create promotion' })
  createPromotion(@Param('id') id: string, @Body() body: any) {
    return this.send('create_promotion', { restaurantId: id, ...body });
  }

  @Put(':id/promotions/:promoId')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update promotion' })
  updatePromotion(@Param('promoId') promoId: string, @Body() body: any) {
    return this.send('update_promotion', { promoId, ...body });
  }

  @Delete(':id/promotions/:promoId')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Delete promotion' })
  deletePromotion(@Param('promoId') promoId: string) {
    return this.send('delete_promotion', { promoId });
  }

  // ── Seller — Staff ──────────────────────────────────────────────────────

  @Get(':id/staff')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'List restaurant staff' })
  getStaff(@Param('id') id: string) {
    return this.send('get_staff', { id });
  }

  @Post(':id/staff')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Add staff member' })
  addStaff(@Param('id') id: string, @Body() body: any) {
    return this.send('add_staff', { restaurantId: id, ...body });
  }

  @Put(':id/staff/:staffId')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update staff member' })
  updateStaff(@Param('staffId') staffId: string, @Body() body: any) {
    return this.send('update_staff', { staffId, ...body });
  }

  @Delete(':id/staff/:staffId')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Remove staff member' })
  removeStaff(@Param('staffId') staffId: string) {
    return this.send('remove_staff', { staffId });
  }

  // ── Seller — Services & Settings ────────────────────────────────────────

  @Put(':id/services')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update service modes (delivery/takeaway/dine-in)' })
  updateServices(@Param('id') id: string, @Body() body: any) {
    return this.send('update_services', { restaurantId: id, ...body });
  }

  @Put(':id/prep-time')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update average preparation time' })
  updatePrepTime(@Param('id') id: string, @Body() body: any) {
    return this.send('update_prep_time', { restaurantId: id, ...body });
  }

  @Post(':id/banner')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Upload restaurant banner image' })
  uploadBanner(@Param('id') id: string, @Body() body: any) {
    return this.send('upload_banner', { restaurantId: id, ...body });
  }

  // ── Seller — Menu Categories ────────────────────────────────────────────

  @Post('menu-category')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Create menu category' })
  createMenuCategory(@Body() body: any) {
    return this.send('add_menu_category', body);
  }

  @Put('menu-category/:categoryId')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update menu category' })
  updateMenuCategory(@Param('categoryId') categoryId: string, @Body() body: any) {
    return this.send('update_menu_category', { categoryId, ...body });
  }

  @Delete('menu-category/:categoryId')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Delete menu category' })
  deleteMenuCategory(@Param('categoryId') categoryId: string) {
    return this.send('delete_menu_category', { categoryId });
  }

  @Put('menu-items/bulk-availability')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Bulk update menu item availability' })
  bulkUpdateAvailability(@Body() body: any) {
    return this.send('bulk_update_availability', body);
  }

  @Post('menu-item/:itemId/customization')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Add/update item customization options' })
  updateCustomization(@Param('itemId') itemId: string, @Body() body: any) {
    return this.send('update_customization', { itemId, ...body });
  }

  // ── Seller — Inventory ──────────────────────────────────────────────────

  @Get(':id/inventory')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Get restaurant inventory' })
  getInventory(@Param('id') id: string) {
    return this.send('get_inventory', { id });
  }

  @Put(':id/inventory/:itemId')
  @UseGuards(RolesGuard, SellerModuleGuard) @Roles(UserRole.SELLER) @SellerModule('restaurant')
  @ApiOperation({ summary: 'Update inventory item' })
  updateInventory(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: any) {
    return this.send('update_inventory_item', { restaurantId: id, itemId, ...body });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Admin
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('approvals/pending')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get pending restaurant approvals (Admin)' })
  getPendingApprovals() {
    return this.send('get_pending_approvals', {});
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve restaurant registration (Admin)' })
  @ApiParam({ name: 'id', example: 'REQ-77821' })
  approveRestaurant(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.send('approve_restaurant', { restaurantId: id, adminId });
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject restaurant registration (Admin)' })
  rejectRestaurant(@Param('id') id: string, @Body('reason') reason: string) {
    return this.send('reject_restaurant', { restaurantId: id, reason });
  }

  @Get('admin/list')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all restaurants (Admin)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'status', required: false })
  adminListRestaurants(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('status') status?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number) {
    return this.send('admin_list_restaurants', { page, status, limit });
  }

  // ── Literal routes, declared before the `:slug` catch-all ──────────────
  //
  // Nest matches routes in declaration order. These sat *after* `@Get(':slug')`,
  // so /restaurants/favorites, /cart, /addresses, /gift-cards, /my-reservations
  // and /subscriptions were all captured as a slug and reached Postgres as a
  // uuid lookup -- `invalid input syntax for type uuid: "favorites"`. Every one
  // of these customer routes was a 500, hidden as an empty 200 by the old
  // gateway fallback. Keep literal paths above parameterised ones.

  @Get('admin/menu-approvals')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List menu items pending moderation (Admin)' })
  adminMenuApprovals(@Query('status') status?: string) {
    return this.send('get_menu_approvals', { status });
  }

  @Get('admin/complaints')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List restaurant complaints (Admin)' })
  adminListComplaints(@Query('status') status?: string, @Query('priority') priority?: string) {
    return this.send('list_complaints', { status, priority });
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restaurant detail (Admin)' })
  adminRestaurantDetail(@Param('id') id: string) {
    return this.send('get_restaurant_by_id', { id });
  }

  @Post('admin/:id/suspend')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspend restaurant (Admin)' })
  adminSuspendRestaurant(@Param('id') id: string) {
    return this.send('suspend_restaurant', { id });
  }

  @Post('admin/:id/unsuspend')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unsuspend restaurant (Admin)' })
  adminUnsuspendRestaurant(@Param('id') id: string) {
    return this.send('unsuspend_restaurant', { id });
  }

  @Post('admin/:id/block')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Block restaurant (Admin)' })
  adminBlockRestaurant(@Param('id') id: string) {
    return this.send('block_restaurant', { id });
  }

  @Post('admin/:id/unblock')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unblock restaurant (Admin)' })
  adminUnblockRestaurant(@Param('id') id: string) {
    return this.send('unblock_restaurant', { id });
  }

  @Put('admin/:id/commission')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update restaurant commission rate (Admin)' })
  adminUpdateCommission(@Param('id') id: string, @Body('rate') rate: number) {
    return this.send('set_commission', { restaurantId: id, rate });
  }

  // ── Admin — Menu Moderation ─────────────────────────────────────────────

  @Post('admin/menu-approvals/:changeId/approve')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve menu change (Admin)' })
  adminApproveMenuChange(@Param('changeId') changeId: string) {
    return this.send('approve_menu_change', { changeId });
  }

  @Post('admin/menu-approvals/:changeId/reject')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject menu change (Admin)' })
  adminRejectMenuChange(@Param('changeId') changeId: string, @Body('reason') reason: string) {
    return this.send('reject_menu_change', { changeId, reason });
  }

  @Get('admin/:id/menu-audit')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Audit restaurant menu (Admin)' })
  adminMenuAudit(@Param('id') id: string) {
    return this.send('get_menu_audit', { id });
  }

  // ── Admin — Complaints ──────────────────────────────────────────────────

  @Get('admin/complaints/:complaintId')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Complaint detail (Admin)' })
  adminComplaintDetail(@Param('complaintId') complaintId: string) {
    return this.send('get_complaint', { complaintId });
  }

  @Post('admin/complaints/:complaintId/resolve')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve complaint (Admin)' })
  adminResolveComplaint(@Param('complaintId') complaintId: string, @Body() body: any) {
    return this.send('resolve_complaint', { complaintId, ...body });
  }

  @Post('admin/complaints/:complaintId/escalate')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Escalate complaint (Admin)' })
  adminEscalateComplaint(@Param('complaintId') complaintId: string, @Body() body: any) {
    return this.send('escalate_complaint', { complaintId, ...body });
  }

  @Get('admin/:id/quality-score')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restaurant quality score (Admin)' })
  adminQualityScore(@Param('id') id: string) {
    return this.send('get_quality_score', { id });
  }

  // ── Admin — Analytics ───────────────────────────────────────────────────

  @Get('admin/analytics/overview')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Platform restaurant overview (Admin)' })
  adminAnalyticsOverview() {
    return this.send('admin_analytics_overview', {});
  }

  @Get('admin/analytics/revenue')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revenue analytics by region (Admin)' })
  adminAnalyticsRevenue(@Query('period') period?: string, @Query('groupBy') groupBy?: string) {
    return this.send('admin_analytics_revenue', { period, groupBy });
  }

  @Get('admin/analytics/orders')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Order volume analytics (Admin)' })
  adminAnalyticsOrders(@Query('period') period?: string, @Query('groupBy') groupBy?: string) {
    return this.send('admin_analytics_orders', { period, groupBy });
  }

  @Get('admin/analytics/cuisines')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cuisine popularity analytics (Admin)' })
  adminAnalyticsCuisines(@Query('period') period?: string) {
    return this.send('admin_analytics_cuisines', { period });
  }

  @Get('admin/analytics/top-restaurants')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Top performing restaurants (Admin)' })
  adminTopRestaurants(@Query('metric') metric?: string, @Query('limit') limit?: string) {
    return this.send('admin_top_restaurants', { metric, limit: Number(limit) || 10 });
  }

  @Get('admin/analytics/bottom-restaurants')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bottom performing restaurants (Admin)' })
  adminBottomRestaurants(@Query('metric') metric?: string, @Query('limit') limit?: string) {
    return this.send('admin_bottom_restaurants', { metric, limit: Number(limit) || 10 });
  }

  @Get('admin/reports/compliance')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restaurant compliance report (Admin)' })
  adminComplianceReport() {
    return this.send('admin_compliance_report', {});
  }

  @Get('admin/reports/payouts')
  @UseGuards(RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restaurant payout summary (Admin)' })
  adminPayoutReport(@Query('period') period?: string) {
    return this.send('admin_payout_report', { period });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Delivery Partner
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('delivery/available-tasks')
  @ApiOperation({ summary: 'Available restaurant pickup tasks for delivery partners' })
  deliveryAvailableTasks(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.send('delivery_available_tasks', { lat: lat ? +lat : undefined, lng: lng ? +lng : undefined });
  }

  @Post('delivery/tasks/:taskId/accept')
  @ApiOperation({ summary: 'Accept delivery pickup task' })
  deliveryAcceptTask(@Param('taskId') taskId: string, @Body() body: any) {
    return this.send('delivery_accept_task', { taskId, ...body });
  }

  @Post('delivery/tasks/:taskId/arrived')
  @ApiOperation({ summary: 'Mark arrived at restaurant' })
  deliveryArrived(@Param('taskId') taskId: string, @Body() body: any) {
    return this.send('delivery_arrived', { taskId, ...body });
  }

  @Post('delivery/tasks/:taskId/pickup')
  @ApiOperation({ summary: 'Mark order picked up from restaurant' })
  deliveryPickup(@Param('taskId') taskId: string, @Body() body: any) {
    return this.send('delivery_pickup', { taskId, ...body });
  }

  @Post('delivery/tasks/:taskId/location')
  @ApiOperation({ summary: 'Update delivery partner location' })
  deliveryUpdateLocation(@Param('taskId') taskId: string, @Body() body: any) {
    return this.send('delivery_update_location', { taskId, ...body });
  }

  @Post('delivery/tasks/:taskId/arrived-customer')
  @ApiOperation({ summary: 'Mark arrived at customer location' })
  deliveryArrivedCustomer(@Param('taskId') taskId: string, @Body() body: any) {
    return this.send('delivery_arrived_customer', { taskId, ...body });
  }

  @Post('delivery/tasks/:taskId/complete')
  @ApiOperation({ summary: 'Complete delivery' })
  deliveryComplete(@Param('taskId') taskId: string, @Body() body: any) {
    return this.send('delivery_complete', { taskId, ...body });
  }
}
