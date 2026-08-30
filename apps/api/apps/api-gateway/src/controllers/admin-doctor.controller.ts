import {
  Controller, Get, Post, Patch, Delete, Param,
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

  constructor(
    @Inject('DOCTOR_SERVICE') private readonly doctorClient: ClientProxy) {}

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
          .pipe(
            timeout(5000),
            catchError(rpcCatch('Doctor service unavailable')),
          ),
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
  async getDashboard() {
    return { data: await this.send('admin.doctor.dashboard', {}) };
  }

  // ── Clinics ───────────────────────────────────────────────────
  @Get('clinics')
  @ApiOperation({ summary: 'List all clinics' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getClinics(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return await this.send('admin.doctor.clinics', { page, limit, status });
  }

  @Get('clinics/:id')
  @ApiOperation({ summary: 'Get clinic detail' })
  async getClinicById(@Param('id') id: string) {
    return { data: await this.send('admin.doctor.clinicDetail', { id }) };
  }

  @Patch('clinics/:id/approve')
  @ApiOperation({ summary: 'Approve a clinic' })
  async approveClinic(@Param('id') id: string) {
    return { data: await this.send('admin.doctor.approveClinic', { id }) };
  }

  // ── Doctors ───────────────────────────────────────────────────
  @Get('doctors')
  @ApiOperation({ summary: 'List all doctors' })
  async getDoctors(@Query('page') page = 1, @Query('specialty') specialty?: string) {
    return await this.send('admin.doctor.doctors', { page, specialty });
  }

  @Get('doctors/:id')
  @ApiOperation({ summary: 'Get doctor detail' })
  async getDoctorById(@Param('id') id: string) {
    return { data: await this.send('admin.doctor.doctorDetail', { id }) };
  }

  @Patch('doctors/:id/verify')
  @ApiOperation({ summary: 'Verify a doctor credentials' })
  async verifyDoctor(@Param('id') id: string, @Body() body: { verified: boolean; notes?: string }) {
    return { data: await this.send('admin.doctor.verifyDoctor', { id, ...body }) };
  }

  @Patch('doctors/:id/suspend')
  @ApiOperation({ summary: 'Suspend a doctor' })
  async suspendDoctor(@Param('id') id: string, @Body() body: { reason: string }) {
    return { data: await this.send('admin.doctor.suspendDoctor', { id, ...body }) };
  }

  // ── Appointments ──────────────────────────────────────────────
  @Get('appointments')
  @ApiOperation({ summary: 'List all appointments' })
  async getAppointments(@Query('page') page = 1, @Query('status') status?: string) {
    return await this.send('admin.doctor.appointments', { page, status });
  }

  // ── Specialties ───────────────────────────────────────────────
  @Get('specialties')
  @ApiOperation({ summary: 'List medical specialties' })
  async getSpecialties() {
    return { data: await this.send('admin.doctor.specialties', {}) };
  }

  @Post('specialties')
  @ApiOperation({ summary: 'Create specialty' })
  async createSpecialty(@Body() body: { name: string; icon?: string; description?: string }) {
    return { data: await this.send('admin.doctor.createSpecialty', body) };
  }

  // ── Prescriptions ─────────────────────────────────────────────
  @Get('prescriptions')
  @ApiOperation({ summary: 'List prescriptions for audit' })
  async getPrescriptions(@Query('page') page = 1) {
    return await this.send('admin.doctor.prescriptions', { page });
  }

  // ── Reports ───────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Doctor platform reports' })
  async getReports(@Query('period') period = '30d') {
    return { data: await this.send('admin.doctor.reports', { period }) };
  }

  // ── Settings ──────────────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Get doctor admin settings' })
  async getSettings() {
    return { data: await this.send('admin.doctor.settings', {}) };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update doctor settings' })
  async updateSettings(@Body() body: any) {
    return { data: await this.send('admin.doctor.updateSettings', body) };
  }
}
