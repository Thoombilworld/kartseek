'use client';
import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  X,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Copy,
  AlertTriangle,
  Banknote,
} from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import MarketplaceStatusBadge from '@/components/admin/marketplace/marketplace-status-badge';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = {
  India: 'IN',
  UAE: 'AE',
  UK: 'GB',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
};

type Refund = {
  id: string;
  order: string;
  payment: string;
  customer: string;
  seller: string;
  country: string;
  amount: number;
  reason: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Rejected';
  method: string;
  date: string;
  completedAt: string;
  bankAccount: string;
  utr: string;
};

const REFUNDS: Refund[] = [
  {
    id: 'REF-001',
    order: 'ORD-8820005',
    payment: 'PAY-5005',
    customer: 'Priya Mehta',
    seller: 'Nike Official',
    country: 'India',
    amount: 17995,
    reason: 'Customer cancelled — order not shipped',
    status: 'Completed',
    method: 'UPI',
    date: '2026-06-05',
    completedAt: '2026-06-06',
    bankAccount: '****3210',
    utr: 'UTR928374651',
  },
  {
    id: 'REF-002',
    order: 'ORD-8885',
    payment: 'PAY-5007',
    customer: 'Raj Malhotra',
    seller: 'Apple India Store',
    country: 'India',
    amount: 89900,
    reason: 'Defective product — return approved',
    status: 'Processing',
    method: 'Credit Card',
    date: '2026-06-04',
    completedAt: '',
    bankAccount: '****1234',
    utr: '',
  },
  {
    id: 'REF-003',
    order: 'ORD-8889',
    payment: 'PAY-5003',
    customer: 'Vikram Kumar',
    seller: 'Samsung Store',
    country: 'India',
    amount: 114900,
    reason: 'Wrong product delivered',
    status: 'Pending',
    method: 'Net Banking',
    date: '2026-06-06',
    completedAt: '',
    bankAccount: '****5678',
    utr: '',
  },
  {
    id: 'REF-004',
    order: 'ORD-9001',
    payment: 'PAY-6001',
    customer: 'Ahmed Al-Farsi',
    seller: 'Gulf Electronics FZE',
    country: 'UAE',
    amount: 4599,
    reason: 'Product not as described',
    status: 'Completed',
    method: 'Apple Pay',
    date: '2026-06-03',
    completedAt: '2026-06-04',
    bankAccount: '****4567',
    utr: 'AETRN987654',
  },
  {
    id: 'REF-005',
    order: 'ORD-8886',
    payment: 'PAY-5006',
    customer: 'Sara Khan',
    seller: 'QuickMart Express',
    country: 'India',
    amount: 66990,
    reason: 'Payment failed — auto refund',
    status: 'Failed',
    method: 'UPI',
    date: '2026-06-05',
    completedAt: '',
    bankAccount: '****9876',
    utr: '',
  },
  {
    id: 'REF-006',
    order: 'ORD-9101',
    payment: 'PAY-7001',
    customer: 'Abdullah Al-Otaibi',
    seller: 'Riyadh Fashion Co',
    country: 'Saudi Arabia',
    amount: 890,
    reason: 'Wrong color delivered',
    status: 'Pending',
    method: 'Mada',
    date: '2026-06-05',
    completedAt: '',
    bankAccount: '****2345',
    utr: '',
  },
  {
    id: 'REF-007',
    order: 'ORD-8890',
    payment: 'PAY-5002',
    customer: 'Priya Menon',
    seller: 'Sony Store',
    country: 'India',
    amount: 3500,
    reason: 'Partial refund — missing accessory',
    status: 'Rejected',
    method: 'Credit Card',
    date: '2026-06-04',
    completedAt: '',
    bankAccount: '****4242',
    utr: '',
  },
];

const STATUS_MAP: Record<string, string> = {
  Pending: 'pending',
  Processing: 'processing',
  Completed: 'approved',
  Failed: 'rejected',
  Rejected: 'rejected',
};
const PAGE_SIZE = 6;

