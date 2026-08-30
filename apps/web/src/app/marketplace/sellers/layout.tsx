import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/**
 * Own head for a client page.
 *
 * Without this the route inherited `marketplace/layout.tsx`'s metadata, whose
 * canonical is `/marketplace` — so this page told search engines it was a
 * duplicate of the section root while asking to be indexed.
 */
export const metadata: Metadata = buildMeta({
  title: 'Verified Sellers',
  description: 'Browse verified sellers on KARTSEEK Marketplace. Check ratings, fulfilment record and catalogue before you buy.',
  path: '/marketplace/sellers',
  keywords: ['verified sellers', 'online sellers', 'seller directory'],
});

export default function SellersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
