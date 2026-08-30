'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Timer, Tag, Flame, Gift, Star, Truck, BadgePercent, Crown, TrendingUp } from 'lucide-react';
import { discountPercent } from '@/lib/marketplace/pricing';
import type { HomeProduct } from '@/lib/marketplace/types';
import { mapCatalogList } from '@/lib/api/map-catalog-product';
import { FeedEmptyState } from '../components/feed-empty-state';
import { apiFetch } from '@/lib/api-fetch';
import { PriceTag } from '../components/price-tag';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { productPath } from '@/lib/marketplace/product-url';

function OfferCard({ product }: { product: HomeProduct }) {
  const disc = discountPercent(product.mrp, product.price);
  // Unclickable without an id — see the offline fallback below. A card that links
  // to /marketplace/product/ with no id can only ever render the 404 page.
  const Card = product.id ? Link : 'div';
  const cardProps = product.id ? { href: productPath(product) } : {};
  return (
    <Card {...(cardProps as any)} className="bg-white border border-slate-200 rounded-sm p-3 hover:shadow-lg transition-all group flex flex-col h-full relative">
      {disc > 0 && <div className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 z-10">{disc}% OFF</div>}
      <ProductThumb
        src={product.imageUrl}
        alt={product.title}
        brand={product.brand}
        fallbackIcon={Tag}
        sizes={THUMB_SIZES.grid4}
        className="mb-3 rounded-lg border border-slate-100"
      />
      <div className="flex-1 flex flex-col">
        <p className="text-[11px] text-slate-500 font-semibold mb-1 uppercase">{product.brand}</p>
        <h3 className="font-medium text-slate-900 text-sm mb-1.5 line-clamp-2 group-hover:text-blue-600">{product.title}</h3>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">{product.rating || '—'} <Star className="w-2.5 h-2.5 fill-white" /></span>
          <span className="text-xs text-slate-500">({product.reviews || 0})</span>
        </div>
        <div className="mt-auto">
          <PriceTag price={product.price} mrp={product.mrp} discount={disc} />
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><Truck className="w-3 h-3" />Free Delivery</p>
        </div>
      </div>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-3">
      {/* Same ratio as the frame it stands in for, so the grid does not reflow
          when the real cards arrive. */}
      <div className="aspect-square rounded-lg bg-slate-100 animate-pulse mb-3" />
      <div className="h-3 bg-slate-100 rounded animate-pulse mb-2 w-2/3" />
      <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
    </div>
  );
}

/**
 * This page used to render bundled demo arrays and never call the API at all —
 * its cards only opened because those demo ids happened to still exist in the
 * database. It now shows the real deal feeds, priced off the buy-box listing.
 */
export default function OffersPage() {
  const [flash, setFlash] = useState<HomeProduct[]>([]);
  const [daily, setDaily] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  // Both feeds failing is a different fact from both feeds being empty, and the
  // page has to be able to say which.
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
    // `apiFetch` rather than a bare `fetch` — both deal feeds are region-scoped
    // by the gateway, which falls back to geolocating its own egress IP when the
    // region headers are missing.
    // Resolves to `null` on failure so an errored feed stays distinguishable
    // from one that legitimately returned no rows.
    const get = (path: string): Promise<HomeProduct[] | null> =>
      apiFetch(path, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
        .then(async r => {
          if (!r.ok) throw new Error(String(r.status));
          return mapCatalogList(await r.json()) as HomeProduct[];
        })
        .catch(() => null);

    Promise.all([get('/marketplace/flash-deals'), get('/marketplace/deals-of-the-day')])
      .then(([f, d]) => {
        if (cancelled) return;
        // The bundled `FLASH_DEALS` / `DEALS_OF_DAY` fallback that stood here
        // triggered on an *empty* response, not just an error — so a quiet
        // promotions period rendered a full page of invented offers. Stripping
        // the ids kept the cards unclickable but did nothing about the prices,
        // which is the part a shopper reads.
        setFlash(f ?? []);
        setDaily(d ?? []);
        setFailed(f === null && d === null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [reloadKey]);

  // "All Offers" is the union of the deal feeds. It used to re-filter by a
  // discount threshold, which now removes everything, because the API carries no
  // selling price to discount against.
  const unique = [...flash, ...daily].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

  return (
    <div className="max-w-[1400px] mx-auto px-3 xs:px-4 py-6 space-y-8">
      {/* Hero */}
      <div className="bg-linear-to-r from-red-600 via-orange-500 to-yellow-500 rounded-lg p-8 text-white relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><Flame className="w-6 h-6" /><span className="text-sm font-bold uppercase tracking-wider">Mega Sale Event</span></div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Offers & Deals</h1>
          <p className="text-white/90 text-sm max-w-md">Discover incredible savings across electronics, fashion, home & more. Limited time offers — shop now before they&apos;re gone!</p>
        </div>
      </div>

      {/* Quick Offer Banners */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* These were `<div>`s: four tiles that looked like the primary
            navigation of the page but were not clickable, each asserting a
            specific saving — "Up to 70% Off", "Extra 10% Off", "Min 30% Off" —
            that came from nothing and was shown whatever the catalogue held.
            They are links now, and the copy describes the destination instead
            of quoting a discount the page cannot substantiate. */}
        {[
          { label: 'Flash Deals', desc: 'Time-limited campaigns', icon: Zap, color: 'from-red-500 to-rose-600', href: '/marketplace/flash-deals' },
          { label: 'Deals of the Day', desc: 'Refreshed every midnight', icon: BadgePercent, color: 'from-blue-500 to-indigo-600', href: '/marketplace/deals' },
          { label: 'Top Brands', desc: 'Shop by brand', icon: Crown, color: 'from-amber-500 to-orange-600', href: '/marketplace/brands/feed' },
          { label: 'New Arrivals', desc: 'Just landed', icon: Gift, color: 'from-emerald-500 to-teal-600', href: '/marketplace/new-arrivals' },
        ].map((b) => (
          <Link
            key={b.label}
            href={b.href}
            className={`bg-linear-to-br ${b.color} rounded-sm p-4 text-white relative overflow-hidden transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
          >
            <b.icon className="absolute -right-2 -bottom-2 w-20 h-20 text-white/10" />
            <h3 className="font-bold text-lg">{b.label}</h3>
            <p className="text-xs text-white/90 mt-0.5">{b.desc}</p>
          </Link>
        ))}
      </div>

      {!loading && unique.length === 0 ? (
        <FeedEmptyState
          icon={Flame}
          failed={failed}
          emptyTitle="No offers running right now"
          emptyMessage="Flash deals and daily deals both run in limited windows. New promotions will appear here as soon as they open."
          onRetry={retry}
        />
      ) : (
      <>
      {/* Flash Deals */}
      <section className="bg-white border border-slate-200 rounded-sm p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Zap className="w-6 h-6 text-red-500 fill-red-500" />Flash Deals</h2>
          {/* This read `Ends in: 04h 12m 33s` — a fixed string, identical on
              every render and every day, next to deals whose real windows come
              from the campaign. A link to the flash-deals page, which owns the
              live countdown, is honest; a frozen clock is not. */}
          <Link href="/marketplace/flash-deals" className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-sm font-semibold border border-red-100 hover:bg-red-100 transition-colors">
            <Timer className="w-4 h-4" />View live countdown
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            : flash.slice(0, 10).map((p, i) => <OfferCard key={p.id || `flash-${i}`} product={p} />)}
        </div>
      </section>

      {/* Deals of the Day */}
      <section className="bg-blue-50 border border-blue-100 rounded-sm p-4">
        <div className="flex items-center justify-between mb-4 border-b border-blue-200 pb-2">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-600" />Deals of the Day</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            : daily.slice(0, 5).map((p, i) => <OfferCard key={p.id || `daily-${i}`} product={p} />)}
        </div>
      </section>

      {/* All Offers */}
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">
          All Offers{loading ? '' : ` (${unique.length} products)`}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)
            : unique.slice(0, 20).map((p, i) => <OfferCard key={`all-${p.id || i}`} product={p} />)}
        </div>
      </section>
      </>
      )}
    </div>
  );
}
