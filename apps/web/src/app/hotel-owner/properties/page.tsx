'use client';

import React from 'react';
import { Building2, ArrowRight, Plus } from 'lucide-react';

const ITEMS = [
  {
    "title": "Grand Hotel Mumbai",
    "subtitle": "Westlands, Mumbai",
    "badge": "Active",
    "stats": "45 rooms • 4.5★"
  },
  {
    "title": "Beach Resort Diani",
    "subtitle": "Diani Beach, Kwale",
    "badge": "Active",
    "stats": "30 rooms • 4.7★"
  },
  {
    "title": "Safari Lodge Maasai Mara",
    "subtitle": "Narok County",
    "badge": "Setup",
    "stats": "12 tents"
  }
];

export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />Properties
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your hotel properties</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />Add Property</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ITEMS.map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{item.subtitle}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700">{item.badge}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{item.stats}</span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
