import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import * as geoip from 'geoip-lite';
import {
  SupportedCountryCode,
  RegionConfig,
  RegionDetectionResult,
  RegionStats
} from './region.types';
import {
  REGION_CONFIGS,
  DEFAULT_REGION,
  getRegionConfig,
  isActiveRegion,
  getActiveRegions
} from './region.config';

/**
 * KARTSEEK Region Service
 *
 * Central authority for multi-regional data segmentation. Provides:
 * - IP-based country detection (reverse geolocation)
 * - GPS coordinate → country resolution
 * - Region-scoped Redis key prefixing
 * - Regional stats aggregation for admin dashboard
 */
@Injectable()
export class RegionService {
  private readonly logger = new Logger(RegionService.name);

  constructor(private readonly redis: RedisService) {}

  // ── Region Resolution ─────────────────────────────────────────────────────

  /**
   * Detect region from GPS coordinates using reverse geocoding.
   * Falls back to IP-based detection, then to the default region.
   */
  async detectRegionFromCoords(lat: number, lng: number): Promise<RegionDetectionResult> {
    // Simple bounding-box check for each supported country
    const detected = this.resolveCountryFromCoords(lat, lng);

    // `isActiveRegion`, not `isSupportedRegion` — detection decides which
    // market a shopper transacts in, and the registry describes countries the
    // platform does not trade in. Standing in one of them falls back to the
    // home market rather than opening a storefront that cannot fulfil.
    if (detected && isActiveRegion(detected)) {
      const region = REGION_CONFIGS[detected];
      this.logger.log(`🌍 GPS → ${region.flag} ${region.name} (${lat}, ${lng})`);
      return {
        countryCode: detected,
        detectedVia: 'gps',
        confidence: 0.95,
        region,
        coords: { lat, lng }
      };
    }

    // Fallback to default
    const fallback = REGION_CONFIGS[DEFAULT_REGION];
    this.logger.warn(`🌍 GPS detection failed for (${lat}, ${lng}) — falling back to ${fallback.name}`);
    return {
      countryCode: DEFAULT_REGION,
      detectedVia: 'default',
      confidence: 0.1,
      region: fallback
    };
  }

  /**
   * Detect region from client IP address.
   * Uses a lightweight IP-to-country lookup (expandable to MaxMind GeoIP2).
   */
  async detectRegionFromIp(ipAddress: string): Promise<RegionDetectionResult> {
    // Check cache first
    const cached = await this.redis.getJson<{ code: SupportedCountryCode }>(`region:ip:${ipAddress}`);
    // A cache entry written before a market closed must not keep scoping
    // requests into it, so the cached code is re-checked, not just parsed.
    if (cached && isActiveRegion(cached.code)) {
      const region = REGION_CONFIGS[cached.code];
      return { countryCode: cached.code, detectedVia: 'ip', confidence: 0.85, region };
    }

    // IP-to-country resolution (mock — replace with MaxMind/ip-api in production)
    const countryCode = await this.ipToCountry(ipAddress);
    const region = isActiveRegion(countryCode)
      ? REGION_CONFIGS[countryCode]
      : REGION_CONFIGS[DEFAULT_REGION];

    // Cache for 24 hours
    await this.redis.setJson(`region:ip:${ipAddress}`, { code: region.code }, 86400);

    this.logger.log(`🌐 IP ${ipAddress} → ${region.flag} ${region.name}`);
    return {
      countryCode: region.code,
      detectedVia: 'ip',
      confidence: isActiveRegion(countryCode) ? 0.85 : 0.1,
      region
    };
  }

  /**
   * Resolve region from an explicit header value (X-Region-Code).
   * Used when clients send a previously detected region.
   */
  resolveFromHeader(headerValue: string): RegionDetectionResult {
    const code = headerValue.toUpperCase();
    if (isActiveRegion(code)) {
      const region = REGION_CONFIGS[code];
      return { countryCode: code, detectedVia: 'header', confidence: 1.0, region };
    }

    const fallback = REGION_CONFIGS[DEFAULT_REGION];
    return { countryCode: DEFAULT_REGION, detectedVia: 'default', confidence: 0.1, region: fallback };
  }

