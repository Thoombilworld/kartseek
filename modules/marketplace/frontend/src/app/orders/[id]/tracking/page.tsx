'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Package, Truck, MapPin, CheckCircle2, ChevronRight, Clock, PackageCheck, XCircle } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { api, ApiError } from '@/lib/api-endpoints';

/**
 * Shipment tracking for one order.
 *
 * This page used to render a fixed six-step timeline with a hard-coded AWB
 * ("KS1234567890"), a named delivery partner ("Rajan Kumar", ⭐ 4.8) and a
 * "2.3 km away" map caption — for every order, including ones that had not
 * shipped or had been cancelled. It never read the `[id]` route param at all,
 * so two different orders tracked identically.
 *
 * It now reads `GET /marketplace/orders/:id/track`, which returns the courier
 * scans recorded against the order plus the order's own status. Stages the
 * courier has not reported are shown as pending rather than invented, and when
 * there are no scans yet the page says so instead of claiming the parcel is out
 * for delivery.
 */

/** The stages a marketplace parcel moves through, in order. */
const STAGES = [
  { key: 'CONFIRMED', label: 'Order Confirmed', desc: 'Your order has been placed', icon: CheckCircle2 },
  { key: 'PACKED',    label: 'Packed',          desc: 'Seller has packed your order', icon: Package },
  { key: 'SHIPPED',   label: 'Shipped',         desc: 'Picked up by the courier', icon: Truck },
  { key: 'IN_TRANSIT',label: 'In Transit',      desc: 'On its way to you', icon: MapPin },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'With your delivery partner', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered',       desc: 'Handed over', icon: PackageCheck },
] as const;

/** Courier vocabularies vary; fold the common spellings onto our stage keys. */
function normaliseStatus(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

const STATUS_ALIASES: Record<string, string> = {
  PENDING: 'CONFIRMED', PLACED: 'CONFIRMED', ORDER_CONFIRMED: 'CONFIRMED', PROCESSING: 'CONFIRMED',
  READY_TO_SHIP: 'PACKED', PACKAGED: 'PACKED',
  DISPATCHED: 'SHIPPED', PICKED_UP: 'SHIPPED',
  TRANSIT: 'IN_TRANSIT', AT_HUB: 'IN_TRANSIT',
  OFD: 'OUT_FOR_DELIVERY',
  COMPLETED: 'DELIVERED',
};

function toStageKey(raw: unknown): string {
  const status = normaliseStatus(raw);
  return STATUS_ALIASES[status] ?? status;
}

interface TrackingEvent {
  id?: string;
  status?: string;
  location?: string;
  timestamp?: string;
  courierName?: string;
}

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { formatTrackingTime, timezoneLabel, country } = useRegion();
  const { isAuthenticated, isHydrated } = useAuth();

  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [orderStatus, setOrderStatus] = useState('');
  const [estimated, setEstimated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId || !isHydrated) return;
    if (!isAuthenticated) {
      setError('Please sign in to track this order.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    api.get<any>(`/marketplace/orders/${orderId}/track`)
      .then((data) => {
        if (cancelled) return;
        setEvents(Array.isArray(data?.events) ? data.events : []);
        setOrderStatus(String(data?.orderStatus ?? ''));
        setEstimated(data?.estimatedDeliveryAt ?? null);
        setError('');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof ApiError && e.status === 404
          ? 'We could not find this order on your account.'
          : 'Tracking is unavailable right now. Please try again shortly.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [orderId, isAuthenticated, isHydrated]);

  const cancelled = toStageKey(orderStatus) === 'CANCELLED';

  // A stage counts as reached when the courier reported it, or when the order's
  // own status has already moved past it — a seller can mark an order shipped
  // before the courier's first scan lands.
  const reported = new Set(events.map((e) => toStageKey(e.status)));
  const orderStageIndex = STAGES.findIndex((s) => s.key === toStageKey(orderStatus));
  const lastReachedIndex = STAGES.reduce(
    (last, stage, i) => (reported.has(stage.key) || i <= orderStageIndex ? i : last),
    -1,
  );

  const eventFor = (key: string) => events.find((e) => toStageKey(e.status) === key);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-3 xs:px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600 inline-flex items-center min-h-[44px]">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/orders" className="hover:text-blue-600 inline-flex items-center min-h-[44px]">Orders</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900 font-medium">Tracking</span>
        </nav>

        <h1 className="text-2xl font-black text-slate-900 mb-1">Order Tracking</h1>
        <p className="text-sm text-slate-500 mb-6">
          Order <span className="font-mono text-slate-700">{orderId}</span>
          {' · '}Times shown in {country.timezone} ({timezoneLabel}).
        </p>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-600">{error}</p>
            <Link href="/orders" className="inline-block mt-4 text-sm font-bold text-blue-600 hover:underline">
              Back to Orders
            </Link>
          </div>
        ) : cancelled ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <XCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <h2 className="font-bold text-slate-800 mb-1">This order was cancelled</h2>
            <p className="text-sm text-slate-500">There is no shipment to track.</p>
            <Link href={`/orders/${orderId}`} className="inline-block mt-4 text-sm font-bold text-blue-600 hover:underline">
              View order details
            </Link>
          </div>
        ) : (
          <>
            {/* Estimated delivery — quoted by the order, not invented here. */}
            {estimated && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Estimated Delivery</p>
                  <p className="text-lg font-black text-slate-900">{formatTrackingTime(new Date(estimated))}</p>
                </div>
                <Truck className="w-9 h-9 text-blue-200" />
              </div>
            )}

            {events.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  No courier scans yet. Tracking updates appear here once the parcel is picked up.
                </p>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
              <h2 className="font-bold text-slate-900 mb-5">Shipment Timeline</h2>
              {STAGES.map((stage, i) => {
                const done = i <= lastReachedIndex;
                const current = i === lastReachedIndex;
                const event = eventFor(stage.key);
                const Icon = stage.icon;
                return (
                  <div key={stage.key} className="flex gap-4 relative" style={{ paddingBottom: i < STAGES.length - 1 ? '1.5rem' : 0 }}>
                    {i < STAGES.length - 1 && (
                      <div className={`absolute left-4.25 top-9 w-0.5 h-[calc(100%-2.25rem)] ${done ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    )}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 z-10 ${
                      current ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                        : done ? 'bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-slate-200 text-slate-300'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-bold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{stage.label}</p>
                      <p className="text-xs text-slate-500">{stage.desc}</p>
                      {event?.timestamp && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatTrackingTime(new Date(event.timestamp))}
                          {event.location ? ` · ${event.location}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Any scan the stage list does not cover — courier-specific codes
                such as failed attempts or customs holds — still has to reach the
                customer rather than being dropped. */}
            {events.some((e) => !STAGES.some((s) => s.key === toStageKey(e.status))) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-5">
                <h2 className="font-bold text-slate-900 mb-3 text-sm">Other Updates</h2>
                <ul className="space-y-2">
                  {events
                    .filter((e) => !STAGES.some((s) => s.key === toStageKey(e.status)))
                    .map((e, i) => (
                      <li key={e.id ?? i} className="text-sm text-slate-600 flex justify-between gap-3">
                        <span>{e.status}{e.location ? ` · ${e.location}` : ''}</span>
                        {e.timestamp && <span className="text-xs text-slate-400 shrink-0">{formatTrackingTime(new Date(e.timestamp))}</span>}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
