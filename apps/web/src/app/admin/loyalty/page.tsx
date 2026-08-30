'use client';

import React, { useState } from 'react';
import {
  Trophy, Settings, TrendingUp, Users, Star, Gift, Search,
  ChevronDown, Save, RotateCcw, Plus, Minus, CheckCircle2,
  AlertTriangle, Crown, Sparkles, BarChart3, ArrowUpRight,
  ArrowDownRight, Shield, Eye, X,
} from 'lucide-react';

/* ── Tier Configuration Data ───────────────────────────────────────────────── */
const DEFAULT_TIERS = [
  { name: 'Bronze', threshold: 0, multiplier: 1, icon: '🥉', benefits: ['Basic rewards', 'Standard support'] },
  { name: 'Silver', threshold: 200, multiplier: 1.5, icon: '🥈', benefits: ['Free delivery on orders > ₹500', 'Early sale access', '1.5x points multiplier'] },
  { name: 'Gold', threshold: 1000, multiplier: 2, icon: '🥇', benefits: ['Priority support', 'Exclusive deals', 'Free delivery', '2x points multiplier'] },
  { name: 'Platinum', threshold: 5000, multiplier: 3, icon: '👑', benefits: ['Personal account manager', 'Birthday bonus', 'All Gold benefits', '3x points multiplier'] },
];

const EARN_RULES = {
  pointsPerHundred: 1,
  completionBonus: 5,
  ratingBonus: 2,
  maxPointsPerOrder: 500,
  minOrderForPoints: 100,
};

/* ── Analytics Mock Data ───────────────────────────────────────────────────── */
const ANALYTICS = {
  totalInCirculation: 285000,
  totalAwarded: 420000,
  totalRedeemed: 110000,
  totalReversed: 25000,
  redemptionRate: 26.2,
  avgPointsPerUser: 40,
  tierDistribution: { Bronze: 4200, Silver: 2100, Gold: 680, Platinum: 120 },
  monthlyTrend: [
    { month: 'Jan', awarded: 28000, redeemed: 8200 },
    { month: 'Feb', awarded: 31000, redeemed: 9400 },
    { month: 'Mar', awarded: 35000, redeemed: 11000 },
    { month: 'Apr', awarded: 38000, redeemed: 12800 },
    { month: 'May', awarded: 42000, redeemed: 14200 },
    { month: 'Jun', awarded: 44000, redeemed: 15600 },
  ],
};

/* ── Recent Adjustments Mock ──────────────────────────────────────────────── */
const ADJUSTMENTS = [
  { id: 'ADJ-001', userId: 'USR-4201', user: 'Rahul M.', type: 'grant', points: 500, reason: 'Customer complaint compensation', adminId: 'ADMIN-01', admin: 'Priya S.', date: '2 hours ago' },
  { id: 'ADJ-002', userId: 'USR-3180', user: 'Meera K.', type: 'revoke', points: -200, reason: 'Fraudulent activity detected', adminId: 'ADMIN-02', admin: 'Vikram T.', date: 'Yesterday' },
  { id: 'ADJ-003', userId: 'USR-5522', user: 'Amit P.', type: 'grant', points: 1000, reason: 'VIP onboarding bonus', adminId: 'ADMIN-01', admin: 'Priya S.', date: '3 days ago' },
];

type Tab = 'analytics' | 'config' | 'adjust';

