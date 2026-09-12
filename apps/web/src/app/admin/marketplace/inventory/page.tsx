'use client';
import React, { useState } from 'react';
import {
  Boxes,
  Search,
  AlertTriangle,
  PackageX,
  TrendingDown,
  Download,
  Eye,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
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

type InventoryItem = {
  id: string;
  product: string;
  sku: string;
  seller: string;
  country: string;
  stock: number;
  reserved: number;
  available: number;
  warehouse: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Discontinued';
  reorderPoint: number;
  lastUpdated: string;
  velocity: number; // units/day
};

const INVENTORY: InventoryItem[] = [
  {
    id: 'INV-001',
    product: 'iPhone 15 Pro 256GB — Natural Titanium',
    sku: 'APL-IP15P-256-NT',
    seller: 'Apple India Store',
    country: 'India',
    stock: 450,
    reserved: 32,
    available: 418,
    warehouse: 'Mumbai Hub',
    status: 'In Stock',
    reorderPoint: 100,
    lastUpdated: '2026-06-06',
    velocity: 18,
  },
  {
    id: 'INV-002',
    product: 'Samsung Galaxy S24 Ultra 512GB',
    sku: 'SAM-S24U-512-BK',
    seller: 'Samsung Official',
    country: 'India',
    stock: 89,
    reserved: 15,
    available: 74,
    warehouse: 'Delhi Hub',
    status: 'In Stock',
    reorderPoint: 50,
    lastUpdated: '2026-06-06',
    velocity: 12,
  },
  {
    id: 'INV-003',
    product: 'Nike Air Jordan 1 Retro High',
    sku: 'NIK-AJ1-RH-BW',
    seller: 'Nike India',
    country: 'India',
    stock: 12,
    reserved: 8,
    available: 4,
    warehouse: 'Bangalore Hub',
    status: 'Low Stock',
    reorderPoint: 20,
    lastUpdated: '2026-06-05',
    velocity: 5,
  },
  {
    id: 'INV-004',
    product: 'Dyson V15 Detect Absolute',
    sku: 'DYS-V15-ABS',
    seller: 'Gulf Electronics FZE',
    country: 'UAE',
    stock: 0,
    reserved: 0,
    available: 0,
    warehouse: 'Dubai Hub',
    status: 'Out of Stock',
    reorderPoint: 10,
    lastUpdated: '2026-06-04',
    velocity: 3,
  },
  {
    id: 'INV-005',
    product: 'Heritage Banarasi Silk Saree',
    sku: 'HER-BSS-001',
    seller: 'Heritage Silk House',
    country: 'India',
    stock: 28,
    reserved: 5,
    available: 23,
    warehouse: 'Varanasi',
    status: 'In Stock',
    reorderPoint: 10,
    lastUpdated: '2026-06-06',
    velocity: 2,
  },
  {
    id: 'INV-006',
    product: 'Sony WH-1000XM5',
    sku: 'SNY-WH1K-XM5',
    seller: 'Sony Store',
    country: 'India',
    stock: 8,
    reserved: 6,
    available: 2,
    warehouse: 'Mumbai Hub',
    status: 'Low Stock',
    reorderPoint: 15,
    lastUpdated: '2026-06-05',
    velocity: 7,
  },
  {
    id: 'INV-007',
    product: 'MacBook Air M3 13" 256GB',
    sku: 'APL-MBA-M3-256',
    seller: 'Apple India Store',
    country: 'India',
    stock: 220,
    reserved: 18,
    available: 202,
    warehouse: 'Mumbai Hub',
    status: 'In Stock',
    reorderPoint: 50,
    lastUpdated: '2026-06-06',
    velocity: 10,
  },
  {
    id: 'INV-008',
    product: 'Galaxy Z Fold5 256GB',
    sku: 'SAM-ZF5-256',
    seller: 'Gulf Electronics FZE',
    country: 'UAE',
    stock: 15,
    reserved: 3,
    available: 12,
    warehouse: 'Dubai Hub',
    status: 'Low Stock',
    reorderPoint: 20,
    lastUpdated: '2026-06-06',
    velocity: 4,
  },
  {
    id: 'INV-009',
    product: 'Power Bank 20000mAh',
    sku: 'QM-PB-20K',
    seller: 'QuickMart Express',
    country: 'India',
    stock: 0,
    reserved: 0,
    available: 0,
    warehouse: 'Delhi Hub',
    status: 'Discontinued',
    reorderPoint: 0,
    lastUpdated: '2026-05-20',
    velocity: 0,
  },
];

const STATUS_STYLES: Record<string, string> = {
  'In Stock': 'bg-emerald-50 text-emerald-700',
  'Low Stock': 'bg-amber-50 text-amber-700',
  'Out of Stock': 'bg-red-50 text-red-700',
  Discontinued: 'bg-slate-100 text-slate-500',
};

// ── Stock Health Bar ─────────────────────────────────────────────────────────
function StockBar({
  stock,
  reorderPoint,
  velocity,
}: {
  stock: number;
  reorderPoint: number;
  velocity: number;
}) {
  const daysOfStock = velocity > 0 ? Math.floor(stock / velocity) : stock > 0 ? 999 : 0;
  const pct = reorderPoint > 0 ? Math.min(100, (stock / (reorderPoint * 3)) * 100) : 100;
  const color =
    stock === 0 ? 'bg-red-500' : stock <= reorderPoint ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-20">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5">
        {daysOfStock > 90 ? '90+' : daysOfStock} days
      </p>
    </div>
  );
}

