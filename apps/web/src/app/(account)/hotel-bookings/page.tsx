import { redirect } from 'next/navigation';

/**
 * `/hotel-bookings` → `/hotel-booking/my-bookings`.
 *
 * The second copy of the hotel booking list, and the fictional one: a hardcoded
 * `BOOKINGS` array with filter tabs and a search box over invented stays.
 *
 * `/hotel-booking/my-bookings` reads the guest's real reservations through
 * `hotelApi.getMyBookings`, prices each in the currency the booking was made in,
 * and sits inside the hotel module's own chrome.
 *
 * Only the list moves. `/hotel-bookings/[bookingId]` and its cancel, modify,
 * refund, review, invoice and voucher routes stay where they are — the booking
 * rows link straight to them.
 */
export default function AccountHotelBookingsPage() {
  redirect('/hotel-booking/my-bookings');
}
