import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * A public listing. It names no specific shop or product — it is a view over a
 * live query — so the description can be stated plainly, and no structured data
 * is emitted that the page would have to back up.
 */
export const metadata: Metadata = buildMeta({
  title: 'Grocery Stores Near You',
  description: 'Browse supermarkets, hypermarkets and neighbourhood shops delivering groceries in your area on KARTSEEK. Compare delivery times, minimum orders and fees.',
  path: '/grocery/stores',
  keywords: ['grocery stores', 'supermarkets near me', 'grocery delivery', 'hypermarket', 'KARTSEEK'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
