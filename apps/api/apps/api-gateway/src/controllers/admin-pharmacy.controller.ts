import {
  Controller,
  Get,
  Post,
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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { marketScopeOf, resolveMarket } from '../guards/market-scope';
import { GlobalEntity } from '../decorators/global-entity.decorator';

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

  constructor(@Inject('PHARMACY_SERVICE') private readonly pharmacyClient: ClientProxy) {}

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
          .pipe(timeout(5000), catchError(rpcCatch('Pharmacy service unavailable'))),
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
  @ApiQuery({ name: 'countryCode', required: false })
  async getDashboard(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that dashboard');
    return { data: await this.send('admin.pharmacy.dashboard', { countryCode: market, scope }) };
  }

  // ── Stores ────────────────────────────────────────────────────
  @Get('stores')
  @ApiOperation({ summary: 'List all pharmacies' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  async getStores(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those pharmacies');
    return await this.send('admin.pharmacy.stores', {
      page,
      limit,
      status,
      countryCode: market,
      scope,
    });
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Get pharmacy detail' })
  async getStoreById(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that pharmacy');
    return { data: await this.send('admin.pharmacy.storeDetail', { id, scope }) };
  }

  @Patch('stores/:id/approve')
  @ApiOperation({ summary: 'Approve a pharmacy' })
  async approveStore(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that pharmacy');
    return {
      data: await this.send('admin.pharmacy.approve', { id, scope, adminId: this.actorId(req) }),
    };
  }

  @Patch('stores/:id/suspend')
  @ApiOperation({ summary: 'Suspend a pharmacy' })
  async suspendStore(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that pharmacy');
    return {
      data: await this.send('admin.pharmacy.suspend', {
        id,
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Products ──────────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'List pharmacy products' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getProducts(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('category') category?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those products');
    return await this.send('admin.pharmacy.products', {
      page,
      category,
      countryCode: market,
      scope,
    });
  }

  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve a pharmacy product' })
  async approveProduct(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    return {
      data: await this.send('admin.pharmacy.approveProduct', {
        id,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Orders ────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'List pharmacy orders' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getOrders(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those orders');
    return await this.send('admin.pharmacy.orders', { page, status, countryCode: market, scope });
  }

  // ── Prescriptions ─────────────────────────────────────────────
  @Get('prescriptions')
  @ApiOperation({ summary: 'List prescriptions pending review' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getPrescriptions(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those prescriptions');
    return await this.send('admin.pharmacy.prescriptions', { page, countryCode: market, scope });
  }

  @Patch('prescriptions/:id/approve')
  @ApiOperation({ summary: 'Approve a prescription' })
  async approvePrescription(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that prescription');
    return {
      data: await this.send('admin.pharmacy.approvePrescription', {
        id,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Verifications ─────────────────────────────────────────────
  @Get('verifications')
  @ApiOperation({ summary: 'List pharmacy license verifications' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getVerifications(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those verifications');
    return {
      data: await this.send('admin.pharmacy.verifications', { status, countryCode: market, scope }),
    };
  }

  @Patch('verifications/:id/verify')
  @ApiOperation({ summary: 'Verify a pharmacy license' })
  async verifyLicense(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { verified: boolean; notes?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that licence');
    return {
      data: await this.send('admin.pharmacy.verifyLicense', {
        id,
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Categories ────────────────────────────────────────────────
  //
  // One catalogue for the whole platform — "Analgesics" is the same category in
  // every market — so it is read unfiltered. Only the write is withheld from a
  // locked admin, because adding to the catalogue would change every other
  // market's shelves too.
  @Get('categories')
  @GlobalEntity('pharmacy taxonomy is shared by every market')
  @ApiOperation({ summary: 'List pharmacy categories' })
  async getCategories(@Req() req: any) {
    this.scopeOf(req, undefined, 'those categories');
    return { data: await this.send('admin.pharmacy.categories', {}) };
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Req() req: any, @Body() body: { name: string; icon?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that category');
    if (marketScopeOf(req).locked)
      throw new ForbiddenException('Pharmacy taxonomy is managed globally.');
    return {
      data: await this.send('admin.pharmacy.createCategory', {
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Commissions ───────────────────────────────────────────────
  @Get('commissions')
  @ApiOperation({ summary: 'Get pharmacy commission rates' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getCommissions(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those commission rates');
    return { data: await this.send('admin.pharmacy.commissions', { countryCode: market, scope }) };
  }

  // ── Settlements ───────────────────────────────────────────────
  @Get('settlements')
  @ApiOperation({ summary: 'List pharmacy settlements' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getSettlements(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those settlements');
    return await this.send('admin.pharmacy.settlements', { page, countryCode: market, scope });
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Pharmacy reports' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getReports(
    @Req() req: any,
    @Query('period') period = '30d',
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those reports');
    return {
      data: await this.send('admin.pharmacy.reports', { period, countryCode: market, scope }),
    };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get pharmacy admin settings' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getSettings(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those settings');
    return { data: await this.send('admin.pharmacy.settings', { countryCode: market, scope }) };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update pharmacy settings' })
  async updateSettings(@Req() req: any, @Body() body: any) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'those settings');
    return {
      data: await this.send('admin.pharmacy.updateSettings', {
        ...body,
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }
}
