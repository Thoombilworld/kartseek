'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

/**
 * Customer-facing placeholder for a storefront feature with no backend yet.
 *
 * The alternative — which is what these pages did — is to render a convincing
 * interface over invented data: a gift-card balance, a list of active
 * subscriptions with next-delivery dates, buttons that pause and cancel them.
 * A customer reading that page believes they have a subscription. They do not,
 * and nothing will be delivered.
 *
 * Distinct from the seller-portal component of the same name: this one keeps the
 * storefront's voice and always offers a way back to shopping.
 */
export function GroceryFeatureUnavailable({
  title,
  emoji,
  description,
  backHref = '/',
  backLabel = 'Back to grocery',
  alternative,
}: {
  title: string;
  emoji: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  alternative?: { href: string; label: string };
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-green-600 text-sm font-medium mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <span className="text-5xl block mb-4" aria-hidden="true">{emoji}</span>
        <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{description}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          {alternative && (
            <Link
              href={alternative.href}
              className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> {alternative.label}
            </Link>
          )}
          <Link
            href="/stores"
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Browse stores
          </Link>
        </div>
      </div>
    </div>
  );
}

export default GroceryFeatureUnavailable;
