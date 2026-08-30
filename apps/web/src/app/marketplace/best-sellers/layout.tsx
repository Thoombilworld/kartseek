import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/** See `flash-deals/layout.tsx` — sitemap-submitted client page, needs its own head. */
export const metadata: Metadata = buildMeta({
  title: 'Best Sellers - Most Popular Products',
  description:
    'The products customers buy most on KARTSEEK Marketplace, ranked across electronics, fashion, home and beauty and updated as orders come in.',
  path: '/marketplace/best-sellers',
  keywords: ['best sellers', 'top rated products', 'most popular', 'bestselling'],
});

export default function MarketplaceBestSellersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
