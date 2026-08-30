import Link from 'next/link';

/**
 * The empty / failed state for a product feed.
 *
 * Extracted from `catalog-feed-page.tsx` so the standalone feeds — deals,
 * flash deals, offers — can say the same thing rather than each inventing a
 * treatment, or worse, avoiding the question entirely.
 *
 * The distinction the component exists to preserve: **"nothing is running" and
 * "we could not ask" are different facts.** Those three pages previously
 * collapsed both into a `catch` that rendered products from
 * `@/lib/demo-data/marketplace-home`, so an offline gateway and a genuinely
 * quiet deals period both produced a grid of items with prices that no listing
 * in the catalogue backed. A shopper cannot tell a fabricated ₹34,900 from a
 * real one.
 */
export function FeedEmptyState({
  icon: Icon,
  failed,
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'No products to show here yet. Please check back soon.',
  onRetry,
}: {
  icon: React.ElementType;
  /** True when the request errored, as opposed to succeeding with no rows. */
  failed: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Offered only on failure — there is nothing to retry about an empty list. */
  onRetry?: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center">
      <Icon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
      <h2 className="font-bold text-slate-700 mb-1">
        {failed ? 'We couldn’t load this list' : emptyTitle}
      </h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        {failed
          ? 'Something went wrong reaching the store. Please try again in a moment.'
          : emptyMessage}
      </p>
      <div className="flex items-center justify-center gap-4 mt-4">
        {failed && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            Try again
          </button>
        )}
        <Link
          href="/marketplace/category-list"
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          Browse all categories
        </Link>
      </div>
    </div>
  );
}
