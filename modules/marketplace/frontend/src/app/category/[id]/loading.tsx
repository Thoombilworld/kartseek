import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className ?? ''}`} />;
}

export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Hero section placeholder */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <Shimmer className="h-4 w-64 bg-white/20 mb-3" />
          <Shimmer className="h-8 w-48 bg-white/20 mb-2" />
          <Shimmer className="h-4 w-36 bg-white/20" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Subcategory pills placeholder */}
        <div className="flex gap-2 mb-6 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Shimmer key={i} className="h-8 w-24 rounded-full shrink-0" />
          ))}
        </div>

        {/* Sort bar placeholder */}
        <div className="flex items-center justify-between mb-4">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-9 w-44 rounded-lg" />
        </div>

        {/* Product grid placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-100 p-3 space-y-3">
              <Shimmer className="w-full aspect-square rounded-md" />
              <Shimmer className="h-3 w-1/3" />
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/2" />
              <div className="flex justify-between items-center pt-1">
                <Shimmer className="h-5 w-20" />
                <Shimmer className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
