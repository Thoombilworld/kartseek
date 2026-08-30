'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import {
  ShoppingBag, Search, Download, Package, Clock, Truck, CheckCircle,
  XCircle, DollarSign, Eye, ChevronLeft, ChevronRight, ArrowUpDown,
  Check, X, Box, MapPin, User, Calendar, Hash, Clipboard, Send,
  // `Wallet` rather than `IndianRupee` on the revenue tile: this portal serves
  // ten markets and the amount beside it is formatted in the seller's own
  // currency, so a rupee glyph contradicted the figure it labelled.
  AlertTriangle, Filter, Printer, FileText, Tag, Wallet,
} from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type OrderStatus = 'New' | 'Processing' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
type StatusFilter = OrderStatus | 'All';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  sku: string;
}

interface Order {
  id: string;
  orderId: string;
  items: OrderItem[];
  buyer: { name: string; city: string };
  amount: number;
  status: OrderStatus;
  date: string;
  paymentMethod: string;
  shippingAddress: string;
  trackingId?: string;
  courier?: string;
}

const STATUS_CONFIG: Record<OrderStatus, { bg: string; text: string; dot: string; icon: React.ElementType }> = {
  New: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', icon: Package },
  Processing: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', icon: Clock },
  Packed: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', icon: Box },
  Shipped: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500', icon: Truck },
  Delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle },
  Cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', icon: XCircle },
};

/**
 * The API speaks the order lifecycle in its own vocabulary
 * (`PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`,
 * `RETURN_REQUESTED`…); this page's badges are keyed by the labels above.
 *
 * Nothing translated between them, so once real orders started arriving
 * `STATUS_CONFIG[order.status]` was `undefined` and reading `.icon` off it threw,
 * taking the whole Orders page down. It never showed up before because the demo
 * rows were written in the page's own vocabulary.
 */
const API_STATUS_TO_LABEL: Record<string, OrderStatus> = {
  PENDING: 'New',
  CONFIRMED: 'Processing',
  PREPARING: 'Packed',
  READY: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Delivered',
  RETURNED: 'Cancelled',
  REFUNDED: 'Cancelled',
};

function toOrderStatus(raw: unknown): OrderStatus {
  const key = String(raw ?? '').toUpperCase();
  if (API_STATUS_TO_LABEL[key]) return API_STATUS_TO_LABEL[key];
  // Already one of ours (optimistic local updates set these directly).
  const asLabel = String(raw ?? '') as OrderStatus;
  return STATUS_CONFIG[asLabel] ? asLabel : 'New';
}

// Demo orders — replaced by API when connected
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }

