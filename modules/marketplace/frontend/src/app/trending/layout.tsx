import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/** See `flash-deals/layout.tsx` — sitemap-submitted client page, needs its own head. */
export const metadata: Metadata = buildMeta({
  title: 'Trending Now - What Shoppers Are Buying',
  description:
    'What is gaining traction on KARTSEEK Marketplace right now, ranked by recent views and orders across every category.',
  path: '/marketplace/trending',
  keywords: ['trending products', 'popular now', 'what to buy', 'trending online'],
});

export default function MarketplaceTrendingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
