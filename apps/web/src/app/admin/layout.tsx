'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Store, ShoppingCart, 
  MapPin, DollarSign, Settings, ShieldAlert, BarChart3, Menu, Users2,
  FileCheck, Truck, Activity, ScrollText, Pill, UtensilsCrossed,
  ChevronDown, X, Bell, Search, Stethoscope, Car, Shield, Radio,
  Package, Megaphone, HeadphonesIcon, UserCog, Landmark, RefreshCcw,
  Globe, ChevronRight, Hotel, LogOut, Wallet, Gift, Key, LayoutTemplate, Lock,
  ClipboardCheck, FileText, AlertTriangle, Star, Heart,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAudit } from '@/lib/contexts/audit-context';
import { CountryFlag } from '@/components/shared/country-flag';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  /** Permission key(s) required — item is hidden if user lacks ALL of these */
  perm?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, perm: 'dashboard.view' },
      { href: '/admin/orders', label: 'All Orders', icon: Package, perm: 'orders.view' },
      { href: '/admin/regions', label: 'Regions', icon: Globe, perm: 'system.settings' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/customers', label: 'Customers', icon: Users, perm: 'users.view' },
      { href: '/admin/sellers', label: 'Sellers & Partners', icon: Store, perm: 'sellers.view' },
      { href: '/admin/drivers', label: 'Drivers & Delivery', icon: UserCog, perm: 'delivery.view' },
      { href: '/admin/franchise', label: 'Franchisees', icon: MapPin, perm: 'franchise.view' },
      { href: '/admin/staff', label: 'Staff Management', icon: Users2, perm: 'staff.view' },
      { href: '/admin/roles', label: 'Roles & Permissions', icon: Shield, perm: 'staff.manage' },
      { href: '/admin/kyc-verification', label: 'KYC Verification', icon: FileCheck, perm: 'kyc.view' },
    ],
  },
  {
    label: 'Modules',
    items: [
      { href: '/admin/marketplace', label: 'Marketplace', icon: ShoppingCart, perm: 'modules.marketplace' },
      { href: '/admin/grocery', label: 'Grocery', icon: Store, perm: 'modules.grocery' },
      { href: '/admin/restaurant', label: 'Restaurants', icon: UtensilsCrossed, perm: 'modules.restaurant' },
      { href: '/admin/pharmacy', label: 'Pharmacy', icon: Pill, perm: 'modules.pharmacy' },
      { href: '/admin/hotel-booking', label: 'Hotel Booking', icon: Hotel },
      { href: '/admin/doctor', label: 'Doctor / Hospital', icon: Stethoscope, perm: 'modules.doctor' },
      { href: '/admin/taxi', label: 'Taxi & Rides', icon: Car, perm: 'modules.taxi' },
      { href: '/admin/taxi/ratings', label: 'Driver Ratings', icon: Star, perm: 'modules.taxi' },
      { href: '/admin/delivery', label: 'Delivery Ops', icon: Truck, perm: 'delivery.view' },
      { href: '/admin/delivery/partners', label: 'Delivery Partners', icon: Users2, perm: 'delivery.manage' },
      { href: '/admin/marketplace/pincode-insights', label: 'Pincode Insights', icon: MapPin, perm: 'delivery.view' },
      { href: '/admin/hotel-booking/loyalty', label: 'Loyalty Program', icon: Gift, perm: 'loyalty.view' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/order-disputes', label: 'Order Disputes', icon: Package, perm: 'orders.manage' },
      { href: '/admin/page-builder', label: 'Page Builder (CMS)', icon: LayoutTemplate, perm: 'content.manage' },
      { href: '/admin/seller-content', label: 'Seller Content', icon: ClipboardCheck, perm: 'content.view' },
      { href: '/admin/content', label: 'Content & Promos', icon: Megaphone, perm: 'content.manage' },
      { href: '/admin/static-pages', label: 'Static Pages (CMS)', icon: FileText, perm: 'content.manage' },
      { href: '/admin/brand-followers', label: 'Brand Followers', icon: Heart, perm: 'content.manage' },
      { href: '/admin/support', label: 'Support Tickets', icon: HeadphonesIcon, perm: 'support.view' },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/sos', label: 'SOS Emergency', icon: AlertTriangle },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/admin/payouts', label: 'Payouts', icon: DollarSign, perm: 'finance.payouts' },
      { href: '/admin/commissions', label: 'Commissions', icon: Landmark, perm: 'finance.view' },
      { href: '/admin/marketplace/seller-wallets', label: 'Seller Wallets', icon: Wallet, perm: 'wallet.audit' },
      { href: '/admin/wallet-audit', label: 'Wallet Audit', icon: Wallet, perm: 'wallet.audit' },
      { href: '/admin/refunds', label: 'Refunds', icon: RefreshCcw, perm: 'orders.refund' },
      { href: '/admin/loyalty', label: 'Loyalty Program', icon: Gift, perm: 'loyalty.view' },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, perm: 'finance.view' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/system-health', label: 'System Health', icon: Activity, perm: 'system.health' },
      { href: '/admin/security', label: 'Security & DDoS', icon: ShieldAlert, perm: 'system.settings' },
      { href: '/admin/gdpr', label: 'GDPR & Privacy', icon: Shield, perm: 'system.settings' },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, perm: 'audit.logs' },
      { href: '/admin/two-factor', label: 'Two-Factor Auth', icon: Key, perm: 'system.settings' },
      { href: '/admin/seo', label: 'SEO Overrides', icon: Globe, perm: 'content.manage' },
      { href: '/admin/settings/module-titles', label: 'Module Titles', icon: Globe, perm: 'system.settings' },
      { href: '/admin/settings', label: 'Settings', icon: Settings, perm: 'system.settings' },
    ],
  },
];

