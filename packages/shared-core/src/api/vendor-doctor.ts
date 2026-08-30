import { API_BASE_URL } from '@/lib/config/api-base';
/**
 * KARTSEEK Vendor Doctor API Layer
 * Vendor-facing API calls for doctor portal.
 * Maps to: doctor-service vendor routes (38 routes)
 */

// Fallback must include `/v1` — the gateway serves `/api/v1/*` and answers 404
// on `/api/*`. Masked today by NEXT_PUBLIC_API_URL being set, so it would only
// bite in an environment that forgets the variable.
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const BASE_URL = API_BASE_URL;
const BASE = `${BASE_URL}/doctors`;

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vendorToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<{ success: boolean; data: T; error?: string }> {
  try {
    const res = await fetch(url, { headers: getHeaders(), ...options });
    const json = await res.json();
    if (!res.ok) return { success: false, data: null as T, error: json.message || 'Request failed' };
    return { success: true, data: json.data ?? json };
  } catch (err) {
    return { success: false, data: null as T, error: 'Network error' };
  }
}

export const vendorDoctorApi = {
  // ── Profile ───────────────────────────────────────────────────
  getDoctor:      (id: string)         => apiCall(`${BASE}/${id}`),
  updateProfile:  (id: string, data: Record<string, unknown>) => apiCall(`${BASE}/${id}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus:   (id: string, data: { isOnline: boolean })   => apiCall(`${BASE}/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Appointments ──────────────────────────────────────────────
  getAppointments: (doctorId: string, params?: { page?: number; status?: string }) => apiCall(`${BASE}/${doctorId}/appointments${params?.page ? `?page=${params.page}` : ''}`),
  getAppointment:  (apptId: string) => apiCall(`${BASE}/appointments/${apptId}`),
  acceptAppointment: (apptId: string) => apiCall(`${BASE}/appointments/${apptId}/accept`, { method: 'POST' }),
  rejectAppointment: (apptId: string) => apiCall(`${BASE}/appointments/${apptId}/reject`, { method: 'POST' }),
  completeAppointment: (apptId: string, data?: Record<string, unknown>) => apiCall(`${BASE}/appointments/${apptId}/complete`, { method: 'POST', body: JSON.stringify(data ?? {}) }),

  // ── Slots & Availability ──────────────────────────────────────
  getSlots:       (doctorId: string) => apiCall(`${BASE}/${doctorId}/slots`),
  updateSlots:    (doctorId: string, data: Record<string, unknown>) => apiCall(`${BASE}/${doctorId}/slots`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Prescriptions ─────────────────────────────────────────────
  getPrescriptions: (doctorId: string) => apiCall(`${BASE}/${doctorId}/prescriptions`),
  writePrescription: (data: Record<string, unknown>) => apiCall(`${BASE}/prescriptions`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Patients ──────────────────────────────────────────────────
  getPatients: (doctorId: string, params?: { page?: number }) => apiCall(`${BASE}/${doctorId}/patients${params?.page ? `?page=${params.page}` : ''}`),
  getPatient:  (patientId: string) => apiCall(`${BASE}/patients/${patientId}`),

  // ── Earnings ──────────────────────────────────────────────────
  getEarnings: (doctorId: string) => apiCall(`${BASE}/${doctorId}/earnings`),
  getPayouts:  (doctorId: string) => apiCall(`${BASE}/${doctorId}/payouts`),

  // ── Reviews ───────────────────────────────────────────────────
  getReviews: (doctorId: string, params?: { page?: number }) => apiCall(`${BASE}/${doctorId}/reviews${params?.page ? `?page=${params.page}` : ''}`),

  // ── Specialties ───────────────────────────────────────────────
  getSpecialties: () => apiCall(`${BASE}/specialties`),

  // ── Clinics ───────────────────────────────────────────────────
  getClinics:   () => apiCall(`${BASE}/clinics`),
  getClinic:    (id: string) => apiCall(`${BASE}/clinics/${id}`),
  getClinicDoctors: (id: string) => apiCall(`${BASE}/clinics/${id}/doctors`),

  // ── Documents ─────────────────────────────────────────────────
  getDocuments:   (doctorId: string) => apiCall(`${BASE}/${doctorId}/documents`),
  uploadDocument: (doctorId: string, data: Record<string, unknown>) => apiCall(`${BASE}/${doctorId}/documents`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Settings ──────────────────────────────────────────────────
  getSettings:    (doctorId: string) => apiCall(`${BASE}/${doctorId}/settings`),
  updateSettings: (doctorId: string, data: Record<string, unknown>) => apiCall(`${BASE}/${doctorId}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
} as const;

export default vendorDoctorApi;
