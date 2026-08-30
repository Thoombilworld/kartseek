'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className ?? ''}`} />;
}

export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Hero Banner Skeleton */}
      <Shimmer className="w-full h-56 md:h-72 rounded-none" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Search Bar */}
        <Shimmer className="h-12 w-full max-w-xl mx-auto" />

        {/* Category Row */}
        <div>
          <Shimmer className="h-5 w-32 mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                <Shimmer className="w-16 h-16 rounded-2xl" />
                <Shimmer className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div>
          <Shimmer className="h-5 w-40 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3 space-y-3">
                <Shimmer className="w-full aspect-square rounded-xl" />
                <Shimmer className="h-4 w-3/4" />
                <Shimmer className="h-3 w-1/2" />
                <div className="flex justify-between items-center pt-1">
                  <Shimmer className="h-5 w-16" />
                  <Shimmer className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
