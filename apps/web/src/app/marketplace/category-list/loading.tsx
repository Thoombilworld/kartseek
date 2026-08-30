import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className ?? ''}`} />;
}

export default function CategoryListLoading() {
  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Header placeholder */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 py-6">
          <div className="flex items-center gap-2 mb-2">
            <Shimmer className="h-4 w-12" />
            <span className="text-slate-300">/</span>
            <Shimmer className="h-4 w-28" />
          </div>
          <Shimmer className="h-8 w-64 mb-2" />
          <Shimmer className="h-4 w-80" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Category header */}
              <div className="flex items-center gap-4 p-5 border-b border-slate-50">
                <Shimmer className="w-14 h-14 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-5 w-40" />
                  <Shimmer className="h-3 w-24" />
                </div>
              </div>
              {/* Subcategory pills */}
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Shimmer key={j} className="h-8 w-24 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
