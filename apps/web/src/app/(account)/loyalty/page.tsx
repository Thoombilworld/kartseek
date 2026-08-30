'use client';

/**
 * KARTSEEK reward points.
 *
 * This page rendered `buildModuleLoyaltyProfile(activeModule)` — 434 lines of
 * per-module fiction giving the customer a different points balance, tier and
 * redemption history in each of seven modules. loyalty-service has no concept of
 * a per-module balance: there is one balance per customer.
 *
 * Its "Redeem" button was worse than decorative. It ran
 * `setRedeemToast('🎉 "X" redeemed for N pts!')` and returned — the customer was
 * told points had been spent on a reward that no service had heard of. (The real
 * endpoint behind it was broken too: `POST /api/loyalty/redeem` forwarded to
 * `award_loyalty_points` with a negated amount, skipping the balance check, so
 * redeeming 50 points against a balance of 0 succeeded and left −50.)
 *
 * The module switcher along the top also caused this page to scroll sideways on
 * every handset from 320px to 640px.
 */

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Award, Gift, TrendingUp, AlertCircle, RefreshCw, Loader2, CheckCircle2,
  ShoppingBag, Info,
} from 'lucide-react';

import { AuthGate } from '@/components/shared/auth-gate';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { loyaltyApi } from '@/lib/api/loyalty';
import { loadLoyalty, type LoyaltySnapshot } from '@/lib/modules/profile-data';
import { getAllModuleConfigs } from '@/lib/modules/profiles';

/**
 * The tiers loyalty-service actually applies, from its `calculateTier` and
 * `getTierMultiplier`. Kept here as presentation only; the customer's tier comes
 * from the service, never from re-deriving it in the browser.
 */
const TIERS = [
  { name: 'Bronze', earned: 0, multiplier: 1, ring: 'from-amber-600 to-amber-800' },
  { name: 'Silver', earned: 200, multiplier: 1.5, ring: 'from-slate-300 to-slate-500' },
  { name: 'Gold', earned: 1000, multiplier: 2, ring: 'from-yellow-300 to-amber-500' },
  { name: 'Platinum', earned: 5000, multiplier: 3, ring: 'from-indigo-300 to-violet-500' },
] as const;

/** loyalty-service redeems at 10 points per unit of currency. */
const POINTS_PER_UNIT = 10;
const REDEEM_STEPS = [100, 250, 500, 1000];

export default function LoyaltyPage() {
  return (
    <AuthGate reason="Sign in to see your reward points.">
      <LoyaltyPageContent />
    </AuthGate>
  );
}

