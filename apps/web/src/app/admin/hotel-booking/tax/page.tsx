'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { Receipt, Edit, Save, X, Plus, Trash2, Percent, Globe, Calculator, AlertTriangle, Download, Search } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

/* ── Mock Tax Data ──────────────────────────────────────────────── */
const TAX_ZONES = [
  { id: 'TZ-01', country: 'India', zone: 'National', gst: 16, serviceTax: 2, tourismLevy: 1.5, luxuryTax: 0, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'TZ-02', country: 'India', zone: 'Delhi Coastal', gst: 16, serviceTax: 2, tourismLevy: 2.0, luxuryTax: 5, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'TZ-03', country: 'India', zone: 'National (Budget ≤7500)', gst: 12, serviceTax: 0, tourismLevy: 0, luxuryTax: 0, effectiveDate: '2026-04-01', status: 'Active' },
  { id: 'TZ-04', country: 'India', zone: 'National (Premium >7500)', gst: 18, serviceTax: 0, tourismLevy: 0, luxuryTax: 0, effectiveDate: '2026-04-01', status: 'Active' },
  { id: 'TZ-05', country: 'UAE', zone: 'Dubai', gst: 5, serviceTax: 10, tourismLevy: 7, luxuryTax: 0, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'TZ-06', country: 'Tanzania', zone: 'Zanzibar', gst: 18, serviceTax: 0, tourismLevy: 1, luxuryTax: 0, effectiveDate: '2026-06-01', status: 'Draft' },
];

const TAX_SUMMARY = {
  totalZones: 6,
  activeZones: 5,
  countries: 4,
  avgEffectiveRate: 14.2,
};

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Draft: 'bg-amber-50 text-amber-700',
  Expired: 'bg-slate-100 text-slate-500',
};

export default function AdminHotelTaxPage() {
  const { formatPrice } = useHotelRegionFilter([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAddZone, setShowAddZone] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('All');

  const countries = ['All', ...Array.from(new Set(TAX_ZONES.map(z => z.country)))];
  const filtered = TAX_ZONES
    .filter(z => filterCountry === 'All' || z.country === filterCountry)
    .filter(z => z.zone.toLowerCase().includes(search.toLowerCase()) || z.country.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Receipt className="w-6 h-6 text-rose-500" /> Tax Configuration</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage GST, service tax, tourism levies, and luxury tax across regions.</p>
        </div>
        <div className="flex gap-2">
          <button className="border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowAddZone(!showAddZone)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" /> Add Tax Zone</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{TAX_SUMMARY.totalZones}</p><p className="text-xs font-medium text-blue-600">Tax Zones</p></div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{TAX_SUMMARY.activeZones}</p><p className="text-xs font-medium text-emerald-600">Active</p></div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4"><p className="text-2xl font-black text-violet-700">{TAX_SUMMARY.countries}</p><p className="text-xs font-medium text-violet-600">Countries</p></div>
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4"><p className="text-2xl font-black text-rose-700">{TAX_SUMMARY.avgEffectiveRate}%</p><p className="text-xs font-medium text-rose-600">Avg Effective Rate</p></div>
      </div>

      {/* Add Zone Form */}
      {showAddZone && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-rose-800 mb-3">New Tax Zone</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input placeholder="Country" className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Zone Name" className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="GST %" className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Service Tax %" className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input type="number" placeholder="Tourism Levy %" className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Luxury Tax %" className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" placeholder="Effective Date" className="border rounded-lg px-3 py-2 text-sm" />
            <div />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700">Save Zone</button>
            <button onClick={() => setShowAddZone(false)} className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search zones..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full" /></div>
        <select title="Filter by country" value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2">{countries.map(c => <option key={c}>{c}</option>)}</select>
      </div>

      {/* Tax Zones Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><tr className="bg-slate-50 text-xs text-slate-500 uppercase">
            <th className="p-3 text-left">Country / Zone</th>
            <th className="p-3 text-center">GST</th>
            <th className="p-3 text-center">Service Tax</th>
            <th className="p-3 text-center">Tourism Levy</th>
            <th className="p-3 text-center">Luxury Tax</th>
            <th className="p-3 text-center">Effective Total</th>
            <th className="p-3 text-center">Effective Date</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Actions</th>
          </tr></thead>
          <tbody>{filtered.map(z => {
            const total = z.gst + z.serviceTax + z.tourismLevy + z.luxuryTax;
            return (
              <tr key={z.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-3"><strong className="text-sm text-slate-900 flex items-center gap-1"><Globe className="w-3 h-3 text-slate-400" />{z.country}</strong><p className="text-[11px] text-slate-500 ml-4">{z.zone}</p></td>
                <td className="p-3 text-center font-bold">{z.gst}%</td>
                <td className="p-3 text-center font-bold">{z.serviceTax}%</td>
                <td className="p-3 text-center font-bold">{z.tourismLevy}%</td>
                <td className="p-3 text-center font-bold">{z.luxuryTax > 0 ? `${z.luxuryTax}%` : '—'}</td>
                <td className="p-3 text-center font-black text-rose-600">{total}%</td>
                <td className="p-3 text-center text-xs text-slate-500">{z.effectiveDate}</td>
                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[z.status]}`}>{z.status}</span></td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-1">
                    <button title="Edit tax zone" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                    <button title="Delete tax zone" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      {/* Tax Compliance Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Tax Compliance Reminder</p>
          <p className="text-xs text-amber-700 mt-0.5">Tax rates must comply with local regulations. Changes take effect from the configured date and apply to all new bookings. Existing bookings retain the rate at time of booking.</p>
        </div>
      </div>
    </div>
  );
}
