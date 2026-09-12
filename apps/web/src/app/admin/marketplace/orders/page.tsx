'use client';
import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  X,
  Truck,
  Package,
  CreditCard,
  RotateCcw,
  XCircle,
  Clock,
  CheckCircle,
  MapPin,
  User,
  Store,
  Copy,
  AlertTriangle,
  Keyboard,
} from 'lucide-react';
import MarketplaceStatusBadge from '@/components/admin/marketplace/marketplace-status-badge';
import MarketplaceFilterBar from '@/components/admin/marketplace/marketplace-filter-bar';
import MarketplaceActionMenu from '@/components/admin/marketplace/marketplace-action-menu';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import {
  useBulkSelection,
  BulkActionBar,
  exportCsv,
  useKeyboardShortcuts,
  KeyboardShortcutsHelp,
} from '@/components/admin/marketplace/marketplace-toolkit';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
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

/**
 * NO FIXTURE ARRAY LIVES HERE ANY MORE.
 *
 * `const ORDERS = [...]` held fabricated orders across India, the UAE and the
 * UK, and `ordersSource = apiData?.data?.length ? apiData.data : ORDERS` fell
 * back to them whenever the scoped API answered with an empty list — which is
 * exactly what a correctly scoped locked-admin read returns for a market with
 * no orders (whole-branch review, finding G-1 — `:532`).
 *
 * `Order` was `(typeof ORDERS)[number]`, so the fixture was also this file's
 * type. It is declared outright now: a shape the API is expected to send, not a
 * shape inferred from invented rows. The page already had a loading skeleton,
 * an error banner and a `MarketplaceEmptyState` — the fallback was the only
 * thing standing between them and the reader.
 */
type OrderProduct = { name: string; qty: number; price: string; image: string };

/**
 * Every field required, exactly as `(typeof ORDERS)[number]` inferred them —
 * so this change is behavioural only and does not quietly widen what the rest
 * of the file may assume. What the API actually guarantees is the CONSOLE
 * plan's question, along with the rest of this screen.
 */
type Order = {
  id: string;
  customer: string;
  customerEmail: string;
  seller: string;
  country: string;
  items: number;
  amount: string;
  amountNum: number;
  payment: string;
  orderStatus: string;
  delivery: string;
  created: string;
  shippingAddress: string;
  trackingId: string;
  courier: string;
  products: OrderProduct[];
};

const TIMELINE_STEPS = [
  { status: 'placed', label: 'Order Placed', icon: ShoppingCart },
  { status: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { status: 'processing', label: 'Processing', icon: Package },
  { status: 'dispatched', label: 'Dispatched', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: MapPin },
];

const STATUS_TO_STEP: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  dispatched: 3,
  delivered: 4,
  cancelled: -1,
};

const PAGE_SIZE = 6;

