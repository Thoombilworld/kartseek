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
  ForbiddenException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HotelService } from '../hotel.service';
import {
  type DtoMessage,
  type EmptyMessage,
  type IdMessage,
  RpcAwareExceptionsFilter,
  requireId,
} from '@app/common';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('admin')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HotelAdminController {
  constructor(private readonly svc: HotelService) {}

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
  // that cannot yet be attributed to a market refuses rather than answering
  // with the whole platform's numbers.

  /**
   * Platform statistics span hotels, bookings, revenue and reviews.
   * `HotelReview` carries only `hotelId`, so the review count cannot be
   * narrowed to a market without a join, and a half-scoped report is worse
   * than none: it looks like the market's own figures while the review total
   * is every market's. Refused for a scoped caller until the report is
   * rebuilt per market.
   */
  @MessagePattern({ cmd: 'admin_hotel_stats' })
  msgStats(@Payload() d: EmptyMessage) {
    if (d?.scope) throw new ForbiddenException('This report cannot be attributed to a market yet.');
    return this.svc.getAdminAnalytics();
  }

  @MessagePattern({ cmd: 'admin_list_hotels' })
  msgListHotels(@Payload() d: EmptyMessage) {
    return this.svc.getAllHotels(d.page, d.limit, d.status, d?.scope ?? d?.countryCode);
  }

  @MessagePattern({ cmd: 'admin_approve_hotel' })
  msgApprove(@Payload() d: EmptyMessage) {
    return this.svc.approveHotel(d.hotelId, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_suspend_hotel' })
  msgSuspend(@Payload() d: EmptyMessage) {
    return this.svc.suspendHotel(d.hotelId, d.reason, d?.scope);
  }

  @MessagePattern({ cmd: 'admin_fraud_flags' })
  msgFraud(@Payload() d: EmptyMessage) {
    return this.svc.getAdminFraudAnalytics(d?.scope ?? d?.countryCode);
  }

  @MessagePattern({ cmd: 'admin_compliance' })
  msgCompliance(@Payload() d: EmptyMessage) {
    return this.svc.getComplianceData(d?.scope ?? d?.countryCode);
  }

  /** Reads the same unattributable analytics as `admin_hotel_stats`. */
  @MessagePattern({ cmd: 'admin_revenue' })
  msgRevenue(@Payload() d: EmptyMessage) {
    if (d?.scope) throw new ForbiddenException('This report cannot be attributed to a market yet.');
    return this.svc.getAdminAnalytics();
  }

  @MessagePattern({ cmd: 'admin_onboarding' })
  msgOnboarding(@Payload() d: EmptyMessage) {
    return this.svc.getAllHotels(1, 50, 'PENDING_KYC', d?.scope ?? d?.countryCode);
  }

  // ── Admin console commands ────────────────────────────────────────────────
  // The gateway's admin-* controllers address this service with dot-notation
  // commands and none had a handler, so every admin screen for this module got
  // "no matching message handler" — an empty 200 while the gateway fallbacks
  // were in place, a 503 once they were removed. The implementations already
  // existed; only the patterns were missing.

  @MessagePattern({ cmd: 'admin.hotel.approve' })
  tcpAdminApproveHotel(@Payload() d: IdMessage & { scope?: string }) {
    return this.svc.approveHotel(requireId(d?.id, 'hotel'), d?.scope);
  }

  @MessagePattern({ cmd: 'admin.hotel.suspend' })
  tcpAdminSuspendHotel(@Payload() d: IdMessage & { reason?: string; scope?: string }) {
    return this.svc.suspendHotel(requireId(d?.id, 'hotel'), d?.reason, d?.scope);
  }
}
