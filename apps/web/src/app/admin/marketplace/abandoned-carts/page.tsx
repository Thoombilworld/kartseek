'use client';
import React, { useState } from 'react';
import {
  ShoppingBasket,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Send,
  Clock,
  Mail,
  Smartphone,
  TrendingUp,
  DollarSign,
  Percent,
} from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import {
  useAdminData,
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

type AbandonedCart = {
  id: string;
  customer: string;
  email: string;
  country: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  abandonedAt: string;
  stage: 'Cart' | 'Checkout' | 'Payment';
  recoveryStatus: 'Not Contacted' | 'Email Sent' | 'SMS Sent' | 'Recovered' | 'Lost';
  recoveryAttempts: number;
  lastContactAt: string;
  deviceType: string;
};

const CARTS: AbandonedCart[] = [
  {
    id: 'AC-001',
    customer: 'Rohit Sharma',
    email: 'rohit@email.com',
    country: 'India',
    items: [
      { name: 'iPhone 15 Pro', qty: 1, price: 134900 },
      { name: 'AirPods Pro', qty: 1, price: 24900 },
    ],
    total: 159800,
    abandonedAt: '2026-06-06 14:32',
    stage: 'Payment',
    recoveryStatus: 'Email Sent',
    recoveryAttempts: 1,
    lastContactAt: '2026-06-06 15:00',
    deviceType: 'Mobile',
  },
  {
    id: 'AC-002',
    customer: 'Priya Menon',
    email: 'priya@email.com',
    country: 'India',
    items: [{ name: 'MacBook Air M3', qty: 1, price: 114900 }],
    total: 114900,
    abandonedAt: '2026-06-06 11:20',
    stage: 'Checkout',
    recoveryStatus: 'Not Contacted',
    recoveryAttempts: 0,
    lastContactAt: '',
    deviceType: 'Desktop',
  },
  {
    id: 'AC-003',
    customer: 'Amit Patel',
    email: 'amit@email.com',
    country: 'India',
    items: [{ name: 'Nike Air Jordan 1', qty: 2, price: 16995 }],
    total: 33990,
    abandonedAt: '2026-06-05 20:15',
    stage: 'Cart',
    recoveryStatus: 'SMS Sent',
    recoveryAttempts: 2,
    lastContactAt: '2026-06-06 10:00',
    deviceType: 'Mobile',
  },
  {
    id: 'AC-004',
    customer: 'Ahmed Al-Farsi',
    email: 'ahmed@email.com',
    country: 'UAE',
    items: [
      { name: 'Galaxy Z Fold5', qty: 1, price: 169999 },
      { name: 'Galaxy Watch 6', qty: 1, price: 26999 },
    ],
    total: 196998,
    abandonedAt: '2026-06-05 18:45',
    stage: 'Payment',
    recoveryStatus: 'Recovered',
    recoveryAttempts: 1,
    lastContactAt: '2026-06-05 19:00',
    deviceType: 'Mobile',
  },
  {
    id: 'AC-005',
    customer: 'Sneha Nair',
    email: 'sneha@email.com',
    country: 'India',
    items: [{ name: 'Silk Saree Collection', qty: 3, price: 8999 }],
    total: 26997,
    abandonedAt: '2026-06-04 13:00',
    stage: 'Cart',
    recoveryStatus: 'Lost',
    recoveryAttempts: 3,
    lastContactAt: '2026-06-06 09:00',
    deviceType: 'Desktop',
  },
  {
    id: 'AC-006',
    customer: 'Abdullah Al-Otaibi',
    email: 'abdullah@email.com',
    country: 'Saudi Arabia',
    items: [{ name: 'Dyson V15', qty: 1, price: 52000 }],
    total: 52000,
    abandonedAt: '2026-06-06 08:00',
    stage: 'Checkout',
    recoveryStatus: 'Not Contacted',
    recoveryAttempts: 0,
    lastContactAt: '',
    deviceType: 'Mobile',
  },
];

const STATUS_STYLES: Record<string, string> = {
  'Not Contacted': 'bg-slate-100 text-slate-600',
  'Email Sent': 'bg-blue-50 text-blue-700',
  'SMS Sent': 'bg-purple-50 text-purple-700',
  Recovered: 'bg-emerald-50 text-emerald-700',
  Lost: 'bg-red-50 text-red-600',
};
const STAGE_STYLES: Record<string, string> = {
  Cart: 'bg-slate-100 text-slate-600',
  Checkout: 'bg-amber-50 text-amber-700',
  Payment: 'bg-red-50 text-red-700',
};

// ── Cart Drawer ──────────────────────────────────────────────────────────────
function CartDrawer({
  cart: c,
  onClose,
  formatCurrency,
}: {
  cart: AbandonedCart;
  onClose: () => void;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{c.id}</h2>
            <p className="text-xs text-slate-500">Abandoned {c.abandonedAt}</p>
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
          <div className="flex gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[c.recoveryStatus]}`}
            >
              {c.recoveryStatus}
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STAGE_STYLES[c.stage]}`}
            >
              Stage: {c.stage}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500">Customer</p>
            <p className="text-sm font-bold text-slate-900">{c.customer}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {c.email} · <CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" /> ·{' '}
              {c.deviceType}
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white text-center">
            <p className="text-sm font-bold opacity-80">Cart Value</p>
            <p className="text-3xl font-black mt-1">{formatCurrency(c.total)}</p>
            <p className="text-xs opacity-60 mt-1">
              {c.items.length} items · Abandoned at {c.stage}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Cart Items</h3>
            {c.items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">{item.name}</p>
                  <p className="text-[10px] text-slate-400">Qty: {item.qty}</p>
                </div>
                <p className="text-xs font-bold text-slate-900">
                  {formatCurrency(item.price * item.qty)}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Recovery Attempts</p>
              <p className="text-sm font-bold text-slate-900">{c.recoveryAttempts}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Last Contacted</p>
              <p className="text-sm font-bold text-slate-900">{c.lastContactAt || '—'}</p>
            </div>
          </div>

          {c.recoveryStatus !== 'Recovered' && c.recoveryStatus !== 'Lost' && (
            <div className="flex gap-3">
              <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" /> Send Recovery Email
              </button>
              <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <Smartphone className="w-4 h-4" /> Send SMS
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AbandonedCartsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<AbandonedCart | null>(null);

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
  } = useAdminData(() => adminMarketplaceApi.getOrders({ country }), [country]);
  const {
    filtered: regionFiltered,
    regionLabel,
    isFiltered,
    formatCurrencyValue,
  } = useMarketplaceRegionFilter(CARTS);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter((c) => {
    if (filter !== 'all' && c.recoveryStatus !== filter) return false;
    if (
      search &&
      !c.customer.toLowerCase().includes(search.toLowerCase()) &&
      !c.email.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const totalValue = regionFiltered.reduce((a, c) => a + c.total, 0);
  const recoveredValue = regionFiltered
    .filter((c) => c.recoveryStatus === 'Recovered')
    .reduce((a, c) => a + c.total, 0);
  const recoveryRate = regionFiltered.length
    ? (
        (regionFiltered.filter((c) => c.recoveryStatus === 'Recovered').length /
          regionFiltered.length) *
        100
      ).toFixed(0)
    : '0';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Abandoned Carts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Track abandoned carts and trigger recovery
            campaigns
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white">
          <p className="text-sm font-bold opacity-80">Abandoned Value</p>
          <p className="text-2xl font-black mt-1">{fmt(totalValue)}</p>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-emerald-600 font-bold">Recovered</p>
          <p className="text-2xl font-black text-emerald-600">{fmt(recoveredValue)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">Recovery Rate</p>
          <p className="text-2xl font-black text-blue-600">{recoveryRate}%</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">Not Contacted</p>
          <p className="text-2xl font-black text-amber-600">
            {regionFiltered.filter((c) => c.recoveryStatus === 'Not Contacted').length}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'Not Contacted', 'Email Sent', 'SMS Sent', 'Recovered', 'Lost'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Items</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Value</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Stage</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Recovery
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Attempts
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">
                Abandoned
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <MarketplaceEmptyState title="No abandoned carts found" icon={ShoppingBasket} />
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${c.recoveryStatus === 'Not Contacted' ? 'bg-amber-50/30' : ''}`}
                  onClick={() => setSelected(c)}
                  tabIndex={0}
                  onKeyDown={activateOnKey(() => setSelected(c))}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 text-xs">{c.customer}</p>
                    <p className="text-[10px] text-slate-400">
                      {c.email} ·{' '}
                      <CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" />
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    {c.items
                      .map((i) => i.name)
                      .join(', ')
                      .substring(0, 40)}
                    ...
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    {fmt(c.total)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STAGE_STYLES[c.stage]}`}
                    >
                      {c.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[c.recoveryStatus]}`}
                    >
                      {c.recoveryStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs font-bold text-slate-600">
                    {c.recoveryAttempts}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{c.abandonedAt}</td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelected(c)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg"
                    >
                      <Eye className="w-4 h-4 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <CartDrawer cart={selected} onClose={() => setSelected(null)} formatCurrency={fmt} />
      )}
      <AdminToast toast={toast} />
    </div>
  );
}
