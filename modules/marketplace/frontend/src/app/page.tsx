'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Smartphone, Laptop, Shirt, Sofa, Dumbbell, Baby, Zap, Star,
  Sparkles, BookOpen, Car, ShoppingBasket, Tv, ChevronRight, Timer,
  Truck, ShieldCheck, RotateCcw, Headphones, Heart, ChevronLeft,
  Monitor, Briefcase, PawPrint, Paperclip, Watch, Armchair,
  BadgeCheck, TrendingUp, Crown, Flame, Tag, Sun, GraduationCap, Award,
  ArrowRight, Footprints, Clock, Gift, Store,
  ToyBrick,
} from 'lucide-react';
import { CATEGORIES, FLASH_DEALS, ELECTRONICS_PRODUCTS, FASHION_PRODUCTS, HOME_PRODUCTS, BEAUTY_PRODUCTS, SPORTS_PRODUCTS, TOYS_PRODUCTS, APPLIANCES_PRODUCTS, BRAND_PROMOS, TRENDING_PRODUCTS, DEALS_OF_DAY, NEW_ARRIVALS, BEST_SELLERS, RECOMMENDED, SPONSORED_PRODUCTS, MARKETPLACE_FAQ, TRUST_BADGES } from '@/lib/demo-data/marketplace-home';
import { discountPercent, buildBrandDiscount, forRegion } from '@/lib/marketplace/pricing';
import type { HomeProduct, HomeBrand, CampaignBanner } from '@/lib/marketplace/types';
import { useRegion } from '@/lib/contexts/region-context';
import { getLocalPaymentMethods } from '@/lib/localization';
import { CountryFlag } from '@/components/shared/country-flag';

/**
 * Cashback promotion, in each market's own currency.
 *
 * Amounts are per-market rather than converted: a promotion is a round number a
 * shopper recognises ("₹150 off", "QR 15 off"), not an exchange-rate result.
 */
const CASHBACK_OFFERS: Record<string, { reward: number; minOrder: number }> = {
  QA: { reward: 15, minOrder: 100 },
  IN: { reward: 150, minOrder: 999 },
  AE: { reward: 15, minOrder: 100 },
  SA: { reward: 15, minOrder: 100 },
  BH: { reward: 2, minOrder: 10 },
  KW: { reward: 1, minOrder: 10 },
  OM: { reward: 2, minOrder: 10 },
  GB: { reward: 5, minOrder: 35 },
  US: { reward: 5, minOrder: 35 },
  SG: { reward: 5, minOrder: 40 },
};
import { useModuleTitle } from '@/hooks/useModuleTitle';
import { useRecommendations } from '@/lib/hooks/use-recommendations';
import { RecommendationCarousel, CrossModulePicks } from '@/components/recommendations';
import { apiFetch } from '@/lib/api-fetch';
// The home grid used to declare its own near-identical copy of this card. Two
// copies meant two behaviours: the local one's wishlist button was a no-op and
// its images had no responsive sources.
import { ProductCard } from './components/product-card';
import { buildBrandLookup, loadBrandLookup, type BrandLookup } from '@/lib/api/resolve-brand-link';
import { productImageList } from '@/lib/product-image';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { productPath } from '@/lib/marketplace/product-url';
import { zoneHref } from '@/lib/routes/zone-href';

// ── Approved Products by Category Hook ───────────────────────────────────
// Fetches APPROVED seller products grouped by homepage section key.
// Products appear in the correct category sections (Amazon/Flipkart style).
// Polls every 30 s — fast enough for near-real-time without hammering the API.

type GroupedProducts = Record<string, any[]>;

/**
 * Shape one catalogue row for SellerProductCard.
 *
 * `rating` must be a number: the card calls `.toFixed(1)` on it.
 */
function mapSellerProduct(p: any) {
  const mrp = Number(p?.mrp ?? 0);
  const listings: any[] = (Array.isArray(p?.listings) ? p.listings : []).filter((l: any) => l?.isActive !== false);
  const buyBox = listings.find((l: any) => l?.isBuyBoxWinner) ?? listings[0];
  const primaryImage =
    (p?.images ?? []).find((img: any) => img?.isPrimary)?.url ?? p?.images?.[0]?.url;
  return {
    id: String(p?.id ?? ''),
    name: p?.name ?? p?.title ?? 'Product',
    brand: p?.brand?.name ?? (typeof p?.brand === 'string' ? p.brand : ''),
    price: Number(buyBox?.sellingPrice ?? mrp) || mrp,
    mrp,
    rating: Number(p?.averageRating ?? 0) || 0,
    reviews: Number(p?.reviewCount ?? 0),
    imageUrl: primaryImage,
    category: p?.category?.name ?? '',
    subcategory: p?.subcategory?.name ?? '',
    sellerName: p?.seller?.businessName ?? '',
    // Only a seller the catalogue actually reports as verified gets the badge.
    // It used to be stamped on every card in these sections unconditionally,
    // which makes it worthless as a signal and misstates the seller's status.
    sellerVerified:
      p?.seller?.isVerified === true
      || String(p?.seller?.verificationStatus ?? '').toUpperCase() === 'VERIFIED'
      || String(p?.seller?.verificationStatus ?? '').toUpperCase() === 'APPROVED',
  };
}

