'use client';

/**
 * KARTSEEK — the order/booking history screen a module gives its customers.
 *
 * Five modules each had their own version of this screen and all five rendered a
 * hardcoded array: `restaurant/orders` listed five invented restaurants,
 * `pharmacy/orders` six invented pharmacies at `₹` prices, `taxi/rides` six
 * rides between Nairobi and Mumbai addresses, `hotel-booking/my-bookings` four
 * stays across three currencies, and `doctor/my-appointments` four appointments
 * for a patient named John Doe. None of them made a request.
 *
 * This is the one implementation they now share. A module supplies its palette,
 * its vocabulary, its filters and a loader that returns normalised rows; the
 * loading, failure, empty and search behaviour is the same everywhere, which is
 * the point — a customer moving between two KARTSEEK services should not have to
 * learn two screens.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Package, AlertCircle, RefreshCw, ChevronRight, Star, MapPin,
} from 'lucide-react';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { AuthGate } from '@/components/shared/auth-gate';
import { readStatus, isOpen, type ActivityTone } from '@/lib/modules/profile-data';
import { getModuleConfig, type ModuleKey } from '@/lib/modules/profiles';

// ─── Row shape ──────────────────────────────────────────────────────────────────

export interface HistoryRow {
  /** Identifier used in this row's detail URL. */
  id: string;
  /** What the customer sees as the reference — an order number where one exists. */
  reference: string;
  title: string;
  subtitle: string;
  /** Small supporting facts: item counts, distances, night counts. */
  meta: string[];
  dateISO: string | null;
  /**
   * Set when `dateISO` carries a date but no meaningful time — an appointment
   * booked for the 25th at a slot of "09:30" stores `2026-09-25` and keeps the
   * slot separately. Rendered as a timestamp it became "25 Sept 2026, 03:00 am",
   * midnight UTC shifted into the reader's zone, sitting next to the real slot.
   */
  dateOnly?: boolean;
  /** Raw backend status; classified for display by `readStatus`. */
  status: string;
  amount: number | null;
  /** The record's own currency, when it has one. Null means use the region's. */
  currency: string | null;
  icon: string;
  /** Groups the row for the type filter — 'delivery', 'video', 'DINE_IN', … */
  kind?: string;
  /**
   * Where this row opens. Omit when the module has no detail view for it — the
   * row then renders as plain content rather than as a link to a 404.
   */
  detailHref?: string;
  /** Offered only while the record is still in progress. */
  trackHref?: string;
  rating?: number | null;
  /** Free-text the search box should also match, e.g. item names. */
  searchText?: string;
}

export interface HistoryFilter {
  key: string;
  label: string;
  /** Omitted on the "all" tab. */
  match?: (row: HistoryRow) => boolean;
}

const TONE_CLASSES: Record<ActivityTone, string> = {
  progress: 'text-blue-700 bg-blue-50 border-blue-200',
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  danger: 'text-red-700 bg-red-50 border-red-200',
  neutral: 'text-slate-600 bg-slate-100 border-slate-200',
};

// ─── Component ──────────────────────────────────────────────────────────────────

export function OrderHistory({
  module, heading, backHref, searchPlaceholder, filters = [], load, deps = [],
}: {
  module: ModuleKey;
  heading: string;
  backHref: string;
  searchPlaceholder: string;
  filters?: HistoryFilter[];
  /** Returns the customer's rows, newest first. Receives the signed-in user id. */
  load: (userId: string) => Promise<HistoryRow[]>;
  /** Extra values that should re-run the load. */
  deps?: readonly unknown[];
}) {
  const config = getModuleConfig(module);
  return (
    <AuthGate
      title={`Sign in to see your ${config.recordNoun[1]}`}
      reason={`Your ${config.recordNoun[1]} are only visible once you sign in.`}
    >
      <OrderHistoryContent
        module={module}
        heading={heading}
        backHref={backHref}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        load={load}
        deps={deps}
      />
    </AuthGate>
  );
}

