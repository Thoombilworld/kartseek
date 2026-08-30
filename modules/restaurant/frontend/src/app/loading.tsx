'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className ?? ''}`} />;
}

export default function RestaurantLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Hero / Search */}
      <div className="bg-linear-to-br from-orange-50 to-amber-50 px-4 py-10 md:py-16">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Shimmer className="h-8 w-64 mx-auto" />
          <Shimmer className="h-4 w-48 mx-auto" />
          <Shimmer className="h-12 w-full max-w-lg mx-auto" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Cuisine Filter */}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>

        {/* Restaurant Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <Shimmer className="w-full h-44 rounded-none" />
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <Shimmer className="h-5 w-40" />
                  <Shimmer className="h-5 w-10 rounded-lg" />
                </div>
                <Shimmer className="h-3 w-56" />
                <div className="flex gap-2">
                  <Shimmer className="h-6 w-16 rounded-full" />
                  <Shimmer className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
