/**
 * KARTSEEK — Hotel API Client (public)
 *
 * The customer-facing counterpart to `vendor-hotel.ts` and `admin-hotel.ts`,
 * which both existed while the public storefront had no client at all — which
 * is part of why `hotel-booking/hotel/[hotelId]` renders one hardcoded `HOTEL`
 * object for every id in the URL.
 */

import { api } from '../api-endpoints';

const BASE = '/hotels';

export const hotelApi = {
  /** Search or list hotels. */
  getList: (params?: { city?: string; checkIn?: string; checkOut?: string; guests?: number; page?: number; limit?: number }) =>
    api.get<{ data: any[]; total: number }>(BASE, params as any),

  /**
   * One hotel by id.
   *
   * Answers `data: null` for an unknown id rather than echoing it back with a
   * fixture, so this is safe to use as an existence check when deciding whether
   * a page may be indexed.
   */
  getHotel: (hotelId: string) => api.get<any>(`${BASE}/${hotelId}`),

  /** Room types and rates for a hotel. */
  getRooms: (hotelId: string) => api.get<{ data: any[] }>(`${BASE}/${hotelId}/rooms`),

  /**
   * The signed-in guest's own bookings.
   *
   * `/hotels/bookings/user/:userId` is scoped by the id in the path rather than
   * by the token, so pass the authenticated user's own id — `my-bookings`
   * rendered four invented stays because nothing here existed to call.
   */
  getMyBookings: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: any[]; total: number }>(`${BASE}/bookings/user/${userId}`, params as any),

  /** One booking, for the detail and voucher views. */
  getBooking: (bookingId: string) => api.get<any>(`${BASE}/bookings/${bookingId}`),

  /** Cancel a booking. PUT, matching `@Put('bookings/:bookingId/cancel')`. */
  cancelBooking: (bookingId: string, reason?: string) =>
    api.put<any>(`${BASE}/bookings/${bookingId}/cancel`, { reason }),
};
