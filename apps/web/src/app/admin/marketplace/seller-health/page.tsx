'use client';
import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Star,
  ShoppingBag,
  Search,
  Eye,
  X,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Ban,
  Mail,
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
  'Saudi Arabia': 'SA',
};

type Seller = {
  id: string;
  name: string;
  country: string;
  score: number;
  rating: number;
  orders: number;
  cancellation: number;
  returns: number;
  lateShip: number;
  response: number;
  status: string;
};

const SELLERS: Seller[] = [
  {
    id: 'SLR-1001',
    name: 'Apple India Store',
    country: 'India',
    score: 96,
    rating: 4.9,
    orders: 1240,
    cancellation: 0.8,
    returns: 1.2,
    lateShip: 0.5,
    response: 98,
    status: 'Excellent',
  },
  {
    id: 'SLR-1002',
    name: 'Samsung Official',
    country: 'India',
    score: 91,
    rating: 4.7,
    orders: 980,
    cancellation: 1.2,
    returns: 2.1,
    lateShip: 1.0,
    response: 95,
    status: 'Good',
  },
  {
    id: 'SLR-1003',
    name: 'Nike India',
    country: 'India',
    score: 88,
    rating: 4.6,
    orders: 650,
    cancellation: 1.5,
    returns: 2.8,
    lateShip: 1.8,
    response: 92,
    status: 'Good',
  },
  {
    id: 'SLR-1004',
    name: 'Heritage Silk House',
    country: 'India',
    score: 72,
    rating: 4.1,
    orders: 310,
    cancellation: 3.2,
    returns: 5.1,
    lateShip: 4.2,
    response: 78,
    status: 'At Risk',
  },
  {
    id: 'SLR-1005',
    name: 'QuickMart Express',
    country: 'India',
    score: 45,
    rating: 2.8,
    orders: 120,
    cancellation: 8.5,
    returns: 12.3,
    lateShip: 15.2,
    response: 42,
    status: 'Critical',
  },
  {
    id: 'SLR-2001',
    name: 'Gulf Electronics FZE',
    country: 'UAE',
    score: 93,
    rating: 4.8,
    orders: 890,
    cancellation: 0.9,
    returns: 1.5,
    lateShip: 0.7,
    response: 97,
    status: 'Excellent',
  },
  {
    id: 'SLR-2002',
    name: 'Dubai Luxe Mall',
    country: 'UAE',
    score: 85,
    rating: 4.4,
    orders: 540,
    cancellation: 2.0,
    returns: 3.2,
    lateShip: 2.1,
    response: 88,
    status: 'Good',
  },
  {
    id: 'SLR-3001',
    name: 'Riyadh Fashion Co',
    country: 'Saudi Arabia',
    score: 79,
    rating: 4.2,
    orders: 420,
    cancellation: 2.8,
    returns: 4.1,
    lateShip: 3.5,
    response: 82,
    status: 'At Risk',
  },
];

const STATUS_STYLES: Record<string, string> = {
  Excellent: 'bg-emerald-50 text-emerald-700',
  Good: 'bg-blue-50 text-blue-700',
  'At Risk': 'bg-amber-50 text-amber-700',
  Critical: 'bg-red-50 text-red-700',
};

