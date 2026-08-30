import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { TaxiPayoutService } from './taxi-payout.service';
import { TaxiConfigService } from './taxi-config.service';

/**
 * DriverDispatchService — Manages the driver lifecycle during a ride.
 *
 * Handles:
 *  - Driver go online / go offline transitions
 *  - GPS location ingestion → Redis GEO updates
 *  - Ride status lifecycle transitions (ASSIGNED → ARRIVED → STARTED → COMPLETED)
 *  - Waiting time tracking
 *  - Trip completion with final fare calculation
 *  - Driver earnings tracking
 */
@Injectable()
export class DriverDispatchService {
  private readonly logger = new Logger(DriverDispatchService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    private readonly payoutSvc: TaxiPayoutService,
    private readonly configSvc: TaxiConfigService,
  ) {}

  // ─── Online / Offline ─────────────────────────────────────────────────────

  /**
   * Set driver to ONLINE — registers in Redis GEO + status store.
   */
  async goOnline(driverId: string, profile?: {
    firstName?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    rating?: number;
    acceptanceRate?: number;
  }): Promise<void> {
    await this.redis.setJson(`driver:status:${driverId}`, { online: true }, 0);

    // Cache driver profile for quick matching lookups
    if (profile) {
      await this.redis.setJson(`driver:profile:${driverId}`, {
        ...profile,
        onlineSince: new Date().toISOString(),
      }, 0);
    }

    this.logger.log(`🟢 Driver ${driverId} is now ONLINE`);
    await this.kafka.publish('taxi.driver.status_changed', {
      driverId, status: 'ONLINE',
    });
  }

  /**
   * Set driver to OFFLINE — removes from Redis GEO + status store.
   */
  async goOffline(driverId: string): Promise<void> {
    await this.redis.setJson(`driver:status:${driverId}`, { online: false }, 0);
    await this.redis.geodel('drivers:locations', driverId);
    await this.redis.hdel('drivers:meta', driverId);

    this.logger.log(`🔴 Driver ${driverId} is now OFFLINE`);
    await this.kafka.publish('taxi.driver.status_changed', {
      driverId, status: 'OFFLINE',
    });
  }

  // ─── Location Updates ─────────────────────────────────────────────────────

  /**
   * Ingest a GPS location update from the driver.
   * Updates Redis GEO for nearby search + metadata for heading/speed.
   */
  async updateLocation(params: {
    driverId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    rideId?: string;
  }): Promise<void> {
    const { driverId, lat, lng, heading, speed, rideId } = params;

    // Update GEO index
    await this.redis.geoadd('drivers:locations', lng, lat, driverId);

    // Update metadata
    const metaRaw = await this.redis.hget('drivers:meta', driverId);
    const meta = metaRaw ? JSON.parse(metaRaw) : {};
    meta.heading = heading ?? meta.heading ?? 0;
    meta.speed = speed ?? meta.speed ?? 0;
    meta.lastUpdate = new Date().toISOString();
    if (rideId) meta.tripId = rideId;
    await this.redis.hset('drivers:meta', driverId, JSON.stringify(meta));

    // If on an active ride, store location for customer tracking
    if (rideId) {
      await this.redis.setJson(`driver:loc:${rideId}`, {
        driverId, lat, lng, heading, speed,
        timestamp: new Date().toISOString(),
      }, 300); // 5 min TTL

      // Store location trail for trip reconstruction
      await this.redis.rpush(`ride:trail:${rideId}`, JSON.stringify({
        lat, lng, heading, speed, t: Date.now(),
      }));
    }
  }

  // ─── Ride Lifecycle ───────────────────────────────────────────────────────

