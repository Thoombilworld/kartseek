import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Inject,
  DefaultValuePipe,
  ParseIntPipe,
  ParseUUIDPipe,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { UserRole, rpcCatch } from '@app/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { Public } from '../decorators/public.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { SellerModule, SellerModuleGuard } from '../guards/seller-module.guard';
import { resolveScope } from '../guards/market-scope';

/**
 * Hotel Controller — API Gateway Proxy
 *
 * Forwards all hotel requests to the hotel-service microservice via TCP ClientProxy.
 * Covers: search, detail, rooms, bookings, reviews, owner ops, and admin ops.
 *
 * IMPORTANT: Route ordering matters! Specific routes (bookings/*, owner/*, admin/*)
 * MUST be defined BEFORE wildcard :id routes to avoid NestJS matching issues.
 *
 * Uses timeout + catchError fallback so the gateway stays operational even when
 * the hotel-service microservice is unavailable.
 *
 * `RolesGuard` is bound at the class alongside `JwtAuthGuard` because the three
 * `/hotels/admin/*` routes below need it. The guard returns `true` for a route
 * that declares no `@Roles` (`roles.guard.ts:32-34`), so binding it changes
 * nothing for the storefront and booking routes — and without it a per-route
 * `@Roles` on this controller would be metadata nothing reads, which is the
 * failure mode the whole-branch review found on `payment.controller.ts` in
 * reverse.
 *
 * ── THE OWNER SURFACE (M5 round 1b) ────────────────────────────────────────
 *
 * That same "returns true when no `@Roles` is declared" is why the ten
 * operational `/hotels/owner/*` routes below were reachable by ANY authenticated
 * caller — a customer could create a hotel listing, read another owner's payouts
 * queue, rewrite room pricing or mark a booking a no-show. It went unseen
 * because `admin-market-scope.regression.spec.ts` only collects routes that name
 * an admin role or carry an `admin` path segment, and these carry neither.
 *
 * M5's fix round 1 made it load-bearing rather than merely wrong: with a market
 * that has `autoApproveHotels` on, `POST owner/hotels` now creates a property in
 * `ACTIVE` and publishes `hotel.approved` — so an unguarded route could put a
 * live, bookable hotel into a market with no decision by anyone.
 *
 * Each of those ten now carries the platform's established partner shape, the
 * same one `restaurant.controller.ts:559-562` uses for its menu-item routes:
 *
 *     @UseGuards(RolesGuard, SellerModuleGuard)
 *     @Roles(UserRole.SELLER)
 *     @SellerModule('hotel')
 *
 * `UserRole.SELLER` because a hotel owner IS one: there is no `HOTEL_SELLER`
 * role, and `role.enum.ts:66-68` records that "marketplace, hotel and taxi
 * sellers all carry the plain `seller` role", with the portal named by
 * `users.seller_type`. That makes `@Roles(SELLER)` alone insufficient — every
 * seller of every module holds it — so `@SellerModule('hotel')` is the second
 * half, and a grocery seller reaching this API is refused by `sellerType` (the
 * exact cross-module hole `SellerModuleGuard` was written for).
 *
 * ADMIN/SUPER_ADMIN are deliberately NOT in that `@Roles`. Naming them would put
 * ten owner routes into `admin-market-scope.regression.spec.ts`'s collection,
 * which then requires a resolved market on each — and these are owner-scoped,
 * not market-scoped. Administrators act on hotels through `/admin/hotel/*`,
 * which is scoped and permission-gated; the same ruling restaurant's partner
 * routes already follow.
 *
 * `POST owner/register` is the ONE exception and stays authenticated-only, for
 * the reason `PublicSellersController` gives for `POST /sellers/register`: it is
 * how an account BECOMES a hotel owner, so requiring the seller role would make
 * it impossible ever to obtain.
 */
@ApiTags('🏨 Hotels')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hotels')
export class HotelController {
  private readonly logger = new Logger(HotelController.name);

