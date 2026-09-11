import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { RideMatchingService } from './services/ride-matching.service';
import { FareCalculationService } from './services/fare-calculation.service';
import { DriverDispatchService } from './services/driver-dispatch.service';
import { TaxiRideEntity } from './entities/taxi-ride.entity';

/**
 * TaxiService — Orchestrates the full ride lifecycle.
 *
 * Delegates to:
 *  - FareCalculationService for pricing
 *  - RideMatchingService for driver search and dispatch
 *  - DriverDispatchService for location and trip management
 */
@Injectable()
export class TaxiService {
  private readonly logger = new Logger(TaxiService.name);

  constructor(
    @InjectRepository(TaxiRideEntity)
    private readonly rideRepo: Repository<TaxiRideEntity>,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    private readonly matching: RideMatchingService,
    private readonly fare: FareCalculationService,
    private readonly dispatch: DriverDispatchService,
  ) {}

  async healthCheck() {
    const onlineDrivers = await this.dispatch.getOnlineDriverCount();
    const matchStats = this.matching.getActiveSessionStats();
    return {
      service: 'taxi-service',
      status: 'ok',
      onlineDrivers,
      activeMatches: matchStats.activeMatches,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Fare Estimation ──────────────────────────────────────────────────────

  async estimateFare(dto: {
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    vehicleType?: string;
    zoneId?: string;
  }) {
    if (dto.vehicleType) {
      return this.fare.estimateSingleVehicleType({
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropLat: dto.dropLat,
        dropLng: dto.dropLng,
        vehicleType: dto.vehicleType,
        zoneId: dto.zoneId,
      });
    }
    return this.fare.estimateAllVehicleTypes({
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      dropLat: dto.dropLat,
      dropLng: dto.dropLng,
      zoneId: dto.zoneId,
    });
  }

  // ─── Ride Request & Matching ──────────────────────────────────────────────

  async requestRide(dto: {
    customerId: string;
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    vehicleType: string;
    paymentMethod: string;
    pickupAddress?: string;
    dropAddress?: string;
    fareEstimate?: number;
    preferredDriverId?: string;
  }) {
    const rideId = `RIDE-${Date.now()}`;
    const ride = {
      id: rideId,
      customerId: dto.customerId,
      status: 'SEARCHING_DRIVER',
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      dropLat: dto.dropLat,
      dropLng: dto.dropLng,
      pickupAddress: dto.pickupAddress || 'Current Location',
      dropAddress: dto.dropAddress || 'Destination',
      vehicleType: dto.vehicleType,
      paymentMethod: dto.paymentMethod,
      fareEstimate: dto.fareEstimate || 0,
      createdAt: new Date().toISOString(),
    };

    // Store in Redis (real-time access during active trip)
    await this.redis.setJson(`ride:${rideId}`, ride, 3600);

    // Persist to PostgreSQL (durable ride history)
    try {
      const rideEntity = this.rideRepo.create({
        id: rideId,
        customerId: dto.customerId,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropLat: dto.dropLat,
        dropLng: dto.dropLng,
        pickupAddress: dto.pickupAddress || 'Current Location',
        dropAddress: dto.dropAddress || 'Destination',
        vehicleType: dto.vehicleType,
        paymentMethod: dto.paymentMethod,
        fareEstimate: dto.fareEstimate || 0,
        status: 'SEARCHING_DRIVER',
      });
      await this.rideRepo.save(rideEntity);
    } catch (dbErr) {
      this.logger.warn(`⚠️ Failed to persist ride ${rideId} to PostgreSQL: ${dbErr}`);
      // Non-blocking — Redis is the primary store for active rides
    }

    // Publish Kafka event
    await this.kafka.publish('taxi.ride.requested', { id: rideId, customerId: dto.customerId });

    // Generate OTP for pickup verification
    const otp = await this.dispatch.generateRideOtp(rideId);
    this.logger.log(`🔐 OTP for ride ${rideId}: ${otp}`);

    // Start matching process
    await this.matching.startMatching({
      id: rideId,
      customerId: dto.customerId,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      vehicleType: dto.vehicleType,
      preferredDriverId: dto.preferredDriverId,
    });

    return { success: true, ride, otp };
  }

  // ─── Driver Actions ───────────────────────────────────────────────────────

  async driverGoOnline(
    driverId: string,
    profile?: {
      firstName?: string;
      vehicleType?: string;
      vehiclePlate?: string;
      rating?: number;
    },
  ) {
    await this.dispatch.goOnline(driverId, profile);
    return { success: true, message: 'Driver is now ONLINE' };
  }

  async driverGoOffline(driverId: string) {
    await this.dispatch.goOffline(driverId);
    return { success: true, message: 'Driver is now OFFLINE' };
  }

  async driverUpdateLocation(params: {
    driverId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    rideId?: string;
  }) {
    await this.dispatch.updateLocation(params);
    return { success: true };
  }

  async driverAcceptRide(rideId: string, driverId: string) {
    const accepted = await this.matching.handleDriverAccepted(rideId, driverId);
    if (!accepted) {
      return { success: false, message: 'Ride no longer available' };
    }
    await this.kafka.publish('taxi.ride.driver_accepted', { id: rideId, driverId });
    return { success: true, message: 'Ride accepted' };
  }

  async driverRejectRide(rideId: string, driverId: string) {
    await this.matching.handleDriverRejected(rideId, driverId);
    return { success: true, message: 'Ride rejected — sent to next driver' };
  }

  async driverArrived(rideId: string, driverId: string) {
    await this.dispatch.markArrived(rideId, driverId);
    await this.kafka.publish('taxi.ride.driver_arrived', { id: rideId, driverId });
    return { success: true, status: 'DRIVER_ARRIVED' };
  }

  async driverStartRide(rideId: string, driverId: string, otp?: string) {
    await this.dispatch.startRide(rideId, driverId, otp);
    await this.kafka.publish('taxi.ride.started', { id: rideId, driverId });
    return { success: true, status: 'RIDE_STARTED' };
  }

  async driverCompleteRide(
    rideId: string,
    driverId: string,
    params?: {
      finalDistanceKm?: number;
      finalDurationMin?: number;
    },
  ) {
    const result = await this.dispatch.completeRide(rideId, driverId, params);
    await this.kafka.publish('taxi.ride.completed', {
      id: rideId,
      driverId,
      finalDistanceKm: params?.finalDistanceKm,
      finalDurationMin: params?.finalDurationMin,
    });
    return result;
  }

  // ─── Rating ──────────────────────────────────────────────────────────────

  async rateRide(rideId: string, dto: { rating: number; comment?: string; tipAmount?: number }) {
    const ride = await this.redis.getJson<any>(`ride:${rideId}`);
    if (ride) {
      ride.customerRating = dto.rating;
      ride.customerComment = dto.comment;
      ride.tipAmount = dto.tipAmount || 0;
      await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    }
    // Persist to PostgreSQL
    try {
      await this.rideRepo.update(rideId, {
        customerRating: dto.rating,
        customerComment: dto.comment,
        tipAmount: dto.tipAmount || 0,
      } as any);
    } catch (dbErr) {
      this.logger.warn(`⚠️ Failed to persist rating to PostgreSQL: ${dbErr}`);
    }
    await this.kafka.publish('taxi.ride.rated', {
      id: rideId,
      rating: dto.rating,
      tipAmount: dto.tipAmount,
    });
    return { success: true };
  }

  // ─── Shared Queries ───────────────────────────────────────────────────────

  async updateRideStatus(rideId: string, status: string, driverId?: string) {
    const ride = await this.redis.getJson<any>(`ride:${rideId}`);
    if (!ride) return { success: false, reason: 'Ride not found' };
    const updated = {
      ...ride,
      status,
      driverId: driverId ?? ride.driverId,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.setJson(`ride:${rideId}`, updated, 3600);
    await this.kafka.publish('taxi.ride.status_updated', { id: rideId, status, driverId });

    // Sync to PostgreSQL
    try {
      const updateFields: Partial<TaxiRideEntity> = { status };
      if (driverId) {
        updateFields.driverId = driverId;
        if (status === 'DRIVER_ASSIGNED') updateFields.driverAssignedAt = new Date();
      }
      if (status === 'DRIVER_ARRIVED') updateFields.driverArrivedAt = new Date();
      if (status === 'RIDE_STARTED') updateFields.rideStartedAt = new Date();
      await this.rideRepo.update(rideId, updateFields);
    } catch (dbErr) {
      this.logger.warn(`⚠️ Failed to sync ride status to PostgreSQL: ${dbErr}`);
    }

    return { success: true, rideId, status };
  }

  async getNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm = 5,
    vehicleType?: string,
    countryCode?: string,
  ) {
    const drivers = await this.redis.georadius('drivers:locations', lng, lat, radiusKm);

    const enriched = await Promise.all(
      drivers.slice(0, 15).map(async (d) => {
        const metaRaw = await this.redis.hget('drivers:meta', d.member);
        const meta = metaRaw ? JSON.parse(metaRaw) : {};
        const profileRaw = await this.redis.get(`driver:profile:${d.member}`);
        const profile = profileRaw ? JSON.parse(profileRaw) : {};

        return {
          driverId: d.member,
          distanceKm: Math.round(d.dist * 10) / 10,
          lat: d.lat,
          lng: d.lng,
          eta: Math.round(d.dist * 2 + 2),
          heading: meta.heading ?? 0,
          speed: meta.speed ?? 0,
          vehicleType: profile.vehicleType ?? vehicleType ?? 'economy',
          rating: profile.rating ?? 4.5,
          isOnTrip: !!meta.tripId,
          name: profile.firstName ?? `Driver ${d.member.slice(0, 5)}`,
          countryCode: profile.countryCode ?? null,
        };
      }),
    );

    // Filter by vehicle type if specified
    let filtered = vehicleType ? enriched.filter((d) => d.vehicleType === vehicleType) : enriched;

    // A country-scoped admin's fleet map must never plot a driver from
    // another market. A profile with no countryCode — never written, or
    // written before this field existed — is excluded whenever a country is
    // required; there is no default to fall back on.
    if (countryCode) {
      const cc = countryCode.toUpperCase();
      filtered = filtered.filter((d) => d.countryCode?.toUpperCase() === cc);
    }

    return {
      count: filtered.length,
      drivers: filtered.filter((d) => !d.isOnTrip), // Only show available drivers
    };
  }

  async getRideById(rideId: string) {
    return this.redis.getJson(`ride:${rideId}`);
  }

  async getRideHistory(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.rideRepo.findAndCount({
      where: [{ customerId: userId }, { driverId: userId }],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async cancelRide(rideId: string, reason?: string) {
    this.matching.cancelMatching(rideId);
    const ride = await this.redis.getJson<any>(`ride:${rideId}`);
    if (ride) {
      ride.status = 'CANCELLED';
      ride.cancelReason = reason;
      await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    }
    await this.kafka.publish('taxi.ride.cancelled', { id: rideId, reason });

    // Persist cancellation to PostgreSQL
    try {
      await this.rideRepo.update(rideId, {
        status: 'CANCELLED_BY_CUSTOMER',
        cancelReason: reason,
        cancelledAt: new Date(),
      });
    } catch (dbErr) {
      this.logger.warn(`⚠️ Failed to persist cancellation to PostgreSQL: ${dbErr}`);
    }

    return { success: true };
  }

  // ─── Surge & Zone Analytics ───────────────────────────────────────────────

  async getSurgeMultiplier(lat: number, lng: number) {
    return this.matching.getSurgeMultiplier(lat, lng);
  }

  getMatchingStats() {
    return this.matching.getActiveSessionStats();
  }
}
