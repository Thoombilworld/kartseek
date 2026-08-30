'use client';
import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Edit2, Trash2, CheckCircle, Search, X, Weight,
  MapPin, Package, Calculator, DollarSign, ToggleLeft, ToggleRight,
  ShieldCheck, Users, ArrowRight, AlertTriangle, Eye,
} from 'lucide-react';
import { useAdminData, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type RateTier = { label: string; rate: number };

type ShippingRule = {
  id: string; name: string; type: 'flat' | 'weight' | 'value' | 'distance';
  zones: string[]; active: boolean; freeAbove: number | null;
  rates: RateTier[];
  sellerOverrides?: number; // how many sellers have customized this rule
};

// Admin-defined rate rules — these flow down to seller portals
const ADMIN_RULES: ShippingRule[] = [
  { id: 'SR-001', name: 'Metro Cities — Free Shipping', type: 'value',
    zones: ['Mumbai Metro', 'Delhi NCR', 'Bangalore Metro', 'Chennai Metro', 'Hyderabad Metro', 'Kolkata Metro'],
    active: true, freeAbove: 499,
    rates: [{ label: 'Orders below ₹499', rate: 40 }, { label: 'Orders ₹499+', rate: 0 }],
    sellerOverrides: 12,
  },
  { id: 'SR-002', name: 'Tier-1 Cities — Weight Based', type: 'weight',
    zones: ['Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'],
    active: true, freeAbove: 799,
    rates: [{ label: 'Up to 500g', rate: 49 }, { label: '500g – 1kg', rate: 79 }, { label: '1kg – 3kg', rate: 99 }, { label: '3kg – 5kg', rate: 149 }, { label: 'Above 5kg', rate: 199 }],
    sellerOverrides: 8,
  },
  { id: 'SR-003', name: 'Tier-2 & Tier-3 Cities', type: 'weight',
    zones: ['Surat', 'Indore', 'Bhopal', 'Coimbatore', 'Nagpur', 'Visakhapatnam'],
    active: true, freeAbove: 999,
    rates: [{ label: 'Up to 500g', rate: 69 }, { label: '500g – 1kg', rate: 89 }, { label: '1kg – 3kg', rate: 119 }, { label: '3kg – 5kg', rate: 169 }, { label: 'Above 5kg', rate: 249 }],
    sellerOverrides: 5,
  },
  { id: 'SR-004', name: 'Rest of India', type: 'weight',
    zones: ['North East', 'J&K', 'Himachal', 'Islands', 'Rural Areas'],
    active: true, freeAbove: 1499,
    rates: [{ label: 'Up to 500g', rate: 79 }, { label: '500g – 1kg', rate: 99 }, { label: '1kg – 3kg', rate: 149 }, { label: '3kg – 5kg', rate: 199 }, { label: 'Above 5kg', rate: 299 }],
    sellerOverrides: 3,
  },
  { id: 'SR-005', name: 'Express Delivery Surcharge', type: 'flat',
    zones: ['All Zones'],
    active: true, freeAbove: null,
    rates: [{ label: 'Same Day Delivery', rate: 99 }, { label: 'Next Day Guaranteed', rate: 49 }],
    sellerOverrides: 0,
  },
  { id: 'SR-006', name: 'Large / Heavy Items', type: 'weight',
    zones: ['All Zones'],
    active: true, freeAbove: null,
    rates: [{ label: '5kg – 10kg', rate: 249 }, { label: '10kg – 25kg', rate: 399 }, { label: 'Above 25kg', rate: 599 }],
    sellerOverrides: 2,
  },
];

const TYPE_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  flat: { label: 'Flat Rate', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: DollarSign },
  weight: { label: 'Weight Based', color: 'bg-purple-50 text-purple-600 border-purple-200', icon: Weight },
  value: { label: 'Order Value', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: Calculator },
  distance: { label: 'Distance Based', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: MapPin },
};

const ZONE_BADGES: Record<string, string> = {
  'Mumbai Metro': 'bg-orange-50 text-orange-600', 'Delhi NCR': 'bg-red-50 text-red-600',
  'Bangalore Metro': 'bg-violet-50 text-violet-600', 'Chennai Metro': 'bg-cyan-50 text-cyan-600',
  'Hyderabad Metro': 'bg-pink-50 text-pink-600', 'Kolkata Metro': 'bg-amber-50 text-amber-600',
  'All Zones': 'bg-indigo-50 text-indigo-600',
};

