/**
 * KARTSEEK — Doctor Appointment API Client
 * Module-scoped endpoints for the doctor service.
 * Covers all gateway endpoints for both customer and provider flows.
 */

import { api } from '../api-endpoints';
import type { Hospital, Doctor, AppointmentSlot, Appointment } from '../types/doctor.types';

const BASE = '/doctor';

export const doctorApi = {
  // ── Specialties ──────────────────────────────────────────────────────────

  /** List all medical specialties */
  getSpecialties: () =>
    api.get<{ data: { id: string; name: string; slug: string; icon: string; doctorCount: number }[]; total: number }>(`${BASE}/specialties`),

  // ── Hospitals ────────────────────────────────────────────────────────────

  /** List hospitals (filterable by specialty, city) */
  getHospitals: (params?: { specialty?: string; city?: string; page?: number; limit?: number }) =>
    api.get<{ data: Hospital[]; total: number; page: number; limit: number }>(`${BASE}/hospitals`, params),

  /** Get a single hospital by ID */
  getHospital: (hospitalId: string) =>
    api.get<Hospital>(`${BASE}/hospitals/${hospitalId}`),

  /** List doctors at a specific hospital */
  getDoctorsByHospital: (hospitalId: string, params?: { specialty?: string }) =>
    api.get<{ data: Doctor[]; total: number }>(`${BASE}/hospitals/${hospitalId}/doctors`, params),

  // ── Clinics ──────────────────────────────────────────────────────────────

  /** List clinics (filterable by specialty, city) */
  getClinics: (params?: { specialty?: string; city?: string }) =>
    api.get<{ data: any[]; total?: number }>(`${BASE}/clinics`, params),

  /** Get a single clinic by ID */
  getClinic: (clinicId: string) =>
    api.get<any>(`${BASE}/clinics/${clinicId}`),

  // ── Doctors ──────────────────────────────────────────────────────────────

  /** List all doctors (filterable by specialty) */
  getDoctors: (params?: { specialty?: string; city?: string; page?: number; limit?: number }) =>
    api.get<{ data: Doctor[]; total: number; page: number; limit: number }>(`${BASE}/doctors`, params),

  /** Get a single doctor profile */
  getDoctor: (doctorId: string) =>
    api.get<Doctor>(`${BASE}/doctors/${doctorId}`),

  /** Get available appointment slots for a doctor on a date */
  getSlots: (doctorId: string, date: string) =>
    api.get<{ doctorId: string; date: string; slots: AppointmentSlot[] }>(`${BASE}/doctors/${doctorId}/slots`, { date }),

  // ── Appointments ─────────────────────────────────────────────────────────

  /** Book an appointment */
  bookAppointment: (data: {
    customerId: string;
    doctorId: string;
    date: string;
    time: string;
    type: 'in-clinic' | 'video';
    patientName?: string;
    patientAge?: number;
    patientGender?: string;
    symptoms?: string;
  }) =>
    api.post<{ success: boolean; appointment: Appointment }>(`${BASE}/appointments`, data),

  /** Get customer's own appointments */
  getMyAppointments: () =>
    api.get<{ appointments: Appointment[] }>(`${BASE}/appointments/me`),

  /** Get appointments for a provider (doctor/hospital/clinic portal) */
  getProviderAppointments: () =>
    api.get<{ appointments: Appointment[] }>(`${BASE}/appointments/provider`),

  /** Update appointment status */
  updateAppointmentStatus: (appointmentId: string, status: string, reason?: string) =>
    api.put<{ success: boolean; id: string; status: string }>(`${BASE}/appointments/${appointmentId}/status`, { status, reason }),

  // ── Reviews ──────────────────────────────────────────────────────────────

  /** Get reviews for a doctor, hospital, or clinic */
  getReviews: (targetType: 'doctor' | 'hospital' | 'clinic', targetId: string) =>
    api.get<{ data: any[] }>(`${BASE}/reviews/${targetType}/${targetId}`),

  // ── Admin ────────────────────────────────────────────────────────────────

  /** List all appointments (admin view) */
  getAllAppointments: (params?: { status?: string; date?: string }) =>
    api.get<{ appointments: Appointment[]; total: number }>(`${BASE}/admin/appointments`, params),

  // ── Token Queue ─────────────────────────────────────────────────────────

  /** Advance the doctor's token to the next patient */
  advanceToken: (doctorId: string, date?: string) =>
    api.put<{ success: boolean; doctorId: string; currentToken: number; totalTokens: number; avgWaitMinutes: number; appointments: any[] }>(
      `${BASE}/doctors/${doctorId}/advance-token`, { doctorId, date },
    ),

  /** Get the live queue status for a doctor */
  getQueueStatus: (doctorId: string, date?: string) =>
    api.get<{
      doctorId: string; date: string; currentToken: number; totalTokens: number;
      waitingCount: number; completedCount: number; avgWaitMinutes: number;
      appointments: Array<{
        id: string; patientName: string; tokenNumber: number; queuePosition: number;
        estimatedWaitMinutes: number; status: string; type: string; timeSlot: string;
        checkedInAt?: string; consultationStartedAt?: string;
      }>;
    }>(`${BASE}/doctors/${doctorId}/queue`, date ? { date } : undefined),

  /** Check in a patient (mark as arrived) */
  checkInPatient: (appointmentId: string) =>
    api.put<{ success: boolean; appointmentId: string; checkedInAt: string }>(
      `${BASE}/appointments/${appointmentId}/check-in`, {},
    ),

  /** Start a consultation session */
  startConsultation: (appointmentId: string) =>
    api.put<{ success: boolean; appointmentId: string; status: string; startedAt: string }>(
      `${BASE}/appointments/${appointmentId}/start-consultation`, {},
    ),

  /** End a consultation (auto-advances to next token) */
  endConsultation: (appointmentId: string) =>
    api.put<{ success: boolean; appointmentId: string; status: string; endedAt: string; nextToken: number }>(
      `${BASE}/appointments/${appointmentId}/end-consultation`, {},
    ),

  // ── Prescriptions ─────────────────────────────────────────────────────────

  /** Create a new prescription for an appointment. */
  createPrescription: (dto: {
    doctorId: string;
    appointmentId: string;
    diagnosis?: string;
    notes?: string;
    followUpDate?: string;
    items: {
      drugName: string; genericName?: string; dosage: string;
      frequency: string; duration: string; quantity?: number; instructions?: string;
    }[];
  }) => api.post<any>(`${BASE}/prescriptions`, dto),

  /** Issue (finalize) a prescription — triggers notification to patient. */
  issuePrescription: (prescriptionId: string) =>
    api.post<any>(`${BASE}/prescriptions/${prescriptionId}/issue`, {}),

  /** Get a single prescription with all items. */
  getPrescription: (prescriptionId: string) =>
    api.get<any>(`${BASE}/prescriptions/${prescriptionId}`),

  /** Get all prescriptions for the logged-in patient. */
  getMyPrescriptions: (customerId: string) =>
    api.get<any[]>(`${BASE}/prescriptions/my`, { customerId }),

  /** Get all prescriptions issued by a doctor. */
  getDoctorPrescriptions: (doctorId: string, params?: { limit?: number; offset?: number }) =>
    api.get<{ data: any[]; total: number }>(`${BASE}/prescriptions/doctor/${doctorId}`, params),

  /** Link prescription to a pharmacy order (cross-sell). */
  linkToPharmacy: (prescriptionId: string, pharmacyOrderId: string) =>
    api.post<any>(`${BASE}/prescriptions/${prescriptionId}/link-pharmacy`, { pharmacyOrderId }),

  // ── Family Members ────────────────────────────────────────────────────────

  /** Get all family members for a user. */
  getFamilyMembers: (userId: string) =>
    api.get<any[]>(`${BASE}/family-members`, { userId }),

  /** Add a new family member. */
  addFamilyMember: (dto: { userId: string; name: string; relation: string; [key: string]: any }) =>
    api.post<any>(`${BASE}/family-members`, dto),

  /** Update a family member. */
  updateFamilyMember: (memberId: string, dto: { userId: string; [key: string]: any }) =>
    api.put<any>(`${BASE}/family-members/${memberId}`, dto),

  /** Delete (deactivate) a family member. */
  deleteFamilyMember: (memberId: string, userId: string) =>
    api.post<any>(`${BASE}/family-members/${memberId}/delete`, { userId }),

  // ── Reschedule ────────────────────────────────────────────────────────────

  /** Reschedule an appointment to a new date/time. */
  rescheduleAppointment: (appointmentId: string, date: string, time: string) =>
    api.put<any>(`${BASE}/appointments/${appointmentId}/reschedule`, { date, time }),
};