export default function OrdersPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shipModal, setShipModal] = useState<{ orderId: string; id: string } | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [courier, setCourier] = useState('Delhivery');
  const [toast, setToast] = useState<string | null>(null);
  const perPage = 10;

  // Try to load from API
  useEffect(() => {
    if (!seller?.sellerId) return;
    let cancelled = false;
    setLoading(true);
    sellerApi.getOrders(seller.sellerId, { page: 1, limit: 20 })
      .then((res: any) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setOrders(rows.map((o: any) => ({
          id: o.id,
          orderId: o.orderNumber || o.orderId || o.id,
          // `items` is a jsonb snapshot on the order: `{ name, quantity,
          // unitPrice, sellerSku }`. The page's row shape is `{ name, qty,
          // price, sku }`, so it has to be mapped, not passed through.
          items: Array.isArray(o.items) && o.items.length
            ? o.items.map((i: any) => ({
              name: i.name || 'Product',
              qty: Number(i.quantity ?? i.qty ?? 1),
              price: Number(i.unitPrice ?? i.price ?? 0),
              sku: i.sellerSku || i.sku || '',
            }))
            : [{ name: 'Product', qty: 1, price: Number(o.grandTotal ?? 0), sku: '' }],
          buyer: {
            name: o.customerName || o.buyerName || o.buyer?.name || 'Customer',
            city: o.shippingAddress?.city || o.city || '',
          },
          amount: Number(o.grandTotal ?? o.totalAmount ?? o.amount ?? 0),
          status: toOrderStatus(o.status),
          date: o.createdAt || o.date || new Date().toISOString(),
          paymentMethod: o.paymentMethod || 'Online',
          shippingAddress: typeof o.shippingAddress === 'string'
            ? o.shippingAddress
            : [o.shippingAddress?.line, o.shippingAddress?.city, o.shippingAddress?.pin].filter(Boolean).join(', '),
          trackingId: o.trackingId,
          courier: o.courierName || o.courier,
        })));
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setOrders([]);
        setLoadError(e instanceof Error ? e.message : 'Could not load your orders.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seller?.sellerId]);

  // Stats
  const stats = useMemo(() => ({
    newCount: orders.filter(o => o.status === 'New').length,
    processingCount: orders.filter(o => o.status === 'Processing' || o.status === 'Packed').length,
    shippedCount: orders.filter(o => o.status === 'Shipped').length,
    totalRevenue: orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.amount, 0),
  }), [orders]);

  // Filter + Search
  const filtered = useMemo(() => orders
    .filter(o => {
      const matchSearch = search === '' ||
        o.orderId.toLowerCase().includes(search.toLowerCase()) ||
        o.buyer.name.toLowerCase().includes(search.toLowerCase()) ||
        o.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'All' || o.status === statusFilter;
      return matchSearch && matchStatus;
    })
  , [orders, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Order actions
  const acceptOrder = async (order: Order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Processing' as OrderStatus } : o));
    try { await sellerApi.acceptOrder(seller.sellerId, order.id); } catch {}
    showToast(`Order ${order.orderId} accepted`);
  };

  const rejectOrder = async (order: Order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Cancelled' as OrderStatus } : o));
    try { await sellerApi.rejectOrder(seller.sellerId, order.id, 'Seller rejected'); } catch {}
    showToast(`Order ${order.orderId} rejected`);
  };

  const packOrder = async (order: Order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Packed' as OrderStatus } : o));
    try { await sellerApi.markPacked(seller.sellerId, order.id); } catch {}
    showToast(`Order ${order.orderId} marked as packed`);
  };

  const shipOrderAction = async () => {
    if (!shipModal || !trackingId) return;
    setOrders(prev => prev.map(o => o.id === shipModal.id ? { ...o, status: 'Shipped' as OrderStatus, trackingId, courier } : o));
    try { await sellerApi.shipOrder(seller.sellerId, shipModal.id, trackingId, courier); } catch {}
    showToast(`Order ${shipModal.orderId} shipped via ${courier}`);
    setShipModal(null);
    setTrackingId('');
  };

  const FILTER_TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'All', label: 'All Orders', count: orders.length },
    { key: 'New', label: 'New', count: orders.filter(o => o.status === 'New').length },
    { key: 'Processing', label: 'Processing', count: orders.filter(o => o.status === 'Processing').length },
    { key: 'Packed', label: 'Packed', count: orders.filter(o => o.status === 'Packed').length },
    { key: 'Shipped', label: 'Shipped', count: orders.filter(o => o.status === 'Shipped').length },
    { key: 'Delivered', label: 'Delivered', count: orders.filter(o => o.status === 'Delivered').length },
    { key: 'Cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'Cancelled').length },
  ];

  const COURIERS = ['Delhivery', 'BlueDart', 'DTDC', 'Ecom Express', 'Shadowfax', 'India Post'];

  // ── Print Invoice ─────────────────────────────────────────────────────
  const printInvoice = (order: Order) => {
    const gst = Math.round(order.amount * 0.18);
    const subtotal = order.amount - gst;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${order.orderId}</title><style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;}
      body{padding:40px;color:#1e293b;}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:20px;margin-bottom:24px;}
      .logo{font-size:24px;font-weight:900;color:#4f46e5;}
      .logo span{color:#94a3b8;font-weight:400;font-size:14px;}
      .inv-title{text-align:right;}
      .inv-title h2{font-size:28px;font-weight:800;color:#4f46e5;}
      .inv-title p{color:#64748b;font-size:13px;margin-top:2px;}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;}
      .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;}
      .box h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:8px;}
      .box p{font-size:13px;color:#334155;line-height:1.6;}
      table{width:100%;border-collapse:collapse;margin-bottom:24px;}
      th{background:#f1f5f9;text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0;}
      td{padding:12px;font-size:13px;border-bottom:1px solid #f1f5f9;color:#334155;}
      .right{text-align:right;}
      .total-box{margin-left:auto;width:280px;}
      .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;}
      .total-row.grand{border-top:2px solid #e2e8f0;padding-top:10px;margin-top:6px;font-weight:800;font-size:16px;color:#1e293b;}
      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px;}
      @media print{body{padding:20px;}}
    </style></head><body>
      <div class="hdr">
        <div class="logo">KARTSEEK <span>Marketplace</span></div>
        <div class="inv-title"><h2>TAX INVOICE</h2><p>${order.orderId} · ${fmtDate(order.date)}</p></div>
      </div>
      <div class="two-col">
        <div class="box"><h4>Bill To</h4><p><strong>${order.buyer.name}</strong><br>${order.shippingAddress || order.buyer.city}</p></div>
        <div class="box"><h4>Order Details</h4><p>Order ID: <strong>${order.orderId}</strong><br>Date: ${fmtDate(order.date)} · ${fmtTime(order.date)}<br>Payment: ${order.paymentMethod}<br>Status: ${order.status}</p></div>
      </div>
      {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
      <div className="overflow-x-auto">
        <table>
          <thead><tr><th>#</th><th>Product</th><th>SKU</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead>
          <tbody>${order.items.map((it, i) => `<tr><td>${i + 1}</td><td><strong>${it.name}</strong></td><td style="font-family:monospace;font-size:11px;color:#94a3b8">${it.sku || '—'}</td><td class="right">${it.qty}</td><td class="right">₹${it.price.toLocaleString('en-IN')}</td><td class="right"><strong>₹${(it.price * it.qty).toLocaleString('en-IN')}</strong></td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="total-box">
        <div class="total-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
        <div class="total-row"><span>GST (18%)</span><span>₹${gst.toLocaleString('en-IN')}</span></div>
        <div class="total-row"><span>Shipping</span><span>Free</span></div>
        <div class="total-row grand"><span>Total</span><span>₹${order.amount.toLocaleString('en-IN')}</span></div>
      </div>
      <div class="footer"><p>This is a computer-generated invoice and does not require a signature.</p><p style="margin-top:4px">KARTSEEK Marketplace · GSTIN: 29AABCK1234R1ZX</p></div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // ── Print Shipping Label ──────────────────────────────────────────────
  const printShippingLabel = (order: Order) => {
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Label ${order.orderId}</title><style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;}
      body{padding:20px;display:flex;justify-content:center;align-items:flex-start;}
      .label{width:400px;border:3px solid #1e293b;border-radius:12px;overflow:hidden;}
      .lbl-hdr{background:#1e293b;color:white;padding:16px;display:flex;justify-content:space-between;align-items:center;}
      .lbl-hdr h2{font-size:18px;font-weight:900;}
      .lbl-hdr .oid{font-size:12px;background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:6px;font-weight:700;}
      .lbl-body{padding:20px;}
      .section{margin-bottom:16px;}
      .section-title{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;margin-bottom:8px;}
      .addr{font-size:16px;font-weight:700;color:#1e293b;line-height:1.5;}
      .addr-small{font-size:12px;color:#64748b;margin-top:4px;}
      .divider{border-top:2px dashed #e2e8f0;margin:16px 0;}
      .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      .meta{background:#f8fafc;border-radius:8px;padding:12px;}
      .meta-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;}
      .meta-value{font-size:14px;font-weight:800;color:#1e293b;margin-top:4px;}
      .barcode{text-align:center;padding:16px;background:#f8fafc;border-top:2px solid #e2e8f0;}
      .barcode-text{font-family:monospace;font-size:20px;font-weight:900;letter-spacing:4px;color:#1e293b;}
      .barcode-sub{font-size:10px;color:#94a3b8;margin-top:4px;}
      .items{font-size:12px;color:#64748b;}
      .items strong{color:#334155;}
      @media print{body{padding:0;}.label{border:2px solid #000;}}
    </style></head><body>
      <div class="label">
        <div class="lbl-hdr"><h2>KARTSEEK</h2><span class="oid">${order.orderId}</span></div>
        <div class="lbl-body">
          <div class="section">
            <div class="section-title">Ship To</div>
            <div class="addr">${order.buyer.name}</div>
            <div class="addr-small">${order.shippingAddress || order.buyer.city}</div>
          </div>
          <div class="divider"></div>
          <div class="section">
            <div class="section-title">From</div>
            <div class="addr" style="font-size:14px">KARTSEEK Marketplace Seller</div>
            <div class="addr-small">Warehouse Dispatch Center</div>
          </div>
          <div class="divider"></div>
          <div class="grid-2">
            <div class="meta"><div class="meta-label">Weight</div><div class="meta-value">0.5 kg</div></div>
            <div class="meta"><div class="meta-label">Payment</div><div class="meta-value">${order.paymentMethod}</div></div>
            <div class="meta"><div class="meta-label">Courier</div><div class="meta-value">${order.courier || 'Pending'}</div></div>
            <div class="meta"><div class="meta-label">COD</div><div class="meta-value">${order.paymentMethod === 'COD' ? '₹' + order.amount.toLocaleString('en-IN') : 'Prepaid'}</div></div>
          </div>
          <div style="margin-top:12px" class="section">
            <div class="section-title">Items (${order.items.reduce((s, i) => s + i.qty, 0)})</div>
            <div class="items">${order.items.map(i => `<div>• <strong>${i.name}</strong> × ${i.qty}</div>`).join('')}</div>
          </div>
        </div>
        <div class="barcode">
          <div class="barcode-text">${order.trackingId || order.orderId}</div>
          <div class="barcode-sub">${order.courier || 'TRACKING'} · ${fmtDate(order.date)}</div>
        </div>
      </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            Order Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Process, pack, and ship your marketplace orders</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />Export
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-sm text-emerald-700 font-medium animate-in">
          <div className="flex items-center gap-2"><Check className="w-4 h-4" />{toast}</div>
          <button onClick={() => setToast(null)}><X className="w-4 h-4 text-emerald-500" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('New')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setStatusFilter('New'))}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-blue-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">New Orders</p>
              <p className="text-xl font-black text-blue-600">{stats.newCount}</p>
            </div>
          </div>
          {stats.newCount > 0 && <p className="text-[10px] text-blue-500 mt-2 font-medium">Awaiting your action</p>}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('Processing')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setStatusFilter('Processing'))}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">In Progress</p>
              <p className="text-xl font-black text-amber-600">{stats.processingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('Shipped')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setStatusFilter('Shipped'))}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0"><Truck className="w-5 h-5 text-cyan-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Shipped</p>
              <p className="text-xl font-black text-cyan-600">{stats.shippedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><Wallet className="w-5 h-5 text-emerald-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Revenue</p>
              <p className="text-xl font-black text-slate-900">{fmt(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Orders Banner */}
      {stats.newCount > 0 && statusFilter === 'All' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-800 text-sm">{stats.newCount} new order{stats.newCount > 1 ? 's' : ''} awaiting action</h3>
            <p className="text-xs text-blue-600">Accept or reject these orders to maintain your SLA performance score.</p>
          </div>
          <button onClick={() => setStatusFilter('New')} className="text-sm font-bold text-blue-700 hover:text-blue-800">View →</button>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {FILTER_TABS.map(f => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                statusFilter === f.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by order ID, buyer name, or product..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Search orders"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {paginated.map(order => {
          const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.New;
          const StatusIcon = sc.icon;
          const isExpanded = expandedId === order.id;

          return (
            <div key={order.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              {/* Order Row */}
              <div
                className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : order.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setExpandedId(isExpanded ? null : order.id))}
              >
                {/* Status Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.bg}`}>
                  <StatusIcon className={`w-5 h-5 ${sc.text}`} />
                </div>

                {/* Order Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-slate-900 text-sm">{order.orderId}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {order.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}
                  </div>
                </div>

                {/* Buyer */}
                <div className="hidden md:block text-right min-w-[120px]">
                  <div className="text-sm font-semibold text-slate-700">{order.buyer.name}</div>
                  <div className="text-xs text-slate-400">{order.buyer.city}</div>
                </div>

                {/* Amount */}
                <div className="text-right min-w-[100px]">
                  <div className="text-sm font-black text-slate-900">{fmt(order.amount)}</div>
                  <div className="text-[10px] text-slate-400">{fmtDate(order.date)}</div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {order.status === 'New' && (
                    <>
                      <button onClick={() => acceptOrder(order)} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors" title="Accept">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => rejectOrder(order)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors" title="Reject">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {order.status === 'Processing' && (
                    <button onClick={() => packOrder(order)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors" title="Mark Packed">
                      <Box className="w-3.5 h-3.5" />Pack
                    </button>
                  )}
                  {order.status === 'Packed' && (
                    <button
                      onClick={() => setShipModal({ orderId: order.orderId, id: order.id })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-600 text-xs font-bold hover:bg-cyan-100 transition-colors"
                      title="Ship Order"
                    >
                      <Send className="w-3.5 h-3.5" />Ship
                    </button>
                  )}
                  {order.status === 'Shipped' && order.trackingId && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-mono">
                      <Truck className="w-3 h-3" />{order.trackingId}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Order Items */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Items</h4>
                      <div className="space-y-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-slate-100">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                              <div className="text-xs text-slate-400">{item.sku} · Qty: {item.qty}</div>
                            </div>
                            <div className="text-sm font-bold text-slate-900">{fmt(item.price)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Shipping</h4>
                      <div className="bg-white rounded-lg p-3 border border-slate-100 space-y-2">
                        <div className="flex items-start gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                          <div><div className="text-sm font-semibold text-slate-900">{order.buyer.name}</div></div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                          <div className="text-xs text-slate-600">{order.shippingAddress || 'Address on file'}</div>
                        </div>
                        {order.trackingId && (
                          <div className="flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            <div className="text-xs text-slate-600">{order.courier} — <span className="font-mono font-bold">{order.trackingId}</span></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment & Timeline */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment</h4>
                      <div className="bg-white rounded-lg p-3 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Subtotal</span>
                          <span className="text-sm font-semibold text-slate-900">{fmt(order.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Payment</span>
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{order.paymentMethod}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Date</span>
                          <span className="text-xs text-slate-700">{fmtDate(order.date)} · {fmtTime(order.date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Print Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => printInvoice(order)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-indigo-300 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-indigo-500" />
                      Print Invoice
                    </button>
                    <button
                      onClick={() => printShippingLabel(order)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-cyan-300 transition-colors"
                    >
                      <Tag className="w-4 h-4 text-cyan-500" />
                      Print Shipping Label
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">No orders found</h3>
          <p className="text-sm text-slate-500">
            {search ? `No results for "${search}".` : `No ${statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} orders at the moment.`}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} orders
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${page === p ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Ship Modal */}
      {shipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-black text-slate-900 text-lg mb-1">Ship Order {shipModal.orderId}</h2>
            <p className="text-sm text-slate-500 mb-5">Enter shipment tracking details</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="courier-partner">Courier Partner</label>
                <select id="courier-partner"
                  value={courier}
                  onChange={e => setCourier(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Courier Partner"
                >
                  {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="tracking-id-awb">Tracking ID / AWB</label>
                <input id="tracking-id-awb"
                  type="text"
                  value={trackingId}
                  onChange={e => setTrackingId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. DEL784512369"
                  aria-label="Tracking ID"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShipModal(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={shipOrderAction} disabled={!trackingId} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />Confirm Shipment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
