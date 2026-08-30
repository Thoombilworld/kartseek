import React from 'react';

interface Props {
  rows?: number;
  cols?: number;
}

export default function MarketplaceLoadingState({ rows = 6, cols = 5 }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-pulse">
      {/* Header skeleton */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="h-4 bg-slate-200 rounded w-32" />
        <div className="h-4 bg-slate-200 rounded w-20" />
      </div>
      {/* Table rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, ri) => (
          <div key={ri} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: cols }).map((_, ci) => (
              <div key={ci} className={`h-4 bg-slate-100 rounded ${ci === 0 ? 'w-32' : ci === cols - 1 ? 'w-20' : 'w-24 flex-1'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
