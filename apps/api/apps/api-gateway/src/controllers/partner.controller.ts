import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Optional,
  Inject,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { EntityManager } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import {
  Partner,
  PartnerUser,
  PartnerRole,
  PartnerRoleAssignment,
  PartnerDocument,
  PartnerComplianceStatus,
  PartnerOnlineSession,
  PartnerLocationUpdate,
  PartnerEarning,
  PartnerPayout,
  PartnerSosCase,
  DeliveryPartner,
  DeliveryTask,
  DeliveryTaskStatusHistory,
  DeliveryPartnerEarning,
  DeliveryCodCollection,
  DeliveryReturnTask,
  TaxiDriver,
  TaxiVehicle,
  TaxiRide,
  TaxiRideStatusHistory,
  TaxiDriverEarning,
  TaxiAuditLog,
} from '../entities';

const skipDb = process.env.SKIP_DB === 'true';

/**
 * Development OTP shortcut.
 *
 * `'5566'` used to be accepted unconditionally, for any phone number, with no
 * environment check at all — `if (body.otp !== '5566' && cached !== body.otp)`.
 * That is an authentication bypass in production: anyone who knows a partner's
 * phone number logs in as them. `/auth/login` also returned the generated OTP
 * in its own response body (`devOtp`), so the number was not even needed.
 *
 * It now requires an explicit opt-in that cannot be set in production, matching
 * how `DEV_AUTH_BYPASS` is gated in JwtAuthGuard.
 */
const devOtpEnabled = () =>
  process.env.PARTNER_DEV_OTP === 'true' && process.env.NODE_ENV !== 'production';

