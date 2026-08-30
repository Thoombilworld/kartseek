/**
 * KARTSEEK — Seller Portal Type Definitions
 */

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type SellerType = 'marketplace' | 'restaurant' | 'grocery' | 'pharmacy' | 'taxi';

export interface Seller {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  type: SellerType;
  status: SellerStatus;
  logoUrl?: string;
  email: string;
  phone: string;
  address: string;
  regionCode: string;
  rating: number;
  isVerified: boolean;
  commissionRate: number;
  createdAt: string;
}

export interface SellerDashboardStats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingOrders: number;
  averageRating: number;
  productCount: number;
  lowStockCount: number;
}

export interface SellerPayout {
  id: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  periodFrom: string;
  periodTo: string;
  paidAt?: string;
}
