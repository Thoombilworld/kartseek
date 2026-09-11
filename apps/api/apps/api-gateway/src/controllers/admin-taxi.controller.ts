import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Req,
  Body,
  Query,
  UseGuards,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { marketScopeOf, resolveMarket } from '../guards/market-scope';
import {
  PayoutBatchDto,
  PricingUpdateDto,
  RateCardUpsertDto,
  ReasonDto,
  ResolutionDto,
  RouteCreateDto,
  SettingsUpdateDto,
  SurgeUpdateDto,
  TaxiConfigUpsertDto,
} from '../dto/admin-taxi.dto';

/**
 * Admin Taxi Controller
 *
 * Admin endpoints for managing taxi vendors, drivers, rides,
 * pricing, complaints, and surge settings.
 * All endpoints require SUPER_ADMIN role.
 */
@ApiTags('👑 Admin — Taxi')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/taxi')
export class AdminTaxiController {
  private readonly logger = new Logger(AdminTaxiController.name);

  constructor(@Inject('TAXI_SERVICE') private readonly taxiClient: ClientProxy) {}

  /**
   * The fields the caller actually sent.
   *
   * `transform: true` rebuilds the body through `plainToInstance`, which
   * materialises every declared property — an optional one the console omitted
   * arrives as an own key holding `undefined`. Spreading that into the RPC
   * payload hands taxi-service `Object.assign(row, { timezone: undefined })`
   * and blanks a column nobody asked to change, so only the keys carrying a
   * value travel.
   *
   * `null` is a value and is kept: `timezone` is nullable, and clearing it is
   * a thing an administrator may legitimately ask for. Shallow by design — the
   * two nested shapes (`SurgeLimitsDto`, `PeakHourDto`) have no optional
   * properties, so a half-materialised nested object cannot pass validation in
   * the first place.
   */
  private sent<T extends object>(dto: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(dto ?? ({} as T)).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
  }

