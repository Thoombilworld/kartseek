'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, X, Trash2, Plus, Minus, Eye } from 'lucide-react';
import {
  FRUITS_VEGETABLES, FRESH_MEAT_FISH, DAIRY_BREAD,
  groceryDiscountPercent,
} from '@/lib/demo-data/grocery-home';
import type { GroceryProduct } from '@/lib/demo-data/grocery-home';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { productPath } from '@/lib/grocery/urls';

const STORAGE_KEY = 'kartseek_grocery_recently_viewed';

function getRecentlyViewed(): (GroceryProduct & { viewedAt: number })[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

/* ── Product Card ──────────────────────────────────────────────────────── */
function RecentProductCard({
  product, onRemove }: { product: GroceryProduct & { viewedAt: number }; onRemove: (id: string) => void }) {
  const { formatPrice, tr } = useGroceryLocale();
  const [qty, setQty] = useState(0);
  const discount = groceryDiscountPercent(product.mrp, product.price);
  const viewedAgo = getTimeAgo(product.viewedAt);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col relative group hover:shadow-md transition-all duration-200">
      {discount > 0 && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">{discount}% OFF</div>
      )}
      <button
        onClick={() => onRemove(product.id)}
        className="absolute top-2 right-2 w-6 h-6 bg-slate-100 hover:bg-red-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label={tr('Remove')}
      >
        <X className="w-3 h-3 text-slate-500 hover:text-red-500" />
      </button>
      <Link href={productPath({ id: product.id, name: product.name, storeName: product.storeName })} className="block">
        <div className="w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-2 flex items-center justify-center">
          <span className="text-4xl">{product.emoji}</span>
        </div>
        <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">{product.brand}</p>
        <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-1 line-clamp-2 group-hover:text-green-600 transition-colors">{product.name}</h3>
        <p className="text-xs text-slate-500 font-medium">{product.weight}</p>
        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3" /> Viewed {viewedAgo}
        </p>
      </Link>
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-900">{formatPrice(product.price)}</span>
          {product.mrp > product.price && <span className="text-[10px] text-slate-400 line-through">{formatPrice(product.mrp)}</span>}
        </div>
        {qty === 0 ? (
          <button onClick={() => setQty(1)} className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors flex items-center gap-1">{tr('ADD')}<Plus className="w-3 h-3" />
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-green-600 text-white rounded-lg overflow-hidden">
            <button onClick={() => setQty(q => Math.max(0, q - 1))} className="px-2 py-1.5 hover:bg-green-700"><Minus className="w-3 h-3" /></button>
            <span className="text-sm font-bold px-1 min-w-[20px] text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="px-2 py-1.5 hover:bg-green-700"><Plus className="w-3 h-3" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function RecentlyViewedPage() {
  const { tr } = useGroceryLocale();
  const [items, setItems] = useState<(GroceryProduct & { viewedAt: number })[]>([]);

  useEffect(() => {
    const stored = getRecentlyViewed();
    if (stored.length > 0) {
      setItems(stored);
    } else {
      // Demo data fallback
      const demo = [...FRUITS_VEGETABLES.slice(0, 3), ...FRESH_MEAT_FISH.slice(0, 2), ...DAIRY_BREAD.slice(0, 3)]
        .map((p, i) => ({ ...p, viewedAt: Date.now() - (i + 1) * 1800_000 }));
      setItems(demo);
    }
  }, []);

  const removeItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const clearAll = () => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <Link href="/grocery" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" />{tr('Back to Grocery')}</Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{tr('Recently Viewed')}</h1>
                <p className="text-sm text-slate-500 font-medium">{items.length} items</p>
              </div>
            </div>
            {items.length > 0 && (
              <button onClick={clearAll} className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-sm font-bold transition-colors">
                <Trash2 className="w-4 h-4" />{tr('Clear All')}</button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {items.map(p => (
              <RecentProductCard key={p.id} product={p} onRemove={removeItem} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">👀</span>
            <h3 className="text-xl font-bold text-slate-700 mb-2">{tr('Nothing viewed yet')}</h3>
            <p className="text-sm text-slate-500 mb-4">Start browsing and your recently viewed items will appear here</p>
            <Link href="/grocery" className="inline-flex items-center gap-1 bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors">{tr('Browse Grocery')}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
