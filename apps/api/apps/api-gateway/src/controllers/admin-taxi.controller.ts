import {
  Controller, Get, Post, Put, Patch, Delete, Param, Req,
  Body, Query, UseGuards, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';

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

  constructor(
    @Inject('TAXI_SERVICE') private readonly taxiClient: ClientProxy,
  ) {}

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
  /** The acting administrator, from the verified token — recorded on decisions. */
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
  }

  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.taxiClient
          .send<T>({ cmd }, payload)
          .pipe(
            timeout(5000),
            catchError(rpcCatch('Taxi service unavailable')),
          ),
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
  async getDashboard() {
    return { data: await this.send('admin.taxi.dashboard', {}) };
  }

  // ── Vendors ───────────────────────────────────────────────────
  @Get('vendors')
  @ApiOperation({ summary: 'List all taxi vendors' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getVendors(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return await this.send('admin.taxi.vendors', { page, limit, status });
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Get vendor detail' })
  async getVendorById(@Param('id') id: string) {
    return { data: await this.send('admin.taxi.vendorDetail', { id }) };
  }

  @Patch('vendors/:id/approve')
  @ApiOperation({ summary: 'Approve a vendor' })
  async approveVendor(@Param('id') id: string) {
    return { data: await this.send('admin.taxi.approveVendor', { id }) };
  }

  @Patch('vendors/:id/suspend')
  @ApiOperation({ summary: 'Suspend a vendor' })
  async suspendVendor(@Param('id') id: string, @Body() body: { reason?: string }) {
    return { data: await this.send('admin.taxi.suspendVendor', { id, ...body }) };
  }

  // ── Drivers ───────────────────────────────────────────────────
  @Get('drivers')
  @ApiOperation({ summary: 'List all drivers' })
  async getDrivers(@Query('page') page = 1, @Query('status') status?: string) {
    return await this.send('admin.taxi.drivers', { page, status });
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
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('vehicleType') vehicleType?: string,
  ) {
    return this.send('admin.taxi.drivers.nearby', {
      lat: Number(lat), lng: Number(lng),
      radiusKm: radiusKm ? Number(radiusKm) : 5, vehicleType,
    });
  }

  @Get('drivers/:id')
  @ApiOperation({ summary: 'Get driver detail' })
  async getDriverById(@Param('id') id: string) {
    return { data: await this.send('admin.taxi.driverDetail', { id }) };
  }

  @Patch('drivers/:id/approve')
  @ApiOperation({ summary: 'Approve a driver' })
  async approveDriver(@Param('id') id: string) {
    return { data: await this.send('admin.taxi.approveDriver', { id }) };
  }

  @Patch('drivers/:id/suspend')
  @ApiOperation({ summary: 'Suspend a driver' })
  async suspendDriver(@Param('id') id: string, @Body() body: { reason: string }) {
    return { data: await this.send('admin.taxi.suspendDriver', { id, ...body }) };
  }

  // ── Rides ─────────────────────────────────────────────────────
  @Get('rides')
  @ApiOperation({ summary: 'List all rides' })
  async getRides(@Query('page') page = 1, @Query('status') status?: string) {
    return await this.send('admin.taxi.rides', { page, status });
  }

  @Get('rides/:id')
  @ApiOperation({ summary: 'Get ride detail' })
  async getRideById(@Param('id') id: string) {
    return { data: await this.send('admin.taxi.rideDetail', { id }) };
  }

  // ── Pricing ───────────────────────────────────────────────────
  @Get('pricing')
  @ApiOperation({ summary: 'Get pricing configuration' })
  async getPricing() {
    return { data: await this.send('admin.taxi.pricing', {}) };
  }

  @Post('pricing')
  @ApiOperation({ summary: 'Update pricing' })
  async updatePricing(@Body() body: any) {
    return { data: await this.send('admin.taxi.updatePricing', body) };
  }

  // ── Surge ─────────────────────────────────────────────────────
  @Get('surge')
  @ApiOperation({ summary: 'Get surge pricing zones' })
  async getSurge() {
    return { data: await this.send('admin.taxi.surge', {}) };
  }

  @Post('surge')
  @ApiOperation({ summary: 'Update surge settings' })
  async updateSurge(@Body() body: any) {
    return { data: await this.send('admin.taxi.updateSurge', body) };
  }

  // ── Complaints ────────────────────────────────────────────────
  @Get('complaints')
  @ApiOperation({ summary: 'List taxi complaints' })
  async getComplaints(@Query('page') page = 1, @Query('status') status?: string) {
    return await this.send('admin.taxi.complaints', { page, status });
  }

  @Patch('complaints/:id/resolve')
  @ApiOperation({ summary: 'Resolve a complaint' })
  async resolveComplaint(@Param('id') id: string, @Body() body: { resolution: string }) {
    return { data: await this.send('admin.taxi.resolveComplaint', { id, ...body }) };
  }

  // ── Fleet ─────────────────────────────────────────────────────
  @Get('fleet')
  @ApiOperation({ summary: 'List fleet vehicles' })
  async getFleet(@Query('page') page = 1) {
    return await this.send('admin.taxi.fleet', { page });
  }

  // ── Payouts ───────────────────────────────────────────────────
  @Get('payouts')
  @ApiOperation({ summary: 'List driver payouts' })
  async getPayouts(@Query('page') page = 1, @Query('status') status?: string) {
    return await this.send('admin.taxi.payouts', { page, status });
  }

  @Post('payouts/:id/approve')
  @ApiOperation({ summary: 'Approve a payout' })
  async approvePayout(@Param('id') id: string) {
    return { data: await this.send('admin.taxi.approvePayout', { id }) };
  }

  // ── Routes ────────────────────────────────────────────────────
  @Get('routes')
  @ApiOperation({ summary: 'List fixed routes' })
  async getRoutes() {
    return { data: await this.send('admin.taxi.routes', {}) };
  }

  @Post('routes')
  @ApiOperation({ summary: 'Create route' })
  async createRoute(@Body() body: any) {
    return { data: await this.send('admin.taxi.createRoute', body) };
  }

  // ── Pending Approvals ─────────────────────────────────────────
  @Get('pending-approvals')
  @ApiOperation({ summary: 'List all pending driver/vendor approvals' })
  async getPendingApprovals() {
    return { data: await this.send('admin.taxi.pendingApprovals', {}) };
  }

  // ── Compliance ────────────────────────────────────────────────
  @Get('compliance')
  @ApiOperation({ summary: 'Get compliance status' })
  async getCompliance() {
    return { data: await this.send('admin.taxi.compliance', {}) };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get taxi admin settings' })
  async getSettings() {
    return { data: await this.send('admin.taxi.settings', {}) };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update taxi settings' })
  async updateSettings(@Body() body: any) {
    return { data: await this.send('admin.taxi.updateSettings', body) };
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
    @Query('countryCode') countryCode?: string,
    @Query('ownerType') ownerType?: 'vendor' | 'driver',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.send('admin.taxi.documents.pending', {
      countryCode, ownerType, page: page ? +page : 1, limit: limit ? +limit : 20,
    });
  }

  @Post('documents/:documentId/approve')
  @ApiOperation({ summary: 'Approve a submitted document' })
  async approveDocument(@Req() req: any, @Param('documentId') documentId: string) {
    return this.send('admin.taxi.documents.review', {
      documentId, adminId: this.actorId(req), decision: 'approved',
    });
  }

  @Post('documents/:documentId/reject')
  @ApiOperation({ summary: 'Reject a submitted document, with a reason' })
  async rejectDocument(
    @Req() req: any,
    @Param('documentId') documentId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.send('admin.taxi.documents.review', {
      documentId, adminId: this.actorId(req), decision: 'rejected', rejectionReason: dto?.reason,
    });
  }

  // ── Driver enforcement ────────────────────────────────────────

  @Post('drivers/:driverId/block')
  @ApiOperation({ summary: 'Block a driver' })
  async blockDriver(@Param('driverId') driverId: string, @Body() dto: { reason?: string }) {
    return this.send('admin.taxi.driver.block', { driverId, reason: dto?.reason ?? '' });
  }

  // ── Rate cards ────────────────────────────────────────────────
  // Distinct from `pricing` above, which is the aggregate view: these are the
  // per-country, per-vehicle-type cards the fare calculator actually reads.

  @Get('rates')
  @ApiOperation({ summary: 'Rate cards for a country' })
  @ApiQuery({ name: 'countryCode', required: true })
  async rateCards(@Query('countryCode') countryCode: string) {
    return this.send('admin.taxi.rate_cards', { countryCode });
  }

  @Post('rates')
  @ApiOperation({ summary: 'Create or update a rate card' })
  async upsertRateCard(@Body() dto: { countryCode: string; vehicleType: string; [k: string]: unknown }) {
    return this.send('admin.taxi.rate_card.upsert', dto);
  }

  // ── Country configuration ─────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'All country configurations' })
  async allConfigs() {
    return this.send('admin.taxi.configs', {});
  }

  @Get('config/:countryCode')
  @ApiOperation({ summary: 'One country configuration' })
  async getConfig(@Param('countryCode') countryCode: string) {
    return this.send('admin.taxi.config.get', { countryCode });
  }

  @Put('config/:countryCode')
  @ApiOperation({ summary: 'Create or update a country configuration' })
  async upsertConfig(@Param('countryCode') countryCode: string, @Body() dto: Record<string, unknown>) {
    return this.send('admin.taxi.config.upsert', { countryCode, ...dto });
  }

  // ── Payout batches ────────────────────────────────────────────

  @Post('payouts/process')
  @ApiOperation({ summary: 'Process a batch of approved payouts' })
  async processPayouts(@Body() dto: { payoutIds?: string[] }) {
    return this.send('admin.taxi.payouts.process', { payoutIds: dto?.payoutIds ?? [] });
  }

  @Get('payouts/summary')
  @ApiOperation({ summary: 'Platform payout totals' })
  async payoutSummary(
    @Query('countryCode') countryCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.send('admin.taxi.payouts.summary', { countryCode, startDate, endDate });
  }

}