function LoyaltyPageContent() {
  const { user } = useAuth();
  const { formatCurrencyValue } = useRegion();

  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<{ points: number; discount: number } | null>(null);

  const { data: loyalty, loading, error, reload } = useAsyncData<LoyaltySnapshot>(
    () => loadLoyalty(),
    [user?.id],
    { enabled: !!user?.id },
  );

  const currentTier = TIERS.find((t) => t.name === loyalty?.tier) ?? TIERS[0];
  const nextTier = loyalty?.nextTier ? TIERS.find((t) => t.name === loyalty.nextTier) : undefined;

  // Progress toward the next tier is measured on lifetime points earned, which is
  // what `calculateTier` uses — not the current balance, which redemptions reduce.
  const progress = (() => {
    if (!loyalty || !nextTier) return 1;
    const span = nextTier.earned - currentTier.earned;
    if (span <= 0) return 1;
    return Math.min(1, Math.max(0, (loyalty.totalEarned - currentTier.earned) / span));
  })();

  const handleRedeem = useCallback(async (points: number) => {
    if (redeeming !== null) return;
    setRedeeming(points);
    setRedeemError(null);
    setRedeemed(null);
    try {
      const res: any = await loyaltyApi.redeem(points);
      setRedeemed({
        points,
        discount: Number(res?.discountAmount ?? Math.floor(points / POINTS_PER_UNIT)),
      });
      // Re-read rather than adjusting the local number: the balance the service
      // holds is the one the next checkout will spend.
      await reload();
    } catch (err) {
      // The endpoint answers 400 with a reason — "Insufficient loyalty points" —
      // rather than a 200 the caller has to inspect.
      setRedeemError(err instanceof Error ? err.message : 'Those points could not be redeemed.');
    } finally {
      setRedeeming(null);
    }
  }, [redeeming, reload]);

  return (
    <div className="space-y-6 xs:space-y-8">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl xs:text-2xl font-bold text-slate-900">Reward points</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          One balance, earned and spent across every KARTSEEK service.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
          <p className="flex-1 text-sm text-red-800 break-words">
            <span className="font-bold">We could not load your points.</span> {error}
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {/* ── Balance & tier ──────────────────────────────────────────────────── */}
      <section
        aria-label="Points balance"
        className={`rounded-2xl bg-gradient-to-br ${currentTier.ring} p-5 xs:p-6 text-white shadow-lg`}
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">
              Available points
            </p>
            {loading && !loyalty ? (
              <div className="h-11 w-36 rounded bg-white/25 animate-pulse" />
            ) : error ? (
              <p className="text-2xl font-black">Unavailable</p>
            ) : (
              <p className="text-4xl xs:text-5xl font-black tabular-nums">
                {loyalty!.points.toLocaleString()}
              </p>
            )}
            {loyalty && (
              <p className="text-sm text-white/85 mt-2">
                Worth about {formatCurrencyValue(Math.floor(loyalty.points / POINTS_PER_UNIT))} at checkout
              </p>
            )}
          </div>

          <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-4 py-3 sm:min-w-[190px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Your tier</p>
            <p className="text-xl font-black flex items-center gap-2">
              <Award className="w-5 h-5" aria-hidden="true" />
              {loyalty?.tier ?? '—'}
            </p>
            <p className="text-[11px] text-white/80 mt-0.5">
              {currentTier.multiplier}× points on every order
            </p>
          </div>
        </div>

        {loyalty && nextTier && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-white/85 mb-1.5">
              <span>{loyalty.totalEarned.toLocaleString()} earned all-time</span>
              <span>{loyalty.pointsToNextTier.toLocaleString()} to {nextTier.name}</span>
            </div>
            <div
              className="h-2 rounded-full bg-white/25 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label={`Progress to ${nextTier.name}`}
            >
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
      </section>

      {/* ── Redeem ──────────────────────────────────────────────────────────── */}
      <section aria-label="Redeem points" className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Gift className="w-5 h-5 text-blue-600" aria-hidden="true" /> Redeem points
        </h2>
        <p className="text-sm text-slate-500">
          {POINTS_PER_UNIT} points convert to {formatCurrencyValue(1)} of checkout credit.
        </p>

        {redeemed && (
          <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            Redeemed {redeemed.points.toLocaleString()} points for {formatCurrencyValue(redeemed.discount)} of credit.
          </p>
        )}
        {redeemError && (
          <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {redeemError}
          </p>
        )}

        <div className="grid grid-cols-2 ms:grid-cols-4 gap-2.5">
          {REDEEM_STEPS.map((points) => {
            const affordable = !!loyalty && loyalty.points >= points;
            return (
              <button
                key={points}
                type="button"
                onClick={() => void handleRedeem(points)}
                /* Disabled when the balance cannot cover it, so the customer is
                   not invited to spend points they do not have. The service
                   refuses it regardless — the button is the courtesy, the check
                   is the guard. */
                disabled={!affordable || redeeming !== null}
                className={`min-h-[44px] rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                  affordable
                    ? 'border-blue-200 bg-white text-blue-700 hover:border-blue-400 hover:bg-blue-50'
                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              >
                {redeeming === points ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Redeeming…
                  </span>
                ) : (
                  <>
                    <span className="block">{points.toLocaleString()} pts</span>
                    <span className="block text-xs font-semibold opacity-70">
                      {formatCurrencyValue(points / POINTS_PER_UNIT)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section aria-label="How points work" className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" aria-hidden="true" /> How you earn
        </h2>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <p className="text-sm text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            You earn 1 point per {formatCurrencyValue(100)} spent, multiplied by your tier. Points are
            granted when an order completes and reversed if it is cancelled or refunded.
          </p>

          {/* The tier ladder, with the customer's own position marked. */}
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm min-w-[380px]">
              <caption className="sr-only">Tier thresholds and point multipliers</caption>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                  <th scope="col" className="pb-2 font-bold">Tier</th>
                  <th scope="col" className="pb-2 font-bold">Points earned all-time</th>
                  <th scope="col" className="pb-2 font-bold">Earn rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TIERS.map((tier) => {
                  const isCurrent = tier.name === loyalty?.tier;
                  return (
                    <tr key={tier.name} className={isCurrent ? 'bg-blue-50/60' : ''}>
                      <th scope="row" className="py-2.5 font-bold text-slate-800 text-left">
                        {tier.name}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-bold uppercase bg-blue-600 text-white px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </th>
                      <td className="py-2.5 text-slate-600 tabular-nums">
                        {tier.earned.toLocaleString()}+
                      </td>
                      <td className="py-2.5 text-slate-600">{tier.multiplier}× points</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Where to earn ───────────────────────────────────────────────────── */}
      <section aria-label="Services that earn points" className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-600" aria-hidden="true" /> Earn across every service
        </h2>
        {/* A horizontal strip that scrolls inside itself. The module switcher this
            replaces was laid out in a row that pushed the page wider than the
            viewport on every handset from 320px to 640px. */}
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 snap-x">
          {getAllModuleConfigs().map((config) => (
            <Link
              key={config.key}
              href={config.profileHref}
              className="snap-start shrink-0 flex items-center gap-2 px-4 min-h-[44px] bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <span aria-hidden="true">{config.icon}</span> {config.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
