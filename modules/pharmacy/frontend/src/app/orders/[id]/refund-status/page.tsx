'use client';

/**
 * Pharmacy refund status.
 *
 * This rendered a hardcoded `refunds` array — `RF-4521` against order
 * `PH-2026-1234` at a `₹` amount, with a progress timeline — for whatever order
 * id was in the URL. It told a customer money was on its way back to them when
 * no refund existed anywhere.
 *
 * There is nothing to report a real status from: pharmacy-service has no refund
 * pattern, no gateway route exposes one, and `refund-service` has a single
 * `request_refund` pattern that no controller calls. A refund a customer is
 * waiting on is exactly the wrong thing to approximate.
 *
 * Nothing links here. It now says what is true.
 */

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Receipt, LifeBuoy } from 'lucide-react';

export default function PharmacyRefundStatusPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-3 xs:px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href={`/pharmacy/orders/${encodeURIComponent(id)}`}
            aria-label="Back to the order"
            className="w-11 h-11 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Refund status</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-3 xs:px-4 py-10 xs:py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-5">
            <Receipt className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">We can&apos;t show refund progress here</h2>
          <p className="text-sm text-slate-500 mt-2">
            Refund tracking isn&apos;t wired up for pharmacy orders yet. If you are
            waiting on a refund, support can tell you where it is.
          </p>
          <div className="flex flex-col xs:flex-row gap-2.5 justify-center mt-6">
            <Link
              href="/pharmacy/support"
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              <LifeBuoy className="w-4 h-4" aria-hidden="true" /> Contact support
            </Link>
            <Link
              href={`/pharmacy/orders/${encodeURIComponent(id)}`}
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
