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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { marketScopeOf, resolveMarket, refuseLockedAdmin } from '../guards/market-scope';
import { GlobalEntity } from '../decorators/global-entity.decorator';

/**
 * Admin Grocery Controller
 *
 * Admin endpoints for managing grocery stores, products, orders,
 * delivery zones, and flash deals.
 * All endpoints require SUPER_ADMIN role.
 */
@ApiTags('👑 Admin — Grocery')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/grocery')
export class AdminGroceryController {
  private readonly logger = new Logger(AdminGroceryController.name);

  constructor(@Inject('GROCERY_SERVICE') private readonly groceryClient: ClientProxy) {}

  /**
   * Forward to grocery-service, preserving the failure.
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
        this.groceryClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Grocery service unavailable'))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`grocery-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Grocery service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /** The acting admin, from the verified token — recorded on every mutation. */
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

  // NOTE ON RESPONSE SHAPE
  // Fifteen of these handlers used to return `{ data: <payload> }`, which the
  // gateway's global TransformInterceptor then wrapped again into
  // `{ success, data: { data: <payload> } }`. The web client unwraps one envelope,
  // so callers received `{ data: payload }` and read fields off it as `undefined`
  // — while the three that did NOT wrap (stores, products, orders) worked. Nothing
  // wraps manually now; the interceptor supplies the single envelope.

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin grocery dashboard stats' })
  async getDashboard(@Req() req: any) {
    const { scope } = this.scopeOf(req, undefined, 'that dashboard');
    return this.send('admin.grocery.dashboard', { scope });
  }

  // ── Stores ────────────────────────────────────────────────────
  @Get('stores')
  @ApiOperation({ summary: 'List all grocery stores' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'regionCode', required: false })
  async getStores(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('regionCode') regionCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, regionCode, 'those stores');
    return this.send('admin.grocery.stores', {
      page,
      limit,
      status,
      search,
      regionCode: market,
      scope,
    });
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Get store detail' })
  async getStoreById(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that store');
    return this.send('admin.grocery.storeDetail', { id, scope });
  }

  @Patch('stores/:id/approve')
  @ApiOperation({ summary: 'Approve a grocery store' })
  async approveStore(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that store');
    return this.send('admin.grocery.approve', { id, actorId: this.actorId(req), scope });
  }

  @Patch('stores/:id/suspend')
  @ApiOperation({ summary: 'Suspend a grocery store' })
  async suspendStore(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that store');
    // Every explicit key after the spread: a body `{ "id": "<other>" }`
    // used to retarget the decision at a store in another market.
    return this.send('admin.grocery.suspend', {
      ...body,
      id,
      actorId: this.actorId(req),
      scope,
    });
  }

