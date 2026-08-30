'use client';

/**
 * KARTSEEK — live order tracking.
 *
 * The restaurant and pharmacy versions of this screen each rendered a fixed
 * five-step ladder with the first four ticked and clock times written into the
 * markup, plus a courier's name and phone number. The pharmacy one also ran a
 * `setInterval` counting an ETA down from 12 minutes — a number that came from
 * `useState(12)`, not from the order.
 *
 * This renders the milestones the order actually records. A step shows a time
 * only where the record has one; an ETA is shown only where the order states
 * one.
 *
 * Updates arrive over the `/orders` socket namespace, which the gateway has been
 * pushing to all along — nothing on the customer side had ever subscribed.
 * Polling remains as the fallback for when that socket is not connected.
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, AlertCircle, RefreshCw, CheckCircle2, Circle, Clock, XCircle,
} from 'lucide-react';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { useOrderTracking } from '@/lib/hooks/use-socket';
import { AuthGate } from '@/components/shared/auth-gate';
import { readStatus, isOpen, type ActivityTone } from '@/lib/modules/profile-data';
import { getModuleConfig, type ModuleKey } from '@/lib/modules/profiles';

export interface TrackingData {
  reference: string;
  title: string;
  status: string;
  steps: Array<{ label: string; at: string | null; done: boolean }>;
  /** ISO timestamp the record states as its estimate, if any. */
  estimatedAt?: string | null;
  cancelReason?: string | null;
  /** Anything else the record carries: table, room, driver reference. */
  facts?: Array<{ label: string; value: string }>;
}

const TONE_CLASSES: Record<ActivityTone, string> = {
  progress: 'text-blue-700 bg-blue-50 border-blue-200',
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  danger: 'text-red-700 bg-red-50 border-red-200',
  neutral: 'text-slate-600 bg-slate-100 border-slate-200',
};

/**
 * Fallback poll cadence.
 *
 * Only used when the live socket is not connected. The gateway pushes status
 * changes over `/orders` the moment they happen, so polling every twenty seconds
 * on top of that would be twenty seconds of staleness and a request the server
 * did not need.
 */
const POLL_MS = 20_000;

export function OrderTracking({
  module, orderId, backHref, load,
}: {
  module: ModuleKey;
  orderId: string;
  backHref: string;
  load: (orderId: string) => Promise<TrackingData>;
}) {
  return (
    <AuthGate
      title="Sign in to track this order"
      reason="Tracking shows where your order is, so it is only visible to you."
    >
      <OrderTrackingContent module={module} orderId={orderId} backHref={backHref} load={load} />
    </AuthGate>
  );
}

function OrderTrackingContent({
  module, orderId, backHref, load,
}: {
  module: ModuleKey;
  orderId: string;
  backHref: string;
  load: (orderId: string) => Promise<TrackingData>;
}) {
  const config = getModuleConfig(module);
  const { user } = useAuth();
  const { formatDateTimeValue, formatTrackingTime } = useRegion();

  const { data, loading, error, reload } = useAsyncData<TrackingData>(
    () => load(orderId),
    [orderId, user?.id],
    { enabled: !!user?.id && !!orderId },
  );

  const live = !!data && isOpen(data.status);

  /**
   * Subscribe to the order's live room.
   *
   * `OrderGateway` has pushed `order_status` over the `/orders` namespace all
   * along, and `useOrderTracking` was written to receive it — but nothing ever
   * called the hook, so every tracking screen polled instead and a customer
   * watching a delivery saw each step up to twenty seconds late.
   *
   * The subscription is deliberately mounted *after* `load()` has run: joining
   * the room requires a grant that the ownership-checked HTTP tracking route
   * issues, so the socket can only ever follow a successful read. The `orderId`
   * is passed only once the order has actually resolved.
   */
  const { orderStatus, status: socketStatus } = useOrderTracking(
    data ? orderId : null,
    live ? (user?.id ?? null) : null,
  );

  const connected = socketStatus === 'connected';

  // A pushed status is the signal to re-read: the payload carries the status but
  // not the full timeline, and the timeline is what this screen renders.
  const pushedStatus = orderStatus?.status;
  useEffect(() => {
    if (!pushedStatus) return;
    void reload();
  }, [pushedStatus, reload]);

  // Polling is the fallback, not the mechanism. It stops when the socket is
  // connected, and when the order reaches a terminal state — a delivered order
  // has nothing left to report.
  useEffect(() => {
    if (!live || connected) return;
    const timer = setInterval(() => { void reload(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [live, connected, reload]);

  const status = data ? readStatus(data.status) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 xs:px-4 py-3.5 flex items-center gap-3 xs:gap-4">
          <Link href={backHref} className="w-11 h-11 -ml-2 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg xs:text-xl font-black text-slate-900 truncate">
              {data?.title ?? 'Tracking'}
            </h1>
            <p className="text-sm text-slate-500 font-mono truncate">{data?.reference ?? orderId}</p>
          </div>
          {status && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${TONE_CLASSES[status.tone]}`}>
              {status.label}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 xs:px-4 py-5 xs:py-6 space-y-4">

        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-900">We could not load tracking</p>
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

        {loading && !data && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-100 animate-pulse shrink-0" />
                <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {data && (
          <>
            {data.cancelReason && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-bold text-red-900 text-sm">Cancelled</p>
                  <p className="text-sm text-red-700 mt-0.5">{data.cancelReason}</p>
                </div>
              </div>
            )}

            {/* An estimate, only where the order records one. */}
            {live && data.estimatedAt && (
              <div className={`rounded-2xl border ${config.theme.accentBorder} ${config.theme.lightBg} p-5 flex items-center gap-3`}>
                <Clock className={`w-6 h-6 shrink-0 ${config.theme.accentText}`} aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estimated arrival</p>
                  <p className="text-lg font-black text-slate-900">{formatTrackingTime(data.estimatedAt)}</p>
                </div>
              </div>
            )}

            <section className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="text-sm font-bold text-slate-900">Progress</h2>
                {live && (
                  <span
                    className={`flex items-center gap-1.5 text-[11px] font-bold ${
                      connected ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
                      aria-hidden="true"
                    />
                    {/* Honest about which one is running. "Updating live" over a
                        20-second poll overstates what the customer is seeing. */}
                    {connected ? 'Live' : 'Checking for updates'}
                  </span>
                )}
              </div>

              <ol className="relative space-y-5">
                {data.steps.map((step, i) => (
                  <li key={`${step.label}-${i}`} className="flex items-start gap-3 relative">
                    {i < data.steps.length - 1 && (
                      <span
                        className={`absolute left-[9px] top-6 bottom-[-20px] w-0.5 ${step.done ? config.theme.buttonBg : 'bg-slate-200'}`}
                        aria-hidden="true"
                      />
                    )}
                    {step.done
                      ? <CheckCircle2 className={`w-5 h-5 shrink-0 relative z-10 ${config.theme.accentText}`} aria-hidden="true" />
                      : <Circle className="w-5 h-5 shrink-0 relative z-10 text-slate-300 bg-white rounded-full" aria-hidden="true" />}
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                      {step.at && <p className="text-xs text-slate-400 mt-0.5">{formatDateTimeValue(step.at)}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {data.facts && data.facts.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {data.facts.map((f) => (
                    <div key={f.label}>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</dt>
                      <dd className="text-sm font-semibold text-slate-800 mt-0.5">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
