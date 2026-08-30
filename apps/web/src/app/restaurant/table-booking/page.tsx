'use client';

import React, { useState, useEffect, MouseEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CalendarDays, Clock, Users, MapPin, ChevronRight,
  Filter, XCircle, RefreshCw, Plus, CalendarCheck, CalendarX, CalendarClock,
} from 'lucide-react';
import { restaurantApi } from '@/lib/api/restaurant';
import { useRegion } from '@/lib/contexts/region-context';

/* ── Mock Reservations (fallback) ── */
const MOCK_RESERVATIONS = [
  {
    id: 'RES-001', restaurantId: 'RST-003', restaurantName: 'Biryani Blues',
    restaurantImage: '🍚', date: '2026-07-05', time: '19:30', guests: 4,
    tableNumber: 'T-03', status: 'CONFIRMED' as const,
    specialRequests: 'Window seat if possible', createdAt: '2026-06-30T10:00:00Z',
  },
  {
    id: 'RES-002', restaurantId: 'RST-008', restaurantName: 'Pizza Palace',
    restaurantImage: '🍕', date: '2026-07-06', time: '20:00', guests: 2,
    tableNumber: null, status: 'PENDING' as const,
    specialRequests: null, createdAt: '2026-06-30T12:30:00Z',
  },
  {
    id: 'RES-003', restaurantId: 'RST-006', restaurantName: 'The Grand Biryani House',
    restaurantImage: '🍛', date: '2026-06-25', time: '13:00', guests: 6,
    tableNumber: 'T-01', status: 'COMPLETED' as const,
    specialRequests: 'Birthday celebration', createdAt: '2026-06-20T08:00:00Z',
  },
  {
    id: 'RES-004', restaurantId: 'RST-005', restaurantName: 'Sushi Kingdom',
    restaurantImage: '🍣', date: '2026-06-20', time: '19:00', guests: 3,
    tableNumber: null, status: 'CANCELLED' as const,
    specialRequests: null, createdAt: '2026-06-18T14:00:00Z',
  },
];

type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

const STATUS_STYLES: Record<ReservationStatus, { bg: string; text: string; label: string; icon: typeof CalendarDays }> = {
  PENDING:   { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Pending',   icon: CalendarClock },
  CONFIRMED: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Confirmed', icon: CalendarCheck },
  COMPLETED: { bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Completed', icon: CalendarCheck },
  CANCELLED: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Cancelled', icon: CalendarX },
  NO_SHOW:   { bg: 'bg-orange-100', text: 'text-orange-700', label: 'No Show',   icon: XCircle },
};

function isUpcoming(dateStr: string) {
  return new Date(dateStr) > new Date();
}

export default function MyReservationsPage() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [reservations, setReservations] = useState(MOCK_RESERVATIONS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await restaurantApi.getMyReservations();
        if (!cancelled && (res as any)?.data?.length) {
          setReservations((res as any).data);
        }
      } catch (_e) { /* use mock fallback */ }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = reservations.filter(r => {
    if (filter === 'upcoming') return isUpcoming(r.date) && r.status !== 'CANCELLED';
    if (filter === 'past') return !isUpcoming(r.date);
    if (filter === 'cancelled') return r.status === 'CANCELLED';
    return true;
  });

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this reservation?')) return;
    try {
      await restaurantApi.cancelReservation(id, { reason: 'Plans changed' });
    } catch (_e) { /* still update UI */ }
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'CANCELLED' as const } : r) as typeof MOCK_RESERVATIONS);
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
  ] as const;

  return (
    <div className="min-h-screen bg-linear-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/restaurant" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-900">My Reservations</h1>
            <p className="text-sm text-slate-500">{reservations.length} bookings</p>
          </div>
          <Link
            href="/restaurant"
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Book Table
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Reservation filters">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              data-selected={filter === f.key}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                filter === f.key
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-slate-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-slate-200 rounded w-2/3" />
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CalendarDays className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {filter === 'all' ? 'No Reservations Yet' : `No ${filters.find(f => f.key === filter)?.label} Reservations`}
            </h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              {filter === 'all'
                ? 'Browse restaurants and book a table to enjoy dining in!'
                : 'Try a different filter to see your bookings.'}
            </p>
            <Link
              href="/restaurant"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors"
            >
              Browse Restaurants
            </Link>
          </div>
        )}

        {/* Reservation Cards */}
        {!isLoading && filtered.map(reservation => {
          const status = STATUS_STYLES[reservation.status as ReservationStatus] || STATUS_STYLES.PENDING;
          const StatusIcon = status.icon;
          const upcoming = isUpcoming(reservation.date);

          return (
            <Link
              key={reservation.id}
              href={`/restaurant/table-booking/${reservation.id}`}
              className="block bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all group"
            >
              <div className="p-5">
                <div className="flex gap-4">
                  {/* Restaurant Emoji/Image */}
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                    {reservation.restaurantImage}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name & Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                        {reservation.restaurantName}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(reservation.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {reservation.time}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {reservation.guests} {reservation.guests === 1 ? 'guest' : 'guests'}
                      </div>
                    </div>

                    {/* Special Requests */}
                    {reservation.specialRequests && (
                      <p className="text-xs text-slate-400 mt-2 truncate italic">
                        &quot;{reservation.specialRequests}&quot;
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 shrink-0 self-center transition-colors" />
                </div>

                {/* Actions for upcoming */}
                {upcoming && reservation.status !== 'CANCELLED' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={(e: MouseEvent) => { e.preventDefault(); handleCancel(reservation.id); }}
                      className="flex-1 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      Cancel Booking
                    </button>
                    <Link
                      href={`/restaurant/table-booking/${reservation.restaurantId}`}
                      onClick={(e: MouseEvent) => e.stopPropagation()}
                      className="flex-1 px-4 py-2 text-sm font-bold text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors text-center"
                    >
                      Modify
                    </Link>
                  </div>
                )}

                {/* Rebook for past */}
                {!upcoming && reservation.status !== 'CANCELLED' && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Link
                      href={`/restaurant/table-booking/${reservation.restaurantId}`}
                      onClick={(e: MouseEvent) => e.stopPropagation()}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-bold text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Book Again
                    </Link>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
