'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Plus, ShoppingBag, RotateCcw, CreditCard,
  Wallet, BarChart3, Zap, Bell, Settings, Store, Award, Users,
  Star, HelpCircle, LogOut, ChevronDown, ChevronRight,
  Boxes, Upload, Percent, FileText, MessageSquare, Target, X, Menu,
  Truck, Activity, DollarSign, Layers, AlertCircle,
  TrendingUp, Code, GraduationCap, Warehouse, Edit3,
} from 'lucide-react';
import { SellerProvider, useSeller } from '@/lib/contexts/seller-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { SellerRoleGuard } from '@/components/shared/seller-role-guard';
import { useRegion } from '@/lib/contexts/region-context';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  getSellerComplianceBadges, getSellerTaxIdLabel, getPayoutNavLabel, getSellerRules,
  getCountry, formatMoney,
} from '@/lib/localization';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/seller/marketplace', icon: LayoutDashboard },
      { label: 'Performance', href: '/seller/marketplace/performance', icon: Activity },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Manage Products', href: '/seller/marketplace/products', icon: Package },
      { label: 'Add Product', href: '/seller/marketplace/products/add', icon: Plus },
      // Distinct from "Add Product", which creates a *new* catalogue entry.
      // This is for stock KartSeek already carries, where the seller supplies
      // only price and quantity — the multi-vendor path.
      { label: 'My Offers', href: '/seller/marketplace/listings', icon: Store },
      { label: 'Bulk Upload', href: '/seller/marketplace/products/bulk-upload', icon: Upload },
      // The page existed and worked on nothing; no link pointed at it either.
      { label: 'Bulk Edit', href: '/seller/marketplace/products/bulk-edit', icon: Edit3 },
      { label: 'Inventory', href: '/seller/marketplace/inventory', icon: Boxes },
      { label: 'Low Stock Alerts', href: '/seller/marketplace/low-stock', icon: Boxes, badgeKey: 'lowStock' as const },
    ],
  },
  {
    title: 'Orders & Shipping',
    items: [
      { label: 'Orders', href: '/seller/marketplace/orders', icon: ShoppingBag, badgeKey: 'pendingOrders' as const },
      { label: 'Shipping & Logistics', href: '/seller/marketplace/shipping', icon: Truck },
      { label: 'Returns', href: '/seller/marketplace/returns', icon: RotateCcw, badgeKey: 'returnRequests' as const },
      { label: 'Refunds', href: '/seller/marketplace/refunds', icon: CreditCard, badgeKey: 'refundRequests' as const },
      { label: 'Disputes & Claims', href: '/seller/marketplace/disputes', icon: AlertCircle },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Wallet', href: '/seller/marketplace/wallet', icon: Wallet },
      // Payout rail and tax-filing labels are filled in per region below —
      // "UPI/NEFT" and "GST Filing" are meaningless to a seller in Doha, and
      // Qatar has no consumption-tax return to file at all.
      { label: 'Payouts', href: '/seller/marketplace/payouts', icon: CreditCard, labelKey: 'payouts' as const },
      { label: 'Transactions', href: '/seller/marketplace/transactions', icon: CreditCard },
      { label: 'Commissions', href: '/seller/marketplace/commissions', icon: Percent },
      { label: 'Tax Filing', href: '/seller/marketplace/gst', icon: FileText, labelKey: 'taxFiling' as const },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { label: 'Campaigns', href: '/seller/marketplace/campaigns', icon: Zap },
      { label: 'Promotions', href: '/seller/marketplace/promotions', icon: Target },
      { label: 'Flash Deals', href: '/seller/marketplace/flash-deals', icon: Zap },
      { label: 'Sponsored Products', href: '/seller/marketplace/sponsored', icon: Target },
      { label: 'Ad Dashboard', href: '/seller/marketplace/advertising', icon: BarChart3 },
      { label: 'Pricing Intelligence', href: '/seller/marketplace/pricing', icon: DollarSign },
      { label: 'Brand Center', href: '/seller/marketplace/brand-center', icon: Award },
      { label: 'A+ Content', href: '/seller/marketplace/a-plus', icon: Layers },
    ],
  },
  {
    title: 'Store',
    items: [
      // Points at the editor that actually persists. `/storefront` is kept as a
      // redirect for existing links — see the note in its page.tsx.
      { label: 'Storefront', href: '/seller/marketplace/brand-center/store', icon: Store },
      { label: 'Reviews & Q&A', href: '/seller/marketplace/reviews', icon: Star },
      { label: 'Customer Messages', href: '/seller/marketplace/messages', icon: MessageSquare },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Reports', href: '/seller/marketplace/reports', icon: BarChart3 },
      { label: 'Growth Insights', href: '/seller/marketplace/insights', icon: TrendingUp },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Notifications', href: '/seller/marketplace/notifications', icon: Bell, badgeKey: 'notifications' as const },
      { label: 'Staff Management', href: '/seller/marketplace/staff', icon: Users },
      { label: 'Warehouses', href: '/seller/marketplace/warehouses', icon: Warehouse },
      { label: 'Settings', href: '/seller/marketplace/settings', icon: Settings },
      { label: 'Seller University', href: '/seller/marketplace/onboarding', icon: GraduationCap },
      { label: 'API & Webhooks', href: '/seller/marketplace/developer', icon: Code },
      { label: 'Help & Support', href: '/seller/marketplace/help', icon: HelpCircle },
    ],
  },
];

