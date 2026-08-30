import { api } from '@/lib/api-endpoints';

export interface FranchiseTaxiKpis {
  totalDrivers: number;
  onlineDrivers: number;
  todayRides: number;
  revenue: string;
}

export const franchiseTaxiApi = {
  getKpis: (franchiseId: string) =>
    api.get<FranchiseTaxiKpis>(`/franchise/${franchiseId}/taxi/kpis`),

  getDrivers: (franchiseId: string, params?: { search?: string; status?: string }) =>
    api.get(`/franchise/${franchiseId}/taxi/drivers`, params as any),

  getRides: (franchiseId: string, params?: { page?: number; status?: string }) =>
    api.get(`/franchise/${franchiseId}/taxi/rides`, params as any),

  getFleet: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/taxi/fleet`),

  getAnalytics: (franchiseId: string, period?: string) =>
    api.get(`/franchise/${franchiseId}/taxi/analytics`, { period } as any),

  updateDriverStatus: (franchiseId: string, driverId: string, status: string) =>
    api.post(`/franchise/${franchiseId}/taxi/drivers/${driverId}/status`, { status }),

  getSettings: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/taxi/settings`),
};
