'use client';
import { useModuleTitle } from '@/hooks/useModuleTitle';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Star, Flame, Clock, TrendingUp, Bike,
  ShoppingBag, Utensils, CalendarDays, ArrowRight, MapPin, ChevronRight,
  BadgePercent, Heart, Zap, Award, Timer, ChefHat, Tag,
  Sparkles, Users, Leaf, Shield,
} from 'lucide-react';
import RestaurantCard from '@/components/restaurant/restaurant-card';
import ServiceModeModal from '@/components/restaurant/service-mode-modal';
import { useRegion } from '@/lib/contexts/region-context';
import { useRecommendations } from '@/lib/hooks/use-recommendations';
import { RecommendationCarousel, CrossModulePicks } from '@/components/recommendations';
import { restaurantApi } from '@/lib/api/restaurant';
import type { RestaurantCardDto, PopularDishDto } from '@/lib/api/restaurant';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/* ═══════════════════════════════════════════════════════════════════════════
   EXTENDED RESTAURANT DATA
   ═══════════════════════════════════════════════════════════════════════════ */







type ServiceMode = 'delivery' | 'takeaway' | 'dine-in' | 'table-booking';

const SERVICE_PICKS = [
  { key:'delivery'      as ServiceMode, icon:Bike,        label:'Delivery',    desc:'At your doorstep',  color:'from-orange-500 to-red-500',    bg:'bg-orange-50',  border:'border-orange-200',  hoverBorder:'hover:border-orange-400'  },
  { key:'takeaway'      as ServiceMode, icon:ShoppingBag, label:'Takeaway',    desc:'Pick up & save',    color:'from-purple-500 to-violet-500', bg:'bg-purple-50',  border:'border-purple-200',  hoverBorder:'hover:border-purple-400'  },
  { key:'dine-in'       as ServiceMode, icon:Utensils,    label:'Dine-in',     desc:'Eat at restaurant', color:'from-emerald-500 to-green-500', bg:'bg-emerald-50', border:'border-emerald-200', hoverBorder:'hover:border-emerald-400' },
  { key:'table-booking' as ServiceMode, icon:CalendarDays,label:'Book Table',  desc:'Reserve a seat',    color:'from-blue-500 to-indigo-500',   bg:'bg-blue-50',    border:'border-blue-200',    hoverBorder:'hover:border-blue-400'    },
];

