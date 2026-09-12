'use client';
import React, { useState } from 'react';
import {
  Scale,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Lock,
  Unlock,
  FileText,
  MessageSquare,
  User,
} from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = {
  India: 'IN',
  UAE: 'AE',
  UK: 'GB',
  'Saudi Arabia': 'SA',
};

type Dispute = {
  id: string;
  orderId: string;
  product: string;
  buyer: string;
  seller: string;
  country: string;
  type:
    | 'Product Quality'
    | 'Non-Delivery'
    | 'Counterfeit'
    | 'Wrong Item'
    | 'Damaged'
    | 'Overcharging';
  status:
    | 'Open'
    | 'Under Investigation'
    | 'Awaiting Evidence'
    | 'Payout Frozen'
    | 'Resolved — Buyer'
    | 'Resolved — Seller'
    | 'Closed';
  amount: number;
  payoutFrozen: boolean;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  filedDate: string;
  slaDeadline: string;
  assignee: string;
  buyerEvidence: string[];
  sellerEvidence: string[];
  timeline: { date: string; action: string; by: string }[];
};

const DISPUTES: Dispute[] = [
  {
    id: 'DSP-001',
    orderId: 'ORD-8890',
    product: 'iPhone 15 Pro',
    buyer: 'Rohit Sharma',
    seller: 'Apple India Store',
    country: 'India',
    type: 'Damaged',
    status: 'Under Investigation',
    amount: 134900,
    payoutFrozen: true,
    priority: 'High',
    filedDate: '2026-06-05',
    slaDeadline: '2026-06-12',
    assignee: 'Priya Agent',
    buyerEvidence: ['📸 Cracked screen photo', '📸 Packaging photo', '📄 Unboxing video'],
    sellerEvidence: ['📄 Shipping manifest', '📸 Pre-dispatch QC photo'],
    timeline: [
      { date: '2026-06-05', action: 'Dispute filed by buyer', by: 'Rohit Sharma' },
      { date: '2026-06-05', action: 'Payout frozen — ₹1,34,900', by: 'System' },
      { date: '2026-06-05', action: 'Assigned to agent', by: 'System' },
      { date: '2026-06-06', action: 'Seller notified — evidence requested', by: 'Priya Agent' },
    ],
  },
  {
    id: 'DSP-002',
    orderId: 'ORD-8878',
    product: 'Dyson V15 Detect',
    buyer: 'Ahmed Al-Farsi',
    seller: 'Gulf Electronics FZE',
    country: 'UAE',
    type: 'Counterfeit',
    status: 'Payout Frozen',
    amount: 52000,
    payoutFrozen: true,
    priority: 'Critical',
    filedDate: '2026-06-03',
    slaDeadline: '2026-06-10',
    assignee: 'Senior Team',
    buyerEvidence: ['📸 Product vs genuine comparison', '📄 Dyson verification email'],
    sellerEvidence: [],
    timeline: [
      {
        date: '2026-06-03',
        action: 'Dispute filed — Counterfeit allegation',
        by: 'Ahmed Al-Farsi',
      },
      { date: '2026-06-03', action: 'Priority: Critical — Seller suspended', by: 'Senior Team' },
      { date: '2026-06-04', action: 'Payout frozen — all seller payouts on hold', by: 'System' },
    ],
  },
  {
    id: 'DSP-003',
    orderId: 'ORD-8882',
    product: 'Nike Air Jordan 1',
    buyer: 'Amit Patel',
    seller: 'Nike India',
    country: 'India',
    type: 'Wrong Item',
    status: 'Awaiting Evidence',
    amount: 16995,
    payoutFrozen: false,
    priority: 'Medium',
    filedDate: '2026-06-04',
    slaDeadline: '2026-06-11',
    assignee: '',
    buyerEvidence: ['📸 Photo of navy shoes'],
    sellerEvidence: [],
    timeline: [
      { date: '2026-06-04', action: 'Dispute filed — wrong color received', by: 'Amit Patel' },
    ],
  },
  {
    id: 'DSP-004',
    orderId: 'ORD-8870',
    product: 'Silk Saree Collection',
    buyer: 'Sneha Nair',
    seller: 'Heritage Silk House',
    country: 'India',
    type: 'Product Quality',
    status: 'Resolved — Buyer',
    amount: 8999,
    payoutFrozen: false,
    priority: 'Low',
    filedDate: '2026-06-01',
    slaDeadline: '2026-06-08',
    assignee: 'Priya Agent',
    buyerEvidence: ['📸 Thread quality photos'],
    sellerEvidence: ['📄 Material certification'],
    timeline: [
      { date: '2026-06-01', action: 'Dispute filed', by: 'Sneha Nair' },
      { date: '2026-06-03', action: 'Evidence reviewed', by: 'Priya Agent' },
      { date: '2026-06-04', action: 'Resolved in favor of buyer — full refund', by: 'Priya Agent' },
    ],
  },
  {
    id: 'DSP-005',
    orderId: 'ORD-8885',
    product: 'Samsung Galaxy S24',
    buyer: 'Priya Menon',
    seller: 'Samsung Official',
    country: 'India',
    type: 'Non-Delivery',
    status: 'Open',
    amount: 79999,
    payoutFrozen: true,
    priority: 'High',
    filedDate: '2026-06-05',
    slaDeadline: '2026-06-12',
    assignee: '',
    buyerEvidence: ['📄 Delivery tracking screenshot'],
    sellerEvidence: [],
    timeline: [
      {
        date: '2026-06-05',
        action: 'Dispute filed — package shows delivered but not received',
        by: 'Priya Menon',
      },
      { date: '2026-06-05', action: 'Payout frozen — ₹79,999', by: 'System' },
    ],
  },
];

