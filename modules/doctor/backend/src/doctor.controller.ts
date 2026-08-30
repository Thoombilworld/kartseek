import { Controller, Get, Post, Put, Param, Body, Query, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DoctorService } from './doctor.service';
import { FranchiseViewService } from './franchise/franchise-view.service';
import { DtoMessage, EmptyMessage, PaginatedMessage, RpcAwareExceptionsFilter, requireId } from '@app/common';
import {
  CreateAppointmentDto, UpdateAppointmentStatusDto, AdvanceTokenDto,
  UpdateDoctorStatusDto, UpdateHospitalStatusDto, UpdateClinicStatusDto,
  CreatePrescriptionDto, IssuePrescriptionDto, LinkPharmacyDto,
} from './dto/doctor.dto';

@UseFilters(RpcAwareExceptionsFilter)
@Controller('doctors')
export class DoctorController {
  constructor(
    private readonly svc: DoctorService,
    private readonly franchiseView: FranchiseViewService,
  ) {}

  // ── Health ────────────────────────────────────────────────────────────────
  @Get('health')
  health() { return this.svc.healthCheck(); }

  // ── Specialties ───────────────────────────────────────────────────────────
  @Get('specialties')
  getSpecialties() { return this.svc.getSpecialties(); }

  // ── Hospitals ─────────────────────────────────────────────────────────────
  @Get('hospitals')
  getHospitals(
    @Query('city') city?: string,
    @Query('specialty') specialty?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) { return this.svc.getHospitals(city, specialty, +page, +limit); }

  @Get('hospitals/:id')
  getHospitalById(@Param('id') id: string) { return this.svc.getHospitalById(id); }

  @Get('hospitals/:id/doctors')
  getDoctorsByHospital(
    @Param('id') id: string,
    @Query('specialty') specialty?: string,
  ) { return this.svc.getDoctorsByHospital(id, specialty); }

  @Put('hospitals/:id/status')
  updateHospitalStatus(@Param('id') id: string, @Body() dto: UpdateHospitalStatusDto) {
    return this.svc.updateHospitalStatus(id, dto.status);
  }

  // ── Clinics ───────────────────────────────────────────────────────────────
  @Get('clinics')
  getClinics(
    @Query('city') city?: string,
    @Query('specialty') specialty?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) { return this.svc.getClinics(city, specialty, +page, +limit); }

  @Get('clinics/:id')
  getClinicById(@Param('id') id: string) { return this.svc.getClinicById(id); }

  @Get('clinics/:id/doctors')
  getDoctorsByClinic(
    @Param('id') id: string,
    @Query('specialty') specialty?: string,
  ) { return this.svc.getDoctorsByClinic(id, specialty); }

  @Put('clinics/:id/status')
  updateClinicStatus(@Param('id') id: string, @Body() dto: UpdateClinicStatusDto) {
    return this.svc.updateClinicStatus(id, dto.status);
  }

  // ── Doctors ───────────────────────────────────────────────────────────────
  @Get()
  getDoctors(
    @Query('specialty') specialty?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) { return this.svc.getDoctors(specialty, +page, +limit); }

  @Get(':id')
  getDoctorById(@Param('id') id: string) { return this.svc.getDoctorById(id); }

  @Get(':id/slots')
  getSlots(@Param('id') id: string, @Query('date') date: string) {
    return this.svc.getAvailableSlots(id, date);
  }

  @Put(':id/status')
  updateDoctorStatus(@Param('id') id: string, @Body() dto: UpdateDoctorStatusDto) {
    return this.svc.updateDoctorStatus(id, dto.status);
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  @Post('appointments')
  book(@Body() dto: CreateAppointmentDto) { return this.svc.bookAppointment(dto); }

  @Get('appointments/doctor/:doctorId')
  getAppointmentsByDoctor(@Param('doctorId') doctorId: string) {
    return this.svc.getAppointmentsByDoctor(doctorId);
  }

  @Get('appointments/customer/:customerId')
  getAppointmentsByCustomer(@Param('customerId') customerId: string) {
    return this.svc.getAppointmentsByCustomer(customerId);
  }

  @Get('appointments/:id')
  getAppointment(@Param('id') id: string) { return this.svc.getAppointmentById(id); }

  @Put('appointments/:id/status')
  updateAppointmentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) { return this.svc.updateAppointmentStatus(id, dto.status, dto.reason); }

