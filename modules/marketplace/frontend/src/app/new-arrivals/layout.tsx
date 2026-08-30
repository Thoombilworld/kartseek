import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/** See `flash-deals/layout.tsx` — sitemap-submitted client page, needs its own head. */
export const metadata: Metadata = buildMeta({
  title: 'New Arrivals - Latest Products',
  description:
    'The newest listings on KARTSEEK Marketplace. Fresh stock from verified sellers across electronics, fashion, home and beauty, newest first.',
  path: '/marketplace/new-arrivals',
  keywords: ['new arrivals', 'latest products', 'just launched', 'new in'],
});

export default function MarketplaceNewArrivalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
