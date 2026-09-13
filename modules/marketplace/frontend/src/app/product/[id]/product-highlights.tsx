import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * The short bullet list beside the price.
 *
 * Derived, never written: each line is an attribute value the category's
 * definition flags as a highlight (`isHighlight`), so an admin decides which
 * facts of a phone or a fridge are worth the top of the page and the seller's
 * own values fill them in. The block renders nothing for a product whose
 * category has no highlighted attributes — an empty heading over no bullets
 * is worse than no heading.
 */
export function ProductHighlights({ highlights }: { highlights: string[] }) {
  const rows = highlights.map((h) => h.trim()).filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <section aria-label="Highlights" className="mt-5">
      <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" /> Highlights
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-700">
        {rows.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <span
              className="mt-[7px] w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"
              aria-hidden="true"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