export default function AdminLoyaltyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [earnRules, setEarnRules] = useState(EARN_RULES);
  const [configSaved, setConfigSaved] = useState(false);

  // Adjustment state
  const [adjUserId, setAdjUserId] = useState('');
  const [adjPoints, setAdjPoints] = useState(0);
  const [adjReason, setAdjReason] = useState('');
  const [adjType, setAdjType] = useState<'grant' | 'revoke'>('grant');
  const [adjSuccess, setAdjSuccess] = useState(false);

  const totalUsers = Object.values(ANALYTICS.tierDistribution).reduce((s, v) => s + v, 0);

  const handleSaveConfig = () => {
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const handleAdjust = () => {
    if (!adjUserId || adjPoints <= 0 || !adjReason) return;
    setAdjSuccess(true);
    setTimeout(() => { setAdjSuccess(false); setAdjUserId(''); setAdjPoints(0); setAdjReason(''); }, 2000);
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'adjust', label: 'Manual Adjustment', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Loyalty Program</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage tiers, earn rules, and monitor loyalty points economy</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Analytics Tab ════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Points in Circulation', value: ANALYTICS.totalInCirculation.toLocaleString('en-IN'), icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
              { label: 'Total Awarded', value: ANALYTICS.totalAwarded.toLocaleString('en-IN'), icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { label: 'Total Redeemed', value: ANALYTICS.totalRedeemed.toLocaleString('en-IN'), icon: Gift, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
              { label: 'Total Reversed', value: ANALYTICS.totalReversed.toLocaleString('en-IN'), icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
            ].map(kpi => (
              <div key={kpi.label} className={`${kpi.bg} border ${kpi.border} rounded-xl p-4 shadow-sm`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                <p className="text-2xl font-black text-slate-900 mt-2">{kpi.value}</p>
                <p className="text-xs text-slate-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Tier Distribution */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Tier Distribution</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(ANALYTICS.tierDistribution).map(([tier, count]) => {
                const pct = ((count / totalUsers) * 100).toFixed(1);
                const colors: Record<string, string> = { Bronze: 'bg-amber-100 text-amber-800', Silver: 'bg-slate-100 text-slate-800', Gold: 'bg-yellow-100 text-yellow-800', Platinum: 'bg-purple-100 text-purple-800' };
                return (
                  <div key={tier} className="text-center">
                    <div className={`${colors[tier] || 'bg-slate-100'} rounded-xl px-3 py-4`}>
                      <p className="text-2xl font-black">{count.toLocaleString('en-IN')}</p>
                      <p className="text-xs font-bold mt-1">{tier}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-1">Redemption Rate</h3>
              <p className="text-3xl font-black text-blue-600">{ANALYTICS.redemptionRate}%</p>
              <p className="text-xs text-slate-500">of awarded points are redeemed</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-1">Avg Points / User</h3>
              <p className="text-3xl font-black text-emerald-600">{ANALYTICS.avgPointsPerUser}</p>
              <p className="text-xs text-slate-500">across {totalUsers.toLocaleString('en-IN')} users</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Configuration Tab ════════════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Tier Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> Tier Configuration</h3>
            <div className="space-y-4">
              {tiers.map((tier, idx) => (
                <div key={tier.name} className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                  <span className="text-2xl">{tier.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{tier.name}</p>
                    <p className="text-xs text-slate-500">{tier.benefits.join(' · ')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase" htmlFor="threshold">Threshold</label>
                      <input id="threshold" type="number" value={tier.threshold} onChange={e => { const n = [...tiers]; n[idx] = { ...tier, threshold: +e.target.value }; setTiers(n); }}
                        className="w-24 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-center font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase" htmlFor="multiplier">Multiplier</label>
                      <input id="multiplier" type="number" step="0.5" value={tier.multiplier} onChange={e => { const n = [...tiers]; n[idx] = { ...tier, multiplier: +e.target.value }; setTiers(n); }}
                        className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-center font-mono" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Earn Rules */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-500" /> Earn Rules</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'pointsPerHundred' as const, label: 'Points per ₹100', desc: 'Base earn rate' },
                { key: 'completionBonus' as const, label: 'Completion Bonus', desc: 'Extra pts on delivery' },
                { key: 'ratingBonus' as const, label: 'Rating Bonus', desc: 'Extra pts for 5★ rating' },
                { key: 'maxPointsPerOrder' as const, label: 'Max per Order', desc: 'Cap per transaction' },
                { key: 'minOrderForPoints' as const, label: 'Min Order Value', desc: 'Minimum ₹ to earn' },
              ].map(rule => (
                <div key={rule.key} className="bg-slate-50 rounded-xl p-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{rule.label}</label>
                  <input type="number" value={earnRules[rule.key]} onChange={e => setEarnRules(prev => ({ ...prev, [rule.key]: +e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:border-blue-400 outline-none" />
                  <p className="text-[10px] text-slate-400 mt-1">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSaveConfig}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${configSaved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'}`}>
            {configSaved ? <><CheckCircle2 className="w-5 h-5" /> Saved!</> : <><Save className="w-5 h-5" /> Save Configuration</>}
          </button>
        </div>
      )}

      {/* ═══ Manual Adjustment Tab ════════════════════════════════════════════ */}
      {activeTab === 'adjust' && (
        <div className="space-y-6">
          {/* Adjustment Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Grant or Revoke Points</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="user-id">User ID</label>
                <input id="user-id" value={adjUserId} onChange={e => setAdjUserId(e.target.value)} placeholder="e.g. USR-4201"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-blue-400 outline-none font-mono" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Action</label>
                <div className="flex gap-2">
                  <button onClick={() => setAdjType('grant')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 ${adjType === 'grant' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                    <Plus className="w-4 h-4" /> Grant
                  </button>
                  <button onClick={() => setAdjType('revoke')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 ${adjType === 'revoke' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'}`}>
                    <Minus className="w-4 h-4" /> Revoke
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="points">Points</label>
                <input id="points" type="number" value={adjPoints || ''} onChange={e => setAdjPoints(+e.target.value)} placeholder="e.g. 500"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-blue-400 outline-none font-mono" min={1} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="reason-required">Reason (required)</label>
                <input id="reason-required" value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="e.g. Customer complaint compensation"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
              </div>
            </div>

            <button onClick={handleAdjust} disabled={!adjUserId || adjPoints <= 0 || !adjReason}
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-40 ${adjSuccess ? 'bg-emerald-600 text-white' : adjType === 'grant' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
              {adjSuccess ? <><CheckCircle2 className="w-5 h-5" /> Done!</> : adjType === 'grant' ? <><Plus className="w-5 h-5" /> Grant {adjPoints} Points</> : <><Minus className="w-5 h-5" /> Revoke {adjPoints} Points</>}
            </button>
          </div>

          {/* Recent Adjustments Log */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-900">Recent Adjustments</h3></div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <th className="px-5 py-3 font-semibold">ID</th><th className="px-4 py-3 font-semibold">User</th><th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Points</th><th className="px-4 py-3 font-semibold">Reason</th><th className="px-4 py-3 font-semibold">Admin</th><th className="px-4 py-3 font-semibold">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {ADJUSTMENTS.map(adj => (
                  <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{adj.id}</td>
                    <td className="px-4 py-3"><p className="font-bold text-slate-900">{adj.user}</p><p className="text-xs text-slate-400">{adj.userId}</p></td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${adj.type === 'grant' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{adj.type === 'grant' ? 'Grant' : 'Revoke'}</span></td>
                    <td className={`px-4 py-3 font-bold ${adj.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{adj.points > 0 ? '+' : ''}{adj.points}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{adj.reason}</td>
                    <td className="px-4 py-3 text-slate-600">{adj.admin}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{adj.date}</td>
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
