'use client';

import React, { useState } from 'react';
import {
  Wallet, Search, Filter, Download, Eye, Lock, Unlock,
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2,
  Clock, DollarSign, Users, Shield, X, Loader2,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
/* ── Mock Transaction Data ─────────────────────────────────────────────────── */
const TRANSACTIONS = [
  { id: 'TXN-90001', userId: 'USR-4201', user: 'Rahul M.', type: 'CREDIT' as const, amount: 1500, reason: 'Wallet Top-Up (UPI)', module: 'topup', balance: 4250, date: '2026-06-27 14:32', status: 'completed' },
  { id: 'TXN-90002', userId: 'USR-3180', user: 'Meera K.', type: 'DEBIT' as const, amount: 890, reason: 'Marketplace Order #KS-78432', module: 'marketplace', balance: 2610, date: '2026-06-27 12:15', status: 'completed' },
  { id: 'TXN-90003', userId: 'USR-5522', user: 'Amit P.', type: 'CREDIT' as const, amount: 450, reason: 'Refund - Cancelled Order #ORD-9912', module: 'refund', balance: 3200, date: '2026-06-27 10:00', status: 'completed' },
  { id: 'TXN-90004', userId: 'USR-2890', user: 'Sara A.', type: 'DEBIT' as const, amount: 2100, reason: 'Restaurant Order #RES-5511', module: 'restaurant', balance: 1400, date: '2026-06-26 21:30', status: 'completed' },
  { id: 'TXN-90005', userId: 'USR-1100', user: 'Vikram T.', type: 'CREDIT' as const, amount: 5000, reason: 'Wallet Top-Up (Card)', module: 'topup', balance: 8500, date: '2026-06-26 16:00', status: 'completed' },
  { id: 'TXN-90006', userId: 'USR-4201', user: 'Rahul M.', type: 'DEBIT' as const, amount: 1120, reason: 'Grocery Order #GRO-1021', module: 'grocery', balance: 2750, date: '2026-06-26 09:00', status: 'completed' },
  { id: 'TXN-90007', userId: 'USR-6700', user: 'Lin W.', type: 'CREDIT' as const, amount: 200, reason: 'Cashback Reward', module: 'cashback', balance: 1200, date: '2026-06-25 14:00', status: 'completed' },
];

const MODULE_COLORS: Record<string, string> = {
  topup: 'bg-blue-100 text-blue-700', marketplace: 'bg-indigo-100 text-indigo-700',
  refund: 'bg-emerald-100 text-emerald-700', restaurant: 'bg-orange-100 text-orange-700',
  grocery: 'bg-green-100 text-green-700', cashback: 'bg-purple-100 text-purple-700',
  pharmacy: 'bg-teal-100 text-teal-700', taxi: 'bg-amber-100 text-amber-700',
  admin: 'bg-red-100 text-red-700',
};

/* ── Frozen Wallets Mock ──────────────────────────────────────────────────── */
const FROZEN_WALLETS = [
  { userId: 'USR-6200', user: 'Street Bites Seller', reason: 'Suspected fraudulent refund claims', frozenBy: 'Priya S.', frozenAt: '2026-06-20 10:00', balance: 40000 },
];

export default function AdminWalletAuditPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'CREDIT' | 'DEBIT'>('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  // Freeze state
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeUserId, setFreezeUserId] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [freezeSuccess, setFreezeSuccess] = useState(false);

  // Adjust state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState(false);

  // Detail drawer
  const [viewTxn, setViewTxn] = useState<typeof TRANSACTIONS[0] | null>(null);

  const filtered = TRANSACTIONS.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (moduleFilter !== 'all' && t.module !== moduleFilter) return false;
    if (searchQuery && !t.user.toLowerCase().includes(searchQuery.toLowerCase()) && !t.userId.toLowerCase().includes(searchQuery.toLowerCase()) && !t.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalCredits = TRANSACTIONS.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
  const totalDebits = TRANSACTIONS.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);

  const handleFreeze = async () => {
    if (!freezeUserId || !freezeReason) return;
    setFreezeLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setFreezeLoading(false);
    setFreezeSuccess(true);
    setTimeout(() => { setFreezeSuccess(false); setShowFreezeModal(false); setFreezeUserId(''); setFreezeReason(''); }, 1500);
  };

  const handleAdjust = () => {
    if (!adjustUserId || adjustAmount <= 0 || !adjustReason) return;
    setAdjustSuccess(true);
    setTimeout(() => { setAdjustSuccess(false); setShowAdjustModal(false); setAdjustUserId(''); setAdjustAmount(0); setAdjustReason(''); }, 1500);
  };

  const modules = [...new Set(TRANSACTIONS.map(t => t.module))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Wallet className="w-6 h-6 text-blue-500" /> Wallet Audit</h1>
          <p className="text-sm text-slate-500 mt-0.5">Search, audit, and manage wallet transactions across all users</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdjustModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
            <DollarSign className="w-4 h-4" /> Adjust Balance
          </button>
          <button onClick={() => setShowFreezeModal(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
            <Lock className="w-4 h-4" /> Freeze Wallet
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Credits', value: `₹${totalCredits.toLocaleString('en-IN')}`, icon: ArrowDownRight, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Total Debits', value: `₹${totalDebits.toLocaleString('en-IN')}`, icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
          { label: 'Transactions', value: TRANSACTIONS.length.toString(), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Frozen Wallets', value: FROZEN_WALLETS.length.toString(), icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} border ${kpi.border} rounded-xl p-4 shadow-sm`}>
            <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            <p className="text-2xl font-black text-slate-900 mt-2">{kpi.value}</p>
            <p className="text-xs text-slate-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Frozen Wallets Alert */}
      {FROZEN_WALLETS.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Frozen Wallets ({FROZEN_WALLETS.length})</p>
            {FROZEN_WALLETS.map(fw => (
              <div key={fw.userId} className="flex items-center gap-3 mt-2 text-sm text-amber-700">
                <span className="font-mono text-xs">{fw.userId}</span>
                <span className="font-bold">{fw.user}</span>
                <span className="text-xs">— {fw.reason}</span>
                <button className="ml-auto text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"><Unlock className="w-3 h-3" /> Unfreeze</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by user, ID, or transaction ID..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-400" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" aria-label="Type filter">
          <option value="all">All Types</option><option value="CREDIT">Credit</option><option value="DEBIT">Debit</option>
        </select>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" aria-label="Module filter">
          <option value="all">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <th className="px-5 py-3 font-semibold">Transaction</th><th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Module</th><th className="px-4 py-3 font-semibold">Balance After</th>
            <th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 text-center font-semibold">View</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(txn => (
              <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3"><p className="font-mono text-xs text-slate-500">{txn.id}</p><p className="text-xs text-slate-600 truncate max-w-[180px]">{txn.reason}</p></td>
                <td className="px-4 py-3"><p className="font-bold text-slate-900 text-xs">{txn.user}</p><p className="text-[10px] text-slate-400 font-mono">{txn.userId}</p></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${txn.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{txn.type}</span></td>
                <td className={`px-4 py-3 font-bold ${txn.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>{txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${MODULE_COLORS[txn.module] || 'bg-slate-100 text-slate-600'}`}>{txn.module}</span></td>
                <td className="px-4 py-3 font-mono text-slate-900">₹{txn.balance.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{txn.date}</td>
                <td className="px-4 py-3 text-center"><button onClick={() => setViewTxn(txn)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No transactions match your filters</div>}
      </div>

      {/* ═══ Transaction Detail Drawer ════════════════════════════════════════ */}
      {viewTxn && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setViewTxn(null)} ><DismissOnEscape onDismiss={() => setViewTxn(null)} /></div>
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Transaction Details</h3>
                <button onClick={() => setViewTxn(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="text-center py-4">
                <p className={`text-3xl font-black ${viewTxn.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>{viewTxn.type === 'CREDIT' ? '+' : '-'}₹{viewTxn.amount.toLocaleString('en-IN')}</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold mt-2 ${viewTxn.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{viewTxn.type}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                {[['Transaction ID', viewTxn.id], ['User', `${viewTxn.user} (${viewTxn.userId})`], ['Reason', viewTxn.reason], ['Module', viewTxn.module], ['Balance After', `₹${viewTxn.balance.toLocaleString('en-IN')}`], ['Date', viewTxn.date], ['Status', viewTxn.status]].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="text-slate-500">{k}</span><span className="font-bold text-slate-900 text-right">{v}</span></div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ Freeze Modal ═════════════════════════════════════════════════════ */}
      {showFreezeModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => !freezeLoading && setShowFreezeModal(false)} ><DismissOnEscape onDismiss={() => !freezeLoading && setShowFreezeModal(false)} /></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><Lock className="w-5 h-5 text-red-600" /></div>
                <div><h3 className="font-black text-slate-900">Freeze Wallet</h3><p className="text-xs text-slate-500">Blocks all debit operations. Refund credits still allowed.</p></div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="user-id">User ID</label>
                <input id="user-id" value={freezeUserId} onChange={e => setFreezeUserId(e.target.value)} placeholder="e.g. USR-6200" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="reason">Reason</label>
                <textarea id="reason" value={freezeReason} onChange={e => setFreezeReason(e.target.value)} placeholder="Why is this wallet being frozen?" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none" rows={3} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowFreezeModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Cancel</button>
                <button onClick={handleFreeze} disabled={!freezeUserId || !freezeReason || freezeLoading}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 ${freezeSuccess ? 'bg-emerald-600' : 'bg-red-600 hover:bg-red-700'}`}>
                  {freezeLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Freezing...</> : freezeSuccess ? <><CheckCircle2 className="w-4 h-4" /> Frozen!</> : <><Lock className="w-4 h-4" /> Freeze Wallet</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ Balance Adjustment Modal ═════════════════════════════════════════ */}
      {showAdjustModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)} ><DismissOnEscape onDismiss={() => setShowAdjustModal(false)} /></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 text-blue-600" /></div>
                <div><h3 className="font-black text-slate-900">Adjust Wallet Balance</h3><p className="text-xs text-slate-500">Manually credit or debit a user&apos;s wallet</p></div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="user-id-2">User ID</label>
                <input id="user-id-2" value={adjustUserId} onChange={e => setAdjustUserId(e.target.value)} placeholder="e.g. USR-4201" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAdjustType('CREDIT')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 ${adjustType === 'CREDIT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>Credit</button>
                <button onClick={() => setAdjustType('DEBIT')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 ${adjustType === 'DEBIT' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'}`}>Debit</button>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="amount">Amount (₹)</label>
                <input id="amount" type="number" value={adjustAmount || ''} onChange={e => setAdjustAmount(+e.target.value)} placeholder="e.g. 1000" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-blue-400" min={1} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="reason-2">Reason</label>
                <input id="reason-2" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="e.g. Customer compensation" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdjustModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Cancel</button>
                <button onClick={handleAdjust} disabled={!adjustUserId || adjustAmount <= 0 || !adjustReason}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 ${adjustSuccess ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {adjustSuccess ? <><CheckCircle2 className="w-4 h-4" /> Done!</> : 'Confirm Adjustment'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
