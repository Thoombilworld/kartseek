'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className ?? ''}`} />;
}

export default function GroceryLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Shimmer className="h-7 w-36" />
          <Shimmer className="h-10 w-64 hidden md:block" />
          <Shimmer className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Banner */}
        <Shimmer className="h-40 md:h-52 w-full" />

        {/* Category Chips */}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <Shimmer className="w-14 h-14 rounded-2xl" />
              <Shimmer className="h-3 w-12" />
            </div>
          ))}
        </div>

        {/* Product Row */}
        <div>
          <Shimmer className="h-5 w-44 mb-4" />
          <div className="grid grid-cols-2 ph:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
                <Shimmer className="w-full aspect-square rounded-lg" />
                <Shimmer className="h-3 w-full" />
                <Shimmer className="h-3 w-2/3" />
                <div className="flex justify-between pt-1">
                  <Shimmer className="h-4 w-14" />
                  <Shimmer className="h-7 w-7 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
