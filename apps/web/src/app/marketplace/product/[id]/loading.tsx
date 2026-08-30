import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className ?? ''}`} />;
}

export default function ProductLoading() {
  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-4 md:pt-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6">
          <Shimmer className="h-4 w-16" />
          <span className="text-slate-300">/</span>
          <Shimmer className="h-4 w-24" />
          <span className="text-slate-300">/</span>
          <Shimmer className="h-4 w-40" />
        </div>

        <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Image gallery placeholder */}
            <div className="space-y-3">
              <Shimmer className="w-full aspect-square rounded-sm" />
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="w-16 h-16 rounded-sm shrink-0" />
                ))}
              </div>
            </div>

            {/* Product details placeholder */}
            <div className="space-y-4">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-8 w-full" />
              <Shimmer className="h-5 w-3/4" />
              <div className="flex items-center gap-3">
                <Shimmer className="h-6 w-16 rounded" />
                <Shimmer className="h-4 w-12" />
              </div>
              <div className="flex items-baseline gap-3 pt-2">
                <Shimmer className="h-10 w-32" />
                <Shimmer className="h-5 w-20" />
                <Shimmer className="h-5 w-16" />
              </div>
              <Shimmer className="h-4 w-48" />
              <div className="flex gap-3 pt-4">
                <Shimmer className="h-12 flex-1 rounded-lg" />
                <Shimmer className="h-12 flex-1 rounded-lg" />
              </div>
              <div className="space-y-2 pt-4 border-t border-slate-100 mt-4">
                <Shimmer className="h-4 w-full" />
                <Shimmer className="h-4 w-5/6" />
                <Shimmer className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
