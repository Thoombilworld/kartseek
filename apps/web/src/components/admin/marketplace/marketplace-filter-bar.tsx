'use client';
import React from 'react';
import { Search, Filter, Download, X } from 'lucide-react';

interface FilterOption { label: string; value: string }

interface Props {
  search: string;
  onSearch: (v: string) => void;
  filters?: { label: string; options: FilterOption[]; value: string; onChange: (v: string) => void }[];
  onExport?: () => void;
  placeholder?: string;
  rightContent?: React.ReactNode;
}

export default function MarketplaceFilterBar({ search, onSearch, filters, onExport, placeholder = 'Search...', rightContent }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        {search && (
          <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dynamic Filter Selects */}
      {filters?.map(f => (
        <select
          key={f.label}
          value={f.value}
          onChange={e => f.onChange(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
        >
          <option value="">{f.label}</option>
          {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {rightContent}
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        )}
      </div>
    </div>
  );
}
