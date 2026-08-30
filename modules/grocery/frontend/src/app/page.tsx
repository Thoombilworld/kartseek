'use client'; // grocery-home
import { useModuleTitle } from '@/hooks/useModuleTitle';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Star, Clock, MapPin, ChevronRight, ChevronDown, ChevronUp, Truck, ArrowRight, Search, Zap, TrendingUp, Award, Sparkles, Timer, Store, ShieldCheck, RefreshCw, Flame, BadgeCheck, Crown, Plus } from 'lucide-react';
import {
  GROCERY_CATEGORIES, GROCERY_HERO_BANNERS, GROCERY_TRUST_BADGES, GROCERY_FAQ, type GroceryStore, type GroceryBrand, type FlashDeal,
} from '@/lib/demo-data/grocery-home';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { getBannersForCountry, getCampaignsForCountry, getFAQForCountry, type CountryBrand } from '@/lib/demo-data/grocery-country-data';
import { useGroceryLayout } from '@/hooks/useGroceryLayout';
import { useGroceryHomeData } from '@/hooks/useGroceryData';
import { useRecommendations } from '@/lib/hooks/use-recommendations';
import { RecommendationCarousel, CrossModulePicks } from '@/components/recommendations';
import { forRegion } from '@/lib/marketplace/pricing';
import { formatActiveCountryList } from '@/lib/localization/countries';
import { geocodeArea, reverseGeocode } from '@/lib/location/geocode';
import { AutoScrollRow } from '@/components/grocery/auto-scroll-row';
import { storePath } from '@/lib/grocery/urls';
import { groceryApi } from '@/lib/grocery-api';

import { brandLogoUrl } from '@/lib/grocery/brand-logo';
import { railsFor, railHref } from '@/lib/grocery/store-rails';
import { deliveryWindow, distanceKm } from '@/lib/grocery/delivery-estimate';
import { useAsyncData } from '@/lib/hooks/use-async-data';
// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE: Lazy Section — defers rendering until visible in viewport
// ═══════════════════════════════════════════════════════════════════════════