  /**
   * Driver arrives at pickup location.
   */
  async markArrived(rideId: string, driverId: string): Promise<void> {
    const ride = await this.redis.getJson<any>(`ride:${rideId}`);
    if (!ride) {
      this.logger.warn(`Ride ${rideId} not found in Redis`);
      return;
    }

    ride.status = 'DRIVER_ARRIVED';
    ride.arrivedAt = new Date().toISOString();
    await this.redis.setJson(`ride:${rideId}`, ride, 3600);

    // Start waiting time counter
    await this.redis.set(`ride:waiting:${rideId}`, Date.now().toString());

    await this.kafka.publish('taxi.ride.status_updated', {
      id: rideId, status: 'DRIVER_ARRIVED', driverId,
    });

    this.logger.log(`📍 Driver ${driverId} arrived at pickup for ride ${rideId}`);
  }

  /**
   * Start the ride (after OTP verification).
   */
  async startRide(rideId: string, driverId: string, otp?: string): Promise<void> {
    const ride = await this.redis.getJson<any>(`ride:${rideId}`);
    if (!ride) return;

    // Validate OTP if provided
    if (otp) {
      const storedOtp = await this.redis.get(`ride:otp:${rideId}`);
      if (storedOtp && storedOtp !== otp) {
        this.logger.warn(`Invalid OTP for ride ${rideId}`);
        return;
      }
    }

    // Calculate waiting time
    const waitingStart = await this.redis.get(`ride:waiting:${rideId}`);
    const waitingMinutes = waitingStart
      ? Math.round((Date.now() - parseInt(waitingStart, 10)) / 60000)
      : 0;

    ride.status = 'RIDE_STARTED';
    ride.startedAt = new Date().toISOString();
    ride.waitingMinutes = waitingMinutes;
    await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    await this.redis.del(`ride:waiting:${rideId}`);

    await this.kafka.publish('taxi.ride.status_updated', {
      id: rideId, status: 'RIDE_STARTED', driverId, waitingMinutes,
    });

    this.logger.log(`🚀 Ride ${rideId} started (waited ${waitingMinutes} min)`);
  }

