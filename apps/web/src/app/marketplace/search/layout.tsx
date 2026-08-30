import type { Metadata } from 'next';

/**
 * Search results are excluded from the index.
 *
 * Every distinct `?q=` is a separate URL over the same catalogue, so leaving
 * them indexable puts an unbounded number of thin, near-duplicate pages in
 * competition with the category and product pages they are cut from — the
 * pattern Google names outright in its guidance on low-value URLs. `follow` is
 * kept: the product links on a results page are still worth crawling.
 *
 * The page itself is a client component and cannot export this, hence a layout.
 */
export const metadata: Metadata = {
  title: 'Search',
  description: 'Search the KARTSEEK marketplace across electronics, fashion, home, beauty and more.',
  robots: { index: false, follow: true },
};

export default function MarketplaceSearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
