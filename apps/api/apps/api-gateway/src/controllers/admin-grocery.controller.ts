import {
  Controller, Get, Post, Patch, Delete, Param, Req,
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

  constructor(
    @Inject('GROCERY_SERVICE') private readonly groceryClient: ClientProxy) {}

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
          .pipe(
            timeout(5000),
            catchError(rpcCatch('Grocery service unavailable')),
          ),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`grocery-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Grocery service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /** The acting admin, from the verified token — recorded on every mutation. */
  private actorId(req: any): string | undefined {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
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
  getDashboard() {
    return this.send('admin.grocery.dashboard', {});
  }

  // ── Stores ────────────────────────────────────────────────────
  @Get('stores')
  @ApiOperation({ summary: 'List all grocery stores' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  getStores(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.send('admin.grocery.stores', { page, limit, status, search });
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Get store detail' })
  getStoreById(@Param('id') id: string) {
    return this.send('admin.grocery.storeDetail', { id });
  }

  @Patch('stores/:id/approve')
  @ApiOperation({ summary: 'Approve a grocery store' })
  approveStore(@Req() req: any, @Param('id') id: string) {
    return this.send('admin.grocery.approve', { id, actorId: this.actorId(req) });
  }

  @Patch('stores/:id/suspend')
  @ApiOperation({ summary: 'Suspend a grocery store' })
  suspendStore(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.send('admin.grocery.suspend', { id, ...body, actorId: this.actorId(req) });
  }

  // ── Products ──────────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'List grocery products' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  getProducts(
    @Query('page') page = 1,
    @Query('limit') limit = 30,
    @Query('category') category?: string,
    @Query('storeId') storeId?: string,
    @Query('approvalStatus') approvalStatus?: string,
  ) {
    return this.send('admin.grocery.products', {
      page, limit, category, storeId, approvalStatus,
    });
  }

  // ── Orders ────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'List grocery orders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  getOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.send('admin.grocery.orders', { page, limit, status, search, storeId });
  }

  // ── Categories ────────────────────────────────────────────────
  @Get('categories')
  @ApiOperation({ summary: 'List grocery categories' })
  getCategories() {
    return this.send('admin.grocery.categories', {});
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  createCategory(@Body() body: Record<string, unknown>) {
    return this.send('admin.grocery.createCategory', body);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  updateCategory(@Param('id') id: string, @Body() body: any) {
    return this.send('admin.grocery.updateCategory', { ...body, id });
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete category' })
  deleteCategory(@Param('id') id: string) {
    return this.send('admin.grocery.deleteCategory', { id });
  }

  // ── Delivery Zones ────────────────────────────────────────────
  @Get('delivery-zones')
  @ApiOperation({ summary: 'List delivery zones' })
  @ApiQuery({ name: 'regionCode', required: false })
  getDeliveryZones(@Query('regionCode') regionCode?: string) {
    return this.send('admin.grocery.deliveryZones', { regionCode });
  }

  @Post('delivery-zones')
  @ApiOperation({ summary: 'Create delivery zone' })
  createDeliveryZone(@Body() body: any) {
    return this.send('admin.grocery.createDeliveryZone', body);
  }

  @Patch('delivery-zones/:id')
  @ApiOperation({ summary: 'Update delivery zone' })
  updateDeliveryZone(@Param('id') id: string, @Body() body: any) {
    return this.send('admin.grocery.updateDeliveryZone', { ...body, id });
  }

  @Delete('delivery-zones/:id')
  @ApiOperation({ summary: 'Delete delivery zone' })
  deleteDeliveryZone(@Param('id') id: string) {
    return this.send('admin.grocery.deleteDeliveryZone', { id });
  }

  // ── Flash Deals ───────────────────────────────────────────────
  @Get('flash-deals')
  @ApiOperation({ summary: 'List flash deals (moderation queue)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'storeId', required: false })
  getFlashDeals(
    @Query('status') status?: string,
    @Query('storeId') storeId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.send('admin.grocery.flashDeals', { status, storeId, page, limit });
  }

  @Post('flash-deals')
  @ApiOperation({ summary: 'Create flash deal' })
  createFlashDeal(@Body() body: any) {
    return this.send('admin.grocery.createFlashDeal', body);
  }

  @Patch('flash-deals/:id/approve')
  @ApiOperation({ summary: 'Approve a flash deal' })
  approveFlashDeal(@Req() req: any, @Param('id') id: string) {
    return this.send('approve_flash_deal', { dealId: id, approvedBy: this.actorId(req) });
  }

  @Patch('flash-deals/:id/reject')
  @ApiOperation({ summary: 'Reject a flash deal' })
  rejectFlashDeal(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.send('reject_flash_deal', { dealId: id, ...body });
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Grocery reports' })
  getReports(@Query('period') period = '30d') {
    return this.send('admin.grocery.reports', { period });
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get grocery admin settings' })
  getSettings() {
    return this.send('admin.grocery.settings', {});
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update grocery settings' })
  updateSettings(@Req() req: any, @Body() body: any) {
    return this.send('admin.grocery.updateSettings', { ...body, actorId: this.actorId(req) });
  }
}
