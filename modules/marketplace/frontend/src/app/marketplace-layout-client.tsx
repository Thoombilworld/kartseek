'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  User,
  Heart,
  ShoppingCart,
  X,
  MapPin,
  Menu,
  ChevronDown,
  Store,
  Globe,
  Gift,
  Tag,
  Crosshair,
  ExternalLink,
  MessageCircle,
  Camera,
  Play,
  Mail,
  Phone,
  Shield,
  CreditCard,
  Truck,
  RotateCcw,
  Link2,
} from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/config/social-links';

/**
 * Icon and hover colour per network. Kept beside the footer rather than in the
 * shared config so that module stays free of React and can be imported by the
 * SEO schema, which runs where lucide components are not wanted.
 */
const SOCIAL_ICONS = {
  facebook: ExternalLink,
  twitter: MessageCircle,
  instagram: Camera,
  linkedin: Link2,
  youtube: Play,
} as const;

const SOCIAL_HOVER = {
  facebook: 'hover:bg-blue-600',
  twitter: 'hover:bg-sky-500',
  instagram: 'hover:bg-pink-600',
  linkedin: 'hover:bg-blue-700',
  youtube: 'hover:bg-red-600',
} as const;
import Link from 'next/link';
import { ZoneLink } from '@/components/zone-link';
import { useRouter, usePathname } from 'next/navigation';

import { useCartContext } from '@/lib/contexts/cart-context';
import { useRegion, REGIONS } from '@/lib/contexts/region-context';
import {
  LANGUAGES,
  getDirection,
  getEntityLine,
  getLocationSearchPlaceholder,
} from '@/lib/localization';
import { getMarketplaceDeliveryRule } from '@/lib/marketplace/delivery';

/**
 * Free-delivery threshold per market, in that market's own currency.
 *
 * Currently unused: order-service prices delivery off a single `rateConfig` for
 * all markets, so quoting these here promised a threshold checkout would not
 * honour. Kept for when the backend can price per market.
 */
const FREE_DELIVERY_THRESHOLDS: Record<string, number> = {
  QA: 100,
  IN: 499,
  AE: 100,
  SA: 100,
  BH: 10,
  KW: 10,
  OM: 10,
  GB: 35,
  US: 35,
  SG: 40,
};

/** Short labels for the footer's payment summary. */
const PAYMENT_SUMMARY_LABEL: Record<string, string> = {
  card: 'Cards',
  debit_national: 'Debit',
  mada: 'mada',
  knet: 'KNET',
  benefit: 'BenefitPay',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  samsung_pay: 'Samsung Pay',
  telecom_wallet: 'Ooredoo Money',
  wallet: 'Wallet',
  cod: 'COD',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  netbanking: 'Net Banking',
  paynow: 'PayNow',
  grabpay: 'GrabPay',
  ach: 'ACH',
  sadad: 'SADAD',
};
import type { SupportedCountryCode } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import { AccountMenu } from '@/components/shared/account-menu';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const NAV_LINKS = [
  { label: 'Electronics', href: '/category/electronics' },
  { label: 'Mobiles', href: '/category/mobiles-tablets' },
  { label: 'Fashion', href: '/category/fashion' },
  { label: 'Home & Kitchen', href: '/category/home-kitchen' },
  { label: 'Beauty', href: '/category/beauty' },
  { label: 'Appliances', href: '/category/appliances' },
  { label: 'Sports', href: '/category/sports' },
  { label: 'Toys & Baby', href: '/category/toys-baby' },
  { label: 'Books', href: '/category/books' },
  { label: 'Watches', href: '/category/watches' },
  { label: 'All →', href: '/category-list' },
];

// The language picker, the payment row and the compliance row are all derived
// from the active market at render time — see `LanguagePicker` and the footer
// below. They used to be hard-coded lists here: eight languages (including
// Telugu, Bengali, Marathi and Kannada, which the platform has no dictionaries
// for), an Indian payment set, and Indian regulator badges — all shown to every
// market, so a Qatari shopper was offered Kannada and told the store was
// "DPIIT Certified" and "RBI Compliant".

