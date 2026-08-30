'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, ChevronRight, Timer, Star, Truck } from 'lucide-react';
import { discountPercent } from '@/lib/marketplace/pricing';
import type { HomeProduct } from '@/lib/marketplace/types';
import { useRegion } from '@/lib/contexts/region-context';
import { ProductCard, ProductCardSkeleton } from '../components/product-card';
import { FeedEmptyState } from '../components/feed-empty-state';
import { mapCatalogList } from '@/lib/api/map-catalog-product';
import { apiFetch } from '@/lib/api-fetch';

/**
 * Counts down to the campaign's own close.
 *
 * This used to count to 23:59 local time, every day, whatever was on offer —
 * copied from the Deals of the Day page, where a midnight reset is correct. A
 * flash deal is not a daily deal: it runs in a window the campaign declares, so
 * a sale closing at 14:00 displayed nine hours that did not exist.
 *
 * `GET /marketplace/flash-deals` returns `expiresAt` — the soonest `windowEnd`
 * across the live campaigns — precisely so the storefront does not have to
 * guess. Until that arrives, and when no campaign is live, there is nothing to
 * count and the clock is hidden rather than invented.
 */
function useCountdown(endsAt: string | null) {
  const [time, setTime] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!endsAt) { setTime(null); return; }
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) { setTime(null); return; }

    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      setTime({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return time;
}

export default function FlashDealsPage() {
  const { formatCurrencyValue, selectedRegion } = useRegion();
  // Empty until the feed answers — see the note on the deals page for why
  // seeding with the bundled demo array produced clickable dead product links.
  const [deals, setDeals] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const countdown = useCountdown(endsAt);

  /**
   * Retry.
   *
   * The resets live here rather than at the top of the fetch effect: clearing
   * them in the effect body is a synchronous setState on every run, which the
   * React compiler flags as a cascading render. An event handler is the right
   * place to say "start over".
   */
  const retry = () => { setFailed(false); setLoading(true); setEndsAt(null); setReloadKey(k => k + 1); };

  useEffect(() => {
    let cancelled = false;
    // `apiFetch` carries the region headers the gateway scopes flash deals on.
    apiFetch('/marketplace/flash-deals', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
      .then(async r => {
        if (!r.ok) throw new Error(String(r.status));
        // Read the raw body once: `mapCatalogList` returns only the product
        // rows, and `expiresAt` sits beside them on the envelope.
        const body = await r.clone().json();
        if (!cancelled) setEndsAt(body?.data?.expiresAt ?? body?.expiresAt ?? null);
        // The rows are at `data.data`; `d.data?.length` read an object's length,
        // so this mapper never ran and the page stayed on its demo array. The
        // old mapper also priced from `sellingPrice`, which the listing endpoint
        // does not return — every deal would have shown ₹0.
        return mapCatalogList(await r.json()).map(p => ({ ...p, icon: 'Zap' })) as HomeProduct[];
      })
      .then(rows => { if (!cancelled) setDeals(rows); })
      // No bundled fallback. Flash deals are now a real campaign with a real
      // window (`marketplace.flash_deals`), so "no live campaign" is a true and
      // ordinary answer — filling the grid with `FLASH_DEALS` contradicted the
      // very pipeline that decides what is on offer.
      .catch(() => { if (!cancelled) { setDeals([]); setEndsAt(null); setFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedRegion, reloadKey]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50/30">
      {/* Hero */}
      <section className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 fill-yellow-300 text-yellow-300" />
              <h1 className="text-3xl font-extrabold">Flash Deals</h1>
            </div>
            <p className="text-white/80 text-lg">Lightning-fast discounts — grab them before they're gone!</p>
          </div>
          {/* Hidden entirely when no campaign is live: a clock counting down to
              nothing is worse than no clock. */}
          {countdown && (
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3">
              <Timer className="w-5 h-5 text-yellow-200" />
              <span className="text-sm text-white/70 font-medium mr-1">Ends in</span>
              <div className="flex gap-1.5">
                {[
                  { val: pad(countdown.hours), label: 'h' },
                  { val: pad(countdown.minutes), label: 'm' },
                  { val: pad(countdown.seconds), label: 's' },
                ].map(({ val, label }) => (
                  <div key={label} className="bg-white/20 rounded-lg px-2.5 py-1 text-center min-w-[40px]">
                    <div className="text-xl font-black tabular-nums">{val}</div>
                    <div className="text-[9px] uppercase tracking-wide opacity-70">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Flash Deals</span>
        </nav>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Zap className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700 font-medium">
            {deals.length > 0
              ? <><span className="font-bold">{deals.length} flash {deals.length === 1 ? 'deal' : 'deals'}</span> available — prices are time-limited!</>
              : <>Flash deals run in short bursts — the next campaign will appear here.</>}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <FeedEmptyState
            icon={Zap}
            failed={failed}
            emptyTitle="No flash deals live right now"
            emptyMessage="Flash sales run for a limited window. The next one will show up here as soon as it opens."
            onRetry={retry}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {deals.map(product => (
              <div key={product.id} className="relative">
                <div className="absolute -top-1 -left-1 z-20 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-yellow-300 text-yellow-300" /> FLASH
                </div>
                <ProductCard product={product} formatCurrencyValue={formatCurrencyValue} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
