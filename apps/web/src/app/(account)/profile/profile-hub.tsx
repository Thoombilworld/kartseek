'use client';

/**
 * Profile hub — every service the customer uses, with their real position in it.
 *
 * The card figures used to come from `getAggregateStats()`, which summed seven
 * hardcoded profiles into a headline "278 orders" and "8,280 points" that were
 * the same for every account on the platform. Each card now reports what that
 * module's own API says about this customer, and a module whose service is down
 * says so on its card instead of quietly reporting zero.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ChevronRight, AlertCircle, Award } from 'lucide-react';

import { useAuth } from '@/lib/contexts/auth-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import {
  getAllModuleConfigs, type ModuleKey, type ModuleProfileConfig,
} from '@/lib/modules/profiles';
import {
  loadModuleProfile, loadLoyalty, type LoyaltySnapshot,
} from '@/lib/modules/profile-data';

/** What one card knows about its module. */
type CardState =
  | { phase: 'loading' }
  | { phase: 'ready'; total: number; open: number }
  | { phase: 'failed'; message: string };

export function ProfileHub() {
  const { user } = useAuth();
  const configs = getAllModuleConfigs();
  /**
   * Card states, stamped with the customer they describe.
   *
   * Stamping rather than clearing means the effect never calls setState
   * synchronously in its body — that forces a cascading render, which
   * `react-hooks/set-state-in-effect` flags — and a result that arrives for a
   * previous `userId` is ignored rather than shown against the new one.
   */
  const [cards, setCards] = useState<{ forUser: string; byModule: Record<string, CardState> } | null>(null);

  const { data: loyalty } = useAsyncData<LoyaltySnapshot>(
    () => loadLoyalty(),
    [user?.id],
    { enabled: !!user?.id },
  );

  const userId = user?.id;
  const currentCards = cards && cards.forUser === userId ? cards.byModule : {};

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const put = (key: ModuleKey, state: CardState) => {
      setCards((prev) => ({
        forUser: userId,
        byModule: { ...(prev?.forUser === userId ? prev.byModule : {}), [key]: state },
      }));
    };

    // Seven independent services, settled rather than raced: one outage costs
    // its own card and nothing else, and a slow module does not hold up the six
    // that already answered.
    for (const config of configs) {
      loadModuleProfile(config.key, userId)
        .then((snapshot) => {
          if (cancelled) return;
          put(config.key, {
            phase: 'ready',
            total: snapshot.totalRecords,
            open: snapshot.counts.openOrders
              ?? snapshot.counts.upcomingAppointments
              ?? snapshot.counts.upcomingStays
              ?? 0,
          });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          put(config.key, {
            phase: 'failed',
            message: err instanceof Error ? err.message : 'Could not load',
          });
        });
    }

    return () => { cancelled = true; };
    // `configs` is derived from a module-level constant and is stable in content;
    // depending on the user id alone keeps this to one sweep per signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {user?.name ? `Hello, ${user.name}` : 'Your profile'}
        </h1>
        <p className="text-slate-500 mt-1">Open any service to manage what you have with it.</p>
      </div>

      {/* One balance, platform-wide. */}
      <section aria-label="Reward points">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 sm:p-6 text-white shadow-lg shadow-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-bold uppercase tracking-wider">KARTSEEK reward points</p>
              {loyalty ? (
                <p className="text-3xl font-black tabular-nums">
                  {loyalty.points.toLocaleString()}
                  <span className="text-base font-bold text-white/80 ml-2">{loyalty.tier}</span>
                </p>
              ) : (
                <div className="h-8 w-28 rounded bg-white/20 animate-pulse mt-1" />
              )}
            </div>
          </div>
          {loyalty?.nextTier && (
            <p className="text-sm text-white/80">
              {loyalty.pointsToNextTier.toLocaleString()} points to {loyalty.nextTier}
            </p>
          )}
        </div>
      </section>

      <section aria-label="Your service profiles">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" aria-hidden="true" />
          Your service profiles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config) => (
            <ServiceCard key={config.key} config={config} state={currentCards[config.key] ?? { phase: 'loading' }} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ServiceCard({ config, state }: { config: ModuleProfileConfig; state: CardState }) {
  const [singular, plural] = config.recordNoun;

  return (
    <Link
      href={config.profileHref}
      className={`group relative overflow-hidden bg-white rounded-2xl border ${config.theme.accentBorder} p-5 hover:shadow-xl transition-all duration-300`}
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${config.theme.gradient} opacity-5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${config.theme.iconBg} shadow-sm`}>
          <span aria-hidden="true">{config.icon}</span>
        </div>
        <ChevronRight
          className={`w-5 h-5 ${config.theme.accentText} opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all`}
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10">
        <h3 className="font-bold text-lg text-slate-900">{config.label}</h3>
        <p className="text-sm text-slate-500 mb-4">{config.subtitle}</p>

        <div className="min-h-[28px] flex items-center gap-2 flex-wrap">
          {state.phase === 'loading' && <span className="h-6 w-24 rounded bg-slate-100 animate-pulse" />}

          {state.phase === 'failed' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Unavailable right now
            </span>
          )}

          {state.phase === 'ready' && (
            <>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${config.theme.badgeBg} ${config.theme.badgeText}`}>
                {state.total} {state.total === 1 ? singular : plural}
              </span>
              {state.open > 0 && (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700">
                  {state.open} active
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