function LazySection({ children, height = 280 }: { children: React.ReactNode; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (visible) return <>{children}</>;
  // `height` is a runtime value, so it must go through an inline style — a
  // template literal like `min-h-[${height}px]` is never emitted by Tailwind
  // (it scans source as plain text), which left these placeholders 0px tall
  // and collapsed every not-yet-visible section into the same scroll position.
  return (
    <div ref={ref} style={{ minHeight: `${height}px` }} className="animate-pulse bg-slate-50 rounded-xl" />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Section Header ────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, href, emoji, titleAr, badge }: { title: string; subtitle?: string; href?: string; emoji?: string; titleAr?: string; badge?: string }) {
  const { showArabic, tr } = useGroceryLocale();
  return (
    <div className="flex items-end justify-between mb-3 xs:mb-4">
      <div>
        <h2 className="text-base xs:text-lg md:text-xl font-bold text-slate-900 flex items-center gap-1.5 xs:gap-2">
          {emoji && <span>{emoji}</span>}
          {showArabic && titleAr ? titleAr : title}
          {badge && <span className="text-[9px] xs:text-xs bg-linear-to-r from-amber-400 to-orange-400 text-white px-1.5 xs:px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">{badge}</span>}
        </h2>
        {subtitle && <p className="text-xs xs:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="text-green-600 text-sm xs:text-base font-semibold flex items-center gap-0.5 hover:text-green-700 min-h-[44px] shrink-0 pl-2">
        {tr('View All')} <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// ── Enhanced Store Card ──────────────────────────────────────────────────

/*
 * Every store rail draws the same card: same width, same banner band, same round
 * crest. The variants below differ only in trim - gold chrome and a sponsorship
 * strip for `promoted`, a shorter info block for `compact` - never in geometry.
 * They used to measure 320x325, 260x287 and 300x90, the last with a 64px logo
 * floating in whitespace, so scrolling the page met three unrelated card designs
 * for the same kind of thing.
 */
/**
 * `logoUrl` on a store row has historically held an emoji rather than a URL, so
 * only something URL-shaped is treated as an image.
 */
const urlish = (v: unknown) => (typeof v === 'string' && /^(https?:\/\/|\/)/.test(v) ? v : undefined);

/**
 * How many brand marks the first row holds before the rest spill into the
 * second. Eight is roughly a desktop row's worth at 80px per mark, so the
 * overflow row earns its place instead of being an empty heading.
 */
const BRANDS_PER_ROW = 8;

const STORE_CARD_W = 'w-[260px] xs:w-[300px] md:w-[320px]';
const STORE_BANNER_H = 'h-32';

/**
 * The banner band: storefront artwork bled to all four edges with `object-cover`
 * (a masthead is drawn to be cropped; `contain` letterboxes a wide image into a
 * square and reads as a missing picture), a scrim so overlaid chips stay legible,
 * and the round crest on top of it as the store page header has it.
 */
function StoreBanner({
  banner, logo, emoji, crest, tint, className = '', children,
}: {
  banner?: string; logo?: string; emoji?: string;
  crest: string; tint: string; className?: string; children?: React.ReactNode;
}) {
  return (
    <div className={`${STORE_BANNER_H} ${tint} relative overflow-hidden ${className}`}>
      {banner && (
        <img
          src={banner}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      <div className={`absolute bottom-2 left-2 ${crest} rounded-full bg-white shadow-md overflow-hidden flex items-center justify-center`}>
        {logo
          ? <img src={logo} alt="" aria-hidden="true" className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-xl">{emoji}</span>}
      </div>
      {children}
    </div>
  );
}

function StoreCard({ store, variant = 'default' }: { store: GroceryStore; variant?: 'default' | 'promoted' | 'compact' }) {
  const { formatPrice, tr, config } = useGroceryLocale();
  const storeLogo = urlish((store as { logoUrl?: unknown }).logoUrl);
  const storeBanner = urlish((store as { bannerUrl?: unknown }).bannerUrl);

  if (variant === 'promoted') {
    return (
      <Link href={storePath(store)} className={`group relative bg-linear-to-br from-amber-50 via-white to-orange-50 rounded-2xl border-2 border-amber-200/70 shadow-md hover:shadow-xl hover:border-amber-300 transition-all overflow-hidden ${STORE_CARD_W} shrink-0`}>
        {/* Promoted Badge */}
        <div className="absolute top-0 left-0 right-0 bg-linear-to-r from-amber-500 via-orange-500 to-amber-500 text-white text-sm font-bold text-center py-1 tracking-wider flex items-center justify-center gap-1">
          <Crown className="w-4 h-4" />{tr('SPONSORED STORE')}<Crown className="w-4 h-4" />
        </div>
        <StoreBanner
          banner={storeBanner}
          logo={storeLogo}
          emoji={store.emoji}
          crest="w-12 h-12"
          tint="bg-linear-to-br from-amber-100/50 to-orange-100/30"
          className="pt-5"
        >
          {store.offerBadge && (
            <span className="absolute bottom-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{store.offerBadge}</span>
          )}
        </StoreBanner>
        {/* Store Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-bold text-sm text-slate-900 leading-tight line-clamp-1">{store.name}</h3>
            {store.rating > 0 && (
              <span className="flex items-center gap-0.5 text-base font-bold text-amber-600 shrink-0 bg-amber-50 px-1.5 py-0.5 rounded-full">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{store.rating}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{store.category} • {store.reviewCount} {tr('ratings')}</p>
          <div className="flex items-center gap-3 mt-2.5 text-sm text-slate-500">
            <span className="flex items-center gap-0.5"><Clock className="w-4 h-4 text-green-500" />{store.deliveryTime}</span>
            <span className="flex items-center gap-0.5"><MapPin className="w-4 h-4 text-blue-500" />{store.distance}</span>
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-amber-100">
            <span className="text-sm text-slate-400">{tr('Min. order')} {formatPrice(store.minOrder)}</span>
            <span className={`text-sm font-semibold ${store.deliveryFee === 0 ? 'text-green-600' : 'text-slate-500'}`}>
              {store.deliveryFee === 0 ? tr('Free Delivery') : `${formatPrice(store.deliveryFee)} ${tr('Delivery')}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {store.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-semibold">{tag}</span>
            ))}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={storePath(store)} className={`group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all overflow-hidden ${STORE_CARD_W} shrink-0`}>
        <StoreBanner
          banner={storeBanner}
          logo={storeLogo}
          emoji={store.emoji}
          crest="w-11 h-11"
          tint="bg-linear-to-br from-green-50 to-emerald-50"
        >
          {store.offerBadge && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">{store.offerBadge}</span>
          )}
        </StoreBanner>
        <div className="p-3">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-bold text-sm text-slate-900 leading-tight line-clamp-1">{store.name}</h3>
            {store.isPromoted && <BadgeCheck className="w-4.5 h-4.5 text-amber-500 shrink-0" />}
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{store.category} • {store.distance}</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
            {store.rating > 0 && (
              <span className="flex items-center gap-0.5 font-bold text-amber-600">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{store.rating}
              </span>
            )}
            <span className="flex items-center gap-0.5"><Clock className="w-4 h-4 text-green-500" />{store.deliveryTime}</span>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={storePath(store)} className={`group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden ${STORE_CARD_W} shrink-0`}>
      <StoreBanner
        banner={storeBanner}
        logo={storeLogo}
        emoji={store.emoji}
        crest="w-11 h-11"
        tint="bg-linear-to-br from-green-50 to-emerald-50"
        className={!store.isOpen ? 'opacity-50' : ''}
      >
        {store.offerBadge && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">{store.offerBadge}</span>
        )}
        {store.isPromoted && (
          <span className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded">⭐ Featured</span>
        )}
        {!store.isOpen && (
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-base font-bold">{tr('Closed')}</span>
        )}
      </StoreBanner>
      {/* Store Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-bold text-sm text-slate-900 leading-tight line-clamp-1">{store.name}</h3>
          {store.rating > 0 && (
            <span className="flex items-center gap-0.5 text-base font-bold text-amber-600 shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{store.rating}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 mt-0.5">{store.category} • {store.reviewCount} {tr('ratings')}</p>
        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
          <span className="flex items-center gap-0.5"><Clock className="w-4 h-4" />{store.deliveryTime}</span>
          <span className="flex items-center gap-0.5"><MapPin className="w-4 h-4" />{store.distance}</span>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
          <span className="text-sm text-slate-400">{tr('Min. order')} {formatPrice(store.minOrder)}</span>
          <span className={`text-sm font-semibold ${store.deliveryFee === 0 ? 'text-green-600' : 'text-slate-500'}`}>
            {store.deliveryFee === 0 ? tr('Free Delivery') : `${formatPrice(store.deliveryFee)} ${tr('Delivery')}`}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Store Section (Horizontal Scroll) ────────────────────────────────────

function StoreSection({ title, titleAr, subtitle, stores, emoji, href, rail, variant = 'default', badge }: {
  title: string; titleAr?: string; subtitle?: string; stores: GroceryStore[];
  emoji?: string; href?: string; rail?: string; variant?: 'default' | 'promoted' | 'compact'; badge?: string;
}) {
  if (stores.length === 0) return null;
  /*
   * "View All" goes to the store directory filtered to this rail.
   *
   * It used to build `/grocery/search?section=${title...}` from the section's
   * heading — a string that `tr()` has already translated, so an Arabic reader's
   * links carried Arabic slugs, and `section` is a parameter the search page
   * never reads in any language. Every rail's "View All" opened a blank search.
   */
  return (
    <section className="mb-8">
      <SectionHeader title={title} titleAr={titleAr} subtitle={subtitle} emoji={emoji} badge={badge} href={href || (rail ? railHref(rail) : '/stores')} />
      {/* Auto-advancing, so the cards past the fold announce themselves. Pauses
          on hover, focus and touch, and stays still for reduced-motion users. */}
      <AutoScrollRow className="pb-2 -mx-2 px-2 2xs:-mx-3 2xs:px-3 xs:-mx-4 xs:px-4 md:mx-0 md:px-0">
        {stores.map(s => <StoreCard key={s.id} store={s} variant={variant} />)}
      </AutoScrollRow>
    </section>
  );
}

// ── Brand Card ───────────────────────────────────────────────────────────

function BrandCard({ brand }: { brand: CountryBrand | GroceryBrand }) {
  const { showArabic } = useGroceryLocale();
  const brandName = ('nameAr' in brand && showArabic && brand.nameAr) ? brand.nameAr : brand.name;
  const offerBadge = 'offerBadge' in brand ? brand.offerBadge : undefined;
  /**
   * Every brand resolves to a mark now.
   *
   * Previously only a brand carrying an explicit `logoUrl` got artwork and the
   * rest fell back to a coloured tile with an emoji, so a row mixed two visual
   * languages. `brandLogoUrl` prefers a licensed asset, then a file in
   * `public/grocery/brands/`, then the generated round mark.
   */
  const brandLogo = brandLogoUrl(brand as { name: string; logoUrl?: string });
  return (
    <Link href={`/brand/${brand.id}`} className="flex flex-col items-center gap-1.5 w-[80px] shrink-0 group">
      {/* Round: the mark sits in a disc, which is what a brand orbit reads as.
          `object-contain` on a white ground because a real logo is rarely square
          and cropping one cuts the name off. */}
      <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200/80 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
        <img src={brandLogo} alt={brand.name} loading="lazy" decoding="async" className="w-full h-full object-contain" />
      </div>
      <span className="text-sm font-semibold text-slate-700 text-center line-clamp-1">{brandName}</span>
      {offerBadge && <span className="text-[8px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded">{offerBadge}</span>}
    </Link>
  );
}

// ── Trust Badge Strip ────────────────────────────────────────────────────

function TrustBadgeStrip() {
  return (
    <section className="mb-8">
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-2 px-2 2xs:-mx-3 2xs:px-3 xs:-mx-4 xs:px-4 md:mx-0 md:px-0">
        {GROCERY_TRUST_BADGES.map(badge => (
          <div key={badge.id} className="flex items-center gap-2.5 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm min-w-[200px] shrink-0">
            <span className="text-2xl">{badge.emoji}</span>
            <div>
              <p className="text-base font-bold text-slate-800">{badge.title}</p>
              <p className="text-sm text-slate-400">{badge.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
// ── Flash Deals Section ──────────────────────────────────────────────────

function FlashDealsCountdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  return <span className="font-mono font-black">{timeLeft}</span>;
}

/**
 * Live flash deals, from the API.
 *
 * This read `getActiveFlashDeals()` and `getFlashDealStores()` — two helpers
 * over a hardcoded `FLASH_DEALS` array in the demo data. The section therefore
 * advertised discounts that no shop had agreed to, on shops that do not exist,
 * with a countdown against invented end times, while `grocery_flash_deals` held
 * nothing. Every card linked to `/grocery/store/<demo-id>?tab=flash-deals`,
 * which the API rejects.
 *
 * A promotion is a commitment to a price. Inventing one is worse than showing
 * no promotions at all, so an empty response renders nothing.
 */
function FlashDealsSection({ stores }: { stores: GroceryStore[] }) {
  const { formatPrice, tr } = useGroceryLocale();
  const [allDeals, setAllDeals] = useState<FlashDeal[]>([]);

  useEffect(() => {
    let cancelled = false;
    groceryApi
      .listActiveFlashDeals()
      .then((res: any) => {
        if (cancelled) return;
        const rows = res?.data ?? [];
        setAllDeals(Array.isArray(rows) ? rows : []);
      })
      .catch(() => { if (!cancelled) setAllDeals([]); });
    return () => { cancelled = true; };
  }, []);

  // One card per shop running a deal, built from the deals themselves rather
  // than from a separate list of "flash deal stores".
  const flashStores = useMemo(() => {
    const byStore = new Map<string, { deals: number; maxDiscount: number }>();
    for (const d of allDeals) {
      const id = (d as any).storeId;
      if (!id) continue;
      const cur = byStore.get(id) ?? { deals: 0, maxDiscount: 0 };
      cur.deals += 1;
      cur.maxDiscount = Math.max(cur.maxDiscount, Number((d as any).discountPercent ?? 0));
      byStore.set(id, cur);
    }
    // Joined onto the real store rows, so the card keeps the logo, rating and
    // delivery time it renders. A deal whose shop is not in the current
    // market's list is dropped rather than shown against a placeholder.
    return stores
      .filter((st) => byStore.has(st.id))
      .map((st) => ({
        ...st,
        // The store row's own grouped count wins over counting this response:
        // the deals list is a capped page, so a shop running ten deals was
        // being announced as "4 Deals" while its badge said 50% off.
        activeDeals: Number((st as { activeDealCount?: number }).activeDealCount) || byStore.get(st.id)!.deals,
        maxDiscount: byStore.get(st.id)!.maxDiscount,
      }));
  }, [allDeals, stores]);

  if (flashStores.length === 0) return null;

  // Soonest ending deal for the master countdown
  const soonestEnd = allDeals.reduce((min, d) => d.endTime < min ? d.endTime : min, allDeals[0]?.endTime || '');

  return (
    <section className="mb-8">
      {/* Gradient Banner Header */}
      <div className="bg-linear-to-r from-red-500 via-orange-500 to-amber-500 rounded-2xl p-4 md:p-5 mb-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 left-10 text-6xl animate-pulse">⚡</div>
          <div className="absolute bottom-2 right-10 text-5xl animate-bounce delay-500">🔥</div>
          <div className="absolute top-3 right-1/3 text-4xl animate-pulse delay-1000">💥</div>
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl animate-pulse">⚡</span>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{tr('Flash Deals')}</h2>
              <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">{tr('LIVE')}</span>
            </div>
            <p className="text-white/80 text-sm">{tr('Limited time offers from top stores — hurry before they\'re gone!')}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
            <Timer className="w-4 h-4 text-white" />
            <div className="text-white text-sm">
              <span className="text-white/70 text-xs block">{tr('Ends in')}</span>
              <FlashDealsCountdown endTime={soonestEnd} />
            </div>
          </div>
        </div>
      </div>

      {/* Store Cards with Flash Deals */}
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-2 px-2 2xs:-mx-3 2xs:px-3 xs:-mx-4 xs:px-4 md:mx-0 md:px-0">
        {flashStores.map(store => (
          <Link
            key={store.id}
            href={`${storePath(store)}?tab=flash-deals`}
            className={`group shrink-0 ${STORE_CARD_W} bg-linear-to-br from-white via-white to-orange-50 border-2 border-orange-200/60 rounded-2xl overflow-hidden hover:shadow-lg hover:border-orange-300 transition-all`}
          >
            {/* Same frame as every other store card, in the deal section's tint. */}
            <StoreBanner
              banner={urlish((store as { bannerUrl?: unknown }).bannerUrl)}
              logo={urlish((store as { logoUrl?: unknown }).logoUrl)}
              emoji={store.emoji}
              crest="w-11 h-11"
              tint="bg-linear-to-r from-red-50 via-orange-50 to-amber-50"
            >
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <Zap className="w-3 h-3" /> {tr('Up to')} {store.maxDiscount}%
              </span>
            </StoreBanner>
            <div className="px-4 py-3">
              <h3 className="font-bold text-sm text-slate-900 truncate group-hover:text-orange-600 transition-colors">{store.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm text-slate-500">{store.rating}</span>
                <span className="text-sm text-slate-300">•</span>
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm text-slate-500">{store.deliveryTime}</span>
              </div>
            </div>

            {/* Deal Info */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {store.activeDeals} {store.activeDeals === 1 ? 'Deal' : 'Deals'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOMEPAGE — STORE-FIRST LAYOUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pick a hero banner field in the shopper's language.
 *
 * Returns the `…Ar` variant when Arabic is active and the banner has one,
 * otherwise the base field — so a market whose banners are English-only still
 * renders rather than showing blanks.
 */
function pickHeroText(
  banner: Record<string, unknown> | undefined,
  field: string,
  arabic: boolean,
): string {
  if (!banner) return '';
  const ar = banner[`${field}Ar`];
  if (arabic && typeof ar === 'string' && ar) return ar;
  const base = banner[field];
  return typeof base === 'string' ? base : '';
}

export default function GroceryHomePage() {
  useModuleTitle('grocery');
  const { country, config, formatPrice, tr, showArabic, isRTL } = useGroceryLocale();

  // Coordinates the shopper picked by naming an area, which win over GPS.
  const [chosenLocation, setChosenLocation] = useState<{ lat: number; lng: number } | null>(null);

  const heroText = (banner: any, field: string) => pickHeroText(banner, field, showArabic);

  // ── Recommendation Engine ──
  const { forYou, crossModule, isLoading: recoLoading, trackClick } = useRecommendations('grocery', null);

  // ── Live API data with demo fallback ────────────────────────────────────
  const { categories: apiCategories, stores: apiStores, loading: homeLoading, source: dataSource, refetch: refetchStores } = useGroceryHomeData(chosenLocation);

  // ── CMS Layout (from Super Admin Page Builder) ─────────────────────────
  const { sections: cmsLayout } = useGroceryLayout('homepage');

  // ── Country-specific data ───────────────────────────────────────────────
  const heroBanners = useMemo(() => getBannersForCountry(country), [country]);
  const campaigns = useMemo(() => getCampaignsForCountry(country), [country]);
  const faq = useMemo(() => getFAQForCountry(country), [country]);

  // ── Merge API stores with demo stores (API takes priority) ──────────────
  const allStores = useMemo(() => {
    // If API returned stores, use them as priority data
    if (apiStores.length > 0) {
      // Map API stores to GroceryStore shape for existing UI components
      const mapped: GroceryStore[] = apiStores.map((s: any) => ({
        id: s.id, name: s.name,
        // `logoUrl` must land in `logoUrl`. It was being assigned to `emoji`,
        // so the mapped object carried no `logoUrl` at all — `StoreCard` looks
        // for that key to decide whether it has a picture, found nothing, and
        // every card fell back to the emoji well. Meanwhile `emoji` held a URL
        // string, which is not an emoji. Both halves are why a seeded logo
        // still rendered as a placeholder.
        logoUrl: typeof s.logoUrl === 'string' ? s.logoUrl : undefined,
        bannerUrl: typeof s.bannerUrl === 'string' ? s.bannerUrl : undefined,
        emoji: '🛒',
        slug: s.slug,
        category: s.storeTypes?.[0] || 'grocery',
        rating: Number(s.rating ?? 4.5), reviewCount: String(s.totalOrders ?? '0'),
        // `estimatedDeliveryTime` is not a column, so this was always the literal
        // '25-35 min' — and the store directory showed the same shop a different
        // window. One estimator now answers for both.
        deliveryTime: deliveryWindow(distanceKm(chosenLocation, { lat: s.latitude, lng: s.longitude })),
        deliveryFee: Number(s.deliveryFee ?? 0), minOrder: Number(s.minOrderAmount ?? 0),
        isOpen: s.isOpen ?? true, isPromoted: s.isPromoted ?? false,
        // Real promotion, from the store's live flash deals — the badge was
        // hardcoded to undefined here, so a shop running a genuine sale showed
        // nothing while demo fixtures showed "Mega Deals".
        offerBadge: typeof s.offerBadge === 'string' ? s.offerBadge : undefined,
        // The store's grouped count of live deals, so the Flash Deals card does
        // not have to count a capped page of the deals response.
        activeDealCount: Number(s.activeDealCount) || 0,
        tags: s.tags ?? [], section: railsFor(s),
        distance: s.distance ?? '',
      }));
      return mapped;
    }
    // No demo fallback. An empty list means this market has no shops yet,
    // which the rails render as nothing.
    return [];
  }, [apiStores, chosenLocation]);

  // ── Store sections ─────────────────────────────────────────────────────
  const promotedStores = useMemo(() => allStores.filter(s => s.isPromoted && s.isOpen), [allStores]);
  const nearbyStores = useMemo(() => allStores.filter(s => s.section.includes('nearby') && s.isOpen), [allStores]);
  const trendingStores = useMemo(() => {
    return allStores.filter(s => s.section.includes('trending') && s.isOpen);
  }, [allStores]);
  const newStores = useMemo(() => allStores.filter(s => s.section.includes('new') && s.isOpen), [allStores]);
  const fastDelivery = useMemo(() => allStores.filter(s => s.section.includes('fast-delivery') && s.isOpen), [allStores]);
  const topRated = useMemo(() => allStores.filter(s => s.section.includes('top-rated') && s.isOpen), [allStores]);
  const supermarkets = useMemo(() => allStores.filter(s => s.section.includes('supermarket') && s.isOpen), [allStores]);
  const meatFish = useMemo(() => allStores.filter(s => s.section.includes('meat-fish') && s.isOpen), [allStores]);
  const fruitVeg = useMemo(() => allStores.filter(s => s.section.includes('fruits-veggies') && s.isOpen), [allStores]);
  const dairyBakery = useMemo(() => allStores.filter(s => s.section.includes('dairy-bakery') && s.isOpen), [allStores]);
  const organicStores = useMemo(() => allStores.filter(s => s.section.includes('organic') && s.isOpen), [allStores]);
  const bestSellers = useMemo(() => {
    return allStores.filter(s => s.section.includes('best-seller') && s.isOpen);
  }, [allStores]);

  // ── Brand data ──────────────────────────────────────────────────────────
  /**
   * Brands that actually have products for sale in this market.
   *
   * This used to read a curated regional list — Almarai, NADEC, LuLu, Carrefour
   * — which shared *no* entries with `grocery_items.brand`. Every avatar on the
   * row therefore led to a page with nothing on it. The catalogue decides which
   * brands exist, so tapping one always lands somewhere.
   */
  const { data: liveBrands } = useAsyncData(
    async () => (await groceryApi.getBrands(BRANDS_PER_ROW * 2)).brands,
    [],
  );

  const allBrands = useMemo(() => {
    if (liveBrands && liveBrands.length > 0) {
      return liveBrands.map((b: { id: string; name: string; productCount: number; imageUrl: string | null }) => ({
        id: b.id,
        name: b.name,
        nameAr: '',
        emoji: '🏷️',
        color: 'from-slate-200 to-slate-300',
        productCount: b.productCount,
        offerBadge: '',
        description: '',
        countries: [],
        logoUrl: undefined as string | undefined,
      }));
    }
    // Only while the request is in flight — an empty catalogue renders an empty
    // row rather than a curated list nothing backs.
    return [];
  }, [liveBrands]);

  const brandData = useMemo(() => allBrands.slice(0, BRANDS_PER_ROW), [allBrands]);

  /**
   * The second row is the overflow of the first, not a separate list.
   *
   * It used to render `GROCERY_BRANDS[1]` — a hardcoded Indian set (MDH,
   * Patanjali, Surf Excel, Dettol) shown on every market's homepage, drawn as
   * emoji in rounded squares while the row above it used round logo marks, and
   * linking to ids like `brand-mdh` that match nothing in `grocery_items.brand`.
   * Every avatar was a dead end on a Doha storefront.
   *
   * With fewer brands than one row holds, this is empty and the section does not
   * render — the same rule the store rails follow.
   */
  const moreBrands = useMemo(() => allBrands.slice(BRANDS_PER_ROW), [allBrands]);

  // ── Hero Carousel ──────────────────────────────────────────────────────
  const [heroIdx, setHeroIdx] = useState(0);
  const banners = heroBanners.length > 0 ? heroBanners : GROCERY_HERO_BANNERS;
  useEffect(() => {
    const timer = setInterval(() => setHeroIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);
  const hero = banners[heroIdx];

  // ── FAQ ─────────────────────────────────────────────────────────────────
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  // The demo fallback is region-filtered before it is rendered. Untagged
  // entries apply everywhere; the payment-methods answer exists once per market
  // because naming UPI to a Doha shopper is worse than saying nothing.
  const faqData: { q: string; a: string; qAr?: string; aAr?: string }[] =
    faq.length > 0 ? faq : forRegion(GROCERY_FAQ, country).map(f => ({ q: f.q, a: f.a }));

  // ── Merge API categories with demo fallback ──────────────────────────
  /**
   * The tiles in "Shop by Category" are the categories that exist.
   *
   * This used to append `GROCERY_CATEGORIES` to whatever the API returned. That
   * list is 176 entries — the 23 real top-level categories plus 153
   * subcategories (`leafy-greens`, `toor-dal`, `chicken-wings`) — so the grid
   * showed 176 tiles of which 153 named a category no shop stocks. Tapping one
   * asked the API for stores carrying it, got none, and left the shopper on an
   * empty page with no explanation.
   *
   * Several of the demo-only entries were also India-specific — `toor-dal`,
   * `besan`, `maida`, `namkeen`, `indian-sweets` — so they were wrong for Doha
   * twice over.
   */
  const allCategories = useMemo(() => {
    return apiCategories.map((c: any) => ({
      id: c.id, name: c.name, emoji: c.emoji || '📦',
      // Dropped before, so a seeded category picture could never reach the tile.
      imageUrl: typeof c.imageUrl === 'string' ? c.imageUrl : undefined,
      gradient: c.gradient || '', productCount: c.productCount ?? 0,
    }));
  }, [apiCategories]);

  // ── Delivery Location ────────────────────────────────────────────────
  // `detectedArea` is only ever set from a geolocation callback; the region's own
  // name is the fallback and is read during render rather than written into
  // state. The previous version set that fallback synchronously in the effect on
  // the no-geolocation path, which forced a second render just to arrive at a
  // value it already had.
  const [detectedArea, setDetectedArea] = useState<string | null>(null);
  const [areaError, setAreaError] = useState<string | null>(null);
  const countryName = (showArabic && config?.nameAr) || config?.name;
  const deliveryArea = detectedArea ?? countryName ?? tr('Detecting location…');

  useEffect(() => {
    // Skipped once the shopper has named their own area — re-running GPS would
    // overwrite an explicit choice with wherever the device happens to be.
    if (chosenLocation) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const controller = new AbortController();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const area = await reverseGeocode(pos.coords.latitude, pos.coords.longitude, controller.signal);
        // Only a real place name is stored — otherwise the fallback above stands.
        if (area) setDetectedArea(area);
      },
      () => { /* Permission refused or timed out — the fallback stands. */ },
      { timeout: 5000 },
    );
    return () => { controller.abort(); };
  }, [chosenLocation]);

  /**
   * Set the delivery area by name.
   *
   * The typed value used to be written straight into the label beside a
   * `refetch()` that took no arguments, so the heading changed and the shop
   * list did not. `/grocery/stores` is coordinate-only, so the name has to be
   * geocoded before it can mean anything; a name that does not resolve now
   * says so instead of silently doing nothing.
   */
  const changeArea = async () => {
    const typed = prompt(tr('Enter your delivery area:'), deliveryArea);
    if (!typed || !typed.trim()) return;
    setAreaError(null);
    const place = await geocodeArea(typed, config?.code);
    if (!place) {
      setAreaError(tr('We could not find that area. Try a nearby district or landmark.'));
      return;
    }
    setDetectedArea(place.label);
    setChosenLocation({ lat: place.lat, lng: place.lng });
  };

  /*
   * A skeleton while the first fetch is in flight.
   *
   * `useGroceryHomeData` has always returned a `loading` flag and this page
   * destructured it away, so nothing on the homepage had a loading state at
   * all: "Shop by Category" rendered its heading above an empty grid and the
   * tiles appeared whenever the request landed — about 1.2s on a cold cache.
   * Every store rail did the same. The marketplace already gates its first
   * paint on a shimmer for exactly this reason, and this mirrors its structure:
   * same `.cat-grid` ladder and the same `STORE_CARD_W` as the real cards, so
   * nothing reflows into a different column count when the data arrives.
   */
  if (homeLoading) {
    return (
      <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-2 2xs:px-3 xs:px-4 md:px-6 xl:px-8 pb-mobile-nav animate-in fade-in duration-200" aria-busy="true" aria-label={tr('Loading')}>
        {/* Delivery bar */}
        <div className="flex items-center gap-2 mt-3 mb-2 px-1">
          <div className="h-9 w-9 bg-slate-200 rounded-full animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-3.5 w-40 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-11 w-20 bg-slate-200 rounded-lg animate-pulse shrink-0" />
        </div>

        {/* Hero */}
        <div className="mt-4 mb-6 h-[150px] xs:h-[180px] md:h-[220px] bg-slate-200 rounded-xl xs:rounded-2xl animate-pulse" />

        {/* Shop by Category */}
        <section className="mb-8">
          <div className="h-5 w-44 bg-slate-200 rounded animate-pulse mb-4" />
          <div className="cat-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 bg-white border border-slate-100 rounded-xl p-2 xs:p-2.5">
                <div className="w-full aspect-square bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-2.5 w-12 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        {/* Two store rails */}
        {[0, 1].map((row) => (
          <section key={row} className="mb-8">
            <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-4" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${STORE_CARD_W} shrink-0 bg-white border border-slate-100 rounded-xl overflow-hidden`}>
                  <div className={`${STORE_BANNER_H} bg-slate-200 animate-pulse`} />
                  <div className="p-3 space-y-2">
                    <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-2 2xs:px-3 xs:px-4 md:px-6 xl:px-8 pb-mobile-nav">

      {/* ═══ DELIVERY LOCATION BAR ═══ */}
      <div className="flex items-center gap-2 mt-3 mb-2 px-1">
        <MapPin className="w-5 h-5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-medium">{tr('Deliver to')}</p>
          <p className="text-sm font-bold text-slate-900 truncate">{deliveryArea}</p>
        </div>
        <button
          onClick={changeArea}
          className="text-sm font-bold text-green-600 hover:text-green-700 border border-green-200 rounded-lg px-3 min-h-[44px] hover:bg-green-50 transition-colors shrink-0"
        >
          {tr('Change')}
        </button>
      </div>
      {/* A name that does not resolve has to say so — the control used to
          appear to work whatever was typed. */}
      {areaError && (
        <p role="alert" className="text-xs text-red-600 px-1 mb-2 -mt-1">{areaError}</p>
      )}

      {/* ═══ HERO BANNER ═══ */}
      <section className="mt-4 mb-6">
        <div className={`bg-linear-to-r ${hero.gradient || 'from-green-600 to-emerald-700'} rounded-xl xs:rounded-2xl p-4 xs:p-6 md:p-10 text-white relative overflow-hidden min-h-[150px] xs:min-h-[180px] md:min-h-[220px] flex items-center transition-all duration-500`}>
          <div className="flex-1 z-10">
            {/* Each banner carries both languages; the shopper's choice picks
                one. They used to be language-locked, so a carousel of an
                Arabic banner and an English one showed the wrong half to
                everyone. `heroText` falls back to the English field when a
                banner has no Arabic yet, which is why nothing disappears for
                the markets that have not been translated. */}
            <span className="text-sm bg-white/20 px-2 py-0.5 rounded font-bold tracking-wider">{heroText(hero, 'tag')}</span>
            <h2 className="text-base 2xs:text-lg sm:text-xl md:text-3xl font-black mt-2 leading-tight whitespace-pre-line">{heroText(hero, 'headline')}</h2>
            <p className="text-xs 2xs:text-sm sm:text-base opacity-90 mt-1 xs:mt-2">{heroText(hero, 'subheadline')}</p>
            <Link href={hero.ctaHref || '/category/all'} className="inline-flex items-center justify-center gap-1 bg-white text-green-700 font-bold text-xs 2xs:text-sm sm:text-base px-3 2xs:px-4 sm:px-5 py-1.5 xs:py-2 min-h-[44px] rounded-lg mt-2 xs:mt-3 hover:bg-green-50 transition-colors">
              {heroText(hero, 'cta')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <span className="text-4xl xs:text-5xl sm:text-7xl md:text-9xl opacity-30 absolute right-2 xs:right-4 md:right-10 top-1/2 -translate-y-1/2">{hero.emoji || '🛒'}</span>
          {/* Slide dots — the visible dot stays small, but each button carries a
              44x44 hit area so it is reliably tappable on a phone. The height was
              already 44; the width was left at 24, which is the WCAG 2.5.8 AA
              floor exactly and well under the 44 the platform guidelines ask for
              — measured at 375px these were the smallest targets on the page. */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === heroIdx ? 'true' : undefined}
                className="h-11 w-11 flex items-center justify-center"
              >
                <span className={`h-2 rounded-full transition-all ${i === heroIdx ? 'bg-white w-5' : 'bg-white/40 w-2'}`} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST BADGES ═══ */}
      <TrustBadgeStrip />

      {/* ═══ SHOP BY CATEGORY ═══ */}
      <section className="mb-8">
        <SectionHeader title={tr('Shop by Category')} titleAr="تسوق حسب القسم" subtitle="Browse items by type" emoji="🛒" href="/category/all-groceries" />
        <div className="cat-grid">
          {allCategories.map(cat => (
            <Link key={cat.id} href={`/category/${cat.id}`} className="flex flex-col items-center gap-1 bg-white border border-slate-100 rounded-xl p-2 xs:p-2.5 shadow-sm hover:shadow-md hover:border-green-200 transition-all group">
              {cat.imageUrl ? (
                // Fixed square well so every tile is the same size whether the
                // category has artwork or only an emoji.
                <span className="w-10 h-10 xs:w-11 xs:h-11 md:w-12 md:h-12 rounded-lg overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                  <img src={cat.imageUrl} alt="" aria-hidden="true" className="w-full h-full object-cover" loading="lazy" />
                </span>
              ) : (
                <span className="text-xl xs:text-2xl md:text-3xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
              )}
              <span className="text-[11px] xs:text-xs md:text-sm font-semibold text-slate-700 text-center leading-tight line-clamp-2">{showArabic ? tr(cat.name) : cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ ⚡ FLASH DEALS ═══ */}
      <FlashDealsSection stores={allStores} />

      {/* ═══ SPONSORED / PROMOTED STORES ═══ */}
      <StoreSection
        title={tr('Featured & Sponsored Stores')}
        titleAr="المتاجر المميزة والمروّجة"
        subtitle="Top partner stores with exclusive deals"
        stores={promotedStores}
        emoji="👑"
        variant="promoted"
        badge="SPONSORED"
      />

      {/* ═══ NEARBY STORES ═══ */}
      <StoreSection
        title={tr('Nearby Stores')}
          rail="nearby"
        titleAr="متاجر قريبة"
        subtitle="Stores within your delivery radius"
        stores={nearbyStores}
        emoji="📍"
        href="/stores"
      />

      {/* ═══ GROCERY BRANDS ═══ */}
      <section className="mb-8">
        <SectionHeader title={tr('Shop by Brand')} titleAr="تسوق حسب العلامة التجارية" subtitle="Your favorite grocery brands" emoji="🏷️" href="/brand" />
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-2 px-2 2xs:-mx-3 2xs:px-3 xs:-mx-4 xs:px-4 md:mx-0 md:px-0">
          {brandData.map((b: any) => <BrandCard key={b.id} brand={b} />)}
        </div>
      </section>

      {/* ═══ TRENDING STORES (lazy-loaded) ═══ */}
      <LazySection>
        <StoreSection
          title={tr('Trending Stores')}
          rail="trending"
          titleAr="المتاجر الرائجة"
          subtitle="Most popular this week"
          stores={trendingStores}
          emoji="🔥"
        />
      </LazySection>

      {/* ═══ 🧠 YOUR WEEKLY PICKS (recommendation engine) ═══ */}
      <RecommendationCarousel
        title={tr('Your Weekly Picks')}
        icon="🎯"
        recommendations={forYou}
        module="grocery"
        isLoading={recoLoading}
        onCardClick={trackClick}
      />

      {/* ═══ ✨ EXPLORE OTHER SERVICES ═══ */}
      <CrossModulePicks
        recommendations={crossModule}
        currentModule="grocery"
        onCardClick={trackClick}
      />

      {/* ═══ FAST DELIVERY (lazy-loaded) ═══ */}
      {/* Not a minute count: this rail is the shops flagged for short-radius
          delivery, and every card in it quoted 19-29 min while the heading
          promised 10-15. */}
      <LazySection>
        <StoreSection
          title={tr('Express Delivery')}
          rail="fast-delivery"
          titleAr="توصيل سريع"
          subtitle="Shops set up for short-radius delivery"
          stores={fastDelivery}
          emoji="⚡"
          variant="compact"
        />
      </LazySection>

      {/* ═══ NEW ARRIVALS (lazy-loaded) ═══ */}
      <LazySection>
        <StoreSection
          title={tr('New Store Arrivals')}
          rail="new"
          titleAr="متاجر جديدة"
          subtitle="Recently opened near you"
          stores={newStores}
          emoji="🆕"
          badge="NEW"
        />
      </LazySection>

      {/* ═══ TOP RATED STORES (lazy-loaded) ═══ */}
      <LazySection>
        <StoreSection
          title={tr('Top Rated Stores')}
          rail="top-rated"
          titleAr="أعلى التقييمات"
          subtitle="Highest customer ratings"
          stores={topRated}
          emoji="⭐"
        />
      </LazySection>

      {/* ═══ SUPERMARKETS & HYPERMARKETS (lazy-loaded) ═══ */}
      <LazySection>
        <StoreSection
          title={tr('Supermarkets & Hypermarkets')}
          rail="supermarket"
          titleAr="سوبر ماركت وهايبر ماركت"
          subtitle="One-stop shop for all your needs"
          stores={supermarkets}
          emoji="🏬"
        />
      </LazySection>

      {/* ═══ CAMPAIGN BANNER (lazy-loaded) ═══ */}
      <LazySection height={160}>
        <section className="mb-8">
          <div className="bg-linear-to-r from-green-700 via-green-600 to-emerald-500 rounded-2xl p-6 text-white flex items-center gap-4">
            <div className="flex-1">
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded font-bold">🎉 {showArabic ? 'عرض موسمي' : 'SEASONAL'}</span>
              <h3 className="text-lg font-bold mt-2">{showArabic ? 'عرض الصيف الكبير' : 'Summer Fresh Fest'}</h3>
              <p className="text-sm opacity-80 mt-1">{showArabic ? 'خصم حتى ٤٠٪ على الفواكه والخضروات' : 'Up to 40% off on fruits, vegetables & beverages'}</p>
              <Link href="/category/fruits-vegetables" className="inline-flex items-center gap-1 bg-white text-green-700 font-bold text-sm px-4 py-2 min-h-[44px] rounded-lg mt-3 hover:bg-green-50">
                {showArabic ? 'تسوق الآن' : 'Shop Now'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <span className="text-6xl opacity-40 hidden md:block">🍹🥬🍉</span>
          </div>
        </section>
      </LazySection>

      {/* ═══ FRESH MEAT & FISH STORES (lazy-loaded) ═══ */}
      <LazySection>
        <StoreSection
          title={tr('Fresh Meat & Fish')}
          rail="meat-fish"
          titleAr="لحوم وأسماك طازجة"
          subtitle="Hygienically processed & delivered chilled"
          stores={meatFish}
          emoji="🥩"
        />
      </LazySection>

      {/* ═══ FRUITS & VEGETABLES STORES (lazy-loaded) ═══ */}
      <LazySection>
        <StoreSection
          title={tr('Fruits & Vegetable Stores')}
          rail="fruits-veggies"
          titleAr="متاجر الفواكه والخضروات"
          subtitle="Farm-fresh produce delivered"
          stores={fruitVeg}
          emoji="🥬"
        />
      </LazySection>

      {/* ═══ DAIRY & BAKERY STORES (lazy-loaded) ═══ */}
      <LazySection>
        <StoreSection
          title={tr('Dairy & Bakery')}
          rail="dairy-bakery"
          titleAr="الألبان والمخابز"
          subtitle="Fresh dairy, bread, and pastries"
          stores={dairyBakery}
          emoji="🥐"
        />
      </LazySection>

      {/* ═══ ORGANIC STORES (lazy-loaded) ═══ */}
      <LazySection>
        <StoreSection
          title={tr('Organic & Health Stores')}
          rail="organic"
          titleAr="متاجر عضوية وصحية"
          subtitle="Pesticide-free, organic certified"
          stores={organicStores}
          emoji="🌱"
        />
      </LazySection>

      {/* ═══ BEST SELLERS (lazy-loaded) ═══ */}
      <LazySection>
        <StoreSection
          title={tr('Best Seller Stores')}
          rail="best-seller"
          titleAr="أفضل المتاجر مبيعاً"
          subtitle="Most ordered from"
          stores={bestSellers}
          emoji="🏆"
          variant="compact"
        />
      </LazySection>

      {/* ═══ RECENTLY VISITED (Mock) ═══ */}
      <StoreSection
        title={tr('Recently Visited')}
        titleAr="زرتها مؤخراً"
        subtitle="Continue shopping"
        stores={allStores.slice(0, 5)}
        emoji="🕐"
        variant="compact"
      />

      {/* ═══ SECOND BRAND ROW ═══ */}
      {moreBrands.length > 0 && (
        <section className="mb-8">
          <SectionHeader title={tr('More Brands You Love')} titleAr="المزيد من العلامات المفضلة" subtitle="Discover more grocery brands" emoji="💝" href="/brand" />
          <AutoScrollRow className="pb-2 -mx-2 px-2 2xs:-mx-3 2xs:px-3 xs:-mx-4 xs:px-4 md:mx-0 md:px-0" speed={16}>
            {moreBrands.map((b) => <BrandCard key={b.id} brand={b} />)}
          </AutoScrollRow>
        </section>
      )}

      {/* ═══ EXPLORE ALL CATEGORIES ═══ */}
      <section className="mb-8">
        <SectionHeader title={tr('Explore All Categories')} titleAr="استكشف جميع الأقسام" emoji="📂" />
        <div className="card-grid-2-4">
          {allCategories.map(cat => (
            <Link key={cat.id} href={`/category/${cat.id}`} className="flex items-center gap-2.5 bg-white border border-slate-100 rounded-lg p-3 hover:border-green-200 hover:bg-green-50/30 transition-all group">
              <span className="text-xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900 truncate">{showArabic ? tr(cat.name) : cat.name}</p>
                <p className="text-sm text-slate-400">{cat.productCount} {showArabic ? 'منتج' : 'products'}</p>
              </div>
              <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-green-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ FAQ (AEO) ═══ */}
      <section className="mb-8">
        <SectionHeader title={tr('Frequently Asked Questions')} titleAr="الأسئلة الشائعة" emoji="❓" />
        <div className="space-y-2">
          {faqData.map((item, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                <span className="text-sm font-semibold text-slate-800">{showArabic && item.qAr ? item.qAr : item.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                  {showArabic && item.aAr ? item.aAr : item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SEO FOOTER ═══ */}
      <section className="mb-8">
        <div className="bg-white border border-slate-100 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-2">
            {showArabic ? 'كارتسيك بقالة — اطلب بقالتك أونلاين' : 'KARTSEEK Grocery — Order Groceries Online'}
          </h3>
          <p className="text-base text-slate-500 leading-relaxed">
            {showArabic
              ? 'كارتسيك بقالة هو المنصة الأسهل لطلب البقالة أونلاين. اطلب من المتاجر القريبة، السوبر ماركت، الهايبر ماركت، البقالات، محلات اللحوم والأسماك. توصيل سريع وأسعار تنافسية في ' + formatActiveCountryList('و', true) + '.'
              : `KARTSEEK Grocery is the easiest way to order groceries online. Shop from nearby stores, supermarkets, hypermarkets, fresh meat and fish shops, bakeries, organic stores, and more. Get fast delivery with competitive prices in ${config.name}. Available in ${formatActiveCountryList()}.`}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {['Grocery Delivery', 'Online Supermarket', 'Fresh Produce', 'Meat & Fish', 'Organic Food', 'Quick Commerce', 'Same Day Delivery'].map(tag => (
              <span key={tag} className="text-sm bg-slate-50 text-slate-500 px-2 py-1 rounded font-medium">{tag}</span>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
