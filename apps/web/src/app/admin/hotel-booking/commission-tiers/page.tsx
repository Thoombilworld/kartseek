'use client';
import React, { useState, useEffect } from 'react';
import { Percent, TrendingUp, Building2, Star, Edit2, Save, Plus, Trash2, Info } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

interface CommissionTier {
  id: string; name: string; minBookings: number; maxBookings: number | null;
  rate: number; qualityBonus: number; color: string; hotels: number;
}

const TIERS: CommissionTier[] = [
  { id: 'ct-001', name: 'Starter', minBookings: 0, maxBookings: 49, rate: 18, qualityBonus: 0, color: 'bg-slate-400', hotels: 45 },
  { id: 'ct-002', name: 'Silver', minBookings: 50, maxBookings: 199, rate: 15, qualityBonus: 1, color: 'bg-slate-500', hotels: 32 },
  { id: 'ct-003', name: 'Gold', minBookings: 200, maxBookings: 499, rate: 12, qualityBonus: 2, color: 'bg-amber-500', hotels: 18 },
  { id: 'ct-004', name: 'Platinum', minBookings: 500, maxBookings: null, rate: 10, qualityBonus: 3, color: 'bg-purple-500', hotels: 8 },
];

export default function CommissionTiersPage() {
  const [tiers, setTiers] = useState(TIERS);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<CommissionTier>>({});
  const [simulateBookings, setSimulateBookings] = useState<number>(100);
  const [simulateRevenue, setSimulateRevenue] = useState<number>(50000);

  const startEdit = (tier: CommissionTier) => {
    setEditId(tier.id);
    setEditValues({ rate: tier.rate, qualityBonus: tier.qualityBonus, minBookings: tier.minBookings, maxBookings: tier.maxBookings });
  };

  const saveEdit = () => {
    setTiers(tiers.map(t => t.id === editId ? { ...t, ...editValues } : t));
    setEditId(null);
    setEditValues({});
  };

  const getCurrentTier = (bookings: number): CommissionTier => {
    return tiers.find(t => bookings >= t.minBookings && (t.maxBookings === null || bookings <= t.maxBookings)) || tiers[0];
  };

  const simTier = getCurrentTier(simulateBookings);
  const simCommission = Math.round(simulateRevenue * simTier.rate / 100);
  const simBonus = Math.round(simulateRevenue * simTier.qualityBonus / 100);

  const totalHotels = tiers.reduce((s, t) => s + t.hotels, 0);
  const avgRate = (tiers.reduce((s, t) => s + t.rate * t.hotels, 0) / totalHotels).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Commission Tiers</h1>
        <p className="text-sm text-slate-500 mt-1">Configure dynamic commission rates based on hotel performance</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Hotels', value: totalHotels, icon: Building2, bg: 'bg-blue-100 text-blue-600' },
          { label: 'Active Tiers', value: tiers.length, icon: Percent, bg: 'bg-rose-100 text-rose-600' },
          { label: 'Avg Commission', value: `${avgRate}%`, icon: TrendingUp, bg: 'bg-emerald-100 text-emerald-600' },
          { label: 'Quality Hotels', value: tiers.filter(t => t.qualityBonus > 0).reduce((s, t) => s + t.hotels, 0), icon: Star, bg: 'bg-amber-100 text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tier Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {tiers.map((tier, i) => (
          <div key={tier.id} className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${
            editId === tier.id ? 'ring-2 ring-rose-500' : ''
          }`}>
            <div className={`${tier.color} h-2`} />
            <div className="p-5">
              {editId === tier.id ? (
                <div className="space-y-3">
                  <h4 className="font-black text-slate-900 text-lg">{tier.name}</h4>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400" htmlFor="commission-rate">Commission Rate (%)</label>
                    <input id="commission-rate" type="number" value={editValues.rate} onChange={e => setEditValues({ ...editValues, rate: +e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 text-sm mt-1 outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400" htmlFor="quality-bonus">Quality Bonus (%)</label>
                    <input id="quality-bonus" type="number" value={editValues.qualityBonus} onChange={e => setEditValues({ ...editValues, qualityBonus: +e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 text-sm mt-1 outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400" htmlFor="min-bookings">Min Bookings</label>
                    <input id="min-bookings" type="number" value={editValues.minBookings} onChange={e => setEditValues({ ...editValues, minBookings: +e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 text-sm mt-1 outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex-1 px-3 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1">
                      <Save className="w-3 h-3" /> Save
                    </button>
                    <button onClick={() => setEditId(null)} className="px-3 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-slate-900 text-lg">{tier.name}</h4>
                    <button onClick={() => startEdit(tier)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                  <div className="text-center mb-4">
                    <p className="text-4xl font-black text-rose-600">{tier.rate}%</p>
                    <p className="text-xs text-slate-400 font-semibold">commission</p>
                    {tier.qualityBonus > 0 && (
                      <p className="text-xs text-emerald-600 font-bold mt-1">+{tier.qualityBonus}% quality bonus</p>
                    )}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bookings</span>
                      <span className="font-bold text-slate-700">{tier.minBookings}{tier.maxBookings ? `–${tier.maxBookings}` : '+'}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hotels</span>
                      <span className="font-bold text-slate-700">{tier.hotels}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Effective Rate</span>
                      <span className="font-bold text-slate-700">{tier.rate - tier.qualityBonus}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Impact Simulator */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-rose-600" /> Impact Simulator
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500" htmlFor="monthly-bookings">Monthly Bookings</label>
              <input id="monthly-bookings" type="range" min={0} max={1000} step={10} value={simulateBookings} onChange={e => setSimulateBookings(+e.target.value)}
                className="w-full mt-1 accent-rose-600" />
              <p className="text-sm font-bold text-slate-700 mt-1">{simulateBookings} bookings</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500" htmlFor="monthly-revenue-aed">Monthly Revenue (AED)</label>
              <input id="monthly-revenue-aed" type="range" min={0} max={500000} step={5000} value={simulateRevenue} onChange={e => setSimulateRevenue(+e.target.value)}
                className="w-full mt-1 accent-rose-600" />
              <p className="text-sm font-bold text-slate-700 mt-1">AED {simulateRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className={`w-16 h-16 ${simTier.color} rounded-2xl flex items-center justify-center mx-auto mb-2`}>
                <span className="text-2xl font-black text-white">{simTier.rate}%</span>
              </div>
              <p className="font-black text-slate-900 text-lg">{simTier.name} Tier</p>
            </div>
          </div>
          <div className="space-y-3 bg-slate-50 rounded-xl p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Commission Rate</span>
              <span className="font-bold text-slate-900">{simTier.rate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Quality Bonus</span>
              <span className="font-bold text-emerald-600">-{simTier.qualityBonus}%</span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Platform Commission</span>
              <span className="font-bold text-rose-600">AED {simCommission.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Hotel Payout</span>
              <span className="font-black text-slate-900">AED {(simulateRevenue - simCommission + simBonus).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
