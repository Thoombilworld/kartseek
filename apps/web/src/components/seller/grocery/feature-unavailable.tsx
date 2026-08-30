'use client';

import React from 'react';
import Link from 'next/link';
import { Construction, ArrowRight } from 'lucide-react';

/**
 * Placeholder for a portal screen whose backend does not exist yet.
 *
 * Nine screens in this portal were generated from one template: a `MOCK_DATA`
 * array of string arrays rendered into a table, with `groceryApi` imported and
 * never called. They looked like working features — a seller could read their
 * "commission statements", their "returns queue", their "staff list" — and every
 * figure on them was invented. There is no grocery endpoint behind any of them.
 *
 * Showing this is the honest state. A seller who sees "not available yet" goes and
 * asks; a seller who sees a plausible table of numbers plans around it.
 */
export function FeatureUnavailable({
  title,
  description,
  alternative,
}: {
  title: string;
  description: string;
  /** Where the seller can go instead, when something related does work. */
  alternative?: { href: string; label: string };
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-2xl mx-auto mt-4">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Construction className="w-7 h-7 text-slate-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{description}</p>
      {alternative && (
        <Link
          href={alternative.href}
          className="inline-flex items-center gap-1.5 mt-5 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
        >
          {alternative.label} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export default FeatureUnavailable;
