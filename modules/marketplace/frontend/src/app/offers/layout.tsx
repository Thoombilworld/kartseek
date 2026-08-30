import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/** See `flash-deals/layout.tsx` — sitemap-submitted client page, needs its own head. */
export const metadata: Metadata = buildMeta({
  title: 'Offers & Bank Discounts',
  description:
    'Bank card offers, exchange offers and seller promotions running now on KARTSEEK Marketplace. Compare every active discount before you check out.',
  path: '/marketplace/offers',
  keywords: ['bank offers', 'card discounts', 'exchange offer', 'promo codes'],
});

export default function MarketplaceOffersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
