'use client';

import React from 'react';
import Link from 'next/link';
import { Construction, ArrowRight, Info } from 'lucide-react';

/**
 * Admin placeholder for a console screen with no backend.
 *
 * Six screens in the grocery admin section shared one idiom: a table of invented
 * rows, and action buttons that called
 * `groceryApi.updateStoreSettings('admin', { <someKey>: … })` — a *store settings*
 * endpoint, addressed to a store whose id is the literal string "admin", with a
 * key the service's whitelist drops — wrapped in `.catch(() => {})`, followed by a
 * local state flip. Approving a refund, approving a brand, deleting a banner and
 * deleting an offer all did exactly this. Every one of them appeared to work.
 *
 * An operator who sees a queue of refund requests will work through it. If the
 * queue is fictional, the real requests are going unanswered while the console
 * says otherwise, so the honest state is the safer product.
 *
 * `owner` names the service that would supply the data, so whoever picks this up
 * knows where the work sits.
 */
export function AdminFeatureUnavailable({
  title,
  description,
  owner,
  alternative,
}: {
  title: string;
  description: string;
  owner?: string;
  alternative?: { href: string; label: string };
}) {
  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Construction className="w-7 h-7 text-slate-400" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{description}</p>

        {owner && (
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400 mt-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <Info className="w-3.5 h-3.5" /> Needs an endpoint from <code className="font-mono">{owner}</code>
          </p>
        )}

        {alternative && (
          <div className="mt-5">
            <Link
              href={alternative.href}
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
            >
              {alternative.label} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminFeatureUnavailable;
