import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { TaxiConfigService } from './taxi-config.service';
import { getH3Zone } from './h3-zone';

/**
 * FareCalculationService — Dynamic fare engine for the taxi module.
 *
 * Calculates fares based on:
 *  - Distance (Haversine formula)
 *  - Estimated duration
 *  - Vehicle type rate card
 *  - Surge multiplier (from zone demand/supply)
 *  - Waiting time fees
 *  - Time-of-day multipliers (peak hours)
 *  - Minimum fare enforcement
 *
 * Rate cards are fetched from Redis (cached from DB by TaxiController).
 * Falls back to hardcoded defaults if cache is empty.
 */
@Injectable()
export class FareCalculationService {
  private readonly logger = new Logger(FareCalculationService.name);

  /** Default rate cards by vehicle type */
  private static readonly DEFAULT_RATES: Record<string, RateCard> = {
    economy: { baseFare: 50, distanceRate: 35, timeRate: 5, minimumFare: 100, waitingRate: 2 },
    comfort: { baseFare: 80, distanceRate: 50, timeRate: 7, minimumFare: 150, waitingRate: 3 },
    premium: { baseFare: 120, distanceRate: 75, timeRate: 10, minimumFare: 250, waitingRate: 5 },
    bike: { baseFare: 30, distanceRate: 18, timeRate: 3, minimumFare: 50, waitingRate: 1 },
    suv: { baseFare: 100, distanceRate: 60, timeRate: 8, minimumFare: 200, waitingRate: 4 },
    delivery: { baseFare: 40, distanceRate: 25, timeRate: 4, minimumFare: 80, waitingRate: 2 },
  };

  /** Peak hour definitions */
  private static readonly PEAK_HOURS = [
    { start: 7, end: 9, multiplier: 1.15 }, // Morning rush
    { start: 17, end: 20, multiplier: 1.2 }, // Evening rush
    { start: 22, end: 5, multiplier: 1.1 }, // Late night
  ];

  constructor(
    private readonly redis: RedisService,
    private readonly taxiConfig: TaxiConfigService,
  ) {}

  // ─── Core Estimation ──────────────────────────────────────────────────────

  /**
   * Calculate fare estimates for all vehicle types.
   */
  async estimateAllVehicleTypes(params: {
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    zoneId?: string;
  }): Promise<FareEstimate[]> {
    const distKm = this.haversineDistance(
      params.pickupLat,
      params.pickupLng,
      params.dropLat,
      params.dropLng,
    );
    const durationMin = this.estimateDuration(distKm);
    const surgeMultiplier = await this.getSurgeForZone(params.pickupLat, params.pickupLng);
    const peakMultiplier = this.getPeakMultiplier();

    const vehicleTypes = Object.keys(FareCalculationService.DEFAULT_RATES);
    const estimates: FareEstimate[] = [];

    for (const type of vehicleTypes) {
      const rate = await this.getRateCard(type, params.zoneId);
      const estimate = this.calculateFare(
        distKm,
        durationMin,
        rate,
        surgeMultiplier,
        peakMultiplier,
      );

      estimates.push({
        vehicleType: type,
        distanceKm: Math.round(distKm * 10) / 10,
        durationMinutes: Math.round(durationMin),
        baseFare: rate.baseFare,
        distanceFare: Math.round(distKm * rate.distanceRate),
        timeFare: Math.round(durationMin * rate.timeRate),
        surgeMultiplier,
        peakMultiplier,
        estimatedFare: estimate.fare,
        estimatedFareRange: `INR ${estimate.fare - 20} – INR ${estimate.fare + 20}`,
        etaMinutes: Math.round(durationMin + 3), // Add 3 min for pickup
        currency: 'INR',
        zoneId: params.zoneId || 'DEFAULT_ZONE',
      });
    }

    return estimates;
  }

  /**
   * Calculate fare for a single vehicle type.
   */
  async estimateSingleVehicleType(params: {
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    vehicleType: string;
    zoneId?: string;
  }): Promise<FareEstimate> {
    const distKm = this.haversineDistance(
      params.pickupLat,
      params.pickupLng,
      params.dropLat,
      params.dropLng,
    );
    const durationMin = this.estimateDuration(distKm);
    const surgeMultiplier = await this.getSurgeForZone(params.pickupLat, params.pickupLng);
    const peakMultiplier = this.getPeakMultiplier();
    const rate = await this.getRateCard(params.vehicleType, params.zoneId);
    const estimate = this.calculateFare(distKm, durationMin, rate, surgeMultiplier, peakMultiplier);

    return {
      vehicleType: params.vehicleType,
      distanceKm: Math.round(distKm * 10) / 10,
      durationMinutes: Math.round(durationMin),
      baseFare: rate.baseFare,
      distanceFare: Math.round(distKm * rate.distanceRate),
      timeFare: Math.round(durationMin * rate.timeRate),
      surgeMultiplier,
      peakMultiplier,
      estimatedFare: estimate.fare,
      estimatedFareRange: `INR ${estimate.fare - 20} – INR ${estimate.fare + 20}`,
      etaMinutes: Math.round(durationMin + 3),
      currency: 'INR',
      zoneId: params.zoneId || 'DEFAULT_ZONE',
    };
  }

