'use client';

import React, { useState } from 'react';
import { Megaphone, TrendingUp, Eye, Users, Gift, Search, Tag, CheckCircle, Clock, XCircle, Pause, Play, Copy, Edit, BarChart3, Percent, Target } from 'lucide-react';

type Campaign = {
  id: string; name: string; type: 'discount' | 'coupon' | 'banner' | 'referral'; status: 'active' | 'paused' | 'ended' | 'scheduled'; startDate: string; endDate: string; reach: number; redemptions: number; revenue: string; module: string;
};

const campaigns: Campaign[] = [
  { id: 'CM-001', name: 'Summer Sale 30% Off', type: 'discount', status: 'active', startDate: 'Jun 1', endDate: 'Jun 30', reach: 8200, redemptions: 1240, revenue: '₹4.8L', module: 'Grocery' },
  { id: 'CM-002', name: 'First Order Free Delivery', type: 'coupon', status: 'active', startDate: 'Jun 10', endDate: 'Jul 10', reach: 5400, redemptions: 890, revenue: '₹2.1L', module: 'Restaurant' },
  { id: 'CM-003', name: 'Health Week 20% Off', type: 'discount', status: 'active', startDate: 'Jun 15', endDate: 'Jun 28', reach: 3200, redemptions: 420, revenue: '₹1.2L', module: 'Pharmacy' },
  { id: 'CM-004', name: 'Refer & Earn ₹100', type: 'referral', status: 'active', startDate: 'May 1', endDate: 'Dec 31', reach: 12000, redemptions: 2100, revenue: '₹6.2L', module: 'All' },
  { id: 'CM-005', name: 'Weekend Feast Banner', type: 'banner', status: 'paused', startDate: 'Jun 5', endDate: 'Jun 30', reach: 4100, redemptions: 0, revenue: '₹0', module: 'Restaurant' },
  { id: 'CM-006', name: 'Monsoon Medicine Sale', type: 'discount', status: 'scheduled', startDate: 'Jul 1', endDate: 'Jul 31', reach: 0, redemptions: 0, revenue: '₹0', module: 'Pharmacy' },
  { id: 'CM-007', name: 'Diwali Early Bird 40%', type: 'coupon', status: 'ended', startDate: 'May 1', endDate: 'May 15', reach: 9800, redemptions: 3200, revenue: '₹8.4L', module: 'Marketplace' },
];

const coupons = [
  { code: 'SUMMER30', discount: '30%', minOrder: '₹299', maxDiscount: '₹150', uses: 1240, limit: 5000, status: 'active' },
  { code: 'FREESHIP', discount: 'Free Delivery', minOrder: '₹0', maxDiscount: '₹50', uses: 890, limit: 3000, status: 'active' },
  { code: 'HEALTH20', discount: '20%', minOrder: '₹199', maxDiscount: '₹100', uses: 420, limit: 2000, status: 'active' },
  { code: 'DIWALI40', discount: '40%', minOrder: '₹499', maxDiscount: '₹200', uses: 3200, limit: 3200, status: 'expired' },
  { code: 'NEWUSER', discount: '₹100 off', minOrder: '₹149', maxDiscount: '₹100', uses: 2100, limit: 10000, status: 'active' },
];

