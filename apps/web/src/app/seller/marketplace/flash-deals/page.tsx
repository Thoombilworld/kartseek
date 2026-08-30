'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Zap, Plus, Search, Timer, Flame, ShoppingBag, TrendingUp, DollarSign,
  Package, Star, Clock, ArrowRight, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, X, Send, Eye, BarChart3, Users, Calendar, Percent,
} from 'lucide-react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type DealStatus = 'active' | 'scheduled' | 'ended' | 'paused';
type NomStatus = 'pending' | 'approved' | 'rejected' | 'live';

interface FlashDeal {
  id: string; name: string; products: number; discount: string;
  stockLimit: number; sold: number; revenue: number; orders: number; views: number;
  start: string; end: string; status: DealStatus; priority: number;
  createdBy: string; minDiscount?: number;
  nomination?: { id: string; status: NomStatus; proposedDiscount: number; stockAllocated: number };
}

interface Nomination {
  id: string; dealId: string; productName: string; proposedDiscount: number;
  stockAllocated: number; note?: string; status: NomStatus;
  submittedAt: string; rejectReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK FALLBACK DATA
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTDOWN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return setTimeLeft('Ended');
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

function CountdownBadge({ end, status }: { end: string; status: DealStatus }) {
  const tl = useCountdown(end);
  if (status !== 'active') return null;
  const isUrgent = tl.startsWith('00:');
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg animate-pulse ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
      <Timer className="w-3 h-3" /> {tl}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_STYLE: Record<DealStatus, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '⚡ Live' },
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', label: '📅 Scheduled' },
  ended: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Ended' },
  paused: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Paused' },
};

const NOM_STYLE: Record<NomStatus, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
  rejected: { bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
  live: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Zap },
};

