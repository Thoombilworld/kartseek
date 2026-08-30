'use client';
import { SellerRoleGuard } from '@/components/shared/seller-role-guard';
import React, { useState, useEffect } from 'react';
import {
  BarChart3, Package, ShoppingCart, Megaphone, Wallet, TrendingUp,
  Settings, ShieldCheck, Store, Bell, User, Menu, X, ChevronDown,
  LogOut, HelpCircle, Globe, Boxes, Truck, ChevronRight, Award, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import { useGrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';
import { useAuth } from '@/lib/contexts/auth-context';
const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { href: '/seller/grocery/dashboard', label: 'Dashboard', icon: BarChart3 },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/seller/grocery/products', label: 'Products', icon: Package },
      { href: '/seller/grocery/inventory', label: 'Inventory', icon: Boxes, badge: '3' },
      { href: '/seller/grocery/brands', label: 'Brands', icon: Award },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/seller/grocery/orders', label: 'Orders', icon: ShoppingCart, badge: '5' },
      { href: '/seller/grocery/delivery', label: 'Delivery', icon: Truck },
    ],
  },
  {
    title: 'Growth',
    items: [
      { href: '/seller/grocery/promotions', label: 'Promotions', icon: Megaphone },
      { href: '/seller/grocery/flash-deals', label: 'Flash Deals', icon: Zap },
      { href: '/seller/grocery/analytics', label: 'Analytics', icon: TrendingUp },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/seller/grocery/payouts', label: 'Wallet & Payouts', icon: Wallet },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/seller/grocery/compliance', label: 'Compliance', icon: ShieldCheck },
      { href: '/seller/grocery/settings', label: 'Store Settings', icon: Settings },
    ],
  },
];

const MOCK_NOTIFICATIONS = [
  { id: '1', text: 'New order #GRC-2847 received', time: '2m ago', type: 'order' as const, unread: true },
  { id: '2', text: '5 products low on stock', time: '15m ago', type: 'alert' as const, unread: true },
  { id: '3', text: 'Payout of ₹12,400 processed', time: '1h ago', type: 'payout' as const, unread: false },
  { id: '4', text: 'Campaign "Summer Sale" approved', time: '3h ago', type: 'campaign' as const, unread: false },
];

