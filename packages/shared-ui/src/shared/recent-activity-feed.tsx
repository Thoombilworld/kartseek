'use client';

/**
 * The customer's most recent activity across every KARTSEEK service.
 *
 * The home screen's "Recent Orders" strip was a three-item `RECENT_ORDERS`
 * constant — a biryani, a box of paracetamol and some vegetables, with order
 * numbers ORD-9281, ORD-9180 and ORD-9045 — rendered identically for every
 * visitor, signed in or not, and linking to `/orders/<id>` for ids that never
 * existed.
 *
 * It was framed as a cross-vertical feed, and no single gateway endpoint
 * aggregates orders across modules. This asks each module for the customer's own
 * recent records and merges them by date, which is the aggregation the strip
 * always implied. Modules resolve independently, so a service being down costs
 * its own rows rather than the whole strip.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ZoneLink } from '../zone-link';
import { ArrowRight, AlertCircle } from 'lucide-react';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { ALL_MODULES, getModuleConfig, type ModuleKey } from '@/lib/modules/profiles';
import { loadModuleProfile, type ProfileActivity } from '@/lib/modules/profile-data';

type Row = ProfileActivity & { module: ModuleKey };

const TONE_TEXT: Record<ProfileActivity['tone'], string> = {
  progress: 'text-blue-600',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  neutral: 'text-slate-500',
};

export function RecentActivityFeed({ limit = 4 }: { limit?: number }) {
  const { user, isAuthenticated } = useAuth();
  const { formatRelativeDay } = useRegion();

  /**
   * One record per signed-in customer, stamped with whose it is.
   *
   * Held as a single object rather than three pieces of state so the effect
   * never has to reset anything synchronously in its body — doing that forces a
   * cascading render, which is what `react-hooks/set-state-in-effect` flags.
   * A result arriving for a previous `userId` is discarded by the stamp instead.
   */
  const [feed, setFeed] = useState<{
    forUser: string; rows: Row[]; pending: number; failures: number;
  } | null>(null);

  const userId = user?.id;
  const current = feed?.forUser === userId ? feed : null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const startOrKeep = (prev: typeof feed) =>
      prev?.forUser === userId
        ? prev
        : { forUser: userId, rows: [] as Row[], pending: ALL_MODULES.length, failures: 0 };

    for (const moduleKey of ALL_MODULES) {
      loadModuleProfile(moduleKey, userId)
        .then((snapshot) => {
          if (cancelled) return;
          setFeed((prev) => {
            const base = startOrKeep(prev);
            const merged = [...base.rows, ...snapshot.activity.map((a) => ({ ...a, module: moduleKey }))];
            // Rows without a date sort last rather than being dropped — a record
            // with no usable timestamp is still the customer's.
            merged.sort((a, b) => {
              if (!a.dateISO) return 1;
              if (!b.dateISO) return -1;
              return b.dateISO.localeCompare(a.dateISO);
            });
            return { ...base, rows: merged, pending: base.pending - 1 };
          });
        })
        .catch(() => {
          if (cancelled) return;
          setFeed((prev) => {
            const base = startOrKeep(prev);
            return { ...base, pending: base.pending - 1, failures: base.failures + 1 };
          });
        });
    }

    return () => { cancelled = true; };
  }, [userId]);

  if (!isAuthenticated) {
    return (
      <section>
        <h2 className="section-title mb-3">Recent orders</h2>
        <ZoneLink href="/auth/login" className="card card-hover flex items-center justify-between px-4 py-4">
          <p className="text-sm font-semibold text-slate-700">Sign in to see your orders and bookings</p>
          <ArrowRight className="w-4 h-4 text-slate-300" aria-hidden="true" />
        </ZoneLink>
      </section>
    );
  }

  const loading = !current || (current.pending > 0 && current.rows.length === 0);
  const visible = (current?.rows ?? []).slice(0, limit);
  const allFailed = !!current && current.pending === 0 && current.failures === ALL_MODULES.length;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Recent orders</h2>
        <ZoneLink
          href="/profile"
          id="view-all-orders"
          className="text-xs font-semibold text-brand-600 inline-flex items-center gap-1 hover:gap-2 transition-all min-h-[44px] px-1 -mr-1"
        >
          View all <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </ZoneLink>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                <div className="h-2.5 w-1/3 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : allFailed ? (
        <div className="card px-4 py-4 flex items-center gap-3" role="alert">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
          <p className="text-sm text-slate-600">
            We could not reach your orders right now. Try again in a moment.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <ZoneLink href="/marketplace" className="card card-hover flex items-center justify-between px-4 py-4">
          <p className="text-sm font-semibold text-slate-700">No orders yet — start with the marketplace</p>
          <ArrowRight className="w-4 h-4 text-slate-300" aria-hidden="true" />
        </ZoneLink>
      ) : (
        <div className="space-y-2.5">
          {visible.map((row) => {
            const config = getModuleConfig(row.module);
            return (
              <Link
                key={`${row.module}-${row.reference}`}
                href={row.href}
                className="card card-hover flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-base shrink-0" aria-hidden="true">
                    {config.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{row.title}</span>
                    <span className="block text-xs text-slate-400 truncate">
                      {config.label}
                      {row.dateISO ? ` · ${formatRelativeDay(row.dateISO)}` : ''}
                      {row.reference ? ` · ${row.reference}` : ''}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold ${TONE_TEXT[row.tone]}`}>{row.statusLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