export default function FlashDealsPage() {
  const { seller } = useSeller();
  const [tab, setTab] = useState<'deals' | 'join' | 'nominations' | 'analytics'>('deals');
  const [myDeals, setMyDeals] = useState<FlashDeal[]>([]);
  const [available, setAvailable] = useState<FlashDeal[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [nomModal, setNomModal] = useState<FlashDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!seller.sellerId) return;
    Promise.all([
      sellerApi.getFlashDeals(seller.sellerId).then(res => { setMyDeals(res?.data ?? []); }),
      sellerApi.getAvailableDeals(seller.sellerId).then(res => { setAvailable(res?.data ?? []); }),
      sellerApi.getNominations(seller.sellerId).then(res => { setNominations(res?.data ?? []); }),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [seller.sellerId]);

  // Nomination form state
  const [nomProduct, setNomProduct] = useState('');
  const [nomDiscount, setNomDiscount] = useState(20);
  const [nomStock, setNomStock] = useState(50);
  const [nomNote, setNomNote] = useState('');

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); }, []);

  // KPIs
  const activeDeals = myDeals.filter(d => d.status === 'active').length;
  const totalRevenue = myDeals.reduce((s, d) => s + d.revenue, 0);
  const totalSold = myDeals.reduce((s, d) => s + d.sold, 0);
  const pendingNoms = nominations.filter(n => n.status === 'pending').length;

  const TABS = [
    { id: 'deals' as const, label: 'My Deals', icon: Flame, count: myDeals.filter(d => ['active', 'scheduled'].includes(d.status)).length },
    { id: 'join' as const, label: 'Join Deals', icon: Plus, count: available.length },
    { id: 'nominations' as const, label: 'My Nominations', icon: Send, count: pendingNoms },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  const handleNominate = () => {
    if (!nomModal || !nomProduct.trim()) return;
    const newNom: Nomination = {
      id: `NOM-${Date.now()}`, dealId: nomModal.id, productName: nomProduct,
      proposedDiscount: nomDiscount, stockAllocated: nomStock, note: nomNote,
      status: 'pending', submittedAt: new Date().toISOString().split('T')[0],
    };
    setNominations(prev => [newNom, ...prev]);
    setAvailable(prev => prev.filter(d => d.id !== nomModal.id));
    setNomModal(null);
    setNomProduct(''); setNomDiscount(20); setNomStock(50); setNomNote('');
    showToast('Nomination submitted for admin review');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-red-500 fill-red-500" /> Flash Deals
          </h1>
          <p className="text-sm text-slate-500 mt-1">Nominate products for lightning deals · Track performance in real time</p>
        </div>
        <button onClick={() => setTab('join')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">
          <Plus className="w-4 h-4" /> Join a Flash Deal
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Deals', value: activeDeals, icon: Flame, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Total Revenue', value: `₹${(totalRevenue / 100000).toFixed(1)}L`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Units Sold', value: totalSold.toLocaleString(), icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Pending Nominations', value: pendingNoms, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${kpi.bg}`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: My Deals ─────────────────────────────────────────────────── */}
      {tab === 'deals' && (
        <div className="space-y-4">
          {myDeals.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No deals yet</p>
              <button onClick={() => setTab('join')} className="mt-3 text-sm text-red-600 font-bold hover:underline">Join your first flash deal →</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myDeals.map(deal => {
                const pct = deal.stockLimit > 0 ? Math.round((deal.sold / deal.stockLimit) * 100) : 0;
                const s = STATUS_STYLE[deal.status];
                return (
                  <div key={deal.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {deal.status === 'active' && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />}
                          <h3 className="font-bold text-slate-900">{deal.name}</h3>
                        </div>
                        <p className="text-xs text-slate-400">{deal.id} · {deal.products} products</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CountdownBadge end={deal.end} status={deal.status} />
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${s.bg} ${s.text}`}>{s.label}</span>
                      </div>
                    </div>
                    {/* Stock progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">Stock sold</span>
                        <span className="font-bold text-slate-700">{deal.sold}/{deal.stockLimit} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${pct >= 90 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <p className="text-slate-400">Revenue</p>
                        <p className="font-bold text-slate-900">₹{(deal.revenue / 100000).toFixed(1)}L</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <p className="text-slate-400">Discount</p>
                        <p className="font-bold text-red-600">{deal.discount}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <p className="text-slate-400">Views</p>
                        <p className="font-bold text-slate-900">{(deal.views / 1000).toFixed(1)}K</p>
                      </div>
                    </div>
                    {/* Duration */}
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{deal.start} → {deal.end}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Join Deals ───────────────────────────────────────────────── */}
      {tab === 'join' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-800">How Flash Deals Work</p>
              <p className="text-xs text-blue-600 mt-1">Browse platform deals below and nominate your products. Admin reviews nominations — approved products go live during the deal window. Minimum discount thresholds apply per deal.</p>
            </div>
          </div>

          {available.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">You've joined all available deals!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {available.map(deal => {
                const s = STATUS_STYLE[deal.status];
                return (
                  <div key={deal.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{deal.name}</h3>
                        <p className="text-xs text-slate-400">{deal.id} · {deal.products} products</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${s.bg} ${s.text}`}>{s.label}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-3">
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <p className="text-slate-400">Discount</p>
                        <p className="font-bold text-red-600">{deal.discount}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <p className="text-slate-400">Stock Limit</p>
                        <p className="font-bold text-slate-900">{deal.stockLimit}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <p className="text-slate-400">Min Discount</p>
                        <p className="font-bold text-amber-600">{deal.minDiscount ?? 15}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-4">
                      <Calendar className="w-3 h-3" />
                      <span>{deal.start} → {deal.end}</span>
                    </div>
                    <button onClick={() => setNomModal(deal)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> Nominate Product
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: My Nominations ──────────────────────────────────────────── */}
      {tab === 'nominations' && (
        <div className="space-y-4">
          {nominations.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
              <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No nominations yet</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Product</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Deal</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Discount</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Stock</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nominations.map(nom => {
                      const ns = NOM_STYLE[nom.status];
                      return (
                        <tr key={nom.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900">{nom.productName}</p>
                            <p className="text-xs text-slate-400">{nom.id} · Submitted {nom.submittedAt}</p>
                          </td>
                          <td className="px-4 py-4 text-center text-xs font-bold text-slate-600">{nom.dealId}</td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded-lg">{nom.proposedDiscount}% Off</span>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-slate-700">{nom.stockAllocated}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg ${ns.bg} ${ns.text}`}>
                              <ns.icon className="w-3 h-3" /> {nom.status.charAt(0).toUpperCase() + nom.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-500 max-w-[200px]">
                            {nom.status === 'rejected' && nom.rejectReason ? (
                              <span className="text-red-600">{nom.rejectReason}</span>
                            ) : nom.note || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Analytics ────────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Conversion Rate', value: totalSold > 0 ? `${((totalSold / myDeals.reduce((s, d) => s + d.views, 0)) * 100).toFixed(1)}%` : '0%', sub: 'From total deal views', icon: TrendingUp, color: 'text-emerald-600' },
              { label: 'Avg Revenue per Deal', value: myDeals.length > 0 ? `₹${(totalRevenue / myDeals.length / 100000).toFixed(1)}L` : '₹0', sub: 'Across all participated deals', icon: DollarSign, color: 'text-blue-600' },
              { label: 'Stock Depletion', value: `${myDeals.length > 0 ? Math.round(myDeals.reduce((s, d) => s + (d.stockLimit > 0 ? (d.sold / d.stockLimit) * 100 : 0), 0) / myDeals.length) : 0}%`, sub: 'Average across deals', icon: Package, color: 'text-purple-600' },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <p className="text-xs font-bold text-slate-400 uppercase">{stat.label}</p>
                </div>
                <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>
          {/* Deal performance table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700">Deal Performance Breakdown</h3>
            </div>
            {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Deal</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Revenue</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500">Units</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500">Views</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500">Conv %</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500">Stock %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myDeals.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-bold text-slate-900">{d.name}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">₹{(d.revenue / 100000).toFixed(1)}L</td>
                      <td className="px-4 py-3 text-center text-slate-600">{d.sold}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{(d.views / 1000).toFixed(1)}K</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">{d.views > 0 ? ((d.sold / d.views) * 100).toFixed(1) : 0}%</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{d.stockLimit > 0 ? Math.round((d.sold / d.stockLimit) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Nominate Product Modal ──────────────────────────────────────────── */}
      {nomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setNomModal(null)} ><DismissOnEscape onDismiss={() => setNomModal(null)} /></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Nominate Product</h3>
                <p className="text-xs text-slate-500">For: {nomModal.name} ({nomModal.id})</p>
              </div>
              <button onClick={() => setNomModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <strong>Min discount: {nomModal.minDiscount ?? 15}%</strong> · Deal window: {nomModal.start} → {nomModal.end}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="product-name">Product Name *</label>
              <input id="product-name" value={nomProduct} onChange={e => setNomProduct(e.target.value)} placeholder="e.g., Samsung Galaxy S24 Ultra" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="discount">Discount % *</label>
                <div className="flex items-center gap-3">
                  <input id="discount" type="range" min={nomModal.minDiscount ?? 15} max={80} value={nomDiscount} onChange={e => setNomDiscount(+e.target.value)} className="flex-1 accent-red-600" />
                  <span className="text-lg font-black text-red-600 w-12 text-right">{nomDiscount}%</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="stock-to-allocate">Stock to Allocate *</label>
                <input id="stock-to-allocate" type="number" value={nomStock} onChange={e => setNomStock(+e.target.value)} min={1} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="note-to-admin">Note to Admin</label>
              <textarea id="note-to-admin" value={nomNote} onChange={e => setNomNote(e.target.value)} rows={2} placeholder="Why should this product be in the flash deal?" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setNomModal(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleNominate} disabled={!nomProduct.trim() || nomDiscount < (nomModal.minDiscount ?? 15)} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Submit Nomination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-bold z-50">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
