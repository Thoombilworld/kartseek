import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * `sitemap.ts` submits this URL, and the page is a client component — so
 * without a layout it inherited `moduleMeta('marketplace')` and was published
 * under the same title, description and canonical as `/marketplace` itself.
 * Six sibling landing pages did the same, which is a duplicate-title set of
 * seven URLs competing over one storefront.
 *
 * `buildMeta` supplies the canonical, the hreflang set and the OG card; only
 * the copy is stated here.
 */
export const metadata: Metadata = buildMeta({
  title: 'Flash Deals - Limited-Time Offers',
  description:
    'Lightning deals on electronics, fashion and home essentials. Limited stock, limited time — new flash deals drop through the day on KARTSEEK Marketplace.',
  path: '/marketplace/flash-deals',
  keywords: ['flash deals', 'lightning deals', 'limited time offers', 'discount sale'],
});

export default function MarketplaceFlashDealsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
