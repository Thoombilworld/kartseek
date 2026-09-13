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
  AdminDoctorAppointmentsQueryDto,
  AdminDoctorClinicsQueryDto,
  AdminDoctorListQueryDto,
  AdminDoctorMarketQueryDto,
  AdminDoctorPrescriptionsQueryDto,
  AdminDoctorReportsQueryDto,
  CreateDoctorSpecialtyDto,
  SuspendDoctorDto,
  UpdateDoctorSettingsDto,
  VerifyDoctorDto,
} from '../dto/admin-doctor.dto';

/**
 * Admin Doctor Controller
 *
 * The fifteen `/admin/doctor/*` routes, each forwarding one command to
 * doctor-service.
 *
 * ── What M6 changed ─────────────────────────────────────────────────────────
 *
 * Twelve of the fifteen commands this controller sends had NO `@MessagePattern`
 * anywhere in doctor-service, so every screen but Clinics, Doctors and
 * Specialties answered "Doctor service unavailable" — an outage message for a
 * contract gap. They are implemented now
 * (`modules/doctor/backend/src/admin/admin.controller.ts`), together with the
 * market column the module never had.
 *
 * **Nothing was RENAMED.** Unlike hotel (M5) and restaurant (M4), this module
 * never adopted a second naming convention: the three commands that did have a
 * handler already answered to the dotted `admin.doctor.*` names sent from here.
 * One spelling per command, and `test/gateway-service-contract.spec.ts` holds an
 * `it` that fails if a doctor command reappears in either orphan baseline.
 *
 * ── A practitioner now has a market ─────────────────────────────────────────
 *
 * `GET /admin/doctor/doctors` used to 403 for every region-locked administrator:
 * `doctors` carried no market column, `hospitals` carries none either, and
 * doctor-service correctly refused rather than answering with every market's
 * practitioners under one market's heading. AUD2-119's ruling gave the table
 * `region_code`, denormalised from the clinic and backfilled once, so the same
 * route now returns a POPULATED, market-confined directory. A practitioner with
 * no clinic stays unattributed — absent from a scoped list, refused on detail —
 * because widening is the direction that leaks.
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
 * `system.settings` is deliberately NOT used on the settings routes: a regional
 * administrator does not hold it, and their own market's configuration is
 * exactly what those routes are for.
 *
 * ── LIST SHAPE: one shape for all five list routes ──────────────────────────
 *
 * Every list read here returns doctor-service's payload **unwrapped**. The
 * global `TransformInterceptor` puts that under `data`, so a client finds the
 * rows at `json.data.data` and the count at `json.data.total` — the same place
 * as every other admin list on this branch (M1's marketplace lists, M3's
 * pharmacy, M4's restaurant, M5's hotel).
 *
 * A second `{ data: … }` here buries the rows one level deeper than the
 * console's other screens read. Four of the five routes had one before M6, so a
 * console reading `json.data.data` everywhere else would have found nothing on
 * every doctor screen. The rule is pinned by `every list route answers with
 * data + total` in the spec, which walks the routes rather than naming them, so
 * a list route added later cannot regress it.
 *
 * SINGLE-OBJECT reads — the dashboard, a clinic, a practitioner, a report, a
 * market's settings — and every decision keep their `{ data: … }`: they carry
 * no `total`, nothing pages them, and unwrapping them would put a bare entity
 * where the console expects an object it can extend.
 */
@ApiTags('👑 Admin — Doctor')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/doctor')
export class AdminDoctorController {
  private readonly logger = new Logger(AdminDoctorController.name);

  constructor(@Inject('DOCTOR_SERVICE') private readonly doctorClient: ClientProxy) {}

  /** The acting administrator, from the verified token — recorded on decisions. */
  private actorId(req: any): string {
    return req?.user?.id ?? req?.user?.userId ?? req?.user?.sub ?? 'unknown';
  }

  /** @see resolveScope — the shared implementation. */
  private scopeOf(req: any, requested?: string, what = 'that market') {
    return resolveScope(req, requested, what);
  }