// ─── Inner layout with context access ─────────────────────────────────────────

function SellerLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  /** Drawer state, mobile only. Closed whenever the route changes. */
  const [navOpen, setNavOpen] = useState(false);
  const { seller, socket, kpi, pendingToasts, dismissToast } = useSeller();
  const { country: browsingCountry } = useRegion();
  const { logout } = useAuth();

  // The portal follows the seller's *registered* market, not the one they are
  // browsing from. A Qatari seller on a trip must still be asked for a
  // Commercial Registration and paid by Qatari bank transfer.
  const country = seller.regionCode ? getCountry(seller.regionCode) : browsingCountry;

  const sellerRules = getSellerRules(country.code);
  const complianceBadges = getSellerComplianceBadges(country.code);
  const taxIdLabel = getSellerTaxIdLabel(country.code);

  // Tapping a nav link on a phone navigates *and* must dismiss the drawer —
  // otherwise the page you asked for is hidden behind the menu you asked it from.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  // A drawer over the page must not leave the page scrolling underneath it.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    if (navOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [navOpen]);

  const toggle = (title: string) => setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));

  /**
   * Resolve a nav item's label for this market, and drop items the market has
   * no equivalent for — Qatar gets no tax-filing entry rather than an empty
   * "GST Filing" page.
   */
  const resolveNavItem = (item: { label: string; labelKey?: 'payouts' | 'taxFiling' }): string | null => {
    if (item.labelKey === 'payouts') return getPayoutNavLabel(country.code);
    if (item.labelKey === 'taxFiling') return sellerRules.taxFilingLabel;
    return item.label;
  };

  // Badge values from KPI
  const getBadge = (key?: string): number | null => {
    if (!key || !kpi) return null;
    if (key === 'notifications') return socket.unreadCount || null;
    const val = (kpi as unknown as Record<string, number>)[key];
    return val && val > 0 ? val : null;
  };

  const connectionColor = socket.status === 'connected'
    ? 'bg-emerald-500'
    : socket.status === 'connecting'
    ? 'bg-amber-500 animate-pulse'
    : 'bg-red-500';

  const connectionLabel = socket.status === 'connected'
    ? 'Live'
    : socket.status === 'connecting'
    ? 'Connecting...'
    : 'Offline';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile top bar — the only way to reach navigation below `lg`.
          The sidebar used to be `fixed w-60` at every width with no breakpoint,
          so on a 360px phone it took two thirds of the screen, `main` was pushed
          to 534–1200px wide and every page scrolled sideways. Amazon and
          Flipkart both collapse to a drawer here; so does this now. */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-slate-200 z-40 flex items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Open navigation"
          aria-expanded={navOpen}
          aria-controls="seller-nav"
          className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
        <Link href="/seller/marketplace" className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <CountryFlag code={country.code} size="sm" />
          </div>
          <span className="text-sm font-black text-slate-900 truncate">KARTSEEK</span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connectionColor}`} />
          <span className="text-[10px] text-slate-500 font-medium">{connectionLabel}</span>
        </div>
      </header>

      {/* Backdrop for the mobile drawer */}
      {navOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-40"
          onClick={() => setNavOpen(false)}
          aria-hidden
        ><DismissOnEscape onDismiss={() => setNavOpen(false)} /></div>
      )}

      {/* Sidebar
          The nav is taller than any laptop viewport, so it scrolls. It is also
          `fixed`, which means `document.body`'s padding does not move it — the
          cookie-consent banner (`fixed bottom-0`, full width, z-70) sat directly
          on top of the last rows and swallowed their clicks, so Seller
          University, API & Webhooks and Help & Support could not be opened at
          all on a first visit. Reserving the banner's own published height at
          the foot of the scroll area lets those rows scroll clear of it.

          Below `lg` it is an off-canvas drawer: translated out of view until
          opened, so it takes no width from the page. */}
      <aside
        id="seller-nav"
        className={`w-60 bg-white border-r border-slate-200 flex flex-col fixed top-0 left-0 h-screen z-50 overflow-y-auto transition-transform duration-200 lg:z-30 lg:translate-x-0 ${
          navOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        style={{ paddingBottom: 'var(--consent-banner-height, 0px)' }}
      >
        {/* Close, drawer only */}
        <button
          type="button"
          onClick={() => setNavOpen(false)}
          aria-label="Close navigation"
          className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        {/* Logo — named for the market the seller actually trades in */}
        <div className="p-4 border-b border-slate-100">
          <Link href="/seller/marketplace" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center overflow-hidden">
              <CountryFlag code={country.code} size="sm" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900">KARTSEEK</p>
              <p className="text-[10px] text-emerald-600 -mt-0.5 font-bold truncate">
                {country.name} Seller Central
              </p>
            </div>
          </Link>
          {/* Compliance strip — the registrations this market requires */}
          <div className="flex gap-1 mt-2.5 flex-wrap">
            {complianceBadges.map(badge => (
              <span key={badge} className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">{badge}</span>
            ))}
          </div>
          {/* Language — Arabic and English in Qatar, regional languages elsewhere */}
          <div className="mt-3">
            <LocaleSwitcher variant="inline" showFlags={false} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2">
          {NAV_SECTIONS.map(section => (
            <div key={section.title} className="mb-1">
              <button
                onClick={() => toggle(section.title)}
                aria-label={`${collapsed[section.title] ? 'Expand' : 'Collapse'} ${section.title}`}
                className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
              >
                {section.title}
                {collapsed[section.title] ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {!collapsed[section.title] && (
                <div className="space-y-0.5 mt-0.5">
                  {section.items.map(item => {
                    const label = resolveNavItem(item);
                    // Null means this market has no such surface — omit rather
                    // than link to a page that cannot apply here.
                    if (label === null) return null;
                    const isActive = pathname === item.href || (item.href !== '/seller/marketplace' && pathname.startsWith(item.href));
                    const badge = getBadge((item as any).badgeKey);
                    return (
                      <Link key={item.href} href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="flex-1">{label}</span>
                        {badge && (
                          <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

          {/* Store Info Footer — registration label follows the market */}
          <div className="p-3 border-t border-slate-100">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                  {seller.sellerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{seller.sellerName}</p>
                  <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 truncate">
                    <CountryFlag code={country.code} size="xs" />
                    {taxIdLabel
                      ? `${taxIdLabel}: ${seller.taxId || 'Pending'}`
                      : `${country.name} · ${country.currency.code}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${connectionColor}`} />
                  <span className="text-[10px] text-slate-500 font-medium">{connectionLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/seller/marketplace/settings" className="text-[10px] text-emerald-600 font-bold hover:underline">Settings</Link>
                  <span className="text-slate-300">·</span>
                  {/* Was a bare <button> with no handler: it looked like the only
                      way out of the portal and did nothing when pressed. */}
                  <button
                    type="button"
                    onClick={() => { logout(); router.replace('/seller/login'); }}
                    className="text-[10px] text-red-500 font-bold hover:underline"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
      </aside>

      {/* Main Content */}
      {/* `ml-60` unconditionally reserved 240px for a sidebar that is now a
          drawer below `lg`, and `min-w-0` lets a wide child (a table, a tab bar)
          shrink instead of forcing the whole page to scroll sideways — without
          it a flex item's default `min-width: auto` makes it refuse to. `pt-14`
          clears the mobile top bar. */}
      <main id="main-content" className="flex-1 min-w-0 w-full lg:ml-60 p-4 sm:p-6 pt-18 lg:pt-6">
        {children}
      </main>

      {/* New Order Toast Notifications */}
      {pendingToasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-3">
          {pendingToasts.map(toast => (
            <div key={toast.orderId} className="bg-white border border-slate-200 shadow-xl rounded-xl p-4 w-80 animate-in slide-in-from-right flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">🛍️ New Order!</p>
                <p className="text-xs text-slate-500 truncate">{toast.productName}</p>
                {/* Settled in the seller's own market currency, not the one
                    they happen to be browsing from. */}
                <p className="text-xs font-bold text-emerald-600">
                  {formatMoney(toast.amount, { country: country.code })}
                </p>
              </div>
              <button
                onClick={() => dismissToast(toast.orderId)}
                aria-label="Dismiss notification"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Exported Layout (wraps with Provider) ────────────────────────────────────

// `SellerGuard` used to sit between these two. It gated on
// `localStorage.getItem('kartseek_seller_token')` — a key nothing in the app has
// ever written — so it redirected every visitor to /seller/login and all 69
// pages of this portal were unreachable, including for a correctly signed-in
// marketplace seller. It was also redundant: `SellerRoleGuard` already requires
// authentication, the SELLER role *and* a matching `sellerType`, checked against
// the auth context and gated on `isHydrated`. Removed rather than repaired.
export default function SellerMarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SellerRoleGuard allowed="marketplace">
      <SellerProvider>
        <SellerLayoutInner>{children}</SellerLayoutInner>
      </SellerProvider>
    </SellerRoleGuard>
  );
}
