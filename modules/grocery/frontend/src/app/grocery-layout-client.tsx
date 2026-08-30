'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AccountMenu } from '@/components/shared/account-menu';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MapPin, Search, ShoppingCart, User, X, Home, Grid3X3, Package, Globe, ChevronDown, Heart } from 'lucide-react';
import { GroceryLocaleProvider, useGroceryLocale, GROCERY_COUNTRY_LIST, type GroceryCountryCode } from '@/i18n/grocery-locale';
import { CountryFlag } from '@/components/shared/country-flag';
import { GroceryLanguageToggle } from '@/components/grocery/language-toggle';
import { GroceryCartProvider, useGroceryCart } from '@/lib/contexts/grocery-cart-context';
import { useGroceryWishlist } from '@/lib/hooks/use-grocery-wishlist';

// ── Country-based location presets ────────────────────────────────────────

const COUNTRY_LOCATIONS: Record<GroceryCountryCode, string[]> = {
  IN: ['Bandra West, Mumbai', 'Indiranagar, Bengaluru', 'Salt Lake, Kolkata', 'Anna Nagar, Chennai', 'Jubilee Hills, Hyderabad', 'Sector 18, Noida'],
  QA: ['The Pearl, Doha', 'West Bay, Doha', 'Al Sadd, Doha', 'Al Wakra', 'Al Khor', 'Lusail City'],
  AE: ['Downtown Dubai', 'JBR, Dubai', 'Al Barsha, Dubai', 'Khalidiya, Abu Dhabi', 'Sharjah City Centre'],
  SA: ['Al Olaya, Riyadh', 'Jeddah Corniche', 'Al Khobar, Eastern', 'Makkah', 'Madinah'],
  BH: ['Manama, Capital', 'Riffa', 'Muharraq', 'Isa Town'],
  KW: ['Salmiya', 'Hawalli', 'Kuwait City', 'Farwaniya'],
  OM: ['Muscat, Ruwi', 'Salalah', 'Sohar', 'Nizwa'],
  GB: ['Kensington, London', 'Fulham, London', 'Manchester City', 'Birmingham Centre', 'Edinburgh New Town'],
  US: ['Brooklyn, New York', 'Manhattan, New York', 'San Francisco, CA', 'Chicago, IL', 'Los Angeles, CA'],
};

// ── Inner Layout (uses locale context) ────────────────────────────────────