// ── Health Score Bar ─────────────────────────────────────────────────────────
function ScoreBar({
  label,
  value,
  threshold,
  inverse,
}: {
  label: string;
  value: number;
  threshold: [number, number];
  inverse?: boolean;
}) {
  const pct = inverse ? Math.min(100, (value / threshold[1]) * 100) : value;
  const color = inverse
    ? value > threshold[1]
      ? 'bg-red-500'
      : value > threshold[0]
        ? 'bg-amber-500'
        : 'bg-emerald-500'
    : value >= threshold[1]
      ? 'bg-emerald-500'
      : value >= threshold[0]
        ? 'bg-amber-500'
        : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span
          className={`text-xs font-bold ${inverse ? (value > threshold[1] ? 'text-red-600' : value > threshold[0] ? 'text-amber-600' : 'text-emerald-600') : value >= threshold[1] ? 'text-emerald-600' : value >= threshold[0] ? 'text-amber-600' : 'text-red-600'}`}
        >
          {value}
          {inverse ? '%' : ''}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ── Seller Health Drawer ─────────────────────────────────────────────────────
function SellerHealthDrawer({
  seller: s,
  onClose,
  onWarn,
  onSuspend,
}: {
  seller: Seller;
  onClose: () => void;
  onWarn: () => void;
  onSuspend: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{s.name}</h2>
            <p className="text-xs text-slate-500">
              {s.id} · <CountryFlag code={COUNTRY_TO_CODE[s.country] || 'IN'} size="sm" />{' '}
              {s.country}
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
          {/* Overall Score */}
          <div className={`rounded-xl p-5 text-center ${STATUS_STYLES[s.status]}`}>
            <p className="text-5xl font-black">{s.score}</p>
            <p className="text-sm font-bold mt-1">{s.status}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Star className="w-5 h-5 text-amber-500 mx-auto mb-1 fill-amber-500" />
              <p className="text-xl font-black text-slate-900">{s.rating}</p>
              <p className="text-[10px] text-slate-500">Rating</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <ShoppingBag className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-black text-slate-900">{s.orders.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Orders</p>
            </div>
          </div>

          {/* Performance Bars */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Performance Metrics</h3>
            <ScoreBar label="Cancellation Rate" value={s.cancellation} threshold={[2, 5]} inverse />
            <ScoreBar label="Return Rate" value={s.returns} threshold={[3, 8]} inverse />
            <ScoreBar label="Late Shipment Rate" value={s.lateShip} threshold={[2, 5]} inverse />
            <ScoreBar label="Response Rate" value={s.response} threshold={[70, 90]} />
          </div>

          {/* Thresholds */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Health Thresholds</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-emerald-600 font-bold">Excellent</span>
                <span className="text-slate-500">Score ≥ 90</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600 font-bold">Good</span>
                <span className="text-slate-500">Score 70–89</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600 font-bold">At Risk</span>
                <span className="text-slate-500">Score 50–69</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600 font-bold">Critical</span>
                <span className="text-slate-500">Score &lt; 50</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {(s.status === 'At Risk' || s.status === 'Critical') && (
            <div className="flex gap-3">
              <button
                onClick={onWarn}
                className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> Send Warning
              </button>
              {s.status === 'Critical' && (
                <button
                  onClick={onSuspend}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Ban className="w-4 h-4" /> Suspend
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Warning Modal ────────────────────────────────────────────────────────────
function ActionModal({
  seller,
  action,
  onConfirm,
  onClose,
}: {
  seller: Seller;
  action: 'warn' | 'suspend';
  onConfirm: (msg: string) => void;
  onClose: () => void;
}) {
  const [msg, setMsg] = useState('');
  const isWarn = action === 'warn';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {isWarn ? (
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          ) : (
            <Ban className="w-6 h-6 text-red-500" />
          )}
          <h3 className="text-lg font-black text-slate-900">
            {isWarn ? 'Send Warning' : 'Suspend Seller'}
          </h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          {isWarn ? `Send a performance warning to` : `Suspend`}{' '}
          <span className="font-bold">{seller.name}</span>
          {isWarn
            ? '. They will have 14 days to improve.'
            : '. This will temporarily disable their storefront.'}
        </p>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={isWarn ? 'Warning message...' : 'Suspension reason...'}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-amber-200 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(msg)}
            disabled={!msg.trim()}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${isWarn ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          >
            {isWarn ? 'Send Warning' : 'Suspend'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SellerHealthPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [actionData, setActionData] = useState<{
    seller: Seller;
    action: 'warn' | 'suspend';
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
  } = useAdminData(() => adminMarketplaceApi.getSellers({ country }), [country]);
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered } = useMarketplaceRegionFilter(SELLERS);
  const filtered = regionFiltered.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.id.includes(search))
      return false;
    return true;
  });

  const handleAction = (msg: string) => {
    if (!actionData) return;
    execute(
      () =>
        adminMarketplaceApi.updateSeller(actionData.seller.id, {
          action: actionData.action,
          message: msg,
        }),
      `${actionData.action === 'warn' ? 'Warning sent to' : 'Suspended'} ${actionData.seller.name}`,
      () => refetch(),
    );
    setActionData(null);
    setSelectedSeller(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Seller Health Monitoring</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Track seller performance, cancellations, returns,
            and compliance
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Excellent',
            color: 'text-emerald-600',
            count: regionFiltered.filter((s) => s.status === 'Excellent').length,
          },
          {
            label: 'Good',
            color: 'text-blue-600',
            count: regionFiltered.filter((s) => s.status === 'Good').length,
          },
          {
            label: 'At Risk',
            color: 'text-amber-600',
            count: regionFiltered.filter((s) => s.status === 'At Risk').length,
          },
          {
            label: 'Critical',
            color: 'text-red-600',
            count: regionFiltered.filter((s) => s.status === 'Critical').length,
          },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className={`text-xl font-black ${k.color}`}>{k.count}</p>
            <p className="text-xs text-slate-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search seller name or ID..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2">
          {['', 'Excellent', 'Good', 'At Risk', 'Critical'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {s || 'All'}
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
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Seller</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Score</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Rating</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Orders</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">
                Cancel %
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">
                Return %
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">
                Late Ship %
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">
                Response %
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <MarketplaceEmptyState title="No sellers found" icon={Activity} />
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedSeller(s)}
                  tabIndex={0}
                  onKeyDown={activateOnKey(() => setSelectedSeller(s))}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900">{s.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.id} · <CountryFlag code={COUNTRY_TO_CODE[s.country] || 'IN'} size="sm" />
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-lg font-black ${s.score >= 90 ? 'text-emerald-600' : s.score >= 70 ? 'text-blue-600' : s.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}
                    >
                      {s.score}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="flex items-center justify-center gap-0.5 text-sm font-bold">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {s.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold">{s.orders.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`font-bold ${s.cancellation > 5 ? 'text-red-600' : s.cancellation > 2 ? 'text-amber-600' : 'text-emerald-600'}`}
                    >
                      {s.cancellation}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`font-bold ${s.returns > 5 ? 'text-red-600' : s.returns > 3 ? 'text-amber-600' : 'text-emerald-600'}`}
                    >
                      {s.returns}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`font-bold ${s.lateShip > 5 ? 'text-red-600' : s.lateShip > 2 ? 'text-amber-600' : 'text-emerald-600'}`}
                    >
                      {s.lateShip}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`font-bold ${s.response < 50 ? 'text-red-600' : s.response < 80 ? 'text-amber-600' : 'text-emerald-600'}`}
                    >
                      {s.response}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md ${STATUS_STYLES[s.status]}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedSeller(s)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                      {(s.status === 'At Risk' || s.status === 'Critical') && (
                        <button
                          onClick={() => setActionData({ seller: s, action: 'warn' })}
                          className="p-1.5 hover:bg-amber-50 rounded-lg"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedSeller && (
        <SellerHealthDrawer
          seller={selectedSeller}
          onClose={() => setSelectedSeller(null)}
          onWarn={() => setActionData({ seller: selectedSeller, action: 'warn' })}
          onSuspend={() => setActionData({ seller: selectedSeller, action: 'suspend' })}
        />
      )}
      {actionData && (
        <ActionModal
          seller={actionData.seller}
          action={actionData.action}
          onConfirm={handleAction}
          onClose={() => setActionData(null)}
        />
      )}
      <AdminToast toast={toast} />
    </div>
  );
}
