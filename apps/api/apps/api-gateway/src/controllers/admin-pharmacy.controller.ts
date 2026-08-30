import {
  Controller, Get, Post, Patch, Delete, Param,
  Body, Query, UseGuards, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';

/**
 * Admin Pharmacy Controller
 *
 * Admin endpoints for managing pharmacies, products, orders, prescriptions,
 * verifications, and settlements.
 * All endpoints require SUPER_ADMIN role.
 */
@ApiTags('👑 Admin — Pharmacy')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/pharmacy')
export class AdminPharmacyController {
  private readonly logger = new Logger(AdminPharmacyController.name);

  constructor(
    @Inject('PHARMACY_SERVICE') private readonly pharmacyClient: ClientProxy,
  ) {}

    /**
   * Forward to pharmacy-service, preserving the failure.
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
        this.pharmacyClient
          .send<T>({ cmd }, payload)
          .pipe(
            timeout(5000),
            catchError(rpcCatch('Pharmacy service unavailable')),
          ),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`pharmacy-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Pharmacy service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin pharmacy dashboard stats' })
  async getDashboard() {
    return { data: await this.send('admin.pharmacy.dashboard', {}) };
  }

  // ── Stores ────────────────────────────────────────────────────
  @Get('stores')
  @ApiOperation({ summary: 'List all pharmacies' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getStores(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return await this.send('admin.pharmacy.stores', { page, limit, status });
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Get pharmacy detail' })
  async getStoreById(@Param('id') id: string) {
    return { data: await this.send('admin.pharmacy.storeDetail', { id }) };
  }

  @Patch('stores/:id/approve')
  @ApiOperation({ summary: 'Approve a pharmacy' })
  async approveStore(@Param('id') id: string) {
    return { data: await this.send('admin.pharmacy.approve', { id }) };
  }

  @Patch('stores/:id/suspend')
  @ApiOperation({ summary: 'Suspend a pharmacy' })
  async suspendStore(@Param('id') id: string, @Body() body: { reason?: string }) {
    return { data: await this.send('admin.pharmacy.suspend', { id, ...body }) };
  }

  // ── Products ──────────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'List pharmacy products' })
  async getProducts(@Query('page') page = 1, @Query('category') category?: string) {
    return await this.send('admin.pharmacy.products', { page, category });
  }

  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve a pharmacy product' })
  async approveProduct(@Param('id') id: string) {
    return { data: await this.send('admin.pharmacy.approveProduct', { id }) };
  }

  // ── Orders ────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'List pharmacy orders' })
  async getOrders(@Query('page') page = 1, @Query('status') status?: string) {
    return await this.send('admin.pharmacy.orders', { page, status });
  }

  // ── Prescriptions ─────────────────────────────────────────────
  @Get('prescriptions')
  @ApiOperation({ summary: 'List prescriptions pending review' })
  async getPrescriptions(@Query('page') page = 1) {
    return await this.send('admin.pharmacy.prescriptions', { page });
  }

  @Patch('prescriptions/:id/approve')
  @ApiOperation({ summary: 'Approve a prescription' })
  async approvePrescription(@Param('id') id: string) {
    return { data: await this.send('admin.pharmacy.approvePrescription', { id }) };
  }

  // ── Verifications ─────────────────────────────────────────────
  @Get('verifications')
  @ApiOperation({ summary: 'List pharmacy license verifications' })
  async getVerifications(@Query('status') status?: string) {
    return { data: await this.send('admin.pharmacy.verifications', { status }) };
  }

  @Patch('verifications/:id/verify')
  @ApiOperation({ summary: 'Verify a pharmacy license' })
  async verifyLicense(@Param('id') id: string, @Body() body: { verified: boolean; notes?: string }) {
    return { data: await this.send('admin.pharmacy.verifyLicense', { id, ...body }) };
  }

  // ── Categories ────────────────────────────────────────────────
  @Get('categories')
  @ApiOperation({ summary: 'List pharmacy categories' })
  async getCategories() {
    return { data: await this.send('admin.pharmacy.categories', {}) };
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Body() body: { name: string; icon?: string }) {
    return { data: await this.send('admin.pharmacy.createCategory', body) };
  }

  // ── Commissions ───────────────────────────────────────────────
  @Get('commissions')
  @ApiOperation({ summary: 'Get pharmacy commission rates' })
  async getCommissions() {
    return { data: await this.send('admin.pharmacy.commissions', {}) };
  }

  // ── Settlements ───────────────────────────────────────────────
  @Get('settlements')
  @ApiOperation({ summary: 'List pharmacy settlements' })
  async getSettlements(@Query('page') page = 1) {
    return await this.send('admin.pharmacy.settlements', { page });
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Pharmacy reports' })
  async getReports(@Query('period') period = '30d') {
    return { data: await this.send('admin.pharmacy.reports', { period }) };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get pharmacy admin settings' })
  async getSettings() {
    return { data: await this.send('admin.pharmacy.settings', {}) };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update pharmacy settings' })
  async updateSettings(@Body() body: any) {
    return { data: await this.send('admin.pharmacy.updateSettings', body) };
  }
}
