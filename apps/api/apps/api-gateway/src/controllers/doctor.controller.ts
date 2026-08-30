import {
  Controller, Get, Post, Put, UseGuards,
  Param, Body, Query, Req, Inject, Logger, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiParam, ApiQuery, ApiBody,
} from '@nestjs/swagger';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { JwtAuthGuard } from '@app/security';
import { generateDocumentId } from '@app/security';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, rpcCatch } from '@app/common';

/**
 * Doctor Gateway Controller
 *
 * All routes delegate to the doctor-service microservice via TCP message
 * patterns with a 5-second timeout. If the microservice is unreachable the
 * controller returns a minimal fallback so the gateway stays operational.
 *
 * Message patterns must match @MessagePattern decorators in
 * apps/doctor-service/src/doctor.controller.ts.
 */
@ApiTags('🩺 Doctor')
@ApiBearerAuth('JWT')
@Controller('doctor')
export class DoctorController {
  private readonly logger = new Logger(DoctorController.name);

  constructor(
    @Inject('DOCTOR_SERVICE') private readonly client: ClientProxy) {}

  /** Helper — sends a TCP message and falls back gracefully on timeout / error. */
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
        this.client
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

  /** The caller's own user id, from the verified token — never from the body. */
  private callerId(req: any): string {
    const id = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (!id) throw new ForbiddenException('Could not identify the signed-in user.');
    return String(id);
  }

  // ── Specialties ───────────────────────────────────────────────────────────

  @Get('specialties')
  @ApiOperation({ summary: 'List all medical specialties' })
  getSpecialties() {
    return this.send('get_specialties', {});
  }

  // ── Hospitals ─────────────────────────────────────────────────────────────

  @Get('hospitals')
  @ApiOperation({ summary: 'List hospitals near a location' })
  @ApiQuery({ name: 'specialty', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getHospitals(
    @Query('specialty') specialty?: string,
    @Query('city') city?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20) {
    return this.send('get_hospitals', { specialty, city, page: +page, limit: +limit });
  }

  @Get('hospitals/:hospitalId')
  @ApiOperation({ summary: 'Get a single hospital' })
  @ApiParam({ name: 'hospitalId', example: 'HSP-001' })
  getHospital(@Param('hospitalId') hospitalId: string) {
    return this.send('get_hospital', { id: hospitalId });
  }

  @Get('hospitals/:hospitalId/doctors')
  @ApiOperation({ summary: 'List doctors in a hospital' })
  @ApiParam({ name: 'hospitalId', example: 'HSP-001' })
  @ApiQuery({ name: 'specialty', required: false })
  getDoctorsByHospital(
    @Param('hospitalId') hospitalId: string,
    @Query('specialty') specialty?: string) {
    return this.send('get_hospital_doctors', { hospitalId, specialty });
  }

  @Put('hospitals/:hospitalId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update hospital status (admin)' })
  @ApiParam({ name: 'hospitalId' })
  @ApiBody({ schema: { example: { status: 'inactive' } } })
  updateHospitalStatus(
    @Param('hospitalId') hospitalId: string,
    @Body('status') status: string) {
    return this.send('update_hospital_status', { id: hospitalId, status });
  }

  // ── Clinics ───────────────────────────────────────────────────────────────

  @Get('clinics')
  @ApiOperation({ summary: 'List clinics' })
  @ApiQuery({ name: 'specialty', required: false })
  @ApiQuery({ name: 'city', required: false })
  getClinics(
    @Query('specialty') specialty?: string,
    @Query('city') city?: string) {
    return this.send('get_clinics', { specialty, city });
  }

  @Get('clinics/:clinicId')
  @ApiOperation({ summary: 'Get a single clinic' })
  @ApiParam({ name: 'clinicId' })
  getClinic(@Param('clinicId') clinicId: string) {
    return this.send('get_clinic', { id: clinicId });
  }

  @Put('clinics/:clinicId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update clinic status (admin)' })
  @ApiParam({ name: 'clinicId' })
  updateClinicStatus(
    @Param('clinicId') clinicId: string,
    @Body('status') status: string) {
    return this.send('update_clinic_status', { id: clinicId, status });
  }

  // ── Doctors ───────────────────────────────────────────────────────────────

