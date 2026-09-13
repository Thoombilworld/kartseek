import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { type Request } from 'express';
import { RegionService, Region, BypassRegion } from '@app/region';
import { IndiaPinCodeService } from '@app/region/india-pincode.service';
import { JwtAuthGuard, clientIp } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import { UserRole } from '@app/common';

/**
 * Region Controller — Multi-Regional Data Architecture
 *
 * Provides endpoints for:
 * - Detecting the client's region from GPS/IP
 * - Listing all supported operational regions
 * - Getting region-specific configuration
 * - Admin: aggregated regional statistics
 */
@ApiTags('🌍 Regions')
@Controller('regions')
export class RegionController {
  private readonly logger = new Logger(RegionController.name);

  constructor(
    private readonly regionService: RegionService,
    private readonly indiaPinCode: IndiaPinCodeService,
  ) {}

  /**
   * Detect the client's region from their request context.
   * Uses GPS headers, IP address, or explicit region header.
   */
  @Get('detect')
  @BypassRegion()
  @ApiOperation({
    summary: 'Detect client region',
    description:
      "Resolves the client's operational region from GPS coordinates (X-Latitude/X-Longitude headers), IP address, or explicit X-Region-Code header.",
  })
  @ApiOkResponse({ description: 'Region detection result with config' })
  async detectRegion(@Req() req: Request) {
    // Use GPS if provided
    const lat = parseFloat(req.headers['x-latitude'] as string);
    const lng = parseFloat(req.headers['x-longitude'] as string);

    if (!isNaN(lat) && !isNaN(lng)) {
      const result = await this.regionService.detectRegionFromCoords(lat, lng);
      this.logger.log(`🌍 Region detected via GPS: ${result.region.flag} ${result.region.name}`);
      return result;
    }

    // Use IP.
    //
    // `clientIp` and not the raw `X-Forwarded-For`: under `trust proxy` Express
    // has already resolved the one address in that list the caller cannot
    // choose. The header was never a credential here — `X-Region-Code` is read
    // ahead of it by design — but a detector that believes a header is a
    // detector that reports whatever it is told, and this answer decides which
    // market's catalogue, currency and legal copy a visitor is served.
    const ip = clientIp(req) || '127.0.0.1';

    const result = await this.regionService.detectRegionFromIp(ip);
    this.logger.log(`🌐 Region detected via IP: ${result.region.flag} ${result.region.name}`);
    return result;
  }

  /**
   * List all supported operational regions with their configurations.
   */
  @Get()
  @BypassRegion()
  @ApiOperation({
    summary: 'List all supported regions',
    description:
      'Returns all active operational regions with currency, timezone, locale, and enabled service modules.',
  })
  @ApiOkResponse({ description: 'Array of active region configurations' })
  listRegions() {
    return {
      regions: this.regionService.getActiveRegions(),
      total: this.regionService.getActiveRegions().length,
    };
  }

  /**
   * Get configuration for the client's detected region.
   */
  @Get('current')
  @ApiOperation({
    summary: 'Get current region config',
    description: "Returns the full configuration for the client's auto-detected region.",
  })
  @ApiOkResponse({ description: 'Current region configuration' })
  getCurrentRegion(@Region() regionCode: string) {
    return this.regionService.resolveFromHeader(regionCode);
  }

  /**
   * Admin: Get aggregated statistics for all regions.
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @GlobalEntity(
    "registry statistics — aggregated across every operational region, not one market's data",
  )
  @BypassRegion()
  @ApiOperation({
    summary: 'Get regional statistics (Admin)',
    description:
      'Returns aggregated KPI statistics for all operational regions. Used by the admin dashboard for regional segmentation.',
  })
  @ApiOkResponse({ description: 'Array of regional statistics' })
  async getRegionStats() {
    const stats = await this.regionService.getAllRegionStats();
    return {
      stats,
      totalRegions: stats.length,
      aggregated: {
        totalSellers: stats.reduce((s, r) => s + r.totalSellers, 0),
        totalOrders: stats.reduce((s, r) => s + r.totalOrders, 0),
        totalCustomers: stats.reduce((s, r) => s + r.totalCustomers, 0),
        totalPartners: stats.reduce((s, r) => s + r.totalPartners, 0),
        totalRevenue: stats.reduce((s, r) => s + r.revenue, 0),
        todayRevenue: stats.reduce((s, r) => s + r.todayRevenue, 0),
        todayOrders: stats.reduce((s, r) => s + r.todayOrders, 0),
      },
    };
  }

  /**
   * Admin: Get statistics for a specific region.
   */
  @Get('stats/region')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @GlobalEntity(
    "one region's statistics, read from the registry itself — same marker as /regions/stats",
  )
  @ApiOperation({
    summary: 'Get stats for specific region (Admin)',
    description: 'Returns KPI statistics for a single operational region.',
  })
  @ApiQuery({ name: 'code', description: 'Country code (IN, QA, AE, SA)', required: true })
  @ApiOkResponse({ description: 'Region statistics' })
  async getRegionStatByCode(@Query('code') code: string) {
    const region = this.regionService.resolveFromHeader(code);
    if (region.detectedVia === 'default' && code.toUpperCase() !== 'IN') {
      return {
        error: `Unsupported region code: ${code}`,
        supportedCodes: ['IN', 'QA', 'IN', 'AE', 'SA'],
      };
    }
    return this.regionService.getRegionStats(region.countryCode);
  }

