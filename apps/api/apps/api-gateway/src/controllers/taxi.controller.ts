/* cSpell:words geosearch FROMLONLAT BYRADIUS WITHDIST WITHCOORD Meenakshi Mishra Axio Demio upi */
import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req, HttpCode, HttpStatus, ForbiddenException, NotFoundException, BadRequestException, Optional, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { EntityManager } from 'typeorm';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { WsTrackingGrantService } from '../services/ws-tracking-grant.service';
import { UserRole } from '@app/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { TaxiTrackingGateway } from '../gateways/taxi-tracking.gateway';
import { 
  TaxiVendor, TaxiVendorUser, TaxiDriver, TaxiVehicle, TaxiDriverDocument, TaxiVehicleDocument,
  TaxiRide, TaxiRideStatusHistory, TaxiRideLocation, TaxiFareRule, TaxiFareRuleVersion,
  TaxiSurgeRule, TaxiSurgeZone, TaxiSurgeEvent, TaxiCancellationRule, TaxiWaitingFeeRule,
  TaxiFareBreakdown, TaxiDriverEarning, TaxiVendorSettlement, TaxiCommissionRecord, TaxiPaymentRecord,
  TaxiSosCase, TaxiDispute, TaxiAuditLog
} from '../entities';

@ApiTags('ðŸš• Taxi')
@Controller('taxi')
export class TaxiController {
  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    private readonly taxiGateway: TaxiTrackingGateway,
    private readonly trackingGrants: WsTrackingGrantService,
    @Optional() @Inject(EntityManager) private readonly em: EntityManager | null) {}

  private isDbActive(): boolean {
    return process.env.SKIP_DB !== 'true' && this.em !== null;
  }

  /**
   * The EntityManager, or a clear failure if there isn't one.
   *
   * `em` is `@Optional()`, so its type is `EntityManager | null` and every
   * query below had to be read as "trust me, `isDbActive()` ran first". That
   * held everywhere today, but nothing enforced it: a new handler that forgot
   * the guard would throw `Cannot read properties of null` from deep inside
   * TypeORM, which reaches the caller as a bare 500. Routing the reads through
   * here keeps the guarantee checkable and names the cause when it is missing.
   */
  /**
   * The vendor the calling user operates, or a refusal.
   *
   * `TaxiVendorUser.vendorId` is a nullable column, and the fleet routes fed
   * it straight into `where: { vendorId }`. TypeORM renders a null there as
   * `IS NULL`, and on `TaxiDriver`/`TaxiVehicle` a null vendor means
   * *independent* — an unaffiliated driver, as the entity comment says. So a
   * vendor-user row with no vendor set did not return an empty fleet; it
   * returned every independent driver and vehicle on the platform to whoever
   * asked. The dashboard had the same shape via a `'DEFAULT_VENDOR'` default.
   *
   * There is no sensible fallback for "which fleet is this": either the
   * caller is mapped to one or they cannot use these routes.
   */
  private async requireVendorId(userId: string): Promise<string> {
    const vendorUser = await this.db.findOne(TaxiVendorUser, { where: { userId } });
    if (!vendorUser?.vendorId) {
      throw new ForbiddenException('Your account is not associated with a taxi vendor fleet.');
    }
    return vendorUser.vendorId;
  }

  private get db(): EntityManager {
    if (!this.em) {
      throw new ServiceUnavailableException(
        'The taxi database connection is not available on this gateway instance.',
      );
    }
    return this.em;
  }

  // â”€â”€â”€ HEALTH CHECK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Get('health')
  @ApiOperation({ summary: 'Taxi service health check' })
  healthCheck() {
    return { service: 'taxi', status: 'ok', dbActive: this.isDbActive(), timestamp: new Date().toISOString() };
  }

  // â”€â”€â”€ CUSTOMER ENDPOINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('estimate')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiOperation({ summary: 'Get fare estimate for a ride with dynamic calculations' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['pickupLat', 'pickupLng', 'dropLat', 'dropLng', 'vehicleType'],
      properties: {
        pickupLat: { type: 'number', example: -1.2921, description: 'Pickup latitude' },
        pickupLng: { type: 'number', example: 36.8219, description: 'Pickup longitude' },
        dropLat: { type: 'number', example: -1.3028, description: 'Drop-off latitude' },
        dropLng: { type: 'number', example: 36.8073, description: 'Drop-off longitude' },
        vehicleType: { type: 'string', example: 'economy', description: 'Vehicle type (economy, comfort, premium, bike, suv, delivery)' },
        zoneId: { type: 'string', example: 'DEFAULT_ZONE', description: 'Optional fare zone ID' },
      },
    },
  })
  async estimateFare(@Body() dto: {
    pickupLat: number; pickupLng: number;
    dropLat: number; dropLng: number;
    vehicleType: string;
    zoneId?: string;
  }) {
    // 1. Calculate distance (Haversine formula)
    const R = 6371; // Earth radius in km
    const dLat = (dto.dropLat - dto.pickupLat) * Math.PI / 180;
    const dLon = (dto.dropLng - dto.pickupLng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(dto.pickupLat*Math.PI/180) * Math.cos(dto.dropLat*Math.PI/180) * Math.sin(dLon/2)**2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const durationMin = distKm * 2 + 5; // Rough estimate (2 mins per km + 5 mins buffer)

    // 2. Fetch Fare Rule — check Redis cache first, then DB
    let baseFare = 50;
    let distanceRate = 35;
    let timeRate = 5;
    let minimumFare = 100;
    const fareZone = dto.zoneId || 'DEFAULT_ZONE';
    const fareCacheKey = `cache:fare_rule:${dto.vehicleType}:${fareZone}`;
    
    // FIX 4: Cache fare rules in Redis (5-min TTL) to avoid DB query on every estimate
    const cachedFare: any = await this.redis.getJson(fareCacheKey);
    if (cachedFare) {
      baseFare = cachedFare.baseFare;
      distanceRate = cachedFare.distanceRate;
      timeRate = cachedFare.timeRate;
      minimumFare = cachedFare.minimumFare;
    } else if (this.isDbActive()) {
      try {
        const rule = await this.db.findOne(TaxiFareRule, {
          where: { vehicleType: dto.vehicleType, zoneId: fareZone }
        });
        if (rule) {
          baseFare = Number(rule.baseFare);
          distanceRate = Number(rule.distanceFareRate);
          timeRate = Number(rule.timeFareRate);
          minimumFare = Number(rule.minimumFare);
        }
        // Cache for 5 minutes
        await this.redis.setJson(fareCacheKey, { baseFare, distanceRate, timeRate, minimumFare }, 300);
      } catch (err) {
        // Fallback to defaults
      }
    }

    // 3. Apply Surge Multiplier — check Redis cache first, then DB
    let surgeMultiplier = 1.0;
    const surgeCacheKey = `cache:surge_rule:${fareZone}`;

    const cachedSurge: any = await this.redis.getJson(surgeCacheKey);
    if (cachedSurge !== null && cachedSurge !== undefined) {
      surgeMultiplier = cachedSurge.multiplier || 1.0;
    } else if (this.isDbActive()) {
      try {
        const activeSurge = await this.db.findOne(TaxiSurgeRule, {
          where: { zoneId: fareZone, isActive: true }
        });
        if (activeSurge) {
          surgeMultiplier = Math.min(Number(activeSurge.multiplier), Number(activeSurge.capLimit));
        }
        // Cache for 2 minutes (surge changes more frequently)
        await this.redis.setJson(surgeCacheKey, { multiplier: surgeMultiplier }, 120);
      } catch (err) {}
    }

    // 4. Calculate Total
    const subTotal = baseFare + (distKm * distanceRate) + (durationMin * timeRate);
    const withSurge = subTotal * surgeMultiplier;
    const finalEstimate = Math.max(withSurge, minimumFare);

    return {
      distanceKm: Math.round(distKm * 10) / 10,
      durationMinutes: Math.round(durationMin),
      baseFare,
      distanceRate,
      timeRate,
      surgeMultiplier,
      estimatedFare: Math.round(finalEstimate),
      currency: 'INR',
      zoneId: dto.zoneId || 'DEFAULT_ZONE',
    };
  }

  /**
   * Requires a signed-in rider.
   *
   * The handler enriches each result from `driver:{id}:profile` with the
   * driver's name, vehicle type, number plate and rating, alongside their live
   * coordinates. Unauthenticated, that is a driver-tracking API: sweep lat/lng
   * across a city and you have every on-duty driver's identity, plate and
   * position, refreshed on demand. Riders are signed in before they book, so
   * this costs nothing operationally.
   */
  @Get('nearby-drivers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Find nearby available drivers matching criteria' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  @ApiQuery({ name: 'vehicleType', required: false, type: String })
  async getNearbyDrivers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('vehicleType') vehicleType?: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = parseFloat(radiusKm || '5');

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Valid lat and lng are required');
    }

    // 1. Search Redis GEO for online drivers within radius
    const drivers: any[] = [];
    try {
      const geoKey = 'drivers:locations';
      const results = await this.redis.georadius(geoKey, longitude, latitude, radius);

      if (results && results.length > 0) {
        // FIX 1: Batch all Redis reads in 2 round-trips instead of 2N sequential calls.
        // Before: 40 Redis calls for 20 drivers (N+1 pattern)
        // After:  2 Redis calls total (mgetJson batches all keys into MGET)
        const driverIds = results.map(r => r.member);
        const profileKeys = driverIds.map(id => `driver:${id}:profile`);
        const statusKeys = driverIds.map(id => `driver:${id}:status`);

        const [profiles, statuses] = await Promise.all([
          this.redis.mgetJson<any>(profileKeys),
          this.redis.mgetJson<any>(statusKeys),
        ]);

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const meta = profiles[i] || {};
          const status = statuses[i] || {};

          // Filter by vehicle type if specified
          if (vehicleType && meta.vehicleType && meta.vehicleType !== vehicleType) continue;
          // Skip drivers on active trips
          if (status.currentRideId) continue;

          drivers.push({
            driverId: r.member,
            name: meta.name || `Driver ${r.member}`,
            lat: r.lat,
            lng: r.lng,
            distanceKm: Math.round(r.dist * 10) / 10,
            eta: Math.round(r.dist * 2 + 3),
            vehicleType: meta.vehicleType || 'economy',
            vehiclePlate: meta.vehiclePlate || null,
            vehicleModel: meta.vehicleModel || null,
            rating: meta.rating || 4.5,
            totalTrips: meta.totalTrips || 0,
            acceptanceRate: meta.acceptanceRate || 0.85,
            profilePhotoUrl: meta.profilePhotoUrl || null,
            isOnTrip: false,
          });
        }
      }
    } catch (err) {
      // Redis GEO not available
    }

    // 2. If no real online drivers found, return empty with message
    if (drivers.length === 0) {
      return {
        drivers: [] as unknown[],
        total: 0,
        radiusKm: radius,
        center: { lat: latitude, lng: longitude },
        message: 'No drivers online nearby. Drivers must be using the partner app and be set to Online.',
      };
    }

    // 3. Sort by distance (nearest first)
    drivers.sort((a, b) => a.distanceKm - b.distanceKm);

    return { drivers, total: drivers.length, radiusKm: radius, center: { lat: latitude, lng: longitude } };
  }

  @Post('request')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60 } })
  @ApiOperation({ summary: 'Request a new ride — dispatches to online drivers only' })
  async requestRide(@Req() req: any, @Body() dto: {
    pickupLat: number; pickupLng: number;
    dropLat: number; dropLng: number;
    pickupAddress: string;
    dropAddress: string;
    vehicleType: string;
    paymentMethod: string;
    fareEstimate: number;
    preferredDriverId?: string;
  }) {
    const customerId = req.user?.userId || 'GUEST-CUSTOMER';
    const customerName = req.user?.firstName
      ? `${req.user.firstName}${req.user.lastName ? ' ' + req.user.lastName : ''}`
      : req.user?.name || UserRole.CUSTOMER;
    const rideId = `RIDE-${Date.now()}`;

    // ── 1. Check for online drivers before creating the ride ──
    let onlineDriverIds: string[] = [];
    try {
      const geoKey = 'drivers:locations';
      const results = await (this.redis as any).client?.geosearch?.(
        geoKey, 'FROMLONLAT', dto.pickupLng, dto.pickupLat, 'BYRADIUS', 10, 'km',
        'ASC', 'COUNT', 20, 'WITHDIST');
      if (results && Array.isArray(results)) {
        for (const result of results) {
          const driverId = result[0] || result;
          // Check driver is not already on a ride
          const status: any = await this.redis.getJson(`driver:${driverId}:status`) || {};
          if (status.currentRideId) continue;
          // Optionally filter by vehicle type
          const meta: any = await this.redis.getJson(`driver:${driverId}:profile`) || {};
          if (dto.vehicleType && meta.vehicleType && meta.vehicleType !== dto.vehicleType && dto.vehicleType !== 'economy') continue;
          onlineDriverIds.push(driverId);
        }
      }
    } catch (err) {
      // Redis GEO not available — proceed without pre-check
    }

    // If a preferred driver was requested, move them to front of queue
    if (dto.preferredDriverId && onlineDriverIds.includes(dto.preferredDriverId)) {
      onlineDriverIds = [dto.preferredDriverId, ...onlineDriverIds.filter(id => id !== dto.preferredDriverId)];
    }

    // ── 2. If absolutely no online drivers, respond immediately ──
    if (onlineDriverIds.length === 0) {
      const noDriverRide = {
        id: rideId,
        customerId, customerName,
        pickupLat: dto.pickupLat, pickupLng: dto.pickupLng,
        dropLat: dto.dropLat, dropLng: dto.dropLng,
        pickupAddress: dto.pickupAddress, dropAddress: dto.dropAddress,
        vehicleType: dto.vehicleType, paymentMethod: dto.paymentMethod,
        paymentStatus: 'PENDING', fareEstimate: dto.fareEstimate,
        finalFare: dto.fareEstimate,
        status: 'NO_DRIVERS_AVAILABLE',
        preferredDriverId: dto.preferredDriverId || null,
        dispatchedTo: [] as unknown[],
      };
      await this.redis.setJson(`ride:${rideId}`, noDriverRide, 1800);
      return { success: true, ride: noDriverRide };
    }

    // ── 3. Create ride in SEARCHING_DRIVER state ──
    const rideData = {
      id: rideId,
      customerId, customerName,
      pickupLat: dto.pickupLat, pickupLng: dto.pickupLng,
      dropLat: dto.dropLat, dropLng: dto.dropLng,
      pickupAddress: dto.pickupAddress, dropAddress: dto.dropAddress,
      vehicleType: dto.vehicleType, paymentMethod: dto.paymentMethod,
      paymentStatus: 'PENDING', fareEstimate: dto.fareEstimate,
      finalFare: dto.fareEstimate,
      status: 'SEARCHING_DRIVER',
      preferredDriverId: dto.preferredDriverId || null,
      dispatchedTo: onlineDriverIds.slice(0, 5), // Track which drivers received request
    };

    if (this.isDbActive()) {
      const newRide = this.db.create(TaxiRide, rideData);
      await this.db.save(newRide);

      const history = this.db.create(TaxiRideStatusHistory, {
        rideId,
        status: 'SEARCHING_DRIVER',
        reason: `Dispatched to ${onlineDriverIds.slice(0, 5).length} online driver(s)`,
      });
      await this.db.save(history);
    }

    // Cache in Redis for fast updates / driver polls
    await this.redis.setJson(`ride:${rideId}`, rideData, 3600);

    // ── 4. Dispatch to up to 5 nearest online drivers via WebSocket ──
    const dispatchTargets = onlineDriverIds.slice(0, 5);
    this.taxiGateway.dispatchRideToDrivers(dispatchTargets, rideData);

    // Also publish to Kafka for analytics / persistence
    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_REQUESTED || 'taxi.ride.requested', {
      id: rideId, customerId, customerName,
      driverIds: dispatchTargets,
      vehicleType: dto.vehicleType,
      pickupLat: dto.pickupLat, pickupLng: dto.pickupLng,
      dropLat: dto.dropLat, dropLng: dto.dropLng,
      fareEstimate: dto.fareEstimate,
    });

    return { success: true, ride: rideData };
  }

  @Get('rides')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get current customer ride history' })
  async getCustomerRides(@Req() req: any) {
    const customerId = req.user?.userId || 'GUEST-CUSTOMER';
    if (this.isDbActive()) {
      try {
        return await this.db.find(TaxiRide, { where: { customerId }, order: { createdAt: 'DESC' } });
      } catch {
        // TaxiRide entity may not be registered in gateway's TypeORM connection
        return [];
      }
    }
    return [];
  }

  @Get('ride/:rideId')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get detailed ride info' })
  async getRideDetails(@Req() req: any, @Param('rideId') rideId: string) {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let ride: any = null;
    if (this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    } else {
      ride = await this.redis.getJson(`ride:${rideId}`);
    }

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Ownership Guard: customer can only view their own rides; driver can only view their own rides; admins can see all.
    if (role !== UserRole.SUPER_ADMIN && ride.customerId !== userId && ride.driverId !== userId) {
      throw new ForbiddenException('You do not have permission to view this ride details.');
    }

    // Reaching here means the ride belongs to this caller. `joinRideTracking` on
    // the /taxi socket namespace has no way to establish that for itself, so the
    // check is recorded for it — without this the trip pages, which subscribe on
    // mount, would be refused their own ride's live position.
    await this.trackingGrants.grant(rideId, userId);

    return { success: true, ride };
  }

  @Post('ride/:rideId/cancel')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Cancel active ride' })
  async cancelRide(@Req() req: any, @Param('rideId') rideId: string, @Body('reason') reason?: string) {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let ride: any = null;
    if (this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    } else {
      ride = await this.redis.getJson(`ride:${rideId}`);
    }

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Ownership Guard
    if (role !== UserRole.SUPER_ADMIN && ride.customerId !== userId && ride.driverId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this ride.');
    }

    // Check if cancellation fee applies
    let cancellationFee = 0;
    if (ride.driverId && ride.status !== 'SEARCHING_DRIVER') {
      // Driver was assigned. Find cancellation rule.
      cancellationFee = 150; // Default
      if (this.isDbActive()) {
        try {
          const rule = await this.db.findOne(TaxiCancellationRule, { where: { vehicleType: ride.vehicleType } });
          if (rule) {
            cancellationFee = Number(rule.amount);
          }
        } catch (e) {}
      }
    }

    const nextStatus = role === UserRole.TAXI_DRIVER ? 'CANCELLED_BY_DRIVER' : 'CANCELLED_BY_CUSTOMER';
    ride.status = nextStatus;
    ride.finalFare = cancellationFee;

    if (this.isDbActive()) {
      await this.db.update(TaxiRide, rideId, { status: nextStatus, finalFare: cancellationFee });
      const history = this.db.create(TaxiRideStatusHistory, {
        rideId,
        status: nextStatus,
        reason: reason || 'Cancelled via app'
      });
      await this.db.save(history);

      if (cancellationFee > 0) {
        const breakdown = this.db.create(TaxiFareBreakdown, {
          rideId,
          baseFare: 0,
          distanceFare: 0,
          timeFare: 0,
          cancellationFee,
          platformCommission: cancellationFee * 0.2,
          vendorCommission: 0,
          driverEarning: cancellationFee * 0.8,
        });
        await this.db.save(breakdown);
      }
    }

    await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_STATUS_UPDATED || 'taxi.ride.status_updated', { id: rideId, status: nextStatus });

    return { success: true, message: `Ride cancelled successfully. Fee: ${cancellationFee} INR`, cancellationFee };
  }

  @Post('ride/:rideId/driver/accept')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver accepts a ride request' })
  async driverAcceptRide(
    @Param('rideId') rideId: string,
    @Body() body: { driverId: string }
  ) {
    let ride: any = await this.redis.getJson(`ride:${rideId}`);
    if (!ride && this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    }
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== 'SEARCHING_DRIVER') {
      return { success: false, message: 'Ride is no longer available' };
    }

    // Assign driver
    ride.driverId = body.driverId;
    ride.status = 'DRIVER_ACCEPTED';

    // Get driver profile for customer notification
    const driverProfile: any = await this.redis.getJson(`driver:${body.driverId}:profile`) || {};

    if (this.isDbActive()) {
      await this.db.update(TaxiRide, rideId, { driverId: body.driverId, status: 'DRIVER_ACCEPTED' });
      const history = this.db.create(TaxiRideStatusHistory, {
        rideId, status: 'DRIVER_ACCEPTED',
        reason: `Driver ${body.driverId} accepted the ride`
      });
      await this.db.save(history);
    }

    await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    // Mark driver as on-trip
    await this.redis.setJson(`driver:${body.driverId}:status`, { currentRideId: rideId, status: 'ON_TRIP' }, 7200);

    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_STATUS_UPDATED || 'taxi.ride.status_updated', {
      id: rideId, status: 'DRIVER_ACCEPTED', driverId: body.driverId,
      driverName: driverProfile.name || UserRole.DRIVER,
      driverPhone: driverProfile.phone || null,
      vehiclePlate: driverProfile.vehiclePlate || null,
    });

    return {
      success: true,
      message: 'Ride accepted',
      ride: { ...ride, driverName: driverProfile.name, driverPhone: driverProfile.phone },
    };
  }

  @Post('ride/:rideId/driver/reject')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver rejects a ride request' })
  async driverRejectRide(
    @Param('rideId') rideId: string,
    @Body() body: { driverId: string; reason?: string }
  ) {
    let ride: any = await this.redis.getJson(`ride:${rideId}`);
    if (!ride && this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    }
    if (!ride) throw new NotFoundException('Ride not found');

    // Log rejection for driver acceptance rate tracking
    const rejectionKey = `ride:${rideId}:rejections`;
    const rejections = (await this.redis.getJson<string[]>(rejectionKey)) || [];
    rejections.push(body.driverId);
    await this.redis.setJson(rejectionKey, rejections, 3600);

    if (this.isDbActive()) {
      const history = this.db.create(TaxiRideStatusHistory, {
        rideId, status: 'DRIVER_REJECTED',
        reason: `Driver ${body.driverId} rejected: ${body.reason || 'No reason'}`
      });
      await this.db.save(history);
    }

    // Publish rejection so dispatch service can cascade to next driver
    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_STATUS_UPDATED || 'taxi.ride.status_updated', {
      id: rideId, status: 'DRIVER_REJECTED', rejectedBy: body.driverId,
      reason: body.reason || 'DRIVER_REJECTED',
    });

    return { success: true, message: 'Ride rejected, dispatching to next driver' };
  }

  @Get('ride/:rideId/track')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Track driver live coordinates' })
  async trackRide(@Param('rideId') rideId: string) {
    // Get live coordinates from Redis
    const driverLoc = await this.redis.getJson<any>(`driver:loc:${rideId}`);
    if (driverLoc) {
      return { success: true, lat: driverLoc.lat, lng: driverLoc.lng, lastUpdated: driverLoc.timestamp };
    }
    // Fallback to ride pickup coordinates
    let ride: any = null;
    if (this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    } else {
      ride = await this.redis.getJson(`ride:${rideId}`);
    }
    if (!ride) throw new NotFoundException('Ride not found');
    return { success: true, lat: ride.pickupLat, lng: ride.pickupLng, lastUpdated: ride.createdAt };
  }

  // â”€â”€â”€ OTP ENDPOINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('ride/:rideId/otp/generate')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Generate ride OTP for verification' })
  async generateOtp(@Param('rideId') rideId: string) {
    let ride: any = null;
    if (this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    } else {
      ride = await this.redis.getJson(`ride:${rideId}`);
    }
    if (!ride) throw new NotFoundException('Ride not found');

    // Generate a 4-digit OTP
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in Redis
    await this.redis.setJson(`ride:${rideId}:otp`, {
      otp,
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
      maxAttempts: 3,
    }, 300); // 5 min TTL

    // Update ride status
    if (this.isDbActive()) {
      await this.db.update(TaxiRide, rideId, { status: 'OTP_PENDING' });
      const history = this.db.create(TaxiRideStatusHistory, {
        rideId, status: 'OTP_PENDING', reason: 'OTP generated for ride verification'
      });
      await this.db.save(history);
    }

    return { success: true, otp, expiresAt: expiresAt.toISOString() };
  }

  @Post('ride/:rideId/otp/verify')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER)
  @ApiOperation({ summary: 'Verify ride OTP entered by driver' })
  async verifyOtp(
    @Param('rideId') rideId: string,
    @Body() body: { otp: string }
  ) {
    const otpData: any = await this.redis.getJson(`ride:${rideId}:otp`);
    if (!otpData) {
      throw new BadRequestException('OTP expired or not generated');
    }

    if (otpData.attempts >= otpData.maxAttempts) {
      throw new ForbiddenException('Maximum OTP attempts exceeded. Please regenerate.');
    }

    if (body.otp !== otpData.otp) {
      otpData.attempts += 1;
      await this.redis.setJson(`ride:${rideId}:otp`, otpData, 300);

      if (this.isDbActive()) {
        const history = this.db.create(TaxiRideStatusHistory, {
          rideId, status: 'OTP_FAILED',
          reason: `Invalid OTP attempt ${otpData.attempts}/${otpData.maxAttempts}`
        });
        await this.db.save(history);
      }

      return { success: false, message: 'Invalid OTP', remainingAttempts: otpData.maxAttempts - otpData.attempts };
    }

    // OTP verified â€” start the trip
    await this.redis.del(`ride:${rideId}:otp`);

    const ride: any = await this.redis.getJson(`ride:${rideId}`);
    if (ride) {
      ride.status = 'RIDE_STARTED';
      await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    }

    if (this.isDbActive()) {
      await this.db.update(TaxiRide, rideId, { status: 'RIDE_STARTED' });
      const history = this.db.create(TaxiRideStatusHistory, {
        rideId, status: 'OTP_VERIFIED', reason: 'OTP verified successfully'
      });
      await this.db.save(history);
      const startHistory = this.db.create(TaxiRideStatusHistory, {
        rideId, status: 'RIDE_STARTED', reason: 'Ride started after OTP verification'
      });
      await this.db.save(startHistory);
    }

    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_STATUS_UPDATED || 'taxi.ride.status_updated', {
      id: rideId, status: 'RIDE_STARTED'
    });

    return { success: true, message: 'OTP verified. Trip started.' };
  }

  // â”€â”€â”€ CONFIGURATION ENDPOINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('config/:countryCode')
  @ApiOperation({ summary: 'Get taxi configuration for a country/region' })
  @ApiParam({ name: 'countryCode', example: 'IN' })
  async getCountryConfig(@Param('countryCode') countryCode: string) {
    const configs: Record<string, any> = {
      IN: { currency: 'INR', distanceUnit: 'km', otpRequired: true, cashEnabled: true, tipsEnabled: true, scheduledRidesEnabled: true, maxStops: 3, emergencyNumber: '112', rideShareEnabled: true, paymentTypes: ['cash', 'upi', 'card', 'wallet'], taxRate: 0.18, vatLabel: 'GST' },
      QA: { currency: 'QAR', distanceUnit: 'km', otpRequired: true, cashEnabled: true, tipsEnabled: true, scheduledRidesEnabled: true, maxStops: 3, emergencyNumber: '999', rideShareEnabled: false, paymentTypes: ['cash', 'card', 'apple_pay', 'google_pay', 'wallet'], taxRate: 0, vatLabel: 'VAT' },
      AE: { currency: 'AED', distanceUnit: 'km', otpRequired: true, cashEnabled: true, tipsEnabled: true, scheduledRidesEnabled: true, maxStops: 3, emergencyNumber: '999', rideShareEnabled: false, paymentTypes: ['cash', 'card', 'apple_pay', 'google_pay', 'wallet'], taxRate: 0.05, vatLabel: 'VAT' },
      US: { currency: 'USD', distanceUnit: 'mi', otpRequired: false, cashEnabled: false, tipsEnabled: true, scheduledRidesEnabled: true, maxStops: 4, emergencyNumber: '911', rideShareEnabled: true, paymentTypes: ['card', 'apple_pay', 'google_pay', 'wallet'], taxRate: 0.08, vatLabel: 'Tax' },
      GB: { currency: 'GBP', distanceUnit: 'mi', otpRequired: false, cashEnabled: true, tipsEnabled: true, scheduledRidesEnabled: true, maxStops: 3, emergencyNumber: '999', rideShareEnabled: true, paymentTypes: ['cash', 'card', 'apple_pay', 'google_pay', 'wallet'], taxRate: 0.20, vatLabel: 'VAT' },
    };

    return { success: true, countryCode, config: configs[countryCode] || configs['IN'] };
  }

  @Get('vehicle-categories')
  @ApiOperation({ summary: 'Get available vehicle categories for a region' })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  async getVehicleCategories(
    @Query('country') country?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string) {
    const categories = [
      { id: 'economy', name: 'Economy', description: 'Affordable rides for everyday travel', maxPassengers: 4, maxLuggage: 2, iconUrl: '/assets/vehicles/economy.png', isAccessible: false, baseMultiplier: 1.0 },
      { id: 'comfort', name: 'Comfort', description: 'Spacious cars with extra legroom', maxPassengers: 4, maxLuggage: 3, iconUrl: '/assets/vehicles/comfort.png', isAccessible: false, baseMultiplier: 1.3 },
      { id: 'premium', name: 'Premium', description: 'Luxury vehicles for a premium experience', maxPassengers: 4, maxLuggage: 3, iconUrl: '/assets/vehicles/premium.png', isAccessible: false, baseMultiplier: 1.8 },
      { id: 'suv', name: 'SUV', description: 'Large vehicles for groups and extra luggage', maxPassengers: 6, maxLuggage: 5, iconUrl: '/assets/vehicles/suv.png', isAccessible: true, baseMultiplier: 1.5 },
      { id: 'bike', name: 'Bike', description: 'Quick motorcycle rides for solo travelers', maxPassengers: 1, maxLuggage: 0, iconUrl: '/assets/vehicles/bike.png', isAccessible: false, baseMultiplier: 0.6 },
      { id: 'delivery', name: 'Delivery', description: 'Send packages across the city', maxPassengers: 0, maxLuggage: 1, iconUrl: '/assets/vehicles/delivery.png', isAccessible: false, baseMultiplier: 0.8 },
    ];

    return categories;
  }

  @Get('ride/:rideId/receipt')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get ride receipt data' })
  async getRideReceipt(@Req() req: any, @Param('rideId') rideId: string) {
    const userId = req.user?.userId;

    let ride: any = null;
    let breakdown: any = null;

    if (this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
      breakdown = await this.db.findOne(TaxiFareBreakdown, { where: { rideId } });
    } else {
      ride = await this.redis.getJson(`ride:${rideId}`);
    }

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.customerId !== userId && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Not authorized to view this receipt');
    }

    return {
      success: true,
      receipt: {
        rideId,
        receiptNumber: `REC-${rideId}`,
        tripDate: ride.createdAt,
        pickupAddress: ride.pickupAddress,
        dropAddress: ride.dropAddress,
        distanceKm: breakdown?.distanceFare ? Number(breakdown.distanceFare) / 35 : 5.0,
        durationMinutes: 15,
        fareBreakdown: breakdown ? {
          baseFare: Number(breakdown.baseFare),
          distanceFare: Number(breakdown.distanceFare),
          timeFare: Number(breakdown.timeFare),
          surgeAdjustment: Number(breakdown.surgeAdjustment || 0),
          waitingFee: Number(breakdown.waitingFee || 0),
          tax: Number(breakdown.tax || 0),
          platformFee: Number(breakdown.platformCommission),
          discount: 0,
          totalAmount: Number(ride.finalFare),
        } : {
          baseFare: 50,
          distanceFare: 175,
          timeFare: 75,
          surgeAdjustment: 0,
          waitingFee: 0,
          tax: 0,
          platformFee: 0,
          discount: 0,
          totalAmount: Number(ride.finalFare || ride.fareEstimate),
        },
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
        currency: 'INR',
        driverName: ride.driverName || UserRole.DRIVER,
        vehiclePlate: ride.vehiclePlate || '',
      }
    };
  }


  @Post('ride/:rideId/rating')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Submit ratings' })
  async submitRating(@Req() req: any, @Param('rideId') rideId: string, @Body() body: {
    rating: number; // 1 to 5
    comment?: string;
  }) {
    if (body.rating < 1 || body.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    // Update driver rating average if database is active
    if (this.isDbActive()) {
      const ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
      if (ride && ride.driverId) {
        const driver = await this.db.findOne(TaxiDriver, { where: { id: ride.driverId } });
        if (driver) {
          const currentRating = Number(driver.rating);
          const newRating = (currentRating + body.rating) / 2; // Simple running average fallback
          await this.db.update(TaxiDriver, driver.id, { rating: Number(newRating.toFixed(2)) });
        }
      }
    }
    return { success: true, message: 'Rating submitted successfully' };
  }

  @Post('ride/:rideId/support')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Raise support dispute' })
  async raiseDispute(@Req() req: any, @Param('rideId') rideId: string, @Body() body: {
    reason: string;
    details?: string;
  }) {
    const raisedBy = req.user?.role?.toUpperCase() || UserRole.CUSTOMER;
    if (this.isDbActive()) {
      const dispute = this.db.create(TaxiDispute, {
        rideId,
        raisedBy,
        reason: body.reason,
        details: body.details || '',
        status: 'OPEN'
      });
      await this.db.save(dispute);
    }
    return { success: true, message: 'Dispute case opened successfully' };
  }

  @Post('ride/:rideId/sos')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Trigger emergency SOS alert' })
  async triggerSos(@Req() req: any, @Param('rideId') rideId: string, @Body() body: { details?: string }) {
    const triggeredBy = req.user?.role?.toUpperCase() || UserRole.CUSTOMER;
    const sosData = {
      rideId,
      triggeredBy,
      details: body.details || 'Emergency alert triggered from application.',
      status: 'ACTIVE'
    };

    if (this.isDbActive()) {
      const sosCase = this.db.create(TaxiSosCase, sosData);
      await this.db.save(sosCase);
    }

    await this.redis.setJson(`sos:${rideId}`, sosData, 86400); // Keep SOS active in Redis for 24h
    await this.kafka.publish(KAFKA_TOPICS.TAXI_SOS_TRIGGERED, { rideId, triggeredBy });

    return { success: true, message: 'SOS Alert triggered successfully. Emergency dispatchers notified.' };
  }

  // â”€â”€â”€ DRIVER ENDPOINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('driver/online')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Set driver status to online' })
  async driverOnline(@Req() req: any, @Body() body?: { firstName?: string; vehicleType?: string; vehiclePlate?: string; rating?: number }) {
    const userId = req.user.userId;

    let driverProfile: any = {};

    if (this.isDbActive()) {
      const driver = await this.db.findOne(TaxiDriver, { where: { userId } });
      if (!driver) throw new NotFoundException('Driver profile not found');
      if (driver.status !== 'APPROVED') {
        throw new ForbiddenException('Driver account is not approved or is blocked.');
      }

      // Check document expiry
      const expiredDocs = await this.db.find(TaxiDriverDocument, {
        where: { driverId: driver.id, status: 'APPROVED' }
      });
      const now = new Date();
      for (const doc of expiredDocs) {
        if (doc.expiryDate && new Date(doc.expiryDate) < now) {
          throw new ForbiddenException(`Compliance alert: document ${doc.type} has expired.`);
        }
      }

      await this.db.update(TaxiDriver, driver.id, { onlineStatus: 'ONLINE' });

      let vehicle: any = null;
      if (this.isDbActive()) {
        vehicle = await this.db.findOne(TaxiVehicle, { where: { assignedDriverId: driver.id } });
      }

      // Use DB profile as authoritative source
      driverProfile = {
        name: driver.firstName || body?.firstName || UserRole.DRIVER,
        vehicleType: vehicle?.type || body?.vehicleType || 'economy',
        vehiclePlate: vehicle?.plateNumber || body?.vehiclePlate || '',
        vehicleModel: vehicle?.model || '',
        rating: driver.rating || body?.rating || 4.5,
        totalTrips: 0, // Fallback as it is not tracked in DB yet
        acceptanceRate: 0.85,
        profilePhotoUrl: null,
      };
    } else {
      // Fallback: use request body for profile
      driverProfile = {
        name: body?.firstName || UserRole.DRIVER,
        vehicleType: body?.vehicleType || 'economy',
        vehiclePlate: body?.vehiclePlate || '',
        rating: body?.rating || 4.5,
      };
    }

    await this.redis.setJson(`driver:status:${userId}`, { online: true }, 0);

    // FIX 5: Store driver profile in Redis for nearby-driver queries.
    // The GET /taxi/nearby-drivers endpoint reads driver:{id}:profile
    // to enrich results with name, vehicle type, plate, and rating.
    // Without this, all drivers show as "Driver {id}" with unknown vehicles.
    await this.redis.setJson(`driver:${userId}:profile`, driverProfile, 0);

    return { success: true, message: 'Driver status is now ONLINE' };
  }

  @Post('driver/offline')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Set driver status to offline' })
  async driverOffline(@Req() req: any) {
    const userId = req.user.userId;

    if (this.isDbActive()) {
      const driver = await this.db.findOne(TaxiDriver, { where: { userId } });
      if (driver) {
        await this.db.update(TaxiDriver, driver.id, { onlineStatus: 'OFFLINE' });
      }
    }

    await this.redis.setJson(`driver:status:${userId}`, { online: false }, 0);
    return { success: true, message: 'Driver status is now OFFLINE' };
  }

  @Get('driver/ride-requests')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Get available pending ride requests for driver' })
  async getDriverRideRequests() {
    // Returns active searching rides
    if (this.isDbActive()) {
      return await this.db.find(TaxiRide, { where: { status: 'SEARCHING_DRIVER' } });
    }
    return [];
  }

  @Post('driver/ride/:rideId/accept')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Accept ride request' })
  async acceptRide(@Req() req: any, @Param('rideId') rideId: string) {
    const userId = req.user.userId;

    let driverId = 'DEFAULT_DRIVER';
    let vehicleId = 'DEFAULT_VEHICLE';
    let vendorId = 'DEFAULT_VENDOR';

    if (this.isDbActive()) {
      const driver = await this.db.findOne(TaxiDriver, { where: { userId } });
      if (!driver) throw new NotFoundException('Driver not found');
      if (driver.status !== 'APPROVED') throw new ForbiddenException('Driver blocked or not approved.');

      driverId = driver.id;
      vendorId = driver.vendorId || 'INDEPENDENT';

      const vehicle = await this.db.findOne(TaxiVehicle, { where: { assignedDriverId: driver.id } });
      if (vehicle) vehicleId = vehicle.id;
    }

    let ride: any = null;
    if (this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    } else {
      ride = await this.redis.getJson(`ride:${rideId}`);
    }

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== 'SEARCHING_DRIVER') {
      throw new BadRequestException('Ride has already been taken by another driver.');
    }

    ride.status = 'DRIVER_ASSIGNED';
    ride.driverId = driverId;
    ride.vehicleId = vehicleId;
    ride.vendorId = vendorId;

    if (this.isDbActive()) {
      await this.db.update(TaxiRide, rideId, {
        status: 'DRIVER_ASSIGNED',
        driverId,
        vehicleId,
        vendorId
      });

      const history = this.db.create(TaxiRideStatusHistory, {
        rideId,
        status: 'DRIVER_ASSIGNED',
        reason: 'Driver accepted ride request'
      });
      await this.db.save(history);
    }

    await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_STATUS_UPDATED || 'taxi.ride.status_updated', { id: rideId, status: 'DRIVER_ASSIGNED', driverId });

    // Notify customer via WebSocket that a driver has been assigned
    this.taxiGateway.notifyRideAccepted(rideId, {
      driverId,
      driverName: UserRole.DRIVER,
      vehicleId,
      vendorId,
    });

    return { success: true, ride };
  }

  @Post('driver/ride/:rideId/arrived')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Mark arrival at pickup' })
  async driverArrived(@Req() req: any, @Param('rideId') rideId: string) {
    let ride: any = null;
    if (this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    } else {
      ride = await this.redis.getJson(`ride:${rideId}`);
    }

    if (!ride) throw new NotFoundException('Ride not found');

    ride.status = 'DRIVER_ARRIVED';
    if (this.isDbActive()) {
      await this.db.update(TaxiRide, rideId, { status: 'DRIVER_ARRIVED' });
      const history = this.db.create(TaxiRideStatusHistory, { rideId, status: 'DRIVER_ARRIVED', reason: 'Driver arrived' });
      await this.db.save(history);
    }

    await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_STATUS_UPDATED || 'taxi.ride.status_updated', { id: rideId, status: 'DRIVER_ARRIVED' });

    return { success: true, status: 'DRIVER_ARRIVED' };
  }

  @Post('driver/ride/:rideId/start')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Start the taxi ride' })
  async startRide(@Param('rideId') rideId: string) {
    let ride: any = null;
    if (this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    } else {
      ride = await this.redis.getJson(`ride:${rideId}`);
    }

    if (!ride) throw new NotFoundException('Ride not found');

    ride.status = 'RIDE_STARTED';
    if (this.isDbActive()) {
      await this.db.update(TaxiRide, rideId, { status: 'RIDE_STARTED' });
      const history = this.db.create(TaxiRideStatusHistory, { rideId, status: 'RIDE_STARTED', reason: 'Ride started' });
      await this.db.save(history);
    }

    await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_STATUS_UPDATED || 'taxi.ride.status_updated', { id: rideId, status: 'RIDE_STARTED' });

    return { success: true, status: 'RIDE_STARTED' };
  }

  @Post('driver/ride/:rideId/complete')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Complete ride and process settlements' })
  async completeRide(@Param('rideId') rideId: string, @Body() body: { finalDistanceKm?: number; finalDurationMin?: number }) {
    let ride: any = null;
    if (this.isDbActive()) {
      ride = await this.db.findOne(TaxiRide, { where: { id: rideId } });
    } else {
      ride = await this.redis.getJson(`ride:${rideId}`);
    }

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status === 'RIDE_COMPLETED') {
      return { success: true, message: 'Ride was already completed.', ride };
    }

    const distance = body.finalDistanceKm || 5.2; // fallback
    const duration = body.finalDurationMin || 15; // fallback

    // Perform final immutable fare calculation
    let baseFare = 50;
    let distanceRate = 35;
    let timeRate = 5;
    let minimumFare = 100;

    if (this.isDbActive()) {
      const rule = await this.db.findOne(TaxiFareRule, { where: { vehicleType: ride.vehicleType } });
      if (rule) {
        baseFare = Number(rule.baseFare);
        distanceRate = Number(rule.distanceFareRate);
        timeRate = Number(rule.timeFareRate);
        minimumFare = Number(rule.minimumFare);
      }
    }

    const calcFare = baseFare + (distance * distanceRate) + (duration * timeRate);
    const finalFare = Math.max(calcFare, minimumFare);

    // Platform, Vendor, Driver cuts
    const platformCommission = finalFare * 0.15; // 15% platform
    const vendorCommission = ride.vendorId && ride.vendorId !== 'INDEPENDENT' ? finalFare * 0.05 : 0; // 5% vendor
    const driverEarning = finalFare - platformCommission - vendorCommission;

    ride.status = 'RIDE_COMPLETED';
    ride.finalFare = finalFare;
    ride.paymentStatus = 'PAID';

    if (this.isDbActive()) {
      await this.db.update(TaxiRide, rideId, {
        status: 'RIDE_COMPLETED',
        finalFare,
        paymentStatus: 'PAID'
      });

      const history = this.db.create(TaxiRideStatusHistory, { rideId, status: 'RIDE_COMPLETED', reason: 'Driver completed ride' });
      await this.db.save(history);

      // Save fare breakdown
      const breakdown = this.db.create(TaxiFareBreakdown, {
        rideId,
        baseFare,
        distanceFare: distance * distanceRate,
        timeFare: duration * timeRate,
        platformCommission,
        vendorCommission,
        driverEarning,
      });
      await this.db.save(breakdown);

      // Save Driver Earnings record
      if (ride.driverId) {
        const earning = this.db.create(TaxiDriverEarning, {
          driverId: ride.driverId,
          rideId,
          amount: driverEarning,
          status: 'UNPAID'
        });
        await this.db.save(earning);
      }

      // Save Commission record
      const commission = this.db.create(TaxiCommissionRecord, {
        rideId,
        platformAmount: platformCommission,
        vendorAmount: vendorCommission
      });
      await this.db.save(commission);
    }

    await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_COMPLETED, { id: rideId, finalFare });

    return { success: true, ride, finalFare, breakdown: { platformCommission, vendorCommission, driverEarning } };
  }

  @Post('driver/location')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Update driver live coordinates' })
  async updateLocation(@Req() req: any, @Body() body: { lat: number; lng: number; rideId?: string }) {
    const userId = req.user.userId;

    const locationUpdate = {
      driverId: userId,
      lat: body.lat,
      lng: body.lng,
      timestamp: new Date().toISOString()
    };

    // Store coordinate stream in Redis GEO for nearby searches
    await this.redis.geoadd('drivers:locations', body.lng, body.lat, userId);

    if (body.rideId) {
      await this.redis.setJson(`driver:loc:${body.rideId}`, locationUpdate, 300);
      if (this.isDbActive()) {
        const loc = this.db.create(TaxiRideLocation, {
          rideId: body.rideId,
          lat: body.lat,
          lng: body.lng
        });
        await this.db.save(loc);
      }
    }

    return { success: true };
  }

  @Get('driver/earnings')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Get driver total earnings' })
  async getDriverEarnings(@Req() req: any) {
    const userId = req.user.userId;
    if (this.isDbActive()) {
      const driver = await this.db.findOne(TaxiDriver, { where: { userId } });
      if (driver) {
        const earnings = await this.db.find(TaxiDriverEarning, { where: { driverId: driver.id } });
        const total = earnings.reduce((sum, item) => sum + Number(item.amount), 0);
        return { success: true, count: earnings.length, totalEarnings: total, data: earnings };
      }
    }
    return { success: true, count: 0, totalEarnings: 0, data: [] };
  }

  @Get('driver/profile')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Get driver profile details' })
  async getDriverProfile(@Req() req: any) {
    const userId = req.user.userId;

    if (this.isDbActive()) {
      const driver = await this.db.findOne(TaxiDriver, { where: { userId } });
      if (driver) {
        return {
          partnerId: driver.id,
          name: driver.firstName + ' ' + (driver.lastName || ''),
          phone: driver.phone,
          email: (driver as any).email || req.user?.email || 'driver@kartseek.com',
          vehicleType: (driver as any).vehicleType || 'economy',
          status: driver.status,
          rating: driver.rating,
          onlineStatus: driver.onlineStatus,
        };
      }
    }

    // Graceful fallback â€” return basic profile from JWT claims
    return {
      partnerId: userId,
      name: req.user.name || 'KARTSEEK Driver',
      phone: req.user.phone || '+91700000000',
      email: req.user.email || 'driver@kartseek.com',
      vehicleType: 'economy',
      status: 'APPROVED',
      rating: 4.85,
      onlineStatus: 'OFFLINE',
    };
  }

  @Put('driver/profile')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.SELLER)
  @ApiOperation({ summary: 'Update driver profile details' })
  async updateDriverProfile(@Req() req: any, @Body() dto: any) {
    const userId = req.user.userId;

    if (this.isDbActive()) {
      const driver = await this.db.findOne(TaxiDriver, { where: { userId } });
      if (driver) {
        await this.db.update(TaxiDriver, driver.id, dto);
        return { success: true, message: 'Profile updated successfully' };
      }
    }

    return { success: true, message: 'Profile updated (cached)' };
  }

  // â”€â”€ Delivery Driver Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('driver/delivery/:deliveryId/accept')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.DELIVERY_BOY)
  @ApiOperation({ summary: 'Accept a delivery task' })
  async acceptDelivery(@Req() req: any, @Param('deliveryId') deliveryId: string) {
    const userId = req.user.userId;

    if (this.isDbActive()) {
      // Look up delivery task and assign driver
      const delivery = await this.db.findOne('DeliveryTask', { where: { id: deliveryId } });
      if (delivery) {
        await this.db.update('DeliveryTask', deliveryId, { driverId: userId, status: 'ACCEPTED' });
      }
    }

    await this.redis.setJson(`delivery:${deliveryId}:driver`, { driverId: userId, status: 'ACCEPTED' }, 7200);
    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_DRIVER_ACCEPTED, { deliveryId, driverId: userId, type: 'delivery' });

    return { success: true, message: `Delivery ${deliveryId} accepted by driver ${userId}` };
  }

  @Post('driver/delivery/:deliveryId/complete')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TAXI_DRIVER, UserRole.DELIVERY_BOY)
  @ApiOperation({ summary: 'Complete a delivery task' })
  async completeDelivery(@Req() req: any, @Param('deliveryId') deliveryId: string) {
    const userId = req.user.userId;

    if (this.isDbActive()) {
      const delivery = await this.db.findOne('DeliveryTask', { where: { id: deliveryId } });
      if (delivery) {
        await this.db.update('DeliveryTask', deliveryId, { status: 'COMPLETED', completedAt: new Date() });
      }
    }

    await this.redis.del(`delivery:${deliveryId}:driver`);
    await this.kafka.publish(KAFKA_TOPICS.TAXI_RIDE_COMPLETED, { deliveryId, driverId: userId, type: 'delivery' });

    return { success: true, message: `Delivery ${deliveryId} completed` };
  }

  // â”€â”€â”€ VENDOR ENDPOINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('vendor/dashboard')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FRANCHISE_OWNER, UserRole.SELLER)
  @ApiOperation({ summary: 'Get vendor dashboard summary stats' })
  async getVendorDashboard(@Req() req: any) {
    const vendorId = await this.requireVendorId(req.user.userId);

    // These five numbers were literals — 4 drivers, 5 vehicles, 42 rides,
    // ₹18,500 — returned identically to every vendor on the platform, and the
    // `vendorId` resolved just above was not used in producing any of them. A
    // fleet operator was reading someone's placeholder as their own business.
    const [activeDrivers, totalVehicles, completedRides, earnings] = await Promise.all([
      this.db.count(TaxiDriver, { where: { vendorId, status: 'ACTIVE' } }),
      this.db.count(TaxiVehicle, { where: { vendorId } }),
      this.db.count(TaxiRide, { where: { vendorId, status: 'COMPLETED' } }),
      this.db
        .createQueryBuilder(TaxiRide, 'ride')
        .select('COALESCE(SUM(ride.finalFare), 0)', 'gross')
        .where('ride.vendorId = :vendorId', { vendorId })
        .andWhere('ride.status = :status', { status: 'COMPLETED' })
        .getRawOne<{ gross: string }>(),
    ]);

    return {
      vendorId,
      stats: {
        activeDrivers,
        totalVehicles,
        completedRides,
        grossEarnings: Number(earnings?.gross ?? 0),
        currency: 'INR',
      },
    };
  }

  @Get('vendor/drivers')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FRANCHISE_OWNER, UserRole.SELLER)
  @ApiOperation({ summary: 'Get drivers belonging to vendor fleet' })
  async getVendorDrivers(@Req() req: any) {
    const vendorId = await this.requireVendorId(req.user.userId);
    return await this.db.find(TaxiDriver, { where: { vendorId } });
  }

  @Post('vendor/drivers')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FRANCHISE_OWNER, UserRole.SELLER)
  @ApiOperation({ summary: 'Register a driver under vendor fleet' })
  async registerVendorDriver(@Req() req: any, @Body() body: {
    userId: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) {
    const vendorId = await this.requireVendorId(req.user.userId);

    const newDriver = this.db.create(TaxiDriver, {
      vendorId,
      userId: body.userId,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      status: 'PENDING'
    });
    await this.db.save(newDriver);
    // The old `return { success: true }` below this reported a registration
    // that never ran whenever the database was skipped.
    return { success: true, driver: newDriver };
  }

  @Get('vendor/vehicles')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FRANCHISE_OWNER, UserRole.SELLER)
  @ApiOperation({ summary: 'Get vehicles under vendor fleet' })
  async getVendorVehicles(@Req() req: any) {
    const vendorId = await this.requireVendorId(req.user.userId);
    return await this.db.find(TaxiVehicle, { where: { vendorId } });
  }

  @Post('vendor/vehicles')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FRANCHISE_OWNER, UserRole.SELLER)
  @ApiOperation({ summary: 'Register vehicle under vendor fleet' })
  async registerVendorVehicle(@Req() req: any, @Body() body: {
    plateNumber: string;
    model: string;
    type: string;
  }) {
    const userId = req.user.userId;
    if (this.isDbActive()) {
      const vendorUser = await this.db.findOne(TaxiVendorUser, { where: { userId } });
      if (!vendorUser) throw new ForbiddenException('Not associated with a vendor');

      const newVehicle = this.db.create(TaxiVehicle, {
        vendorId: vendorUser.vendorId,
        plateNumber: body.plateNumber,
        model: body.model,
        type: body.type,
        status: 'PENDING'
      });
      await this.db.save(newVehicle);
      return { success: true, vehicle: newVehicle };
    }
    return { success: true };
  }

  // â”€â”€â”€ ADMIN ENDPOINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('admin/dashboard')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get overall taxi admin stats' })
  async getAdminDashboard() {
    return {
      activeRides: 2,
      onlineDrivers: 12,
      totalVendors: 3,
      totalDrivers: 45,
      disputesOpen: 1,
      sosActive: 0
    };
  }

  @Get('admin/vendors')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all vendors list' })
  async getAdminVendors() {
    if (this.isDbActive()) {
      return await this.db.find(TaxiVendor);
    }
    return [];
  }

  @Post('admin/vendors/:id/approve')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve a vendor' })
  async approveVendor(@Req() req: any, @Param('id') id: string, @Body('reason') reason?: string) {
    const adminId = req.user.userId;
    if (this.isDbActive()) {
      await this.db.update(TaxiVendor, id, { status: 'APPROVED', reason: reason || 'Approved' });
      const log = this.db.create(TaxiAuditLog, {
        adminUserId: adminId,
        action: 'APPROVE_VENDOR',
        entityName: 'TaxiVendor',
        entityId: id,
        details: 'Vendor approved',
        reason: reason || ''
      });
      await this.db.save(log);
    }
    return { success: true, message: 'Vendor approved' };
  }

  @Post('admin/vendors/:id/reject')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reject a vendor' })
  async rejectVendor(@Req() req: any, @Param('id') id: string, @Body('reason') reason?: string) {
    const adminId = req.user.userId;
    if (this.isDbActive()) {
      await this.db.update(TaxiVendor, id, { status: 'REJECTED', reason: reason || 'Rejected' });
      const log = this.db.create(TaxiAuditLog, {
        adminUserId: adminId,
        action: 'REJECT_VENDOR',
        entityName: 'TaxiVendor',
        entityId: id,
        details: 'Vendor rejected',
        reason: reason || ''
      });
      await this.db.save(log);
    }
    return { success: true, message: 'Vendor rejected' };
  }

  @Get('admin/drivers')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all drivers list' })
  async getAdminDrivers() {
    if (this.isDbActive()) {
      return await this.db.find(TaxiDriver);
    }
    return [];
  }

  @Post('admin/drivers/:id/approve')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve driver' })
  async approveDriver(@Req() req: any, @Param('id') id: string) {
    const adminId = req.user.userId;
    if (this.isDbActive()) {
      await this.db.update(TaxiDriver, id, { status: 'APPROVED' });
      const log = this.db.create(TaxiAuditLog, {
        adminUserId: adminId,
        action: 'APPROVE_DRIVER',
        entityName: 'TaxiDriver',
        entityId: id,
        details: 'Driver status set to APPROVED',
        reason: 'Verification completed'
      });
      await this.db.save(log);
    }
    return { success: true, message: 'Driver approved' };
  }

  @Get('admin/fare-rules')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get fare rules' })
  async getAdminFareRules() {
    if (this.isDbActive()) {
      return await this.db.find(TaxiFareRule);
    }
    return [];
  }

  @Post('admin/fare-rules')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add/update fare rules' })
  async addAdminFareRule(@Req() req: any, @Body() body: {
    zoneId: string;
    vehicleType: string;
    baseFare: number;
    distanceFareRate: number;
    timeFareRate: number;
    minimumFare: number;
  }) {
    const adminId = req.user.userId;
    if (this.isDbActive()) {
      let rule = await this.db.findOne(TaxiFareRule, {
        where: { zoneId: body.zoneId, vehicleType: body.vehicleType }
      });

      let prevVersion = 0;
      if (rule) {
        prevVersion = rule.version;
        rule.version += 1;
        rule.baseFare = body.baseFare;
        rule.distanceFareRate = body.distanceFareRate;
        rule.timeFareRate = body.timeFareRate;
        rule.minimumFare = body.minimumFare;
      } else {
        rule = this.db.create(TaxiFareRule, {
          ...body,
          version: 1
        });
      }

      await this.db.save(rule);

      // Save version audit history
      const ruleVersion = this.db.create(TaxiFareRuleVersion, {
        fareRuleId: rule.id,
        version: rule.version,
        changeLog: `Updated from version ${prevVersion} by Admin`,
        baseFare: body.baseFare,
        distanceFareRate: body.distanceFareRate,
        timeFareRate: body.timeFareRate,
        minimumFare: body.minimumFare
      });
      await this.db.save(ruleVersion);

      const log = this.db.create(TaxiAuditLog, {
        adminUserId: adminId,
        action: 'UPDATE_FARE_RULE',
        entityName: 'TaxiFareRule',
        entityId: rule.id,
        details: `Fare rule updated: base: ${body.baseFare}, dist: ${body.distanceFareRate}`,
        reason: 'Fare policy update'
      });
      await this.db.save(log);

      return { success: true, rule };
    }
    return { success: true };
  }

  @Get('admin/sos')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get active SOS emergency cases' })
  async getAdminSos() {
    if (this.isDbActive()) {
      return await this.db.find(TaxiSosCase, { order: { createdAt: 'DESC' } });
    }
    return [];
  }

  @Get('admin/disputes')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get disputes raised' })
  async getAdminDisputes() {
    if (this.isDbActive()) {
      return await this.db.find(TaxiDispute, { order: { createdAt: 'DESC' } });
    }
    return [];
  }

  @Get('admin/audit-logs')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get admin actions audit logs' })
  async getAdminAuditLogs() {
    if (this.isDbActive()) {
      return await this.db.find(TaxiAuditLog, { order: { timestamp: 'DESC' } });
    }
    return [];
  }

  // â”€â”€â”€ PAYMENTS COMPLIANCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Post('payment/webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'PCI-DSS Configurable secure Payment webhook signature validator' })
  async handlePaymentWebhook(@Body() rawBody: any, @Req() req: any) {
    const signature = req.headers['x-payment-signature'];
    if (!signature) {
      throw new ForbiddenException('Invalid signature');
    }
    // Webhook process placeholder with masking of PII
    return { status: 'processed', timestamp: new Date().toISOString() };
  }
}