  /**
   * Complete the ride and generate final fare.
   */
  async completeRide(rideId: string, driverId: string, params?: {
    finalDistanceKm?: number;
    finalDurationMin?: number;
  }): Promise<{ finalFare: number; breakdown: any }> {
    const ride = await this.redis.getJson<any>(`ride:${rideId}`);
    if (!ride) return { finalFare: 0, breakdown: null };

    // Calculate actual distance from trail or use provided
    const finalDistanceKm = params?.finalDistanceKm
      ?? await this.calculateTrailDistance(rideId)
      ?? 5.0;
    const finalDurationMin = params?.finalDurationMin ?? 15;

    // Fare calculation
    const rates: Record<string, any> = {
      economy: { baseFare: 50, distanceRate: 35, timeRate: 5, minimumFare: 100 },
      comfort: { baseFare: 80, distanceRate: 50, timeRate: 7, minimumFare: 150 },
      premium: { baseFare: 120, distanceRate: 75, timeRate: 10, minimumFare: 250 },
      bike: { baseFare: 30, distanceRate: 18, timeRate: 3, minimumFare: 50 },
    };
    const rate = rates[ride.vehicleType] || rates['economy'];
    const calcFare = rate.baseFare + (finalDistanceKm * rate.distanceRate) + (finalDurationMin * rate.timeRate);
    const waitingFare = (ride.waitingMinutes || 0) * 2;
    const finalFare = Math.max(Math.round(calcFare + waitingFare), rate.minimumFare);

    // Commission splits — use DB-backed rates from TaxiConfigService
    let platformRate = 0.15;
    let vendorRate = 0.05;
    try {
      const countryCode = ride.countryCode || 'IN';
      const config = await this.configSvc.getCountryConfig(countryCode);
      platformRate = Number(config.platformCommissionRate) || 0.15;
      vendorRate = Number(config.defaultVendorCommissionRate) || 0.05;
    } catch {
      // Use defaults on error
    }
    const platformCommission = Math.round(finalFare * platformRate);
    const vendorCommission = ride.vendorId && ride.vendorId !== 'INDEPENDENT'
      ? Math.round(finalFare * vendorRate) : 0;
    const driverEarning = finalFare - platformCommission - vendorCommission;

    const breakdown = {
      baseFare: rate.baseFare,
      distanceFare: Math.round(finalDistanceKm * rate.distanceRate),
      timeFare: Math.round(finalDurationMin * rate.timeRate),
      waitingFare,
      platformCommission,
      vendorCommission,
      driverEarning,
      finalFare,
    };

    // Update ride
    ride.status = 'RIDE_COMPLETED';
    ride.finalFare = finalFare;
    ride.completedAt = new Date().toISOString();
    ride.breakdown = breakdown;
    await this.redis.setJson(`ride:${rideId}`, ride, 86400); // Keep 24h

    // Release driver from trip
    const metaRaw = await this.redis.hget('drivers:meta', driverId);
    const meta = metaRaw ? JSON.parse(metaRaw) : {};
    delete meta.tripId;
    await this.redis.hset('drivers:meta', driverId, JSON.stringify(meta));

    // Track earnings
    const earningsKey = `driver:earnings:${driverId}:${new Date().toISOString().slice(0, 10)}`;
    await this.redis.incrBy(earningsKey, driverEarning);

    // Clean up trail
    await this.redis.del(`ride:trail:${rideId}`);
    await this.redis.del(`driver:loc:${rideId}`);

    // `breakdown` also carries `finalFare`, and spreading it last meant the
    // computed value on the left was overwritten by whatever the breakdown
    // held — the event published a fare nothing had reconciled against the one
    // logged on the next line. Spread first so the explicit values win.
    await this.kafka.publish('taxi.ride.completed', {
      ...breakdown, id: rideId, driverId, finalFare,
    });

    this.logger.log(`✅ Ride ${rideId} completed — fare: INR ${finalFare}, driver earns: INR ${driverEarning}`);

    // Generate payout records for financial reconciliation
    try {
      await this.payoutSvc.generatePayoutForRide({
        rideId,
        driverId,
        vendorId: ride.vendorId && ride.vendorId !== 'INDEPENDENT' ? ride.vendorId : undefined,
        grossAmount: finalFare,
        countryCode: ride.countryCode || 'IN',
        currency: 'INR',
      });
    } catch (err: any) {
      this.logger.warn(`Failed to generate payouts for ride ${rideId}: ${err.message}`);
    }

    return { finalFare, breakdown };
  }

  // ─── OTP Generation ───────────────────────────────────────────────────────

  /**
   * Generate OTP for ride pickup verification.
   */
  async generateRideOtp(rideId: string): Promise<string> {
    const otp = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit OTP
    await this.redis.set(`ride:otp:${rideId}`, otp, 600); // 10 min TTL
    return otp;
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  /**
   * Calculate total distance from GPS trail stored in Redis.
   */
  private async calculateTrailDistance(rideId: string): Promise<number | null> {
    try {
      const trail = await this.redis.lrange(`ride:trail:${rideId}`, 0, -1);
      if (trail.length < 2) return null;

      let totalDist = 0;
      for (let i = 1; i < trail.length; i++) {
        const prev = JSON.parse(trail[i - 1]);
        const curr = JSON.parse(trail[i]);
        totalDist += this.haversine(prev.lat, prev.lng, curr.lat, curr.lng);
      }
      return Math.round(totalDist * 10) / 10;
    } catch {
      return null;
    }
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Get driver's current coordinates from Redis GEO.
   */
  async getDriverLocation(driverId: string): Promise<{ lat: number; lng: number } | null> {
    const pos = await this.redis.geopos('drivers:locations', driverId);
    if (!pos) return null;
    return { lat: pos[1], lng: pos[0] };
  }

  /**
   * Get online driver count for admin dashboard.
   */
  async getOnlineDriverCount(): Promise<number> {
    const keys = await this.redis.keys('driver:status:*');
    let count = 0;
    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (raw) {
        const status = JSON.parse(raw);
        if (status.online) count++;
      }
    }
    return count;
  }
}
