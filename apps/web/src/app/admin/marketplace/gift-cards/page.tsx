'use client';
import React, { useState } from 'react';
import { Gift, Search, Plus, X, Eye, Download, ChevronLeft, ChevronRight, CreditCard, Clock, CheckCircle, Ban } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB' };

type GiftCard = {
  id: string; code: string; denomination: number; balance: number; country: string;
  status: 'Active' | 'Redeemed' | 'Partially Used' | 'Expired' | 'Disabled';
  purchasedBy: string; recipientEmail: string; purchaseDate: string; expiryDate: string;
  usageHistory: { orderId: string; amount: number; date: string }[];
  theme: string; message: string;
};

const CARDS: GiftCard[] = [
  { id: 'GC-001', code: 'KART-GIFT-A1B2C3', denomination: 5000, balance: 5000, country: 'India', status: 'Active', purchasedBy: 'Rohit Sharma', recipientEmail: 'priya@email.com', purchaseDate: '2026-06-01', expiryDate: '2027-06-01', usageHistory: [], theme: 'Birthday', message: 'Happy Birthday Priya! 🎂' },
  { id: 'GC-002', code: 'KART-GIFT-D4E5F6', denomination: 10000, balance: 3200, country: 'India', status: 'Partially Used', purchasedBy: 'Amit Patel', recipientEmail: 'sneha@email.com', purchaseDate: '2026-05-15', expiryDate: '2027-05-15', usageHistory: [{ orderId: 'ORD-8820', amount: 4500, date: '2026-05-20' }, { orderId: 'ORD-8845', amount: 2300, date: '2026-06-02' }], theme: 'Wedding', message: 'Congratulations on your wedding!' },
  { id: 'GC-003', code: 'KART-GIFT-G7H8I9', denomination: 2000, balance: 0, country: 'India', status: 'Redeemed', purchasedBy: 'Sneha Nair', recipientEmail: 'amit@email.com', purchaseDate: '2026-04-01', expiryDate: '2027-04-01', usageHistory: [{ orderId: 'ORD-8750', amount: 2000, date: '2026-04-10' }], theme: 'Thank You', message: 'Thanks for being awesome!' },
  { id: 'GC-004', code: 'KART-GIFT-J1K2L3', denomination: 25000, balance: 25000, country: 'UAE', status: 'Active', purchasedBy: 'Ahmed Al-Farsi', recipientEmail: 'khalid@email.com', purchaseDate: '2026-06-05', expiryDate: '2027-06-05', usageHistory: [], theme: 'Eid', message: 'Eid Mubarak! 🌙' },
  { id: 'GC-005', code: 'KART-GIFT-M4N5O6', denomination: 1000, balance: 1000, country: 'India', status: 'Expired', purchasedBy: 'System Promo', recipientEmail: 'winner@email.com', purchaseDate: '2025-06-01', expiryDate: '2026-06-01', usageHistory: [], theme: 'Promotional', message: 'Contest winner reward' },
  { id: 'GC-006', code: 'KART-GIFT-P7Q8R9', denomination: 3000, balance: 3000, country: 'India', status: 'Disabled', purchasedBy: 'Fraud Review', recipientEmail: 'suspect@email.com', purchaseDate: '2026-05-28', expiryDate: '2027-05-28', usageHistory: [], theme: 'General', message: '' },
];

const STATUS_STYLES: Record<string, string> = { Active: 'bg-emerald-50 text-emerald-700', Redeemed: 'bg-slate-100 text-slate-500', 'Partially Used': 'bg-blue-50 text-blue-700', Expired: 'bg-red-50 text-red-600', Disabled: 'bg-red-100 text-red-700' };
const THEME_COLORS: Record<string, string> = { Birthday: 'from-pink-500 to-purple-600', Wedding: 'from-amber-500 to-orange-600', 'Thank You': 'from-blue-500 to-indigo-600', Eid: 'from-emerald-500 to-teal-600', Promotional: 'from-slate-600 to-slate-800', General: 'from-slate-500 to-slate-700' };

