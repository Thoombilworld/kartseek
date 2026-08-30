import { api } from '@/lib/api-endpoints';

export interface FranchiseRestaurantKpis {
  activeRestaurants: number;
  totalOrders: number;
  revenue: string;
  avgRating: number;
}

export interface FranchiseRestaurant {
  id: string;
  name: string;
  location: string;
  rating: number;
  cuisine: string;
  ordersToday: number;
  revenue: string;
  status: 'active' | 'pending' | 'suspended';
}

export const franchiseRestaurantApi = {
  getKpis: (franchiseId: string) =>
    api.get<FranchiseRestaurantKpis>(`/franchise/${franchiseId}/restaurant/kpis`),

  getRestaurants: (franchiseId: string, params?: { search?: string; status?: string }) =>
    api.get(`/franchise/${franchiseId}/restaurant/restaurants`, params as any),

  getOrders: (franchiseId: string, params?: { page?: number; status?: string }) =>
    api.get(`/franchise/${franchiseId}/restaurant/orders`, params as any),

  getMenuStats: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/restaurant/menu-stats`),

  getAnalytics: (franchiseId: string, period?: string) =>
    api.get(`/franchise/${franchiseId}/restaurant/analytics`, { period } as any),

  updateRestaurantStatus: (franchiseId: string, restaurantId: string, status: string) =>
    api.post(`/franchise/${franchiseId}/restaurant/restaurants/${restaurantId}/status`, { status }),

  getSettings: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/restaurant/settings`),
};
