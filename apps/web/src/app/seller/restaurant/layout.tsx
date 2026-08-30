'use client';
import { SellerRoleGuard } from '@/components/shared/seller-role-guard';
import React, { useState, useEffect } from 'react';
import {
  BarChart3, ClipboardList, ShoppingBag, Megaphone, Wallet, TrendingUp,
  Settings, ShieldCheck, Store, Bell, User, Menu, X, ChevronDown,
  LogOut, HelpCircle, Globe, Truck, ChevronRight, UtensilsCrossed,
  CalendarCheck, ChefHat, LayoutGrid, Package, Boxes,
  Users, Star, DollarSign, CreditCard, Tag,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { href: '/seller/restaurant/dashboard', label: 'Dashboard', icon: BarChart3 },
    ],
  },
  {
    title: 'Orders',
    items: [
      { href: '/seller/restaurant/orders', label: 'Active Orders', icon: ClipboardList, badge: '4' },
      { href: '/seller/restaurant/kitchen', label: 'Kitchen Display', icon: ChefHat },
      { href: '/seller/restaurant/takeaway-orders', label: 'Takeaway', icon: ShoppingBag, badge: '1' },
      { href: '/seller/restaurant/dine-in-orders', label: 'Dine-in', icon: UtensilsCrossed, badge: '3' },
    ],
  },
  {
    title: 'Menu',
    items: [
      { href: '/seller/restaurant/menu', label: 'Menu Items', icon: LayoutGrid },
      { href: '/seller/restaurant/menu-categories', label: 'Categories', icon: Tag },
      { href: '/seller/restaurant/menu/combos', label: 'Combos & Bundles', icon: Package },
    ],
  },
  {
    title: 'Table Management',
    items: [
      { href: '/seller/restaurant/reservations', label: 'Reservations', icon: CalendarCheck, badge: '2' },
      { href: '/seller/restaurant/tables', label: 'Table Layout', icon: LayoutGrid },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/seller/restaurant/delivery', label: 'Delivery Tracking', icon: Truck },
      { href: '/seller/restaurant/inventory', label: 'Inventory', icon: Boxes },
      { href: '/seller/restaurant/takeaway-settings', label: 'Takeaway Settings', icon: ShoppingBag },
    ],
  },
  {
    title: 'Growth',
    items: [
      { href: '/seller/restaurant/offers', label: 'Promotions', icon: Megaphone },
      { href: '/seller/restaurant/customers', label: 'Customers', icon: Users },
      { href: '/seller/restaurant/ratings', label: 'Ratings & Reviews', icon: Star },
      { href: '/seller/restaurant/reports', label: 'Analytics', icon: TrendingUp },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/seller/restaurant/earnings', label: 'Earnings', icon: DollarSign },
      { href: '/seller/restaurant/payouts', label: 'Payouts', icon: CreditCard },
      { href: '/seller/restaurant/wallet', label: 'Wallet', icon: Wallet },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/seller/restaurant/compliance', label: 'Compliance', icon: ShieldCheck },
      { href: '/seller/restaurant/service-settings', label: 'Service Settings', icon: Settings },
      { href: '/seller/restaurant/settings', label: 'Store Settings', icon: Store },
    ],
  },
];

const MOCK_NOTIFICATIONS = [
  { id: '1', text: 'New order #ORD-9982 received', time: '1m ago', type: 'order' as const, unread: true },
  { id: '2', text: 'Table reservation for 6 guests (7:30 PM)', time: '10m ago', type: 'reservation' as const, unread: true },
  { id: '3', text: 'Driver assigned for #ORD-9980', time: '25m ago', type: 'delivery' as const, unread: false },
  { id: '4', text: 'Weekly payout of ₹42,800 processed', time: '2h ago', type: 'payout' as const, unread: false },
];

export default function RestaurantPartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [storeOnline, setStoreOnline] = useState(true);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) setProfileOpen(false);
      if (!target.closest('[data-notif-menu]')) setNotifOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Public pages (landing, login, onboarding) should render without the dashboard shell
  const PUBLIC_ROUTES = ['/seller/restaurant/landing', '/seller/restaurant/login', '/seller/restaurant/onboarding'];
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  if (isPublicRoute) {
    return <>{children}</>;
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.unread).length;

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-orange-700/30 bg-linear-to-r from-orange-700 to-amber-600 shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mr-3">
          <UtensilsCrossed className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-white text-sm tracking-tight">Restaurant Portal</h1>
          <p className="text-[10px] text-orange-200 font-medium">Partner Dashboard</p>
        </div>
      </div>

      {/* Store Toggle */}
      <div className="px-4 py-3 border-b border-slate-100">
        <button
          onClick={() => setStoreOnline(!storeOnline)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            storeOnline
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${storeOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${storeOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            {storeOnline ? 'Store Online' : 'Store Offline'}
          </div>
          <Globe className="w-3.5 h-3.5 opacity-60" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] px-3 mb-1.5">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all group ${
                      active
                        ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        active ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {active && <ChevronRight className="w-3.5 h-3.5 text-orange-400" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Help */}
      <div className="p-3 border-t border-slate-100 shrink-0">
        <a href="#" className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
          <HelpCircle className="w-4 h-4" />
          Help & Support
        </a>
      </div>
    </>
  );

  return (
    <SellerRoleGuard allowed="restaurant">
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="w-[260px] bg-white border-r border-slate-200 hidden lg:flex flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} ><DismissOnEscape onDismiss={() => setMobileMenuOpen(false)} /></div>
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-white flex flex-col shadow-2xl">
            <button
              onClick={() => setMobileMenuOpen(false)}
              title="Close menu"
              className="absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 z-10"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-[260px] 3xl:ml-[280px]">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              title="Open menu"
              className="lg:hidden w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200"
            >
              <Menu className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full ${storeOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
              <div>
                <h2 className="font-bold text-slate-800 text-sm leading-tight">The Grand Biryani House</h2>
                <p className="text-[10px] text-slate-400 font-medium">Andheri West Branch • RST-4921</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" data-notif-menu>
              <button
                onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); }}
                title="Notifications"
                className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 relative transition-colors"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Notifications</span>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{unreadCount} new</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {MOCK_NOTIFICATIONS.map((n) => (
                      <div key={n.id} className={`px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${n.unread ? 'bg-orange-50/30' : ''}`}>
                        <div className="flex items-start gap-3">
                          {n.unread && <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 shrink-0" />}
                          <div className={n.unread ? '' : 'ml-5'}>
                            <p className="text-xs text-slate-700 font-medium">{n.text}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100">
                    <button className="w-full text-center text-xs font-bold text-orange-600 hover:text-orange-700">View All</button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" data-profile-menu>
              <button
                onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
                title="Profile menu"
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 bg-linear-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4 text-white" />
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="font-bold text-sm text-slate-900">Grand Biryani House</p>
                    <p className="text-[10px] text-slate-400">restaurant@kartseek.com</p>
                  </div>
                  <div className="py-1">
                    <Link href="/seller/restaurant/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 font-medium">
                      <Settings className="w-4 h-4" /> Store Settings
                    </Link>
                    <Link href="/seller/restaurant/compliance" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 font-medium">
                      <ShieldCheck className="w-4 h-4" /> Compliance
                    </Link>
                    <hr className="my-1 border-slate-100" />
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="flex-1 p-3 xs:p-4 lg:p-6 3xl:p-8 overflow-auto safe-bottom">
          {children}
        </main>
      </div>
    </div>
    </SellerRoleGuard>
  );
}