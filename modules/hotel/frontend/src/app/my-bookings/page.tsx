'use client';

/**
 * Hotel booking history.
 *
 * Rendered a four-item `BOOKINGS` constant — a Dubai palace, a Mumbai resort, a
 * London boutique and "KARTSEEK Business Suites, Doha" — with totals written as
 * strings across four currencies (`'AED 1,035'`, `'₹ 43,120'`, `'£ 1,104'`,
 * `'QAR 1,954'`). It made no request, and there was no customer-side hotel API
 * client at all until `hotelApi.getMyBookings` was added.
 *
 * A booking carries the currency it was priced in, which is not necessarily the
 * one the customer is browsing in, so the amount is formatted in the booking's
 * own currency where the two differ.
 */

import React from 'react';
import { hotelApi } from '@/lib/api/hotel';
import { OrderHistory, type HistoryRow } from '@/components/orders/order-history';
import { isOpen } from '@/lib/modules/profile-data';

function normalise(booking: any): HistoryRow {
  const nights = Number(booking.nights) || 0;
  const guests = (Number(booking.adults) || 0) + (Number(booking.children) || 0);
  const reference = booking.bookingNumber ?? booking.confirmationCode ?? booking.id;

  const meta: string[] = [];
  if (booking.roomName) meta.push(booking.roomName);
  if (nights) meta.push(`${nights} night${nights === 1 ? '' : 's'}`);
  if (guests) meta.push(`${guests} guest${guests === 1 ? '' : 's'}`);
  if (booking.checkinDate && booking.checkoutDate) {
    meta.push(`${String(booking.checkinDate).slice(0, 10)} → ${String(booking.checkoutDate).slice(0, 10)}`);
  }

  return {
    id: String(booking.id ?? reference),
    reference: String(reference ?? ''),
    title: booking.hotelName ?? booking.hotel?.name ?? 'Hotel booking',
    subtitle: [booking.hotelCity, booking.hotelCountryCode].filter(Boolean).join(', ') || 'Stay',
    meta,
    // Sorted and dated by when the stay begins, which is what a traveller looks
    // for, rather than by when the booking was made.
    dateISO: booking.checkinDate ?? booking.createdAt ?? null,
    // `checkinDate` is a date column — check-in *time* is the hotel's policy.
    dateOnly: !!booking.checkinDate,
    status: booking.status,
    amount: booking.grandTotal !== undefined && booking.grandTotal !== null ? Number(booking.grandTotal) : null,
    currency: booking.currency ?? null,
    icon: '🏨',
    kind: isOpen(booking.status) ? 'upcoming' : 'past',
    detailHref: `/hotel-bookings/${encodeURIComponent(String(booking.id ?? reference))}`,
    searchText: [booking.hotelName, booking.hotelCity, booking.roomName, reference].filter(Boolean).join(' '),
  };
}

export default function MyHotelBookingsPage() {
  return (
    <OrderHistory
      module="hotel"
      heading="My bookings"
      backHref="/"
      searchPlaceholder="Search by hotel, city or booking reference…"
      filters={[
        { key: 'upcoming', label: 'Upcoming', match: (r) => r.kind === 'upcoming' },
        { key: 'past', label: 'Past', match: (r) => r.kind === 'past' },
      ]}
      load={async (userId) => {
        const res: any = await hotelApi.getMyBookings(userId, { limit: 50 });
        const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return rows.map(normalise);
      }}
    />
  );
}
