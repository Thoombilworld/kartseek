import { api } from '@/lib/api-endpoints';

export interface FranchiseGroceryKpis {
  activeStores: number;
  totalProducts: number;
  totalOrders: number;
  revenue: string;
}

export interface FranchiseGroceryStore {
  id: string;
  name: string;
  location: string;
  rating: number;
  products: number;
  ordersToday: number;
  revenue: string;
  status: 'active' | 'pending' | 'suspended';
}

export const franchiseGroceryApi = {
  getKpis: (franchiseId: string) =>
    api.get<FranchiseGroceryKpis>(`/franchise/${franchiseId}/grocery/kpis`),

  getStores: (franchiseId: string, params?: { search?: string; status?: string }) =>
    api.get<{ stores: FranchiseGroceryStore[]; total: number }>(`/franchise/${franchiseId}/grocery/stores`, params as any),

  getOrders: (franchiseId: string, params?: { page?: number; limit?: number; status?: string }) =>
    api.get(`/franchise/${franchiseId}/grocery/orders`, params as any),

  getProducts: (franchiseId: string, params?: { search?: string; category?: string }) =>
    api.get(`/franchise/${franchiseId}/grocery/products`, params as any),

  getAnalytics: (franchiseId: string, period?: string) =>
    api.get(`/franchise/${franchiseId}/grocery/analytics`, { period } as any),

  updateStoreStatus: (franchiseId: string, storeId: string, status: string) =>
    api.post(`/franchise/${franchiseId}/grocery/stores/${storeId}/status`, { status }),

  getSettings: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/grocery/settings`),
};
