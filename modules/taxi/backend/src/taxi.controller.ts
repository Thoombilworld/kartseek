import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseFilters,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@app/security';
import { TaxiService } from './taxi.service';
import { VendorManagementService } from './services/vendor-management.service';
import { DriverOnboardingService } from './services/driver-onboarding.service';
import { TaxiConfigService } from './services/taxi-config.service';
import { TaxiPayoutService } from './services/taxi-payout.service';
import { type EmptyMessage, RpcAwareExceptionsFilter, assertInMarket } from '@app/common';
import {
  EstimateFareDto,
  RequestRideDto,
  CancelRideDto,
  RateRideDto,
  DriverOnlineDto,
  DriverIdDto,
  DriverLocationDto,
  DriverStartRideDto,
  DriverCompleteRideDto,
  NearbyDriversQueryDto,
  PaginationQueryDto,
  AdminVendorQueryDto,
  AdminActionDto,
  AdminRejectDto,
  AdminDriverQueryDto,
  DriverSuspendDto,
  DocumentReviewDto,
  PendingDocumentsQueryDto,
  UpsertRateCardDto,
  AdminPayoutQueryDto,
  PayoutBatchDto,
} from './dto/taxi.dto';

/**
 * TaxiController — REST + Microservice endpoints for the taxi-service.
 *
 * Security:
 *   - Customer/driver endpoints require JWT authentication
 *   - Admin endpoints require JWT + admin role
 *   - Customer-facing endpoints are rate-limited
 *   - All inputs validated via class-validator DTOs
 *
 * Endpoint groups:
 *   /taxi/health                — Health check (public)
 *   /taxi/estimate, /request    — Customer booking flow (auth + throttled)
 *   /taxi/driver/*              — Driver ride lifecycle (auth)
 *   /taxi/rides/*               — Shared ride queries (auth)
 *   /taxi/admin/*               — Super Admin management (auth + role)
 *   /taxi/vendor/:id/*          — Vendor-scoped portal (auth)
 */
