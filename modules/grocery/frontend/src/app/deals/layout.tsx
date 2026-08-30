import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * A public listing. It names no specific shop or product — it is a view over a
 * live query — so the description can be stated plainly, and no structured data
 * is emitted that the page would have to back up.
 */
export const metadata: Metadata = buildMeta({
  title: 'Grocery Deals & Flash Offers',
  description: 'Live discounts on groceries from stores near you. Flash deals refresh through the day, so prices here are what the shops are charging right now.',
  path: '/grocery/deals',
  keywords: ['grocery deals', 'grocery offers', 'flash sale', 'discount groceries', 'KARTSEEK'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
