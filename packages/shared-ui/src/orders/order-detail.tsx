'use client';

/**
 * KARTSEEK — the order detail screen a module gives its customers.
 *
 * The restaurant and pharmacy versions of this screen each rendered one `ORDER`
 * constant: a Bengaluru biryani order with a named driver and a phone number,
 * and a Mumbai pharmacy order with three medicines and a courier's mobile
 * number. Both rendered that same fixed order for whatever id was in the URL, so
 * the page could not tell you anything about your own order — including whether
 * it existed.
 *
 * A module maps its API response into `OrderDetailData` and this renders it. The
 * price breakdown is shown line by line and totalled from the record rather than
 * recomputed, so what a customer reads here is what the order actually says.
 */

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, AlertCircle, RefreshCw, MapPin, CreditCard, CheckCircle2, Circle, XCircle,
} from 'lucide-react';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { AuthGate } from '@/components/shared/auth-gate';
import { readStatus, type ActivityTone } from '@/lib/modules/profile-data';
import { getModuleConfig, type ModuleKey } from '@/lib/modules/profiles';

// ─── Shape ──────────────────────────────────────────────────────────────────────

export interface OrderLine {
  name: string;
  quantity: number;
  /** Price of one unit, as the record states it. Null when it does not. */
  unitPrice: number | null;
  lineTotal: number | null;
  /** e.g. "Prescription required", "No onions". */
  note?: string;
}

export interface OrderCharge {
  label: string;
  amount: number;
  /** Rendered as a deduction and in green. */
  isDiscount?: boolean;
}

export interface TimelineStep {
  label: string;
  /** ISO timestamp, or null where the step has not happened. */
  at: string | null;
  done: boolean;
}

export interface OrderDetailData {
  reference: string;
  title: string;
  subtitle: string;
  status: string;
  dateISO: string | null;
  lines: OrderLine[];
  charges: OrderCharge[];
  total: number | null;
  /** The record's own currency, when it has one. */
  currency: string | null;
  address?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  timeline: TimelineStep[];
  /** Anything else worth stating plainly: table number, nights, patient name. */
  facts?: Array<{ label: string; value: string }>;
  /** Shown as a banner when the order was cancelled or rejected. */
  cancelReason?: string | null;
}

const TONE_CLASSES: Record<ActivityTone, string> = {
  progress: 'text-blue-700 bg-blue-50 border-blue-200',
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  danger: 'text-red-700 bg-red-50 border-red-200',
  neutral: 'text-slate-600 bg-slate-100 border-slate-200',
};

// ─── Component ──────────────────────────────────────────────────────────────────

export function OrderDetail({
  module, orderId, backHref, trackHref, load,
}: {
  module: ModuleKey;
  orderId: string;
  backHref: string;
  /** Offered while the order is still in progress. */
  trackHref?: string;
  load: (orderId: string) => Promise<OrderDetailData>;
}) {
  const config = getModuleConfig(module);
  return (
    <AuthGate
      title="Sign in to view this order"
      reason="An order names you, your address and what you bought, so it is only visible to you."
    >
      <OrderDetailContent
        module={module}
        orderId={orderId}
        backHref={backHref}
        trackHref={trackHref}
        load={load}
        recordNoun={config.recordNoun[0]}
      />
    </AuthGate>
  );
}

