import type { Metadata } from 'next';

/**
 * Brand routes are a redirect, not a page.
 *
 * The old note here explained that this route rendered a brand store from the
 * bundled `ALL_BRANDS` fixture without ever calling the catalogue, so an unknown
 * slug still produced a convincing brand page and the route was withheld from
 * the index for that reason.
 *
 * It no longer renders anything: brand is a free-text column rather than an
 * entity, so `page.tsx` redirects to a catalogue search for the name. `noindex`
 * stays — there is no content here to index, and the search results it lands on
 * are not a stable, crawlable destination either.
 */
export const metadata: Metadata = {
  title: 'Brand',
  description: 'Shop grocery brands and order online with KARTSEEK.',
  robots: { index: false, follow: true },
};

export default function GroceryBrandLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