  // ── Token Queue ────────────────────────────────────────────────────────────

  @Put(':id/advance-token')
  advanceToken(@Param('id') doctorId: string, @Body() dto: AdvanceTokenDto) {
    return this.svc.advanceToken(doctorId, dto.date);
  }

  @Get(':id/queue')
  getQueueStatus(@Param('id') doctorId: string, @Query('date') date?: string) {
    return this.svc.getQueueStatus(doctorId, date);
  }

  @Put('appointments/:id/check-in')
  checkIn(@Param('id') id: string) { return this.svc.checkInPatient(id); }

  @Put('appointments/:id/start-consultation')
  startConsultation(@Param('id') id: string) { return this.svc.startConsultation(id); }

  @Put('appointments/:id/end-consultation')
  endConsultation(@Param('id') id: string) { return this.svc.endConsultation(id); }

  // ── Reviews ───────────────────────────────────────────────────────────────
  @Get('reviews/:targetType/:targetId')
  getReviews(@Param('targetType') targetType: string, @Param('targetId') targetId: string) {
    return this.svc.getReviews(targetType, targetId);
  }

  // ── TCP Microservice Message Patterns ─────────────────────────────────────
  // These mirror every command sent by the API Gateway's DoctorController.

  @MessagePattern({ cmd: 'get_specialties' })
  msgSpecialties() { return this.svc.getSpecialties(); }

  @MessagePattern({ cmd: 'get_hospitals' })
  msgHospitals(@Payload() d: { city?: string; specialty?: string; page?: number; limit?: number }) {
    return this.svc.getHospitals(d.city, d.specialty, d.page ?? 1, d.limit ?? 20);
  }

  @MessagePattern({ cmd: 'get_hospital' })
  msgHospital(@Payload() d: { id: string }) { return this.svc.getHospitalById(d.id); }

  @MessagePattern({ cmd: 'get_hospital_doctors' })
  msgHospitalDoctors(@Payload() d: { hospitalId: string; specialty?: string }) {
    return this.svc.getDoctorsByHospital(d.hospitalId, d.specialty);
  }

  @MessagePattern({ cmd: 'update_hospital_status' })
  msgUpdateHospitalStatus(@Payload() d: { id: string; status: string }) {
    return this.svc.updateHospitalStatus(d.id, d.status);
  }

  @MessagePattern({ cmd: 'get_clinics' })
  msgClinics(@Payload() d: { city?: string; specialty?: string; page?: number; limit?: number }) {
    return this.svc.getClinics(d.city, d.specialty, d.page ?? 1, d.limit ?? 20);
  }

  @MessagePattern({ cmd: 'get_clinic' })
  msgClinic(@Payload() d: { id: string }) { return this.svc.getClinicById(d.id); }

  @MessagePattern({ cmd: 'update_clinic_status' })
  msgUpdateClinicStatus(@Payload() d: { id: string; status: string }) {
    return this.svc.updateClinicStatus(d.id, d.status);
  }

  @MessagePattern({ cmd: 'get_doctors' })
  msgDoctors(@Payload() d: { specialty?: string; page?: number; limit?: number }) {
    return this.svc.getDoctors(d.specialty, d.page ?? 1, d.limit ?? 20);
  }

  @MessagePattern({ cmd: 'get_doctor' })
  msgDoctor(@Payload() d: { id: string }) { return this.svc.getDoctorById(d.id); }

  @MessagePattern({ cmd: 'get_doctor_slots' })
  msgSlots(@Payload() d: { doctorId: string; date: string }) {
    return this.svc.getAvailableSlots(d.doctorId, d.date);
  }

