'use client';
import React, { useState, useMemo } from 'react';
import {
  Tag,
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  Pause,
  Play,
} from 'lucide-react';
import { useRegion, REGIONS } from '@/lib/contexts/region-context';
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
  'Saudi Arabia': 'SA',
  Global: 'UN',
};

type Promo = {
  id: string;
  name: string;
  code: string;
  type: 'Percentage' | 'Flat' | 'Free Shipping' | 'BOGO';
  value: number;
  maxDiscount: number;
  minOrder: number;
  usageLimit: number;
  usedCount: number;
  scope: 'Platform' | 'Seller' | 'Category';
  country: string;
  status: 'Active' | 'Scheduled' | 'Expired' | 'Paused' | 'Draft';
  startDate: string;
  endDate: string;
  createdBy: string;
  /** ISO market of the seller running it. */
  region?: string;
};

/** A seller promotion as the API returns it → the shape this page renders. */
function toPromoRow(api: any): Promo {
  const type: Promo['type'] = /percent/i.test(api.type)
    ? 'Percentage'
    : /ship/i.test(api.type)
      ? 'Free Shipping'
      : /bogo|buy/i.test(api.type)
        ? 'BOGO'
        : 'Flat';
  const raw = String(api.status ?? '').toLowerCase();
  const status: Promo['status'] =
    raw === 'paused'
      ? 'Paused'
      : raw === 'scheduled'
        ? 'Scheduled'
        : raw === 'expired' || raw === 'deleted'
          ? 'Expired'
          : raw === 'draft'
            ? 'Draft'
            : 'Active';
  return {
    id: String(api.id),
    name: String(api.name ?? ''),
    code: String(api.code ?? ''),
    type,
    value: Number(api.discountValue ?? api.value ?? 0) || 0,
    maxDiscount: Number(api.maxDiscount ?? 0) || 0,
    minOrder: Number(api.minOrderValue ?? 0) || 0,
    usageLimit: Number(api.usageLimit ?? 0) || 0,
    usedCount: Number(api.usageCount ?? 0) || 0,
    scope: 'Seller',
    country: api.regionCode ? String(api.regionCode) : 'Global',
    status,
    startDate: String(api.startDate ?? '').slice(0, 10),
    endDate: String(api.endDate ?? '').slice(0, 10),
    createdBy: String(api.sellerName ?? api.sellerId ?? ''),
    region: api.regionCode ?? undefined,
  };
}

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Scheduled: 'bg-blue-50 text-blue-700',
  Expired: 'bg-slate-100 text-slate-500',
  Paused: 'bg-amber-50 text-amber-700',
  Draft: 'bg-slate-50 text-slate-600',
};
const TYPE_STYLES: Record<string, string> = {
  Percentage: 'bg-purple-50 text-purple-700',
  Flat: 'bg-blue-50 text-blue-700',
  'Free Shipping': 'bg-emerald-50 text-emerald-700',
  BOGO: 'bg-amber-50 text-amber-700',
};

