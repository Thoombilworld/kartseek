import React from 'react';
import Link from 'next/link';
import { MapPin, Search, ShoppingBag, User, Home } from 'lucide-react';
import RestaurantLocationSelector from '@/components/restaurant/location-selector';
import RestaurantSearchInput from '@/components/restaurant/search-input';
import { AccountMenu } from '@/components/shared/account-menu';

/**
 * The restaurant chrome — header, location selector, search, bottom nav.
 *
 * This was app/restaurant/layout.tsx in the shell. In the zone every route is
 * restaurant, so it has no distinct layout level left to occupy: the zone root
 * layout renders it inside <AppShell>, and its metadata moved up there too.
 */
export default function RestaurantShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen module-surface-restaurant flex flex-col">
      {/* Food Delivery Header */}
      <header className="sticky top-0 z-50 module-header-restaurant">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 h-16 flex items-center justify-between">
          {/* The brand lockup is the flexible half of this bar: it shrinks and
              truncates so the action buttons on the right, which are the
              functional half, always fit. At 320px the untruncated lockup plus
              the actions measured wider than the viewport, and the header
              pushed the whole page into horizontal scroll. */}
          <div className="flex items-center gap-2 xs:gap-3 min-w-0">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 xs:gap-2.5 min-w-0" id="header-logo-link">
              <div className="module-icon-badge shrink-0">
                <ShoppingBag className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-base xs:text-lg sm:text-xl font-black tracking-tight text-white truncate">
                KARTSEEK<span className="font-light opacity-80 ml-1 hidden xs:inline">Food</span>
              </span>
            </Link>
            {/* Location Selector */}
            <RestaurantLocationSelector />
          </div>

          <div className="flex-1 max-w-xl px-6 hidden md:block">
            <RestaurantSearchInput />
          </div>

          <div className="flex items-center gap-0.5 xs:gap-1 shrink-0">
            <Link href="/restaurant/checkout" className="module-nav-btn" id="header-cart-btn" title="Cart">
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden lg:inline">Cart</span>
            </Link>
            {/* Carries this module's sign-out control — see AccountMenu. */}
            <AccountMenu className="module-nav-btn" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto w-full pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden module-bottom-nav" style={{ '--module-active-color': 'var(--restaurant-primary)' } as React.CSSProperties}>
        <Link href="/" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-orange-600 transition-colors">
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link href="/restaurant" className="active flex flex-col items-center">
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span>Orders</span>
        </Link>
        <Link href="/restaurant/search" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-orange-600 transition-colors">
          <Search className="w-5 h-5 mb-0.5" />
          <span>Search</span>
        </Link>
        <Link href="/restaurant/profile" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-orange-600 transition-colors">
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
