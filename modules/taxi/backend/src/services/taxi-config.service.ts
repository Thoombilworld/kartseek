import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@app/redis';
import { TaxiCountryConfigEntity } from '../entities/taxi-country-config.entity';
import { TaxiRateCardEntity } from '../entities/taxi-rate-card.entity';

/**
 * TaxiConfigService — Per-country taxi configuration management.
 *
 * Provides a two-tier cache strategy:
 *  1. Redis cache (hot path for fare calculation and ride requests)
 *  2. PostgreSQL persistence (source of truth for admin changes)
 *
 * When an admin updates a config, the Redis cache is invalidated
 * and refreshed on the next read.
 */
@Injectable()
export class TaxiConfigService {
  private readonly logger = new Logger(TaxiConfigService.name);

  /** Default config used when no country-specific config exists. */
  private static readonly DEFAULTS: Partial<TaxiCountryConfigEntity> = {
    currency: 'INR',
    distanceUnit: 'km',
    otpRequired: true,
    scheduledRidesEnabled: true,
    cashEnabled: true,
    tipsEnabled: true,
    maxStops: 3,
    rideShareEnabled: false,
    vendorsEnabled: true,
    enabledPaymentGateways: ['cash', 'card', 'wallet'],
    enabledVehicleTypes: ['economy', 'comfort', 'premium', 'bike'],
    requiredVendorDocuments: ['business_license', 'tax_certificate', 'insurance_certificate'],
    requiredDriverDocuments: ['driving_license', 'vehicle_registration', 'vehicle_insurance', 'identity_proof'],
    platformCommissionRate: 0.15,
    defaultVendorCommissionRate: 0.05,
    taxRate: 0,
    surgeLimits: { minMultiplier: 1.0, maxMultiplier: 3.0, autoEnabled: true },
    peakHourConfig: [
      { start: 7, end: 9, multiplier: 1.15, label: 'Morning Rush' },
      { start: 17, end: 20, multiplier: 1.2, label: 'Evening Rush' },
      { start: 22, end: 5, multiplier: 1.1, label: 'Late Night' },
    ],
    emergencyNumber: '911',
    freeWaitingMinutes: 5,
    autoCancelTimeoutSeconds: 120,
    minimumDriverRating: 3.0,
  };

  /** Default rate cards used when no DB-backed rate cards exist. */
  private static readonly DEFAULT_RATE_CARDS: Record<string, Omit<TaxiRateCardEntity, 'id' | 'countryCode' | 'createdAt' | 'updatedAt'>> = {
    economy:  { vehicleType: 'economy',  displayName: 'Economy',  baseFare: 50,  distanceRate: 35, timeRate: 5,  minimumFare: 100,  waitingRate: 2, nightSurcharge: 0, airportSurcharge: 0, cancellationFee: 50,  maxPassengers: 4, maxLuggage: 2, isAccessible: false, iconName: 'car',     sortOrder: 0, isActive: true },
    comfort:  { vehicleType: 'comfort',  displayName: 'Comfort',  baseFare: 80,  distanceRate: 50, timeRate: 7,  minimumFare: 150,  waitingRate: 3, nightSurcharge: 0, airportSurcharge: 0, cancellationFee: 80,  maxPassengers: 4, maxLuggage: 3, isAccessible: false, iconName: 'car-plus', sortOrder: 1, isActive: true },
    premium:  { vehicleType: 'premium',  displayName: 'Premium',  baseFare: 120, distanceRate: 75, timeRate: 10, minimumFare: 250,  waitingRate: 5, nightSurcharge: 30, airportSurcharge: 50, cancellationFee: 100, maxPassengers: 4, maxLuggage: 3, isAccessible: false, iconName: 'crown',    sortOrder: 2, isActive: true },
    bike:     { vehicleType: 'bike',     displayName: 'Bike',     baseFare: 30,  distanceRate: 18, timeRate: 3,  minimumFare: 50,   waitingRate: 1, nightSurcharge: 0, airportSurcharge: 0, cancellationFee: 20,  maxPassengers: 1, maxLuggage: 0, isAccessible: false, iconName: 'bike',     sortOrder: 3, isActive: true },
    suv:      { vehicleType: 'suv',      displayName: 'SUV',      baseFare: 100, distanceRate: 60, timeRate: 8,  minimumFare: 200,  waitingRate: 4, nightSurcharge: 20, airportSurcharge: 30, cancellationFee: 80,  maxPassengers: 6, maxLuggage: 4, isAccessible: true,  iconName: 'suv',      sortOrder: 4, isActive: true },
    delivery: { vehicleType: 'delivery', displayName: 'Delivery', baseFare: 40,  distanceRate: 25, timeRate: 4,  minimumFare: 80,   waitingRate: 2, nightSurcharge: 0, airportSurcharge: 0, cancellationFee: 30,  maxPassengers: 0, maxLuggage: 5, isAccessible: false, iconName: 'package',  sortOrder: 5, isActive: true },
  };

  constructor(
    @InjectRepository(TaxiCountryConfigEntity)
    private readonly configRepo: Repository<TaxiCountryConfigEntity>,
    @InjectRepository(TaxiRateCardEntity)
    private readonly rateCardRepo: Repository<TaxiRateCardEntity>,
    private readonly redis: RedisService,
  ) {}

  // ─── Country Config ───────────────────────────────────────────────────────

