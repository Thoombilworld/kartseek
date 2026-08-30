'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, Edit2, Trash2, Calendar, Percent, Clock, Gift, Zap,
  Star, TrendingUp, Users, ShoppingBag,
} from 'lucide-react';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

interface Offer {
  id: string; name: string; code: string; type: 'flat' | 'percentage' | 'delivery' | 'bogo' | 'combo' | 'happy_hour';
  value: string; minOrder: string; validUntil: string; status: 'active' | 'expired' | 'draft';
  usageCount: number; maxUsage: number; timeRestriction?: string; description: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  flat: { label: 'Flat Discount', icon: Tag, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  percentage: { label: 'Percentage Off', icon: Percent, color: 'text-blue-700', bg: 'bg-blue-50' },
  delivery: { label: 'Free Delivery', icon: ShoppingBag, color: 'text-purple-700', bg: 'bg-purple-50' },
  bogo: { label: 'Buy One Get One', icon: Gift, color: 'text-rose-700', bg: 'bg-rose-50' },
  combo: { label: 'Combo Deal', icon: Star, color: 'text-amber-700', bg: 'bg-amber-50' },
  happy_hour: { label: 'Happy Hour', icon: Clock, color: 'text-orange-700', bg: 'bg-orange-50' },
};

const MOCK_OFFERS: Offer[] = [
  { id: 'OFF-1', name: 'Welcome Offer', code: 'WELCOME50', type: 'flat', value: '₹50 OFF', minOrder: '₹200', validUntil: 'Dec 31, 2026', status: 'active', usageCount: 145, maxUsage: 500, description: 'First-time customer discount' },
  { id: 'OFF-2', name: 'Biryani Special', code: 'BIRYANI20', type: 'percentage', value: '20% OFF', minOrder: '₹500', validUntil: 'Nov 15, 2026', status: 'active', usageCount: 89, maxUsage: 200, description: 'On all biryani items' },
  { id: 'OFF-3', name: 'Free Delivery Week', code: 'FREEDEL', type: 'delivery', value: 'Free Delivery', minOrder: '₹300', validUntil: 'Oct 31, 2026', status: 'expired', usageCount: 412, maxUsage: 1000, description: 'Free delivery on orders above ₹300' },
  { id: 'OFF-4', name: 'Buy 2 Get 1 Naan', code: 'NAANFREE', type: 'bogo', value: 'Buy 2 Get 1', minOrder: '₹150', validUntil: 'Jan 31, 2027', status: 'active', usageCount: 56, maxUsage: 300, description: 'Get a free naan with every 2 ordered' },
  { id: 'OFF-5', name: 'Family Feast Deal', code: 'FAMILY25', type: 'combo', value: '25% OFF', minOrder: '₹1000', validUntil: 'Dec 15, 2026', status: 'active', usageCount: 34, maxUsage: 100, description: 'Combo meal deals for families' },
  { id: 'OFF-6', name: 'Happy Hour 4-6PM', code: 'HAPPY30', type: 'happy_hour', value: '30% OFF', minOrder: '₹250', validUntil: 'Mar 31, 2027', status: 'active', usageCount: 78, maxUsage: 500, timeRestriction: '4:00 PM – 6:00 PM', description: 'Weekday afternoon special' },
];

export default function PromotionsPage() {
  const [offers] = useState(MOCK_OFFERS);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = typeFilter === 'all' ? offers : offers.filter((o) => o.type === typeFilter);
  const activeCount = offers.filter((o) => o.status === 'active').length;
  const totalUsage = offers.reduce((s, o) => s + o.usageCount, 0);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Promotions & Campaigns</h1>
          <p className="text-sm text-slate-500">Create and manage discounts, coupons, and meal deals.</p>
        </div>
        <button className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Promotion
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Offers', value: activeCount, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Uses', value: totalUsage, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Revenue Impact', value: '+₹24.8K', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Conversion Rate', value: '18.4%', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3`}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex gap-1.5 overflow-x-auto">
        <button onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${typeFilter === 'all' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          All Types
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setTypeFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === key ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            <cfg.icon className="w-3 h-3" /> {cfg.label}
          </button>
        ))}
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((offer) => {
          const cfg = TYPE_CONFIG[offer.type];
          const usagePct = Math.round((offer.usageCount / offer.maxUsage) * 100);
          const Icon = cfg.icon;
          return (
            <div key={offer.id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all hover:shadow-md ${
              offer.status === 'expired' ? 'border-slate-200 opacity-70' : 'border-slate-100'
            }`}>
              <div className={`${cfg.bg} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  offer.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  offer.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {offer.status}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-900 mb-0.5">{offer.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{offer.description}</p>
                <div className="bg-slate-50 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded border border-orange-100 text-sm">{offer.code}</span>
                    <span className="text-lg font-black text-slate-900">{offer.value}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Min: {offer.minOrder}</span>
                    {offer.timeRestriction && <span className="text-orange-600 font-bold">⏰ {offer.timeRestriction}</span>}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-500 font-medium">Usage ({offer.usageCount}/{offer.maxUsage})</span>
                    <span className="font-bold text-slate-700">{usagePct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <ProgressBar percent={usagePct} className="bg-orange-500 rounded-full h-1.5 transition-all" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {offer.validUntil}</span>
                  <div className="flex gap-1">
                    <button title="Edit offer" className="p-1.5 rounded-lg hover:bg-slate-100"><Edit2 className="w-3.5 h-3.5 text-slate-400" /></button>
                    <button title="Delete offer" className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