  @Get('doctors')
  @ApiOperation({ summary: 'List doctors' })
  @ApiQuery({ name: 'specialty', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getDoctors(
    @Query('specialty') specialty?: string,
    @Query('city') city?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20) {
    return this.send('get_doctors', { specialty, city, page: +page, limit: +limit });
  }

  @Get('doctors/:doctorId')
  @ApiOperation({ summary: 'Get a doctor profile' })
  @ApiParam({ name: 'doctorId' })
  getDoctor(@Param('doctorId') doctorId: string) {
    return this.send('get_doctor', { id: doctorId });
  }

  @Get('doctors/:doctorId/slots')
  @ApiOperation({ summary: 'Get available appointment slots for a date' })
  @ApiParam({ name: 'doctorId' })
  @ApiQuery({ name: 'date', required: true, example: '2026-06-20' })
  getSlots(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string) {
    return this.send('get_doctor_slots', { doctorId, date });
  }

  @Put('doctors/:doctorId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update doctor status (admin)' })
  @ApiParam({ name: 'doctorId' })
  updateDoctorStatus(
    @Param('doctorId') doctorId: string,
    @Body('status') status: string) {
    return this.send('update_doctor_status', { id: doctorId, status });
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  /**
   * Appointment routes carry medical PII and were all unauthenticated.
   *
   * Beyond the exposure, the two "whose appointments" routes could not have
   * worked: they forwarded a literal `{}`, naming no patient and no provider, so
   * the service had nothing to scope by. The identity now comes from the
   * verified token — never from a query parameter or a request body, which would
   * just move the IDOR rather than close it.
   *
   * That earlier repair did not actually land, because it renamed the field on
   * the way through: this gateway sent `patientId` while doctor-service reads
   * `dto.customerId` and `d.customerId`. The added identity was therefore
   * ignored at every one of the three call sites, and:
   *
   *  • `book_appointment` kept taking `customerId` straight from the request
   *    body, so one customer could book an appointment recorded against another
   *    — verified: customer B booked and the row carried customer A's id;
   *  • `get_my_appointments` and `get_provider_appointments` fell through to a
   *    literal `'me'` and matched no rows, so both lists were always empty.
   *
   * The names now agree end to end. `customerId` is set from the token *after*
   * the body is spread, so a client-supplied one cannot survive.
   */
  @Post('appointments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Book an appointment' })
  @ApiBody({
    schema: {
      example: {
        doctorId: 'DOC-001', date: '2026-06-20', time: '09:00',
        type: 'in-clinic', patientName: 'A. Patient', symptoms: 'Follow-up',
      },
    },
  })
  bookAppointment(
    @Req() req: any,
    @Body() body: {
      doctorId: string; date: string; time: string;
      type?: 'in-clinic' | 'video'; patientName?: string;
      patientAge?: number; patientGender?: string; symptoms?: string;
    }) {
    return this.send('book_appointment', { ...body, customerId: this.callerId(req) });
  }

  @Get('appointments/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get my appointments (customer)' })
  getMyAppointments(@Req() req: any) {
    return this.send('get_my_appointments', { customerId: this.callerId(req) });
  }

