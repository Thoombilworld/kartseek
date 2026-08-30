'use client';
import React from 'react';
import ProgressBar from '@/components/seller/progress-bar';

interface DataPoint {
  label: string;
  value: number;
}

interface RevenueChartProps {
  data: DataPoint[];
  color?: string;
  formatValue?: (v: number) => string;
}

export default function RevenueChart({ data, color = 'bg-orange-500', formatValue = (v) => `₹${(v / 1000).toFixed(0)}K` }: RevenueChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2 sm:gap-3 h-36">
      {data.map((d) => {
        const heightPct = (d.value / maxValue) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {formatValue(d.value)}
            </span>
            <div className="w-full relative">
              <ProgressBar
                percent={Math.max(heightPct * 1.2, 4)}
                className={`w-full rounded-t-lg ${color} transition-all duration-500 hover:opacity-80 cursor-pointer`}
                direction="vertical"
                unit="px"
              />
            </div>
            <span className="text-[10px] font-bold text-slate-600">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
