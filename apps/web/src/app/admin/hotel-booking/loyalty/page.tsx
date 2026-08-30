'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { Trophy, Users, Gift, TrendingUp, Star, ChevronDown, Search, ArrowUpDown, Sparkles } from 'lucide-react';
import { BarFill } from '@/components/bar-fill';
import { LOYALTY_TIERS } from '@/lib/modules/loyalty';
import { adminHotelApi } from '@/lib/api/admin-hotel';

/* ── Mock Admin Data ──────────────────────────────────────────────────────── */
const STATS = {
  totalIssued: 48720,
  totalRedeemed: 12350,
  activeBalance: 36370,
  totalMembers: 1842,
};

const TIER_DISTRIBUTION = [
  { tier: 'Bronze', count: 980, pct: 53, color: 'bg-amber-500' },
  { tier: 'Silver', count: 520, pct: 28, color: 'bg-slate-400' },
  { tier: 'Gold', count: 245, pct: 13, color: 'bg-yellow-500' },
  { tier: 'Platinum', count: 72, pct: 4, color: 'bg-violet-500' },
  { tier: 'Diamond', count: 25, pct: 2, color: 'bg-rose-500' },
];

const TOP_MEMBERS = [
  { id: 'USR-001', name: 'Sarah K.', email: 'sarah.k@email.com', tier: 'Diamond', points: 18420, stays: 24, avgRating: 4.9, icon: '👑' },
  { id: 'USR-002', name: 'John D.', email: 'john.d@email.com', tier: 'Platinum', points: 8350, stays: 15, avgRating: 4.7, icon: '💎' },
  { id: 'USR-003', name: 'Amit P.', email: 'amit.p@email.com', tier: 'Platinum', points: 6200, stays: 12, avgRating: 4.8, icon: '💎' },
  { id: 'USR-004', name: 'Maria L.', email: 'maria.l@email.com', tier: 'Gold', points: 3100, stays: 8, avgRating: 4.6, icon: '🥇' },
  { id: 'USR-005', name: 'David W.', email: 'david.w@email.com', tier: 'Gold', points: 2480, stays: 6, avgRating: 4.5, icon: '🥇' },
];

const RECENT_REDEMPTIONS = [
  { id: 'RED-101', user: 'Sarah K.', reward: 'Free Night Upgrade', points: 1500, date: 'Today', status: 'Active' },
  { id: 'RED-102', user: 'John D.', reward: 'Late Checkout', points: 200, date: 'Yesterday', status: 'Used' },
  { id: 'RED-103', user: 'Maria L.', reward: 'Spa Voucher', points: 400, date: 'Jun 13', status: 'Active' },
  { id: 'RED-104', user: 'David W.', reward: 'Free Breakfast', points: 150, date: 'Jun 12', status: 'Used' },
  { id: 'RED-105', user: 'Amit P.', reward: 'Room Upgrade', points: 500, date: 'Jun 10', status: 'Expired' },
];

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Used: 'bg-blue-50 text-blue-700',
  Expired: 'bg-slate-100 text-slate-500',
};

export default function AdminHotelLoyaltyPage() {
  const { regionLabel, isFiltered, formatPrice } = useHotelRegionFilter([]);
  const [adjustModal, setAdjustModal] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-rose-500" /> Hotel Loyalty Management
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Monitor and manage Stay Points across all hotel guests.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-rose-500 to-pink-500 rounded-xl p-5 text-white">
          <p className="text-sm text-white/80 font-medium">Total Issued</p>
          <p className="text-2xl font-black mt-1">{STATS.totalIssued.toLocaleString()}</p>
          <p className="text-xs text-white/60">Stay Points</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 font-medium">Redeemed</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{STATS.totalRedeemed.toLocaleString()}</p>
          <p className="text-xs text-rose-500 font-bold">pts used</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 font-medium">Active Balance</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{STATS.activeBalance.toLocaleString()}</p>
          <p className="text-xs text-slate-400">across all users</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 font-medium">Total Members</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{STATS.totalMembers.toLocaleString()}</p>
          <p className="text-xs text-slate-400">loyalty members</p>
        </div>
      </div>

      {/* Tier Distribution + Top Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-slate-400" /> Tier Distribution</h3>
          <div className="space-y-3">
            {TIER_DISTRIBUTION.map(t => (
              <div key={t.tier}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-bold text-slate-700">{LOYALTY_TIERS.find(lt => lt.name === t.tier)?.icon} {t.tier}</span>
                  <span className="text-slate-500">{t.count} members ({t.pct}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <BarFill width={`${t.pct}%`} className={`h-full ${t.color} rounded-full`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Members */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Top Loyalty Members</h3>
            <button onClick={() => setAdjustModal(!adjustModal)} className="text-xs font-bold text-rose-600 hover:underline">+ Adjust Points</button>
          </div>
          <div className="divide-y divide-slate-100">
            {TOP_MEMBERS.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{m.icon}</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.tier} · {m.stays} stays · {m.avgRating} ★</p>
                  </div>
                </div>
                <span className="font-black text-rose-600 text-sm">{m.points.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Adjust Points Modal */}
      {adjustModal && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" /> Manual Points Adjustment
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="adj-user" className="block text-xs font-bold text-slate-500 mb-1">User Email</label>
              <input id="adj-user" type="email" placeholder="user@email.com" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label htmlFor="adj-points" className="block text-xs font-bold text-slate-500 mb-1">Points (+/-)</label>
              <input id="adj-points" type="number" placeholder="+500" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label htmlFor="adj-reason" className="block text-xs font-bold text-slate-500 mb-1">Reason</label>
              <input id="adj-reason" type="text" placeholder="Compensation for..." className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors">Apply Adjustment</button>
            <button onClick={() => setAdjustModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Recent Redemptions */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Gift className="w-4 h-4 text-rose-500" /> Recent Redemptions</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-2.5 font-bold text-slate-600">ID</th>
              <th className="text-left px-5 py-2.5 font-bold text-slate-600">User</th>
              <th className="text-left px-5 py-2.5 font-bold text-slate-600">Reward</th>
              <th className="text-left px-5 py-2.5 font-bold text-slate-600">Points</th>
              <th className="text-left px-5 py-2.5 font-bold text-slate-600">Date</th>
              <th className="text-left px-5 py-2.5 font-bold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {RECENT_REDEMPTIONS.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs text-slate-400">{r.id}</td>
                <td className="px-5 py-3 font-bold text-slate-900">{r.user}</td>
                <td className="px-5 py-3 text-slate-700">{r.reward}</td>
                <td className="px-5 py-3 font-bold text-rose-600">-{r.points}</td>
                <td className="px-5 py-3 text-slate-500">{r.date}</td>
                <td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[r.status]}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
