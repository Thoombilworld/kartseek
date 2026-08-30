import {
  Controller, Get, Post, Patch, Delete, Param,
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
}
