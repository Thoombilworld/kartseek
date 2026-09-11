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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';
import { marketScopeOf, resolveMarket } from '../guards/market-scope';
import { GlobalEntity } from '../decorators/global-entity.decorator';

/**
 * Admin Doctor Controller
 *
 * Admin endpoints for managing clinics, doctors, appointments,
 * specialties, and prescriptions.
 * All endpoints require SUPER_ADMIN role.
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
  @ApiOperation({ summary: 'Admin doctor dashboard stats' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getDashboard(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'that dashboard');
    return { data: await this.send('admin.doctor.dashboard', { countryCode: market, scope }) };
  }

  // ── Clinics ───────────────────────────────────────────────────
  @Get('clinics')
  @ApiOperation({ summary: 'List all clinics' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  async getClinics(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those clinics');
    return await this.send('admin.doctor.clinics', {
      page,
      limit,
      status,
      countryCode: market,
      scope,
    });
  }

  @Get('clinics/:id')
  @ApiOperation({ summary: 'Get clinic detail' })
  async getClinicById(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that clinic');
    return { data: await this.send('admin.doctor.clinicDetail', { id, scope }) };
  }

  @Patch('clinics/:id/approve')
  @ApiOperation({ summary: 'Approve a clinic' })
  async approveClinic(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that clinic');
    return {
      data: await this.send('admin.doctor.approveClinic', {
        id,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Doctors ───────────────────────────────────────────────────
  @Get('doctors')
  @ApiOperation({ summary: 'List all doctors' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getDoctors(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('specialty') specialty?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those doctors');
    return await this.send('admin.doctor.doctors', {
      page,
      specialty,
      countryCode: market,
      scope,
    });
  }

  @Get('doctors/:id')
  @ApiOperation({ summary: 'Get doctor detail' })
  async getDoctorById(@Req() req: any, @Param('id') id: string) {
    const { scope } = this.scopeOf(req, undefined, 'that doctor');
    return { data: await this.send('admin.doctor.doctorDetail', { id, scope }) };
  }

  @Patch('doctors/:id/verify')
  @ApiOperation({ summary: 'Verify a doctor credentials' })
  async verifyDoctor(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { verified: boolean; notes?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that doctor');
    return {
      data: await this.send('admin.doctor.verifyDoctor', {
        id,
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  @Patch('doctors/:id/suspend')
  @ApiOperation({ summary: 'Suspend a doctor' })
  async suspendDoctor(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    const { scope } = this.scopeOf(req, undefined, 'that doctor');
    return {
      data: await this.send('admin.doctor.suspendDoctor', {
        id,
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Appointments ──────────────────────────────────────────────
  @Get('appointments')
  @ApiOperation({ summary: 'List all appointments' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getAppointments(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those appointments');
    return await this.send('admin.doctor.appointments', {
      page,
      status,
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
  @GlobalEntity('doctor taxonomy is shared by every market')
  @ApiOperation({ summary: 'List medical specialties' })
  async getSpecialties(@Req() req: any) {
    this.scopeOf(req, undefined, 'those specialties');
    return { data: await this.send('admin.doctor.specialties', {}) };
  }

  @Post('specialties')
  @ApiOperation({ summary: 'Create specialty' })
  async createSpecialty(
    @Req() req: any,
    @Body() body: { name: string; icon?: string; description?: string },
  ) {
    const { scope } = this.scopeOf(req, undefined, 'that specialty');
    if (marketScopeOf(req).locked)
      throw new ForbiddenException('Doctor taxonomy is managed globally.');
    return {
      data: await this.send('admin.doctor.createSpecialty', {
        ...body,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }

  // ── Prescriptions ─────────────────────────────────────────────
  @Get('prescriptions')
  @ApiOperation({ summary: 'List prescriptions for audit' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getPrescriptions(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those prescriptions');
    return await this.send('admin.doctor.prescriptions', { page, countryCode: market, scope });
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Doctor platform reports' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getReports(
    @Req() req: any,
    @Query('period') period = '30d',
    @Query('countryCode') countryCode?: string,
  ) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those reports');
    return {
      data: await this.send('admin.doctor.reports', { period, countryCode: market, scope }),
    };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get doctor admin settings' })
  @ApiQuery({ name: 'countryCode', required: false })
  async getSettings(@Req() req: any, @Query('countryCode') countryCode?: string) {
    const { scope, market } = this.scopeOf(req, countryCode, 'those settings');
    return { data: await this.send('admin.doctor.settings', { countryCode: market, scope }) };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update doctor settings' })
  async updateSettings(@Req() req: any, @Body() body: any) {
    const { scope, market } = this.scopeOf(req, body?.countryCode, 'those settings');
    return {
      data: await this.send('admin.doctor.updateSettings', {
        ...body,
        countryCode: market,
        scope,
        adminId: this.actorId(req),
      }),
    };
  }
}
