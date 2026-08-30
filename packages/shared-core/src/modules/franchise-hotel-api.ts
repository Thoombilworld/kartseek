import { api } from '@/lib/api-endpoints';

export interface FranchiseHotelKpis {
  activeHotels: number;
  totalRooms: number;
  todayBookings: number;
  avgOccupancy: number;
  revenue: string;
}

export const franchiseHotelApi = {
  getKpis: (franchiseId: string) =>
    api.get<FranchiseHotelKpis>(`/franchise/${franchiseId}/hotel/kpis`),

  getHotels: (franchiseId: string, params?: { search?: string; status?: string }) =>
    api.get(`/franchise/${franchiseId}/hotel/hotels`, params as any),

  getBookings: (franchiseId: string, params?: { page?: number; status?: string }) =>
    api.get(`/franchise/${franchiseId}/hotel/bookings`, params as any),

  getRooms: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/hotel/rooms`),

  getAnalytics: (franchiseId: string, period?: string) =>
    api.get(`/franchise/${franchiseId}/hotel/analytics`, { period } as any),

  updateHotelStatus: (franchiseId: string, hotelId: string, status: string) =>
    api.post(`/franchise/${franchiseId}/hotel/hotels/${hotelId}/status`, { status }),

  getSettings: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/hotel/settings`),
};