/* ── Countdown Timer ── */
function FlashTimer() {
  const [time, setTime] = useState({ h: 1, m: 59, s: 0 });
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) h = 0;
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-1">
      {[p(time.h), p(time.m), p(time.s)].map((v, i) => (
        <React.Fragment key={i}>
          <span className="bg-white text-rose-600 font-black text-sm px-2 py-0.5 rounded-lg min-w-[30px] text-center tabular-nums">{v}</span>
          {i < 2 && <span className="text-white font-black">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
}



/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function RestaurantHomePage() {
  useModuleTitle('restaurant');
  const { currentRegionConfig, formatCurrencyValue } = useRegion();
  const defaultCity = currentRegionConfig?.defaultCity || 'your area';

  // ── Recommendation Engine ──
  const { forYou, crossModule, isLoading: recoLoading, trackClick } = useRecommendations('restaurant', null);

  const [search, setSearch]               = useState('');
  const [activeCuisine, setActiveCuisine] = useState('all');
  const [activeFilter, setActiveFilter]   = useState('All');
  const [modalOpen, setModalOpen]         = useState(false);
  const [modalMode, setModalMode]         = useState<ServiceMode>('delivery');
  const [wishlist, setWishlist]           = useState<Set<string>>(new Set());

  const openServiceModal = (mode: ServiceMode) => { setModalMode(mode); setModalOpen(true); };
  const toggleWishlist   = (id: string) => setWishlist(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── Live data ─────────────────────────────────────────────────────────────
  //
  // One request carries the sections, cuisines and promotions; a second carries
  // the dishes. Both are region-scoped by the gateway from the request headers.
  const { data: feed, loading: feedLoading, error: feedError } = useAsyncData(
    () => restaurantApi.getHomeFeed(),
    [],
  );
  const { data: dishData } = useAsyncData(() => restaurantApi.getPopularDishes(12), []);

  const sections = feed?.sections ?? [];
  const sectionOf = (key: string) => sections.find(s => s.key === key)?.restaurants ?? [];

  /** Map an API row onto the props RestaurantCard takes. */
  const toCard = (r: RestaurantCardDto) => ({
    id: r.slug || r.id,
    name: r.name,
    rating: r.rating,
    // The feed reports preparation time in minutes; distance needs the
    // customer's coordinates, which this endpoint does not take, so it is left
    // out rather than approximated.
    deliveryTime: r.avgPrepTime ? `${r.avgPrepTime} min` : '—',
    cuisines: r.cuisines ?? [],
    imageUrl: r.imageUrl ?? undefined,
    offer: undefined as string | undefined,
    isPromoted: false,
    costForTwo: r.costForTwo,
    services: [
      ...(r.deliveryEnabled ? ['delivery'] : []),
      ...(r.takeawayEnabled ? ['takeaway'] : []),
      ...(r.dineInEnabled ? ['dine-in'] : []),
    ] as ('delivery' | 'takeaway' | 'dine-in' | 'table-booking')[],
  });

  // Every restaurant the feed returned, once each — the three sections overlap.
  const openRestaurants = useMemo(() => {
    const seen = new Map<string, ReturnType<typeof toCard>>();
    for (const s of sections) for (const r of s.restaurants) if (!seen.has(r.id)) seen.set(r.id, toCard(r));
    return [...seen.values()];
  }, [feed]);

  // The server already ranked these; re-sorting them here would only invent an
  // order it did not choose.
  const nearbyStores = useMemo(() => sectionOf('new').map(toCard), [feed]);
  const topRated     = useMemo(() => sectionOf('top-rated').map(toCard), [feed]);
  const fastDelivery = useMemo(
    () => sectionOf('featured').map(toCard).filter(r => r.deliveryTime !== '—'),
    [feed],
  );

  // Which restaurants a live promotion actually applies to.
  const promotedIds = useMemo(
    () => new Set((feed?.promotions ?? []).map(p => p.restaurantId)),
    [feed],
  );
  const withOffers  = useMemo(() => openRestaurants.filter(r => promotedIds.has(r.id)), [openRestaurants, promotedIds]);
  const dineIn      = useMemo(() => openRestaurants.filter(r => r.services.includes('dine-in')), [openRestaurants]);
  const vegFriendly = useMemo(
    () => openRestaurants.filter(r =>
      r.cuisines.some(c => ['Healthy', 'Vegan', 'Salads', 'South Indian', 'Vegetarian'].includes(c))),
    [openRestaurants],
  );

  const CUISINE_CATEGORIES = useMemo(
    () => (feed?.cuisines ?? []).map(c => ({
      id: c.slug,
      name: c.name,
      // No emoji column exists, and guessing one per cuisine name would be a
      // lookup table that silently fails on every cuisine not in it.
      emoji: '🍽️',
    })),
    [feed],
  );

  const PROMO_BANNERS = useMemo(() => {
    const palette = [
      'from-orange-500 to-amber-500', 'from-rose-500 to-pink-500',
      'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-500',
    ];
    const seen = new Set<string>();
    const distinct = (feed?.promotions ?? []).filter(p => {
      if (seen.has(p.title)) return false;
      seen.add(p.title);
      return true;
    });
    return distinct.slice(0, 4).map((p, i) => ({
      id: p.id,
      emoji: '🎁',
      title: p.title,
      subtitle: p.description
        ?? (p.type === 'PERCENTAGE'
          ? `${p.discountValue}% off`
          : `${formatCurrencyValue(p.discountValue)} off`),
      code: p.code ?? '',
      colors: palette[i % palette.length],
    }));
  }, [feed, formatCurrencyValue]);

  // "Flash deals" are the promotions that actually expire soon.
  const FLASH_DEALS = useMemo(() => {
    const now = Date.now();
    return (feed?.promotions ?? [])
      .filter(p => p.validUntil && new Date(p.validUntil).getTime() > now)
      .sort((a, b) => new Date(a.validUntil!).getTime() - new Date(b.validUntil!).getTime())
      .slice(0, 6)
      .map(p => ({
        id: p.id,
        restaurantId: p.restaurantId,
        name: p.title,
        rest: openRestaurants.find(r => r.id === p.restaurantId)?.name ?? '',
        discount: p.type === 'PERCENTAGE' ? Math.round(p.discountValue) : null,
        amountOff: p.type === 'PERCENTAGE' ? null : p.discountValue,
        minOrder: p.minOrderAmount,
        minutesLeft: Math.max(0, Math.round((new Date(p.validUntil!).getTime() - now) / 60000)),
      }));
  }, [feed, openRestaurants]);

  const FEATURED_DISHES = useMemo(
    () => (dishData?.dishes ?? []).map((d: PopularDishDto) => ({
      id: d.id,
      name: d.name,
      rest: d.restaurantName,
      price: d.price,
      rating: d.rating,
      dietaryType: d.dietaryType,
      imageUrl: d.imageUrl,
    })),
    [dishData],
  );

  // Promoted placement is a paid product this module does not sell yet, so the
  // section shows the restaurants running the largest live discount instead of
  // a hardcoded list of four.
  const SPONSORED_RESTAURANTS = useMemo(() => {
    const palette = [
      'from-orange-600 to-red-600', 'from-emerald-600 to-teal-600',
      'from-violet-600 to-indigo-600', 'from-rose-600 to-pink-600',
    ];
    return (feed?.promotions ?? []).slice(0, 4).map((p, i) => {
      const r = openRestaurants.find(x => x.id === p.restaurantId);
      return {
        id: r?.id ?? p.restaurantId,
        name: r?.name ?? p.title,
        cuisines: (r?.cuisines ?? []).join(' · '),
        offer: p.type === 'PERCENTAGE'
          ? `${Math.round(p.discountValue)}% OFF`
          : `${formatCurrencyValue(p.discountValue)} OFF`,
        rating: r?.rating ?? 0,
        time: r?.deliveryTime ?? '—',
        color: palette[i % palette.length],
      };
    }).filter(x => x.name);
  }, [feed, openRestaurants, formatCurrencyValue]);

  const cuisineFiltered = useMemo(() => {
    if (activeCuisine === 'all') return openRestaurants;
    return openRestaurants.filter(r =>
      r.cuisines.some(c => c.toLowerCase().includes(activeCuisine.toLowerCase()))
    );
  }, [activeCuisine, openRestaurants]);

  const FILTERS = ['All', 'Fast Delivery', 'Top Rated', 'Offers', 'Dine-in', 'Table Booking', 'Takeaway'];
  const searchFiltered = useMemo(() => {
    return cuisineFiltered.filter(r => {
      const matchSearch = search === '' || r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisines.some(c => c.toLowerCase().includes(search.toLowerCase()));
      const matchFilter =
        activeFilter === 'All' ||
        (activeFilter === 'Fast Delivery'  && parseInt(r.deliveryTime) <= 25) ||
        (activeFilter === 'Top Rated'      && r.rating >= 4.5) ||
        (activeFilter === 'Offers'         && !!r.offer) ||
        (activeFilter === 'Dine-in'        && r.services.includes('dine-in')) ||
        (activeFilter === 'Table Booking'  && r.services.includes('table-booking')) ||
        (activeFilter === 'Takeaway'       && r.services.includes('takeaway'));
      return matchSearch && matchFilter;
    });
  }, [cuisineFiltered, search, activeFilter]);

  const tagColorMap: Record<string, string> = {
    amber:'bg-amber-100 text-amber-700', green:'bg-green-100 text-green-700',
    purple:'bg-purple-100 text-purple-700', rose:'bg-rose-100 text-rose-700',
    teal:'bg-teal-100 text-teal-700', orange:'bg-orange-100 text-orange-700',
    pink:'bg-pink-100 text-pink-700', red:'bg-red-100 text-red-700',
  };

  // ── Loading / failure / empty ─────────────────────────────────────────────
  //
  // Three distinct states, deliberately. This page used to render hardcoded
  // restaurants, which meant a dead service and a healthy one looked exactly
  // the same on screen. A failure now says so instead of quietly showing an
  // empty storefront, and an empty region says *that* rather than pretending
  // the request failed.
  if (feedLoading) {
    return (
      <div className="px-3 xs:px-4 3xl:px-8 py-8 space-y-6">
        <div className="h-8 w-2/3 max-w-md bg-slate-100 rounded-xl animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[280px] h-40 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (feedError) {
    return (
      <div className="px-3 xs:px-4 3xl:px-8 py-16 flex flex-col items-center text-center">
        <Utensils className="w-12 h-12 text-slate-300 mb-4" />
        <h1 className="text-xl font-black text-slate-900 mb-1">We could not load restaurants</h1>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          The restaurant service did not respond. Nothing is wrong with your order history or account.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (openRestaurants.length === 0) {
    return (
      <div className="px-3 xs:px-4 3xl:px-8 py-16 flex flex-col items-center text-center">
        <MapPin className="w-12 h-12 text-slate-300 mb-4" />
        <h1 className="text-xl font-black text-slate-900 mb-1">No restaurants here yet</h1>
        <p className="text-sm text-slate-500 max-w-md">
          We have not signed up any restaurants in {defaultCity} so far. Try another area, or check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 xs:px-4 3xl:px-8 space-y-8 py-4 xs:py-5 md:py-8 pb-mobile-nav">

      {/* ── Hero ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-2">
          Hungry? <span className="bg-clip-text text-transparent bg-linear-to-r from-orange-500 to-red-500">We've got you</span> 🍽️
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm">Order delivery, takeaway, dine-in, or book a table at the best restaurants in {defaultCity}</p>
      </div>

      {/* ── Service Mode Picks ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SERVICE_PICKS.map(({ key, icon: Icon, label, desc, color, bg, border, hoverBorder }) => (
          <button key={key} id={`service-pick-${key}`} onClick={() => openServiceModal(key)}
            className={`${bg} ${border} ${hoverBorder} border rounded-2xl p-4 text-left hover:shadow-lg transition-all duration-300 group relative overflow-hidden min-h-[100px]`}>
            <div className={`absolute inset-0 bg-linear-to-br ${color} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-300`} />
            <div className="relative z-10">
              <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{label}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          1. PROMO BANNERS (horizontal scroll)
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1 snap-x snap-mandatory">
          {PROMO_BANNERS.map(p => (
            <Link key={p.id} href="/list?filter=offers" id={`promo-${p.id}`}
              className={`snap-start shrink-0 w-[280px] md:w-[320px] bg-linear-to-br ${p.colors} rounded-2xl p-5 text-white relative overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer block`}>
              <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full" />
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full" />
              <p className="text-3xl mb-2">{p.emoji}</p>
              <h3 className="text-lg font-black mb-1">{p.title}</h3>
              <p className="text-white/80 text-xs mb-4 leading-relaxed">{p.subtitle}</p>
              <div className="flex items-center justify-between">
                <span className="bg-white/20 border border-white/30 px-3 py-1 rounded-lg text-xs font-black tracking-wider">{p.code}</span>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. CUISINE CATEGORY FILTER
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 snap-x">
          {CUISINE_CATEGORIES.map(c => (
            <button key={c.id} id={`cuisine-${c.id}`} onClick={() => setActiveCuisine(c.id)}
              className={`snap-start shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border-2 transition-all duration-200 group ${
                activeCuisine === c.id ? 'bg-orange-50 border-orange-500 shadow-md shadow-orange-100' : 'bg-white border-slate-100 hover:border-orange-200'
              }`}>
              <span className={`text-xl transition-transform ${activeCuisine === c.id ? 'scale-110' : 'group-hover:scale-110'}`}>{c.emoji}</span>
              <span className={`text-[10px] font-bold whitespace-nowrap ${activeCuisine === c.id ? 'text-orange-700' : 'text-slate-600'}`}>{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Search + Filter Pills */}
      <section className="space-y-3">
        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search restaurants, cuisines, or dishes..."
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm shadow-sm transition-all" />
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <button aria-label="Filter" className="absolute right-3 top-2.5 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-orange-100 transition-colors">
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                activeFilter === f ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
              }`}>{f}
            </button>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. NEARBY RESTAURANTS (horizontal scroll)
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" /> New on KARTSEEK
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Recently joined in {defaultCity}</p>
          </div>
          <Link href="/list?sort=nearby" className="text-sm font-semibold text-orange-600 hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
          {nearbyStores.map(r => (
            <div key={r.id} className="snap-start shrink-0 w-[280px] md:w-[320px]">
              <RestaurantCard
                id={r.id} name={r.name} rating={r.rating}
                deliveryTime={r.deliveryTime} 
                cuisines={r.cuisines} imageUrl={(r as { imageUrl?: string }).imageUrl} emojiImage={(r as { img?: string }).img}
                offer={r.offer ?? undefined} isPromoted={r.isPromoted}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. FLASH DEALS (countdown)
          ══════════════════════════════════════════════════════════ */}
      <section className="bg-linear-to-r from-rose-600 via-orange-500 to-amber-500 rounded-3xl p-5 md:p-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative z-10 flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Flash Deals</h2>
              <p className="text-white/70 text-xs">Limited-time restaurant offers!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-white/80" />
            <FlashTimer />
          </div>
        </div>
        <div className="relative z-10 flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x snap-mandatory">
          {FLASH_DEALS.map(deal => (
            <Link key={deal.id} href={`/${deal.restaurantId}`} id={`flash-${deal.id}`}
              className="snap-start shrink-0 w-[165px] bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer block">
              <div className="h-24 bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center relative">
                <BadgePercent className="w-9 h-9 text-orange-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute top-2 right-2 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                  {deal.discount !== null ? `${deal.discount}% OFF` : `${formatCurrencyValue(deal.amountOff ?? 0)} OFF`}
                </span>
                {deal.minutesLeft < 24 * 60 ? (
                  <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                    ⏱ {deal.minutesLeft < 60 ? `${deal.minutesLeft} min` : `${Math.round(deal.minutesLeft / 60)} hr`} left
                  </span>
                ) : null}
              </div>
              <div className="p-2.5">
                <p className="font-bold text-slate-900 text-[11px] leading-tight line-clamp-2 mb-0.5">{deal.name}</p>
                <p className="text-slate-400 text-[10px] mb-1.5">{deal.rest}</p>
                <div className="flex items-center gap-1.5 mb-2 min-h-[20px]">
                  {deal.minOrder ? (
                    <span className="text-[10px] text-slate-500">Min {formatCurrencyValue(deal.minOrder)}</span>
                  ) : null}
                </div>
                <button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black py-1.5 rounded-lg transition-colors">View Restaurant</button>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. TOP RATED (horizontal scroll)
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" /> Top Rated
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Highest customer ratings in {defaultCity}</p>
          </div>
          <Link href="/list?sort=top-rated" className="text-sm font-semibold text-orange-600 hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
          {topRated.map(r => (
            <div key={r.id} className="snap-start shrink-0 w-[280px] md:w-[320px]">
              <RestaurantCard
                id={r.id} name={r.name} rating={r.rating}
                deliveryTime={r.deliveryTime} 
                cuisines={r.cuisines} imageUrl={(r as { imageUrl?: string }).imageUrl} emojiImage={(r as { img?: string }).img}
                offer={r.offer ?? undefined} isPromoted={r.isPromoted}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. FEATURED DISHES
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> Featured Dishes
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Hand-picked favourites from top kitchens</p>
          </div>
          <Link href="/list?sort=featured" className="text-sm font-semibold text-orange-600 hover:underline flex items-center gap-1">
            See All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
          {FEATURED_DISHES.map(dish => (
            <Link key={dish.id} href={`/item/${dish.id}`} id={`dish-${dish.id}`}
              className="snap-start shrink-0 w-[180px] bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-orange-300 hover:shadow-xl transition-all duration-300 group cursor-pointer block">
              <div className="h-28 bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center relative">
                {dish.imageUrl
                  ? <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  : <ChefHat className="w-9 h-9 text-orange-300 group-hover:scale-110 transition-transform duration-300" />}
                {dish.dietaryType ? (
                  <span className={`absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-lg ${
                    dish.dietaryType === 'VEG' ? 'bg-emerald-100 text-emerald-700'
                      : dish.dietaryType === 'VEGAN' ? 'bg-lime-100 text-lime-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {dish.dietaryType.replace('_', ' ')}
                  </span>
                ) : null}
                <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 px-1.5 py-0.5 rounded-md">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-bold">{dish.rating}</span>
                </div>
              </div>
              <div className="p-3">
                <p className="font-bold text-slate-900 text-[12px] leading-tight line-clamp-2 mb-0.5 group-hover:text-orange-600 transition-colors">{dish.name}</p>
                <p className="text-slate-400 text-[10px] mb-2">{dish.rest}</p>
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">{formatCurrencyValue(dish.price)}</span>
                  <button className="bg-orange-100 hover:bg-orange-200 text-orange-700 text-[9px] font-black px-2.5 py-1.5 rounded-lg transition-colors">Add +</button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7. FAST DELIVERY (horizontal scroll)
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Express Delivery
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Food at your door in under 25 minutes</p>
          </div>
          <Link href="/list?filter=fast" className="text-sm font-semibold text-orange-600 hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
          {fastDelivery.map(r => (
            <div key={r.id} className="snap-start shrink-0 w-[280px] md:w-[320px]">
              <RestaurantCard
                id={r.id} name={r.name} rating={r.rating}
                deliveryTime={r.deliveryTime} 
                cuisines={r.cuisines} imageUrl={(r as { imageUrl?: string }).imageUrl} emojiImage={(r as { img?: string }).img}
                offer={r.offer ?? undefined} isPromoted={r.isPromoted}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ══ 🧠 RECOMMENDED RESTAURANTS (recommendation engine) ══ */}
      <RecommendationCarousel
        title="Recommended Restaurants"
        icon="🍽️"
        recommendations={forYou}
        module="restaurant"
        isLoading={recoLoading}
        onCardClick={trackClick}
      />

      {/* ══ ✨ EXPLORE OTHER SERVICES ══ */}
      <CrossModulePicks
        recommendations={crossModule}
        currentModule="restaurant"
        onCardClick={trackClick}
      />

      {/* ══════════════════════════════════════════════════════════
          8. SPONSORED RESTAURANTS
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-purple-600" /> Sponsored
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Special offers from promoted restaurants</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
          {SPONSORED_RESTAURANTS.map(sp => (
            <Link key={sp.id} href={`/${sp.id}`} id={`sponsored-${sp.id}`}
              className={`snap-start shrink-0 w-[270px] bg-linear-to-br ${sp.color} rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group`}>
              <div className="p-5 relative">
                {/*
                  Labelled "Offer", not "Sponsored". Promoted placement is a paid
                  product this module does not sell yet, so calling these
                  sponsored would be a false disclosure — these are simply the
                  restaurants running the largest live discount.
                */}
                <div className="absolute top-3 right-3 bg-white/20 border border-white/30 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">OFFER</div>
                <BadgePercent className="w-11 h-11 text-white/90 block mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-black text-white text-base mb-0.5">{sp.name}</h3>
                <p className="text-white/70 text-xs mb-3">{sp.cuisines}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg mb-1">
                      <Tag className="w-3 h-3" /> {sp.offer}
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-[10px]">
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-white/80 text-white/80" /> {sp.rating}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {sp.time}</span>
                    </div>
                  </div>
                  <button className="bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-black px-3 py-1.5 rounded-xl transition-colors">Order</button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          9. RESTAURANTS WITH OFFERS (horizontal scroll)
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-rose-500" /> Best Offers
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Save more with exclusive deals</p>
          </div>
          <Link href="/list?filter=offers" className="text-sm font-semibold text-orange-600 hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
          {withOffers.map(r => (
            <div key={r.id} className="snap-start shrink-0 w-[280px] md:w-[320px]">
              <RestaurantCard
                id={r.id} name={r.name} rating={r.rating}
                deliveryTime={r.deliveryTime} 
                cuisines={r.cuisines} imageUrl={(r as { imageUrl?: string }).imageUrl} emojiImage={(r as { img?: string }).img}
                offer={r.offer ?? undefined} isPromoted={r.isPromoted}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          10. DINE-IN & TABLE BOOKING
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-emerald-600" /> Dine-In Experiences
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Eat in · table reservations available</p>
          </div>
          <Link href="/list?filter=dine-in" className="text-sm font-semibold text-orange-600 hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
          {dineIn.map(r => (
            <div key={r.id} className="snap-start shrink-0 w-[280px] md:w-[320px]">
              <RestaurantCard
                id={r.id} name={r.name} rating={r.rating}
                deliveryTime={r.deliveryTime} 
                cuisines={r.cuisines} imageUrl={(r as { imageUrl?: string }).imageUrl} emojiImage={(r as { img?: string }).img}
                offer={r.offer ?? undefined} isPromoted={r.isPromoted}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          11. VEG-FRIENDLY (horizontal scroll)
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600" /> Veg & Healthy
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Great vegetarian & health-conscious options</p>
          </div>
          <Link href="/list?filter=veg" className="text-sm font-semibold text-orange-600 hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
          {vegFriendly.map(r => (
            <div key={r.id} className="snap-start shrink-0 w-[280px] md:w-[320px]">
              <RestaurantCard
                id={r.id} name={r.name} rating={r.rating}
                deliveryTime={r.deliveryTime} 
                cuisines={r.cuisines} imageUrl={(r as { imageUrl?: string }).imageUrl} emojiImage={(r as { img?: string }).img}
                offer={r.offer ?? undefined} isPromoted={r.isPromoted}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          12. ALL RESTAURANTS — filtered grid
          ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            {searchFiltered.length} restaurant{searchFiltered.length !== 1 ? 's' : ''}
            {activeCuisine !== 'all' ? ` · ${CUISINE_CATEGORIES.find(c => c.id === activeCuisine)?.name}` : ` in ${defaultCity}`}
          </h2>
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Sorted by relevance
          </div>
        </div>

        {searchFiltered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {searchFiltered.map(r => (
              <RestaurantCard
                key={r.id} id={r.id} name={r.name} rating={r.rating}
                deliveryTime={r.deliveryTime} 
                cuisines={r.cuisines} imageUrl={(r as { imageUrl?: string }).imageUrl} emojiImage={(r as { img?: string }).img}
                offer={r.offer ?? undefined} isPromoted={r.isPromoted}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No restaurants found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search terms</p>
            <button onClick={() => { setSearch(''); setActiveFilter('All'); setActiveCuisine('all'); }}
              className="mt-4 text-orange-600 font-bold text-sm hover:text-orange-700">
              Clear all filters
            </button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          13. TRUST SECTION
          ══════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Shield, color:'orange', title:'Safe & Hygienic',   sub:'All restaurants FSSAI certified & kitchen-verified' },
            { icon: Clock,  color:'blue',   title:'On-time Delivery',  sub:'95% of orders delivered within estimated time' },
            { icon: Users,  color:'green',  title:'2M+ Happy Diners',  sub:'Rated by millions of food lovers across cities' },
          ].map(({ icon: Icon, color, title, sub }) => (
            <div key={title} className="flex items-start gap-3">
              <div className={`w-10 h-10 bg-${color}-50 rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{title}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Service Mode Modal */}
      <ServiceModeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} mode={modalMode} />
    </div>
  );
}