/** Region Switcher Dropdown — shown in the admin header */
function RegionSwitcher() {
  const { selectedRegion, setSelectedRegion } = useRegion();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const isLocked = user?.regionLocked === true;

  const regionOptions: { code: SupportedCountryCode; label: string }[] = [
    { code: 'ALL', label: 'All Regions' },
    ...Object.values(REGIONS).map(r => ({ code: r.code, label: r.name })),
  ];

  const current = regionOptions.find(r => r.code === selectedRegion) || regionOptions[0];

  // Region-locked users see a static badge instead of a dropdown
  if (isLocked) {
    return (
      <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-sm cursor-default" title="Your region is locked by your admin role">
        <Globe className="w-4 h-4 text-amber-600" />
        {current.code === 'ALL' ? <span className="text-lg">🌍</span> : <CountryFlag code={current.code} size="lg" />}
        <span className="font-semibold text-amber-700 hidden sm:inline">{current.label}</span>
        <Lock className="w-3.5 h-3.5 text-amber-500" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-sm"
        id="region-switcher-btn"
      >
        <Globe className="w-4 h-4 text-emerald-600" />
        {current.code === 'ALL' ? <span className="text-lg">🌍</span> : <CountryFlag code={current.code} size="lg" />}
        <span className="font-semibold text-slate-700 hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} ><DismissOnEscape onDismiss={() => setOpen(false)} /></div>
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 animate-in fade-in duration-150">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Select Region
            </div>
            {regionOptions.map(r => (
              <button
                key={r.code}
                onClick={() => { setSelectedRegion(r.code); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                  selectedRegion === r.code ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700'
                }`}
                id={`region-option-${r.code}`}
              >
                {r.code === 'ALL' ? <span className="text-lg">🌍</span> : <CountryFlag code={r.code} size="lg" />}
                <span className="flex-1 text-left">{r.label}</span>
                {selectedRegion === r.code && (
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { selectedRegion, setSelectedRegion } = useRegion();
  const { user, isAuthenticated, hasRole, hasPermission, logout, isHydrated } = useAuth();
  const { logAction } = useAudit();
  const isRegionLocked = user?.regionLocked === true;

  // Auto-lock region for region-locked users
  React.useEffect(() => {
    if (isRegionLocked && user?.regionCode && user.regionCode !== selectedRegion) {
      setSelectedRegion(user.regionCode as SupportedCountryCode);
    }
  }, [isRegionLocked, user?.regionCode, selectedRegion, setSelectedRegion]);

  // Log login event on first authenticated mount
  const loginLoggedRef = React.useRef(false);
  React.useEffect(() => {
    if (isAuthenticated && user && !loginLoggedRef.current) {
      loginLoggedRef.current = true;
      logAction(
        'Admin signed in',
        'Auth',
        `${user.name} (${user.adminRoleName || 'Admin'}) signed in as ${user.email}`,
      );
    }
  }, [isAuthenticated, user, logAction]);

  // Don't apply guard to the admin login page itself
  const isAdminLogin = pathname === '/admin/login';

  // Auth guard: if hydrated and not admin, show access denied
  if (!isAdminLogin && isHydrated && (!isAuthenticated || !hasRole('SUPER_ADMIN'))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">You need administrator privileges to access this area. Please sign in with an admin account.</p>
          <div className="flex flex-col gap-3">
            <Link href="/admin/login" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm text-center transition-colors">
              Sign In as Admin
            </Link>
            <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm text-center transition-colors">
              Back to KARTSEEK Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If it's the admin login page, render just the children (no sidebar)
  if (isAdminLogin) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    try { logAction('Admin signed out', 'Auth', `User ${user?.name} (${user?.email}) signed out`); } catch {}
    logout();
    router.push('/admin/login');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const regionLabelText = selectedRegion === 'ALL'
    ? 'All Regions'
    : REGIONS[selectedRegion]?.name;
  const regionLabelNode = selectedRegion === 'ALL'
    ? <><span>🌍</span> All Regions</>
    : <><CountryFlag code={selectedRegion} size="sm" className="mr-1" /> {REGIONS[selectedRegion]?.name}</>;

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 shrink-0">
        <Link href="/admin" className="font-bold text-lg text-white tracking-wide">
          KARTSEEK <span className="text-emerald-500 font-black">SUPER</span>
        </Link>
      </div>

      {/* Region Badge in Sidebar */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-lg">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-300 flex-1 flex items-center gap-1">{regionLabelNode}</span>
          {isRegionLocked && <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">LOCKED</span>}
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navSections.map((section) => {
          // Filter items by permission
          const visibleItems = section.items.filter(item => {
            if (!item.perm) return true; // No permission required
            return hasPermission(item.perm);
          });
          if (visibleItems.length === 0) return null;
          return (
          <div key={section.label}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 mt-5 px-3 first:mt-2">
              {section.label}
            </div>
            {visibleItems.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'SA'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name || 'Super Admin'}</p>
            <p className="text-[10px] text-slate-500">{user?.adminRoleName || 'Super Admin'}{isRegionLocked && user?.regionCode ? ` — ${(REGIONS as Record<string, {name:string}>)[user.regionCode]?.name || user.regionCode}` : ''}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
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
            {/* Region Switcher */}
            <RegionSwitcher />

            {/* Notifications */}
            <div className="relative">
              <button title="Notifications" onClick={() => { setShowNotifications(!showNotifications); setShowSecurity(false); setShowProfile(false); }} className={`text-slate-400 hover:text-slate-600 relative p-1.5 rounded-lg transition-colors ${showNotifications ? 'bg-slate-100 text-slate-600' : ''}`}>
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} ><DismissOnEscape onDismiss={() => setShowNotifications(false)} /></div>
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <h4 className="font-bold text-sm text-slate-900">Notifications</h4>
                      <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">4 new</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {[
                        { title: 'New seller registration', desc: 'FreshMart Store applied for marketplace access', time: '5m ago', dot: 'bg-blue-500' },
                        { title: 'Order #KS-28491 flagged', desc: 'Suspicious payment detected — manual review required', time: '18m ago', dot: 'bg-red-500' },
                        { title: 'Driver KYC approved', desc: 'Mohammed Al-Salem documents verified successfully', time: '1h ago', dot: 'bg-emerald-500' },
                        { title: 'System update complete', desc: 'v3.12.0 deployed to all regions', time: '3h ago', dot: 'bg-slate-400' },
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
                    <Link href="/admin/settings" onClick={() => setShowNotifications(false)} className="block text-center text-xs text-blue-600 font-bold py-2.5 border-t border-slate-100 hover:bg-blue-50 transition-colors">
                      View All Notifications
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Language — options follow the region selected above, so an admin
                working the Qatari market sees Arabic and English only. */}
            <div className="hidden md:block">
              <LocaleSwitcher showCountryTab={false} />
            </div>

            {/* Security Alerts */}
            <div className="relative">
              <button title="Security alerts" onClick={() => { setShowSecurity(!showSecurity); setShowNotifications(false); setShowProfile(false); }} className={`text-slate-400 hover:text-slate-600 relative p-1.5 rounded-lg transition-colors ${showSecurity ? 'bg-slate-100 text-slate-600' : ''}`}>
                <ShieldAlert className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
              </button>
              {showSecurity && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSecurity(false)} ><DismissOnEscape onDismiss={() => setShowSecurity(false)} /></div>
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <h4 className="font-bold text-sm text-slate-900">Security Alerts</h4>
                      <span className="text-[10px] bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-full">2 active</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {[
                        { title: 'Rate limit breach detected', desc: 'API endpoint /api/auth/login exceeded 500 req/min from IP 192.168.1.x', severity: 'high', time: '12m ago' },
                        { title: 'Unusual login pattern', desc: 'Admin login attempt from unrecognized device in Lagos, Nigeria', severity: 'medium', time: '45m ago' },
                        { title: 'SSL certificate renewal', desc: 'Certificate for api.kartseek.com expires in 14 days', severity: 'low', time: '2h ago' },
                      ].map((a, i) => (
                        <div key={i} className="flex gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.severity === 'high' ? 'bg-red-500' : a.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">{a.title}</p>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${a.severity === 'high' ? 'bg-red-100 text-red-600' : a.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{a.severity}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{a.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link href="/admin/security" onClick={() => setShowSecurity(false)} className="block text-center text-xs text-blue-600 font-bold py-2.5 border-t border-slate-100 hover:bg-blue-50 transition-colors">
                      Security Dashboard →
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowSecurity(false); }} className={`w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer ${showProfile ? 'ring-2 ring-blue-400' : ''}`}>
                SA
              </button>
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} ><DismissOnEscape onDismiss={() => setShowProfile(false)} /></div>
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <p className="font-bold text-sm text-slate-900">Super Admin</p>
                      <p className="text-xs text-slate-500">admin@kartseek.com</p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">● Online</p>
                    </div>
                    <div className="py-1">
                      <Link href="/admin/settings" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <Settings className="w-4 h-4 text-slate-400" /> Account Settings
                      </Link>
                      <Link href="/admin/roles" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <Shield className="w-4 h-4 text-slate-400" /> Roles & Permissions
                      </Link>
                      <Link href="/admin/audit-logs" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <ScrollText className="w-4 h-4 text-slate-400" /> Audit Logs
                      </Link>
                    </div>
                    <div className="border-t border-slate-100">
                      <button onClick={() => { setShowProfile(false); logout(); router.push('/admin/login'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">
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
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  // No RegionProvider here. The root layout already mounts one seeded with the
  // region and language the edge proxy resolved; nesting a second, unseeded
  // provider shadowed it, so the admin panel always opened on the fallback
  // region and its own language list ignored what was detected.
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}