// ── Mobile bottom-nav items (active state derived from the current route) ────
const BOTTOM_NAV = [
  { href: '/', label: 'Shop', Icon: ShoppingBag, exact: true },
  { href: '/category-list', label: 'Categories', Icon: Menu, exact: false },
  { href: '/cart', label: 'Cart', Icon: ShoppingCart, exact: false },
  { href: '/wishlist', label: 'Wishlist', Icon: Heart, exact: false },
  { href: '/profile', label: 'Account', Icon: User, exact: false },
];

/**
 * Close a popover when the user clicks/taps outside it or presses Escape.
 * `touchstart` matters on mobile Safari, where a document-level `mousedown`
 * listener is not reliably fired for taps on non-interactive elements.
 */
function useDismissOnOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

// ── Country picker ────────────────────────────────────────────────────────
// Rendered in both the desktop top bar and the mobile utility row, so mobile
// users can switch country/currency too (it was previously desktop-only).

function CountryPicker({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismissOnOutside(open, close);
  const { currentRegionConfig, country, setSelectedRegion, allRegions } = useRegion();
  // `currentRegionConfig` is null only under the admin-only `ALL` pseudo-region.
  // Falling back to India there showed a Qatari shopper an Indian flag in the
  // header; `country` already resolves `ALL` to the platform's home market.
  const region = currentRegionConfig || REGIONS[country.code];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 font-medium text-white transition-colors border border-white/30 rounded-lg hover:border-white/60 hover:bg-white/10 ${compact ? 'px-2 py-1.5 min-h-[44px]' : 'px-2.5 py-1.5 min-h-[44px]'}`}
        aria-label={`Select country, currently ${region.name}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {!compact && <Globe className="w-3.5 h-3.5 text-blue-100" />}
        <CountryFlag code={region.code} size="md" />
        <span className="text-xs font-bold">{region.name}</span>
        <ChevronDown
          className={`w-3 h-3 text-blue-200 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-2 bg-white border border-slate-200 shadow-xl rounded-xl p-2 w-56 max-w-[calc(100vw-1.5rem)] z-50 max-h-80 overflow-y-auto animate-scale-in"
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">
            Select Country
          </p>
          {allRegions.map((r) => (
            <button
              key={r.code}
              role="option"
              aria-selected={region.code === r.code}
              onClick={() => {
                setSelectedRegion(r.code);
                setOpen(false);
              }}
              className={`w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${region.code === r.code ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <CountryFlag code={r.code} size="md" />
              <span>{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Language picker ───────────────────────────────────────────────────────

function LanguagePicker({
  lang,
  onChange,
  align = 'right',
}: {
  lang: string;
  onChange: (code: string) => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismissOnOutside(open, close);
  const { country, currentLanguage, setCurrentLanguage } = useRegion();

  // The one rule for which languages a market offers — Arabic and English in
  // Qatar, the regional languages in India.
  const options = country.languages;

  // Nothing to pick between in a single-language market; one dead control reads
  // as broken.
  if (options.length < 2) return null;

  const active = LANGUAGES[currentLanguage] ?? LANGUAGES.en;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-medium text-white transition-colors border border-white/30 rounded-lg px-2.5 py-1.5 min-h-[44px] hover:border-white/60 hover:bg-white/10"
        aria-label={`Select language, currently ${active.name}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">{currentLanguage.toUpperCase()}</span>
        <ChevronDown
          className={`w-3 h-3 text-blue-200 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-40 z-50`}
        >
          {options.map((code) => {
            const meta = LANGUAGES[code];
            const isActive = code === currentLanguage;
            return (
              <button
                key={code}
                role="option"
                aria-selected={isActive}
                lang={code}
                dir={getDirection(code)}
                onClick={() => {
                  setCurrentLanguage(code);
                  onChange(code.toUpperCase());
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
              >
                <span>{meta.nativeName}</span>
                <span className="text-[10px] font-mono text-slate-400">{code.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Footer column (accordion on mobile, always open from md up) ───────────

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800 md:border-0 py-1 md:py-0">
      {/* md+ : plain heading. Below md: a toggle, so the footer fits on a phone
          without burying the links behind `hidden md:block` as it used to. */}
      <h4 className="hidden md:block text-white font-bold text-sm mb-4 uppercase tracking-wider">
        {title}
      </h4>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="md:hidden w-full flex items-center justify-between text-left py-3"
      >
        <span className="text-white font-bold text-sm uppercase tracking-wider">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`${open ? 'block' : 'hidden'} md:block pb-3 md:pb-0`}>{children}</div>
    </div>
  );
}

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCartContext();
  const [query, setQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [location, setLocation] = useState('Detecting...');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState('');
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState('EN');

  const headerRef = useRef<HTMLElement>(null);
  const { setSelectedRegion, country, formatCurrencyValue, paymentMethods } = useRegion();

  // The threshold checkout actually applies, not a marketing number.
  //
  // This footer used to advertise a per-market figure (IN 499, QA 100, GB 35 …)
  // that nothing server-side honoured: order-service prices every market off one
  // `rateConfig`, so a ₹600 basket promised free delivery here and was charged
  // for it at checkout. `FREE_DELIVERY_THRESHOLDS` is kept below for the day the
  // backend can price per market; until then the promise has to match the bill.
  const freeDeliveryThreshold = getMarketplaceDeliveryRule(country.code).freeAbove;

  // The methods this market actually clears, deduplicated to the labels a
  // shopper recognises.
  const paymentSummary = [
    ...new Set(paymentMethods.map((m) => PAYMENT_SUMMARY_LABEL[m.type] ?? m.label)),
  ]
    .slice(0, 4)
    .join(', ');

  // Regulators and certifications that bind the platform in this market. The
  // footer previously claimed "GST Registered / DPIIT Certified / RBI Compliant"
  // in every market — untrue, and in a regulated space that is a real problem.
  const complianceBadges = [
    ...(country.tax.registrationLabel ? [`${country.tax.registrationLabel} Registered`] : []),
    country.compliance.law,
    'PCI DSS',
  ];

  // One source for the contracting entity — the Terms, Grievance and Contact
  // pages read the same record, so the footer cannot name a different company
  // from the one the terms bind the customer to.
  const legalEntity = getEntityLine(country.code);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Publish the live header height so page-level sticky bars can offset ──
  // by it. The header grows and shrinks (mobile search panel, category nav),
  // so a hard-coded `top-16` leaves page bars hidden underneath it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty('--mp-header-h', `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
      document.documentElement.style.removeProperty('--mp-header-h');
    };
  }, []);

  // Persist language preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kartseek-lang');
      if (saved) setLang(saved);
    }
  }, []);

  const handleLangChange = (code: string) => {
    setLang(code);
    if (typeof window !== 'undefined') localStorage.setItem('kartseek-lang', code);
  };

  // ── Auto-detect location via GPS + IP fallback ──────────────────────────
  const detectLocation = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Helper: reverse-geocode lat/lng to a readable city name
    async function reverseGeocode(lat: number, lng: number): Promise<string> {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(5000) },
        );
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
          const country = addr.country || '';

          // The label only. This used to call `setSelectedRegion(country_code)`
          // here, on every page load, which made the browser's physical
          // location overwrite the market the server had already rendered for:
          // the page arrived priced and stocked for the cookie's market, then
          // hydration flipped the region (and rewrote the cookie), the SSR'd
          // prices were re-formatted in another currency, and the next refresh
          // rendered a different catalogue. A shopper in London who chose India
          // was snapped back to the default market every time. The market is
          // chosen through the picker, and only there; GPS may name the city.
          return city ? `${city}, ${country}` : country || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        }
      } catch {}
      return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }

    // Fallback when GPS is unavailable or denied: use the region the proxy already
    // resolved for this request.
    //
    // This used to `fetch('https://ipapi.co/json/')` from the browser, which is
    // blocked by CORS — so it threw on every page load in every session, added two
    // console errors to all 46 marketplace routes, and never once set a region.
    // It also disclosed the visitor's IP to a third party before any consent
    // gate. The proxy already performs this resolution server-side from the CDN
    // geo headers and hands it to the client as `country`, so no network call is
    // needed and the answer is strictly better than the one ipapi.co gave.
    function detectViaRegion(): string | null {
      const cc = country?.code?.toUpperCase() as Exclude<SupportedCountryCode, 'ALL'> | undefined;
      return cc && REGIONS[cc] ? REGIONS[cc].name : null;
    }

    // 1. Try GPS (Geolocation API)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const cityName = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setLocation(cityName);
        },
        () => {
          // GPS denied/failed → fall back to the server-resolved region
          setLocation(detectViaRegion() || 'Select Location');
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    } else {
      // No geolocation API → same region fallback
      setLocation(detectViaRegion() || 'Select Location');
    }
  }, [country]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  function openLocationModal() {
    setLocationDraft(location === 'Detecting...' || location === 'Select Location' ? '' : location);
    setLocationModalOpen(true);
  }

  function saveLocation() {
    if (locationDraft.trim()) setLocation(locationDraft.trim());
    setLocationModalOpen(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    else router.push('/search');
    setMobileSearchOpen(false);
  }

  const isNavActive = (href: string, exact: boolean) => {
    const path = href.split('?')[0];
    return exact ? pathname === path : pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen mp-surface flex flex-col overflow-x-clip">
      {/* ── Marketplace Header ──────────────────────────────────── */}
      <header
        ref={headerRef}
        className="bg-blue-600 border-b border-blue-700 shadow-md sticky top-0 z-50"
      >
        {/* Top bar */}
        <div className="max-w-[1400px] 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo + Location */}
          {/* `shrink-0` on the wordmark: it is the brand identity and must read
              identically on every breakpoint. Anything that needs to give way
              (location text, search field) shrinks instead. */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 shrink-0 min-h-[44px]"
              aria-label="KARTSEEK Marketplace home"
            >
              <ShoppingBag className="w-6 h-6 text-white shrink-0" />
              {/* Wordmark matches the rest of the site — never hidden or clipped */}
              <h1 className="text-sm xs:text-base sm:text-lg font-bold text-white tracking-tight whitespace-nowrap">
                KARTSEEK<span className="font-light opacity-80"> Marketplace</span>
              </h1>
            </Link>

            {/* Location indicator (xl+ — every narrower breakpoint gets the same
                controls in the utility row below, so the top bar keeps room for
                the full wordmark and a usable search field). */}
            <button
              onClick={openLocationModal}
              className="hidden xl:flex items-center gap-1 text-xs text-blue-50 hover:text-white transition-colors min-w-0 max-w-[160px]"
              title="Change delivery location"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span className="truncate">{location}</span>
            </button>

            {/* Country selector (xl+) */}
            <div className="hidden xl:block shrink-0">
              <CountryPicker />
            </div>
          </div>

          {/* Search bar (desktop) */}
          <form
            onSubmit={handleSearch}
            className="flex-1 min-w-0 max-w-2xl hidden md:flex items-center"
          >
            <div className="relative w-full">
              {/* `id` distinct from the mobile field below: that one renders
                  while this one is still in the DOM (hidden by CSS, not
                  unmounted), and duplicate ids are invalid. `name` may be shared
                  — the two live in separate forms, and `handleSearch`
                  preventDefaults and routes by hand, so nothing is serialised. */}
              <input
                id="marketplace-search"
                name="q"
                type="text"
                aria-label="Search products, brands and categories"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for products, brands, categories..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-transparent rounded-lg focus:ring-2 focus:ring-amber-300/60 focus:border-white outline-none transition-all text-sm"
              />
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              {query && (
                <button
                  type="button"
                  title="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-2.5"
                >
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="ml-2 bg-amber-400 text-slate-900 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-300 transition-colors shrink-0 shadow-sm"
            >
              Search
            </button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-0.5 md:gap-3 text-white shrink-0">
            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
              title="Search"
              aria-expanded={mobileSearchOpen}
              aria-label="Toggle product search"
            >
              {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>

            {/* Language Switcher (desktop) */}
            <div className="hidden xl:block">
              <LanguagePicker lang={lang} onChange={handleLangChange} />
            </div>

            {/* Sell on KARTSEEK */}
            <Link
              href="/seller/marketplace"
              className="hidden xl:flex items-center gap-1.5 text-sm font-medium hover:text-white transition-colors border border-white/30 rounded-lg px-3 py-1.5 hover:border-white/60 hover:bg-white/10"
            >
              <Store className="w-4 h-4" />
              <span>Sell</span>
            </Link>

            {/* Carries the only storefront sign-out control — see AccountMenu. */}
            <AccountMenu className="hover:text-amber-300 hidden md:flex" />
            <Link
              href="/orders"
              className="hover:text-amber-300 transition-colors hidden md:flex flex-col items-center p-1.5"
              title="Orders"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-medium">Orders</span>
            </Link>
            <Link
              href="/wishlist"
              className="hover:text-red-300 transition-colors flex flex-col items-center p-1.5 min-w-[44px] min-h-[44px] justify-center"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-medium hidden md:block">Wishlist</span>
            </Link>
            <Link
              href="/cart"
              className="hover:text-amber-300 transition-colors relative flex flex-col items-center p-1.5 min-w-[44px] min-h-[44px] justify-center"
              title="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {mounted && cart.count > 0 && (
                <span className="absolute -top-0.5 right-0 bg-amber-400 text-slate-900 text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.count}
                </span>
              )}
              <span className="text-[9px] mt-0.5 font-medium hidden md:block">Cart</span>
            </Link>
          </div>
        </div>

        {/* Mobile search bar (expandable) */}
        {mobileSearchOpen && (
          <div className="md:hidden border-t border-blue-500 p-3 bg-blue-700 animate-in slide-in-from-top-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="marketplace-search-mobile"
                  name="q"
                  type="text"
                  aria-label="Search products, brands and categories"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products, brands..."
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-sm"
                  autoFocus
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                {query && (
                  <button
                    type="button"
                    title="Clear search"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-3"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0"
              >
                Go
              </button>
            </form>
          </div>
        )}

        {/* Utility row — location, country and language were previously
            desktop-only, leaving mobile web with no way to set any of them.
            Runs up to xl, where the same controls move into the top bar. */}
        <div className="xl:hidden border-t border-blue-500/60 bg-blue-600">
          <div className="max-w-[1400px] 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-2 flex items-center gap-2">
            <button
              onClick={openLocationModal}
              className="flex items-center gap-1 text-xs text-blue-50 hover:text-white transition-colors min-w-0 flex-1 min-h-[44px] text-left"
              title="Change delivery location"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span className="truncate">{location}</span>
              <ChevronDown className="w-3 h-3 text-blue-200 shrink-0" />
            </button>
            <CountryPicker compact />
            <LanguagePicker lang={lang} onChange={handleLangChange} align="right" />
          </div>
        </div>

        {/* Category Nav Bar (desktop) */}
        <div className="hidden md:block border-t border-blue-500 bg-blue-700">
          <div className="max-w-[1400px] 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4">
            <div className="flex items-center gap-0.5 overflow-x-auto hide-scrollbar">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[13px] font-medium text-blue-50 hover:text-white px-3 py-2 whitespace-nowrap transition-colors hover:bg-white/10 rounded-md"
                >
                  {link.label}
                </Link>
              ))}
              <div className="w-px h-4 bg-white/20 mx-1" />
              <Link
                href="/offers"
                className="text-[13px] font-bold text-amber-300 hover:text-amber-200 px-3 py-2 whitespace-nowrap transition-colors hover:bg-white/10 rounded-md flex items-center gap-1"
              >
                <Tag className="w-3 h-3" /> Offers
              </Link>
              <Link
                href="/coupons"
                className="text-[13px] font-medium text-amber-200 hover:text-amber-100 px-3 py-2 whitespace-nowrap transition-colors hover:bg-white/10 rounded-md"
              >
                Coupons
              </Link>
              <Link
                href="/gift-cards"
                className="text-[13px] font-medium text-violet-200 hover:text-violet-100 px-3 py-2 whitespace-nowrap transition-colors hover:bg-white/10 rounded-md flex items-center gap-1"
              >
                <Gift className="w-3 h-3" /> Gift Cards
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {/* Bottom-nav clearance belongs to the footer (the last thing on the
          page), not here — on <main> it opened an 80px gap above the footer. */}
      <main className="flex-1 w-full">{children}</main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      {/* Shown on every breakpoint — mobile collapses each column into an
          accordion instead of dropping the footer entirely. */}
      <footer className="bg-slate-900 text-slate-300 mt-auto">
        {/* Top footer row — Trust badges */}
        <div className="border-b border-slate-800">
          <div className="max-w-[1400px] mx-auto px-4 py-5 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Both the delivery threshold and the payment list follow the
                active market — this footer used to quote a rupee threshold and
                advertise UPI to every region, including ones with neither. */}
            {[
              {
                icon: Truck,
                title: 'Free Delivery',
                desc: `On orders above ${formatCurrencyValue(freeDeliveryThreshold, { decimals: 0 })}`,
              },
              { icon: RotateCcw, title: 'Easy Returns', desc: '7-30 day return policy' },
              { icon: Shield, title: 'Secure Payments', desc: 'SSL encrypted checkout' },
              { icon: CreditCard, title: 'Multiple Payment Options', desc: paymentSummary },
            ].map((b) => (
              <div key={b.title} className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{b.title}</div>
                  <div className="text-xs text-slate-400">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main footer links */}
        <div className="max-w-[1400px] mx-auto px-4 py-6 md:py-10 grid grid-cols-1 md:grid-cols-5 gap-0 md:gap-8">
          {/* Column 1 — About */}
          <FooterColumn title="About KARTSEEK">
            <ul className="space-y-2.5 md:space-y-2 text-sm">
              <li>
                <ZoneLink href="/about" className="hover:text-white transition-colors">
                  About Us
                </ZoneLink>
              </li>
              <li>
                <ZoneLink href="/careers" className="hover:text-white transition-colors">
                  Careers
                </ZoneLink>
              </li>
              <li>
                <ZoneLink href="/press" className="hover:text-white transition-colors">
                  Press & Media
                </ZoneLink>
              </li>
              <li>
                <Link href="/sellers" className="hover:text-white transition-colors">
                  Sell on KARTSEEK
                </Link>
              </li>
              <li>
                <ZoneLink href="/investors" className="hover:text-white transition-colors">
                  Investor Relations
                </ZoneLink>
              </li>
            </ul>
          </FooterColumn>

          {/* Column 2 — Customer Service */}
          <FooterColumn title="Customer Service">
            <ul className="space-y-2.5 md:space-y-2 text-sm">
              <li>
                <Link href="/help" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white transition-colors">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/payments" className="hover:text-white transition-colors">
                  Payment Methods
                </Link>
              </li>
              <li>
                <ZoneLink href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </ZoneLink>
              </li>
            </ul>
          </FooterColumn>

          {/* Column 3 — Explore */}
          <FooterColumn title="Explore">
            <ul className="space-y-2.5 md:space-y-2 text-sm">
              <li>
                <Link href="/offers" className="hover:text-white transition-colors">
                  Offers & Deals
                </Link>
              </li>
              <li>
                <Link href="/best-sellers" className="hover:text-white transition-colors">
                  Best Sellers
                </Link>
              </li>
              <li>
                <Link href="/new-arrivals" className="hover:text-white transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/gift-cards" className="hover:text-white transition-colors">
                  Gift Cards
                </Link>
              </li>
              <li>
                <Link href="/coupons" className="hover:text-white transition-colors">
                  Coupons
                </Link>
              </li>
              {/* `/exchange` had no inbound link anywhere in the app —
                  reachable only by typing the URL — despite being backed by a
                  live, unguarded offers endpoint. */}
              <li>
                <Link href="/exchange" className="hover:text-white transition-colors">
                  Exchange &amp; Trade-In
                </Link>
              </li>
            </ul>
          </FooterColumn>

          {/* Column 4 — Legal */}
          <FooterColumn title="Legal">
            <ul className="space-y-2.5 md:space-y-2 text-sm">
              <li>
                <ZoneLink href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </ZoneLink>
              </li>
              <li>
                <ZoneLink href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </ZoneLink>
              </li>
              <li>
                <ZoneLink href="/cookies" className="hover:text-white transition-colors">
                  Cookie Policy
                </ZoneLink>
              </li>
              <li>
                <ZoneLink href="/security" className="hover:text-white transition-colors">
                  Security
                </ZoneLink>
              </li>
              <li>
                <ZoneLink href="/grievance" className="hover:text-white transition-colors">
                  Grievance Officer
                </ZoneLink>
              </li>
            </ul>
          </FooterColumn>

          {/* Column 5 — Connect */}
          <FooterColumn title="Connect With Us">
            {/* Real profile URLs, shared with the Organization schema's `sameAs`.
                These were `href="#"` on every page of the storefront — 30 pages
                × 4 icons — so clicking one jumped to the top of the page. */}
            <div className="flex gap-3 mb-5">
              {SOCIAL_LINKS.map(({ platform, label, url }) => {
                const Icon = SOCIAL_ICONS[platform];
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 bg-slate-800 ${SOCIAL_HOVER[platform]} rounded-lg flex items-center justify-center transition-colors`}
                    aria-label={label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
            <div className="space-y-2.5 text-sm">
              <a
                href="mailto:support@kartseek.com"
                className="flex items-center gap-2 hover:text-white transition-colors break-all"
              >
                <Mail className="w-4 h-4 text-blue-400 shrink-0" /> support@kartseek.com
              </a>
              <a
                href="tel:+911800123456"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-blue-400 shrink-0" /> 1800-123-456 (Toll Free)
              </a>
            </div>
          </FooterColumn>
        </div>

        {/* Payments + compliance */}
        <div className="border-t border-slate-800">
          <div className="max-w-[1400px] mx-auto px-4 py-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                We accept
              </p>
              {/* Only what actually clears in this market. Advertising UPI or
                  RuPay in Doha promises a payment route that does not exist. */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {paymentMethods.map((method) => (
                  <span
                    key={method.type}
                    className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-medium"
                  >
                    {PAYMENT_SUMMARY_LABEL[method.type] ?? method.label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                Compliance
              </p>
              {/* The regulators this market is actually answerable to. */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {complianceBadges.map((badge) => (
                  <span
                    key={badge}
                    className="text-[10px] bg-slate-800 text-emerald-400 border border-emerald-900/50 px-2 py-1 rounded font-bold"
                  >
                    ✓ {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        {/* `pb-safe-nav` keeps the last row clear of the fixed mobile bottom
            nav, which used to sit on top of it. */}
        <div className="border-t border-slate-800 pb-safe-nav md:pb-0">
          <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            {/* The operating entity differs by market — an Indian "Pvt. Ltd."
                and its CIN are not the entity a Qatari customer contracts with,
                and quoting them everywhere misstates who is liable. */}
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} {legalEntity.name}. All rights reserved.
            </p>
            <p className="text-[11px] text-slate-600">{legalEntity.registration}</p>
          </div>
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 flex justify-around pt-2 z-50 shadow-[0_-4px_12px_-1px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Marketplace"
      >
        {BOTTOM_NAV.map(({ href, label, Icon, exact }) => {
          const active = isNavActive(href, exact);
          const isCart = href === '/cart';
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center py-1 px-2 min-w-[56px] min-h-[44px] justify-center relative transition-colors ${
                active ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${active && href === '/wishlist' ? 'fill-red-500 text-red-500' : ''}`}
              />
              {isCart && mounted && cart.count > 0 && (
                <span className="absolute top-0 right-2 bg-blue-600 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {cart.count}
                </span>
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Delivery Location Sheet ────────────────────────────── */}
      {/* Replaces window.prompt(), which is unusable (and suppressed in some
          browsers) on mobile web. */}
      {locationModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[200]"
            onClick={() => setLocationModalOpen(false)}
            aria-hidden="true"
          >
            <DismissOnEscape onDismiss={() => setLocationModalOpen(false)} />
          </div>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Set delivery location"
            className="fixed z-[201] inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 pb-safe animate-in slide-in-from-bottom-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" /> Delivery Location
              </h2>
              <button
                onClick={() => setLocationModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveLocation();
              }}
            >
              <input
                value={locationDraft}
                onChange={(e) => setLocationDraft(e.target.value)}
                placeholder={getLocationSearchPlaceholder(country.code)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  detectLocation();
                  setLocationModalOpen(false);
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 border border-blue-200 bg-blue-50 py-3 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Crosshair className="w-4 h-4" /> Use my current location
              </button>
              <button
                type="submit"
                disabled={!locationDraft.trim()}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                Save Location
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