  // ── Products ──────────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'List grocery products' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'regionCode', required: false })
  async getProducts(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
    @Query('category') category?: string,
    @Query('storeId') storeId?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('regionCode') regionCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, regionCode, 'those products');
    return this.send('admin.grocery.products', {
      page,
      limit,
      category,
      storeId,
      approvalStatus,
      regionCode: market,
      scope,
    });
  }

  // ── Orders ────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'List grocery orders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'regionCode', required: false })
  async getOrders(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('storeId') storeId?: string,
    @Query('regionCode') regionCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, regionCode, 'those orders');
    return this.send('admin.grocery.orders', {
      page,
      limit,
      status,
      search,
      storeId,
      regionCode: market,
      scope,
    });
  }

  // ── Categories ────────────────────────────────────────────────
  // Grocery taxonomy (`grocery_categories`) carries no market column — it is
  // shared by every market, the same tree with per-node `countries` filtering
  // at read time, not a market-owned record. Reads are open to a locked admin;
  // writes are refused for one outright rather than silently applying platform
  // wide from whichever market's admin happened to make the request.
  @Get('categories')
  @GlobalEntity('grocery taxonomy is shared by every market')
  @ApiOperation({ summary: 'List grocery categories (shared by every market)' })
  async getCategories(@Req() req: any) {
    this.scopeOf(req, undefined, 'those categories');
    return this.send('admin.grocery.categories', {});
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Req() req: any, @Body() body: Record<string, unknown>) {
    this.scopeOf(req, undefined, 'those categories');
    refuseLockedAdmin(req, 'grocery taxonomy', 'Grocery taxonomy is managed globally.');
    return this.send('admin.grocery.createCategory', body);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.scopeOf(req, undefined, 'those categories');
    refuseLockedAdmin(req, 'grocery taxonomy', 'Grocery taxonomy is managed globally.');
    return this.send('admin.grocery.updateCategory', { ...body, id });
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(@Req() req: any, @Param('id') id: string) {
    this.scopeOf(req, undefined, 'those categories');
    refuseLockedAdmin(req, 'grocery taxonomy', 'Grocery taxonomy is managed globally.');
    return this.send('admin.grocery.deleteCategory', { id });
  }

  // ── Delivery Zones ────────────────────────────────────────────
  @Get('delivery-zones')
  @ApiOperation({ summary: 'List delivery zones' })
  @ApiQuery({ name: 'regionCode', required: false })
  async getDeliveryZones(@Req() req: any, @Query('regionCode') regionCode?: string) {
    const { scope, market } = this.scopeOf(req, regionCode, 'those delivery zones');
    return this.send('admin.grocery.deliveryZones', { regionCode: market, scope });
  }

  @Post('delivery-zones')
  @ApiOperation({ summary: 'Create delivery zone' })
  async createDeliveryZone(
    @Req() req: any,
    @Body() body: { regionCode?: string; [k: string]: unknown },
  ) {
    const { scope, market } = this.scopeOf(req, body?.regionCode, 'that delivery zone');
    return this.send('admin.grocery.createDeliveryZone', { ...body, regionCode: market, scope });
  }

  @Patch('delivery-zones/:id')
  @ApiOperation({ summary: 'Update delivery zone' })
  async updateDeliveryZone(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const { scope } = this.scopeOf(req, undefined, 'that delivery zone');
    return this.send('admin.grocery.updateDeliveryZone', { ...body, id, scope });
  }

  @Delete('delivery-zones/:id')
  @ApiOperation({ summary: 'Delete delivery zone' })
  async deleteDeliveryZone(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that delivery zone');
    return this.send('admin.grocery.deleteDeliveryZone', { id, scope });
  }

  // ── Flash Deals ───────────────────────────────────────────────
  @Get('flash-deals')
  @ApiOperation({ summary: 'List flash deals (moderation queue)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'regionCode', required: false })
  async getFlashDeals(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('storeId') storeId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('regionCode') regionCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, regionCode, 'those flash deals');
    return this.send('admin.grocery.flashDeals', {
      status,
      storeId,
      page,
      limit,
      regionCode: market,
      scope,
    });
  }

  @Post('flash-deals')
  @ApiOperation({ summary: 'Create flash deal' })
  async createFlashDeal(@Req() req: any, @Body() body: any) {
    const { scope } = this.scopeOf(req, undefined, 'that flash deal');
    return this.send('admin.grocery.createFlashDeal', { ...body, scope });
  }

  @Patch('flash-deals/:id/approve')
  @ApiOperation({ summary: 'Approve a flash deal' })
  async approveFlashDeal(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that flash deal');
    return this.send('approve_flash_deal', { dealId: id, approvedBy: this.actorId(req), scope });
  }

  @Patch('flash-deals/:id/reject')
  @ApiOperation({ summary: 'Reject a flash deal' })
  async rejectFlashDeal(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that flash deal');
    return this.send('reject_flash_deal', { dealId: id, ...body, scope });
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Grocery reports' })
  async getReports(@Req() req: any, @Query('period') period = '30d') {
    const { scope } = this.scopeOf(req, undefined, 'those reports');
    return this.send('admin.grocery.reports', { period, scope });
  }

  // ── Settings ──────────────────────────────────────────────────
  // Platform-wide policy (commission, minimum order, auto-approve) — the same
  // knobs in every market, not something a regional admin owns a copy of.
  @Get('settings')
  @ApiOperation({ summary: 'Get grocery admin settings' })
  async getSettings(@Req() req: any) {
    this.scopeOf(req, undefined, 'those settings');
    return this.send('admin.grocery.settings', {});
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update grocery settings' })
  async updateSettings(@Req() req: any, @Body() body: any) {
    const { scope } = this.scopeOf(req, undefined, 'those settings');
    // Refused here too, not only by grocery-service: a locked admin's request
    // should never reach the wire for a write that can only ever be platform
    // wide.
    refuseLockedAdmin(req, 'grocery settings', 'Grocery settings are managed globally.');
    return this.send('admin.grocery.updateSettings', {
      ...body,
      actorId: this.actorId(req),
      scope,
    });
  }
}