function OrderDetailContent({
  module, orderId, backHref, trackHref, load, recordNoun,
}: {
  module: ModuleKey;
  orderId: string;
  backHref: string;
  trackHref?: string;
  load: (orderId: string) => Promise<OrderDetailData>;
  recordNoun: string;
}) {
  const config = getModuleConfig(module);
  const { user } = useAuth();
  const { formatCurrencyValue, formatDateTimeValue, currencyCode } = useRegion();

  const { data: order, loading, error, reload } = useAsyncData<OrderDetailData>(
    () => load(orderId),
    [orderId, user?.id],
    { enabled: !!user?.id && !!orderId },
  );

  const fmt = (amount: number | null) => {
    if (amount === null) return '—';
    const currency = order?.currency;
    if (currency && currency !== currencyCode) {
      return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatCurrencyValue(amount);
  };

  const status = order ? readStatus(order.status) : null;
  const showTracking = !!trackHref && !!status && (status.tone === 'progress' || status.tone === 'warning');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 xs:px-4 py-3.5 flex items-center gap-3 xs:gap-4">
          <Link href={backHref} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg xs:text-xl font-black text-slate-900 truncate">
              {order?.title ?? `${recordNoun.charAt(0).toUpperCase() + recordNoun.slice(1)} detail`}
            </h1>
            <p className="text-sm text-slate-500 font-mono truncate">{order?.reference ?? orderId}</p>
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
              {/* A 404 here means "not your order, or no such order" — the lookup is
                  scoped to the customer, which is what stops the id space being
                  probed to learn whose orders exist. */}
              <p className="font-bold text-red-900">We could not open this {recordNoun}</p>
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

        {loading && !order && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {order && (
          <>
            {order.cancelReason && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-bold text-red-900 text-sm">This {recordNoun} was cancelled</p>
                  <p className="text-sm text-red-700 mt-0.5">{order.cancelReason}</p>
                </div>
              </div>
            )}

            {/* Summary */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm text-slate-500">{order.subtitle}</p>
              {order.dateISO && (
                <p className="text-sm text-slate-400 mt-1">Placed {formatDateTimeValue(order.dateISO)}</p>
              )}
              {order.facts && order.facts.length > 0 && (
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                  {order.facts.map((f) => (
                    <div key={f.label}>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</dt>
                      <dd className="text-sm font-semibold text-slate-800 mt-0.5">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            {showTracking && (
              <Link
                href={trackHref!}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white ${config.theme.buttonBg} ${config.theme.buttonHover} transition-colors`}
              >
                <MapPin className="w-4 h-4" aria-hidden="true" /> Track this {recordNoun}
              </Link>
            )}

            {/* Timeline */}
            {order.timeline.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Progress</h2>
                <ol className="space-y-4">
                  {order.timeline.map((step, i) => (
                    <li key={`${step.label}-${i}`} className="flex items-start gap-3">
                      {step.done
                        ? <CheckCircle2 className={`w-5 h-5 shrink-0 ${config.theme.accentText}`} aria-hidden="true" />
                        : <Circle className="w-5 h-5 shrink-0 text-slate-300" aria-hidden="true" />}
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                          {step.label}
                        </p>
                        {/* A time is shown only where the record has one. The old
                            pages printed a clock time against every step whether
                            or not it had happened. */}
                        {step.at && (
                          <p className="text-xs text-slate-400 mt-0.5">{formatDateTimeValue(step.at)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Items */}
            {order.lines.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Items</h2>
                <ul className="divide-y divide-slate-100">
                  {order.lines.map((line, i) => (
                    <li key={`${line.name}-${i}`} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          <span className="text-slate-400 font-mono mr-2">{line.quantity}×</span>
                          {line.name}
                        </p>
                        {line.note && <p className="text-xs text-slate-500 mt-0.5">{line.note}</p>}
                        {line.unitPrice !== null && (
                          <p className="text-xs text-slate-400 mt-0.5">{fmt(line.unitPrice)} each</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                        {fmt(line.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Charges */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Payment</h2>
              <dl className="space-y-2.5">
                {order.charges.map((charge) => (
                  <div key={charge.label} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-slate-600">{charge.label}</dt>
                    <dd className={`font-semibold tabular-nums ${charge.isDiscount ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {charge.isDiscount ? `− ${fmt(Math.abs(charge.amount))}` : fmt(charge.amount)}
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 pt-3 mt-1 border-t border-slate-100">
                  <dt className="font-bold text-slate-900">Total</dt>
                  <dd className="text-lg font-black text-slate-900 tabular-nums">{fmt(order.total)}</dd>
                </div>
              </dl>

              {(order.paymentMethod || order.paymentStatus) && (
                <p className="flex items-center gap-2 text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">
                  <CreditCard className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {[order.paymentMethod, order.paymentStatus].filter(Boolean).join(' · ')}
                </p>
              )}
            </section>

            {order.address && (
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-2">Delivery address</h2>
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  {order.address}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
