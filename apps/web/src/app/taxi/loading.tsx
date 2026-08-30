'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className ?? ''}`} />;
}

export default function TaxiLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Map Placeholder */}
      <Shimmer className="w-full h-64 md:h-80 rounded-none" />

      <div className="max-w-3xl mx-auto px-4 -mt-8 relative z-10 space-y-5">
        {/* Booking Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 space-y-4">
          <Shimmer className="h-6 w-40" />
          <Shimmer className="h-12 w-full" />
          <Shimmer className="h-12 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <Shimmer className="h-20 rounded-xl" />
            <Shimmer className="h-20 rounded-xl" />
            <Shimmer className="h-20 rounded-xl" />
          </div>
          <Shimmer className="h-12 w-full rounded-xl" />
        </div>

        {/* Recent Rides */}
        <div className="space-y-3">
          <Shimmer className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4">
              <Shimmer className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-4 w-48" />
                <Shimmer className="h-3 w-32" />
              </div>
              <Shimmer className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
