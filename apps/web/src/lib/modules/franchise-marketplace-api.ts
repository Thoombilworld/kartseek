import { api } from '../api-endpoints';

export interface FranchiseKpis {
  activeSellers: number;
  totalProducts: number;
  totalOrders: number;
  retailRevenue: string;
  categoryDistribution: Record<string, number>;
}

export interface FranchiseSeller {
  id: string;
  name: string;
  location: string;
  rating: number;
  products: number;
  orders: number;
  revenue: string;
  status: 'active' | 'pending' | 'suspended';
  category: string;
  joined: string;
  returns: string;
}

export interface FranchiseSellersResponse {
  franchiseId: string;
  sellers: FranchiseSeller[];
  total: number;
}

export const franchiseMarketplaceApi = {
  getKpis: (franchiseId: string) => 
    api.get<FranchiseKpis>(`/franchise/${franchiseId}/marketplace/kpis`),
    
  getSellers: (franchiseId: string, params?: { search?: string; category?: string; status?: string }) => 
    api.get<FranchiseSellersResponse>(`/franchise/${franchiseId}/marketplace/sellers`, params as any),
    
  updateSellerStatus: (franchiseId: string, sellerId: string, status: string) => 
    api.post<{ success: boolean; message: string; sellerId: string; status: string }>(`/franchise/${franchiseId}/marketplace/sellers/${sellerId}/status`, { status })
};
