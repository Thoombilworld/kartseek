'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState } from 'react';
import { Megaphone, Image, Bell, Tag, Plus, Eye, Edit, Trash2, CheckCircle, Clock, XCircle, Calendar, Globe, Smartphone, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';

type ContentItem = {
  id: string; title: string; type: 'banner' | 'push' | 'promo' | 'featured';
  target: string; status: 'active' | 'scheduled' | 'expired' | 'draft';
  startDate: string; endDate: string; reach: string; clicks: string;
};

const initialContent: ContentItem[] = [
  { id: 'CNT-001', title: 'Summer Sale — Flat 40% Off Marketplace', type: 'banner', target: 'All Customers', status: 'active', startDate: 'May 15', endDate: 'Jun 15', reach: '42.5K', clicks: '8,200' },
  { id: 'CNT-002', title: 'Free Delivery on Grocery Orders > ₹499', type: 'promo', target: 'Mumbai Region', status: 'active', startDate: 'May 20', endDate: 'May 31', reach: '18.2K', clicks: '4,100' },
  { id: 'CNT-003', title: 'New Restaurant Partners Near You!', type: 'push', target: 'Restaurant Users', status: 'active', startDate: 'May 28', endDate: 'Jun 5', reach: '31.4K', clicks: '6,500' },
  { id: 'CNT-004', title: 'Doctor Consultation — First Visit Free', type: 'banner', target: 'All Customers', status: 'scheduled', startDate: 'Jun 1', endDate: 'Jun 30', reach: '—', clicks: '—' },
  { id: 'CNT-005', title: 'Taxi Ride Offer: ₹50 Off First 3 Rides', type: 'promo', target: 'New Users', status: 'active', startDate: 'May 10', endDate: 'Jun 10', reach: '24.8K', clicks: '5,200' },
  { id: 'CNT-006', title: 'Pharmacy — Flat 20% on OTC Products', type: 'push', target: 'Pharmacy Users', status: 'expired', startDate: 'Apr 15', endDate: 'May 15', reach: '15.6K', clicks: '3,800' },
  { id: 'CNT-007', title: 'Featured: Apple iPhone 15 Pro', type: 'featured', target: 'Marketplace', status: 'active', startDate: 'May 1', endDate: 'May 31', reach: '52.1K', clicks: '12,400' },
  { id: 'CNT-008', title: 'Weekend Special — Restaurant BOGO', type: 'banner', target: 'All Customers', status: 'draft', startDate: '—', endDate: '—', reach: '—', clicks: '—' },
];

const typeConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  banner: { bg: 'bg-blue-100 text-blue-700', icon: <Image className="w-3.5 h-3.5" />, label: 'Banner' },
  push: { bg: 'bg-purple-100 text-purple-700', icon: <Bell className="w-3.5 h-3.5" />, label: 'Push Notification' },
  promo: { bg: 'bg-orange-100 text-orange-700', icon: <Tag className="w-3.5 h-3.5" />, label: 'Promotion' },
  featured: { bg: 'bg-amber-100 text-amber-700', icon: <Megaphone className="w-3.5 h-3.5" />, label: 'Featured' },
};

const statusConfig: Record<string, { bg: string; icon: React.ReactNode }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  scheduled: { bg: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3.5 h-3.5" /> },
  expired: { bg: 'bg-slate-100 text-slate-600', icon: <XCircle className="w-3.5 h-3.5" /> },
  draft: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
};

export default function ContentPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [contentItems, setContentItems] = useState(initialContent);

  const toggleStatus = (id: string) => {
    setContentItems(prev => prev.map(c => {
      if (c.id === id) {
        if (c.status === 'active') return { ...c, status: 'draft' };
        if (c.status === 'draft' || c.status === 'scheduled') return { ...c, status: 'active' };
      }
      return c;
    }));
  };

  const deleteCampaign = (id: string) => {
    setContentItems(prev => prev.filter(c => c.id !== id));
  };

  const filtered = contentItems.filter(c => typeFilter === 'All' || c.type === typeFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Content & Promotions</h1><p className="text-slate-500 text-sm">Manage banners, push notifications, promotional campaigns, and featured listings across all modules.</p></div>
        <Link href="/admin/content/create" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"><Plus className="w-4 h-4" /> Create Campaign</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Image className="w-5 h-5 text-blue-500" /><p className="text-2xl font-black text-slate-900 mt-2">{contentItems.filter(c => c.type === 'banner').length}</p><p className="text-xs text-slate-500 font-medium">Banners</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Bell className="w-5 h-5 text-purple-500" /><p className="text-2xl font-black text-slate-900 mt-2">{contentItems.filter(c => c.type === 'push').length}</p><p className="text-xs text-slate-500 font-medium">Push Notifications</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Tag className="w-5 h-5 text-orange-500" /><p className="text-2xl font-black text-slate-900 mt-2">{contentItems.filter(c => c.type === 'promo').length}</p><p className="text-xs text-slate-500 font-medium">Promotions</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Megaphone className="w-5 h-5 text-amber-500" /><p className="text-2xl font-black text-slate-900 mt-2">{contentItems.filter(c => c.type === 'featured').length}</p><p className="text-xs text-slate-500 font-medium">Featured</p></div>
      </div>

      <div className="flex gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white" title="Filter by campaign type">
          <option value="All">All Types</option><option value="banner">Banners</option><option value="push">Push Notifications</option><option value="promo">Promotions</option><option value="featured">Featured</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Campaign</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold">Target</th>
                <th className="px-5 py-3.5 font-semibold text-center">Period</th>
                <th className="px-5 py-3.5 font-semibold text-right">Reach</th>
                <th className="px-5 py-3.5 font-semibold text-right">Clicks</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4"><p className="font-bold text-slate-900">{c.title}</p><p className="text-xs text-slate-400">{c.id}</p></td>
                  <td className="px-5 py-4"><span className={`${typeConfig[c.type].bg} px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1`}>{typeConfig[c.type].icon} {typeConfig[c.type].label}</span></td>
                  <td className="px-5 py-4 text-xs text-slate-600">{c.target}</td>
                  <td className="px-5 py-4 text-center text-xs text-slate-600">{c.startDate} — {c.endDate}</td>
                  <td className="px-5 py-4 text-right font-bold">{c.reach}</td>
                  <td className="px-5 py-4 text-right font-bold">{c.clicks}</td>
                  <td className="px-5 py-4 text-center"><span className={`${statusConfig[c.status].bg} px-2.5 py-1 rounded-full text-xs font-bold capitalize inline-flex items-center gap-1`}>{statusConfig[c.status].icon} {c.status}</span></td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {c.status !== 'expired' && (
                        <button onClick={() => toggleStatus(c.id)} title={c.status === 'active' ? 'Pause' : 'Activate'} className="p-1.5 hover:bg-slate-100 rounded-lg">
                          {c.status === 'active' ? (
                            <ToggleRight className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      )}
                      <Link href={`/admin/content/edit?id=${c.id}`} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Edit"><Edit className="w-4 h-4 text-slate-400 hover:text-blue-500" /></Link>
                      <button onClick={() => deleteCampaign(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