export default function ShippingRatesPage() {
  const [rules, setRules] = useState(ADMIN_RULES);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const showToastMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const toggleActive = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    const rule = rules.find(r => r.id === id);
    showToastMsg(`${rule?.name} ${rule?.active ? 'disabled' : 'enabled'}`);
  };
  const deleteRule = (id: string) => {
    const rule = rules.find(r => r.id === id);
    setRules(prev => prev.filter(r => r.id !== id));
    showToastMsg(`"${rule?.name}" deleted`);
  };

  const filtered = rules.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.zones.some(z => z.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const totalSellerOverrides = rules.reduce((s, r) => s + (r.sellerOverrides || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            Shipping Rates
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure platform-wide shipping charges — sellers inherit these as base rates</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />Add Rule
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-sm text-emerald-700 font-medium">
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" />{toast}</div>
          <button onClick={() => setToast(null)}><X className="w-4 h-4 text-emerald-500" /></button>
        </div>
      )}

      {/* Admin-Seller Data Flow Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-blue-800 text-sm">Centralized Rate Management</h3>
          <p className="text-xs text-blue-600 mt-0.5">
            Rates defined here are the <strong>platform base rates</strong> that flow to all seller portals.
            Sellers can customize rates within your bounds but cannot exceed admin maximums.
            Currently <strong>{totalSellerOverrides} seller{totalSellerOverrides !== 1 ? 's have' : ' has'} custom overrides</strong>.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Rules', value: rules.length, icon: Package, color: 'text-blue-600' },
          { label: 'Active Rules', value: rules.filter(r => r.active).length, icon: CheckCircle, color: 'text-emerald-600' },
          { label: 'Free Shipping Rules', value: rules.filter(r => r.freeAbove !== null).length, icon: Truck, color: 'text-purple-600' },
          { label: 'Zones Covered', value: [...new Set(rules.flatMap(r => r.zones))].length, icon: MapPin, color: 'text-indigo-600' },
          { label: 'Seller Overrides', value: totalSellerOverrides, icon: Users, color: 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-1"><k.icon className={`w-4 h-4 ${k.color}`} /><p className="text-[10px] font-bold text-slate-400 uppercase">{k.label}</p></div>
            <p className="text-xl font-black text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules or zones..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'flat', 'weight', 'value', 'distance'].map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filterType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {t === 'all' ? 'All Types' : TYPE_CFG[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No shipping rules match your filters</p>
          </div>
        ) : filtered.map(r => {
          const cfg = TYPE_CFG[r.type];
          return (
            <div key={r.id} className={`bg-white border rounded-xl p-5 transition-all hover:shadow-md ${r.active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{r.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color} flex items-center gap-0.5`}><cfg.icon className="w-3 h-3" />{cfg.label}</span>
                    {r.freeAbove !== null && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Free above ₹{r.freeAbove}</span>}
                    {!r.active && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Disabled</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {r.zones.map((z, i) => (
                      <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded ${ZONE_BADGES[z] || 'bg-slate-50 text-slate-500'}`}>{z}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Seller Override Indicator */}
                  {(r.sellerOverrides || 0) > 0 && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg flex items-center gap-1 border border-amber-200" title={`${r.sellerOverrides} sellers have customized this rate`}>
                      <Users className="w-3 h-3" />{r.sellerOverrides} override{(r.sellerOverrides || 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  <button onClick={() => toggleActive(r.id)} className="p-1">{r.active ? <ToggleRight className="w-7 h-7 text-emerald-500" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}</button>
                  <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600" aria-label="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteRule(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {/* Rate Table */}
              <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-200"><th className="text-left px-3 py-2 font-bold text-slate-400 uppercase">Tier</th><th className="text-right px-3 py-2 font-bold text-slate-400 uppercase">Rate</th><th className="text-right px-3 py-2 font-bold text-slate-400 uppercase">Seller Can Customize</th></tr></thead>
                  <tbody>
                    {r.rates.map((rate, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-600">{rate.label}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">{rate.rate === 0 ? <span className="text-emerald-600">FREE</span> : `₹${rate.rate}`}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">≤ ₹{rate.rate === 0 ? 0 : rate.rate}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rate Calculation Reference */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
          <Calculator className="w-4 h-4 text-blue-500" />
          Rate Calculation Logic — How Admin Rates Flow to Sellers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div><strong>Zone Match:</strong> Buyer's pincode maps to an admin-defined delivery zone</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div><strong>Base Rate:</strong> Admin base rate for that zone is applied as the ceiling</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div><strong>Seller Override:</strong> If the seller has a custom rate ≤ admin maximum, it's used</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <div><strong>Weight Surcharge:</strong> Weight-based tiers added on top of base rate</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
              <div><strong>Free Shipping:</strong> If order exceeds threshold (admin or seller — whichever is lower), shipping = ₹0</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">6</span>
              <div><strong>Express Surcharge:</strong> Flat surcharge added for same-day / next-day options</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)} ><DismissOnEscape onDismiss={() => setShowAdd(false)} /></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4 p-5 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add Shipping Rule</h3>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="rule-name">Rule Name *</label><input id="rule-name" placeholder="e.g., Metro Cities — Free Shipping" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="rate-type">Rate Type *</label><select id="rate-type" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" aria-label="Rate type"><option>Flat Rate</option><option>Weight Based</option><option>Order Value</option><option>Distance Based</option></select></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="free-above">Free Above (₹)</label><input id="free-above" type="number" placeholder="499" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /></div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="applicable-zones">Applicable Zones</label>
              <select id="applicable-zones" multiple className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none h-24 focus:ring-2 focus:ring-blue-200" aria-label="Zones">
                <option>Mumbai Metro</option><option>Delhi NCR</option><option>Bangalore Metro</option><option>Chennai Metro</option>
                <option>Hyderabad Metro</option><option>Kolkata Metro</option><option>Tier-1 Cities</option><option>Tier-2 Cities</option>
                <option>Rest of India</option><option>All Zones</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rate Tiers</label>
              <p className="text-[10px] text-slate-400 mb-2">Define shipping cost tiers. Sellers can only set rates ≤ these values.</p>
              {[['Up to 500g', '49'], ['500g – 1kg', '79'], ['1kg – 3kg', '99']].map(([tier, rate], i) => (
                <div key={i} className="flex gap-2 mb-2"><input defaultValue={tier} placeholder="Tier name" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"  aria-label="Tier name"/><input defaultValue={rate} placeholder="₹" className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              ))}
              <button className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-1"><Plus className="w-3 h-3" />Add Tier</button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600">This rule will be pushed to <strong>all active sellers</strong> as a base rate. Sellers can customize within your defined maximums.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => { setShowAdd(false); showToastMsg('Shipping rule created — syncing to sellers'); }} className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors">Create & Publish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