// ── Promo Detail Drawer ──────────────────────────────────────────────────────
function PromoDrawer({
  promo: p,
  onClose,
  onPause,
  onActivate,
  onDelete,
  formatCurrency,
}: {
  promo: Promo;
  onClose: () => void;
  onPause: () => void;
  onActivate: () => void;
  onDelete: () => void;
  formatCurrency: (n: number) => string;
}) {
  const usagePct = p.usageLimit ? Math.round((p.usedCount / p.usageLimit) * 100) : 0;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{p.name}</h2>
            <p className="text-xs text-slate-500">{p.id}</p>
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
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[p.status]}`}
            >
              {p.status}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${TYPE_STYLES[p.type]}`}>
              {p.type}
            </span>
          </div>

          {/* Coupon Code */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-5 text-white text-center">
            <p className="text-sm font-bold opacity-80">Coupon Code</p>
            <p className="text-3xl font-black mt-1 tracking-widest">{p.code}</p>
            <p className="text-xs opacity-60 mt-2">
              {p.type === 'Percentage'
                ? `${p.value}% off`
                : p.type === 'Flat'
                  ? `${formatCurrency(p.value)} off`
                  : p.type === 'Free Shipping'
                    ? 'Free Shipping'
                    : 'Buy One Get One'}
            </p>
          </div>

          {/* Discount Rules */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Min Order</p>
              <p className="text-sm font-black text-slate-900">{formatCurrency(p.minOrder)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Max Discount</p>
              <p className="text-sm font-black text-slate-900">{formatCurrency(p.maxDiscount)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Scope</p>
              <p className="text-sm font-black text-slate-900">{p.scope}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Region</p>
              <p className="text-sm font-black text-slate-900 flex items-center gap-1">
                <CountryFlag code={COUNTRY_TO_CODE[p.country] || 'IN'} size="sm" />
                {p.country}
              </p>
            </div>
          </div>

          {/* Validity */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 mb-1">Validity</p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-900">
                {p.startDate} → {p.endDate}
              </span>
            </div>
          </div>

          {/* Usage */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-bold text-slate-900">Usage</span>
              <span className="text-xs text-slate-500">
                {p.usedCount.toLocaleString()} /{' '}
                {p.usageLimit ? p.usageLimit.toLocaleString() : '∞'}
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePct > 90 ? 'bg-red-500' : usagePct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, usagePct)}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {p.status === 'Active' && (
              <button
                onClick={onPause}
                className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}
            {(p.status === 'Paused' || p.status === 'Draft') && (
              <button
                onClick={onActivate}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Activate
              </button>
            )}
            <button
              onClick={onDelete}
              className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create/Edit Modal ────────────────────────────────────────────────────────
function PromoModal({
  promo,
  onSave,
  onClose,
}: {
  promo?: Promo;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: promo?.name || '',
    code: promo?.code || '',
    type: promo?.type || 'Percentage',
    value: promo?.value || 0,
    maxDiscount: promo?.maxDiscount || 0,
    minOrder: promo?.minOrder || 0,
    usageLimit: promo?.usageLimit || 0,
    scope: promo?.scope || 'Platform',
    startDate: promo?.startDate || '',
    endDate: promo?.endDate || '',
  });
  const u = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const generateCode = () =>
    u(
      'code',
      `${form.name.toUpperCase().replace(/\s+/g, '').slice(0, 6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900 mb-4">
          {promo ? 'Edit Promotion' : 'Create Promotion'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="promotion-name">
              Promotion Name
            </label>
            <input
              id="promotion-name"
              value={form.name}
              onChange={(e) => u('name', e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. Summer Sale 2026"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="coupon-code">
              Coupon Code
            </label>
            <div className="flex gap-2">
              <input
                id="coupon-code"
                value={form.code}
                onChange={(e) => u('code', e.target.value.toUpperCase())}
                className="flex-1 border border-slate-200 rounded-xl p-3 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="AUTO-GENERATED"
              />
              <button
                onClick={generateCode}
                className="px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-bold text-slate-600 mb-1 block"
                htmlFor="discount-type"
              >
                Discount Type
              </label>
              <select
                id="discount-type"
                value={form.type}
                onChange={(e) => u('type', e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
              >
                <option>Percentage</option>
                <option>Flat</option>
                <option>Free Shipping</option>
                <option>BOGO</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {form.type === 'Percentage' ? 'Percentage (%)' : 'Amount'}
              </label>
              <input
                type="number"
                value={form.value || ''}
                onChange={(e) => u('value', +e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="max-discount">
                Max Discount
              </label>
              <input
                id="max-discount"
                type="number"
                value={form.maxDiscount || ''}
                onChange={(e) => u('maxDiscount', +e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="min-order">
                Min Order
              </label>
              <input
                id="min-order"
                type="number"
                value={form.minOrder || ''}
                onChange={(e) => u('minOrder', +e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="usage-limit">
                Usage Limit
              </label>
              <input
                id="usage-limit"
                type="number"
                value={form.usageLimit || ''}
                onChange={(e) => u('usageLimit', +e.target.value)}
                placeholder="0 = unlimited"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="start-date">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => u('startDate', e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="end-date">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={form.endDate}
                onChange={(e) => u('endDate', e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="scope">
              Scope
            </label>
            <select
              id="scope"
              value={form.scope}
              onChange={(e) => u('scope', e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
            >
              <option>Platform</option>
              <option>Seller</option>
              <option>Category</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name || !form.code || !form.startDate || !form.endDate}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {promo ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Promo | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const PAGE_SIZE = 5;

  // Seller promotions for the market in view, scoped by the API through the
  // seller who runs each one; this page used to render a fixture list.
  const { selectedRegion, formatCurrencyValue } = useRegion();
  const country = selectedRegion === 'ALL' ? undefined : selectedRegion;
  const isFiltered = selectedRegion !== 'ALL';
  const regionLabel = isFiltered
    ? (REGIONS[selectedRegion]?.name ?? selectedRegion)
    : 'All Regions';
  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(() => adminMarketplaceApi.getPromotions({ country }), [country]);
  const { execute } = useAdminAction(showToast);

  const regionFiltered = useMemo<Promo[]>(
    () => (Array.isArray(apiData?.data) ? apiData.data.map(toPromoRow) : []),
    [apiData],
  );
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !p.code.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreate = (data: any) => {
    execute(
      () => adminMarketplaceApi.createPromotion(data),
      `Promotion "${data.name}" created`,
      () => refetch(),
    );
    setShowCreate(false);
  };
  const handlePause = (p: Promo) => {
    execute(
      () => adminMarketplaceApi.updatePromotion(p.id, { status: 'paused' }),
      `${p.code} paused`,
      () => refetch(),
    );
    setSelected(null);
  };
  const handleActivate = (p: Promo) => {
    execute(
      () => adminMarketplaceApi.updatePromotion(p.id, { status: 'active' }),
      `${p.code} activated`,
      () => refetch(),
    );
    setSelected(null);
  };
  const handleDelete = (p: Promo) => {
    execute(
      () => adminMarketplaceApi.updatePromotion(p.id, { status: 'deleted' }),
      `${p.code} deleted`,
      () => refetch(),
    );
    setSelected(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Promotions & Coupons</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Create, manage, and track promotional offers
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Promo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            l: 'Active',
            v: regionFiltered.filter((p) => p.status === 'Active').length,
            c: 'text-emerald-600',
          },
          {
            l: 'Scheduled',
            v: regionFiltered.filter((p) => p.status === 'Scheduled').length,
            c: 'text-blue-600',
          },
          {
            l: 'Paused',
            v: regionFiltered.filter((p) => p.status === 'Paused').length,
            c: 'text-amber-600',
          },
          {
            l: 'Expired',
            v: regionFiltered.filter((p) => p.status === 'Expired').length,
            c: 'text-slate-400',
          },
          {
            l: 'Total Used',
            v: regionFiltered.reduce((a, p) => a + p.usedCount, 0).toLocaleString(),
            c: 'text-purple-600',
          },
        ].map((k) => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-black ${k.c}`}>{k.v}</p>
            <p className="text-xs text-slate-500 mt-1">{k.l}</p>
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
            placeholder="Search promo name or code..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Active', 'Scheduled', 'Paused', 'Draft', 'Expired'].map((s) => (
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

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">
                Promotion
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Code</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Type</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">
                Discount
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Usage</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Dates</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <MarketplaceEmptyState title="No promotions found" icon={Tag} />
                </td>
              </tr>
            ) : (
              paged.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setSelected(p)}
                  tabIndex={0}
                  onKeyDown={activateOnKey(() => setSelected(p))}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {p.id} · {p.scope}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-mono text-xs font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded">
                      {p.code}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TYPE_STYLES[p.type]}`}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                    {p.type === 'Percentage'
                      ? `${p.value}%`
                      : p.type === 'Flat'
                        ? fmt(p.value)
                        : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs">
                    <span className="font-bold">{p.usedCount.toLocaleString()}</span>
                    <span className="text-slate-400">
                      /{p.usageLimit ? p.usageLimit.toLocaleString() : '∞'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-[10px] text-slate-500">
                    {p.startDate}
                    <br />
                    {p.endDate}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelected(p)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                      <button
                        onClick={() => navigator.clipboard?.writeText(p.code)}
                        className="p-1.5 hover:bg-purple-50 rounded-lg"
                      >
                        <Copy className="w-4 h-4 text-purple-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">{filtered.length} promotions</p>
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
        <PromoDrawer
          promo={selected}
          onClose={() => setSelected(null)}
          onPause={() => handlePause(selected)}
          onActivate={() => handleActivate(selected)}
          onDelete={() => handleDelete(selected)}
          formatCurrency={fmt}
        />
      )}
      {showCreate && <PromoModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
