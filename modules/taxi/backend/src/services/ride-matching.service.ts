import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { getAdjacentZones, getH3Zone } from './h3-zone';

/**
 * RideMatchingService — Core dispatch engine for driver matching.
 *
 * Implements a multi-tier expanding radius search strategy:
 *  1. Search within 1 km radius
 *  2. Expand to 3 km if no drivers found
 *  3. Expand to 5 km if still empty
 *  4. Final expansion to 10 km
 *
 * Drivers are scored using a weighted formula:
 *  - Distance:        40%
 *  - Rating:          25%
 *  - Acceptance Rate: 20%
 *  - ETA:             15%
 *
 * When a driver is selected, the service sends a ride request
 * and waits for acceptance (15-20s timeout). On rejection or
 * timeout, it automatically cascades to the next ranked driver.
 *
 * Uses Redis GEO for sub-millisecond proximity queries and
 * H3 hexagonal indexing for zone-based grouping.
 */
@Injectable()
export class RideMatchingService {
  private readonly logger = new Logger(RideMatchingService.name);

  /** Active matching sessions: rideId → {timer, candidates, currentIndex} */
  private readonly activeSessions = new Map<string, MatchingSession>();

  /** Expanding radii in km */
  private static readonly SEARCH_RADII = [1, 3, 5, 10];

  /** Seconds to wait for driver response before cascading to next */
  private static readonly DRIVER_RESPONSE_TIMEOUT = 18;

  /** Maximum attempts before marking ride as NO_DRIVER_FOUND */
  private static readonly MAX_ATTEMPTS = 10;

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ─── H3 Zone Helpers ──────────────────────────────────────────────────────

  /**
   * Convert lat/lng to an H3-inspired hexagonal zone key.
   * Delegates to the shared derivation in `./h3-zone` so this write side and
   * `FareCalculationService`'s read side can never key the same coordinate
   * differently (audit C leak 3).
   */
  getH3Zone(lat: number, lng: number, resolution = 8): string {
    return getH3Zone(lat, lng, resolution);
  }

  /**
   * Get adjacent H3 zones (self + 6 neighbors) for expanded search.
   */
  getAdjacentZones(lat: number, lng: number, resolution = 8): string[] {
    return getAdjacentZones(lat, lng, resolution);
  }

  // ─── Driver Scoring ───────────────────────────────────────────────────────

  /**
   * Score a driver candidate (0-100, higher is better).
   */
  private scoreDriver(driver: DriverCandidate, maxDist: number): number {
    // Normalize distance: closer = higher score
    const distScore = Math.max(0, 1 - driver.distanceKm / maxDist) * 40;

    // Rating score (out of 5)
    const ratingScore = (driver.rating / 5) * 25;

    // Acceptance rate score
    const acceptScore = driver.acceptanceRate * 20;

    // ETA score: lower ETA = better
    const etaScore = Math.max(0, 1 - driver.etaMinutes / 30) * 15;

    return Math.round(distScore + ratingScore + acceptScore + etaScore);
  }

  // ─── Main Matching Flow ───────────────────────────────────────────────────

  /**
   * Start the matching process for a ride request.
   * Called when a RIDE_REQUESTED event is consumed from Kafka.
   */
  async startMatching(ride: {
    id: string;
    customerId: string;
    pickupLat: number;
    pickupLng: number;
    vehicleType: string;
    preferredDriverId?: string;
  }): Promise<void> {
    this.logger.log(`🔍 Starting match for ride ${ride.id} (vehicle: ${ride.vehicleType})`);

    // Cancel any existing session for this ride
    this.cancelMatching(ride.id);

    // 1. Index pickup zone for surge analytics
    const zone = this.getH3Zone(ride.pickupLat, ride.pickupLng);
    await this.redis.incr(`zone:demand:${zone}`);

    // 2. If customer selected a preferred driver, try them first
    if (ride.preferredDriverId) {
      const preferredAvailable = await this.isDriverAvailable(ride.preferredDriverId);
      if (preferredAvailable) {
        this.logger.log(
          `⭐ Preferred driver ${ride.preferredDriverId} is available — sending request first`,
        );
        const session: MatchingSession = {
          rideId: ride.id,
          candidates: [
            {
              driverId: ride.preferredDriverId,
              distanceKm: 0,
              rating: 5,
              acceptanceRate: 1,
              etaMinutes: 3,
              score: 100,
              vehicleType: ride.vehicleType,
            },
          ],
          currentIndex: 0,
          attempts: 0,
          ride,
          timer: null,
        };
        this.activeSessions.set(ride.id, session);
        await this.sendRequestToDriver(ride.id);
        return;
      }
    }

    // 3. Expanding radius search
    let candidates: DriverCandidate[] = [];
    for (const radius of RideMatchingService.SEARCH_RADII) {
      candidates = await this.findCandidates(
        ride.pickupLat,
        ride.pickupLng,
        radius,
        ride.vehicleType,
      );
      if (candidates.length > 0) {
        this.logger.log(`✅ Found ${candidates.length} candidates within ${radius}km`);
        break;
      }
      this.logger.log(`⚪ No candidates within ${radius}km — expanding…`);
    }

    if (candidates.length === 0) {
      this.logger.warn(`❌ No drivers found for ride ${ride.id} after full radius expansion`);
      await this.updateRideStatus(ride.id, 'NO_DRIVER_FOUND');
      await this.kafka.publish('taxi.ride.no_driver', { id: ride.id, customerId: ride.customerId });
      return;
    }

    // 4. Sort by score (descending)
    const maxDist = Math.max(...candidates.map((c) => c.distanceKm), 1);
    candidates.forEach((c) => (c.score = this.scoreDriver(c, maxDist)));
    candidates.sort((a, b) => b.score - a.score);

    // 5. Create matching session
    const session: MatchingSession = {
      rideId: ride.id,
      candidates,
      currentIndex: 0,
      attempts: 0,
      ride,
      timer: null,
    };
    this.activeSessions.set(ride.id, session);

    // 6. Send request to top-ranked driver
    await this.sendRequestToDriver(ride.id);
  }

