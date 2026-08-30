'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className ?? ''}`} />;
}

export default function DoctorLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-linear-to-br from-blue-50 to-indigo-50 px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Shimmer className="h-8 w-60 mx-auto" />
          <Shimmer className="h-4 w-80 mx-auto" />
          <Shimmer className="h-12 w-full max-w-lg mx-auto" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Speciality Chips */}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <Shimmer key={i} className="h-9 w-32 shrink-0 rounded-full" />
          ))}
        </div>

        {/* Doctor Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-4">
                <Shimmer className="w-16 h-16 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-5 w-40" />
                  <Shimmer className="h-3 w-28" />
                  <Shimmer className="h-3 w-20" />
                </div>
              </div>
              <div className="flex gap-2">
                <Shimmer className="h-6 w-16 rounded-full" />
                <Shimmer className="h-6 w-20 rounded-full" />
              </div>
              <Shimmer className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
