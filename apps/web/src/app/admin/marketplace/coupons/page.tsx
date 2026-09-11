'use client';
import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Copy,
  Trash2,
  CheckCircle,
  Pause,
  Play,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { useRegion, REGIONS } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import { Field } from '@/components/shared/field';
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
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', Global: 'UN' };

type Coupon = {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'flat' | 'free_shipping' | 'bogo';
  value: number;
  maxDiscount: number;
  minOrder: number;
  usageLimit: number;
  perUserLimit: number;
  usedCount: number;
  scope: 'cart' | 'product' | 'category' | 'seller';
  scopeTarget: string;
  status: 'Active' | 'Scheduled' | 'Expired' | 'Paused' | 'Exhausted';
  startDate: string;
  endDate: string;
  country: string;
  stackable: boolean;
  firstOrderOnly: boolean;
  autoApply: boolean;
  /** ISO market the coupon is issued for; absent = every market. */
  region?: string;
};

/** A coupon row as the API returns it → the shape this page renders. */
function toCouponRow(api: any): Coupon {
  const now = Date.now();
  const from = api.validFrom ? new Date(api.validFrom).getTime() : 0;
  const until = api.validUntil ? new Date(api.validUntil).getTime() : Infinity;
  const usageLimit = Number(api.usageLimit ?? 0) || 0;
  const usedCount = Number(api.usedCount ?? 0) || 0;
  const status: Coupon['status'] =
    api.isActive === false
      ? 'Paused'
      : now < from
        ? 'Scheduled'
        : now > until
          ? 'Expired'
          : usageLimit > 0 && usedCount >= usageLimit
            ? 'Exhausted'
            : 'Active';
  const type: Coupon['type'] =
    api.discountType === 'PERCENTAGE'
      ? 'percentage'
      : api.discountType === 'FREE_SHIPPING'
        ? 'free_shipping'
        : api.discountType === 'BUY_X_GET_Y'
          ? 'bogo'
          : 'flat';
  return {
    id: String(api.id),
    code: String(api.code ?? ''),
    description: String(api.description ?? api.title ?? ''),
    type,
    value: Number(api.discountValue ?? 0) || 0,
    maxDiscount: Number(api.maxDiscount ?? 0) || 0,
    minOrder: Number(api.minOrderValue ?? 0) || 0,
    usageLimit,
    perUserLimit: Number(api.usageLimitPerUser ?? 0) || 0,
    usedCount,
    scope: api.sellerId ? 'seller' : 'cart',
    scopeTarget: api.sellerId ? 'Seller' : 'All',
    status,
    startDate: String(api.validFrom ?? '').slice(0, 10),
    endDate: String(api.validUntil ?? '').slice(0, 10),
    country: api.regionCode ? String(api.regionCode) : 'Global',
    stackable: false,
    firstOrderOnly: api.firstOrderOnly === true,
    autoApply: api.autoApply === true,
    region: api.regionCode ?? undefined,
  };
}