  /**
   * Find available driver candidates within a given radius.
   */
  private async findCandidates(
    lat: number,
    lng: number,
    radiusKm: number,
    vehicleType: string,
  ): Promise<DriverCandidate[]> {
    // Query Redis GEO for nearby drivers
    const nearby = await this.redis.georadius('drivers:locations', lng, lat, radiusKm);
    const candidates: DriverCandidate[] = [];

    for (const entry of nearby) {
      const driverId = entry.member;

      // Check driver is online
      const statusRaw = await this.redis.get(`driver:status:${driverId}`);
      const status = statusRaw ? JSON.parse(statusRaw) : null;
      if (!status?.online) continue;

      // Check driver metadata
      const metaRaw = await this.redis.hget('drivers:meta', driverId);
      const meta = metaRaw ? JSON.parse(metaRaw) : {};

      // Skip if driver is on an active trip
      if (meta.tripId) continue;

      // Check vehicle type match (from driver profile in Redis)
      const profileRaw = await this.redis.get(`driver:profile:${driverId}`);
      const profile = profileRaw ? JSON.parse(profileRaw) : {};
      if (profile.vehicleType && profile.vehicleType !== vehicleType) continue;

      const etaMinutes = Math.round(entry.dist * 2 + 2); // Rough: 2 min/km + 2 min buffer

      candidates.push({
        driverId,
        distanceKm: entry.dist,
        rating: profile.rating ?? 4.5,
        acceptanceRate: profile.acceptanceRate ?? 0.85,
        etaMinutes,
        score: 0,
        vehicleType: profile.vehicleType || vehicleType,
      });
    }

    return candidates;
  }

  /**
   * Send the ride request to the current top candidate.
   */
  private async sendRequestToDriver(rideId: string): Promise<void> {
    const session = this.activeSessions.get(rideId);
    if (!session) return;

    if (
      session.currentIndex >= session.candidates.length ||
      session.attempts >= RideMatchingService.MAX_ATTEMPTS
    ) {
      this.logger.warn(`🛑 All candidates exhausted for ride ${rideId}`);
      await this.updateRideStatus(rideId, 'NO_DRIVER_FOUND');
      await this.kafka.publish('taxi.ride.no_driver', {
        id: rideId,
        customerId: session.ride.customerId,
      });
      this.activeSessions.delete(rideId);
      return;
    }

    const candidate = session.candidates[session.currentIndex];
    session.attempts++;

    this.logger.log(
      `📤 Sending ride ${rideId} to driver ${candidate.driverId} ` +
        `(score: ${candidate.score}, dist: ${candidate.distanceKm.toFixed(1)}km, ` +
        `attempt ${session.attempts}/${RideMatchingService.MAX_ATTEMPTS})`,
    );

    // Store pending request in Redis so driver can query it
    await this.redis.setJson(
      `ride:pending:${candidate.driverId}`,
      {
        rideId,
        pickupLat: session.ride.pickupLat,
        pickupLng: session.ride.pickupLng,
        vehicleType: session.ride.vehicleType,
        customerId: session.ride.customerId,
        sentAt: new Date().toISOString(),
      },
      RideMatchingService.DRIVER_RESPONSE_TIMEOUT + 5,
    );

    // Publish event for WebSocket gateway to push to driver
    await this.kafka.publish('taxi.ride.request_sent', {
      id: rideId,
      driverId: candidate.driverId,
      pickupLat: session.ride.pickupLat,
      pickupLng: session.ride.pickupLng,
      vehicleType: session.ride.vehicleType,
    });

    // Set timeout for auto-cascade
    session.timer = setTimeout(async () => {
      this.logger.log(`⏰ Driver ${candidate.driverId} timed out for ride ${rideId}`);
      await this.redis.del(`ride:pending:${candidate.driverId}`);
      await this.kafka.publish('taxi.ride.driver_timeout', {
        id: rideId,
        driverId: candidate.driverId,
      });

      // Move to next candidate
      session.currentIndex++;
      await this.sendRequestToDriver(rideId);
    }, RideMatchingService.DRIVER_RESPONSE_TIMEOUT * 1000);
  }

