import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UsePipes,
  ValidationPipe,
  UseFilters,
  Logger,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HotelService } from '../hotel.service';
import { HotelAdminService } from './admin.service';
import { type EmptyMessage, RpcAwareExceptionsFilter, requireId } from '@app/common';
import type {
  AdminAmenityMsg,
  AdminIdMsg,
  AdminListMsg,
  AdminModerateReviewMsg,
  AdminPricingMsg,
  AdminReportMsg,
  AdminRoomListMsg,
  AdminSettingsMsg,
} from './dto/admin.dto';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('admin')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HotelAdminController {
  private readonly logger = new Logger(HotelAdminController.name);

  constructor(
    private readonly svc: HotelService,
    private readonly admin: HotelAdminService,
  ) {}

  @Get('hotels')
  getAllHotels(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.svc.getAllHotels(+page, +limit, status);
  }

  @Put('hotels/:id/approve')
  approveHotel(@Param('id') id: string) {
    return this.svc.approveHotel(id);
  }

  @Put('hotels/:id/suspend')
  suspendHotel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.svc.suspendHotel(id, reason);
  }

  @Put('hotels/:id/block')
  blockHotel(@Param('id') id: string) {
    return this.svc.blockHotel(id);
  }

  @Put('hotels/:id/commission')
  setCommission(@Param('id') id: string, @Body('rate') rate: number) {
    return this.svc.setCommission(id, rate);
  }

  @Get('bookings')
  getBookings(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.getAllHotels(+page, +limit);
  }

  @Get('analytics')
  getAnalytics() {
    return this.svc.getAdminAnalytics();
  }

  @Get('fraud')
  getFraudAnalytics() {
    return this.svc.getAdminFraudAnalytics();
  }

  @Get('compliance')
  getCompliance() {
    return this.svc.getComplianceData();
  }

  @Get('refunds')
  getRefunds(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.getAllHotels(+page, +limit);
  }

  @Put('hotels/:id/commission-tier')
  setCommissionTier(@Param('id') id: string, @Body() dto: { tier: string; rate: number }) {
    return this.svc.setCommission(id, dto.rate);
  }

  // ── Microservice MessagePatterns (Admin) ──────────────────────────────────
  //
  // `scope` is the caller's market when the gateway resolved one for a
  // region-locked administrator, and undefined for a global one. A list narrows
  // to it, a decision is asserted against the hotel's own market, and a report
  // is filtered by it — every figure this module produces is attributable, so
  // none of these refuses any more (R9).

  /**
   * Platform statistics span hotels, bookings, revenue and reviews.
   *
   * This refused every scoped caller: `HotelReview` carries only `hotelId`, so
   * the review count could not be narrowed without a join, and a half-scoped
   * report is worse than none — it looks like the market's own figures while
   * the review total is every market's. `getAdminAnalytics` takes a market now
   * (R9) and carries the predicate on all four legs, the reviews through
   * `hotel_reviews -> hotels.countryCode`, so it answers.
   *
   * `scope` first: the lock wins over whatever `countryCode` asked for, and a
   * global admin's `?countryCode=` still filters.
   */
  @MessagePattern({ cmd: 'admin_hotel_stats' })
  msgStats(@Payload() d: EmptyMessage) {
    return this.svc.getAdminAnalytics(d?.scope ?? d?.countryCode);
  }

  @MessagePattern({ cmd: 'admin_list_hotels' })
  msgListHotels(@Payload() d: EmptyMessage) {
    return this.svc.getAllHotels(d.page, d.limit, d.status, d?.scope ?? d?.countryCode);
  }

  /**
   * `actorId` — the acting administrator, from the gateway's verified token.
   *
   * The gateway has sent it on both decisions all along (as `adminId`) and this
   * module discarded it: a property was approved or taken offline with nothing
   * recorded but a status change, which is the same trace a cron job would
   * leave. Both now write it, and `suspendHotel` stores the reason it has always
   * been handed and always thrown away.
   */
  @MessagePattern({ cmd: 'admin_approve_hotel' })
  msgApprove(@Payload() d: EmptyMessage) {
    return this.svc.approveHotel(requireId(d?.hotelId, 'hotel'), d?.scope, d?.actorId);
  }

  @MessagePattern({ cmd: 'admin_suspend_hotel' })
  msgSuspend(@Payload() d: EmptyMessage) {
    return this.svc.suspendHotel(requireId(d?.hotelId, 'hotel'), d?.reason, d?.scope, d?.actorId);
  }

  @MessagePattern({ cmd: 'admin_fraud_flags' })
  msgFraud(@Payload() d: EmptyMessage) {
    return this.svc.getAdminFraudAnalytics(d?.scope ?? d?.countryCode);
  }

  @MessagePattern({ cmd: 'admin_compliance' })
  msgCompliance(@Payload() d: EmptyMessage) {
    return this.svc.getComplianceData(d?.scope ?? d?.countryCode);
  }

  /** Reads the same per-market analytics as `admin_hotel_stats`. */
  @MessagePattern({ cmd: 'admin_revenue' })
  msgRevenue(@Payload() d: EmptyMessage) {
    return this.svc.getAdminAnalytics(d?.scope ?? d?.countryCode);
  }

  @MessagePattern({ cmd: 'admin_onboarding' })
  msgOnboarding(@Payload() d: EmptyMessage) {
    return this.svc.getAllHotels(1, 50, 'PENDING_KYC', d?.scope ?? d?.countryCode);
  }

  // ── The twelve the console asks for and this module never answered ────────
  //
  // The gateway now sends the names this controller has always implemented
  // (`admin_approve_hotel`, `admin_suspend_hotel`). It used to send
  // `admin.hotel.approve`/`.suspend`, which were added here as aliases — two
  // names for one decision, and twelve more `admin.hotel.*` spellings with no
  // handler at all. One spelling per command; the census check enforces it.
  //
  // The twelve below are that second half. Each is served by
  // `HotelAdminService`, and every one of them reaches its market through the
  // HOTEL row: rooms, bookings, reviews and seasonal pricing rules carry
  // `hotel_id` and nothing else. `hotel_market_settings` is the one row that
  // carries a market itself, because a market's configuration belongs to no
  // property.

  @MessagePattern({ cmd: 'admin_hotel_rooms' })
  msgRooms(@Payload() d: AdminRoomListMsg) {
    return this.admin.listRooms(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_hotel_bookings' })
  msgBookings(@Payload() d: AdminListMsg) {
    return this.admin.listBookings(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_hotel_booking_detail' })
  msgBookingDetail(@Payload() d: AdminIdMsg) {
    return this.admin.getBookingDetail(requireId(d?.id, 'hotel booking'), d?.scope);
  }

  @MessagePattern({ cmd: 'admin_hotel_amenities' })
  msgAmenities() {
    return this.admin.listAmenities();
  }

  @MessagePattern({ cmd: 'admin_hotel_create_amenity' })
  msgCreateAmenity(@Payload() d: AdminAmenityMsg) {
    return this.admin.createAmenity(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_hotel_pricing' })
  msgPricing(@Payload() d: AdminReportMsg) {
    return this.admin.getPricing(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_hotel_update_pricing' })
  msgUpdatePricing(@Payload() d: AdminPricingMsg) {
    return this.admin.updatePricing(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_hotel_reports' })
  msgReports(@Payload() d: AdminReportMsg) {
    return this.admin.getReports(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_hotel_reviews' })
  msgReviews(@Payload() d: AdminListMsg) {
    return this.admin.listReviews(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_hotel_moderate_review' })
  msgModerateReview(@Payload() d: AdminModerateReviewMsg) {
    return this.admin.moderateReview(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_hotel_settings' })
  msgSettings(@Payload() d: AdminReportMsg) {
    return this.admin.getSettings(d ?? {});
  }

  @MessagePattern({ cmd: 'admin_hotel_update_settings' })
  msgUpdateSettings(@Payload() d: AdminSettingsMsg) {
    return this.admin.updateSettings(d ?? {});
  }
}
