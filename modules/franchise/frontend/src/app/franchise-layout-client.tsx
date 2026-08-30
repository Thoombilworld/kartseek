'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard, Store, ShoppingCart, MapPin, DollarSign, Settings,
  ShieldAlert, BarChart3, Menu, Users, Truck, Pill, UtensilsCrossed,
  X, Bell, Search, Stethoscope, Car, Package, Megaphone,
  HeadphonesIcon, UserCog, Landmark, Globe, LogOut, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { ZoneLink } from '@/components/zone-link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { FranchiseToastProvider } from '@/lib/contexts/franchise-toast-context';
import { useFranchiseRegion } from '@/lib/hooks/use-franchise-region';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
// ─── Sidebar Navigation Sections ──────────────────────────────────────────────

const navSections = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Modules',
    items: [
      // `module` is the registry key this entry corresponds to. Markets do not
      // all run every vertical — Qatar, Bahrain, Kuwait and Oman do not enable
      // doctor, and the UK and US run a shorter list again — so an operator was
      // being offered dashboards that could never have data behind them.
      { href: '/grocery', label: 'Grocery', icon: ShoppingCart, module: 'grocery' },
      { href: '/restaurant', label: 'Restaurant', icon: UtensilsCrossed, module: 'restaurant' },
      { href: '/pharmacy', label: 'Pharmacy', icon: Pill, module: 'pharmacy' },
      { href: '/marketplace', label: 'Marketplace', icon: Store, module: 'marketplace' },
      { href: '/taxi', label: 'Taxi & Rides', icon: Car, module: 'taxi' },
      { href: '/doctor', label: 'Doctor & Clinics', icon: Stethoscope, module: 'doctor' },
      { href: '/hotel-booking', label: 'Hotel Booking', icon: Landmark, module: 'hotel-booking' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/orders', label: 'All Orders', icon: Package },
      { href: '/vendors', label: 'Local Vendors', icon: Store },
      { href: '/delivery-partners', label: 'Delivery Partners', icon: Truck },
      { href: '/zones', label: 'Delivery Zones', icon: MapPin },
      { href: '/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/commissions', label: 'Commissions', icon: Landmark },
      { href: '/payouts', label: 'Payouts', icon: DollarSign },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/marketing', label: 'Marketing & Promos', icon: Megaphone },
      { href: '/support', label: 'Support Tickets', icon: HeadphonesIcon },
      { href: '/staff', label: 'Staff & Roles', icon: UserCog },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// ─── Public Route Check ───────────────────────────────────────────────────────

const PUBLIC_ROUTES = ['/login', '/opportunity'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

// ─── Layout Component ─────────────────────────────────────────────────────────

export default function FranchiseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isHydrated, hasRole, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // The franchise's own market — not the viewer's. See useFranchiseRegion.
  const { region, isModuleEnabled } = useFranchiseRegion();

  const isPublic = isPublicRoute(pathname);

  // Public routes render without dashboard shell
  if (isPublic) {
    return <>{children}</>;
  }

  // Auth guard — loading state
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading franchise portal...</p>
        </div>
      </div>
    );
  }

  // Auth guard — access denied
  if (!isAuthenticated || !hasRole('FRANCHISE')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">
            You need franchise partner credentials to access this dashboard. Please sign in with your franchise account.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={'/login?redirect=' + encodeURIComponent(pathname)}
              className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold py-3 rounded-xl text-sm text-center transition-colors">
              Sign In as Franchise Partner
            </Link>
            <Link href="/opportunity"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm text-center transition-colors">
              Apply for Franchise
            </Link>
            <ZoneLink href="/" className="text-slate-600 hover:text-slate-400 text-xs transition-colors mt-2">
              ← Back to KARTSEEK Home
            </ZoneLink>
          </div>
        </div>
      </div>
    );
  }

  // ─── Authenticated Dashboard Shell ────────────────────────────────────────

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'FR';

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 shrink-0">
        <Link href="/" className="font-bold text-lg text-white tracking-wide">
          KARTSEEK <span className="text-teal-400 font-light">Franchise</span>
        </Link>
      </div>

      {/* Territory Badge */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-lg">
          {/*
            The estate's market, not the viewer's city. This read `user.city`
            with 'Mumbai South' behind it, so every operator in every country
            was told they were running a Mumbai region — and the currency their
            books settle in was nowhere on screen.
          */}
          <Globe className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-bold text-slate-300 flex-1">
            {region
              ? `${region.flag ?? ''} ${region.countryName ?? region.countryCode}`.trim()
              : (user?.city ?? 'Region')}
          </span>
          {region?.currency ? (
            <span className="text-[10px] font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded">
              {region.currency.code}
            </span>
          ) : null}
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 mt-5 px-3 first:mt-2">
              {section.label}
            </div>
            {section.items
              .filter((item) => !(item as any).module || isModuleEnabled((item as any).module))
              .map((item) => {
              const active = isActive(item.href, (item as any).exact);
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name || 'Franchise Owner'}</p>
            <p className="text-[10px] text-slate-500">{user?.email || 'franchise@kartseek.com'}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border border-transparent hover:border-red-500/20">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <FranchiseToastProvider>
    <div className="min-h-screen bg-slate-100 flex font-sans">

      {/* Desktop Sidebar */}
      <aside className="w-60 3xl:w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col shadow-xl z-20 fixed h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} ><DismissOnEscape onDismiss={() => setMobileOpen(false)} /></div>
          <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col h-full relative z-10 shadow-2xl">
            <button title="Close sidebar" onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-60 3xl:ml-64">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button title="Open menu" className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-72">
              <Search className="w-4 h-4 text-slate-400" />
              <input placeholder="Search anything..." className="bg-transparent text-sm outline-none flex-1 text-slate-600" />
            </div>
          </div>
          <div className="flex items-center gap-3">

            {/* Notifications */}
            <div className="relative">
              <button title="Notifications" onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                className={`text-slate-400 hover:text-slate-600 relative p-1.5 rounded-lg transition-colors ${showNotifications ? 'bg-slate-100 text-slate-600' : ''}`}>
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} ><DismissOnEscape onDismiss={() => setShowNotifications(false)} /></div>
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <h4 className="font-bold text-sm text-slate-900">Notifications</h4>
                      <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">3 new</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {[
                        { title: 'New vendor registration', desc: 'Fresh Farm Organics applied for grocery access', time: '5m ago', dot: 'bg-blue-500' },
                        { title: 'Payout processed', desc: '₹45,200 transferred to your bank account', time: '1h ago', dot: 'bg-emerald-500' },
                        { title: 'Support ticket #284', desc: 'Customer complaint requires your attention', time: '3h ago', dot: 'bg-amber-500' },
                      ].map((n, i) => (
                        <div key={i} className="flex gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                          <span className={`w-2 h-2 rounded-full ${n.dot} mt-1.5 shrink-0`} />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link href="/support" onClick={() => setShowNotifications(false)}
                      className="block text-center text-xs text-teal-600 font-bold py-2.5 border-t border-slate-100 hover:bg-teal-50 transition-colors">
                      View All Notifications
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                className={`w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md hover:ring-2 hover:ring-teal-300 transition-all cursor-pointer ${showProfile ? 'ring-2 ring-teal-400' : ''}`}>
                {userInitials}
              </button>
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} ><DismissOnEscape onDismiss={() => setShowProfile(false)} /></div>
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <p className="font-bold text-sm text-slate-900">{user?.name || 'Franchise Owner'}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                      <p className="text-[10px] text-teal-600 font-bold mt-1">● {user?.city || 'Mumbai South'} Region</p>
                    </div>
                    <div className="py-1">
                      <Link href="/settings" onClick={() => setShowProfile(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <Settings className="w-4 h-4 text-slate-400" /> Account Settings
                      </Link>
                      <Link href="/staff" onClick={() => setShowProfile(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <UserCog className="w-4 h-4 text-slate-400" /> Staff & Roles
                      </Link>
                    </div>
                    <div className="border-t border-slate-100">
                      <button onClick={() => { setShowProfile(false); handleLogout(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-3 xs:p-4 md:p-6 3xl:p-8 overflow-auto safe-bottom">
          {children}
        </main>
      </div>
    </div>
    </FranchiseToastProvider>
  );
}
