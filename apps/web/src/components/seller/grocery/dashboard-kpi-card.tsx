'use client';
import React from 'react';
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';

import { buttonActivationProps } from '@/lib/a11y/activate-on-key';
interface DashboardKpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  delta?: string;
  deltaUp?: boolean;
  subtitle?: string;
  onClick?: () => void;
}

export default function DashboardKpiCard({
  label,
  value,
  icon: Icon,
  color,
  delta,
  deltaUp,
  subtitle,
  onClick,
}: DashboardKpiCardProps) {
  return (
    /*
      `onClick` is optional here — most KPI cards are read-only tiles. Button
      semantics are therefore applied only when a handler was actually passed;
      giving every card `role="button"` would announce a plain statistic as
      something you can press.
    */
    <div
      className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      {...(onClick ? buttonActivationProps(onClick) : {})}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        {delta && (
          <span
            className={`text-[11px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
              deltaUp
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-red-600 bg-red-50'
            }`}
          >
            {deltaUp ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {delta}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{label}</p>
      {subtitle && (
        <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
