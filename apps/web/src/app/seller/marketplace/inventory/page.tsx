'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import {
  Search, Download, Warehouse, Package, AlertTriangle, XCircle,
  TrendingUp, Edit3, Check, X, RefreshCw, ChevronDown,
  ChevronLeft, ChevronRight, ArrowUpDown, Filter, BarChart3,
  Minus, Plus, Bell, Settings, Eye,
} from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { downloadCsv } from '@/lib/export-csv';
type StockStatus = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
type SortField = 'name' | 'stock' | 'sold' | 'price';
type SortDir = 'asc' | 'desc';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  image?: string;
  category: string;
  price: number;
  stock: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  sold: number;
  lastRestocked: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

// Demo inventory data — replaced by API when connected

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  'In Stock': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Low Stock': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Out of Stock': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function InventoryPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const perPage = 10;

  // Try to load from API
  useEffect(() => {
    if (!seller?.sellerId) return;
    let cancelled = false;
    setLoading(true);
    sellerApi.getInventory(seller.sellerId, { page: 1 })
      .then((res: any) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        // Inventory rows are **listings** (`{ id, sellingPrice, stockQuantity,
        // sellerSku, product }`), not products. Reading `p.name` off one gave
        // `undefined`, and the sort's `a.name.localeCompare(b.name)` then threw
        // and took the page down as soon as a real listing arrived.
        setItems(rows.map((l: any) => {
          const stock = Number(l.stockQuantity ?? l.stock ?? 0);
          return {
            id: l.id,
            name: l.product?.name ?? l.name ?? 'Unnamed product',
            sku: l.sellerSku ?? l.sku ?? `SKU-${String(l.id).slice(0, 8)}`,
            category: l.product?.categoryName ?? l.categoryName ?? 'General',
            price: Number(l.sellingPrice ?? l.price ?? 0),
            stock,
            reserved: Number(l.reservedQuantity ?? 0),
            available: Math.max(stock - Number(l.reservedQuantity ?? 0), 0),
            reorderLevel: Number(l.reorderLevel ?? 5),
            sold: Number(l.unitsSold ?? l.sold ?? 0),
            lastRestocked: l.updatedAt ?? l.createdAt ?? 'N/A',
            status: stock === 0 ? 'Out of Stock' : stock <= Number(l.reorderLevel ?? 5) ? 'Low Stock' : 'In Stock',
          };
        }));
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setItems([]);
        setLoadError(e instanceof Error ? e.message : 'Could not load your inventory.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seller?.sellerId]);

  // Derived stats
  const totalItems = items.length;
  const lowStockCount = items.filter(i => i.status === 'Low Stock').length;
  const outOfStockCount = items.filter(i => i.status === 'Out of Stock').length;
  const totalValue = items.reduce((sum, i) => sum + (i.price * i.stock), 0);

  // Filter + Sort
  const filtered = items
    .filter(item => {
      const matchSearch = search === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'in-stock' && item.status === 'In Stock') ||
        (statusFilter === 'low-stock' && item.status === 'Low Stock') ||
        (statusFilter === 'out-of-stock' && item.status === 'Out of Stock');
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = (a.name ?? '').localeCompare(b.name ?? '');
      else if (sortField === 'stock') cmp = a.stock - b.stock;
      else if (sortField === 'sold') cmp = a.sold - b.sold;
      else if (sortField === 'price') cmp = a.price - b.price;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditValue(item.stock);
  };

  const saveEdit = async (item: InventoryItem) => {
    // Update locally
    setItems(prev => prev.map(p =>
      p.id === item.id ? {
        ...p,
        stock: editValue,
        available: editValue - p.reserved,
        status: editValue === 0 ? 'Out of Stock' as const : editValue <= p.reorderLevel ? 'Low Stock' as const : 'In Stock' as const,
      } : p
    ));
    setEditingId(null);

    // Push to API
    try {
      await sellerApi.updateStock(seller.sellerId, item.id, editValue);
    } catch { /* API may not be ready */ }

    setToast(`Stock updated: ${item.name} → ${editValue} units`);
    setTimeout(() => setToast(null), 3000);
  };

  const FILTERS: { key: StockStatus; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All Items', count: totalItems, color: 'text-slate-700' },
    { key: 'in-stock', label: 'In Stock', count: items.filter(i => i.status === 'In Stock').length, color: 'text-emerald-700' },
    { key: 'low-stock', label: 'Low Stock', count: lowStockCount, color: 'text-amber-700' },
    { key: 'out-of-stock', label: 'Out of Stock', count: outOfStockCount, color: 'text-red-700' },
  ];

  /**
   * Download the filtered rows.
   *
   * The Export button had no `onClick`. Exporting `filtered` rather than the
   * raw list matters: the button sits beside the filters, so a seller who has
   * narrowed the view expects the file to match what they are looking at.
   */
  const exportCsv = () => downloadCsv('inventory', filtered, [
      { header: 'SKU', value: (i: any) => i.sku },
      { header: 'Product', value: (i: any) => i.name },
      { header: 'Category', value: (i: any) => i.category },
      { header: 'Price', value: (i: any) => i.price },
      { header: 'In stock', value: (i: any) => i.stock },
      { header: 'Reserved', value: (i: any) => i.reserved },
      { header: 'Available', value: (i: any) => i.available },
      { header: 'Alert level', value: (i: any) => i.reorderLevel },
      { header: 'Sold', value: (i: any) => i.sold },
    ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            Inventory Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track stock levels, update quantities, and manage reorder alerts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/seller/marketplace/low-stock" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
            <Bell className="w-4 h-4" />Low Stock Alerts
            {lowStockCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{lowStockCount}</span>
            )}
          </Link>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="w-4 h-4" />Export CSV
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-sm text-emerald-700 font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />{toast}
          </div>
          <button onClick={() => setToast(null)}><X className="w-4 h-4 text-emerald-500" /></button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Total SKUs</p>
              <p className="text-xl font-black text-slate-900">{totalItems.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('low-stock')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setStatusFilter('low-stock'))}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Low Stock</p>
              <p className="text-xl font-black text-amber-600">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('out-of-stock')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setStatusFilter('out-of-stock'))}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Out of Stock</p>
              <p className="text-xl font-black text-red-600">{outOfStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Inventory Value</p>
              <p className="text-xl font-black text-slate-900">{fmt(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Status Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
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

        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, SKU, or category..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Search inventory"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors text-xs uppercase tracking-wider">
                    Product <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-center">
                  <button onClick={() => toggleSort('stock')} className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors text-xs uppercase tracking-wider mx-auto">
                    Stock <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wider">Reserved</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wider">Available</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wider">Reorder Lvl</th>
                <th className="px-4 py-3 text-center">
                  <button onClick={() => toggleSort('sold')} className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors text-xs uppercase tracking-wider mx-auto">
                    Sold <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(item => {
                const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG['In Stock'];
                const isEditing = editingId === item.id;
                const isLow = item.stock > 0 && item.stock <= item.reorderLevel;

                return (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${item.stock === 0 ? 'bg-red-50/30' : isLow ? 'bg-amber-50/20' : ''}`}>
                    {/* Product */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                          📦
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate max-w-[200px]">{item.name}</div>
                          <div className="text-[11px] text-slate-400">{fmt(item.price)}</div>
                        </div>
                      </div>
                    </td>
                    {/* SKU */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded">{item.sku}</span>
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-600 font-medium">{item.category}</span>
                    </td>
                    {/* Stock (editable) */}
                    <td className="px-4 py-3.5 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditValue(v => Math.max(0, v - 1))} className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-14 text-center border border-blue-300 rounded-md px-1 py-1 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            aria-label="Stock quantity"
                          />
                          <button onClick={() => setEditValue(v => v + 1)} className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm font-bold ${item.stock === 0 ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                          {item.stock}
                        </span>
                      )}
                    </td>
                    {/* Reserved */}
                    <td className="px-4 py-3.5 text-center text-sm text-slate-500">{item.reserved}</td>
                    {/* Available */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-sm font-bold ${item.available === 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {isEditing ? Math.max(0, editValue - item.reserved) : item.available}
                      </span>
                    </td>
                    {/* Reorder Level */}
                    <td className="px-4 py-3.5 text-center text-sm text-slate-500">{item.reorderLevel}</td>
                    {/* Sold */}
                    <td className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">{item.sold}</td>
                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {isEditing
                          ? editValue === 0 ? 'Out of Stock' : editValue <= item.reorderLevel ? 'Low Stock' : 'In Stock'
                          : item.status
                        }
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveEdit(item)}
                            className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition-colors"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center hover:bg-red-200 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors mx-auto"
                          title="Edit Stock"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Warehouse className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">No products found</h3>
            <p className="text-sm text-slate-500">
              {search ? `No results for "${search}". Try a different search term.` : 'No products match the selected filter.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} items
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    page === p ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Health Bar */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          Inventory Health
        </h3>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-200">
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${(items.filter(i => i.status === 'In Stock').length / totalItems) * 100}%` }}
            title={`In Stock: ${items.filter(i => i.status === 'In Stock').length}`}
          />
          <div
            className="bg-amber-500 transition-all duration-500"
            style={{ width: `${(lowStockCount / totalItems) * 100}%` }}
            title={`Low Stock: ${lowStockCount}`}
          />
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${(outOfStockCount / totalItems) * 100}%` }}
            title={`Out of Stock: ${outOfStockCount}`}
          />
        </div>
        <div className="flex gap-6 mt-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            In Stock ({items.filter(i => i.status === 'In Stock').length})
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Low Stock ({lowStockCount})
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Out of Stock ({outOfStockCount})
          </div>
        </div>
      </div>
    </div>
  );
}
