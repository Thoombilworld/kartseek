'use client';
import React from 'react';
import ProgressBar from '@/components/seller/progress-bar';

interface DataPoint { label: string; value: number }

export default function RevenueChart({ data }: { data: DataPoint[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2 h-[180px]">
      {data.map((point) => {
        const pct = (point.value / max) * 100;
        return (
          <div key={point.label} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="relative w-full flex justify-center">
              <span className="absolute -top-6 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                ₹{(point.value / 1000).toFixed(1)}K
              </span>
            </div>
            <ProgressBar
              percent={pct}
              className="w-full bg-linear-to-t from-teal-600 to-emerald-400 rounded-t-lg transition-all duration-500 hover:from-teal-500 hover:to-emerald-300 min-h-[4px] shadow-sm"
              direction="vertical"
            />
            <span className="text-[10px] font-bold text-slate-400">{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}
