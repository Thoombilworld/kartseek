'use client';

import React from 'react';
import {
  User, Wallet, Gift, ShoppingBag, MapPin, Shield, LifeBuoy,
  Bell, LogOut, Search, Leaf, UtensilsCrossed, Pill, Stethoscope,
  Car, TrendingUp, CreditCard, Hotel, Heart,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { AuthGate } from '@/components/shared/auth-gate';
import { getModuleConfig, type ModuleKey } from '@/lib/modules/profiles';
/* ── Module metadata for sidebar quick-links ─────────────────────────────── */
/**
 * Each entry opens that module's own profile section.
 *
 * These pointed at `/profile?module=<key>`, which rendered one generic page from
 * a fixed data blob. Every module now has a real profile route of its own, so
 * the links go straight there — `profileHref` is the single definition of where
 * that is, shared with the hub and the cross-module switcher.
 */
const MODULES = [
  { key: 'marketplace', label: 'Marketplace', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'grocery',     label: 'Grocery',     icon: Leaf,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'restaurant',  label: 'Restaurant',  icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'pharmacy',    label: 'Pharmacy',    icon: Pill,        color: 'text-teal-600', bg: 'bg-teal-50' },
  { key: 'doctor',      label: 'Doctor',      icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'taxi',        label: 'Taxi',        icon: Car,         color: 'text-yellow-700', bg: 'bg-yellow-50' },
  { key: 'hotel',       label: 'Hotels',      icon: Hotel,       color: 'text-rose-600', bg: 'bg-rose-50' },
].map((m) => ({ ...m, href: getModuleConfig(m.key as ModuleKey).profileHref }));

/** The mobile page-nav row, mirroring the desktop sidebar's account links. */
const ACCOUNT_LINKS = [
  { href: '/profile',           label: 'Profile' },
  { href: '/wishlist',          label: 'Favourites' },
  { href: '/wallet',            label: 'Wallet' },
  { href: '/loyalty',           label: 'Loyalty' },
  { href: '/profile/orders',    label: 'Orders' },
  { href: '/profile/addresses', label: 'Addresses' },
  { href: '/support',           label: 'Support' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const userInitials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'KS';
  const userName = user?.name || 'Guest';
  const userContact = user?.phone || user?.email || '';

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Global Header (Simplified for Account) */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-h-[44px]" aria-label="KARTSEEK home">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">K</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-blue-700">KART<span className="text-slate-900">SEEK</span></h1>
          </Link>
          <div className="hidden md:flex items-center gap-4 text-slate-600">
            <button
              type="button"
              aria-label="Search"
              className="hover:text-blue-600 w-11 h-11 flex items-center justify-center rounded-lg"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="hover:text-blue-600 relative w-11 h-11 flex items-center justify-center rounded-lg"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
              <span className="text-white font-bold text-xs">{userInitials}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto w-full flex flex-col md:flex-row py-4 xs:py-6 md:py-8 px-3 xs:px-4 gap-4 xs:gap-6">
        
        {/* Account Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-1">
          {/* User Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-2 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 overflow-hidden shrink-0 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{userInitials}</span>
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-slate-900 truncate">{userName}</h3>
              <p className="text-xs text-slate-500 truncate">{userContact}</p>
            </div>
          </div>

          {/* Module Quick Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 mb-2 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Services
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {MODULES.map((mod) => {
                const active = isActive(mod.href);
                return (
                  <Link
                    key={mod.key}
                    href={mod.href}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                      active
                        ? `${mod.bg} ${mod.color} ring-1 ring-current/20`
                        : 'hover:bg-slate-50 text-slate-500 hover:text-slate-700'
                    }`}
                    title={`${mod.label} Profile`}
                  >
                    <mod.icon className="w-4 h-4" />
                    <span className="text-[9px] font-bold leading-tight text-center">{mod.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm space-y-0.5">
            <SidebarLink href="/profile" icon={User} label="Profile Overview" active={pathname === '/profile'} />
            <SidebarLink href="/wishlist" icon={Heart} label="Favourites & Wishlist" active={pathname === '/wishlist'} />
            <SidebarLink href="/wallet" icon={CreditCard} label="KARTSEEK Wallet" active={pathname === '/wallet'} />
            <SidebarLink href="/loyalty" icon={Gift} label="Loyalty Points" active={pathname === '/loyalty'} />
            <SidebarLink href="/profile/orders" icon={ShoppingBag} label="All Orders & Bookings" active={pathname === '/profile/orders'} />
            
            <div className="h-px bg-slate-100 my-2 mx-3"></div>

            <SidebarLink href="/marketplace/gift-cards" icon={Gift} label="Gift Card Balance" active={pathname === '/marketplace/gift-cards'} />
            <SidebarLink href="/marketplace/coupons" icon={ShoppingBag} label="My Coupons" active={pathname === '/marketplace/coupons'} />
            
            <div className="h-px bg-slate-100 my-2 mx-3"></div>
            
            <SidebarLink href="/profile/addresses" icon={MapPin} label="Saved Addresses" active={pathname === '/profile/addresses'} />
            <SidebarLink href="/profile/security" icon={Shield} label="Security Settings" active={pathname === '/profile/security'} />
            <SidebarLink href="/support" icon={LifeBuoy} label="Help & Support" active={pathname === '/support'} />
            
            <div className="h-px bg-slate-100 my-2 mx-3"></div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" /> Log Out
            </button>
          </nav>
        </aside>

        {/* Mobile Horizontal Nav (Scrollable) */}
        <div className="md:hidden space-y-3">
          {/* Module selector row */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x">
            {MODULES.map((mod) => (
              <Link
                key={mod.key}
                href={mod.href}
                className={`snap-start shrink-0 flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-full text-xs font-bold transition-all ${
                  pathname === mod.href
                    ? `${mod.bg} ${mod.color} border ${mod.color.replace('text-', 'border-')}`
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                <mod.icon className="w-3.5 h-3.5" /> {mod.label}
              </Link>
            ))}
          </div>
          {/* Page nav row */}
          {/*
            Every control here is at least 44x44. The chips above measured 34px
            and these pills 38px, both under the 44px touch guidance — small
            enough that a thumb hits the gap between two of them as often as the
            target. `min-h` rather than extra `py` keeps the type scale intact.
          */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 snap-x">
            {ACCOUNT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={`snap-start shrink-0 flex items-center px-4 min-h-[44px] border rounded-full text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/*
          Dynamic Page Content — behind a sign-in gate.

          Nothing gated this segment. The layout only pushed to /auth/login on an
          explicit logout, and rendered `user?.name || 'Guest'` in the sidebar,
          so an anonymous visitor could open every page under it: /profile,
          /profile/orders, /profile/orders/[id], /profile/restaurant-orders,
          /hotel-bookings, /saved-hotels and /recent-hotels — the account area in
          full. `/profile/orders` in particular renders a customer name, a full
          street address and a phone number, and will open a tax invoice for
          them.

          Gating at the layout rather than per page means a page added to this
          segment later inherits the gate instead of having to remember it.
        */}
        <main id="main-content" className="flex-1 min-w-0 w-full bg-white rounded-2xl md:border md:border-slate-200 shadow-sm md:p-6 lg:p-8">
          <AuthGate
            title="Sign in to your account"
            reason="Your orders, addresses and saved items are only visible once you sign in."
          >
            {children}
          </AuthGate>
        </main>

      </div>
    </div>
  );
}

/* ── Sidebar Link Sub-component ───────────────────────────────────────────── */
function SidebarLink({ href, icon: Icon, label, active }: { href: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600'
          : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
      }`}
    >
      <Icon className="w-5 h-5" /> {label}
    </Link>
  );
}
