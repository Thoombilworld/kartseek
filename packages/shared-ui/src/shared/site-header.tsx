'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import {
  Search, Bell, ShoppingCart, User, Heart, ChevronDown,
  LogOut, Settings, Package, Wallet, Gift, MapPin, Menu, X,
  LifeBuoy,
} from 'lucide-react';

/* ── Main Header ───────────────────────────────────────────────────────────── */
export function SiteHeader() {
  const { isAuthenticated, user, logout, isHydrated } = useAuth();
  const { formatCurrencyValue, country } = useRegion();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change (resize acts as proxy)
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">K</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-blue-700 hidden sm:block">
            KART<span className="text-slate-900">SEEK</span>
          </h1>
        </Link>

        {/* Search Bar (desktop) */}
        <div className="hidden md:flex flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search products, groceries, restaurants..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              title="Search"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile search toggle */}
          <button className="md:hidden touch-target text-slate-600 hover:text-blue-600 transition-colors" title="Search">
            <Search className="w-5 h-5" />
          </button>

          <Link href="/cart" className="touch-target text-slate-600 hover:text-blue-600 transition-colors relative" title="Cart">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              2
            </span>
          </Link>

          <Link href="/notifications" className="touch-target text-slate-600 hover:text-blue-600 transition-colors relative hidden sm:flex" title="Notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Link>

          {/* Language / region. The options come from the active region, so in
              Qatar this offers Arabic and English only. */}
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>

          {/* Auth / User Area — fixed dimensions to prevent CLS */}
          <div className="auth-area-reserve">
            {!isHydrated ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                  title="Account menu"
                >
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 hidden lg:block max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden lg:block transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      {user.walletBalance !== undefined && (
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            {/* Region currency, not a hard-coded ₹ — a Doha
                                customer's balance is in riyals. */}
                            <Wallet className="w-3.5 h-3.5" /> {formatCurrencyValue(user.walletBalance)}
                          </span>
                          {user.loyaltyPoints !== undefined && (
                            <span className="flex items-center gap-1 text-amber-600 font-semibold">
                              <Gift className="w-3.5 h-3.5" /> {user.loyaltyPoints} pts
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Access */}
                    <div className="py-1">
                      <DropdownItem href="/profile" icon={<User className="w-4 h-4" />} label="My Account" />
                      <DropdownItem href="/profile/orders" icon={<Package className="w-4 h-4" />} label="Orders & Bookings" />
                      <DropdownItem href="/wallet" icon={<Wallet className="w-4 h-4" />} label="Wallet" />
                      <DropdownItem href="/loyalty" icon={<Gift className="w-4 h-4" />} label="Loyalty Points" />
                    </div>

                    {/* Profile & Preferences */}
                    <div className="border-t border-slate-100 pt-1">
                      <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile</p>
                      <DropdownItem href="/wishlist" icon={<Heart className="w-4 h-4" />} label="Favourites & Wishlist" />
                      <DropdownItem href="/profile/addresses" icon={<MapPin className="w-4 h-4" />} label="Saved Addresses" />
                      <DropdownItem href="/profile/security" icon={<Settings className="w-4 h-4" />} label="Security Settings" />
                      <DropdownItem href="/support" icon={<LifeBuoy className="w-4 h-4" />} label="Help & Support" />
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors hidden sm:block"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          {mobileOpen ? (
            <button
              onClick={() => setMobileOpen(false)}
              className="touch-target text-slate-600 md:hidden"
              title="Close menu"
              aria-expanded="true"
              aria-label="Navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setMobileOpen(true)}
              className="touch-target text-slate-600 md:hidden"
              title="Open menu"
              aria-expanded="false"
              aria-label="Navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav — smooth animated reveal */}
      <div
        className={`md:hidden border-t border-slate-100 bg-white overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-3 space-y-1">
          <MobileNavLink href="/marketplace" label="Marketplace" onClick={() => setMobileOpen(false)} />
          <MobileNavLink href="/grocery" label="Grocery" onClick={() => setMobileOpen(false)} />
          <MobileNavLink href="/restaurant" label="Food Delivery" onClick={() => setMobileOpen(false)} />
          <MobileNavLink href="/pharmacy" label="Pharmacy" onClick={() => setMobileOpen(false)} />
          <MobileNavLink href="/doctor" label="Doctor" onClick={() => setMobileOpen(false)} />
          <MobileNavLink href="/hotel-booking" label="Hotel Booking" onClick={() => setMobileOpen(false)} />
          <MobileNavLink href="/taxi" label="Taxi" onClick={() => setMobileOpen(false)} />

          {/* Language options on mobile — same region-derived list. */}
          <div className="pt-3 mt-2 border-t border-slate-100">
            <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Language · {country.name}
            </p>
            <div className="px-3">
              <LocaleSwitcher variant="inline" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function DropdownItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-sm font-medium"
    >
      {icon} {label}
    </Link>
  );
}

function MobileNavLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium transition-colors text-sm min-h-[44px] flex items-center"
    >
      {label}
    </Link>
  );
}

