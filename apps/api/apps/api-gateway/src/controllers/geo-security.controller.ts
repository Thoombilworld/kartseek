import { Controller, Get, Post, Body, Query, Req, UseGuards, Optional, Inject, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RedisService } from '@app/redis';
import { JwtAuthGuard } from '@app/security';
import { EntityManager } from 'typeorm';
import { GeoSecurityEvent, GeoSecurityRule, GeoWhitelistedIp } from '../entities/geo-security.entities';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeoCheckResult {
  ip: string;
  country: string | null;
  countryName: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  isSuspicious: boolean;
  threatLevel: 'none' | 'low' | 'medium' | 'high';
  action: 'allow' | 'warn' | 'block';
  message: string | null;
}

interface LocationVerifyRequest {
  gpsLat: number;
  gpsLng: number;
  gpsCountry?: string;
  gpsCity?: string;
  platform?: string;
}

// ─── Known Datacenter / VPN IP Ranges (sample heuristic) ─────────────────────

const DATACENTER_ASNS = new Set([
  'AS14061',  // DigitalOcean
  'AS16509',  // Amazon AWS
  'AS15169',  // Google Cloud
  'AS8075',   // Microsoft Azure
  'AS13335',  // Cloudflare
  'AS20473',  // Vultr
  'AS63949',  // Linode/Akamai
  'AS24940',  // Hetzner
  'AS51167',  // Contabo
  'AS14618',  // AWS
  'AS396982', // Google
]);

// Known VPN provider hostname patterns
const VPN_HOSTNAME_PATTERNS = [
  'nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'mullvad',
  'protonvpn', 'pia-', 'privateinternetaccess', 'ipvanish', 'windscribe',
  'tunnelbear', 'hotspotshield', 'hola-', 'zenmate', 'vyprvpn',
];

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('🛡️ Geo Security')
@Controller('geo')
export class GeoSecurityController {
  private readonly logger = new Logger(GeoSecurityController.name);

  constructor(
    private readonly redis: RedisService,
    @Optional() @Inject(EntityManager) private readonly em: EntityManager | null,
  ) {}

  private isDb(): boolean {
    return process.env.SKIP_DB !== 'true' && this.em !== null;
  }

  // ─── PUBLIC: IP Geo Check ─────────────────────────────────────────────────

