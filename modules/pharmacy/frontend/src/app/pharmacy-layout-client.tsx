import React from 'react';
import {
  Pill, Search, ShoppingCart, User, Clock, Home, Bell,
  Wallet, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { ZoneLink } from '@/components/zone-link';
import { AccountMenu } from '@/components/shared/account-menu';

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen module-surface-pharmacy flex flex-col">
      <header className="module-header-pharmacy text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 h-16 flex items-center justify-between">
          {/* The brand lockup is the flexible half of this bar: it shrinks and
              truncates so the action buttons on the right, which are the
              functional half, always fit. At 320px the untruncated lockup plus
              the actions measured wider than the viewport, and the header
              pushed the whole page into horizontal scroll. */}
          <ZoneLink href="/" className="flex items-center gap-2 xs:gap-2.5 min-w-0">
            <div className="module-icon-badge shrink-0">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-base xs:text-lg sm:text-xl font-bold tracking-tight text-white truncate">
              KARTSEEK<span className="font-light opacity-80 hidden xs:inline"> Pharmacy</span>
            </h1>
          </ZoneLink>

          <div className="flex-1 max-w-2xl px-8 hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search medicines, health products, pharmacies..."
                className="module-search-input"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-[0.65rem] pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-0.5 xs:gap-1 shrink-0">
            <Link href="/prescriptions" className="module-nav-btn hidden lg:flex" title="Prescriptions">
              <FileText className="w-4 h-4" />
              <span className="hidden xl:inline">Prescriptions</span>
            </Link>
            <Link href="/orders" className="module-nav-btn hidden md:flex" title="Orders">
              <Clock className="w-4 h-4" />
              <span className="hidden lg:inline">Orders</span>
            </Link>
            <Link href="/notifications" className="module-nav-btn hidden lg:flex relative" title="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <Link href="/wallet" className="module-nav-btn hidden lg:flex" title="Wallet">
              <Wallet className="w-4 h-4" />
            </Link>
            <Link href="/cart" className="module-nav-btn relative" title="Cart">
              <ShoppingCart className="w-5 h-5" />
            </Link>

            {/* Carries this module's sign-out control — see AccountMenu. */}
            <AccountMenu className="module-nav-btn" />
          </div>
        </div>

        {/* Secondary Nav — Shopping links only */}
        <div className="border-t border-white/10 hidden md:block">
          <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-4 flex gap-1 overflow-x-auto py-0.5 scrollbar-thin">
            {[
              { href: '/categories', label: 'Categories' },
              { href: '/brands', label: 'Brands' },
              { href: '/offers', label: 'Offers' },
              { href: '/near-me', label: 'Near Me' },
              { href: '/stores', label: 'Stores' },
              { href: '/generic-alternatives', label: 'Generics' },
              { href: '/prescription/upload', label: 'Upload Rx' },
              { href: '/compliance', label: 'Compliance' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/70 hover:text-white hover:bg-white/10 whitespace-nowrap transition-colors shrink-0">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 w-full pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2.5 z-50 pb-safe shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]">
        <Link href="/" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-teal-600 transition-colors">
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-teal-600">
          <Pill className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold">Pharmacy</span>
        </Link>
        <Link href="/cart" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-teal-600 transition-colors">
          <ShoppingCart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Cart</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-teal-600 transition-colors">
          <Clock className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Orders</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[44px] text-slate-400 hover:text-teal-600 transition-colors">
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Account</span>
        </Link>
      </nav>
    </div>
  );
}