@ApiTags('🤝 Partner')
@ApiBearerAuth('JWT')
// Two mounts, same reason as LoyaltyGatewayController: `api/partner` under
// the global `api` prefix is /api/v1/api/partner/*, which is what the partner
// mobile app calls today. `partner` is canonical; the doubled path stays so
// the app keeps working until it is repointed.
@Controller(['partner', 'api/partner'])
export class PartnerController {
  /** Mirrors AuthController so partner sessions age out on the same schedule. */
  private static readonly ACCESS_TTL_SECONDS = 3600;
  private static readonly REFRESH_TTL_SECONDS = 2592000; // 30 days

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    private readonly jwtService: JwtService,
    @Optional() @Inject(EntityManager) private readonly em: EntityManager | null,
  ) {}

  /** Roles a partner may hold; anything else in the column is ignored. */
  private static readonly PARTNER_ROLES = ['TAXI_DRIVER', 'DELIVERY_PARTNER'] as const;

  /**
   * The EntityManager, or a clear failure if there isn't one.
   *
   * The handlers below guard with `if (!skipDb)`, which tests an environment
   * variable — not whether the optional manager was actually injected. When
   * those two disagreed the query threw `Cannot read properties of null` from
   * inside TypeORM and surfaced as an unexplained 500.
   */
  private get db(): EntityManager {
    if (!this.em) {
      throw new ServiceUnavailableException(
        'The partner database connection is not available on this gateway instance.',
      );
    }
    return this.em;
  }

  /**
   * Scope-tokens for the partner app, derived rather than fixed.
   *
   * Read access follows the granted roles so a partner can see their own
   * queue; write access additionally requires an approved account, because
   * writes are accepting jobs and completing deliveries.
   */
  private static permissionsFor(allowedRoles: string[], complianceStatus: string): string[] {
    const approved = complianceStatus === 'APPROVED';
    const scopes: string[] = [];
    if (allowedRoles.includes('TAXI_DRIVER')) {
      scopes.push('TAXI_READ');
      if (approved) scopes.push('TAXI_WRITE');
    }
    if (allowedRoles.includes('DELIVERY_PARTNER')) {
      scopes.push('DELIVERY_READ');
      if (approved) scopes.push('DELIVERY_WRITE');
    }
    return scopes;
  }

  /**
   * Look up the signing-in partner, or fail.
   *
   * Every branch here either returns a real registry row or throws. There is
   * deliberately no path that invents an identity: the previous version had
   * three of them (auto-create, catch-fallback, and the `skipDb` defaults
   * applying in any environment), and each one issued a valid signed token.
   *
   * The `skipDb` fixture survives only because local UI work runs the gateway
   * without Postgres, and it is now gated behind the same explicit dev opt-in
   * as the OTP shortcut, so setting `SKIP_DB` alone cannot reopen it.
   */
  private async resolvePartnerIdentity(phone: string): Promise<{
    partnerId: string;
    userId: string;
    allowedRoles: string[];
    activeRole: string;
    complianceStatus: string;
  }> {
    if (skipDb || !this.em) {
      if (!devOtpEnabled()) {
        throw new ServiceUnavailableException(
          'Partner sign-in is unavailable: the partner registry is not connected.',
        );
      }
      return {
        partnerId: 'partner-12345',
        userId: 'user-partner-987',
        allowedRoles: [...PartnerController.PARTNER_ROLES],
        activeRole: 'TAXI_DRIVER',
        complianceStatus: 'APPROVED',
      };
    }

    const partner = await this.db.findOne(Partner, { where: { phone } });
    if (!partner) {
      throw new UnauthorizedException(
        'No partner account is registered for this number. Complete partner onboarding first.',
      );
    }

    const pUser = await this.db.findOne(PartnerUser, { where: { partnerId: partner.id } });
    if (!pUser) {
      throw new UnauthorizedException(
        'This partner account has no user profile yet. Please finish onboarding.',
      );
    }

    // A suspended or rejected partner is not merely un-approved — letting them
    // hold a session with working roles is what `status` exists to prevent.
    if (partner.status === 'SUSPENDED' || partner.status === 'REJECTED') {
      throw new ForbiddenException(
        `This partner account is ${partner.status.toLowerCase()}. Contact support to restore access.`,
      );
    }

    return {
      partnerId: partner.id,
      // `userId` is the JWT subject. A partner-user row without one cannot be
      // signed into a token that any ownership guard could check against.
      userId:
        pUser.userId ??
        (() => {
          throw new UnauthorizedException(
            'This partner account is not linked to a user profile. Please contact support.',
          );
        })(),
      // `allowedRoles` is a nullable array column; an empty list is the honest
      // reading of "no roles granted yet", not a reason to grant both.
      allowedRoles: (pUser.allowedRoles ?? []).filter((role) =>
        (PartnerController.PARTNER_ROLES as readonly string[]).includes(role),
      ),
      activeRole: pUser.activeRole ?? 'TAXI_DRIVER',
      complianceStatus: partner.status,
    };
  }

  // ── COMMON PARTNER APIS ───────────────────────────────────────────────────

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Partner Login (Starts OTP flow)' })
  async login(@Body() body: { phone: string }) {
    if (!body.phone) {
      throw new BadRequestException('Phone number is required');
    }
    // A per-request random code, not the constant '5566' this used to store for
    // every partner. Six digits, zero-padded so it cannot be short.
    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis.set(`partner:otp:${body.phone}`, otp, 300); // 5 mins

    // Returning the code to the caller defeats the point of sending it. Kept
    // only behind the dev opt-in so local work does not need an SMS provider.
    return {
      success: true,
      message: 'OTP sent successfully',
      ...(devOtpEnabled() ? { devOtp: otp } : {}),
    };
  }

  @Post('auth/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Partner OTP and login' })
  async verifyOtp(@Body() body: { phone: string; otp: string }) {
    if (!body.phone || !body.otp) {
      throw new BadRequestException('Phone and OTP are required');
    }
    const cached = await this.redis.get(`partner:otp:${body.phone}`);
    const devAccepted = devOtpEnabled() && body.otp === '5566';
    if (!devAccepted && (!cached || cached !== body.otp)) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    // Single-use: without this the code stays valid for its full five minutes
    // however many times it is replayed.
    if (!devAccepted) await this.redis.del(`partner:otp:${body.phone}`);

    /**
     * Resolve the partner from the registry.
     *
     * This block used to *create* one when the phone was unknown — literally
     * `name: 'John Doe Partner', status: 'APPROVED'`, with both driver roles.
     * The OTP guarding it is sent to whatever number the caller supplies, so
     * the two together let anyone mint an approved partner account for
     * themselves and receive a signed token for it. Onboarding decides who is
     * a partner; sign-in only looks them up.
     *
     * The old `catch` was the same hole from the other side: a failed query
     * fell through to the static `partner-12345` / `user-partner-987` identity
     * and still signed a token, so every database error logged the caller in
     * as one shared partner. A registry we cannot read is unavailable, not
     * permissive — the exception propagates now.
     */
    const partnerIdentity = await this.resolvePartnerIdentity(body.phone);
    const { partnerId, userId, allowedRoles, activeRole, complianceStatus } = partnerIdentity;

    /**
     * A real signed token.
     *
     * This returned the literal strings `'mock-jwt-token-for-partner-auth'` and
     * `'mock-refresh-token-placeholder'`. Every other route on this controller
     * is behind `JwtAuthGuard`, which rejects a non-JWT outright — so the
     * partner app could complete login and then fail on every subsequent call.
     * The flow was simultaneously bypassable at the door and unusable past it.
     *
     * Claims match what `libs/security/src/jwt.strategy.ts` reads: `sub` is the
     * subject the ownership guard compares against, `type: 'access'` is required
     * (JwtAuthGuard refuses a refresh token as a Bearer credential), and `jti`
     * is what makes a single session revocable at logout.
     */
    const identity = {
      sub: userId,
      partnerId,
      role: activeRole,
      allowedRoles,
    };
    const auth_token = this.jwtService.sign(
      { ...identity, type: 'access', jti: crypto.randomUUID() },
      { expiresIn: PartnerController.ACCESS_TTL_SECONDS },
    );
    const refresh_token = this.jwtService.sign(
      { ...identity, type: 'refresh', jti: crypto.randomUUID() },
      { expiresIn: PartnerController.REFRESH_TTL_SECONDS },
    );

    // Return the required partner response structure
    return {
      partner_id: partnerId,
      user_id: userId,
      allowed_roles: allowedRoles,
      active_role: activeRole,
      compliance_status: complianceStatus,
      online_status: 'OFFLINE',
      country_code: 'IN',
      city_id: 'Mumbai',
      zone_id: 'Mumbai_cbd',
      // Derived from the roles actually granted and the compliance state, not
      // the fixed full-access list this used to return for every caller. A
      // partner awaiting approval can see their status; they cannot take work.
      permissions: PartnerController.permissionsFor(allowedRoles, complianceStatus),
      auth_token,
      refresh_token,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get partner profile' })
  async getProfile(@Req() req: any) {
    const pId = req.user?.partnerId || 'partner-12345';
    return {
      partnerId: pId,
      name: 'John Doe Partner',
      phone: '+91700000000',
      email: 'partner@kartseek.com',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      vehicle: {
        plateNumber: 'KCD 123X',
        model: 'Toyota Fielder 2018',
        type: 'economy',
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({ summary: 'Update partner profile' })
  async updateProfile(@Req() req: any, @Body() body: any) {
    return { success: true, message: 'Profile updated' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('compliance/status')
  @ApiOperation({ summary: 'Get partner compliance and KYC status' })
  async getComplianceStatus(@Req() req: any) {
    const pId = req.user?.partnerId || 'partner-12345';
    return {
      partnerId: pId,
      isCompliant: true,
      status: 'APPROVED', // PENDING, APPROVED, BLOCKED
      reason: null as unknown,
      documents: [
        { type: 'LICENSE', status: 'APPROVED', expiryDate: '2028-12-31' },
        { type: 'INSURANCE', status: 'APPROVED', expiryDate: '2027-06-30' },
      ],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('documents/upload')
  @ApiOperation({ summary: 'Upload partner document' })
  async uploadDocument(
    @Req() req: any,
    @Body() body: { docType: string; docUrl: string; roleType: string },
  ) {
    const pId = req.user?.partnerId || 'partner-12345';
    if (!skipDb) {
      const doc = this.db.create(PartnerDocument, {
        partnerId: pId,
        docType: body.docType,
        docUrl: body.docUrl,
        roleType: body.roleType || 'COMMON',
        status: 'PENDING',
      });
      await this.db.save(doc);
    }
    return { success: true, status: 'PENDING', message: 'Document uploaded for approval' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('online')
  @ApiOperation({ summary: 'Go online' })
  async goOnline(@Req() req: any, @Body() body: { roleType: string }) {
    const pId = req.user?.partnerId || 'partner-12345';
    // Compliance check
    if (!skipDb) {
      const partner = await this.db.findOne(Partner, { where: { id: pId } });
      if (partner && partner.status === 'BLOCKED') {
        throw new ForbiddenException('Cannot go online. Partner is blocked due to compliance.');
      }
      const session = this.db.create(PartnerOnlineSession, {
        partnerId: pId,
        roleType: body.roleType || 'TAXI_DRIVER',
        loginTime: new Date(),
        status: 'ONLINE',
      });
      await this.db.save(session);
    }
    return { success: true, status: 'ONLINE', roleType: body.roleType };
  }

  @UseGuards(JwtAuthGuard)
  @Post('offline')
  @ApiOperation({ summary: 'Go offline' })
  async goOffline(@Req() req: any) {
    const pId = req.user?.partnerId || 'partner-12345';
    if (!skipDb) {
      await this.db.update(
        PartnerOnlineSession,
        { partnerId: pId, status: 'ONLINE' },
        {
          status: 'OFFLINE',
          logoutTime: new Date(),
        },
      );
    }
    return { success: true, status: 'OFFLINE' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications')
  @ApiOperation({ summary: 'Get partner notifications' })
  async getNotifications(@Req() req: any) {
    return {
      notifications: [
        {
          id: 1,
          title: 'Welcome to KARTSEEK',
          body: 'Complete your documents to start receiving orders.',
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Weekly Bonus!',
          body: 'Complete 15 rides to unlock INR 1,500 bonus.',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('support/tickets')
  @ApiOperation({ summary: 'List support tickets' })
  async listTickets(@Req() req: any) {
    return { tickets: [] as unknown[] };
  }

  @UseGuards(JwtAuthGuard)
  @Post('support/tickets')
  @ApiOperation({ summary: 'Create support ticket' })
  async createTicket(@Req() req: any, @Body() body: any) {
    return { success: true, ticketId: 'TKT-7821', message: 'Ticket created successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('earnings/summary')
  @ApiOperation({ summary: 'Get unified earnings summary' })
  async getEarningsSummary(@Req() req: any) {
    return {
      today: 1850,
      thisWeek: 12400,
      totalEarnings: 45600,
      currency: 'INR',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('payouts')
  @ApiOperation({ summary: 'Get payout logs' })
  async getPayouts(@Req() req: any) {
    return {
      payouts: [
        { id: 'pay-1', amount: 5000, status: 'COMPLETED', bank: 'UPI', date: '2026-06-05' },
        { id: 'pay-2', amount: 8000, status: 'COMPLETED', bank: 'UPI', date: '2026-05-29' },
      ],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sos')
  @ApiOperation({ summary: 'Trigger panic SOS call' })
  async triggerSos(@Req() req: any, @Body() body: { lat: number; lng: number; rideId?: string }) {
    const pId = req.user?.partnerId || 'partner-12345';
    if (!skipDb) {
      const sos = this.db.create(PartnerSosCase, {
        partnerId: pId,
        referenceType: body.rideId ? 'TAXI_RIDE' : undefined,
        referenceId: body.rideId,
        lat: body.lat,
        lng: body.lng,
        status: 'ACTIVE',
      });
      await this.db.save(sos);
    }
    // Publish SOS alert to Kafka for emergency responders dispatch
    await this.kafka.publish(KAFKA_TOPICS.EMERGENCY_SOS_TRIGGERED, {
      partnerId: pId,
      lat: body.lat,
      lng: body.lng,
      rideId: body.rideId,
    });
    return {
      success: true,
      status: 'DISPATCHED',
      message: 'SOS signal sent. Emergency services notified.',
    };
  }

  // ── TAXI DRIVER MODE APIS ─────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('taxi/dashboard')
  @ApiOperation({ summary: 'Taxi mode dashboard stats' })
  async getTaxiDashboard(@Req() req: any) {
    return {
      onlineMinutes: 240,
      totalTrips: 8,
      acceptanceRate: '94%',
      rating: 4.85,
      todayEarnings: 2400,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('taxi/ride-requests')
  @ApiOperation({ summary: 'Get available passenger ride requests' })
  async getTaxiRequests(@Req() req: any) {
    return {
      requests: [
        {
          id: 'RIDE-9021',
          customerName: 'Mary W.',
          pickupAddress: 'Andheri West Mall, Mumbai',
          dropAddress: 'Mumbai Central, Indiatta Ave',
          pickupLat: 19.1176,
          pickupLng: 36.8041,
          dropLat: -1.2833,
          dropLng: 36.8219,
          distance: '4.8 km',
          formattedDistance: '4.8 km',
          formattedFare: 'INR 450',
          paymentMethod: 'CASH',
        },
      ],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('taxi/rides/:id/accept')
  @ApiOperation({ summary: 'Accept a taxi ride request' })
  async acceptTaxiRide(@Param('id') rideId: string, @Req() req: any) {
    // Check taxi compliance status (Expired license verification)
    const pId = req.user?.partnerId || 'partner-12345';
    if (!skipDb) {
      const doc = await this.db.findOne(PartnerDocument, {
        where: { partnerId: pId, roleType: 'TAXI_DRIVER', status: 'PENDING' },
      });
      if (doc && doc.expiryDate && new Date(doc.expiryDate) < new Date()) {
        throw new ForbiddenException('Cannot accept ride. Your Taxi Driver license is expired.');
      }
    }
    return { success: true, message: 'Ride accepted successfully', rideId };
  }

  @UseGuards(JwtAuthGuard)
  @Post('taxi/rides/:id/reject')
  @ApiOperation({ summary: 'Reject a ride request' })
  async rejectTaxiRide(@Param('id') rideId: string) {
    return { success: true, message: 'Ride request rejected' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('taxi/rides/:id/arrived')
  @ApiOperation({ summary: 'Driver arrived at pickup' })
  async arrivedTaxi(@Param('id') rideId: string) {
    return { success: true, status: 'DRIVER_ARRIVED' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('taxi/rides/:id/start')
  @ApiOperation({ summary: 'Start taxi ride' })
  async startTaxiRide(@Param('id') rideId: string) {
    return { success: true, status: 'RIDE_STARTED' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('taxi/rides/:id/complete')
  @ApiOperation({ summary: 'Complete taxi ride' })
  async completeTaxiRide(@Param('id') rideId: string) {
    return { success: true, status: 'RIDE_COMPLETED', fareCollected: 450 };
  }

  @UseGuards(JwtAuthGuard)
  @Post('taxi/rides/:id/cancel')
  @ApiOperation({ summary: 'Cancel ride with reason' })
  async cancelTaxiRide(@Param('id') rideId: string, @Body() body: { reason: string }) {
    return { success: true, status: 'CANCELLED', reason: body.reason };
  }

  @UseGuards(JwtAuthGuard)
  @Post('taxi/location')
  @ApiOperation({ summary: 'Post taxi driver location' })
  async updateTaxiLocation(
    @Req() req: any,
    @Body() body: { lat: number; lng: number; heading: number },
  ) {
    const pId = req.user?.partnerId || 'partner-12345';
    await this.redis.geoadd('drivers:locations', body.lng, body.lat, pId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('taxi/history')
  @ApiOperation({ summary: 'Get taxi driver ride history' })
  async getTaxiHistory(@Req() req: any) {
    return { rides: [] as unknown[] };
  }

  @UseGuards(JwtAuthGuard)
  @Get('taxi/earnings')
  @ApiOperation({ summary: 'Get taxi earnings log' })
  async getTaxiEarnings(@Req() req: any) {
    return { earnings: [] as unknown[] };
  }

  // ── DELIVERY MODE APIS ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('delivery/dashboard')
  @ApiOperation({ summary: 'Delivery dashboard stats' })
  async getDeliveryDashboard(@Req() req: any) {
    return {
      todayDeliveries: 5,
      codCollected: 3800,
      totalEarnings: 1250,
      acceptanceRate: '98%',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('delivery/tasks')
  @ApiOperation({ summary: 'Get delivery tasks list' })
  async getDeliveryTasks(@Req() req: any) {
    return {
      tasks: [
        {
          id: 'TASK-5512',
          orderId: 'ORD-99120',
          serviceType: 'grocery',
          sellerName: 'QuickMart Andheri West',
          customerName: 'Jane K.',
          pickupAddress: 'QuickMart Supermarket, Andheri West',
          dropAddress: 'Pride Apartments, Apt B4, Andheri West',
          pickupLat: -1.2641,
          pickupLng: 36.8049,
          dropLat: -1.269,
          dropLng: 36.812,
          distance: 1.8,
          deliveryFee: 150,
          isCod: true,
          codAmount: 1800,
          status: 'ASSIGNED',
        },
      ],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('delivery/tasks/:id')
  @ApiOperation({ summary: 'Get specific task details' })
  async getDeliveryTaskDetail(@Param('id') taskId: string) {
    return {
      id: taskId,
      orderId: 'ORD-99120',
      serviceType: 'grocery',
      sellerName: 'QuickMart Andheri West',
      pickupAddress: 'QuickMart Supermarket, Andheri West',
      dropAddress: 'Pride Apartments, Apt B4, Andheri West',
      pickupLat: -1.2641,
      pickupLng: 36.8049,
      dropLat: -1.269,
      dropLng: 36.812,
      distance: 1.8,
      deliveryFee: 150,
      isCod: true,
      codAmount: 1800,
      status: 'ASSIGNED',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/accept')
  @ApiOperation({ summary: 'Accept delivery task' })
  async acceptDeliveryTask(@Param('id') taskId: string) {
    return { success: true, status: 'ACCEPTED' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/reject')
  @ApiOperation({ summary: 'Reject delivery task' })
  async rejectDeliveryTask(@Param('id') taskId: string) {
    return { success: true, status: 'REJECTED' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/pickup-start')
  @ApiOperation({ summary: 'Start transit to pickup location' })
  async pickupStart(@Param('id') taskId: string) {
    return { success: true, status: 'PICKING_UP' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/pickup-proof')
  @ApiOperation({ summary: 'Upload proof of pickup (e.g. photo of package/receipt)' })
  async pickupProof(@Param('id') taskId: string, @Body() body: { proofUrl: string }) {
    return { success: true, status: 'PICKED_UP', proofUrl: body.proofUrl };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/drop-start')
  @ApiOperation({ summary: 'Start transit to customer dropoff' })
  async dropStart(@Param('id') taskId: string) {
    return { success: true, status: 'DELIVERING' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/verify-otp')
  @ApiOperation({ summary: 'Verify dropoff OTP from customer' })
  async verifyDeliveryOtp(@Param('id') taskId: string, @Body() body: { otp: string }) {
    if (body.otp !== '4321') {
      // Mock verification
      throw new BadRequestException('Incorrect delivery OTP');
    }
    return { success: true, message: 'OTP verified successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/drop-proof')
  @ApiOperation({ summary: 'Upload proof of dropoff' })
  async dropProof(@Param('id') taskId: string, @Body() body: { proofUrl: string }) {
    return { success: true, status: 'DELIVERED', proofUrl: body.proofUrl };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/complete')
  @ApiOperation({ summary: 'Complete delivery task' })
  async completeDelivery(@Param('id') taskId: string) {
    return { success: true, status: 'DELIVERED' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/failed')
  @ApiOperation({ summary: 'Mark delivery failed' })
  async failDelivery(@Param('id') taskId: string, @Body() body: { reason: string }) {
    return { success: true, status: 'FAILED', reason: body.reason };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delivery/tasks/:id/cod-collect')
  @ApiOperation({ summary: 'Record Cash on Delivery collection' })
  async collectCod(@Param('id') taskId: string, @Body() body: { amountCollected: number }) {
    return { success: true, status: 'COD_COLLECTED', amountCollected: body.amountCollected };
  }

  @UseGuards(JwtAuthGuard)
  @Get('delivery/returns')
  @ApiOperation({ summary: 'Get return tasks' })
  async getReturns(@Req() req: any) {
    return { returns: [] as unknown[] };
  }

  @UseGuards(JwtAuthGuard)
  @Get('delivery/history')
  @ApiOperation({ summary: 'Get delivery history' })
  async getDeliveryHistory(@Req() req: any) {
    return { tasks: [] as unknown[] };
  }

  @UseGuards(JwtAuthGuard)
  @Get('delivery/earnings')
  @ApiOperation({ summary: 'Get delivery earnings log' })
  async getDeliveryEarnings(@Req() req: any) {
    return { earnings: [] as unknown[] };
  }
}