function OrderHistoryContent({
  module, heading, backHref, searchPlaceholder, filters, load, deps,
}: {
  module: ModuleKey;
  heading: string;
  backHref: string;
  searchPlaceholder: string;
  filters: HistoryFilter[];
  load: (userId: string) => Promise<HistoryRow[]>;
  deps: readonly unknown[];
}) {
  const config = getModuleConfig(module);
  const { user } = useAuth();
  const { formatCurrencyValue, formatDateValue, formatDateTimeValue, currencyCode } = useRegion();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data, loading, error, reload } = useAsyncData<HistoryRow[]>(
    () => load(user!.id),
    [user?.id, ...deps],
    { enabled: !!user?.id },
  );

  // No demo substitute on failure. A screen that shows invented rows when the
  // request fails is how an outage becomes invisible to everyone who could fix
  // it, and how a customer concludes their real history has been lost.
  //
  // Memoised rather than written as `data ?? []`, whose empty-array branch is a
  // fresh reference on every render and so re-runs both memos below each time.
  const rows = useMemo(() => data ?? [], [data]);

  const tabs: HistoryFilter[] = useMemo(
    () => [{ key: 'all', label: 'All' }, ...filters],
    [filters],
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: rows.length };
    for (const f of filters) out[f.key] = f.match ? rows.filter(f.match).length : rows.length;
    return out;
  }, [rows, filters]);

  const visible = useMemo(() => {
    const active = tabs.find((t) => t.key === filter);
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (active?.match && !active.match(row)) return false;
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q)
        || row.reference.toLowerCase().includes(q)
        || row.subtitle.toLowerCase().includes(q)
        || (row.searchText ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search, tabs]);

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (amount === null) return null;
    // A record priced in another currency keeps it; showing that number under the
    // region's symbol would misstate what the customer paid.
    if (currency && currency !== currencyCode) {
      return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatCurrencyValue(amount);
  };

  const filtering = search.trim() !== '' || filter !== 'all';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 xs:px-4 py-3.5 flex items-center gap-3 xs:gap-4">
          <Link href={backHref} className="w-11 h-11 -ml-2 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg xs:text-xl font-black text-slate-900 truncate">{heading}</h1>
            <p className="text-sm text-slate-500">
              {loading && !data ? 'Loading…'
                : error ? 'Could not load'
                : `${rows.length} ${rows.length === 1 ? config.recordNoun[0] : config.recordNoun[1]}`}
            </p>
          </div>
          <Link
            href={config.profileHref}
            className={`hidden sm:inline-flex items-center px-2 -mr-2 min-h-[44px] text-sm font-bold ${config.theme.accentText} hover:underline shrink-0`}
          >
            Profile
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 xs:px-4 py-5 xs:py-6 space-y-5">

        {/* Failure — distinct from "you have none" */}
        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-900">We could not load your {config.recordNoun[1]}</p>
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

        {/* Search + filters — hidden until there is something to filter */}
        {(rows.length > 0 || filtering) && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                /* 16px on handsets: iOS Safari zooms into any focused control
                   under 16px and never zooms back out, leaving the customer on a
                   magnified, horizontally-scrolling page. `sm:text-sm` keeps the
                   denser size from the tablet breakpoint up, where no zoom
                   happens. */
                className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-white border border-slate-200 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none"
              />
            </div>
            {tabs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar" role="tablist" aria-label="Filter">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === t.key}
                    onClick={() => setFilter(t.key)}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      filter === t.key
                        ? `${config.theme.buttonBg} text-white shadow-sm`
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                    {counts[t.key] !== undefined && (
                      <span className={filter === t.key ? 'ml-1.5 text-white/80' : 'ml-1.5 text-slate-400'}>
                        {counts[t.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rows */}
        {loading && !data ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          /* The failure branch above owns the error case, so this only ever
             means the customer genuinely has nothing matching. */
          !error && (
            <div className="text-center py-14 xs:py-16">
              <div className={`w-20 h-20 ${config.theme.iconBg} rounded-full flex items-center justify-center mx-auto mb-5`}>
                <Package className={`w-9 h-9 ${config.theme.accentText}`} aria-hidden="true" />
              </div>
              <h2 className="font-bold text-slate-900 text-lg xs:text-xl mb-2">
                {filtering ? 'Nothing matches that' : config.emptyState.headline}
              </h2>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                {filtering ? 'Try a different filter or search term.' : config.emptyState.hint}
              </p>
              {filtering ? (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setFilter('all'); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  href={config.emptyState.ctaHref}
                  className={`inline-flex items-center gap-2 px-6 py-3 ${config.theme.buttonBg} ${config.theme.buttonHover} text-white rounded-xl font-bold transition-colors`}
                >
                  {config.emptyState.ctaLabel}
                </Link>
              )}
            </div>
          )
        ) : (
          <ul className="space-y-4">
            {visible.map((row) => {
              const status = readStatus(row.status);
              const amount = formatAmount(row.amount, row.currency);
              const open = isOpen(row.status);
              return (
                <li key={row.id || row.reference}>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 xs:p-5 hover:shadow-lg hover:border-slate-300 transition-all group">
                    <RowBody href={row.detailHref}>
                      <span className="text-3xl xs:text-4xl shrink-0" aria-hidden="true">{row.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className={`font-bold text-slate-900 truncate group-hover:${config.theme.accentText.replace('text-', 'text-')} transition-colors`}>
                              {row.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{row.subtitle}</p>
                          </div>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${TONE_CLASSES[status.tone]}`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-x-3 gap-y-1 mt-2.5 flex-wrap text-xs text-slate-500">
                          {row.dateISO && (
                            <span>
                              {row.dateOnly ? formatDateValue(row.dateISO) : formatDateTimeValue(row.dateISO)}
                            </span>
                          )}
                          {row.meta.map((m) => (
                            <span key={m} className="flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />{m}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {amount && <span className="font-black text-slate-900 tabular-nums">{amount}</span>}
                            {row.reference && (
                              <span className="text-[11px] text-slate-400 font-mono truncate">{row.reference}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {typeof row.rating === 'number' && (
                              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" /> {row.rating}
                              </span>
                            )}
                            {row.detailHref && (
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" aria-hidden="true" />
                            )}
                          </div>
                        </div>
                      </div>
                    </RowBody>

                    {/* Tracking is offered only while there is something to track. */}
                    {open && row.trackHref && (
                      <Link
                        href={row.trackHref}
                        className={`mt-3.5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold text-white ${config.theme.buttonBg} ${config.theme.buttonHover} transition-colors`}
                      >
                        <MapPin className="w-4 h-4" aria-hidden="true" /> Track {config.recordNoun[0]}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * The clickable part of a row — a link where the module has a detail view for
 * it, otherwise the same markup without one. Appointments have no detail route,
 * and linking them anyway would have sent every patient to a 404.
 */
function RowBody({ href, children }: { href?: string; children: React.ReactNode }) {
  const className = 'flex items-start gap-3 xs:gap-4';
  if (!href) return <div className={className}>{children}</div>;
  return <Link href={href} className={className}>{children}</Link>;
}
