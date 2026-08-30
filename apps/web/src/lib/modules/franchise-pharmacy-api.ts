import { api } from '../api-endpoints';

export interface FranchisePharmacyKpis {
  activeStores: number;
  totalOrders: number;
  revenue: string;
  prescriptionRate: number;
}

export const franchisePharmacyApi = {
  getKpis: (franchiseId: string) =>
    api.get<FranchisePharmacyKpis>(`/franchise/${franchiseId}/pharmacy/kpis`),

  getStores: (franchiseId: string, params?: { search?: string; status?: string }) =>
    api.get(`/franchise/${franchiseId}/pharmacy/stores`, params as any),

  getOrders: (franchiseId: string, params?: { page?: number; status?: string }) =>
    api.get(`/franchise/${franchiseId}/pharmacy/orders`, params as any),

  getInventory: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/pharmacy/inventory`),

  getCompliance: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/pharmacy/compliance`),

  updateStoreStatus: (franchiseId: string, storeId: string, status: string) =>
    api.post(`/franchise/${franchiseId}/pharmacy/stores/${storeId}/status`, { status }),

  getSettings: (franchiseId: string) =>
    api.get(`/franchise/${franchiseId}/pharmacy/settings`),
};
