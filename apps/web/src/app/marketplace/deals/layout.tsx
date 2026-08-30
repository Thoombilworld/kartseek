import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/** See `flash-deals/layout.tsx` — sitemap-submitted client page, needs its own head. */
export const metadata: Metadata = buildMeta({
  title: 'Deals of the Day - Today’s Best Prices',
  description:
    'Today’s best prices across electronics, fashion, home and beauty. Hand-picked deals from verified sellers on KARTSEEK Marketplace, refreshed daily.',
  path: '/marketplace/deals',
  keywords: ['deals of the day', 'daily deals', 'best prices', 'online offers'],
});

export default function MarketplaceDealsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