/** The create form → the coupon API's fields. `country` is the market in view. */
function toApiCoupon(form: any, country?: string) {
  const discountType =
    form.type === 'percentage'
      ? 'PERCENTAGE'
      : form.type === 'free_shipping'
        ? 'FREE_SHIPPING'
        : form.type === 'bogo'
          ? 'BUY_X_GET_Y'
          : 'FLAT';
  const start = form.startDate ? new Date(form.startDate) : new Date();
  const end = form.endDate ? new Date(form.endDate) : new Date(Date.now() + 90 * 86400000);
  return {
    code: String(form.code ?? '')
      .trim()
      .toUpperCase(),
    title: form.description || form.code,
    description: form.description || null,
    discountType,
    discountValue: Number(form.value) || 0,
    maxDiscount: Number(form.maxDiscount) > 0 ? Number(form.maxDiscount) : null,
    minOrderValue: Number(form.minOrder) || 0,
    usageLimit: Number(form.usageLimit) || 0,
    usageLimitPerUser: Number(form.perUserLimit) || 1,
    validFrom: start.toISOString(),
    validUntil: end.toISOString(),
    isActive: true,
    autoApply: form.autoApply === true,
    firstOrderOnly: form.firstOrderOnly === true,
    ...(country ? { regionCode: country } : {}),
  };
}

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Scheduled: 'bg-blue-50 text-blue-700',
  Expired: 'bg-slate-100 text-slate-500',
  Paused: 'bg-amber-50 text-amber-700',
  Exhausted: 'bg-red-50 text-red-600',
};
const TYPE_LABELS: Record<string, string> = {
  percentage: '% Off',
  flat: '₹ Off',
  free_shipping: 'Free Ship',
  bogo: 'BOGO',
};
const TYPE_COLORS: Record<string, string> = {
  percentage: 'bg-purple-50 text-purple-700',
  flat: 'bg-blue-50 text-blue-700',
  free_shipping: 'bg-emerald-50 text-emerald-700',
  bogo: 'bg-amber-50 text-amber-700',
};

