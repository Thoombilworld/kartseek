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
    api.get<{ drivers: any[]; total: number }>(`${BASE}/admin/drivers`, filters),

  /** Approve a driver */
  approveDriver: (driverId: string) =>
    api.post<{ success: boolean }>(`${BASE}/admin/drivers/${driverId}/approve`),

  /** Suspend a driver */
  suspendDriver: (driverId: string, reason?: string) =>
    api.post<{ success: boolean }>(`${BASE}/admin/drivers/${driverId}/suspend`, { reason }),

  /** Block a driver */
  blockDriver: (driverId: string, reason?: string) =>
    api.post<{ success: boolean }>(`${BASE}/admin/drivers/${driverId}/block`, { reason }),

  /** Get admin config for a country */
  getAdminConfig: (countryCode: string) =>
    api.get<any>(`${BASE}/admin/config/${countryCode}`),

  /** Update admin config */
  updateAdminConfig: (countryCode: string, config: any) =>
    api.put<{ success: boolean }>(`${BASE}/admin/config/${countryCode}`, config),

  /** Get pricing rates */
  getAdminRates: (countryCode?: string) =>
    api.get<{ rates: any[] }>(`${BASE}/admin/rates`, { country: countryCode }),

  /** Create/update pricing rate */
  createRate: (rate: any) =>
    api.post<{ success: boolean }>(`${BASE}/admin/rates`, rate),

  /** Get payouts list */
  getAdminPayouts: (filters?: { status?: string; page?: number }) =>
    api.get<{ payouts: any[]; total: number }>(`${BASE}/admin/payouts`, filters),

  /** Process pending payouts */
  processPayouts: (payoutIds: string[]) =>
    api.post<{ success: boolean; processed: number }>(`${BASE}/admin/payouts/process`, { payoutIds }),

  /** Get pending documents for approval */
  getPendingDocuments: (filters?: { type?: string; page?: number }) =>
    api.get<{ documents: any[]; total: number }>(`${BASE}/admin/documents/pending`, filters),

  /** Approve a document */
  approveDocument: (documentId: string) =>
    api.post<{ success: boolean }>(`${BASE}/admin/documents/${documentId}/approve`),

  /** Reject a document */
  rejectDocument: (documentId: string, reason: string) =>
    api.post<{ success: boolean }>(`${BASE}/admin/documents/${documentId}/reject`, { reason }),

  /** Get compliance data */
  getComplianceData: (countryCode?: string) =>
    api.get<{ compliance: any[] }>(`${BASE}/admin/compliance`, { country: countryCode }),

  /** Get fleet monitoring stats */
  getFleetStats: () =>
    api.get<{ activeDrivers: number; onTrip: number; available: number; totalRides: number }>(`${BASE}/admin/fleet/stats`),

  /** Get nearby drivers for fleet map */
  getFleetDrivers: (lat?: number, lng?: number) =>
    api.get<{ drivers: any[] }>(`${BASE}/drivers/nearby`, { lat, lng, radius: 50 }),

  /** Get active rides */
  getActiveRides: () =>
    api.get<{ rides: any[] }>(`${BASE}/admin/rides/active`),

  /** Get surge zones */
  getSurgeZones: () =>
    api.get<{ zones: any[] }>(`${BASE}/admin/surge`),

  /** Get matching/dispatch stats */
  getMatchingStats: () =>
    api.get<any>(`${BASE}/matching/stats`),

  /** Save landing page layout */
  saveLandingLayout: (layout: any) =>
    api.post<{ success: boolean }>(`${BASE}/admin/layouts/taxi/homepage`, layout),

  /** Get landing page layout */
  getLandingLayout: () =>
    api.get<any>(`${BASE}/admin/layouts/taxi/homepage`),
};
