'use client';

/**
 * Ride history.
 *
 * Rendered a six-item `rides` constant whose trips ran from Nairobi pickups
 * ("Westlands Sarit Centre", "JKIA Terminal 1") to Mumbai drop-offs ("Andheri,
 * Link Rd", "Taj Hotel, Colaba"), each with a named driver, a rating and a
 * `currency: '₹'` field written into the row. It made no request.
 *
 * `GET /taxi/rides` returns the signed-in customer's rides from `taxi_rides`.
 */

import React from 'react';
import { taxiModuleApi } from '@/lib/api/taxi';
import { OrderHistory, type HistoryRow } from '@/components/orders/order-history';
import { isOpen } from '@/lib/modules/profile-data';

const VEHICLE_ICON: Record<string, string> = {
  MOTO: '🏍️',
  ECONOMY: '🚗',
  COMFORT: '🚙',
  PREMIUM: '🚘',
  XL: '🚐',
};

function normalise(ride: any): HistoryRow {
  const vehicle = String(ride.vehicleType ?? '').toUpperCase();
  const distance = ride.finalDistanceKm ?? ride.estimatedDistanceKm;
  const duration = ride.finalDurationMin ?? ride.estimatedDurationMin;

  const meta: string[] = [];
  if (vehicle) meta.push(vehicle.charAt(0) + vehicle.slice(1).toLowerCase());
  if (distance) meta.push(`${Number(distance).toFixed(1)} km`);
  if (duration) meta.push(`${Math.round(Number(duration))} min`);
  if (ride.paymentMethod) meta.push(String(ride.paymentMethod));

  return {
    id: String(ride.id ?? ''),
    reference: String(ride.id ?? ''),
    title: ride.dropAddress ? `To ${ride.dropAddress}` : 'Ride',
    subtitle: ride.pickupAddress ? `From ${ride.pickupAddress}` : '',
    meta,
    dateISO: ride.createdAt ?? ride.requestedAt ?? null,
    status: ride.status,
    // A cancelled ride has no final fare; showing the estimate as though it were
    // charged would misstate what the customer paid.
    amount: ride.finalFare !== null && ride.finalFare !== undefined
      ? Number(ride.finalFare)
      : (isOpen(ride.status) && ride.fareEstimate !== null && ride.fareEstimate !== undefined
        ? Number(ride.fareEstimate)
        : null),
    // Rides record the currency they were priced in.
    currency: ride.currency ?? null,
    icon: VEHICLE_ICON[vehicle] ?? '🚕',
    kind: isOpen(ride.status) ? 'active' : 'past',
    detailHref: `/taxi/trip/${encodeURIComponent(String(ride.id ?? ''))}`,
    trackHref: `/taxi/trip/${encodeURIComponent(String(ride.id ?? ''))}/tracking`,
    rating: typeof ride.customerRating === 'number' ? ride.customerRating : null,
    searchText: [ride.pickupAddress, ride.dropAddress, ride.promoCode].filter(Boolean).join(' '),
  };
}

export default function TaxiRidesPage() {
  return (
    <OrderHistory
      module="taxi"
      heading="My rides"
      backHref="/taxi"
      searchPlaceholder="Search by pickup, destination or ride id…"
      filters={[
        { key: 'active', label: 'Active', match: (r) => r.kind === 'active' },
        { key: 'past', label: 'Past', match: (r) => r.kind === 'past' },
      ]}
      load={async () => {
        const res: any = await taxiModuleApi.getRideHistory();
        const rows: any[] = Array.isArray(res) ? res
          : Array.isArray(res?.rides) ? res.rides
          : Array.isArray(res?.data) ? res.data
          : [];
        return rows.map(normalise);
      }}
    />
  );
}