function useApprovedByCategory(region: string) {
  const [groups, setGroups] = useState<GroupedProducts>({});
  const [total, setTotal] = useState(0);

  const fetch_ = useCallback(async () => {
    try {
      // Real catalogue via the gateway, scoped to the market being browsed —
      // the backend ranks this market's sellers first within each category.
      // 60 rows had to cover every category section on the page at once, so the
      // long tail — toys, appliances, beauty — was routinely cut off and those
      // sections fell back to bundled demo products. Wide enough now to reach
      // the whole catalogue for a market of this size.
      const res = await apiFetch(`/marketplace/products?limit=250&country=${encodeURIComponent(region)}`, {
        // Was `cache: 'no-store'`. The catalogue routes now answer
        // `public, max-age=0, s-maxage=60, stale-while-revalidate=120` with a
        // strong ETag, so `max-age=0` already forces the browser to revalidate
        // on every read — the shopper cannot see a stale price from their own
        // cache. What `no-store` additionally did was forbid *storing* the
        // response, which meant no `If-None-Match` was ever sent and a poll
        // that changed nothing still transferred all 250 rows.
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return;
      const json = await res.json();

      // The gateway returns `{ success, data: { data, total, page, limit } }` —
      // a paged list, never `{ success, groups }`. Reading `json.groups` meant
      // the guard below never passed, so `groups` stayed `{}` and not one
      // verified-seller product ever reached a category section. Group here
      // instead, keyed on the category slug the sections index by.
      const page = json?.data ?? json;
      const rows: any[] = Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : [];
      if (rows.length === 0) return;

      const next: GroupedProducts = {};
      for (const row of rows) {
        const slug = row?.category?.slug;
        // No slug means no section to file it under, and a card with no id
        // cannot open a detail page — skip both rather than render a dead card.
        if (!slug || !row?.id) continue;
        (next[slug] ??= []).push(mapSellerProduct(row));
      }
      setGroups(next);
      setTotal(Number(page?.total ?? rows.length));
    } catch {
      // silently ignore — category sections fall back to demo data
    }
  }, [region]);

  useEffect(() => {
    fetch_();
    // Every 5 minutes, not every 30 seconds. A 250-row catalogue read twelve
    // times a minute per open tab is a lot of load for a listing that changes
    // when a seller edits it, and revalidation is cheap now that the response
    // carries an ETag. Measured over a full poll cycle the refetch changed
    // nothing on screen and contributed no layout shift, so the frequency was
    // buying nothing.
    const interval = setInterval(fetch_, 300000);
    return () => clearInterval(interval);
  }, [fetch_]);

  return { groups, total };
}

// ── Live Data Hook — fetches the real /marketplace/home feed (demo fallback) ──
//
// Goes through `apiFetch` rather than a bare `fetch` so the request carries the
// region headers the gateway scopes on; a raw fetch was scoped by the egress IP.

/**
 * First usable image URL. `images` is an array of `{ url }` rows on the TCP
 * entity but an array of plain strings in the gRPC ProductResponse.
 */
function firstImageUrl(p: any): string | undefined {
  const raw = p?.imageUrl ?? p?.images?.[0] ?? p?.metadata?.imageGalleryUrls?.[0];
  if (typeof raw === 'string') return raw || undefined;
  return raw?.url ?? raw?.imageUrl ?? undefined;
}

/** Map a backend product (from the marketplace feed) into the card's HomeProduct shape. */
function mapFeedProduct(p: any): HomeProduct {
  // `mrp` is the struck-through list price and `price` is what the buyer pays.
  // The two backends name them differently: the TCP entity keeps `mrp` and hangs
  // the payable price off its buy-box listing, while the gRPC ProductResponse
  // calls the list price `price` and the payable one `discountedPrice`. Reading
  // only `sellingPrice ?? price ?? mrp` collapsed both onto the MRP, so live
  // cards showed the list price with no discount.
  // Inactive listings are filtered out — the `find`-based feed endpoints cannot
  // exclude them in SQL, and pricing off a withdrawn offer would be wrong.
  const listings: any[] = (Array.isArray(p?.listings) ? p.listings : []).filter((l: any) => l?.isActive !== false);
  const buyBox = listings.find((l: any) => l?.isBuyBoxWinner) ?? listings[0];
  const mrp = Number(p?.mrp ?? p?.price ?? 0);
  const price = Number(p?.discountedPrice ?? p?.sellingPrice ?? buyBox?.sellingPrice ?? mrp);
  return {
    id: String(p?.id ?? ''),
    title: p?.title ?? p?.name ?? 'Product',
    brand: p?.brand?.name ?? (typeof p?.brand === 'string' ? p.brand : '') ?? '',
    mrp,
    price: price || mrp,
    rating: Number(p?.averageRating ?? p?.rating ?? 0) || undefined,
    reviews: Number(p?.reviewCount ?? p?.reviews ?? 0),
    imageUrl: firstImageUrl(p),
    // The whole gallery, so the card can be swiped through on the grid.
    images: productImageList(p),
    // Colour/size availability. The home feed's sections did not carry this at
    // all until the catalogue attached it, so the swatches only ever appeared
    // on the category pages.
    variantAxes: Array.isArray(p?.variantAxes) ? p.variantAxes : undefined,
    delivery: p?.delivery,
    badge: p?.badge,
    badgeColor: p?.badgeColor,
    category: p?.category?.slug ?? (typeof p?.category === 'string' ? p.category : undefined),
  } as unknown as HomeProduct;
}

/**
 * Products for one home section.
 *
 * A section the backend returned is rendered as-is, even when empty — swapping in
 * demo products there is what produced dead links: their ids live only in this
 * bundle, so `/marketplace/product/<demo id>` 404s. Cards without an id are
 * dropped for the same reason.
 *
 * When the feed never arrived (backend unreachable) the bundled catalogue still
 * renders, so the storefront isn't a blank page — but flagged `displayOnly`, which
 * `ProductCard` renders unclickable rather than linking to a detail page that
 * cannot load.
 *
 * The flag used to be an emptied `id`. That id is also the React key, so every
 * placeholder in a section collapsed onto the same key `''` — React warned about
 * duplicate keys and reserves the right to drop or duplicate such children.
 */
function pickProducts(feedArr: any, fallback: HomeProduct[], isLive: boolean): HomeProduct[] {
  if (Array.isArray(feedArr)) return feedArr.map(mapFeedProduct).filter((p) => p.id);
  return isLive ? [] : fallback.map((p) => ({ ...p, displayOnly: true }));
}

/** Map a backend category into the shape the category grid/nav expects. */
function mapFeedCategory(c: any): any {
  return {
    id: c?.slug ?? c?.id ?? '',
    label: c?.label ?? c?.name ?? 'Category',
    iconName: c?.iconName ?? c?.icon ?? '',
    color: c?.color ?? 'bg-slate-100 text-slate-600',
    imageUrl: c?.imageUrl ?? c?.image ?? undefined,
  };
}

/**
 * Categories from the home feed, or nothing.
 *
 * This used to fall back to the bundled `CATEGORIES` array, so an unreachable
 * catalogue rendered a full category grid built at compile time — every tile
 * linking to a category page that would then fail on its own. An empty grid is
 * a worse-looking page and a truthful one; the caller shows the failure state
 * beside it.
 */
function pickCategories(feedArr: any): any[] {
  return Array.isArray(feedArr) && feedArr.length > 0 ? feedArr.map(mapFeedCategory) : [];
}

/**
 * The home feed for the active market.
 *
 * `region` is part of the request and of the effect's dependencies: the feed is
 * composed and cached per market on the backend, so switching region has to
 * re-fetch rather than keep showing the previous market's banners and sellers.
 */
function useMarketplaceHome(region: string) {
  const [feed, setFeed] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchHome = useCallback(async () => {
    try {
      const res = await apiFetch(`/marketplace/home?country=${encodeURIComponent(region)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        if (data && typeof data === 'object') {
          setFeed(data);
          setIsLive(true);
          setLoading(false);
          return;
        }
      }
    } catch {
      // fall back to curated demo data
    }
    setIsLive(false);
    setLoading(false);
  }, [region]);

  // Single fetch per market — no polling. Users can trigger a manual refresh.
  useEffect(() => { setLoading(true); fetchHome(); }, [fetchHome]);

  return { feed, isLive, loading, refresh: fetchHome };
}

// ── Icon Map ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Smartphone, Laptop, Shirt, Sofa, Dumbbell, Baby, Sparkles, BookOpen,
  Car, ShoppingBasket, Tv, Headphones, Monitor, Briefcase, PawPrint,
  Paperclip, Watch, Armchair, Heart, Footprints, ToyBrick, BabyIcon: Baby,
  Tablet: Smartphone, Speaker: Headphones, Camera: Smartphone,
  Glasses: Sparkles, Sun, GraduationCap, Truck, ShieldCheck,
  RotateCcw, BadgeCheck,
};

function getCatIcon(iconName: string) {
  return ICON_MAP[iconName] || ShoppingBasket;
}

// ══════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ══════════════════════════════════════════════════════════════════════════

// ── Brand Card ────────────────────────────────────────────────────────────

/**
 * Monogram shown when a brand has no logo image. Short single-word brands keep
 * their full wordmark ("LG", "ZARA"); longer ones collapse to an initial
 * ("Whirlpool" → "W") and multi-word names to their initials
 * ("Forest Essentials" → "FE").
 */
function brandInitials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return (words[0].length <= 4 ? words[0] : words[0][0]).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Brand logo tile — renders the brand's image when one is available and falls
 * back to a monogram if it is missing or fails to load. Sized in one place so
 * the card and any future brand strip stay visually consistent.
 */
function BrandLogo({ brand }: { brand: HomeBrand }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(brand.logoUrl) && !failed;
  return (
    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center shrink-0 overflow-hidden">
      {showImage ? (
        <img
          src={brand.logoUrl}
          alt={`${brand.name} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-contain p-1.5"
        />
      ) : (
        <span className="text-lg md:text-xl font-black text-slate-800 tracking-tight">{brandInitials(brand.name)}</span>
      )}
    </div>
  );
}

function BrandPromoCard({ brand, formatCurrencyValue, href }: { brand: HomeBrand; formatCurrencyValue: (n: number) => string; href: string }) {
  const discountLabel = buildBrandDiscount(brand, formatCurrencyValue);
  return (
    <Link
      href={href}
      className={`${brand.color} ${brand.textColor} rounded-xl p-4 md:p-5 flex flex-col justify-between gap-3 min-h-[190px] md:min-h-[210px] hover:shadow-lg transition-all duration-300 relative overflow-hidden group`}
    >
      <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/5 group-hover:bg-white/10 transition-all duration-500" />
      {/* Logo above the name rather than beside it — in the 2-up mobile grid a
          side-by-side layout leaves ~70px for the name, which clipped anything
          longer than "LG". */}
      <div className="relative min-w-0">
        <BrandLogo brand={brand} />
        {/* `text-inherit`: the global `p { color: slate-600 }` base rule beats
            inherited colour, which left taglines unreadable on the gradient. */}
        <h3 className="mt-2.5 text-lg md:text-xl font-bold tracking-tight leading-tight truncate">{brand.name}</h3>
        <p className="text-[11px] md:text-xs text-inherit opacity-90 mt-0.5 line-clamp-2 leading-snug">{brand.tagline}</p>
      </div>
      <div className="relative flex items-center justify-between gap-2">
        <span className="text-xs font-bold bg-white/25 px-2.5 py-1.5 rounded-md">{discountLabel}</span>
        <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform shrink-0" />
      </div>
    </Link>
  );
}

// ── Section Header ────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, viewAllHref, icon: IconComp }: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        {IconComp && <IconComp className="w-5 h-5 text-blue-600" />}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1 transition-colors group">
          View All <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

// ── Countdown Timer ───────────────────────────────────────────────────────

/**
 * Time remaining until a deal actually ends.
 *
 * This used to start at a hard-coded `{ h: 2, m: 34, s: 18 }` on every page
 * load and wrap round to 23:59:59 when it hit zero, so every visitor was told
 * the same sale ended in about two and a half hours, forever, regardless of
 * when the deals really expire. A countdown is a purchase-pressure device; one
 * that runs on an invented deadline is not a bug so much as a false statement.
 *
 * It now renders nothing unless the feed supplies a real end time.
 */
function CountdownTimer({ endsAt }: { endsAt?: string | null }) {
  const target = endsAt ? new Date(endsAt).getTime() : NaN;
  const [remaining, setRemaining] = useState(() =>
    Number.isNaN(target) ? 0 : Math.max(0, target - Date.now()));

  useEffect(() => {
    if (Number.isNaN(target)) return;
    const id = setInterval(() => setRemaining(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (Number.isNaN(target) || remaining <= 0) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const time = {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-1">
      <div className="bg-slate-900 text-white text-xs font-bold px-1.5 py-1 rounded">{pad(time.h)}</div>
      <span className="text-slate-900 font-bold">:</span>
      <div className="bg-slate-900 text-white text-xs font-bold px-1.5 py-1 rounded">{pad(time.m)}</div>
      <span className="text-slate-900 font-bold">:</span>
      <div className="bg-slate-900 text-white text-xs font-bold px-1.5 py-1 rounded">{pad(time.s)}</div>
    </div>
  );
}

// ── Hero Banner Carousel ──────────────────────────────────────────────────

/**
 * What the hero shows when no banner has been configured for this market.
 *
 * Deliberately claim-free: no percentage, no "sitewide sale", no countdown.
 * A real campaign is created by an admin and arrives through the home feed;
 * until one does, the hero invites the shopper in rather than advertising a
 * discount nobody has authorised. Region-agnostic for the same reason — there
 * is nothing market-specific left to get wrong.
 */
const DEFAULT_HERO = [
  {
    id: 'default-browse',
    tag: 'KARTSEEK MARKETPLACE',
    headline: 'Everything you need\nfrom verified sellers',
    cta: 'Browse categories',
    ctaHref: '/category-list',
    gradient: 'from-blue-700 via-blue-800 to-slate-900',
  },
  {
    id: 'default-sellers',
    tag: 'VERIFIED SELLERS',
    headline: 'Every seller checked\nbefore they can list',
    cta: 'Meet the sellers',
    ctaHref: '/sellers',
    gradient: 'from-slate-800 via-slate-900 to-blue-900',
  },
];


function HeroBannerCarousel({ formatCurrencyValue, banners }: { formatCurrencyValue: (n: number) => string, banners?: any[] }) {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { country } = useRegion();
  /**
   * The hero needs *something* to draw — an empty slot here collapses the
   * tallest element above the fold and shifts the whole page — but the default
   * cannot make a promise the platform has not made.
   *
   * `HERO_BANNERS` used to fill this. Every entry announced a specific discount
   * for a campaign that does not exist: "Up to 60% Off Sitewide", "Up to 80%
   * Off Everything", "Min 26% Off Sitewide". Those ran on any storefront whose
   * admin had not configured a banner, which is every storefront by default.
   *
   * `DEFAULT_HERO` replaces it: same shape, same layout, no claim. It points at
   * real destinations and says only what is true — there is a catalogue, here
   * is the way in.
   */
  const activeBanners = banners && banners.length > 0 ? banners : DEFAULT_HERO;
  const total = activeBanners.length;

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  useEffect(() => {
    timeoutRef.current = setTimeout(advance, 5000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [current, advance]);

  const banner = activeBanners[current];
  const iconMap: Record<string, React.ElementType> = { Laptop, Smartphone, Sofa, Sparkles };
  // Build headline with dynamic currency for banners that have startingPrice
  const headline = (banner as any).startingPrice
    ? `${banner.headline}\nStarting ${formatCurrencyValue((banner as any).startingPrice)}`
    : banner.headline;

  // A banner an admin uploads carries an image URL and no `gradient`. Only the
  // bundled banners have a gradient, so a live one rendered as
  // `bg-linear-to-r undefined` — a bare white block with white text on it, and
  // the artwork that was the point of the banner never appeared at all.
  const artwork: string | undefined =
    (banner as any).imageUrl || (banner as any).image || (banner as any).bannerUrl || undefined;
  const gradient: string = (banner as any).gradient || 'from-slate-800 to-slate-900';

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Main banner */}
        <div className={`md:col-span-3 bg-linear-to-r ${gradient} rounded-xl overflow-hidden relative h-56 md:h-72 flex items-center p-5 md:p-8 transition-all duration-700`}>
          {/* The gradient stays behind the artwork rather than being replaced by
              it: a banner image that 404s then degrades to a styled panel with
              legible text instead of an empty box. */}
          {artwork && <BannerArtwork src={artwork} alt={banner.headline || 'Promotion'} />}
          <div className="relative z-10 max-w-md">
            <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 mb-4 inline-block uppercase tracking-widest rounded-full">{banner.tag}</span>
            <h2 className="text-white text-2xl md:text-4xl font-bold mb-4 leading-tight whitespace-pre-line">{headline}</h2>
            <Link
              href={banner.ctaHref || '/category-list'}
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-6 py-2.5 text-sm rounded-lg hover:bg-slate-50 hover:shadow-lg transition-all"
            >
              {banner.cta} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {!artwork && (() => { const I = iconMap[Object.keys(iconMap)[current % Object.keys(iconMap).length]]; return <I className="absolute -right-4 -bottom-4 w-56 h-56 text-white/10" />; })()}

          {/* Carousel dots */}
          <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
            {activeBanners.map((_, i) => (
              // Padded hit area — the bar itself is 6px tall, far below a usable
              // touch target, and on mobile these are now the only slide control.
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="px-1 py-2.5 flex items-center"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
              >
                <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'}`} />
              </button>
            ))}
          </div>

          {/* Arrows — desktop only. On a phone they sat directly on top of the
              headline; the dots below and the 5s auto-advance cover mobile. */}
          <button onClick={() => setCurrent((current - 1 + total) % total)} className="hidden md:block absolute left-3 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors z-10 backdrop-blur-sm" aria-label="Previous slide">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrent((current + 1) % total)} className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors z-10 backdrop-blur-sm" aria-label="Next slide">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Side banners */}
        <div className="hidden md:flex flex-col gap-3">
          <Link href="/category/mobiles-tablets" className="flex-1 bg-linear-to-br from-indigo-600 to-purple-600 rounded-xl p-5 relative overflow-hidden flex flex-col justify-center group hover:shadow-lg transition-all">
            <span className="text-yellow-300 font-bold text-[10px] uppercase tracking-widest mb-1">New Arrival</span>
            <h3 className="text-white font-bold text-lg leading-tight">iPhone 15 Pro</h3>
            <p className="text-indigo-200 text-xs mt-1">Titanium. So strong. So light.</p>
            <Smartphone className="absolute -right-2 -bottom-2 w-24 h-24 text-white/10 group-hover:text-white/15 transition-colors" />
          </Link>
          <Link href="/category/appliances" className="flex-1 bg-linear-to-br from-emerald-600 to-teal-600 rounded-xl p-5 relative overflow-hidden flex flex-col justify-center group hover:shadow-lg transition-all">
            <span className="text-yellow-300 font-bold text-[10px] uppercase tracking-widest mb-1">Super Saver</span>
            <h3 className="text-white font-bold text-lg leading-tight">Smart TVs</h3>
            <p className="text-emerald-200 text-xs mt-1">Up to 60% Off</p>
            <Tv className="absolute -right-2 -bottom-2 w-24 h-24 text-white/10 group-hover:text-white/15 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * A promotional banner's artwork.
 *
 * Kept behind a scrim and behind the copy: banner headlines are white, and a
 * light photograph underneath them is unreadable. `onError` removes the image
 * rather than leaving the browser's broken-image glyph over the panel — a
 * remote banner URL that stops resolving must not disfigure the homepage.
 */
function BannerArtwork({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <>
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <div className="absolute inset-0 bg-linear-to-r from-slate-950/80 via-slate-950/45 to-transparent" aria-hidden="true" />
    </>
  );
}

// ── Trust Badge Strip ─────────────────────────────────────────────────────
//
// The old version of this rendered unconditionally beneath the hero at every
// breakpoint, pushing shopping content down for a set of guarantees the footer
// already spells out. It was removed — but removing it left the section type
// stranded: `trust_badges` is still in the page-builder's default section list
// marked visible, the section editor still tells the operator the badges
// "are automatically rendered", and this page returned `null` for it. An
// operator could place, title and enable the section and see nothing.
//
// So it renders where the builder puts it rather than in a fixed slot, and the
// badges are filtered to the active market — the India entries claim UPI rails
// and a GST invoice that do not exist in Qatar.
function TrustBadgeStrip({ title }: { title?: string }) {
  const { country, formatCurrencyValue } = useRegion();
  const badges = forRegion(TRUST_BADGES, country.code);
  if (badges.length === 0) return null;
  return (
    <section aria-label={title || 'Why shop with us'}>
      <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar -mx-2 px-2 md:mx-0 md:px-0">
        {badges.map((badge) => {
          const Icon = getCatIcon(badge.icon);
          // The threshold is a bare number so it can be formatted in whichever
          // currency the shopper is browsing in.
          const subtitle = badge.thresholdAmount
            ? `${badge.subtitle} ${formatCurrencyValue(badge.thresholdAmount)}`
            : badge.subtitle;
          return (
            <div key={badge.id} className="flex items-center gap-2.5 bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-sm min-w-[210px] shrink-0">
              <Icon className={`w-5 h-5 shrink-0 ${badge.color}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{badge.title}</p>
                <p className="text-xs text-slate-500 truncate">{subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Product Grid Section ──────────────────────────────────────────────────
// Renders a named category section with optional brand promos beneath.
// If `sellerProducts` is provided, real admin-approved seller items are
// prepended to the grid (capped at 5) ahead of the static demo products.
// This is the Amazon/Flipkart-style injection mechanism.

function ProductGridSection({ title, subtitle, products, viewAllHref, icon, bgClass, borderAccent, sellerProducts, formatCurrencyValue, brandPromos, brandLookup }: {
  title: string;
  subtitle?: string;
  products: HomeProduct[];
  viewAllHref?: string;
  icon?: React.ElementType;
  bgClass?: string;
  borderAccent?: string;
  /** Real seller products approved by admin — shown first in the grid */
  sellerProducts?: any[];
  formatCurrencyValue: (n: number) => string;
  /** Brand promo cards rendered beneath the product grid */
  brandPromos?: HomeBrand[];
  /** Maps a promo card onto a brand the catalogue actually has. */
  brandLookup?: BrandLookup;
}) {
  // Pair each promo with a brand slug that resolves. Until the lookup has
  // loaded (`isReady` false) every card is kept with its original id, so a slow
  // brands request cannot blank out the row.
  const resolvedBrandPromos = (brandPromos ?? []).flatMap((brand) => {
    if (!brandLookup?.isReady) return [{ brand, href: `/brand/${brand.id}` }];
    const slug = brandLookup.resolve(brand);
    return slug ? [{ brand, href: `/brand/${slug}` }] : [];
  });

  const hasSellerItems = sellerProducts && sellerProducts.length > 0;
  // Show up to 5 catalogue items. `products` is empty whenever the home feed is
  // live, so the demo array only ever fills slots on a storefront with no
  // catalogue behind it at all.
  const sellerSlots = hasSellerItems ? sellerProducts!.slice(0, 5) : [];
  const demoSlots = products.slice(0, Math.max(0, 5 - sellerSlots.length));
  const verifiedCount = sellerSlots.filter((p) => p?.sellerVerified).length;

  // A live feed can legitimately return an empty section (nothing trending yet,
  // no deals today). Render nothing rather than a heading over an empty grid.
  if (sellerSlots.length === 0 && demoSlots.length === 0) return null;

  return (
    <section className={`${bgClass || 'bg-white'} border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden`}>
      {borderAccent && <div className={`absolute top-0 left-0 w-full h-1 ${borderAccent}`} />}
      <SectionHeader title={title} subtitle={subtitle} viewAllHref={viewAllHref} icon={icon} />

      {/* Counts only the rows whose seller the catalogue reports as verified.
          It used to count every injected row and call them all verified, so a
          section of five ordinary listings announced "5 verified seller
          products" — and the count disagreed with the badges beside it. */}
      {verifiedCount > 0 && (
        <div className="flex items-center gap-1.5 mb-3 -mt-1">
          <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-semibold text-blue-700">
            {verifiedCount} verified seller product{verifiedCount !== 1 ? 's' : ''} in this category
          </span>
        </div>
      )}

      <div className="card-grid-2-4">
        {/* Seller products first (with blue VERIFIED SELLER badge) */}
        {sellerSlots.map((product) => (
          <SellerProductCard key={product.id} product={product} formatCurrencyValue={formatCurrencyValue} />
        ))}
        {/* Demo products fill remaining grid slots */}
        {demoSlots.map((product) => (
          <ProductCard key={product.id} product={product} formatCurrencyValue={formatCurrencyValue} />
        ))}
      </div>

      {/* Brand Promo Cards — beneath product grid.
          Only cards that resolve to a real brand are rendered; the rest linked
          to /marketplace/brand/<something-that-does-not-exist> and 404'd. While
          the lookup is still loading it is not ready, and nothing is dropped —
          better to show the row briefly unfiltered than to flash an empty
          section on every page load. */}
      {resolvedBrandPromos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Top Brands in {title}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {resolvedBrandPromos.map(({ brand, href }) => (
              <BrandPromoCard key={brand.id} brand={brand} href={href} formatCurrencyValue={formatCurrencyValue} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── FAQ Section for AEO ───────────────────────────────────────────────────

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { country } = useRegion();
  // Answers are indexed by search engines, so a wrong one is worse than none:
  // the Indian entries promise GST invoices and PIN-code delivery, neither of
  // which exists in Qatar.
  const faqs = forRegion(MARKETPLACE_FAQ, country.code);

  return (
    <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
      <SectionHeader title="Frequently Asked Questions" subtitle={`Everything you need to know about KARTSEEK Marketplace in ${country.name}`} />
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-slate-200/80 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-slate-800">{faq.q}</h3>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${openIndex === i ? 'rotate-90' : ''}`} />
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed animate-in fade-in">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Campaign Banner Card ──────────────────────────────────────────────────

function CampaignBannerCard({ banner, formatCurrencyValue }: { banner: CampaignBanner | any; formatCurrencyValue: (n: number) => string }) {
  const Icon = getCatIcon(banner.icon);
  const sub = banner.startingPrice
    ? `${banner.subheadline} ${formatCurrencyValue(banner.startingPrice)}`
    : banner.subheadline;
  // Same two defences as the hero: an admin-authored banner has an image and
  // no gradient class, and neither field can be assumed present.
  const artwork: string | undefined = banner.imageUrl || banner.image || banner.bannerUrl || undefined;
  const gradient: string = banner.gradient || 'from-slate-800 to-slate-900';
  return (
    <section>
      <Link href={banner.ctaHref || '/'} className={`block bg-linear-to-r ${gradient} rounded-xl p-6 md:p-8 text-white relative overflow-hidden group hover:shadow-xl transition-all`}>
        {artwork && <BannerArtwork src={artwork} alt={banner.headline || 'Campaign'} />}
        <div className="relative z-10 flex items-center gap-6">
          <div className="flex-1">
            <span className="bg-white/20 backdrop-blur-sm text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{banner.tag}</span>
            <h3 className="text-xl md:text-2xl font-bold mt-3 mb-1">{banner.headline}</h3>
            <p className="text-sm opacity-80">{sub}</p>
            <span className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-5 py-2 text-sm rounded-lg mt-4 group-hover:shadow-md transition-all">
              {banner.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
          {!artwork && <Icon className="w-24 h-24 md:w-32 md:h-32 opacity-20 shrink-0 hidden md:block" />}
        </div>
      </Link>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN HOMEPAGE
// ══════════════════════════════════════════════════════════════════════════

// ── Seller Product Card (category-injected) ──────────────────────────────
// Displayed inside existing category sections — matches the demo ProductCard
// styling but includes a verified seller badge and real price/category data.

function SellerProductCard({ product, formatCurrencyValue }: { product: any; formatCurrencyValue: (n: number) => string }) {
  const discount = product.mrp > product.price
    ? Math.round((1 - product.price / product.mrp) * 100)
    : 0;
  const rating = product.rating ?? 4.0;
  const reviews = product.reviews ?? 0;
  // The detail route resolves a product UUID. This used to synthesise a slug from
  // the product name when `id` was missing ("prod-iphone-15-pro"), which the
  // catalogue rejects as a malformed id — a guaranteed 404. Without an id there
  // is nothing to link to, so render the card unclickable instead.
  const Card = product.id ? Link : 'div';
  const cardProps = product.id ? { href: zoneHref(productPath(product)) } : {};
  return (
    <Card
      {...(cardProps as any)}
      className="bg-white border border-blue-100 hover:border-blue-300 rounded-xl p-3 hover:shadow-lg transition-all duration-300 group relative flex flex-col"
    >
      {product.sellerVerified && (
        <div className="absolute top-0 left-0 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-br-lg rounded-tl-lg flex items-center gap-1 z-10">
          <BadgeCheck className="w-2.5 h-2.5" /> VERIFIED SELLER
        </div>
      )}
      {discount > 0 && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10">
          {discount}% OFF
        </div>
      )}
      <ProductThumb
        src={product.imageUrl || product.images?.[0]?.url}
        alt={product.name}
        brand={product.brand || product.sellerName}
        sizes={THUMB_SIZES.grid4}
        className="mt-2 mb-3 rounded-lg border border-slate-100"
      />
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wider">{product.brand || product.sellerName}</p>
        <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">{product.name}</h3>
        {/* Star rating badge — matches ProductCard design */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
            {rating.toFixed(1)} <Star className="w-2.5 h-2.5 fill-white" />
          </span>
          <span className="text-[11px] text-slate-400">({reviews})</span>
        </div>
        {/* The listing endpoint does not join subcategory, so render the trail
            only as far as it actually goes rather than "Electronics › undefined". */}
        {product.category && (
          <p className="text-[10px] text-slate-400 mb-2">
            {product.category}{product.subcategory ? ` › ${product.subcategory}` : ''}
          </p>
        )}
        <div className="mt-auto">
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
            <span className="font-bold text-lg text-slate-900 whitespace-nowrap">{formatCurrencyValue(product.price)}</span>
            {product.mrp > product.price && (
              <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-[11px] text-slate-400 line-through">{formatCurrencyValue(product.mrp)}</span>
                <span className="text-[11px] text-green-600 font-bold">{discount}% off</span>
              </span>
            )}
          </div>
          {product.sellerName && (
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 min-w-0">
              <Store className="w-2.5 h-2.5 shrink-0" /> <span className="truncate">{product.sellerName}</span>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function MarketplaceHome() {
  useModuleTitle('marketplace');
  const { formatCurrencyValue, country } = useRegion();
  // Both feeds are scoped to the market being browsed, and both re-fetch when
  // it changes — banners, category sections and seller ranking all follow it.
  const { feed, isLive, loading } = useMarketplaceHome(country.code);

  /**
   * When the current flash-deal window closes, or `null` if the feed does not
   * say. The flash-deals endpoint currently returns plain catalogue rows with
   * no deal window on them at all, so this is null in practice and the
   * countdown chip stays hidden — which is the point. It will light up on its
   * own once the backend starts scheduling deals.
   */
  const flashDealsEndsAt = useMemo<string | null>(() => {
    const rows: any[] = Array.isArray(feed?.flashDeals) ? feed.flashDeals : [];
    const ends = rows
      .map((r) => r?.endsAt ?? r?.dealEndsAt ?? r?.endDate ?? r?.validTill)
      .filter(Boolean)
      .map((t: string) => new Date(t).getTime())
      .filter((n) => Number.isFinite(n) && n > Date.now());
    return ends.length ? new Date(Math.min(...ends)).toISOString() : null;
  }, [feed]);
  const { groups: sellerGroups } = useApprovedByCategory(country.code);

  // The market's domestic payment scheme, if it has one — Himyan/NAPS in Qatar,
  // UPI in India, KNET in Kuwait. Drives the cashback banner below; markets
  // without one simply do not show it.
  const localPayment = getLocalPaymentMethods(country.code)[0];
  // Offer thresholds scale with the currency so the figures stay plausible:
  // a 150-unit reward is sensible in rupees, absurd in riyals.
  const cashbackOffer = CASHBACK_OFFERS[country.code] ?? { reward: 15, minOrder: 100 };
  // Bundled campaign and city content, narrowed to this market.
  // The feed's campaign banners were fetched and then thrown away — this read
  // the bundled array unconditionally, so a campaign an admin scheduled never
  // appeared on the storefront. Live wins; the bundle is the offline fallback
  // and is region-filtered here because only the backend scopes the live set.
  // No bundled fallback. `CAMPAIGN_BANNERS` stood here and every entry made a
  // commercial commitment nobody had authorised — "Instant cashback on every
  // Himyan and NAPS debit card payment", "up to 50% off with free
  // installation" — shown on any storefront whose admin had scheduled no
  // campaign, which is the default state. An absent promotion is an ordinary
  // fact; the section simply does not render.
  const campaignBanners: any[] = feed?.campaignBanners?.length ? feed.campaignBanners : [];

  // ── Recommendation Engine ──
  const { forYou, trending: recoTrending, crossModule, isLoading: recoLoading, trackClick } = useRecommendations('marketplace', null);

  // Real categories from the feed (with curated demo fallback when empty).
  const categories = pickCategories(feed?.categories);

  // Brand promo cards need a *real* brand to link to. Neither source supplies
  // one: the live feed's ids are presentation keys (`bp-e1`), and a third of the
  // bundled fallback names brands the catalogue does not carry. Resolving each
  // card's name against the brand list is what keeps "Top Brands" from linking
  // into a 404 — see lib/api/resolve-brand-link.ts.
  const [brandLookup, setBrandLookup] = useState<BrandLookup>(() => buildBrandLookup([]));
  useEffect(() => {
    let cancelled = false;
    loadBrandLookup().then((l) => { if (!cancelled) setBrandLookup(l); });
    return () => { cancelled = true; };
  }, []);

  // Show a skeleton shimmer during the initial API fetch to prevent the "flash
  // of old content" that occurred when demo data rendered immediately and was
  // then replaced by the live feed.
  if (loading) {
    return (
      <div className="min-h-screen animate-in fade-in duration-200">
        {/* Sticky category bar placeholder */}
        <div className="bg-white shadow-sm border-b border-slate-200/80 sticky top-(--mp-header-h) z-30">
          <div className="max-w-[1400px] mx-auto px-3 xs:px-4 py-2.5 flex gap-5 overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-4 w-16 bg-slate-200 rounded animate-pulse shrink-0" />
            ))}
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-3 xs:px-4 pt-5 space-y-6">
          {/* Hero banner placeholder */}
          <div className="h-56 md:h-72 bg-slate-200 rounded-xl animate-pulse" />
          {/* Category grid placeholder */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
            <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-4" />
            {/* Same ladder as the real grid below (`.cat-grid`), so the skeleton
                does not reflow into a different column count when data lands. */}
            <div className="cat-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-slate-200 rounded-xl animate-pulse" />
                  <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          {/* Product rows placeholder */}
          {[1, 2].map(s => (
            <div key={s} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
              <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-slate-100 p-3 space-y-3">
                    <div className="w-full aspect-square bg-slate-200 rounded-md animate-pulse" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
                    <div className="flex justify-between items-center pt-1">
                      <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                      <div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderSection = (section: any) => {
    switch (section.type) {
      case 'hero_slider':
        return <HeroBannerCarousel key={section.id} formatCurrencyValue={formatCurrencyValue} banners={section.banners} />;
      case 'trust_badges':
        return <TrustBadgeStrip key={section.id} title={section.title} />;
      case 'category_grid':
        return (
          <section key={section.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
            <SectionHeader title={section.title || "Shop by Category"} subtitle={section.subtitle || "Explore 20+ categories"} viewAllHref={section.viewAllHref || "/category-list"} />
            {/* `.cat-grid` ladders 3→4→5→6→8→10 columns. The flat
                `grid-cols-4 … gap-3` this replaces put four 56px tiles plus
                three 12px gaps into a 256px content box on a 320px phone, so
                the row ran 4px past the card on every small handset. */}
            <div className="cat-grid pt-1">
              {categories.map((cat: any) => {
                const Icon = getCatIcon(cat.iconName);
                const catImg = cat.imageUrl;
                return (
                  <Link key={cat.id} href={`/category/${cat.id}`} className="flex flex-col items-center justify-center gap-2 group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden ${!catImg ? cat.color : ''} group-hover:shadow-md group-hover:scale-105 transition-all duration-200 relative`}>
                      {catImg ? (
                        <img src={catImg} alt={cat.label} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-[10px] md:text-[11px] font-medium text-slate-700 text-center leading-tight group-hover:text-blue-600 transition-colors">{cat.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      case 'flash_deals': {
        /**
         * A rail with nothing in it is not a rail.
         *
         * Routing this through `pickProducts` stopped it inventing five deals
         * at prices nothing had quoted, but left the header, the countdown and
         * the gradient rule rendering over an empty grid — which reads as a
         * broken page rather than a quiet promotions period. The dedicated
         * /flash-deals route says so in words; a home rail just steps aside.
         */
        const deals = pickProducts(feed?.flashDeals, FLASH_DEALS, isLive);
        if (deals.length === 0) return null;
        return (
          <section key={section.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-500 via-orange-500 to-yellow-500" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-500 fill-red-500" />
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">{section.title || "Flash Deals"}</h2>
                </div>
                {flashDealsEndsAt && (
                  <div className="hidden md:flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Ends in</span>
                    <CountdownTimer endsAt={flashDealsEndsAt} />
                  </div>
                )}
              </div>
              <Link href={section.viewAllHref || "/offers"} className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/*
                Through pickProducts like every other rail: this rendered the
                bundled FLASH_DEALS unconditionally, so a live storefront with
                no flash deals still showed five of them at prices nothing had
                quoted, and each card linked to a product page that would 404.
              */}
              {deals.map((product) => (
                <ProductCard key={product.id} product={product} formatCurrencyValue={formatCurrencyValue} />
              ))}
            </div>
          </section>
        );
      }
      case 'product_carousel':
        return (
          <ProductGridSection
            key={section.id}
            title={section.title || "Best of Electronics"}
            subtitle={section.subtitle || "Top-rated products"}
            products={pickProducts(null, ELECTRONICS_PRODUCTS, isLive)}
            viewAllHref={section.viewAllHref || "/category/electronics"}
            icon={Laptop}
            sellerProducts={sellerGroups['electronics']}
            formatCurrencyValue={formatCurrencyValue}
          />
        );
      case 'brand_promo':
        return (
          <section key={section.id}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{section.title || "Top Brands"}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BRAND_PROMOS.electronics.flatMap((brand) => {
                // Same resolution as the in-grid promo row: a card that maps to
                // no catalogue brand is dropped rather than linked into a 404.
                if (!brandLookup.isReady) return [{ brand, href: `/brand/${brand.id}` }];
                const slug = brandLookup.resolve(brand);
                return slug ? [{ brand, href: `/brand/${slug}` }] : [];
              }).map(({ brand, href }) => (
                <BrandPromoCard key={brand.id} brand={brand} href={href} formatCurrencyValue={formatCurrencyValue} />
              ))}
            </div>
          </section>
        );
      default:
        return (
           /* Was pickProducts(null, ...), so this rail never looked at the feed. */
           <ProductGridSection
             key={section.id}
             title={section.title || "Products"}
             products={pickProducts(feed?.recommended, RECOMMENDED, isLive)}
             formatCurrencyValue={formatCurrencyValue}
           />
        );
    }
  };

  return (
    // Background comes from the marketplace shell (`.mp-surface`); bottom-nav
    // clearance now lives on the footer so there is no dead gap above it.
    <div className="min-h-screen animate-in fade-in duration-300">
      {/* The green "Live catalog — showing real marketplace data" strip that
          used to sit here was a developer diagnostic on a customer-facing
          storefront. It told shoppers nothing they need and implied, by
          contrast, that the page is sometimes showing data that is not real.
          `isLive` still drives whether the demo product arrays are rendered;
          it just no longer announces itself. */}

      {/* ── Top Categories Navigation Bar ──────────────────────────── */}
      <div className="bg-white shadow-sm border-b border-slate-200/80 sticky top-(--mp-header-h) z-30">
        <div className="max-w-[1400px] 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 overflow-x-auto hide-scrollbar">
          <div className="flex gap-5 py-2.5 text-sm font-medium text-slate-600 min-w-max">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.id}`}
                className="hover:text-blue-600 cursor-pointer transition-colors whitespace-nowrap"
              >
                {cat.label}
              </Link>
            ))}
            <Link href="/category-list" className="text-blue-600 hover:underline cursor-pointer whitespace-nowrap font-bold">
              All Categories →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 space-y-6 pt-5 3xl:px-8">
        
        {/* ══ FULL HOMEPAGE — Always rendered with all category sections ══ */}
        <>
            {/* 1. Hero Banner Carousel */}
            <HeroBannerCarousel formatCurrencyValue={formatCurrencyValue} banners={feed?.heroBanners} />

            {/* 3. Shop by Category */}
            <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
              <SectionHeader title="Shop by Category" subtitle="Explore 20+ categories" viewAllHref="/category-list" />
              <div className="cat-grid pt-1">
                {categories.map((cat) => {
                  const Icon = getCatIcon(cat.iconName);
                  const catImg = cat.imageUrl;
                  return (
                    <Link key={cat.id} href={`/category/${cat.id}`} className="flex flex-col items-center justify-center gap-2 group">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden ${!catImg ? cat.color : ''} group-hover:shadow-md group-hover:scale-105 transition-all duration-200 relative`}>
                        {catImg ? (
                          <img src={catImg} alt={cat.label} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <span className="text-[10px] md:text-[11px] font-medium text-slate-700 text-center leading-tight group-hover:text-blue-600 transition-colors">{cat.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* 4. Flash Deals — hidden entirely when no campaign is running. */}
            {pickProducts(feed?.flashDeals, FLASH_DEALS, isLive).length > 0 && (
            <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-500 via-orange-500 to-yellow-500" />
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-red-500 fill-red-500" />
                    <h2 className="text-lg md:text-xl font-bold text-slate-900">Flash Deals</h2>
                  </div>
                  {flashDealsEndsAt && (
                    <div className="hidden md:flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Ends in</span>
                      <CountdownTimer endsAt={flashDealsEndsAt} />
                    </div>
                  )}
                </div>
                <Link href="/offers" className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="card-grid-2-4">
                {pickProducts(feed?.flashDeals, FLASH_DEALS, isLive).map((product) => (
                  <ProductCard key={product.id} product={product} formatCurrencyValue={formatCurrencyValue} />
                ))}
              </div>
            </section>
            )}

            {/* 5. Best of Electronics + Brand Cards */}
            <ProductGridSection
              title="Best of Electronics"
              subtitle="Top-rated tech products"
              products={pickProducts(null, ELECTRONICS_PRODUCTS, isLive)}
              viewAllHref="/category/electronics"
              icon={Laptop}
              sellerProducts={sellerGroups['electronics']}
              formatCurrencyValue={formatCurrencyValue}
              brandLookup={brandLookup}
              brandPromos={feed?.brandPromos?.electronics ?? BRAND_PROMOS.electronics}
            />

            {/* 5b. Domestic payment cashback — rendered only where the region
                has a domestic scheme to promote. This banner used to be an
                unconditional UPI/rupee promotion, so a Doha shopper was offered
                "₹150 off with GPay/PhonePe/Paytm" — a currency they do not pay
                in and a payment network their bank cannot reach. */}
            {localPayment && (
              <section className="rounded-xl overflow-hidden relative">
                <div className="bg-linear-to-r from-violet-600 via-purple-700 to-indigo-700 p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0 text-3xl">💳</div>
                    <div>
                      <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
                        {localPayment.label} Cashback
                      </span>
                      <h3 className="text-white text-xl font-black mt-1">
                        Pay with {localPayment.label} &amp; save {formatCurrencyValue(cashbackOffer.reward, { decimals: 0 })} instantly
                      </h3>
                      <p className="text-violet-200 text-sm mt-0.5">
                        {localPayment.description ?? `Available on all ${localPayment.label} payments`}. Minimum order {formatCurrencyValue(cashbackOffer.minOrder, { decimals: 0 })}.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <Link href="/offers" className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-2.5 text-sm rounded-lg hover:bg-violet-50 transition-all mt-1">
                      Claim {formatCurrencyValue(cashbackOffer.reward, { decimals: 0 })} off <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </section>
            )}



            {/* 7. Fashion Store + Brand Cards */}
            <ProductGridSection
              title="Fashion Store"
              subtitle="Latest trends & styles"
              products={pickProducts(null, FASHION_PRODUCTS, isLive)}
              viewAllHref="/category/fashion"
              icon={Shirt}
              sellerProducts={sellerGroups['fashion']}
              formatCurrencyValue={formatCurrencyValue}
              brandLookup={brandLookup}
              brandPromos={feed?.brandPromos?.fashion ?? BRAND_PROMOS.fashion}
            />

            {/* 8. Home & Kitchen + Brand Cards */}
            <ProductGridSection
              title="Home & Kitchen"
              subtitle="Everything for your home"
              products={pickProducts(null, HOME_PRODUCTS, isLive)}
              viewAllHref="/category/home-kitchen"
              icon={Sofa}
              sellerProducts={sellerGroups['home-kitchen']}
              formatCurrencyValue={formatCurrencyValue}
              brandLookup={brandLookup}
              brandPromos={feed?.brandPromos?.home ?? BRAND_PROMOS.home}
            />

            {/* 9. Seasonal campaign banner for this market */}
            {campaignBanners[1] && (
              <CampaignBannerCard banner={campaignBanners[1]} formatCurrencyValue={formatCurrencyValue} />
            )}

            {/* 10. Beauty & Personal Care + Brand Cards */}
            <ProductGridSection
              title="Beauty & Personal Care"
              subtitle="Skincare, makeup & grooming"
              products={pickProducts(null, BEAUTY_PRODUCTS, isLive)}
              viewAllHref="/category/beauty"
              icon={Sparkles}
              sellerProducts={sellerGroups['beauty']}
              formatCurrencyValue={formatCurrencyValue}
              brandLookup={brandLookup}
              brandPromos={feed?.brandPromos?.beauty ?? BRAND_PROMOS.beauty}
            />

            {/* 11. Sports & Fitness + Brand Cards */}
            <ProductGridSection
              title="Sports & Fitness"
              subtitle="Gear up for performance"
              products={pickProducts(null, SPORTS_PRODUCTS, isLive)}
              viewAllHref="/category/sports"
              icon={Dumbbell}
              sellerProducts={sellerGroups['sports']}
              formatCurrencyValue={formatCurrencyValue}
              brandLookup={brandLookup}
              brandPromos={feed?.brandPromos?.sports ?? BRAND_PROMOS.sports}
            />

            {/* 12. Toys & Baby Products + Brand Cards */}
            <ProductGridSection
              title="Toys & Baby Products"
              subtitle="Fun for all ages"
              products={pickProducts(null, TOYS_PRODUCTS, isLive)}
              viewAllHref="/category/toys-baby"
              icon={Baby}
              sellerProducts={sellerGroups['toys-baby']}
              formatCurrencyValue={formatCurrencyValue}
              brandLookup={brandLookup}
              brandPromos={feed?.brandPromos?.toys ?? BRAND_PROMOS.toys}
            />

            {/* 13. Appliances + Brand Cards */}
            <ProductGridSection
              title="Appliances"
              subtitle="Smart home essentials"
              products={pickProducts(null, APPLIANCES_PRODUCTS, isLive)}
              viewAllHref="/category/appliances"
              icon={Tv}
              sellerProducts={sellerGroups['appliances']}
              formatCurrencyValue={formatCurrencyValue}
              brandLookup={brandLookup}
              brandPromos={feed?.brandPromos?.appliances ?? BRAND_PROMOS.appliances}
            />

            {/* A "Made in India — Atmanirbhar Bharat" rail stood here, rendered
                unconditionally: an Indian flag, a tricolour bar and six hardcoded
                Indian brands (boAt, Noise, Tata, Prestige, Mamaearth, Wildcraft)
                shown to every shopper, including in Doha where the platform
                trades. Nothing about it was region-gated.

                It also could not have worked as written. "Showing 847 verified
                Indian-origin products" was a literal — no query produced it —
                and its "Browse All" link went to `?origin=india`, a parameter
                neither the search page nor the products API has ever read.

                A local-origin rail is a good idea and should come back, but
                driven by real data: the catalogue has no country-of-origin field
                on `brands` or `products` yet, and picking six brand names per
                market by hand is how this one ended up advertising Indian
                manufacturing to Qatar. */}

            {/* 14. Trending Now */}
            <ProductGridSection
              title="Trending Now"
              subtitle="What everyone is buying"
              products={pickProducts(feed?.trending, TRENDING_PRODUCTS, isLive)}
              viewAllHref="/trending"
              icon={TrendingUp}
              formatCurrencyValue={formatCurrencyValue}
              borderAccent="bg-linear-to-r from-violet-500 via-purple-500 to-fuchsia-500"
            />

            {/* ── 🧠 Recommended For You (powered by recommendation engine) ── */}
            <RecommendationCarousel
              title="Recommended For You"
              icon="🎯"
              recommendations={forYou}
              module="marketplace"
              isLoading={recoLoading}
              onCardClick={trackClick}
            />

            {/* ── ✨ Explore Other Services ── */}
            <CrossModulePicks
              recommendations={crossModule}
              currentModule="marketplace"
              onCardClick={trackClick}
            />

            {/* 15. New Arrivals */}
            <ProductGridSection
              title="New Arrivals"
              subtitle="Just landed on KARTSEEK"
              products={pickProducts(feed?.newArrivals, NEW_ARRIVALS, isLive)}
              viewAllHref="/new-arrivals"
              icon={Sparkles}
              formatCurrencyValue={formatCurrencyValue}
              borderAccent="bg-linear-to-r from-blue-500 via-cyan-500 to-teal-500"
            />

            {/* 16. Best Sellers */}
            <ProductGridSection
              title="Best Sellers"
              subtitle="Top-rated by customers"
              products={pickProducts(feed?.bestSellers, BEST_SELLERS, isLive)}
              viewAllHref="/best-sellers"
              icon={Award}
              formatCurrencyValue={formatCurrencyValue}
              borderAccent="bg-linear-to-r from-amber-500 via-yellow-500 to-orange-500"
            />

            {/* 17. Deals of the Day */}
            <ProductGridSection
              title="Deals of the Day"
              subtitle="Massive savings, limited time"
              products={pickProducts(feed?.dealsOfDay, DEALS_OF_DAY, isLive)}
              viewAllHref="/deals"
              icon={Flame}
              formatCurrencyValue={formatCurrencyValue}
              borderAccent="bg-linear-to-r from-red-500 via-rose-500 to-pink-500"
            />

            {/* 18. Recommended For You */}
            <ProductGridSection
              title="Recommended For You"
              subtitle="Personalized picks"
              products={pickProducts(feed?.recommended, RECOMMENDED, isLive)}
              viewAllHref="/recommended"
              icon={Heart}
              formatCurrencyValue={formatCurrencyValue}
            />

            {/* 19. Sponsored Products */}
            <ProductGridSection
              title="Sponsored Products"
              subtitle="Featured by sellers"
              products={pickProducts(feed?.sponsored, SPONSORED_PRODUCTS, isLive)}
              formatCurrencyValue={formatCurrencyValue}
              bgClass="bg-slate-50"
            />
          </>

        {/* A "Shop by City" section stood here. Every card linked to
             `/?city=<slug>` — a parameter this page never reads and
             the products API has no filter for — so all five led back to the
             same unfiltered homepage. Each also carried a delivery guarantee
             ("Same-day delivery across West Bay, Al Sadd and Msheireb") that
             nothing in the platform verifies or honours.

             Removed rather than restyled: it needs a city filter end to end and
             a real delivery-coverage source before it can tell the truth. */}



        {/* ── Explore Directory (SEO footer links) ────────────────── */}
        <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Explore All Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {categories.slice(0, 12).map((cat: any) => (
              <div key={cat.id}>
                <Link href={`/category/${cat.id}`} className="text-sm font-bold text-slate-800 hover:text-blue-600 hover:underline mb-2 block">{cat.label}</Link>
                <div className="flex flex-col gap-0.5">
                  {(cat.subcategories || []).slice(0, 5).map((sub: any) => (
                    <Link
                      key={sub}
                      href={`/category/${cat.id}`}
                      className="text-xs text-slate-500 hover:text-blue-600 hover:underline"
                    >
                      {sub}
                    </Link>
                  ))}
                  {(cat.subcategories || []).length > 5 && (
                    <Link href={`/category/${cat.id}`} className="text-xs text-blue-600 hover:underline mt-0.5">See more…</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ FAQ SECTION (AEO) ═══════════════════════════════════ */}
        <FAQSection />

        {/* NOTE: this page used to render its own <footer> here, stacking a
            second site footer directly on top of the one in the marketplace
            layout — two `contentinfo` landmarks, duplicated link sets and a
            double copyright line. The layout footer is the single source of
            truth; its payment + compliance rows carry what was unique here. */}

      </div>
    </div>
  );
}
