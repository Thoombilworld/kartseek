'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className ?? ''}`} />;
}

export default function SellerLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Welcome Banner */}
      <Shimmer className="h-28 w-full" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-7 w-28" />
            <Shimmer className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-36" />
          <Shimmer className="h-8 w-28 rounded-lg" />
        </div>
        <Shimmer className="h-52 w-full" />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <Shimmer className="h-5 w-32" />
          <Shimmer className="h-8 w-24 rounded-lg" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-slate-50 px-5 py-4 flex gap-6 items-center">
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-4 w-36" />
            <Shimmer className="h-6 w-16 rounded-full" />
            <Shimmer className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