  /**
   * Get configuration for a country. Returns defaults if no config exists.
   */
  async getCountryConfig(countryCode: string): Promise<TaxiCountryConfigEntity> {
    // Check Redis cache first
    const cacheKey = `taxi:config:${countryCode}`;
    const cached = await this.redis.getJson<TaxiCountryConfigEntity>(cacheKey);
    if (cached) return cached;

    // Check DB
    let config = await this.configRepo.findOne({ where: { countryCode } });

    if (!config) {
      // Return defaults without persisting
      config = {
        countryCode,
        ...TaxiConfigService.DEFAULTS,
      } as TaxiCountryConfigEntity;
    }

    // Cache for 1 hour
    await this.redis.setJson(cacheKey, config, 3600);
    return config;
  }

  /**
   * Create or update configuration for a country.
   */
  async upsertCountryConfig(
    countryCode: string,
    dto: Partial<Omit<TaxiCountryConfigEntity, 'countryCode' | 'createdAt' | 'updatedAt'>>,
  ): Promise<TaxiCountryConfigEntity> {
    let config = await this.configRepo.findOne({ where: { countryCode } });

    if (config) {
      Object.assign(config, dto);
    } else {
      config = this.configRepo.create({
        countryCode,
        ...TaxiConfigService.DEFAULTS,
        ...dto,
      });
    }

    const saved = await this.configRepo.save(config);

    // Invalidate cache
    await this.redis.del(`taxi:config:${countryCode}`);

    this.logger.log(`⚙️ Taxi config updated for ${countryCode}`);
    return saved;
  }

  /**
   * Get all configured countries.
   */
  async getAllConfigs(): Promise<TaxiCountryConfigEntity[]> {
    return this.configRepo.find({ order: { countryCode: 'ASC' } });
  }

  // ─── Rate Cards ───────────────────────────────────────────────────────────

  /**
   * Get all rate cards for a country. Falls back to defaults if none exist.
   */
  async getRateCards(countryCode: string): Promise<TaxiRateCardEntity[]> {
    const cacheKey = `taxi:rates:${countryCode}`;
    const cached = await this.redis.getJson<TaxiRateCardEntity[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    let cards = await this.rateCardRepo.find({
      where: { countryCode, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    if (cards.length === 0) {
      // Return defaults
      cards = Object.values(TaxiConfigService.DEFAULT_RATE_CARDS).map(card => ({
        ...card,
        id: `default-${card.vehicleType}`,
        countryCode,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as TaxiRateCardEntity[];
    }

    await this.redis.setJson(cacheKey, cards, 3600);
    return cards;
  }

  /**
   * Get a single rate card for a vehicle type in a country.
   * Used by FareCalculationService for fare estimation.
   */
  async getRateCard(countryCode: string, vehicleType: string): Promise<{
    baseFare: number;
    distanceRate: number;
    timeRate: number;
    minimumFare: number;
    waitingRate: number;
  }> {
    const cacheKey = `fare:rate:${countryCode}:${vehicleType}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const card = await this.rateCardRepo.findOne({
      where: { countryCode, vehicleType, isActive: true },
    });

    const result = card || TaxiConfigService.DEFAULT_RATE_CARDS[vehicleType] || TaxiConfigService.DEFAULT_RATE_CARDS['economy'];

    const rateCard = {
      baseFare: Number(result.baseFare),
      distanceRate: Number(result.distanceRate),
      timeRate: Number(result.timeRate),
      minimumFare: Number(result.minimumFare),
      waitingRate: Number(result.waitingRate),
    };

    await this.redis.setJson(cacheKey, rateCard, 3600);
    return rateCard;
  }

  /**
   * Create or update a rate card for a country + vehicle type.
   */
  async upsertRateCard(
    countryCode: string,
    vehicleType: string,
    dto: Partial<Omit<TaxiRateCardEntity, 'id' | 'countryCode' | 'vehicleType' | 'createdAt' | 'updatedAt'>>,
  ): Promise<TaxiRateCardEntity> {
    let card = await this.rateCardRepo.findOne({
      where: { countryCode, vehicleType },
    });

    if (card) {
      Object.assign(card, dto);
    } else {
      const defaults = TaxiConfigService.DEFAULT_RATE_CARDS[vehicleType] || TaxiConfigService.DEFAULT_RATE_CARDS['economy'];
      card = this.rateCardRepo.create({
        ...defaults,
        ...dto,
        countryCode,
        vehicleType,
      });
    }

    const saved = await this.rateCardRepo.save(card);

    // Invalidate caches
    await this.redis.del(`fare:rate:${countryCode}:${vehicleType}`);
    await this.redis.del(`taxi:rates:${countryCode}`);

    this.logger.log(`💰 Rate card updated: ${countryCode}/${vehicleType}`);
    return saved;
  }

  /**
   * Delete a rate card.
   */
  async deleteRateCard(countryCode: string, vehicleType: string): Promise<void> {
    await this.rateCardRepo.delete({ countryCode, vehicleType });
    await this.redis.del(`fare:rate:${countryCode}:${vehicleType}`);
    await this.redis.del(`taxi:rates:${countryCode}`);
  }

  // ─── Document Requirements ────────────────────────────────────────────────

  /**
   * Get required documents for a country based on owner type.
   */
  async getRequiredDocuments(countryCode: string, ownerType: 'vendor' | 'driver'): Promise<string[]> {
    const config = await this.getCountryConfig(countryCode);
    return ownerType === 'vendor'
      ? config.requiredVendorDocuments
      : config.requiredDriverDocuments;
  }
}