  /** The acting administrator, from the verified token — recorded on decisions. */
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
  }

  /**
   * The market this request may act in, as `scope` for the backend. A locked
   * admin gets their market (and any other market they name is refused and
   * logged); a global admin gets undefined — every market — or the market they
   * filtered on.
   */
  private scopeOf(
    req: any,
    requested?: string,
    what = 'that market',
  ): { scope?: string; market?: string } {
    const market = resolveMarket(req, requested, what);
    const scope = marketScopeOf(req).locked ? market : undefined;
    return { scope, market };
  }

  /**
   * Forward to taxi-service, preserving the failure.
   *
   * This helper used to take a `fallback` and return it as a 200 whenever the
   * service was unreachable, so an outage was indistinguishable from an empty
   * result: the listing pages showed "no results in your area" rather than
   * "we could not reach the service", and the admin screens showed empty queues
   * rather than an error. The fallback parameter is gone; failures propagate and
   * the client can tell the two apart.
   */
  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.taxiClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Taxi service unavailable'))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`taxi-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Taxi service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin taxi dashboard stats' })
  async getDashboard(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that dashboard');
    return { data: await this.send('admin.taxi.dashboard', { countryCode: market, scope }) };
  }

  // ── Vendors ───────────────────────────────────────────────────
  @Get('vendors')
  @ApiOperation({ summary: 'List all taxi vendors' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getVendors(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those vendors');
    return await this.send('admin.taxi.vendors', {
      page: +page,
      limit: +limit,
      status,
      countryCode: market,
      scope,
    });
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Get vendor detail' })
  async getVendorById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that vendor');
    return { data: await this.send('admin.taxi.vendorDetail', { id, scope }) };
  }

  @Patch('vendors/:id/approve')
  @ApiOperation({ summary: 'Approve a vendor' })
  async approveVendor(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that vendor');
    return {
      data: await this.send('admin.taxi.approveVendor', { id, scope, adminId: this.actorId(req) }),
    };
  }

  @Patch('vendors/:id/suspend')
  @ApiOperation({ summary: 'Suspend a vendor' })
  async suspendVendor(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that vendor');
    return {
      data: await this.send('admin.taxi.suspendVendor', {
        id,
        reason: dto.reason,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Drivers ───────────────────────────────────────────────────
  @Get('drivers')
  @ApiOperation({ summary: 'List all drivers' })
  async getDrivers(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those drivers');
    return await this.send('admin.taxi.drivers', {
      page: +page,
      limit: +limit,
      status,
      search,
      countryCode: market,
      scope,
    });
  }

  /**
   * Declared before `drivers/:id`, and it has to stay there.
   *
   * Nest matches in declaration order, so with `:id` first this route was
   * unreachable: `/admin/taxi/drivers/nearby` was read as a driver whose id is
   * the string "nearby", which reaches Postgres as
   * `invalid input syntax for type uuid`. The live fleet map called an endpoint
   * that could only ever fail.
   */
  @Get('drivers/nearby')
  @ApiOperation({ summary: 'Drivers near a point, for the live fleet map' })
  async nearbyDrivers(
    @Req() req: any,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('vehicleType') vehicleType?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that fleet');
    return this.send('admin.taxi.drivers.nearby', {
      lat: Number(lat),
      lng: Number(lng),
      radiusKm: radiusKm ? Number(radiusKm) : 5,
      vehicleType,
      countryCode: market,
      scope,
    });
  }

  @Get('drivers/:id')
  @ApiOperation({ summary: 'Get driver detail' })
  async getDriverById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that driver');
    return { data: await this.send('admin.taxi.driverDetail', { id, scope }) };
  }

  @Patch('drivers/:id/approve')
  @ApiOperation({ summary: 'Approve a driver' })
  async approveDriver(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that driver');
    return {
      data: await this.send('admin.taxi.approveDriver', { id, scope, adminId: this.actorId(req) }),
    };
  }

  @Patch('drivers/:id/suspend')
  @ApiOperation({ summary: 'Suspend a driver' })
  async suspendDriver(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that driver');
    // taxi-service implements `admin.taxi.driver.suspend`; the previous name had no handler.
    return {
      data: await this.send('admin.taxi.driver.suspend', {
        driverId: id,
        reason: dto.reason,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Rides ─────────────────────────────────────────────────────
  @Get('rides')
  @ApiOperation({ summary: 'List all rides' })
  async getRides(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those rides');
    return await this.send('admin.taxi.rides', { page: +page, status, countryCode: market, scope });
  }

  @Get('rides/:id')
  @ApiOperation({ summary: 'Get ride detail' })
  async getRideById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that ride');
    return { data: await this.send('admin.taxi.rideDetail', { id, scope }) };
  }

  // ── Pricing ───────────────────────────────────────────────────
  @Get('pricing')
  @ApiOperation({ summary: 'Get pricing configuration' })
  async getPricing(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that pricing');
    return { data: await this.send('admin.taxi.pricing', { countryCode: market, scope }) };
  }

  @Post('pricing')
  @ApiOperation({ summary: 'Update pricing' })
  async updatePricing(@Req() req: any, @Body() dto: PricingUpdateDto) {
    const { scope, market } = this.scopeOf(req, dto?.countryCode, 'that pricing');
    return {
      data: await this.send('admin.taxi.updatePricing', {
        ...this.sent(dto),
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Surge ─────────────────────────────────────────────────────
  @Get('surge')
  @ApiOperation({ summary: 'Get surge pricing zones' })
  async getSurge(
    @Req() req: any,
    @Query('countryCode') countryCode?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those surge zones');
    return {
      data: await this.send('admin.taxi.surge', {
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        countryCode: market,
        scope,
      }),
    };
  }

  @Post('surge')
  @ApiOperation({ summary: 'Update surge settings' })
  async updateSurge(@Req() req: any, @Body() dto: SurgeUpdateDto) {
    const { scope, market } = this.scopeOf(req, dto?.countryCode, 'those surge zones');
    return {
      data: await this.send('admin.taxi.updateSurge', {
        ...this.sent(dto),
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Complaints ────────────────────────────────────────────────
  @Get('complaints')
  @ApiOperation({ summary: 'List taxi complaints' })
  async getComplaints(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those complaints');
    return await this.send('admin.taxi.complaints', {
      page: +page,
      status,
      countryCode: market,
      scope,
    });
  }

  @Patch('complaints/:id/resolve')
  @ApiOperation({ summary: 'Resolve a complaint' })
  async resolveComplaint(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolutionDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that complaint');
    return {
      data: await this.send('admin.taxi.resolveComplaint', {
        id,
        resolution: dto.resolution,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Fleet ─────────────────────────────────────────────────────
  @Get('fleet')
  @ApiOperation({ summary: 'List fleet vehicles' })
  async getFleet(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that fleet');
    return await this.send('admin.taxi.fleet', { page: +page, countryCode: market, scope });
  }

  // ── Payouts ───────────────────────────────────────────────────
  @Get('payouts')
  @ApiOperation({ summary: 'List driver payouts' })
  async getPayouts(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those payouts');
    return await this.send('admin.taxi.payouts', {
      page: +page,
      status,
      countryCode: market,
      scope,
    });
  }

  @Post('payouts/process')
  @ApiOperation({ summary: 'Process a batch of approved payouts' })
  async processPayouts(@Req() req: any, @Body() dto: PayoutBatchDto) {
    const { scope } = this.scopeOf(req, undefined, 'those payouts');
    return this.send('admin.taxi.payouts.process', {
      payoutIds: dto.payoutIds,
      scope,
      adminId: this.actorId(req),
    });
  }

  @Get('payouts/summary')
  @ApiOperation({ summary: 'Platform payout totals' })
  async payoutSummary(
    @Req() req: any,
    @Query('countryCode') countryCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that summary');
    return this.send('admin.taxi.payouts.summary', {
      countryCode: market,
      startDate,
      endDate,
      scope,
    });
  }

  @Post('payouts/:id/approve')
  @ApiOperation({ summary: 'Approve a payout' })
  async approvePayout(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that payout');
    return {
      data: await this.send('admin.taxi.approvePayout', { id, scope, adminId: this.actorId(req) }),
    };
  }

  // ── Routes ────────────────────────────────────────────────────
  @Get('routes')
  @ApiOperation({ summary: 'List fixed routes' })
  async getRoutes(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those routes');
    return { data: await this.send('admin.taxi.routes', { countryCode: market, scope }) };
  }

  @Post('routes')
  @ApiOperation({ summary: 'Create route' })
  async createRoute(@Req() req: any, @Body() dto: RouteCreateDto) {
    const { scope, market } = this.scopeOf(req, dto?.countryCode, 'that route');
    return {
      data: await this.send('admin.taxi.createRoute', {
        ...this.sent(dto),
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Pending Approvals ─────────────────────────────────────────
  @Get('pending-approvals')
  @ApiOperation({ summary: 'List all pending driver/vendor approvals' })
  async getPendingApprovals(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that queue');
    return { data: await this.send('admin.taxi.pendingApprovals', { countryCode: market, scope }) };
  }

  // ── Compliance ────────────────────────────────────────────────
  @Get('compliance')
  @ApiOperation({ summary: 'Get compliance status' })
  async getCompliance(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that compliance view');
    return { data: await this.send('admin.taxi.compliance', { countryCode: market, scope }) };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get taxi admin settings' })
  async getSettings(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those settings');
    return { data: await this.send('admin.taxi.settings', { countryCode: market, scope }) };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update taxi settings' })
  async updateSettings(@Req() req: any, @Body() dto: SettingsUpdateDto) {
    const { scope, market } = this.scopeOf(req, dto?.countryCode, 'those settings');
    return {
      data: await this.send('admin.taxi.updateSettings', {
        ...this.sent(dto),
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Driver documents ──────────────────────────────────────────
  //
  // The onboarding queue. taxi-service has implemented getPendingDocuments and
  // reviewDocument all along; neither was exposed over TCP, so the admin
  // console had no route for either and the whole document-review screen 404'd.

  @Get('documents/pending')
  @ApiOperation({ summary: 'Driver and vendor documents awaiting review' })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'ownerType', required: false, enum: ['vendor', 'driver'] })
  async pendingDocuments(
    @Req() req: any,
    @Query('countryCode') countryCode?: string,
    @Query('ownerType') ownerType?: 'vendor' | 'driver',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those documents');
    return this.send('admin.taxi.documents.pending', {
      countryCode: market,
      ownerType,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      scope,
    });
  }

  @Post('documents/:documentId/approve')
  @ApiOperation({ summary: 'Approve a submitted document' })
  async approveDocument(@Req() req: any, @Param('documentId', ParseUUIDPipe) documentId: string) {
    const { scope } = this.scopeOf(req, undefined, 'that document');
    return this.send('admin.taxi.documents.review', {
      documentId,
      adminId: this.actorId(req),
      decision: 'approved',
      scope,
    });
  }

  @Post('documents/:documentId/reject')
  @ApiOperation({ summary: 'Reject a submitted document, with a reason' })
  async rejectDocument(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ReasonDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that document');
    return this.send('admin.taxi.documents.review', {
      documentId,
      adminId: this.actorId(req),
      decision: 'rejected',
      rejectionReason: dto.reason,
      scope,
    });
  }

  // ── Driver enforcement ────────────────────────────────────────

  @Post('drivers/:driverId/block')
  @ApiOperation({ summary: 'Block a driver' })
  async blockDriver(
    @Req() req: any,
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() dto: ReasonDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that driver');
    return this.send('admin.taxi.driver.block', {
      driverId,
      reason: dto.reason,
      scope,
      adminId: this.actorId(req),
    });
  }

  // ── Rate cards ────────────────────────────────────────────────
  // Distinct from `pricing` above, which is the aggregate view: these are the
  // per-country, per-vehicle-type cards the fare calculator actually reads.

  @Get('rates')
  @ApiOperation({ summary: 'Rate cards for a country' })
  @ApiQuery({ name: 'countryCode', required: true })
  async rateCards(@Req() req: any, @Query('countryCode') countryCode: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those rate cards');
    if (!market) throw new BadRequestException('countryCode is required');
    return this.send('admin.taxi.rate_cards', { countryCode: market, scope });
  }

  @Post('rates')
  @ApiOperation({ summary: 'Create or update a rate card' })
  async upsertRateCard(@Req() req: any, @Body() dto: RateCardUpsertDto) {
    const { scope, market } = this.scopeOf(req, dto?.countryCode, 'that rate card');
    if (!market) throw new BadRequestException('countryCode is required');
    return this.send('admin.taxi.rate_card.upsert', {
      ...this.sent(dto),
      countryCode: market,
      scope,
      adminId: this.actorId(req),
    });
  }

  // ── Country configuration ─────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'All country configurations' })
  async allConfigs(@Req() req: any) {
    const { scope } = this.scopeOf(req, undefined, 'those configurations');
    return this.send('admin.taxi.configs', { scope });
  }

  @Get('config/:countryCode')
  @ApiOperation({ summary: 'One country configuration' })
  async getConfig(@Req() req: any, @Param('countryCode') countryCode: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that configuration');
    return this.send('admin.taxi.config.get', { countryCode: market, scope });
  }

  @Put('config/:countryCode')
  @ApiOperation({ summary: 'Create or update a country configuration' })
  async upsertConfig(
    @Req() req: any,
    @Param('countryCode') countryCode: string,
    @Body() dto: TaxiConfigUpsertDto,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that configuration');
    return this.send('admin.taxi.config.upsert', {
      ...this.sent(dto),
      countryCode: market,
      scope,
      adminId: this.actorId(req),
    });
  }
}
