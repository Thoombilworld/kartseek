'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, ShoppingCart, Star, Truck, Search, Check, Package,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getOrders, addToCart } from '@/lib/api/marketplace';
import { productPath } from '@/lib/marketplace/product-url';

interface PastPurchase {
  id: string; productId: string; title: string; brand: string;
  price: number; mrp: number; rating: number; reviews: number;
  lastOrdered: string; orderId: string; timesOrdered: number; category: string;
}

/**
 * Collapse order history into one row per product.
 *
 * Every row here used to be hardcoded, with `productId`s like 'prod-apple-15'
 * that are not in the catalogue — so all six "buy again" links led to a 404 and
 * the page showed purchases the signed-in user had never made.
 *
 * `items` is a jsonb snapshot taken at purchase time, so `unitPrice` is what was
 * actually paid; there is no MRP in the snapshot, hence mrp === price and no
 * discount badge.
 */
function collapseOrders(orders: any[]): PastPurchase[] {
  const byProduct = new Map<string, PastPurchase>();
  for (const order of orders) {
    // `placedAt` is the field order-service sends; `createdAt` alone left every
    // card reading "Last ordered:" with nothing after it.
    const placed = order?.placedAt ?? order?.createdAt ?? order?.created_at ?? '';
    for (const item of Array.isArray(order?.items) ? order.items : []) {
      const productId = String(item?.productId ?? '');
      if (!productId) continue;             // nothing to reorder or link to
      const qty = Number(item?.quantity ?? 1) || 1;
      const existing = byProduct.get(productId);
      if (existing) {
        existing.timesOrdered += qty;
        // Orders arrive newest-first, so the first sighting is the latest one.
        continue;
      }
      // The snapshot spells the paid price `price`; reading only `unitPrice`
      // meant every product on this page was listed at ₹0.00.
      const price = Number(item?.price ?? item?.unitPrice ?? 0) || 0;
      byProduct.set(productId, {
        id: `${order?.id ?? order?.orderNumber ?? 'order'}-${productId}`,
        productId,
        title: item?.name ?? 'Product',
        brand: item?.brand ?? '',
        price,
        mrp: price,
        rating: 0,
        reviews: 0,
        lastOrdered: placed ? String(placed).slice(0, 10) : '',
        orderId: order?.orderNumber ?? order?.id ?? '',
        timesOrdered: qty,
        category: '',
      });
    }
  }
  return [...byProduct.values()];
}

export default function BuyAgainPage() {
  const { formatCurrencyValue: fmt } = useRegion();
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [purchases, setPurchases] = useState<PastPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getOrders()
      .then((res: any) => {
        if (cancelled) return;
        const rows = res?.data ?? (Array.isArray(res) ? res : []);
        setPurchases(collapseOrders(Array.isArray(rows) ? rows : []));
      })
      .catch(() => { if (!cancelled) setPurchases([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => purchases.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())
  ), [purchases, search]);

  const handleAdd = (id: string) => {
    const row = purchases.find(p => p.id === id);
    setAdded(prev => new Set(prev).add(id));
    if (row) addToCart(row.productId, 1).catch(() => setAdded(prev => { const n = new Set(prev); n.delete(id); return n; }));
  };

  if (!loading && purchases.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-6">
          <RefreshCw className="w-12 h-12 text-blue-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Nothing to buy again yet</h2>
        <p className="text-slate-500 mb-6 max-w-sm">Items from your past orders show up here so you can reorder them in one tap.</p>
        <Link href="/" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Package className="w-5 h-5" /> Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-3 xs:px-4 py-6 space-y-5 pb-mobile-nav">
      <div className="flex items-center gap-3">
        <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div className="flex-1"><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><RefreshCw className="w-6 h-6 text-blue-600" />Buy Again</h1><p className="text-sm text-slate-500">Quickly reorder items you've purchased before</p></div>
      </div>

      {/* Search */}
      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search past purchases..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none" /></div>

      {/* Frequently Reordered */}
      {!search && purchases.some(p => p.timesOrdered >= 2) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Package className="w-5 h-5 text-blue-600" />Frequently Reordered</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {purchases.filter(p => p.timesOrdered >= 2).map(p => (
              <div key={p.id} className="bg-white rounded-xl p-3 border border-blue-100 flex items-center gap-3">
                <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center shrink-0"><ShoppingCart className="w-5 h-5 text-slate-200" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{p.title}</p>
                  <p className="text-xs text-slate-400">{p.timesOrdered}× ordered · {fmt(p.price)}</p>
                </div>
                <button onClick={() => handleAdd(p.id)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${added.has(p.id) ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {added.has(p.id) ? <Check className="w-3.5 h-3.5" /> : 'Add'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Past Purchases */}
      <div>
        <h2 className="font-bold text-slate-900 mb-3">All Past Purchases ({filtered.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(p => {
            const disc = Math.round(((p.mrp - p.price) / p.mrp) * 100);
            const isAdded = added.has(p.id);
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col h-full">
                <Link href={productPath({ id: p.productId, name: p.title })}>
                  <div className="w-full h-28 bg-slate-50 mb-2 flex items-center justify-center rounded-lg">
                    <ShoppingCart className="w-8 h-8 text-slate-200" />
                  </div>
                </Link>
                <p className="text-[10px] text-blue-600 font-bold uppercase">{p.brand}</p>
                <Link href={productPath({ id: p.productId, name: p.title })} className="font-medium text-sm text-slate-900 line-clamp-2 hover:text-blue-600 mt-0.5">{p.title}</Link>
                {/* The order snapshot carries no rating, so show one only when
                    there is a real value rather than a permanent "0 ★ (0)". */}
                {p.rating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">{p.rating} <Star className="w-2.5 h-2.5 fill-white" /></span>
                    <span className="text-[10px] text-slate-400">({p.reviews.toLocaleString()})</span>
                  </div>
                )}
                <div className="mt-auto pt-2">
                  <p className="text-lg font-black text-slate-900">{fmt(p.price)}</p>
                  {disc > 0 && <span className="text-[10px] text-emerald-600 font-bold">{disc}% off</span>}
                  <p className="text-[9px] text-slate-400 mt-1">Last ordered: {p.lastOrdered}</p>
                </div>
                <button onClick={() => handleAdd(p.id)} className={`w-full mt-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${isAdded ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-[#ff9f00] hover:bg-[#f39800] text-white'}`}>
                  {isAdded ? <><Check className="w-3.5 h-3.5" />Added to Cart</> : <><ShoppingCart className="w-3.5 h-3.5" />Add to Cart</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
