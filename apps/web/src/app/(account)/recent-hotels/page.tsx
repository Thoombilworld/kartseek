'use client';

/**
 * Recently viewed hotels.
 *
 * This listed six hardcoded properties with invented "viewed 2 hours ago"
 * timestamps and prices in four currencies written as literals, plus a "Clear
 * All" button wired to nothing. Browsing hotels changed none of it.
 *
 * Nothing records hotel views. hotel-service has no recently-viewed pattern, and
 * the `get_recently_viewed` / `clear_recently_viewed` pair that exists belongs to
 * marketplace-service and stores product ids. Recording views in the browser
 * instead would mean building on `/hotel-booking/hotel/[hotelId]`, which renders
 * the same fixed hotel for every id — the list would fill up with one property
 * under six different names.
 *
 * So this says so, and points at the two things that do work.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Search } from 'lucide-react';

export default function RecentHotelsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-3 xs:px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/hotel-booking/profile"
            aria-label="Back to hotels profile"
            className="w-11 h-11 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Recently viewed</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 xs:px-4 py-10 xs:py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">We aren&apos;t tracking hotel views yet</h2>
          <p className="text-sm text-slate-500 mt-2">
            Hotels you look at aren&apos;t recorded, so there&apos;s no history to show here.
            Your actual reservations are in My bookings.
          </p>
          <div className="flex flex-col xs:flex-row gap-2.5 justify-center mt-6">
            <Link
              href="/hotel-booking"
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              <Search className="w-4 h-4" aria-hidden="true" /> Search hotels
            </Link>
            <Link
              href="/hotel-booking/my-bookings"
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors text-sm"
            >
              My bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