  @Get('check')
  @ApiOperation({ summary: 'Check IP geolocation and VPN/proxy status' })
  async checkGeo(@Req() req: any): Promise<GeoCheckResult> {
    const ip = this.extractIp(req);
    const cacheKey = `geo:check:${ip}`;

    // Check Redis cache first (cache for 5 minutes)
    const cached = await this.redis.getJson<GeoCheckResult>(cacheKey);
    if (cached) return cached;

    // Check whitelist
    const isWhitelisted = await this.isWhitelisted(ip);
    if (isWhitelisted) {
      const result: GeoCheckResult = {
        ip, country: null, countryName: null, city: null, lat: null, lng: null,
        timezone: null, isp: null, org: null, isVpn: false, isProxy: false,
        isTor: false, isDatacenter: false, isSuspicious: false,
        threatLevel: 'none', action: 'allow', message: null,
      };
      await this.redis.setJson(cacheKey, result, 300);
      return result;
    }

    // Perform IP analysis
    const geoData = await this.lookupIp(ip);
    const vpnAnalysis = this.analyzeVpnIndicators(geoData, req);
    const policy = await this.getPolicy(geoData.country);

    const isSuspicious = vpnAnalysis.isVpn || vpnAnalysis.isProxy || vpnAnalysis.isTor || vpnAnalysis.isDatacenter;
    const threatLevel = this.calculateThreatLevel(vpnAnalysis);
    const action = isSuspicious ? policy : 'allow';

    const result: GeoCheckResult = {
      ip,
      country: geoData.country,
      countryName: geoData.countryName,
      city: geoData.city,
      lat: geoData.lat,
      lng: geoData.lng,
      timezone: geoData.timezone,
      isp: geoData.isp,
      org: geoData.org,
      isVpn: vpnAnalysis.isVpn,
      isProxy: vpnAnalysis.isProxy,
      isTor: vpnAnalysis.isTor,
      isDatacenter: vpnAnalysis.isDatacenter,
      isSuspicious,
      threatLevel,
      action,
      message: action === 'block'
        ? 'VPN or proxy detected. Please disable your VPN to continue using KARTSEEK services.'
        : action === 'warn'
          ? 'We detected you may be using a VPN. Some location-based services may be limited.'
          : null,
    };

    // Log suspicious activity
    if (isSuspicious) {
      await this.logEvent({
        ip, userId: req.user?.userId || null,
        eventType: vpnAnalysis.isVpn ? 'vpn_detected' : vpnAnalysis.isProxy ? 'proxy_detected' : vpnAnalysis.isTor ? 'tor_detected' : 'datacenter_ip',
        ipCountry: geoData.country, ipCity: geoData.city,
        isVpn: vpnAnalysis.isVpn, isProxy: vpnAnalysis.isProxy,
        isTor: vpnAnalysis.isTor, isDatacenter: vpnAnalysis.isDatacenter,
        isp: geoData.isp, org: geoData.org, action,
        platform: req.headers['x-platform'] || 'unknown',
        userAgent: (req.headers['user-agent'] || '').substring(0, 50),
      });
    }

    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  // ─── PUBLIC: Verify Location (GPS vs IP) ──────────────────────────────────

  @Post('verify-location')
  @ApiOperation({ summary: 'Compare GPS location with IP geolocation' })
  async verifyLocation(@Req() req: any, @Body() dto: LocationVerifyRequest) {
    const ip = this.extractIp(req);
    const geoData = await this.lookupIp(ip);

    // Calculate distance between IP location and GPS location
    const distanceKm = geoData.lat && geoData.lng
      ? this.haversineKm(dto.gpsLat, dto.gpsLng, geoData.lat, geoData.lng)
      : null;

    // Mismatch threshold (default 500km for IP geolocation inaccuracy)
    const thresholdKm = await this.getMismatchThreshold();
    const isMismatch = distanceKm !== null && distanceKm > thresholdKm;
    const countriesDiffer = geoData.country && dto.gpsCountry && geoData.country !== dto.gpsCountry;

    if (isMismatch || countriesDiffer) {
      await this.logEvent({
        ip, userId: req.user?.userId || null,
        eventType: 'location_mismatch',
        ipCountry: geoData.country, ipCity: geoData.city,
        gpsCountry: dto.gpsCountry ?? undefined, gpsCity: dto.gpsCity ?? undefined,
        gpsLat: dto.gpsLat, gpsLng: dto.gpsLng,
        isVpn: false, isProxy: false, isTor: false, isDatacenter: false,
        isp: geoData.isp, org: geoData.org,
        action: 'warned', platform: dto.platform || 'unknown', userAgent: '',
      });
    }

    return {
      ipLocation: { country: geoData.country, city: geoData.city, lat: geoData.lat, lng: geoData.lng },
      gpsLocation: { country: dto.gpsCountry, city: dto.gpsCity, lat: dto.gpsLat, lng: dto.gpsLng },
      distanceKm: distanceKm !== null ? Math.round(distanceKm) : null,
      isMismatch,
      countriesDiffer: !!countriesDiffer,
      thresholdKm,
      recommendation: isMismatch ? 'Location mismatch detected. GPS location will be used for services.' : 'Location verified.',
    };
  }

  // ─── ADMIN: Security Events Log ───────────────────────────────────────────

  @Get('admin/events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Admin: View geo security event logs' })
  async getSecurityEvents(
    @Query('type') eventType?: string,
    @Query('country') country?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const pageNum = parseInt(page || '1');
    const pageSize = Math.min(parseInt(limit || '50'), 100);

    if (this.isDb()) {
      try {
        const qb = this.em!.createQueryBuilder(GeoSecurityEvent, 'e')
          .orderBy('e.createdAt', 'DESC')
          .skip((pageNum - 1) * pageSize)
          .take(pageSize);

        if (eventType) qb.andWhere('e.eventType = :eventType', { eventType });
        if (country) qb.andWhere('e.ipCountry = :country', { country });

        const [events, total] = await qb.getManyAndCount();
        return { events, total, page: pageNum, pageSize };
      } catch (err) {
        this.logger.warn(`Reading geo-security events from the database failed; serving the recent events kept in Redis instead: ${String(err)}`);
      }
    }

    // Fallback: return from Redis recent events
    const events = await this.redis.getJson<any[]>('geo:events:recent') || [];
    return { events: events.slice(0, pageSize), total: events.length, page: 1, pageSize };
  }

