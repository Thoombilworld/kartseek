'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import {
  Megaphone, Plus, Calendar, Tag, Percent, Truck, Package, Heart,
  AlertTriangle, Clock, ToggleLeft, ToggleRight, Sparkles, Sun,
  Star, Layers, Gift,
} from 'lucide-react';
import { vendorPharmacyApi } from '@/lib/api/vendor-pharmacy';

interface Offer {
  id: string; name: string; type: string; discount: string; code: string;
  validFrom: string; validTo: string; used: number; limit: number;
  enabled: boolean; category: string; rxRestricted: boolean;
}

const MOCK_OFFERS: Offer[] = [
  { id: 'O1', name: 'Monsoon Health Sale', type: 'Seasonal', discount: '15% off', code: 'HEALTH15', validFrom: 'Jun 1', validTo: 'Jun 30', used: 124, limit: 500, enabled: true, category: 'OTC', rxRestricted: false },
  { id: 'O2', name: 'Free Delivery Week', type: 'Free Delivery', discount: 'Free delivery', code: 'FREEDEL', validFrom: 'Jun 10', validTo: 'Jun 17', used: 67, limit: 200, enabled: true, category: 'All Non-Rx', rxRestricted: false },
  { id: 'O3', name: 'Vitamin Bundle', type: 'Bundle', discount: 'Buy 2 Get 1', code: 'VIT3FOR2', validFrom: 'Jun 1', validTo: 'Jul 31', used: 38, limit: 100, enabled: true, category: 'Wellness', rxRestricted: false },
  { id: 'O4', name: 'Senior Citizen Discount', type: 'Flat', discount: '₹50 off', code: 'SENIOR50', validFrom: 'Jan 1', validTo: 'Dec 31', used: 210, limit: 1000, enabled: true, category: 'OTC', rxRestricted: false },
  { id: 'O5', name: 'Summer Glow Beauty Sale', type: 'Beauty Campaign', discount: '20% off', code: 'GLOW20', validFrom: 'Jun 1', validTo: 'Jun 30', used: 89, limit: 400, enabled: true, category: 'Beauty & Personal Care', rxRestricted: false },
  { id: 'O6', name: 'Wellness Wednesday', type: 'Wellness Campaign', discount: '10% off', code: 'WELLWED', validFrom: 'Jun 1', validTo: 'Dec 31', used: 156, limit: 1000, enabled: true, category: 'Health & Wellness', rxRestricted: false },
  { id: 'O7', name: 'CeraVe Spotlight', type: 'Featured Product', discount: '₹100 off', code: 'CERAVE100', validFrom: 'Jun 10', validTo: 'Jun 20', used: 22, limit: 50, enabled: true, category: 'Skin Care', rxRestricted: false },
  { id: 'O8', name: 'Boost Vitamins Category', type: 'Sponsored Category', discount: 'Top position', code: 'SPOTVIT', validFrom: 'Jun 1', validTo: 'Jun 30', used: 0, limit: 1, enabled: false, category: 'Vitamins & Supplements', rxRestricted: false },
];

const TYPE_ICON: Record<string, typeof Tag> = {
  Percentage: Percent, Flat: Tag, 'Free Delivery': Truck, Bundle: Package,
  'Beauty Campaign': Sparkles, 'Wellness Campaign': Heart, 'Featured Product': Star,
  'Sponsored Category': Layers, Seasonal: Sun,
};

const TYPE_COLORS: Record<string, string> = {
  'Beauty Campaign': 'bg-pink-50 border-pink-200',
  'Wellness Campaign': 'bg-emerald-50 border-emerald-200',
  'Featured Product': 'bg-amber-50 border-amber-200',
  'Sponsored Category': 'bg-purple-50 border-purple-200',
  Seasonal: 'bg-orange-50 border-orange-200',
};

const OFFER_TYPES = ['All', 'Percentage', 'Flat', 'Free Delivery', 'Bundle', 'Beauty Campaign', 'Wellness Campaign', 'Featured Product', 'Sponsored Category', 'Seasonal'];

