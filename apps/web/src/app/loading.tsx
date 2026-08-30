'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className ?? ''}`} />;
}

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shimmer className="h-8 w-32" />
            <Shimmer className="h-8 w-28 rounded-full hidden md:block" />
          </div>
          <div className="flex items-center gap-2">
            <Shimmer className="h-9 w-64 hidden md:block" />
            <Shimmer className="h-9 w-9 rounded-xl" />
            <Shimmer className="h-9 w-9 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-7">
        {/* Wallet & Loyalty Row */}
        <div className="grid grid-cols-2 gap-3">
          <Shimmer className="h-24 rounded-2xl" />
          <Shimmer className="h-24 rounded-2xl" />
        </div>

        {/* Promo Banner */}
        <Shimmer className="h-44 sm:h-52 md:h-56 rounded-3xl" />

        {/* Services Grid */}
        <div>
          <Shimmer className="h-5 w-28 mb-4" />
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Shimmer className="w-16 h-16 md:w-20 md:h-20 rounded-2xl" />
                <Shimmer className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 flex flex-col items-center gap-2">
              <Shimmer className="w-8 h-8 rounded-lg" />
              <Shimmer className="h-4 w-12" />
              <Shimmer className="h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Shimmer className="h-5 w-32" />
            <Shimmer className="h-4 w-16" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shimmer className="w-9 h-9 rounded-xl" />
                  <div className="space-y-1.5">
                    <Shimmer className="h-4 w-32" />
                    <Shimmer className="h-3 w-24" />
                  </div>
                </div>
                <Shimmer className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Trending */}
        <div>
          <Shimmer className="h-5 w-36 mb-3" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Shimmer key={i} className="h-10 w-28 rounded-2xl shrink-0" />
            ))}
          </div>
        </div>

        {/* Brands */}
        <div>
          <Shimmer className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Shimmer className="w-16 h-16 rounded-full" />
                <Shimmer className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Restaurant Cards */}
        <div>
          <Shimmer className="h-6 w-48 mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[260px] bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <Shimmer className="w-full h-36 rounded-none" />
                <div className="p-3 space-y-2">
                  <Shimmer className="h-4 w-3/4" />
                  <Shimmer className="h-3 w-1/2" />
                  <div className="flex gap-1.5 pt-1">
                    <Shimmer className="h-6 w-16 rounded-md" />
                    <Shimmer className="h-6 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