  @Get('appointments/provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get appointments for provider (doctor portal)' })
  getProviderAppointments(@Req() req: any) {
    return this.send('get_provider_appointments', { doctorId: this.callerId(req) });
  }

  @Put('appointments/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update appointment status' })
  @ApiParam({ name: 'id' })
  updateAppointmentStatus(
    @Param('id') id: string,
    @Body('status') status: string) {
    return this.send('update_appointment_status', { id, status });
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  @Get('reviews/:targetType/:targetId')
  @ApiOperation({ summary: 'Get reviews for a doctor / hospital / clinic' })
  @ApiParam({ name: 'targetType', example: 'doctor' })
  @ApiParam({ name: 'targetId', example: 'DOC-001' })
  getReviews(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string) {
    return this.send('get_reviews', { targetType, targetId });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  // Every appointment on the platform, unauthenticated — the one admin route in
  // this controller that was missing the guard pair the other three carry.
  @Get('admin/appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all appointments (admin)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'date', required: false })
  getAllAppointments(
    @Query('status') status?: string,
    @Query('date') date?: string) {
    return this.send('get_all_appointments', { status, date });
  }

  // ── Token Queue ─────────────────────────────────────────────────────────

  @Put('doctors/:doctorId/advance-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Advance doctor token to next patient' })
  @ApiParam({ name: 'doctorId' })
  @ApiBody({ schema: { example: { doctorId: 'DOC-001', date: '2026-07-15' } } })
  advanceToken(
    @Param('doctorId') doctorId: string,
    @Body('date') date?: string) {
    return this.send('advance_token', { doctorId, date });
  }

  @Get('doctors/:doctorId/queue')
  @ApiOperation({ summary: 'Get live queue status for a doctor' })
  @ApiParam({ name: 'doctorId' })
  @ApiQuery({ name: 'date', required: false })
  getQueueStatus(
    @Param('doctorId') doctorId: string,
    @Query('date') date?: string) {
    return this.send('get_queue_status', { doctorId, date });
  }

  @Put('appointments/:id/check-in')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check in patient (arrived at facility)' })
  @ApiParam({ name: 'id' })
  checkInPatient(@Param('id') id: string) {
    return this.send('check_in_patient', { appointmentId: id });
  }

  @Put('appointments/:id/start-consultation')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Start consultation (doctor begins seeing patient)' })
  @ApiParam({ name: 'id' })
  startConsultation(@Param('id') id: string) {
    return this.send('start_consultation', { appointmentId: id });
  }

  @Put('appointments/:id/end-consultation')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'End consultation (auto-advances token to next patient)' })
  @ApiParam({ name: 'id' })
  endConsultation(@Param('id') id: string) {
    return this.send('end_consultation', { appointmentId: id });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('prescriptions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new prescription for an appointment' })
  createPrescription(@Body() dto: any) {
    return this.send('create_prescription', dto);
  }

  @Post('prescriptions/:id/issue')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Issue a prescription (mark as finalized and notify patient)' })
  @ApiParam({ name: 'id' })
  issuePrescription(@Param('id') id: string) {
    return this.send('issue_prescription', { prescriptionId: id });
  }

  // `prescriptions/my` has to stay above `prescriptions/:id`. Nest matches in
  // declaration order, and with the parameterised route first the literal
  // "my" was captured as an id and reached Postgres as
  // `invalid input syntax for type uuid: "my"` — a 500 on the patient's own
  // prescription list, hidden as an empty 200 by the old gateway fallback.

  @Get('prescriptions/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all prescriptions for the logged-in patient' })
  @ApiQuery({ name: 'customerId', required: true })
  getMyPrescriptions(@Query('customerId') customerId: string) {
    return this.send('get_prescriptions_by_patient', { customerId });
  }

  @Get('prescriptions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single prescription with medication items' })
  @ApiParam({ name: 'id' })
  getPrescription(@Param('id') id: string) {
    return this.send('get_prescription', { prescriptionId: id });
  }

  @Get('prescriptions/doctor/:doctorId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all prescriptions issued by a doctor' })
  @ApiParam({ name: 'doctorId' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  getPrescriptionsByDoctor(
    @Param('doctorId') doctorId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string) {
    return this.send('get_prescriptions_by_doctor', {
      doctorId,
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Post('prescriptions/:id/link-pharmacy')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Link a prescription to a pharmacy order for cross-sell' })
  @ApiParam({ name: 'id' })
  linkPrescriptionToPharmacy(@Param('id') id: string, @Body() dto: { pharmacyOrderId: string }) {
    return this.send('link_prescription_pharmacy', {
      prescriptionId: id, pharmacyOrderId: dto.pharmacyOrderId,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAMILY MEMBERS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('family-members')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get family members for the logged-in user' })
  @ApiQuery({ name: 'userId', required: true })
  getFamilyMembers(@Query('userId') userId: string) {
    return this.send('get_family_members', { userId });
  }

  @Post('family-members')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add a new family member' })
  addFamilyMember(@Body() dto: any) {
    return this.send('add_family_member', dto);
  }

  @Put('family-members/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a family member' })
  @ApiParam({ name: 'id' })
  updateFamilyMember(@Param('id') id: string, @Body() dto: any) {
    return this.send('update_family_member', { memberId: id, ...dto });
  }

  @Post('family-members/:id/delete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete (deactivate) a family member' })
  @ApiParam({ name: 'id' })
  deleteFamilyMember(@Param('id') id: string, @Body() dto: { userId: string }) {
    return this.send('delete_family_member', { memberId: id, userId: dto.userId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESCHEDULE
  // ═══════════════════════════════════════════════════════════════════════════

  @Put('appointments/:id/reschedule')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reschedule an appointment to a new date/time' })
  @ApiParam({ name: 'id' })
  rescheduleAppointment(@Param('id') id: string, @Body() dto: { date: string; time: string }) {
    return this.send('reschedule_appointment', {
      appointmentId: id, date: dto.date, time: dto.time,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTAKE FORMS
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('intake-forms/:appointmentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a pre-visit intake form for an appointment' })
  @ApiParam({ name: 'appointmentId' })
  submitIntakeForm(@Param('appointmentId') appointmentId: string, @Body() dto: any) {
    return this.send('submit_intake_form', { appointmentId, ...dto });
  }

  @Get('intake-forms/:appointmentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get intake form data for an appointment' })
  @ApiParam({ name: 'appointmentId' })
  getIntakeForm(@Param('appointmentId') appointmentId: string) {
    return this.send('get_intake_form', { appointmentId });
  }
}
