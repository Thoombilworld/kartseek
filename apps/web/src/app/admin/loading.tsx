'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className ?? ''}`} />;
}

export default function AdminLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="space-y-2">
        <Shimmer className="h-7 w-48" />
        <Shimmer className="h-4 w-72" />
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-8 w-8 rounded-lg" />
            </div>
            <Shimmer className="h-8 w-24" />
            <Shimmer className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Table Header */}
        <div className="border-b border-slate-100 px-5 py-3 flex gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-4 w-24" />
          ))}
        </div>
        {/* Table Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-slate-50 px-5 py-4 flex gap-6 items-center">
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-6 w-16 rounded-full" />
            <Shimmer className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