// ── Order Detail Drawer ──────────────────────────────────────────────────────
function OrderDetailDrawer({
  order,
  onClose,
  onAction,
}: {
  order: Order;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const step = STATUS_TO_STEP[order.delivery] ?? 0;
  const isCancelled = order.orderStatus === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{order.id}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{order.created}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badges */}
          <div className="flex gap-2 flex-wrap">
            <MarketplaceStatusBadge
              status={order.payment === 'paid' ? 'approved' : 'pending'}
              customLabel={`Payment: ${order.payment}`}
            />
            <MarketplaceStatusBadge
              status={
                order.orderStatus === 'delivered'
                  ? 'active'
                  : order.orderStatus === 'cancelled'
                    ? 'rejected'
                    : 'pending'
              }
              customLabel={`Order: ${order.orderStatus}`}
            />
            <MarketplaceStatusBadge
              status={
                order.delivery === 'delivered'
                  ? 'delivered'
                  : order.delivery === 'dispatched'
                    ? 'processing'
                    : 'pending'
              }
              customLabel={`Delivery: ${order.delivery}`}
            />
          </div>

          {/* Timeline */}
          <div className="bg-slate-50 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Order Timeline</h3>
            {isCancelled ? (
              <div className="flex items-center gap-3 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="text-sm font-bold">Order Cancelled</span>
              </div>
            ) : (
              <div className="flex items-center justify-between relative">
                <div className="absolute top-3 left-6 right-6 h-0.5 bg-slate-200" />
                <div
                  className="absolute top-3 left-6 h-0.5 bg-blue-600 transition-all"
                  style={{
                    width: `${Math.max(0, (step / 4) * 100)}%`,
                    maxWidth: 'calc(100% - 48px)',
                  }}
                />
                {TIMELINE_STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const isComplete = i <= step;
                  const isCurrent = i === step;
                  return (
                    <div
                      key={s.status}
                      className="relative flex flex-col items-center gap-1.5 z-10"
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${isComplete ? 'bg-blue-600 text-white' : 'bg-white border-2 border-slate-300 text-slate-400'} ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
                      >
                        <Icon className="w-3 h-3" />
                      </div>
                      <span
                        className={`text-[10px] font-bold ${isComplete ? 'text-blue-700' : 'text-slate-400'}`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {order.trackingId && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Tracking ID</p>
                  <p className="text-sm font-mono font-bold text-slate-900">{order.trackingId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Courier</p>
                  <p className="text-sm font-bold text-slate-900">{order.courier}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(order.trackingId)}
                  className="p-1.5 hover:bg-white rounded-lg"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Products ({order.items})</h3>
            <div className="space-y-2">
              {order.products.map((p, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <span className="text-2xl">{p.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">Qty: {p.qty}</p>
                  </div>
                  <p className="text-sm font-black text-slate-900">{p.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Shipping */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">Customer</h3>
              </div>
              <p className="text-sm text-slate-700">{order.customer}</p>
              <p className="text-xs text-slate-500">{order.customerEmail}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Store className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">Seller</h3>
              </div>
              <p className="text-sm text-slate-700">{order.seller}</p>
              <p className="text-xs text-slate-500">
                <CountryFlag code={COUNTRY_TO_CODE[order.country] || 'IN'} size="sm" />{' '}
                {order.country}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">Shipping Address</h3>
              </div>
              <p className="text-sm text-slate-700">{order.shippingAddress}</p>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Order Total</span>
              <span className="text-xl font-black text-blue-700">{order.amount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {!isCancelled && order.orderStatus !== 'delivered' && (
            <div className="flex gap-3">
              {order.orderStatus === 'pending' && (
                <button
                  onClick={() => onAction('confirm')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Confirm Order
                </button>
              )}
              {order.orderStatus === 'processing' && order.delivery === 'pending' && (
                <button
                  onClick={() => onAction('ship')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" /> Mark Shipped
                </button>
              )}
              <button
                onClick={() => onAction('refund')}
                className="flex-1 bg-violet-50 hover:bg-violet-100 text-violet-700 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Initiate Refund
              </button>
              <button
                onClick={() => onAction('cancel')}
                className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cancel Confirmation Modal ────────────────────────────────────────────────
function CancelModal({
  orderId,
  onConfirm,
  onClose,
}: {
  orderId: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-black text-slate-900">Cancel Order</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Are you sure you want to cancel <span className="font-bold">{orderId}</span>? This action
          cannot be undone.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Cancellation reason..."
          className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-red-200 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Keep Order
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

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
    () => adminMarketplaceApi.getOrders({ status: statusFilter || undefined, country }),
    [statusFilter, country],
  );
  const { execute } = useAdminAction(showToast);

  // The API result, whatever it is. An empty list is an answer, not a gap to
  // fill: the empty state below names it.
  const ordersSource: Order[] = (apiData?.data as Order[] | undefined) ?? [];
  const {
    filtered: regionFiltered,
    regionLabel,
    isFiltered: isRegionFiltered,
  } = useMarketplaceRegionFilter(ordersSource);

  const filtered = regionFiltered.filter(
    (o) =>
      (!search ||
        o.id.includes(search) ||
        o.customer.toLowerCase().includes(search.toLowerCase()) ||
        o.seller.toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || o.orderStatus === statusFilter),
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Bulk selection
  const {
    selectedIds,
    toggle,
    toggleAll,
    clear,
    isAllSelected,
    selectedCount,
    hasSelection,
    selectedItems,
  } = useBulkSelection(paged);

  // CSV export
  const handleExportCsv = () => {
    const data = hasSelection ? selectedItems : filtered;
    exportCsv(
      [
        'Order ID',
        'Customer',
        'Seller',
        'Country',
        'Items',
        'Amount',
        'Payment',
        'Status',
        'Delivery',
        'Date',
      ],
      data.map((o) => [
        o.id,
        o.customer,
        o.seller,
        o.country,
        String(o.items),
        o.amount,
        o.payment,
        o.orderStatus,
        o.delivery,
        o.created,
      ]),
      'marketplace-orders',
    );
    showToast(`${data.length} orders exported`, 'success');
  };

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => [
      {
        key: '/',
        handler: () => document.querySelector<HTMLInputElement>('[placeholder*="Search"]')?.focus(),
        description: 'Focus search',
      },
      {
        key: 'Escape',
        handler: () => {
          setSelectedOrder(null);
          setCancelOrder(null);
          clear();
        },
        description: 'Close drawer / clear selection',
      },
      {
        key: '?',
        shift: true,
        handler: () => setShowShortcuts((v) => !v),
        description: 'Show keyboard shortcuts',
      },
      { key: 'e', handler: handleExportCsv, description: 'Export CSV' },
    ],
    [filtered, hasSelection, selectedItems],
  );
  useKeyboardShortcuts(shortcuts);

  const kpis = [
    { label: 'Total', val: regionFiltered.length, color: 'text-blue-600' },
    {
      label: 'Delivered',
      val: regionFiltered.filter((o) => o.orderStatus === 'delivered').length,
      color: 'text-emerald-600',
    },
    {
      label: 'Processing',
      val: regionFiltered.filter((o) => o.orderStatus === 'processing').length,
      color: 'text-amber-600',
    },
    {
      label: 'Cancelled',
      val: regionFiltered.filter((o) => o.orderStatus === 'cancelled').length,
      color: 'text-red-600',
    },
  ];

  const handleAction = (order: Order, action: string) => {
    if (action === 'cancel') {
      setCancelOrder(order);
      return;
    }
    execute(
      () => adminMarketplaceApi.updateOrder(order.id, { action }),
      `Order ${order.id} ${action}ed successfully`,
      () => refetch(),
    );
    setSelectedOrder(null);
  };

  const handleCancelConfirm = (reason: string) => {
    if (!cancelOrder) return;
    execute(
      () => adminMarketplaceApi.updateOrder(cancelOrder.id, { action: 'cancel', reason }),
      `Order ${cancelOrder.id} cancelled`,
      () => refetch(),
    );
    setCancelOrder(null);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Marketplace Orders</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRegionFiltered ? `${regionLabel} — ` : ''}Full visibility of all marketplace orders
            across all sellers{isRegionFiltered ? '' : ' and countries'}.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors"
            title="Keyboard shortcuts (Shift+?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export{hasSelection ? ` (${selectedCount})` : ''}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
            <p className="text-xs text-slate-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <MarketplaceFilterBar
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Search order ID, customer, seller..."
        filters={[
          {
            label: 'All Status',
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              setPage(1);
            },
            options: [
              { label: 'Processing', value: 'processing' },
              { label: 'Delivered', value: 'delivered' },
              { label: 'Pending', value: 'pending' },
              { label: 'Cancelled', value: 'cancelled' },
            ],
          },
        ]}
        onExport={() => {}}
      />

      {loading && <AdminLoadingSkeleton rows={5} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs">
              <tr>
                <th className="px-3 py-3.5 text-center font-semibold w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded cursor-pointer"
                    aria-label="checkbox"
                  />
                </th>
                <th className="px-5 py-3.5 text-left font-semibold">Order ID</th>
                <th className="px-4 py-3.5 text-left font-semibold">Customer</th>
                <th className="px-4 py-3.5 text-left font-semibold">Seller</th>
                <th className="px-4 py-3.5 text-center font-semibold">Country</th>
                <th className="px-4 py-3.5 text-center font-semibold">Items</th>
                <th className="px-4 py-3.5 text-right font-semibold">Amount</th>
                <th className="px-4 py-3.5 text-center font-semibold">Payment</th>
                <th className="px-4 py-3.5 text-center font-semibold">Status</th>
                <th className="px-4 py-3.5 text-center font-semibold">Delivery</th>
                <th className="px-4 py-3.5 text-left font-semibold">Date</th>
                <th className="px-4 py-3.5 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <MarketplaceEmptyState title="No orders found" icon={ShoppingCart} />
                  </td>
                </tr>
              ) : (
                paged.map((o) => (
                  <tr
                    key={o.id}
                    className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedIds.has(o.id) ? 'bg-blue-50/50' : ''}`}
                    onClick={() => setSelectedOrder(o)}
                    tabIndex={0}
                    onKeyDown={activateOnKey(() => setSelectedOrder(o))}
                  >
                    <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(o.id)}
                        onChange={() => toggle(o.id)}
                        className="w-3.5 h-3.5 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-mono font-bold text-blue-700 text-xs">{o.id}</p>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{o.customer}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{o.seller}</td>
                    <td className="px-4 py-3.5 text-center">
                      <CountryFlag code={COUNTRY_TO_CODE[o.country] || 'QA'} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold">{o.items}</td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-900">{o.amount}</td>
                    <td className="px-4 py-3.5 text-center">
                      <MarketplaceStatusBadge
                        status={o.payment === 'paid' ? 'approved' : 'pending'}
                        customLabel={o.payment}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <MarketplaceStatusBadge
                        status={
                          o.orderStatus === 'delivered'
                            ? 'active'
                            : o.orderStatus === 'cancelled'
                              ? 'rejected'
                              : 'pending'
                        }
                        customLabel={o.orderStatus}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <MarketplaceStatusBadge
                        status={
                          o.delivery === 'delivered'
                            ? 'delivered'
                            : o.delivery === 'cancelled'
                              ? 'cancelled'
                              : o.delivery === 'dispatched'
                                ? 'processing'
                                : 'pending'
                        }
                        customLabel={o.delivery}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{o.created}</td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <MarketplaceActionMenu
                        items={[
                          { label: 'View Details', icon: Eye, onClick: () => setSelectedOrder(o) },
                          ...(o.orderStatus !== 'cancelled' && o.orderStatus !== 'delivered'
                            ? [
                                {
                                  label: 'Cancel Order',
                                  icon: XCircle,
                                  onClick: () => setCancelOrder(o),
                                  destructive: true,
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">{filtered.length} orders</p>
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

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAction={(action) => handleAction(selectedOrder, action)}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {cancelOrder && (
        <CancelModal
          orderId={cancelOrder.id}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelOrder(null)}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selectedCount}
        onClear={clear}
        actions={[
          { label: 'Export CSV', icon: Download, onClick: handleExportCsv },
          {
            label: 'Cancel Selected',
            icon: XCircle,
            onClick: () => {
              selectedItems.forEach((o) => handleAction(o, 'cancel'));
              clear();
            },
            variant: 'danger',
          },
        ]}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        shortcuts={shortcuts}
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      <AdminToast toast={toast} />
    </div>
  );
}
