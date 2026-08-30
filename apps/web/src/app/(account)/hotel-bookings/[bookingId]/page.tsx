'use client';

/**
 * Hotel booking detail.
 *
 * This read `bookingId` from the URL and then ignored it, rendering one fixed
 * booking for whatever id was asked for: The Grand Palace Hotel on Sheikh Zayed
 * Road, a Deluxe King Room, AED 1,046, and a guest named Ahmed Al Maktoum
 * complete with his email address and mobile number. Every customer opening any
 * of their bookings saw that, which mattered more once the booking *list* became
 * real — the list showed the guest's own stays and every row opened onto a
 * stranger's.
 *
 * `GET /hotels/bookings/:bookingId` returns the real record. It is scoped to the
 * booking's own customer, so somebody else's id is a 404 rather than a look at
 * their name, passport number and itinerary.
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { hotelApi } from '@/lib/api/hotel';
import { OrderDetail, type OrderDetailData, type OrderCharge } from '@/components/orders/order-detail';
import { readStatus } from '@/lib/modules/profile-data';

/** Only the figures the booking actually carries appear on the bill. */
function chargesOf(booking: any): OrderCharge[] {
  const rows: Array<[string, unknown, boolean?]> = [
    ['Room', booking.roomTotal],
    ['Extra charges', booking.extraCharges],
    ['Taxes', booking.taxAmount],
    ['Service fee', booking.serviceFee],
    ['Points redeemed', booking.pointsDiscount, true],
    ['Discount', booking.discount, true],
  ];
  return rows
    .map(([label, value, isDiscount]) => ({ label, amount: Number(value ?? 0), isDiscount }))
    .filter((c) => Number.isFinite(c.amount) && c.amount !== 0);
}

function toDetail(booking: any): OrderDetailData {
  const nights = Number(booking.nights) || 0;
  const rooms = Number(booking.roomCount) || 1;
  const guests = (Number(booking.adults) || 0) + (Number(booking.children) || 0);
  const reference = booking.bookingNumber ?? booking.confirmationCode ?? booking.id;

  const facts: Array<{ label: string; value: string }> = [];
  if (booking.checkinDate) facts.push({ label: 'Check-in', value: String(booking.checkinDate).slice(0, 10) });
  if (booking.checkoutDate) facts.push({ label: 'Check-out', value: String(booking.checkoutDate).slice(0, 10) });
  if (nights) facts.push({ label: 'Nights', value: String(nights) });
  if (guests) facts.push({ label: 'Guests', value: String(guests) });
  if (booking.confirmationCode) facts.push({ label: 'Confirmation', value: booking.confirmationCode });
  if (booking.mealPlan) facts.push({ label: 'Meal plan', value: booking.mealPlan });
  // The guest on the reservation is not always the account holder — a booking
  // made for a family member carries their name, and the desk will ask for it.
  const guestName = [booking.primaryGuest?.firstName, booking.primaryGuest?.lastName].filter(Boolean).join(' ');
  if (guestName) facts.push({ label: 'Lead guest', value: guestName });

  const status = readStatus(booking.status);

  return {
    reference: String(reference ?? ''),
    title: booking.hotelName ?? booking.hotel?.name ?? 'Hotel booking',
    subtitle: [booking.roomName, booking.hotelCity].filter(Boolean).join(' · ') || 'Stay',
    status: booking.status,
    dateISO: booking.createdAt ?? null,
    // A stay is one line — the room, for however many room-nights it covers.
    lines: booking.roomName
      ? [{
          name: booking.roomName,
          quantity: Math.max(1, nights * rooms),
          unitPrice: booking.pricePerNight !== undefined && booking.pricePerNight !== null
            ? Number(booking.pricePerNight) : null,
          lineTotal: booking.roomTotal !== undefined && booking.roomTotal !== null
            ? Number(booking.roomTotal) : null,
          note: nights ? `${rooms} room${rooms === 1 ? '' : 's'} × ${nights} night${nights === 1 ? '' : 's'}` : undefined,
        }]
      : [],
    charges: chargesOf(booking),
    total: booking.grandTotal !== undefined && booking.grandTotal !== null ? Number(booking.grandTotal) : null,
    // Priced in the hotel's currency, which need not be the one being browsed in.
    currency: booking.currency ?? null,
    address: [booking.hotel?.address, booking.hotelCity, booking.hotelCountryCode].filter(Boolean).join(', ') || null,
    paymentMethod: booking.paymentMethod ?? null,
    paymentStatus: booking.paymentStatus ?? null,
    timeline: [
      { label: 'Booked', at: booking.createdAt ?? null, done: !!booking.createdAt },
      {
        label: 'Confirmed',
        at: booking.confirmedAt ?? null,
        done: status.tone !== 'warning' && status.tone !== 'danger',
      },
      { label: 'Checked in', at: booking.checkedInAt ?? null, done: !!booking.checkedInAt },
      { label: 'Checked out', at: booking.checkedOutAt ?? null, done: !!booking.checkedOutAt },
    ],
    facts,
    cancelReason: booking.cancelReason ?? null,
  };
}

export default function BookingDetailPage() {
  const params = useParams<{ bookingId: string }>();
  const id = String(params?.bookingId ?? '');

  return (
    <OrderDetail
      module="hotel"
      orderId={id}
      backHref="/hotel-booking/my-bookings"
      load={async (bookingId) => toDetail(await hotelApi.getBooking(bookingId))}
    />
  );
}
