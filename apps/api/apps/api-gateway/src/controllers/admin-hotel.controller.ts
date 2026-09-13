import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseUUIDPipe,
  Req,
  Body,
  Query,
  UseGuards,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { refuseLockedAdmin, resolveScope } from '../guards/market-scope';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import {
  AdminHotelBookingsQueryDto,
  AdminHotelListQueryDto,
  AdminHotelMarketQueryDto,
  AdminHotelReportsQueryDto,
  AdminHotelReviewsQueryDto,
  AdminHotelRoomsQueryDto,
  CreateHotelAmenityDto,
  ModerateHotelReviewDto,
  SuspendHotelDto,
  UpdateHotelPricingDto,
  UpdateHotelSettingsDto,
} from '../dto/admin-hotel.dto';

/**
 * Admin Hotel Controller
 *
 * The seventeen `/admin/hotel/*` routes, each forwarding one command to
 * hotel-service.
 *
 * ── ONE SPELLING PER COMMAND (M5) ──────────────────────────────────────────
 *
 * This controller used to be written against a dotted convention —
 * `admin.hotel.rooms`, `admin.hotel.bookings` — that hotel-service never
 * adopted; it names its handlers with underscores. Two of the seventeen
 * (`approve`, `suspend`) had been given ALIAS handlers in the module to paper
 * over the mismatch, which left one decision answering to two names; the other
 * twelve reached no handler at all and the gateway reported "Hotel service
 * unavailable", which reads as an outage rather than a contract mismatch.
 *
 * M5 reconciled it in ONE direction: the gateway now sends the names the module
 * implements, the two aliases are deleted, and the twelve that had no
 * implementation were written — `HotelAdminService`, twelve
 * `@MessagePattern`s, all attributed through `hotels.countryCode`. The census
 * check (`test/gateway-service-contract.spec.ts`) holds an `it` that fails if a
 * hotel command reappears in either orphan baseline.
 *
 * `get_hotel` is deliberately NOT renamed to an admin spelling: it is the
 * module's own detail read, it already asserts the caller's market on both its
 * exits (cache and repository), and a second implementation of one lookup is
 * how two code paths come to disagree about who may see a property.
 *
 * ── `@Roles` on a method REPLACES the class-level one ───────────────────────
 *
 * So every handler that names a permission key restates `UserRole.ADMIN,
 * UserRole.SUPER_ADMIN` beside it. Omitting them does not "add a key to the
 * existing roles" — it removes the roles (documented at
 * `admin-marketplace.controller.ts:60-66`). Every key below exists in
 * `libs/common/src/admin/permissions.ts` and is held by both the `admin` and
 * `regional_admin` system roles, so this is a second gate on WHICH
 * administrator, not a change to which of them can reach the module at all.
 *
 * ── LIST SHAPE: one shape for all five list routes ──────────────────────────
 *
 * Every list read here returns hotel-service's payload **unwrapped**. The global
 * `TransformInterceptor` puts that under `data`, so a client finds the rows at
 * `json.data.data` and the count at `json.data.total` — the same place as every
 * other admin list on this branch (M1's marketplace orders/returns/refunds, M3's
 * pharmacy lists, M4's restaurant lists, which carries the same note at
 * `admin-restaurant.controller.ts:59-81`).
 *
 * A second `{ data: … }` here buries the rows one level deeper than the
 * console's other screens read. `GET /amenities` had one — it answers with
 * `{ data, total, catalogued }` like any other list — so the console would have
 * read `json.data.data` on four hotel screens and `json.data.data.data` on the
 * fifth. That is the envelope trap this platform has already paid for once
 * (M4 review I1), and the console client for this module does not exist yet, so
 * this is the cheapest it will ever be to settle.
 *
 * The rule is pinned by `every list route answers with data + total` in the
 * spec, which walks the routes rather than naming them, so a list route added
 * later cannot regress it.
 *
 * SINGLE-OBJECT reads — the dashboard, a hotel, a booking, a market's pricing,
 * a market's settings, a report — and every decision keep their `{ data: … }`:
 * they carry no `total`, nothing pages them, and unwrapping them would put a
 * bare entity where the console expects an object it can extend.
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

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
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
   *
   * The log line names the COMMAND on both paths. `rpcCatch` converts an RPC
   * failure into an `HttpException` first, so the old
   * `if (err instanceof HttpException) throw err` skipped the log entirely and
   * an outage left nothing in the gateway's own log to say which call failed.
   */
  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.hotelClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Hotel service unavailable'))),
      );
    } catch (err) {
      this.logger.error(`hotel-service error [${cmd}]: ${(err as Error)?.message}`);
      if (err instanceof HttpException) throw err;
      throw new HttpException('Hotel service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:dashboard.view')
  @ApiOperation({ summary: 'Admin hotel dashboard stats' })
  async getDashboard(@Req() req: any, @Query() query: AdminHotelMarketQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'that dashboard');
    return { data: await this.send('admin_hotel_stats', { countryCode: market, scope }) };
  }

  // ── Hotels ────────────────────────────────────────────────────
  @Get('hotels')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:sellers.view')
  @ApiOperation({ summary: 'List all hotels' })
  async getHotels(@Req() req: any, @Query() query: AdminHotelListQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those hotels');
    return await this.send('admin_list_hotels', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      countryCode: market,
      scope,
    });
  }

  @Get('hotels/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:sellers.view')
  @ApiOperation({ summary: 'Get hotel detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async getHotelById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that hotel');
    return { data: await this.send('get_hotel', { id, scope }) };
  }

  @Patch('hotels/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:sellers.approve')
  @ApiOperation({ summary: 'Approve a hotel' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async approveHotel(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that hotel');
    return {
      data: await this.send('admin_approve_hotel', {
        hotelId: id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  @Patch('hotels/:id/suspend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:sellers.approve')
  @ApiOperation({ summary: 'Suspend a hotel' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async suspendHotel(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SuspendHotelDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that hotel');
    return {
      data: await this.send('admin_suspend_hotel', {
        // Every explicit key after the spread: a body `{ "id": "<other>" }`
        // used to retarget the decision at a record in another market. The DTO
        // refuses one outright now, and this is the second line.
        ...body,
        hotelId: id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Rooms ─────────────────────────────────────────────────────
  @Get('rooms')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:content.view')
  @ApiOperation({ summary: 'List rooms across all hotels' })
  async getRooms(@Req() req: any, @Query() query: AdminHotelRoomsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those rooms');
    return await this.send('admin_hotel_rooms', {
      page: query.page,
      limit: query.limit,
      hotelId: query.hotelId,
      status: query.status,
      countryCode: market,
      scope,
    });
  }

  // ── Bookings ──────────────────────────────────────────────────
  @Get('bookings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:orders.view')
  @ApiOperation({ summary: 'List hotel bookings' })
  async getBookings(@Req() req: any, @Query() query: AdminHotelBookingsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those bookings');
    return await this.send('admin_hotel_bookings', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      countryCode: market,
      scope,
    });
  }

  @Get('bookings/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:orders.view')
  @ApiOperation({ summary: 'Get booking detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async getBookingById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that booking');
    return { data: await this.send('admin_hotel_booking_detail', { id, scope }) };
  }

  // ── Amenities ─────────────────────────────────────────────────
  //
  // One catalogue for the whole platform: "Pool", "Spa", "Airport shuttle" mean
  // the same thing in Doha and in Delhi, so the list is not filtered by market.
  // A locked admin reads it; only the write is withheld, because editing the
  // catalogue would change every other market's hotels along with their own.
  @Get('amenities')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:content.view')
  @GlobalEntity('hotel taxonomy is shared by every market')
  @ApiOperation({ summary: 'List global amenity categories' })
  async getAmenities(@Req() req: any) {
    this.scopeOf(req, undefined, 'those amenities');
    // Returned unwrapped — see LIST SHAPE on the class.
    return await this.send('admin_hotel_amenities', {});
  }

  @Post('amenities')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:content.manage')
  @ApiOperation({ summary: 'Create amenity' })
  async createAmenity(@Req() req: any, @Body() body: CreateHotelAmenityDto) {
    const { scope } = this.scopeOf(req, undefined, 'that amenity');
    refuseLockedAdmin(req, 'hotel taxonomy', 'Hotel taxonomy is managed globally.');
    return {
      data: await this.send('admin_hotel_create_amenity', {
        ...body,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Pricing ───────────────────────────────────────────────────
  @Get('pricing')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:finance.view')
  @ApiOperation({ summary: "Get a market's pricing terms and its seasonal rules" })
  async getPricing(@Req() req: any, @Query() query: AdminHotelMarketQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'that pricing');
    return { data: await this.send('admin_hotel_pricing', { countryCode: market, scope }) };
  }

  /**
   * A write gated only by a view key is a read permission that happens to
   * write, so this carries `sellers.manage` on top of `finance.view` — the same
   * ruling as the restaurant commission write. Both keys are held by `admin` and
   * `regional_admin`, so nothing is locked out today.
   */
  @Post('pricing')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    'perm:modules.hotel',
    'perm:finance.view',
    'perm:sellers.manage',
  )
  @ApiOperation({ summary: "Update a market's pricing terms" })
  async updatePricing(@Req() req: any, @Body() body: UpdateHotelPricingDto) {
    const { scope, market } = this.scopeOf(req, body.countryCode, 'that pricing');
    return {
      data: await this.send('admin_hotel_update_pricing', {
        ...body,
        // After the spread: the market a locked admin may write is their own,
        // resolved from the token, and never the one the body named.
        countryCode: market,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:finance.reports')
  @ApiOperation({ summary: 'Hotel reports for one market, or all of them' })
  async getReports(@Req() req: any, @Query() query: AdminHotelReportsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those reports');
    return {
      data: await this.send('admin_hotel_reports', {
        period: query.period,
        countryCode: market,
        scope,
      }),
    };
  }

  // ── Reviews ───────────────────────────────────────────────────
  @Get('reviews')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:content.view')
  @ApiOperation({ summary: 'List hotel reviews for moderation' })
  async getReviews(@Req() req: any, @Query() query: AdminHotelReviewsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those reviews');
    return await this.send('admin_hotel_reviews', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      countryCode: market,
      scope,
    });
  }

  @Patch('reviews/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:content.manage')
  @ApiOperation({ summary: 'Moderate a review' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async moderateReview(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ModerateHotelReviewDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that review');
    return {
      data: await this.send('admin_hotel_moderate_review', {
        // Every explicit key after the spread: a body `{ "id": "<other>" }`
        // used to retarget the decision at a record in another market.
        ...body,
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:sellers.view')
  @ApiOperation({ summary: "Get a market's hotel settings" })
  async getSettings(@Req() req: any, @Query() query: AdminHotelMarketQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those settings');
    return { data: await this.send('admin_hotel_settings', { countryCode: market, scope }) };
  }

  /**
   * `sellers.manage`, not `system.settings`: these settings decide how a
   * property is onboarded and what commission it carries by default, and
   * `system.settings` is held by `super_admin` alone — gating this on it would
   * lock every `admin` and `regional_admin` out of a screen the console offers
   * them.
   */
  @Post('settings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.hotel', 'perm:sellers.manage')
  @ApiOperation({ summary: "Update a market's hotel settings" })
  async updateSettings(@Req() req: any, @Body() body: UpdateHotelSettingsDto) {
    const { scope, market } = this.scopeOf(req, body.countryCode, 'those settings');
    return {
      data: await this.send('admin_hotel_update_settings', {
        ...body,
        countryCode: market,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }
}