const STATUS_STYLES: Record<string, string> = {
  Open: 'bg-blue-50 text-blue-700',
  'Under Investigation': 'bg-amber-50 text-amber-700',
  'Awaiting Evidence': 'bg-purple-50 text-purple-700',
  'Payout Frozen': 'bg-red-50 text-red-700',
  'Resolved — Buyer': 'bg-emerald-50 text-emerald-700',
  'Resolved — Seller': 'bg-emerald-50 text-emerald-700',
  Closed: 'bg-slate-100 text-slate-500',
};
const PRIORITY_STYLES: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-50 text-blue-600',
  High: 'bg-amber-50 text-amber-700',
  Critical: 'bg-red-100 text-red-700',
};

// ── Dispute Drawer ───────────────────────────────────────────────────────────
function DisputeDrawer({
  dispute: d,
  onClose,
  onResolve,
  onFreeze,
}: {
  dispute: Dispute;
  onClose: () => void;
  onResolve: (favor: 'buyer' | 'seller') => void;
  onFreeze: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{d.id}</h2>
            <p className="text-xs text-slate-500">
              {d.orderId} · {d.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[d.status]}`}
            >
              {d.status}
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${PRIORITY_STYLES[d.priority]}`}
            >
              {d.priority}
            </span>
            {d.payoutFrozen && (
              <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-md flex items-center gap-0.5">
                <Lock className="w-3 h-3" />
                Payout Frozen
              </span>
            )}
          </div>

          {/* Amount */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-5 text-white text-center">
            <p className="text-sm font-bold opacity-80">Disputed Amount</p>
            <p className="text-3xl font-black mt-1">₹{d.amount.toLocaleString()}</p>
            <p className="text-xs opacity-60 mt-1">{d.product}</p>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] text-blue-600 font-bold">👤 Buyer</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{d.buyer}</p>
              <p className="text-[10px] text-slate-400">
                <CountryFlag code={COUNTRY_TO_CODE[d.country] || 'IN'} size="sm" /> {d.country}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[10px] text-amber-600 font-bold">🏪 Seller</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{d.seller}</p>
            </div>
          </div>

          {/* SLA */}
          <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-slate-500">Filed</p>
              <p className="text-xs font-bold">{d.filedDate}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500">SLA Deadline</p>
              <p className="text-xs font-bold text-red-600">{d.slaDeadline}</p>
            </div>
          </div>

          {/* Evidence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Buyer Evidence ({d.buyerEvidence.length})
              </p>
              {d.buyerEvidence.map((e, i) => (
                <p
                  key={i}
                  className="text-[10px] text-slate-600 py-1 border-b border-slate-100 last:border-0"
                >
                  {e}
                </p>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Seller Evidence ({d.sellerEvidence.length})
              </p>
              {d.sellerEvidence.length ? (
                d.sellerEvidence.map((e, i) => (
                  <p
                    key={i}
                    className="text-[10px] text-slate-600 py-1 border-b border-slate-100 last:border-0"
                  >
                    {e}
                  </p>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 italic">No evidence submitted yet</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Timeline</h3>
            <div className="space-y-0 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
              {d.timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2 relative">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${i === d.timeline.length - 1 ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <Clock
                      className={`w-3 h-3 ${i === d.timeline.length - 1 ? 'text-white' : 'text-slate-500'}`}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{t.action}</p>
                    <p className="text-[10px] text-slate-400">
                      {t.by} · {t.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {!d.status.includes('Resolved') && d.status !== 'Closed' && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => onResolve('buyer')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  Resolve → Buyer
                </button>
                <button
                  onClick={() => onResolve('seller')}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  Resolve → Seller
                </button>
              </div>
              {!d.payoutFrozen && (
                <button
                  onClick={onFreeze}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" /> Freeze Payout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function DisputesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const PAGE_SIZE = 5;

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(() => adminMarketplaceApi.getComplaints({ country }), [country]);
  const { execute } = useAdminAction(showToast);

  const {
    filtered: regionFiltered,
    regionLabel,
    isFiltered,
    formatCurrencyValue,
  } = useMarketplaceRegionFilter(DISPUTES);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (
      search &&
      !d.buyer.toLowerCase().includes(search.toLowerCase()) &&
      !d.seller.toLowerCase().includes(search.toLowerCase()) &&
      !d.id.includes(search)
    )
      return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const frozenAmount = regionFiltered
    .filter((d) => d.payoutFrozen)
    .reduce((a, d) => a + d.amount, 0);
  const activeCount = regionFiltered.filter(
    (d) => !d.status.includes('Resolved') && d.status !== 'Closed',
  ).length;

  const handleResolve = (d: Dispute, favor: 'buyer' | 'seller') => {
    execute(
      () => adminMarketplaceApi.updateComplaint(d.id, { action: 'resolve', favor }),
      `${d.id} resolved in favor of ${favor}`,
      () => refetch(),
    );
    setSelected(null);
  };
  const handleFreeze = (d: Dispute) => {
    execute(
      () => adminMarketplaceApi.updateComplaint(d.id, { action: 'freeze_payout' }),
      `Payout frozen for ${d.id}`,
      () => refetch(),
    );
    setSelected(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dispute Resolution Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Manage buyer-seller disputes with evidence,
            payout freeze & SLA tracking
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-xl p-5 text-white">
          <p className="text-sm font-bold opacity-80">Frozen Payouts</p>
          <p className="text-2xl font-black mt-1">{fmt(frozenAmount)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">Active Disputes</p>
          <p className="text-2xl font-black text-amber-600">{activeCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">Critical</p>
          <p className="text-2xl font-black text-red-600">
            {regionFiltered.filter((d) => d.priority === 'Critical').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">Resolved</p>
          <p className="text-2xl font-black text-emerald-600">
            {regionFiltered.filter((d) => d.status.includes('Resolved')).length}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search buyer, seller, or dispute ID..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'Open', 'Under Investigation', 'Awaiting Evidence', 'Payout Frozen'].map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="space-y-3">
        {paged.length === 0 ? (
          <MarketplaceEmptyState title="No disputes found" icon={Scale} />
        ) : (
          paged.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelected(d)}
              role="button"
              tabIndex={0}
              onKeyDown={activateOnKey(() => setSelected(d))}
              className={`bg-white border rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow ${d.priority === 'Critical' ? 'border-red-200 bg-red-50/20' : d.payoutFrozen ? 'border-amber-200' : 'border-slate-200'}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${d.payoutFrozen ? 'bg-red-50' : 'bg-blue-50'}`}
                >
                  {d.payoutFrozen ? (
                    <Lock className="w-5 h-5 text-red-600" />
                  ) : (
                    <Scale className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-bold text-slate-900 text-sm">{d.product}</p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[d.status]}`}
                    >
                      {d.status}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${PRIORITY_STYLES[d.priority]}`}
                    >
                      {d.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-1">
                    {d.type} — {d.buyer} vs {d.seller}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span>
                      {d.id} · {d.orderId}
                    </span>
                    <span>
                      <CountryFlag code={COUNTRY_TO_CODE[d.country] || 'IN'} size="sm" />
                    </span>
                    <span className="font-bold text-slate-700">{fmt(d.amount)}</span>
                    <span>Filed {d.filedDate}</span>
                    <span className="text-red-500">SLA: {d.slaDeadline}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-slate-900">{fmt(d.amount)}</p>
                  {d.payoutFrozen && (
                    <p className="text-[10px] font-bold text-red-600 flex items-center gap-0.5 justify-end">
                      <Lock className="w-3 h-3" />
                      Frozen
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">{filtered.length} disputes</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold">
              {page}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {selected && (
        <DisputeDrawer
          dispute={selected}
          onClose={() => setSelected(null)}
          onResolve={(favor) => handleResolve(selected, favor)}
          onFreeze={() => handleFreeze(selected)}
        />
      )}
      <AdminToast toast={toast} />
    </div>
  );
}