  // ── Region Config Helpers ─────────────────────────────────────────────────

  /** Get all active regions */
  getActiveRegions(): RegionConfig[] {
    return getActiveRegions();
  }

  /** Get config for a specific region */
  getRegion(code: SupportedCountryCode): RegionConfig {
    return REGION_CONFIGS[code];
  }

  /** Generate a region-scoped Redis key */
  regionKey(code: SupportedCountryCode, ...parts: string[]): string {
    return `region:${code}:${parts.join(':')}`;
  }

  // ── Admin Stats ───────────────────────────────────────────────────────────

  /** Get aggregated stats for all regions (admin dashboard) */
  async getAllRegionStats(): Promise<RegionStats[]> {
    const regions = getActiveRegions();
    return Promise.all(regions.map(r => this.getRegionStats(r.code)));
  }

  /** Get stats for a single region */
  async getRegionStats(code: SupportedCountryCode): Promise<RegionStats> {
    const region = REGION_CONFIGS[code];

    // Try cache
    const cached = await this.redis.getJson<RegionStats>(`region:stats:${code}`);
    if (cached) return cached;

    // Build stats (in production this queries the DB; here we use realistic mock data)
    const stats: RegionStats = {
      code: region.code,
      name: region.name,
      flag: region.flag,
      currency: region.currencySymbol,
      ...this.getMockStatsForRegion(code)
    };

    // Cache for 5 minutes
    await this.redis.setJson(`region:stats:${code}`, stats, 300);
    return stats;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Approximate country from GPS using bounding boxes.
   * Production systems should use Google Maps Geocoding API or similar.
   */
  private resolveCountryFromCoords(lat: number, lng: number): SupportedCountryCode | null {
    // India: roughly 8°N–37°N, 68°E–97°E
    if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) return 'IN';
    // Singapore: roughly 1.1°N–1.5°N, 103.5°E–104.1°E (check before broader regions)
    if (lat >= 1.1 && lat <= 1.5 && lng >= 103.5 && lng <= 104.1) return 'SG';
    // Bahrain: roughly 25.5°N–26.4°N, 50.3°E–50.8°E (tiny island, check before QA/SA)
    if (lat >= 25.5 && lat <= 26.4 && lng >= 50.3 && lng <= 50.8) return 'BH';
    // Qatar: roughly 24.4°N–26.3°N, 50.7°E–52.0°E
    if (lat >= 24.4 && lat <= 26.3 && lng >= 50.7 && lng <= 52.0) return 'QA';
    // Kuwait: roughly 28.5°N–30.2°N, 46.5°E–48.5°E (check before SA)
    if (lat >= 28.5 && lat <= 30.2 && lng >= 46.5 && lng <= 48.5) return 'KW';
    // UAE: roughly 22°N–26.5°N, 51°E–56.5°E (excluding QA overlap)
    if (lat >= 22 && lat <= 26.5 && lng >= 51 && lng <= 56.5) return 'AE';
    // Oman: roughly 16.6°N–26.4°N, 51.8°E–59.8°E (check before SA)
    if (lat >= 16.6 && lat <= 26.4 && lng >= 51.8 && lng <= 59.8) return 'OM';
    // India: roughly -5°S–5°N, 33°E–42°E
    if (lat >= -5 && lat <= 5 && lng >= 33 && lng <= 42) return 'IN';
    // Saudi Arabia: roughly 16°N–32°N, 34°E–56°E
    if (lat >= 16 && lat <= 32 && lng >= 34 && lng <= 56) return 'SA';
    // United States: roughly 24°N–49°N, -125°E–-66°E
    if (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) return 'US';
    // United Kingdom: roughly 49°N–61°N, -8°E–2°E
    if (lat >= 49 && lat <= 61 && lng >= -8 && lng <= 2) return 'GB';

    return null;
  }

