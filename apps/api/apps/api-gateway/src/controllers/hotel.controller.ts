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
import { rpcCatch } from '@app/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { Public } from '../decorators/public.decorator';

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
 */
@ApiTags('🏨 Hotels')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('hotels')
export class HotelController {
  private readonly logger = new Logger(HotelController.name);

  constructor(@Inject('HOTEL_SERVICE') private readonly hotelClient: ClientProxy) {}

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

  @Post('owner/register')
  @ApiOperation({ summary: 'Register as a hotel owner' })
  registerOwner(@Body() dto: any) {
    return this.send('register_hotel_owner', dto);
  }

  @Post('owner/hotels')
  @ApiOperation({ summary: 'Owner: create a new hotel listing' })
  createHotel(@Body() dto: any) {
    return this.send('create_hotel', dto);
  }

  @Put('owner/hotels/:id')
  @ApiOperation({ summary: 'Owner: update hotel details' })
  updateHotel(@Param('id') hotelId: string, @Body() dto: any) {
    return this.send('update_hotel', { hotelId, ...dto });
  }

  @Get('owner/dashboard')
  @ApiOperation({ summary: 'Owner: get hotel owner dashboard' })
  getOwnerDashboard(@Query('ownerId') ownerId: string) {
    return this.send('get_owner_dashboard', { ownerId });
  }

  @Get('owner/bookings')
  @ApiOperation({ summary: 'Owner: get bookings for owned hotels' })
  getOwnerBookings(
    @Query('ownerId') ownerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.send('get_owner_bookings', { ownerId, page, limit });
  }

  @Put('owner/rooms/:id/pricing')
  @ApiOperation({ summary: 'Owner: update room pricing' })
  updatePricing(@Param('id') roomId: string, @Body() dto: any) {
    return this.send('update_room_pricing', { roomId, ...dto });
  }

  @Put('owner/hotels/:id/bulk-pricing')
  @ApiOperation({ summary: 'Owner: bulk update pricing across rooms' })
  bulkUpdatePricing(@Param('id') hotelId: string, @Body() dto: any) {
    return this.send('bulk_update_pricing', { hotelId, ...dto });
  }

  @Put('owner/bookings/:id/no-show')
  @ApiOperation({ summary: 'Owner: mark a booking as no-show' })
  markNoShow(@Param('id') bookingId: string) {
    return this.send('mark_no_show', { bookingId });
  }

  @Get('owner/payouts')
  @ApiOperation({ summary: 'Owner: view payout history' })
  getOwnerPayouts(
    @Query('ownerId') ownerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.send('get_owner_payouts', { ownerId, page, limit });
  }

  @Get('owner/reviews')
  @ApiOperation({ summary: 'Owner: get reviews for owned hotels' })
  getOwnerReviews(@Query('ownerId') ownerId: string) {
    return this.send('get_owner_reviews', { ownerId });
  }

  @Post('owner/reviews/:id/reply')
  @ApiOperation({ summary: 'Owner: reply to a guest review' })
  replyToReview(@Param('id') reviewId: string, @Body('reply') reply: string) {
    return this.send('reply_to_review', { reviewId, reply });
  }

  // ── Admin ─────────────────────────────────────────────────────────────
  //
  // `GET /hotels/admin/stats` used to live here: `@UseGuards(JwtAuthGuard)` is
  // this whole controller's CLASS-level guard, with no per-route `@Roles`, so
  // any authenticated caller — any role, any market — read platform-wide
  // hotel figures. It duplicated the properly scoped
  // `GET /admin/hotel/dashboard` in `admin-hotel.controller.ts` (which does
  // carry `@Roles` and forwards the caller's market), had no caller anywhere
  // in `apps/web`, `packages/shared-core` or `apps/api/scripts` (checked by
  // grep), and is deleted rather than fixed in place.

  @Get('admin/hotels')
  @ApiOperation({ summary: 'Admin: list all hotels with filters' })
  adminListHotels(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.send('admin_list_hotels', { page, limit, status });
  }

  @Put('admin/hotels/:id/approve')
  @ApiOperation({ summary: 'Admin: approve a hotel listing' })
  approveHotel(@Param('id') hotelId: string) {
    return this.send('admin_approve_hotel', { hotelId });
  }

  @Put('admin/hotels/:id/suspend')
  @ApiOperation({ summary: 'Admin: suspend a hotel' })
  suspendHotel(@Param('id') hotelId: string, @Body('reason') reason: string) {
    return this.send('admin_suspend_hotel', { hotelId, reason });
  }

  @Get('admin/fraud/flags')
  @ApiOperation({ summary: 'Admin: get fraud detection flags' })
  getFraudFlags() {
    return this.send('admin_fraud_flags', {});
  }

  @Get('admin/compliance')
  @ApiOperation({ summary: 'Admin: get hotel compliance status' })
  getCompliance() {
    return this.send('admin_compliance', {});
  }

  @Get('admin/revenue')
  @ApiOperation({ summary: 'Admin: revenue analytics' })
  getRevenue(@Query('period') period?: string) {
    return this.send('admin_revenue', { period });
  }

  @Get('admin/onboarding')
  @ApiOperation({ summary: 'Admin: hotel onboarding pipeline' })
  getOnboarding() {
    return this.send('admin_onboarding', {});
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