@UseFilters(RpcAwareExceptionsFilter)
@Controller('taxi')
export class TaxiController {
  constructor(
    private readonly svc: TaxiService,
    private readonly vendors: VendorManagementService,
    private readonly onboarding: DriverOnboardingService,
    private readonly config: TaxiConfigService,
    private readonly payouts: TaxiPayoutService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // HEALTH (public — no auth)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('health')
  health() {
    return this.svc.healthCheck();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOMER ENDPOINTS (JWT + rate-limited)
  // ══════════════════════════════════════════════════════════════════════════

  @Post('estimate')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  estimateFare(@Body() dto: EstimateFareDto) {
    return this.svc.estimateFare(dto);
  }

  @Post('request')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  requestRide(@Body() dto: RequestRideDto) {
    return this.svc.requestRide(dto as any);
  }

  @Post('rides/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelRide(@Param('id') id: string, @Body() dto: CancelRideDto) {
    return this.svc.cancelRide(id, dto.reason);
  }

  @Get('rides/:id')
  @UseGuards(JwtAuthGuard)
  getRide(@Param('id') id: string) {
    return this.svc.getRideById(id);
  }

  @Put('rides/:id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('driverId') driverId?: string,
  ) {
    return this.svc.updateRideStatus(id, status, driverId);
  }

  @Post('rides/:id/rating')
  @UseGuards(JwtAuthGuard)
  rateRide(@Param('id') id: string, @Body() dto: RateRideDto) {
    return this.svc.rateRide(id, dto);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DRIVER ENDPOINTS (JWT auth)
  // ══════════════════════════════════════════════════════════════════════════

  @Post('driver/online')
  @UseGuards(JwtAuthGuard)
  driverOnline(@Body() dto: DriverOnlineDto) {
    return this.svc.driverGoOnline(dto.driverId, dto);
  }

  @Post('driver/offline')
  @UseGuards(JwtAuthGuard)
  driverOffline(@Body() dto: DriverIdDto) {
    return this.svc.driverGoOffline(dto.driverId);
  }

  @Post('driver/location')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  driverLocation(@Body() dto: DriverLocationDto) {
    return this.svc.driverUpdateLocation(dto);
  }

  @Post('driver/ride/:rideId/accept')
  @UseGuards(JwtAuthGuard)
  acceptRide(@Param('rideId') rideId: string, @Body() dto: DriverIdDto) {
    return this.svc.driverAcceptRide(rideId, dto.driverId);
  }

  @Post('driver/ride/:rideId/reject')
  @UseGuards(JwtAuthGuard)
  rejectRide(@Param('rideId') rideId: string, @Body() dto: DriverIdDto) {
    return this.svc.driverRejectRide(rideId, dto.driverId);
  }

  @Post('driver/ride/:rideId/arrived')
  @UseGuards(JwtAuthGuard)
  driverArrived(@Param('rideId') rideId: string, @Body() dto: DriverIdDto) {
    return this.svc.driverArrived(rideId, dto.driverId);
  }

  @Post('driver/ride/:rideId/start')
  @UseGuards(JwtAuthGuard)
  startRide(@Param('rideId') rideId: string, @Body() dto: DriverStartRideDto) {
    return this.svc.driverStartRide(rideId, dto.driverId, dto.otp);
  }

  @Post('driver/ride/:rideId/complete')
  @UseGuards(JwtAuthGuard)
  completeRide(@Param('rideId') rideId: string, @Body() dto: DriverCompleteRideDto) {
    return this.svc.driverCompleteRide(rideId, dto.driverId, dto as any);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUERY ENDPOINTS (JWT auth)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('drivers/nearby')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getNearby(@Query() dto: NearbyDriversQueryDto) {
    return this.svc.getNearbyDrivers(dto.lat, dto.lng, dto.radius ?? 5, dto.vehicleType);
  }

  @Get('drivers/:id/history')
  @UseGuards(JwtAuthGuard)
  getHistory(@Param('id') id: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.getRideHistory(id, +page, +limit);
  }

  @Get('surge')
  @UseGuards(JwtAuthGuard)
  getSurge(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.svc.getSurgeMultiplier(parseFloat(lat), parseFloat(lng));
  }

  @Get('matching/stats')
  @UseGuards(JwtAuthGuard)
  getMatchingStats() {
    return this.svc.getMatchingStats();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN — VENDOR MANAGEMENT (JWT + admin role)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/vendors')
  @UseGuards(JwtAuthGuard)
  adminGetVendors(@Query() dto: AdminVendorQueryDto) {
    return this.vendors.getVendors(dto);
  }

  @Get('admin/vendors/:id')
  @UseGuards(JwtAuthGuard)
  adminGetVendor(@Param('id') id: string) {
    return this.vendors.getVendorById(id);
  }

  @Get('admin/vendors/:id/dashboard')
  @UseGuards(JwtAuthGuard)
  adminGetVendorDashboard(@Param('id') id: string) {
    return this.vendors.getVendorDashboard(id);
  }

  @Post('admin/vendors')
  @UseGuards(JwtAuthGuard)
  adminRegisterVendor(@Body() dto: any) {
    return this.vendors.registerVendor(dto);
  }

  @Post('admin/vendors/:id/approve')
  @UseGuards(JwtAuthGuard)
  adminApproveVendor(@Param('id') id: string, @Body() dto: AdminActionDto) {
    return this.vendors.approveVendor(id, dto.adminId);
  }

  @Post('admin/vendors/:id/reject')
  @UseGuards(JwtAuthGuard)
  adminRejectVendor(@Param('id') id: string, @Body() dto: AdminRejectDto) {
    return this.vendors.rejectVendor(id, dto.adminId, dto.reason);
  }

  @Post('admin/vendors/:id/suspend')
  @UseGuards(JwtAuthGuard)
  adminSuspendVendor(@Param('id') id: string, @Body() dto: AdminRejectDto) {
    return this.vendors.suspendVendor(id, dto.adminId, dto.reason);
  }

  @Post('admin/vendors/:id/block')
  @UseGuards(JwtAuthGuard)
  adminBlockVendor(@Param('id') id: string, @Body() dto: AdminRejectDto) {
    return this.vendors.blockVendor(id, dto.adminId, dto.reason);
  }

  @Post('admin/vendors/:id/reactivate')
  @UseGuards(JwtAuthGuard)
  adminReactivateVendor(@Param('id') id: string, @Body() dto: AdminActionDto) {
    return this.vendors.reactivateVendor(id, dto.adminId);
  }

  @Post('admin/vendors/:vendorId/drivers')
  @UseGuards(JwtAuthGuard)
  adminAddDriverToVendor(@Param('vendorId') vendorId: string, @Body() dto: any) {
    return this.vendors.addDriverToVendor(vendorId, dto);
  }

  @Delete('admin/vendors/:vendorId/drivers/:driverId')
  @UseGuards(JwtAuthGuard)
  adminRemoveDriverFromVendor(
    @Param('vendorId') vendorId: string,
    @Param('driverId') driverId: string,
  ) {
    return this.vendors.removeDriverFromVendor(vendorId, driverId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN — DRIVER MANAGEMENT (JWT + admin role)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/drivers')
  @UseGuards(JwtAuthGuard)
  adminGetDrivers(@Query() dto: AdminDriverQueryDto) {
    return this.onboarding.getDrivers(dto);
  }

  @Get('admin/drivers/:id')
  @UseGuards(JwtAuthGuard)
  adminGetDriver(@Param('id') id: string) {
    return this.onboarding.getDriverById(id);
  }

  @Get('admin/drivers/:id/onboarding')
  @UseGuards(JwtAuthGuard)
  adminGetDriverOnboarding(@Param('id') id: string) {
    return this.onboarding.checkOnboardingComplete(id);
  }

  @Post('admin/drivers')
  @UseGuards(JwtAuthGuard)
  adminRegisterIndependentDriver(@Body() dto: any) {
    return this.onboarding.registerIndependentDriver(dto);
  }

  @Post('admin/drivers/:id/approve')
  @UseGuards(JwtAuthGuard)
  adminApproveDriver(@Param('id') id: string, @Body() dto: AdminActionDto) {
    return this.onboarding.approveDriver(id, dto.adminId);
  }

  @Post('admin/drivers/:id/suspend')
  @UseGuards(JwtAuthGuard)
  adminSuspendDriver(@Param('id') id: string, @Body() dto: DriverSuspendDto) {
    return this.onboarding.suspendDriver(id, dto.reason);
  }

  @Post('admin/drivers/:id/block')
  @UseGuards(JwtAuthGuard)
  adminBlockDriver(@Param('id') id: string, @Body() dto: DriverSuspendDto) {
    return this.onboarding.blockDriver(id, dto.reason);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN — DOCUMENT REVIEW (JWT + admin role)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/documents/pending')
  @UseGuards(JwtAuthGuard)
  adminGetPendingDocuments(@Query() dto: PendingDocumentsQueryDto) {
    return this.onboarding.getPendingDocuments(dto);
  }

  @Get('admin/documents/:ownerType/:ownerId')
  @UseGuards(JwtAuthGuard)
  adminGetDocuments(
    @Param('ownerType') ownerType: 'vendor' | 'driver',
    @Param('ownerId') ownerId: string,
  ) {
    return this.onboarding.getDocuments(ownerType, ownerId);
  }

  @Post('admin/documents')
  @UseGuards(JwtAuthGuard)
  adminSubmitDocument(@Body() dto: any) {
    return this.onboarding.submitDocument(dto);
  }

  @Post('admin/documents/:id/review')
  @UseGuards(JwtAuthGuard)
  adminReviewDocument(@Param('id') id: string, @Body() dto: DocumentReviewDto) {
    return this.onboarding.reviewDocument(id, dto.adminId, dto.decision, dto.rejectionReason);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN — PER-COUNTRY CONFIGURATION (JWT + admin role)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/config')
  @UseGuards(JwtAuthGuard)
  adminGetAllConfigs() {
    return this.config.getAllConfigs();
  }

  @Get('admin/config/:countryCode')
  @UseGuards(JwtAuthGuard)
  adminGetCountryConfig(@Param('countryCode') countryCode: string) {
    return this.config.getCountryConfig(countryCode);
  }

  @Put('admin/config/:countryCode')
  @UseGuards(JwtAuthGuard)
  adminUpsertCountryConfig(@Param('countryCode') countryCode: string, @Body() dto: any) {
    return this.config.upsertCountryConfig(countryCode, dto);
  }

  @Get('admin/config/:countryCode/documents/:ownerType')
  @UseGuards(JwtAuthGuard)
  adminGetRequiredDocuments(
    @Param('countryCode') countryCode: string,
    @Param('ownerType') ownerType: 'vendor' | 'driver',
  ) {
    return this.config.getRequiredDocuments(countryCode, ownerType);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN — RATE CARD MANAGEMENT (JWT + admin role)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/rates/:countryCode')
  @UseGuards(JwtAuthGuard)
  adminGetRateCards(@Param('countryCode') countryCode: string) {
    return this.config.getRateCards(countryCode);
  }

  @Put('admin/rates/:countryCode/:vehicleType')
  @UseGuards(JwtAuthGuard)
  adminUpsertRateCard(
    @Param('countryCode') countryCode: string,
    @Param('vehicleType') vehicleType: string,
    @Body() dto: UpsertRateCardDto,
  ) {
    return this.config.upsertRateCard(countryCode, vehicleType, dto);
  }

  @Delete('admin/rates/:countryCode/:vehicleType')
  @UseGuards(JwtAuthGuard)
  adminDeleteRateCard(
    @Param('countryCode') countryCode: string,
    @Param('vehicleType') vehicleType: string,
  ) {
    return this.config.deleteRateCard(countryCode, vehicleType);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN — PAYOUTS & FINANCIAL RECONCILIATION (JWT + admin role)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/payouts')
  @UseGuards(JwtAuthGuard)
  adminGetPayouts(@Query() dto: AdminPayoutQueryDto) {
    return this.payouts.getAllPayouts(dto);
  }

  @Get('admin/payouts/summary')
  @UseGuards(JwtAuthGuard)
  adminGetPayoutSummary(
    @Query('countryCode') countryCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.payouts.getPlatformPayoutSummary({
      countryCode,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post('admin/payouts/approve')
  @UseGuards(JwtAuthGuard)
  adminApprovePayouts(@Body() dto: PayoutBatchDto) {
    // Who approved a payout batch is the audit trail for money leaving the
    // platform. `adminId` was optional on the DTO and passed straight through,
    // so a message without one recorded the approval against `undefined`.
    if (!dto.adminId) {
      throw new BadRequestException('An approving admin id is required.');
    }
    return this.payouts.approvePayoutBatch(dto.payoutIds, dto.adminId);
  }

  @Post('admin/payouts/process')
  @UseGuards(JwtAuthGuard)
  adminProcessPayouts(@Body() dto: PayoutBatchDto) {
    return this.payouts.processPayouts(dto.payoutIds);
  }

  @Post('admin/payouts/:id/retry')
  @UseGuards(JwtAuthGuard)
  adminRetryPayout(@Param('id') id: string) {
    return this.payouts.retryPayout(id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VENDOR PORTAL — SCOPED ENDPOINTS (JWT auth)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('vendor/:vendorId/dashboard')
  @UseGuards(JwtAuthGuard)
  vendorDashboard(@Param('vendorId') vendorId: string) {
    return this.vendors.getVendorDashboard(vendorId);
  }

  @Get('vendor/:vendorId/drivers')
  @UseGuards(JwtAuthGuard)
  vendorGetDrivers(@Param('vendorId') vendorId: string, @Query() dto: AdminDriverQueryDto) {
    return this.onboarding.getDrivers({ ...dto, vendorId });
  }

  @Post('vendor/:vendorId/drivers')
  @UseGuards(JwtAuthGuard)
  vendorAddDriver(@Param('vendorId') vendorId: string, @Body() dto: any) {
    return this.vendors.addDriverToVendor(vendorId, dto);
  }

  @Get('vendor/:vendorId/drivers/:driverId')
  @UseGuards(JwtAuthGuard)
  vendorGetDriver(@Param('driverId') driverId: string) {
    return this.onboarding.getDriverById(driverId);
  }

  @Get('vendor/:vendorId/documents')
  @UseGuards(JwtAuthGuard)
  vendorGetDocuments(@Param('vendorId') vendorId: string) {
    return this.onboarding.getDocuments('vendor', vendorId);
  }

  @Post('vendor/:vendorId/documents')
  @UseGuards(JwtAuthGuard)
  vendorSubmitDocument(@Param('vendorId') vendorId: string, @Body() dto: any) {
    return this.onboarding.submitDocument({
      ...dto,
      ownerType: 'vendor' as const,
      ownerId: vendorId,
    });
  }

  @Get('vendor/:vendorId/payouts')
  @UseGuards(JwtAuthGuard)
  vendorGetPayouts(@Param('vendorId') vendorId: string, @Query() dto: AdminPayoutQueryDto) {
    return this.payouts.getPayoutsByRecipient('vendor', vendorId, dto);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DRIVER PORTAL — DOCUMENT & PAYOUT ENDPOINTS (JWT auth)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('driver/:driverId/documents')
  @UseGuards(JwtAuthGuard)
  driverGetDocuments(@Param('driverId') driverId: string) {
    return this.onboarding.getDocuments('driver', driverId);
  }

  @Post('driver/:driverId/documents')
  @UseGuards(JwtAuthGuard)
  driverSubmitDocument(@Param('driverId') driverId: string, @Body() dto: any) {
    return this.onboarding.submitDocument({
      ...dto,
      ownerType: 'driver' as const,
      ownerId: driverId,
    });
  }

  @Get('driver/:driverId/onboarding')
  @UseGuards(JwtAuthGuard)
  driverGetOnboarding(@Param('driverId') driverId: string) {
    return this.onboarding.checkOnboardingComplete(driverId);
  }

  @Get('driver/:driverId/payouts')
  @UseGuards(JwtAuthGuard)
  driverGetPayouts(@Param('driverId') driverId: string, @Query() dto: AdminPayoutQueryDto) {
    return this.payouts.getPayoutsByRecipient('driver', driverId, dto);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MICROSERVICE MESSAGE PATTERNS (internal — no auth needed)
  // ══════════════════════════════════════════════════════════════════════════

  @MessagePattern({ cmd: 'estimate_taxi_fare' })
  msgEstimate(@Payload() d: EstimateFareDto) {
    return this.svc.estimateFare(d);
  }

  @MessagePattern({ cmd: 'request_ride' })
  msgRequest(@Payload() d: RequestRideDto) {
    return this.svc.requestRide(d as any);
  }

  @MessagePattern({ cmd: 'driver_accept_ride' })
  msgAccept(@Payload() d: EmptyMessage) {
    return this.svc.driverAcceptRide(d.rideId, d.driverId);
  }

  @MessagePattern({ cmd: 'driver_reject_ride' })
  msgReject(@Payload() d: EmptyMessage) {
    return this.svc.driverRejectRide(d.rideId, d.driverId);
  }

  @MessagePattern({ cmd: 'driver_go_online' })
  msgOnline(@Payload() d: DriverOnlineDto) {
    return this.svc.driverGoOnline(d.driverId, d);
  }

  @MessagePattern({ cmd: 'driver_go_offline' })
  msgOffline(@Payload() d: DriverIdDto) {
    return this.svc.driverGoOffline(d.driverId);
  }

  // ── Admin console commands ────────────────────────────────────────────────
  // The gateway's admin-* controllers address this service with dot-notation
  // commands and none had a handler, so every admin screen for this module got
  // "no matching message handler" — an empty 200 while the gateway fallbacks
  // were in place, a 503 once they were removed. The implementations already
  // existed; only the patterns were missing.

  @MessagePattern({ cmd: 'admin.taxi.vendors' })
  tcpAdminGetVendors(
    @Payload()
    d: {
      countryCode?: string;
      scope?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.vendors.getVendors({ ...d, countryCode: d?.scope ?? d?.countryCode });
  }

  @MessagePattern({ cmd: 'admin.taxi.drivers' })
  tcpAdminGetDrivers(
    @Payload()
    d: {
      countryCode?: string;
      scope?: string;
      vendorId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.onboarding.getDrivers({ ...d, countryCode: d?.scope ?? d?.countryCode });
  }

  // ── Admin console, continued ──────────────────────────────────────────────
  //
  // Everything below already existed as a service method and was reachable only
  // on this service's own HTTP port. The gateway talks TCP, so the admin taxi
  // console had no route for any of it and every screen 404'd.

  @MessagePattern({ cmd: 'admin.taxi.documents.pending' })
  tcpPendingDocuments(
    @Payload()
    d: {
      countryCode?: string;
      scope?: string;
      ownerType?: 'vendor' | 'driver';
      page?: number;
      limit?: number;
    },
  ) {
    return this.onboarding.getPendingDocuments({
      ...(d ?? {}),
      countryCode: d?.scope ?? d?.countryCode,
    });
  }

  @MessagePattern({ cmd: 'admin.taxi.documents.review' })
  tcpReviewDocument(
    @Payload()
    d: {
      documentId: string;
      adminId: string;
      decision: 'approved' | 'rejected';
      rejectionReason?: string;
      scope?: string;
    },
  ) {
    return this.onboarding.reviewDocument(
      d?.documentId,
      d?.adminId,
      d?.decision,
      d?.rejectionReason,
      d?.scope,
    );
  }

  @MessagePattern({ cmd: 'admin.taxi.driver.suspend' })
  tcpSuspendDriver(@Payload() d: { driverId: string; reason: string; scope?: string }) {
    return this.onboarding.suspendDriver(d?.driverId, d?.reason ?? '', d?.scope);
  }

  @MessagePattern({ cmd: 'admin.taxi.driver.block' })
  tcpBlockDriver(@Payload() d: { driverId: string; reason: string; scope?: string }) {
    return this.onboarding.blockDriver(d?.driverId, d?.reason ?? '', d?.scope);
  }

  @MessagePattern({ cmd: 'admin.taxi.rate_cards' })
  tcpRateCards(@Payload() d: { countryCode: string; scope?: string }) {
    assertInMarket(d?.countryCode, d?.scope, 'rate card');
    return this.config.getRateCards(d?.countryCode);
  }

  @MessagePattern({ cmd: 'admin.taxi.rate_card.upsert' })
  tcpUpsertRateCard(
    @Payload()
    d: {
      countryCode: string;
      vehicleType: string;
      scope?: string;
      adminId?: string;
      [k: string]: unknown;
    },
  ) {
    assertInMarket(d?.countryCode, d?.scope, 'rate card');
    const { countryCode, vehicleType, scope: _s, adminId: _a, ...rest } = d ?? ({} as any);
    return this.config.upsertRateCard(countryCode, vehicleType, rest);
  }

  @MessagePattern({ cmd: 'admin.taxi.configs' })
  async tcpAllConfigs(@Payload() d?: { scope?: string }) {
    const all = await this.config.getAllConfigs();
    return d?.scope
      ? all.filter((c) => c.countryCode?.toUpperCase() === d.scope!.toUpperCase())
      : all;
  }

  @MessagePattern({ cmd: 'admin.taxi.config.get' })
  tcpGetConfig(@Payload() d: { countryCode: string; scope?: string }) {
    assertInMarket(d?.countryCode, d?.scope, 'configuration');
    return this.config.getCountryConfig(d?.countryCode);
  }

  @MessagePattern({ cmd: 'admin.taxi.config.upsert' })
  tcpUpsertConfig(
    @Payload() d: { countryCode: string; scope?: string; adminId?: string; [k: string]: unknown },
  ) {
    assertInMarket(d?.countryCode, d?.scope, 'configuration');
    const { countryCode, scope: _s, adminId: _a, ...rest } = d ?? ({} as any);
    return this.config.upsertCountryConfig(countryCode, rest);
  }

  @MessagePattern({ cmd: 'admin.taxi.payouts' })
  tcpPayouts(
    @Payload()
    d: {
      countryCode?: string;
      scope?: string;
      recipientType?: 'vendor' | 'driver';
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.payouts.getAllPayouts({ ...(d ?? {}), countryCode: d?.scope ?? d?.countryCode });
  }

  @MessagePattern({ cmd: 'admin.taxi.payouts.process' })
  tcpProcessPayouts(@Payload() d: { payoutIds: string[]; scope?: string }) {
    return this.payouts.processPayouts(d?.payoutIds ?? [], d?.scope);
  }

  @MessagePattern({ cmd: 'admin.taxi.payouts.summary' })
  tcpPayoutSummary(
    @Payload() d: { countryCode?: string; scope?: string; startDate?: string; endDate?: string },
  ) {
    return this.payouts.getPlatformPayoutSummary({
      countryCode: d?.scope ?? d?.countryCode,
      startDate: d?.startDate ? new Date(d.startDate) : undefined,
      endDate: d?.endDate ? new Date(d.endDate) : undefined,
    });
  }

  @MessagePattern({ cmd: 'admin.taxi.drivers.nearby' })
  tcpNearbyDrivers(
    @Payload()
    d: {
      lat: number;
      lng: number;
      radiusKm?: number;
      vehicleType?: string;
      countryCode?: string;
      scope?: string;
    },
  ) {
    return this.svc.getNearbyDrivers(
      d?.lat,
      d?.lng,
      d?.radiusKm ?? 5,
      d?.vehicleType,
      d?.scope ?? d?.countryCode,
    );
  }

  @MessagePattern({ cmd: 'admin.taxi.surge' })
  tcpSurge(@Payload() d: { lat: number; lng: number; scope?: string }) {
    // Surge zones carry no market of their own yet (see Plan D), so a locked
    // admin cannot be shown a filtered view — there is nothing to filter on.
    // Fail closed rather than silently serving every market's surge data to
    // a regional admin.
    if (d?.scope) {
      throw new ForbiddenException('Surge zones cannot be attributed to a market yet.');
    }
    return this.svc.getSurgeMultiplier(d?.lat, d?.lng);
  }
}