  /**
   * Calculate final fare after trip completion (immutable receipt).
   */
  calculateFinalFare(params: {
    distanceKm: number;
    durationMin: number;
    waitingMin: number;
    vehicleType: string;
    surgeMultiplier: number;
    rate: RateCard;
  }): FareBreakdown {
    const { distanceKm, durationMin, waitingMin, vehicleType, surgeMultiplier, rate } = params;

    const distanceFare = distanceKm * rate.distanceRate;
    const timeFare = durationMin * rate.timeRate;
    const waitingFare = waitingMin * rate.waitingRate;
    const subtotal = rate.baseFare + distanceFare + timeFare + waitingFare;
    const withSurge = subtotal * surgeMultiplier;
    const fare = Math.max(Math.round(withSurge), rate.minimumFare);

    // Commission splits
    const platformCommission = fare * 0.15; // 15% platform
    const vendorCommission = fare * 0.05; // 5% vendor (if applicable)
    const driverEarning = fare - platformCommission - vendorCommission;

    return {
      baseFare: rate.baseFare,
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      waitingFare: Math.round(waitingFare),
      surgeMultiplier,
      subtotal: Math.round(subtotal),
      finalFare: fare,
      platformCommission: Math.round(platformCommission),
      vendorCommission: Math.round(vendorCommission),
      driverEarning: Math.round(driverEarning),
      currency: 'INR',
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private calculateFare(
    distKm: number,
    durationMin: number,
    rate: RateCard,
    surgeMult: number,
    peakMult: number,
  ): { fare: number } {
    const subtotal = rate.baseFare + distKm * rate.distanceRate + durationMin * rate.timeRate;
    const withSurge = subtotal * surgeMult * peakMult;
    return { fare: Math.max(Math.round(withSurge), rate.minimumFare) };
  }

  /**
   * Get rate card from Redis cache or use defaults.
   *
   * TODO(TAXI-plan, AUD2-018): same root cause as leak 3 —
   * `zoneId?.split('-')[0] || 'IN'` prices every market off India's card.
   * Fix belongs to the TAXI workstream: derive the country from
   * `pickupLat`/`pickupLng` via `getH3Zone` (./h3-zone) plus `RegionService`,
   * and delete the `zoneId` parameter.
   */
  private async getRateCard(vehicleType: string, zoneId?: string): Promise<RateCard> {
    // Try DB-backed rate card via TaxiConfigService (country code from zoneId prefix)
    try {
      const countryCode = zoneId?.split('-')[0] || 'IN';
      const dbCard = await this.taxiConfig.getRateCard(countryCode, vehicleType);
      if (dbCard) return dbCard;
    } catch {
      // Fall through to legacy cache/defaults
    }

    // Legacy: check Redis cache
    const key = `fare:rate:${zoneId || 'DEFAULT_ZONE'}:${vehicleType}`;
    const cached = await this.redis.getJson<RateCard>(key);
    if (cached) return cached;

    return (
      FareCalculationService.DEFAULT_RATES[vehicleType] ||
      FareCalculationService.DEFAULT_RATES['economy']
    );
  }

  /**
   * The surge multiplier where the rider is standing.
   *
   * `zoneId` is gone. It was client-optional, defaulted to the literal
   * `'DEFAULT_ZONE'`, and no caller in the repository ever supplied one — so
   * this read a single global demand counter while `ride-matching.service.ts`
   * dutifully incremented per-cell counters that nothing consulted (audit C
   * leak 3). The cell now comes from the pickup coordinates, which is the same
   * derivation the write side uses.
   */
  private async getSurgeForZone(lat: number, lng: number): Promise<number> {
    const cell = getH3Zone(lat, lng);
    const explicit = await this.redis.get(`surge:${cell}`);
    if (explicit) return parseFloat(explicit);

    const nearby = await this.redis.georadius('drivers:locations', lng, lat, 3);
    const demand = await this.redis.get(`zone:demand:${cell}`);
    const demandCount = demand ? parseInt(demand, 10) : 0;
    const supply = nearby.length || 1;
    const ratio = demandCount / supply;
    if (ratio > 5) return 2.0;
    if (ratio > 3) return 1.5;
    if (ratio > 2) return 1.2;
    return 1.0;
  }

  /**
   * Get time-of-day peak multiplier.
   */
  private getPeakMultiplier(countryCode?: string): number {
    const hour = new Date().getHours();

    // Use hardcoded defaults (DB-backed peak hours are loaded at config level
    // and applied during estimation; this provides a synchronous fallback)
    for (const peak of FareCalculationService.PEAK_HOURS) {
      if (peak.start < peak.end) {
        if (hour >= peak.start && hour < peak.end) return peak.multiplier;
      } else {
        // Wraps midnight (e.g., 22-5)
        if (hour >= peak.start || hour < peak.end) return peak.multiplier;
      }
    }
    return 1.0;
  }

  /**
   * Haversine distance between two coordinate pairs (in km).
   */
  haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Estimate trip duration from distance (minutes).
   * Uses average urban speed of ~25 km/h + traffic buffer.
   */
  private estimateDuration(distKm: number): number {
    const avgSpeedKmH = 25;
    return (distKm / avgSpeedKmH) * 60 + 5; // 5 min traffic buffer
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateCard {
  baseFare: number;
  distanceRate: number; // per km
  timeRate: number; // per minute
  minimumFare: number;
  waitingRate: number; // per minute waiting
}

export interface FareEstimate {
  vehicleType: string;
  distanceKm: number;
  durationMinutes: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  peakMultiplier: number;
  estimatedFare: number;
  estimatedFareRange: string;
  etaMinutes: number;
  currency: string;
  zoneId: string;
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  waitingFare: number;
  surgeMultiplier: number;
  subtotal: number;
  finalFare: number;
  platformCommission: number;
  vendorCommission: number;
  driverEarning: number;
  currency: string;
}