  /**
   * Forward to doctor-service, preserving the failure.
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
        this.doctorClient
          .send<T>({ cmd }, payload)
          .pipe(timeout(5000), catchError(rpcCatch('Doctor service unavailable'))),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`doctor-service error [${cmd}]: ${(err as Error)?.message}`);
      throw new HttpException('Doctor service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:dashboard.view')
  @ApiOperation({ summary: 'Admin doctor dashboard stats' })
  async getDashboard(@Req() req: any, @Query() query: AdminDoctorMarketQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'that dashboard');
    return { data: await this.send('admin.doctor.dashboard', { countryCode: market, scope }) };
  }

  // ── Clinics ───────────────────────────────────────────────────
  @Get('clinics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:sellers.view')
  @ApiOperation({ summary: 'List all clinics' })
  async getClinics(@Req() req: any, @Query() query: AdminDoctorClinicsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those clinics');
    return await this.send('admin.doctor.clinics', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      city: query.city,
      specialty: query.specialty,
      countryCode: market,
      scope,
    });
  }

  @Get('clinics/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:sellers.view')
  @ApiOperation({ summary: 'Get clinic detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async getClinicById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that clinic');
    return { data: await this.send('admin.doctor.clinicDetail', { id, scope }) };
  }

  @Patch('clinics/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:sellers.approve')
  @ApiOperation({ summary: 'Approve a clinic' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async approveClinic(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that clinic');
    return {
      data: await this.send('admin.doctor.approveClinic', {
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Doctors ───────────────────────────────────────────────────
  @Get('doctors')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:sellers.view')
  @ApiOperation({ summary: 'List all doctors' })
  async getDoctors(@Req() req: any, @Query() query: AdminDoctorListQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those doctors');
    return await this.send('admin.doctor.doctors', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      specialty: query.specialty,
      countryCode: market,
      scope,
    });
  }

  @Get('doctors/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:sellers.view')
  @ApiOperation({ summary: 'Get doctor detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async getDoctorById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that doctor');
    return { data: await this.send('admin.doctor.doctorDetail', { id, scope }) };
  }

  /**
   * `perm:kyc.approve` and not `sellers.approve`: verifying a practitioner is a
   * decision about a person's medical registration, which is the same class of
   * decision as approving a seller's identity documents and is held by the same
   * key everywhere else on this platform (pharmacy's licence verification uses
   * it too).
   */
  @Patch('doctors/:id/verify')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:kyc.approve')
  @ApiOperation({ summary: 'Verify a doctor credentials' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async verifyDoctor(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: VerifyDoctorDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that doctor');
    return {
      data: await this.send('admin.doctor.verifyDoctor', {
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

  @Patch('doctors/:id/suspend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:sellers.approve')
  @ApiOperation({ summary: 'Suspend a doctor' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async suspendDoctor(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SuspendDoctorDto,
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that doctor');
    return {
      data: await this.send('admin.doctor.suspendDoctor', {
        ...body,
        id,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Appointments ──────────────────────────────────────────────
  @Get('appointments')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:orders.view')
  @ApiOperation({ summary: 'List all appointments' })
  async getAppointments(@Req() req: any, @Query() query: AdminDoctorAppointmentsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those appointments');
    return await this.send('admin.doctor.appointments', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      date: query.date,
      countryCode: market,
      scope,
    });
  }

  // ── Prescriptions ─────────────────────────────────────────────
  @Get('prescriptions')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:orders.view')
  @ApiOperation({ summary: 'List prescriptions for audit' })
  async getPrescriptions(@Req() req: any, @Query() query: AdminDoctorPrescriptionsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those prescriptions');
    return await this.send('admin.doctor.prescriptions', {
      page: query.page,
      limit: query.limit,
      status: query.status,
      countryCode: market,
      scope,
    });
  }

  // ── Specialties ───────────────────────────────────────────────
  //
  // One catalogue for the whole platform — "Hepatology" is the same specialty
  // in every market — so it is read unfiltered. Only the write is withheld from
  // a locked admin, because adding to the catalogue would change every other
  // market's directory too.
  @Get('specialties')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:content.view')
  @GlobalEntity('doctor taxonomy is shared by every market')
  @ApiOperation({ summary: 'List medical specialties' })
  async getSpecialties(@Req() req: any) {
    this.scopeOf(req, undefined, 'those specialties');
    return await this.send('admin.doctor.specialties', {});
  }

  @Post('specialties')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:content.manage')
  @ApiOperation({ summary: 'Create specialty' })
  async createSpecialty(@Req() req: any, @Body() body: CreateDoctorSpecialtyDto) {
    const { scope } = this.scopeOf(req, undefined, 'that specialty');
    refuseLockedAdmin(req, 'doctor taxonomy', 'Doctor taxonomy is managed globally.');
    return {
      data: await this.send('admin.doctor.createSpecialty', {
        ...body,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:finance.reports')
  @ApiOperation({ summary: 'Doctor platform reports' })
  async getReports(@Req() req: any, @Query() query: AdminDoctorReportsQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those reports');
    return {
      data: await this.send('admin.doctor.reports', {
        period: query.period,
        countryCode: market,
        scope,
      }),
    };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:content.view')
  @ApiOperation({ summary: 'Get doctor admin settings' })
  async getSettings(@Req() req: any, @Query() query: AdminDoctorMarketQueryDto) {
    const { scope, market } = this.scopeOf(req, query.countryCode, 'those settings');
    return { data: await this.send('admin.doctor.settings', { countryCode: market, scope }) };
  }

  /**
   * A market's configuration, written.
   *
   * `body.countryCode` is a REQUESTED market, not an authority: `scopeOf`
   * refuses a locked administrator who names another market before any RPC is
   * made, and only the value it RESOLVES is forwarded. The spread is followed by
   * the explicit keys for the same reason it is on the two decisions above.
   */
  @Post('settings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:modules.doctor', 'perm:content.manage')
  @ApiOperation({ summary: 'Update doctor settings' })
  async updateSettings(@Req() req: any, @Body() body: UpdateDoctorSettingsDto) {
    const { scope, market } = this.scopeOf(req, body.countryCode, 'those settings');
    return {
      data: await this.send('admin.doctor.updateSettings', {
        ...body,
        countryCode: market,
        scope,
        actorId: this.actorId(req),
      }),
    };
  }
}
