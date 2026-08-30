'use client';
import { SellerRoleGuard } from '@/components/shared/seller-role-guard';
import React, { useState } from 'react';
import {
  LayoutDashboard, Users, FileText, MapPin, DollarSign,
  Settings, Menu, X, Car, ChevronDown, Globe, Bell, LogOut,
  Building2, Shield, CarFront, Route, Truck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { CountryFlag } from '@/components/shared/country-flag';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const vendorNav = [
  { href: '/seller/taxi', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/seller/taxi/drivers', label: 'My Drivers', icon: Users },
  { href: '/seller/taxi/rentals', label: 'Rentals', icon: CarFront },
  { href: '/seller/taxi/intercity', label: 'Intercity', icon: Route },
  { href: '/seller/taxi/fleet', label: 'My Fleet', icon: Truck },
  { href: '/seller/taxi/documents', label: 'Documents', icon: FileText },
  { href: '/seller/taxi/trips', label: 'Trip History', icon: MapPin },
  { href: '/seller/taxi/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/seller/taxi/notifications', label: 'Notifications', icon: Bell },
  { href: '/seller/taxi/complaints', label: 'Complaints', icon: Shield },
];

// Mock vendor data — in production, this comes from auth context
const vendorInfo = {
  name: 'QuickRide Fleet',
  countryCode: 'IN',
  city: 'Bangalore',
  status: 'active' as const,
  flag: '🇮🇳',
};

const statusColor: Record<string, string> = {
  active: 'bg-emerald-500',
  suspended: 'bg-amber-500',
  blocked: 'bg-red-500',
  pending: 'bg-blue-500',
};

export default function VendorTaxiLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    logout();
    router.push('/seller/taxi/login');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950 shrink-0">
        <Link href="/seller/taxi" className="font-bold text-lg text-white tracking-wide flex items-center gap-2">
          <div className="w-7 h-7 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          <span>KARTSEEK <span className="text-amber-400 font-black">VENDOR</span></span>
        </Link>
      </div>

      {/* Vendor Badge */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3 bg-slate-800/60 px-3 py-2.5 rounded-lg">
          <div className="w-9 h-9 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm">
            {vendorInfo.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{vendorInfo.name}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs"><CountryFlag code={vendorInfo.countryCode ?? ""} size="sm" /></span>
              <span className="text-[10px] text-slate-400">{vendorInfo.city}</span>
              <span className={`w-2 h-2 rounded-full ${statusColor[vendorInfo.status]}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {vendorNav.map(item => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border border-transparent hover:border-red-500/20" id="vendor-sign-out">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <SellerRoleGuard allowed="taxi">
      <div className="min-h-screen bg-slate-100 flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-60 bg-slate-900 text-slate-300 hidden md:flex flex-col shadow-xl z-20 fixed h-screen">
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
      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button title="Open menu" className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-slate-700">Vendor Portal</span>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                <CountryFlag code={vendorInfo.countryCode ?? ""} size="sm" /> {vendorInfo.city}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button title="Notifications" className="text-slate-400 hover:text-slate-600 relative p-1.5">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md">
              QR
            </div>
          </div>
        </header>
        <main id="main-content" className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
      </div>
    </SellerRoleGuard>
  );
}