'use client';
import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  X,
  Copy,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
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

const PAYMENTS = [
  {
    id: 'PAY-5001',
    order: 'ORD-8891',
    customer: 'Rohit Sharma',
    country: 'India',
    amount: 115900,
    method: 'UPI',
    gateway: 'Razorpay',
    status: 'Captured',
    date: '2026-06-06',
    txnId: 'pay_NxR4s8KLmP2qWE',
    email: 'rohit@example.com',
    phone: '+91-98765-43210',
    cardLast4: '',
    bankRef: 'HDFC000123',
    settledAt: '2026-06-07',
  },
  {
    id: 'PAY-5002',
    order: 'ORD-8890',
    customer: 'Priya Menon',
    country: 'India',
    amount: 24990,
    method: 'Credit Card',
    gateway: 'Razorpay',
    status: 'Captured',
    date: '2026-06-05',
    txnId: 'pay_NxQ7t9MNpR3rXF',
    email: 'priya@example.com',
    phone: '+91-98765-43211',
    cardLast4: '4242',
    bankRef: 'ICICI000456',
    settledAt: '2026-06-06',
  },
  {
    id: 'PAY-5003',
    order: 'ORD-8889',
    customer: 'Vikram Kumar',
    country: 'India',
    amount: 114900,
    method: 'Net Banking',
    gateway: 'Razorpay',
    status: 'Captured',
    date: '2026-06-04',
    txnId: 'pay_NxP5u0LOqS4sYG',
    email: 'vikram@example.com',
    phone: '+91-98765-43212',
    cardLast4: '',
    bankRef: 'SBI000789',
    settledAt: '2026-06-05',
  },
  {
    id: 'PAY-5004',
    order: 'ORD-8888',
    customer: 'Neha Rajput',
    country: 'India',
    amount: 20900,
    method: 'COD',
    gateway: 'N/A',
    status: 'Collected',
    date: '2026-06-03',
    txnId: 'COD_COLLECTED',
    email: 'neha@example.com',
    phone: '+91-98765-43213',
    cardLast4: '',
    bankRef: '',
    settledAt: '2026-06-04',
  },
  {
    id: 'PAY-5005',
    order: 'ORD-8887',
    customer: 'Amit Patel',
    country: 'India',
    amount: 34999,
    method: 'EMI',
    gateway: 'Razorpay',
    status: 'Captured',
    date: '2026-06-06',
    txnId: 'pay_NxR6v1MPrT5tZH',
    email: 'amit@example.com',
    phone: '+91-98765-43214',
    cardLast4: '8181',
    bankRef: 'AXIS001234',
    settledAt: '',
  },
  {
    id: 'PAY-5006',
    order: 'ORD-8886',
    customer: 'Sara Khan',
    country: 'India',
    amount: 66990,
    method: 'UPI',
    gateway: 'PhonePe',
    status: 'Failed',
    date: '2026-06-05',
    txnId: 'FAILED_TIMEOUT',
    email: 'sara@example.com',
    phone: '+91-98765-43215',
    cardLast4: '',
    bankRef: '',
    settledAt: '',
  },
  {
    id: 'PAY-5007',
    order: 'ORD-8885',
    customer: 'Raj Malhotra',
    country: 'India',
    amount: 89900,
    method: 'Credit Card',
    gateway: 'Razorpay',
    status: 'Refunded',
    date: '2026-06-04',
    txnId: 'pay_NxO8w2NQsU6uAI',
    email: 'raj@example.com',
    phone: '+91-98765-43216',
    cardLast4: '1234',
    bankRef: 'HDFC005678',
    settledAt: '2026-06-05',
  },
  {
    id: 'PAY-6001',
    order: 'ORD-9001',
    customer: 'Ahmed Al-Farsi',
    country: 'UAE',
    amount: 4599,
    method: 'Apple Pay',
    gateway: 'Checkout.com',
    status: 'Captured',
    date: '2026-06-06',
    txnId: 'chk_AE001xR4s8',
    email: 'ahmed@example.com',
    phone: '+971-50-123-4567',
    cardLast4: '',
    bankRef: 'ENBD001',
    settledAt: '2026-06-07',
  },
  {
    id: 'PAY-6002',
    order: 'ORD-9002',
    customer: 'Fatima Al-Rashid',
    country: 'UAE',
    amount: 12400,
    method: 'Credit Card',
    gateway: 'Checkout.com',
    status: 'Captured',
    date: '2026-06-05',
    txnId: 'chk_AE002tQ7m9',
    email: 'fatima@example.com',
    phone: '+971-55-987-6543',
    cardLast4: '5678',
    bankRef: 'ADCB002',
    settledAt: '2026-06-06',
  },
  {
    id: 'PAY-7001',
    order: 'ORD-9101',
    customer: 'Abdullah Al-Otaibi',
    country: 'Saudi Arabia',
    amount: 8900,
    method: 'Mada',
    gateway: 'HyperPay',
    status: 'Captured',
    date: '2026-06-06',
    txnId: 'hyp_SA001vR3p8',
    email: 'abdullah@example.com',
    phone: '+966-55-123-4567',
    cardLast4: '',
    bankRef: 'RIBL001',
    settledAt: '2026-06-07',
  },
];

