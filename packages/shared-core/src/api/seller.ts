/**
 * KARTSEEK — Seller Portal API Client
 * Complete endpoints for the seller dashboard, orders, products, payouts, and analytics.
 * Maps to the SellerController in the API Gateway.
 */

import { api } from '@/lib/api-endpoints';
import type { SellerDashboardStats, SellerPayout } from '../types/seller.types';

const BASE = '/seller';

export const sellerApi = {
  // ── Dashboard ────────────────────────────────────────────────────────────
  /** Get seller dashboard stats (revenue, orders, products, ratings) */
  getDashboard: () =>
    api.get<SellerDashboardStats>(`${BASE}/dashboard`),

  // ── Orders ───────────────────────────────────────────────────────────────
  /** Get seller orders with optional status filter and pagination */
  getOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ orders: unknown[]; total: number }>(`${BASE}/orders`, params),

  /** Update order status (CONFIRMED → PREPARING → READY → SHIPPED) */
  updateOrderStatus: (orderId: string, status: string) =>
    api.put<{ success: boolean }>(`${BASE}/orders/${orderId}/status`, { status }),

  // ── Products / Inventory ─────────────────────────────────────────────────
  /** Get seller product inventory with search, category, and status filters */
  getProducts: (params?: { search?: string; category?: string; status?: string; page?: number }) =>
    api.get<{ products: unknown[]; total: number }>(`${BASE}/products`, params),

  /** Add a new product (submitted for admin approval) */
  addProduct: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; productId: string }>(`${BASE}/products`, data),

  /** Update an existing product */
  updateProduct: (productId: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean }>(`${BASE}/products/${productId}`, data),

  /** Update product stock level */
  updateStock: (productId: string, stock: number) =>
    api.patch<{ success: boolean }>(`${BASE}/products/${productId}/stock`, { stock }),

  // ── Payouts ──────────────────────────────────────────────────────────────
  /** Get payout history */
  getPayouts: (page?: number) =>
    api.get<{ payouts: SellerPayout[]; total: number; pendingBalance: number }>(`${BASE}/payouts`, {
      page: page ?? 1,
    }),

  /** Request a new payout */
  requestPayout: (data: { amount: number; method: string }) =>
    api.post<{ success: boolean; payoutId: string }>(`${BASE}/payouts/request`, data),

  // ── Settings ─────────────────────────────────────────────────────────────
  /** Get store settings */
  getSettings: () =>
    api.get<Record<string, unknown>>(`${BASE}/settings`),

  /** Update store settings (partial update) */
  updateSettings: (data: Record<string, unknown>) =>
    api.patch<{ success: boolean }>(`${BASE}/settings`, data),

  // ── Reviews ──────────────────────────────────────────────────────────────
  /** Get reviews for seller products */
  getReviews: (page?: number) =>
    api.get<{ reviews: unknown[]; total: number; averageRating: number }>(`${BASE}/reviews`, { page: page ?? 1 }),

  // ── Analytics ────────────────────────────────────────────────────────────
  /** Get seller analytics for a given time period */
  getAnalytics: (period?: '7d' | '30d' | '90d' | '1y') =>
    api.get<Record<string, unknown>>(`${BASE}/analytics`, { period: period ?? '30d' }),
};
