import { api } from '@/lib/api-endpoints';

export interface FranchiseDoctorKpis {
  activeClinics: number;
  totalDoctors: number;
  todayAppointments: number;
  revenue: string;
}

export const franchiseDoctorApi = {
  getKpis: (franchiseId: string) =>
    api.get<FranchiseDoctorKpis>(`/franchise/${franchiseId}/doctor/kpis`),

  getClinics: (franchiseId: string, params?: { search?: string; status?: string }) =>
    api.get(`/franchise/${franchiseId}/doctor/clinics`, params as any),

  getAppointments: (franchiseId: string, params?: { page?: number; status?: string }) =>
    api.get(`/franchise/${franchiseId}/doctor/appointments`, params as any),

  getDoctors: (franchiseId: string, params?: { specialty?: string }) =>
    api.get(`/franchise/${franchiseId}/doctor/doctors`, params as any),

  getAnalytics: (franchiseId: string, period?: string) =>
    api.get(`/franchise/${franchiseId}/doctor/analytics`, { period } as any),

  updateClinicStatus: (franchiseId: string, clinicId: string, status: string) =>
    api.post(`/franchise/${franchiseId}/doctor/clinics/${clinicId}/status`, { status }),

  getSettings: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/doctor/settings`),
};
