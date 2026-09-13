'use client';

import React, { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SpecificationGroup } from '@/lib/marketplace/product-detail';

/**
 * The specification table, built from the product's own attribute values.
 *
 * Every row here is a value a seller entered against an attribute the
 * category defines: a phone shows Display, Processor and Battery because those
 * are the phone category's attributes and this phone has values for them; a
 * jacket shows Material, Fit and Care because those are its own. Nothing is
 * rendered for an attribute the product has no value for, so "Processor: N/A"
 * cannot appear under a refrigerator — the old template did exactly that.
 *
 * Long tables fold on a phone: the first two groups are always visible, the
 * rest sit behind "See all specifications" so the reviews are not a mile down.
 */
export function ProductSpecifications({ groups }: { groups: SpecificationGroup[] }) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const visible = groups.filter((g) => g.attributes.length > 0);
  if (visible.length === 0) return null;

  const rowCount = visible.reduce((n, g) => n + g.attributes.length, 0);
  const foldable = rowCount > 8 && visible.length > 1;
  const shown = foldable && !expanded ? visible.slice(0, 2) : visible;
  const hiddenRows = rowCount - shown.reduce((n, g) => n + g.attributes.length, 0);

  return (
    <section
      aria-labelledby={headingId}
      className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6"
    >
      <h2
        id={headingId}
        className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2"
      >
        Specifications
      </h2>
      <div className="space-y-6">
        {shown.map((group) => (
          <div key={group.group}>
            <h3 className="font-bold text-slate-800 mb-2 text-sm">{group.group}</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {group.attributes.map((attr) => (
                <div
                  key={attr.id}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-x-4 py-2 border-b border-slate-100 last:border-0 sm:[&:nth-last-child(2)]:border-0"
                >
                  <dt className="text-slate-500 text-sm sm:w-2/5 shrink-0">{attr.name}</dt>
                  <dd className="text-slate-900 text-sm font-medium sm:w-3/5 break-words">
                    {attr.type === 'COLOR' &&
                    typeof attr.value === 'string' &&
                    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(attr.value) ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: attr.value }}
                          aria-hidden="true"
                        />
                        {attr.displayValue}
                      </span>
                    ) : (
                      attr.displayValue
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {foldable && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 py-2 px-3 rounded-sm border border-blue-200 hover:bg-blue-50"
        >
          {expanded ? (
            <>
              Show fewer specifications <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              See all specifications ({hiddenRows} more) <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </section>
  );
}
