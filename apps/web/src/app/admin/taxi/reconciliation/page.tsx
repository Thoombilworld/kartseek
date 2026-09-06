'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import {
  DollarSign, CheckCircle, AlertTriangle, Clock, XCircle, CreditCard,
  ArrowUpDown, Eye, Filter, Search, TrendingUp, Wallet, RefreshCw, Download, FileText, Smartphone, Banknote,
} from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

// ── Types ────────────────────────────────────────────────────────────────────

type TxnStatus = 'matched' | 'unmatched' | 'disputed' | 'settled' | 'pending';

interface Transaction {
  id: string;
  rideId: string;
  gateway: string;
  method: string;
  amount: number;
  platformFee: number;
  driverPayout: number;
  status: TxnStatus;
  gatewayRef: string;
  settledAt: string | null;
  createdAt: string;
  region: string;
}

interface GatewaySummary {
  name: string;
  icon: typeof CreditCard;
  totalTxns: number;
  volume: number;
  matched: number;
  unmatched: number;
  disputed: number;
  settledPct: number;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const TRANSACTIONS: Transaction[] = [
  { id: 'TXN-8001', rideId: 'RIDE-9199', gateway: 'UPI', method: 'Mobile Money', amount: 1200, platformFee: 180, driverPayout: 1020, status: 'matched', gatewayRef: 'MPE-892341', settledAt: '2026-07-08T14:00:00Z', createdAt: '2026-07-08T13:45:00Z', region: 'IN' },
  { id: 'TXN-8002', rideId: 'RIDE-9200', gateway: 'Stripe', method: 'Card', amount: 85, platformFee: 12.75, driverPayout: 72.25, status: 'pending', gatewayRef: 'pi_3QxY...', settledAt: null, createdAt: '2026-07-08T14:18:00Z', region: 'AE' },
  { id: 'TXN-8003', rideId: 'RIDE-9198', gateway: 'Cash', method: 'Cash', amount: 120, platformFee: 18, driverPayout: 102, status: 'matched', gatewayRef: 'CASH-001', settledAt: '2026-07-08T13:30:00Z', createdAt: '2026-07-08T13:30:00Z', region: 'IN' },
  { id: 'TXN-8004', rideId: 'RIDE-9196', gateway: 'GrabPay', method: 'e-Wallet', amount: 42, platformFee: 6.30, driverPayout: 35.70, status: 'matched', gatewayRef: 'GP-456123', settledAt: '2026-07-08T13:00:00Z', createdAt: '2026-07-08T12:50:00Z', region: 'SG' },
  { id: 'TXN-8005', rideId: 'RIDE-9195', gateway: 'Stripe', method: 'Card', amount: 68, platformFee: 10.20, driverPayout: 57.80, status: 'settled', gatewayRef: 'pi_3QxZ...', settledAt: '2026-07-08T12:00:00Z', createdAt: '2026-07-08T11:20:00Z', region: 'GB' },
  { id: 'TXN-8006', rideId: 'RIDE-9192', gateway: 'Stripe', method: 'Card', amount: 78, platformFee: 11.70, driverPayout: 66.30, status: 'disputed', gatewayRef: 'pi_3QxA...', settledAt: null, createdAt: '2026-07-08T08:15:00Z', region: 'US' },
  { id: 'TXN-8007', rideId: 'RIDE-9191', gateway: 'KNET', method: 'Debit', amount: 8, platformFee: 1.20, driverPayout: 6.80, status: 'settled', gatewayRef: 'KN-789012', settledAt: '2026-07-08T08:00:00Z', createdAt: '2026-07-08T07:30:00Z', region: 'KW' },
  { id: 'TXN-8008', rideId: 'RIDE-9194', gateway: 'BenefitPay', method: 'e-Wallet', amount: 5, platformFee: 0.75, driverPayout: 4.25, status: 'matched', gatewayRef: 'BP-345678', settledAt: '2026-07-08T10:30:00Z', createdAt: '2026-07-08T10:05:00Z', region: 'BH' },
  { id: 'TXN-8009', rideId: 'RIDE-9201', gateway: 'Razorpay', method: 'UPI', amount: 580, platformFee: 87, driverPayout: 493, status: 'unmatched', gatewayRef: 'pay_RZP...', settledAt: null, createdAt: '2026-07-08T14:22:00Z', region: 'IN' },
  { id: 'TXN-8010', rideId: 'RIDE-9197', gateway: 'mada', method: 'Debit', amount: 45, platformFee: 6.75, driverPayout: 38.25, status: 'pending', gatewayRef: 'MADA-112', settledAt: null, createdAt: '2026-07-08T14:25:00Z', region: 'SA' },
  { id: 'TXN-8011', rideId: 'RIDE-9190', gateway: 'Stripe', method: 'Card', amount: 6, platformFee: 0.90, driverPayout: 5.10, status: 'settled', gatewayRef: 'pi_3QxB...', settledAt: '2026-07-08T07:00:00Z', createdAt: '2026-07-08T06:45:00Z', region: 'OM' },
];

const STATUS_STYLES: Record<TxnStatus, { bg: string; label: string; icon: typeof CheckCircle }> = {
  matched: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Matched', icon: CheckCircle },
  settled: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Settled', icon: CheckCircle },
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending', icon: Clock },
  unmatched: { bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Unmatched', icon: AlertTriangle },
  disputed: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Disputed', icon: XCircle },
};

export default function AdminReconciliationPage() {
  const { filtered: txns, formatPrice, regionLabel, isFiltered, countryFlag } = useTaxiRegionFilter(TRANSACTIONS);
  const [statusFilter, setStatusFilter] = useState<TxnStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const filtered = useMemo(() => {
    let result = txns;
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => t.id.toLowerCase().includes(q) || t.rideId.toLowerCase().includes(q) || t.gateway.toLowerCase().includes(q) || t.gatewayRef.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [txns, statusFilter, search]);

  const totalVolume = txns.reduce((s, t) => s + t.amount, 0);
  const totalFees = txns.reduce((s, t) => s + t.platformFee, 0);
  const matchedPct = txns.length > 0 ? Math.round((txns.filter(t => t.status === 'matched' || t.status === 'settled').length / txns.length) * 100) : 0;
  const disputeCount = txns.filter(t => t.status === 'disputed').length;

  // Gateway breakdown
  const gatewaySummaries = useMemo<GatewaySummary[]>(() => {
    const map = new Map<string, GatewaySummary>();
    txns.forEach(t => {
      const existing = map.get(t.gateway) || { name: t.gateway, icon: CreditCard, totalTxns: 0, volume: 0, matched: 0, unmatched: 0, disputed: 0, settledPct: 0 };
      existing.totalTxns++;
      existing.volume += t.amount;
      if (t.status === 'matched' || t.status === 'settled') existing.matched++;
      if (t.status === 'unmatched') existing.unmatched++;
      if (t.status === 'disputed') existing.disputed++;
      existing.settledPct = Math.round((existing.matched / existing.totalTxns) * 100);
      map.set(t.gateway, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.volume - a.volume);
  }, [txns]);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Payment Reconciliation</h1>
          <p className="text-sm text-slate-500 mt-0.5">Match ride payments with gateway settlements {isFiltered && <span className="text-amber-600 font-bold">· {countryFlag} {regionLabel}</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => showToast('Running reconciliation...')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
            <RefreshCw className="w-4 h-4" /> Run Reconciliation
          </button>
          <button onClick={() => showToast('Exporting reconciliation report...')} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-lg text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Volume', value: formatPrice(totalVolume), color: 'bg-blue-50 text-blue-700 border-blue-200', icon: DollarSign },
          { label: 'Platform Fees', value: formatPrice(totalFees), color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: TrendingUp },
          { label: 'Match Rate', value: `${matchedPct}%`, color: matchedPct >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200', icon: CheckCircle },
          { label: 'Disputes', value: disputeCount, color: disputeCount > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: AlertTriangle },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-4 border ${kpi.color}`}>
            <kpi.icon className="w-5 h-5 mb-2" />
            <p className="text-xl font-black">{kpi.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Gateway Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Settlement by Gateway</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {gatewaySummaries.map(gw => (
            <div key={gw.name} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900">{gw.name}</span>
                <span className="text-xs text-slate-400">{gw.totalTxns} txns</span>
              </div>
              <p className="text-lg font-black text-slate-900">{formatPrice(gw.volume)}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] font-bold">
                <span className="text-emerald-600">{gw.matched} matched</span>
                {gw.unmatched > 0 && <span className="text-orange-600">{gw.unmatched} unmatched</span>}
                {gw.disputed > 0 && <span className="text-red-600">{gw.disputed} disputed</span>}
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <ProgressBar value={gw.settledPct} className="h-full bg-emerald-500 rounded-full transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID, ride, gateway ref..." className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'matched', 'pending', 'unmatched', 'disputed'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'all' ? 'All' : STATUS_STYLES[s as TxnStatus]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase bg-slate-50">
              <th className="px-4 py-3">Txn ID</th><th className="px-4 py-3">Ride</th><th className="px-4 py-3">Gateway</th>
              <th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Fee</th><th className="px-4 py-3 text-right">Payout</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Gateway Ref</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Action</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No transactions match the current filters</td></tr>
              ) : (
                filtered.map(t => {
                  const style = STATUS_STYLES[t.status];
                  const Icon = style.icon;
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 text-xs">{t.id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.rideId}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-slate-100 px-2 py-1 rounded font-medium">{t.gateway} · {t.method}</span></td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatPrice(t.amount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 text-xs">{formatPrice(t.platformFee)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{formatPrice(t.driverPayout)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.bg}`}>
                          <Icon className="w-3 h-3" />{style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.gatewayRef}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(t.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3">
                        {t.status === 'unmatched' && (
                          <button onClick={() => showToast(`Matching ${t.id} with gateway...`)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">Match</button>
                        )}
                        {t.status === 'disputed' && (
                          <button onClick={() => showToast(`Opening dispute for ${t.id}...`)} className="text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">Resolve</button>
                        )}
                        {(t.status === 'matched' || t.status === 'settled') && (
                          <button title="View transaction details" className="text-xs text-slate-400"><Eye className="w-3.5 h-3.5" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {filtered.length} of {txns.length} transactions</span>
          <span>Last reconciliation: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