export default function SellerGroceryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  /**
   * The signed-in seller's own store.
   *
   * This chrome was hard-coded to "FreshMart Supermarket", initials "FM" and an
   * owner called "Arun P." — one seed shop's identity, shown to every seller in
   * their own portal. `StoreGate` already resolves the real store for the pages
   * inside; the frame around them never asked.
   */
  const { store } = useGrocerySellerStore();
  const { user } = useAuth();
  const storeName = store?.name ?? null;
  const storeInitials = storeName
    ? storeName.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '—';
  const ownerName = user?.name || user?.email || 'Signed in';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) setProfileOpen(false);
      if (!target.closest('[data-notif-menu]')) setNotifOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Close the mobile menu on navigation.
  //
  // Adjusted during render rather than in an effect. As an effect this ran one
  // render *after* the new page had painted, so tapping a link left the drawer
  // covering the destination for a frame before it snapped shut. React re-runs
  // this component immediately on the state change without committing the
  // intermediate output, so the drawer is simply never painted open on the new
  // route. https://react.dev/learn/you-might-not-need-an-effect
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMobileMenuOpen(false);
  }

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.unread).length;

  // Generate breadcrumb from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.slice(2).map((seg, i) => ({
    label: seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    href: '/' + pathSegments.slice(0, i + 3).join('/'),
    isLast: i === pathSegments.length - 3,
  }));

  return (
    <SellerRoleGuard allowed="grocery">
      <div className="min-h-screen bg-slate-50 flex">
      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className="w-[260px] bg-white border-r border-slate-200 hidden lg:flex flex-col shrink-0 sticky top-0 h-screen">
        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-2.5">
          <div className="w-9 h-9 bg-linear-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
            <Store className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm text-slate-900 leading-tight tracking-tight">KARTSEEK</h1>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.15em]">Grocery Seller</p>
          </div>
        </div>

        {/* Store selector */}
        <div className="px-3 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 p-2.5 bg-linear-to-r from-emerald-50 to-teal-50 rounded-xl cursor-pointer hover:from-emerald-100 hover:to-teal-100 transition-colors border border-emerald-100">
            <div className="w-9 h-9 bg-emerald-200 rounded-lg flex items-center justify-center text-emerald-800 text-xs font-black">
              {storeInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{storeName ?? 'Your store'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${storeOpen ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${storeOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <span className={`text-[10px] font-semibold ${storeOpen ? 'text-emerald-600' : 'text-red-600'}`}>
                  {storeOpen ? 'Open' : 'Closed'}
                </span>
                <span className="text-[10px] text-slate-400">• 🇮🇳 India</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-1">
              <p className="px-5 pt-3 pb-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                      active
                        ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] ${
                        active ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {'badge' in item && item.badge && (
                      <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-slate-100 space-y-0.5">
          <Link
            href="/seller/grocery/onboarding"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Globe className="w-4 h-4" /> Onboarding Status
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <HelpCircle className="w-4 h-4" /> Help & Support
          </Link>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ──────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
          ><DismissOnEscape onDismiss={() => setMobileMenuOpen(false)} /></div>
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-white z-50 shadow-2xl animate-in slide-in-from-left duration-300 overflow-y-auto">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-linear-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-sm text-slate-900">KARTSEEK</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="py-2">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="mb-1">
                  <p className="px-5 pt-3 pb-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-[18px] h-[18px] ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="flex-1">{item.label}</span>
                        {'badge' in item && item.badge && (
                          <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* ── Main Area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          {/* Left: Mobile menu + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            <div className="hidden md:flex items-center gap-1 text-xs">
              <Link href="/seller/grocery/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors font-medium">
                Grocery
              </Link>
              {breadcrumbs.map((bc) => (
                <React.Fragment key={bc.href}>
                  <ChevronRight className="w-3 h-3 text-slate-300" />
                  {bc.isLast ? (
                    <span className="font-bold text-slate-700">{bc.label}</span>
                  ) : (
                    <Link href={bc.href} className="text-slate-400 hover:text-slate-600 transition-colors font-medium">
                      {bc.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="md:hidden">
              <p className="text-sm font-bold text-slate-900">{storeName ?? 'Your store'}</p>
            </div>
          </div>

          {/* Right: Store toggle + Notifs + Profile */}
          <div className="flex items-center gap-2">
            {/* Store open/close toggle */}
            <button
              onClick={() => setStoreOpen(!storeOpen)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                storeOpen
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${storeOpen ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${storeOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </span>
              {storeOpen ? 'Store Open' : 'Store Closed'}
            </button>

            {/* Notifications */}
            <div className="relative" data-notif-menu>
              <button
                onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); }}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-[18px] h-[18px] text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full ring-2 ring-white text-[8px] font-black text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">Notifications</h3>
                    <span className="text-[10px] text-emerald-600 font-bold cursor-pointer hover:underline">
                      Mark all read
                    </span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {MOCK_NOTIFICATIONS.map((n) => (
                      <div
                        key={n.id}
                        className={`px-3 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-start gap-2.5 ${
                          n.unread ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.unread ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        <div>
                          <p className={`text-xs ${n.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                            {n.text}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-100">
                    <Link
                      href="/seller/grocery/dashboard"
                      className="block text-center text-xs font-bold text-emerald-600 hover:text-emerald-700 py-1.5"
                    >
                      View All Notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" data-profile-menu>
              <button
                onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-50 transition-colors"
                aria-label="Profile menu"
              >
                <div className="w-8 h-8 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1 z-50 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{ownerName}</p>
                    <p className="text-[10px] text-slate-400">Store Owner{storeName ? ` • ${storeName}` : ''}</p>
                  </div>
                  <Link
                    href="/seller/grocery/settings"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 font-medium"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings className="w-3.5 h-3.5" /> Store Settings
                  </Link>
                  <Link
                    href="/seller/grocery/compliance"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 font-medium"
                    onClick={() => setProfileOpen(false)}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Compliance
                  </Link>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 font-medium">
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="flex-1 p-3 xs:p-4 md:p-6 3xl:p-8 overflow-auto safe-bottom">
          {children}
        </main>
      </div>
      </div>
    </SellerRoleGuard>
  );
}