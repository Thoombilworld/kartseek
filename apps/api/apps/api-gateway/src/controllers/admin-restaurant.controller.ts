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
 * Admin Restaurant Controller
 *
 * Admin endpoints for managing restaurants, orders, menus, complaints, commissions, and cuisines.
 * All endpoints require SUPER_ADMIN role.
 */
@ApiTags('👑 Admin — Restaurant')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/restaurant')
export class AdminRestaurantController {
  private readonly logger = new Logger(AdminRestaurantController.name);

  constructor(
    @Inject('RESTAURANT_SERVICE') private readonly restaurantClient: ClientProxy,
  ) {}

    /**
   * Forward to restaurant-service, preserving the failure.
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
        this.restaurantClient
          .send<T>({ cmd }, payload)
          .pipe(
            timeout(5000),
            catchError(rpcCatch('Restaurant service unavailable')),
          ),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`restaurant-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Restaurant service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin restaurant dashboard stats' })
  async getDashboard() {
    return { data: await this.send('admin.restaurant.dashboard', {}) };
  }

  // ── Restaurants ───────────────────────────────────────────────
  @Get('restaurants')
  @ApiOperation({ summary: 'List all restaurants with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getRestaurants(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    const result = await this.send('admin.restaurant.list', { page, limit, status });
    return { ...(result as any), page: Number(page), limit: Number(limit) };
  }

  @Get('restaurants/:id')
  @ApiOperation({ summary: 'Get restaurant detail' })
  @ApiParam({ name: 'id' })
  async getRestaurantById(@Param('id') id: string) {
    return { data: await this.send('admin.restaurant.get', { id }) };
  }

  @Patch('restaurants/:id/approve')
  @ApiOperation({ summary: 'Approve a restaurant' })
  async approveRestaurant(@Param('id') id: string) {
    return { data: await this.send('admin.restaurant.approve', { id }) };
  }

  @Patch('restaurants/:id/suspend')
  @ApiOperation({ summary: 'Suspend a restaurant' })
  async suspendRestaurant(@Param('id') id: string, @Body() body: { reason?: string }) {
    return { data: await this.send('admin.restaurant.suspend', { id, ...body }) };
  }

  // ── Orders ────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'List restaurant orders' })
  async getOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return await this.send('admin.restaurant.orders', { page, limit, status, type });
  }

  // ── Menu Approvals ────────────────────────────────────────────
  @Get('menu-approvals')
  @ApiOperation({ summary: 'List pending menu item approvals' })
  async getMenuApprovals(@Query('page') page = 1) {
    return await this.send('admin.restaurant.menuApprovals', { page });
  }

  @Patch('menu-approvals/:id/approve')
  @ApiOperation({ summary: 'Approve a menu item' })
  async approveMenuItem(@Param('id') id: string) {
    return { data: await this.send('admin.restaurant.approveMenu', { id }) };
  }

  // ── Complaints ────────────────────────────────────────────────
  @Get('complaints')
  @ApiOperation({ summary: 'List restaurant complaints' })
  async getComplaints(@Query('page') page = 1, @Query('status') status?: string) {
    return await this.send('admin.restaurant.complaints', { page, status });
  }

  @Patch('complaints/:id/resolve')
  @ApiOperation({ summary: 'Resolve a complaint' })
  async resolveComplaint(@Param('id') id: string, @Body() body: { resolution: string }) {
    return { data: await this.send('admin.restaurant.resolveComplaint', { id, ...body }) };
  }

  // ── Commissions ───────────────────────────────────────────────
  @Get('commissions')
  @ApiOperation({ summary: 'Get restaurant commission rates' })
  async getCommissions() {
    return { data: await this.send('admin.restaurant.commissions', {}) };
  }

  @Post('commissions')
  @ApiOperation({ summary: 'Update commission rates' })
  async updateCommissions(@Body() body: any) {
    return { data: await this.send('admin.restaurant.updateCommissions', body) };
  }

  // ── Cuisines ──────────────────────────────────────────────────
  @Get('cuisines')
  @ApiOperation({ summary: 'List cuisine categories' })
  async getCuisines() {
    return { data: await this.send('admin.restaurant.cuisines', {}) };
  }

  @Post('cuisines')
  @ApiOperation({ summary: 'Create a cuisine category' })
  async createCuisine(@Body() body: { name: string; icon?: string }) {
    return { data: await this.send('admin.restaurant.createCuisine', body) };
  }

  // ── Analytics ─────────────────────────────────────────────────
  @Get('analytics')
  @ApiOperation({ summary: 'Restaurant analytics data' })
  async getAnalytics(@Query('period') period = '7d') {
    return { data: await this.send('admin.restaurant.analytics', { period }) };
  }

  // ── Zones ─────────────────────────────────────────────────────
  @Get('zones')
  @ApiOperation({ summary: 'Get delivery zones' })
  async getZones() {
    return { data: await this.send('admin.restaurant.zones', {}) };
  }

  @Post('zones')
  @ApiOperation({ summary: 'Create delivery zone' })
  async createZone(@Body() body: any) {
    return { data: await this.send('admin.restaurant.createZone', body) };
  }
}