function CardDrawer({ card: c, onClose, fmt }: { card: GiftCard; onClose: () => void; fmt: (n: number) => string }) {
  const usedPct = ((c.denomination - c.balance) / c.denomination) * 100;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{c.id}</h2><p className="text-xs text-slate-500">{c.purchaseDate}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className={`bg-gradient-to-br ${THEME_COLORS[c.theme] || THEME_COLORS.General} rounded-2xl p-6 text-white relative overflow-hidden`}>
            <div className="absolute top-2 right-3 opacity-20"><Gift className="w-16 h-16" /></div>
            <p className="text-xs font-bold opacity-80 mb-1">KartSeek Gift Card</p>
            <p className="text-3xl font-black">{fmt(c.denomination)}</p>
            <p className="font-mono text-sm mt-3 bg-white/20 inline-block px-3 py-1 rounded-lg">{c.code}</p>
            {c.message && <p className="text-xs opacity-80 mt-3 italic">"{c.message}"</p>}
            <p className="text-[10px] opacity-60 mt-2">{c.theme} · Expires {c.expiryDate}</p>
          </div>

          <div className="flex gap-2"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[c.status]}`}>{c.status}</span></div>

          <div><p className="text-xs text-slate-500 mb-1">Balance</p><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(c.balance / c.denomination) * 100}%` }} /></div><div className="flex justify-between mt-1"><span className="text-xs font-bold text-emerald-600">{fmt(c.balance)} remaining</span><span className="text-xs text-slate-400">{usedPct.toFixed(0)}% used</span></div></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Purchased By</p><p className="text-sm font-bold text-slate-900">{c.purchasedBy}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Recipient</p><p className="text-sm font-bold text-slate-900">{c.recipientEmail}</p></div>
          </div>

          {c.usageHistory.length > 0 && (
            <div><h3 className="text-sm font-bold text-slate-900 mb-2">Usage History</h3>
              {c.usageHistory.map((u, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <div><p className="text-xs font-bold text-blue-700 font-mono">{u.orderId}</p><p className="text-[10px] text-slate-400">{u.date}</p></div>
                  <p className="text-xs font-black text-red-500">−{fmt(u.amount)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {c.status === 'Active' && <button className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Ban className="w-4 h-4" /> Disable Card</button>}
            {c.status === 'Disabled' && <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Re-Enable</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueCardModal({ onIssue, onClose }: { onIssue: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ denomination: 1000, recipientEmail: '', theme: 'General', message: '', expiryMonths: 12, quantity: 1 });
  const u = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-black text-slate-900 mb-4">Issue Gift Card</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="denomination">Denomination (₹)</label><select id="denomination" value={form.denomination} onChange={e => u('denomination', +e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option value={500}>₹500</option><option value={1000}>₹1,000</option><option value={2000}>₹2,000</option><option value={5000}>₹5,000</option><option value={10000}>₹10,000</option><option value={25000}>₹25,000</option></select></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="quantity">Quantity</label><input id="quantity" type="number" value={form.quantity} onChange={e => u('quantity', +e.target.value)} min={1} max={100} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="recipient-email">Recipient Email</label><input id="recipient-email" value={form.recipientEmail} onChange={e => u('recipientEmail', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="recipient@email.com" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="theme">Theme</label><select id="theme" value={form.theme} onChange={e => u('theme', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>General</option><option>Birthday</option><option>Wedding</option><option>Thank You</option><option>Eid</option><option>Diwali</option><option>Promotional</option></select></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="validity">Validity</label><select id="validity" value={form.expiryMonths} onChange={e => u('expiryMonths', +e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option value={6}>6 months</option><option value={12}>12 months</option><option value={24}>24 months</option></select></div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="personal-message">Personal Message</label><textarea id="personal-message" value={form.message} onChange={e => u('message', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-20 outline-none" placeholder="Optional greeting..." /></div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold">Cancel</button>
          <button onClick={() => onIssue(form)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Gift className="w-4 h-4" /> Issue {form.quantity > 1 ? `${form.quantity} Cards` : 'Card'}</button>
        </div>
      </div>
    </div>
  );
}

export default function GiftCardsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<GiftCard | null>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getOrders(), []);
  const { execute } = useAdminAction(showToast);
  const { filtered: regionFiltered, formatCurrencyValue } = useMarketplaceRegionFilter(CARDS);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.code.toLowerCase().includes(search.toLowerCase()) && !c.purchasedBy.toLowerCase().includes(search.toLowerCase()) && !c.recipientEmail.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalIssued = regionFiltered.reduce((a, c) => a + c.denomination, 0);
  const totalBalance = regionFiltered.reduce((a, c) => a + c.balance, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Gift Cards</h1><p className="text-sm text-slate-500 mt-0.5">Issue, track, and manage gift card inventory</p></div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowIssue(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> Issue Card</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl p-5 text-white"><p className="text-sm font-bold opacity-80">Total Issued</p><p className="text-2xl font-black mt-1">{fmt(totalIssued)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Outstanding Balance</p><p className="text-xl font-black text-emerald-600">{fmt(totalBalance)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Active Cards</p><p className="text-xl font-black text-blue-600">{regionFiltered.filter(c => c.status === 'Active' || c.status === 'Partially Used').length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Redeemed</p><p className="text-xl font-black text-slate-600">{regionFiltered.filter(c => c.status === 'Redeemed').length}</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search code, buyer, or recipient..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">{['all', 'Active', 'Partially Used', 'Redeemed', 'Expired', 'Disabled'].map(s => (<button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Card</th><th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Recipient</th><th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Value</th><th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Balance</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Theme</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Expiry</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">View</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (<tr><td colSpan={8}><MarketplaceEmptyState title="No gift cards found" icon={Gift} /></td></tr>) : paged.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setSelected(c)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(c))}>
                <td className="px-4 py-3.5"><p className="font-mono font-bold text-blue-700 text-xs">{c.code}</p><p className="text-[10px] text-slate-400">{c.id} · {c.purchaseDate}</p></td>
                <td className="px-4 py-3.5"><p className="text-xs font-bold text-slate-900">{c.recipientEmail}</p><p className="text-[10px] text-slate-400">by {c.purchasedBy}</p></td>
                <td className="px-4 py-3.5 text-right font-bold text-slate-900">{fmt(c.denomination)}</td>
                <td className="px-4 py-3.5 text-right"><span className={`font-black ${c.balance === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>{fmt(c.balance)}</span></td>
                <td className="px-4 py-3.5 text-center"><span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{c.theme}</span></td>
                <td className="px-4 py-3.5 text-center text-xs text-slate-500">{c.expiryDate}</td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[c.status]}`}>{c.status}</span></td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}><button onClick={() => setSelected(c)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between px-2"><p className="text-xs text-slate-500">{filtered.length} cards</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-bold">{page}/{totalPages}</span><button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>)}

      {selected && <CardDrawer card={selected} onClose={() => setSelected(null)} fmt={fmt} />}
      {showIssue && <IssueCardModal onIssue={(data) => { execute(() => adminMarketplaceApi.sendNotification(data), `${data.quantity} gift card(s) issued`, () => refetch()); setShowIssue(false); }} onClose={() => setShowIssue(false)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