const typeColors: Record<string, string> = { discount: 'bg-green-100 text-green-700', coupon: 'bg-blue-100 text-blue-700', banner: 'bg-purple-100 text-purple-700', referral: 'bg-amber-100 text-amber-700' };
const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
  paused: { bg: 'bg-amber-100 text-amber-700', icon: <Pause className="w-3.5 h-3.5" />, label: 'Paused' },
  ended: { bg: 'bg-slate-100 text-slate-600', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Ended' },
  scheduled: { bg: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Scheduled' },
  expired: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Expired' },
};

export default function FranchiseMarketingPage() {
  const [tab, setTab] = useState<'campaigns' | 'coupons'>('campaigns');
  const [search, setSearch] = useState('');

  const filteredCampaigns = campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = campaigns.filter(c => c.status === 'active').length;
  const totalRedemptions = campaigns.reduce((a, c) => a + c.redemptions, 0).toLocaleString();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing & Promotions</h1>
          <p className="text-slate-500">Create campaigns, manage coupons, and track promotional performance.</p>
        </div>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 self-start">
          <Megaphone className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Active Campaigns', value: String(activeCount), icon: Target, color: 'bg-emerald-50 text-emerald-600' },
          { title: 'Total Reach', value: campaigns.reduce((a, c) => a + c.reach, 0).toLocaleString(), icon: Eye, color: 'bg-blue-50 text-blue-600' },
          { title: 'Redemptions', value: totalRedemptions, icon: Gift, color: 'bg-amber-50 text-amber-600' },
          { title: 'Campaign Revenue', value: '₹22.7L', icon: TrendingUp, color: 'bg-teal-50 text-teal-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center`}><s.icon className="w-5 h-5" /></div></div>
            <p className="text-slate-500 text-sm font-medium">{s.title}</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1 w-fit">
        {(['campaigns', 'coupons'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-md text-sm font-bold transition-colors capitalize ${tab === t ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'campaigns' && (
        <>
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr><th className="px-5 py-3.5 font-semibold">Campaign</th><th className="px-5 py-3.5 font-semibold">Type</th><th className="px-5 py-3.5 font-semibold">Module</th><th className="px-5 py-3.5 font-semibold">Duration</th><th className="px-5 py-3.5 font-semibold text-right">Reach</th><th className="px-5 py-3.5 font-semibold text-right">Redemptions</th><th className="px-5 py-3.5 font-semibold text-right">Revenue</th><th className="px-5 py-3.5 font-semibold text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCampaigns.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4"><p className="font-bold text-slate-900">{c.name}</p><p className="text-xs text-slate-400">{c.id}</p></td>
                      <td className="px-5 py-4"><span className={`${typeColors[c.type]} px-2.5 py-1 rounded-md text-xs font-bold capitalize`}>{c.type}</span></td>
                      <td className="px-5 py-4 text-slate-600 text-sm font-medium">{c.module}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{c.startDate} – {c.endDate}</td>
                      <td className="px-5 py-4 text-right font-bold text-slate-700">{c.reach.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right font-bold text-slate-900">{c.redemptions.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">{c.revenue}</td>
                      <td className="px-5 py-4 text-center"><span className={`${statusConfig[c.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>{statusConfig[c.status].icon} {statusConfig[c.status].label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'coupons' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h2 className="font-bold text-slate-900">Coupon Management</h2><button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Create Coupon</button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-200">
                <tr><th className="px-5 py-3.5 font-semibold">Code</th><th className="px-5 py-3.5 font-semibold">Discount</th><th className="px-5 py-3.5 font-semibold">Min Order</th><th className="px-5 py-3.5 font-semibold">Max Discount</th><th className="px-5 py-3.5 font-semibold text-right">Uses / Limit</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map(c => (
                  <tr key={c.code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">{c.code}</td>
                    <td className="px-5 py-4"><span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">{c.discount}</span></td>
                    <td className="px-5 py-4 text-slate-600">{c.minOrder}</td>
                    <td className="px-5 py-4 text-slate-600">{c.maxDiscount}</td>
                    <td className="px-5 py-4 text-right"><span className="font-bold text-slate-900">{c.uses.toLocaleString()}</span><span className="text-slate-400"> / {c.limit.toLocaleString()}</span><div className="w-full h-1.5 bg-slate-100 rounded-full mt-1"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${(c.uses / c.limit) * 100}%` }} /></div></td>
                    <td className="px-5 py-4 text-center"><span className={`${statusConfig[c.status]?.bg || 'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-full text-xs font-bold`}>{c.status}</span></td>
                    <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-1"><button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Copy code"><Copy className="w-4 h-4 text-slate-400" /></button><button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4 text-slate-400" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
