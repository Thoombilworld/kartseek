'use client';

/**
 * KARTSEEK — the profile section a service module gives its customers.
 *
 * One shell, configured per vertical. Each module mounts it at its own route
 * (`/marketplace/profile`, `/pharmacy/profile`, `/doctor/my-profile`, …) with
 * its own palette, brand name, history destination and quick-action menu, so a
 * customer opening the pharmacy profile sees prescriptions and refills where the
 * marketplace profile shows returns and payment methods.
 *
 * Everything on screen is the signed-in customer's own data, loaded from the
 * module's API. Where a request fails, the page says so; it never falls back to
 * sample rows, because an outage that renders as "no orders" reads to a customer
 * as their order history having been lost.
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, TrendingUp, Award, AlertCircle, RefreshCw,
  ArrowLeft, LayoutGrid, Package,
} from 'lucide-react';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { AuthGate } from '@/components/shared/auth-gate';
import {
  getModuleConfig, getAllModuleConfigs,
  type ModuleKey, type ModuleQuickAction,
} from '@/lib/modules/profiles';
import {
  loadModuleProfile, loadLoyalty,
  type ActivityTone, type ModuleProfileSnapshot, type LoyaltySnapshot,
} from '@/lib/modules/profile-data';

// ─── Status colours ─────────────────────────────────────────────────────────────

const TONE_CLASSES: Record<ActivityTone, string> = {
  progress: 'text-blue-700 bg-blue-50 border-blue-200',
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  danger: 'text-red-700 bg-red-50 border-red-200',
  neutral: 'text-slate-600 bg-slate-100 border-slate-200',
};

// ─── Entry point ────────────────────────────────────────────────────────────────

export function ModuleProfile({ module }: { module: ModuleKey }) {
  const config = getModuleConfig(module);
  return (
    <AuthGate
      title={`Sign in to your ${config.label} profile`}
      reason={`Your ${config.recordNoun[1]}, saved items and preferences are only visible once you sign in.`}
    >
      <ModuleProfileContent module={module} />
    </AuthGate>
  );
}

function ModuleProfileContent({ module }: { module: ModuleKey }) {
  const config = getModuleConfig(module);
  const { user } = useAuth();
  const { formatCurrencyValue, formatRelativeDay, currencyCode } = useRegion();
  const router = useRouter();

  // Gated on the user id rather than returning early inside the fetcher, so
  // signing in resolves the section instead of leaving it on its first loading
  // state. `AuthProvider` hydrates in an effect, so `user` is null on first paint
  // even for a signed-in customer.
  const {
    data: snapshot, loading, error, reload,
  } = useAsyncData<ModuleProfileSnapshot>(
    () => loadModuleProfile(module, user!.id),
    [module, user?.id],
    { enabled: !!user?.id },
  );

  // Loyalty is one platform-wide balance and a separate service. It loads on its
  // own so that a loyalty outage costs the customer the points chip, not their
  // order history.
  const { data: loyalty } = useAsyncData<LoyaltySnapshot>(
    () => loadLoyalty(),
    [user?.id],
    { enabled: !!user?.id },
  );

  const counts = snapshot?.counts ?? {};
  const activity = snapshot?.activity ?? [];

  /**
   * Format a row's amount.
   *
   * A hotel booking or a ride carries the currency it was priced in, which need
   * not be the one the customer is browsing in; showing that figure with the
   * region's symbol would misstate the price. Rows with their own currency are
   * formatted in it, and everything else goes through the region registry.
   */
  const formatAmount = useMemo(() => (amount: number | null, currency: string | null) => {
    if (amount === null) return null;
    if (currency && currency !== currencyCode) {
      return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatCurrencyValue(amount);
  }, [formatCurrencyValue, currencyCode]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl 3xl:max-w-7xl mx-auto px-3 xs:px-4 py-5 xs:py-8 space-y-6 xs:space-y-8">

        {/* Back to the module, and across to the other service profiles */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            /* A bare text link measured 20px tall. Padding rather than a bigger
               font keeps the visual weight while giving a thumb something to
               land on. */
            className="inline-flex items-center gap-1.5 -ml-2 px-2 min-h-[44px] text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 -mr-2 px-2 min-h-[44px] text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <LayoutGrid className="w-4 h-4" /> All services
          </Link>
        </div>

        {/* ── Brand banner ─────────────────────────────────────────────────── */}
        <header className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${config.theme.gradient} p-5 sm:p-8 text-white shadow-lg`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20" aria-hidden="true" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-white/30 shrink-0">
                <span aria-hidden="true">{config.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-2 backdrop-blur-sm">
                  {config.brandName}
                </p>
                <h1 className="text-xl sm:text-3xl font-black tracking-tight truncate">
                  {user?.name ? `${user.name}'s ${config.label} profile` : `${config.label} profile`}
                </h1>
                <p className="text-white/80 mt-1 text-sm font-medium truncate">{config.subtitle}</p>
              </div>
            </div>

            {/* One balance, platform-wide — not a per-module invention. */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 sm:min-w-[220px]">
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  KARTSEEK reward points
                </span>
              </div>
              {loyalty ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl sm:text-3xl font-black">{loyalty.points.toLocaleString()}</span>
                    <span className="text-sm text-white/80 mb-1 font-medium">{loyalty.tier}</span>
                  </div>
                  {loyalty.nextTier && (
                    <p className="text-[11px] text-white/70 mt-1">
                      {loyalty.pointsToNextTier.toLocaleString()} more to {loyalty.nextTier}
                    </p>
                  )}
                </>
              ) : (
                <div className="h-8 w-24 rounded bg-white/20 animate-pulse" />
              )}
            </div>
          </div>
        </header>

        {/* ── Failure ──────────────────────────────────────────────────────── */}
        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-900">We could not load your {config.label.toLowerCase()} activity</p>
              {/* The message is shown rather than replaced with a generic line:
                  "Pharmacy service unavailable" and "Session expired" call for
                  different actions from the customer. */}
              <p className="text-sm text-red-700 mt-0.5 break-words">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shrink-0"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        )}

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <section aria-label={`${config.label} summary`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xs:gap-4">
            {loading && !snapshot
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse mb-3" />
                    <div className="h-3 w-16 bg-slate-100 rounded animate-pulse mb-2" />
                    <div className="h-6 w-12 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))
              : (snapshot?.stats ?? []).map((stat) => (
                  <div key={stat.label} className="bg-white rounded-2xl p-4 xs:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 ${stat.color}`}>
                      <span aria-hidden="true">{stat.icon}</span>
                    </div>
                    <p className="text-slate-500 text-[10px] xs:text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-xl xs:text-2xl font-black text-slate-900 tabular-nums">
                      {stat.amount !== undefined ? formatCurrencyValue(stat.amount, { compact: true }) : stat.value}
                    </p>
                  </div>
                ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xs:gap-8">

          {/* ── Recent activity ────────────────────────────────────────────── */}
          <section className="lg:col-span-2 space-y-4" aria-label={config.historyLabel}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className={`w-5 h-5 ${config.theme.accentText}`} aria-hidden="true" />
                {config.historyLabel}
              </h2>
              {activity.length > 0 && (
                <Link
                  href={config.historyHref}
                  className={`inline-flex items-center px-2 -mr-2 min-h-[44px] text-sm font-bold ${config.theme.accentText} hover:underline shrink-0`}
                >
                  View all{snapshot ? ` (${snapshot.totalRecords})` : ''}
                </Link>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {loading && !snapshot ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-5 flex items-center gap-4 border-b border-slate-100 last:border-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))
              ) : activity.length === 0 ? (
                /* Only an empty state once the load actually succeeded — the
                   error branch above owns the failure case, so "nothing here
                   yet" is never shown for a request that never returned. */
                !error && (
                  <div className="p-8 sm:p-12 text-center">
                    <div className={`w-14 h-14 rounded-2xl ${config.theme.iconBg} ${config.theme.accentText} flex items-center justify-center mx-auto mb-4`}>
                      <Package className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-slate-900">{config.emptyState.headline}</h3>
                    <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">{config.emptyState.hint}</p>
                    <Link
                      href={config.emptyState.ctaHref}
                      className={`inline-block mt-5 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm ${config.theme.buttonBg} ${config.theme.buttonHover} transition-colors`}
                    >
                      {config.emptyState.ctaLabel}
                    </Link>
                  </div>
                )
              ) : (
                activity.map((row, idx) => {
                  const amount = formatAmount(row.amount, row.currency);
                  return (
                    <Link
                      key={`${row.reference}-${idx}`}
                      href={row.href}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50 transition-colors ${
                        idx !== activity.length - 1 ? 'border-b border-slate-100' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${config.theme.lightBg} border ${config.theme.accentBorder}`}>
                        <span aria-hidden="true">{row.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-0.5">
                          <h3 className="font-bold text-slate-900 truncate text-base">{row.title}</h3>
                          {amount && <span className="font-bold text-slate-900 shrink-0 tabular-nums">{amount}</span>}
                        </div>
                        <p className="text-sm text-slate-500 truncate mb-2">{row.subtitle}</p>
                        <div className="flex items-center gap-2 xs:gap-3 text-xs font-semibold flex-wrap">
                          {row.dateISO && <span className="text-slate-400">{formatRelativeDay(row.dateISO)}</span>}
                          {row.dateISO && <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />}
                          <span className={`px-2 py-0.5 rounded-md border ${TONE_CLASSES[row.tone]}`}>{row.statusLabel}</span>
                          {row.reference && (
                            <span className="text-slate-400 font-mono text-[11px] truncate">{row.reference}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="hidden sm:block w-4 h-4 text-slate-300 shrink-0" aria-hidden="true" />
                    </Link>
                  );
                })
              )}
            </div>
          </section>

          {/* ── Quick actions ──────────────────────────────────────────────── */}
          <section className="space-y-4" aria-label={`${config.label} shortcuts`}>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className={`w-5 h-5 ${config.theme.accentText}`} aria-hidden="true" />
              Manage
            </h2>

            <nav className="space-y-2.5">
              {config.quickActions.map((action) => (
                <QuickActionLink
                  key={action.href + action.label}
                  action={action}
                  /* A badge appears only when a live counter produced a number.
                     These used to be literals — "8 saved", "2 refills" — that no
                     request produced and no customer had. */
                  count={action.countKey ? counts[action.countKey] : undefined}
                  theme={config.theme}
                />
              ))}
            </nav>

            <div className={`mt-6 p-5 rounded-2xl ${config.theme.lightBg} border ${config.theme.accentBorder}`}>
              <h3 className={`font-bold text-sm mb-2 ${config.theme.accentText}`}>Need help?</h3>
              {/* Brand name alone: "your KARTSEEK Rides rides" and "your KARTSEEK
                  Hotels bookings" both stutter once the noun is appended. */}
              <p className="text-xs text-slate-600 mb-4">
                Get in touch about anything related to {config.brandName}.
              </p>
              <Link
                href="/support"
                className={`block w-full py-2.5 text-center text-white text-sm font-bold rounded-lg shadow-sm ${config.theme.buttonBg} ${config.theme.buttonHover} transition-colors`}
              >
                Contact support
              </Link>
            </div>
          </section>
        </div>

        {/* ── Other service profiles ───────────────────────────────────────── */}
        <section aria-label="Other KARTSEEK services" className="pt-2">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Your other services</h2>
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 snap-x">
            {getAllModuleConfigs()
              .filter((m) => m.key !== module)
              .map((m) => (
                <Link
                  key={m.key}
                  href={m.profileHref}
                  className="snap-start shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <span aria-hidden="true">{m.icon}</span> {m.label}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function QuickActionLink({
  action, count, theme,
}: {
  action: ModuleQuickAction;
  count: number | undefined;
  theme: ReturnType<typeof getModuleConfig>['theme'];
}) {
  return (
    <Link
      href={action.href}
      className="group flex items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200"
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${theme.iconBg} ${theme.accentText} group-hover:scale-110 transition-transform`}>
          <span aria-hidden="true">{action.icon}</span>
        </span>
        <span className="font-bold text-slate-700 group-hover:text-slate-900 truncate">{action.label}</span>
      </span>
      <span className="flex items-center gap-2.5 shrink-0">
        {count !== undefined && count > 0 && (
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold text-white ${action.badgeColor || theme.buttonBg}`}>
            {count}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" aria-hidden="true" />
      </span>
    </Link>
  );
}