// ── Detail Drawer ────────────────────────────────────────────────────────────
function InventoryDrawer({ item: inv, onClose }: { item: InventoryItem; onClose: () => void }) {
  const daysOfStock =
    inv.velocity > 0 ? Math.floor(inv.stock / inv.velocity) : inv.stock > 0 ? 999 : 0;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-black text-slate-900">{inv.product}</h2>
            <p className="text-xs text-slate-500">{inv.sku}</p>
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
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[inv.status]}`}
            >
              {inv.status}
            </span>
          </div>

          <div
            className={`rounded-xl p-5 text-center ${inv.stock === 0 ? 'bg-red-50' : inv.stock <= inv.reorderPoint ? 'bg-amber-50' : 'bg-emerald-50'}`}
          >
            <p className="text-4xl font-black">{inv.available}</p>
            <p className="text-xs text-slate-500 mt-1">Available Units</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-slate-900">{inv.stock}</p>
              <p className="text-[10px] text-slate-500">Total</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-blue-700">{inv.reserved}</p>
              <p className="text-[10px] text-blue-600">Reserved</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-slate-900">
                {daysOfStock > 90 ? '90+' : daysOfStock}
              </p>
              <p className="text-[10px] text-slate-500">Days Left</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Seller</p>
              <p className="text-sm font-bold text-slate-900">{inv.seller}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Warehouse</p>
              <p className="text-sm font-bold text-slate-900">{inv.warehouse}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Reorder Point</p>
              <p className="text-sm font-bold text-amber-600">{inv.reorderPoint} units</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-500">Velocity</p>
              <p className="text-sm font-bold text-slate-900">{inv.velocity} units/day</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500">Region</p>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
              <CountryFlag code={COUNTRY_TO_CODE[inv.country] || 'IN'} size="sm" />
              {inv.country} · Last updated {inv.lastUpdated}
            </p>
          </div>

          {inv.stock > 0 && inv.stock <= inv.reorderPoint && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Low Stock Alert</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Stock ({inv.stock}) is below reorder point ({inv.reorderPoint}). Estimated
                  stockout in {daysOfStock} days at current velocity.
                </p>
              </div>
            </div>
          )}
          {inv.stock === 0 && inv.status !== 'Discontinued' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <PackageX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Out of Stock</p>
                <p className="text-xs text-red-700 mt-0.5">
                  This product is currently unavailable. Contact seller for restocking timeline.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'stock' | 'velocity'>('stock');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const PAGE_SIZE = 6;

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
  } = useAdminData(() => adminMarketplaceApi.getProducts({ country }), [country]);

  const {
    filtered: regionFiltered,
    regionLabel,
    isFiltered,
  } = useMarketplaceRegionFilter(INVENTORY);
  const filtered = regionFiltered
    .filter((inv) => {
      if (filter !== 'all' && inv.status !== filter) return false;
      if (
        search &&
        !inv.product.toLowerCase().includes(search.toLowerCase()) &&
        !inv.sku.toLowerCase().includes(search.toLowerCase()) &&
        !inv.seller.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      const m = sortDir === 'asc' ? 1 : -1;
      return sortBy === 'stock' ? (a.stock - b.stock) * m : (a.velocity - b.velocity) * m;
    });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalStock = regionFiltered.reduce((a, i) => a + i.stock, 0);
  const lowStockCount = regionFiltered.filter((i) => i.status === 'Low Stock').length;
  const oosCount = regionFiltered.filter((i) => i.status === 'Out of Stock').length;

  const toggleSort = (col: 'stock' | 'velocity') => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(col);
      setSortDir('asc');
    }
  };
  const SortIcon = ({ col }: { col: 'stock' | 'velocity' }) =>
    sortBy === col ? (
      sortDir === 'asc' ? (
        <ArrowUp className="w-3 h-3" />
      ) : (
        <ArrowDown className="w-3 h-3" />
      )
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Inventory Hub</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Centralized stock monitoring across all sellers
            and warehouses
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Sync
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
          <p className="text-sm font-bold opacity-80">Total Stock</p>
          <p className="text-3xl font-black mt-1">{totalStock.toLocaleString()}</p>
          <p className="text-xs opacity-60 mt-1">{regionFiltered.length} SKUs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500">In Stock</p>
          <p className="text-2xl font-black text-emerald-600">
            {regionFiltered.filter((i) => i.status === 'In Stock').length}
          </p>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-amber-600 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </p>
          <p className="text-2xl font-black text-amber-600">{lowStockCount}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-red-600 font-bold flex items-center gap-1">
            <PackageX className="w-3 h-3" />
            Out of Stock
          </p>
          <p className="text-2xl font-black text-red-600">{oosCount}</p>
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
            placeholder="Search product, SKU, or seller..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'].map((s) => (
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

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Product</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Seller</th>
              <th
                className="px-4 py-3 text-right font-semibold text-slate-500 text-xs cursor-pointer hover:text-blue-600"
                onClick={() => toggleSort('stock')}
              >
                Stock <SortIcon col="stock" />
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">
                Available
              </th>
              <th
                className="px-4 py-3 text-right font-semibold text-slate-500 text-xs cursor-pointer hover:text-blue-600"
                onClick={() => toggleSort('velocity')}
              >
                Velocity <SortIcon col="velocity" />
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Health</th>
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
                  <MarketplaceEmptyState title="No inventory items found" icon={Boxes} />
                </td>
              </tr>
            ) : (
              paged.map((inv) => (
                <tr
                  key={inv.id}
                  className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${inv.status === 'Out of Stock' ? 'bg-red-50/30' : inv.status === 'Low Stock' ? 'bg-amber-50/30' : ''}`}
                  onClick={() => setSelected(inv)}
                  tabIndex={0}
                  onKeyDown={activateOnKey(() => setSelected(inv))}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 text-xs truncate max-w-[200px]">
                      {inv.product}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">{inv.sku}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <CountryFlag code={COUNTRY_TO_CODE[inv.country] || 'IN'} size="sm" />
                      {inv.seller}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">{inv.stock}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                    {inv.available}
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs">
                    <span className="text-slate-600">{inv.velocity}/day</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StockBar
                      stock={inv.stock}
                      reorderPoint={inv.reorderPoint}
                      velocity={inv.velocity}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[inv.status]}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelected(inv)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">{filtered.length} items</p>
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

      {selected && <InventoryDrawer item={selected} onClose={() => setSelected(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