  // ─── Driver Response Handlers ─────────────────────────────────────────────

  /**
   * Handle driver accepting a ride request.
   */
  async handleDriverAccepted(rideId: string, driverId: string): Promise<boolean> {
    const session = this.activeSessions.get(rideId);
    if (!session) {
      this.logger.warn(`No active session for ride ${rideId}`);
      return false;
    }

    // Clear the timeout timer
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }

    // Clean up
    await this.redis.del(`ride:pending:${driverId}`);
    this.activeSessions.delete(rideId);

    // Update ride status
    await this.updateRideStatus(rideId, 'DRIVER_ASSIGNED', driverId);

    // Mark driver as on-trip
    const meta = await this.redis.hget('drivers:meta', driverId);
    const metaObj = meta ? JSON.parse(meta) : {};
    metaObj.tripId = rideId;
    await this.redis.hset('drivers:meta', driverId, JSON.stringify(metaObj));

    // Publish acceptance event
    await this.kafka.publish('taxi.ride.driver_accepted', {
      id: rideId,
      driverId,
      customerId: session.ride.customerId,
    });

    this.logger.log(`✅ Driver ${driverId} accepted ride ${rideId}`);
    return true;
  }

  /**
   * Handle driver rejecting a ride request.
   */
  async handleDriverRejected(rideId: string, driverId: string): Promise<void> {
    const session = this.activeSessions.get(rideId);
    if (!session) return;

    // Clear the current timeout
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }

    await this.redis.del(`ride:pending:${driverId}`);

    // Track rejection for acceptance rate analytics
    await this.redis.incr(`driver:rejections:${driverId}`);

    await this.kafka.publish('taxi.ride.driver_rejected', {
      id: rideId,
      driverId,
    });

    this.logger.log(`❌ Driver ${driverId} rejected ride ${rideId} — cascading to next`);

    // Move to next candidate
    session.currentIndex++;
    await this.sendRequestToDriver(rideId);
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  /**
   * Check if a specific driver is currently online and available.
   */
  private async isDriverAvailable(driverId: string): Promise<boolean> {
    const statusRaw = await this.redis.get(`driver:status:${driverId}`);
    if (!statusRaw) return false;
    const status = JSON.parse(statusRaw);
    if (!status.online) return false;

    const metaRaw = await this.redis.hget('drivers:meta', driverId);
    const meta = metaRaw ? JSON.parse(metaRaw) : {};
    return !meta.tripId; // available if not on an active trip
  }

  /**
   * Cancel matching for a ride (e.g., customer cancelled).
   */
  cancelMatching(rideId: string): void {
    const session = this.activeSessions.get(rideId);
    if (session) {
      if (session.timer) clearTimeout(session.timer);
      this.activeSessions.delete(rideId);
      this.logger.log(`🚫 Matching cancelled for ride ${rideId}`);
    }
  }

  /**
   * Update ride status in Redis cache.
   */
  private async updateRideStatus(rideId: string, status: string, driverId?: string): Promise<void> {
    const ride = await this.redis.getJson<any>(`ride:${rideId}`);
    if (ride) {
      ride.status = status;
      if (driverId) ride.driverId = driverId;
      ride.updatedAt = new Date().toISOString();
      await this.redis.setJson(`ride:${rideId}`, ride, 3600);
    }
    await this.kafka.publish('taxi.ride.status_updated', { id: rideId, status, driverId });
  }

  /**
   * Get current surge multiplier for a zone based on demand/supply ratio.
   */
  async getSurgeMultiplier(lat: number, lng: number): Promise<number> {
    const zone = this.getH3Zone(lat, lng);
    const demandStr = await this.redis.get(`zone:demand:${zone}`);
    const demand = demandStr ? parseInt(demandStr, 10) : 0;

    // Count available drivers in zone
    const nearby = await this.redis.georadius('drivers:locations', lng, lat, 2);
    const supply = nearby.length || 1;

    const ratio = demand / supply;
    if (ratio > 5) return 2.0; // Heavy surge
    if (ratio > 3) return 1.5; // Moderate surge
    if (ratio > 2) return 1.2; // Light surge
    return 1.0; // No surge
  }

  /**
   * Get matching session stats (for admin monitoring).
   */
  getActiveSessionStats(): {
    activeMatches: number;
    sessions: Array<{ rideId: string; attempts: number; candidateCount: number }>;
  } {
    const sessions = Array.from(this.activeSessions.entries()).map(([rideId, s]) => ({
      rideId,
      attempts: s.attempts,
      candidateCount: s.candidates.length,
    }));
    return { activeMatches: sessions.length, sessions };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverCandidate {
  driverId: string;
  distanceKm: number;
  rating: number;
  acceptanceRate: number;
  etaMinutes: number;
  score: number;
  vehicleType: string;
}

interface MatchingSession {
  rideId: string;
  candidates: DriverCandidate[];
  currentIndex: number;
  attempts: number;
  ride: {
    id: string;
    customerId: string;
    pickupLat: number;
    pickupLng: number;
    vehicleType: string;
  };
  timer: ReturnType<typeof setTimeout> | null;
}
