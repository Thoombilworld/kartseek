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
  title: 'Exchange & Trade-In Offers',
  description: 'Trade in an old device towards a new purchase. See which categories are eligible and what condition grades are worth.',
  path: '/marketplace/exchange',
  keywords: ['exchange offer', 'trade in', 'device exchange', 'old for new'],
});

export default function ExchangeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