// ── Coupon Drawer ────────────────────────────────────────────────────────────
function CouponDrawer({
  coupon: c,
  onClose,
  onPause,
  onActivate,
  formatCurrency,
}: {
  coupon: Coupon;
  onClose: () => void;
  onPause: () => void;
  onActivate: () => void;
  formatCurrency: (n: number) => string;
}) {
  const usagePct = c.usageLimit ? Math.round((c.usedCount / c.usageLimit) * 100) : 0;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{c.id}</h2>
            <p className="text-xs text-slate-500">{c.description}</p>
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
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[c.status]}`}
            >
              {c.status}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${TYPE_COLORS[c.type]}`}>
              {TYPE_LABELS[c.type]}
            </span>
            {c.stackable && (
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">
                Stackable
              </span>
            )}
            {c.firstOrderOnly && (
              <span className="text-[10px] font-bold bg-pink-50 text-pink-700 px-2 py-1 rounded-md">
                1st Order
              </span>
            )}
            {c.autoApply && (
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                Auto-Apply
              </span>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white text-center">
            <p className="text-sm font-bold opacity-80">Coupon Code</p>
            <p className="text-3xl font-black mt-1 tracking-[0.3em]">{c.code}</p>
            <p className="text-xs opacity-60 mt-2">
              {c.type === 'percentage'
                ? `${c.value}% off`
                : c.type === 'flat'
                  ? `${formatCurrency(c.value)} off`
                  : c.type === 'free_shipping'
                    ? 'Free Shipping'
                    : 'Buy 1 Get 1'}
            </p>
            <button
              onClick={() => navigator.clipboard?.writeText(c.code)}
              className="mt-3 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Min Order</p>
              <p className="text-sm font-black text-slate-900">{formatCurrency(c.minOrder)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Max Discount</p>
              <p className="text-sm font-black text-slate-900">{formatCurrency(c.maxDiscount)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Scope</p>
              <p className="text-sm font-black text-slate-900 capitalize">
                {c.scope}: {c.scopeTarget}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Per User</p>
              <p className="text-sm font-black text-slate-900">{c.perUserLimit || '∞'} uses</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-900">
                {c.startDate} → {c.endDate}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              <CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" />
            </span>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-bold text-slate-900">Redemptions</span>
              <span className="text-xs text-slate-500">
                {c.usedCount.toLocaleString()} /{' '}
                {c.usageLimit ? c.usageLimit.toLocaleString() : '∞'}
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePct >= 100 ? 'bg-red-500' : usagePct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, usagePct)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Estimated savings:{' '}
              {formatCurrency(c.usedCount * (c.type === 'flat' ? c.value : c.maxDiscount * 0.6))}
            </p>
          </div>

          <div className="flex gap-3">
            {c.status === 'Active' && (
              <button
                onClick={onPause}
                className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}
            {(c.status === 'Paused' || c.status === 'Scheduled') && (
              <button
                onClick={onActivate}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Activate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Modal ─────────────────────────────────────────────────────────────
function CreateCouponModal({
  onSave,
  onClose,
}: {
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    code: '',
    description: '',
    type: 'percentage',
    value: 0,
    maxDiscount: 0,
    minOrder: 0,
    usageLimit: 0,
    perUserLimit: 1,
    scope: 'cart',
    scopeTarget: '',
    startDate: '',
    endDate: '',
    stackable: false,
    firstOrderOnly: false,
    autoApply: false,
  });
  const u = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const genCode = () => u('code', `KS${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
  const genBulk = () => {
    const codes = Array.from(
      { length: 5 },
      () => `KS${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    );
    u('code', codes.join(', '));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900 mb-4">Create Coupon</h3>
        <div className="space-y-4">
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
                placeholder="e.g. SUMMER20"
              />
              <button
                onClick={genCode}
                className="px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors whitespace-nowrap"
              >
                Single
              </button>
              <button
                onClick={genBulk}
                className="px-3 bg-purple-50 hover:bg-purple-100 rounded-xl text-xs font-bold text-purple-700 transition-colors whitespace-nowrap"
              >
                Bulk (5)
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="description">
              Description
            </label>
            <input
              id="description"
              value={form.description}
              onChange={(e) => u('description', e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. 20% off on summer collection"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="type">
                Type
              </label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => u('type', e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
              >
                <option value="percentage">Percentage Off</option>
                <option value="flat">Flat Amount Off</option>
                <option value="free_shipping">Free Shipping</option>
                <option value="bogo">Buy 1 Get 1</option>
              </select>
            </div>
            {/* Label text is dynamic, so the id cannot be derived from it — Field
                binds via useId() instead. */}
            <Field
              label={form.type === 'percentage' ? 'Percentage (%)' : 'Amount'}
              labelClassName="text-xs font-bold text-slate-600 mb-1 block"
            >
              <input
                type="number"
                value={form.value || ''}
                onChange={(e) => u('value', +e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </Field>
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
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
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
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
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
                placeholder="0=∞"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                <option value="cart">Cart Level</option>
                <option value="product">Product Level</option>
                <option value="category">Category Level</option>
                <option value="seller">Seller Level</option>
              </select>
            </div>
            <div>
              <label
                className="text-xs font-bold text-slate-600 mb-1 block"
                htmlFor="per-user-limit"
              >
                Per User Limit
              </label>
              <input
                id="per-user-limit"
                type="number"
                value={form.perUserLimit || ''}
                onChange={(e) => u('perUserLimit', +e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
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
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
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
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
              />
            </div>
          </div>
          {/* Related checkboxes need a group name a screen reader can announce
              before each option (WCAG 1.3.1) — that is what fieldset/legend is for. */}
          <fieldset className="flex gap-4 border-0 p-0 m-0">
            <legend className="sr-only">Coupon behaviour options</legend>
            {[
              { k: 'stackable', l: 'Stackable' },
              { k: 'firstOrderOnly', l: 'First Order Only' },
              { k: 'autoApply', l: 'Auto-Apply' },
            ].map((opt) => (
              <label
                key={opt.k}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(form as any)[opt.k]}
                  onChange={(e) => u(opt.k, e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                {opt.l}
              </label>
            ))}
          </fieldset>
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
            disabled={!form.code || !form.startDate || !form.endDate}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Create Coupon
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CouponsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Coupon | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const PAGE_SIZE = 5;

  // Coupons for the market in view, scoped by the API (a region-locked admin
  // always gets their own market); this page used to render a fixture list
  // whatever the API returned.
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
  } = useAdminData(() => adminMarketplaceApi.getCoupons({ country }), [country]);
  const { execute } = useAdminAction(showToast);

  const regionFiltered = useMemo<Coupon[]>(
    () => (Array.isArray(apiData?.data) ? apiData.data.map(toCouponRow) : []),
    [apiData],
  );
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (
      search &&
      !c.code.toLowerCase().includes(search.toLowerCase()) &&
      !c.description.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalRedemptions = regionFiltered.reduce((a, c) => a + c.usedCount, 0);

  const handleCreate = (data: any) => {
    execute(
      () => adminMarketplaceApi.createCoupon(toApiCoupon(data, country)),
      `Coupon ${data.code} created`,
      () => refetch(),
    );
    setShowCreate(false);
  };
  const handlePause = (c: Coupon) => {
    execute(
      () => adminMarketplaceApi.updateCoupon(c.id, { isActive: false }),
      `${c.code} paused`,
      () => refetch(),
    );
    setSelected(null);
  };
  const handleActivate = (c: Coupon) => {
    execute(
      () => adminMarketplaceApi.updateCoupon(c.id, { isActive: true }),
      `${c.code} activated`,
      () => refetch(),
    );
    setSelected(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Coupon Engine</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Create, manage & track discount coupons with
            advanced rules
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
            <Plus className="w-4 h-4" /> Create Coupon
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-5 text-white">
          <p className="text-sm font-bold opacity-80">Total Redemptions</p>
          <p className="text-3xl font-black mt-1">{totalRedemptions.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-2xl font-black text-emerald-600">
            {regionFiltered.filter((c) => c.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">Scheduled</p>
          <p className="text-2xl font-black text-blue-600">
            {regionFiltered.filter((c) => c.status === 'Scheduled').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">Exhausted</p>
          <p className="text-2xl font-black text-red-600">
            {regionFiltered.filter((c) => c.status === 'Exhausted').length}
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
            placeholder="Search coupon code or description..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Active', 'Scheduled', 'Paused', 'Exhausted', 'Expired'].map((s) => (
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
          <MarketplaceEmptyState title="No coupons found" icon={Ticket} />
        ) : (
          paged.map((c) => {
            const usagePct = c.usageLimit ? Math.round((c.usedCount / c.usageLimit) * 100) : 0;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                role="button"
                tabIndex={0}
                onKeyDown={activateOnKey(() => setSelected(c))}
                className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl px-4 py-3 text-white text-center min-w-[100px]">
                    <p className="text-lg font-black tracking-widest">{c.code}</p>
                    <p className="text-[10px] opacity-70">{TYPE_LABELS[c.type]}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{c.description}</p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[c.status]}`}
                      >
                        {c.status}
                      </span>
                      {c.stackable && (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          Stack
                        </span>
                      )}
                      {c.autoApply && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                          Auto
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-2">
                      <span>Min: {fmt(c.minOrder)}</span>
                      <span>Max: {fmt(c.maxDiscount)}</span>
                      <span>
                        {c.scope}: {c.scopeTarget}
                      </span>
                      <span>
                        {c.startDate} → {c.endDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-slate-100 rounded-full flex-1 max-w-[120px] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${usagePct >= 100 ? 'bg-red-500' : 'bg-purple-500'}`}
                          style={{ width: `${Math.min(100, usagePct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {c.usedCount.toLocaleString()}/{c.usageLimit || '∞'}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigator.clipboard?.writeText(c.code)}
                      className="p-1.5 hover:bg-purple-50 rounded-lg"
                    >
                      <Copy className="w-4 h-4 text-purple-500" />
                    </button>
                    <button
                      onClick={() => setSelected(c)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg"
                    >
                      <Eye className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">{filtered.length} coupons</p>
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
        <CouponDrawer
          coupon={selected}
          onClose={() => setSelected(null)}
          onPause={() => handlePause(selected)}
          onActivate={() => handleActivate(selected)}
          formatCurrency={fmt}
        />
      )}
      {showCreate && (
        <CreateCouponModal onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      <AdminToast toast={toast} />
    </div>
  );
}
