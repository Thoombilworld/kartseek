'use client';

/**
 * Pharmacy return request.
 *
 * This rendered a hardcoded `items` array — Paracetamol 500mg, "2 strips", at
 * `₹` prices — as the contents of whatever order id was in the URL, with a
 * reason picker and a submit button that resolved to nothing.
 *
 * There is no return capability to wire it to. pharmacy-service has no return,
 * refund or cancel message pattern; the gateway exposes no pharmacy return
 * route; and `refund-service`, which is registered in the gateway's providers,
 * has exactly one pattern (`request_refund`) that no controller calls.
 *
 * Nothing links here — the page is reachable only by typing the URL — so the
 * fiction was doing no work at all. It now says what is true, and points at the
 * one route that does work for a customer with a problem.
 */

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, RotateCcw, LifeBuoy } from 'lucide-react';

export default function PharmacyReturnPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-3 xs:px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href={`/orders/${encodeURIComponent(id)}`}
            aria-label="Back to the order"
            className="w-11 h-11 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Return an item</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-3 xs:px-4 py-10 xs:py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-5">
            <RotateCcw className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Online returns aren&apos;t available yet</h2>
          <p className="text-sm text-slate-500 mt-2">
            We can&apos;t start a pharmacy return from here at the moment. Support can
            help with a return or a refund on this order.
          </p>
          <div className="flex flex-col xs:flex-row gap-2.5 justify-center mt-6">
            <Link
              href="/support"
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              <LifeBuoy className="w-4 h-4" aria-hidden="true" /> Contact support
            </Link>
            <Link
              href={`/orders/${encodeURIComponent(id)}`}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors text-sm"
            >
              Back to order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
