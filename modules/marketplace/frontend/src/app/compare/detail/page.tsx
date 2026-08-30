import { redirect } from 'next/navigation';

/**
 * `/marketplace/compare/detail` → `/marketplace/compare`.
 *
 * This rendered a fixed head-to-head of an iPhone 15 Pro Max against a Galaxy
 * S24 Ultra, with invented prices (₹134,900 / ₹119,999), invented ratings and
 * invented review counts, hardcoded in a `DEMO_PRODUCTS` array. It took no
 * parameters, so every visitor saw the same two phones regardless of what they
 * had chosen to compare, and the figures matched no listing in the catalogue.
 *
 * `/marketplace/compare` is the real comparison: it reads the products the
 * customer actually added, and there is no separate detail view to keep. Nothing
 * linked here; the redirect exists for bookmarks.
 */
export default function CompareDetailPage() {
  redirect('/compare');
}
