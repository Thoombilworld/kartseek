import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Req,
  Body,
  Query,
  UseGuards,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { marketScopeOf, resolveMarket } from '../guards/market-scope';
import { GlobalEntity } from '../decorators/global-entity.decorator';

/**
 * Admin Hotel Controller
 *
 * Admin endpoints for managing hotels, rooms, bookings, amenities, and pricing.
 * All endpoints require SUPER_ADMIN role.
 */
/**
 * PATTERN NAMES
 *
 * This controller was written against a dotted convention — `admin.hotel.list`,
 * `admin.hotel.rooms` — that hotel-service never adopted; it names its handlers
 * with underscores (`admin_list_hotels`). Only `approve` and `suspend` happened
 * to match, so **fifteen of seventeen** admin hotel calls reached no handler and
 * the gateway reported "Hotel service unavailable" — which reads as an outage
 * rather than a contract mismatch.
 *
 * The three with real equivalents are wired below. The rest genuinely have no
 * implementation in hotel-service: amenities, bookings, bookingDetail,
 * createAmenity, moderateReview, pricing, reports, reviews, rooms, settings,
 * updatePricing, updateSettings. Those need handlers written, not renaming.
 */
@ApiTags('👑 Admin — Hotel')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/hotel')
export class AdminHotelController {
  private readonly logger = new Logger(AdminHotelController.name);

  constructor(@Inject('HOTEL_SERVICE') private readonly hotelClient: ClientProxy) {}

  /** The acting administrator, from the verified token — recorded on decisions. */
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
  }

  /**
   * The market this request may act in, as `scope` for the backend. A locked
   * admin gets their market (and any other market they name is refused and
   * logged); a global admin gets undefined — every market — or the market they
   * filtered on.
   */
  private scopeOf(
    req: any,
    requested?: string,
    what = 'that market',
  ): { scope?: string; market?: string } {
    const market = resolveMarket(req, requested, what);
    const scope = marketScopeOf(req).locked ? market : undefined;
    return { scope, market };
  }

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

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin hotel dashboard stats' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getDashboard(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that dashboard');
    return { data: await this.send('admin_hotel_stats', { countryCode: market, scope }) };
  }

  // ── Hotels ────────────────────────────────────────────────────
  @Get('hotels')
  @ApiOperation({ summary: 'List all hotels' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  async getHotels(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those hotels');
    return await this.send('admin_list_hotels', {
      page,
      limit,
      status,
      countryCode: market,
      scope,
    });
  }

  @Get('hotels/:id')
  @ApiOperation({ summary: 'Get hotel detail' })
  async getHotelById(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that hotel');
    return { data: await this.send('get_hotel', { id, scope }) };
  }

  @Patch('hotels/:id/approve')
  @ApiOperation({ summary: 'Approve a hotel' })
  async approveHotel(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that hotel');
    return {
      data: await this.send('admin.hotel.approve', { id, scope, adminId: this.actorId(req) }),
    };
  }

  @Patch('hotels/:id/suspend')
  @ApiOperation({ summary: 'Suspend a hotel' })
  async suspendHotel(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that hotel');
    return {
      data: await this.send('admin.hotel.suspend', {
        id,
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Rooms ─────────────────────────────────────────────────────
  @Get('rooms')
  @ApiOperation({ summary: 'List rooms across all hotels' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getRooms(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('hotelId') hotelId?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those rooms');
    return await this.send('admin.hotel.rooms', { page, hotelId, countryCode: market, scope });
  }

  // ── Bookings ──────────────────────────────────────────────────
  @Get('bookings')
  @ApiOperation({ summary: 'List hotel bookings' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getBookings(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those bookings');
    return await this.send('admin.hotel.bookings', { page, status, countryCode: market, scope });
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking detail' })
  async getBookingById(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that booking');
    return { data: await this.send('admin.hotel.bookingDetail', { id, scope }) };
  }

  // ── Amenities ─────────────────────────────────────────────────
  //
  // One catalogue for the whole platform: "Pool", "Spa", "Airport shuttle" mean
  // the same thing in Doha and in Delhi, so the list is not filtered by market.
  // A locked admin reads it; only the write is withheld, because editing the
  // catalogue would change every other market's hotels along with their own.
  @Get('amenities')
  @GlobalEntity('hotel taxonomy is shared by every market')
  @ApiOperation({ summary: 'List global amenity categories' })
  async getAmenities(@Req() req: any) {
    this.scopeOf(req, undefined, 'those amenities');
    return { data: await this.send('admin.hotel.amenities', {}) };
  }

  @Post('amenities')
  @ApiOperation({ summary: 'Create amenity' })
  async createAmenity(
    @Req() req: any,
    @Body() body: { name: string; icon?: string; category?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that amenity');
    if (marketScopeOf(req).locked)
      throw new ForbiddenException('Hotel taxonomy is managed globally.');
    return {
      data: await this.send('admin.hotel.createAmenity', {
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Pricing ───────────────────────────────────────────────────
  @Get('pricing')
  @ApiOperation({ summary: 'Get global pricing rules' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getPricing(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that pricing');
    return { data: await this.send('admin.hotel.pricing', { countryCode: market, scope }) };
  }

  @Post('pricing')
  @ApiOperation({ summary: 'Update pricing rules' })
  async updatePricing(@Req() req: any, @Body() body: any) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'that pricing');
    return {
      data: await this.send('admin.hotel.updatePricing', {
        ...body,
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Hotel reports' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getReports(
    @Req() req: any,
    @Query('period') period = '30d',
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those reports');
    return { data: await this.send('admin.hotel.reports', { period, countryCode: market, scope }) };
  }

  // ── Reviews ───────────────────────────────────────────────────
  @Get('reviews')
  @ApiOperation({ summary: 'List hotel reviews for moderation' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getReviews(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those reviews');
    return await this.send('admin.hotel.reviews', { page, status, countryCode: market, scope });
  }

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Moderate a review' })
  async moderateReview(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'remove'; reason?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that review');
    return {
      data: await this.send('admin.hotel.moderateReview', {
        id,
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get hotel admin settings' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getSettings(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those settings');
    return { data: await this.send('admin.hotel.settings', { countryCode: market, scope }) };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update hotel settings' })
  async updateSettings(@Req() req: any, @Body() body: any) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'those settings');
    return {
      data: await this.send('admin.hotel.updateSettings', {
        ...body,
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }
}