const STATUS_STYLES: Record<string, string> = {
  Captured: 'bg-emerald-50 text-emerald-700',
  Collected: 'bg-blue-50 text-blue-700',
  Failed: 'bg-red-50 text-red-700',
  Refunded: 'bg-violet-50 text-violet-700',
  Pending: 'bg-amber-50 text-amber-700',
};
const STATUS_ICONS: Record<string, React.ElementType> = {
  Captured: CheckCircle,
  Collected: CheckCircle,
  Failed: XCircle,
  Refunded: RotateCcw,
  Pending: Clock,
};

type Payment = (typeof PAYMENTS)[number];
const PAGE_SIZE = 8;

// ── Payment Detail Drawer ────────────────────────────────────────────────────
function PaymentDetailDrawer({
  payment: p,
  onClose,
  onRefund,
}: {
  payment: Payment;
  onClose: () => void;
  onRefund: () => void;
}) {
  const StatusIcon = STATUS_ICONS[p.status] || Clock;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{p.id}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{p.date}</p>
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
          {/* Status Card */}
          <div className={`rounded-xl p-4 flex items-center gap-3 ${STATUS_STYLES[p.status]}`}>
            <StatusIcon className="w-5 h-5" />
            <div>
              <p className="text-sm font-bold">{p.status}</p>
              <p className="text-xs opacity-75">
                {p.status === 'Captured'
                  ? 'Payment successfully captured'
                  : p.status === 'Failed'
                    ? 'Transaction failed — customer not charged'
                    : p.status === 'Refunded'
                      ? 'Full refund processed'
                      : 'Cash collected on delivery'}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Amount</p>
            <p className="text-3xl font-black text-slate-900">₹{p.amount.toLocaleString()}</p>
          </div>

          {/* Transaction Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Transaction Details</h3>
            {[
              { label: 'Transaction ID', value: p.txnId, mono: true, copy: true },
              { label: 'Payment Method', value: p.method },
              { label: 'Gateway', value: p.gateway },
              ...(p.cardLast4 ? [{ label: 'Card', value: `•••• •••• •••• ${p.cardLast4}` }] : []),
              ...(p.bankRef ? [{ label: 'Bank Reference', value: p.bankRef, mono: true }] : []),
              { label: 'Order ID', value: p.order, link: true },
              ...(p.settledAt ? [{ label: 'Settled', value: p.settledAt }] : []),
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
                  {(row as any).link && <ExternalLink className="w-3 h-3 text-blue-400" />}
                </div>
              </div>
            ))}
          </div>

          {/* Customer */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-1">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Customer</h3>
            <p className="text-sm text-slate-700">{p.customer}</p>
            <p className="text-xs text-slate-500">{p.email}</p>
            <p className="text-xs text-slate-500">{p.phone}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <CountryFlag code={COUNTRY_TO_CODE[p.country] || 'IN'} size="sm" /> {p.country}
            </p>
          </div>

          {/* Actions */}
          {p.status === 'Captured' && (
            <button
              onClick={onRefund}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Initiate Refund
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Refund Modal ─────────────────────────────────────────────────────────────
function RefundModal({
  payment,
  onConfirm,
  onClose,
}: {
  payment: Payment;
  onConfirm: (amount: number, reason: string) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(payment.amount);
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-black text-slate-900 mb-1">Initiate Refund</h3>
        <p className="text-sm text-slate-500 mb-4">
          Refund for {payment.id} — {payment.customer}
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">
              Refund Amount (max: ₹{payment.amount.toLocaleString()})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.min(payment.amount, +e.target.value))}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="reason">
              Reason
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for refund..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-20 outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(amount, reason)}
            disabled={!reason.trim() || amount <= 0}
            className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Process Refund
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(() => adminMarketplaceApi.getPayments({ country }), [country]);
  const { execute } = useAdminAction(showToast);

  const {
    filtered: regionFiltered,
    regionLabel,
    isFiltered,
    formatCurrencyValue,
  } = useMarketplaceRegionFilter(PAYMENTS);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (
      search &&
      !p.id.includes(search) &&
      !p.order.includes(search) &&
      !p.txnId.includes(search) &&
      !p.customer.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRefund = (amount: number, reason: string) => {
    if (!refundPayment) return;
    execute(
      () => adminMarketplaceApi.processRefund(refundPayment.order, { amount, reason }),
      `Refund of ₹${amount.toLocaleString()} initiated for ${refundPayment.id}`,
      () => refetch(),
    );
    setRefundPayment(null);
    setSelectedPayment(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Payment Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Track all marketplace payment transactions
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Collected</p>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {fmt(
              regionFiltered
                .filter((p) => p.status === 'Captured' || p.status === 'Collected')
                .reduce((a, p) => a + p.amount, 0),
            )}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Successful</p>
          <p className="text-xl font-black text-slate-900 mt-1">
            {
              regionFiltered.filter((p) => p.status === 'Captured' || p.status === 'Collected')
                .length
            }
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Failed</p>
          <p className="text-xl font-black text-red-600 mt-1">
            {regionFiltered.filter((p) => p.status === 'Failed').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Refunded</p>
          <p className="text-xl font-black text-violet-600 mt-1">
            {regionFiltered.filter((p) => p.status === 'Refunded').length}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by payment ID, order ID, txn ID, or customer..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Captured', 'Collected', 'Failed', 'Refunded'].map((s) => (
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

      {loading && <AdminLoadingSkeleton rows={5} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Payment</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Customer</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Country
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Amount</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Method</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Gateway
              </th>
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
                  <MarketplaceEmptyState title="No payments found" icon={CreditCard} />
                </td>
              </tr>
            ) : (
              paged.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedPayment(p)}
                  tabIndex={0}
                  onKeyDown={activateOnKey(() => setSelectedPayment(p))}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 text-xs">{p.id}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                      {p.txnId}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-blue-600 font-bold">{p.order}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">{p.customer}</td>
                  <td className="px-4 py-3.5 text-center">
                    <CountryFlag code={COUNTRY_TO_CODE[p.country] || 'IN'} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    {fmt(p.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                      {p.method}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-500">{p.gateway}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md ${STATUS_STYLES[p.status] || ''}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-500">{p.date}</td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                      {p.status === 'Captured' && (
                        <button
                          onClick={() => setRefundPayment(p)}
                          className="p-1.5 hover:bg-violet-50 rounded-lg"
                        >
                          <RotateCcw className="w-4 h-4 text-violet-500" />
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
            <p className="text-xs text-slate-500">{filtered.length} payments</p>
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

      {/* Detail Drawer */}
      {selectedPayment && (
        <PaymentDetailDrawer
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onRefund={() => {
            setRefundPayment(selectedPayment);
          }}
        />
      )}

      {/* Refund Modal */}
      {refundPayment && (
        <RefundModal
          payment={refundPayment}
          onConfirm={handleRefund}
          onClose={() => setRefundPayment(null)}
        />
      )}

      <AdminToast toast={toast} />
    </div>
  );
}