  // ─── ADMIN: Get/Update Security Rules ─────────────────────────────────────

  @Get('admin/rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Admin: Get geo security rules' })
  async getRules() {
    if (this.isDb()) {
      try {
        return await this.em!.find(GeoSecurityRule, { where: { isActive: true } });
      } catch (err) {
        this.logger.warn(`Reading geo-security rules from the database failed; answering with the built-in default rules: ${String(err)}`);
      }
    }
    return this.defaultRules;
  }

  @Post('admin/rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Admin: Update geo security rule' })
  async updateRule(@Body() dto: { ruleKey: string; ruleValue: string; countryCode?: string; role?: string; description?: string }) {
    if (this.isDb()) {
      try {
        const existing = await this.em!.findOne(GeoSecurityRule, { where: { ruleKey: dto.ruleKey } });
        if (existing) {
          await this.em!.update(GeoSecurityRule, existing.id, dto);
        } else {
          await this.em!.save(GeoSecurityRule, this.em!.create(GeoSecurityRule, { ...dto, isActive: true }));
        }
      } catch (err) {
        // A rule that did not persist must not be reported as saved.
        this.logger.error(`Saving geo-security rule ${dto.ruleKey} failed: ${String(err)}`);
        throw err;
      }
    }
    // Invalidate cached policy
    await this.redis.del('geo:policy:global');
    return { success: true };
  }

  // ─── ADMIN: Whitelist Management ──────────────────────────────────────────

  @Get('admin/whitelist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Admin: List whitelisted IPs' })
  async getWhitelist() {
    if (this.isDb()) {
      try {
        return await this.em!.find(GeoWhitelistedIp, { where: { isActive: true } });
      } catch (err) {
        this.logger.warn(`Reading the IP whitelist from the database failed; answering with the Redis whitelist instead: ${String(err)}`);
      }
    }
    const ips = await this.redis.getJson<string[]>('geo:whitelist') || [];
    return ips.map(ip => ({ ip, reason: 'Redis whitelist' }));
  }

  @Post('admin/whitelist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Admin: Add IP to whitelist' })
  async addWhitelist(@Req() req: any, @Body() dto: { ip: string; reason?: string }) {
    if (this.isDb()) {
      try {
        await this.em!.save(GeoWhitelistedIp, this.em!.create(GeoWhitelistedIp, {
          ip: dto.ip, reason: dto.reason, addedBy: req.user?.userId, isActive: true,
        }));
      } catch (err) {
        // A whitelist entry that did not persist must not be reported as added.
        this.logger.error(`Saving whitelisted IP ${dto.ip} failed: ${String(err)}`);
        throw err;
      }
    }
    await this.redis.del(`geo:check:${dto.ip}`);
    return { success: true, message: `IP ${dto.ip} whitelisted.` };
  }

  // ─── ADMIN: Dashboard Stats ───────────────────────────────────────────────

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Admin: Geo security dashboard stats' })
  async getStats() {
    const today = new Date().toISOString().split('T')[0];
    const vpnToday = parseInt(await this.redis.get(`geo:stats:vpn:${today}`) || '0');
    const proxyToday = parseInt(await this.redis.get(`geo:stats:proxy:${today}`) || '0');
    const torToday = parseInt(await this.redis.get(`geo:stats:tor:${today}`) || '0');
    const mismatchToday = parseInt(await this.redis.get(`geo:stats:mismatch:${today}`) || '0');
    const blockedToday = parseInt(await this.redis.get(`geo:stats:blocked:${today}`) || '0');

    return {
      today: { vpn: vpnToday, proxy: proxyToday, tor: torToday, mismatch: mismatchToday, blocked: blockedToday },
      policy: await this.getPolicy(null),
    };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private readonly defaultRules = [
    { ruleKey: 'vpn_policy', ruleValue: 'block', description: 'Action when VPN is detected: block | warn | allow' },
    { ruleKey: 'proxy_policy', ruleValue: 'block', description: 'Action when proxy is detected' },
    { ruleKey: 'tor_policy', ruleValue: 'block', description: 'Action when TOR is detected' },
    { ruleKey: 'datacenter_policy', ruleValue: 'warn', description: 'Action for datacenter/hosting IPs' },
    { ruleKey: 'mismatch_threshold_km', ruleValue: '500', description: 'Max allowed GPS-to-IP distance in km' },
    { ruleKey: 'log_all_checks', ruleValue: 'false', description: 'Log all checks, not just suspicious ones' },
  ];

  private extractIp(req: any): string {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.headers['cf-connecting-ip']  // Cloudflare
      || req.connection?.remoteAddress
      || '0.0.0.0';
  }

  private async isWhitelisted(ip: string): Promise<boolean> {
    const cached = await this.redis.get(`geo:wl:${ip}`);
    if (cached === '1') return true;
    if (this.isDb()) {
      try {
        const wl = await this.em!.findOne(GeoWhitelistedIp, { where: { ip, isActive: true } });
        if (wl) {
          await this.redis.set(`geo:wl:${ip}`, '1', 3600);
          return true;
        }
      } catch (err) {
        this.logger.warn(`Whitelist lookup for ${ip} failed in the database; treating the IP as not whitelisted: ${String(err)}`);
      }
    }
    return false;
  }

  private async lookupIp(ip: string): Promise<any> {
    // Check cache
    const cached = await this.redis.getJson<any>(`geo:lookup:${ip}`);
    if (cached) return cached;

    // Try external API (ipinfo.io free tier, or ipdata, or MaxMind)
    let geoData: any = { country: null, countryName: null, city: null, lat: null, lng: null, timezone: null, isp: null, org: null, asn: null, hostname: null };

    try {
      const token = process.env.IPINFO_TOKEN || '';
      const url = token ? `https://ipinfo.io/${ip}?token=${token}` : `https://ipinfo.io/${ip}/json`;
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const data = await response.json() as any;
        const [lat, lng] = (data.loc || '0,0').split(',').map(Number);
        geoData = {
          country: data.country || null,
          countryName: data.country || null,
          city: data.city || null,
          region: data.region || null,
          lat, lng,
          timezone: data.timezone || null,
          isp: data.org || null,
          org: data.org || null,
          asn: data.org?.split(' ')[0] || null,
          hostname: data.hostname || null,
        };
      }
    } catch (e) {
      // Fallback: use Cloudflare headers if available
      this.logger.warn(`IP lookup for ${ip} failed; using the Cloudflare geolocation headers if present: ${String(e)}`);
    }

    // Cache for 1 hour
    await this.redis.setJson(`geo:lookup:${ip}`, geoData, 3600);
    return geoData;
  }

  private analyzeVpnIndicators(geoData: any, req: any): { isVpn: boolean; isProxy: boolean; isTor: boolean; isDatacenter: boolean } {
    let isVpn = false;
    let isProxy = false;
    let isTor = false;
    let isDatacenter = false;

    // Check ASN against known datacenter providers
    if (geoData.asn && DATACENTER_ASNS.has(geoData.asn)) {
      isDatacenter = true;
    }

    // Check hostname for VPN provider patterns
    if (geoData.hostname) {
      const hn = geoData.hostname.toLowerCase();
      if (VPN_HOSTNAME_PATTERNS.some(p => hn.includes(p))) {
        isVpn = true;
      }
      if (hn.includes('tor-exit') || hn.includes('torservers')) {
        isTor = true;
      }
    }

    // Check org name for VPN/proxy indicators
    if (geoData.org) {
      const orgLower = geoData.org.toLowerCase();
      if (orgLower.includes('vpn') || orgLower.includes('virtual private')) isVpn = true;
      if (orgLower.includes('proxy') || orgLower.includes('anonymiz')) isProxy = true;
      if (orgLower.includes('hosting') || orgLower.includes('server') || orgLower.includes('cloud')) isDatacenter = true;
    }

    // Check headers for proxy indicators
    const proxyHeaders = ['x-forwarded-for', 'via', 'x-proxy-id', 'proxy-connection'];
    const multipleForwards = (req.headers['x-forwarded-for'] || '').split(',').length > 2;
    if (multipleForwards) isProxy = true;

    // Check for TOR exit nodes (via header pattern)
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    if (ua.includes('tor browser') || ua.includes('torbrowser')) isTor = true;

    return { isVpn, isProxy, isTor, isDatacenter };
  }

  private calculateThreatLevel(analysis: { isVpn: boolean; isProxy: boolean; isTor: boolean; isDatacenter: boolean }): 'none' | 'low' | 'medium' | 'high' {
    if (analysis.isTor) return 'high';
    if (analysis.isVpn || analysis.isProxy) return 'medium';
    if (analysis.isDatacenter) return 'low';
    return 'none';
  }

  private async getPolicy(countryCode: string | null): Promise<'block' | 'warn' | 'allow'> {
    const cacheKey = `geo:policy:${countryCode || 'global'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached as any;

    if (this.isDb()) {
      try {
        const rule = await this.em!.findOne(GeoSecurityRule, {
          where: { ruleKey: 'vpn_policy', isActive: true },
        });
        if (rule) {
          await this.redis.set(cacheKey, rule.ruleValue, 3600);
          return rule.ruleValue as any;
        }
      } catch (err) {
        this.logger.warn(`Reading the vpn_policy rule from the database failed; applying the default policy "block": ${String(err)}`);
      }
    }

    await this.redis.set(cacheKey, 'block', 3600);
    return 'block';
  }

  private async getMismatchThreshold(): Promise<number> {
    const cached = await this.redis.get('geo:mismatch_threshold');
    if (cached) return parseInt(cached);

    if (this.isDb()) {
      try {
        const rule = await this.em!.findOne(GeoSecurityRule, {
          where: { ruleKey: 'mismatch_threshold_km', isActive: true },
        });
        if (rule) return parseInt(rule.ruleValue) || 500;
      } catch (err) {
        this.logger.warn(`Reading the mismatch_threshold_km rule from the database failed; using the default 500 km: ${String(err)}`);
      }
    }
    return 500;
  }

  private async logEvent(data: Partial<GeoSecurityEvent>): Promise<void> {
    // Increment daily counters
    const today = new Date().toISOString().split('T')[0];
    if (data.isVpn) await this.redis.incr(`geo:stats:vpn:${today}`);
    if (data.isProxy) await this.redis.incr(`geo:stats:proxy:${today}`);
    if (data.isTor) await this.redis.incr(`geo:stats:tor:${today}`);
    if (data.eventType === 'location_mismatch') await this.redis.incr(`geo:stats:mismatch:${today}`);
    if (data.action === 'blocked') await this.redis.incr(`geo:stats:blocked:${today}`);

    // Persist to DB
    if (this.isDb()) {
      try {
        await this.em!.save(GeoSecurityEvent, this.em!.create(GeoSecurityEvent, data));
      } catch (err) {
        // The event still reaches the Redis recent-events list below; only the durable copy is lost.
        this.logger.error(`Persisting geo-security event ${data.eventType} for ${data.ip} failed: ${String(err)}`);
      }
    }

    // Also keep in Redis recent events list (max 200)
    const recent = await this.redis.getJson<any[]>('geo:events:recent') || [];
    recent.unshift({ ...data, createdAt: new Date().toISOString() });
    if (recent.length > 200) recent.length = 200;
    await this.redis.setJson('geo:events:recent', recent, 86400);
  }

  /** Haversine formula — distance in km between two lat/lng points */
  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
