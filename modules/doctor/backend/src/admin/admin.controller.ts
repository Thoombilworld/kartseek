import { Controller, UseFilters, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DoctorAdminService } from './admin.service';
import { RpcAwareExceptionsFilter, requireId } from '@app/common';
import type {
  AdminAppointmentListMsg,
  AdminDoctorListMsg,
  AdminIdMsg,
  AdminListMsg,
  AdminReportMsg,
  AdminSettingsMsg,
  AdminSpecialtyMsg,
  AdminSuspendDoctorMsg,
  AdminVerifyDoctorMsg,
} from './dto/admin.dto';

/**
 * The fifteen `admin.doctor.*` commands, in one place.
 *
 * ── One spelling, and where the other twelve were ───────────────────────────
 *
 * `admin-doctor.controller.ts` (api-gateway) sends fifteen distinct commands.
 * THREE had a `@MessagePattern` — `clinics`, `doctors`, `specialties`, bolted
 * onto the bottom of `doctor.controller.ts` next to the storefront's reads — and
 * the other twelve reached no handler at all, so the gateway answered "Doctor
 * service unavailable", which reads as an outage rather than a contract gap.
 *
 * Unlike hotel (M5) and restaurant (M4), nothing had to be RENAMED: this module
 * never adopted a second convention, so the three existing patterns already used
 * the dotted names the gateway sends. They are MOVED here, unchanged in name, so
 * the module has one admin surface rather than an admin section inside its
 * storefront controller — and two of the three changed behaviour on the way, for
 * reasons recorded on `DoctorAdminService.listClinics` and `.listDoctors`.
 *
 * ── `@UseFilters` on the CONTROLLER, not the method ─────────────────────────
 *
 * A `@UseFilters` on a method does not reach a TCP handler's thrown exception;
 * only the controller-level binding does (`project_nest_rpc_filter_binding`).
 * `RpcAwareExceptionsFilter` is what turns a `ForbiddenException` here into a
 * 403 at the gateway rather than a 500 — which is the difference between "not
 * your market" and "the doctor service is broken".
 *
 * ── No `ValidationPipe` here ────────────────────────────────────────────────
 *
 * Deliberately: the payloads are interfaces, validated one hop earlier at the
 * gateway where a client can actually reach them, and `whitelist: true` on a
 * pipe bound here would silently STRIP any property a class forgot to declare —
 * `scope` among them, which would serve a region-locked administrator every
 * market's rows. See `dto/admin.dto.ts` for the whole ruling.
 *
 * `scope` is the caller's market when the gateway resolved one for a
 * region-locked administrator, and undefined for a global one. `actorId` is the
 * acting administrator, from the verified token. Neither is ever read from a
 * client body.
 */
@UseFilters(RpcAwareExceptionsFilter)
@Controller()
export class DoctorAdminController {
  private readonly logger = new Logger(DoctorAdminController.name);

  constructor(private readonly admin: DoctorAdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.doctor.dashboard' })
  msgDashboard(@Payload() d: AdminReportMsg) {
    return this.admin.getDashboard(d ?? {});
  }

  // ── Clinics ────────────────────────────────────────────────────────────────

  /**
   * Moved from `doctor.controller.ts`, and no longer the storefront's read.
   *
   * It used to delegate to `DoctorService.getClinics`, which hard-codes
   * `status = 'active'`: right for a patient browsing clinics, useless for the
   * console screen whose job includes the PENDING approvals queue. The admin
   * list shows every state and takes a whitelisted `status` filter.
   */
  @MessagePattern({ cmd: 'admin.doctor.clinics' })
  msgClinics(@Payload() d: AdminListMsg & { city?: string; specialty?: string }) {
    return this.admin.listClinics(d ?? {});
  }

  @MessagePattern({ cmd: 'admin.doctor.clinicDetail' })
  msgClinicDetail(@Payload() d: AdminIdMsg) {
    return this.admin.getClinicDetail(requireId(d?.id, 'clinic'), d?.scope);
  }

  @MessagePattern({ cmd: 'admin.doctor.approveClinic' })
  msgApproveClinic(@Payload() d: AdminIdMsg) {
    return this.admin.approveClinic(d ?? {});
  }

  // ── Doctors ────────────────────────────────────────────────────────────────

  /**
   * Moved from `doctor.controller.ts`, and it no longer refuses.
   *
   * What stood there called `refuseUnattributable` before it read a single row,
   * because `doctors` had no market column: every regional administrator was
   * denied their own market's directory. `doctors.region_code` exists as of M6,
   * so this filters on it — and a practitioner who still has no market is absent
   * from a scoped list rather than the whole list being refused.
   */
  @MessagePattern({ cmd: 'admin.doctor.doctors' })
  msgDoctors(@Payload() d: AdminDoctorListMsg) {
    return this.admin.listDoctors(d ?? {});
  }

  @MessagePattern({ cmd: 'admin.doctor.doctorDetail' })
  msgDoctorDetail(@Payload() d: AdminIdMsg) {
    return this.admin.getDoctorDetail(requireId(d?.id, 'doctor'), d?.scope);
  }

  @MessagePattern({ cmd: 'admin.doctor.verifyDoctor' })
  msgVerifyDoctor(@Payload() d: AdminVerifyDoctorMsg) {
    return this.admin.verifyDoctor(d ?? {});
  }

  @MessagePattern({ cmd: 'admin.doctor.suspendDoctor' })
  msgSuspendDoctor(@Payload() d: AdminSuspendDoctorMsg) {
    return this.admin.suspendDoctor(d ?? {});
  }

  // ── Appointments and prescriptions — attributed through the practitioner ───

  @MessagePattern({ cmd: 'admin.doctor.appointments' })
  msgAppointments(@Payload() d: AdminAppointmentListMsg) {
    return this.admin.listAppointments(d ?? {});
  }

  @MessagePattern({ cmd: 'admin.doctor.prescriptions' })
  msgPrescriptions(@Payload() d: AdminListMsg) {
    return this.admin.listPrescriptions(d ?? {});
  }

  // ── Specialties — one catalogue, every market ──────────────────────────────

  @MessagePattern({ cmd: 'admin.doctor.specialties' })
  msgSpecialties() {
    return this.admin.listSpecialties();
  }

  @MessagePattern({ cmd: 'admin.doctor.createSpecialty' })
  msgCreateSpecialty(@Payload() d: AdminSpecialtyMsg) {
    return this.admin.createSpecialty(d ?? {});
  }

  // ── Reports and settings ───────────────────────────────────────────────────

  @MessagePattern({ cmd: 'admin.doctor.reports' })
  msgReports(@Payload() d: AdminReportMsg) {
    return this.admin.getReports(d ?? {});
  }

  @MessagePattern({ cmd: 'admin.doctor.settings' })
  msgSettings(@Payload() d: AdminReportMsg) {
    return this.admin.getSettings(d ?? {});
  }

  @MessagePattern({ cmd: 'admin.doctor.updateSettings' })
  msgUpdateSettings(@Payload() d: AdminSettingsMsg) {
    return this.admin.updateSettings(d ?? {});
  }
}
