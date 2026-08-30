'use client';
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Download, Search, CheckCircle, Clock, AlertCircle, UtensilsCrossed } from 'lucide-react';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';
import { adminRestaurantApi } from '@/lib/api/admin-restaurant';

const COMMISSIONS = [
  { id: 'RES-001', country: 'India', name: 'Burger King (Andheri)', tier: 'Standard', rate: 18, deliveryRevenue: 310000, takeawayRevenue: 80000, dineInRevenue: 20000, totalCommission: 58140, status: 'active' },
  { id: 'RES-002', country: 'India', name: 'Pizza Palace', tier: 'Premium', rate: 15, deliveryRevenue: 260000, takeawayRevenue: 50000, dineInRevenue: 40000, totalCommission: 52500, status: 'active' },
  { id: 'RES-003', country: 'India', name: 'Sushi Kingdom', tier: 'Premium', rate: 15, deliveryRevenue: 380000, takeawayRevenue: 20000, dineInRevenue: 80000, totalCommission: 72000, status: 'active' },
  { id: 'RES-004', country: 'India', name: 'Biryani House', tier: 'Enterprise', rate: 12, deliveryRevenue: 420000, takeawayRevenue: 110000, dineInRevenue: 30000, totalCommission: 67200, status: 'active' },
  { id: 'RES-005', country: 'India', name: 'China Garden', tier: 'Standard', rate: 18, deliveryRevenue: 60000, takeawayRevenue: 10000, dineInRevenue: 0, totalCommission: 12600, status: 'dispute' },
  { id: 'RES-008', country: 'UAE', name: 'Al Mahara Seafood', tier: 'Premium', rate: 15, deliveryRevenue: 450000, takeawayRevenue: 120000, dineInRevenue: 280000, totalCommission: 127500, status: 'active' },
  { id: 'RES-009', country: 'UAE', name: 'Zuma Dubai', tier: 'Enterprise', rate: 12, deliveryRevenue: 350000, takeawayRevenue: 80000, dineInRevenue: 770000, totalCommission: 144000, status: 'active' },
  { id: 'RES-010', country: 'Saudi Arabia', name: 'Al Baik', tier: 'Enterprise', rate: 12, deliveryRevenue: 850000, takeawayRevenue: 450000, dineInRevenue: 200000, totalCommission: 180000, status: 'active' },
  { id: 'RES-011', country: 'Saudi Arabia', name: 'Mama Noura', tier: 'Standard', rate: 18, deliveryRevenue: 520000, takeawayRevenue: 280000, dineInRevenue: 180000, totalCommission: 176400, status: 'active' },
];

const TIER_CFG: Record<string, string> = {
  Standard: 'bg-slate-100 text-slate-700',
  Premium: 'bg-blue-100 text-blue-700',
  Enterprise: 'bg-purple-100 text-purple-700',
};

export default function AdminCommissionsPage() {
  const [search, setSearch] = useState('');
  const { filtered, regionLabel, isFiltered, formatPrice } = useRestaurantRegionFilter(COMMISSIONS);
  const searchFiltered = filtered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalCommission = filtered.reduce((s, c) => s + c.totalCommission, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Restaurant Commissions</h1><p className="text-slate-500 text-sm">{isFiltered ? `${regionLabel} — ` : ''}Track commission rates and earnings across all partner restaurants.</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Commission (Month)', value: formatPrice(totalCommission), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Commission Rate', value: '15.6%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Standard Tier (18%)', value: '1,840', icon: UtensilsCrossed, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Enterprise Tier (12%)', value: '210', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-black ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Commission Tier Reference */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3 text-sm">Commission Tier Structure</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { tier: 'Standard', rate: '18%', desc: 'Default for new restaurants', bg: 'bg-slate-50', border: 'border-slate-200' },
            { tier: 'Premium', rate: '15%', desc: 'Rating 4.5+ or >1000 orders/mo', bg: 'bg-blue-50', border: 'border-blue-200' },
            { tier: 'Enterprise', rate: '12%', desc: 'Chain restaurants or >5000 orders/mo', bg: 'bg-purple-50', border: 'border-purple-200' },
          ].map(t => (
            <div key={t.tier} className={`${t.bg} border ${t.border} rounded-xl p-3`}>
              <p className="font-bold text-slate-900 text-sm">{t.tier}</p>
              <p className="text-2xl font-black text-slate-900 my-1">{t.rate}</p>
              <p className="text-xs text-slate-500">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search restaurants..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500">Restaurant</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500">Tier</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500">Rate</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">Delivery Rev.</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">Takeaway Rev.</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">Dine-in Rev.</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">Commission Due</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {searchFiltered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4"><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.id}</p></td>
                  <td className="px-5 py-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TIER_CFG[r.tier]}`}>{r.tier}</span></td>
                  <td className="px-5 py-4 text-center font-black text-slate-900">{r.rate}%</td>
                  <td className="px-5 py-4 text-right font-bold text-slate-700">{formatPrice(r.deliveryRevenue)}</td>
                  <td className="px-5 py-4 text-right font-bold text-slate-700">{formatPrice(r.takeawayRevenue)}</td>
                  <td className="px-5 py-4 text-right font-bold text-slate-700">{formatPrice(r.dineInRevenue)}</td>
                  <td className="px-5 py-4 text-right font-black text-emerald-700">{formatPrice(r.totalCommission)}</td>
                  <td className="px-5 py-4 text-center">
                    {r.status === 'dispute'
                      ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 w-fit mx-auto"><AlertCircle className="w-3 h-3" /> Dispute</span>
                      : <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 w-fit mx-auto"><CheckCircle className="w-3 h-3" /> Active</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={6} className="px-5 py-3.5 text-sm font-bold text-slate-900 text-right">Total Commission (This Month)</td>
                <td className="px-5 py-3.5 text-right font-black text-emerald-700 text-base">{formatPrice(totalCommission)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