  @MessagePattern({ cmd: 'update_doctor_status' })
  msgUpdateDoctorStatus(@Payload() d: { id: string; status: string }) {
    return this.svc.updateDoctorStatus(d.id, d.status);
  }

  @MessagePattern({ cmd: 'book_appointment' })
  msgBook(@Payload() d: CreateAppointmentDto) { return this.svc.bookAppointment(d); }

  /**
   * The gateway sends `patientId` and `providerId`; these handlers read
   * `customerId` and `doctorId`. Neither name ever matched, so both fell through
   * to the literal string `'me'` and queried `where: { customerId: 'me' }` — a
   * value no row holds. `GET /doctor/appointments/me` therefore returned an
   * empty list for every customer no matter how many appointments they had, and
   * the provider queue did the same for every doctor.
   *
   * It went unnoticed because `doctor.appointments` is empty in development: an
   * empty result is indistinguishable from a correct one until somebody books.
   *
   * Both names are accepted so the gateway can be corrected independently, and a
   * missing id is refused rather than turned into a query that silently matches
   * nothing.
   */
  @MessagePattern({ cmd: 'get_my_appointments' })
  msgMyAppointments(@Payload() d: { customerId?: string; patientId?: string }) {
    return this.svc.getAppointmentsByCustomer(requireId(d?.patientId ?? d?.customerId, 'patient'));
  }

  @MessagePattern({ cmd: 'get_provider_appointments' })
  msgProviderAppointments(@Payload() d: { doctorId?: string; providerId?: string }) {
    return this.svc.getAppointmentsByDoctor(requireId(d?.providerId ?? d?.doctorId, 'provider'));
  }

  @MessagePattern({ cmd: 'update_appointment_status' })
  msgUpdateAppointmentStatus(@Payload() d: { id: string; status: string; reason?: string }) {
    return this.svc.updateAppointmentStatus(d.id, d.status, d.reason);
  }

  @MessagePattern({ cmd: 'get_reviews' })
  msgReviews(@Payload() d: { targetType: string; targetId: string }) {
    return this.svc.getReviews(d.targetType, d.targetId);
  }

  @MessagePattern({ cmd: 'get_all_appointments' })
  msgAllAppointments(@Payload() d: { status?: string; date?: string }) {
    return this.svc.getAllAppointments(d.status, d.date);
  }

  // ── Token Queue TCP ────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'advance_token' })
  msgAdvanceToken(@Payload() d: { doctorId: string; date?: string }) {
    return this.svc.advanceToken(d.doctorId, d.date);
  }

  @MessagePattern({ cmd: 'get_queue_status' })
  msgQueueStatus(@Payload() d: { doctorId: string; date?: string }) {
    return this.svc.getQueueStatus(d.doctorId, d.date);
  }

  @MessagePattern({ cmd: 'check_in_patient' })
  msgCheckIn(@Payload() d: { appointmentId: string }) {
    return this.svc.checkInPatient(d.appointmentId);
  }

  @MessagePattern({ cmd: 'start_consultation' })
  msgStartConsultation(@Payload() d: { appointmentId: string }) {
    return this.svc.startConsultation(d.appointmentId);
  }

