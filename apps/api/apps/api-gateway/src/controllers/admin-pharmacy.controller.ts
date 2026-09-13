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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { refuseLockedAdmin, resolveScope } from '../guards/market-scope';
import { GlobalEntity } from '../decorators/global-entity.decorator';
import {
  AdminPharmacyMarketQueryDto,
  AdminPharmacyOrdersQueryDto,
  AdminPharmacyPrescriptionsQueryDto,
  AdminPharmacyProductsQueryDto,
  AdminPharmacyQueryDto,
  AdminPharmacyReportsQueryDto,
  AdminPharmacyStoresQueryDto,
  AdminPharmacyVerificationsQueryDto,
  CreatePharmacyCategoryDto,
  SuspendPharmacyDto,
  UpdatePharmacySettingsDto,
  VerifyLicenceDto,
} from '../dto/admin-pharmacy.dto';

/**
 * Admin Pharmacy Controller
 *
 * The console's pharmacy module: stores, licence verification, the catalogue,
 * orders, prescriptions, commissions, settlements, reports and settings.
 *
 * ── Permission keys ─────────────────────────────────────────────────────────
 *
 * Every route names `perm:modules.pharmacy`, and the decisions name a second
 * key for the kind of decision they are: `sellers.approve` to put a pharmacy
 * live or take it down, `kyc.approve` for a drug licence or a prescription,
 * `content.manage` for the catalogue, `finance.view`/`finance.reports` for
 * money, `system.settings` for the module's configuration. A method-level
 * `@Roles` REPLACES the class-level one rather than adding to it, so each of
 * them restates the role set alongside its keys (documented at
 * `admin-marketplace.controller.ts:60-66`), and `RolesGuard` ANDs them: a
 * caller needs a listed role and every listed key.
 *
 * `system.settings` is the one key neither the `admin` nor the `regional_admin`
 * system role holds, which is deliberate: a pharmacy settings write changes
 * what every store in a market may dispense, and pharmacy-service refuses a
 * region-locked administrator that write outright. Granting it is a decision
 * operations make per account, which is what the permission system is for.
 *
 * ── The market ──────────────────────────────────────────────────────────────
 *
 * Every handler resolves it from the signed token via `this.scopeOf(...)` and
 * forwards `scope` — set only for a region-locked administrator. A client body
 * never names a market; `countryCode` is a REQUESTED filter, and a locked admin
 * naming another market is refused here, before pharmacy-service is addressed.
 */
@ApiTags('👑 Admin — Pharmacy')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy')
@Controller('admin/pharmacy')
export class AdminPharmacyController {
  private readonly logger = new Logger(AdminPharmacyController.name);

  constructor(@Inject('PHARMACY_SERVICE') private readonly pharmacyClient: ClientProxy) {}

