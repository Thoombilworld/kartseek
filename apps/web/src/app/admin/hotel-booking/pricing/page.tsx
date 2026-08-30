'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, TrendingUp, Edit, Save, X, Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle, Percent, Sun, Snowflake, CloudRain } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

/* ── Mock Pricing Data ──────────────────────────────────────────────── */
const BASE_PRICING = {
  platformFee: 8.5,
  serviceTax: 18,
  cleaningFee: 500,
  cancellationWindow: 24,
};

const SEASONAL_RULES = [
  { id: 'SR-01', name: 'Peak Summer', startDate: 'Jun 1', endDate: 'Aug 31', multiplier: 1.35, icon: '☀️', status: 'Active', appliedHotels: 98 },
  { id: 'SR-02', name: 'Christmas/NY', startDate: 'Dec 20', endDate: 'Jan 5', multiplier: 1.50, icon: '🎄', status: 'Active', appliedHotels: 124 },
  { id: 'SR-03', name: 'Monsoon Low', startDate: 'Jul 15', endDate: 'Sep 15', multiplier: 0.85, icon: '🌧️', status: 'Active', appliedHotels: 45 },
  { id: 'SR-04', name: 'Valentine Week', startDate: 'Feb 10', endDate: 'Feb 16', multiplier: 1.25, icon: '💕', status: 'Active', appliedHotels: 67 },
  { id: 'SR-05', name: 'Mid-Week Discount', startDate: 'Mon', endDate: 'Thu', multiplier: 0.90, icon: '📅', status: 'Paused', appliedHotels: 82 },
];

const DYNAMIC_PRICING_ZONES = [
  { zone: 'CBD & City Center', avgNight: 8500, occupancyThreshold: 75, surgeMultiplier: 1.2, lastTriggered: '2h ago' },
  { zone: 'Beach & Coastal', avgNight: 12000, occupancyThreshold: 80, surgeMultiplier: 1.3, lastTriggered: '5h ago' },
  { zone: 'Safari & Wildlife', avgNight: 18500, occupancyThreshold: 70, surgeMultiplier: 1.4, lastTriggered: 'Yesterday' },
  { zone: 'Airport Vicinity', avgNight: 5500, occupancyThreshold: 85, surgeMultiplier: 1.15, lastTriggered: '1h ago' },
  { zone: 'Mountain & Highlands', avgNight: 9800, occupancyThreshold: 65, surgeMultiplier: 1.25, lastTriggered: '3d ago' },
];

export default function AdminHotelPricingPage() {
  const { formatPrice } = useHotelRegionFilter([]);
  const [editBase, setEditBase] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', startDate: '', endDate: '', multiplier: '1.0' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-rose-500" /> Pricing Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage base pricing, seasonal rules, and dynamic pricing zones.</p>
        </div>
      </div>

      {/* Base Pricing */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Base Pricing Configuration</h2>
          <button onClick={() => setEditBase(!editBase)} className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 border-rose-200 text-rose-600 hover:bg-rose-50">
            {editBase ? <><Save className="w-3.5 h-3.5" /> Save</> : <><Edit className="w-3.5 h-3.5" /> Edit</>}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Platform Fee', value: `${BASE_PRICING.platformFee}%`, icon: <Percent className="w-5 h-5 text-rose-500" /> },
            { label: 'Service Tax (GST)', value: `${BASE_PRICING.serviceTax}%`, icon: <DollarSign className="w-5 h-5 text-emerald-500" /> },
            { label: 'Cleaning Fee', value: formatPrice(BASE_PRICING.cleaningFee), icon: <DollarSign className="w-5 h-5 text-blue-500" /> },
            { label: 'Free Cancel Window', value: `${BASE_PRICING.cancellationWindow}h`, icon: <Calendar className="w-5 h-5 text-amber-500" /> },
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">{item.icon}</div>
              {editBase ? (
                <input title={item.label} defaultValue={item.value} className="text-xl font-black text-slate-900 bg-white border rounded px-2 py-1 w-full" />
              ) : (
                <p className="text-xl font-black text-slate-900">{item.value}</p>
              )}
              <p className="text-xs font-medium text-slate-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal Rules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Seasonal Pricing Rules</h2>
          <button onClick={() => setShowAddRule(!showAddRule)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        </div>

        {showAddRule && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-bold text-rose-800 mb-3">New Seasonal Rule</h3>
            <div className="grid grid-cols-4 gap-3">
              <input placeholder="Rule name" value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="date" title="Start date" value={newRule.startDate} onChange={e => setNewRule(p => ({ ...p, startDate: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="date" title="End date" value={newRule.endDate} onChange={e => setNewRule(p => ({ ...p, endDate: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" step="0.05" placeholder="Multiplier" value={newRule.multiplier} onChange={e => setNewRule(p => ({ ...p, multiplier: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700">Save Rule</button>
              <button onClick={() => setShowAddRule(false)} className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {SEASONAL_RULES.map(rule => (
            <div key={rule.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{rule.icon}</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{rule.name}</h3>
                  <p className="text-xs text-slate-500">{rule.startDate} → {rule.endDate} · {rule.appliedHotels} hotels</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-lg font-black ${rule.multiplier > 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {rule.multiplier > 1 ? '↑' : '↓'} {rule.multiplier}x
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rule.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{rule.status}</span>
                <div className="flex gap-1">
                  <button title="Edit rule" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                  <button title="Delete rule" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Pricing Zones */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Dynamic Pricing Zones</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead><tr className="bg-slate-50 text-xs text-slate-500 uppercase">
              <th className="p-3 text-left">Zone</th>
              <th className="p-3 text-center">Avg Night Rate</th>
              <th className="p-3 text-center">Occupancy Threshold</th>
              <th className="p-3 text-center">Surge Multiplier</th>
              <th className="p-3 text-center">Last Triggered</th>
              <th className="p-3 text-center">Actions</th>
            </tr></thead>
            <tbody>{DYNAMIC_PRICING_ZONES.map((z, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-3 font-bold text-sm text-slate-900">{z.zone}</td>
                <td className="p-3 text-center font-bold">{formatPrice(z.avgNight)}</td>
                <td className="p-3 text-center"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{z.occupancyThreshold}%</span></td>
                <td className="p-3 text-center font-black text-rose-600">{z.surgeMultiplier}x</td>
                <td className="p-3 text-center text-xs text-slate-500">{z.lastTriggered}</td>
                <td className="p-3 text-center">
                  <button className="px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors">Configure</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
