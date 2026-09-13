import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { categoryIcon } from './category-icon';
import { ProductCardSkeleton } from './product-card';

/**
 * The listing shell shared by `/category/[id]` and `/subcategory/[id]`.
 *
 * The two routes used to be two designs: the category page had a white header
 * with chips and a filter sidebar; the subcategory page a blue gradient hero
 * with its own, narrower filter panel. Both showed the same kind of thing — a
 * set of product cards for one node of the category tree — and a shopper
 * stepping from a parent to a child saw the chrome change around identical
 * cards. One shell, one filter component, one skeleton.
 *
 * Everything here is server-renderable: no state, no effects. The interactive
 * part is `CatalogFilters`, keyed by the page on the listing's identity.
 */

export interface TrailStep {
  name: string;
  /** Zone-relative href; omitted for the current page. */
  href?: string;
}

export interface ListingChip {
  label: string;
  href: string;
  active?: boolean;
}

/**
 * Breadcrumb → icon → title → count → chips.
 *
 * Structure carries information: the trail is the category tree (a real
 * hierarchy, walkable both ways), the chips are the current node's children,
 * and the count line is the one place the load state is stated in words.
 */
export function CatalogListingHeader({
  trail,
  title,
  iconName,
  countLabel,
  chips = [],
  clearHref,
}: {
  trail: TrailStep[];
  title: string;
  iconName?: string | null;
  countLabel: string;
  chips?: ListingChip[];
  /** Present while a chip filter is applied; renders the "Clear" chip first. */
  clearHref?: string;
}) {
  const Icon = categoryIcon(iconName);
  return (
    <header className="bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 py-4 md:py-5">
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex items-center gap-1 text-xs md:text-sm text-slate-500 min-w-0 overflow-x-auto hide-scrollbar whitespace-nowrap">
            {trail.map((step, i) => {
              const last = i === trail.length - 1;
              return (
                <li key={`${step.name}-${i}`} className="flex items-center gap-1 min-w-0">
                  {i > 0 && (
                    <ChevronRight
                      className="w-3.5 h-3.5 text-slate-300 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {last || !step.href ? (
                    <span
                      aria-current={last ? 'page' : undefined}
                      className="text-slate-900 font-semibold truncate max-w-[60vw] md:max-w-none"
                    >
                      {step.name}
                    </span>
                  ) : (
                    <Link href={step.href} className="hover:text-brand-700 transition-colors">
                      {step.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex items-center gap-3 md:gap-4">
          <div
            aria-hidden="true"
            className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 flex items-center justify-center shrink-0"
          >
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight truncate">
              {title}
            </h1>
            <p className="text-sm text-slate-500 tabular-nums mt-0.5">{countLabel}</p>
          </div>
        </div>

        {(chips.length > 0 || clearHref) && (
          <div className="chip-row mt-4" role="list" aria-label="Subcategories">
            {clearHref && (
              <Link
                href={clearHref}
                role="listitem"
                className="chip"
                aria-label="Clear the subcategory filter"
              >
                Clear filter <X className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            )}
            {chips.map((chip) => (
              <Link
                key={chip.href}
                href={chip.href}
                role="listitem"
                aria-current={chip.active ? 'page' : undefined}
                className={`chip${chip.active ? ' chip-active' : ''}`}
              >
                {chip.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * The listing could not be fetched.
 *
 * Shown *above* the page, never instead of it: the header, the chips and the
 * filter sidebar stay reachable, so a catalogue hiccup is not a dead end. The
 * count line already reads "Product list unavailable"; this says why and what
 * to do.
 */
export function CatalogListingNotice({
  retryHref,
  browseHref = '/category-list',
}: {
  retryHref: string;
  browseHref?: string;
}) {
  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-4">
      <div
        role="alert"
        className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <AlertTriangle
          className="w-5 h-5 text-amber-600 shrink-0 hidden sm:block"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">
            Couldn&apos;t load the products for this listing
          </p>
          <p className="text-xs text-amber-800/80 mt-0.5">
            The catalogue didn&apos;t answer, so the list below is incomplete rather than empty.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={retryHref}
            className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
          >
            Try again
          </Link>
          <Link
            href={browseHref}
            className="btn btn-sm border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg"
          >
            Browse categories
          </Link>
        </div>
      </div>
    </div>
  );
}

function Bone({ className }: { className: string }) {
  return (
    <div aria-hidden="true" className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
  );
}

/**
 * The listing while its data loads — the same shapes in the same places.
 *
 * Both routes' skeletons drew a blue gradient hero that the rendered page no
 * longer had, so every navigation started as one page and became another: a
 * layout shift on arrival that read as the category "changing". This mirrors
 * the header band, the chip row, the sidebar and the card grid exactly.
 */
export function CatalogListingSkeleton() {
  return (
    <div className="min-h-screen pb-mobile-nav" aria-busy="true" aria-label="Loading products">
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 py-4 md:py-5">
          <Bone className="h-3.5 w-56 mb-4" />
          <div className="flex items-center gap-3 md:gap-4">
            <Bone className="w-11 h-11 md:w-12 md:h-12 rounded-xl" />
            <div className="space-y-2">
              <Bone className="h-7 md:h-8 w-48" />
              <Bone className="h-3.5 w-28" />
            </div>
          </div>
          <div className="chip-row mt-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Bone key={i} className="h-9 w-24 rounded-full shrink-0" />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-4 md:pt-6 pb-4 flex flex-col md:flex-row gap-6">
        <Bone className="md:hidden h-12 w-full rounded-xl" />
        <aside className="w-full md:w-60 shrink-0 hidden md:block">
          <div className="card p-5 space-y-5">
            <Bone className="h-5 w-20" />
            {Array.from({ length: 3 }).map((_, s) => (
              <div key={s} className="space-y-2">
                <Bone className="h-4 w-24" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Bone key={i} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        </aside>
        <div className="flex-1">
          <div className="card px-3 py-2.5 mb-5 flex items-center justify-between">
            <Bone className="h-4 w-40" />
            <Bone className="h-9 w-44 rounded-lg" />
          </div>
          <div className="card-grid-2-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
