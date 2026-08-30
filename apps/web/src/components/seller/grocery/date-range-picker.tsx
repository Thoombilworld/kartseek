'use client';
import React, { useState } from 'react';

type Period = 'today' | '7d' | '30d' | '90d' | 'custom';

interface DateRangePickerProps {
  value: Period;
  onChange: (period: Period, from?: string, to?: string) => void;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'custom', label: 'Custom' },
];

export type { Period };

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const handleClick = (key: Period) => {
    if (key === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(key);
    }
  };

  const applyCustom = () => {
    if (from && to) {
      onChange('custom', from, to);
      setShowCustom(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => handleClick(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              value === p.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (<div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm animate-in slide-in-from-left-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            title="Start date"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            title="End date"
          />
          <button
            onClick={applyCustom}
            className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
