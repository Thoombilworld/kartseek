'use client';
import { SellerRoleGuard } from '@/components/shared/seller-role-guard';
import React, { useState, useEffect } from 'react';
import {
  BarChart3, ClipboardList, ShoppingBag, Megaphone, Wallet, TrendingUp,
  Settings, ShieldCheck, Bell, User, Menu, X, ChevronDown,
  LogOut, HelpCircle, Truck, Pill, FileCheck, Boxes, Package,
  Heart, AlertTriangle, Stethoscope, Globe, Store,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const NAV_SECTIONS = [
  {
    title: 'Dispensary',
    items: [
      { href: '/seller/pharmacy/dashboard', label: 'Dashboard', icon: BarChart3 },
    ],
  },
  {
    title: 'Prescriptions & Orders',
    items: [
      { href: '/seller/pharmacy/prescriptions', label: 'Prescriptions', icon: FileCheck, badge: '4' },
      { href: '/seller/pharmacy/orders', label: 'Active Orders', icon: ClipboardList, badge: '6' },
      { href: '/seller/pharmacy/delivery', label: 'Delivery Tracking', icon: Truck },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/seller/pharmacy/products', label: 'Product Catalog', icon: Pill },
      { href: '/seller/pharmacy/products/add', label: 'Add Product', icon: Package },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/seller/pharmacy/inventory', label: 'Inventory & Batches', icon: Boxes },
      { href: '/seller/pharmacy/licenses', label: 'Compliance & Licenses', icon: ShieldCheck },
    ],
  },
  {
    title: 'Growth',
    items: [
      { href: '/seller/pharmacy/offers', label: 'Promotions', icon: Megaphone },
      { href: '/seller/pharmacy/reports', label: 'Analytics & Reports', icon: TrendingUp },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/seller/pharmacy/wallet', label: 'Wallet & Payouts', icon: Wallet },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/seller/pharmacy/profile', label: 'Store Profile', icon: Store },
      { href: '/seller/pharmacy/settings', label: 'Store Settings', icon: Settings },
    ],
  },
];

const NOTIFICATIONS = [
  { id: 1, text: 'Prescription RX-88219 awaiting review', time: '2m ago', urgent: true },
  { id: 2, text: 'Amoxicillin 250mg — Low stock (2 strips)', time: '15m ago', urgent: true },
  { id: 3, text: 'Order PO-4201 accepted by driver', time: '30m ago', urgent: false },
  { id: 4, text: 'Benadryl Cough Syrup expires in 28 days', time: '1h ago', urgent: false },
  { id: 5, text: 'Weekly settlement ₹42,800 processed', time: '3h ago', urgent: false },
];

export default function PharmacySellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notif-menu]')) setNotifOpen(false);
      if (!target.closest('[data-profile-menu]')) setProfileOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Skip layout for auth pages
  if (pathname.includes('/register') || pathname.includes('/login')) {
    return <div className="min-h-screen bg-slate-50 font-sans">{children}</div>;
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const renderNav = () => (
    <>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="mb-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.12em] px-3 mb-1.5">
            {section.title}
          </p>
          {section.items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all mb-0.5 ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}>
                <item.icon className="w-[18px] h-[18px]" />
                <span className="flex-1">{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    active ? 'bg-white/20 text-white' : 'bg-red-500/90 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <SellerRoleGuard allowed="pharmacy">
      <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-[250px] bg-slate-900 hidden lg:flex flex-col shrink-0 sticky top-0 h-screen z-30">
        {/* Brand */}
        <div className="h-[60px] flex items-center px-5 border-b border-slate-800">
          <Link href="/seller/pharmacy/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
              <Pill className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-black text-white text-sm tracking-tight">KARTSEEK</span>
              <span className="text-teal-400 font-light text-sm ml-1">Rx</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {renderNav()}
        </nav>

        {/* Pharmacist Badge */}
        <div className="p-3 border-t border-slate-800">
          <div className="bg-teal-900/50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <div>
              <p className="text-[11px] font-bold text-teal-300">Licensed Pharmacist</p>
              <p className="text-[10px] text-teal-500">Reg: RPH-88219</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} ><DismissOnEscape onDismiss={() => setMobileOpen(false)} /></div>
          <aside className="relative w-[280px] bg-slate-900 h-full flex flex-col shadow-2xl">
            <div className="h-[60px] flex items-center justify-between px-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-linear-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Pill className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-white text-sm">KARTSEEK <span className="text-teal-400 font-light">Rx</span></span>
              </div>
              <button onClick={() => setMobileOpen(false)} title="Close menu" className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 overflow-y-auto">
              {renderNav()}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} title="Open menu" className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <h2 className="font-bold text-slate-800 text-sm">Apollo Pharmacy — Sector 14</h2>
              <span className="bg-teal-50 text-teal-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-teal-200 uppercase tracking-wider">
                Verified
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Store Toggle */}
            <button
              onClick={() => setStoreOpen(!storeOpen)}
              title={storeOpen ? 'Close pharmacy' : 'Open pharmacy'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                storeOpen
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${storeOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {storeOpen ? 'Open' : 'Closed'}
            </button>

            {/* Notifications */}
            <div className="relative" data-notif-menu>
              <button
                onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); }}
                title="Notifications"
                className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-sm">Notifications</h3>
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                      {NOTIFICATIONS.filter(n => n.urgent).length} urgent
                    </span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                    {NOTIFICATIONS.map((n) => (
                      <div key={n.id} className={`px-3 py-3 hover:bg-slate-50 cursor-pointer ${n.urgent ? 'bg-red-50/30' : ''}`}>
                        <div className="flex items-start gap-2">
                          {n.urgent && <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
                          <div>
                            <p className="text-xs font-medium text-slate-700">{n.text}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
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
                <div className="w-8 h-8 bg-linear-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-black text-xs">AP</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-[200px] bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900 text-sm">Apollo Pharmacy</p>
                    <p className="text-[10px] text-slate-400">Sector 14, Gurugram</p>
                  </div>
                  <Link href="/seller/pharmacy/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <Link href="/seller/pharmacy/licenses" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <ShieldCheck className="w-4 h-4" /> Compliance
                  </Link>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <HelpCircle className="w-4 h-4" /> Help & Support
                  </button>
                  <div className="border-t border-slate-100 mt-1">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" /> Sign Out
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