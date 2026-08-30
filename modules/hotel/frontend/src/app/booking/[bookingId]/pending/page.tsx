'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Clock, Loader2, CheckCircle, AlertCircle, MapPin, CalendarDays, BedDouble, Shield } from 'lucide-react';

export default function BookingPendingPage() {
  const { bookingId } = useParams();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Animated Pending Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-30" />
            <div className="relative w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center border-4 border-amber-200">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-2">Booking Pending</h1>
          <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
            Your booking request has been sent to the hotel. You will receive a confirmation within <strong>15 minutes</strong>.
          </p>

          {/* Status Steps */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Payment Received</p>
                <p className="text-xs text-slate-400">Your payment was successfully processed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Awaiting Hotel Confirmation</p>
                <p className="text-xs text-slate-400">The hotel is reviewing your reservation</p>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-40">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-500">Booking Confirmed</p>
                <p className="text-xs text-slate-400">You will receive confirmation via email</p>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left mb-6">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Reservation Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>The Grand Palace Hotel, Dubai</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <span>Jul 1–3, 2026 (2 nights)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <BedDouble className="w-4 h-4 text-purple-500" />
                <span>Deluxe King Room · 2 Guests</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-sm font-bold text-slate-900">AED 1,035</span>
            </div>
          </div>

          {/* Protection notice */}
          <div className="flex items-center gap-2 justify-center text-xs text-emerald-600 mb-6">
            <Shield className="w-4 h-4" />
            <span className="font-medium">Protected by KARTSEEK Booking Guarantee</span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link href="/hotel-booking/my-bookings" className="block w-full bg-rose-600 text-white font-bold py-4 rounded-2xl hover:bg-rose-700 transition-colors">
              Go to My Bookings
            </Link>
            <Link href="/hotel-booking" className="block w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-colors">
              Browse More Hotels
            </Link>
          </div>

          <p className="text-[10px] text-slate-400 mt-4">
            Booking ID: {bookingId} · You will receive email and push notification updates
          </p>
        </div>
      </div>
    </div>
  );
}
