import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className ?? ''}`} />;
}

export default function SubcategoryLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 pb-16">
      {/* Hero section placeholder */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <Shimmer className="h-4 w-64 bg-white/20 mb-3" />
          <Shimmer className="h-8 w-56 bg-white/20 mb-2" />
          <Shimmer className="h-4 w-32 bg-white/20" />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar placeholder */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6">
            <Shimmer className="h-5 w-20" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Shimmer key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
            <Shimmer className="h-5 w-28" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Shimmer key={i} className="h-8 w-12 rounded-lg" />
              ))}
            </div>
          </div>
        </aside>

        {/* Product grid placeholder */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-9 w-40 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
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
    </div>
  );
}
