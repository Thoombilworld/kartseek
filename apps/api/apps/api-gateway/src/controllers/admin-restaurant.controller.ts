import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseUUIDPipe,
  Req,
  Body,
  Query,
  UseGuards,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { refuseLockedAdmin, resolveScope } from '../guards/market-scope';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import {
  AdminRestaurantAnalyticsQueryDto,
  AdminRestaurantComplaintsQueryDto,
  AdminRestaurantListQueryDto,
  AdminRestaurantMarketQueryDto,
  AdminRestaurantOrdersQueryDto,
  AdminRestaurantQueryDto,
  CreateRestaurantCuisineDto,
  CreateRestaurantZoneDto,
  ResolveComplaintDto,
  SuspendRestaurantDto,
  UpdateRestaurantCommissionDto,
} from '../dto/admin-restaurant.dto';

/**
 * Admin Restaurant Controller
 *
 * The seventeen `/admin/restaurant/*` routes, each forwarding one
 * `admin.restaurant.*` command to restaurant-service. Thirteen of those commands
 * had no handler anywhere in that module until M4; the console screens behind
 * them answered 503 (and, before M2 removed the gateway's fallbacks, a
 * fabricated empty success indistinguishable from "this market has none").
 *
 * ── `@Roles` on a method REPLACES the class-level one ───────────────────────
 *
 * So every handler that names a permission key restates `UserRole.ADMIN,
 * UserRole.SUPER_ADMIN` beside it. Omitting them does not "add a key to the
 * existing roles" — it removes the roles (documented at
 * `admin-marketplace.controller.ts:60-66`). Every key below exists in
 * `libs/common/src/admin/permissions.ts` and is held by both the `admin` and
 * `regional_admin` system roles, so this is a second gate on WHICH
 * administrator, not a change to which of them can reach the module at all.
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

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }

  /**
   * Forward to restaurant-service, preserving the failure.
   *
   * This helper used to take a `fallback` and return it as a 200 whenever the
   * service was unreachable, so an outage was indistinguishable from an empty
   * result: the listing pages showed "no results in your area" rather than "we
   * could not reach the service", and the admin screens showed empty queues
   * rather than an error. The fallback parameter is gone; failures propagate and
   * the client can tell the two apart.
   *
   * The log names the COMMAND on both paths. `rpcCatch` converts the RPC failure
   * into an `HttpException` first, so the old `if (err instanceof HttpException)
   * throw err` skipped the log entirely and an operator saw a 503 with nothing
   * anywhere saying which of the seventeen commands failed.
   */
  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await lastValueFrom(
        this.restaurantClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Restaurant service unavailable'))),
      );
    } catch (err) {
      this.logger.error(`restaurant-service error [${cmd}]: ${(err as Error)?.message}`);
      if (err instanceof HttpException) throw err;
      throw new HttpException('Restaurant service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:dashboard.view')
  @ApiOperation({ summary: 'Admin restaurant dashboard stats' })
  async getDashboard(@Req() req: any, @Query() query: AdminRestaurantMarketQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'that dashboard');
    return { data: await this.send('admin.restaurant.dashboard', { countryCode: market, scope }) };
  }

  // ── Restaurants ───────────────────────────────────────────────
  @Get('restaurants')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:sellers.view')
  @ApiOperation({ summary: 'List all restaurants with filters' })
  async getRestaurants(@Req() req: any, @Query() query: AdminRestaurantListQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those restaurants');
    return await this.send('admin.restaurant.list', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      countryCode: market,
      scope,
    });
  }

  @Get('restaurants/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:sellers.view')
  @ApiOperation({ summary: 'Get restaurant detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async getRestaurantById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that restaurant');
    return { data: await this.send('admin.restaurant.get', { id, scope }) };
  }

  @Patch('restaurants/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:sellers.approve')
  @ApiOperation({ summary: 'Approve a restaurant' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async approveRestaurant(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that restaurant');
    return {
      data: await this.send('admin.restaurant.approve', { id, scope, actorId: this.actorId(req) }),
    };
  }

  @Patch('restaurants/:id/suspend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:sellers.approve')
  @ApiOperation({ summary: 'Suspend a restaurant' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async suspendRestaurant(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SuspendRestaurantDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that restaurant');
    return {
      data: await this.send('admin.restaurant.suspend', {
        // Every explicit key after the spread: a body `{ "id": "<other>" }`
        // used to retarget the decision at a record in another market. The DTO
        // refuses one outright now, and this is the second line.
        ...body,
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Orders ────────────────────────────────────────────────────
  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:orders.view')
  @ApiOperation({ summary: 'List restaurant orders' })
  async getOrders(@Req() req: any, @Query() query: AdminRestaurantOrdersQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those orders');
    return await this.send('admin.restaurant.orders', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      type: query.type,
      countryCode: market,
      scope,
    });
  }

  // ── Menu Approvals ────────────────────────────────────────────
  @Get('menu-approvals')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:content.view')
  @ApiOperation({ summary: 'List pending menu item approvals' })
  async getMenuApprovals(@Req() req: any, @Query() query: AdminRestaurantQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'that queue');
    return await this.send('admin.restaurant.menuApprovals', {
      page: query.page,
      limit: query.limit,
      countryCode: market,
      scope,
    });
  }

  @Patch('menu-approvals/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:sellers.approve')
  @ApiOperation({ summary: 'Approve a menu item' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async approveMenuItem(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that menu item');
    return {
      data: await this.send('admin.restaurant.approveMenu', {
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Complaints ────────────────────────────────────────────────
  @Get('complaints')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:support.view')
  @ApiOperation({ summary: 'List restaurant complaints' })
  async getComplaints(@Req() req: any, @Query() query: AdminRestaurantComplaintsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those complaints');
    return await this.send('admin.restaurant.complaints', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      countryCode: market,
      scope,
    });
  }

  @Patch('complaints/:id/resolve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:support.respond')
  @ApiOperation({ summary: 'Resolve a complaint' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async resolveComplaint(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResolveComplaintDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that complaint');
    return {
      data: await this.send('admin.restaurant.resolveComplaint', {
        // Every explicit key after the spread — see `suspendRestaurant`.
        ...body,
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Commissions ───────────────────────────────────────────────
  @Get('commissions')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:finance.view')
  @ApiOperation({ summary: 'Get restaurant commission rates' })
  async getCommissions(@Req() req: any, @Query() query: AdminRestaurantQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those commission rates');
    return {
      data: await this.send('admin.restaurant.commissions', {
        page: query.page,
        limit: query.limit,
        countryCode: market,
        scope,
      }),
    };
  }

  /**
   * `finance.view` says the caller may see commercial terms; `sellers.manage`
   * says they may change a restaurant's. A write gated only by a view key is a
   * read permission that happens to write.
   */
  @Post('commissions')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    'perm:modules.restaurant',
    'perm:finance.view',
    'perm:sellers.manage',
  )
  @ApiOperation({ summary: "Change one restaurant's commission rate" })
  async updateCommissions(@Req() req: any, @Body() body: UpdateRestaurantCommissionDto) {
    const { scope, market } = this.scopeOf(req, body.countryCode, 'those commission rates');
    return {
      data: await this.send('admin.restaurant.updateCommissions', {
        restaurantId: body.restaurantId,
        commissionRate: body.commissionRate,
        countryCode: market,
        scope,
        actorId: this.actorId(req),
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
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:content.view')
  @GlobalEntity('restaurant taxonomy is shared by every market')
  @ApiOperation({ summary: 'List cuisine categories' })
  async getCuisines(@Req() req: any) {
    this.scopeOf(req, undefined, 'those cuisines');
    return { data: await this.send('admin.restaurant.cuisines', {}) };
  }

  @Post('cuisines')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:content.manage')
  @ApiOperation({ summary: 'Create a cuisine category' })
  async createCuisine(@Req() req: any, @Body() body: CreateRestaurantCuisineDto) {
    const { scope } = this.scopeOf(req, undefined, 'that cuisine');
    refuseLockedAdmin(req, 'restaurant taxonomy', 'Restaurant taxonomy is managed globally.');
    return {
      data: await this.send('admin.restaurant.createCuisine', {
        ...body,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Analytics ─────────────────────────────────────────────────
  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:finance.reports')
  @ApiOperation({ summary: 'Restaurant analytics data' })
  async getAnalytics(@Req() req: any, @Query() query: AdminRestaurantAnalyticsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those analytics');
    return {
      data: await this.send('admin.restaurant.analytics', {
        period: query.period,
        countryCode: market,
        scope,
      }),
    };
  }

  // ── Zones ─────────────────────────────────────────────────────
  @Get('zones')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:delivery.view')
  @ApiOperation({ summary: 'Get delivery zones' })
  async getZones(@Req() req: any, @Query() query: AdminRestaurantQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those delivery zones');
    return {
      data: await this.send('admin.restaurant.zones', {
        page: query.page,
        limit: query.limit,
        countryCode: market,
        scope,
      }),
    };
  }

  @Post('zones')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.restaurant', 'perm:delivery.manage')
  @ApiOperation({ summary: 'Create delivery zone' })
  async createZone(@Req() req: any, @Body() body: CreateRestaurantZoneDto) {
    const { scope, market } = this.scopeOf(req, body.countryCode, 'that delivery zone');
    return {
      data: await this.send('admin.restaurant.createZone', {
        ...body,
        // After the spread: `countryCode` here is the RESOLVED market — the
        // caller's own lock when they have one — not the value the body asked
        // for, which `scopeOf` has already refused if it named another market.
        countryCode: market,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }
}
