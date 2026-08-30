'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Clock, Plus, Minus, Flame, Timer, ChevronRight, Sparkles } from 'lucide-react';
import {
  FRUITS_VEGETABLES, FRESH_MEAT_FISH, DAIRY_BREAD, DAILY_ESSENTIALS,
  groceryDiscountPercent,
} from '@/lib/demo-data/grocery-home';
import type { GroceryProduct } from '@/lib/demo-data/grocery-home';
import { groceryApi } from '@/lib/grocery-api';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { productPath } from '@/lib/grocery/urls';
import { zoneHref } from '@/lib/routes/zone-href';

/* ── Flash deal mock data ──────────────────────────────────────────────── */
const FLASH_DEALS = [
  { id: 'fd-1', title: 'Morning Fresh Deals', emoji: '🌅', endsAt: Date.now() + 3 * 3600_000, banner: 'from-amber-500 to-orange-600', products: FRUITS_VEGETABLES.slice(0, 4) },
  { id: 'fd-2', title: 'Meat & Fish Bonanza', emoji: '🥩', endsAt: Date.now() + 6 * 3600_000, banner: 'from-red-500 to-rose-600', products: FRESH_MEAT_FISH.slice(0, 4) },
  { id: 'fd-3', title: 'Dairy Delights', emoji: '🥛', endsAt: Date.now() + 1.5 * 3600_000, banner: 'from-blue-500 to-indigo-600', products: DAIRY_BREAD.slice(0, 4) },
  { id: 'fd-4', title: 'Pantry Essentials Rush', emoji: '🏪', endsAt: Date.now() + 8 * 3600_000, banner: 'from-emerald-500 to-teal-600', products: DAILY_ESSENTIALS.slice(0, 4) },
];

/* ── Countdown Hook ────────────────────────────────────────────────────── */
function useCountdown(endTime: number) {
  const calc = useCallback(() => {
    const diff = Math.max(0, endTime - Date.now());
    return {
      hours: Math.floor(diff / 3600_000),
      minutes: Math.floor((diff % 3600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1000),
      expired: diff <= 0,
    };
  }, [endTime]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

/* ── Countdown Display ─────────────────────────────────────────────────── */
function CountdownBadge({ endTime }: { endTime: number }) {
  const { tr } = useGroceryLocale();
  const { hours, minutes, seconds, expired } = useCountdown(endTime);
  if (expired) return <span className="text-xs font-bold text-red-400">{tr('Ended')}</span>;
  return (
    <div className="flex items-center gap-1">
      <Timer className="w-3.5 h-3.5" />
      <div className="flex gap-0.5">
        {[
          { val: hours, label: 'h' },
          { val: minutes, label: 'm' },
          { val: seconds, label: 's' },
        ].map(({ val, label }) => (
          <span key={label} className="bg-white/20 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs font-black tabular-nums">
            {String(val).padStart(2, '0')}<span className="text-[9px] font-medium opacity-70">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Product Card ──────────────────────────────────────────────────────── */
function DealProductCard({ product }: { product: GroceryProduct }) {
  const { formatPrice, tr } = useGroceryLocale();
  const [qty, setQty] = useState(0);
  const discount = groceryDiscountPercent(product.mrp, product.price);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col relative group hover:shadow-lg transition-all duration-200">
      {discount > 0 && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md z-10 flex items-center gap-0.5">
          <Flame className="w-2.5 h-2.5" />{discount}% OFF
        </div>
      )}
      <Link href={zoneHref(productPath({ id: product.id, name: product.name, storeName: product.storeName }))} className="block">
        <div className="w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
          <span className="text-4xl">{product.emoji}</span>
        </div>
        <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">{product.brand}</p>
        <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-1 line-clamp-2 group-hover:text-green-600 transition-colors">{product.name}</h3>
        <p className="text-xs text-slate-500 font-medium mb-2">{product.weight}</p>
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

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function FlashDealsPage() {
  const { tr } = useGroceryLocale();
  const [deals, setDeals] = useState<typeof FLASH_DEALS>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load the live deals.
   *
   * The previous version called `groceryApi.getFlashDeals?.()` — an optional-call
   * guard on a method that always exists — and its success branch was the comment
   * "merge with demo if API returns data" and nothing else. The response was
   * discarded whatever it contained, so this page always showed `FLASH_DEALS`, the
   * demo array, including countdown timers on deals that had never existed.
   */
  useEffect(() => {
    let cancelled = false;
    groceryApi.getFlashDeals({ status: 'active', limit: 50 })
      .then((res: any) => {
        if (cancelled) return;
        setDeals((res?.data ?? []) as typeof FLASH_DEALS);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load flash deals'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = activeTab === 'all' ? deals : deals.filter(d => d.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />{tr('Back to Grocery')}</Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{tr('Flash Deals')}</h1>
              <p className="text-sm text-white/80 font-medium mt-0.5">⚡ Limited time offers — grab before they&apos;re gone!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'all' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              🔥 All Deals
            </button>
            {deals.map(d => (
              <button
                key={d.id}
                onClick={() => setActiveTab(d.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === d.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {d.emoji} {d.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deals Sections */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {filtered.map(deal => (
          <section key={deal.id}>
            {/* Deal Banner */}
            <div className={`bg-gradient-to-r ${deal.banner} rounded-2xl p-5 text-white mb-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{deal.emoji}</span>
                <div>
                  <h2 className="text-lg font-black">{deal.title}</h2>
                  <p className="text-sm text-white/80 font-medium flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />{tr('Up to 60% off on selected items')}</p>
                </div>
              </div>
              <CountdownBadge endTime={deal.endsAt} />
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {deal.products.map(p => (
                <DealProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ))}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" aria-busy="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-56 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* An outage is not "no deals today" — the customer can retry one of them. */}
        {!loading && error && (
          <div role="alert" className="text-center py-20">
            <span className="text-6xl mb-4 block" aria-hidden="true">⚠️</span>
            <h3 className="text-xl font-bold text-slate-700 mb-2">{tr('We could not load today&apos;s deals')}</h3>
            <p className="text-sm text-slate-500">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 inline-flex items-center gap-1 text-green-600 font-bold text-sm hover:text-green-700">{tr('Try again')}</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block" aria-hidden="true">⚡</span>
            <h3 className="text-xl font-bold text-slate-700 mb-2">{tr('No active deals right now')}</h3>
            <p className="text-sm text-slate-500">{tr('Check back soon — new flash deals drop every day!')}</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-1 text-green-600 font-bold text-sm hover:text-green-700">{tr('Continue Shopping')}<ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
