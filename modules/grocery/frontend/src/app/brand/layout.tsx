import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * A public listing. It names no specific shop or product — it is a view over a
 * live query — so the description can be stated plainly, and no structured data
 * is emitted that the page would have to back up.
 */
export const metadata: Metadata = buildMeta({
  title: 'Shop Groceries by Brand',
  description: 'Every brand stocked by the grocery shops delivering in your area, with the products each one carries. Built from the live catalogue, not a fixed list.',
  path: '/grocery/brand',
  keywords: ['grocery brands', 'shop by brand', 'brand catalogue', 'KARTSEEK'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