  /** The acting administrator, from the verified token — recorded on decisions. */
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
  }

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
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
      // Logged on BOTH paths, and the command is the whole point of the line.
      //
      // `rpcCatch` has usually already turned the RPC failure into an
      // HttpException by the time it arrives here, and the early `throw err`
      // below used to skip the log entirely — so a 503 on an admin screen
      // reached the operator as "Pharmacy service unavailable" with nothing
      // anywhere saying WHICH of the nineteen commands had failed. That is the
      // difference between "pharmacy-service is down" and "this one command has
      // no handler", which is exactly the distinction M3 exists to make
      // visible; the HTTP body stays the platform's shared wording.
      this.logger.error(`pharmacy-service error [${cmd}]: ${(err as Error)?.message}`);
      if (err instanceof HttpException) throw err;
      throw new HttpException('Pharmacy service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:dashboard.view')
  @ApiOperation({ summary: 'Admin pharmacy dashboard stats' })
  async getDashboard(@Req() req: any, @Query() q: AdminPharmacyMarketQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'that dashboard');
    return { data: await this.send('admin.pharmacy.dashboard', { countryCode: market, scope }) };
  }

  // ── Stores ────────────────────────────────────────────────────
  @Get('stores')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:sellers.view')
  @ApiOperation({ summary: 'List all pharmacies' })
  async getStores(@Req() req: any, @Query() q: AdminPharmacyStoresQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'those pharmacies');
    // Returned unwrapped: pharmacy-service answers `{ data, total, page, limit }`
    // and the global `TransformInterceptor` puts that under `data`, so the rows
    // land at `json.data.data` — the same place as every other admin list. A
    // second `{ data: … }` here would bury them one level deeper than the
    // console's other screens read.
    return await this.send('admin.pharmacy.stores', {
      page: q?.page,
      limit: q?.limit,
      status: q?.status,
      countryCode: market,
      scope,
    });
  }

  @Get('stores/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:sellers.view')
  @ApiOperation({ summary: 'Get pharmacy detail' })
  async getStoreById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that pharmacy');
    return { data: await this.send('admin.pharmacy.storeDetail', { id, scope }) };
  }

  @Patch('stores/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:sellers.approve')
  @ApiOperation({ summary: 'Approve a pharmacy' })
  async approveStore(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that pharmacy');
    return {
      data: await this.send('admin.pharmacy.approve', { id, scope, actorId: this.actorId(req) }),
    };
  }

  @Patch('stores/:id/suspend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:sellers.approve')
  @ApiOperation({ summary: 'Suspend a pharmacy' })
  async suspendStore(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SuspendPharmacyDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that pharmacy');
    return {
      data: await this.send('admin.pharmacy.suspend', {
        // Every explicit key after the spread: a body `{ "id": "<other>" }`
        // used to retarget the decision at a record in another market. The DTO
        // now refuses an `id` in the body outright (`forbidNonWhitelisted`), and
        // the order here is the second line of the same defence.
        ...body,
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Products ──────────────────────────────────────────────────
  @Get('products')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:content.view')
  @ApiOperation({ summary: 'List pharmacy products' })
  async getProducts(@Req() req: any, @Query() q: AdminPharmacyProductsQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'those products');
    return await this.send('admin.pharmacy.products', {
      page: q?.page,
      limit: q?.limit,
      category: q?.category,
      available: q?.available,
      countryCode: market,
      scope,
    });
  }

  @Patch('products/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:content.manage')
  @ApiOperation({ summary: 'Approve a pharmacy product' })
  async approveProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that product');
    return {
      data: await this.send('admin.pharmacy.approveProduct', {
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Orders ────────────────────────────────────────────────────
  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:orders.view')
  @ApiOperation({ summary: 'List pharmacy orders' })
  async getOrders(@Req() req: any, @Query() q: AdminPharmacyOrdersQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'those orders');
    return await this.send('admin.pharmacy.orders', {
      page: q?.page,
      limit: q?.limit,
      status: q?.status,
      countryCode: market,
      scope,
    });
  }

  // ── Prescriptions ─────────────────────────────────────────────
  @Get('prescriptions')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:kyc.view')
  @ApiOperation({ summary: 'List prescriptions pending review' })
  async getPrescriptions(@Req() req: any, @Query() q: AdminPharmacyPrescriptionsQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'those prescriptions');
    return await this.send('admin.pharmacy.prescriptions', {
      page: q?.page,
      limit: q?.limit,
      status: q?.status,
      countryCode: market,
      scope,
    });
  }

  @Patch('prescriptions/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:kyc.approve')
  @ApiOperation({ summary: 'Approve a prescription' })
  async approvePrescription(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that prescription');
    return {
      data: await this.send('admin.pharmacy.approvePrescription', {
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Verifications ─────────────────────────────────────────────
  //
  // A drug licence belongs to a pharmacy: this module has no separate
  // verification table, so `:id` here is a STORE id and the queue is a store
  // list. Said plainly because a reader looking for `pharmacy_verifications`
  // will not find one.
  @Get('verifications')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:kyc.view')
  @ApiOperation({ summary: 'List pharmacy licence verifications' })
  async getVerifications(@Req() req: any, @Query() q: AdminPharmacyVerificationsQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'those verifications');
    return await this.send('admin.pharmacy.verifications', {
      page: q?.page,
      limit: q?.limit,
      status: q?.status,
      countryCode: market,
      scope,
    });
  }

  @Patch('verifications/:id/verify')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:kyc.approve')
  @ApiOperation({ summary: 'Verify a pharmacy drug licence' })
  async verifyLicense(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: VerifyLicenceDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that licence');
    return {
      data: await this.send('admin.pharmacy.verifyLicense', {
        // Every explicit key after the spread — see `suspendStore`.
        ...body,
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Categories ────────────────────────────────────────────────
  //
  // One catalogue for the whole platform — "Analgesics" is the same category in
  // every market — so it is read unfiltered. Only the write is withheld from a
  // locked admin, because adding to the catalogue would change every other
  // market's shelves too. pharmacy-service refuses it a second time, so a
  // direct TCP caller meets the same ruling.
  @Get('categories')
  @GlobalEntity('pharmacy taxonomy is shared by every market')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:content.view')
  @ApiOperation({ summary: 'List pharmacy categories' })
  async getCategories(@Req() req: any) {
    this.scopeOf(req, undefined, 'those categories');
    return { data: await this.send('admin.pharmacy.categories', {}) };
  }

  @Post('categories')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:content.manage')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Req() req: any, @Body() body: CreatePharmacyCategoryDto) {
    const { scope } = this.scopeOf(req, undefined, 'that category');
    refuseLockedAdmin(req, 'pharmacy taxonomy', 'Pharmacy taxonomy is managed globally.');
    return {
      data: await this.send('admin.pharmacy.createCategory', {
        ...body,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Commissions ───────────────────────────────────────────────
  @Get('commissions')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:finance.view')
  @ApiOperation({ summary: 'Get pharmacy commission rates' })
  async getCommissions(@Req() req: any, @Query() q: AdminPharmacyMarketQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'those commission rates');
    return { data: await this.send('admin.pharmacy.commissions', { countryCode: market, scope }) };
  }

  // ── Settlements ───────────────────────────────────────────────
  @Get('settlements')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:finance.view')
  @ApiOperation({ summary: 'List pharmacy settlements' })
  async getSettlements(@Req() req: any, @Query() q: AdminPharmacyQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'those settlements');
    return await this.send('admin.pharmacy.settlements', {
      page: q?.page,
      limit: q?.limit,
      countryCode: market,
      scope,
    });
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:finance.reports')
  @ApiOperation({ summary: 'Pharmacy reports' })
  async getReports(@Req() req: any, @Query() q: AdminPharmacyReportsQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'those reports');
    return {
      data: await this.send('admin.pharmacy.reports', {
        period: q?.period,
        countryCode: market,
        scope,
      }),
    };
  }

  // ── Settings ──────────────────────────────────────────────────
  //
  // The READ carries no second key: a region-locked administrator may see the
  // settings their own market operates under, and pharmacy-service answers with
  // `source` saying whether they are the market's own or the platform defaults
  // it inherits. The WRITE is a different matter — see the class docstring.
  @Get('settings')
  @ApiOperation({ summary: 'Get pharmacy admin settings' })
  async getSettings(@Req() req: any, @Query() q: AdminPharmacyMarketQueryDto) {
    const { scope, market } = this.scopeOf(req, q?.countryCode, 'those settings');
    return { data: await this.send('admin.pharmacy.settings', { countryCode: market, scope }) };
  }

  @Post('settings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.pharmacy', 'perm:system.settings')
  @ApiOperation({ summary: 'Update pharmacy settings' })
  async updateSettings(@Req() req: any, @Body() body: UpdatePharmacySettingsDto) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'those settings');
    return {
      data: await this.send('admin.pharmacy.updateSettings', {
        ...body,
        countryCode: market,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }
}
