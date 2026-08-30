import {
  Controller, Get, Post, Patch, Delete, Param,
  Body, Query, UseGuards, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';

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

  constructor(
    @Inject('HOTEL_SERVICE') private readonly hotelClient: ClientProxy) {}

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
          .pipe(
            timeout(5000),
            catchError(rpcCatch('Hotel service unavailable')),
          ),
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
  async getDashboard() {
    return { data: await this.send('admin_hotel_stats', {}) };
  }

  // ── Hotels ────────────────────────────────────────────────────
  @Get('hotels')
  @ApiOperation({ summary: 'List all hotels' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getHotels(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return await this.send('admin_list_hotels', { page, limit, status });
  }

  @Get('hotels/:id')
  @ApiOperation({ summary: 'Get hotel detail' })
  async getHotelById(@Param('id') id: string) {
    return { data: await this.send('get_hotel', { id }) };
  }

  @Patch('hotels/:id/approve')
  @ApiOperation({ summary: 'Approve a hotel' })
  async approveHotel(@Param('id') id: string) {
    return { data: await this.send('admin.hotel.approve', { id }) };
  }

  @Patch('hotels/:id/suspend')
  @ApiOperation({ summary: 'Suspend a hotel' })
  async suspendHotel(@Param('id') id: string, @Body() body: { reason?: string }) {
    return { data: await this.send('admin.hotel.suspend', { id, ...body }) };
  }

  // ── Rooms ─────────────────────────────────────────────────────
  @Get('rooms')
  @ApiOperation({ summary: 'List rooms across all hotels' })
  async getRooms(@Query('page') page = 1, @Query('hotelId') hotelId?: string) {
    return await this.send('admin.hotel.rooms', { page, hotelId });
  }

  // ── Bookings ──────────────────────────────────────────────────
  @Get('bookings')
  @ApiOperation({ summary: 'List hotel bookings' })
  async getBookings(@Query('page') page = 1, @Query('status') status?: string) {
    return await this.send('admin.hotel.bookings', { page, status });
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking detail' })
  async getBookingById(@Param('id') id: string) {
    return { data: await this.send('admin.hotel.bookingDetail', { id }) };
  }

  // ── Amenities ─────────────────────────────────────────────────
  @Get('amenities')
  @ApiOperation({ summary: 'List global amenity categories' })
  async getAmenities() {
    return { data: await this.send('admin.hotel.amenities', {}) };
  }

  @Post('amenities')
  @ApiOperation({ summary: 'Create amenity' })
  async createAmenity(@Body() body: { name: string; icon?: string; category?: string }) {
    return { data: await this.send('admin.hotel.createAmenity', body) };
  }

  // ── Pricing ───────────────────────────────────────────────────
  @Get('pricing')
  @ApiOperation({ summary: 'Get global pricing rules' })
  async getPricing() {
    return { data: await this.send('admin.hotel.pricing', {}) };
  }

  @Post('pricing')
  @ApiOperation({ summary: 'Update pricing rules' })
  async updatePricing(@Body() body: any) {
    return { data: await this.send('admin.hotel.updatePricing', body) };
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Hotel reports' })
  async getReports(@Query('period') period = '30d') {
    return { data: await this.send('admin.hotel.reports', { period }) };
  }

  // ── Reviews ───────────────────────────────────────────────────
  @Get('reviews')
  @ApiOperation({ summary: 'List hotel reviews for moderation' })
  async getReviews(@Query('page') page = 1, @Query('status') status?: string) {
    return await this.send('admin.hotel.reviews', { page, status });
  }

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Moderate a review' })
  async moderateReview(@Param('id') id: string, @Body() body: { action: 'approve' | 'remove'; reason?: string }) {
    return { data: await this.send('admin.hotel.moderateReview', { id, ...body }) };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get hotel admin settings' })
  async getSettings() {
    return { data: await this.send('admin.hotel.settings', {}) };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update hotel settings' })
  async updateSettings(@Body() body: any) {
    return { data: await this.send('admin.hotel.updateSettings', body) };
  }
}
