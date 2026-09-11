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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { marketScopeOf, resolveMarket, refuseLockedAdmin } from '../guards/market-scope';
import { GlobalEntity } from '../decorators/global-entity.decorator';

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

  constructor(@Inject('RESTAURANT_SERVICE') private readonly restaurantClient: ClientProxy) {}

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
          .pipe(timeout(5000), catchError(rpcCatch('Restaurant service unavailable'))),
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
  @ApiQuery({ name: 'countryCode', required: false })
  async getDashboard(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that dashboard');
    return { data: await this.send('admin.restaurant.dashboard', { countryCode: market, scope }) };
  }

  // ── Restaurants ───────────────────────────────────────────────
  @Get('restaurants')
  @ApiOperation({ summary: 'List all restaurants with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  async getRestaurants(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those restaurants');
    const result = await this.send('admin.restaurant.list', {
      page,
      limit,
      status,
      countryCode: market,
      scope,
    });
    return { ...(result as any), page: Number(page), limit: Number(limit) };
  }

  @Get('restaurants/:id')
  @ApiOperation({ summary: 'Get restaurant detail' })
  @ApiParam({ name: 'id' })
  async getRestaurantById(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that restaurant');
    return { data: await this.send('admin.restaurant.get', { id, scope }) };
  }

  @Patch('restaurants/:id/approve')
  @ApiOperation({ summary: 'Approve a restaurant' })
  async approveRestaurant(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that restaurant');
    return {
      data: await this.send('admin.restaurant.approve', { id, scope, adminId: this.actorId(req) }),
    };
  }

  @Patch('restaurants/:id/suspend')
  @ApiOperation({ summary: 'Suspend a restaurant' })
  async suspendRestaurant(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that restaurant');
    return {
      data: await this.send('admin.restaurant.suspend', {
        // Every explicit key after the spread: a body `{ "id": "<other>" }`
        // used to retarget the decision at a record in another market.
        ...body,
        id,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Orders ────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'List restaurant orders' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getOrders(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those orders');
    return await this.send('admin.restaurant.orders', {
      page,
      limit,
      status,
      type,
      countryCode: market,
      scope,
    });
  }

  // ── Menu Approvals ────────────────────────────────────────────
  @Get('menu-approvals')
  @ApiOperation({ summary: 'List pending menu item approvals' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getMenuApprovals(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that queue');
    return await this.send('admin.restaurant.menuApprovals', {
      page,
      countryCode: market,
      scope,
    });
  }

  @Patch('menu-approvals/:id/approve')
  @ApiOperation({ summary: 'Approve a menu item' })
  async approveMenuItem(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that menu item');
    return {
      data: await this.send('admin.restaurant.approveMenu', {
        id,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Complaints ────────────────────────────────────────────────
  @Get('complaints')
  @ApiOperation({ summary: 'List restaurant complaints' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getComplaints(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those complaints');
    return await this.send('admin.restaurant.complaints', {
      page,
      status,
      countryCode: market,
      scope,
    });
  }

  @Patch('complaints/:id/resolve')
  @ApiOperation({ summary: 'Resolve a complaint' })
  async resolveComplaint(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { resolution: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that complaint');
    return {
      data: await this.send('admin.restaurant.resolveComplaint', {
        // Every explicit key after the spread: a body `{ "id": "<other>" }`
        // used to retarget the decision at a record in another market.
        ...body,
        id,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Commissions ───────────────────────────────────────────────
  @Get('commissions')
  @ApiOperation({ summary: 'Get restaurant commission rates' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getCommissions(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those commission rates');
    return {
      data: await this.send('admin.restaurant.commissions', { countryCode: market, scope }),
    };
  }

  @Post('commissions')
  @ApiOperation({ summary: 'Update commission rates' })
  async updateCommissions(@Req() req: any, @Body() body: any) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'those commission rates');
    return {
      data: await this.send('admin.restaurant.updateCommissions', {
        ...body,
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Cuisines ──────────────────────────────────────────────────
  //
  // The cuisine list is one catalogue for the whole platform — "Levantine" is
  // the same cuisine in every market — so it is read unfiltered. Only the write
  // is withheld from a locked admin, because adding to the catalogue would
  // change every other market's menus too.
  @Get('cuisines')
  @GlobalEntity('restaurant taxonomy is shared by every market')
  @ApiOperation({ summary: 'List cuisine categories' })
  async getCuisines(@Req() req: any) {
    this.scopeOf(req, undefined, 'those cuisines');
    return { data: await this.send('admin.restaurant.cuisines', {}) };
  }

  @Post('cuisines')
  @ApiOperation({ summary: 'Create a cuisine category' })
  async createCuisine(@Req() req: any, @Body() body: { name: string; icon?: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that cuisine');
    refuseLockedAdmin(req, 'restaurant taxonomy', 'Restaurant taxonomy is managed globally.');
    return {
      data: await this.send('admin.restaurant.createCuisine', {
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Analytics ─────────────────────────────────────────────────
  @Get('analytics')
  @ApiOperation({ summary: 'Restaurant analytics data' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getAnalytics(
    @Req() req: any,
    @Query('period') period = '7d',
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those analytics');
    return {
      data: await this.send('admin.restaurant.analytics', { period, countryCode: market, scope }),
    };
  }

  // ── Zones ─────────────────────────────────────────────────────
  @Get('zones')
  @ApiOperation({ summary: 'Get delivery zones' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getZones(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those delivery zones');
    return { data: await this.send('admin.restaurant.zones', { countryCode: market, scope }) };
  }

  @Post('zones')
  @ApiOperation({ summary: 'Create delivery zone' })
  async createZone(@Req() req: any, @Body() body: any) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'that delivery zone');
    return {
      data: await this.send('admin.restaurant.createZone', {
        ...body,
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }
}
