'use client';
import React from 'react';
import { Trophy, Star, Gift, Users, TrendingUp } from 'lucide-react';
import { BarFill } from '@/components/bar-fill';

const STATS = {
  totalDistributed: 8520,
  totalRedemptions: 14,
  avgGuestRating: 4.5,
  repeatGuests: 42,
};

const GUEST_TIERS = [
  { tier: 'Bronze', icon: '🥉', count: 45, pct: 45 },
  { tier: 'Silver', icon: '🥈', count: 28, pct: 28 },
  { tier: 'Gold', icon: '🥇', count: 18, pct: 18 },
  { tier: 'Platinum', icon: '💎', count: 7, pct: 7 },
  { tier: 'Diamond', icon: '👑', count: 2, pct: 2 },
];

const RECENT_REDEMPTIONS = [
  { guest: 'Sarah K.', reward: 'Room Upgrade', points: 500, date: 'Jun 14', tier: '👑' },
  { guest: 'Amit P.', reward: 'Late Checkout', points: 200, date: 'Jun 12', tier: '💎' },
  { guest: 'Maria L.', reward: 'Free Breakfast', points: 150, date: 'Jun 10', tier: '🥇' },
  { guest: 'David W.', reward: 'Spa Voucher', points: 400, date: 'Jun 8', tier: '🥇' },
  { guest: 'John D.', reward: 'AED 100 Off', points: 300, date: 'Jun 5', tier: '🥈' },
];

export default function OwnerLoyaltyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-rose-500" /> Loyalty Overview
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Track guest loyalty points and redemptions at your property.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-rose-500 to-pink-500 rounded-xl p-5 text-white">
          <p className="text-sm text-white/80">Points Distributed</p>
          <p className="text-2xl font-black mt-1">{STATS.totalDistributed.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Redemptions</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{STATS.totalRedemptions}</p>
          <p className="text-xs text-slate-400">at your property</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Avg Guest Rating</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{STATS.avgGuestRating} ★</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Repeat Guests</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{STATS.repeatGuests}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Tier Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> Guest Tier Breakdown</h3>
          <div className="space-y-3">
            {GUEST_TIERS.map(t => (
              <div key={t.tier}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-bold text-slate-700">{t.icon} {t.tier}</span>
                  <span className="text-slate-500">{t.count} guests ({t.pct}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <BarFill width={`${t.pct}%`} className="h-full bg-rose-500 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Redemptions at Property */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Gift className="w-4 h-4 text-rose-500" /> Redemptions at Your Property</h3>
          <div className="divide-y divide-slate-100">
            {RECENT_REDEMPTIONS.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{r.tier}</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{r.guest}</p>
                    <p className="text-xs text-slate-400">{r.reward} · {r.date}</p>
                  </div>
                </div>
                <span className="font-bold text-rose-600 text-sm">-{r.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