function GroceryLayoutInner({ children }: { children: React.ReactNode }) {
  const { country, config, setCountry, tr, isRTL, showArabic, formatPrice } = useGroceryLocale();
  const locations = COUNTRY_LOCATIONS[country] || COUNTRY_LOCATIONS.IN;
  const [location, setLocation] = useState(locations[0]);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [query, setQuery] = useState('');
  const mobileSearchInput = useRef<HTMLInputElement>(null);
  const bottomNav = useRef<HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  // Both badges were hardcoded "0" — the header reported an empty basket no
  // matter what was in it, on every page of the module.
  const { count: cartCount } = useGroceryCart();
  const { count: wishlistCount } = useGroceryWishlist();

  // Update location when country changes
  const handleCountryChange = (code: GroceryCountryCode) => {
    setCountry(code);
    const newLocs = COUNTRY_LOCATIONS[code] || COUNTRY_LOCATIONS.IN;
    setLocation(newLocs[0]);
    setShowCountryPicker(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/grocery/search?q=${encodeURIComponent(query.trim())}`);
      openPanel(null);
    }
  };

  const isActive = (path: string) => pathname === path;

  /**
   * Publish the bottom nav's height as `--grocery-nav-height`.
   *
   * `<main>` clears the nav with `pb-safe-nav`, but padding only moves content
   * in normal flow — anything `position: fixed` ignores it. The store page's
   * cart bar is `fixed bottom-0`, so it sat *underneath* the nav: 61 of its 77px
   * were covered, and `elementFromPoint` at the centre of its "View Cart" button
   * returned the nav, meaning the primary call to action on every store page
   * could not be tapped at all.
   *
   * Measured rather than hard-coded because the nav's height moves with the
   * safe-area inset, which differs between a notched phone and a flat one. The
   * same approach the consent banner already uses for the same reason.
   */
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const el = bottomNav.current;
      // `md:hidden` means no nav above 767px, and then nothing to clear.
      const height = el && getComputedStyle(el).display !== 'none' ? el.offsetHeight : 0;
      root.style.setProperty('--grocery-nav-height', `${height}px`);
    };
    apply();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    if (observer && bottomNav.current) observer.observe(bottomNav.current);
    window.addEventListener('resize', apply);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', apply);
      root.style.removeProperty('--grocery-nav-height');
    };
  }, []);

  /**
   * Exactly one header panel is open at a time.
   *
   * Each toggle only cleared its own state, so tapping Search while the country
   * list was open left both expanded and stacked one above the other, pushing
   * the page content down by the height of two panels.
   */
  const openPanel = (panel: 'search' | 'country' | 'location' | null) => {
    setMobileSearch(panel === 'search');
    setShowCountryPicker(panel === 'country');
    setShowLocPicker(panel === 'location');
  };

  /**
   * Move focus into the search field when its panel opens.
   *
   * `autoFocus` could never fire here: the panel is always mounted and merely
   * collapsed to `max-h-0`, and React honours `autoFocus` on mount only. Tapping
   * the search icon opened the panel and left focus on the cart link, so a
   * keyboard or screen-reader user had to hunt for the field they had just asked
   * for.
   */
  useEffect(() => {
    if (!mobileSearch) return;
    const el = mobileSearchInput.current;
    if (!el) return;
    /*
     * Read layout before focusing.
     *
     * The panel's closed state is `invisible`, which is what keeps it out of the
     * tab order — but `.focus()` is a no-op on an element inside a
     * `visibility: hidden` subtree, and the class removal has not been applied
     * yet when this effect runs. `requestAnimationFrame` does not help: its
     * callback runs *before* the frame's style recalc. Touching `offsetHeight`
     * forces that recalc now, so the field is focusable by the next line.
     */
    void el.offsetHeight;
    el.focus();
  }, [mobileSearch]);

  return (
    <div className="min-h-screen module-surface-grocery flex flex-col overflow-x-clip" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-green-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:top-2 focus:left-2">{tr('Skip to main content')}</a>
      <header className="sticky top-0 z-50 module-header-grocery" role="banner" aria-label={tr('Grocery navigation header')}>
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-2 2xs:px-3 xs:px-4 sm:px-5 3xl:px-8 h-14 flex items-center justify-between gap-1.5 xs:gap-2 md:gap-3">
          {/* Logo */}
          <Link href="/grocery" className="flex items-center gap-1.5 xs:gap-2 min-h-[44px] shrink-0">
            <div className="module-icon-badge">
              <span className="text-lg leading-none">🥬</span>
            </div>
            {/*
              The wordmark is a `span`, not an `h1`.

              As an `h1` in the shared layout it appeared on all 27 grocery
              routes, so every page shipped two level-one headings: the site name
              and the page's own subject. A product page announced "KARTSEEK
              Grocery" before "Atlantic Salmon Fillet", which is the wrong
              primary heading for both a screen reader's document outline and a
              crawler's understanding of what the page is about.
            */}
            <span className="text-base xs:text-lg font-bold text-white tracking-tight">
              {/*
                Three bands, sized to what actually fits beside four 44px controls.

                The bar's fixed furniture — language, country, search and cart,
                plus gaps and padding — costs about 232px, so the wordmark's
                budget is the viewport minus that: ~88px at 320, ~143px at 375,
                ~248px at 480. "KARTSEEK Grocery" measures 202px and "KARTSEEK"
                123px, which is why the full lockup waits for `ms` and the
                compact mark carries everything below `xs`. Both switches used to
                sit at `2xs` — a 320px min-width, so the compact form was
                unreachable on every real phone and the cart hung off the edge.
              */}
              <span className="hidden xs:inline">KARTSEEK</span><span className="xs:hidden">KS</span> <span className="font-light opacity-80 hidden ms:inline">{showArabic ? 'البقالة' : 'Grocery'}</span>
            </span>
          </Link>

          {/* Country Selector — full pill only from lg up; below that the compact
              flag button in the right-hand action group stands in for it, so the
              header still fits on portable tablets (768–1023px). */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => openPanel(showCountryPicker ? null : 'country')}
              className="flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white cursor-pointer bg-white/15 hover:bg-white/22 px-2.5 py-1.5 rounded-full transition-all"
              aria-label={`Select country, currently ${config.name}`}
              aria-expanded={showCountryPicker}
              aria-haspopup="listbox"
            >
              <Globe className="w-3.5 h-3.5" />
              <CountryFlag code={config.code} size="md" />
              <span className="hidden lg:inline text-xs">{(showArabic && config.nameAr) || config.name}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
            {showCountryPicker && (
              <div className="absolute top-10 left-0 bg-white border border-slate-200 shadow-xl rounded-xl p-2 w-56 z-50 max-h-80 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">{showArabic ? 'اختر الدولة' : 'Select Country'}</p>
                {GROCERY_COUNTRY_LIST.map(c => (
                  <button key={c.code} onClick={() => handleCountryChange(c.code)} className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${c.code === country ? 'bg-green-50 text-green-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <CountryFlag code={c.code} size="md" />
                    <span>{(showArabic && c.nameAr) || c.name}</span>
                    {c.nameAr && showArabic && <span className="text-xs text-slate-400 mr-auto" dir="rtl">{c.nameAr}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language toggle.
              Sits beside the country control because the two together are what
              a Gulf storefront is expected to offer. Grocery had a country
              selector and no language control at all, so a shopper in Doha
              could change market but not language. */}
          <GroceryLanguageToggle />

          {/* Location Selector */}
          <div className="relative">
            <button
              onClick={() => openPanel(showLocPicker ? null : 'location')}
              className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white cursor-pointer bg-white/15 hover:bg-white/22 px-3 py-1.5 rounded-full transition-all"
              aria-label={`Select delivery location, currently ${location}`}
              aria-expanded={showLocPicker}
              aria-haspopup="listbox"
            >
              <MapPin className="w-3.5 h-3.5 text-green-200" />
              <span className="truncate max-w-[150px]">{location}</span>
            </button>
            {showLocPicker && (
              <div className="absolute top-10 left-0 bg-white border border-slate-200 shadow-xl rounded-xl p-2 w-64 z-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">{showArabic ? 'اختر الموقع' : 'Select Location'}</p>
                {locations.map(loc => (
                  <button key={loc} onClick={() => { setLocation(loc); setShowLocPicker(false); }} className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${loc === location ? 'bg-green-50 text-green-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <MapPin className="w-3 h-3 inline mr-1.5" />{loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Search */}
          {/* Desktop Search — `min-w-0` lets the form shrink below the intrinsic
              width of its input + button. Without it a flex item refuses to go
              under its min-content size and pushes the action buttons off the
              right edge of the header on 768–1279px screens. */}
          <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-xl hidden md:flex items-center gap-2" role="search" aria-label={tr('Search groceries')}>
            <div className="relative flex-1 min-w-0">
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={tr('Search for groceries, stores, or brands...')}
                className="module-search-input"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button type="submit" className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 min-h-[44px] rounded-xl text-sm font-bold shrink-0 transition-all border border-white/25">{tr('Search')}</button>
          </form>

          {/* Right Actions — `shrink-0` keeps the cart reachable; without it the
              group is the first thing the flex layout squeezes. */}
          <div className="flex items-center gap-0.5 xs:gap-1 shrink-0">
            {/* Compact Country Selector — stands in for the full pill below lg */}
            <button
              onClick={() => openPanel(showCountryPicker ? null : 'country')}
              className="lg:hidden touch-target shrink-0 text-white/80 hover:text-white transition-colors"
              title={tr('Country')}
              aria-label={`Select country, currently ${config.name}`}
              aria-expanded={showCountryPicker}
            >
              <CountryFlag code={config.code} size="md" />
            </button>
            <button onClick={() => openPanel(mobileSearch ? null : 'search')} className="touch-target text-white/80 hover:text-white transition-colors md:hidden" title={tr('Search')} aria-label={tr('Search')} aria-expanded={mobileSearch}>
              <Search className="w-5 h-5" />
            </button>
            {/* Desktop-only nav actions — hidden on mobile via Tailwind, visible md+.
                All action controls carry the 44x44 minimum touch area. */}
            <AccountMenu className="module-nav-btn hidden md:inline-flex min-h-[44px] min-w-[44px] items-center justify-center" />
            <Link href="/grocery/orders" className="module-nav-btn hidden md:inline-flex min-h-[44px] min-w-[44px] items-center justify-center" title={tr('Orders')} aria-label={tr('Orders')}>
              <Package className="w-5 h-5" />
            </Link>
            <Link href="/grocery/wishlist" className="module-nav-btn hidden md:inline-flex min-h-[44px] min-w-[44px] items-center justify-center relative" title={tr('Wishlist')} aria-label={tr('Wishlist')}>
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center border-2 border-white">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>
            <Link href="/grocery/cart" className="module-nav-btn inline-flex min-h-[44px] min-w-[44px] items-center justify-center relative" title={tr('Cart')} aria-label={cartCount > 0 ? `Shopping cart, ${cartCount} items` : 'Shopping cart, empty'}>
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-amber-400 text-slate-900 text-[10px] font-bold min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Delivery area — the phone's stand-in for the `hidden lg:flex` pill in
            the bar above. Without it a shopper on a phone could see and change
            their area on the homepage and nowhere else; the other 26 grocery
            routes offered no way to reach it. A strip rather than a sixth icon
            because five 44px controls already fill a 320px bar. */}
        <button
          onClick={() => openPanel(showLocPicker ? null : 'location')}
          className="lg:hidden w-full flex items-center gap-1.5 px-3 xs:px-4 pb-2 pt-0.5 min-h-[44px] text-white/90 hover:text-white transition-colors text-left"
          aria-label={`Select delivery location, currently ${location}`}
          aria-expanded={showLocPicker}
        >
          <MapPin className="w-3.5 h-3.5 text-green-200 shrink-0" />
          <span className="text-[11px] uppercase tracking-wider opacity-70 shrink-0">{tr('Deliver to')}</span>
          <span className="text-xs font-semibold truncate">{location}</span>
          <ChevronDown className={`w-3.5 h-3.5 opacity-70 shrink-0 transition-transform ${showLocPicker ? 'rotate-180' : ''}`} />
        </button>

        {/*
          Collapsed panels carry `invisible`, not just `max-h-0`.

          A zero-height panel is still in the tab order and still in the
          accessibility tree, so a keyboard user tabbing out of the cart fell
          into eleven controls they could not see — the whole country list and
          the search field — while both panels read as closed. `visibility:
          hidden` removes them from both, and still animates.
        */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${showCountryPicker ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0 invisible'}`}
          aria-hidden={!showCountryPicker}
        >
          <div className="px-4 pb-3 pt-1">
            <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-2 max-h-60 overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">{showArabic ? 'اختر الدولة' : 'Select Country'}</p>
              <div className="grid grid-cols-3 gap-1">
                {GROCERY_COUNTRY_LIST.map(c => (
                  <button key={c.code} onClick={() => handleCountryChange(c.code)} className={`text-center text-xs px-2 py-2 rounded-lg transition-colors min-h-[44px] ${c.code === country ? 'bg-green-50 text-green-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <CountryFlag code={c.code} size="md" />
                    <span className="text-[10px]">{(showArabic && c.nameAr) || c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Delivery-area panel — pairs with the lg:hidden pin button. Full width
            rather than the desktop's absolutely-positioned `w-64` dropdown, which
            would have hung off the right edge of a 320px screen. */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${showLocPicker ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0 invisible'}`}
          aria-hidden={!showLocPicker}
        >
          <div className="px-4 pb-3 pt-1">
            <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-2 max-h-64 overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">{showArabic ? 'اختر الموقع' : 'Select Location'}</p>
              {locations.map(loc => (
                <button
                  key={loc}
                  onClick={() => { setLocation(loc); setShowLocPicker(false); }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors min-h-[44px] flex items-center gap-1.5 ${loc === location ? 'bg-green-50 text-green-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{loc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar — animated panel */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${mobileSearch ? 'max-h-[80px] opacity-100' : 'max-h-0 opacity-0 invisible'}`}
          aria-hidden={!mobileSearch}
        >
          <div className="px-4 pb-3 pt-1">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={showArabic ? 'ابحث عن بقالة...' : 'Search groceries, stores...'}
                  ref={mobileSearchInput}
                  className="w-full min-h-[44px] pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-400 outline-none text-base"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {query && (
                  <button type="button" title={tr('Clear search')} aria-label={tr('Clear search')} onClick={() => setQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0 min-h-[44px] min-w-[44px]">Go</button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main id="main-content" className="flex-1 pb-safe-nav md:pb-8" role="main">
        {children}
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────── */}
      <nav ref={bottomNav} className="md:hidden fixed bottom-0 left-0 right-0 bg-white/97 backdrop-blur-lg border-t border-slate-200 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]" role="navigation" aria-label={tr('Grocery navigation')}>
        <div className="flex justify-around py-2 pb-safe">
          <Link href="/grocery" className={`flex flex-col items-center gap-0.5 min-w-[56px] px-1 min-h-[44px] justify-center ${isActive('/grocery') ? 'text-green-600' : 'text-slate-400'}`} aria-label={tr('Home')} aria-current={isActive('/grocery') ? 'page' : undefined}>
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tr('Home')}</span>
          </Link>
          <Link href="/grocery/category/all-groceries" className={`flex flex-col items-center gap-0.5 min-w-[56px] px-1 min-h-[44px] justify-center ${pathname.includes('/category') ? 'text-green-600' : 'text-slate-400'}`} aria-label={tr('Categories')} aria-current={pathname.includes('/category') ? 'page' : undefined}>
            <Grid3X3 className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tr('Categories')}</span>
          </Link>
          <Link href="/grocery/cart" className={`flex flex-col items-center gap-0.5 min-w-[56px] px-1 min-h-[44px] justify-center relative ${isActive('/grocery/cart') ? 'text-green-600' : 'text-slate-400'}`} aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart, empty'} aria-current={isActive('/grocery/cart') ? 'page' : undefined}>
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-1/2 translate-x-4 bg-amber-400 text-slate-900 text-[9px] font-bold min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
            <span className="text-[10px] font-medium">{tr('Cart')}</span>
          </Link>
          <Link href="/grocery/orders" className={`flex flex-col items-center gap-0.5 min-w-[56px] px-1 min-h-[44px] justify-center ${isActive('/grocery/orders') ? 'text-green-600' : 'text-slate-400'}`} aria-label={tr('Orders')} aria-current={isActive('/grocery/orders') ? 'page' : undefined}>
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tr('Orders')}</span>
          </Link>
          <Link href="/grocery/profile" className="flex flex-col items-center gap-0.5 min-w-[56px] px-1 min-h-[44px] justify-center text-slate-400" aria-label={tr('Account')}>
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tr('Account')}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

// ── Outer Layout (wraps with locale provider) ─────────────────────────────

export default function GroceryClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <GroceryLocaleProvider>
      {/* The basket has to live above every /grocery page: the header badge, the
          product tiles, /grocery/cart and /grocery/checkout all read the same one.
          Before this each page kept its own local state and none of them agreed. */}
      <GroceryCartProvider>
        <GroceryLayoutInner>{children}</GroceryLayoutInner>
      </GroceryCartProvider>
    </GroceryLocaleProvider>
  );
}
