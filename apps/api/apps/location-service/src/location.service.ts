import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@app/redis';
import { Region, State, District, City, Pincode, DeliveryZone, ServiceArea } from './entities';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  constructor(
    private readonly redis: RedisService,
    @InjectRepository(Region) private regionRepo: Repository<Region>,
    @InjectRepository(State) private stateRepo: Repository<State>,
    @InjectRepository(District) private districtRepo: Repository<District>,
    @InjectRepository(City) private cityRepo: Repository<City>,
    @InjectRepository(Pincode) private pincodeRepo: Repository<Pincode>,
    @InjectRepository(DeliveryZone) private deliveryZoneRepo: Repository<DeliveryZone>,
    @InjectRepository(ServiceArea) private serviceAreaRepo: Repository<ServiceArea>,
  ) {}

  async healthCheck() {
    return { service: 'location-service', status: 'ok', dbConnected: true, timestamp: new Date().toISOString() };
  }

  // ── Geographical Hierarchy Methods ────────────────────────────────────────

  async getRegions() {
    return this.regionRepo.find({ where: { active: true } });
  }

  async getStates(regionId: string) {
    return this.stateRepo.find({ where: { region: { id: regionId }, active: true } });
  }

  async getDistricts(stateId: string) {
    return this.districtRepo.find({ where: { state: { id: stateId }, active: true } });
  }

  async getCities(districtId: string) {
    return this.cityRepo.find({ where: { district: { id: districtId } } }); // Note: city doesn't have active field
  }

  async getPincodes(cityId: string) {
    return this.pincodeRepo.find({ where: { city: { id: cityId }, active: true } });
  }

  // ────────────────────────────────────────────────────────────────────────

  /**
   * Resolve exact region context based on GPS point using PostGIS
   */
  async detectLocationContext(lat: number, lng: number) {
    const point = `POINT(${lng} ${lat})`;

    // Find the city that contains this point
    const city = await this.cityRepo.createQueryBuilder('city')
      .leftJoinAndSelect('city.district', 'district')
      .leftJoinAndSelect('district.state', 'state')
      .leftJoinAndSelect('state.region', 'region')
      .where('ST_Intersects(city.boundingBoxPolygon, ST_GeomFromText(:point, 4326))', { point })
      .andWhere('region.active = true')
      .getOne();

    // Find if the point falls inside a specific DeliveryZone
    const deliveryZone = city ? await this.deliveryZoneRepo.createQueryBuilder('dz')
      .where('dz.city_id = :cityId', { cityId: city.id })
      .andWhere('ST_Intersects(dz.polygon, ST_GeomFromText(:point, 4326))', { point })
      .andWhere('dz.active = true')
      .getOne() : null;

    if (!city) {
      // Fallback local resolution if DB is empty or user is outside defined cities
      const fallbackCode = this.fallbackResolveCountry(lat, lng);
      return { 
        success: false, 
        message: 'Location out of operational bounds.', 
        countryCode: fallbackCode, 
        lat, lng 
      };
    }

    return {
      success: true,
      lat,
      lng,
      countryCode: city.district.state.region.countryCode,
      country: city.district.state.region.name,
      currency: city.district.state.region.currency,
      taxRate: city.district.state.region.taxRate,
      city: city.name,
      cityId: city.id,
      deliveryZone: deliveryZone ? {
        id: deliveryZone.id,
        name: deliveryZone.name,
        baseFee: deliveryZone.baseFee,
        feePerKm: deliveryZone.feePerKm
      } : null
    };
  }

  // Redis driver logic remains, but utilizes the detected country Code
  async updateDriverLocation(driverId: string, lat: number, lng: number, heading: number, speed: number, serviceType: 'taxi' | 'delivery' = 'taxi') {
    const context = await this.detectLocationContext(lat, lng);
    const countryCode = context.countryCode;

    const geoKey = this.regionGeoKey(countryCode, serviceType);
    const metaKey = this.regionMetaKey(countryCode, serviceType);

    await this.redis.geoadd(geoKey, lng, lat, driverId);
    await this.redis.hset(metaKey, driverId, JSON.stringify({
      heading, speed, countryCode, updatedAt: new Date().toISOString(),
    }));

    return { success: true, countryCode };
  }

  async getNearbyDrivers(lat: number, lng: number, radiusKm = 5, serviceType: 'taxi' | 'delivery' = 'taxi') {
    const context = await this.detectLocationContext(lat, lng);
    const countryCode = context.countryCode;

    const geoKey = this.regionGeoKey(countryCode, serviceType);
    const metaKey = this.regionMetaKey(countryCode, serviceType);

    const nearby = await this.redis.georadius(geoKey, lng, lat, radiusKm);
    const enriched = await Promise.all(
      nearby.map(async (d) => {
        const raw = await this.redis.hget(metaKey, d.member);
        const meta = raw ? JSON.parse(raw) : {};
        return {
          driverId: d.member,
          lat: d.lat,
          lng: d.lng,
          distKm: d.dist,
          heading: meta.heading ?? 0,
          speed: meta.speed ?? 0,
          countryCode,
        };
      }),
    );

    this.logger.log(`📍 Found ${enriched.length} ${serviceType} partners in ${countryCode} near (${lat}, ${lng})`);
    return { count: enriched.length, countryCode, drivers: enriched };
  }

  async geocode(address: string) {
    return { address, lat: -1.286389, lng: 72.877723, formatted: address, placeId: 'mock_place_id' };
  }

  async reverseGeocode(lat: number, lng: number) {
    const context = await this.detectLocationContext(lat, lng);
    return {
      lat,
      lng,
      address: context.city ? `${context.city}, ${context.country}` : 'Unknown Location',
      city: context.city || 'Unknown',
      country: context.country || 'Unknown',
      countryCode: context.countryCode,
      currency: context.currency,
      taxRate: context.taxRate,
    };
  }

  async getRoute(originLat: number, originLng: number, destLat: number, destLng: number) {
    const R = 6371;
    const dLat = (destLat - originLat) * Math.PI / 180;
    const dLon = (destLng - originLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { distanceKm: Math.round(distKm * 10) / 10, durationMins: Math.round(distKm * 2.5), polyline: 'encoded_polyline_placeholder' };
  }

  private regionGeoKey(countryCode: string, serviceType: string): string { return `region:${countryCode}:${serviceType === 'delivery' ? 'delivery' : 'drivers'}:locations`; }
  private regionMetaKey(countryCode: string, serviceType: string): string { return `region:${countryCode}:${serviceType === 'delivery' ? 'delivery' : 'drivers'}:meta`; }

  private fallbackResolveCountry(lat: number, lng: number): string {
    if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) return 'IN';
    if (lat >= 24.4 && lat <= 26.3 && lng >= 50.7 && lng <= 52.0) return 'QA';
    if (lat >= 22 && lat <= 26.5 && lng >= 51 && lng <= 56.5) return 'AE';
    if (lat >= 16 && lat <= 32 && lng >= 34 && lng <= 56) return 'SA';
    return 'IN';
  }
}
