'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Store,
  ShoppingCart,
  MapPin,
  DollarSign,
  Settings,
  ShieldAlert,
  BarChart3,
  Menu,
  Users2,
  FileCheck,
  Truck,
  Activity,
  ScrollText,
  Pill,
  UtensilsCrossed,
  ChevronDown,
  X,
  Bell,
  Search,
  Stethoscope,
  Car,
  Shield,
  Radio,
  Package,
  Megaphone,
  HeadphonesIcon,
  UserCog,
  Landmark,
  RefreshCcw,
  Globe,
  ChevronRight,
  Hotel,
  LogOut,
  Wallet,
  Gift,
  Key,
  LayoutTemplate,
  Lock,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  Star,
  Heart,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAudit } from '@/lib/contexts/audit-context';
import { isStaffRole } from '@/auth/staff-roles';
import { CountryFlag } from '@/components/shared/country-flag';
import { adminCoreApi, type SecurityStatus } from '@/lib/api/admin-core';
import { adminMarketplaceApi, type AdminNotificationPage } from '@/lib/api/admin-marketplace';
import { classifyApiFailure } from '@/components/admin/api-states';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  /**
   * Permission key required — the item is hidden unless the signed-in account
   * holds it. Mandatory, not optional: while it was optional three items had
   * none, and an item with no key is shown to everyone who can open the
   * console at all — including the support agent and the finance manager, who
   * would then click through to a page the gateway answers 403 for. A new
   * entry now has to say who it is for.
   */
  perm: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      {
        href: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
        exact: true,
        perm: 'dashboard.view',
      },
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
      {
        href: '/admin/kyc-verification',
        label: 'KYC Verification',
        icon: FileCheck,
        perm: 'kyc.view',
      },
    ],
  },
  {
    label: 'Modules',
    items: [
      {
        href: '/admin/marketplace',
        label: 'Marketplace',
        icon: ShoppingCart,
        perm: 'modules.marketplace',
      },
      { href: '/admin/grocery', label: 'Grocery', icon: Store, perm: 'modules.grocery' },
      {
        href: '/admin/restaurant',
        label: 'Restaurants',
        icon: UtensilsCrossed,
        perm: 'modules.restaurant',
      },
      { href: '/admin/pharmacy', label: 'Pharmacy', icon: Pill, perm: 'modules.pharmacy' },
      { href: '/admin/hotel-booking', label: 'Hotel Booking', icon: Hotel, perm: 'modules.hotel' },
      {
        href: '/admin/doctor',
        label: 'Doctor / Hospital',
        icon: Stethoscope,
        perm: 'modules.doctor',
      },
      { href: '/admin/taxi', label: 'Taxi & Rides', icon: Car, perm: 'modules.taxi' },
      { href: '/admin/taxi/ratings', label: 'Driver Ratings', icon: Star, perm: 'modules.taxi' },
      { href: '/admin/delivery', label: 'Delivery Ops', icon: Truck, perm: 'delivery.view' },
      {
        href: '/admin/delivery/partners',
        label: 'Delivery Partners',
        icon: Users2,
        perm: 'delivery.manage',
      },
      {
        href: '/admin/marketplace/pincode-insights',
        label: 'Pincode Insights',
        icon: MapPin,
        perm: 'delivery.view',
      },
      // The hotel module's own "Loyalty Program" link lived here beside the
      // identical entry under Finance, so the sidebar offered the same label
      // twice and the two went to different pages. Finance keeps it.
    ],
  },
  {
    label: 'Operations',
    items: [
      // `/admin/order-disputes` was here and there is no such route: the item
      // was a permanent 404 for anyone holding `orders.manage`. Disputes are
      // handled from the order pages themselves.
      {
        href: '/admin/page-builder',
        label: 'Page Builder (CMS)',
        icon: LayoutTemplate,
        perm: 'content.manage',
      },
      {
        href: '/admin/seller-content',
        label: 'Seller Content',
        icon: ClipboardCheck,
        perm: 'content.view',
      },
      {
        href: '/admin/content',
        label: 'Content & Promos',
        icon: Megaphone,
        perm: 'content.manage',
      },
      {
        href: '/admin/static-pages',
        label: 'Static Pages (CMS)',
        icon: FileText,
        perm: 'content.manage',
      },
      {
        href: '/admin/brand-followers',
        label: 'Brand Followers',
        icon: Heart,
        perm: 'content.manage',
      },
      {
        href: '/admin/support',
        label: 'Support Tickets',
        icon: HeadphonesIcon,
        perm: 'support.view',
      },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell, perm: 'dashboard.view' },
      { href: '/admin/sos', label: 'SOS Emergency', icon: AlertTriangle, perm: 'support.view' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/admin/payouts', label: 'Payouts', icon: DollarSign, perm: 'finance.payouts' },
      { href: '/admin/commissions', label: 'Commissions', icon: Landmark, perm: 'finance.view' },
      {
        href: '/admin/marketplace/seller-wallets',
        label: 'Seller Wallets',
        icon: Wallet,
        perm: 'wallet.audit',
      },
      { href: '/admin/wallet-audit', label: 'Wallet Audit', icon: Wallet, perm: 'wallet.audit' },
      { href: '/admin/refunds', label: 'Refunds', icon: RefreshCcw, perm: 'orders.refund' },
      { href: '/admin/loyalty', label: 'Loyalty Program', icon: Gift, perm: 'loyalty.view' },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, perm: 'finance.view' },
    ],
  },
  {
    label: 'System',
    items: [
      {
        href: '/admin/system-health',
        label: 'System Health',
        icon: Activity,
        perm: 'system.health',
      },
      {
        // The key the route itself enforces (`DdosAdminController` →
        // `perm:security.manage`). It was `system.settings`, so granting the
        // permission hid the page and granting the nav key showed a link that
        // answered 403. The neighbours below keep `system.settings` — they are
        // different backends, not the DDoS console.
        href: '/admin/security',
        label: 'Security & DDoS',
        icon: ShieldAlert,
        perm: 'security.manage',
      },
      { href: '/admin/gdpr', label: 'GDPR & Privacy', icon: Shield, perm: 'system.settings' },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, perm: 'audit.logs' },
      { href: '/admin/two-factor', label: 'Two-Factor Auth', icon: Key, perm: 'system.settings' },
      { href: '/admin/seo', label: 'SEO Overrides', icon: Globe, perm: 'content.manage' },
      {
        href: '/admin/settings/module-titles',
        label: 'Module Titles',
        icon: Globe,
        perm: 'system.settings',
      },
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
    ...Object.values(REGIONS).map((r) => ({ code: r.code, label: r.name })),
  ];

  const current = regionOptions.find((r) => r.code === selectedRegion) || regionOptions[0];

  // Region-locked users see a static badge instead of a dropdown
  if (isLocked) {
    return (
      <div
        className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-sm cursor-default"
        title="Your region is locked by your admin role"
      >
        <Globe className="w-4 h-4 text-amber-600" />
        {current.code === 'ALL' ? (
          <span className="text-lg">🌍</span>
        ) : (
          <CountryFlag code={current.code} size="lg" />
        )}
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
        {current.code === 'ALL' ? (
          <span className="text-lg">🌍</span>
        ) : (
          <CountryFlag code={current.code} size="lg" />
        )}
        <span className="font-semibold text-slate-700 hidden sm:inline">{current.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
            <DismissOnEscape onDismiss={() => setOpen(false)} />
          </div>
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 animate-in fade-in duration-150">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Select Region
            </div>
            {regionOptions.map((r) => (
              <button
                key={r.code}
                onClick={() => {
                  setSelectedRegion(r.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                  selectedRegion === r.code
                    ? 'bg-emerald-50 text-emerald-700 font-bold'
                    : 'text-slate-700'
                }`}
                id={`region-option-${r.code}`}
              >
                {r.code === 'ALL' ? (
                  <span className="text-lg">🌍</span>
                ) : (
                  <CountryFlag code={r.code} size="lg" />
                )}
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

/**
 * What a header dropdown holds after asking the gateway.
 *
 * Three states, never two: the header is the one place an outage is easiest to
 * mistake for calm, because "no notifications" and "nobody answered" both look
 * like an empty list with no red dot.
 */
export type MenuState<T> =
  | { phase: 'loading' }
  | { phase: 'ready'; value: T }
  | { phase: 'forbidden'; message: string }
  | { phase: 'unreachable'; message: string };

/**
 * Ask once per mount and classify the answer.
 *
 * `apiCall` resolves `{ success: false, error }` rather than throwing, so there
 * is nothing to catch — the failure arrives as a value and is classified the
 * same way every admin page classifies one.
 */
function useMenuData<T>(load: () => Promise<{ success: boolean; data: T; error?: string }>) {
  const [state, setState] = useState<MenuState<T>>({ phase: 'loading' });
  const loadRef = React.useRef(load);
  loadRef.current = load;

  React.useEffect(() => {
    let cancelled = false;
    void loadRef.current().then((res) => {
      if (cancelled) return;
      if (res.success) {
        setState({ phase: 'ready', value: res.data });
        return;
      }
      const message = res.error || 'The gateway did not answer';
      setState({
        phase: classifyApiFailure(message) === 'forbidden' ? 'forbidden' : 'unreachable',
        message,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function MenuShell({
  open,
  onClose,
  title,
  badge,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  badge?: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h4 className="font-bold text-sm text-slate-900">{title}</h4>
          {badge}
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">{children}</div>
        {footer}
      </div>
    </>
  );
}

/** "Nobody answered", in the space a dropdown has. Names the call, like the pages do. */
function MenuNotConnected({ route, message }: { route: string; message: string }) {
  return (
    <div className="px-4 py-5">
      <p className="text-sm font-bold text-slate-900">Not connected.</p>
      <p className="text-xs text-slate-500 mt-1">
        <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">{route}</code> did
        not answer, so nothing is listed rather than something invented.
      </p>
      <p className="text-[11px] text-red-600 mt-2 font-medium">{message}</p>
    </div>
  );
}

/**
 * The platform notification feed.
 *
 * This used to be four literal objects — "FreshMart Store applied for
 * marketplace access", "Order #KS-28491 flagged" — under a hard-coded "4 new"
 * badge, on every page of the console, for every administrator, forever.
 *
 * A market-locked admin gets 403 here by design: the rows carry no market, so
 * the list is the whole platform's and cannot be shown as theirs. That is a
 * quiet line, not an error — it is the expected answer for their role.
 */
export function NotificationsMenu({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const state = useMenuData<AdminNotificationPage>(
    React.useCallback(() => adminMarketplaceApi.getNotifications(), []),
  );
  return <NotificationsMenuView open={open} onToggle={onToggle} onClose={onClose} state={state} />;
}

/**
 * The dropdown itself, with the answer already in hand.
 *
 * Split from the fetch so each of the four states can be rendered and asserted
 * without an effect: `renderToStaticMarkup` never runs one, so a component that
 * both fetched and drew would only ever be testable in its loading state — and
 * the loading state is the one that was never wrong.
 */
export function NotificationsMenuView({
  open,
  onToggle,
  onClose,
  state,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  state: MenuState<AdminNotificationPage>;
}) {
  const rows = state.phase === 'ready' ? (state.value?.data ?? []) : [];
  // The server's count, not `rows.filter(...)`: the route returns the newest 50
  // and an unread row older than that still belongs in the badge. Falls back to
  // counting the page only if an older gateway omits the field.
  const unread =
    state.phase === 'ready' && typeof state.value?.unreadCount === 'number'
      ? state.value.unreadCount
      : rows.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      <button
        title="Notifications"
        onClick={onToggle}
        className={`text-slate-400 hover:text-slate-600 relative p-1.5 rounded-lg transition-colors ${open ? 'bg-slate-100 text-slate-600' : ''}`}
      >
        <Bell className="w-5 h-5" />
        {/* Only when something is actually unread. The dot used to be painted
            on unconditionally, so it never meant anything. */}
        {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
      </button>
      <MenuShell
        open={open}
        onClose={onClose}
        title="Notifications"
        badge={
          state.phase === 'ready' && unread > 0 ? (
            <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
              {unread} unread
            </span>
          ) : null
        }
        footer={
          <Link
            href="/admin/notifications"
            onClick={onClose}
            className="block text-center text-xs text-blue-600 font-bold py-2.5 border-t border-slate-100 hover:bg-blue-50 transition-colors"
          >
            Open notifications
          </Link>
        }
      >
        {state.phase === 'loading' && (
          <p className="px-4 py-5 text-xs text-slate-400">Asking the platform…</p>
        )}
        {state.phase === 'forbidden' && (
          <p className="px-4 py-5 text-xs text-slate-500">
            Platform notifications are not available for regional admins — these rows belong to
            every market.
          </p>
        )}
        {state.phase === 'unreachable' && (
          <MenuNotConnected route="GET /admin/marketplace/notifications" message={state.message} />
        )}
        {state.phase === 'ready' && rows.length === 0 && (
          <p className="px-4 py-5 text-xs text-slate-400">Nothing to report.</p>
        )}
        {state.phase === 'ready' &&
          rows.slice(0, 8).map((n) => (
            <div key={n.id} className="flex gap-3 px-4 py-3">
              {/* Unread, not "priority": `MarketplaceNotification` has no
                  priority column — only the deleted fabricated rows did, so
                  every genuine row fell to the grey default and the dot said
                  nothing. `isRead` is a real column, and unread is what a
                  reader is actually looking for. */}
              <span
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  n.isRead ? 'bg-slate-300' : 'bg-blue-500'
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {n.title ?? n.type ?? 'Notification'}
                </p>
                {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                {n.createdAt && (
                  <p className="text-[10px] text-slate-400 mt-1" suppressHydrationWarning>
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
      </MenuShell>
    </div>
  );
}

/**
 * The threat board, in one dropdown.
 *
 * Replaces three invented alerts ("Admin login attempt from unrecognized device
 * in Lagos, Nigeria") and a "2 active" badge with the counters
 * `GET /admin/security/status` actually keeps. Refused unless the account holds
 * `security.manage`, which is why the refusal names the permission.
 */
export function SecurityMenu({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const state = useMenuData<SecurityStatus>(
    React.useCallback(() => adminCoreApi.getSecurityStatus(), []),
  );
  return <SecurityMenuView open={open} onToggle={onToggle} onClose={onClose} state={state} />;
}

/** The dropdown with the answer in hand — see `NotificationsMenuView`. */
export function SecurityMenuView({
  open,
  onToggle,
  onClose,
  state,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  state: MenuState<SecurityStatus>;
}) {
  const status = state.phase === 'ready' ? state.value : null;
  const raised =
    !!status && (status.level !== 'normal' || status.isHttpAttackMode || status.isWsAttackMode);

  return (
    <div className="relative">
      <button
        title="Security alerts"
        onClick={onToggle}
        className={`text-slate-400 hover:text-slate-600 relative p-1.5 rounded-lg transition-colors ${open ? 'bg-slate-100 text-slate-600' : ''}`}
      >
        <ShieldAlert className="w-5 h-5" />
        {raised && <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />}
      </button>
      <MenuShell
        open={open}
        onClose={onClose}
        title="Security"
        badge={
          status ? (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                status.level === 'critical'
                  ? 'bg-red-100 text-red-600'
                  : status.level === 'elevated'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {status.level}
            </span>
          ) : null
        }
        footer={
          <Link
            href="/admin/security"
            onClick={onClose}
            className="block text-center text-xs text-blue-600 font-bold py-2.5 border-t border-slate-100 hover:bg-blue-50 transition-colors"
          >
            Security dashboard
          </Link>
        }
      >
        {state.phase === 'loading' && (
          <p className="px-4 py-5 text-xs text-slate-400">Asking the gateway…</p>
        )}
        {state.phase === 'forbidden' && (
          <p className="px-4 py-5 text-xs text-slate-500">
            Your role does not hold <span className="font-mono">security.manage</span>, so the
            threat board is closed to it.
          </p>
        )}
        {state.phase === 'unreachable' && (
          <MenuNotConnected route="GET /admin/security/status" message={state.message} />
        )}
        {status && (
          <div className="px-4 py-3 space-y-2">
            {(status.isHttpAttackMode || status.isWsAttackMode) && (
              <p className="text-xs font-bold text-red-600">
                Attack mode is on for{' '}
                {status.isHttpAttackMode && status.isWsAttackMode
                  ? 'HTTP and WebSocket traffic'
                  : status.isHttpAttackMode
                    ? 'HTTP traffic'
                    : 'WebSocket traffic'}
                .
              </p>
            )}
            {[
              ['Bans in force', status.activeBans],
              ['HTTP bans today', status.httpBansToday],
              ['WebSocket bans today', status.wsBansToday],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{label}</span>
                <span className="font-bold text-slate-900">{value}</span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 pt-1" suppressHydrationWarning>
              Measured {new Date(status.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </MenuShell>
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
  const { user, isAuthenticated, hasPermission, logout, isHydrated } = useAuth();
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
      // Machine key, lower-case: `auditPostPayload` sends `<module>.<action>`
      // and the gateway prefixes `console.`, so this used to be filed as
      // `console.Auth.Admin signed in` — a key nothing can filter on, sort by or
      // match a prefix against, with a space and capitals in the middle of it.
      // The human sentence belongs in the details, which is where it now is.
      logAction(
        'signed_in',
        'auth',
        `${user.name} (${user.adminRoleName || 'Admin'}) signed in as ${user.email}`,
      );
    }
  }, [isAuthenticated, user, logAction]);

  // Don't apply guard to the admin login page itself
  const isAdminLogin = pathname === '/admin/login';

  // Auth guard: if hydrated and not admin, show access denied
  if (!isAdminLogin && isHydrated && (!isAuthenticated || !isStaffRole(user?.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">
            You need administrator privileges to access this area. Please sign in with an admin
            account.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/admin/login"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm text-center transition-colors"
            >
              Sign In as Admin
            </Link>
            <Link
              href="/"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm text-center transition-colors"
            >
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
    try {
      logAction('signed_out', 'auth', `${user?.name} (${user?.email}) signed out`);
    } catch {}
    logout();
    router.push('/admin/login');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const regionLabelText = selectedRegion === 'ALL' ? 'All Regions' : REGIONS[selectedRegion]?.name;
  const regionLabelNode =
    selectedRegion === 'ALL' ? (
      <>
        <span>🌍</span> All Regions
      </>
    ) : (
      <>
        <CountryFlag code={selectedRegion} size="sm" className="mr-1" />{' '}
        {REGIONS[selectedRegion]?.name}
      </>
    );

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
          <span className="text-xs font-bold text-slate-300 flex-1 flex items-center gap-1">
            {regionLabelNode}
          </span>
          {isRegionLocked && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              LOCKED
            </span>
          )}
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navSections.map((section) => {
          // Filter items by permission. Every item declares one, so there is no
          // "shown to everybody" branch to fall through to.
          const visibleItems = section.items.filter((item) => hasPermission(item.perm));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 mt-5 px-3 first:mt-2">
                {section.label}
              </div>
              {visibleItems.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                    }`}
                  >
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
            {user?.name
              ? user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'SA'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name || 'Super Admin'}</p>
            <p className="text-[10px] text-slate-500">
              {user?.adminRoleName}
              {isRegionLocked && user?.regionCode
                ? ` — ${(REGIONS as Record<string, { name: string }>)[user.regionCode]?.name || user.regionCode}`
                : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)}>
            <DismissOnEscape onDismiss={() => setMobileOpen(false)} />
          </div>
          <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col h-full relative z-10 shadow-2xl">
            <button
              title="Close sidebar"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
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
            <button
              title="Open menu"
              className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-72">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                placeholder="Search anything..."
                className="bg-transparent text-sm outline-none flex-1 text-slate-600"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Region Switcher */}
            <RegionSwitcher />

            {/* Notifications */}
            <NotificationsMenu
              open={showNotifications}
              onToggle={() => {
                setShowNotifications(!showNotifications);
                setShowSecurity(false);
                setShowProfile(false);
              }}
              onClose={() => setShowNotifications(false)}
            />

            {/* Language — options follow the region selected above, so an admin
                working the Qatari market sees Arabic and English only. */}
            <div className="hidden md:block">
              <LocaleSwitcher showCountryTab={false} />
            </div>

            {/* Security alerts — same gate as the sidebar's "Security & DDoS"
                item, and the same gate the route itself enforces. Without it a
                support agent got a bell that fetched, 403'd, and offered a link
                to a page they cannot open: the shape of the dead nav item
                deleted from `navSections`. */}
            {hasPermission('security.manage') && (
              <SecurityMenu
                open={showSecurity}
                onToggle={() => {
                  setShowSecurity(!showSecurity);
                  setShowNotifications(false);
                  setShowProfile(false);
                }}
                onClose={() => setShowSecurity(false)}
              />
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowProfile(!showProfile);
                  setShowNotifications(false);
                  setShowSecurity(false);
                }}
                className={`w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer ${showProfile ? 'ring-2 ring-blue-400' : ''}`}
              >
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'SA'}
              </button>
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)}>
                    <DismissOnEscape onDismiss={() => setShowProfile(false)} />
                  </div>
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <p className="font-bold text-sm text-slate-900">{user?.name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                        {user?.role}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">● Online</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/admin/settings"
                        onClick={() => setShowProfile(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" /> Account Settings
                      </Link>
                      <Link
                        href="/admin/roles"
                        onClick={() => setShowProfile(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Shield className="w-4 h-4 text-slate-400" /> Roles & Permissions
                      </Link>
                      <Link
                        href="/admin/audit-logs"
                        onClick={() => setShowProfile(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ScrollText className="w-4 h-4 text-slate-400" /> Audit Logs
                      </Link>
                    </div>
                    <div className="border-t border-slate-100">
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          logout();
                          router.push('/admin/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 p-3 xs:p-4 md:p-6 3xl:p-8 overflow-auto safe-bottom"
        >
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