  constructor(@Inject('HOTEL_SERVICE') private readonly hotelClient: ClientProxy) {}

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }

  /** Helper — sends TCP message with 5s timeout and graceful fallback. */
  /**
   * Forward to hotel-service, preserving the failure.
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
        this.hotelClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Hotel service unavailable'))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`hotel-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Hotel service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ── Health ──────────────────────────────────────────────────────────────

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Hotel service health check' })
  health() {
    return this.send('hotel_health', {});
  }

  // ── Search (no params) ────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search hotels with filters' })
  @ApiQuery({ name: 'q', required: false, example: 'Dubai' })
  @ApiQuery({ name: 'city', required: false, example: 'Dubai' })
  @ApiQuery({ name: 'checkin', required: false, example: '2026-07-15' })
  @ApiQuery({ name: 'checkout', required: false, example: '2026-07-18' })
  @ApiQuery({ name: 'guests', required: false, example: 2 })
  @ApiQuery({ name: 'starRating', required: false, example: '4,5' })
  @ApiQuery({ name: 'minPrice', required: false, example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, example: 1000 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  searchHotels(@Query() query: any) {
    return this.send('search_hotels', query);
  }

  // ══════════════════════════════════════════════════════════════════════
  // SPECIFIC ROUTES — must come BEFORE @Get(':id') to avoid catch-all
  // ══════════════════════════════════════════════════════════════════════

  // ── Bookings ──────────────────────────────────────────────────────────

  /**
   * Customer booking routes.
   *
   * The class-level `JwtAuthGuard` meant these were *authenticated*. None of
   * them were *authorised*: the booking or the customer was named entirely by
   * the URL, and nothing checked it against the token.
   *
   * A hotel booking carries the guest's full name, email, phone, nationality, ID
   * type and ID number, the address, the room and what was paid.
   * `GET bookings/:bookingId` handed all of that to any signed-in account that
   * knew an id; `bookings/user/:userId` listed any customer's reservations from
   * the id in the path; and `cancel` and `modify` let one customer cancel or
   * move another's stay.
   *
   * The requester now travels with every one of them, so hotel-service scopes
   * the row to its own customer rather than trusting the path.
   */
  private requesterOf(req: any): { requesterId: string; requesterRole: string } {
    const requesterId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!requesterId) throw new UnauthorizedException('Authenticated user required');
    return { requesterId, requesterRole: req?.user?.role };
  }

  @Get('bookings/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get booking details' })
  /* `ParseUUIDPipe` so a malformed id is refused as a 400 here rather than
     reaching Postgres and coming back as a 500 quoting
     `invalid input syntax for type uuid`. A 500 tells a caller the server broke
     when in fact their input was wrong, and it leaks the column type. */
  getBooking(@Param('bookingId', ParseUUIDPipe) bookingId: string, @Req() req: any) {
    return this.send('get_hotel_booking', { bookingId, ...this.requesterOf(req) });
  }

  @Get('bookings/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all bookings for the signed-in guest' })
  getUserBookings(
    @Param('userId') userId: string,
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const { requesterId, requesterRole } = this.requesterOf(req);
    const privileged = ['admin', 'super_admin'].includes(String(requesterRole ?? '').toLowerCase());
    // Refused rather than quietly answered with the caller's own list: every
    // other user-scoped route here — wallet, grocery orders, user addresses —
    // returns 403 on a mismatch, and silently substituting a different id means
    // a client asking for the wrong thing gets a 200 and never finds out.
    if (!privileged && userId !== requesterId) {
      throw new ForbiddenException('You may only view your own bookings');
    }
    return this.send('get_user_bookings', { userId, page, limit });
  }

  @Put('bookings/:bookingId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cancel a booking' })
  cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.send('cancel_hotel_booking', { bookingId, reason, ...this.requesterOf(req) });
  }

  @Put('bookings/:bookingId/modify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Modify a booking' })
  modifyBooking(@Param('bookingId') bookingId: string, @Body() dto: any, @Req() req: any) {
    return this.send('modify_hotel_booking', { bookingId, ...dto, ...this.requesterOf(req) });
  }

  // ── Owner Portal ──────────────────────────────────────────────────────

  /**
   * Authenticated, but NOT role-gated — the one `/hotels/owner/*` route that is
   * not, and the same ruling `POST /sellers/register` follows: this is how an
   * account becomes a hotel owner, so requiring `UserRole.SELLER` would make the
   * role impossible to obtain. Everything it can do is create a
   * `PENDING_VERIFICATION` owner record awaiting an administrator.
   */
  @Post('owner/register')
  @ApiOperation({ summary: 'Register as a hotel owner' })
  registerOwner(@Body() dto: any) {
    return this.send('register_hotel_owner', dto);
  }

  @Post('owner/hotels')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: create a new hotel listing' })
  createHotel(@Body() dto: any) {
    return this.send('create_hotel', dto);
  }

  @Put('owner/hotels/:id')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: update hotel details' })
  updateHotel(@Param('id') hotelId: string, @Body() dto: any) {
    return this.send('update_hotel', { hotelId, ...dto });
  }

  @Get('owner/dashboard')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: get hotel owner dashboard' })
  getOwnerDashboard(@Query('ownerId') ownerId: string) {
    return this.send('get_owner_dashboard', { ownerId });
  }

  @Get('owner/bookings')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: get bookings for owned hotels' })
  getOwnerBookings(
    @Query('ownerId') ownerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.send('get_owner_bookings', { ownerId, page, limit });
  }

  @Put('owner/rooms/:id/pricing')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: update room pricing' })
  updatePricing(@Param('id') roomId: string, @Body() dto: any) {
    return this.send('update_room_pricing', { roomId, ...dto });
  }

  @Put('owner/hotels/:id/bulk-pricing')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: bulk update pricing across rooms' })
  bulkUpdatePricing(@Param('id') hotelId: string, @Body() dto: any) {
    return this.send('bulk_update_pricing', { hotelId, ...dto });
  }

  @Put('owner/bookings/:id/no-show')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: mark a booking as no-show' })
  markNoShow(@Param('id') bookingId: string) {
    return this.send('mark_no_show', { bookingId });
  }

  @Get('owner/payouts')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: view payout history' })
  getOwnerPayouts(
    @Query('ownerId') ownerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.send('get_owner_payouts', { ownerId, page, limit });
  }

  @Get('owner/reviews')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: get reviews for owned hotels' })
  getOwnerReviews(@Query('ownerId') ownerId: string) {
    return this.send('get_owner_reviews', { ownerId });
  }

  @Post('owner/reviews/:id/reply')
  @UseGuards(RolesGuard, SellerModuleGuard)
  @Roles(UserRole.SELLER)
  @SellerModule('hotel')
  @ApiOperation({ summary: 'Owner: reply to a guest review' })
  replyToReview(@Param('id') reviewId: string, @Body('reply') reply: string) {
    return this.send('reply_to_review', { reviewId, reply });
  }

  // ── Admin ─────────────────────────────────────────────────────────────
  //
  // THIS BLOCK USED TO BE EIGHT ROUTES BEHIND `JwtAuthGuard` AND NOTHING ELSE.
  //
  // `@UseGuards(JwtAuthGuard)` was this controller's only class-level guard and
  // no route below declared `@Roles`, so **any authenticated caller — any role,
  // any market** — could approve a hotel listing, suspend a hotel, and read
  // platform-wide revenue, fraud, compliance and onboarding figures from a
  // customer token. `GET /hotels/admin/stats` was deleted in the R12 fix round
  // for exactly that reason; its seven siblings stayed, four lines below the
  // comment explaining why it had to go, and the whole-branch review found them
  // (finding A-1). They were invisible to `admin-market-scope.regression.spec.ts`
  // because that collector dropped any route with no admin `@Roles` — which is
  // why the same fix wave widened it to collect on the `admin` PATH segment too.
  //
  // Four are gone, in favour of the scoped twins on `admin-hotel.controller.ts`
  // that already carry `@Roles` and forward the caller's market. No caller
  // anywhere (`apps/web/src`, `packages/`, `packages/shared-mobile`,
  // `apps/api/scripts`, every module frontend — checked by grep) asked for any
  // of them:
  //
  //   GET  /hotels/admin/hotels            → GET   /admin/hotel/hotels
  //   PUT  /hotels/admin/hotels/:id/approve → PATCH /admin/hotel/hotels/:id/approve
  //   PUT  /hotels/admin/hotels/:id/suspend → PATCH /admin/hotel/hotels/:id/suspend
  //   GET  /hotels/admin/revenue           → GET   /admin/hotel/dashboard
  //     (`admin_revenue` and `admin_hotel_stats` are the SAME service method,
  //      `HotelAdminService.getAdminAnalytics` — hotel/backend admin.controller.ts:142)
  //
  // The three below have no twin on `admin-hotel.controller.ts`, so deleting
  // them would delete a capability rather than a duplicate. They keep their
  // paths and gain what the twins have: an admin role, the hotel module
  // permission key, and the caller's market resolved and forwarded so
  // `HotelAdminService` can predicate on `hotels.countryCode` (R9).
  //
  // `modules.hotel` is the key, not `hotels.manage`: `ADMIN_PERMISSIONS`
  // (`libs/common/src/admin/permissions.ts`) has no per-entity hotel key — the
  // module key is the vocabulary the console's role grid actually offers.

  @Get('admin/fraud/flags')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel')
  @ApiOperation({ summary: 'Admin: get fraud detection flags, for one market or all' })
  @ApiQuery({ name: 'countryCode', required: false })
  getFraudFlags(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those fraud flags');
    return this.send('admin_fraud_flags', { countryCode: market, scope });
  }

  @Get('admin/compliance')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel')
  @ApiOperation({ summary: 'Admin: get hotel compliance status, for one market or all' })
  @ApiQuery({ name: 'countryCode', required: false })
  getCompliance(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that compliance report');
    return this.send('admin_compliance', { countryCode: market, scope });
  }

  @Get('admin/onboarding')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel')
  @ApiOperation({ summary: 'Admin: hotel onboarding pipeline, for one market or all' })
  @ApiQuery({ name: 'countryCode', required: false })
  getOnboarding(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that onboarding pipeline');
    return this.send('admin_onboarding', { countryCode: market, scope });
  }

  // ══════════════════════════════════════════════════════════════════════
  // WILDCARD :id ROUTES — must come LAST to avoid catching specific paths
  // ══════════════════════════════════════════════════════════════════════

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get hotel details by ID' })
  @ApiParam({ name: 'id', example: 'htl-001' })
  getHotelById(@Param('id') id: string) {
    return this.send('get_hotel', { id });
  }

  @Public()
  @Get(':id/rooms')
  @ApiOperation({ summary: 'Get room availability for a hotel' })
  getRoomAvailability(
    @Param('id') hotelId: string,
    @Query('checkin') checkin: string,
    @Query('checkout') checkout: string,
    @Query('guests', new DefaultValuePipe(2), ParseIntPipe) guests: number,
  ) {
    return this.send('get_room_availability', { hotelId, checkin, checkout, guests });
  }

  @Post(':id/bookings')
  @ApiOperation({ summary: 'Create a hotel booking' })
  createBooking(@Param('id') hotelId: string, @Body() dto: any) {
    return this.send('create_hotel_booking', { hotelId, ...dto });
  }

  @Post(':id/reviews')
  @ApiOperation({ summary: 'Submit a hotel review' })
  submitReview(@Param('id') hotelId: string, @Body() dto: any) {
    return this.send('submit_hotel_review', { hotelId, ...dto });
  }

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get reviews for a hotel' })
  getReviews(
    @Param('id') hotelId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.send('get_hotel_reviews', { hotelId, page, limit });
  }
}