  @MessagePattern({ cmd: 'end_consultation' })
  msgEndConsultation(@Payload() d: { appointmentId: string }) {
    return this.svc.endConsultation(d.appointmentId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTIONS — REST
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('prescriptions')
  createPrescription(
    @Body() dto: CreatePrescriptionDto,
    @Body('doctorId') doctorId: string,
  ) {
    return this.svc.createPrescription(doctorId, dto);
  }

  @Post('prescriptions/:id/issue')
  issuePrescription(@Param('id') id: string) {
    return this.svc.issuePrescription(id);
  }

  @Get('prescriptions/:id')
  getPrescription(@Param('id') id: string) {
    return this.svc.getPrescription(id);
  }

  @Get('prescriptions/patient/:customerId')
  getPrescriptionsByPatient(@Param('customerId') customerId: string) {
    return this.svc.getPrescriptionsByPatient(customerId);
  }

  @Get('prescriptions/doctor/:doctorId')
  getPrescriptionsByDoctor(
    @Param('doctorId') doctorId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.getPrescriptionsByDoctor(doctorId, {
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Post('prescriptions/:id/link-pharmacy')
  linkToPharmacy(@Param('id') id: string, @Body() dto: LinkPharmacyDto) {
    return this.svc.linkToPharmacy(id, dto.pharmacyOrderId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTIONS — TCP MessagePatterns
  // ═══════════════════════════════════════════════════════════════════════════

  @MessagePattern({ cmd: 'create_prescription' })
  msgCreateRx(@Payload() d: CreatePrescriptionDto & { doctorId: string }) {
    return this.svc.createPrescription(d.doctorId, d);
  }

  @MessagePattern({ cmd: 'issue_prescription' })
  msgIssueRx(@Payload() d: { prescriptionId: string }) {
    return this.svc.issuePrescription(d.prescriptionId);
  }

  @MessagePattern({ cmd: 'get_prescription' })
  msgGetRx(@Payload() d: { prescriptionId: string }) {
    return this.svc.getPrescription(d.prescriptionId);
  }

  @MessagePattern({ cmd: 'get_prescriptions_by_patient' })
  msgGetRxByPatient(@Payload() d: { customerId: string }) {
    return this.svc.getPrescriptionsByPatient(d.customerId);
  }

  @MessagePattern({ cmd: 'get_prescriptions_by_doctor' })
  msgGetRxByDoctor(@Payload() d: { doctorId: string; limit?: number; offset?: number }) {
    return this.svc.getPrescriptionsByDoctor(d.doctorId, d);
  }

  @MessagePattern({ cmd: 'link_prescription_pharmacy' })
  msgLinkRxPharmacy(@Payload() d: { prescriptionId: string; pharmacyOrderId: string }) {
    return this.svc.linkToPharmacy(d.prescriptionId, d.pharmacyOrderId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAMILY MEMBERS — REST + TCP
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('family-members/:userId')
  getFamilyMembers(@Param('userId') userId: string) {
    return this.svc.getFamilyMembers(userId);
  }

  @Post('family-members')
  addFamilyMember(@Body() dto: { userId: string; name: string; relation: string; [key: string]: any }) {
    return this.svc.addFamilyMember(dto.userId, dto as any);
  }

  @Put('family-members/:id')
  updateFamilyMember(@Param('id') id: string, @Body() dto: { userId: string; [key: string]: any }) {
    return this.svc.updateFamilyMember(id, dto.userId, dto);
  }

  @Post('family-members/:id/delete')
  deleteFamilyMember(@Param('id') id: string, @Body() dto: { userId: string }) {
    return this.svc.deleteFamilyMember(id, dto.userId);
  }

  @MessagePattern({ cmd: 'get_family_members' })
  msgGetFamily(@Payload() d: { userId: string }) { return this.svc.getFamilyMembers(d.userId); }

  @MessagePattern({ cmd: 'add_family_member' })
  msgAddFamily(@Payload() d: { userId: string; [key: string]: any }) { return this.svc.addFamilyMember(d.userId, d); }

  @MessagePattern({ cmd: 'update_family_member' })
  msgUpdateFamily(@Payload() d: { memberId: string; userId: string; [key: string]: any }) {
    return this.svc.updateFamilyMember(d.memberId, d.userId, d);
  }

  @MessagePattern({ cmd: 'delete_family_member' })
  msgDeleteFamily(@Payload() d: { memberId: string; userId: string }) {
    return this.svc.deleteFamilyMember(d.memberId, d.userId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESCHEDULE — REST + TCP
  // ═══════════════════════════════════════════════════════════════════════════

  @Put('appointments/:id/reschedule')
  rescheduleAppointment(
    @Param('id') id: string,
    @Body() dto: { date: string; time: string },
  ) {
    return this.svc.rescheduleAppointment(id, dto.date, dto.time);
  }

  @MessagePattern({ cmd: 'reschedule_appointment' })
  msgReschedule(@Payload() d: { appointmentId: string; date: string; time: string }) {
    return this.svc.rescheduleAppointment(d.appointmentId, d.date, d.time);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTAKE FORMS — REST + TCP
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('intake-forms/:appointmentId')
  submitIntakeForm(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: { customerId: string; [key: string]: any },
  ) {
    return this.svc.submitIntakeForm(appointmentId, dto.customerId, dto);
  }

  @Get('intake-forms/:appointmentId')
  getIntakeForm(@Param('appointmentId') appointmentId: string) {
    return this.svc.getIntakeForm(appointmentId);
  }

  @MessagePattern({ cmd: 'submit_intake_form' })
  msgSubmitIntake(@Payload() d: { appointmentId: string; customerId: string; [key: string]: any }) {
    return this.svc.submitIntakeForm(d.appointmentId, d.customerId, d);
  }

  @MessagePattern({ cmd: 'get_intake_form' })
  msgGetIntake(@Payload() d: { appointmentId: string }) {
    return this.svc.getIntakeForm(d.appointmentId);
  }

  // ── Franchise module boundary ───────────────────────────────────────────
  // Consumed by franchise-service. These replace the raw cross-module SQL that
  // franchise-service used to run against doctor/clinic tables directly.

  @MessagePattern({ cmd: 'franchise_doctor_kpis' })
  msgFranchiseKpis(@Payload() d: EmptyMessage) { return this.franchiseView.getKpis(d.franchiseId); }

  @MessagePattern({ cmd: 'franchise_doctor_clinics' })
  msgFranchiseClinics(@Payload() d: EmptyMessage) { return this.franchiseView.getClinics(d.franchiseId, d.search, d.status); }

  @MessagePattern({ cmd: 'franchise_doctor_appointments' })
  msgFranchiseAppointments(@Payload() d: EmptyMessage) { return this.franchiseView.getAppointments(d.franchiseId, d.page, d.status); }

  @MessagePattern({ cmd: 'franchise_doctor_doctors' })
  msgFranchiseDoctors(@Payload() d: EmptyMessage) { return this.franchiseView.getDoctors(d.franchiseId, d.search); }

  @MessagePattern({ cmd: 'franchise_doctor_analytics' })
  msgFranchiseAnalytics(@Payload() d: EmptyMessage) { return this.franchiseView.getAnalytics(d.franchiseId, d.period); }

  @MessagePattern({ cmd: 'franchise_doctor_update_clinic_status' })
  msgFranchiseUpdateClinicStatus(@Payload() d: any) {
    return this.franchiseView.updateClinicStatus(d.franchiseId, d.clinicId, d.status);
  }

  // ── Admin console commands ────────────────────────────────────────────────
  // The gateway's admin-* controllers address this service with dot-notation
  // commands and none had a handler, so every admin screen for this module got
  // "no matching message handler" — an empty 200 while the gateway fallbacks
  // were in place, a 503 once they were removed. The implementations already
  // existed; only the patterns were missing.

  @MessagePattern({ cmd: 'admin.doctor.clinics' })
  tcpAdminGetClinics(@Payload() d: PaginatedMessage & { city?: string; specialty?: string }) { return this.svc.getClinics(d?.city, d?.specialty, d?.page ?? 1, d?.limit ?? 20); }

  @MessagePattern({ cmd: 'admin.doctor.doctors' })
  tcpAdminGetDoctors(@Payload() d: PaginatedMessage & { specialty?: string }) { return this.svc.getDoctors(d?.specialty, d?.page ?? 1, d?.limit ?? 20); }


  @MessagePattern({ cmd: 'admin.doctor.specialties' })
  tcpAdminGetSpecialties(@Payload() d: EmptyMessage) { return this.svc.getSpecialties(); }
}
