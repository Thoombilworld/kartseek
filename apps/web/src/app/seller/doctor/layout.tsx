'use client';
import { SellerRoleGuard } from '@/components/shared/seller-role-guard';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Users, Star, FileCheck, DollarSign,
  Settings, Stethoscope, Clock, Menu, X, Bell, LogOut, Building2,
  ChevronRight, Activity, Upload, UserCircle, Tag, UserPlus, Hospital,
} from 'lucide-react';
import { ProviderType, MOCK_PROVIDER, ProviderContext, useProvider } from './provider-context';


import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
// ─── Navigation config per role ─────────────────────────────────────────────────
type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean; badge?: string };

const SHARED_NAV: NavItem[] = [
  { href: '/seller/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
];

const FACILITY_NAV: NavItem[] = [
  { href: '/seller/doctor/my-doctors', label: 'My Doctors', icon: UserPlus },
  { href: '/seller/doctor/my-specialties', label: 'My Specialties', icon: Tag },
  { href: '/seller/doctor/appointments', label: 'Appointments', icon: Calendar },
  { href: '/seller/doctor/patients', label: 'Patients', icon: Users },
  { href: '/seller/doctor/reviews', label: 'Reviews & Ratings', icon: Star },
  { href: '/seller/doctor/documents', label: 'Documents', icon: FileCheck },
  { href: '/seller/doctor/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/seller/doctor/settings', label: 'Settings', icon: Settings },
];

const DOCTOR_NAV: NavItem[] = [
  { href: '/seller/doctor/profile', label: 'My Profile', icon: UserCircle },
  { href: '/seller/doctor/availability', label: 'Availability', icon: Clock },
  { href: '/seller/doctor/appointments', label: 'Appointments', icon: Calendar },
  { href: '/seller/doctor/patients', label: 'Patients', icon: Users },
  { href: '/seller/doctor/reviews', label: 'Reviews & Ratings', icon: Star },
  { href: '/seller/doctor/documents', label: 'Documents', icon: FileCheck },
  { href: '/seller/doctor/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/seller/doctor/settings', label: 'Settings', icon: Settings },
];

function getNavItems(role: ProviderType): NavItem[] {
  return role === 'doctor'
    ? [...SHARED_NAV, ...DOCTOR_NAV]
    : [...SHARED_NAV, ...FACILITY_NAV];
}

const ROLE_LABELS: Record<ProviderType, string> = {
  hospital: 'Hospital Partner Portal',
  clinic: 'Clinic Partner Portal',
  doctor: 'Doctor Partner Portal',
};

const ROLE_COLORS: Record<ProviderType, { bg: string; accent: string; highlight: string; badge: string }> = {
  hospital: { bg: 'from-blue-900 to-blue-950', accent: 'blue', highlight: 'blue', badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  clinic: { bg: 'from-teal-900 to-teal-950', accent: 'teal', highlight: 'teal', badge: 'bg-teal-500/20 border-teal-500/30 text-teal-400' },
  doctor: { bg: 'from-violet-900 to-violet-950', accent: 'violet', highlight: 'violet', badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
};

// ─── Component ──────────────────────────────────────────────────────────────────
export default function DoctorPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [providerType, setProviderType] = useState<ProviderType>('hospital');

  // Bypass portal chrome for standalone auth pages
  const isAuthPage = pathname.startsWith('/seller/doctor/login') || pathname.startsWith('/seller/doctor/register');
  if (isAuthPage) {
    return <>{children}</>;
  }

  const provider = MOCK_PROVIDER[providerType];
  const navItems = getNavItems(providerType);
  const colors = ROLE_COLORS[providerType];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <>
      {/* Logo / Branding */}
      <div className={`h-16 flex items-center px-5 border-b border-white/10 bg-linear-to-r ${colors.bg} shrink-0`}>
        <Link href="/seller/doctor/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
            {providerType === 'doctor'
              ? <Stethoscope className="w-4.5 h-4.5 text-white/80" />
              : <Hospital className="w-4.5 h-4.5 text-white/80" />}
          </div>
          <div>
            <span className="font-black text-white text-sm tracking-wide">KARTSEEK </span>
            <span className="text-white/70 text-sm font-bold">Health</span>
          </div>
        </Link>
      </div>

      {/* Provider Info */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white/20 shrink-0">
            <img src={provider.image} alt="Provider" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{provider.name}</p>
            <p className="text-[10px] text-white/50 truncate">{provider.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className={`flex items-center gap-1 ${colors.badge} text-[10px] font-bold px-2 py-0.5 rounded-full border`}>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Verified & Active
          </span>
        </div>
        {/* Role Switcher (dev tool) */}
        <div className="mt-3 flex gap-1">
          {(['hospital', 'clinic', 'doctor'] as ProviderType[]).map((r) => (
            <button
              key={r}
              onClick={() => setProviderType(r)}
              className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${
                providerType === r
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'border-transparent text-white/30 hover:text-white/60'
              }`}
            >
              {r === 'hospital' ? '🏥' : r === 'clinic' ? '🏪' : '👨‍⚕️'} {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? `bg-white/10 text-white border border-white/20 shadow-sm`
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80 border border-transparent'
              }`}
            >
              <item.icon className={`w-4.5 h-4.5 ${active ? 'text-white/80' : 'text-white/30 group-hover:text-white/60'}`} />
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {active && <ChevronRight className="w-3.5 h-3.5 text-white/30 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Link
          href="/seller/login"
          className="flex items-center gap-2 text-sm text-white/40 hover:text-red-400 transition-colors px-3 py-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </Link>
      </div>
    </>
  );

  return (
    <SellerRoleGuard allowed="doctor">
      <ProviderContext.Provider value={{ providerType, setProviderType, provider }}>
      <div className="min-h-screen bg-slate-50 flex font-sans">
        {/* Desktop Sidebar */}
        <aside className={`w-64 bg-linear-to-b ${colors.bg} text-white/60 hidden md:flex flex-col shadow-2xl z-20 fixed h-screen`}>
          <SidebarContent />
        </aside>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} ><DismissOnEscape onDismiss={() => setMobileOpen(false)} /></div>
            <aside className={`w-72 bg-linear-to-b ${colors.bg} text-white/60 flex flex-col h-full relative z-10 shadow-2xl`}>
              <button
                title="Close sidebar"
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-64">
          {/* Top Header */}
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                title="Open menu"
                className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-bold text-slate-900 hidden md:block">{ROLE_LABELS[providerType]}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button title="Notifications" className="text-slate-400 hover:text-slate-600 relative p-1.5">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className={`w-8 h-8 bg-${colors.accent}-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                {provider.initials}
              </div>
            </div>
          </header>

          <main id="main-content" className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      </ProviderContext.Provider>
    </SellerRoleGuard>
  );
}