// ── Refund Detail Drawer ─────────────────────────────────────────────────────
function RefundDetailDrawer({
  refund: r,
  onClose,
  onProcess,
  onReject,
}: {
  refund: Refund;
  onClose: () => void;
  onProcess: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{r.id}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{r.date}</p>
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
          <MarketplaceStatusBadge
            status={STATUS_MAP[r.status] || 'pending'}
            customLabel={r.status}
          />

          {/* Amount */}
          <div className="bg-violet-50 rounded-xl p-5 text-center border border-violet-200">
            <p className="text-xs text-violet-600 mb-1">Refund Amount</p>
            <p className="text-3xl font-black text-violet-700">₹{r.amount.toLocaleString()}</p>
          </div>

          {/* Reason */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700">Reason</span>
            </div>
            <p className="text-sm text-amber-800">{r.reason}</p>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Refund Details</h3>
            {[
              { label: 'Order', value: r.order, link: true },
              { label: 'Original Payment', value: r.payment },
              { label: 'Refund Method', value: r.method },
              { label: 'Bank Account', value: r.bankAccount },
              ...(r.utr
                ? [{ label: 'UTR / Reference', value: r.utr, mono: true, copy: true }]
                : []),
              ...(r.completedAt ? [{ label: 'Completed', value: r.completedAt }] : []),
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <span className="text-xs text-slate-500">{row.label}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-sm font-bold text-slate-900 ${(row as any).mono ? 'font-mono text-xs' : ''} ${(row as any).link ? 'text-blue-600' : ''}`}
                  >
                    {row.value}
                  </span>
                  {(row as any).copy && (
                    <button
                      onClick={() => navigator.clipboard.writeText(row.value)}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      <Copy className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* People */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500">Customer</p>
              <p className="text-sm font-bold text-slate-900">{r.customer}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <CountryFlag code={COUNTRY_TO_CODE[r.country] || 'IN'} size="sm" /> {r.country}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500">Seller</p>
              <p className="text-sm font-bold text-slate-900">{r.seller}</p>
            </div>
          </div>

          {/* Actions */}
          {r.status === 'Pending' && (
            <div className="flex gap-3">
              <button
                onClick={onProcess}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Process Refund
              </button>
              <button
                onClick={onReject}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
          {r.status === 'Failed' && (
            <button
              onClick={onProcess}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Retry Refund
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Process Modal ────────────────────────────────────────────────────────────
function ProcessModal({
  refund,
  action,
  onConfirm,
  onClose,
}: {
  refund: Refund;
  action: 'process' | 'reject';
  onConfirm: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const isReject = action === 'reject';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-black text-slate-900 mb-1">
          {isReject ? 'Reject' : 'Process'} Refund
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          {refund.id} — ₹{refund.amount.toLocaleString()} to {refund.customer}
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isReject ? 'Rejection reason...' : 'Processing note (optional)...'}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-violet-200 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={isReject && !note.trim()}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${isReject ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
          >
            {isReject ? 'Reject' : 'Process'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RefundsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [processAction, setProcessAction] = useState<{
    refund: Refund;
    action: 'process' | 'reject';
  } | null>(null);

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(
    () => adminMarketplaceApi.getRefunds({ status: statusFilter || undefined, country }),
    [statusFilter, country],
  );
  const { execute } = useAdminAction(showToast);

  const {
    filtered: regionFiltered,
    regionLabel,
    isFiltered,
    formatCurrencyValue,
  } = useMarketplaceRegionFilter(REFUNDS);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (
      search &&
      !r.id.includes(search) &&
      !r.order.includes(search) &&
      !r.customer.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = [
    {
      label: 'Pending',
      val: regionFiltered.filter((r) => r.status === 'Pending').length,
      total: fmt(
        regionFiltered.filter((r) => r.status === 'Pending').reduce((a, r) => a + r.amount, 0),
      ),
      color: 'text-amber-600',
    },
    {
      label: 'Processing',
      val: regionFiltered.filter((r) => r.status === 'Processing').length,
      total: fmt(
        regionFiltered.filter((r) => r.status === 'Processing').reduce((a, r) => a + r.amount, 0),
      ),
      color: 'text-blue-600',
    },
    {
      label: 'Completed',
      val: regionFiltered.filter((r) => r.status === 'Completed').length,
      total: fmt(
        regionFiltered.filter((r) => r.status === 'Completed').reduce((a, r) => a + r.amount, 0),
      ),
      color: 'text-emerald-600',
    },
    {
      label: 'Failed / Rejected',
      val: regionFiltered.filter((r) => r.status === 'Failed' || r.status === 'Rejected').length,
      total: fmt(
        regionFiltered
          .filter((r) => r.status === 'Failed' || r.status === 'Rejected')
          .reduce((a, r) => a + r.amount, 0),
      ),
      color: 'text-red-600',
    },
  ];

  const handleConfirm = (note: string) => {
    if (!processAction) return;
    const { refund, action } = processAction;
    execute(
      () =>
        action === 'process'
          ? adminMarketplaceApi.processRefund(refund.order, { amount: refund.amount, note })
          : adminMarketplaceApi.rejectRefund(refund.id, { reason: note }),
      `Refund ${refund.id} ${action === 'process' ? 'processed' : 'rejected'}`,
      () => refetch(),
    );
    setProcessAction(null);
    setSelectedRefund(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Refund Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Process and track all marketplace refunds
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
            <p className="text-xs text-slate-500 mt-1">{k.label}</p>
            <p className="text-xs font-bold text-slate-400 mt-0.5">{k.total}</p>
          </div>
        ))}
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
            placeholder="Search refund ID, order ID, or customer..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'Pending', 'Processing', 'Completed', 'Failed', 'Rejected'].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading && <AdminLoadingSkeleton rows={5} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">
                Refund ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Customer</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Country
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Reason</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Method</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Date</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <MarketplaceEmptyState title="No refunds found" icon={RotateCcw} />
                </td>
              </tr>
            ) : (
              paged.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedRefund(r)}
                  tabIndex={0}
                  onKeyDown={activateOnKey(() => setSelectedRefund(r))}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-mono font-bold text-violet-700 text-xs">{r.id}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-blue-600 font-bold">{r.order}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">{r.customer}</td>
                  <td className="px-4 py-3.5 text-center">
                    <CountryFlag code={COUNTRY_TO_CODE[r.country] || 'IN'} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    {fmt(r.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 max-w-[200px] truncate">
                    {r.reason}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                      {r.method}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <MarketplaceStatusBadge
                      status={STATUS_MAP[r.status] || 'pending'}
                      customLabel={r.status}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-500">{r.date}</td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedRefund(r)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                      {r.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => setProcessAction({ refund: r, action: 'process' })}
                            className="p-1.5 hover:bg-violet-50 rounded-lg"
                          >
                            <CheckCircle className="w-4 h-4 text-violet-500" />
                          </button>
                          <button
                            onClick={() => setProcessAction({ refund: r, action: 'reject' })}
                            className="p-1.5 hover:bg-red-50 rounded-lg"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                      {r.status === 'Failed' && (
                        <button
                          onClick={() => setProcessAction({ refund: r, action: 'process' })}
                          className="p-1.5 hover:bg-amber-50 rounded-lg"
                        >
                          <RotateCcw className="w-4 h-4 text-amber-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">{filtered.length} refunds</p>
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
      </div>

      {selectedRefund && (
        <RefundDetailDrawer
          refund={selectedRefund}
          onClose={() => setSelectedRefund(null)}
          onProcess={() => setProcessAction({ refund: selectedRefund, action: 'process' })}
          onReject={() => setProcessAction({ refund: selectedRefund, action: 'reject' })}
        />
      )}
      {processAction && (
        <ProcessModal
          refund={processAction.refund}
          action={processAction.action}
          onConfirm={handleConfirm}
          onClose={() => setProcessAction(null)}
        />
      )}
      <AdminToast toast={toast} />
    </div>
  );
}
