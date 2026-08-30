'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MapPin, Search, Bell, User, Wallet, Gift, ChevronDown,
  ShoppingBag, ShoppingCart, Utensils, Pill, Stethoscope, Car,
  Globe, Package, Heart, TrendingUp, Clock, Star, ArrowRight,
  Zap, Shield, Truck, Hotel, Building2, Users, Sparkles,
} from 'lucide-react';
import { MOCK_RESTAURANTS } from '@/lib/demo-data/restaurant';
import { TRENDING_PRODUCTS } from '@/lib/demo-data/marketplace-home';
import { discountPercent } from '@/lib/marketplace/pricing';
import { useRegion, REGIONS as CONTEXT_REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import { AccountMenu } from '@/components/shared/account-menu';
import {
  Skeleton, SkeletonHero, SkeletonServiceGrid, SkeletonCarousel, SkeletonHeaderRow,
} from '@/components/ui';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import { WalletLoyaltyTiles } from '@/components/shared/wallet-loyalty-tiles';
import { RecentActivityFeed } from '@/components/shared/recent-activity-feed';
import { productPath } from '@/lib/marketplace/product-url';
const REGIONS = [
  { code: 'IN', name: 'India',        flag: '🇮🇳', city: 'New Delhi', currency: '₹'   },
  { code: 'IN', name: 'India',        flag: '🇮🇳', city: 'Mumbai',   currency: '₹' },
  { code: 'AE', name: 'UAE',          flag: '🇦🇪', city: 'Dubai',     currency: 'AED' },
  { code: 'QA', name: 'Qatar',        flag: '🇶🇦', city: 'Doha',      currency: 'QAR' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', city: 'Riyadh',    currency: 'SAR' },
];

const SERVICES = [
  { href: '/marketplace', label: 'Marketplace',   emoji: '🛍️', Icon: ShoppingBag,  color: 'bg-blue-50',   iconColor: 'text-blue-600',   ring: 'hover:ring-blue-300'   },
  { href: '/grocery',     label: 'Grocery',       emoji: '🥦', Icon: ShoppingCart, color: 'bg-green-50',  iconColor: 'text-green-600',  ring: 'hover:ring-green-300'  },
  { href: '/restaurant',  label: 'Food Delivery', emoji: '🍽️', Icon: Utensils,     color: 'bg-orange-50', iconColor: 'text-orange-500', ring: 'hover:ring-orange-300' },
  { href: '/pharmacy',    label: 'Pharmacy',      emoji: '💊', Icon: Pill,         color: 'bg-teal-50',   iconColor: 'text-teal-600',   ring: 'hover:ring-teal-300'   },
  { href: '/hotel-booking', label: 'Hotels',       emoji: '🏨', Icon: Hotel,        color: 'bg-rose-50',   iconColor: 'text-rose-600',   ring: 'hover:ring-rose-300'   },
  { href: '/doctor',      label: 'Doctor',        emoji: '🩺', Icon: Stethoscope,  color: 'bg-purple-50', iconColor: 'text-purple-600', ring: 'hover:ring-purple-300' },
  { href: '/taxi',        label: 'Taxi',          emoji: '🚖', Icon: Car,          color: 'bg-amber-50',  iconColor: 'text-amber-500',  ring: 'hover:ring-amber-300'  },
];

const PROMOS = [
  {
    badge: '🚀 New User',
    title: 'Flat 50% Off',
    subtitle: 'on your first ride!',
    desc: 'Use code SUPER50 at checkout.',
    cta: 'Book Now',
    href: '/taxi',
    from: 'from-slate-900',
    to: 'to-blue-950',
    accent: 'from-blue-500/30',
    Icon: Car,
  },
  {
    badge: '⚡ Flash Sale',
    title: 'Free Delivery',
    subtitle: 'on all grocery orders!',
    desc: 'No minimum order. Today only.',
    cta: 'Shop Grocery',
    href: '/grocery',
    from: 'from-emerald-900',
    to: 'to-teal-950',
    accent: 'from-emerald-500/30',
    Icon: ShoppingCart,
  },
  {
    badge: '💊 Health Deal',
    title: '25% OFF',
    subtitle: 'all medicines & wellness',
    desc: 'Use code HEALTH25.',
    cta: 'Order Now',
    href: '/pharmacy',
    from: 'from-purple-900',
    to: 'to-violet-950',
    accent: 'from-purple-500/30',
    Icon: Pill,
  },
];

const NAV_ITEMS = [
  { href: '/',             Icon: Zap,         label: 'Home'       },
  { href: '/marketplace',  Icon: ShoppingBag, label: 'Shop'       },
  { href: '/orders',       Icon: Package,     label: 'Orders'     },
  { href: '/wishlist',     Icon: Heart,       label: 'Favourites' },
  { href: '/profile',      Icon: User,        label: 'Profile'    },
];

export default function SuperAppHome() {
  const [region, setRegion]           = useState(REGIONS[0]);
  const [showPicker, setShowPicker]   = useState(false);
  const [detecting, setDetecting]     = useState(true);
  const [promoIdx, setPromoIdx]       = useState(0);
  const [search, setSearch]           = useState('');
  const [activeNav, setActiveNav]     = useState('/');
  const intervalRef                   = useRef<NodeJS.Timeout | null>(null);
  const { formatCurrencyValue, selectedRegion, setSelectedRegion } = useRegion();

  // ── Sync local region display with the global context's auto-detected country ──
  useEffect(() => {
    if (selectedRegion && selectedRegion !== 'ALL') {
      const match = REGIONS.find(r => r.code === selectedRegion);
      if (match) {
        setRegion(match);
        setDetecting(false);
      }
    }
  }, [selectedRegion]);

  // Also propagate manual picks back to the global context
  const handleRegionChange = (r: typeof REGIONS[number]) => {
    setRegion(r);
    setShowPicker(false);
    setSelectedRegion(r.code as SupportedCountryCode);
  };

  useEffect(() => {
    const t = setTimeout(() => setDetecting(false), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() =>
      setPromoIdx(i => (i + 1) % PROMOS.length), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const promo = PROMOS[promoIdx];

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto min-h-screen bg-slate-50 flex flex-col relative pb-safe-nav md:pb-0 overflow-x-clip">

      {/* ── Header ── */}
      <header className="sticky top-0 z-100 bg-white/90 backdrop-blur-md border-b border-slate-100 px-3 xs:px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1">
            <span className="font-black text-2xl tracking-tighter text-brand-600">KART</span>
            <span className="font-black text-2xl tracking-tighter text-slate-900">SEEK</span>
            <span className="ml-1 text-xs font-bold bg-brand-gradient text-white px-1.5 py-0.5 rounded-md">APP</span>
          </Link>

          {/* Region Picker */}
          <div className="relative hidden md:block">
            <button
              id="region-picker-btn"
              onClick={() => setShowPicker(v => !v)}
              className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors min-w-[120px]"
            >
              {detecting ? (
                <><Globe className="w-4 h-4 text-brand-600 animate-spin" /><span className="text-slate-500">Detecting…</span></>
              ) : (
                <><MapPin className="w-4 h-4 text-brand-600" /><CountryFlag code={region.code} size="md" />
                  <span className="font-semibold">{region.city}</span><ChevronDown className="w-3.5 h-3.5 text-slate-400" /></>
              )}
            </button>
            {showPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} ><DismissOnEscape onDismiss={() => setShowPicker(false)} /></div>
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-float border border-slate-100 z-50 py-1.5 animate-scale-in">
                  <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Region</p>
                  {REGIONS.map(r => (
                    <button key={r.city}
                    onClick={() => handleRegionChange(r)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50
                        ${region.code === r.code ? 'bg-blue-50 text-brand-700 font-bold' : 'text-slate-700'}`}>
                      <CountryFlag code={r.code} size="md" />
                      <span className="flex-1 text-left">{r.city}, {r.name}</span>
                      {region.code === r.code && <span className="w-2 h-2 rounded-full bg-brand-500" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <div className="hidden md:block relative w-64 lg:w-80">
            <input id="header-search" type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search in ${region.city}…`}
              className="w-full bg-slate-100 pl-9 pr-4 py-2 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all" />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <Link href="/notifications" id="notifications-btn"
            className="touch-target rounded-xl text-slate-500 hover:bg-slate-100 hover:text-brand-600 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </Link>
          {/* Carries the home page's sign-out control — see AccountMenu. */}
          <AccountMenu className="touch-target rounded-xl text-slate-600 hover:bg-slate-100 hover:text-brand-600" />
        </div>
      </header>

      {/* ── Mobile Search & Location ── */}
      <div className="md:hidden bg-white px-3 xs:px-4 pt-3 pb-3 border-b border-slate-100">
        <button id="mobile-region-btn" onClick={() => setShowPicker(v => !v)}
          className="flex items-center gap-1.5 text-sm mb-2.5">
          {detecting
            ? <><Globe className="w-4 h-4 text-brand-600 animate-spin" /><span className="text-slate-500">Detecting…</span></>
            : <><MapPin className="w-4 h-4 text-brand-600" /><CountryFlag code={region.code} size="sm" />
               <span className="font-semibold truncate max-w-[180px]">{region.city}, {region.name}</span>
               <ChevronDown className="w-3.5 h-3.5 text-slate-400" /></>}
        </button>
        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} ><DismissOnEscape onDismiss={() => setShowPicker(false)} /></div>
            <div className="absolute left-4 right-4 bg-white rounded-2xl shadow-float border border-slate-100 z-50 py-1.5 animate-scale-in">
              {REGIONS.map(r => (
                <button key={r.city}
                  onClick={() => handleRegionChange(r)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50
                    ${region.code === r.code ? 'text-brand-700 font-bold' : 'text-slate-700'}`}>
                  <CountryFlag code={r.code} size="lg" />
                  <span className="flex-1 text-left">{r.city}, {r.name}</span>
                  <span className="text-xs text-slate-400">{r.currency}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="relative">
          <input id="mobile-search" type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search in ${region.city}…`}
            className="w-full bg-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all" />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      <main className="flex-1 px-3 xs:px-4 py-4 xs:py-5 md:px-6 md:py-8 lg:px-8 3xl:px-12 4xl:px-16 3xl:py-10 space-y-7 animate-fade-in overflow-x-clip">

        {/* ── Wallet & Loyalty ── */}
        <WalletLoyaltyTiles />

        {/* ── Promo Carousel ── */}
        <section>
          <div className="reserve-hero">
            <div className={`bg-linear-to-br ${promo.from} ${promo.to} rounded-3xl overflow-hidden relative shadow-xl h-44 sm:h-52 md:h-56 3xl:h-64 flex items-center px-6 xs:px-7 md:px-12 transition-all duration-500`}>
              <div className="relative z-10 w-2/3">
                <span className="inline-block bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 uppercase tracking-wider">
                  {promo.badge}
                </span>
                <h2 className="text-white text-xl sm:text-2xl md:text-4xl font-black leading-tight mb-1">{promo.title}<br />{promo.subtitle}</h2>
                <p className="text-white/60 text-sm mb-4 hidden md:block">{promo.desc}</p>
                <Link href={promo.href} id={`promo-cta-${promoIdx}`}
                  className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm hover:bg-slate-100 transition-colors">
                  {promo.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className={`absolute right-0 top-0 bottom-0 w-2/5 bg-linear-to-bl ${promo.accent} to-transparent`} />
              <promo.Icon className="absolute -right-6 top-1/2 -translate-y-1/2 w-32 sm:w-48 h-32 sm:h-48 text-white/10" />
            </div>
          </div>
          {/* Dots. The visible pill stays 8px tall, but the hit area around it is
              a full 44x44 — an 8x8 button is not reachable with a thumb. */}
          <div className="flex justify-center mt-1">
            {PROMOS.map((_, i) => (
              <button key={i} id={`promo-dot-${i}`} onClick={() => setPromoIdx(i)}
                title={`Go to promotion ${i + 1}`}
                aria-label={`Go to promotion ${i + 1}`}
                className="touch-target px-1.5"
              >
                <span aria-hidden
                  className={`block rounded-full transition-all duration-300 ${i === promoIdx ? 'w-6 h-2 bg-brand-600' : 'w-2 h-2 bg-slate-300'}`} />
              </button>
            ))}
          </div>
        </section>

        {/* ── Services Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Our Services</h2>
            <Link href="/marketplace" className="text-xs font-semibold text-brand-600 inline-flex items-center gap-1 hover:gap-2 transition-all min-h-[44px] px-1 -mr-1">
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-7 gap-2 xs:gap-3 md:gap-4">
            {SERVICES.map(({ href, label, Icon, color, iconColor, ring }) => (
              <Link key={href} href={href} id={`service-${label.toLowerCase().replace(' ', '-')}`}
                className={`flex flex-col items-center group cursor-pointer`}>
                <div className={`w-16 h-16 md:w-20 md:h-20 ${color} rounded-2xl flex items-center justify-center mb-2
                  ring-2 ring-transparent ${ring} group-hover:scale-105 group-hover:shadow-md transition-all duration-200`}>
                  <Icon className={`w-7 h-7 md:w-8 md:h-8 ${iconColor}`} />
                </div>
                <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Stats Strip ── */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { icon: <Truck className="w-4 h-4 text-brand-600" />,  val: '30 min',  sub: 'Avg delivery' },
            { icon: <Star  className="w-4 h-4 text-amber-500" />,  val: '4.8 ★',   sub: 'App rating'   },
            { icon: <Shield className="w-4 h-4 text-emerald-600" />, val: '100%',  sub: 'Secure pay'   },
          ].map(({ icon, val, sub }) => (
            <div key={sub} className="card p-3 flex flex-col items-center text-center">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center mb-1.5">{icon}</div>
              <p className="font-black text-sm text-slate-900">{val}</p>
              <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
            </div>
          ))}
        </section>

        {/* ── Recent Orders ── */}
        <RecentActivityFeed />

        {/* ── Trending ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" /> Trending Now
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {[
              { label: 'Biryani',     emoji: '🍛', href: '/restaurant?q=biryani'     },
              { label: 'Groceries',   emoji: '🥬', href: '/grocery'                  },
              { label: 'Vitamins',    emoji: '💊', href: '/pharmacy?q=vitamins'       },
              { label: 'Hotels',      emoji: '🏨', href: '/hotel-booking'             },
              { label: 'Sedan Ride',  emoji: '🚗', href: '/taxi'                     },
              { label: 'Dermatology', emoji: '🩺', href: '/doctor?spec=dermatology'  },
              { label: 'Headphones',  emoji: '🎧', href: '/marketplace?q=headphones' },
            ].map(t => (
              <Link key={t.label} href={t.href} id={`trend-${t.label.toLowerCase()}`}
                className="shrink-0 flex items-center gap-2 bg-white border border-slate-200 hover:border-brand-300 hover:shadow-md px-3.5 py-2 rounded-2xl text-sm font-semibold text-slate-700 transition-all">
                <span>{t.emoji}</span> {t.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section className="grid grid-cols-2 gap-3">
          <Link href="/orders?filter=active" id="track-order-btn"
            className="card card-hover flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Clock className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Track Order</p>
              <p className="text-xs text-slate-400">Live updates</p>
            </div>
          </Link>
          <Link href="/support" id="get-help-btn"
            className="card card-hover flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Get Help</p>
              <p className="text-xs text-slate-400">24/7 support</p>
            </div>
          </Link>
        </section>

        {/* ── Nearby Grocery Stores ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-600" /> Nearby Grocery Stores
            </h2>
            <Link href="/grocery" className="text-xs font-semibold text-green-600 inline-flex items-center gap-1 hover:gap-2 transition-all min-h-[44px] px-1 -mr-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {[
              { id: 'gs-1', name: 'FreshMart Supermarket', rating: 4.8, time: '15-20 min', dist: '1.2 km', tags: ['Vegetables','Fruits','Dairy'], promoted: true, emoji: '🥬', bg: 'from-green-50 to-emerald-100' },
              { id: 'gs-2', name: 'KARTSEEK Daily Essentials', rating: 4.9, time: '10-15 min', dist: '0.8 km', tags: ['Snacks','Beverages','Instant Food'], emoji: '🛒', bg: 'from-blue-50 to-sky-100' },
              { id: 'gs-3', name: 'Premium Meat & Catch', rating: 4.6, time: '30-40 min', dist: '3.5 km', tags: ['Fresh Meat','Seafood','Poultry'], emoji: '🥩', bg: 'from-red-50 to-rose-100' },
              { id: 'gs-4', name: 'Organic Valley Farm', rating: 4.7, time: '25-35 min', dist: '2.4 km', tags: ['Organic','Farm Fresh','Vegan'], emoji: '🌿', bg: 'from-lime-50 to-green-100' },
              { id: 'gs-5', name: 'Metro Cash & Carry', rating: 4.5, time: '20-30 min', dist: '1.8 km', tags: ['Wholesale','Bulk Buy','Pantry'], promoted: true, emoji: '🏬', bg: 'from-indigo-50 to-blue-100' },
              { id: 'gs-6', name: 'Green Basket Veggies', rating: 4.8, time: '12-18 min', dist: '0.5 km', tags: ['Vegetables','Herbs','Salads'], emoji: '🥗', bg: 'from-emerald-50 to-teal-100' },
              { id: 'gs-7', name: 'Royal Bakery & Sweets', rating: 4.9, time: '20-25 min', dist: '2.1 km', tags: ['Bakery','Sweets','Cakes'], emoji: '🧁', bg: 'from-amber-50 to-yellow-100' },
              { id: 'gs-8', name: 'SpiceWorld Market', rating: 4.4, time: '15-25 min', dist: '1.6 km', tags: ['Spices','Masalas','Dry Fruits'], emoji: '🌶️', bg: 'from-orange-50 to-red-100' },
            ].map(s => (
              <Link key={s.id} href={`/grocery/store/${s.id}`} id={`home-${s.id}`}
                className="snap-start shrink-0 w-[240px] md:w-[260px] bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className={`relative h-28 bg-linear-to-br ${s.bg} flex items-center justify-center overflow-hidden`}>
                  <span className="text-5xl opacity-60 group-hover:scale-110 transition-transform duration-300">{s.emoji}</span>
                  {s.promoted && (
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">Promoted</span>
                  )}
                  <div className="absolute top-2 right-2 bg-green-600 text-white px-1.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-0.5 shadow-sm">
                    <Star className="w-3 h-3 fill-current" /> {s.rating}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5 truncate group-hover:text-green-600 transition-colors">{s.name}</h3>
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {s.tags.map(t => (
                      <span key={t} className="bg-gray-50 text-gray-500 text-[10px] px-1.5 py-0.5 rounded border border-gray-100">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-50 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-green-500" /> {s.time}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span>{s.dist}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Brand Logos ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Popular Brands</h2>
          </div>
          <div className="grid grid-cols-4 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-8 3xl:grid-cols-10 gap-y-5 gap-x-2 xs:gap-x-3">
            {[
              { name: 'Burger King',   emoji: '🍔', bg: 'bg-orange-50',  ring: 'ring-orange-200', href: '/restaurant/rest-1' },
              { name: "Domino's",      emoji: '🍕', bg: 'bg-blue-50',    ring: 'ring-blue-200',   href: '/restaurant/rest-2' },
              { name: 'Biryani Blues', emoji: '🍛', bg: 'bg-amber-50',   ring: 'ring-amber-200',  href: '/restaurant/rest-3' },
              { name: 'Healthy Bites', emoji: '🥗', bg: 'bg-green-50',   ring: 'ring-green-200',  href: '/restaurant/rest-4' },
              { name: 'Sushi Kingdom', emoji: '🍣', bg: 'bg-rose-50',    ring: 'ring-rose-200',   href: '/restaurant/rest-5' },
              { name: 'Grand Biryani', emoji: '🍲', bg: 'bg-yellow-50',  ring: 'ring-yellow-200', href: '/restaurant/rest-6' },
              { name: 'Arabia Bites',  emoji: '🧆', bg: 'bg-teal-50',    ring: 'ring-teal-200',   href: '/restaurant/rest-7' },
              { name: 'Pizza Palace',  emoji: '🍝', bg: 'bg-purple-50',  ring: 'ring-purple-200', href: '/restaurant/rest-8' },
            ].map(b => (
              <Link key={b.name} href={b.href} id={`brand-${b.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                className="flex flex-col items-center gap-2 group">
                <div className={`w-16 h-16 md:w-[72px] md:h-[72px] rounded-full ${b.bg} ring-2 ${b.ring} flex items-center justify-center text-2xl md:text-3xl
                  group-hover:scale-110 group-hover:shadow-lg group-hover:ring-4 transition-all duration-300 shadow-sm`}>
                  {b.emoji}
                </div>
                <span className="text-[11px] md:text-xs font-semibold text-slate-600 text-center leading-tight group-hover:text-slate-900 transition-colors truncate w-full">
                  {b.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Premium Restaurants ── */}
        {/* Full-bleed band. The negative margin must cancel <main>'s padding at
            EVERY breakpoint, not just the two it happened to match: with a flat
            `-mx-4 md:-mx-8` against `px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12
            4xl:px-16` the band overhung the page by 4px below 375px and by 8px
            from 768–1023 (clipped away, invisibly, by `overflow-x-clip` on
            <main>), and fell 16px/32px short of the edge at 1440 and 1920. */}
        <section className="relative -mx-3 xs:-mx-4 md:-mx-6 lg:-mx-8 3xl:-mx-12 4xl:-mx-16 px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12 4xl:px-16 py-8 md:py-10 overflow-hidden">
          {/* Gradient Background — Restaurant module highlight colors */}
          <div className="absolute inset-0 bg-linear-to-br from-orange-500 via-red-500 to-orange-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-10%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_110%,rgba(0,0,0,0.15),transparent_50%)]" />
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.04] bg-cross-pattern" />

          <div className="relative z-10">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                    <Utensils className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Premium Restaurants</h2>
                </div>
                <p className="text-white/70 text-sm font-medium ml-10">Top-rated dining experiences near you</p>
              </div>
              <Link href="/restaurant" id="view-all-premium"
                className="hidden md:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Restaurant Cards Scroll */}
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
              {MOCK_RESTAURANTS.filter(r => r.isOpen && r.rating >= 4.4).map(r => (
                <Link key={r.id} href={`/restaurant/${r.id}`} id={`premium-${r.id}`}
                  className="snap-start shrink-0 w-[260px] md:w-[280px] bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
                  
                  {/* Card Image */}
                  <div className="relative h-36 bg-slate-100 overflow-hidden">
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-orange-100 to-red-50 flex items-center justify-center">
                        <Utensils className="w-12 h-12 text-orange-200" />
                      </div>
                    )}
                    {/* Rating Badge */}
                    <div className="absolute top-3 left-3 bg-green-600 text-white px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-current" /> {r.rating}
                    </div>
                    {/* Offer Badge */}
                    {r.offer && (
                      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-slate-900/80 to-transparent px-3 pb-2 pt-6">
                        <span className="text-white text-xs font-bold">{r.offer}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5">
                    <h3 className="font-bold text-slate-900 text-sm mb-1 truncate group-hover:text-orange-600 transition-colors">{r.name}</h3>
                    <p className="text-xs text-slate-500 truncate mb-3">{r.cuisines.join(' · ')}</p>
                    
                    {/* Service Mode Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {r.services.includes('delivery') && (
                        <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-md border border-orange-100">
                          🚴 Delivery
                        </span>
                      )}
                      {r.services.includes('takeaway') && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-md border border-purple-100">
                          🛍️ Takeaway
                        </span>
                      )}
                      {r.services.includes('dine-in') && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-100">
                          🍽️ Dine-in
                        </span>
                      )}
                      {r.services.includes('table-booking') && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-md border border-blue-100">
                          📅 Book Table
                        </span>
                      )}
                    </div>

                    {/* Meta Row */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.deliveryTime}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{r.costForTwo} for two</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Mobile View All */}
            <Link href="/restaurant" id="mobile-view-all-premium"
              className="md:hidden flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-5 py-3 rounded-xl mt-5 transition-all w-full">
              Browse All Restaurants <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Trending Products (Marketplace) ── */}
        {/* Full-bleed band. The negative margin must cancel <main>'s padding at
            EVERY breakpoint, not just the two it happened to match: with a flat
            `-mx-4 md:-mx-8` against `px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12
            4xl:px-16` the band overhung the page by 4px below 375px and by 8px
            from 768–1023 (clipped away, invisibly, by `overflow-x-clip` on
            <main>), and fell 16px/32px short of the edge at 1440 and 1920. */}
        <section className="relative -mx-3 xs:-mx-4 md:-mx-6 lg:-mx-8 3xl:-mx-12 4xl:-mx-16 px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12 4xl:px-16 py-8 md:py-10 overflow-hidden">
          {/* Gradient Background — Marketplace module blue identity */}
          <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-indigo-600 to-blue-700" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_110%,rgba(0,0,0,0.15),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.04] bg-cross-pattern" />

          <div className="relative z-10">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Trending Products</h2>
                </div>
                <p className="text-white/70 text-sm font-medium ml-10">Most popular across all categories</p>
              </div>
              <Link href="/marketplace" id="view-all-trending"
                className="hidden md:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Product Cards Scroll */}
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
              {TRENDING_PRODUCTS.map(product => {
                const discount = discountPercent(product.mrp, product.price);
                return (
                  <Link key={product.id} href={productPath(product)} id={`trending-${product.id}`}
                    className="snap-start shrink-0 w-[220px] md:w-[240px] bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">

                    {/* Card Image Area */}
                    <div className="relative h-36 bg-linear-to-br from-slate-50 to-blue-50 flex items-center justify-center overflow-hidden">
                      <ShoppingBag className="w-14 h-14 text-blue-200 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-300" />
                      {/* Trending Badge */}
                      {product.badge && (
                        <div className={`absolute top-2.5 left-2.5 ${product.badgeColor || 'bg-violet-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm flex items-center gap-1`}>
                          <TrendingUp className="w-3 h-3" /> {product.badge}
                        </div>
                      )}
                      {/* Rating Badge */}
                      <div className="absolute top-2.5 right-2.5 bg-green-600 text-white px-1.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-0.5 shadow-sm">
                        <Star className="w-3 h-3 fill-current" /> {product.rating}
                      </div>
                      {/* Wishlist */}
                      {/* 28x28 was under the reachable minimum on a phone; the
                          badge keeps its size, the hit area is padded out to 44. */}
                      <button
                        className="absolute bottom-0.5 right-0.5 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"
                        title="Add to wishlist"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <span className="w-7 h-7 rounded-full bg-white/90 shadow-sm border border-slate-100 flex items-center justify-center hover:bg-red-50">
                          <Heart className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-3.5">
                      <p className="text-[10px] text-slate-400 font-semibold mb-0.5 uppercase tracking-widest">{product.brand}</p>
                      <h3 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{product.title}</h3>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[11px] text-slate-400">({product.reviews})</span>
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-bold text-lg text-slate-900">{formatCurrencyValue(product.price)}</span>
                        {product.mrp > product.price && (
                          <>
                            <span className="text-[11px] text-slate-400 line-through">{formatCurrencyValue(product.mrp)}</span>
                            <span className="text-[11px] text-green-600 font-bold">{discount}% off</span>
                          </>
                        )}
                      </div>

                      {/* Delivery */}
                      {product.delivery && (
                        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" /> {product.delivery}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Mobile View All */}
            <Link href="/marketplace" id="mobile-view-all-trending"
              className="md:hidden flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-5 py-3 rounded-xl mt-5 transition-all w-full">
              Browse All Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Nearby Hotels (Hotel Booking Module) ── */}
        {/* Full-bleed band. The negative margin must cancel <main>'s padding at
            EVERY breakpoint, not just the two it happened to match: with a flat
            `-mx-4 md:-mx-8` against `px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12
            4xl:px-16` the band overhung the page by 4px below 375px and by 8px
            from 768–1023 (clipped away, invisibly, by `overflow-x-clip` on
            <main>), and fell 16px/32px short of the edge at 1440 and 1920. */}
        <section className="relative -mx-3 xs:-mx-4 md:-mx-6 lg:-mx-8 3xl:-mx-12 4xl:-mx-16 px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12 4xl:px-16 py-8 md:py-10 overflow-hidden">
          {/* Gradient Background — Hotel Booking module rose/pink identity */}
          <div className="absolute inset-0 bg-linear-to-br from-rose-600 via-rose-500 to-pink-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_-10%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_110%,rgba(0,0,0,0.15),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.04] bg-cross-pattern" />

          <div className="relative z-10">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                    <Hotel className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Nearby Hotels</h2>
                </div>
                <p className="text-white/70 text-sm font-medium ml-10">Top-rated stays available near you</p>
              </div>
              <Link href="/hotel-booking" id="view-all-hotels"
                className="hidden md:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Hotel Cards Scroll */}
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
              {[
                { id: 'htl-001', name: 'The Grand Palace Hotel', city: 'Dubai, UAE', rating: 4.8, reviewCount: 1240, starRating: 5, type: 'Luxury', pricePerNight: 450, currency: 'AED', imageEmoji: '🏰', amenities: ['Pool', 'Spa', 'WiFi'], offer: '20% OFF', gradient: 'from-rose-100 to-amber-50' },
                { id: 'htl-002', name: 'KARTSEEK Business Suites', city: 'Doha, Qatar', rating: 4.6, reviewCount: 890, starRating: 4, type: 'Business', pricePerNight: 280, currency: 'QAR', imageEmoji: '🏢', amenities: ['WiFi', 'Gym', 'Restaurant'], offer: null, gradient: 'from-blue-100 to-indigo-50' },
                { id: 'htl-003', name: 'Seaside Family Resort', city: 'Mumbai, India', rating: 4.7, reviewCount: 2100, starRating: 5, type: 'Resort', pricePerNight: 8500, currency: '₹', imageEmoji: '🏖️', amenities: ['Beach', 'Pool', 'Kids Club'], offer: 'Free Breakfast', gradient: 'from-cyan-100 to-teal-50' },
                { id: 'htl-004', name: 'Heritage Boutique Hotel', city: 'London, UK', rating: 4.9, reviewCount: 430, starRating: 5, type: 'Boutique', pricePerNight: 320, currency: '£', imageEmoji: '🏛️', amenities: ['Spa', 'Fine Dining', 'Concierge'], offer: 'Suite Upgrade', gradient: 'from-purple-100 to-violet-50' },
                { id: 'htl-005', name: 'Budget Inn Express', city: 'Riyadh, Saudi Arabia', rating: 4.1, reviewCount: 560, starRating: 3, type: 'Budget', pricePerNight: 120, currency: 'SAR', imageEmoji: '🏨', amenities: ['WiFi', 'AC', 'Parking'], offer: null, gradient: 'from-emerald-100 to-green-50' },
                { id: 'htl-006', name: 'Royal Palm Resort', city: 'Muscat, Oman', rating: 4.5, reviewCount: 780, starRating: 5, type: 'Resort', pricePerNight: 45, currency: 'OMR', imageEmoji: '🌴', amenities: ['Pool', 'Spa', 'Beach'], offer: '15% OFF', gradient: 'from-amber-100 to-orange-50' },
              ].map(h => (
                <Link key={h.id} href={`/hotel-booking/hotel/${h.id}`} id={`nearby-${h.id}`}
                  className="snap-start shrink-0 w-[260px] md:w-[280px] bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">

                  {/* Card Image */}
                  <div className={`relative h-36 bg-linear-to-br ${h.gradient} flex items-center justify-center overflow-hidden`}>
                    <span className="text-5xl opacity-60 group-hover:scale-110 transition-transform duration-500">{h.imageEmoji}</span>
                    {/* Offer Badge */}
                    {h.offer && (
                      <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg shadow-sm">{h.offer}</span>
                    )}
                    {/* Rating Badge */}
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm text-slate-900 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {h.rating}
                    </div>
                    {/* Favorite */}
                    <button
                      className="absolute bottom-0.5 right-0.5 w-11 h-11 flex items-center justify-center transition-colors"
                      title="Add to favorites"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <span className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white shadow-sm">
                        <Heart className="w-4 h-4 text-slate-400" />
                      </span>
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-rose-600 transition-colors">{h.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{h.city}</p>
                      </div>
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ml-2">{h.type}</span>
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-1.5 my-2.5">
                      {h.amenities.map(a => (
                        <span key={a} className="bg-slate-50 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-100">{a}</span>
                      ))}
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                      <div>
                        <span className="font-black text-lg text-slate-900">{h.currency} {h.pricePerNight.toLocaleString('en')}</span>
                        <span className="text-xs text-slate-400 ml-1">/ night</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{h.reviewCount.toLocaleString('en')} reviews</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Mobile View All */}
            <Link href="/hotel-booking" id="mobile-view-all-hotels"
              className="md:hidden flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-5 py-3 rounded-xl mt-5 transition-all w-full">
              Browse All Hotels <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Trending Hospitals (Doctor Appointment Module) ── */}
        {/* Full-bleed band. The negative margin must cancel <main>'s padding at
            EVERY breakpoint, not just the two it happened to match: with a flat
            `-mx-4 md:-mx-8` against `px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12
            4xl:px-16` the band overhung the page by 4px below 375px and by 8px
            from 768–1023 (clipped away, invisibly, by `overflow-x-clip` on
            <main>), and fell 16px/32px short of the edge at 1440 and 1920. */}
        <section className="relative -mx-3 xs:-mx-4 md:-mx-6 lg:-mx-8 3xl:-mx-12 4xl:-mx-16 px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12 4xl:px-16 py-8 md:py-10 overflow-hidden">
          {/* Gradient Background — Doctor module blue/teal identity */}
          <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-blue-700 to-teal-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-10%,rgba(255,255,255,0.12),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_110%,rgba(0,0,0,0.15),transparent_50%)]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.04] bg-cross-pattern" />

          <div className="relative z-10">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Trending Hospitals</h2>
                </div>
                <p className="text-white/70 text-sm font-medium ml-10">Top-rated hospitals with verified specialists near you</p>
              </div>
              <Link href="/doctor" id="view-all-hospitals"
                className="hidden md:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Hospital Cards Scroll */}
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
              {[
                { id: 'hsp-001', name: 'Apollo Heart & Multi-Speciality Hospital', specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Pediatrics'], location: 'Jubilee Hills, Hyderabad', distance: '2.3 km', rating: 4.9, reviewCount: 1240, isOpen: true, openHours: '24/7', doctorCount: 85, facilities: ['Emergency 24/7', 'ICU', 'Operation Theater', 'Pharmacy', 'Lab & Diagnostics', 'Ambulance'] },
                { id: 'hsp-002', name: 'Fortis Memorial Research Institute', specialties: ['General Medicine', 'Dermatology', 'ENT', 'Gynecology'], location: 'Sector 44, Gurugram', distance: '4.1 km', rating: 4.8, reviewCount: 890, isOpen: true, openHours: '8AM – 10PM', doctorCount: 62, facilities: ['Emergency Care', 'Advanced Diagnostics', 'Pharmacy', 'Blood Bank', 'Physiotherapy'] },
                { id: 'hsp-003', name: 'Max Super Speciality Hospital', specialties: ['Cardiology', 'Gastroenterology', 'Pulmonology'], location: 'Saket, New Delhi', distance: '5.8 km', rating: 4.7, reviewCount: 720, isOpen: false, openHours: '8AM – 9PM', doctorCount: 45, facilities: ['Cath Lab', 'Endoscopy Suite', 'Pulmonary Lab', 'Pharmacy'] },
                { id: 'hsp-004', name: 'AIIMS Wellness Center', specialties: ['General Medicine', 'Psychiatry', 'Mental Health', 'Nephrology'], location: 'Ansari Nagar, New Delhi', distance: '6.2 km', rating: 4.9, reviewCount: 2100, isOpen: true, openHours: '24/7', doctorCount: 150, facilities: ['24/7 Emergency', 'Dialysis Unit', 'Mental Health Wing', 'Pharmacy'] },
                { id: 'hsp-005', name: 'Manipal Hospital — Whitefield', specialties: ['Orthopedics', 'Urology', 'Oncology', 'Physiotherapy'], location: 'Whitefield, Bangalore', distance: '3.5 km', rating: 4.8, reviewCount: 960, isOpen: true, openHours: '8AM – 10PM', doctorCount: 70, facilities: ['Operation Theater', 'Physiotherapy Unit', 'Chemotherapy Ward', 'Pharmacy'] },
                { id: 'hsp-006', name: 'Narayana Hrudayalaya', specialties: ['Cardiology', 'Pulmonology', 'Diabetes Care'], location: 'Bommasandra, Bangalore', distance: '8.0 km', rating: 4.7, reviewCount: 1380, isOpen: true, openHours: '24/7', doctorCount: 95, facilities: ['Cardiac ICU', 'Cath Lab', 'Diabetes Center', 'Emergency'] },
              ].map(h => (
                <Link key={h.id} href={`/doctor/hospital/${h.id}`} id={`trending-hospital-${h.id}`}
                  className="snap-start shrink-0 w-[280px] md:w-[300px] bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">

                  {/* Card Header — Gradient with Icon */}
                  <div className="relative h-32 bg-linear-to-br from-blue-50 via-teal-50 to-cyan-50 flex items-center justify-center overflow-hidden">
                    <Building2 className="w-12 h-12 text-blue-200 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-300" />
                    {/* Status Badge */}
                    <span className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold shadow-sm ${
                      h.isOpen ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${h.isOpen ? 'bg-white animate-pulse' : 'bg-white/70'}`} />
                      {h.isOpen ? 'Open Now' : 'Closed'}
                    </span>
                    {/* Rating Badge */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-lg shadow-sm">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-slate-900">{h.rating}</span>
                      <span className="text-[9px] text-slate-400">({h.reviewCount.toLocaleString('en')})</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 space-y-2.5">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">{h.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{h.location}
                        <span className="text-teal-600 font-semibold ml-auto bg-teal-50 px-1.5 py-0.5 rounded text-[10px]">{h.distance}</span>
                      </p>
                    </div>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-1">
                      {h.specialties.slice(0, 3).map(s => (
                        <span key={s} className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{s}</span>
                      ))}
                      {h.specialties.length > 3 && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">+{h.specialties.length - 3}</span>
                      )}
                    </div>

                    {/* Facilities */}
                    <div className="flex flex-wrap gap-1">
                      {h.facilities.slice(0, 3).map(f => (
                        <span key={f} className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />{f}
                        </span>
                      ))}
                      {h.facilities.length > 3 && (
                        <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">+{h.facilities.length - 3}</span>
                      )}
                    </div>

                    {/* Doctors & Hours */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-semibold text-xs">{h.doctorCount}</span>
                        <span className="text-slate-400 text-xs">Doctors</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {h.openHours}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Mobile View All */}
            <Link href="/doctor" id="mobile-view-all-hospitals"
              className="md:hidden flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-5 py-3 rounded-xl mt-5 transition-all w-full">
              Browse All Hospitals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Nearby Pharmacy (Pharmacy Module) ── */}
        {/* Full-bleed band. The negative margin must cancel <main>'s padding at
            EVERY breakpoint, not just the two it happened to match: with a flat
            `-mx-4 md:-mx-8` against `px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12
            4xl:px-16` the band overhung the page by 4px below 375px and by 8px
            from 768–1023 (clipped away, invisibly, by `overflow-x-clip` on
            <main>), and fell 16px/32px short of the edge at 1440 and 1920. */}
        <section className="relative -mx-3 xs:-mx-4 md:-mx-6 lg:-mx-8 3xl:-mx-12 4xl:-mx-16 px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12 4xl:px-16 py-8 md:py-10 overflow-hidden">
          {/* Gradient Background — Pharmacy module teal/cyan identity */}
          <div className="absolute inset-0 bg-linear-to-br from-teal-600 via-teal-500 to-cyan-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_110%,rgba(0,0,0,0.12),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.04] bg-cross-pattern" />

          <div className="relative z-10">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                    <Pill className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Nearby Pharmacy</h2>
                </div>
                <p className="text-white/70 text-sm font-medium ml-10">Verified pharmacies delivering medicines near you</p>
              </div>
              <Link href="/pharmacy" id="view-all-pharmacies"
                className="hidden md:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Pharmacy Cards Scroll */}
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
              {[
                { id: 'ph-1', name: 'HealthPlus Pharmacy', img: '🏥', rating: 4.7, distance: '0.5 km', delivery: '20 min', open: true, verified: true, orders: 3800, offer: '15% OFF', deliveryFee: 'Free', minOrder: '₹299' },
                { id: 'ph-2', name: 'Apollo Pharmacy', img: '🏪', rating: 4.8, distance: '1.2 km', delivery: '30 min', open: true, verified: true, orders: 5200, offer: 'Flat ₹100 OFF', deliveryFee: '₹25', minOrder: '₹399' },
                { id: 'ph-3', name: 'MedPlus Pharmacy', img: '💊', rating: 4.6, distance: '0.8 km', delivery: '18 min', open: true, verified: true, orders: 2400, offer: '25% OFF', deliveryFee: 'Free', minOrder: '₹199' },
                { id: 'ph-5', name: 'LifeCare Pharmacy', img: '❤️', rating: 4.9, distance: '2.0 km', delivery: '40 min', open: true, verified: true, orders: 4100, offer: null, deliveryFee: '₹40', minOrder: '₹499' },
                { id: 'ph-6', name: 'PharmEasy Store', img: '⚡', rating: 4.5, distance: '1.8 km', delivery: '22 min', open: true, verified: true, orders: 6300, offer: '20% OFF', deliveryFee: 'Free', minOrder: '₹249' },
                { id: 'ph-11', name: 'SkinFirst Pharmacy', img: '✨', rating: 4.7, distance: '1.6 km', delivery: '28 min', open: true, verified: true, orders: 2100, offer: '20% Skin Care', deliveryFee: 'Free', minOrder: '₹299' },
              ].map(store => (
                <Link key={store.id} href={`/pharmacy/stores/${store.id}`} id={`nearby-pharmacy-${store.id}`}
                  className="snap-start shrink-0 w-[250px] md:w-[270px] bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">

                  {/* Card Image */}
                  <div className="relative h-32 bg-linear-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center overflow-hidden">
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{store.img}</span>
                    {/* Offer Badge */}
                    {store.offer && (
                      <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg shadow-sm">{store.offer}</span>
                    )}
                    {/* Open/Closed */}
                    <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${store.open ? 'bg-emerald-500 text-white' : 'bg-red-100 text-red-700'}`}>
                      {store.open ? '● Open' : '● Closed'}
                    </div>
                    {/* Verified */}
                    {store.verified && (
                      <div className="absolute bottom-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-teal-600 transition-colors">{store.name}</h3>
                      <div className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                        <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                        <span className="text-[11px] font-black">{store.rating}</span>
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mb-2.5">
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{store.distance}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{store.delivery}</span>
                      <span className="flex items-center gap-0.5"><Truck className="w-3 h-3" />{store.deliveryFee}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-medium">Min: {store.minOrder}</span>
                      <span className="text-[10px] text-slate-400">{store.orders.toLocaleString('en')} orders</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Mobile View All */}
            <Link href="/pharmacy" id="mobile-view-all-pharmacies"
              className="md:hidden flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-5 py-3 rounded-xl mt-5 transition-all w-full">
              Browse All Pharmacies <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>



      {/* ── Comprehensive Directory Footer ── */}
      <footer className="bg-slate-900 text-slate-300 pt-12 xs:pt-16 pb-8 px-4 xs:px-6 md:px-12 3xl:px-16 4xl:px-20 mt-12 rounded-t-3xl md:rounded-none relative z-10">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 xs:gap-8 md:gap-4 mb-12">
            
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-1 mb-4">
                <span className="font-black text-2xl tracking-tighter text-white">KART</span>
                <span className="font-black text-2xl tracking-tighter text-teal-400">SEEK</span>
              </Link>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Your all-in-one super app for shopping, food, health & rides across Africa, Asia & the Middle East.
              </p>
            </div>

            {/* Shop & Order */}
            <div>
              <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Shop & Order</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/marketplace" className="hover:text-teal-400 transition-colors">Marketplace</Link></li>
                <li><Link href="/grocery" className="hover:text-teal-400 transition-colors">Fresh Groceries</Link></li>
                <li><Link href="/restaurant" className="hover:text-teal-400 transition-colors">Food Delivery</Link></li>
                <li><Link href="/pharmacy" className="hover:text-teal-400 transition-colors">Pharmacy & Meds</Link></li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Services</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/taxi" className="hover:text-teal-400 transition-colors">Taxi Booking</Link></li>
                <li><Link href="/hotel-booking" className="hover:text-teal-400 transition-colors">Hotel Booking</Link></li>
                <li><Link href="/doctor" className="hover:text-teal-400 transition-colors">Doctor Appointments</Link></li>
                <li><Link href="/wallet" className="hover:text-teal-400 transition-colors">KARTSEEK Pay</Link></li>
                <li><Link href="/rewards" className="hover:text-teal-400 transition-colors">Loyalty Rewards</Link></li>
              </ul>
            </div>

            {/* Partner With Us */}
            <div>
              <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Partner With Us</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/seller/login" className="hover:text-teal-400 transition-colors">Seller Portal</Link></li>
                <li><Link href="/seller/login" className="hover:text-teal-400 transition-colors">Driver / Delivery Portal</Link></li>
                <li><Link href="/franchise/opportunity" className="hover:text-teal-400 transition-colors flex items-center gap-2">Franchise <span className="bg-teal-500/20 text-teal-400 text-[10px] px-2 py-0.5 rounded-full font-bold">HOT</span></Link></li>
                <li><Link href="/admin" className="hover:text-teal-400 transition-colors">Admin Console</Link></li>
              </ul>
            </div>

            {/* Support & Legal */}
            <div>
              <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Support & Legal</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/support" className="hover:text-teal-400 transition-colors">Help Center</Link></li>
                <li><Link href="/support/contact" className="hover:text-teal-400 transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-teal-400 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} KARTSEEK Global. All rights reserved.</p>
            <div className="flex gap-4">
              <span className="hover:text-white cursor-pointer transition-colors">Facebook</span>
              <span className="hover:text-white cursor-pointer transition-colors">Twitter</span>
              <span className="hover:text-white cursor-pointer transition-colors">Instagram</span>
              <span className="hover:text-white cursor-pointer transition-colors">LinkedIn</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="mobile-nav md:hidden" role="navigation" aria-label="Mobile navigation">
        {NAV_ITEMS.map(({ href, Icon: NavIcon, label }) => (
          <Link key={href} href={href} id={`nav-${label.toLowerCase()}`}
            onClick={() => setActiveNav(href)}
            className={`mobile-nav-item ${activeNav === href ? 'active' : ''}`}
            aria-current={activeNav === href ? 'page' : undefined}>
            <NavIcon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