  // ─── India-Specific Endpoints ─────────────────────────────────────────────

  /**
   * Look up an Indian PIN code — returns state, district, city, tier & delivery info.
   */
  @Get('india/pincode/:pin')
  @BypassRegion()
  @ApiOperation({
    summary: 'India PIN code lookup',
    description:
      'Resolve a 6-digit Indian PIN code to state, district, city, zone, and delivery timeline. Used by checkout and address forms.',
  })
  @ApiParam({ name: 'pin', description: '6-digit Indian postal PIN code', example: '400001' })
  @ApiOkResponse({ description: 'PIN code location details and delivery info' })
  indiaPinCodeLookup(@Param('pin') pin: string) {
    const result = this.indiaPinCode.lookupPinCode(pin);
    if (!result) {
      throw new NotFoundException(
        `PIN code ${pin} is invalid or not found in India's postal database.`,
      );
    }
    return result;
  }

  /**
   * List all Indian states and Union Territories.
   */
  @Get('india/states')
  @BypassRegion()
  @ApiOperation({
    summary: 'List all Indian states & UTs',
    description: 'Returns all 28 states and 8 Union Territories of India, sorted alphabetically.',
  })
  @ApiOkResponse({ description: 'List of Indian states and UTs' })
  indiaStateList() {
    const states = this.indiaPinCode.getStateList();
    return {
      total: states.length,
      states: states.filter((s) => !s.isUT),
      unionTerritories: states.filter((s) => s.isUT),
    };
  }

  /**
   * Get districts for a specific Indian state.
   */
  @Get('india/states/:stateCode/districts')
  @BypassRegion()
  @ApiOperation({
    summary: 'Get districts for an Indian state',
    description:
      'Returns all districts and their PIN ranges for a given state code (e.g., MH for Maharashtra).',
  })
  @ApiParam({
    name: 'stateCode',
    description: '2-letter state code (e.g. MH, DL, KA)',
    example: 'MH',
  })
  @ApiOkResponse({ description: 'Districts list for the given state' })
  indiaDistrictsByState(@Param('stateCode') stateCode: string) {
    const state = this.indiaPinCode.getStateByCode(stateCode);
    if (!state) {
      throw new NotFoundException(
        `State code '${stateCode}' not found. Use 2-letter codes like MH, DL, KA, TN, KL.`,
      );
    }
    const districts = this.indiaPinCode.getDistrictsByState(stateCode);
    return {
      stateCode: state.code,
      stateName: state.name,
      capital: state.capital,
      isUT: state.isUT,
      totalDistricts: districts.length,
      districts,
    };
  }

  /**
   * Check if KARTSEEK delivers to a given Indian PIN code.
   */
  @Get('india/delivery-check/:pin')
  @BypassRegion()
  @ApiOperation({
    summary: 'India delivery serviceability check',
    description:
      'Check if KARTSEEK delivers to the given PIN code. Returns serviceability status and estimated delivery days.',
  })
  @ApiParam({ name: 'pin', description: '6-digit Indian PIN code', example: '110001' })
  @ApiOkResponse({ description: 'Delivery serviceability result' })
  indiaDeliveryCheck(@Param('pin') pin: string) {
    return this.indiaPinCode.checkDeliveryServiceability(pin);
  }

  /**
   * Admin: India PIN code system statistics.
   */
  @Get('india/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @GlobalEntity('the India PIN code registry itself — the market is in the path, not a filter')
  @BypassRegion()
  @ApiOperation({ summary: 'India location system statistics (Admin)' })
  indiaStats() {
    return {
      ...this.indiaPinCode.getStats(),
      coverage: 'All 28 States + 8 Union Territories',
      pinCodeFormat: '6 digits — Zone(1) + Sub-zone(1) + Sorting district(1) + Post office(3)',
      postalZones: 9,
      description: 'India PIN code system modeled after Amazon India / Flipkart serviceability',
    };
  }
}
