'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CalendarDays, Clock, Users, MapPin, Phone, Star,
  CalendarCheck, CalendarX, CalendarClock, ChevronRight, Utensils,
  Navigation, ExternalLink, XCircle, CheckCircle2,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { restaurantApi } from '@/lib/api/restaurant';

/* ── Mock Booking Detail (fallback) ── */
const MOCK_BOOKING = {
  id: 'RES-001',
  restaurantId: 'RST-003',
  restaurantName: 'Biryani Blues',
  restaurantAddress: '45 Brigade Road, Bengaluru 560001',
  restaurantPhone: '+91 80 4567 8900',
  restaurantImage: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
  restaurantRating: 4.6,
  date: '2026-07-05',
  time: '19:30',
  guests: 4,
  tableNumber: 'T-03',
  status: 'CONFIRMED',
  specialRequests: 'Window seat if possible',
  confirmationCode: 'BKG-7X4M',
  createdAt: '2026-06-30T10:00:00Z',
  timeline: [
    { status: 'BOOKING_PLACED', time: '2026-06-30T10:00:00Z', done: true, label: 'Booking Placed' },
    { status: 'CONFIRMED', time: '2026-06-30T10:05:00Z', done: true, label: 'Confirmed by Restaurant' },
    { status: 'REMINDER_SENT', time: null, done: false, label: 'Reminder (1 hr before)' },
    { status: 'CHECKED_IN', time: null, done: false, label: 'Checked In' },
    { status: 'COMPLETED', time: null, done: false, label: 'Dining Completed' },
  ],
};

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

const STATUS_CONFIG: Record<BookingStatus, { bg: string; text: string; label: string; icon: typeof CalendarDays; border: string }> = {
  PENDING:   { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Pending Confirmation',   icon: CalendarClock, border: 'border-amber-300' },
  CONFIRMED: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Confirmed',              icon: CalendarCheck, border: 'border-green-300' },
  COMPLETED: { bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Completed',              icon: CheckCircle2,  border: 'border-slate-300' },
  CANCELLED: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Cancelled',              icon: CalendarX,     border: 'border-red-300' },
  NO_SHOW:   { bg: 'bg-orange-100', text: 'text-orange-700', label: 'No Show',                icon: XCircle,       border: 'border-orange-300' },
};

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const [booking, setBooking] = useState(MOCK_BOOKING);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [bookingId]);

  const status = STATUS_CONFIG[(booking.status as BookingStatus)] || STATUS_CONFIG.PENDING;
  const StatusIcon = status.icon;
  const isUpcoming = new Date(booking.date) > new Date();

  const handleCancel = async () => {
    try {
      await restaurantApi.cancelReservation(bookingId, { reason: 'Plans changed' });
    } catch (_e) { /* update UI anyway */ }
    setBooking(prev => ({ ...prev, status: 'CANCELLED' }));
    setShowCancelModal(false);
  };

  const formattedDate = new Date(booking.date).toLocaleDateString('en', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/table-booking" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-900">Booking Details</h1>
            <p className="text-xs text-slate-400">{booking.confirmationCode}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Status Banner */}
        <div className={`rounded-2xl p-5 border ${status.border} ${status.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.bg}`}>
              <StatusIcon className={`w-6 h-6 ${status.text}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${status.text}`}>{status.label}</p>
              <p className="text-sm text-slate-500">Booking #{booking.confirmationCode}</p>
            </div>
          </div>
        </div>

        {/* Restaurant Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="h-40 w-full bg-slate-100 relative">
            <img src={booking.restaurantImage} alt={booking.restaurantName} className="w-full h-full object-cover" />
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-bold text-sm">{booking.restaurantRating}</span>
            </div>
          </div>
          <div className="p-5">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{booking.restaurantName}</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{booking.restaurantAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`tel:${booking.restaurantPhone}`} className="text-orange-600 font-medium hover:underline">{booking.restaurantPhone}</a>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(booking.restaurantAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Navigation className="w-4 h-4" /> Directions
              </a>
              <Link
                href={`/${booking.restaurantId}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 rounded-xl text-sm font-bold text-orange-600 hover:bg-orange-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> View Menu
              </Link>
            </div>
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-orange-500" /> Booking Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
                <CalendarDays className="w-3.5 h-3.5" /> DATE
              </div>
              <p className="font-bold text-slate-900">{formattedDate}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
                <Clock className="w-3.5 h-3.5" /> TIME
              </div>
              <p className="font-bold text-slate-900">{booking.time}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
                <Users className="w-3.5 h-3.5" /> GUESTS
              </div>
              <p className="font-bold text-slate-900">{booking.guests} {booking.guests === 1 ? 'Guest' : 'Guests'}</p>
            </div>
            {booking.tableNumber && (
              <div className="bg-slate-50 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
                  <Utensils className="w-3.5 h-3.5" /> TABLE
                </div>
                <p className="font-bold text-slate-900">{booking.tableNumber}</p>
              </div>
            )}
          </div>

          {booking.specialRequests && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <p className="text-xs font-medium text-amber-600 mb-1">Special Requests</p>
              <p className="text-sm text-amber-800 italic">&quot;{booking.specialRequests}&quot;</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-4">Booking Timeline</h3>
          <div className="space-y-0">
            {booking.timeline.map((step, i) => (
              <div key={step.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    step.done ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {step.done ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />}
                  </div>
                  {i < booking.timeline.length - 1 && (
                    <div className={`w-0.5 h-8 ${step.done ? 'bg-green-200' : 'bg-slate-200'}`} />
                  )}
                </div>
                <div className="pb-6">
                  <p className={`font-bold text-sm ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                  {step.time && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(step.time).toLocaleString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {isUpcoming && booking.status !== 'CANCELLED' && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex-1 py-3.5 text-center font-bold text-red-600 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors border border-red-200"
            >
              Cancel Booking
            </button>
            <Link
              href={`/table-booking/${booking.restaurantId}`}
              className="flex-1 py-3.5 text-center font-bold text-white bg-orange-600 rounded-2xl hover:bg-orange-700 transition-colors shadow-md"
            >
              Modify Booking
            </Link>
          </div>
        )}

        {booking.status === 'CANCELLED' && (
          <Link
            href={`/table-booking/${booking.restaurantId}`}
            className="block w-full py-3.5 text-center font-bold text-white bg-orange-600 rounded-2xl hover:bg-orange-700 transition-colors shadow-md"
          >
            Rebook at {booking.restaurantName}
          </Link>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarX className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Cancel Booking?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Your reservation at <strong>{booking.restaurantName}</strong> on {formattedDate} at {booking.time} will be cancelled.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Keep It
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
