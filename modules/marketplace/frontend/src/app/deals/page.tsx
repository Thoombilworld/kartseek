'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Flame, ChevronRight, Timer, Star, Truck, Heart, Zap } from 'lucide-react';
import { discountPercent } from '@/lib/marketplace/pricing';
import type { HomeProduct } from '@/lib/marketplace/types';
import { useRegion } from '@/lib/contexts/region-context';
import { ProductCard, ProductCardSkeleton } from '../components/product-card';
import { FeedEmptyState } from '../components/feed-empty-state';
import { mapCatalogList } from '@/lib/api/map-catalog-product';
import { apiFetch } from '@/lib/api-fetch';

function useCountdown(targetHour = 23, targetMin = 59) {
  const [time, setTime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(targetHour, targetMin, 59, 999);
      if (end <= now) end.setDate(end.getDate() + 1);
      const diff = Math.max(0, end.getTime() - now.getTime());
      setTime({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetHour, targetMin]);

  return time;
}

export default function DealsPage() {
  const { formatCurrencyValue, selectedRegion } = useRegion();
  // Starts empty, not on the bundled demo array. Seeding with demo products
  // meant a failed request left fabricated deals on screen, each linking to
  // `/marketplace/product/<demo id>` — an id that exists only in this bundle and
  // 404s. `displayOnly` keeps any offline fallback unclickable.
  const [deals, setDeals] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  // Distinguishes "the request failed" from "there are no deals today". The
  // `catch` used to answer both with `DEALS_OF_DAY`, so an unreachable gateway
  // showed a full grid of bundled products at prices nothing had quoted.
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const countdown = useCountdown();

  /**
   * Retry.
   *
   * The resets live here rather than at the top of the fetch effect: clearing
   * them in the effect body is a synchronous setState on every run, which the
   * React compiler flags as a cascading render. An event handler is the right
   * place to say "start over".
   */
  const retry = () => { setFailed(false); setLoading(true); setReloadKey(k => k + 1); };

  useEffect(() => {
    let cancelled = false;
    // `apiFetch`, not a bare `fetch`: it attaches the region headers the gateway
    // scopes the feed on. Without them the deals shown were those for whatever
    // market the server's egress IP resolved to, not the one being browsed.
    apiFetch('/marketplace/deals-of-the-day', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
      .then(async r => {
        // A non-OK response is a failure, not an empty catalogue. Mapping it to
        // `[]` made a 500 read as "no deals today" on screen.
        if (!r.ok) throw new Error(`Deals request failed (${r.status})`);
        return mapCatalogList(await r.json());
      })
      .then(rows => { if (!cancelled) setDeals(rows); })
      .catch(() => { if (!cancelled) { setDeals([]); setFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedRegion, reloadKey]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50/30">
      {/* Hero */}
      <section className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Flame className="w-8 h-8" />
                <h1 className="text-3xl font-extrabold">Deals of the Day</h1>
              </div>
              <p className="text-white/80 text-lg">Handpicked deals, refreshed daily — don't miss out!</p>
            </div>
            {/* Countdown Timer */}
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3">
              <Timer className="w-5 h-5 text-amber-200" />
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
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Deals of the Day</span>
        </nav>

        {/* Urgency Banner */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Zap className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700 font-medium">
            {/* Pluralised, and silent about a count we do not have. */}
            {deals.length > 0
              ? <><span className="font-bold">{deals.length} {deals.length === 1 ? 'deal' : 'deals'}</span> available today — prices reset at midnight!</>
              : <>Today’s deals refresh at midnight.</>}
          </p>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <FeedEmptyState
            icon={Flame}
            failed={failed}
            emptyTitle="No deals running right now"
            emptyMessage="Deals of the Day refresh every midnight. Check back tomorrow, or browse the full catalogue."
            onRetry={retry}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {deals.map((product) => (
              <ProductCard key={product.id} product={product} formatCurrencyValue={formatCurrencyValue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
