'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className ?? ''}`} />;
}

export default function PharmacyLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-linear-to-br from-cyan-50 to-teal-50 px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Shimmer className="h-8 w-56 mx-auto" />
          <Shimmer className="h-4 w-72 mx-auto" />
          <Shimmer className="h-12 w-full max-w-md mx-auto" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Upload Prescription Card */}
        <Shimmer className="h-28 w-full" />

        {/* Category Row */}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>

        {/* Medicine Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3 space-y-3">
              <Shimmer className="w-full aspect-square rounded-xl" />
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/2" />
              <Shimmer className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
