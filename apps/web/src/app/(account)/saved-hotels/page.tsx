'use client';

/**
 * Saved hotels.
 *
 * This listed four hardcoded properties — The Grand Palace Hotel at "AED 450",
 * Seaside Family Resort at "₹ 8,400", Heritage Boutique at "£ 320" — with a
 * working delete button that removed them from local state. Every visitor saw
 * the same four, saving a hotel anywhere on the site added nothing here, and the
 * three hardcoded currency symbols bypassed the region registry entirely.
 *
 * There is nothing to wire it to. hotel-service exposes no favourites: its
 * message patterns cover hotels, rooms, bookings, reviews and owner/admin
 * screens, and the `add_to_wishlist` / `get_wishlist` pair that does exist
 * belongs to marketplace-service and stores product ids.
 *
 * So this says so. An empty state that names the gap is worth more than four
 * invented hotels, and it keeps the route — linked from the hotel profile —
 * from being a dead end.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Search } from 'lucide-react';

export default function SavedHotelsPage() {
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
          <h1 className="text-lg font-bold text-slate-900">Saved hotels</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 xs:px-4 py-10 xs:py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-5">
            <Heart className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Saving hotels isn&apos;t available yet</h2>
          <p className="text-sm text-slate-500 mt-2">
            We can&apos;t keep a list of saved properties for you at the moment. Your
            bookings, cancellations and vouchers are all in My bookings.
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
