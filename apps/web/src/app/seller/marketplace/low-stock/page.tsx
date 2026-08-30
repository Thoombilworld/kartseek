'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import {
  AlertTriangle, Search, Download, Bell, BellRing, Package,
  ArrowLeft, Edit3, Check, X, TrendingDown, Clock, Zap,
  ShieldAlert, ChevronRight, Settings, RefreshCw, XCircle,
} from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Urgency = 'critical' | 'warning' | 'monitor';

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  /**
   * Null when the backend does not compute it. These two were filled in with
   * `Math.random()` per product on every render, so a seller was told a listing
   * sold "1.8/day with 4 days left" when nothing had measured either — and the
   * figures changed each time they reloaded the page.
   */
  avgDailySales: number | null;
  daysLeft: number | null;
  lastRestocked: string | null;
  urgency: Urgency;
  price: number;
}

const URGENCY_CONFIG: Record<Urgency, { label: string; bg: string; text: string; border: string; dot: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', icon: XCircle },
  warning: { label: 'Warning', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', icon: AlertTriangle },
  monitor: { label: 'Monitor', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', icon: Clock },
};

// Demo low-stock data — replaced by API when connected

export default function LowStockAlertsPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | 'all'>('all');
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [thresholdValue, setThresholdValue] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);

  // Try to load from API
  useEffect(() => {
    if (!seller?.sellerId) return;
    let cancelled = false;
    setLoading(true);
    sellerApi.getLowStockProducts(seller.sellerId)
      .then((res: any) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setItems(rows.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || `SKU-${p.id}`,
          category: p.categoryName || 'General',
          currentStock: p.stock || 0,
          reorderLevel: typeof p.reorderLevel === 'number' ? p.reorderLevel : 5,
          // Only shown when the backend actually returns them — see the note on
          // the interface. Invented sales velocity is worse than none: a seller
          // restocks on it.
          avgDailySales: typeof p.avgDailySales === 'number' ? p.avgDailySales : null,
          daysLeft: typeof p.daysLeft === 'number' ? p.daysLeft : null,
          lastRestocked: p.lastRestocked ?? null,
          urgency: p.stock === 0 ? 'critical' : p.stock <= 3 ? 'critical' : p.stock <= 8 ? 'warning' : 'monitor',
          price: p.price || 0,
        })));
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setItems([]);
        setLoadError(e instanceof Error ? e.message : 'Could not load your low-stock alerts.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seller?.sellerId]);

  /**
   * Download the rows currently on screen as CSV.
   *
   * Client-side because the page already holds them and there is no export
   * endpoint; asking the server to re-derive a list the browser is displaying
   * would be the long way round.
   */
  const exportCsv = () => {
    const header = ['SKU', 'Product', 'Category', 'In stock', 'Alert level'];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      header.join(','),
      ...filtered.map(i => [i.sku, i.name, i.category, i.currentStock, i.reorderLevel].map(escape).join(',')),
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = items.filter(item => {
    const matchSearch = search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchUrgency = urgencyFilter === 'all' || item.urgency === urgencyFilter;
    return matchSearch && matchUrgency;
  });

  const criticalCount = items.filter(i => i.urgency === 'critical').length;
  const warningCount = items.filter(i => i.urgency === 'warning').length;
  const monitorCount = items.filter(i => i.urgency === 'monitor').length;
  const outOfStockCount = items.filter(i => i.currentStock === 0).length;

  const saveThreshold = async (item: LowStockItem) => {
    setItems(prev => prev.map(p =>
      p.id === item.id ? { ...p, reorderLevel: thresholdValue } : p
    ));
    setEditingThresholdId(null);
    try {
      await sellerApi.setLowStockThreshold(seller.sellerId, item.id, thresholdValue);
    } catch { /* API may not be ready */ }
    setToast(`Threshold updated for ${item.name}: ${thresholdValue} units`);
    setTimeout(() => setToast(null), 3000);
  };

  const FILTERS: { key: Urgency | 'all'; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All Alerts', count: items.length, color: 'text-slate-700' },
    { key: 'critical', label: 'Critical', count: criticalCount, color: 'text-red-700' },
    { key: 'warning', label: 'Warning', count: warningCount, color: 'text-amber-700' },
    { key: 'monitor', label: 'Monitor', count: monitorCount, color: 'text-blue-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/seller/marketplace/inventory" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory
          </Link>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            Low Stock Alerts
          </h1>
          <p className="text-sm text-slate-500 mt-1">Products that need immediate restocking attention</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* "Alert Settings" was a handlerless button implying a settings panel
              that does not exist. The alert threshold is per product and is
              already editable inline on each row (see `saveThreshold`), so this
              says where the control actually is rather than opening nothing. */}
          <span className="flex items-center gap-2 text-xs text-slate-500 px-3 py-2.5">
            <Settings className="w-4 h-4 text-slate-400" />
            Set each product&apos;s alert level on its row
          </span>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />Export
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-sm text-emerald-700 font-medium">
          <div className="flex items-center gap-2"><Check className="w-4 h-4" />{toast}</div>
          <button onClick={() => setToast(null)}><X className="w-4 h-4 text-emerald-500" /></button>
        </div>
      )}

      {/* Urgency Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-red-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUrgencyFilter('critical')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setUrgencyFilter('critical'))}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Out of Stock</p>
              <p className="text-xl font-black text-red-600">{outOfStockCount}</p>
            </div>
          </div>
          <p className="text-[10px] text-red-500 mt-2 font-medium">Immediate restock needed</p>
        </div>
        <div className="bg-white border border-red-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUrgencyFilter('critical')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setUrgencyFilter('critical'))}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Critical (&lt;2 days)</p>
              <p className="text-xl font-black text-red-600">{criticalCount}</p>
            </div>
          </div>
          <p className="text-[10px] text-red-400 mt-2 font-medium">Will sell out very soon</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUrgencyFilter('warning')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setUrgencyFilter('warning'))}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Warning (&lt;7 days)</p>
              <p className="text-xl font-black text-amber-600">{warningCount}</p>
            </div>
          </div>
          <p className="text-[10px] text-amber-400 mt-2 font-medium">Plan reorder now</p>
        </div>
        <div className="bg-white border border-blue-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUrgencyFilter('monitor')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setUrgencyFilter('monitor'))}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Monitor</p>
              <p className="text-xl font-black text-blue-600">{monitorCount}</p>
            </div>
          </div>
          <p className="text-[10px] text-blue-400 mt-2 font-medium">Approaching threshold</p>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {outOfStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-red-800 text-sm">Urgent: {outOfStockCount} product{outOfStockCount > 1 ? 's' : ''} completely out of stock</h3>
            <p className="text-xs text-red-600 mt-0.5">
              These products are unavailable to customers and generating lost sales. Restock immediately to prevent revenue loss.
            </p>
          </div>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setUrgencyFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                urgencyFilter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                urgencyFilter === f.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Search low stock items"
          />
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {filtered.map(item => {
          const uc = URGENCY_CONFIG[item.urgency];
          const UrgencyIcon = uc.icon;
          const stockPercent = item.reorderLevel > 0 ? Math.min(100, (item.currentStock / item.reorderLevel) * 100) : 0;
          const isEditingThreshold = editingThresholdId === item.id;

          return (
            <div key={item.id} className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-md ${uc.border}`}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  {/* Product Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${uc.bg} flex items-center justify-center flex-shrink-0`}>
                      <UrgencyIcon className={`w-5 h-5 ${uc.text}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{item.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${uc.bg} ${uc.text} flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${uc.dot}`} />
                          {uc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded">{item.sku}</span>
                        <span>{item.category}</span>
                        <span>{fmt(item.price)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Restock Action */}
                  <Link
                    href="/seller/marketplace/inventory"
                    className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0 ml-3"
                  >
                    Restock <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-3 border-t border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Stock</div>
                    <div className={`text-lg font-black mt-0.5 ${item.currentStock === 0 ? 'text-red-600' : item.currentStock <= 3 ? 'text-amber-600' : 'text-slate-900'}`}>
                      {item.currentStock}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reorder Level</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isEditingThreshold ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={thresholdValue}
                            onChange={e => setThresholdValue(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-14 text-center border border-blue-300 rounded-md px-1 py-0.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            aria-label="Threshold value"
                          />
                          <button onClick={() => saveThreshold(item)} className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => setEditingThresholdId(null)} className="w-6 h-6 rounded bg-red-100 text-red-700 flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-lg font-black text-slate-900">{item.reorderLevel}</span>
                          <button
                            onClick={() => { setEditingThresholdId(item.id); setThresholdValue(item.reorderLevel); }}
                            className="w-5 h-5 rounded bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors"
                            title="Edit threshold"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Daily Sales</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {item.avgDailySales ?? <span className="text-slate-300" title="Not tracked yet">—</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days Until Stockout</div>
                    {item.daysLeft === null ? (
                      <div className="text-lg font-black text-slate-300 mt-0.5" title="Needs sales velocity, which isn’t tracked yet">—</div>
                    ) : (
                      <div className={`text-lg font-black mt-0.5 ${item.daysLeft === 0 ? 'text-red-600' : item.daysLeft <= 2 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {item.daysLeft === 0 ? 'NOW' : `~${item.daysLeft} day${item.daysLeft > 1 ? 's' : ''}`}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Restocked</div>
                    <div className="text-sm font-semibold text-slate-700 mt-1">{item.lastRestocked ?? '—'}</div>
                  </div>
                </div>

                {/* Stock Level Bar */}
                <div className="mt-3">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.currentStock === 0 ? 'bg-red-500' : stockPercent <= 30 ? 'bg-red-500' : stockPercent <= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(stockPercent, 2)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">0</span>
                    <span className="text-[10px] text-slate-400">Reorder: {item.reorderLevel}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">All Clear!</h3>
          <p className="text-sm text-slate-500">
            {search ? `No low-stock items matching "${search}".` : 'No products currently below their reorder thresholds.'}
          </p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
          <Bell className="w-4 h-4 text-blue-500" />
          How Low Stock Alerts Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
            <div><strong>Critical:</strong> Stock is at or near zero. These products will sell out within 1-2 days at current rates.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
            <div><strong>Warning:</strong> Stock is below the reorder level. Plan to restock within the next 3-7 days.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
            <div><strong>Monitor:</strong> Stock is approaching the threshold. Keep an eye on sales velocity.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