export default function PharmacyOffersPage() {
  const [offers, setOffers] = useState(MOCK_OFFERS);
  const [filterType, setFilterType] = useState('All');

  const toggle = (id: string) => setOffers((p) => p.map((o) => o.id === id ? { ...o, enabled: !o.enabled } : o));

  const filtered = offers.filter((o) => filterType === 'All' || o.type === filterType);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Promotions & Campaigns</h1>
          <p className="text-sm text-slate-500">Create offers, beauty campaigns, wellness drives, and seasonal promotions.</p>
        </div>
        <button className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      {/* Compliance Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Regulatory Compliance Notice</p>
          <p className="text-xs text-amber-700 mt-0.5">Prescription medicines (Schedule H, H1, X) cannot be promoted or discounted per Drug Control regulations. Offers apply only to OTC, wellness, beauty, personal care, and medical device categories.</p>
        </div>
      </div>

      {/* Campaign Type KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Active Offers', value: offers.filter((o) => o.enabled).length, color: 'text-emerald-600' },
          { label: 'Beauty Campaigns', value: offers.filter((o) => o.type === 'Beauty Campaign').length, color: 'text-pink-600' },
          { label: 'Wellness Drives', value: offers.filter((o) => o.type === 'Wellness Campaign').length, color: 'text-emerald-600' },
          { label: 'Total Redemptions', value: offers.reduce((s, o) => s + o.used, 0), color: 'text-blue-600' },
          { label: 'Featured Products', value: offers.filter((o) => o.type === 'Featured Product').length, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {OFFER_TYPES.map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              filterType === t ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Offer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((offer) => {
          const Icon = TYPE_ICON[offer.type] ?? Tag;
          const usagePct = Math.round((offer.used / offer.limit) * 100);
          const customBg = TYPE_COLORS[offer.type] || '';

          return (
            <div key={offer.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 transition-all ${!offer.enabled ? 'opacity-50 border-slate-200' : customBg || 'border-slate-100'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    offer.type === 'Beauty Campaign' ? 'bg-pink-100' :
                    offer.type === 'Wellness Campaign' ? 'bg-emerald-100' :
                    offer.type === 'Featured Product' ? 'bg-amber-100' :
                    offer.type === 'Sponsored Category' ? 'bg-purple-100' :
                    offer.type === 'Seasonal' ? 'bg-orange-100' : 'bg-teal-50'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      offer.type === 'Beauty Campaign' ? 'text-pink-600' :
                      offer.type === 'Wellness Campaign' ? 'text-emerald-600' :
                      offer.type === 'Featured Product' ? 'text-amber-600' :
                      offer.type === 'Sponsored Category' ? 'text-purple-600' :
                      offer.type === 'Seasonal' ? 'text-orange-600' : 'text-teal-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">{offer.name}</h3>
                    <p className="text-[10px] text-slate-400">{offer.type} • {offer.category}</p>
                  </div>
                </div>
                <button onClick={() => toggle(offer.id)} title={offer.enabled ? 'Disable' : 'Enable'}>
                  {offer.enabled ? <ToggleRight className="w-7 h-7 text-emerald-500" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 font-black text-sm rounded-lg ${
                  offer.type === 'Beauty Campaign' ? 'bg-pink-100 text-pink-700' :
                  offer.type === 'Wellness Campaign' ? 'bg-emerald-100 text-emerald-700' :
                  offer.type === 'Sponsored Category' ? 'bg-purple-100 text-purple-700' : 'bg-teal-50 text-teal-700'
                }`}>{offer.discount}</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-xs rounded">{offer.code}</span>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-3">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {offer.validFrom} — {offer.validTo}</span>
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="font-bold text-slate-500">{offer.used} / {offer.limit} {offer.type === 'Sponsored Category' ? 'slot' : 'used'}</span>
                  <span className="font-black text-teal-600">{usagePct}%</span>
                </div>
                <div className="bg-slate-100 rounded-full h-1.5">
                  <ProgressBar percent={usagePct} className={`rounded-full h-1.5 transition-all ${
                    offer.type === 'Beauty Campaign' ? 'bg-pink-500' :
                    offer.type === 'Wellness Campaign' ? 'bg-emerald-500' : 'bg-teal-500'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