  /**
   * IP to country resolution (mock implementation).
   * Replace with MaxMind GeoIP2, ip-api.com, or ipinfo.io in production.
   */
  private async ipToCountry(ip: string): Promise<string> {
    // Localhost / private IPs → default region
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
      return DEFAULT_REGION;
    }

    // Use geoip-lite for real offline IP resolution
    const geo = geoip.lookup(ip);
    if (geo && geo.country) {
      // geoip-lite returns ISO 3166-1 alpha-2, e.g. "US", "IN"
      return geo.country.toUpperCase();
    }

    return DEFAULT_REGION;
  }

  /** Mock stats generator per region (replace with real DB queries) */
  private getMockStatsForRegion(code: SupportedCountryCode) {
    const baseData: Record<SupportedCountryCode, Omit<RegionStats, 'code' | 'name' | 'flag' | 'currency'>> = {
      IN: { totalSellers: 12400, activeSellers: 8920, totalOrders: 482000, todayOrders: 14200, totalCustomers: 89500, totalPartners: 3240, activePartners: 1820, revenue: 52400000, todayRevenue: 1840000 },
      QA: { totalSellers: 1850, activeSellers: 1420, totalOrders: 68000, todayOrders: 2100, totalCustomers: 24300, totalPartners: 680, activePartners: 420, revenue: 8900000, todayRevenue: 310000 },
      AE: { totalSellers: 4100, activeSellers: 3200, totalOrders: 192000, todayOrders: 6400, totalCustomers: 56200, totalPartners: 1450, activePartners: 920, revenue: 28400000, todayRevenue: 980000 },
      SA: { totalSellers: 5600, activeSellers: 4100, totalOrders: 248000, todayOrders: 8200, totalCustomers: 68400, totalPartners: 1800, activePartners: 1100, revenue: 34200000, todayRevenue: 1120000 },
      BH: { totalSellers: 820, activeSellers: 610, totalOrders: 31000, todayOrders: 980, totalCustomers: 11200, totalPartners: 290, activePartners: 180, revenue: 4100000, todayRevenue: 142000 },
      KW: { totalSellers: 1240, activeSellers: 940, totalOrders: 52000, todayOrders: 1650, totalCustomers: 18600, totalPartners: 420, activePartners: 260, revenue: 6800000, todayRevenue: 218000 },
      OM: { totalSellers: 960, activeSellers: 720, totalOrders: 38000, todayOrders: 1200, totalCustomers: 14100, totalPartners: 340, activePartners: 210, revenue: 4900000, todayRevenue: 165000 },
      GB: { totalSellers: 9800, activeSellers: 7100, totalOrders: 420000, todayOrders: 12500, totalCustomers: 115000, totalPartners: 2900, activePartners: 1750, revenue: 38500000, todayRevenue: 1250000 },
      US: { totalSellers: 24500, activeSellers: 18200, totalOrders: 1540000, todayOrders: 45000, totalCustomers: 310000, totalPartners: 8500, activePartners: 5100, revenue: 125000000, todayRevenue: 4200000 },
      SG: { totalSellers: 3400, activeSellers: 2800, totalOrders: 185000, todayOrders: 5800, totalCustomers: 62000, totalPartners: 1250, activePartners: 890, revenue: 19800000, todayRevenue: 680000 }
    };
    
    // Simulate live data variance (+/- 5%) to make the dashboard feel alive
    const data = baseData[code];
    const variance = () => 0.95 + Math.random() * 0.1;
    
    return {
      totalSellers: data.totalSellers,
      activeSellers: Math.floor(data.activeSellers * variance()),
      totalOrders: data.totalOrders,
      todayOrders: Math.floor(data.todayOrders * variance()),
      totalCustomers: data.totalCustomers,
      totalPartners: data.totalPartners,
      activePartners: Math.floor(data.activePartners * variance()),
      revenue: data.revenue,
      todayRevenue: Math.floor(data.todayRevenue * variance())
    };
  }
}
