/**
 * KARTSEEK — Taxi API Client
 * Module-scoped endpoints for the taxi service.
 *
 * Backend controller paths (TaxiController):
 *   POST /taxi/estimate
 *   GET  /taxi/nearby-drivers
 *   POST /taxi/request
 *   GET  /taxi/rides          (history)
 *   GET  /taxi/ride/:rideId   (detail)
 *   POST /taxi/ride/:rideId/cancel
 *   POST /taxi/ride/:rideId/rating
 *   GET  /taxi/vehicle-categories
 */

import { api } from '@/lib/api-endpoints';
import type { VehicleType, RideEstimate, Ride } from '../types/taxi.types';

const BASE = '/taxi';

// Admin taxi routes live under /admin/taxi, matching every other module's admin
// surface (/admin/grocery, /admin/marketplace, and so on). These were written as
// BASE + '/admin/...', i.e. /taxi/admin/..., which is not a prefix the gateway
// declares — so the whole admin taxi console 404'd.
const ADMIN_BASE = '/admin/taxi';

export const taxiModuleApi = {
  /** Get available vehicle types */
  getVehicleTypes: () =>
    api.get<{ vehicles: VehicleType[] }>(`${BASE}/vehicle-categories`),

  /** Get fare estimate */
  getEstimate: (data: {
    pickupLat: number; pickupLng: number;
    dropLat: number; dropLng: number;
    vehicleType?: string;
  }) =>
    api.post<{ estimates: RideEstimate[] }>(`${BASE}/estimate`, data),

  /** Request a ride */
  requestRide: (data: {
    vehicleTypeId: string;
    pickup: { lat: number; lng: number; address: string };
    drop: { lat: number; lng: number; address: string };
    paymentMethod?: string;
  }) =>
    api.post<Ride>(`${BASE}/request`, data),

  /** Get ride status */
  getRide: (rideId: string) =>
    api.get<Ride>(`${BASE}/ride/${rideId}`),

  /** Cancel a ride */
  cancelRide: (rideId: string, reason?: string) =>
    api.post<{ success: boolean }>(`${BASE}/ride/${rideId}/cancel`, { reason }),

  /** Rate a completed ride */
  rateRide: (rideId: string, rating: number, comment?: string) =>
    api.post<{ success: boolean }>(`${BASE}/ride/${rideId}/rating`, { rating, comment }),

  /** Get ride history */
  getRideHistory: (page?: number) =>
    api.get<{ rides: Ride[]; total: number }>(`${BASE}/rides`, {
      page: page ?? 1,
    }),

  // ─── Admin API Methods ──────────────────────────────────────────────────

  /** Get all drivers (admin) with filters */
  getAdminDrivers: (filters?: {
    status?: string; country?: string; search?: string; page?: number;
  }) =>
    api.get<{ drivers: any[]; total: number }>(`${ADMIN_BASE}/drivers`, filters),

  /** Approve a driver */
  approveDriver: (driverId: string) =>
    api.patch<{ success: boolean }>(`${ADMIN_BASE}/drivers/${driverId}/approve`),

  /** Suspend a driver */
  suspendDriver: (driverId: string, reason?: string) =>
    api.patch<{ success: boolean }>(`${ADMIN_BASE}/drivers/${driverId}/suspend`, { reason }),

  /** Block a driver */
  blockDriver: (driverId: string, reason?: string) =>
    api.post<{ success: boolean }>(`${ADMIN_BASE}/drivers/${driverId}/block`, { reason }),

  /** Get admin config for a country */
  getAdminConfig: (countryCode: string) =>
    api.get<any>(`${ADMIN_BASE}/config/${countryCode}`),

  /** Update admin config */
  updateAdminConfig: (countryCode: string, config: any) =>
    api.put<{ success: boolean }>(`${ADMIN_BASE}/config/${countryCode}`, config),

  /** Get pricing rates */
  getAdminRates: (countryCode?: string) =>
    api.get<{ rates: any[] }>(`${ADMIN_BASE}/rates`, { country: countryCode }),

  /** Create/update pricing rate */
  createRate: (rate: any) =>
    api.post<{ success: boolean }>(`${ADMIN_BASE}/rates`, rate),

  /** Get payouts list */
  getAdminPayouts: (filters?: { status?: string; page?: number }) =>
    api.get<{ payouts: any[]; total: number }>(`${ADMIN_BASE}/payouts`, filters),

  /** Process pending payouts */
  processPayouts: (payoutIds: string[]) =>
    api.post<{ success: boolean; processed: number }>(`${ADMIN_BASE}/payouts/process`, { payoutIds }),

  /** Get pending documents for approval */
  getPendingDocuments: (filters?: { type?: string; page?: number }) =>
    api.get<{ documents: any[]; total: number }>(`${ADMIN_BASE}/documents/pending`, filters),

  /** Approve a document */
  approveDocument: (documentId: string) =>
    api.post<{ success: boolean }>(`${ADMIN_BASE}/documents/${documentId}/approve`),

  /** Reject a document */
  rejectDocument: (documentId: string, reason: string) =>
    api.post<{ success: boolean }>(`${ADMIN_BASE}/documents/${documentId}/reject`, { reason }),

  /** Get compliance data */
  getComplianceData: (countryCode?: string) =>
    api.get<{ compliance: any[] }>(`${ADMIN_BASE}/compliance`, { country: countryCode }),

  /** Get fleet monitoring stats */
  getFleetStats: () =>
    api.get<{ activeDrivers: number; onTrip: number; available: number; totalRides: number }>(`${ADMIN_BASE}/fleet`),

  /** Get nearby drivers for fleet map */
  getFleetDrivers: (lat?: number, lng?: number) =>
    api.get<{ drivers: any[] }>(`${ADMIN_BASE}/drivers/nearby`, { lat, lng, radius: 50 }),

  /** Get active rides */
  getActiveRides: () =>
    api.get<{ rides: any[] }>(`${ADMIN_BASE}/rides/active`),

  /** Get surge zones */
  getSurgeZones: () =>
    api.get<{ zones: any[] }>(`${ADMIN_BASE}/surge`),

  /** Get matching/dispatch stats */
  getMatchingStats: () =>
    api.get<any>(`${ADMIN_BASE}/fleet`),

  /** Save landing page layout */
  saveLandingLayout: (layout: any) =>
    api.post<{ success: boolean }>(`/admin/layouts/taxi/homepage`, layout),

  /** Get landing page layout */
  getLandingLayout: () =>
    api.get<any>(`/admin/layouts/taxi/homepage`),
};
