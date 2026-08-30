import React from 'react';
import Link from 'next/link';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string; // e.g. 'bg-blue-100 text-blue-600'
  href?: string;
  trend?: { value: number; label: string }; // e.g. { value: 12, label: 'vs yesterday' }
  urgent?: boolean; // red pulsing dot for attention
  className?: string;
}

export default function MarketplaceDashboardCard({ label, value, sub, icon: Icon, color, href, trend, urgent, className = '' }: Props) {
  const content = (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${href ? 'cursor-pointer hover:border-blue-300' : ''} ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          {urgent && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          )}
          {href && <ChevronRight className="w-4 h-4 text-slate-300" />}
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900 leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-sm font-semibold text-slate-500 mt-1.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : <>{content}</>;
}
